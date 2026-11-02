import * as THREE from 'three';
import { makeDetailedWarrior, disposeDetailedWarrior } from './warrior-model.js';
import { enhanceBattlefield, rockyPeak } from './battlefield-detail.js';
import { detailTextures, lcg, makeCanvasTexture } from './procedural-maps.js';
import { createCombatEffects } from './combat-effects.js';
import { resolveCameraTarget } from './camera-physics.js';
import { createCharacterAssets } from './character-assets.js';

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
let renderer, scene, camera, player, groundTexture, clock, combatEffects, characterAssets;
let phase = 'boot', elapsed = 0, wave = 0, waveStarted = 0, pending = 0, spawnClock = 0, bossSpawned = false;
let kills = 0, combo = 0, comboClock = 0, toastTimer = 0, flashTimer = 0, shake = 0;
let cameraYaw = 0, cameraPitch = 0.22, cameraDistance = mobile ? 7.1 : 7.3;
let cameraX = 0, cameraZ = 0, cameraY = 5;
let enemies = [], fires = [], banners = [], blocked = [];
let keys = new Set(), pointer = { down: false, x: 0, y: 0, moved: 0 };
let joystick = { x: 0, y: 0, id: -1 };
let muted = false, audio = null, nextId = 1;
let seeded = 731927;
const rand = () => ((seeded = (1664525 * seeded + 1013904223) >>> 0) / 4294967296);
const pick = (a,b) => a + (b-a)*rand();
const smooth = (a,b,x) => { const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t); };
const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);

function mat(color, metal = 0, rough = 0.86) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}
function terrainMaterial(draw, size, repeatX, repeatY, rough, strength) {
  const pack = detailTextures(THREE, draw, size, strength);
  pack.map.repeat.set(repeatX, repeatY);
  if (pack.normalMap) pack.normalMap.repeat.set(repeatX, repeatY);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, map: pack.map, roughness: rough, metalness: 0.02 });
  if (pack.normalMap) {
    material.normalMap = pack.normalMap;
    material.normalScale = new THREE.Vector2(0.8, 0.8);
  }
  return material;
}
const materials = {
  wall: mat(0xffffff, 0.02, 0.96),
  wallTop: mat(0xffffff, 0.04, 0.9),
  roof: mat(0xffffff, 0.08, 0.78),
  timber: mat(0xffffff, 0.03, 0.9),
  bronze: mat(0xb08a58, 0.45, 0.42),
  iron: mat(0x8a9094, 0.42, 0.4),
  rock: terrainMaterial((ctx, n) => {
    const rnd = lcg(640);
    ctx.fillStyle = '#7a7368';
    ctx.fillRect(0, 0, n, n);
    for (let i = 0; i < 28; i++) {
      ctx.fillStyle = `rgba(${90 + rnd() * 40},${82 + rnd() * 30},${70 + rnd() * 24},${0.25 + rnd() * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(rnd() * n, rnd() * n, 8 + rnd() * 24, 6 + rnd() * 16, rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 256, 2, 2, 0.98, 1.8),
  bark: terrainMaterial((ctx, n) => {
    const rnd = lcg(220);
    ctx.fillStyle = '#5a4332';
    ctx.fillRect(0, 0, n, n);
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(28,16,10,${0.15 + rnd() * 0.35})`;
      ctx.lineWidth = 1 + rnd() * 2;
      const x = rnd() * n;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 8, n * 0.35, x - 6, n * 0.65, x + 2, n);
      ctx.stroke();
    }
  }, 256, 1, 3, 0.92, 1.4),
};
materials.bronze.envMapIntensity = 0.85;
materials.iron.envMapIntensity = 0.9;
function mesh(geo, material, parent, x=0,y=0,z=0, cast=true) {
  const o = new THREE.Mesh(geo,material); o.position.set(x,y,z); o.castShadow=cast&&!low;o.receiveShadow=cast&&!low; parent.add(o); return o;
}
function box(parent, material, x,y,z, w,h,d) { return mesh(new THREE.BoxGeometry(w,h,d), material, parent,x,y,z); }
function cyl(parent, material, x,y,z, rt,rb,h,n=10) { return mesh(new THREE.CylinderGeometry(rt,rb,h,n),material,parent,x,y,z); }
function cone(parent,material,x,y,z,r,h,n=8){return mesh(new THREE.ConeGeometry(r,h,n),material,parent,x,y,z);}
function rodBetween(parent,material,a,b,r=.05,n=8){const vec=b.clone().sub(a);const ob=cyl(parent,material,(a.x+b.x)*.5,(a.y+b.y)*.5,(a.z+b.z)*.5,r,r,vec.length(),n);ob.quaternion.setFromUnitVectors(V(0,1,0),vec.normalize());return ob;}
function decalTexture(draw,w=256,h=256){let c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');draw(ctx,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
function ease(a,b,k){return lerp(a,b,1-Math.exp(-k));}
function setupRenderer(){
  const canvas=$('battle');
  if(!window.WebGLRenderingContext)throw Error('当前浏览器不支持 WebGL。请换用新版 Chrome、Edge 或 Safari。');
  renderer=new THREE.WebGLRenderer({canvas,antialias:!low,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,low?1.15:1.7));
  renderer.setSize(innerWidth,innerHeight,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.08;
  renderer.shadowMap.enabled=!low;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  if('dithering' in renderer) renderer.dithering=true;
  const haze=0xb8926e;
  scene=new THREE.Scene();
  scene.background=new THREE.Color(haze);
  scene.fog=new THREE.Fog(haze, low?36:58, low?170:240);
  camera=new THREE.PerspectiveCamera(mobile?64:52,innerWidth/innerHeight,.12,420);
  const sunDir=new THREE.Vector3(-0.46,0.74,-0.32).normalize();
  const skyMat=new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{uSun:{value:sunDir}},
    vertexShader:'varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec3 vPos;uniform vec3 uSun;
      void main(){
        vec3 dir=normalize(vPos);
        float h=dir.y;
        vec3 zenith=vec3(0.13,0.24,0.40);
        vec3 mid=vec3(0.40,0.52,0.62);
        vec3 horizon=vec3(0.78,0.58,0.42);
        vec3 below=vec3(0.45,0.34,0.26);
        vec3 col=mix(horizon,mid,smoothstep(0.0,0.22,h));
        col=mix(col,zenith,smoothstep(0.22,0.82,h));
        col=mix(below,col,smoothstep(-0.18,0.04,h));
        float sun=pow(max(dot(dir,normalize(uSun)),0.0),520.0);
        float glow=pow(max(dot(dir,normalize(uSun)),0.0),5.5);
        col+=vec3(1.0,0.93,0.82)*sun*1.15;
        col+=vec3(0.95,0.55,0.28)*glow*0.22;
        gl_FragColor=vec4(col,1.0);
      }`
  });
  const sky=new THREE.Mesh(new THREE.SphereGeometry(300,28,16),skyMat);
  sky.renderOrder=-1;sky.frustumCulled=false;scene.add(sky);
  try{
    const pmrem=new THREE.PMREMGenerator(renderer);
    const envScene=new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(18,16,10),skyMat));
    scene.environment=pmrem.fromScene(envScene,0.035,0.1,40).texture;
    pmrem.dispose();
  }catch(err){console.warn('Hulao environment map skipped',err);}
  scene.add(new THREE.HemisphereLight(0xc9d4de,0x5a4030,0.78));
  const sun=new THREE.DirectionalLight(0xffd2a8,2.2);
  sun.position.copy(sunDir).multiplyScalar(90);
  sun.castShadow=!low;
  sun.shadow.mapSize.set(low?1024:2048,low?1024:2048);
  sun.shadow.camera.left=-46;sun.shadow.camera.right=46;
  sun.shadow.camera.top=46;sun.shadow.camera.bottom=-46;
  sun.shadow.camera.near=12;sun.shadow.camera.far=170;
  sun.shadow.bias=-0.00018;sun.shadow.normalBias=0.045;
  if('radius' in sun.shadow) sun.shadow.radius=2.5;
  sun.target.position.set(0,1,-8);
  scene.add(sun);scene.add(sun.target);
  const fill=new THREE.DirectionalLight(0x8ea4b8,0.35);fill.position.set(28,16,22);scene.add(fill);
  const eye=new THREE.DirectionalLight(0xfff1df,1.35);eye.position.set(-4,16,72);scene.add(eye);
  window.addEventListener('resize',()=>{camera.aspect=innerWidth/Math.max(innerHeight,1);camera.fov=innerWidth<700?64:52;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);});
  clock=new THREE.Clock();
}
function makeGround(){
  const groundMat=terrainMaterial((ctx,n)=>{
    const rnd=lcg(1204);
    ctx.fillStyle='#6a5846';ctx.fillRect(0,0,n,n);
    for(let i=0;i<36;i++){
      ctx.fillStyle=`rgba(${100+rnd()*50|0},${78+rnd()*36|0},${52+rnd()*24|0},${0.12+rnd()*0.22})`;
      ctx.beginPath();ctx.ellipse(rnd()*n,rnd()*n,18+rnd()*80,10+rnd()*36,rnd()*3,0,Math.PI*2);ctx.fill();
    }
    for(let i=0;i<5000;i++){
      const a=rnd()*0.28;
      ctx.fillStyle=rnd()>0.55?`rgba(196,168,124,${a})`:`rgba(42,32,22,${a})`;
      ctx.fillRect(rnd()*n,rnd()*n,rnd()*2.4+0.3,rnd()*1.4+0.3);
    }
    ctx.strokeStyle='rgba(48,34,22,0.2)';ctx.lineWidth=1;
    for(let i=0;i<16;i++){
      let x=rnd()*n,y=rnd()*n;ctx.beginPath();ctx.moveTo(x,y);
      for(let k=0;k<4;k++){x+=(rnd()-0.5)*48;y+=rnd()*22;ctx.lineTo(x,y);}ctx.stroke();
    }
  },512,16,16,1,2.1);
  groundTexture=groundMat.map;
  const terrainGeo=new THREE.PlaneGeometry(330,310,low?40:70,low?36:68);terrainGeo.rotateX(-Math.PI/2);
  const pos=terrainGeo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getZ(i),outer=smooth(18,46,Math.abs(x));
    const h=(Math.sin(x*.065)*1.7+Math.cos(z*.058+x*.025)*1.15+Math.sin(z*.17+x*.13)*.55)*outer;
    pos.setY(i,Math.max(-.4,h));
  }
  terrainGeo.computeVertexNormals();
  const terrain=mesh(terrainGeo,groundMat,scene,0,0,0,false);terrain.receiveShadow=true;
  const roadMat=terrainMaterial((ctx,n)=>{
    const rnd=lcg(88);
    ctx.fillStyle='#5c4e3e';ctx.fillRect(0,0,n,n);
    for(let i=0;i<1800;i++){
      ctx.fillStyle=`rgba(${70+rnd()*40|0},${58+rnd()*24|0},${42+rnd()*16|0},${0.2+rnd()*0.3})`;
      ctx.fillRect(rnd()*n,rnd()*n,rnd()*6+1,rnd()*2+0.4);
    }
  },256,2,18,0.96,1.2);
  const road=mesh(new THREE.PlaneGeometry(13.5,118),roadMat,scene,0,0.03,-2,false);
  road.rotation.x=-Math.PI/2;road.receiveShadow=true;
  for(let i=0;i<(low?40:90);i++){
    const x=pick(-16,16),z=pick(-52,50);if(Math.abs(x)<4.2&&rand()>.3)continue;
    const stone=mesh(new THREE.DodecahedronGeometry(pick(.08,.28),0),materials.rock,scene,x,0.02,z,false);
    stone.scale.y=0.35+rand()*0.25;stone.rotation.set(rand(),rand()*TAU,rand());
  }
  const mountainMat=[0,1,2].map(()=>new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0}));
  for(let i=0;i<28;i++){
    const side=i<16?(rand()>.5?1:-1):0;
    const x=side?side*pick(62,150):pick(-150,150),z=side?pick(-170,90):pick(-190,-100);
    rockyPeak(THREE,scene,mountainMat[i%3],x,z,pick(12,32),pick(18,52),rand);
  }
  makeTree(13,33,1.2);makeTree(-14,26,0.95);makeTree(15,6,1.25);makeTree(-16,2,1.05);
  for(let i=0;i<(low?12:26);i++){const side=rand()>.5?1:-1;makeTree(side*pick(20,72),pick(-68,62),pick(.7,1.45));}
  const dustCount=low?70:200,dustGeo=new THREE.BufferGeometry(),dustPos=new Float32Array(dustCount*3);
  for(let i=0;i<dustCount;i++){dustPos[i*3]=(rand()-.5)*70;dustPos[i*3+1]=rand()*4.5+.2;dustPos[i*3+2]=(rand()-.5)*110;}
  dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));
  scene.add(new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xcbb89a,size:0.055,transparent:true,opacity:0.22,depthWrite:false,sizeAttenuation:true})));
}
let needleMaterial=null;
function needleMaterialOnce(){
  if(needleMaterial)return needleMaterial;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const g=canvas.getContext('2d');const rnd=lcg(77);
  g.fillStyle='#3f4a38';g.fillRect(0,0,256,256);
  g.globalCompositeOperation='destination-in';
  g.fillStyle='#fff';g.beginPath();g.moveTo(128,18);
  g.bezierCurveTo(230,70,236,150,128,236);g.bezierCurveTo(20,150,26,70,128,18);g.fill();
  g.globalCompositeOperation='source-over';
  for(let i=0;i<80;i++){
    const x=40+rnd()*176,y=30+rnd()*190;
    g.fillStyle=`rgba(${48+rnd()*24|0},${62+rnd()*28|0},${38+rnd()*16|0},${0.35+rnd()*0.4})`;
    g.beginPath();g.ellipse(x,y,6+rnd()*16,3+rnd()*8,rnd()*3,0,Math.PI*2);g.fill();
  }
  const map=makeCanvasTexture(THREE,canvas,true);
  needleMaterial=new THREE.MeshStandardMaterial({map,color:0xb7b59a,roughness:1,metalness:0,alphaTest:0.25,side:THREE.DoubleSide});
  return needleMaterial;
}
function makeTree(x,z,s=1){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rand()*TAU;g.rotation.z=(rand()-.5)*.05;scene.add(g);
  const trunk=cyl(g,materials.bark,0,1.15*s,0,.055*s,.11*s,2.3*s,7);trunk.castShadow=!low;
  const mat=needleMaterialOnce();
  for(let t=0;t<5;t++){
    const y=(1.25+t*.46)*s,rad=(1.2-t*.18)*s;
    for(let k=0;k<2;k++){
      const card=mesh(new THREE.PlaneGeometry(rad*2.15,.7*s),mat,g,0,y,0,false);
      card.rotation.y=k*Math.PI/2+t*.4;
    }
  }
  if(!low){
    const branch=cyl(g,materials.bark,.35*s,1.55*s,.05,.02*s,.035*s,.7*s,5);
    branch.rotation.z=1.15;branch.castShadow=false;
  }
}
function plaqueTexture(){return decalTexture((g,w,h)=>{g.fillStyle='#2a241e';g.fillRect(0,0,w,h);g.lineWidth=8;g.strokeStyle='#8d7348';g.strokeRect(8,8,w-16,h-16);g.textAlign='center';g.textBaseline='middle';g.fillStyle='#e6d3b0';g.font='600 46px serif';g.fillText('虎牢关',w*.5,h*.52);},256,96);}
function bannerTexture(symbol,cloth='#6e2e28') {return decalTexture((g,w,h)=>{g.fillStyle=cloth;g.fillRect(0,0,w,h);g.strokeStyle='#a89060';g.lineWidth=10;g.strokeRect(14,16,w-28,h-32);g.fillStyle='#e7d7b4';g.font='600 132px serif';g.textAlign='center';g.textBaseline='middle';g.fillText(symbol,w/2,h*.46);},256,300);}
function makeBanner(x,z,scale=1,side='red'){
  const grp=new THREE.Group();grp.position.set(x,0,z);scene.add(grp);
  cyl(grp,materials.timber,0,3.6*scale,0,.05*scale,.07*scale,7.2*scale,8);
  cyl(grp,materials.bronze,0,7.25*scale,0,.08*scale,.12*scale,.28*scale,6);
  rodBetween(grp,materials.bronze,V(-.72*scale,6.7*scale,0),V(.72*scale,6.7*scale,0),.03*scale);
  const geo=new THREE.PlaneGeometry(1.25*scale,2.05*scale,8,6);
  const cloth=side==='red'?'#6e2e28':'#2c4038';
  const flag=mesh(geo,new THREE.MeshStandardMaterial({map:bannerTexture(side==='red'?'呂':'漢',cloth),side:THREE.DoubleSide,roughness:.96,metalness:0}),grp,0,5.5*scale,0,false);
  flag.userData.base=new Float32Array(geo.attributes.position.array);banners.push(flag);return grp;
}
function pavilionRoof(x,y,z,radius,height,sx,sz){
  const g=new THREE.Group();g.position.set(x,y,z);g.scale.set(sx,1,sz);scene.add(g);
  const eave=cyl(g,materials.roof,0,0,0,radius,radius*.98,.28,4);eave.rotation.y=Math.PI/4;
  const roof=cone(g,materials.roof,0,height*.52,0,radius*.94,height,4);roof.rotation.y=Math.PI/4;
  cyl(g,materials.bronze,0,height*.92,0,.1,.18,.55,6);
}
function watchTower(x,z){
  box(scene,materials.wall,x,.9,z,8.6,1.8,8.6);
  box(scene,materials.wall,x,7.4,z,6.4,11,6.4);
  for(let i=0;i<8;i++){
    const a=i*TAU/8;
    box(scene,materials.wallTop,x+Math.sin(a)*2.85,13.2,z+Math.cos(a)*2.85,1.05,1.15,1.05);
  }
  pavilionRoof(x,13.6,z,4.7,3.4,1,1);
}
function makeWall(){
  const gateZ=-74;
  for(const sign of [-1,1]){
    box(scene,materials.wall,sign*30,.7,gateZ,34,1.4,8.2);
    box(scene,materials.wall,sign*30,6.2,gateZ,32,9.6,6.6);
    for(let i=-4;i<=4;i++) box(scene,materials.wallTop,sign*30+i*3.3,11.5,gateZ,1.45,1.2,6.9);
    for(let i=-1;i<=1;i++) box(scene,materials.iron,sign*30+i*8,6.4,gateZ+3.4,.16,1.5,.18);
    watchTower(sign*11.2,gateZ);
    watchTower(sign*49,gateZ);
  }
  box(scene,materials.wall,0,15.6,gateZ,16.5,5.4,7.2);
  pavilionRoof(0,18.4,gateZ,8.6,4.2,1.45,1.05);
  for(const sign of [-1,1]){
    box(scene,materials.timber,sign*2.7,4.7,gateZ+3.35,4.7,9.2,.26);
    for(let r=0;r<4;r++) for(let c=0;c<2;c++){
      const stud=cyl(scene,materials.iron,sign*2.7+(c-.5)*1.5,2.1+r*2.05,gateZ+3.52,.09,.09,.06,6);
      stud.rotation.x=Math.PI/2;
    }
  }
  box(scene,materials.timber,0,9.5,gateZ+3.5,11.2,.55,.4);
  const plaque=plaqueTexture();
  mesh(new THREE.PlaneGeometry(6.4,1.7),new THREE.MeshStandardMaterial({map:plaque,roughness:.62,metalness:.12,emissive:0x3a2e22,emissiveMap:plaque,emissiveIntensity:.35}),scene,0,16.8,gateZ+3.7,false);
  for(const s of [-1,1]) makeBanner(s*20,gateZ+12,.95);
}
let tentMaterial=null;
function tentCloth(){
  if(tentMaterial) return tentMaterial;
  tentMaterial=terrainMaterial((ctx,n)=>{
    const rnd=lcg(501);
    ctx.fillStyle='#b7a88e';ctx.fillRect(0,0,n,n);
    for(let y=0;y<n;y+=6){ctx.fillStyle=`rgba(90,70,48,${0.05+rnd()*0.08})`;ctx.fillRect(0,y,n,2);}
    for(let i=0;i<30;i++){ctx.strokeStyle=`rgba(80,60,40,${0.15+rnd()*0.2})`;ctx.beginPath();ctx.moveTo(rnd()*n,0);ctx.lineTo(rnd()*n,n);ctx.stroke();}
  },256,2,2,0.96,0.8);
  tentMaterial.side=THREE.DoubleSide;
  return tentMaterial;
}
function makeCamp(){
  for(const side of [-1,1]){
    for(let j=0;j<4;j++){
      const x=side*(22+pick(0,6)),z=-36+j*22+pick(-2,2);
      const tent=new THREE.Group();tent.position.set(x,0,z);tent.rotation.y=side*-.18;scene.add(tent);
      box(tent,materials.timber,0,.06,0,5.2,.1,3.4);
      const geo=new THREE.PlaneGeometry(4.4,2.5,8,5);
      const attr=geo.attributes.position;
      for(let i=0;i<attr.count;i++){
        const px=attr.getX(i),py=attr.getY(i);
        attr.setZ(i,Math.sin((py/2.5+.5)*Math.PI)*.12*(1-Math.min(1,Math.abs(px)/2.2)));
      }
      geo.computeVertexNormals();
      for(const half of [-1,1]){
        const flap=mesh(geo,tentCloth(),tent,half*1.05,1.45,0,false);
        flap.rotation.z=half*-.58;
      }
      const ridge=cyl(tent,materials.timber,0,2.35,0,.045,.045,3.5,6);ridge.rotation.x=Math.PI/2;
      if(j%2===0) makeBanner(x+side*4.2,z,.62,j%4===0?'green':'red');
      blocked.push({x,z,r:3.6,height:3.0});
    }
  }
  for(let i=0;i<10;i++){
    const x=(i%2?1:-1)*pick(16,28),z=pick(-48,52);
    if(blocked.some(b=>Math.hypot(x-b.x,z-b.z)<6)) continue;
    const barrel=cyl(scene,materials.timber,x,.42,z,.32,.36,.84,8);
    barrel.rotation.z=pick(-.08,.08);
    cyl(scene,materials.iron,x,.18,z,.34,.34,.05,8);
    cyl(scene,materials.iron,x,.66,z,.33,.33,.04,8);
  }
  for(const side of [-1,1]){makeFire(side*12,-22);makeFire(side*15,18);makeFire(side*10,-48);}
}
let flameMap=null,smokeMap=null;
function flameTexture(){
  if(flameMap) return flameMap;
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=256;
  const g=canvas.getContext('2d');
  const glow=g.createRadialGradient(64,168,6,64,180,78);
  glow.addColorStop(0,'rgba(255,236,200,0.95)');
  glow.addColorStop(.35,'rgba(255,148,48,0.72)');
  glow.addColorStop(.68,'rgba(170,46,12,0.22)');
  glow.addColorStop(1,'rgba(40,10,0,0)');
  g.fillStyle=glow;g.fillRect(0,0,128,256);
  g.globalCompositeOperation='destination-in';g.fillStyle='#fff';
  g.beginPath();g.moveTo(64,16);g.bezierCurveTo(112,78,98,150,72,236);g.lineTo(56,236);g.bezierCurveTo(24,150,18,86,64,16);g.fill();
  flameMap=makeCanvasTexture(THREE,canvas,true);
  flameMap.wrapS=flameMap.wrapT=THREE.ClampToEdgeWrapping;
  return flameMap;
}
function smokeTexture(){
  if(smokeMap) return smokeMap;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const g=canvas.getContext('2d');
  const glow=g.createRadialGradient(64,64,8,64,64,60);
  glow.addColorStop(0,'rgba(180,170,156,0.45)');
  glow.addColorStop(1,'rgba(180,170,156,0)');
  g.fillStyle=glow;g.fillRect(0,0,128,128);
  smokeMap=makeCanvasTexture(THREE,canvas,true);
  return smokeMap;
}
function makeFire(x,z){
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  cyl(g,materials.rock,0,.1,0,.62,.74,.2,8);
  for(let j=0;j<6;j++){
    const a=j*TAU/6;
    const stone=mesh(new THREE.DodecahedronGeometry(.14,0),materials.rock,g,Math.sin(a)*.55,.1,Math.cos(a)*.55,false);
    stone.scale.y=.55;stone.rotation.y=a;
  }
  for(let j=0;j<3;j++){
    const log=cyl(g,materials.bark,0,.26,0,.055,.07,.85,6);
    log.rotation.z=Math.PI/2;log.rotation.y=j*1.15;
  }
  const flame=new THREE.Group();flame.position.y=.32;g.add(flame);
  const mat=new THREE.MeshBasicMaterial({map:flameTexture(),transparent:true,depthWrite:false,side:THREE.DoubleSide,opacity:.88});
  for(let i=0;i<3;i++){
    const plane=mesh(new THREE.PlaneGeometry(.5,1.05),mat,flame,0,.5,0,false);
    plane.rotation.y=i*Math.PI/3;
  }
  const insideMat=mat.clone();insideMat.opacity=.7;insideMat.color=new THREE.Color(0xffe2b4);
  const inside=mesh(new THREE.PlaneGeometry(.26,.7),insideMat,g,0,.62,0,false);
  const smoke=mesh(new THREE.PlaneGeometry(.8,.8),new THREE.MeshBasicMaterial({map:smokeTexture(),transparent:true,depthWrite:false,opacity:.12,side:THREE.DoubleSide}),g,0,1.55,0,false);
  const light=new THREE.PointLight(0xff7a3c,low?3.5:7,6.5,2);light.position.y=.75;g.add(light);
  fires.push({flame,inside,smoke,light,offset:rand()*20});
}

function makeWarrior(kind='soldier'){return makeDetailedWarrior(THREE,kind,low);}
function createPlayer(){
  const model=makeWarrior('hero');model.scale.setScalar(1.05);model.position.set(0,0,42);scene.add(model);characterAssets.attach(model,'hero');
  player={id:0,model,hp:100,maxHp:100,energy:80,attack:null,attackQueue:null,skillCD:0,invuln:0,dodge:0,dodgeDir:V(),facing:Math.PI,walk:0,velocity:V(),hitStun:0};
  model.rotation.y=0;return player;
}
function enemyStats(kind){return kind==='boss'?{hp:660,speed:2.75,reach:3.3,damage:17,scale:1.16}:
  kind==='elite'?{hp:110,speed:2.85,reach:2.3,damage:12,scale:1.04}:{hp:55,speed:3.1,reach:2.1,damage:7,scale:1};}
function spawnEnemy(kind='soldier'){
  const dist=pick(19,32),angle=pick(-1.14,1.14),x=clamp(player.model.position.x+Math.sin(angle)*dist,-31,31);
  let z=clamp(player.model.position.z-Math.cos(angle)*dist,-52,48);
  if(kind==='boss'){z=-37;}
  const st=enemyStats(kind);const model=makeWarrior(kind);model.scale.setScalar(st.scale);model.position.set(kind==='boss'?0:x,0,z);scene.add(model);characterAssets.attach(model,kind);
  const enemy={id:nextId++,kind,model,hp:st.hp,maxHp:st.hp,speed:st.speed,reach:st.reach,damage:st.damage,windup:0,attackCD:pick(.2,1.0),stun:0,walk:rand()*TAU,dead:false,death:0,hitFlash:0,knock:V(),facing:0};
  enemies.push(enemy);if(kind==='boss'){$('boss-hud').hidden=false;$('boss-fill').style.width='100%';toast('飞将吕布，亲临战阵！',2.5);}
  return enemy;
}
function waveData(n){return n===1?{count:11,elite:0,name:'第一阵 · 西凉先锋',goal:'击溃西凉军前锋'}:n===2?{count:16,elite:4,name:'第二阵 · 精锐压境',goal:'冲破西凉精锐'}:{count:20,elite:7,name:'第三阵 · 飞将当关',goal:'斩破吕布与守关军'};}
function beginWave(n){wave=n;waveStarted=elapsed;const cfg=waveData(n);pending=cfg.count;spawnClock=0;bossSpawned=false;
  $('objective').textContent=cfg.goal;$('stage').textContent=cfg.name;toast(['','西凉军前锋，杀！','敌军增援！破阵而出！','虎牢关决战！'][n],2.4);
}
function resetGame(){for(const e of enemies){characterAssets.detach(e.model);scene.remove(e.model);disposeDetailedWarrior(e.model);}enemies=[];
  combatEffects.clear();
  if(player){characterAssets.detach(player.model);scene.remove(player.model);disposeDetailedWarrior(player.model);}createPlayer();phase='playing';wave=0;kills=0;combo=0;comboClock=0;elapsed=0;shake=0;
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
  player.motionToken=(player.motionToken||0)+1;
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
    enemy.hp-=atk.damage;enemy.motionToken=(enemy.motionToken||0)+1;enemy.stun=atk.kind==='skill'?.8:atk.kind==='heavy'?.5:.22;enemy.hitFlash=.16;
    enemy.knock.add(v.setY(0).normalize().multiplyScalar(atk.kind==='skill'?13:atk.kind==='heavy'?8:4.5));
    emitSparks(enemy.model.position.clone().add(V(0,1.5,0)),atk.kind==='skill'?0xffd079:0xffb67d,atk.kind==='skill'?16:8);
    if(enemy.kind==='boss')$('boss-fill').style.width=`${Math.max(0,enemy.hp/enemy.maxHp*100)}%`;
    if(enemy.hp<=0)killEnemy(enemy);
    else sound(95,.07,'hit');
  }
  if(hits){player.energy=clamp(player.energy+hits*(atk.kind==='skill'?0:5),0,100);shake=Math.max(shake,Math.min(.32,.1+hits*.03));
    showCombo(hits);sound(atk.kind==='skill'?70:65,.09,'hit');}
}
function killEnemy(e){if(e.dead)return;e.dead=true;e.death=0;e.motionToken=(e.motionToken||0)+1;e.model.userData.weapon.rotation.z=.32;
  kills++;$('ko-count').textContent=kills;sound(e.kind==='boss'?55:85,.20,'fall');
  emitSparks(e.model.position.clone().add(V(0,1.1,0)),0xe9a66e,9);
  if(e.kind==='boss')toast('飞将已败！',2);
}
function showCombo(hits){const c=$('combo');c.hidden=false;$('combo-num').textContent=(Number($('combo-num').textContent)||0)+hits;
  comboClock=1.7;}
function emitSparks(center,color,count){combatEffects.emitSparks(center,color,count);}
function slash(radius,arc=2.2,skill=false){combatEffects.slash(player.model.position,player.model.rotation.y,radius,arc,skill);}
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
  player.motionToken=(player.motionToken||0)+1;player.dodgeDir.normalize();player.dodge=.47;player.invuln=.52;emitSparks(player.model.position.clone().add(V(0,.22,0)),0xc8ac84,9);sound(200,.11,'air');
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
  player.hp=Math.max(0,player.hp-amount);player.motionToken=(player.motionToken||0)+1;player.invuln=.85;player.hitStun=.24;shake=.4;flashTimer=.18;
  $('hit-flash').classList.add('active');sound(55,.24,'fall');
  const away=player.model.position.clone().sub(attacker.model.position).setY(0).normalize();moveSafe(player.model,away.x*1.4,away.z*1.4);
  emitSparks(player.model.position.clone().add(V(0,1.3,0)),0xf2c28b,8);
  if(player.hp<=0)finish(false);
}
function updateEnemies(dt){const target=player.model.position;
  for(const e of enemies){const ud=e.model.userData;
    if(e.dead){e.death+=dt;ud.rig.rotation.z=lerp(ud.rig.rotation.z,1.48,Math.min(1,dt*4));ud.rig.position.y=lerp(ud.rig.position.y,-.45,Math.min(1,dt*4));if(e.death>2.2){characterAssets.detach(e.model);scene.remove(e.model);disposeDetailedWarrior(e.model);e.remove=true;}continue;}
    e.stun=Math.max(0,e.stun-dt);e.hitFlash=Math.max(0,e.hitFlash-dt);e.attackCD=Math.max(0,e.attackCD-dt);
    // Each enemy has a simple stagger / telegraph / strike / recovery state machine.
    const delta=target.clone().sub(e.model.position),dist=Math.max(.01,Math.hypot(delta.x,delta.z));
    rotateTo(e.model,facingTo(delta.x,delta.z),dt,e.kind==='boss'?5.4:7.5);
    e.walking=false;
    if(e.stun>0){moveSafe(e.model,e.knock.x*dt,e.knock.z*dt,e.kind==='boss'?.85:.5);e.knock.multiplyScalar(Math.exp(-dt*9));}
    else if(e.windup>0){e.windup-=dt;ud.weapon.rotation.z=-.8+Math.sin((.7-e.windup)*7)*.5;
      if(e.windup<=0){ud.weapon.rotation.z=0;e.attackCD=e.kind==='boss'?2:pick(1.15,1.9);
        if(dist<e.reach+1 && Math.abs(normalizeAngle(facingTo(delta.x,delta.z)-e.model.rotation.y))<1.3){damagePlayer(e.damage,e);}
        if(e.kind==='boss'){slashEnemy(e);}}
    }else if(dist<e.reach+pick(.1,.25) && e.attackCD<=0){e.windup=e.kind==='boss'?.78:.54;e.motionToken=(e.motionToken||0)+1;}
    else if(dist>e.reach*.78){let vx=delta.x/dist,vz=delta.z/dist;
      // Gentle separation avoids complete overlap without costly physics simulation.
      for(const other of enemies){if(other===e||other.dead)continue;const ox=e.model.position.x-other.model.position.x,oz=e.model.position.z-other.model.position.z,d2=ox*ox+oz*oz;
        if(d2<3.2&&d2>.01){const f=(3.2-d2)*.33;vx+=ox*f;vz+=oz*f;}}
      const l=Math.hypot(vx,vz)||1;e.walking=true;moveSafe(e.model,vx/l*e.speed*dt,vz/l*e.speed*dt,e.kind==='boss'?.85:.5);e.walk+=dt*8;
    }
    if(e.stun<=0){ud.rig.userData.rightArm.rotation.x=-Math.sin(e.walk)*.19;ud.rig.userData.leftArm.rotation.x=Math.sin(e.walk)*.19;const stride=Math.min(1,(dist-e.reach*.75)/3);ud.legs[0].rotation.x=Math.sin(e.walk)*.36*stride;ud.legs[1].rotation.x=-Math.sin(e.walk)*.36*stride;}
    ud.rig.position.y=Math.sin(e.walk*2)*.035;
    if(e.hitFlash>0){ud.rig.scale.setScalar(1+e.hitFlash*.7);}else ud.rig.scale.setScalar(1);
  }
  enemies=enemies.filter(e=>!e.remove);
}
function slashEnemy(e){const pos=e.model.position.clone();emitSparks(pos.add(V(0,1,0)),0xff5140,13);shake=Math.max(shake,.24);}
function updateCharacterMotion(dt) {
  if(!characterAssets || !player)return;
  const p=player;
  const moving=Math.hypot(moveInput().x,moveInput().y)>.08;
  const playerState=p.hitStun>0?'hit':p.dodge>0?'dodge':p.attack
    ?p.attack.kind==='skill'?'skill':p.attack.kind==='heavy'?'heavy':'attack'
    :moving?(keys.has('shift')?'run':'walk'):'idle';
  characterAssets.setState(p.model,playerState,p.motionToken||0,p.attack?.duration||0);
  for(const e of enemies){
    const motion=e.dead?'death':e.stun>0?'hit':e.windup>0?'attack'
      :e.walking?'walk':'idle';
    characterAssets.setState(e.model,motion,e.motionToken||e.id,
      motion==='attack'?(e.kind==='boss'?.78:.54):0);
  }
  characterAssets.update(dt);
}
function updateWave(dt){if(pending>0){spawnClock-=dt;const active=enemies.filter(e=>!e.dead).length;
    if(spawnClock<=0 && active<MAX_ENEMIES){const idx=waveData(wave).count-pending;spawnEnemy(wave>1&&idx%4===0?'elite':'soldier');pending--;spawnClock=pick(.55,1.35);}}
  if(wave===3&&!bossSpawned&&elapsed-waveStarted>7){spawnEnemy('boss');bossSpawned=true;}
  if(pending===0&&!enemies.some(e=>!e.dead)&& (wave<3||bossSpawned)){
    if(wave<3)beginWave(wave+1);else finish(true);
  }
}
function updateEffects(dt){combatEffects.update(dt);
  for(const f of fires){const w=elapsed*6+f.offset;f.flame.scale.y=.9+Math.sin(w)*.1;f.flame.rotation.y=w*.45;f.inside.scale.y=.92+Math.sin(w*1.3)*.12;f.inside.rotation.y=f.flame.rotation.y;f.inside.material.opacity=.55+Math.sin(w*1.4)*.12;if(f.smoke){f.smoke.position.y=1.55+Math.sin(w*.3)*.08;f.smoke.material.opacity=.1+Math.sin(w*.5)*.03;f.smoke.rotation.y=w*.2;}f.light.intensity=(low?3.5:7)*(0.8+Math.sin(w)*.18);}
  if(!reduceMotion)for(const flag of banners){const pos=flag.geometry.attributes.position,base=flag.userData.base;
    for(let i=0;i<pos.count;i++){const x=base[i*3],y=base[i*3+1];pos.setZ(i,Math.sin(elapsed*2.5+x*2+y*1.2)*.19*(1+Math.abs(x)*.35));}
    pos.needsUpdate=true;flag.geometry.computeVertexNormals();}
  if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.remove('show');}
  if(flashTimer>0){flashTimer-=dt;if(flashTimer<=0)$('hit-flash').classList.remove('active');}
  if(comboClock>0){comboClock-=dt;if(comboClock<=0){$('combo').hidden=true;$('combo-num').textContent='0';}}
}
function updateCamera(dt){const focus=player.model.position;
  const dist=cameraDistance,ca=Math.cos(cameraPitch),sa=Math.sin(cameraPitch);
  const desired=V(focus.x+Math.sin(cameraYaw)*dist*ca,1.1+dist*.06+dist*sa,focus.z+Math.cos(cameraYaw)*dist*ca);
  const target=resolveCameraTarget(V(focus.x,2.1,focus.z),desired,blocked);
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
    updatePlayer(dt);updateEnemies(dt);updateWave(dt);updateCharacterMotion(dt);updateEffects(dt);updateCamera(dt);
    if((Math.floor(elapsed*10)%2)===0)refreshHud();
  }else if(player){if(phase==='boot'){player.model.userData.rig.position.y=Math.sin(performance.now()*.001)*.04;}
    updateCamera(dt);for(const f of fires){f.flame.rotation.y+=dt*.4;}}
  if(renderer){renderer.render(scene,camera);}
}
try{
  setupRenderer();combatEffects=createCombatEffects(THREE,scene,{low,random:rand});characterAssets=createCharacterAssets(THREE,{low});makeGround();makeWall();makeCamp();enhanceBattlefield(THREE,scene,materials,low,rand);createPlayer();attachInputs();
  characterAssets.prepare().then(({loaded})=>{if(loaded)console.info('Hulao: loaded licensed GLB character types:',loaded);});
  phase='boot';updateCamera(1);$('boot-status').textContent='战场已集结 · 点击出阵';
  // Lightweight smoke motes near the gate; avoid large postprocessing dependencies.
  animate();
  window.__HULAO_READY__=true;
  window.__HULAO_STATE__=()=>({phase,wave,kills,enemies:enemies.filter(e=>!e.dead).length,hp:player.hp,energy:player.energy});
}catch(err){console.error('Hulao Gate initialization failed',err);$('error-message').textContent=err.message||String(err);$('error-screen').hidden=false;$('boot-status').textContent='无法初始化 WebGL';}