import * as THREE from 'three';
import './style.css';

const $ = (id:string) => document.getElementById(id)!;
const canvas=$('game') as HTMLCanvasElement;
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.8)); renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.4;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xa5a69b);scene.fog=new THREE.FogExp2(0xa6a49a,0.0085);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,350);
const hemi=new THREE.HemisphereLight(0xd9e8f2,0x75543a,2.1);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe2ae,3.4);sun.position.set(-65,105,-50);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-95;sun.shadow.camera.right=95;sun.shadow.camera.top=95;sun.shadow.camera.bottom=-95;sun.shadow.normalBias=.04;scene.add(sun);
const mat=(color:number,roughness=.86,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const sand=mat(0x92846b), stone=mat(0x6d6861), darkStone=mat(0x454747),wood=mat(0x4e3022),roof=mat(0x393b3b),gold=mat(0xb99554,.45,.7),steel=mat(0xadb4b2,.32,.78),red=mat(0x7b2825),blue=mat(0x263e4e),black=mat(0x22282b),skin=mat(0xb88a66),cloth=mat(0x55433a);
function mesh(g:THREE.BufferGeometry,m:THREE.Material,parent:THREE.Object3D,x=0,y=0,z=0,shadow=true){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o}
function box(w:number,h:number,d:number,m:THREE.Material,parent:THREE.Object3D,x=0,y=0,z=0){return mesh(new THREE.BoxGeometry(w,h,d),m,parent,x,y,z)}
function cyl(rt:number,rb:number,h:number,m:THREE.Material,parent:THREE.Object3D,x=0,y=0,z=0,n=9){return mesh(new THREE.CylinderGeometry(rt,rb,h,n),m,parent,x,y,z)}
function ball(r:number,m:THREE.Material,parent:THREE.Object3D,x=0,y=0,z=0){return mesh(new THREE.SphereGeometry(r,10,8),m,parent,x,y,z)}
const ground=mesh(new THREE.PlaneGeometry(440,440),sand,scene,0,-.05,0,false);ground.rotation.x=-Math.PI/2;
const road=mesh(new THREE.PlaneGeometry(23,195),mat(0x766d60),scene,0,-.035,-2,false);road.rotation.x=-Math.PI/2;
// Gate: layered fortress walls, towers, crenellations and tiled roofs.
box(80,13,7,stone,scene,0,6.5,-83);box(19,16,12,darkStone,scene,0,8,-81);
box(12,10,2,wood,scene,0,5,-73.8);
for(let x=-39;x<=39;x+=4){box(2.6,2.3,7.6,darkStone,scene,x,14.2,-83)}
for(const x of [-31,31]){box(15,23,15,stone,scene,x,11.5,-79);box(18,2,18,wood,scene,x,23,-79);const a=box(19,5,19,roof,scene,x,26,-79);a.rotation.z=.04;box(14,3,14,roof,scene,x,29,-79);for(let k=-1;k<=1;k++)box(1.3,7,1.3,wood,scene,x+k*4,25,-72)}
box(22,3,14,roof,scene,0,19,-81);box(18,2,12,roof,scene,0,22,-81);
for(let i=0;i<16;i++){const x=(i%2?1:-1)*(16+Math.random()*85),z=-55+Math.random()*140;const h=2+Math.random()*5;const rock=mesh(new THREE.DodecahedronGeometry(h*.65,0),mat(i%3===0?0x77756d:0x817969),scene,x,h*.23,z);rock.scale.set(1.4,.45,1);rock.castShadow=false}
function banner(x:number,z:number,color:THREE.Material){cyl(.12,.15,9,wood,scene,x,4.5,z);const flag=box(3.1,3.8,.12,color,scene,x+1.55,7.2,z);flag.rotation.y=.1;box(.6,.6,.6,gold,scene,x,9.1,z)}
for(const x of [-17,17])for(const z of [-35,10,55])banner(x,z,x<0?blue:red);
for(let i=0;i<40;i++){const x=(Math.random()-.5)*175,z=(Math.random()-.5)*155;if(Math.abs(x)<18)continue;const t=new THREE.Group();t.position.set(x,0,z);scene.add(t);cyl(.3,.45,3,wood,t,0,1.5);const leaves=mat(0x485344);for(let k=0;k<3;k++){const c=mesh(new THREE.ConeGeometry(2.2-k*.35,3,7),leaves,t,0,3+k*1.15,0);c.castShadow=false}}
// Procedural humanoid warriors; limb joints animate independently.
type Fighter={root:THREE.Group,body:THREE.Group,armL:THREE.Group,armR:THREE.Group,legL:THREE.Group,legR:THREE.Group,weapon:THREE.Group,hp:number,max:number,attackCd:number,stun:number,phase:number,dead:boolean,boss:boolean,speed:number,hitFlash:number};
function createFighter(color:THREE.Material,isBoss=false,hero=false):Fighter{
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 const s=isBoss?1.4:hero?1.13:1;body.scale.setScalar(s);
 const chest=box(.85,1.05,.49,color,body,0,1.55);box(.95,.22,.6,gold,body,0,1.1);box(.72,.25,.6,steel,body,0,2.06);
 ball(.35,skin,body,0,2.42);const helmet=cyl(.38,.37,.32,black,body,0,2.7);helmet.rotation.z=.05;cyl(.08,.12,.48,gold,body,0,3.02);
 const armL=new THREE.Group(),armR=new THREE.Group(),legL=new THREE.Group(),legR=new THREE.Group();
 for(const [arm,sign] of [[armL,-1],[armR,1]] as const){arm.position.set(sign*.57,1.95,0);body.add(arm);box(.25,.72,.28,color,arm,0,-.36);ball(.16,steel,arm,0,-.73)}
 for(const [leg,sign] of [[legL,-1],[legR,1]] as const){leg.position.set(sign*.24,1.02,0);body.add(leg);box(.31,.88,.34,cloth,leg,0,-.44);box(.34,.22,.54,black,leg,0,-.92,.12)}
 const weapon=new THREE.Group();armR.add(weapon);weapon.position.set(0,-.7,.1);cyl(.055,.055,3.3,wood,weapon,0,-.45,1.1);const blade=mesh(new THREE.ConeGeometry(.2,.9,5),steel,weapon,0,-.45,3.1);blade.rotation.x=Math.PI/2;ball(.12,gold,weapon,0,-.45,2.5);
 if(hero){const cape=box(.92,1.25,.07,blue,body,0,1.45,-.32);cape.rotation.x=-.12;box(.23,.9,.15,gold,body,0,1.55,.31)}
 if(isBoss){box(1.15,.27,.7,gold,body,0,2.08);const plume=mesh(new THREE.ConeGeometry(.2,1.4,7),red,body,0,3.38,0);plume.rotation.z=-.2}
 scene.add(root);return{root,body,armL,armR,legL,legR,weapon,hp:isBoss?520:hero?100:50,max:isBoss?520:hero?100:50,attackCd:0,stun:0,phase:Math.random()*10,dead:false,boss:isBoss,speed:isBoss?4.2:3.1,hitFlash:0};
}
const player=createFighter(blue,false,true);player.root.position.set(0,0,67);
let enemies:Fighter[]=[];let boss:Fighter|null=null;let kills=0,energy=0,elapsed=0,spawnTimer=0,attackTimer=0,attackIndex=0,dodgeTime=0,invuln=0,toastTime=0,bossSpawned=false,mode:'menu'|'playing'|'paused'|'win'|'lose'='menu';
const keys=new Set<string>();let camYaw=0,camPitch=.25;let joystick={x:0,y:0};let touchLook=false,lastTouch={x:0,y:0};
function toast(s:string,duration=2.4){$('toast').textContent=s;$('toast').style.opacity='1';toastTime=duration}
function spawnEnemy(x:number,z:number,isBoss=false){const e=createFighter(isBoss?red:Math.random()<.4?cloth:red,isBoss);e.root.position.set(x,0,z);e.root.rotation.y=Math.PI;enemies.push(e);if(isBoss){boss=e;$('bossPanel').hidden=false;toast('虎牢关守将 · 吕布 出阵！',4)}return e}
function reset(){for(const e of enemies)scene.remove(e.root);enemies=[];boss=null;kills=0;energy=0;elapsed=0;spawnTimer=0;attackTimer=0;attackIndex=0;dodgeTime=0;invuln=0;bossSpawned=false;player.hp=100;player.root.position.set(0,0,67);player.root.rotation.y=Math.PI;camYaw=0;camPitch=.25;$('bossPanel').hidden=true;for(let i=0;i<10;i++)spawnEnemy((Math.random()-.5)*22,15-Math.random()*58);updateHud();}
function begin(){if(mode==='win'||mode==='lose'||mode==='menu')reset();mode='playing';$('overlay').classList.remove('visible');if(!matchMedia('(pointer:coarse)').matches)canvas.requestPointerLock?.().catch(()=>{});}
$('start').addEventListener('click',begin);
function overlay(title:string,desc:string,button:string){$('overlay').classList.add('visible');const h=$('overlay').querySelector('h1')!;h.textContent=title;$('overlayText').textContent=desc;$('start').textContent=button;}
function pause(){if(mode==='playing'){mode='paused';overlay('战斗暂停','按继续战斗返回战场。','继续战斗');document.exitPointerLock?.()}else if(mode==='paused'){mode='playing';$('overlay').classList.remove('visible');canvas.requestPointerLock?.().catch(()=>{})}}
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='Escape')pause();if(e.code==='KeyJ'&&!e.repeat)attack(false);if(e.code==='KeyK'&&!e.repeat)attack(true);if(e.code==='KeyQ'&&!e.repeat)musou();if(e.code==='Space'&&!e.repeat)dodge()});window.addEventListener('keyup',e=>keys.delete(e.code));
canvas.addEventListener('click',()=>{if(mode==='playing'&&!matchMedia('(pointer:coarse)').matches&&document.pointerLockElement!==canvas)canvas.requestPointerLock?.().catch(()=>{})});
canvas.addEventListener('mousedown',e=>{if(e.button===0&&mode==='playing')attack(false)});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas){camYaw-=e.movementX*.003;camPitch=THREE.MathUtils.clamp(camPitch+e.movementY*.002,-.15,.7)}});
canvas.addEventListener('touchstart',e=>{if(e.touches.length){touchLook=true;lastTouch={x:e.touches[0].clientX,y:e.touches[0].clientY}}},{passive:true});canvas.addEventListener('touchmove',e=>{if(touchLook&&e.touches.length){const t=e.touches[0];camYaw-=(t.clientX-lastTouch.x)*.008;camPitch=THREE.MathUtils.clamp(camPitch+(t.clientY-lastTouch.y)*.005,-.15,.7);lastTouch={x:t.clientX,y:t.clientY}}},{passive:true});canvas.addEventListener('touchend',()=>touchLook=false);
const joy=$('joystick'),stick=$('stick');function joyMove(e:PointerEvent){const r=joy.getBoundingClientRect();const x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;const length=Math.max(1,Math.hypot(x,y));const f=Math.min(1,55/length);joystick={x:x*f/55,y:y*f/55};stick.style.transform=`translate(${joystick.x*43}px,${joystick.y*43}px)`}joy.addEventListener('pointerdown',e=>{joy.setPointerCapture(e.pointerId);joyMove(e)});joy.addEventListener('pointermove',e=>{if(joy.hasPointerCapture(e.pointerId))joyMove(e)});for(const ev of ['pointerup','pointercancel'])joy.addEventListener(ev,()=>{joystick={x:0,y:0};stick.style.transform='' });
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-action]'))b.addEventListener('pointerdown',e=>{e.preventDefault();const a=b.dataset.action;if(a==='attack')attack(false);if(a==='heavy')attack(true);if(a==='dodge')dodge();if(a==='musou')musou()});
const sparks:{m:THREE.Mesh,v:THREE.Vector3,t:number}[]=[];function burst(p:THREE.Vector3,color:number,count=10){const material=new THREE.MeshBasicMaterial({color});for(let i=0;i<count;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.08,.08,.08),material);m.position.copy(p).add(new THREE.Vector3(0,1.3,0));scene.add(m);sparks.push({m,v:new THREE.Vector3((Math.random()-.5)*9,Math.random()*6,(Math.random()-.5)*9),t:.35+Math.random()*.35})}}
function slashFx(heavy=false){const geo=new THREE.TorusGeometry(heavy?3.2:2.5,.055,5,40,Math.PI*.95);const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:heavy?0xffd276:0xe9eef4,transparent:true,opacity:.8,side:THREE.DoubleSide}));m.rotation.x=Math.PI/2;m.rotation.z=player.root.rotation.y+Math.PI*.1;m.position.copy(player.root.position).add(new THREE.Vector3(0,1.4,0));scene.add(m);setTimeout(()=>{scene.remove(m);geo.dispose();(m.material as THREE.Material).dispose()},145)}
function attack(heavy:boolean){if(mode!=='playing'||attackTimer>0||dodgeTime>0)return;attackIndex++;attackTimer=heavy?.75:.34;player.armR.rotation.x=-2.2;slashFx(heavy);const dir=new THREE.Vector3(Math.sin(player.root.rotation.y),0,Math.cos(player.root.rotation.y));let hits=0;for(const e of enemies){if(e.dead)continue;const diff=e.root.position.clone().sub(player.root.position);const dist=diff.length();if(dist>(heavy?4.8:3.6))continue;const dot=diff.normalize().dot(dir);if(dot<(heavy?-.25:-.1))continue;damage(e,heavy?32:attackIndex%3===0?28:17);e.root.position.addScaledVector(diff,heavy?1.2:.45);hits++}if(hits)energy=Math.min(100,energy+hits*(heavy?12:8));updateHud()}
function damage(e:Fighter,amount:number){if(e.dead)return;e.hp=Math.max(0,e.hp-amount);e.stun=.23;e.hitFlash=.2;burst(e.root.position,e.boss?0xffb65a:0xf3b47b,6);if(e.hp<=0){e.dead=true;kills+=e.boss?1:1;energy=Math.min(100,energy+10);burst(e.root.position,0xe4c17b,18);if(e.boss){mode='win';setTimeout(()=>overlay('虎牢大捷',`你击破了虎牢关守将！本次击破 ${kills} 名敌军。`,'再战虎牢关'),650);document.exitPointerLock?.()}else if(kills===12)toast('敌军阵线溃散！继续向虎牢关推进',3)}}
function dodge(){if(mode!=='playing'||dodgeTime>0)return;dodgeTime=.43;invuln=.48;burst(player.root.position,0xd8c99c,6)}
function musou(){if(mode!=='playing'||energy<100)return;energy=0;invuln=1.5;attackTimer=1.15;toast('无 双 乱 舞',1.6);for(const e of enemies)if(!e.dead&&e.root.position.distanceTo(player.root.position)<9)damage(e,e.boss?125:100);burst(player.root.position,0xffd17b,65);updateHud()}
function updateHud(){$('hpbar').style.width=`${player.hp}%`;$('hptext').textContent=`${Math.ceil(player.hp)} / 100`;$('energybar').style.width=`${energy}%`;$('energytext').textContent=`${Math.floor(energy)}%`;$('kills').textContent=String(kills);if(boss){$('bossbar').style.width=`${boss.hp/boss.max*100}%`}$('mission').textContent=bossSpawned?'击破虎牢关守将 · 吕布':kills<12?`击破敌军 ${Math.min(kills,12)} / 12`:'前进至虎牢关 · 迎战吕布'}
const temp=new THREE.Vector3(),move=new THREE.Vector3();const clock=new THREE.Clock();
function tick(){requestAnimationFrame(tick);const dt=Math.min(clock.getDelta(),.045);if(mode==='playing'){
 elapsed+=dt;attackTimer=Math.max(0,attackTimer-dt);dodgeTime=Math.max(0,dodgeTime-dt);invuln=Math.max(0,invuln-dt);
 let mx=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+joystick.x;
 let mz=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'))+joystick.y;
 move.set(mx,0,mz);if(move.lengthSq()>1)move.normalize();const moving=move.lengthSq()>.01;move.applyAxisAngle(THREE.Object3D.DEFAULT_UP,camYaw);if(moving){const speed=dodgeTime>0?17:keys.has('ShiftLeft')?10:7.2;player.root.position.addScaledVector(move,speed*dt);player.root.rotation.y=Math.atan2(move.x,move.z);player.legL.rotation.x=Math.sin(elapsed*13)*(dodgeTime?1:.65);player.legR.rotation.x=-player.legL.rotation.x;player.body.position.y=Math.abs(Math.sin(elapsed*13))*.08}else{player.legL.rotation.x*=.8;player.legR.rotation.x*=.8;player.body.position.y*=.8}
 player.root.position.x=THREE.MathUtils.clamp(player.root.position.x,-85,85);player.root.position.z=THREE.MathUtils.clamp(player.root.position.z,-68,90);
 player.armR.rotation.x=THREE.MathUtils.lerp(player.armR.rotation.x,0,Math.min(1,dt*10));
 spawnTimer+=dt;if(spawnTimer>3.8&&enemies.filter(e=>!e.dead&&!e.boss).length<14&&!bossSpawned){spawnTimer=0;for(let i=0;i<3;i++)spawnEnemy(THREE.MathUtils.clamp(player.root.position.x+(Math.random()-.5)*35,-70,70),THREE.MathUtils.clamp(player.root.position.z-20-Math.random()*12,-65,75))}
 if(kills>=12&&!bossSpawned&&player.root.position.z<12){bossSpawned=true;spawnEnemy(0,-48,true);for(let i=0;i<5;i++)spawnEnemy((i-2)*3,-37)}
 for(const e of enemies){if(e.dead){e.body.rotation.z=THREE.MathUtils.lerp(e.body.rotation.z,Math.PI/2,dt*5);continue}e.attackCd=Math.max(0,e.attackCd-dt);e.stun=Math.max(0,e.stun-dt);e.hitFlash=Math.max(0,e.hitFlash-dt);const diff=player.root.position.clone().sub(e.root.position);const dist=diff.length();if(dist<50){e.root.rotation.y=Math.atan2(diff.x,diff.z);if(dist>(e.boss?3.4:2.25)&&e.stun<=0){e.root.position.addScaledVector(diff.normalize(),e.speed*dt);e.phase+=dt*8;e.legL.rotation.x=Math.sin(e.phase)*.5;e.legR.rotation.x=-e.legL.rotation.x}else{e.legL.rotation.x*=.8;e.legR.rotation.x*=.8}if(dist<(e.boss?4.1:2.9)&&e.attackCd<=0&&e.stun<=0){e.attackCd=e.boss?1.65:1.7+Math.random()*.8;e.armR.rotation.x=-2.1;if(invuln<=0){player.hp=Math.max(0,player.hp-(e.boss?17:6));invuln=.38;burst(player.root.position,0xe05a43,8);if(player.hp<=0){mode='lose';setTimeout(()=>overlay('兵败虎牢',`本次击破 ${kills} 名敌军。重整旗鼓，再战虎牢关。`,'重新出阵'),650);document.exitPointerLock?.()}}}e.armR.rotation.x=THREE.MathUtils.lerp(e.armR.rotation.x,0,dt*5)}}
 for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.t-=dt;s.v.y-=12*dt;s.m.position.addScaledVector(s.v,dt);s.m.scale.setScalar(Math.max(.01,s.t*2));if(s.t<=0){scene.remove(s.m);sparks.splice(i,1)}}
 if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').style.opacity='0'}updateHud();
 }
 const p=player.root.position;const dist=11;const target=new THREE.Vector3(p.x-Math.sin(camYaw)*dist,p.y+5+Math.sin(camPitch)*8,p.z-Math.cos(camYaw)*dist);camera.position.lerp(target,1-Math.exp(-5*dt));camera.lookAt(p.x,p.y+1.9,p.z);renderer.render(scene,camera)
}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
reset();tick();
