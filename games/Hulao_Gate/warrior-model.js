/**
 * Late-Han-inspired warriors built from anatomical volumes, lamellar plates and PBR maps.
 * Original procedural geometry. No commercial character models or textures.
 */
import { assignDetail, detailTextures, lcg } from "./procedural-maps.js";

const cache = new WeakMap();
let tintState = 17;
const nextTint = () => ((tintState = (1664525 * tintState + 1013904223) >>> 0) / 4294967296);

function kitFor(T) {
  if (cache.has(T)) return cache.get(T);
  const rnd = lcg(90210);
  const weave = detailTextures(T, (g, n) => {
    g.fillStyle = "#c8c2b6";
    g.fillRect(0, 0, n, n);
    for (let y = 0; y < n; y += 4) {
      g.fillStyle = y % 8 ? "rgba(70,58,42,0.16)" : "rgba(255,250,240,0.18)";
      g.fillRect(0, y, n, 1);
    }
    for (let x = 0; x < n; x += 4) {
      g.fillStyle = "rgba(40,32,24,0.08)";
      g.fillRect(x, 0, 1, n);
    }
  }, 128, 1.15);
  const metal = detailTextures(T, (g, n) => {
    g.fillStyle = "#b7b8b4";
    g.fillRect(0, 0, n, n);
    for (let i = 0; i < 2200; i++) {
      g.strokeStyle = `rgba(40,40,42,${0.05 + rnd() * 0.18})`;
      g.lineWidth = 0.4 + rnd();
      const y = rnd() * n;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(n, y + (rnd() - 0.5) * 6);
      g.stroke();
    }
    for (let i = 0; i < 80; i++) {
      g.fillStyle = `rgba(30,28,26,${rnd() * 0.25})`;
      g.fillRect(rnd() * n, rnd() * n, 1 + rnd() * 3, rnd() * 1.2 + 0.3);
    }
  }, 128, 1.7);
  const skin = detailTextures(T, (g, n) => {
    g.fillStyle = "#c8b09a";
    g.fillRect(0, 0, n, n);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(90,60,40,${rnd() * 0.08})`;
      g.fillRect(rnd() * n, rnd() * n, rnd() * 2 + 0.4, rnd() * 2 + 0.4);
    }
  }, 128, 0.32);
  const leather = detailTextures(T, (g, n) => {
    g.fillStyle = "#8a7360";
    g.fillRect(0, 0, n, n);
    for (let y = 0; y < n; y += 7) {
      g.fillStyle = "rgba(40,26,16,0.14)";
      g.fillRect(0, y, n, 2);
    }
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = "rgba(50,32,20,0.25)";
      g.beginPath();
      g.arc(rnd() * n, rnd() * n, 4 + rnd() * 10, rnd() * 3, rnd() * 5);
      g.stroke();
    }
  }, 128, 0.9);

  const std = (color, metalness, roughness, detail, rx, ry, normalScale) => {
    const material = new T.MeshStandardMaterial({ color, metalness, roughness });
    if (detail) assignDetail(T, material, detail, rx, ry, normalScale);
    return material;
  };

  const kit = {
    T,
    boxGeo: new T.BoxGeometry(1, 1, 1),
    sphereGeo: new T.SphereGeometry(1, 18, 14),
    skin: std(0x8d6a4e, 0, 0.58, skin, 2, 2, 0.28),
    skinShadow: std(0x6e513c, 0, 0.66, skin, 2, 2, 0.28),
    eyeWhite: std(0xd9cfc3, 0, 0.28, null),
    iris: std(0x2a211c, 0, 0.18, null),
    hair: std(0x1a1816, 0.04, 0.78, null),
    lip: std(0x7a4d42, 0, 0.5, null),
    steel: std(0xb7c0c2, 0.48, 0.38, metal, 3, 3, 0.45),
    edge: std(0xe4e6e1, 0.55, 0.26, metal, 2, 2, 0.2),
    iron: std(0x6e767a, 0.42, 0.46, metal, 3, 3, 0.55),
    darkIron: std(0x4e565c, 0.4, 0.5, metal, 3, 3, 0.5),
    gold: std(0xc4a36a, 0.5, 0.4, metal, 2, 2, 0.35),
    bronze: std(0xa48458, 0.46, 0.44, metal, 2, 2, 0.4),
    green: std(0x4d6a5c, 0, 0.9, weave, 3, 3, 0.45),
    greenDark: std(0x3a564c, 0, 0.92, weave, 3, 3, 0.4),
    red: std(0x7a4038, 0, 0.88, weave, 3, 3, 0.4),
    redDark: std(0x6a3834, 0, 0.9, weave, 3, 3, 0.4),
    dustCloth: std(0x6d6256, 0, 0.94, weave, 3, 3, 0.4),
    greyCloth: std(0x4a4c4e, 0, 0.93, weave, 3, 3, 0.4),
    leather: std(0x3a2c22, 0.04, 0.78, leather, 2, 2, 0.55),
    boot: std(0x241c18, 0.06, 0.84, leather, 2, 2, 0.4),
    wood: std(0x4a3828, 0.02, 0.86, leather, 2, 2, 0.65),
    cord: std(0x6e2c28, 0, 0.72, weave, 2, 2, 0.3),
  };
  cache.set(T, kit);
  return kit;
}

function sharedLathe(T, kit, key, points, segments) {
  if (!kit[key]) {
    kit[key] = new T.LatheGeometry(points.map((p) => new T.Vector2(p[0], p[1])), segments);
  }
  return kit[key];
}

function vary(material, owned, amount) {
  const copy = material.clone();
  owned.push(copy);
  const t = nextTint();
  if (copy.color && typeof copy.color.offsetHSL === "function") {
    copy.color.offsetHSL((t - 0.5) * 0.02, (t - 0.5) * 0.06, (t - 0.5) * amount);
  }
  return copy;
}

function build(T, kind, low) {
  const k = kitFor(T);
  const hero = kind === "hero";
  const boss = kind === "boss";
  const elite = kind === "elite";
  const size = hero ? 1.12 : boss ? 1.22 : elite ? 1.04 : 1;
  const detail = hero || boss || !low;
  const ownedGeometry = [];
  const ownedMaterials = [];
  const shared = new Set([k.boxGeo, k.sphereGeo, k.headGeo, k.helmetGeo]);
  const root = new T.Group();
  const rig = new T.Group();
  root.add(rig);

  const cloth = hero ? k.green : boss ? k.redDark : elite ? vary(k.greyCloth, ownedMaterials, 0.06) : vary(k.dustCloth, ownedMaterials, 0.08);
  const skirt = hero ? k.greenDark : boss ? k.red : elite ? k.greyCloth : k.leather;
  const armor = hero ? k.steel : boss ? k.darkIron : elite ? k.iron : k.steel;
  const trim = hero ? k.gold : boss ? k.bronze : k.bronze;

  const part = (parent, geom, material, x, y, z, sx = 1, sy = 1, sz = 1, casts = false) => {
    if (!shared.has(geom)) ownedGeometry.push(geom);
    const mesh = new T.Mesh(geom, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = !low && casts;
    mesh.receiveShadow = !low && (hero || boss);
    parent.add(mesh);
    return mesh;
  };
  const box = (p, m, x, y, z, w, h, d, casts = false) => part(p, k.boxGeo, m, x, y, z, w, h, d, casts);
  const ball = (p, m, x, y, z, rx, ry, rz, casts = false) => part(p, k.sphereGeo, m, x, y, z, rx, ry, rz, casts);
  const cyl = (p, m, x, y, z, r1, r2, h, seg = 12, casts = false) => part(p, new T.CylinderGeometry(r1, r2, h, seg), m, x, y, z, 1, 1, 1, casts);
  const rod = (p, m, start, end, r) => {
    const a = new T.Vector3(...start);
    const b = new T.Vector3(...end);
    const v = b.clone().sub(a);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const mesh = cyl(p, m, mid.x, mid.y, mid.z, r, r, Math.max(0.02, v.length()), 8);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize());
    return mesh;
  };
  const shape = (p, m, pts, x, y, z, depth = 0.03, bevel = 0.008) => {
    const s = new T.Shape();
    s.moveTo(...pts[0]);
    for (let i = 1; i < pts.length; i++) s.lineTo(...pts[i]);
    s.closePath();
    const geom = new T.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: bevel > 0,
      steps: 1,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 1,
      curveSegments: 6,
    });
    geom.computeVertexNormals();
    return part(p, geom, m, x, y, z, 1, 1, 1, hero || boss);
  };

  const bodyCast = hero || boss;
  cyl(rig, cloth, 0, 1.28, 0.01, 0.155, 0.145, 0.5, 14, bodyCast);
  cyl(rig, skirt, 0, 1.02, 0.02, 0.15, 0.16, 0.2, 14, bodyCast);
  cyl(rig, k.leather, 0, 1.08, -0.01, 0.168, 0.168, 0.07, 14);

  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.position.set(side * 0.11, 1.0, 0.01);
    rig.add(leg);
    legs.push(leg);
    cyl(leg, skirt, 0, -0.22, 0, 0.088, 0.074, 0.44, 12, bodyCast);
    ball(leg, k.leather, 0, -0.45, 0.01, 0.055, 0.05, 0.055);
    cyl(leg, cloth, 0, -0.66, 0, 0.058, 0.048, 0.38, 12, bodyCast);
    const boot = cyl(leg, k.boot, 0, -0.9, -0.05, 0.055, 0.05, 0.24, 10, bodyCast);
    boot.rotation.x = Math.PI / 2;
    box(leg, armor, 0, -0.62, -0.07, 0.09, 0.28, 0.02);
    if (detail) {
      for (let j = 0; j < 3; j++) box(leg, trim, 0, -0.5 - j * 0.08, -0.085, 0.07, 0.012, 0.012);
    }
  }

  for (let i = -1; i <= 1; i += elite || hero || boss ? 1 : 2) {
    const a = i * 0.42;
    const x = Math.sin(a) * 0.12;
    const z = -0.02 - Math.cos(a) * 0.1;
    const tasset = shape(rig, skirt, [[-0.07, 0], [0.07, 0], [0.05, -0.42], [0, -0.48], [-0.05, -0.42]], x, 1.05, z, 0.018, 0.004);
    tasset.rotation.y = a * 0.8;
  }

  const plate = (parent, y, rows, cols, radius, zSign) => {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const a = (col - (cols - 1) / 2) * 0.34;
        const x = Math.sin(a) * radius;
        const z = zSign * Math.cos(a) * radius;
        const lamella = box(parent, armor, x, y - row * 0.062, z, 0.1, 0.05, 0.016, hero || boss);
        lamella.rotation.y = zSign < 0 ? a : Math.PI - a;
        lamella.rotation.x = zSign < 0 ? 0.08 : -0.08;
        if (detail && col % 2 === 0) {
          const rivet = ball(parent, trim, x, y - row * 0.062 + 0.012, z + zSign * 0.012, 0.012, 0.012, 0.008);
          rivet.rotation.y = lamella.rotation.y;
        }
      }
    }
  };
  plate(rig, 1.5, detail ? 4 : 3, detail ? 4 : 3, 0.2, -1);
  if (hero || boss) plate(rig, 1.46, 3, 3, 0.19, 1);

  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new T.Group();
    arm.position.set(side * 0.3, 1.58, 0.02);
    rig.add(arm);
    arms.push(arm);
    cyl(arm, cloth, side * 0.02, -0.16, 0, 0.055, 0.048, 0.3, 12, bodyCast);
    cyl(arm, armor, side * 0.025, -0.34, -0.02, 0.05, 0.046, 0.16, 10, hero || boss);
    cyl(arm, k.skin, side * 0.03, -0.52, -0.02, 0.04, 0.036, 0.22, 10, bodyCast);
    box(arm, k.skin, side * 0.03, -0.66, -0.04, 0.055, 0.07, 0.04, bodyCast);
    const pauldron = cyl(arm, armor, side * 0.06, 0.02, 0, 0.13, 0.11, 0.04, 14, true);
    pauldron.rotation.z = side * 1.15;
    pauldron.rotation.x = 0.45;
    const rim = cyl(arm, trim, side * 0.08, 0.0, -0.02, 0.1, 0.1, 0.012, 12);
    rim.rotation.z = side * 0.4;
    rim.rotation.x = 0.5;
  }
  rig.userData.leftArm = arms[0];
  rig.userData.rightArm = arms[1];

  cyl(rig, hero ? k.green : k.skin, 0, 1.74, 0, 0.062, 0.07, 0.16, 12, bodyCast);
  const head = new T.Group();
  head.position.set(0, 1.9, 0);
  rig.add(head);
  const skull = sharedLathe(T, k, "headGeo", [
    [0.062, 0],
    [0.078, 0.05],
    [0.088, 0.11],
    [0.092, 0.17],
    [0.086, 0.23],
    [0.064, 0.29],
    [0.03, 0.33],
    [0, 0.35],
  ], detail ? 18 : 12);
  shared.add(skull);
  part(head, skull, k.skin, 0, 0, 0, 1, 1, 1, bodyCast);
  box(head, k.skinShadow, 0, 0.15, -0.1, 0.03, 0.055, 0.035);
  for (const side of [-1, 1]) {
    ball(head, k.eyeWhite, side * 0.034, 0.2, -0.086, 0.016, 0.012, 0.01);
    ball(head, k.iris, side * 0.034, 0.2, -0.096, 0.007, 0.007, 0.006);
    const brow = box(head, k.hair, side * 0.034, 0.222, -0.088, 0.03, 0.008, 0.012);
    brow.rotation.z = side * -0.25;
    ball(head, k.skin, side * 0.09, 0.16, 0, 0.02, 0.032, 0.012);
  }
  box(head, k.lip, 0, 0.1, -0.09, 0.04, 0.008, 0.012);

  if (hero) {
    const beard = shape(head, k.hair, [
      [-0.07, 0.02], [0.07, 0.02], [0.075, -0.08], [0.04, -0.28], [0, -0.36], [-0.04, -0.28], [-0.075, -0.08],
    ], 0, 0.1, -0.07, 0.04, 0.01);
    beard.rotation.x = -0.08;
    for (const side of [-1, 1]) {
      const whisker = box(head, k.hair, side * 0.045, 0.12, -0.09, 0.05, 0.012, 0.016);
      whisker.rotation.z = side * -0.35;
    }
    const wrap = cyl(head, k.green, 0, 0.3, 0, 0.1, 0.096, 0.07, 14, true);
    box(head, k.gold, 0, 0.3, -0.09, 0.04, 0.028, 0.012);
    const tail = shape(rig, k.greenDark, [[-0.05, 0.04], [0.05, 0.04], [0.04, -0.55], [0, -0.62], [-0.04, -0.55]], 0, 2.05, 0.1, 0.02, 0.004);
    tail.rotation.x = 0.15;
    void wrap;
  } else {
    const helmet = sharedLathe(T, k, "helmetGeo", [
      [0.1, 0.12],
      [0.112, 0.2],
      [0.104, 0.28],
      [0.07, 0.33],
      [0.02, 0.36],
      [0, 0.38],
    ], detail ? 16 : 10);
    shared.add(helmet);
    part(head, helmet, armor, 0, 0, 0, 1, 1, 1, bodyCast);
    const brim = cyl(head, armor, 0, 0.14, 0, 0.125, 0.125, 0.016, 14, true);
    brim.rotation.x = 0.08;
    for (const side of [-1, 1]) {
      const guard = box(head, armor, side * 0.1, 0.08, -0.02, 0.02, 0.12, 0.07, hero || boss);
      guard.rotation.y = side * 0.4;
    }
    box(head, trim, 0, 0.16, -0.12, 0.05, 0.04, 0.012);
    if (boss) {
      for (const side of [-1, 1]) {
        rod(head, k.bronze, [side * 0.08, 0.32, 0], [side * 0.16, 0.48, -0.02], 0.012);
      }
    } else if (detail) {
      for (let i = 0; i < 5; i++) {
        const plume = cyl(head, elite ? k.cord : k.dustCloth, (i - 2) * 0.012, 0.4, 0.01, 0.008, 0.004, 0.16, 5);
        plume.rotation.x = -0.2;
        plume.rotation.z = (i - 2) * 0.08;
      }
    }
  }

  if (hero || boss) {
    const cape = new T.Group();
    cape.position.set(0, 1.56, 0.11);
    rig.add(cape);
    const columns = 4;
    const rows = 8;
    for (const side of [-1, 1]) {
      const verts = [];
      const uvs = [];
      const idx = [];
      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= columns; c++) {
          const u = c / columns;
          const v = r / rows;
          const width = 0.15 + v * 0.03;
          verts.push(side * (0.07 + u * width), -v * (boss ? 1.12 : 0.98), v * 0.2 + Math.sin(u * Math.PI) * 0.025 * v);
          uvs.push(u, v);
          if (r < rows && c < columns) {
            const a = r * (columns + 1) + c;
            const b = a + columns + 1;
            idx.push(a, a + 1, b, b, a + 1, b + 1);
          }
        }
      }
      const geo = new T.BufferGeometry();
      geo.setIndex(idx);
      geo.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
      geo.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
      geo.computeVertexNormals();
      const clothMat = (boss ? k.redDark : k.greenDark).clone();
      clothMat.side = T.DoubleSide;
      ownedMaterials.push(clothMat);
      part(cape, geo, clothMat, 0, 0, 0, 1, 1, 1, true);
    }
    rig.userData.cape = cape;
  }

  const weapon = new T.Group();
  weapon.position.set(0.46, 1.2, -0.06);
  rig.add(weapon);
  if (hero) {
    cyl(weapon, k.wood, 0, 0.35, 0, 0.028, 0.028, 2.15, 8, true);
    for (let i = 0; i < 3; i++) cyl(weapon, i % 2 ? k.bronze : k.gold, 0, -0.55 + i * 0.08, 0, 0.04, 0.04, 0.03, 8);
    cyl(weapon, k.gold, 0, 1.28, 0, 0.055, 0.04, 0.12, 10);
    const bladeMat = new T.MeshStandardMaterial({ color: 0xb7c0c6, metalness: 0.22, roughness: 0.46, side: T.DoubleSide });
    ownedMaterials.push(bladeMat);
    shape(weapon, bladeMat, [[0.02, 0], [0.26, 0.16], [0.58, 0.58], [0.5, 1.08], [0.16, 1.16], [0.0, 0.66]], 0, 1.26, 0, 0.02, 0.003);
    shape(weapon, k.edge, [[0.22, 0.18], [0.58, 0.58], [0.5, 1.08], [0.28, 0.98], [0.34, 0.58]], 0, 1.26, 0.014, 0.005, 0);
    for (let t = 0; t < 4; t++) rod(weapon, k.cord, [-0.04, 1.2, 0], [-0.02 + (t - 1.5) * 0.02, 1.02, 0.02], 0.008);
  } else if (boss) {
    cyl(weapon, k.wood, 0, 0.45, 0, 0.03, 0.03, 2.3, 8, true);
    cyl(weapon, k.bronze, 0, 1.35, 0, 0.06, 0.05, 0.16, 10);
    shape(weapon, k.steel, [[0, 0], [0.05, 0.16], [0.22, 0.28], [0.16, 0.42], [0, 0.36]], 0, 1.42, -0.02, 0.03, 0.005);
    shape(weapon, k.edge, [[0, 0.02], [-0.2, 0.26], [-0.12, 0.4], [0, 0.34]], 0, 1.42, -0.02, 0.03, 0.005);
    ball(weapon, k.bronze, 0, 1.4, 0, 0.045, 0.045, 0.045);
  } else {
    cyl(weapon, k.wood, 0, 0.55, 0, 0.02, 0.022, 2.35, 7, false);
    const tip = part(weapon, new T.ConeGeometry(0.045, 0.32, 4), k.steel, 0, 1.78, 0, 1, 1, 1, false);
    tip.rotation.y = Math.PI / 4;
    if (elite) rod(weapon, k.cord, [0, 1.55, 0], [0.06, 1.4, 0.02], 0.01);
  }

  const shadow = new T.Mesh(
    new T.CircleGeometry(0.46 * size, 20),
    new T.MeshBasicMaterial({ color: 0x14110e, transparent: true, opacity: 0.28, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);
  ownedGeometry.push(shadow.geometry);
  ownedMaterials.push(shadow.material);

  root.userData = {
    rig,
    legs,
    weapon,
    head,
    metal: armor,
    team: cloth,
    size,
    shadow,
    ownedGeometry,
    ownedMaterials,
  };
  return root;
}

export function makeDetailedWarrior(THREE, kind = "soldier", low = false) {
  return build(THREE, kind, low);
}

export function disposeDetailedWarrior(root) {
  if (!root) return;
  for (const geo of new Set(root.userData.ownedGeometry || [])) geo.dispose?.();
  for (const material of new Set(root.userData.ownedMaterials || [])) material.dispose?.();
}
