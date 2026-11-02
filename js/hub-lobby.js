import * as THREE from "three";

const root = document.documentElement;
const canvas = document.getElementById("lobby-canvas");
const ui = document.getElementById("lobby-ui");
const rail = document.getElementById("lobby-rail");
const STEP_FALLBACK = "wizard";

const KIND = {
  go: { felt: 0xc48a3a, glow: 0xe7c27a, plaque: "#3a2614", ink: "#f6edd8" },
  xiangqi: { felt: 0x8d3a2c, glow: 0xe7b090, plaque: "#3a2218", ink: "#f3d2c4" },
  gomoku: { felt: 0xd7b06a, glow: 0xf0d7a2, plaque: "#3d2c16", ink: "#fff6e4" },
  junqi: { felt: 0x6e2430, glow: 0xe07a78, plaque: "#241418", ink: "#f6d0cc" },
  chess: { felt: 0x2f4a3c, glow: 0xd7c4a2, plaque: "#1b2420", ink: "#f3ead8" },
  wizard: { felt: 0x243044, glow: 0xe2b56a, plaque: "#141a24", ink: "#f0d7a4" },
  wizard2: { felt: 0x2a2438, glow: 0xd7c4f0, plaque: "#1a1628", ink: "#f4ead4" },
  xiangqi3d: { felt: 0x6e3428, glow: 0xe7c27a, plaque: "#2a1814", ink: "#f6e6d0" },
  mono: { felt: 0x2f8f62, glow: 0x8ee0b0, plaque: "#163028", ink: "#e7fff2" },
  fps: { felt: 0x3e4650, glow: 0x9eb0c4, plaque: "#1a1e24", ink: "#e6eef6" },
  street: { felt: 0x8a6844, glow: 0xf0c48a, plaque: "#2a2118", ink: "#f8e6cc" },
  pocket: { felt: 0x3d8a48, glow: 0xf06058, plaque: "#16301c", ink: "#ffe8e4" },
  redcap: { felt: 0x3d74c8, glow: 0xf07068, plaque: "#1a2740", ink: "#ffe4e0" },
};

function showFlat() {
  root.classList.remove("lobby-pending", "lobby-ready", "lobby-list");
  root.classList.add("lobby-flat");
}

function readGames() {
  return [...document.querySelectorAll("#hub-list .game-card")].map((card) => {
    const section = card.closest("section");
    const title = section?.querySelector(".section-title");
    return {
      kind: card.dataset.kind || "go",
      href: card.getAttribute("href"),
      name: card.querySelector("h2")?.textContent.trim() || "",
      blurb: card.querySelector("p")?.textContent.trim() || "",
      cta: (card.querySelector(".cta")?.textContent || "进入").replace("→", "").trim(),
      cat: title?.textContent.trim() || "",
      theme: KIND[card.dataset.kind] || KIND.go,
    };
  });
}

function canvasTex(draw, w = 256, h = 256) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function nameLines(name) {
  const parts = name.split("·").map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts : [name];
}

function plaqueTexture(name, theme) {
  const lines = nameLines(name);
  return canvasTex((g, w, h) => {
    g.fillStyle = "#120e0c";
    g.fillRect(0, 0, w, h);
    g.fillStyle = theme.plaque;
    g.fillRect(28, 28, w - 56, h - 56);
    g.strokeStyle = "#e2b56a";
    g.lineWidth = 14;
    g.strokeRect(22, 22, w - 44, h - 44);
    g.fillStyle = theme.ink;
    g.textAlign = "center";
    g.textBaseline = "middle";
    const longest = Math.max(...lines.map((line) => line.length), 1);
    const size = Math.max(54, Math.min(108, Math.floor((w - 120) / longest)));
    g.font = `400 ${size}px "ZCOOL XiaoWei", "Noto Serif SC", serif`;
    const gap = size * 1.18;
    let y = h * 0.4 - ((lines.length - 1) * gap) / 2;
    for (const line of lines) {
      g.fillText(line, w / 2, y);
      y += gap;
    }
  }, 512, 640);
}

function boardTexture(bg, line, cells) {
  return canvasTex((g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = line;
    g.lineWidth = 3;
    const pad = 28;
    const span = w - pad * 2;
    const n = cells - 1;
    for (let i = 0; i < cells; i++) {
      const p = pad + (span * i) / n;
      g.beginPath();
      g.moveTo(pad, p);
      g.lineTo(w - pad, p);
      g.stroke();
      g.beginPath();
      g.moveTo(p, pad);
      g.lineTo(p, h - pad);
      g.stroke();
    }
  });
}

function checkTexture(light, dark, cells = 4) {
  return canvasTex((g, w, h) => {
    const s = w / cells;
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        g.fillStyle = (x + y) % 2 ? dark : light;
        g.fillRect(x * s, y * s, s + 0.5, s + 0.5);
      }
    }
  });
}

function floorTexture() {
  return canvasTex((g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w / 2);
    grd.addColorStop(0, "#6b4630");
    grd.addColorStop(0.5, "#3a2618");
    grd.addColorStop(1, "#1c120c");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(226,181,106,0.55)";
    g.lineWidth = 6;
    g.beginPath();
    g.arc(w / 2, h / 2, w * 0.34, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = "rgba(226,181,106,0.2)";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(w / 2, h / 2, w * 0.42, 0, Math.PI * 2);
    g.stroke();
  }, 512, 512);
}

function main() {
  const games = readGames();
  if (!canvas || !games.length || !window.WebGLRenderingContext) {
    showFlat();
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch {
    showFlat();
    return;
  }
  if (!renderer.getContext()) {
    showFlat();
    return;
  }

  const coarse = matchMedia("(pointer: coarse)").matches;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const low = coarse || (navigator.hardwareConcurrency || 8) <= 4;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1.25 : 1.6));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = !low;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x140e0b);
  scene.fog = new THREE.Fog(0x140e0b, 9, 17);

  const camera = new THREE.PerspectiveCamera(coarse ? 74 : 64, 1, 0.08, 40);
  camera.position.set(0, 1.48, -0.15);

  const wood = new THREE.MeshStandardMaterial({ color: 0x4a301c, roughness: 0.78, metalness: 0.05 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x2c1b12, roughness: 0.84, metalness: 0.04 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc6a15a, roughness: 0.32, metalness: 0.78 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.94, metalness: 0, side: THREE.BackSide });

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(16, 48),
    new THREE.MeshStandardMaterial({ color: 0x24160f, roughness: 1, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  scene.add(ground);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9.2, 64), new THREE.MeshStandardMaterial({
    map: floorTexture(),
    roughness: 0.88,
    metalness: 0,
  }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const wall = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 4.8, 48, 1, true), wallMat);
  wall.position.y = 2.2;
  scene.add(wall);
  const ceiling = new THREE.Mesh(new THREE.CircleGeometry(8.5, 48), woodDark);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 4.55;
  scene.add(ceiling);

  const columnGeo = new THREE.CylinderGeometry(0.14, 0.16, 4.15, 10);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const col = new THREE.Mesh(columnGeo, wood);
    col.position.set(Math.sin(a) * 7.15, 2.05, Math.cos(a) * 7.15);
    col.castShadow = true;
    scene.add(col);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 10), brass);
    cap.position.set(col.position.x, 4.15, col.position.z);
    scene.add(cap);
  }

  scene.add(new THREE.HemisphereLight(0xffe7c8, 0x3a2418, 0.55));
  const key = new THREE.DirectionalLight(0xfff1d4, 1.05);
  key.position.set(3.2, 7.2, 2.4);
  key.castShadow = !low;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 18;
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  key.shadow.bias = -0.0004;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8eafc4, 0.45);
  rim.position.set(-4.5, 3.4, -2);
  scene.add(rim);
  const lantern = new THREE.PointLight(0xffb15a, 4.5, 7, 2);
  lantern.position.set(0, 2.35, 2.6);
  scene.add(lantern);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xffd7a1, emissive: 0xffb15a, emissiveIntensity: 2.2, roughness: 0.4 })
  );
  lamp.position.set(0, 3.55, 0);
  scene.add(lamp);

  const ring = new THREE.Group();
  scene.add(ring);
  const R = 4.55;
  const step = (Math.PI * 2) / games.length;
  const pedestals = games.map((game, index) => buildPedestal(game, index, { wood, woodDark, brass, R, step, low }));
  pedestals.forEach((ped) => ring.add(ped));

  const dustGeo = new THREE.BufferGeometry();
  const dustCount = low ? 50 : 110;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1.2 + Math.random() * 5.4;
    dustPos[i * 3] = Math.sin(a) * r;
    dustPos[i * 3 + 1] = Math.random() * 3.4;
    dustPos[i * 3 + 2] = Math.cos(a) * r;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ color: 0xf0d7b0, size: 0.025, transparent: true, opacity: 0.45, depthWrite: false })
  );
  scene.add(dust);

  const start = Math.max(0, games.findIndex((g) => g.kind === STEP_FALLBACK));
  let targetRot = -start * step;
  ring.rotation.y = targetRot;
  let active = start;
  let dragging = false;
  let moved = 0;
  let lastX = 0;

  const catEl = document.getElementById("lobby-cat");
  const nameEl = document.getElementById("lobby-name");
  const blurbEl = document.getElementById("lobby-blurb");
  const enterEl = document.getElementById("lobby-enter");
  const buttons = games.map((game, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = game.name;
    btn.addEventListener("click", () => focusIndex(index));
    rail.append(btn);
    return btn;
  });

  function nearestIndex(rot) {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < games.length; i++) {
      const d = Math.abs(Math.atan2(Math.sin(rot + i * step), Math.cos(rot + i * step)));
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  function showGame(index) {
    active = index;
    const game = games[index];
    catEl.textContent = game.cat;
    nameEl.textContent = game.name;
    blurbEl.textContent = game.blurb;
    enterEl.textContent = game.cta;
    enterEl.href = game.href;
    buttons.forEach((btn, i) => {
      if (i === index) btn.setAttribute("aria-current", "true");
      else btn.removeAttribute("aria-current");
    });
    buttons[index].scrollIntoView({ inline: "center", block: "nearest" });
    lantern.color.setHex(game.theme.glow);
  }

  function focusIndex(index) {
    const turns = Math.round((targetRot + index * step) / (Math.PI * 2));
    targetRot = -index * step + turns * Math.PI * 2;
    showGame(index);
  }

  function raycast(event) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(x, y), camera);
    const hits = ray.intersectObjects(pedestals, true);
    if (!hits.length) return -1;
    let obj = hits[0].object;
    while (obj && obj.userData.gameIndex == null) obj = obj.parent;
    return obj ? obj.userData.gameIndex : -1;
  }

  canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    moved = 0;
    lastX = event.clientX;
    canvas.classList.add("is-dragging");
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    lastX = event.clientX;
    moved += Math.abs(dx);
    targetRot += dx * 0.0065;
  });
  canvas.addEventListener("pointerup", (event) => {
    dragging = false;
    canvas.classList.remove("is-dragging");
    if (moved < 8) {
      const hit = raycast(event);
      if (hit >= 0) {
        if (hit === nearestIndex(ring.rotation.y)) window.location.href = games[hit].href;
        else focusIndex(hit);
        return;
      }
    }
    focusIndex(nearestIndex(targetRot));
  });
  canvas.addEventListener("pointercancel", () => {
    dragging = false;
    canvas.classList.remove("is-dragging");
    focusIndex(nearestIndex(targetRot));
  });
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    focusIndex((active + Math.sign(event.deltaY) + games.length) % games.length);
  }, { passive: false });

  document.getElementById("lobby-prev").addEventListener("click", () => {
    focusIndex((active - 1 + games.length) % games.length);
  });
  document.getElementById("lobby-next").addEventListener("click", () => {
    focusIndex((active + 1) % games.length);
  });
  document.getElementById("lobby-open-list").addEventListener("click", () => {
    root.classList.add("lobby-list");
  });
  document.getElementById("lobby-close-list").addEventListener("click", () => {
    root.classList.remove("lobby-list");
  });
  window.addEventListener("keydown", (event) => {
    if (root.classList.contains("lobby-list")) {
      if (event.key === "Escape") root.classList.remove("lobby-list");
      return;
    }
    if (event.key === "ArrowLeft") focusIndex((active - 1 + games.length) % games.length);
    if (event.key === "ArrowRight") focusIndex((active + 1) % games.length);
    if (event.key === "Enter" && document.activeElement === document.body) {
      window.location.href = games[active].href;
    }
  });
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / Math.max(window.innerHeight, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  });

  showGame(start);
  root.classList.remove("lobby-pending");
  root.classList.add("lobby-ready");
  camera.aspect = window.innerWidth / Math.max(window.innerHeight, 1);
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  const look = new THREE.Vector3();
  const lampHome = new THREE.Vector3();
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (root.classList.contains("lobby-list")) return;

    if (dragging) ring.rotation.y = targetRot;
    else if (!reduce) {
      const delta = Math.atan2(Math.sin(targetRot - ring.rotation.y), Math.cos(targetRot - ring.rotation.y));
      ring.rotation.y += delta * (1 - Math.exp(-7 * dt));
    } else ring.rotation.y = targetRot;

    const shown = nearestIndex(ring.rotation.y);
    if (shown !== active && dragging) showGame(shown);

    pedestals.forEach((ped, i) => {
      const on = i === shown;
      const s = on ? 1.06 : 0.94;
      ped.scale.lerp(new THREE.Vector3(s, s, s), 1 - Math.exp(-6 * dt));
      if (ped.userData.frame) {
        ped.userData.frame.material.emissiveIntensity = on ? 0.35 : 0.05;
      }
      if (on && ped.userData.tick) ped.userData.tick(now / 1000);
    });

    const front = pedestals[shown];
    front.getWorldPosition(lampHome);
    lantern.position.lerp(new THREE.Vector3(lampHome.x * 0.42, 2.15, lampHome.z * 0.42), 1 - Math.exp(-4 * dt));
    look.set(0, 1.16 + Math.sin(now / 1400) * (reduce ? 0 : 0.02), 4.2);
    camera.lookAt(look);
    if (!reduce) dust.rotation.y = now * 0.00003;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
  window.__lobbyReady = true;
}

function buildPedestal(game, index, kit) {
  const ped = new THREE.Group();
  ped.userData.gameIndex = index;
  const a = index * kit.step;
  ped.position.set(Math.sin(a) * kit.R, 0, Math.cos(a) * kit.R);
  ped.rotation.y = a + Math.PI;

  const foot = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.1, 0.86), kit.woodDark);
  foot.position.y = 0.05;
  foot.castShadow = foot.receiveShadow = true;
  ped.add(foot);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.62, 0.66), kit.wood);
  shaft.position.y = 0.41;
  shaft.castShadow = shaft.receiveShadow = true;
  ped.add(shaft);
  const felt = new THREE.MeshStandardMaterial({
    color: game.theme.felt,
    roughness: 0.55,
    metalness: 0.08,
    emissive: game.theme.glow,
    emissiveIntensity: 0.05,
  });
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.08, 0.8), felt);
  top.position.y = 0.76;
  top.castShadow = top.receiveShadow = true;
  ped.add(top);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.018, 8, 28), kit.brass);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 0.81;
  ped.add(lip);

  const plaqueMat = new THREE.MeshBasicMaterial({ map: plaqueTexture(game.name, game.theme) });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x2a1c12,
    roughness: 0.7,
    metalness: 0.2,
    emissive: new THREE.Color(game.theme.glow),
    emissiveIntensity: 0.05,
  });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.08, 1.28, 0.04), frameMat);
  frame.position.set(0, 1.38, -0.34);
  ped.add(frame);
  ped.userData.frame = frame;
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 1.16), plaqueMat);
  plaque.position.set(0, 1.38, -0.3);
  ped.add(plaque);

  const dio = new THREE.Group();
  dio.position.set(0, 0.82, 0.08);
  ped.add(dio);
  buildDiorama(game.kind, dio, ped);
  return ped;
}

function buildDiorama(kind, dio, ped) {
  const showMap = (mesh) => {
    mesh.material = new THREE.MeshBasicMaterial({ map: mesh.material.map });
  };
  const box = new THREE.BoxGeometry(1, 1, 1);
  const sph = new THREE.SphereGeometry(1, 18, 14);
  const put = (geo, color, x, y, z, sx, sy, sz, extra = {}) => {
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.08, ...extra }));
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    dio.add(mesh);
    return mesh;
  };

  if (kind === "go") {
    const board = put(new THREE.PlaneGeometry(0.62, 0.62), 0xd7a85a, 0, 0.02, 0, 1, 1, 1);
    board.rotation.x = -Math.PI / 2;
    board.material.map = boardTexture("#e2b56a", "#5a3a1e", 9);
    showMap(board);
    const stones = [
      put(sph, 0x161616, -0.08, 0.07, 0.02, 0.06, 0.045, 0.06),
      put(sph, 0xf4efe4, 0.08, 0.07, -0.04, 0.06, 0.045, 0.06),
      put(sph, 0x161616, 0.02, 0.07, 0.1, 0.055, 0.04, 0.055),
    ];
    ped.userData.tick = (t) => stones.forEach((s, i) => { s.position.y = 0.07 + Math.sin(t * 2 + i) * 0.012; });
  } else if (kind === "xiangqi" || kind === "xiangqi3d") {
    const board = put(new THREE.PlaneGeometry(0.66, 0.62), 0xe6c7a2, 0, 0.02, 0, 1, 1, 1);
    board.rotation.x = -Math.PI / 2;
    board.material.map = boardTexture("#f0d3b0", "#6b2e24", 9);
    showMap(board);
    put(box, 0xa32020, -0.12, 0.07, 0.12, 0.1, 0.08, 0.1, { metalness: 0.2 });
    put(box, 0x1c1c1c, 0.12, 0.07, -0.12, 0.1, 0.08, 0.1, { metalness: 0.35 });
  } else if (kind === "gomoku") {
    const board = put(new THREE.PlaneGeometry(0.62, 0.62), 0xe2b56a, 0, 0.02, 0, 1, 1, 1);
    board.rotation.x = -Math.PI / 2;
    board.material.map = boardTexture("#e7c27a", "#6a4a28", 8);
    showMap(board);
    put(sph, 0x141414, -0.08, 0.06, 0, 0.055, 0.04, 0.055);
    put(sph, 0xf7f1e6, 0, 0.06, 0, 0.055, 0.04, 0.055);
    put(sph, 0x141414, 0.08, 0.06, 0, 0.055, 0.04, 0.055);
  } else if (kind === "junqi") {
    put(box, 0xf3e2c4, 0, 0.015, 0, 0.62, 0.03, 0.48);
    put(box, 0xb4232c, -0.12, 0.16, 0.02, 0.16, 0.28, 0.035);
    put(box, 0x2d4e92, 0.12, 0.16, -0.02, 0.16, 0.28, 0.035);
  } else if (kind === "chess") {
    const board = put(new THREE.BoxGeometry(0.58, 0.04, 0.58), 0xffffff, 0, 0.03, 0, 1, 1, 1);
    board.material.map = checkTexture("#f3ead8", "#3a2a22", 4);
    showMap(board);
    put(box, 0xf4efe6, -0.08, 0.16, -0.08, 0.08, 0.22, 0.08);
    put(sph, 0xf4efe6, -0.08, 0.3, -0.08, 0.05, 0.05, 0.05);
    put(box, 0x1a1a1a, 0.1, 0.18, 0.1, 0.08, 0.26, 0.08, { metalness: 0.4 });
  } else if (kind === "wizard" || kind === "wizard2") {
    const board = put(new THREE.BoxGeometry(0.56, 0.045, 0.56), 0xffffff, 0, 0.03, 0, 1, 1, 1);
    board.material.map = checkTexture("#efe6d4", "#243044", 4);
    showMap(board);
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.02, 8, 18, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x8d7344, roughness: 0.4, metalness: 0.6 })
    );
    arch.position.set(0, 0.24, -0.12);
    dio.add(arch);
    const flame = put(new THREE.ConeGeometry(0.04, 0.12, 8), 0xffb15a, 0.16, 0.18, 0.08, 1, 1, 1, {
      emissive: 0xff8a2a,
      emissiveIntensity: 1.4,
    });
    put(box, 0xd7c4a2, -0.1, 0.16, 0.06, 0.07, 0.2, 0.07, { metalness: 0.45 });
    ped.userData.tick = (t) => { flame.scale.y = 0.85 + Math.sin(t * 8) * 0.18; };
  } else if (kind === "mono") {
    const colors = [0x2bb673, 0x3aa0e0, 0xe0b03a, 0xd05a4a];
    colors.forEach((color, i) => {
      const x = (i % 2) * 0.22 - 0.11;
      const z = Math.floor(i / 2) * 0.18 - 0.09;
      put(box, color, x, 0.05, z, 0.16, 0.06, 0.12);
    });
    put(box, 0xf4efe4, 0, 0.1, 0, 0.08, 0.08, 0.08);
  } else if (kind === "fps") {
    put(box, 0x6a7068, 0, 0.08, 0, 0.5, 0.08, 0.16);
    put(box, 0x8b2a2a, -0.12, 0.22, 0.04, 0.1, 0.26, 0.08);
    put(sph, 0x8b2a2a, -0.12, 0.38, 0.04, 0.055, 0.055, 0.055);
    put(box, 0x1e88e5, 0.12, 0.22, -0.02, 0.1, 0.26, 0.08);
    put(sph, 0x1e88e5, 0.12, 0.38, -0.02, 0.055, 0.055, 0.055);
  } else if (kind === "street") {
    put(box, 0xb08958, 0, 0.02, 0.08, 0.62, 0.04, 0.18);
    const windows = [
      put(box, 0x8d6a45, -0.16, 0.2, -0.02, 0.14, 0.32, 0.14),
      put(box, 0x6e5438, 0.02, 0.28, -0.02, 0.16, 0.48, 0.16),
      put(box, 0x9a734c, 0.18, 0.16, -0.02, 0.12, 0.24, 0.12),
    ];
    ped.userData.tick = (t) => {
      windows[1].material.emissive = new THREE.Color(0xffc98a);
      windows[1].material.emissiveIntensity = 0.35 + Math.sin(t * 3) * 0.25;
    };
  } else if (kind === "pocket") {
    put(new THREE.CircleGeometry(0.28, 20), 0x3d8f45, 0, 0.02, 0, 1, 1, 1).rotation.x = -Math.PI / 2;
    const ball = new THREE.Group();
    ball.position.y = 0.16;
    dio.add(ball);
    const shell = put(sph, 0xf4f4f4, 0, 0, 0, 0.13, 0.13, 0.13);
    shell.position.y = 0.16;
    const band = put(box, 0xd62828, 0, 0.16, 0, 0.27, 0.035, 0.14);
    const button = put(sph, 0xf4f4f4, 0, 0.16, 0.1, 0.035, 0.035, 0.02);
    ped.userData.tick = (t) => { ball.rotation.y = t * 0.6; button.position.z = 0.1; };
    void band;
  } else if (kind === "redcap") {
    put(box, 0x5c94fc, 0, 0.22, -0.16, 0.62, 0.4, 0.04);
    put(box, 0x3cb043, 0, 0.03, 0.05, 0.62, 0.05, 0.28);
    put(box, 0x8b5a2b, -0.05, 0.12, 0.04, 0.12, 0.12, 0.12);
    put(sph, 0xf8c090, 0.08, 0.16, 0.08, 0.05, 0.05, 0.05);
    const hat = put(sph, 0xe52521, 0.08, 0.22, 0.08, 0.07, 0.05, 0.07);
    ped.userData.tick = (t) => { hat.position.y = 0.22 + Math.sin(t * 3) * 0.02; };
  } else {
    put(sph, 0xe2b56a, 0, 0.12, 0, 0.1, 0.1, 0.1, { metalness: 0.6, roughness: 0.3 });
  }
}

try {
  if (document.fonts?.ready) {
    document.fonts.ready.then(main).catch(showFlat);
  } else main();
} catch {
  showFlat();
}
