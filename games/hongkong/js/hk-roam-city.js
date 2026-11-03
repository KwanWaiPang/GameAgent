import * as THREE from 'three/webgpu';
import {
  BLOCKS,
  HK_CORE_WORLD,
  ISLAND_BOUNDS,
  ROADS,
  blockInHkCore,
  hkCoreUnproject,
  hkFootprintHeight
} from './city-config.js';
import { createCurtainWallMaterial } from './tsl-materials.js';

// Every LandsD footprint outside the Central sheet, at its recorded outline and height.
// Central keeps the sheet meshes. These extrusions are the same outline the colliders use.

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

const SKIP_MESH = new Set([
  'Former Kowloon-Canton Railway Clock Tower',
  'The Peak Tower'
]);

const CHUNK = 640;

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

// Same collider record as slop-newyork buildings.js: bounds plus the real outline.
// A lot wider than 50 m on both axes is cut into strips. The road graph ignores an
// obstacle that large, which is how a park box stays off the surrounding streets.
// Each strip still carries the whole outline, so only the building itself blocks.
function hkSolidColliders(ring, maxY, minY = 0) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of ring) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  const polygon = { outer: ring, holes: [] };
  const spanX = maxX - minX;
  const spanZ = maxZ - minZ;
  if (!(spanX > 0) || !(spanZ > 0)) return [];
  if (spanX < 50 || spanZ < 50) {
    return [{ minX, maxX, minZ, maxZ, minY, maxY, polygon }];
  }
  const strips = Math.ceil(spanX / 48);
  const width = spanX / strips;
  const out = [];
  for (let i = 0; i < strips; i++) {
    out.push({
      minX: minX + i * width,
      maxX: minX + (i + 1) * width,
      minZ,
      maxZ,
      minY,
      maxY,
      polygon
    });
  }
  return out;
}

function triangulateRing(pts, contour) {
  const n = pts.length;
  contour.length = n;
  for (let i = 0; i < n; i++) {
    const v = contour[i] || (contour[i] = new THREE.Vector2());
    v.set(pts[i].x, -pts[i].z);
  }
  try {
    const tris = THREE.ShapeUtils.triangulateShape(contour, []);
    if (tris && tris.length) return tris;
  } catch { /* A fan still covers a simple lot. */ }
  const fan = [];
  for (let i = 1; i < n - 1; i++) fan.push([0, i, i + 1]);
  return fan;
}

function appendFootprint(chunk, pts, y0, y1, contour) {
  const tris = triangulateRing(pts, contour);
  if (!tris.length) return false;
  const n = pts.length;
  const base = chunk.n;
  const pos = chunk.pos;
  const uv = chunk.uv;
  for (let i = 0; i < n; i++) {
    pos.push(pts[i].x, y0, pts[i].z);
    uv.push(pts[i].x, pts[i].z);
  }
  for (let i = 0; i < n; i++) {
    pos.push(pts[i].x, y1, pts[i].z);
    uv.push(pts[i].x, pts[i].z);
  }
  chunk.n += n * 2;
  const idx = chunk.idx;
  const top = base + n;
  for (let t = 0; t < tris.length; t++) {
    const a = tris[t][0];
    const b = tris[t][1];
    const c = tris[t][2];
    if (a < 0 || b < 0 || c < 0 || a >= n || b >= n || c >= n) continue;
    idx.push(base + a, base + c, base + b);
    idx.push(top + a, top + b, top + c);
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    idx.push(base + i, base + j, top + j);
    idx.push(base + i, top + j, top + i);
  }
  return true;
}

function flushChunk(group, material, chunk) {
  if (chunk.n < 3 || !chunk.idx.length) return;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(chunk.pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(chunk.uv, 2));
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(chunk.idx), 1));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'HkFootprint';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function emptyChunk() {
  return { pos: [], uv: [], idx: [], n: 0 };
}

function buildCityFootprints(group, material, colliders) {
  const ground = ISLAND_BOUNDS.sidewalkHeight;
  const chunks = new Map();
  const contour = [];
  let built = 0;
  let outlined = 0;
  let skipped = 0;
  for (const block of BLOCKS) {
    if (block.park > 0.6 || block.median) continue;
    if (blockInHkCore(block)) continue;
    const height = hkFootprintHeight(block);
    if (!(height > 0)) continue;
    const pts = ringForExtrude(block.poly);
    if (!pts) {
      skipped++;
      continue;
    }
    colliders.push(...hkSolidColliders(pts, ground + height));
    outlined++;
    if (SKIP_MESH.has(block.name)) continue;
    const key = `${Math.floor(block.cx / CHUNK)}:${Math.floor(block.cz / CHUNK)}`;
    let chunk = chunks.get(key);
    if (!chunk) chunks.set(key, (chunk = emptyChunk()));
    if (!appendFootprint(chunk, pts, ground, ground + height, contour)) {
      skipped++;
      continue;
    }
    built++;
    if (chunk.n > 180000) {
      flushChunk(group, material, chunk);
      chunks.set(key, emptyChunk());
    }
  }
  for (const chunk of chunks.values()) flushChunk(group, material, chunk);
  return { built, outlined, skipped };
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
  const material = createCurtainWallMaterial({
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
  material.name = 'hkFootprint';
  material.side = THREE.DoubleSide;
  const colliders = [];
  const footprints = buildCityFootprints(group, material, colliders);
  const plates = addPlates(group, plateSites());
  scene.add(group);
  console.info(
    `[roam] footprints ${footprints.built} outlines ${footprints.outlined} ` +
    `skipped ${footprints.skipped} meshes ${group.children.length} plates ${plates}`
  );
  return { group, colliders };
}

export { ROAM_ZONES, buildHkRoamCity, hkSolidColliders, inRoamZone };
