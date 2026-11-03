import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  BLOCKS,
  HK_CORE_WORLD,
  ISLAND_BOUNDS,
  ROADS,
  blockInHkCore,
  hkCoreUnproject,
  hkFootprintHeight,
  hkRetailSlices
} from './city-config.js';
import { createCurtainWallMaterial, createRetailPodiumMaterial } from './tsl-materials.js';

// Real LandsD footprints outside the Central sheet: Wan Chai through North Point,
// Tsim Sha Tsui, Yau Ma Tei, Mong Kok, and West Kowloon. Tall plates keep their
// ring. Lower plates become scaled boxes so the street wall can load with the page.

const ROAM_ZONES = Object.freeze([
  { id: 'sheungwan', south: 22.2838, west: 114.1445, north: 22.2892, east: 114.1502 },
  { id: 'wanchai', south: 22.2732, west: 114.1692, north: 22.2848, east: 114.1788 },
  { id: 'causeway', south: 22.2762, west: 114.1792, north: 22.2832, east: 114.1872 },
  { id: 'northpoint', south: 22.2872, west: 114.1872, north: 22.2946, east: 114.2065 },
  { id: 'tst', south: 22.293, west: 114.1682, north: 22.3002, east: 114.1768 },
  { id: 'jordan', south: 22.3002, west: 114.1688, north: 22.3128, east: 114.1752 },
  { id: 'mongkok', south: 22.3162, west: 114.1672, north: 22.3224, east: 114.1728 },
  { id: 'westkln', south: 22.2998, west: 114.1548, north: 22.3062, east: 114.1638 }
]);

const SKIP_NAMES = new Set([
  'Former Kowloon-Canton Railway Clock Tower',
  'The Peak Tower'
]);

const WIDE_NAMES = new Set([
  'Hong Kong Convention and Exhibition Centre'
]);

const TOWER_CAP = 260;
const BOX_CAP = 4800;

const STREET_PLATES = new Map([
  ['NATHAN ROAD', '彌敦道'],
  ['SALISBURY ROAD', '梳士巴利道'],
  ['CANTON ROAD', '廣東道'],
  ['CHATHAM ROAD SOUTH', '漆咸道南'],
  ['HAIPHONG ROAD', '海防道'],
  ['PEKING ROAD', '北京道'],
  ['KIMBERLEY ROAD', '金巴利道'],
  ['CARNARVON ROAD', '加拿分道'],
  ['GRANVILLE ROAD', '加連威老道'],
  ['SHANGHAI STREET', '上海街'],
  ['PORTLAND STREET', '砵蘭街'],
  ['SOY STREET', '豉油街'],
  ['NELSON STREET', '奶路臣街'],
  ['ARGYLE STREET', '亞皆老街'],
  ['FA YUEN STREET', '花園街'],
  ['TUNG CHOI STREET', '通菜街'],
  ['HENNESSY ROAD', '軒尼詩道'],
  ['GLOUCESTER ROAD', '告士打道'],
  ['LOCKHART ROAD', '駱克道'],
  ['JOHNSTON ROAD', '莊士敦道'],
  ["QUEEN'S ROAD EAST", '皇后大道東'],
  ['PERCIVAL STREET', '波斯富街'],
  ['YEE WO STREET', '怡和街'],
  ["KING'S ROAD", '英皇道'],
  ['QUEENSWAY', '金鐘道']
]);

function inRoamZone(x, z) {
  const { lon, lat } = hkCoreUnproject(x, z);
  for (const zone of ROAM_ZONES) {
    if (lat >= zone.south && lat <= zone.north && lon >= zone.west && lon <= zone.east) return zone.id;
  }
  return '';
}

function inCoreWorld(x, z) {
  return x >= HK_CORE_WORLD.minX && x <= HK_CORE_WORLD.maxX && z >= HK_CORE_WORLD.minZ && z <= HK_CORE_WORLD.maxZ;
}

function ringForExtrude(poly) {
  const pts = [];
  for (const p of poly || []) {
    const prev = pts[pts.length - 1];
    if (prev && Math.hypot(prev.x - p.x, prev.z - p.z) < 0.05) continue;
    pts.push({ x: p.x, z: p.z });
  }
  if (pts.length >= 2 && Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].z - pts[pts.length - 1].z) < 0.05) pts.pop();
  if (pts.length < 3) return null;
  let area = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    area += pts[j].x * (-pts[i].z) - pts[i].x * (-pts[j].z);
  }
  if (area < 0) pts.reverse();
  return pts;
}

function extrudeRing(pts, height, lift) {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, -pts[0].z);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, -pts[i].z);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 1 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, ISLAND_BOUNDS.sidewalkHeight + lift, 0);
  return geo;
}

function tryExtrude(pts, height, lift) {
  let geo = null;
  try {
    geo = extrudeRing(pts, height, lift);
  } catch {
    geo = null;
  }
  if (!geo || !geo.getAttribute('position') || geo.getAttribute('position').count < 3) {
    if (geo) geo.dispose();
    return null;
  }
  return geo;
}

function colliderFor(block, height) {
  return {
    minX: block.minX,
    maxX: block.maxX,
    minZ: block.minZ,
    maxZ: block.maxZ,
    maxY: ISLAND_BOUNDS.sidewalkHeight + height
  };
}

function shrunkBox(block, scale) {
  const cx = (block.minX + block.maxX) / 2;
  const cz = (block.minZ + block.maxZ) / 2;
  const hx = (block.maxX - block.minX) * scale * 0.5;
  const hz = (block.maxZ - block.minZ) * scale * 0.5;
  return { cx, cz, hx, hz, minX: cx - hx, maxX: cx + hx, minZ: cz - hz, maxZ: cz + hz };
}

function buildFabric(group, blocks, material, colliders) {
  if (!blocks.length) return 0;
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(geo, material, blocks.length);
  mesh.name = 'HkRoamFabric';
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const dummy = new THREE.Object3D();
  const ground = ISLAND_BOUNDS.sidewalkHeight;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const box = shrunkBox(block, 0.84);
    const height = hkFootprintHeight(block);
    dummy.position.set(box.cx, ground, box.cz);
    dummy.scale.set(Math.max(4, box.hx * 2), height, Math.max(4, box.hz * 2));
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    colliders.push({
      minX: box.minX,
      maxX: box.maxX,
      minZ: box.minZ,
      maxZ: box.maxZ,
      maxY: ground + height
    });
  }
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
  return blocks.length;
}

function buildTowers(group, blocks, materials, colliders) {
  const batches = { tower: [], retail: [] };
  let built = 0;
  const flush = (key) => {
    const batch = batches[key];
    if (!batch.length) return;
    const merged = mergeGeometries(batch, false);
    for (const geo of batch) geo.dispose();
    batch.length = 0;
    if (!merged) return;
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, materials[key]);
    mesh.name = key === 'retail' ? 'HkRoamRetail' : 'HkRoamTower';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  for (const block of blocks) {
    const height = hkFootprintHeight(block);
    const pts = ringForExtrude(block.poly);
    if (!pts) continue;
    const slices = hkRetailSlices(0, height, 'tower');
    const geos = [];
    let failed = false;
    for (const slice of slices) {
      const geo = tryExtrude(pts, slice.h, slice.y0);
      if (!geo) {
        failed = true;
        break;
      }
      geos.push({ key: slice.style === 'retail' ? 'retail' : 'tower', geo });
    }
    if (failed) {
      for (const item of geos) item.geo.dispose();
      const box = shrunkBox(block, 0.96);
      const geo = new THREE.BoxGeometry(Math.max(4, box.hx * 2), height, Math.max(4, box.hz * 2));
      geo.translate(box.cx, ISLAND_BOUNDS.sidewalkHeight + height / 2, box.cz);
      batches.tower.push(geo);
      colliders.push(colliderFor(block, height));
      built++;
      continue;
    }
    for (const item of geos) batches[item.key].push(item.geo);
    if (batches.tower.length >= 80) flush('tower');
    if (batches.retail.length >= 80) flush('retail');
    colliders.push(colliderFor(block, height));
    built++;
  }
  flush('tower');
  flush('retail');
  return built;
}

function plateSites() {
  const sites = [];
  const occupied = new Set();
  const claim = (x, z) => {
    const key = `${Math.round(x / 8)}:${Math.round(z / 8)}`;
    if (occupied.has(key)) return false;
    occupied.add(key);
    return true;
  };
  for (const road of ROADS) {
    if (sites.length >= 320) break;
    const text = STREET_PLATES.get(road.raw);
    if (!text || road.highway) continue;
    const pts = road.pts;
    const half = Math.max(3.4, (road.w || 8) * 0.5);
    for (let i = 0; i + 1 < pts.length && sites.length < 320; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      if (len < 70) continue;
      const nx = -dz / len;
      const nz = dx / len;
      const count = Math.max(1, Math.floor(len / 120));
      for (let s = 0; s < count && sites.length < 320; s++) {
        const t = (s + 0.5) / count;
        const x = a.x + dx * t;
        const z = a.z + dz * t;
        if (inCoreWorld(x, z) || !inRoamZone(x, z)) continue;
        const sx = x + nx * (half + 1.6);
        const sz = z + nz * (half + 1.6);
        if (!claim(sx, sz)) continue;
        sites.push({
          kind: 'plate',
          text,
          bg: '#f4f1e8',
          fg: '#1b1b1b',
          x: sx,
          y: 4.6,
          z: sz,
          rotY: Math.atan2(-nx, -nz),
          w: 3.1,
          h: 0.82
        });
      }
    }
  }
  return sites;
}

const PLATE_FONT = '"PingFang HK","Microsoft JhengHei","Noto Sans TC",sans-serif';

function paintPlate(canvas, site) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = site.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.fillStyle = site.fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 68px ${PLATE_FONT}`;
  ctx.fillText(site.text, canvas.width / 2, canvas.height / 2 + 2);
}

function addPlates(group, sites) {
  const buckets = new Map();
  for (const site of sites) {
    let bucket = buckets.get(site.text);
    if (!bucket) buckets.set(site.text, (bucket = []));
    bucket.push(site);
  }
  const plane = new THREE.PlaneGeometry(1, 1);
  const dummy = new THREE.Object3D();
  const painted = [];
  for (const bucket of buckets.values()) {
    const sample = bucket[0];
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    paintPlate(canvas, sample);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardNodeMaterial({
      map,
      roughness: 0.72,
      metalness: 0.04,
      emissive: new THREE.Color(0x1a1a1a),
      emissiveMap: map,
      emissiveIntensity: 0.14
    });
    const mesh = new THREE.InstancedMesh(plane, mat, bucket.length);
    mesh.name = 'HkRoamPlate';
    for (let i = 0; i < bucket.length; i++) {
      const site = bucket[i];
      dummy.position.set(site.x, site.y, site.z);
      dummy.rotation.set(0, site.rotY, 0);
      dummy.scale.set(site.w, site.h, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    group.add(mesh);
    painted.push({ canvas, site: sample, map });
  }
  if (document.fonts?.load) {
    document.fonts.load(`700 68px ${PLATE_FONT}`).then(() => {
      for (const item of painted) {
        paintPlate(item.canvas, item.site);
        item.map.needsUpdate = true;
      }
    }).catch(() => {});
  }
  return sites.length;
}

function buildHkRoamCity(scene) {
  const group = new THREE.Group();
  group.name = 'HongKongRoam';
  const towers = [];
  const boxes = [];
  const wides = [];
  let outside = 0;
  for (const block of BLOCKS) {
    if (block.park > 0.6 || block.median) continue;
    if (blockInHkCore(block)) continue;
    if (!inRoamZone(block.cx, block.cz)) {
      outside++;
      continue;
    }
    const height = hkFootprintHeight(block);
    if (!(height > 9)) continue;
    if (SKIP_NAMES.has(block.name)) continue;
    const spanX = block.maxX - block.minX;
    const spanZ = block.maxZ - block.minZ;
    const span = Math.max(spanX, spanZ);
    const short = Math.min(spanX, spanZ);
    if (short < 6) continue;
    if (WIDE_NAMES.has(block.name)) {
      wides.push(block);
      continue;
    }
    if (height >= 64 && span >= 16 && span <= 150) towers.push(block);
    else if (height >= 11 && span <= 96) boxes.push(block);
  }
  towers.sort((a, b) => b.height - a.height);
  if (towers.length > TOWER_CAP) {
    boxes.push(...towers.splice(TOWER_CAP));
  }
  boxes.sort((a, b) => b.height - a.height);
  if (boxes.length > BOX_CAP) boxes.length = BOX_CAP;
  const fabricMat = createCurtainWallMaterial({
    glassTint: 0x35586e,
    frameTint: 0xd5dee6,
    windowWidth: 2.4,
    floorHeight: 3.6,
    litProbability: 0.62,
    warmth: 0.46,
    reflectivity: 0.72,
    seed: 5.5,
    boxLocal: false,
    quietGlass: true
  });
  fabricMat.name = 'hkRoamFabric';
  const towerMat = createCurtainWallMaterial({
    glassTint: 0x1a4d68,
    frameTint: 0xe7eef3,
    windowWidth: 2.35,
    floorHeight: 3.9,
    litProbability: 0.68,
    warmth: 0.4,
    reflectivity: 0.9,
    seed: 6.2,
    boxLocal: false
  });
  towerMat.name = 'hkRoamTower';
  const colliders = [];
  const fabric = buildFabric(group, boxes, fabricMat, colliders);
  const towerCount = buildTowers(group, towers.concat(wides), {
    tower: towerMat,
    retail: createRetailPodiumMaterial()
  }, colliders);
  const plates = addPlates(group, plateSites());
  scene.add(group);
  console.info(
    `[roam] zones ${ROAM_ZONES.map((zone) => zone.id).join(',')} ` +
    `towers ${towerCount} fabric ${fabric} plates ${plates}; ` +
    `lots outside the belts ${outside}`
  );
  return { group, colliders };
}

export { ROAM_ZONES, buildHkRoamCity, inRoamZone };
