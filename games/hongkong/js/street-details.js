import * as THREE from 'three/webgpu';
import { Fn, float, color, positionWorld, uniform, mod, fract, step, smoothstep, mix, texture } from 'three/tsl';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BLOCKS, HK_STREET_EYE, HK_STREET_NEAR, ISLAND_BOUNDS, SIGNAL_TIMING, blockAt, districtAt, hkCentralSignSites } from './city-config.js';
import { clipCanyonWalls } from './hk-ground-fill.js';
import { centralCanyonWalls, planHkCanyonNeon } from './hk-neon.js';
import { omitPlandCorridorGlass } from './hk-pland-frame.js';
import { cityUniforms } from './tsl-materials.js';
import { createTreeField } from './trees.js';

// Street-name plates, plus hanging boards and neon strips on the canyon face.

const HK_SIGN_FONT = '"PingFang HK","PingFang TC","Microsoft JhengHei","Noto Sans CJK TC","Noto Sans TC","WenQuanYi Micro Hei","Droid Sans Fallback",sans-serif';

const painted = [];

function strokeFrame(ctx, w, h, inset, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  const rw = w - inset * 2;
  const rh = h - inset * 2;
  const radius = Math.min(28, rw * 0.08, rh * 0.08);
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(inset, inset, rw, rh, radius);
  else ctx.rect(inset, inset, rw, rh);
  ctx.stroke();
}

function paintPlate(ctx, site, w, h) {
  ctx.fillStyle = site.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.fillStyle = site.fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 72px ${HK_SIGN_FONT}`;
  ctx.fillText(site.text, w / 2, h / 2 + 2);
}

function paintNeon(ctx, site, w, h, vertical) {
  ctx.fillStyle = site.bg;
  ctx.fillRect(0, 0, w, h);
  strokeFrame(ctx, w, h, vertical ? 14 : 16, site.fg, vertical ? 12 : 16);
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = vertical ? 5 : 6;
  ctx.strokeRect(vertical ? 32 : 36, vertical ? 32 : 36, w - (vertical ? 64 : 72), h - (vertical ? 64 : 72));
  ctx.fillStyle = site.fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (vertical) {
    const chars = Array.from(site.text);
    const fontPx = chars.length <= 2 ? 148 : chars.length <= 4 ? 112 : 88;
    ctx.font = `700 ${fontPx}px ${HK_SIGN_FONT}`;
    const gap = (h - 80) / chars.length;
    chars.forEach((ch, i) => ctx.fillText(ch, w / 2, 40 + gap * (i + 0.5)));
    return;
  }
  const n = Array.from(site.text).length;
  const fontPx = n <= 3 ? 132 : n <= 5 ? 108 : 88;
  ctx.font = `700 ${fontPx}px ${HK_SIGN_FONT}`;
  ctx.fillText(site.text, w / 2, h / 2 + 4);
}

function paintCanvas(canvas, site) {
  const ctx = canvas.getContext('2d');
  const vertical = site.kind === 'blade';
  if (site.kind === 'plate') paintPlate(ctx, site, canvas.width, canvas.height);
  else paintNeon(ctx, site, canvas.width, canvas.height, vertical);
}

function createSignTexture(site) {
  const canvas = document.createElement('canvas');
  if (site.kind === 'blade') {
    canvas.width = 256;
    canvas.height = 1024;
  } else if (site.kind === 'plate') {
    canvas.width = 640;
    canvas.height = 192;
  } else {
    canvas.width = 1024;
    canvas.height = 256;
  }
  paintCanvas(canvas, site);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  const record = { canvas, site, tex, clones: [] };
  painted.push(record);
  return record;
}

function refreshSignFonts() {
  if (typeof document === 'undefined' || !document.fonts || !document.fonts.load) return;
  document.fonts.load(`700 112px ${HK_SIGN_FONT}`).then(() => {
    for (const item of painted) {
      paintCanvas(item.canvas, item.site);
      item.tex.needsUpdate = true;
      for (const clone of item.clones) clone.needsUpdate = true;
    }
  }).catch(() => {});
}

function makeSignMaterial(map, glow) {
  const mat = new THREE.MeshStandardNodeMaterial({
    map,
    roughness: glow ? 0.48 : 0.72,
    metalness: 0.04
  });
  if (!glow) {
    mat.emissive = new THREE.Color(0x1a1a1a);
    mat.emissiveMap = map;
    mat.emissiveIntensity = 0.14;
    return mat;
  }
  // Painted enamel by day. The interior-glow uniform lifts the same map into
  // bloom at blue hour and midnight without hiding the characters at noon.
  mat.emissiveNode = Fn(() => {
    const night = smoothstep(0.35, 1.3, cityUniforms.uInteriorGlow);
    const gain = float(0.58).add(night.mul(1.25));
    return texture(map).bias(float(-0.75)).rgb.mul(gain);
  })();
  mat.toneMapped = false;
  return mat;
}

function meshName(kind) {
  if (kind === 'plate') return 'HkStreetPlates';
  if (kind === 'blade') return 'HkHangingBoards';
  if (kind === 'fascia') return 'HkNeonStrips';
  const unexpected = kind;
  throw new Error(`Unknown sign kind ${unexpected}`);
}

function addInstancedSigns(group, sites, glow) {
  const buckets = new Map();
  for (const site of sites) {
    const key = `${site.kind}|${site.text}|${site.bg}|${site.fg}`;
    let bucket = buckets.get(key);
    if (!bucket) buckets.set(key, (bucket = []));
    bucket.push(site);
  }
  const plane = new THREE.PlaneGeometry(1, 1);
  const dummy = new THREE.Object3D();
  for (const bucket of buckets.values()) {
    const sample = bucket[0];
    const paintedSign = createSignTexture(sample);
    const fronts = [];
    const backs = [];
    for (const site of bucket) {
      fronts.push(site);
      if (glow && site.kind === 'blade') {
        const nx = Math.sin(site.rotY);
        const nz = Math.cos(site.rotY);
        backs.push({
          ...site,
          x: site.x - nx * 0.045,
          z: site.z - nz * 0.045,
          rotY: site.rotY + Math.PI
        });
      }
    }
    const place = (list, mat, name) => {
      const mesh = new THREE.InstancedMesh(plane, mat, list.length);
      mesh.name = name;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.renderOrder = 4;
      for (let i = 0; i < list.length; i++) {
        const site = list[i];
        dummy.position.set(site.x, site.y, site.z);
        dummy.rotation.set(0, site.rotY, 0);
        dummy.scale.set((site.flip || 1) * site.w, site.h, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      group.add(mesh);
    };
    place(fronts, makeSignMaterial(paintedSign.tex, glow), meshName(sample.kind));
    if (!backs.length) continue;
    // The far face is the same enamel, mirrored in U so 繁體 still reads after the board is turned around.
    const backMap = paintedSign.tex.clone();
    backMap.wrapS = THREE.RepeatWrapping;
    backMap.repeat.x = -1;
    backMap.offset.x = 1;
    paintedSign.clones.push(backMap);
    place(backs, makeSignMaterial(backMap, glow), 'HkHangingBoardsBack');
  }
}

function addArms(group, arms) {
  if (!arms.length) return;
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardNodeMaterial({ color: 0x3a342c, roughness: 0.42, metalness: 0.62 });
  mat.name = 'hkSignArm';
  const mesh = new THREE.InstancedMesh(geo, mat, arms.length);
  mesh.name = 'HkSignArms';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < arms.length; i++) {
    const arm = arms[i];
    dummy.position.set(arm.x, arm.y, arm.z);
    dummy.rotation.set(0, arm.rotY, 0);
    dummy.scale.set(arm.len, 0.07, 0.09);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  group.add(mesh);
}

function hashPos(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

// Curbside trees use the source tree field. Sites sit just outside each lot, on the sidewalk.
function planStreetTrees() {
  const sites = [];
  const cells = new Map();
  const keyOf = (x, z) => Math.floor(x / 6) + ',' + Math.floor(z / 6);
  const occupied = (x, z) => {
    const cx = Math.floor(x / 6);
    const cz = Math.floor(z / 6);
    for (let ix = cx - 1; ix <= cx + 1; ix++) {
      for (let iz = cz - 1; iz <= cz + 1; iz++) {
        for (const s of cells.get(ix + ',' + iz) || []) {
          if ((s.x - x) ** 2 + (s.z - z) ** 2 < 36) return true;
        }
      }
    }
    return false;
  };
  const insert = (site) => {
    const key = keyOf(site.x, site.z);
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(site);
  };
  const blocks = BLOCKS.filter((b) => !b.median && !(b.park > 0.6) && b.area > 80 && b.poly.length >= 3
    && b.cx * b.cx + b.cz * b.cz < 4000 * 4000);
  blocks.sort((a, b) => a.cx * a.cx + a.cz * a.cz - (b.cx * b.cx + b.cz * b.cz));
  for (const block of blocks) {
    if (sites.length >= 4000) break;
    const poly = block.poly;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      if (len < 14) continue;
      const ux = dx / len;
      const uz = dz / len;
      let nx = -uz;
      let nz = ux;
      const mx = (a.x + b.x) * 0.5;
      const mz = (a.z + b.z) * 0.5;
      if ((block.cx - mx) * nx + (block.cz - mz) * nz > 0) {
        nx = -nx;
        nz = -nz;
      }
      for (let s = 7; s < len - 7 && sites.length < 4000; s += 16) {
        const x = a.x + ux * s + nx * 1.45;
        const z = a.z + uz * s + nz * 1.45;
        if (blockAt(x, z) || districtAt(x, z) === 'hk_harbour' || occupied(x, z)) continue;
        const r = hashPos(x, 4.4, z);
        const yaw = Math.atan2(ux, uz);
        const site = {
          x,
          y: ISLAND_BOUNDS.sidewalkHeight,
          z,
          scale: 0.62 + hashPos(x, 6.1, z) * 0.22,
          species: r < 0.4 ? 0 : r < 0.75 ? 1 : 2,
          yaw,
          tier: 1,
          pitRot: yaw,
          grate: true
        };
        sites.push(site);
        insert(site);
      }
    }
  }
  return sites;
}

// Source signal heads: lens colour is chosen from world height, so the head stays at y = 5.42.
function createTrafficSignalLensMaterial(isAvenueHead, clock) {
  const { cycle, avenueAmber, avenueRed, streetAmber } = SIGNAL_TIMING;
  const mat = new THREE.MeshBasicNodeMaterial();
  mat.colorNode = Fn(() => {
    const t = mod(clock, cycle);
    const wy = positionWorld.y;
    const isTopRed = step(5.60, wy);
    const isBottomGreen = float(1.0).sub(step(5.24, wy));
    const isMidAmber = float(1.0).sub(isTopRed).mul(float(1.0).sub(isBottomGreen));
    const greenActive = isAvenueHead
      ? float(1.0).sub(step(avenueAmber, t))
      : step(avenueRed, t).mul(float(1.0).sub(step(streetAmber, t)));
    const amberActive = isAvenueHead
      ? step(avenueAmber, t).mul(float(1.0).sub(step(avenueRed, t)))
      : step(streetAmber, t);
    const redActive = isAvenueHead
      ? step(avenueRed, t)
      : float(1.0).sub(step(avenueRed, t));
    const activeMask = isTopRed.mul(redActive).add(isMidAmber.mul(amberActive)).add(isBottomGreen.mul(greenActive));
    const lensHue = mix(mix(color(0x18ff68), color(0xffaa10), isMidAmber), color(0xff2424), isTopRed);
    return mix(color(0x14181e), lensHue.mul(1.35), activeMask);
  })();
  return mat;
}

function createWalkSignalMaterial(clock) {
  const { cycle, avenueAmber, walk } = SIGNAL_TIMING;
  const mat = new THREE.MeshBasicNodeMaterial();
  mat.colorNode = Fn(() => {
    const t = mod(clock, cycle);
    const isWalk = float(1.0).sub(step(walk, t));
    const isFlashing = step(walk, t).mul(float(1.0).sub(step(avenueAmber, t)));
    const handLit = float(1.0).sub(isFlashing.mul(step(0.5, fract(t))));
    const hand = mix(color(0x14181e), color(0xff5518), handLit);
    return mix(hand, color(0xf4f9ff), isWalk);
  })();
  return mat;
}

function addInstances(group, geometry, material, matrices, name) {
  if (!matrices.length) return;
  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
  mesh.name = name;
  mesh.castShadow = name === 'HkSignalPoles' || name === 'HkSignalArms' || name === 'HkSignalHousings';
  mesh.receiveShadow = false;
  for (let i = 0; i < matrices.length; i++) mesh.setMatrixAt(i, matrices[i]);
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  group.add(mesh);
}

// Cantilevered signal masts at road-graph junctions, the same heads the source hangs over a grid crossing.
function mountTrafficSignals(group, network, clock, audioSignals) {
  const signalIntersections = [];
  if (!network) return signalIntersections;
  const dummy = new THREE.Object3D();
  const bothFaces = (geo) => [geo, geo.clone().rotateY(Math.PI)];
  const HEAD_W = 0.4;
  const HEAD_H = 1.12;
  const HEAD_D = 0.28;
  const LENS_R = 0.145;
  const LENS_Y = [0.36, 0, -0.36];
  const signalHousingGeo = mergeGeometries([
    new THREE.BoxGeometry(HEAD_W, HEAD_H, HEAD_D),
    new THREE.BoxGeometry(0.07, 0.2, 0.07).translate(0, HEAD_H / 2 + 0.1, 0),
    ...LENS_Y.flatMap((ly) => bothFaces(
      new THREE.CylinderGeometry(LENS_R + 0.03, LENS_R + 0.03, 0.24, 14, 1, true, Math.PI / 2, Math.PI)
        .rotateX(Math.PI / 2).translate(0, ly, HEAD_D / 2 + 0.12)
    ))
  ]);
  const signalLensGeo = mergeGeometries(LENS_Y.flatMap((ly) => bothFaces(
    new THREE.CircleGeometry(LENS_R, 18).translate(0, ly, HEAD_D / 2 + 0.004)
  )));
  const walkHousingGeo = new THREE.BoxGeometry(0.34, 0.4, 0.24);
  const walkPanelGeo = mergeGeometries(bothFaces(new THREE.PlaneGeometry(0.27, 0.31).translate(0, 0, 0.125)));
  const poleMatrices = [];
  const armMatrices = [];
  const housingMatrices = [];
  const aveLensMatrices = [];
  const streetLensMatrices = [];
  const walkBoxMatrices = [];
  const walkPanelMatrices = [];
  const near = new Map();
  const tooClose = (x, z) => {
    const cx = Math.floor(x / 4);
    const cz = Math.floor(z / 4);
    for (let ix = cx - 1; ix <= cx + 1; ix++) {
      for (let iz = cz - 1; iz <= cz + 1; iz++) {
        for (const p of near.get(ix + ',' + iz) || []) {
          if ((p.x - x) ** 2 + (p.z - z) ** 2 < 16) return true;
        }
      }
    }
    return false;
  };
  const remember = (x, z) => {
    const key = Math.floor(x / 4) + ',' + Math.floor(z / 4);
    if (!near.has(key)) near.set(key, []);
    near.get(key).push({ x, z });
  };

  for (const n of network.nodes) {
    const groups = new Set();
    for (const e of n.in || []) if (e.axisIndex != null) groups.add(e.axisIndex);
    if (groups.size < 2) continue;
    n.signal = true;
    signalIntersections.push({ x: n.x, z: n.z });
    for (const e of n.in) {
      if (!(e.len > 4) || !Number.isFinite(e.dx) || !Number.isFinite(e.dz)) continue;
      const half = e.half || 4;
      const ex = e.sx + e.dx * e.len;
      const ez = e.sz + e.dz * e.len;
      const px = ex + e.rx * (half + 1.15);
      const pz = ez + e.rz * (half + 1.15);
      if (tooClose(px, pz) || districtAt(px, pz) === 'hk_harbour') continue;
      const lot = blockAt(px, pz);
      if (lot && (lot.median || lot.park > 0.6)) continue;
      remember(px, pz);
      const ox = -e.rx;
      const oz = -e.rz;
      const along = Math.atan2(e.dx, e.dz);
      dummy.position.set(px, 3.3, pz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(0.14, 6.4, 0.14);
      dummy.updateMatrix();
      poleMatrices.push(dummy.matrix.clone());

      dummy.position.set(px + ox * 3.25, 6.1, pz + oz * 3.25);
      dummy.rotation.set(0, Math.atan2(-oz, ox), 0);
      dummy.scale.set(6.5, 0.11, 0.11);
      dummy.updateMatrix();
      armMatrices.push(dummy.matrix.clone());

      dummy.position.set(px + ox * 0.24, 3.15, pz + oz * 0.24);
      dummy.rotation.set(0, along, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      walkBoxMatrices.push(dummy.matrix.clone());
      walkPanelMatrices.push(dummy.matrix.clone());
      audioSignals.push({ x: dummy.position.x, y: dummy.position.y, z: dummy.position.z, isAvenue: e.axis === 'ave' });

      for (const armDist of [3.1, 5.5]) {
        dummy.position.set(px + ox * armDist, 5.42, pz + oz * armDist);
        dummy.rotation.set(0, armDist < 4 ? along : along + Math.PI / 2, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        housingMatrices.push(dummy.matrix.clone());
        (armDist < 4 ? aveLensMatrices : streetLensMatrices).push(dummy.matrix.clone());
      }
    }
  }

  const poleMetalMat = new THREE.MeshStandardNodeMaterial({ color: 0x3b4046, roughness: 0.45, metalness: 0.78 });
  const signalHousingMat = new THREE.MeshStandardNodeMaterial({
    color: 0xe6a817,
    roughness: 0.38,
    metalness: 0.35,
    side: THREE.DoubleSide
  });
  const poleGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
  addInstances(group, poleGeo, poleMetalMat, poleMatrices, 'HkSignalPoles');
  addInstances(group, new THREE.BoxGeometry(1, 1, 1), poleMetalMat, armMatrices, 'HkSignalArms');
  addInstances(group, signalHousingGeo, signalHousingMat, housingMatrices, 'HkSignalHousings');
  addInstances(group, signalLensGeo, createTrafficSignalLensMaterial(true, clock), aveLensMatrices, 'HkAvenueLenses');
  addInstances(group, signalLensGeo, createTrafficSignalLensMaterial(false, clock), streetLensMatrices, 'HkStreetLenses');
  addInstances(group, walkHousingGeo, signalHousingMat, walkBoxMatrices, 'HkWalkHousings');
  addInstances(group, walkPanelGeo, createWalkSignalMaterial(clock), walkPanelMatrices, 'HkWalkPanels');
  console.info(`[signals] ${signalIntersections.length} junctions, ${poleMatrices.length} masts`);
  return signalIntersections;
}

function buildStreetDetails(scene, gltfPlan = null, colliders = []) {
  const group = new THREE.Group();
  group.name = 'HongKongStreetDetails';
  const plates = hkCentralSignSites();
  addInstancedSigns(group, plates, false);
  const gltfMeshes = gltfPlan?.selected || [];
  const walls = clipCanyonWalls(centralCanyonWalls(), gltfMeshes, gltfMeshes.length ? {
    eye: HK_STREET_EYE,
    near: HK_STREET_NEAR
  } : {});
  const plandOn = gltfPlan?.plandMode === 'donor' || gltfPlan?.plandMode === 'compare';
  const shown = omitPlandCorridorGlass(walls, { enabled: plandOn });
  const neon = planHkCanyonNeon(shown);
  addInstancedSigns(group, neon.signs, true);
  addArms(group, neon.arms);
  refreshSignFonts();
  const blades = neon.signs.filter((site) => site.kind === 'blade').length;
  const strips = neon.signs.filter((site) => site.kind === 'fascia').length;
  console.info(
    `[neon] podium-belt boards ${blades} strips ${strips} arms ${neon.arms.length} ` +
    `on ${neon.walls} gap podiums (德輔道中 ${neon.desVoeux}, side ${neon.side})`
  );
  const treeSites = planStreetTrees();
  const treeField = treeSites.length ? createTreeField(scene, treeSites, colliders) : null;
  if (treeField) group.add(treeField.group);
  console.info(`[streetDetails] plates ${plates.length}, trees ${treeField ? treeField.stats.trees : 0}`);
  scene.add(group);
  const signalClock = uniform(0);
  const audioSignals = [];
  return {
    group,
    footprints: [],
    signalClock,
    audioSignals,
    signalIntersections: [],
    treeField,
    mountSignals(network) {
      this.signalIntersections = mountTrafficSignals(group, network, signalClock, audioSignals);
    },
    update(camera) {
      if (treeField && camera) treeField.update(camera.position);
    }
  };
}

export { buildStreetDetails, mountTrafficSignals };
