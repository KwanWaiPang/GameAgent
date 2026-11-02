/** Original battlefield dressing: masonry, dry grass, ruts, barricades. Instanced where it repeats. */
import { assignDetail, detailTextures, lcg } from "./procedural-maps.js";

export function enhanceBattlefield(T, scene, materials, low, rand) {
  const rnd = lcg(9771);
  const masonry = detailTextures(T, (ctx, n) => {
    ctx.fillStyle = "#6e675e";
    ctx.fillRect(0, 0, n, n);
    const rowH = 46;
    for (let row = 0; row < Math.ceil(n / rowH); row++) {
      const y = row * rowH;
      const offset = row % 2 ? -48 : 0;
      for (let x = -120 + offset; x < n; x += 96) {
        const d = rnd() * 28 - 14;
        ctx.fillStyle = `rgb(${118 + d},${110 + d},${100 + d})`;
        ctx.fillRect(x + 3, y + 3, 90, 40);
        ctx.fillStyle = "rgba(28,24,20,0.35)";
        ctx.fillRect(x + 3, y + 41, 90, 3);
        ctx.fillStyle = "rgba(220,200,170,0.08)";
        ctx.fillRect(x + 4, y + 4, 88, 2);
        for (let j = 0; j < 16; j++) {
          ctx.fillStyle = `rgba(40,32,26,${rnd() * 0.2})`;
          ctx.fillRect(x + 6 + rnd() * 78, y + 6 + rnd() * 30, rnd() * 8 + 0.6, rnd() * 2 + 0.4);
        }
      }
    }
  }, 512, 2.4);
  const wood = detailTextures(T, (ctx, n) => {
    const r = lcg(442);
    ctx.fillStyle = "#6b5038";
    ctx.fillRect(0, 0, n, n);
    for (let i = 0; i < 80; i++) {
      ctx.strokeStyle = `rgba(36,24,14,${0.08 + r() * 0.2})`;
      ctx.lineWidth = 0.6 + r() * 2.2;
      const x = r() * n;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 18, n * 0.3, x - 14, n * 0.6, x + 6, n);
      ctx.stroke();
    }
    for (let i = 0; i < 18; i++) {
      ctx.strokeStyle = "rgba(30,18,10,0.35)";
      ctx.beginPath();
      ctx.ellipse(r() * n, r() * n, 3 + r() * 5, 10 + r() * 16, 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, 256, 1.5);
  const tiles = detailTextures(T, (ctx, n) => {
    const r = lcg(194);
    ctx.fillStyle = "#3c3d3a";
    ctx.fillRect(0, 0, n, n);
    for (let y = 0; y < n; y += 22) {
      for (let x = -40; x < n; x += 36) {
        const shift = (y / 22) % 2 ? 16 : 0;
        const shade = 48 + r() * 22;
        ctx.fillStyle = `rgb(${shade},${shade - 1},${shade - 3})`;
        ctx.fillRect(x + shift, y, 34, 18);
        ctx.fillStyle = "rgba(12,12,10,0.45)";
        ctx.fillRect(x + shift, y + 17, 34, 3);
      }
    }
  }, 256, 1.8);

  const apply = (material, pack, roughness, metalness, scale) => {
    assignDetail(T, material, pack, pack.map.repeat?.x || 1, pack.map.repeat?.y || 1, scale);
    material.roughness = roughness;
    material.metalness = metalness;
    if (material.color?.set) material.color.set(0xffffff);
    else material.color = 0xffffff;
  };
  masonry.map.repeat.set(2.2, 1.5);
  if (masonry.normalMap) masonry.normalMap.repeat.set(2.2, 1.5);
  wood.map.repeat.set(1.4, 2.2);
  if (wood.normalMap) wood.normalMap.repeat.set(1.4, 2.2);
  tiles.map.repeat.set(3, 3);
  if (tiles.normalMap) tiles.normalMap.repeat.set(3, 3);
  apply(materials.wall, masonry, 0.96, 0.02, 1.05);
  apply(materials.wallTop, masonry, 0.9, 0.04, 0.8);
  apply(materials.timber, wood, 0.9, 0.03, 0.75);
  apply(materials.roof, tiles, 0.78, 0.08, 0.55);

  const bladePositions = [];
  const blade = 0.08;
  const height = 0.32;
  for (const yaw of [0, Math.PI / 2]) {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    bladePositions.push(
      -blade * c, 0, -blade * s,
      blade * c, 0, blade * s,
      blade * c, height, blade * s,
      -blade * c, 0, -blade * s,
      blade * c, height, blade * s,
      -blade * c, height, -blade * s,
    );
  }
  const grassGeo = new T.BufferGeometry();
  grassGeo.setAttribute("position", new T.Float32BufferAttribute(bladePositions, 3));
  grassGeo.computeVertexNormals();
  const grassMat = new T.MeshStandardMaterial({ color: 0x7d6e56, roughness: 1, side: T.DoubleSide });
  const grasses = new T.InstancedMesh(grassGeo, grassMat, low ? 500 : 2200);
  grasses.castShadow = false;
  const dummy = new T.Object3D();
  const color = new T.Color();
  for (let i = 0; i < grasses.count; i++) {
    let x;
    let z;
    if (i < grasses.count * 0.12) {
      x = (rand() > 0.5 ? 1 : -1) * (7.4 + rand() * 6);
      z = rand() * 100 - 50;
    } else {
      x = (rand() > 0.5 ? 1 : -1) * (12 + rand() * 60);
      z = (rand() - 0.5) * 140;
    }
    const h = 0.12 + rand() * 0.28;
    dummy.position.set(x, 0, z);
    dummy.rotation.set((rand() - 0.5) * 0.2, rand() * Math.PI * 2, (rand() - 0.5) * 0.25);
    dummy.scale.set(0.7 + rand() * 1.3, h / height, 0.7 + rand() * 1.3);
    dummy.updateMatrix();
    grasses.setMatrixAt(i, dummy.matrix);
    color.setHSL(0.09 + rand() * 0.04, 0.12 + rand() * 0.08, 0.28 + rand() * 0.1);
    grasses.setColorAt(i, color);
  }
  grasses.instanceMatrix.needsUpdate = true;
  if (grasses.instanceColor) grasses.instanceColor.needsUpdate = true;
  scene.add(grasses);

  const rockGeo = new T.DodecahedronGeometry(0.7, 1);
  const rockMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  const rocks = new T.InstancedMesh(rockGeo, rockMat, low ? 90 : 280);
  for (let i = 0; i < rocks.count; i++) {
    let x = (rand() - 0.5) * 168;
    const z = (rand() - 0.5) * 150;
    if (Math.abs(x) < 11 && rand() > 0.2) x += Math.sign(x || 1) * 16;
    const size = 0.12 + rand() * 0.48;
    dummy.position.set(x, size * 0.08 - 0.04, z);
    dummy.rotation.set(rand() * 4, rand() * 6, rand() * 4);
    dummy.scale.set(size * (0.7 + rand()), size * 0.22, size * (0.55 + rand()));
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
    color.setHSL(0.08, 0.08, 0.32 + rand() * 0.16);
    rocks.setColorAt(i, color);
  }
  rocks.instanceMatrix.needsUpdate = true;
  if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
  scene.add(rocks);

  const logMat = new T.MeshStandardMaterial({ color: 0xffffff, map: wood.map, roughness: 0.92, metalness: 0.02 });
  if (wood.normalMap) {
    logMat.normalMap = wood.normalMap;
    logMat.normalScale = new T.Vector2(0.6, 0.6);
  }
  const iron = new T.MeshStandardMaterial({ color: 0x5a5c5e, metalness: 0.72, roughness: 0.46 });
  const buildMesh = (parent, geom, material, x, y, z) => {
    const mesh = new T.Mesh(geom, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = !low;
    parent.add(mesh);
    return mesh;
  };
  for (const side of [-1, 1]) {
    for (let station = 0; station < 3; station++) {
      const barricade = new T.Group();
      barricade.position.set(side * (16 + rand() * 4), 0, -46 + station * 34);
      barricade.rotation.y = side * 0.35;
      scene.add(barricade);
      for (let j = 0; j < 5; j++) {
        const stake = buildMesh(barricade, new T.CylinderGeometry(0.1, 0.14, 2.4, 6), logMat, (j - 2) * 0.55, 1.15, (j % 2) * 0.12);
        stake.rotation.z = (j - 2) * 0.04;
      }
      for (const h of [0.55, 1.15]) {
        const beam = buildMesh(barricade, new T.CylinderGeometry(0.08, 0.08, 3.2, 6), logMat, 0, h, 0.16);
        beam.rotation.z = Math.PI / 2;
      }
    }
  }

  const trackMat = new T.MeshStandardMaterial({
    color: 0x3a342c,
    transparent: true,
    opacity: 0.28,
    roughness: 1,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  for (const s of [-1.6, 1.6]) {
    const track = buildMesh(scene, new T.PlaneGeometry(0.42, 108), trackMat, s * 2.2, 0.03, -4);
    track.rotation.x = -Math.PI / 2;
    track.castShadow = false;
  }

  if (!low) {
    for (let i = 0; i < 8; i++) {
      const side = i % 2 ? 1 : -1;
      const group = new T.Group();
      group.position.set(side * (14 + rand() * 6), 0, -40 + i * 12);
      scene.add(group);
      const shield = buildMesh(group, new T.CylinderGeometry(0.48, 0.48, 0.08, 16), new T.MeshStandardMaterial({ color: 0x6a5348, roughness: 0.84, metalness: 0.08 }), 0, 0.85, 0);
      shield.rotation.x = Math.PI / 2;
      buildMesh(group, new T.TorusGeometry(0.36, 0.02, 6, 18), iron, 0, 0.85, -0.05);
      buildMesh(group, new T.SphereGeometry(0.08, 10, 8), iron, 0, 0.85, -0.07);
      const spear = buildMesh(group, new T.CylinderGeometry(0.025, 0.03, 2.8, 6), logMat, 0.28, 1.2, -0.04);
      spear.rotation.z = 0.12;
      const head = buildMesh(group, new T.ConeGeometry(0.06, 0.28, 4), iron, 0.46, 2.55, -0.04);
      head.rotation.z = -0.12;
      head.rotation.y = Math.PI / 4;
    }
  }
}

/** Faceted loess-and-limestone peak. Vertex colors keep the rock from reading as a flat cone. */
export function rockyPeak(T, scene, material, x, z, radius, height, rand) {
  const verts = [];
  const colors = [];
  const idx = [];
  const rings = 7;
  const seg = 14;
  for (let j = 0; j <= rings; j++) {
    const t = j / rings;
    const rr = radius * (1 - t) ** 0.86;
    for (let i = 0; i < seg; i++) {
      const angle = (i * 2 * Math.PI) / seg;
      const variation = 0.78 + rand() * 0.38;
      const y = height * t + Math.sin(angle * 3 + j) * 0.08 * height * (1 - t);
      verts.push(Math.sin(angle) * rr * variation, y, Math.cos(angle) * rr * variation);
      const soil = t < 0.28;
      const n = (rand() - 0.5) * 0.05;
      const r = (soil ? 0.48 : 0.58) + n;
      const g = (soil ? 0.4 : 0.52) + n;
      const b = (soil ? 0.3 : 0.46) + n * 0.8;
      colors.push(r, g, b);
      if (j < rings) {
        const a = j * seg + i;
        const bIndex = j * seg + ((i + 1) % seg);
        const c = (j + 1) * seg + i;
        const d = (j + 1) * seg + ((i + 1) % seg);
        idx.push(a, bIndex, c, bIndex, d, c);
      }
    }
  }
  const geo = new T.BufferGeometry();
  geo.setIndex(idx);
  geo.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
  geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  material.vertexColors = true;
  if (material.color?.set) material.color.set(0xffffff);
  else material.color = 0xffffff;
  const mesh = new T.Mesh(geo, material);
  mesh.position.set(x, -2.2, z);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}
