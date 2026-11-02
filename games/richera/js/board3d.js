/**
 * 金城纪沙盘。规则不在这里，只负责摆放、拾取和走路。
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CELL_COUNT, GROUP_COLOR, HOSPITAL_INDEX, LEVEL_NAME } from "./data.js";

const HALF = 6.4;
const STEP = (HALF * 2) / 8;
const TILE = 1.42;

const CAM = {
  iso: { pos: [12, 13, 12], target: [0, 0, 0] },
  top: { pos: [0, 18.5, 0.04], target: [0, 0, 0] },
  low: { pos: [8.2, 4.4, 11], target: [0, 0.2, 0] },
};

const TYPE_INK = {
  start: ["#8d2d32", "#f8e7cf"],
  chance: ["#5a3d86", "#f6efe6"],
  fate: ["#243056", "#f4efe6"],
  shop: ["#a56a28", "#fff6e6"],
  bank: ["#1d6a45", "#e9fff4"],
  lottery: ["#9d3454", "#fff1f4"],
  park: ["#2c7a49", "#edfff0"],
  tax: ["#6d4a32", "#fff8ee"],
  hospital: ["#e7eef6", "#1d3550"],
  temple: ["#8a3030", "#f8e7cf"],
  jail: ["#2c313a", "#eceff4"],
};

function cellCenter(index) {
  const side = Math.floor(index / 8);
  const along = HALF - ((index % 8) + 0.5) * STEP;
  if (side === 0) return new THREE.Vector3(along, 0, HALF);
  if (side === 1) return new THREE.Vector3(-HALF, 0, along);
  if (side === 2) return new THREE.Vector3(-along, 0, -HALF);
  return new THREE.Vector3(HALF, 0, -along);
}

function outward(index) {
  const center = cellCenter(index);
  const dir = new THREE.Vector3(center.x, 0, center.z);
  if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
  return dir.normalize();
}

function tokenPos(index, seat) {
  const center = cellCenter(index);
  const out = outward(index);
  const side = new THREE.Vector3(-out.z, 0, out.x);
  return center
    .clone()
    .add(out.clone().multiplyScalar(0.4))
    .add(side.multiplyScalar((seat - 1.5) * 0.32))
    .setY(0.42);
}

function labelTexture(title, sub, bg, ink) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const g = canvas.getContext("2d");
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(255,255,255,0.35)";
  g.lineWidth = 10;
  g.strokeRect(12, 12, 232, 232);
  g.fillStyle = ink;
  g.font = '700 64px "Noto Serif SC", "Songti SC", "SimSun", serif';
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(title, 128, sub ? 108 : 128);
  if (sub) {
    g.font = '600 32px "Noto Serif SC", "Songti SC", "SimSun", serif';
    g.fillText(sub, 128, 168);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function pipTexture(n) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const g = canvas.getContext("2d");
  g.fillStyle = "#f4efe6";
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = "#d9d0c2";
  g.strokeRect(4, 4, 120, 120);
  const spots = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  g.fillStyle = "#1c1916";
  for (const spot of spots[n] || []) {
    const x = 28 + (spot % 3) * 36;
    const y = 28 + Math.floor(spot / 3) * 36;
    g.beginPath();
    g.arc(x, y, 8, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function courtTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const g = canvas.getContext("2d");
  g.fillStyle = "#1a2436";
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#e2b56a";
  g.lineWidth = 10;
  g.strokeRect(36, 36, 440, 440);
  g.strokeRect(58, 58, 396, 396);
  g.fillStyle = "#f3e6c8";
  g.font = '600 92px "Noto Serif SC", serif';
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("金城纪", 256, 230);
  g.font = '500 32px "Noto Serif SC", serif';
  g.fillStyle = "#e2b56a";
  g.fillText("街市沙盘", 256, 310);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function fuseSprite(n) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext("2d");
  g.fillStyle = "rgba(0,0,0,0)";
  g.clearRect(0, 0, 64, 64);
  g.fillStyle = "#2a140e";
  g.beginPath();
  g.arc(32, 32, 28, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#ffb15a";
  g.font = "700 36px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(String(n), 32, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(0.34, 0.34, 0.34);
  sprite.position.y = 0.42;
  return sprite;
}

function std(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.04, ...extra });
}

function makeToken(color) {
  const group = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.18, 4, 10), std(color, { roughness: 0.45 }));
  robe.position.y = 0.26;
  robe.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), std("#f0c2a0", { roughness: 0.5 }));
  head.position.y = 0.52;
  head.castShadow = true;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.16, 10), std(color, { roughness: 0.4 }));
  hat.position.y = 0.68;
  hat.castShadow = true;
  group.add(robe, head, hat);
  group.scale.setScalar(1.2);
  return group;
}

function makeBuilding(level, tint) {
  const group = new THREE.Group();
  const roof = new THREE.Color(tint);
  if (level <= 1) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.32), std("#d7b07a"));
    body.position.y = 0.1;
    body.castShadow = true;
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.2, 4), std(roof));
    top.position.y = 0.28;
    top.rotation.y = Math.PI / 4;
    top.castShadow = true;
    group.add(body, top);
  } else if (level === 2) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 0.36), std("#f3e6d4"));
    body.position.y = 0.21;
    body.castShadow = true;
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.42), std(roof));
    top.position.y = 0.46;
    top.castShadow = true;
    const winMat = std("#ffd7a1", { emissive: 0xffb15a, emissiveIntensity: 0.7 });
    for (const x of [-0.1, 0.1]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.02), winMat);
      win.position.set(x, 0.24, 0.18);
      group.add(win);
    }
    group.add(body, top);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.92, 0.32), std("#f7f1e8"));
    body.position.y = 0.46;
    body.castShadow = true;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.38), std(roof));
    cap.position.y = 0.96;
    cap.castShadow = true;
    const winMat = std("#ffe0b0", { emissive: 0xffc98a, emissiveIntensity: 0.85 });
    for (let row = 0; row < 4; row++) {
      for (const x of [-0.08, 0.08]) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.02), winMat);
        win.position.set(x, 0.18 + row * 0.2, 0.16);
        group.add(win);
      }
    }
    group.add(body, cap);
  }
  return group;
}

function makeTrap(trap) {
  const group = new THREE.Group();
  if (trap.kind === "block") {
    const post = std("#f4efe6");
    const left = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.28, 8), post);
    const right = left.clone();
    left.position.set(-0.16, 0.14, 0);
    right.position.set(0.16, 0.14, 0);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.06), std("#c4473a"));
    bar.position.y = 0.22;
    group.add(left, right, bar);
  } else if (trap.kind === "mine") {
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.05, 16),
      std("#241816", { emissive: 0xff4422, emissiveIntensity: 0.7 })
    );
    disc.userData.pulse = true;
    disc.position.y = 0.03;
    group.add(disc);
  } else {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), std("#1b1b1b", { metalness: 0.4 }));
    ball.position.y = 0.12;
    ball.castShadow = true;
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 6), std("#c4473a"));
    fuse.position.y = 0.26;
    group.add(ball, fuse, fuseSprite(trap.fuse ?? 3));
  }
  return group;
}

function disposeObject(obj) {
  obj.traverse((node) => {
    node.geometry?.dispose?.();
    const mats = node.material ? (Array.isArray(node.material) ? node.material : [node.material]) : [];
    for (const mat of mats) {
      mat.map?.dispose?.();
      mat.dispose?.();
    }
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createBoard(canvas, hooks = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x141a28);
  scene.fog = new THREE.Fog(0x141a28, 22, 48);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  camera.position.set(...CAM.iso.pos);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...CAM.iso.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2.08;
  controls.minDistance = 7;
  controls.maxDistance = 30;
  controls.update();

  scene.add(new THREE.HemisphereLight(0xc9d7ee, 0x3a2a22, 0.85));
  const sun = new THREE.DirectionalLight(0xffe2b8, 1.55);
  sun.position.set(10, 16, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 40;
  sun.shadow.camera.left = -14;
  sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 14;
  sun.shadow.camera.bottom = -14;
  scene.add(sun);
  const lantern = new THREE.PointLight(0xff9944, 8, 14, 2);
  lantern.position.set(0, 1.6, 0);
  scene.add(lantern);

  const table = new THREE.Mesh(new THREE.BoxGeometry(18.4, 0.46, 18.4), std(0x4a301f, { roughness: 0.78 }));
  table.position.y = -0.36;
  table.receiveShadow = true;
  scene.add(table);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.22, 14.4), std(0x6e2430, { roughness: 0.5, metalness: 0.12 }));
  plinth.position.y = -0.04;
  plinth.receiveShadow = true;
  scene.add(plinth);

  const court = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 8.6), new THREE.MeshStandardMaterial({ map: courtTexture(), roughness: 0.8 }));
  court.rotation.x = -Math.PI / 2;
  court.position.y = 0.08;
  court.receiveShadow = true;
  scene.add(court);

  const skyline = new THREE.Group();
  for (let i = 0; i < 18; i++) {
    const h = 1.2 + ((i * 37) % 10) * 0.28;
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, h, 0.9), std(i % 2 ? 0x1c2638 : 0x243044, { emissive: 0xffb15a, emissiveIntensity: 0.04 }));
    const angle = (i / 18) * Math.PI * 2;
    box.position.set(Math.cos(angle) * 11.2, h / 2 - 0.4, Math.sin(angle) * 11.2);
    skyline.add(box);
  }
  scene.add(skyline);

  for (const corner of [
    [6.9, 6.9],
    [-6.9, 6.9],
    [-6.9, -6.9],
    [6.9, -6.9],
  ]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.7, 8), std("#3a2a20"));
    pole.position.set(corner[0], 0.45, corner[1]);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 12, 10),
      std("#ffb15a", { emissive: 0xff8a2a, emissiveIntensity: 1.3 })
    );
    glow.position.set(corner[0], 0.86, corner[1]);
    glow.userData.lantern = true;
    scene.add(pole, glow);
  }

  const tileMats = [];
  const pegs = [];
  const pickables = [];
  const buildingRoot = new THREE.Group();
  const trapRoot = new THREE.Group();
  scene.add(buildingRoot, trapRoot);
  const buildings = new Array(CELL_COUNT).fill(null);
  const buildingKeys = new Array(CELL_COUNT).fill("");

  for (let i = 0; i < CELL_COUNT; i++) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xf6efe4, roughness: 0.72 });
    const tile = new THREE.Mesh(new THREE.BoxGeometry(TILE, 0.16, TILE), mat);
    const center = cellCenter(i);
    tile.position.set(center.x, 0.16, center.z);
    tile.receiveShadow = true;
    tile.userData.index = i;
    scene.add(tile);
    tileMats.push(mat);
    pickables.push(tile);
    const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 10), std("#ffffff"));
    const out = outward(i);
    const side = new THREE.Vector3(-out.z, 0, out.x);
    peg.position.set(center.x + side.x * 0.46, 0.3, center.z + side.z * 0.46);
    peg.castShadow = true;
    peg.visible = false;
    scene.add(peg);
    pegs.push(peg);
  }

  const pipMats = [1, 2, 3, 4, 5, 6].map((n) => new THREE.MeshStandardMaterial({ map: pipTexture(n), roughness: 0.45 }));
  const die = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), pipMats[0].clone());
  die.castShadow = true;
  die.position.set(0, 0.7, 2.15);
  scene.add(die);

  const tokens = [];
  let animating = false;
  let pickSet = null;
  let camAnim = null;
  let running = true;

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function paintTile(index, cell) {
    const mat = tileMats[index];
    let bg = "#f4efe4";
    let ink = "#2a2118";
    let sub = "";
    if (cell.type === "property") {
      bg = GROUP_COLOR[cell.group] || "#f4efe4";
      ink = "#fffaf3";
      sub = `$${cell.price}`;
    } else {
      const pair = TYPE_INK[cell.type] || ["#f4efe4", "#2a2118"];
      bg = pair[0];
      ink = pair[1];
    }
    mat.color.set(bg);
    mat.map = null;
    mat.needsUpdate = true;
    const tex = labelTexture(cell.name, sub, bg, ink);
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(TILE * 0.92, TILE * 0.92),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    const center = cellCenter(index);
    const side = Math.floor(index / 8);
    plane.rotation.order = "YXZ";
    plane.rotation.y = -side * (Math.PI / 2);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(center.x, 0.25, center.z);
    plane.userData.index = index;
    scene.add(plane);
    pickables.push(plane);
  }

  function ensureTokens(state) {
    while (tokens.length < state.players.length) {
      const seat = tokens.length;
      const token = makeToken(state.players[seat].color);
      token.userData.cell = 0;
      token.position.copy(tokenPos(0, seat));
      scene.add(token);
      tokens.push(token);
    }
  }

  function placeBuilding(index, cell) {
    const key = `${cell.level || 0}:${cell.owner ?? "-"}`;
    if (buildingKeys[index] === key) return;
    if (buildings[index]) {
      buildingRoot.remove(buildings[index]);
      disposeObject(buildings[index]);
      const at = pickables.indexOf(buildings[index]);
      if (at >= 0) pickables.splice(at, 1);
      buildings[index] = null;
    }
    buildingKeys[index] = key;
    if (cell.type !== "property" || !(cell.level > 0)) return;
    const tint = cell.owner == null ? GROUP_COLOR[cell.group] : stateColor(cell);
    const model = makeBuilding(cell.level, tint || "#c4473a");
    const center = cellCenter(index);
    const inn = outward(index).multiplyScalar(-0.22);
    model.position.set(center.x + inn.x, 0.24, center.z + inn.z);
    model.userData.index = index;
    buildingRoot.add(model);
    buildings[index] = model;
    pickables.push(model);
  }

  let ownerColors = ["#e23b3b", "#3c7ad9", "#2f9e62", "#e0a12a"];
  function stateColor(cell) {
    return ownerColors[cell.owner] || GROUP_COLOR[cell.group] || "#f4efe4";
  }

  function syncTraps(traps) {
    for (const child of [...trapRoot.children]) {
      trapRoot.remove(child);
      disposeObject(child);
    }
    for (const trap of traps) {
      const model = makeTrap(trap);
      const center = cellCenter(trap.at);
      const out = outward(trap.at).multiplyScalar(0.05);
      model.position.set(center.x + out.x, 0.26, center.z + out.z);
      trapRoot.add(model);
    }
  }

  function highlight() {
    for (let i = 0; i < tileMats.length; i++) {
      const on = pickSet?.has(i);
      tileMats[i].emissive = new THREE.Color(on ? 0xe2b56a : 0x000000);
      tileMats[i].emissiveIntensity = on ? 0.28 : 0;
    }
  }

  let labelsReady = false;
  function sync(state) {
    ownerColors = state.players.map((p) => p.color);
    if (!labelsReady) {
      state.cells.forEach((cell, index) => paintTile(index, cell));
      labelsReady = true;
    }
    ensureTokens(state);
    state.cells.forEach((cell, index) => {
      placeBuilding(index, cell);
      pegs[index].visible = cell.owner != null;
      if (cell.owner != null) pegs[index].material.color.set(ownerColors[cell.owner] || "#ffffff");
    });
    syncTraps(state.traps);
    state.players.forEach((player, seat) => {
      const token = tokens[seat];
      token.visible = !player.bankrupt;
      if (!animating) {
        token.userData.cell = player.position;
        token.position.copy(tokenPos(player.position, seat));
      }
    });
    highlight();
  }

  function setDieFace(face) {
    const n = Math.max(1, Math.min(6, face | 0));
    die.material = [
      pipMats[(n + 1) % 6],
      pipMats[(n + 2) % 6],
      pipMats[n - 1],
      pipMats[6 - n - 1] || pipMats[0],
      pipMats[(n + 3) % 6],
      pipMats[(n + 4) % 6],
    ];
    die.rotation.set(0, 0.4, 0);
    die.position.y = 0.62;
  }

  async function spinDie(face) {
    const t0 = performance.now();
    await new Promise((resolve) => {
      function frame(now) {
        const u = Math.min(1, (now - t0) / 680);
        die.rotation.x = u * 14;
        die.rotation.y = u * 11;
        die.rotation.z = u * 6;
        die.position.y = 0.7 + Math.sin(u * Math.PI) * 0.85;
        if (u < 1) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
    setDieFace(face);
    await wait(80);
  }

  function moveAlong(id, index, height) {
    const token = tokens[id];
    const start = token.position.clone();
    const end = tokenPos(index, id);
    const dur = height > 1 ? 700 : 250;
    const t0 = performance.now();
    token.rotation.y = Math.atan2(end.x - start.x, end.z - start.z);
    return new Promise((resolve) => {
      function frame(now) {
        const u = Math.min(1, (now - t0) / dur);
        const e = u * u * (3 - 2 * u);
        token.position.lerpVectors(start, end, e);
        token.position.y += Math.sin(u * Math.PI) * height;
        if (u < 1) requestAnimationFrame(frame);
        else {
          token.userData.cell = index;
          token.position.copy(end);
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });
  }

  async function play(plan, playerId) {
    animating = true;
    try {
      await spinDie(plan.face);
      for (const index of plan.path) await moveAlong(playerId, index, 0.34);
      if (plan.hospital) await moveAlong(playerId, HOSPITAL_INDEX, 1.6);
    } finally {
      animating = false;
    }
  }

  async function fly(playerId, from, to) {
    animating = true;
    try {
      tokens[playerId].position.copy(tokenPos(from, playerId));
      tokens[playerId].userData.cell = from;
      await moveAlong(playerId, to, 1.8);
    } finally {
      animating = false;
    }
  }

  function setPick(indices) {
    pickSet = indices?.length ? new Set(indices) : null;
    highlight();
    canvas.style.cursor = pickSet ? "pointer" : "";
  }

  function setCamera(mode) {
    const preset = CAM[mode] || CAM.iso;
    camAnim = {
      from: camera.position.clone(),
      to: new THREE.Vector3(...preset.pos),
      targetFrom: controls.target.clone(),
      targetTo: new THREE.Vector3(...preset.target),
      t: 0,
    };
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let down = null;
  function hitIndex(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, true);
    for (const hit of hits) {
      let node = hit.object;
      while (node) {
        if (node.userData?.index != null) return node.userData.index;
        node = node.parent;
      }
    }
    return null;
  }

  canvas.addEventListener("pointerdown", (event) => {
    down = { x: event.clientX, y: event.clientY };
  });
  canvas.addEventListener("pointerup", (event) => {
    if (!down) return;
    const dx = event.clientX - down.x;
    const dy = event.clientY - down.y;
    down = null;
    if (dx * dx + dy * dy > 25) return;
    const index = hitIndex(event);
    if (index == null) return;
    if (pickSet) {
      if (pickSet.has(index)) hooks.onPick?.(index);
      return;
    }
    hooks.onInspect?.(index);
  });

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const time = now * 0.001;
    if (camAnim) {
      camAnim.t = Math.min(1, camAnim.t + 0.06);
      const t = camAnim.t;
      camera.position.lerpVectors(camAnim.from, camAnim.to, t);
      controls.target.lerpVectors(camAnim.targetFrom, camAnim.targetTo, t);
      if (t >= 1) camAnim = null;
    }
    if (!animating) {
      tokens.forEach((token, seat) => {
        if (!token.visible) return;
        const base = tokenPos(token.userData.cell || 0, seat);
        token.position.copy(base);
        token.position.y += Math.sin(time * 2.2 + seat) * 0.025;
      });
    }
    trapRoot.traverse((node) => {
      if (node.userData?.pulse && node.material) {
        node.material.emissiveIntensity = 0.35 + Math.sin(time * 7) * 0.45;
      }
    });
    scene.traverse((node) => {
      if (node.userData?.lantern && node.material) {
        node.material.emissiveIntensity = 1.1 + Math.sin(time * 3 + node.position.x) * 0.25;
      }
    });
    controls.update();
    renderer.render(scene, camera);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);

  return {
    sync,
    play,
    fly,
    setPick,
    setCamera,
    resize,
    dispose() {
      running = false;
      window.removeEventListener("resize", resize);
      controls.dispose();
      renderer.dispose();
    },
  };
}

export const LEVELS = LEVEL_NAME;
