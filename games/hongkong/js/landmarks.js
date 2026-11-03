import * as THREE from 'three/webgpu';
import {
  HK_RETAIL_BELT,
  ISLAND_BOUNDS,
  hkMassingPlan,
  hkPlanCorners,
  hkResolveLandmarks,
  hkScaleRing
} from './city-config.js';
import { gltfCoversFootprint } from './hk-gltf-frame.js';
import { createCurtainWallMaterial, createRetailPodiumMaterial } from './tsl-materials.js';

// Named Hong Kong places on LandsD footprints and the Central Star Ferry pier.
// Victoria Peak and the Tsim Sha Tsui clock stay empty until a later step.

function hkMat(color, extra = {}) {
  return new THREE.MeshStandardNodeMaterial({ color, roughness: 0.42, metalness: 0.25, ...extra });
}

function hkLabelMaterial(text, bg, fg) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = fg;
  ctx.font = '700 68px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicNodeMaterial({ map });
}

function addPrism(group, mat, a, b, c, yA0, yB0, yC0, yA1, yB1, yC1) {
  const positions = new Float32Array([
    a.x, yA0, a.z, b.x, yB0, b.z, c.x, yC0, c.z,
    a.x, yA1, a.z, c.x, yC1, c.z, b.x, yB1, b.z,
    a.x, yA0, a.z, b.x, yB0, b.z, b.x, yB1, b.z,
    a.x, yA0, a.z, b.x, yB1, b.z, a.x, yA1, a.z,
    b.x, yB0, b.z, c.x, yC0, c.z, c.x, yC1, c.z,
    b.x, yB0, b.z, c.x, yC1, c.z, b.x, yB1, b.z,
    c.x, yC0, c.z, a.x, yA0, a.z, a.x, yA1, a.z,
    c.x, yC0, c.z, a.x, yA1, a.z, c.x, yC1, c.z
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function addBeam(group, mat, up, dir, ax, ay, az, bx, by, bz, thickness) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.4) return;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, len, thickness), mat);
  mesh.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  dir.set(dx / len, dy / len, dz / len);
  mesh.quaternion.setFromUnitVectors(up, dir);
  mesh.castShadow = true;
  group.add(mesh);
}

function yawAabb(x, z, hx, hz, yaw, maxY) {
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  return {
    minX: x - (c * hx + s * hz),
    maxX: x + (c * hx + s * hz),
    minZ: z - (s * hx + c * hz),
    maxZ: z + (s * hx + c * hz),
    maxY
  };
}

function roofSpan(block) {
  const span = Math.min(block.maxX - block.minX, block.maxZ - block.minZ);
  const plan = hkMassingPlan(block);
  const tower = plan && plan.parts[plan.parts.length - 1];
  const scale = tower && tower.scale < 1 ? tower.scale : 1;
  return span * scale * 0.46;
}

function addTwoIfc(group, site, glass, metal, ground) {
  const block = site.block;
  const radius = roofSpan(block);
  const crownH = 10;
  const mastH = 27.3;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.22, radius, crownH, 8), glass);
  crown.position.set(site.x, ground + block.height + crownH / 2, site.z);
  crown.castShadow = true;
  group.add(crown);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.85, mastH, 6), metal);
  mast.position.set(site.x, ground + block.height + crownH + mastH / 2, site.z);
  mast.castShadow = true;
  group.add(mast);
}

function addOneIfc(group, site, glass, ground) {
  const span = roofSpan(site.block);
  const pent = new THREE.Mesh(new THREE.BoxGeometry(span, 5.5, span * 0.9), glass);
  pent.position.set(site.x, ground + site.block.height + 2.75, site.z);
  pent.castShadow = true;
  group.add(pent);
}

function addExchange(group, site, bronze, metal, ground) {
  const span = roofSpan(site.block);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(span, span * 1.04, 1.8, 8), bronze);
  lip.position.set(site.x, ground + site.block.height + 0.9, site.z);
  lip.castShadow = true;
  group.add(lip);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.4, 11, 6), metal);
  mast.position.set(site.x, ground + site.block.height + 7.3, site.z);
  mast.castShadow = true;
  group.add(mast);
}

function addBankOfChina(group, site, colliders, up, dir, ground) {
  const block = site.block;
  const corners = hkPlanCorners(block.poly, block.cx, block.cz);
  if (corners.length !== 4) throw new Error(`Bank of China footprint did not resolve to 4 corners (${corners.length})`);
  const center = { x: block.cx, z: block.cz };
  let north = 0;
  let northZ = Infinity;
  for (let i = 0; i < corners.length; i++) {
    const mz = (corners[i].z + corners[(i + 1) % corners.length].z) / 2;
    if (mz < northZ) {
      northZ = mz;
      north = i;
    }
  }
  const fractions = [1, 0.76, 0.51, 0.33];
  const peak = 11.7;
  const mastH = 52.4;
  const ySkirt = HK_RETAIL_BELT;
  const skirt = createRetailPodiumMaterial();
  // No BUILDING glTF meets this plate (11-SW-9C / 8D / 9D / 10C / 8C).
  // Digit1 looks at the short west shaft and at the radial faces of the taller
  // shafts. An X only on the outer square edge leaves that glass as a tinted slab.
  // quietGlass drops the fine mullion hash. Metalness stays 0: not a chrome skin.
  const face = createCurtainWallMaterial({
    glassTint: 0x7aa3c2,
    frameTint: 0xd5dee6,
    windowWidth: 2.35,
    floorHeight: 3.9,
    litProbability: 0.7,
    warmth: 0.4,
    reflectivity: 0.22,
    reflectionFloor: 0.04,
    glassMetalness: 0,
    glassRoughness: 0.48,
    seed: 4.2,
    boxLocal: false,
    quietGlass: true
  });
  face.polygonOffset = true;
  face.polygonOffsetFactor = 1;
  face.polygonOffsetUnits = 1;
  // One bay about every 52 m. A 4.6 m white member reads at ~210 m. Emissive
  // keeps it in shade. Metalness stays near zero, so this is not a chrome skin.
  const braceMat = hkMat(0xf7f9fb, { metalness: 0.04, roughness: 0.42, emissive: 0xf4f7fa, emissiveIntensity: 0.7 });
  braceMat.polygonOffset = true;
  braceMat.polygonOffsetFactor = -2;
  braceMat.polygonOffsetUnits = -2;
  const mastMat = hkMat(0x8d939a, { metalness: 0.16, roughness: 0.6 });
  const tagBoc = () => {
    const mesh = group.children[group.children.length - 1];
    if (mesh) mesh.name = 'BankOfChinaTower';
  };
  const addBocBeam = (ax, ay, az, bx, by, bz, thickness) => {
    const before = group.children.length;
    addBeam(group, braceMat, up, dir, ax, ay, az, bx, by, bz, thickness);
    if (group.children.length > before) group.children[group.children.length - 1].name = 'BankOfChinaTower';
  };
  const edgeTop = (step) => {
    const y = ground + block.height * fractions[step];
    return step === 0 ? y + peak : y;
  };
  // Proud of the glass, on the outside of each triangular face. The Digit1
  // eye's tall glass is the radial faces (corner to centre), not the outer
  // square edges of the north and south shafts.
  const yBraceBase = ground + 12;
  const member = 4.6;
  const proud = member * 0.5 + 0.55;
  const outwardOf = (p, q, away) => {
    const dx = q.x - p.x;
    const dz = q.z - p.z;
    const len = Math.hypot(dx, dz) || 1;
    let nx = -dz / len;
    let nz = dx / len;
    const mx = (p.x + q.x) / 2;
    const mz = (p.z + q.z) / 2;
    if ((mx + nx - away.x) * nx + (mz + nz - away.z) * nz < 0) {
      nx = -nx;
      nz = -nz;
    }
    return { x: nx, z: nz };
  };
  const braceShaftFace = (p, q, yP, yQ, away) => {
    const n = outwardOf(p, q, away);
    const px = p.x + n.x * proud;
    const pz = p.z + n.z * proud;
    const qx = q.x + n.x * proud;
    const qz = q.z + n.z * proud;
    const topP = yP - 4;
    const topQ = yQ - 4;
    const rise = Math.min(topP, topQ) - yBraceBase;
    if (rise > 20) {
      const bays = Math.max(2, Math.round(rise / 52));
      for (let bay = 0; bay < bays; bay++) {
        const t0 = bay / bays;
        const t1 = (bay + 1) / bays;
        const yLoP = yBraceBase + (topP - yBraceBase) * t0;
        const yHiP = yBraceBase + (topP - yBraceBase) * t1;
        const yLoQ = yBraceBase + (topQ - yBraceBase) * t0;
        const yHiQ = yBraceBase + (topQ - yBraceBase) * t1;
        addBocBeam(px, yLoP, pz, qx, yHiQ, qz, member);
        addBocBeam(qx, yLoQ, qz, px, yHiP, pz, member);
        addBocBeam(px, yHiP, pz, qx, yHiQ, qz, member * 0.72);
      }
    }
    addBocBeam(px, yP, pz, qx, yQ, qz, 3.2);
  };
  for (let step = 0; step < 4; step++) {
    const a = corners[(north + step) % 4];
    const b = corners[(north + step + 1) % 4];
    const yTop = ground + block.height * fractions[step];
    const yOuter = step === 0 ? yTop + peak : yTop;
    const yCenter = yTop;
    addPrism(group, skirt, a, b, center, ground, ground, ground, ySkirt, ySkirt, ySkirt);
    tagBoc();
    addPrism(group, face, a, b, center, ySkirt, ySkirt, ySkirt, yOuter, yOuter, yCenter);
    tagBoc();
    braceShaftFace(a, b, yOuter, yOuter, center);
    braceShaftFace(a, center, yOuter, yCenter, b);
    braceShaftFace(b, center, yOuter, yCenter, a);
    if (step === 0) {
      const mx = (a.x + b.x) / 2;
      const mz = (a.z + b.z) / 2;
      const el = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const ox = ((b.x - a.x) / el) * 2.2;
      const oz = ((b.z - a.z) / el) * 2.2;
      for (const sign of [-1, 1]) {
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.55, mastH, 6), mastMat);
        mast.position.set(mx + ox * sign, yOuter + mastH / 2, mz + oz * sign);
        mast.name = 'BankOfChinaTower';
        mast.castShadow = true;
        group.add(mast);
      }
    }
  }
  for (let k = 0; k < 4; k++) {
    const corner = corners[(north + k) % 4];
    const yPost = Math.max(edgeTop(k), edgeTop((k + 3) % 4));
    addBocBeam(corner.x, ySkirt, corner.z, corner.x, yPost, corner.z, member * 0.72);
  }
  addBocBeam(center.x, ySkirt, center.z, center.x, ground + block.height, center.z, member * 0.78);
  colliders.push({
    minX: block.minX,
    maxX: block.maxX,
    minZ: block.minZ,
    maxZ: block.maxZ,
    maxY: ground + block.height + peak
  });
}

function addJardine(group, site, mat, up, ground) {
  const plan = hkMassingPlan(site.block);
  const spots = [];
  const parts = plan ? plan.parts : [{ scale: 1, y0: 0, h: site.block.height }];
  for (const part of parts) {
    const ring = part.scale < 1 ? hkScaleRing(site.block.poly, part.scale) : site.block.poly;
    const y0 = Math.max(ground + part.y0 + 6, HK_RETAIL_BELT + 1.2);
    const y1 = ground + part.y0 + part.h - 4;
    if (!(y1 > y0 + 6) || !ring) continue;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[j];
      const b = ring[i];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.hypot(dx, dz);
      if (length < 16) continue;
      let nx = -dz / length;
      let nz = dx / length;
      const mx = (a.x + b.x) / 2;
      const mz = (a.z + b.z) / 2;
      if ((mx + nx - site.x) * nx + (mz + nz - site.z) * nz < 0) {
        nx = -nx;
        nz = -nz;
      }
      const count = Math.max(1, Math.floor((length - 6) / 6.6));
      for (let k = 0; k < count; k++) {
        const t = (k + 1) / (count + 1);
        const x = a.x + dx * t + nx * 0.7;
        const z = a.z + dz * t + nz * 0.7;
        for (let y = y0; y <= y1; y += 7.2) spots.push({ x, y, z, nx, nz });
      }
    }
  }
  if (!spots.length) return;
  const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.35, 1.35, 0.55, 10), mat, spots.length);
  const dummy = new THREE.Object3D();
  const normal = new THREE.Vector3();
  for (let i = 0; i < spots.length; i++) {
    const spot = spots[i];
    dummy.position.set(spot.x, spot.y, spot.z);
    dummy.quaternion.setFromUnitVectors(up, normal.set(spot.nx, 0, spot.nz));
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = 'jardine-portholes';
  group.add(mesh);
}

function addCourtDome(group, site, stone, metal, ground) {
  const y = ground + site.height;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(8, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), stone);
  dome.position.set(site.x, y, site.z);
  dome.castShadow = true;
  group.add(dome);
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.1, 2.8, 8), stone);
  lantern.position.set(site.x, y + 8.6, site.z);
  group.add(lantern);
  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.28, 3.6, 6), metal);
  finial.position.set(site.x, y + 11.6, site.z);
  group.add(finial);
}

function addStarFerry(group, site, colliders, white, roofMat, clockMat, ground) {
  const pier = site.pier;
  const yaw = Math.atan2(Math.cos(pier.ang), Math.sin(pier.ang));
  const terminal = new THREE.Group();
  terminal.name = 'central-star-ferry';
  terminal.position.set(pier.cx, ground, pier.cz);
  terminal.rotation.y = yaw;
  const hall = new THREE.Mesh(new THREE.BoxGeometry(20, 7.2, 36), white);
  hall.position.y = 3.6;
  hall.castShadow = true;
  hall.receiveShadow = true;
  terminal.add(hall);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(22, 1.4, 38), roofMat);
  roof.position.y = 7.7;
  roof.castShadow = true;
  terminal.add(roof);
  const clock = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.3, 20), clockMat);
  clock.rotation.x = Math.PI / 2;
  clock.position.set(0, 4.6, 18.2);
  terminal.add(clock);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(12, 2.2, 0.18), hkLabelMaterial('天星小輪', '#f4f7f2', '#143028'));
  sign.position.set(0, 6.4, 18.25);
  terminal.add(sign);
  group.add(terminal);
  colliders.push(yawAabb(pier.cx, pier.cz, 10, 18, yaw, ground + 9));
}

function addPeakTram(group, site, colliders, green, ground) {
  let north = site.block.poly[0];
  for (const p of site.block.poly) if (p.z < north.z) north = p;
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(16, 0.35, 5.2), green);
  canopy.position.set(north.x, ground + 4.3, north.z - 2.4);
  canopy.castShadow = true;
  group.add(canopy);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(11, 2.4, 0.22), hkLabelMaterial('山頂纜車', '#0e6a45', '#f3ffe8'));
  sign.position.set(north.x, ground + 6.4, north.z - 4.9);
  group.add(sign);
  colliders.push({
    minX: north.x - 8,
    maxX: north.x + 8,
    minZ: north.z - 5.2,
    maxZ: north.z + 0.3,
    maxY: ground + 8
  });
}

function addHkuBoxes(parent, geometry, material, poses, name) {
  if (!poses.length) return;
  const mesh = new THREE.InstancedMesh(geometry, material, poses.length);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < poses.length; i++) {
    const pose = poses[i];
    dummy.position.set(pose.x, pose.y, pose.z);
    dummy.rotation.set(0, pose.ry || 0, 0);
    dummy.scale.set(pose.sx || 1, pose.sy || 1, pose.sz || 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  parent.add(mesh);
}

function hkuClockMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = '#f3ecda';
  ctx.beginPath();
  ctx.arc(128, 128, 118, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1b1712';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.fillStyle = '#1b1712';
  ctx.font = '700 26px "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const romans = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  for (let i = 0; i < 12; i++) {
    const angle = -Math.PI / 2 + i * Math.PI / 6;
    ctx.fillText(romans[i], 128 + Math.cos(angle) * 86, 128 + Math.sin(angle) * 86);
  }
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(128, 136);
  ctx.lineTo(128, 62);
  ctx.moveTo(128, 128);
  ctx.lineTo(176, 128);
  ctx.stroke();
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicNodeMaterial({ map, transparent: true });
}

// 1912 Main Building: red brick, white stone arcade, central clock tower and dome,
// with the lower Pok Fu Lam red wall in front. Local +Z faces the street.
function addHkuRedWalls(parent, colliders, ground) {
  const road = { x: -2124.5, z: -454.5 };
  const inward = { x: -0.80, z: 0.61 };
  const faceYaw = Math.atan2(-inward.x, -inward.z);
  const site = new THREE.Group();
  site.name = 'HkuRedWalls';
  site.position.set(road.x + inward.x * 18, 0, road.z + inward.z * 18);
  site.rotation.y = faceYaw;

  const brick = hkMat(0x9a3428, { metalness: 0.02, roughness: 0.9 });
  const brickDeep = hkMat(0x7a241c, { metalness: 0.02, roughness: 0.92 });
  const stone = hkMat(0xf0e6d2, { metalness: 0.03, roughness: 0.58 });
  const domeGrey = hkMat(0xb9bbb4, { metalness: 0.12, roughness: 0.48 });
  const opening = hkMat(0x14181c, { metalness: 0.05, roughness: 0.7 });
  const lawn = hkMat(0x4a7340, { metalness: 0, roughness: 0.96 });
  const clockMat = hkuClockMaterial();

  const y0 = ground;
  const wingZ = -30;
  const wingD = 15;
  const frontZ = wingZ + wingD / 2;

  const grass = new THREE.Mesh(new THREE.BoxGeometry(96, 0.06, 22), lawn);
  grass.name = 'HkuLawn';
  grass.position.set(0, y0 + 0.03, -10);
  grass.receiveShadow = true;
  site.add(grass);

  const wallH = 3.35;
  const wallPoses = [];
  const pierPoses = [];
  const panelPoses = [];
  for (const side of [-1, 1]) {
    wallPoses.push({ x: side * 24.6, y: y0 + wallH / 2, z: 1.2, sx: 42, sy: wallH, sz: 0.55 });
  }
  for (let x = -44; x <= 44; x += 4.15) {
    if (Math.abs(x) < 3.6) continue;
    pierPoses.push({ x, y: y0 + wallH / 2 + 0.15, z: 1.2, sx: 0.48, sy: wallH + 0.35, sz: 0.82 });
    if (Math.abs(x) > 42) continue;
    panelPoses.push({ x: x + 2.05, y: y0 + wallH / 2, z: 1.46, sx: 3.15, sy: wallH - 0.7, sz: 0.08 });
  }
  pierPoses.push(
    { x: -2.7, y: y0 + 2.35, z: 1.2, sx: 1.05, sy: 4.7, sz: 1.05 },
    { x: 2.7, y: y0 + 2.35, z: 1.2, sx: 1.05, sy: 4.7, sz: 1.05 }
  );
  addHkuBoxes(site, new THREE.BoxGeometry(1, 1, 1), brick, wallPoses, 'HkuRedWall');
  addHkuBoxes(site, new THREE.BoxGeometry(1, 1, 1), brickDeep, pierPoses, 'HkuRedWallPiers');
  addHkuBoxes(site, new THREE.BoxGeometry(1, 1, 1), brickDeep, panelPoses, 'HkuWallPanels');
  const coping = [];
  for (const side of [-1, 1]) coping.push({ x: side * 24.6, y: y0 + wallH + 0.12, z: 1.2, sx: 42, sy: 0.22, sz: 0.78 });
  for (const pose of pierPoses) {
    coping.push({ x: pose.x, y: pose.y + pose.sy / 2 + 0.08, z: pose.z, sx: pose.sx + 0.16, sy: 0.16, sz: pose.sz + 0.12 });
  }
  addHkuBoxes(site, new THREE.BoxGeometry(1, 1, 1), stone, coping, 'HkuWallCoping');

  const wing = new THREE.Mesh(new THREE.BoxGeometry(68, 11.2, wingD), brick);
  wing.name = 'HkuMainBuilding';
  wing.position.set(0, y0 + 5.6, wingZ);
  wing.castShadow = true;
  wing.receiveShadow = true;
  site.add(wing);
  const courses = [
    { y: y0 + 4.55, sy: 0.28, sx: 68.4, sz: wingD + 0.35 },
    { y: y0 + 11.15, sy: 0.42, sx: 68.8, sz: wingD + 0.5 }
  ];
  for (const course of courses) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(course.sx, course.sy, course.sz), stone);
    band.position.set(0, course.y, wingZ);
    band.castShadow = true;
    site.add(band);
  }

  const arcade = [];
  const archRings = [];
  const upperWindows = [];
  const balusters = [];
  for (let x = -30.5; x <= 30.5; x += 4.05) {
    if (Math.abs(x) < 5.2) continue;
    arcade.push({ x, y: y0 + 2.15, z: frontZ + 0.16, sx: 1.7, sy: 3.15, sz: 0.2 });
    archRings.push({ x, y: y0 + 3.55, z: frontZ + 0.28 });
    upperWindows.push({ x, y: y0 + 7.7, z: frontZ + 0.12, sx: 1.55, sy: 2.45, sz: 0.16 });
    upperWindows.push({ x, y: y0 + 7.7, z: frontZ + 0.22, sx: 1.05, sy: 1.9, sz: 0.08 });
  }
  for (let x = -33.5; x <= 33.5; x += 0.85) {
    if (Math.abs(x) < 4.6) continue;
    balusters.push({ x, y: y0 + 11.7, z: frontZ - 0.15, sx: 0.16, sy: 0.72, sz: 0.16 });
  }
  addHkuBoxes(site, new THREE.BoxGeometry(1, 1, 1), opening, arcade, 'HkuArcade');
  const archGeo = new THREE.TorusGeometry(1.15, 0.13, 8, 14, Math.PI);
  const arches = new THREE.InstancedMesh(archGeo, stone, archRings.length);
  arches.name = 'HkuArchRings';
  arches.castShadow = true;
  const dummy = new THREE.Object3D();
  archRings.forEach((ring, index) => {
    dummy.position.set(ring.x, ring.y, ring.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    arches.setMatrixAt(index, dummy.matrix);
  });
  site.add(arches);
  addHkuBoxes(site, new THREE.BoxGeometry(1, 1, 1), stone, upperWindows.filter((_, i) => i % 2 === 0), 'HkuWindowFrames');
  addHkuBoxes(site, new THREE.BoxGeometry(1, 1, 1), opening, upperWindows.filter((_, i) => i % 2 === 1), 'HkuWindowGlass');
  addHkuBoxes(site, new THREE.BoxGeometry(1, 1, 1), stone, balusters, 'HkuBalustrade');

  const towerX = 0;
  const towerZ = frontZ - 3.6;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(8.6, 16.4, 7.4), brick);
  shaft.name = 'HkuClockTower';
  shaft.position.set(towerX, y0 + 8.2, towerZ);
  shaft.castShadow = true;
  site.add(shaft);
  const quoins = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      quoins.push({ x: sx * 4.05, y: y0 + 8.2, z: towerZ + sz * 3.45, sx: 0.55, sy: 16.4, sz: 0.55 });
    }
  }
  addHkuBoxes(site, new THREE.BoxGeometry(1, 1, 1), stone, quoins, 'HkuTowerQuoins');
  const clockPanel = new THREE.Mesh(new THREE.BoxGeometry(5.4, 5.4, 0.18), stone);
  clockPanel.position.set(0, y0 + 13.2, towerZ + 3.8);
  site.add(clockPanel);
  const face = new THREE.Mesh(new THREE.CircleGeometry(1.85, 28), clockMat);
  face.name = 'HkuClockFace';
  face.position.set(0, y0 + 13.2, towerZ + 3.92);
  site.add(face);

  const belfry = new THREE.Mesh(new THREE.BoxGeometry(7.2, 4.6, 6.2), stone);
  belfry.position.set(0, y0 + 18.6, towerZ);
  belfry.castShadow = true;
  site.add(belfry);
  const belfryVents = [
    { x: 0, y: y0 + 18.7, z: towerZ + 3.15, sx: 2.2, sy: 3.1, sz: 0.2 },
    { x: -3.65, y: y0 + 18.7, z: towerZ, sx: 0.2, sy: 3.1, sz: 2.2 },
    { x: 3.65, y: y0 + 18.7, z: towerZ, sx: 0.2, sy: 3.1, sz: 2.2 }
  ];
  addHkuBoxes(site, new THREE.BoxGeometry(1, 1, 1), opening, belfryVents, 'HkuBelfry');
  const domeBase = new THREE.Mesh(new THREE.CylinderGeometry(3.15, 3.45, 0.7, 16), stone);
  domeBase.position.set(0, y0 + 21.2, towerZ);
  site.add(domeBase);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(3.05, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), domeGrey);
  dome.position.set(0, y0 + 21.45, towerZ);
  dome.castShadow = true;
  site.add(dome);
  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 2.4, 6), stone);
  finial.position.set(0, y0 + 25.4, towerZ);
  site.add(finial);

  for (const side of [-1, 1]) {
    const hall = new THREE.Mesh(new THREE.BoxGeometry(16, 9.2, 12), brick);
    hall.name = side < 0 ? 'HkuWestHall' : 'HkuEastHall';
    hall.position.set(side * 46, y0 + 4.6, wingZ - 2);
    hall.castShadow = true;
    site.add(hall);
    const band = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.32, 12.4), stone);
    band.position.set(side * 46, y0 + 9.3, wingZ - 2);
    site.add(band);
    const lid = new THREE.Mesh(new THREE.ConeGeometry(9.2, 3.2, 4), domeGrey);
    lid.rotation.y = Math.PI / 4;
    lid.position.set(side * 46, y0 + 10.8, wingZ - 2);
    lid.castShadow = true;
    site.add(lid);
  }

  parent.add(site);

  const sin = Math.sin(faceYaw);
  const cos = Math.cos(faceYaw);
  const world = (lx, lz) => ({
    x: site.position.x + lx * cos + lz * sin,
    z: site.position.z - lx * sin + lz * cos
  });
  const pushHall = (lx, lz, hx, hz, top) => {
    const center = world(lx, lz);
    colliders.push(yawAabb(center.x, center.z, hx, hz, faceYaw, top));
  };
  pushHall(0, 1.2, 46, 0.8, y0 + 4.8);
  pushHall(0, wingZ, 35, 8, y0 + 28);
  pushHall(-46, wingZ - 2, 8, 6, y0 + 13);
  pushHall(46, wingZ - 2, 8, 6, y0 + 13);
}

function buildHkLandmarks(scene, gltfPlan = null) {
  const { placed, deferred } = hkResolveLandmarks();
  const gltfMeshes = gltfPlan?.selected || [];
  const group = new THREE.Group();
  group.name = 'HongKongLandmarks';
  const colliders = [];
  const ground = ISLAND_BOUNDS.sidewalkHeight;
  const glass = hkMat(0xd5dee8, { metalness: 0.72, roughness: 0.14 });
  const metal = hkMat(0xb7c0c8, { metalness: 0.8, roughness: 0.22 });
  const bronze = hkMat(0x8d7350, { metalness: 0.55, roughness: 0.38 });
  const porthole = hkMat(0x12181e, { metalness: 0.15, roughness: 0.35 });
  const stone = hkMat(0xddd6c8, { metalness: 0.04, roughness: 0.74 });
  const ferryWhite = hkMat(0xf3f1ea, { metalness: 0.02, roughness: 0.62 });
  const ferryRoof = hkMat(0x2c6b4e, { metalness: 0.08, roughness: 0.58 });
  const clockFace = hkMat(0xf7f4ea, { metalness: 0.05, roughness: 0.4 });
  const tramGreen = hkMat(0x0e6a45, { metalness: 0.12, roughness: 0.5 });
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  for (const site of placed) {
    switch (site.kind) {
      case 'two-ifc':
        addTwoIfc(group, site, glass, metal, ground);
        break;
      case 'one-ifc':
        addOneIfc(group, site, glass, ground);
        break;
      case 'boc':
        // Individualised GLTF already carries the LandsD photograph. The prism is only
        // the footprint fallback, and it uses the extrude shopfront and curtain, not a toy skin.
        if (!gltfCoversFootprint(site.block, gltfMeshes)) {
          addBankOfChina(group, site, colliders, up, dir, ground);
        }
        break;
      case 'exchange':
        addExchange(group, site, bronze, metal, ground);
        break;
      case 'jardine':
        addJardine(group, site, porthole, up, ground);
        break;
      case 'cfa':
        addCourtDome(group, site, stone, metal, ground);
        break;
      case 'star-ferry':
        addStarFerry(group, site, colliders, ferryWhite, ferryRoof, clockFace, ground);
        break;
      case 'peak-tram':
        addPeakTram(group, site, colliders, tramGreen, ground);
        break;
      default: {
        const unknown = site.kind;
        throw new Error(`Unhandled Hong Kong landmark ${unknown}`);
      }
    }
  }
  addHkuRedWalls(group, colliders, ground);
  scene.add(group);
  console.info(
    `[landmarks] ${placed.map((site) => `${site.label} ${site.lat.toFixed(5)},${site.lon.toFixed(5)}`).join('; ')}` +
    `; deferred ${deferred.map((site) => site.label).join(', ')}`
  );
  return { group, colliders };
}

function buildLandmarks(scene, gltfPlan = null) {
  return buildHkLandmarks(scene, gltfPlan);
}

// The source camera and walker sample this lawn. Hong Kong has no Bryant Park.
const bryantParkLawn = null;

export { buildLandmarks, bryantParkLawn };
