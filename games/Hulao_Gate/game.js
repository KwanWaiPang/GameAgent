import * as THREE from 'three';
import { makeDetailedWarrior, disposeDetailedWarrior } from './warrior-model.js';
import { enhanceBattlefield, rockyPeak } from './battlefield-detail.js';

// 乱世无双 · 虎牢关 — an original, self-contained WebGL battle built for GitHub Pages.
const $ = (id) => document.getElementById(id);
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const mobile = matchMedia('(pointer: coarse)').matches;
const low = mobile || (navigator.hardwareConcurrency || 8) <= 4 || new URLSearchParams(location.search).get('q') === 'low';
const MAX_ENEMIES = low ? 13 : 20;
const TAU = Math.PI * 2;
const params = new URLSearchParams(location.search);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer, scene, camera, player, groundTexture, clock;
let phase = 'boot', elapsed = 0, wave = 0, waveStarted = 0, pending = 0, spawnClock = 0, bossSpawned = false;
let kills = 0, combo = 0, comboClock = 0, toastTimer = 0, flashTimer = 0, shake = 0;
let cameraYaw = 0, cameraPitch = 0.20, cameraDistance = mobile ? 8.3 : 8.9;
let cameraX = 0, cameraZ = 0, cameraY = 5;
let enemies = [], particles = [], slashes = [], fires = [], banners = [], blocked = [];
let keys = new Set(), pointer = { down: false, x: 0, y: 0, moved: 0 };
let joystick = { x: 0, y: 0, id: -1 };
let muted = false, audio = null, nextId = 1;
let seeded = 731927;
const rand = () => ((seeded = (1664525 * seeded + 1013904223) >>> 0) / 4294967296);
const pick = (a,b) => a + (b-a)*rand();
const smooth = (a,b,x) => { const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t); };
const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);

function mat(c, metal=0, rough=.72, extra={}) { return new THREE.MeshStandardMaterial({ color:c, roughness:rough, metalness:metal, ...extra }); }
const materials = {
  earth:mat(0x6c5844), dirt:mat(0x645440), cobble:mat(0x7d7567), wall:mat(0x8d7f6e), wallTop:mat(0xaaa08f),
  roof:mat(0x333637), timber:mat(0x483a2b), bronze:mat(0xa78b58,.72,.32), steel:mat(0x849296,.72,.28),
  iron:mat(0x333638,.65,.38), rock:mat(0x696454), skin:mat(0xd2a178), grass:mat(0x5e6243),
  robeGreen:mat(0x25423a), jade:mat(0x335b4d,.16), gold:mat(0xbca16a,.6,.37),
  enemyArmor:mat(0x464747,.7,.48), enemyRobe:mat(0x6b352a), eliteArmor:mat(0x68635c,.65,.44),
  bossArmor:mat(0x232a34,.72,.3), bossRed:mat(0x891d20), pale:mat(0xead1aa),
  bark:mat(0x4c4035), leaf:mat(0x39483c), orange:new THREE.MeshBasicMaterial({color:0xffa455}),
};
function mesh(geo, material, parent, x=0,y=0,z=0, cast=true) {
  const o = new THREE.Mesh(geo,material); o.position.set(x,y,z); o.castShadow=cast&&!low;o.receiveShadow=cast&&!low; parent.add(o); return o;
}
function box(parent, material, x,y,z, w,h,d) { return mesh(new THREE.BoxGeometry(w,h,d), material, parent,x,y,z); }
function cyl(parent, material, x,y,z, rt,rb,h,n=10) { return mesh(new THREE.CylinderGeometry(rt,rb,h,n),material,parent,x,y,z); }
function sphere(parent,material,x,y,z,rx,ry=rx,rz=rx,n=10){const m=mesh(new THREE.SphereGeometry(1,n,7),material,parent,x,y,z);m.scale.set(rx,ry,rz);return m;}
function cone(parent,material,x,y,z,r,h,n=8){return mesh(new THREE.ConeGeometry(r,h,n),material,parent,x,y,z);}
function rodBetween(parent,material,a,b,r=.05,n=8){const vec=b.clone().sub(a);const ob=cyl(parent,material,(a.x+b.x)*.5,(a.y+b.y)*.5,(a.z+b.z)*.5,r,r,vec.length(),n);ob.quaternion.setFromUnitVectors(V(0,1,0),vec.normalize());return ob;}
function decalTexture(draw,w=256,h=256){let c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');draw(ctx,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
function ease(a,b,k){return lerp(a,b,1-Math.exp(-k));}
function setupRenderer(){
  const canvas=$('battle');
  if(!window.WebGLRenderingContext)throw Error('当前浏览器不支持 WebGL。请换用新版 Chrome、Edge 或 Safari。');
  renderer=new THREE.WebGLRenderer({canvas,antialias:!low,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,low?1.2:1.8));
  renderer.setSize(innerWidth,innerHeight,false);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
  renderer.shadowMap.enabled=!low;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();scene.background=new THREE.Color(0x90979b);scene.fog=new THREE.FogExp2(0x96938a,low?.0086:.0057);
  camera=new THREE.PerspectiveCamera(mobile?67:57,innerWidth/innerHeight,.1,350);
  scene.add(new THREE.HemisphereLight(0xc9d9e1,0x624632,1.15));
  const sun=new THREE.DirectionalLight(0xffdfb7,2.65);sun.position.set(-42,90,-85);sun.castShadow=!low;
  sun.shadow.mapSize.set(low?1024:2048,low?1024:2048);sun.shadow.camera.left=-53;sun.shadow.camera.right=53;
  sun.shadow.camera.top=60;sun.shadow.camera.bottom=-60;sun.shadow.camera.near=3;sun.shadow.camera.far=225;
  sun.shadow.normalBias=.035;scene.add(sun);
  const fill=new THREE.DirectionalLight(0xa2b9cd,1.05);fill.position.set(35,25,45);scene.add(fill);
  const sky=new THREE.Mesh(new THREE.SphereGeometry(240,32,16),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,uniforms:{},vertexShader:'varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 vPos;void main(){float t=clamp(normalize(vPos).y*.9+.2,0.,1.);vec3 low=vec3(.76,.55,.39);vec3 high=vec3(.36,.50,.59);gl_FragColor=vec4(mix(low,high,smoothstep(0.,.95,t)),1.);}'
  }));scene.add(sky);
  window.addEventListener('resize',()=>{camera.aspect=innerWidth/Math.max(innerHeight,1);camera.fov=innerWidth<700?67:57;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);});
  clock=new THREE.Clock();
}
function makeGround(){
  const tex=decalTexture((ctx,w,h)=>{
    ctx.fillStyle='#6a5b48';ctx.fillRect(0,0,w,h);
    for(let i=0;i<14000;i++){const x=rand()*w,y=rand()*h,a=rand()*.17;ctx.fillStyle=rand()>.55?`rgba(231,196,134,${a})`:`rgba(29,32,23,${a})`;ctx.fillRect(x,y,pick(.4,2),pick(.5,2));}
  },512,512);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(20,20);groundTexture=tex;
  const terrainGeo=new THREE.PlaneGeometry(330,310,70,68);terrainGeo.rotateX(-Math.PI/2);
  const pos=terrainGeo.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);const outer=smooth(20,48,Math.abs(x));let h=(Math.sin(x*.065)*1.9+Math.cos(z*.058+x*.025)*1.25+Math.sin(z*.17+x*.13)*.65)*outer;
    pos.setY(i,Math.max(-.65,h)-.18);}
  terrainGeo.computeVertexNormals();const terrain=mesh(terrainGeo,new THREE.MeshStandardMaterial({map:tex,roughness:1}),scene,0,0,0,false);terrain.receiveShadow=true;
  // The central causeway is intentionally level for accessible combat and stable movement.
  const road=mesh(new THREE.PlaneGeometry(27,125),new THREE.MeshStandardMaterial({color:0x786753,transparent:true,opacity:.24,roughness:1}),scene,0,-.01,-2,false);road.rotation.x=-Math.PI/2;
  for(let i=0;i<(low?110:215);i++){
    const x=pick(-22,22),z=pick(-55,53);if(Math.abs(x)<9 && rand()>.23)continue;
    const m=box(scene,rand()>.7?materials.cobble:materials.rock,x,.025,z,pick(.16,.75),pick(.05,.13),pick(.12,.65));m.rotation.y=rand()*TAU;m.castShadow=false;
  }
  const mountainMat=[mat(0x6e6b5f),mat(0x777263),mat(0x565d56)];
  for(let i=0;i<36;i++){
    const side=i<20?(rand()>.5?1:-1):0;
    const x=side?side*pick(65,145):pick(-160,160),z=side?pick(-180,100):pick(-200,-115);
    const height=pick(15,48);rockyPeak(THREE,scene,mountainMat[i%3],x,z,pick(10,29),height,rand);
  }
  for(let i=0;i<(low?48:85);i++){const side=rand()>.5?1:-1;const x=side*pick(29,68),z=pick(-70,65);makeTree(x,z,pick(.65,1.5));}
  for(let i=0;i<(low?100:180);i++){const x=(rand()>.5?1:-1)*pick(19,78),z=pick(-65,74);const ob=sphere(scene,materials.grass,x,pick(.13,.27),z,pick(.25,.75),pick(.15,.32),pick(.24,.85),6);ob.castShadow=false;}
}
function makeTree(x,z,s=1){
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  cyl(g,materials.bark,0,1.32*s,0,.15*s,.29*s,2.65*s,10);
  for(let j=0;j<6;j++){
    const a=j*TAU/6,branch=rodBetween(g,materials.bark,V(0,1.8*s,0),V(Math.sin(a)*1.18*s,(2.7+(j%2)*.32)*s,Math.cos(a)*1.18*s),.058*s,7);
    branch.castShadow=false;
    const crown=sphere(g,materials.leaf,Math.sin(a)*1.04*s,(2.8+(j%2)*.3)*s,Math.cos(a)*1.04*s,.94*s,.75*s,.85*s,9);crown.castShadow=false;
  }
  sphere(g,materials.leaf,0,3.5*s,0,1.08*s,.95*s,.98*s,11).castShadow=false;
  g.rotation.y=rand()*TAU;
}
function plaqueTexture(){return decalTexture((g,w,h)=>{g.fillStyle='#322a23';g.fillRect(0,0,w,h);g.lineWidth=6;g.strokeStyle='#bd9660';g.strokeRect(7,7,w-14,h-14);g.textAlign='center';g.textBaseline='middle';g.fillStyle='#f1dcb4';g.font='bold 48px serif';g.fillText('虎牢关',w*.5,h*.5);},256,96);}
function bannerTexture(symbol,cloth='#9f382c') {return decalTexture((g,w,h)=>{g.fillStyle=cloth;g.fillRect(0,0,w,h);g.strokeStyle='#d0ad68';g.lineWidth=12;g.strokeRect(10,12,w-20,h-24);g.fillStyle='#f3deb0';g.font='bold 145px serif';g.textAlign='center';g.textBaseline='middle';g.fillText(symbol,w/2,h*.46);g.strokeStyle='#e5b679';g.lineWidth=2;g.beginPath();g.moveTo(28,210);g.lineTo(228,210);g.stroke();},256,300);}
const bannerMatRed=()=>new THREE.MeshStandardMaterial({map:bannerTexture('呂'),side:THREE.DoubleSide,roughness:.9});
function makeBanner(x,z,scale=1,side='red'){
  const grp=new THREE.Group();grp.position.set(x,0,z);scene.add(grp);
  cyl(grp,materials.timber,0,4.1*scale,0,.065*scale,.09*scale,8.2*scale,8);
  cone(grp,materials.bronze,0,8.35*scale,0,.16*scale,.4*scale,6);
  rodBetween(grp,materials.bronze,V(-.87*scale,7.45*scale,0),V(.87*scale,7.45*scale,0),.045*scale);
  const geo=new THREE.PlaneGeometry(1.55*scale,2.45*scale,7,6);const flag=mesh(geo,new THREE.MeshStandardMaterial({map:bannerTexture(side==='red'?'呂':'漢',side==='red'?'#9b2f24':'#36574b'),side:THREE.DoubleSide,transparent:false,roughness:.95}),grp,0,6.15*scale,0,false);
  flag.userData.base=new Float32Array(geo.attributes.position.array);banners.push(flag);return grp;
}
function makeWall(){
  // Tangible battlements with open approach and watch towers; no invisible boss gate.
  const gateZ=-74;
  for(const sign of [-1,1]){
    const x=sign*37;box(scene,materials.wall,x,7,gateZ,59,14,9);
    for(let i=0;i<17;i++){const xx=x+(i-8)*3.25;box(scene,materials.wallTop,xx,14.8,gateZ,1.8,1.65,9.4);}
    for(let i=0;i<3;i++){const xx=x+sign*(i-1)*12;box(scene,materials.timber,xx,4.8,gateZ+4.56,2.6,6.2,.3);}
  }
  for(const xx of [-12.5,12.5]){
    cyl(scene,materials.wall,xx,10.5,gateZ,6.2,7.3,21,12);
    cyl(scene,materials.roof,xx,21,gateZ,7,8.3,1.4,12);
    const roof=cone(scene,materials.roof,xx,24.8,gateZ,9.7,7.8,8);roof.rotation.y=Math.PI/8;
    for(let j=0;j<8;j++){const a=j*TAU/8;box(scene,materials.wallTop,xx+Math.sin(a)*5.7,20.9,gateZ+Math.cos(a)*5.7,1.3,2.1,1.4);}
    makeBanner(xx+(xx<0?-6.7:6.7),gateZ+11,.8);
  }
  box(scene,materials.wall,0,19.4,gateZ,21,8.5,10);
  box(scene,materials.timber,0,10.3,gateZ+1,15.2,13,2.8);
  box(scene,materials.iron,0,10.3,gateZ+2.5,14.2,11,.5);
  for(let j=-6;j<=6;j++){box(scene,materials.bronze,j*1.05,10.2,gateZ+2.84,.075,10,.09);}
  const sign=box(scene,materials.timber,0,21.9,gateZ+5.4,8.7,2.8,.4);
  const signPlane=mesh(new THREE.PlaneGeometry(8.2,2.35),new THREE.MeshBasicMaterial({map:plaqueTexture()}),scene,0,21.9,gateZ+5.65,false);void sign;void signPlane;
  for(let s of [-1,1]){makeBanner(s*27.5,gateZ+14,1.05);}
}
function makeCamp(){
  for(let side of [-1,1]){
    for(let j=0;j<5;j++){const x=side*(24+pick(0,8)),z=-39+j*19+pick(-3,3);
      const tent=new THREE.Group();tent.position.set(x,0,z);tent.rotation.y=side*-.2;scene.add(tent);
      box(tent,materials.timber,0,.15,0,7,.25,5);
      const canvasMat=mat(j%2?0x847764:0x766956);for(let half of [-1,1]){const flap=box(tent,canvasMat,half*1.8,2.1,0,4.3,.12,5.6);flap.rotation.z=half*-.65;}
      box(tent,materials.enemyRobe,0,2.8,0,.18,.18,5.75);
      makeBanner(x+side*5,z,0.7,j%3===0?'green':'red');
      blocked.push({x,z,r:4});
    }
  }
  for(let i=0;i<16;i++){const x=(i%2?1:-1)*pick(18,32),z=pick(-51,60);if(blocked.some(b=>Math.hypot(x-b.x,z-b.z)<7))continue;
    const barrel=cyl(scene,materials.timber,x,.6,z,.48,.54,1.2,9);barrel.rotation.z=pick(-.15,.15);cyl(scene,materials.bronze,x,.25,z,.5,.5,.11,9);}
  for(let side of [-1,1]){makeFire(side*14,-26);makeFire(side*17,20);makeFire(side*11,-53);}
  for(let i=0;i<13;i++){const x=(i%2?1:-1)*pick(38,58),z=pick(-60,60);sphere(scene,materials.rock,x,pick(.65,1.2),z,pick(.9,2.2),pick(.65,1.3),pick(.8,2),7);}
}
function makeFire(x,z){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  cyl(g,materials.rock,0,.1,0,.83,.95,.3,9);for(let j=0;j<8;j++){const a=j*TAU/8;sphere(g,materials.rock,Math.sin(a)*.7,.22,Math.cos(a)*.7,.22,.19,.25,6);}
  for(let j=0;j<4;j++){const o=box(g,materials.bark,0,.34,0,1.5,.22,.21);o.rotation.y=j*TAU/4;}
  const flame=cone(g,new THREE.MeshBasicMaterial({color:0xffaa52,transparent:true,opacity:.9}),0,.8,0,.42,1.5,7);flame.castShadow=false;
  const inside=cone(g,new THREE.MeshBasicMaterial({color:0xffdf7c,transparent:true,opacity:.8}),0,.73,0,.22,1.05,6);inside.castShadow=false;
  const light=new THREE.PointLight(0xff7830,low?8:13,11,2);light.position.y=1.3;g.add(light);fires.push({flame,inside,light,offset:rand()*20});}

function makeWarrior(kind='soldier'){return makeDetailedWarrior(THREE,kind,low);}
function createPlayer(){
  const model=makeWarrior('hero');model.position.set(0,0,42);scene.add(model);
  player={id:0,model,hp:100,maxHp:100,energy:80,attack:null,attackQueue:null,skillCD:0,invuln:0,dodge:0,dodgeDir:V(),facing:Math.PI,walk:0,velocity:V(),hitStun:0};
  model.rotation.y=0;return player;
}
function enemyStats(kind){return kind==='boss'?{hp:660,speed:2.75,reach:3.3,damage:17,scale:1.43}:
  kind==='elite'?{hp:110,speed:2.85,reach:2.3,damage:12,scale:1.1}:{hp:55,speed:3.1,reach:2.1,damage:7,scale:1};}
function spawnEnemy(kind='soldier'){
  const dist=pick(19,32),angle=pick(-1.14,1.14),x=clamp(player.model.position.x+Math.sin(angle)*dist,-31,31);
  let z=clamp(player.model.position.z-Math.cos(angle)*dist,-52,48);
  if(kind==='boss'){z=-37;}
  const st=enemyStats(kind);const model=makeWarrior(kind);model.position.set(kind==='boss'?0:x,0,z);scene.add(model);
  const enemy={id:nextId++,kind,model,hp:st.hp,maxHp:st.hp,speed:st.speed,reach:st.reach,damage:st.damage,windup:0,attackCD:pick(.2,1.0),stun:0,walk:rand()*TAU,dead:false,death:0,hitFlash:0,knock:V(),facing:0};
  enemies.push(enemy);if(kind==='boss'){$('boss-hud').hidden=false;$('boss-fill').style.width='100%';toast('飞将吕布，亲临战阵！',2.5);}
  return enemy;
}
function waveData(n){return n===1?{count:11,elite:0,name:'第一阵 · 西凉先锋',goal:'击溃西凉军前锋'}:n===2?{count:16,elite:4,name:'第二阵 · 精锐压境',goal:'冲破西凉精锐'}:{count:20,elite:7,name:'第三阵 · 飞将当关',goal:'斩破吕布与守关军'};}
function beginWave(n){wave=n;waveStarted=elapsed;const cfg=waveData(n);pending=cfg.count;spawnClock=0;bossSpawned=false;
  $('objective').textContent=cfg.goal;$('stage').textContent=cfg.name;toast(['','西凉军前锋，杀！','敌军增援！破阵而出！','虎牢关决战！'][n],2.4);
}
function resetGame(){for(const e of enemies){scene.remove(e.model);disposeDetailedWarrior(e.model);}enemies=[];
  for(const p of particles)scene.remove(p.obj);particles=[];for(const p of slashes)scene.remove(p.obj);slashes=[];
  if(player){scene.remove(player.model);disposeDetailedWarrior(player.model);}createPlayer();phase='playing';wave=0;kills=0;combo=0;comboClock=0;elapsed=0;shake=0;
  cameraYaw=0;cameraPitch=.20;cameraX=0;cameraY=6;cameraZ=54;
  $('ko-count').textContent='0';$('boss-hud').hidden=true;$('end-screen').hidden=true;$('pause-screen').hidden=true;$('start-screen').hidden=true;$('hud').hidden=false;
  $('mobile-controls').hidden=!mobile;keys.clear();joystick.x=joystick.y=0;
  beginWave(1);refreshHud();
}
function moveSafe(obj,dx,dz,rad=.5){let x=clamp(obj.position.x+dx,-34+rad,34-rad),z=clamp(obj.position.z+dz,-56+rad,56-rad);
  for(const b of blocked){let d=Math.hypot(x-b.x,z-b.z),min=b.r+rad;if(d<min){const nx=(x-b.x)/(d||1),nz=(z-b.z)/(d||1);x=b.x+nx*min;z=b.z+nz*min;}}
  obj.position.x=x;obj.position.z=z;}
function normalizeAngle(a){return Math.atan2(Math.sin(a),Math.cos(a));}
function rotateTo(obj,angle,dt,rate=12){obj.rotation.y+=normalizeAngle(angle-obj.rotation.y)*Math.min(1,rate*dt);}
function facingTo(x,z){return Math.atan2(-x,-z);}
function requestAttack(kind='light'){
  if(phase!=='playing'||!player||player.dodge>0||player.hitStun>0)return;
  if(kind==='skill'){if(player.skillCD>0||player.energy<50){if(player.skillCD<=0)toast('无双槽不足',.65);return;}if(player.attack)player.attackQueue='skill';else launchAttack('skill');return;}
  if(player.attack){if(player.attack.t>.13)player.attackQueue=kind;return;}
  launchAttack(kind);
}
function launchAttack(kind){if(!player)return;let tier=0;
  if(kind==='light'){tier=combo<3?combo:0;combo=(tier+1)%3;comboClock=1.3;}
  else{combo=0;comboClock=0;}
  const skill=kind==='skill',heavy=kind==='heavy';if(skill){player.energy-=50;player.skillCD=10.5;}
  player.attack={kind,t:0,duration:skill?1.05:heavy?.82:.43+tier*.05,activeStart:skill?.23:heavy?.27:.13,activeEnd:skill?.61:heavy?.55:.30,
    damage:skill?150:heavy?82:32+tier*9,range:skill?8.7:heavy?5.2:4.2+tier*.25,arc:skill?TAU:heavy?2.45:2.35,hit:new Set(),tier};
  player.attackQueue=null;sound(skill?170:heavy?100:145,skill?.48:.15,skill?'saw':'hit');
  if(skill){toast('青龙偃月 · 千军辟易！',1.35);shake=Math.max(shake,.34);}
}
function doAttackDamage(atk){const p=player.model.position;let hits=0;
  for(const enemy of enemies){if(enemy.dead||atk.hit.has(enemy.id))continue;
    const v=enemy.model.position.clone().sub(p),dist=Math.hypot(v.x,v.z);
    if(dist>atk.range)continue;
    const yaw=facingTo(v.x,v.z);if(atk.arc<TAU && Math.abs(normalizeAngle(yaw-player.model.rotation.y))>atk.arc*.5)continue;
    atk.hit.add(enemy.id);hits++;
    enemy.hp-=atk.damage;enemy.stun=atk.kind==='skill'?.8:atk.kind==='heavy'?.5:.22;enemy.hitFlash=.16;
    enemy.knock.add(v.setY(0).normalize().multiplyScalar(atk.kind==='skill'?13:atk.kind==='heavy'?8:4.5));
    emitSparks(enemy.model.position.clone().add(V(0,1.5,0)),atk.kind==='skill'?0xffd079:0xffb67d,atk.kind==='skill'?16:8);
    if(enemy.kind==='boss')$('boss-fill').style.width=`${Math.max(0,enemy.hp/enemy.maxHp*100)}%`;
    if(enemy.hp<=0)killEnemy(enemy);
    else sound(95,.07,'hit');
  }
  if(hits){player.energy=clamp(player.energy+hits*(atk.kind==='skill'?0:5),0,100);shake=Math.max(shake,Math.min(.32,.1+hits*.03));
    showCombo(hits);sound(atk.kind==='skill'?70:65,.09,'hit');}
}
function killEnemy(e){if(e.dead)return;e.dead=true;e.death=0;e.model.userData.weapon.rotation.z=.32;
  kills++;$('ko-count').textContent=kills;sound(e.kind==='boss'?55:85,.20,'fall');
  emitSparks(e.model.position.clone().add(V(0,1.1,0)),0xe9a66e,9);
  if(e.kind==='boss')toast('飞将已败！',2);
}
function showCombo(hits){const c=$('combo');c.hidden=false;$('combo-num').textContent=(Number($('combo-num').textContent)||0)+hits;
  comboClock=1.7;}
function emitSparks(center,color,count){for(let i=0;i<(low?Math.ceil(count*.45):count);i++){
  const m=mesh(new THREE.TetrahedronGeometry(pick(.045,.13),0),new THREE.MeshBasicMaterial({color,transparent:true,opacity:1,depthWrite:false}),scene,center.x+pick(-.3,.3),center.y+pick(-.15,.15),center.z+pick(-.3,.3),false);
  particles.push({obj:m,v:V(pick(-6,6),pick(2,7),pick(-6,6)),life:pick(.35,.75),max:.75});}
}
function slash(radius,arc=2.2,skill=false){const geo=new THREE.RingGeometry(radius-.18,radius+.16,48,1,-arc*.5,arc);
  const material=new THREE.MeshBasicMaterial({color:skill?0xffd389:0xf2cc9b,transparent:true,opacity:skill?.8:.7,side:THREE.DoubleSide,depthWrite:false});
  const obj=mesh(geo,material,scene,player.model.position.x,skill?.5:1.15,player.model.position.z,false);obj.rotation.x=-Math.PI/2;
  obj.rotation.z=player.model.rotation.y;slashes.push({obj,t:0,max:skill?.65:.27,skill});
}
function updateAttacks(dt){const a=player.attack;if(!a)return;a.t+=dt;
  if(a.kind==='skill' && a.t>=.12 && !a.slash){slash(4.8,TAU,true);slash(7,TAU,true);a.slash=true;}
  if(a.kind!=='skill' && a.t>=a.activeStart && !a.slash){slash(a.range*.78,a.arc,false);a.slash=true;}
  if(a.t>=a.activeStart && a.t<=a.activeEnd)doAttackDamage(a);
  const rig=player.model.userData.rig,weapon=player.model.userData.weapon;
  const rightArm=rig.userData.rightArm,leftArm=rig.userData.leftArm;
  const swing=smooth(0,a.duration*.55,a.t);const recover=smooth(a.duration*.62,a.duration,a.t);
  if(a.kind==='skill'){weapon.rotation.x=-1.4+Math.sin(a.t*17)*.48;weapon.rotation.z=-1.8+Math.sin(a.t*16)*1.55;rig.rotation.y=Math.min(1,a.t*1.5)*TAU*.78;rightArm.rotation.x=-.8;rightArm.rotation.z=.4;leftArm.rotation.x=-.45;}
  else{weapon.rotation.z=(-1.35+swing*2.7)*(1-recover);weapon.rotation.x=(-.9+Math.cos(swing*Math.PI)*.45)*(1-recover);
    rig.rotation.y=Math.sin(swing*Math.PI)*.32*(1-recover);rightArm.rotation.x=-.3-1.15*Math.sin(swing*Math.PI)*(1-recover);rightArm.rotation.z=.22*Math.sin(swing*Math.PI)*(1-recover);leftArm.rotation.x=-.32*Math.sin(swing*Math.PI)*(1-recover);}
  if(a.t>=a.duration){player.attack=null;rig.rotation.y=0;weapon.rotation.z=0;weapon.rotation.x=0;rightArm.rotation.set(0,0,0);leftArm.rotation.set(0,0,0);
    if(player.attackQueue){const k=player.attackQueue;player.attackQueue=null;launchAttack(k);}}
}
function doDodge(){if(phase!=='playing'||player.dodge>0||player.hitStun>0)return;
  if(player.attack&&player.attack.kind==='skill')return;player.attack=null;player.attackQueue=null;player.model.userData.weapon.rotation.set(0,0,0);
  const input=moveInput();const dx=Math.cos(cameraYaw)*input.x-Math.sin(cameraYaw)*input.y;
  const dz=-Math.sin(cameraYaw)*input.x-Math.cos(cameraYaw)*input.y;
  player.dodgeDir.set(dx,0,dz);if(player.dodgeDir.lengthSq()<.01)player.dodgeDir.set(-Math.sin(player.model.rotation.y),0,-Math.cos(player.model.rotation.y));
  player.dodgeDir.normalize();player.dodge=.47;player.invuln=.52;emitSparks(player.model.position.clone().add(V(0,.22,0)),0xc8ac84,9);sound(200,.11,'air');
}
function moveInput(){let x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
  let y=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0);
  x+=joystick.x;y+=joystick.y;const len=Math.hypot(x,y);return len>1?{x:x/len,y:y/len}:{x,y};}
function updatePlayer(dt){const p=player;p.invuln=Math.max(0,p.invuln-dt);p.skillCD=Math.max(0,p.skillCD-dt);p.hitStun=Math.max(0,p.hitStun-dt);
  const input=moveInput(),moving=Math.hypot(input.x,input.y)>.05;
  const dx=Math.cos(cameraYaw)*input.x-Math.sin(cameraYaw)*input.y;
  const dz=-Math.sin(cameraYaw)*input.x-Math.cos(cameraYaw)*input.y;
  if(p.dodge>0){moveSafe(p.model,p.dodgeDir.x*dt*14,p.dodgeDir.z*dt*14,.56);p.dodge=Math.max(0,p.dodge-dt);p.model.userData.rig.rotation.z=Math.sin((1-p.dodge/.47)*Math.PI)*-.35;}
  else{
    p.model.userData.rig.rotation.z=0;
    const factor=p.attack?(p.attack.kind==='skill'?.04:.38):p.hitStun>0?0:1;
    const running=keys.has('shift');const speed=(running?8.2:5.7)*factor;
    if(moving){moveSafe(p.model,dx*speed*dt,dz*speed*dt,.56);if(!p.attack)rotateTo(p.model,facingTo(dx,dz),dt,13);p.walk+=dt*(running?11:8.5);}
    else p.walk+=dt*1.5;
  }
  const ud=p.model.userData,legs=ud.legs;const walkScale=moving&&!p.attack&&p.dodge<=0?1:0;
  legs[0].rotation.x=Math.sin(p.walk)*.53*walkScale;legs[1].rotation.x=-Math.sin(p.walk)*.53*walkScale;
  ud.rig.position.y=(moving?Math.abs(Math.sin(p.walk))*.07:Math.sin(elapsed*2)*.025);
  if(ud.rig.userData.cape)ud.rig.userData.cape.rotation.x=-.10+Math.sin(p.walk*.65)*.09;
  if(p.attack)updateAttacks(dt);
  else{ud.rig.userData.rightArm.rotation.x=-Math.sin(p.walk)*.22*walkScale;ud.rig.userData.leftArm.rotation.x=Math.sin(p.walk)*.23*walkScale;}
  p.energy=clamp(p.energy+dt*1.8,0,100);
}
function damagePlayer(amount,attacker){if(player.invuln>0||phase!=='playing')return;
  player.hp=Math.max(0,player.hp-amount);player.invuln=.85;player.hitStun=.24;shake=.4;flashTimer=.18;
  $('hit-flash').classList.add('active');sound(55,.24,'fall');
  const away=player.model.position.clone().sub(attacker.model.position).setY(0).normalize();moveSafe(player.model,away.x*1.4,away.z*1.4);
  emitSparks(player.model.position.clone().add(V(0,1.3,0)),0xf2c28b,8);
  if(player.hp<=0)finish(false);
}
function updateEnemies(dt){const target=player.model.position;
  for(const e of enemies){const ud=e.model.userData;
    if(e.dead){e.death+=dt;ud.rig.rotation.z=lerp(ud.rig.rotation.z,1.48,Math.min(1,dt*4));ud.rig.position.y=lerp(ud.rig.position.y,-.45,Math.min(1,dt*4));if(e.death>2.2){scene.remove(e.model);disposeDetailedWarrior(e.model);e.remove=true;}continue;}
    e.stun=Math.max(0,e.stun-dt);e.hitFlash=Math.max(0,e.hitFlash-dt);e.attackCD=Math.max(0,e.attackCD-dt);
    // Each enemy has a simple stagger / telegraph / strike / recovery state machine.
    const delta=target.clone().sub(e.model.position),dist=Math.max(.01,Math.hypot(delta.x,delta.z));
    rotateTo(e.model,facingTo(delta.x,delta.z),dt,e.kind==='boss'?5.4:7.5);
    if(e.stun>0){moveSafe(e.model,e.knock.x*dt,e.knock.z*dt,e.kind==='boss'?.85:.5);e.knock.multiplyScalar(Math.exp(-dt*9));}
    else if(e.windup>0){e.windup-=dt;ud.weapon.rotation.z=-.8+Math.sin((.7-e.windup)*7)*.5;
      if(e.windup<=0){ud.weapon.rotation.z=0;e.attackCD=e.kind==='boss'?2:pick(1.15,1.9);
        if(dist<e.reach+1 && Math.abs(normalizeAngle(facingTo(delta.x,delta.z)-e.model.rotation.y))<1.3){damagePlayer(e.damage,e);}
        if(e.kind==='boss'){slashEnemy(e);}}
    }else if(dist<e.reach+pick(.1,.25) && e.attackCD<=0){e.windup=e.kind==='boss'?.78:.54;}
    else if(dist>e.reach*.78){let vx=delta.x/dist,vz=delta.z/dist;
      // Gentle separation avoids complete overlap without costly physics simulation.
      for(const other of enemies){if(other===e||other.dead)continue;const ox=e.model.position.x-other.model.position.x,oz=e.model.position.z-other.model.position.z,d2=ox*ox+oz*oz;
        if(d2<3.2&&d2>.01){const f=(3.2-d2)*.33;vx+=ox*f;vz+=oz*f;}}
      const l=Math.hypot(vx,vz)||1;moveSafe(e.model,vx/l*e.speed*dt,vz/l*e.speed*dt,e.kind==='boss'?.85:.5);e.walk+=dt*8;
    }
    if(e.stun<=0){ud.rig.userData.rightArm.rotation.x=-Math.sin(e.walk)*.19;ud.rig.userData.leftArm.rotation.x=Math.sin(e.walk)*.19;const stride=Math.min(1,(dist-e.reach*.75)/3);ud.legs[0].rotation.x=Math.sin(e.walk)*.36*stride;ud.legs[1].rotation.x=-Math.sin(e.walk)*.36*stride;}
    ud.rig.position.y=Math.sin(e.walk*2)*.035;
    if(e.hitFlash>0){ud.rig.scale.setScalar(1+e.hitFlash*.7);}else ud.rig.scale.setScalar(1);
  }
  enemies=enemies.filter(e=>!e.remove);
}
function slashEnemy(e){const pos=e.model.position.clone();emitSparks(pos.add(V(0,1,0)),0xff5140,13);shake=Math.max(shake,.24);}
function updateWave(dt){if(pending>0){spawnClock-=dt;const active=enemies.filter(e=>!e.dead).length;
    if(spawnClock<=0 && active<MAX_ENEMIES){const idx=waveData(wave).count-pending;spawnEnemy(wave>1&&idx%4===0?'elite':'soldier');pending--;spawnClock=pick(.55,1.35);}}
  if(wave===3&&!bossSpawned&&elapsed-waveStarted>7){spawnEnemy('boss');bossSpawned=true;}
  if(pending===0&&!enemies.some(e=>!e.dead)&& (wave<3||bossSpawned)){
    if(wave<3)beginWave(wave+1);else finish(true);
  }
}
function updateEffects(dt){for(const fx of particles){fx.life-=dt;fx.v.y-=dt*15;fx.obj.position.addScaledVector(fx.v,dt);fx.obj.material.opacity=Math.max(0,fx.life/fx.max);fx.obj.scale.setScalar(Math.max(.05,fx.life/fx.max));if(fx.life<=0){scene.remove(fx.obj);fx.obj.geometry.dispose();fx.obj.material.dispose();fx.remove=true;}}
  particles=particles.filter(p=>!p.remove);
  for(const fx of slashes){fx.t+=dt;const s=1+fx.t*2.5;fx.obj.scale.set(s,s,s);fx.obj.material.opacity=Math.max(0,(1-fx.t/fx.max)*.7);
    if(fx.t>fx.max){scene.remove(fx.obj);fx.obj.geometry.dispose();fx.obj.material.dispose();fx.remove=true;}}
  slashes=slashes.filter(x=>!x.remove);
  for(const f of fires){const w=elapsed*7+f.offset;f.flame.scale.y=.82+Math.sin(w)*.18;f.flame.rotation.y=w*.12;f.inside.scale.y=.9+Math.sin(w*1.2)*.2;f.light.intensity=(low?8:13)*(0.88+Math.sin(w)*.12);}
  if(!reduceMotion)for(const flag of banners){const pos=flag.geometry.attributes.position,base=flag.userData.base;
    for(let i=0;i<pos.count;i++){const x=base[i*3],y=base[i*3+1];pos.setZ(i,Math.sin(elapsed*2.5+x*2+y*1.2)*.19*(1+Math.abs(x)*.35));}
    pos.needsUpdate=true;flag.geometry.computeVertexNormals();}
  if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.remove('show');}
  if(flashTimer>0){flashTimer-=dt;if(flashTimer<=0)$('hit-flash').classList.remove('active');}
  if(comboClock>0){comboClock-=dt;if(comboClock<=0){$('combo').hidden=true;$('combo-num').textContent='0';}}
}
function updateCamera(dt){const focus=player.model.position;
  const dist=cameraDistance,ca=Math.cos(cameraPitch),sa=Math.sin(cameraPitch);
  const target=V(focus.x+Math.sin(cameraYaw)*dist*ca,1.1+dist*.06+dist*sa,focus.z+Math.cos(cameraYaw)*dist*ca);
  const factor=1-Math.exp(-dt*7);
  cameraX=lerp(cameraX,target.x,factor);cameraY=lerp(cameraY,target.y,factor);cameraZ=lerp(cameraZ,target.z,factor);
  const randShake=shake>0?shake*pick(-1,1):0;
  camera.position.set(cameraX+randShake,cameraY+randShake*.55,cameraZ+randShake);
  camera.lookAt(focus.x,2.10,focus.z);shake=Math.max(0,shake-dt*.95);
}
function refreshHud(){if(!player)return;
  $('hp-fill').style.width=`${player.hp}%`;$('hp-text').textContent=`${Math.ceil(player.hp)} / 100`;
  $('energy-fill').style.width=`${player.energy}%`;
  $('skill-state').textContent=player.skillCD>0?`${player.skillCD.toFixed(1)}s`:player.energy<50?'蓄势中':'就绪';
  if(phase==='playing')drawRadar();
}
function drawRadar(){const c=$('radar'),g=c.getContext('2d'),w=c.width,h=c.height,r=w/2-10;
  g.clearRect(0,0,w,h);g.save();g.translate(w/2,h/2);g.beginPath();g.arc(0,0,r,0,TAU);g.clip();
  g.strokeStyle='rgba(218,187,136,.23)';g.lineWidth=1;
  for(let i=1;i<=3;i++){g.beginPath();g.arc(0,0,i*r/3,0,TAU);g.stroke();}
  g.beginPath();g.moveTo(-r,0);g.lineTo(r,0);g.moveTo(0,-r);g.lineTo(0,r);g.stroke();
  g.rotate(-cameraYaw);const scale=2.55;
  for(const e of enemies){if(e.dead)continue;const x=(e.model.position.x-player.model.position.x)*scale;
    const y=(e.model.position.z-player.model.position.z)*scale;if(x*x+y*y>r*r)continue;
    g.fillStyle=e.kind==='boss'?'#f0c583':'#c45740';g.beginPath();g.arc(x,y,e.kind==='boss'?5:2.6,0,TAU);g.fill();}
  g.fillStyle='#e9e2bc';g.beginPath();g.moveTo(0,-8);g.lineTo(-5,6);g.lineTo(5,6);g.fill();g.restore();}
function toast(t,dur=1.6){$('toast').textContent=t;$('toast').classList.add('show');toastTimer=dur;}
function finish(won){if(phase!=='playing')return;phase='end';$('end-eyebrow').textContent=won?'VICTORY · 虎牢凯旋':'DEFEAT · 再整旗鼓';
  $('end-title').textContent=won?'威震虎牢':'壮志未酬';$('end-copy').textContent=won?'千军辟易，飞将亦折戟于青龙刀下。':'英雄未竟，重整战旗，再战沙场。';
  $('end-ko').textContent=kills;$('end-screen').hidden=false;$('mobile-controls').hidden=true;
}
function pause(){if(phase==='playing'){phase='paused';$('pause-screen').hidden=false;$('mobile-controls').hidden=true;keys.clear();}
  else if(phase==='paused'){phase='playing';$('pause-screen').hidden=true;$('mobile-controls').hidden=!mobile;clock.getDelta();}}

function sound(freq=120,dur=.1,kind='hit'){
  if(muted||!audio)return;
  try{const osc=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
    osc.type=kind==='air'?'sine':kind==='saw'?'sawtooth':'triangle';osc.frequency.setValueAtTime(freq,now);osc.frequency.exponentialRampToValueAtTime(Math.max(35,freq*(kind==='fall'?.38:1.6)),now+dur);
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.075,now+.01);gain.gain.exponentialRampToValueAtTime(.0001,now+dur);
    osc.connect(gain);gain.connect(audio.destination);osc.start(now);osc.stop(now+dur+.01);
  }catch{ /* Audio is optional, even on restricted browsers. */ }
}
function attachInputs(){
  window.addEventListener('keydown',e=>{
    const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();
    if(k==='escape'){if(phase==='playing'||phase==='paused')pause();return;}
    if(phase!=='playing'||e.repeat)return;
    if(k==='j')requestAttack('light');if(k==='k')requestAttack('heavy');if(k==='q')requestAttack('skill');if(k===' ')doDodge();
  });
  window.addEventListener('keydown',e=>{keys.add(e.key.toLowerCase());});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>{keys.clear();if(phase==='playing')pause();});
  const canvas=$('battle');canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{if(phase!=='playing')return;e.preventDefault();pointer={down:true,x:e.clientX,y:e.clientY,moved:0};canvas.setPointerCapture(e.pointerId);if(e.button===2)requestAttack('heavy');});
  canvas.addEventListener('pointermove',e=>{if(!pointer.down||phase!=='playing')return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer.x=e.clientX;pointer.y=e.clientY;pointer.moved+=Math.abs(dx)+Math.abs(dy);
    cameraYaw+=dx*.0048;cameraPitch=clamp(cameraPitch+dy*.0032,-.12,.78);});
  canvas.addEventListener('pointerup',e=>{if(phase!=='playing')return;
    if(pointer.down&&pointer.moved<12&&e.button===0&&!mobile)requestAttack('light');pointer.down=false;});
  canvas.addEventListener('pointercancel',()=>pointer.down=false);
  canvas.addEventListener('wheel',e=>{if(phase!=='playing')return;e.preventDefault();cameraDistance=clamp(cameraDistance+Math.sign(e.deltaY)*.7,6,15);},{passive:false});
  const joy=$('joystick'),stick=$('stick');
  const moveJoy=(e)=>{const rect=joy.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
    const dx=e.clientX-cx,dy=e.clientY-cy,r=Math.min(43,Math.hypot(dx,dy)),a=Math.atan2(dy,dx);
    joystick.x=Math.cos(a)*r/43;joystick.y=-Math.sin(a)*r/43;stick.style.transform=`translate(${Math.cos(a)*r}px,${Math.sin(a)*r}px)`;};
  joy.addEventListener('pointerdown',e=>{e.preventDefault();joy.setPointerCapture(e.pointerId);joystick.id=e.pointerId;moveJoy(e);});
  joy.addEventListener('pointermove',e=>{if(e.pointerId===joystick.id)moveJoy(e);});
  const stopJoy=e=>{if(e.pointerId!==joystick.id)return;joystick.id=-1;joystick.x=joystick.y=0;stick.style.transform='translate(0,0)';};
  joy.addEventListener('pointerup',stopJoy);joy.addEventListener('pointercancel',stopJoy);
  for(const [id,action] of [['touch-attack',()=>requestAttack('light')],['touch-heavy',()=>requestAttack('heavy')],['touch-skill',()=>requestAttack('skill')],['touch-dodge',doDodge]]){
    $(id).addEventListener('pointerdown',e=>{e.preventDefault();action();});}
  $('start-btn').addEventListener('click',()=>{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume?.();resetGame();});
  $('restart-btn').addEventListener('click',resetGame);$('restart-pause').addEventListener('click',resetGame);
  $('resume-btn').addEventListener('click',pause);$('pause-btn').addEventListener('click',pause);
  $('sound-btn').addEventListener('click',()=>{muted=!muted;$('sound-btn').textContent=muted?'♪̸':'♪';});
}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.048);elapsed+=phase==='playing'?dt:0;
  if(phase==='playing'){
    updatePlayer(dt);updateEnemies(dt);updateWave(dt);updateEffects(dt);updateCamera(dt);
    if((Math.floor(elapsed*10)%2)===0)refreshHud();
  }else if(player){if(phase==='boot'){player.model.userData.rig.position.y=Math.sin(performance.now()*.001)*.04;}
    updateCamera(dt);for(const f of fires){f.flame.rotation.y+=dt*.4;}}
  if(renderer){renderer.render(scene,camera);}
}
try{
  setupRenderer();makeGround();makeWall();makeCamp();enhanceBattlefield(THREE,scene,materials,low,rand);createPlayer();attachInputs();
  phase='boot';updateCamera(1);$('boot-status').textContent='战场已集结 · 点击出阵';
  // Lightweight smoke motes near the gate; avoid large postprocessing dependencies.
  animate();
  window.__HULAO_READY__=true;
  window.__HULAO_STATE__=()=>({phase,wave,kills,enemies:enemies.filter(e=>!e.dead).length,hp:player.hp,energy:player.energy});
}catch(err){console.error('Hulao Gate initialization failed',err);$('error-message').textContent=err.message||String(err);$('error-screen').hidden=false;$('boot-status').textContent='无法初始化 WebGL';}