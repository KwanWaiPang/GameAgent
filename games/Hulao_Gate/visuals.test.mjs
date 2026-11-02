// Node smoke test of procedural model construction, independent of WebGL and the browser.
import { strict as assert } from 'node:assert';
import { makeDetailedWarrior } from './warrior-model.js';
import { enhanceBattlefield, rockyPeak } from './battlefield-detail.js';
class V {constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}toArray(){return [this.x,this.y,this.z];}setScalar(x){this.x=this.y=this.z=x;return this;}clone(){return new V(this.x,this.y,this.z);}add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}multiplyScalar(n){this.x*=n;this.y*=n;this.z*=n;return this;}normalize(){return this;}length(){return Math.hypot(this.x,this.y,this.z);} }
class E {constructor(){this.children=[];this.position=new V();this.scale=new V(1,1,1);this.rotation=new V();this.quaternion={setFromUnitVectors(){}};this.userData={};}add(o){this.children.push(o);return this;}}
class G {constructor(){this.attributes={position:{array:[],count:0}};}setIndex(x){this.index=x;}setAttribute(k,v){this.attributes[k]=v;}computeVertexNormals(){} }
class M extends E {constructor(geo,mat){super();this.geometry=geo;this.material=mat;} }
class Material {constructor(p){Object.assign(this,p);}clone(){return new Material({...this});} }
class C {setHSL(){return this;} }
class X extends E {constructor(geo,mat,count){super();this.count=count;this.instanceMatrix={};this.instanceColor={};}setMatrixAt(){}setColorAt(){} }
class Texture {constructor(){this.repeat={set(){}};} }
const handler={get(_,key){if(key==='Group')return E;if(key==='Mesh')return M;if(key==='InstancedMesh')return X;if(key==='MeshStandardMaterial'||key==='MeshBasicMaterial')return Material;if(key==='Vector3')return V;if(key==='Color')return C;if(key==='CanvasTexture')return Texture;if(key==='Object3D')return class extends E{updateMatrix(){this.matrix={}}};if(key==='BufferGeometry')return G;if(key==='Float32BufferAttribute')return class{constructor(data,n){this.array=data;this.count=data.length/n}};if(key==='Shape')return class{moveTo(){}lineTo(){}closePath(){}};if(key==='DoubleSide'||key==='RepeatWrapping'||key==='SRGBColorSpace'||key==='NoColorSpace'||key==='LinearSRGBColorSpace')return 1;if(key==='Vector2')return class{constructor(x=0,y=0){this.x=x;this.y=y;}};if(key==='SphereGeometry'||key==='BoxGeometry'||key==='CylinderGeometry'||key==='ExtrudeGeometry'||key==='ConeGeometry'||key==='CircleGeometry'||key==='PlaneGeometry'||key==='TorusGeometry'||key==='DodecahedronGeometry'||key==='LatheGeometry')return class extends G{};throw Error('Unmocked Three member: '+key);}};
const T=new Proxy({},handler);
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({}, {get:(_,p)=>p==='createLinearGradient'||p==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}})})};
for(const k of ['hero','boss','elite','soldier']){
  const a=makeDetailedWarrior(T,k,k==='soldier');
  assert(a.userData.rig);
  assert.equal(a.userData.legs.length,2);
  assert(a.userData.weapon);
  assert(a.userData.rig.userData.leftArm);
  assert(a.userData.rig.userData.rightArm);
  if(k==='hero'||k==='boss')assert(a.userData.rig.userData.cape);
  console.log(k,'base construction OK',a.children.length,'root children');
}
const scene=new E();const mat={wall:new Material({}),wallTop:new Material({}),roof:new Material({}),timber:new Material({})};
enhanceBattlefield(T,scene,mat,false,Math.random);
rockyPeak(T,scene,new Material({}),12,-50,17,30,Math.random);
assert(scene.children.length>0);assert(mat.wall.map);console.log('battlefield details OK');