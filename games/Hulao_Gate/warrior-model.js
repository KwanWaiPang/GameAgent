/**
 * Original late-Han-inspired procedural warrior models. No copyrighted game models.
 * Geometry and textures are shared between instances; only the simple animation rig is per actor.
 * Copyright (c) 2026 GameAgent contributors, same terms as the repository.
 */
const cache = new WeakMap();

function kitFor(T) {
  if (cache.has(T)) return cache.get(T);
  const tex = (draw, n = 256) => {
    const c = document.createElement('canvas'); c.width = c.height = n;
    const g = c.getContext('2d'); draw(g, n);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = 4; return t;
  };
  const weave = tex((g, n) => {
    g.fillStyle = '#d2c9b7';g.fillRect(0, 0, n, n);
    for(let y=0;y<n;y+=3){g.fillStyle='rgba(51,39,25,.12)';g.fillRect(0,y,n,1);}
    for(let x=0;x<n;x+=3){g.fillStyle='rgba(255,255,255,.12)';g.fillRect(x,0,1,n);}
  });weave.repeat.set(2,3);
  const metalPattern = tex((g, n) => {
    g.fillStyle='#d7d2c5';g.fillRect(0,0,n,n);
    let seed=314159;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
    for(let i=0;i<3600;i++){const k=random()*.21;g.fillStyle=`rgba(38,31,27,${k})`;
      g.fillRect(random()*n,random()*n,random()*4+.4,.3+random()*1.4);}
  }); metalPattern.repeat.set(2,2);
  const std = (color, metalness=0,roughness=.7,map=null)=>new T.MeshStandardMaterial({color,metalness,roughness,...map?{map}:{}});
  const bone = std('#a78a6c',0,.87), skin=std('#b88f72',0,.83), shadowSkin=std('#86614e',0,.9);
  const eye=std('#2c2421',0,.35), hair=std('#161a19',.04,.81), grayHair=std('#27282a',.03,.87);
  const gold=std('#b99856',.76,.37,metalPattern),agedGold=std('#665139',.69,.62,metalPattern);
  const steel=std('#a9b4b7',.87,.25,metalPattern),edge=std('#e5e6df',.75,.2),darkSteel=std('#3b4749',.87,.43,metalPattern);
  const steelGray=std('#636d6e',.8,.43,metalPattern),blackMetal=std('#22282c',.84,.38,metalPattern);
  const green=std('#285044',.07,.91,weave),darkGreen=std('#192b25',.04,.94,weave),silk=std('#3a6e55',.06,.73,weave);
  const red=std('#702720',.03,.84,weave),deepRed=std('#411f22',.05,.9,weave),warmCloth=std('#777068',0,.97,weave);
  const grey=std('#484747',0,.94,weave),brown=std('#392c24',0,.88,weave),wood=std('#3c2820',0,.84);
  const boots=std('#232322',.05,.91),redCord=std('#aa3430',0,.68),bronze=std('#89754f',.75,.44,metalPattern);
  const sphereGeo = new T.SphereGeometry(1, 20, 14), lowSphere = new T.SphereGeometry(1, 12, 9);
  const cylGeo = new T.CylinderGeometry(1,1,1,14,1), boxGeo = new T.BoxGeometry(1,1,1);
  const result = {T,skin,shadowSkin,eye,hair,grayHair,gold,agedGold,steel,edge,darkSteel,steelGray,blackMetal,
    green,darkGreen,silk,red,deepRed,warmCloth,grey,brown,wood,boots,redCord,bronze,bone,sphereGeo,lowSphere,cylGeo,boxGeo};
  cache.set(T,result); return result;
}

function build(T,kind,low){
  const k=kitFor(T);const hero=kind==='hero',boss=kind==='boss',elite=kind==='elite';
  const size=hero?1.17:boss?1.33:elite?1.075:1;
  const detail=hero||boss||!low;
  const cloth=hero?k.green:boss?k.deepRed:elite?k.grey:k.warmCloth;
  const skirt=hero?k.darkGreen:boss?k.red:elite?k.grey:k.brown;
  const armor=hero?k.steelGray:boss?k.blackMetal:elite?k.darkSteel:k.steelGray;
  const trim=hero?k.gold:boss?k.agedGold:elite?k.bronze:k.darkSteel;
  const root=new T.Group(),rig=new T.Group(), ownedGeometry=[], ownedMaterials=[];root.add(rig);rig.scale.setScalar(size);
  const part=(parent,geom,material,xyz=[0,0,0],scale=[1,1,1])=>{
    if(geom!==k.sphereGeo&&geom!==k.lowSphere&&geom!==k.boxGeo&&geom!==k.cylGeo)ownedGeometry.push(geom);
    const m=new T.Mesh(geom,material);m.position.set(...xyz);m.scale.set(...scale);m.castShadow=!low&&(hero||boss);m.receiveShadow=!low&&(hero||boss);parent.add(m);return m;
  };
  const box=(p,m,x,y,z,w,h,d)=>part(p,k.boxGeo,m,[x,y,z],[w,h,d]);
  const ball=(p,m,x,y,z,rx,ry,rz,lod=false)=>part(p,lod?k.lowSphere:k.sphereGeo,m,[x,y,z],[rx,ry,rz]);
  const cyl=(p,m,x,y,z,r1,r2,h,seg=12)=>part(p,new T.CylinderGeometry(r1,r2,h,seg),m,[x,y,z]);
  const rod=(p,m,start,end,r)=>{
    const a=new T.Vector3(...start),b=new T.Vector3(...end),v=b.clone().sub(a);
    const ob=cyl(p,m,...a.clone().add(b).multiplyScalar(.5).toArray(),r,r,v.length());
    ob.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return ob;
  };
  const shape=(p,m,pts,xyz,depth=.035,bevel=.012)=>{
    const s=new T.Shape();s.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)s.lineTo(...pts[i]);s.closePath();
    const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:bevel>0,steps:1,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,curveSegments:5});
    g.computeVertexNormals();return part(p,g,m,xyz);
  };
  // Cloth underlayers are rounded to preserve a human silhouette; no box-built body.
  ball(rig,cloth,0,1.52,.03,.41,.55,.27);
  ball(rig,skirt,0,1.05,.04,.39,.37,.3);
  ball(rig,cloth,0,1.95,.03,.43,.32,.26);
  const legs=[];
  for(const side of [-1,1]){
    const leg=new T.Group();leg.position.set(side*.205,.99,.02);rig.add(leg);legs.push(leg);
    ball(leg,skirt,0,-.21,0,.185,.43,.19);
    ball(leg,k.grey,0,-.55,-.025,.13,.30,.15);
    ball(leg,k.boots,0,-.82,-.12,.166,.17,.29);
    ball(leg,armor,0,-.57,-.13,.147,.22,.18);
    for(let j=0;j<3;j++){
      const plate=ball(leg,trim,0,-.41-j*.13,-.275,.143,.035,.039,true);plate.rotation.z=side*.06;
    }
    rod(leg,k.agedGold,[-.13,-.3,-.18],[.13,-.3,-.18],.018);
  }
  // Cloth tassets with pointed, beveled outlines. These move with the torso.
  for(let i=-2;i<=2;i++){
    const a=i/3,x=Math.sin(a)*.4,z=-.04-Math.cos(a)*.28;
    const t=shape(rig,skirt,[[-.11,.0],[.11,.0],[.14,-.67],[0,-.79],[-.14,-.67]],[x,1.18,z],.024,.008);
    t.rotation.y=a*.53;
    if(detail){const hem=rod(rig,trim,[x-.1, .46,z-.004],[x+.1,.46,z-.004],.018);hem.rotation.y=a*.53;}
  }
  // Curved overlapping chest armor plates (front and back), engraved gold lamellar trim.
  ball(rig,armor,0,1.65,-.045,.47,.48,.31);
  ball(rig,armor,0,1.62,.21,.43,.43,.16);
  for(const back of [false,true]){
    if(back&&!detail)continue;
    for(let row=0;row<(detail?6:4);row++){
      const y=1.96-row*.135,curve=.02+row*.007;
      for(let j=-2;j<=2;j++){
        if(!detail&&Math.abs(j)===2)continue;
        const a=j*.335, x=Math.sin(a)*(.355+curve),z=(back?.315:-.315)*Math.cos(a)-.01;
        const plate=ball(rig,armor,x,y,z,.107,.086,.046,true);
        plate.rotation.z=j*.055;plate.rotation.y=back?Math.PI-a:a;
        if(detail){ball(rig,trim,x,y+.047,z+(back?.038:-.041),.022,.017,.011,true);}
      }
    }
  }
  // Broad cross-belts and waist seal, including a sculpted buckle.
  const belt=ball(rig,k.brown,0,1.235,-.025,.42,.11,.325);
  box(rig,trim,0,1.21,-.34,.18,.16,.065);
  ball(rig,k.gold,0,1.21,-.382,.058,.057,.021,true);
  if(detail){const strap=box(rig,trim,-.1,1.79,-.326,.075,.66,.043);strap.rotation.z=-.42;
    ball(rig,k.gold,-.25,1.89,-.342,.075,.048,.024,true);}
  // The arms remain accessible to the game combat state machine.
  const arms=[];
  for(const side of [-1,1]){
    const arm=new T.Group();arm.position.set(side*.48,1.99,.02);rig.add(arm);arms.push(arm);
    ball(arm,cloth,side*.04,-.26,0,.173,.37,.18);
    ball(arm,armor,side*.045,-.45,-.10,.156,.23,.165);
    ball(arm,k.skin,side*.06,-.68,-.105,.122,.14,.13);
    ball(arm,k.boots,side*.08,-.65,-.09,.14,.115,.14);
    // Paudrons: layered overlapping shell with distinct rim, no spheres on sticks.
    ball(arm,armor,side*.05,-.035,0,.28,.185,.27);
    for(let j=0;j<(detail?3:2);j++){
      const sh=ball(arm,trim,side*(.12+j*.013),-.11-j*.125,-.13,.215,.075,.17,true);sh.rotation.z=-side*(.13+j*.09);
    }
    if(detail){rod(arm,trim,[side*.06,-.32,-.2],[side*.085,-.52,-.195],.025);}
  }
  rig.userData.leftArm=arms[0];rig.userData.rightArm=arms[1];
  // Natural face planes: brow ridge, cheeks, nose bridge, small-set eyes, lips and ears.
  cyl(rig,k.skin,0,2.27,0,.155,.18,.24,14);
  const head=ball(rig,k.skin,0,2.56,-.035,.278,.345,.252);
  ball(rig,k.shadowSkin,0,2.37,-.12,.198,.106,.191);
  for(const s of [-1,1]){
    ball(rig,k.skin,s*.262,2.54,-.01,.071,.125,.07);
    ball(rig,k.shadowSkin,s*.13,2.54,-.25,.105,.053,.027);
    ball(rig,k.eye,s*.115,2.55,-.281,.036,.018,.013,true);
    const brow=ball(rig,k.hair,s*.115,2.605,-.269,.107,.02,.026,true);brow.rotation.z=s*.13;
    ball(rig,k.skin,s*.158,2.42,-.22,.098,.064,.072,true);
  }
  const bridge=ball(rig,k.skin,0,2.51,-.285,.074,.14,.10);
  ball(rig,k.skin,0,2.445,-.339,.088,.047,.086,true);
  ball(rig,k.shadowSkin,0,2.378,-.252,.104,.014,.016,true);
  ball(rig,k.skin,0,2.359,-.254,.115,.02,.027,true);
  if(hero){
    // Guan Yu-inspired original look: restrained green turban, prominent long beard.
    const beard=shape(rig,k.hair,[[-.20,.04],[.20,.04],[.23,-.19],[.14,-.48],[.07,-.78],[0,-.9],[-.09,-.77],[-.17,-.42]],[0,2.32,-.248],.082,.02);
    beard.rotation.x=-.05;
    for(let s of [-1,1]){
      const moustache=ball(rig,k.hair,s*.096,2.399,-.31,.115,.039,.05,true);moustache.rotation.z=-s*.14;
      const lock=rod(rig,k.hair,[s*.18,2.36,-.29],[s*.08,1.78,-.31],.037);
      lock.rotation.z=s*.04;
    }
    ball(rig,k.hair,0,2.84,.0,.28,.11,.27);
    const headBand=ball(rig,k.green,0,2.88,0,.296,.08,.278);
    for(let s of [-1,1]){
      const band=shape(rig,k.silk,[[-.08,.09],[.08,.09],[.075,-.34],[0,-.49],[-.08,-.35]],[s*.24,2.86,.03],.018,.005);
      band.rotation.y=s*.24;
    }
    ball(rig,k.gold,0,2.872,-.274,.105,.047,.034);
  } else {
    // Open-faced helmet with a forged cap, cheek guards and neck lames.
    ball(rig,k.hair,0,2.81,.015,.278,.115,.262);
    const dome=ball(rig,armor,0,2.83,.017,.326,.187,.32);
    const ridge=ball(rig,trim,0,2.98,-.018,.072,.18,.295);
    for(const s of [-1,1]){
      const guard=shape(rig,armor,[[-.11,.12],[.13,.12],[.15,-.25],[.06,-.40],[-.1,-.29]],[s*.292,2.60,.04],.032,.01);
      guard.rotation.y=s*.5;
    }
    ball(rig,trim,0,2.72,-.302,.09,.13,.034);
    if(boss){
      for(const side of [-1,1]){
        const horn=rod(rig,k.gold,[side*.27,2.89,.02],[side*.45,3.28,-.02],.037);
        const hornTip=ball(rig,k.gold,side*.45,3.29,-.02,.039,.078,.037);
      }
    }
    // Plume is a curved feather brush rather than a traffic-cone spike.
    const plume=shape(rig,boss?k.red:elite?k.redCord:k.grey,[[-.08,0],[.14,.08],[.23,.28],[.19,.62],[.02,.89],[-.095,.7],[-.17,.35]],[0,3.0,.07],.06,.005);
    plume.rotation.x=-.18;
  }
  // Drifting cape, folded mesh with a real silhouette.
  if(hero||boss){
    const capegroup=new T.Group();rig.add(capegroup);capegroup.position.set(0,1.97,.255);
    const verts=[],uvs=[],idx=[];const columns=10,rows=9;
    for(let r=0;r<=rows;r++)for(let c=0;c<=columns;c++){
      const u=c/columns,v=r/rows,spread=.55+v*.18;
      const x=(u-.5)*2*spread, y=-v*(boss?1.9:1.66),z=v*.31+Math.cos((u-.5)*Math.PI)*-.11+Math.sin(u*Math.PI*5)*.024*v;
      verts.push(x,y,z);uvs.push(u,v);
      if(r<rows&&c<columns){const a=r*(columns+1)+c,b=a+columns+1;idx.push(a,a+1,b,b,a+1,b+1);}
    }
    const geo=new T.BufferGeometry();geo.setIndex(idx);geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.computeVertexNormals();
    const cm=(boss?k.deepRed:k.darkGreen).clone();cm.side=T.DoubleSide;ownedMaterials.push(cm);
    part(capegroup,geo,cm);capegroup.rotation.x=-.11;
    rig.userData.cape=capegroup;
    for(const side of [-1,1]){
      const tab=shape(rig,boss?k.red:k.silk,[[-.14,0],[.14,0],[.16,-1.06],[.02,-1.23],[-.14,-1.04]],[side*.30,1.31,-.30],.027,.01);
      tab.rotation.z=side*.11;
    }
  }
  // Real curved blade outlines instead of simple cones. Keep weapon pivot for combat animation.
  const weapon=new T.Group();weapon.position.set(.67,1.58,-.1);rig.add(weapon);
  rod(weapon,k.wood,[0,-1.15,0],[0,1.96,0],.064);
  for(let i=0;i<4;i++)cyl(weapon,i%2?k.agedGold:k.gold,0,-.83+i*.26,0,.073,.073,.033);
  cyl(weapon,k.agedGold,0,1.71,0,.11,.087,.31);
  if(hero){
    const blade=shape(weapon,k.steel,[[-.10,0],[.24,.12],[.5,.55],[.57,1.06],[.28,1.37],[.16,1.3],[.02,.94],[-.11,.29]],[0,1.84,-.035],.07,.017);
    shape(weapon,k.edge,[[.25,.13],[.5,.55],[.57,1.06],[.28,1.37],[.36,1.02],[.34,.54]],[0,1.84,-.054],.009,0);
    shape(weapon,k.agedGold,[[-.16,.02],[.08,-.01],[.3,-.23],[.34,-.31],[.13,-.25]],[0,1.94,-.03],.075,.016);
    for(let t=0;t<5;t++)rod(weapon,k.redCord,[-.085,1.76,-.03],[-.08+(t-2)*.05,1.48+(t%2)*.055,.025],.018);
  }else if(boss){
    shape(weapon,k.steel,[[0,0],[.19,.24],[.25,.64],[0,1.16],[-.24,.64],[-.18,.24]],[0,1.80,-.037],.072,.016);
    for(const s of [-1,1]){
      const edgeblade=shape(weapon,k.edge,[[0,-.04],[s*.42,.12],[s*.68,.55],[s*.58,.40],[s*.23,.36]],[0,2.08,-.02],.038,.005);
    }
    ball(weapon,k.gold,0,1.86,0,.12,.12,.12,true);
    for(let t=0;t<6;t++)rod(weapon,k.redCord,[0,1.7,0],[(t-2.5)*.05,1.36,.045],.014);
  }else{
    shape(weapon,k.steel,[[-.11,0],[.11,0],[.15,.29],[.08,.54],[0,.71],[-.08,.54],[-.15,.29]],[0,1.89,-.025],.044,.01);
    if(elite)rod(weapon,k.redCord,[0,1.85,0],[.11,1.50,.01],.025);
  }
  const shadow=new T.Mesh(new T.CircleGeometry(.64*size,20),new T.MeshBasicMaterial({color:0x0d1110,transparent:true,opacity:.16,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=.025;root.add(shadow);ownedGeometry.push(shadow.geometry);ownedMaterials.push(shadow.material);
  root.userData={rig,legs,weapon,head,metal:armor,team:cloth,size,shadow,ownedGeometry,ownedMaterials};
  root.userData.rig.userData.leftArm=arms[0];root.userData.rig.userData.rightArm=arms[1];
  return root;
}

export function makeDetailedWarrior(THREE,kind='soldier',low=false){return build(THREE,kind,low);}

export function disposeDetailedWarrior(root){
  if(!root)return;
  for(const geo of new Set(root.userData.ownedGeometry || []))geo.dispose();
  for(const material of new Set(root.userData.ownedMaterials || []))material.dispose();
}