import * as THREE from 'three/webgpu';
import { BLOCKS, ISLAND_BOUNDS, TELEPORT_LOCATIONS, isOnHongKongLand } from './city-config.js';
import { GEO } from './geo-source.js';

// Recognisable shapes on real LandsD anchors. The Peak Tower sits on the
// upper-terminus terrace (about 396 m), not on the flat street graph.

const PEAK = Object.freeze({ x: -1012.5, z: 1067.8, top: 396, plateau: 76, rim: 188 });

function peakGround(x, z) {
  const d = Math.hypot(x - PEAK.x, z - PEAK.z);
  if (d >= PEAK.rim) return 0;
  if (d <= PEAK.plateau) return PEAK.top;
  const t = (d - PEAK.plateau) / (PEAK.rim - PEAK.plateau);
  const s = t * t * (3 - 2 * t);
  return PEAK.top * (1 - s);
}

function namedBlock(name, height) {
  return BLOCKS.find((block) => block.name === name && block.height === height) || null;
}

function mat(color, extra = {}) {
  return new THREE.MeshStandardNodeMaterial({ color, roughness: 0.45, metalness: 0.2, ...extra });
}

function labelMaterial(text, bg, fg) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = fg;
  ctx.font = '700 64px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicNodeMaterial({ map });
}

function clockFaceMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4efe4';
  ctx.beginPath();
  ctx.arc(128, 128, 118, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1c140e';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.fillStyle = '#1c140e';
  ctx.font = '700 28px "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const romans = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  for (let i = 0; i < 12; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 6;
    ctx.fillText(romans[i], 128 + Math.cos(angle) * 86, 128 + Math.sin(angle) * 86);
  }
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(128, 138);
  ctx.lineTo(128, 58);
  ctx.moveTo(128, 128);
  ctx.lineTo(178, 146);
  ctx.stroke();
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicNodeMaterial({ map });
}

function addBeam(group, material, ax, ay, az, bx, by, bz, thickness) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.4) return;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, len, thickness), material);
  mesh.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len));
  mesh.castShadow = true;
  group.add(mesh);
}

function dryPoint(x, z, heading) {
  if (isOnHongKongLand(x, z)) return { x, z, heading };
  const dx = Math.sin(heading);
  const dz = Math.cos(heading);
  for (const sign of [-1, 1]) {
    for (let step = 4; step <= 48; step += 4) {
      const px = x - dx * step * sign;
      const pz = z - dz * step * sign;
      if (isOnHongKongLand(px, pz)) return { x: px, z: pz, heading };
    }
  }
  return { x, z, heading };
}

function standSouth(block, gap, heading) {
  return dryPoint(block.cx, block.maxZ + gap, heading);
}

function approach(x, z, tx, tz) {
  const dx = tx - x;
  const dz = tz - z;
  const len = Math.hypot(dx, dz) || 1;
  for (let step = 8; step <= 72; step += 4) {
    const px = x + (dx / len) * step;
    const pz = z + (dz / len) * step;
    if (isOnHongKongLand(px, pz)) return { x: px, z: pz };
  }
  return { x: x + (dx / len) * 16, z: z + (dz / len) * 16 };
}

function addPeakHill(group) {
  const rings = 14;
  const segs = 48;
  const positions = [];
  const indices = [];
  const push = (x, y, z) => {
    positions.push(x, y, z);
    return positions.length / 3 - 1;
  };
  const center = push(PEAK.x, PEAK.top, PEAK.z);
  for (let ring = 1; ring <= rings; ring++) {
    const radius = (ring / rings) * PEAK.rim;
    const y = peakGround(PEAK.x + radius, PEAK.z);
    for (let s = 0; s < segs; s++) {
      const angle = (s / segs) * Math.PI * 2;
      push(PEAK.x + Math.sin(angle) * radius, y, PEAK.z + Math.cos(angle) * radius);
    }
  }
  for (let s = 0; s < segs; s++) {
    indices.push(center, 1 + ((s + 1) % segs), 1 + s);
  }
  for (let ring = 0; ring < rings - 1; ring++) {
    for (let s = 0; s < segs; s++) {
      const a = 1 + ring * segs + s;
      const b = 1 + ring * segs + ((s + 1) % segs);
      const c = 1 + (ring + 1) * segs + s;
      const d = 1 + (ring + 1) * segs + ((s + 1) % segs);
      indices.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const hillMat = mat(0x6e8f62, { metalness: 0, roughness: 0.96 });
  hillMat.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(geo, hillMat);
  mesh.name = 'VictoriaPeak';
  mesh.receiveShadow = true;
  group.add(mesh);
}

function addPeakTower(group, colliders) {
  const block = namedBlock('The Peak Tower', 47.4);
  const x = block ? block.cx : PEAK.x;
  const z = block ? block.cz : PEAK.z;
  const ground = peakGround(x, z);
  const white = mat(0xf3f0e8, { metalness: 0.08, roughness: 0.48 });
  const glass = mat(0x1c2830, { metalness: 0.35, roughness: 0.22 });
  const podium = new THREE.Mesh(new THREE.BoxGeometry(48, 12, 34), white);
  podium.position.set(x, ground + 6, z);
  podium.castShadow = true;
  podium.name = 'PeakTower';
  group.add(podium);
  const waist = new THREE.Mesh(new THREE.CylinderGeometry(8, 11, 9, 16), white);
  waist.position.set(x, ground + 16.5, z);
  waist.castShadow = true;
  group.add(waist);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(20, 28, 16), glass);
  bowl.scale.set(1.15, 0.42, 0.82);
  bowl.position.set(x, ground + 26, z);
  bowl.castShadow = true;
  bowl.name = 'PeakTowerBowl';
  group.add(bowl);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(21, 1.1, 8, 28), white);
  lip.rotation.x = Math.PI / 2;
  lip.scale.set(1.15, 0.82, 1);
  lip.position.set(x, ground + 27.2, z);
  group.add(lip);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.7, 14, 8), mat(0xc5ccd2, { metalness: 0.7, roughness: 0.28 }));
  mast.position.set(x, ground + 40, z);
  group.add(mast);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(16, 2.4, 0.2), labelMaterial('凌霄閣', '#f4f1ea', '#1a1a1a'));
  sign.position.set(x, ground + 8.2, z - 17.2);
  group.add(sign);
  colliders.push({ minX: x - 24, maxX: x + 24, minZ: z - 18, maxZ: z + 18, maxY: ground + 44 });

  const galleria = namedBlock('The Peak Galleria (Bus Terminus under)', 21);
  if (galleria) {
    const gy = peakGround(galleria.cx, galleria.cz);
    const hall = new THREE.Mesh(new THREE.BoxGeometry(54, 16, 28), white);
    hall.position.set(galleria.cx, gy + 8, galleria.cz);
    hall.castShadow = true;
    hall.name = 'PeakGalleria';
    group.add(hall);
    colliders.push({
      minX: galleria.cx - 27,
      maxX: galleria.cx + 27,
      minZ: galleria.cz - 14,
      maxZ: galleria.cz + 14,
      maxY: gy + 18
    });
  }
}

function addClockTower(group, colliders) {
  const block = namedBlock('Former Kowloon-Canton Railway Clock Tower', 40.2);
  if (!block) return null;
  const ground = ISLAND_BOUNDS.sidewalkHeight;
  const brick = mat(0x8d342c, { metalness: 0.02, roughness: 0.9 });
  const stone = mat(0xe7e0d2, { metalness: 0.04, roughness: 0.55 });
  const opening = mat(0x14110e, { metalness: 0.05, roughness: 0.7 });
  const yaw = Math.atan2(block.poly[1].x - block.poly[0].x, block.poly[1].z - block.poly[0].z);
  const site = new THREE.Group();
  site.name = 'TsimShaTsuiClockTower';
  site.position.set(block.cx, 0, block.cz);
  site.rotation.y = yaw;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(8.6, 28, 8.6), brick);
  shaft.position.y = ground + 14;
  shaft.castShadow = true;
  site.add(shaft);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(1.15, 28.4, 1.15), stone);
      pier.position.set(sx * 3.85, ground + 14.2, sz * 3.85);
      site.add(pier);
    }
  }
  const faceMat = clockFaceMaterial();
  for (const face of [
    [0, 4.45, 0],
    [0, -4.45, Math.PI],
    [4.45, 0, Math.PI / 2],
    [-4.45, 0, -Math.PI / 2]
  ]) {
    const dial = new THREE.Mesh(new THREE.CircleGeometry(1.7, 28), faceMat);
    dial.position.set(face[0], ground + 24.5, face[1]);
    dial.rotation.y = face[2];
    site.add(dial);
  }
  const belfry = new THREE.Mesh(new THREE.BoxGeometry(7.4, 6.2, 7.4), stone);
  belfry.position.y = ground + 31.2;
  belfry.castShadow = true;
  site.add(belfry);
  for (const vent of [[0, 3.8, 2.4, 0.2], [0, -3.8, 2.4, 0.2], [3.8, 0, 0.2, 2.4], [-3.8, 0, 0.2, 2.4]]) {
    const hole = new THREE.Mesh(new THREE.BoxGeometry(vent[2], 3.4, vent[3]), opening);
    hole.position.set(vent[0], ground + 31.2, vent[1]);
    site.add(hole);
  }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.5, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), stone);
  dome.position.y = ground + 35.6;
  site.add(dome);
  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 2.6, 6), stone);
  finial.position.y = ground + 39.2;
  site.add(finial);
  group.add(site);
  colliders.push({
    minX: block.minX - 0.4,
    maxX: block.maxX + 0.4,
    minZ: block.minZ - 0.4,
    maxZ: block.maxZ + 0.4,
    maxY: ground + 42
  });
  return standSouth(block, 14, Math.PI);
}

function addSpire(group, block, height, radiusTop, radiusBase) {
  if (!block) return;
  const ground = ISLAND_BOUNDS.sidewalkHeight;
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBase, height, 8),
    mat(0xd5dde3, { metalness: 0.72, roughness: 0.24 })
  );
  mast.position.set(block.cx, ground + block.height + height / 2, block.cz);
  mast.castShadow = true;
  mast.name = block.name;
  group.add(mast);
}

function addCentralPlazaCrown(group) {
  const block = namedBlock('Central Plaza', 376.8);
  if (!block) return;
  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(16, 42, 3),
    mat(0xe0b03a, { metalness: 0.45, roughness: 0.32, emissive: 0x8a6414, emissiveIntensity: 0.18 })
  );
  crown.position.set(block.cx, ISLAND_BOUNDS.sidewalkHeight + block.height - 6, block.cz);
  crown.castShadow = true;
  crown.name = 'CentralPlazaCrown';
  group.add(crown);
}

function addHkcecWing(group) {
  const block = namedBlock('Hong Kong Convention and Exhibition Centre', 66.7);
  if (!block) return;
  const spanX = block.maxX - block.minX;
  const spanZ = block.maxZ - block.minZ;
  const alongX = spanX >= spanZ;
  const wing = new THREE.Mesh(
    new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    mat(0xf7f5f0, { metalness: 0.08, roughness: 0.42 })
  );
  wing.scale.set(alongX ? spanX * 0.22 : 36, 14, alongX ? 36 : spanZ * 0.22);
  wing.position.set(block.cx, ISLAND_BOUNDS.sidewalkHeight + block.height - 1, block.cz);
  wing.name = 'HkcecWing';
  wing.castShadow = true;
  group.add(wing);
}

function addHsbcTruss(group) {
  const block = namedBlock('HSBC Main Building', 177.2);
  if (!block) return;
  const steel = mat(0xdfe6ea, { metalness: 0.55, roughness: 0.32 });
  let edge = null;
  const poly = block.poly;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j];
    const b = poly[i];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 24) continue;
    const mz = (a.z + b.z) / 2;
    if (!edge || mz > edge.mz) edge = { a, b, len, mz };
  }
  if (!edge) return;
  const ground = ISLAND_BOUNDS.sidewalkHeight;
  const yTop = ground + block.height - 6;
  const bays = 5;
  for (let bay = 0; bay < bays; bay++) {
    const t0 = bay / bays;
    const t1 = (bay + 1) / bays;
    const ax = edge.a.x + (edge.b.x - edge.a.x) * t0;
    const az = edge.a.z + (edge.b.z - edge.a.z) * t0;
    const bx = edge.a.x + (edge.b.x - edge.a.x) * t1;
    const bz = edge.a.z + (edge.b.z - edge.a.z) * t1;
    const y0 = ground + 18 + bay * ((yTop - ground - 18) / bays);
    const y1 = ground + 18 + (bay + 1) * ((yTop - ground - 18) / bays);
    addBeam(group, steel, ax, y0, az, bx, y1, bz, 1.35);
    addBeam(group, steel, bx, y0, bz, ax, y1, az, 1.35);
    addBeam(group, steel, ax, y1, az, bx, y1, bz, 1.6);
  }
}

function addLippoKoalas(group) {
  const glass = mat(0x161c22, { metalness: 0.4, roughness: 0.28 });
  for (const spec of [
    ['Lippo Centre Tower 1', 170.8],
    ['Lippo Centre Tower 2', 156.9]
  ]) {
    const block = namedBlock(spec[0], spec[1]);
    if (!block) continue;
    const hx = (block.maxX - block.minX) * 0.36;
    const hz = (block.maxZ - block.minZ) * 0.36;
    const ground = ISLAND_BOUNDS.sidewalkHeight;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        for (const t of [0.34, 0.56, 0.78]) {
          const koala = new THREE.Mesh(new THREE.SphereGeometry(5.4, 12, 8), glass);
          koala.scale.set(1.35, 0.82, 1.05);
          koala.position.set(block.cx + sx * hx, ground + block.height * t, block.cz + sz * hz);
          koala.castShadow = true;
          koala.name = 'LippoKoala';
          group.add(koala);
        }
      }
    }
  }
}

function addPeninsula(group) {
  const block = namedBlock('The Peninsula', 41.1);
  if (!block) return;
  const ground = ISLAND_BOUNDS.sidewalkHeight;
  const spanX = Math.min(90, block.maxX - block.minX);
  const spanZ = Math.min(70, block.maxZ - block.minZ);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(spanX, 1.1, spanZ), mat(0x7d3a32, { roughness: 0.78, metalness: 0.02 }));
  roof.position.set(block.cx, ground + block.height + 0.55, block.cz);
  roof.name = 'PeninsulaRoof';
  group.add(roof);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(22, 2.6, 0.25), labelMaterial('半島酒店', '#f6f1e6', '#6e2c28'));
  sign.position.set(block.cx, ground + block.height - 3.2, block.maxZ + 0.4);
  group.add(sign);
}

function addHopewellCrown(group) {
  const block = namedBlock('Hopewell Centre', 163.9);
  if (!block) return;
  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(10, 11, 8, 20),
    mat(0xd7c3a2, { metalness: 0.12, roughness: 0.5 })
  );
  drum.position.set(block.cx, ISLAND_BOUNDS.sidewalkHeight + block.height + 2, block.cz);
  drum.name = 'HopewellCrown';
  drum.castShadow = true;
  group.add(drum);
}

function addTstFerry(group, colliders) {
  const pier = (GEO.piers || []).find((item) => item.name === '尖沙咀天星碼頭 Tsim Sha Tsui Star Ferry Pier');
  if (!pier) return null;
  const ground = ISLAND_BOUNDS.sidewalkHeight;
  const yaw = Math.atan2(Math.cos(pier.ang || 0), Math.sin(pier.ang || 0));
  const terminal = new THREE.Group();
  terminal.name = 'tst-star-ferry';
  terminal.position.set(pier.cx, ground, pier.cz);
  terminal.rotation.y = yaw;
  const white = mat(0xf3f1ea, { metalness: 0.02, roughness: 0.62 });
  const roofMat = mat(0x2c6b4e, { metalness: 0.08, roughness: 0.58 });
  const hall = new THREE.Mesh(new THREE.BoxGeometry(18, 6.4, 32), white);
  hall.position.y = 3.2;
  hall.castShadow = true;
  terminal.add(hall);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(20, 1.2, 34), roofMat);
  roof.position.y = 6.8;
  terminal.add(roof);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(12, 2.1, 0.18), labelMaterial('天星小輪', '#f4f7f2', '#143028'));
  sign.position.set(0, 5.6, 16.2);
  terminal.add(sign);
  group.add(terminal);
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const hx = Math.abs(c) * 9 + Math.abs(s) * 16;
  const hz = Math.abs(s) * 9 + Math.abs(c) * 16;
  colliders.push({
    minX: pier.cx - hx,
    maxX: pier.cx + hx,
    minZ: pier.cz - hz,
    maxZ: pier.cz + hz,
    maxY: ground + 8
  });
  return pier;
}

function buildVisits(clockStand) {
  const ground = ISLAND_BOUNDS.sidewalkHeight;
  const centralPier = (GEO.piers || []).find((item) => item.name === '中環天星碼頭 Central Star Ferry Pier');
  const tstPier = (GEO.piers || []).find((item) => item.name === '尖沙咀天星碼頭 Tsim Sha Tsui Star Ferry Pier');
  const centralStand = centralPier
    ? approach(centralPier.cx, centralPier.cz, TELEPORT_LOCATIONS.central.x, TELEPORT_LOCATIONS.central.z)
    : { x: 145, z: -640 };
  const tstStand = tstPier
    ? approach(tstPier.cx, tstPier.cz, 1004.6, -1420)
    : { x: 900, z: -1450 };
  const peakStand = dryPoint(PEAK.x, PEAK.z - 48, Math.PI);
  const icc = namedBlock('International Commerce Centre', 460.6);
  const plaza = namedBlock('Central Plaza', 376.8);
  const hcec = namedBlock('Hong Kong Convention and Exhibition Centre', 66.7);
  const peninsula = namedBlock('The Peninsula', 41.1);
  const times = namedBlock('Times Square Tower One', 123);
  const langham = namedBlock('Langham Place', 229.3);
  const hsbc = namedBlock('HSBC Main Building', 177.2);
  const boc = namedBlock('Bank of China Tower', 303.3);
  const ifc = namedBlock('Two International Finance Centre', 378.5);
  const visit = (id, title, text, stand, extra = {}) => ({
    id,
    title,
    text,
    x: stand.x,
    z: stand.z,
    heading: stand.heading ?? 0,
    radius: extra.radius ?? 18,
    action: extra.action || '',
    actionLabel: extra.actionLabel || '',
    dest: extra.dest || '',
    y: extra.y ?? ground
  });
  const sites = [
    visit('central-ferry', '中環天星碼頭', '天星小輪橫渡維多利亞港，是中環與尖沙咀之間最短的一段海。碼頭仍用白牆綠頂。', { ...centralStand, heading: Math.PI }, {
      radius: 26,
      action: 'ferry',
      actionLabel: '乘船往尖沙咀',
      dest: 'tst-ferry'
    }),
    visit('tst-ferry', '尖沙咀天星碼頭', '對岸是中環天星碼頭。鐘樓就在碼頭北面，是1915年九廣鐵路總站留下的塔。', { ...tstStand, heading: 0 }, {
      radius: 26,
      action: 'ferry',
      actionLabel: '乘船往中環',
      dest: 'central-ferry'
    }),
    visit('peak-tram', '山頂纜車 · 花園道', '纜車總站在聖約翰大廈地面。車程爬上太平山，終點是凌霄閣平台。', { ...TELEPORT_LOCATIONS.garden, heading: TELEPORT_LOCATIONS.garden.heading }, {
      radius: 22,
      action: 'tram',
      actionLabel: '乘纜車往凌霄閣',
      dest: 'peak-tower'
    }),
    visit('peak-tower', '凌霄閣', '山頂纜車總站上的凌霄閣，平台約海拔 396 米，向北可以望到維多利亞港兩岸。', { ...peakStand, y: PEAK.top }, {
      radius: 24,
      action: 'tram',
      actionLabel: '乘纜車回花園道',
      dest: 'peak-tram',
      y: PEAK.top
    }),
    visit('clock', '尖沙咀鐘樓', '前九廣鐵路鐘樓，1915年啟用。紅磚方塔、四面鐘，高約 44 米，面向海港。', clockStand || { x: 1004.6, z: -1386, heading: Math.PI }, { radius: 20 }),
    visit('icc', '環球貿易廣場', '西九龍環球貿易廣場，香港最高的大廈。樓頂連天線約 484 米，地政總署樓面高度 460.6 米。', icc ? standSouth(icc, 16, Math.PI) : { x: 44.6, z: -2420, heading: Math.PI }, { radius: 28 }),
    visit('central-plaza', '中環廣場', '灣仔中環廣場，三角平面、金色尖頂。連尖頂約 374 米，是港島東岸天際線的高點。', plaza ? standSouth(plaza, 14, Math.PI) : { x: 1416, z: 160, heading: Math.PI }, { radius: 24 }),
    visit('hcec', '香港會議展覽中心', '會展新翼伸進維多利亞港，弧形屋頂是灣仔海濱的輪廓。', hcec ? standSouth(hcec, 18, Math.PI) : { x: 1366, z: -40, heading: Math.PI }, { radius: 30 }),
    visit('peninsula', '半島酒店', '半島酒店 1928 年開業，正門面向梳士巴利道和維多利亞港。', peninsula ? standSouth(peninsula, 12, Math.PI) : { x: 1235, z: -1548, heading: Math.PI }, { radius: 22 }),
    visit('times-square', '時代廣場', '銅鑼灣時代廣場，波斯富街與軒尼詩道交界，兩座辦公塔坐在商場上面。', times ? standSouth(times, 12, Math.PI) : { x: 2341, z: 340, heading: Math.PI }),
    visit('langham', '朗豪坊', '旺角朗豪坊，商場與辦公塔在亞皆老街、上海街一帶，塔樓約 229 米。', langham ? standSouth(langham, 12, Math.PI) : { x: 897, z: -4140, heading: Math.PI }),
    visit('hsbc', '匯豐總行大廈', '匯豐總行 1985 年落成，鋼架外露，底層架空，南面是皇后像廣場和兩頭銅獅。', hsbc ? standSouth(hsbc, 10, Math.PI) : { x: -25, z: 120, heading: Math.PI }),
    visit('boc', '中銀大廈', '中國銀行大廈，貝聿銘設計，1990年啟用。平面是正方形切成的四個三角玻璃體，天線頂約 367 米。', boc ? standSouth(boc, 12, Math.PI) : { x: 184, z: 230, heading: Math.PI }),
    visit('ifc', '國際金融中心二期', '中環海濱的國際金融中心二期。樓面約 415 米，地政樓面 378.5 米，頂上有桅杆。', ifc ? standSouth(ifc, 14, Math.PI) : { x: -53, z: -420, heading: Math.PI }, { radius: 24 }),
    visit('hku', '香港大學本部大樓', '香港大學本部大樓 1912 年落成，紅磚、白石拱廊、鐘樓和圓頂，前面是薄扶林道的紅磚圍牆。', { ...TELEPORT_LOCATIONS.hku, heading: TELEPORT_LOCATIONS.hku.heading }, { radius: 24 })
  ];
  return sites;
}

function buildHkSkyline(scene) {
  const group = new THREE.Group();
  group.name = 'HongKongSkyline';
  const colliders = [];
  addPeakHill(group);
  addPeakTower(group, colliders);
  const clockStand = addClockTower(group, colliders);
  addSpire(group, namedBlock('International Commerce Centre', 460.6), 28, 0.35, 2.4);
  addSpire(group, namedBlock('Two International Finance Centre', 378.5), 18, 0.3, 1.1);
  addCentralPlazaCrown(group);
  addHkcecWing(group);
  addHsbcTruss(group);
  addLippoKoalas(group);
  addPeninsula(group);
  addHopewellCrown(group);
  addTstFerry(group, colliders);
  scene.add(group);
  const visits = buildVisits(clockStand);
  console.info(`[skyline] peak terrace ${PEAK.top}m, visits ${visits.map((site) => site.id).join(',')}`);
  return { group, colliders, visits };
}

export { PEAK, peakGround, buildHkSkyline };
