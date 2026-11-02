/** Original battlefield detail layer. Instancing keeps vegetation / debris low-cost. */
export function enhanceBattlefield(T, scene, materials, low, rand) {
  const tex = (draw,n=512)=>{const c=document.createElement('canvas');c.width=c.height=n;const g=c.getContext('2d');draw(g,n);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;t.wrapS=t.wrapT=T.RepeatWrapping;return t;};
  const masonry=tex((ctx,n)=>{
    ctx.fillStyle='#7a7165';ctx.fillRect(0,0,n,n);
    let seed=9771;const r=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
    const rowH=52;
    for(let row=0;row<10;row++){
      const y=row*rowH,offset=row%2?-54:0;
      for(let x=-160+offset;x<n;x+=108){
        const d=12*r()-6;
        ctx.fillStyle=`rgb(${Math.floor(151+d)},${Math.floor(147+d)},${Math.floor(139+d)})`;
        ctx.fillRect(x+3,y+3,103,46);
        ctx.fillStyle='rgba(45,40,34,.15)';ctx.fillRect(x+3,y+47,103,2);
        ctx.fillStyle='rgba(244,225,193,.13)';ctx.fillRect(x+4,y+3,100,2);
        for(let j=0;j<20;j++){
          ctx.fillStyle=`rgba(42,35,30,${r()*.13})`;ctx.fillRect(x+4+r()*97,y+5+r()*40,r()*10+.4,r()*2+.4);
        }
      }
    }
  });masonry.repeat.set(2,1.6);
  const woodgrain=tex((ctx,n)=>{
    ctx.fillStyle='#bd9f79';ctx.fillRect(0,0,n,n);
    let seed=442;const r=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
    for(let i=0;i<350;i++){ctx.strokeStyle=`rgba(37,27,19,${r()*.18})`;ctx.lineWidth=.3+r()*2;ctx.beginPath();const x=r()*n,y=r()*n;ctx.moveTo(x,y);ctx.bezierCurveTo(x+12,y+40,x-12,y+90,x+3,y+160);ctx.stroke();}
    for(let i=0;i<16;i++){const x=r()*n,y=r()*n;ctx.strokeStyle='rgba(35,24,18,.28)';ctx.beginPath();ctx.ellipse(x,y,4+r()*5,16+r()*12,.1,0,Math.PI*2);ctx.stroke();}
  });woodgrain.repeat.set(2,2);
  const roof=tex((ctx,n)=>{
    ctx.fillStyle='#6a6b65';ctx.fillRect(0,0,n,n);
    let seed=194;const r=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
    for(let y=0;y<n;y+=28){for(let x=0;x<n;x+=42){ctx.fillStyle=`rgba(14,20,20,${.11+r()*.18})`;ctx.fillRect(x+(y%56?19:0),y,40,3);}}
    for(let i=0;i<1400;i++){ctx.fillStyle=`rgba(17,22,21,${r()*.12})`;ctx.fillRect(r()*n,r()*n,r()*4+1,r()*7+1);}
  });roof.repeat.set(3,3);
  const apply=(material,map)=>{material.map=map;material.needsUpdate=true;};
  apply(materials.wall,masonry);apply(materials.wallTop,masonry);apply(materials.timber,woodgrain);apply(materials.roof,roof);
  // Dry vegetation with real depth and natural color variation. Single instanced draw call.
  const grassGeo=new T.ConeGeometry(.075,.62,3),grassMat=new T.MeshStandardMaterial({color:0xb0a080,roughness:1,side:T.DoubleSide});
  const grasses=new T.InstancedMesh(grassGeo,grassMat,low?420:1900);grasses.castShadow=false;grasses.receiveShadow=false;
  const dummy=new T.Object3D(),color=new T.Color();
  for(let i=0;i<grasses.count;i++){
    let x,z;
    if(i<grasses.count*.20){x=(rand()-.5)*29;z=rand()*114-57;}
    else{x=(rand()>.5?1:-1)*(13+rand()*67);z=(rand()-.5)*145;}
    const height=.23+rand()*.65;
    dummy.position.set(x,height*.48-.03,z);dummy.rotation.set((rand()-.5)*.24,rand()*Math.PI*2,(rand()-.5)*.35);
    dummy.scale.set(.6+rand()*1.6,height/.62,.7+rand()*1.5);dummy.updateMatrix();grasses.setMatrixAt(i,dummy.matrix);
    color.setHSL(.105+rand()*.08,.15+rand()*.18,.34+rand()*.18);grasses.setColorAt(i,color);
  }
  grasses.instanceMatrix.needsUpdate=true;if(grasses.instanceColor)grasses.instanceColor.needsUpdate=true;scene.add(grasses);
  // Scattered eroded rock fragments, not cartoon boulders.
  const rockGeo=new T.DodecahedronGeometry(.8,1),rockMat=new T.MeshStandardMaterial({color:0x80776b,roughness:1});
  const rocks=new T.InstancedMesh(rockGeo,rockMat,low?110:360);rocks.castShadow=false;
  for(let i=0;i<rocks.count;i++){
    let x=(rand()-.5)*172,z=(rand()-.5)*164;
    if(Math.abs(x)<12 && rand()>.14)x+=Math.sign(x||1)*17;
    const size=.16+rand()*.55;
    dummy.position.set(x,size*.13-.08,z);dummy.rotation.set(rand()*4,rand()*7,rand()*4);
    dummy.scale.set(size*(.6+rand()),size*.26,size*(.6+rand()));dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
    color.setHSL(.09,.06,.36+rand()*.19);rocks.setColorAt(i,color);
  }
  rocks.instanceMatrix.needsUpdate=true;if(rocks.instanceColor)rocks.instanceColor.needsUpdate=true;scene.add(rocks);
  // Logs, broken siege palisades, and wheel-worn camps.
  const logMat=new T.MeshStandardMaterial({color:0x4d3b2c,map:woodgrain,roughness:.93});
  const iron=new T.MeshStandardMaterial({color:0x434546,metalness:.72,roughness:.58});
  const buildMesh=(parent,geom,material,x,y,z)=>{const m=new T.Mesh(geom,material);m.position.set(x,y,z);parent.add(m);m.castShadow=!low;return m;};
  for(let side of [-1,1]){
    for(let station=0;station<4;station++){
      const x=side*(17+rand()*5),z=-51+station*32+(rand()-.5)*8;
      const barricade=new T.Group();barricade.position.set(x,0,z);barricade.rotation.y=side*.4;scene.add(barricade);
      for(let j=0;j<6;j++){
        const p=buildMesh(barricade,new T.CylinderGeometry(.0,.17,3.0,6),logMat,(j-2.5)*.62,1.48,(j%2)*.18);
        p.rotation.z=(j-2.5)*.05;
      }
      for(let h of [.6,1.3]){
        const beam=buildMesh(barricade,new T.CylinderGeometry(.12,.12,4.6,8),logMat,0,h,.2);beam.rotation.z=Math.PI/2;
      }
      const wheel=new T.Group();wheel.position.set(side*1.4,.65,2.5);barricade.add(wheel);
      const hoop=buildMesh(wheel,new T.TorusGeometry(.58,.085,7,22),logMat,0,0,0);
      for(let j=0;j<8;j++){
        const a=j*Math.PI/4,bar=buildMesh(wheel,new T.CylinderGeometry(.035,.035,.56,6),logMat,Math.sin(a)*.29,Math.cos(a)*.29,0);
        bar.rotation.z=-a;
      }
      buildMesh(wheel,new T.CylinderGeometry(.16,.16,.25,10),iron,0,0,0).rotation.x=Math.PI/2;
    }
  }
  // Rutted causeway: translucent elongated dirt strips rather than floating objects.
  const trackMat=new T.MeshStandardMaterial({color:0x302d27,transparent:true,opacity:.19,roughness:1,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  for(let s of [-1,1]){
    const track=buildMesh(scene,new T.PlaneGeometry(.55,110),trackMat,s*5,.035,-1.5);track.rotation.x=-Math.PI/2;track.castShadow=false;
  }
  // Free-standing shield-and-spear stacks at the sides of the causeway.
  if(!low)for(let i=0;i<10;i++){
    const side=i%2?1:-1, group=new T.Group();group.position.set(side*(15+rand()*9),0,-47+i*11);scene.add(group);
    const shield=buildMesh(group,new T.CylinderGeometry(.60,.60,.10,18),new T.MeshStandardMaterial({color:0x5c3530,metalness:.17,roughness:.78}),0,1.0,0);
    shield.rotation.x=Math.PI/2;shield.rotation.z=(rand()-.5)*.3;
    buildMesh(group,new T.TorusGeometry(.48,.025,8,24),iron,0,1.0,-.07);
    buildMesh(group,new T.SphereGeometry(.12,12,8),iron,0,1,-.09);
    const lance=buildMesh(group,new T.CylinderGeometry(.04,.055,3.4,7),logMat,.35,1.5,-.05);lance.rotation.z=.15;
    buildMesh(group,new T.ConeGeometry(.095,.4,7),iron,.64,3.35,-.05).rotation.z=-.15;
  }
}

/** Eroded peaks with faceted geology and no cone silhouette. */
export function rockyPeak(T, scene,material,x,z,radius,height,rand){
  const verts=[],idx=[],rings=6,seg=12;
  for(let j=0;j<=rings;j++){
    const t=j/rings,rr=radius*(1-t)**.84;
    for(let i=0;i<seg;i++){
      const angle=i*2*Math.PI/seg,variation=.80+rand()*.35;
      const xp=Math.sin(angle)*rr*variation,zp=Math.cos(angle)*rr*variation;
      verts.push(xp,height*t+Math.sin(angle*3+j)*.22*height*(1-t),zp);
      if(j<rings){let a=j*seg+i,b=j*seg+(i+1)%seg,c=(j+1)*seg+i,d=(j+1)*seg+(i+1)%seg;idx.push(a,b,c,b,d,c);}
    }
  }
  const geo=new T.BufferGeometry();geo.setIndex(idx);geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.computeVertexNormals();
  const o=new T.Mesh(geo,material);o.position.set(x,-3,z);o.castShadow=false;o.receiveShadow=true;scene.add(o);return o;
}