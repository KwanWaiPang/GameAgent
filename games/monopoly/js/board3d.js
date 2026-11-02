/**
 * 实体桌面棋盘。规则不在这里，只负责摆放、拾取和动画。
 * 坐标：棋盘在 XZ 平面，Y 向上；起点在近处右侧，顺时针走向 -X。
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { getActiveMap, GROUP_COLORS, MAX_BUILD_LEVEL } from "./data.js";

const FONT = '"Noto Serif SC","Songti SC","SimSun","Microsoft YaHei",serif';

const BOARD_HALF = 10.2;
const FRAME = 0.68;
const OUTER = BOARD_HALF + FRAME;
const CORNER = 2.72;
const GUTTER = 0.07;
const SLOT = (BOARD_HALF * 2 - CORNER * 2) / 9;
const SIDE_W = SLOT - GUTTER;
const SIDE_D = CORNER - GUTTER;
const CORNER_SIZE = CORNER - GUTTER;
const TILE_H = 0.18;
const BASE_TOP = 0.24;
const PRINT_INSET = 0.1;

const CAM = {
  table: { pos: [0, 27, 15], target: [0, 0, 0] },
  top: { pos: [0, 33, 0.02], target: [0, 0, 0] },
  low: { pos: [15, 13, 15], target: [0, 0, 0] },
};

let ANISO = 8;

let theme = {
  paper: "#f4efe4",
  ink: "#2a2118",
  price: "#7a3030",
  center: "world",
  name: "世界之旅",
  en: "WORLD TOUR",
  felt: "#1c5a38",
};

const cardboardMat = new THREE.MeshStandardMaterial({
  color: 0xe7d8c4,
  roughness: 0.78,
  metalness: 0.02,
});
const houseMat = new THREE.MeshPhysicalMaterial({
  color: 0x1e9a45,
  roughness: 0.32,
  metalness: 0.02,
  clearcoat: 0.45,
  clearcoatRoughness: 0.28,
});
const houseRoofMat = new THREE.MeshPhysicalMaterial({
  color: 0x147a36,
  roughness: 0.4,
  metalness: 0.02,
  clearcoat: 0.3,
  clearcoatRoughness: 0.35,
});
const hotelMat = new THREE.MeshPhysicalMaterial({
  color: 0xc0392b,
  roughness: 0.3,
  metalness: 0.04,
  clearcoat: 0.4,
  clearcoatRoughness: 0.25,
});
const hotelRoofMat = new THREE.MeshPhysicalMaterial({
  color: 0x92261c,
  roughness: 0.38,
  metalness: 0.05,
  clearcoat: 0.25,
});
const trimMat = new THREE.MeshStandardMaterial({ color: 0x2a2118, roughness: 0.55 });
const windowMat = new THREE.MeshStandardMaterial({
  color: 0xffe4b5,
  emissive: 0xffb15a,
  emissiveIntensity: 0.55,
  roughness: 0.25,
});
const standGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.04, 24);
const standMat = new THREE.MeshStandardMaterial({
  color: 0x2a221c,
  roughness: 0.48,
  metalness: 0.28,
});

const houseBodyGeo = new THREE.BoxGeometry(0.18, 0.15, 0.18);
const houseRoofGeo = new THREE.ConeGeometry(0.15, 0.11, 4);
const houseDoorGeo = new THREE.BoxGeometry(0.055, 0.07, 0.02);
const hotelBodyGeo = new THREE.BoxGeometry(0.4, 0.26, 0.22);
const hotelRoofGeo = new THREE.BoxGeometry(0.46, 0.045, 0.28);
const hotelDoorGeo = new THREE.BoxGeometry(0.08, 0.11, 0.02);
const windowGeo = new THREE.BoxGeometry(0.055, 0.045, 0.02);
const chimneyGeo = new THREE.BoxGeometry(0.06, 0.1, 0.06);

function makeTex(canvas, repeat) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = ANISO;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  tex.needsUpdate = true;
  return tex;
}

function speckle(ctx, w, h, n = 900) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 0.045;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(90,60,30,${a})` : `rgba(255,255,255,${a})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4);
  }
}

function hexToRgba(hex, a) {
  const n = String(hex).replace("#", "");
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function bandOf(def) {
  if (def.type === "property") return GROUP_COLORS[def.group] || "#8d6e63";
  return (
    {
      station: "#2c2c2c",
      utility: "#1565c0",
      chance: "#ef6c00",
      fate: "#6a1b9a",
      tax: "#546e7a",
      go: "#c62828",
      jail: "#546e7a",
      park: "#2e7d32",
      gotojail: "#b71c1c",
    }[def.type] || "#6d5a48"
  );
}

function categoryOf(def) {
  return (
    {
      property: "城市地产",
      station: "铁路车站",
      utility: "公用事业",
      chance: "机会",
      fate: "命运",
      tax: "税款",
      go: "起点",
      jail: "暂停",
      park: "停车场",
      gotojail: "强制暂停",
    }[def.type] || ""
  );
}

function splitName(name) {
  const chars = Array.from(name || "");
  if (chars.length <= 3) return [chars.join("")];
  const mid = Math.ceil(chars.length / 2);
  return [chars.slice(0, mid).join(""), chars.slice(mid).join("")];
}

function drawLines(ctx, lines, cx, cy, maxW, maxH, weight, color) {
  const longest = Math.max(...lines.map((l) => Array.from(l).length), 1);
  let size = Math.min(
    Math.floor((maxH / lines.length) * 0.86),
    Math.floor((maxW * 0.94) / longest)
  );
  size = Math.max(28, Math.min(size, 168));
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${weight} ${size}px ${FONT}`;
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 1);
  if (widest > maxW) {
    size = Math.max(22, Math.floor(size * (maxW / widest) * 0.96));
    ctx.font = `${weight} ${size}px ${FONT}`;
  }
  const gap = size * 1.12;
  const total = gap * lines.length;
  lines.forEach((line, i) => {
    ctx.fillText(line, cx, cy - total / 2 + gap * (i + 0.5));
  });
}

function motifFor(def) {
  return (
    {
      station: "rail",
      utility: "drop",
      chance: "spark",
      fate: "spark",
      go: "sail",
      jail: "gate",
      park: "tree",
      gotojail: "gate",
      tax: "market",
    }[def.type] || null
  );
}

function drawMotif(ctx, kind, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2.2, s * 0.09);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const u = s * 0.46;
  const poly = (pts, fill = false) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    if (fill) ctx.fill();
    else ctx.stroke();
  };
  if (kind === "pagoda") {
    poly([[0, -u], [u, -u * 0.35], [-u, -u * 0.35]], true);
    poly([[0, -u * 0.15], [u * 0.82, u * 0.28], [-u * 0.82, u * 0.28]], true);
    ctx.fillRect(-u * 0.16, u * 0.28, u * 0.32, u * 0.42);
  } else if (kind === "bridge") {
    ctx.beginPath();
    ctx.moveTo(-u, u * 0.35);
    ctx.quadraticCurveTo(0, -u * 0.85, u, u * 0.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-u, u * 0.35);
    ctx.lineTo(u, u * 0.35);
    ctx.stroke();
  } else if (kind === "dome") {
    ctx.beginPath();
    ctx.arc(0, u * 0.1, u * 0.62, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-u * 0.72, u * 0.08, u * 1.44, u * 0.16);
    ctx.beginPath();
    ctx.arc(0, -u * 0.55, u * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "sail") {
    poly([[-u * 0.15, u], [-u * 0.15, -u], [u * 0.7, u * 0.15]], true);
    ctx.beginPath();
    ctx.moveTo(-u * 0.7, u * 0.55);
    ctx.quadraticCurveTo(0, u * 0.15, u * 0.75, u * 0.55);
    ctx.stroke();
  } else if (kind === "gate") {
    ctx.strokeRect(-u * 0.7, -u * 0.15, u * 1.4, u * 0.9);
    ctx.beginPath();
    ctx.arc(0, -u * 0.15, u * 0.38, Math.PI, 0);
    ctx.stroke();
  } else if (kind === "peak") {
    poly([[-u, u * 0.55], [0, -u], [u * 0.35, u * 0.1], [u, u * 0.55]], true);
  } else if (kind === "tree") {
    ctx.beginPath();
    ctx.arc(0, -u * 0.15, u * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-u * 0.08, u * 0.2, u * 0.16, u * 0.45);
  } else if (kind === "wall") {
    ctx.fillRect(-u * 0.8, -u * 0.05, u * 1.6, u * 0.7);
    ctx.fillRect(-u * 0.15, -u * 0.55, u * 0.3, u * 0.55);
  } else if (kind === "lantern") {
    poly([[0, -u], [-u * 0.45, -u * 0.2], [-u * 0.35, u * 0.45], [u * 0.35, u * 0.45], [u * 0.45, -u * 0.2]], true);
  } else if (kind === "market") {
    poly([[-u, u * 0.15], [0, -u * 0.55], [u, u * 0.15]], true);
    ctx.fillRect(-u * 0.7, u * 0.15, u * 1.4, u * 0.12);
  } else if (kind === "oasis") {
    ctx.beginPath();
    ctx.ellipse(0, u * 0.35, u * 0.7, u * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-u * 0.06, -u * 0.15, u * 0.12, u * 0.5);
    ctx.beginPath();
    ctx.arc(-u * 0.28, -u * 0.15, u * 0.22, 0, Math.PI * 2);
    ctx.arc(u * 0.28, -u * 0.2, u * 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "spire") {
    poly([[0, -u], [u * 0.38, u * 0.55], [-u * 0.38, u * 0.55]], true);
    ctx.fillRect(-u * 0.5, u * 0.5, u, u * 0.14);
  } else if (kind === "rail") {
    ctx.beginPath();
    ctx.moveTo(-u, -u * 0.28);
    ctx.lineTo(u, -u * 0.28);
    ctx.moveTo(-u, u * 0.28);
    ctx.lineTo(u, u * 0.28);
    ctx.stroke();
    for (const x0 of [-u * 0.55, 0, u * 0.55]) {
      ctx.beginPath();
      ctx.moveTo(x0, -u * 0.28);
      ctx.lineTo(x0, u * 0.28);
      ctx.stroke();
    }
  } else if (kind === "drop") {
    ctx.beginPath();
    ctx.moveTo(0, -u);
    ctx.quadraticCurveTo(u * 0.85, u * 0.05, 0, u * 0.7);
    ctx.quadraticCurveTo(-u * 0.85, u * 0.05, 0, -u);
    ctx.fill();
  } else if (kind === "spark") {
    poly(
      [
        [0, -u],
        [u * 0.22, -u * 0.22],
        [u, 0],
        [u * 0.22, u * 0.22],
        [0, u],
        [-u * 0.22, u * 0.22],
        [-u, 0],
        [-u * 0.22, -u * 0.22],
      ],
      true
    );
  }
  ctx.restore();
}

function paintTile(def, printW, printD) {
  const square = Math.abs(printW - printD) < 0.25;
  const H = square ? 768 : 760;
  const W = Math.max(240, Math.round(H * (printW / printD)));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const band = bandOf(def);
  const bandH = Math.round(H * (square ? 0.15 : 0.2));

  ctx.fillStyle = theme.paper || "#f4efe4";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = hexToRgba(band, 0.08);
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, W, bandH);
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillRect(0, bandH - 5, W, 5);
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.fillRect(0, bandH, W, 3);
  const motif = def.motif || motifFor(def);
  if (motif) {
    drawMotif(ctx, motif, W / 2, bandH * 0.52, bandH * 0.72, "rgba(255,252,244,0.92)");
  }

  const wm = { chance: "?", fate: "!", tax: "税", station: "铁", go: "起", jail: "停", park: "泊", gotojail: "止" }[
    def.type
  ];
  if (wm) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = band;
    ctx.font = `700 ${Math.floor(H * 0.42)}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(wm, W / 2, H * 0.58);
    ctx.restore();
  }

  const titleColor = def.type === "go" ? theme.price || "#9f2424" : theme.ink || "#2a2118";
  if (square) {
    drawLines(ctx, splitName(def.name), W / 2, H * 0.46, W * 0.84, H * 0.26, 700, titleColor);
    ctx.fillStyle = "#6d5848";
    ctx.font = `600 ${Math.floor(H * 0.055)}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const foot = def.type === "go" ? "经过领取  $2000" : def.subtitle || categoryOf(def);
    ctx.fillText(foot, W / 2, H * 0.7);
    if (def.type === "go") {
      ctx.strokeStyle = "#c62828";
      ctx.lineWidth = 16;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const shift of [-70, 10]) {
        ctx.beginPath();
        ctx.moveTo(W / 2 + shift + 54, H * 0.82 - 26);
        ctx.lineTo(W / 2 + shift, H * 0.82);
        ctx.lineTo(W / 2 + shift + 54, H * 0.82 + 26);
        ctx.stroke();
      }
    }
  } else {
    const cat = categoryOf(def);
    if (cat && cat !== def.name) {
      ctx.fillStyle = "#7b6756";
      ctx.font = `600 ${Math.floor(H * 0.042)}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0.22em";
      ctx.fillText(cat, W / 2, bandH + H * 0.065);
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    }
    drawLines(
      ctx,
      splitName(def.name),
      W / 2,
      H * 0.52,
      W * 0.9,
      H * 0.34,
      700,
      titleColor
    );
    const price =
      def.type === "property" || def.type === "station" || def.type === "utility"
        ? `$${def.value}`
        : def.type === "tax"
          ? `缴 $${def.value}`
          : "";
    if (price) {
      ctx.strokeStyle = "rgba(70,48,32,0.28)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W * 0.22, H * 0.84);
      ctx.lineTo(W * 0.78, H * 0.84);
      ctx.stroke();
      ctx.fillStyle = theme.price || "#7a3030";
      ctx.font = `700 ${Math.floor(H * 0.07)}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(price, W / 2, H * 0.9);
    }
  }

  speckle(ctx, W, H, square ? 700 : 500);
  return canvas;
}

function plaque(ctx, title, en) {
  ctx.fillStyle = "rgba(255,250,240,0.9)";
  roundBox(ctx, 512 - 210, 470, 420, 150, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(90,62,36,0.45)";
  ctx.lineWidth = 3;
  roundBox(ctx, 512 - 210, 470, 420, 150, 18);
  ctx.stroke();
  ctx.fillStyle = theme.ink || "#2a2118";
  ctx.font = `700 64px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, 512, 522);
  ctx.fillStyle = "#8a6239";
  ctx.font = `600 18px ${FONT}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0.42em";
  ctx.fillText(en || "", 512, 572);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
}

function roundBox(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function frameMap(ctx, S, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.strokeRect(28, 28, S - 56, S - 56);
  ctx.lineWidth = 2;
  ctx.strokeRect(44, 44, S - 88, S - 88);
}

function fillCoast(ctx, color, draw) {
  ctx.beginPath();
  draw(ctx);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(92, 64, 40, 0.45)";
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function paintWorldCenter(ctx, S) {
  const sea = ctx.createLinearGradient(0, 0, 0, S);
  sea.addColorStop(0, "#c5e6ee");
  sea.addColorStop(1, "#6aa3b4");
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1.5;
  for (const y of [180, 320, 480, 640, 800]) {
    ctx.beginPath();
    ctx.moveTo(50, y);
    ctx.lineTo(S - 50, y);
    ctx.stroke();
  }
  fillCoast(ctx, "#ead8b4", (c) => {
    c.moveTo(150, 150);
    c.bezierCurveTo(230, 120, 320, 170, 300, 250);
    c.bezierCurveTo(340, 310, 250, 340, 230, 400);
    c.bezierCurveTo(210, 470, 270, 540, 250, 640);
    c.bezierCurveTo(240, 760, 160, 790, 140, 700);
    c.bezierCurveTo(110, 600, 170, 500, 145, 420);
    c.bezierCurveTo(120, 320, 90, 220, 150, 150);
  });
  fillCoast(ctx, "#e2c99a", (c) => {
    c.moveTo(430, 210);
    c.bezierCurveTo(520, 170, 600, 220, 560, 290);
    c.bezierCurveTo(610, 330, 540, 390, 500, 430);
    c.bezierCurveTo(560, 520, 520, 680, 430, 720);
    c.bezierCurveTo(360, 680, 390, 540, 370, 450);
    c.bezierCurveTo(340, 340, 360, 250, 430, 210);
  });
  fillCoast(ctx, "#edd9b0", (c) => {
    c.moveTo(560, 180);
    c.bezierCurveTo(700, 90, 900, 140, 940, 250);
    c.bezierCurveTo(980, 340, 860, 400, 820, 460);
    c.bezierCurveTo(760, 540, 680, 480, 640, 400);
    c.bezierCurveTo(590, 320, 500, 260, 560, 180);
  });
  fillCoast(ctx, "#e6d0a4", (c) => {
    c.moveTo(760, 560);
    c.bezierCurveTo(840, 520, 920, 560, 900, 640);
    c.bezierCurveTo(860, 710, 760, 690, 740, 630);
    c.bezierCurveTo(720, 590, 730, 560, 760, 560);
  });
  ctx.strokeStyle = "rgba(120,40,32,0.55)";
  ctx.lineWidth = 3;
  ctx.setLineDash([9, 8]);
  ctx.beginPath();
  ctx.moveTo(220, 280);
  ctx.quadraticCurveTo(360, 180, 500, 250);
  ctx.quadraticCurveTo(680, 160, 800, 300);
  ctx.quadraticCurveTo(860, 420, 820, 600);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#8d3b32";
  for (const [x, y] of [
    [210, 240],
    [480, 250],
    [760, 280],
    [820, 610],
    [230, 560],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  frameMap(ctx, S, "#6d5438");
  plaque(ctx, theme.name || "世界之旅", theme.en);
}

function paintJiangnanCenter(ctx, S) {
  const mist = ctx.createLinearGradient(0, 0, 0, S);
  mist.addColorStop(0, "#e7f2ea");
  mist.addColorStop(1, "#c9ddd4");
  ctx.fillStyle = mist;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = "#3e8f98";
  ctx.lineWidth = 78;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(80, 180);
  ctx.bezierCurveTo(280, 80, 420, 420, 560, 300);
  ctx.bezierCurveTo(760, 140, 820, 520, 960, 640);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 16;
  ctx.stroke();
  ctx.strokeStyle = "#2f6a4a";
  ctx.lineWidth = 4;
  for (const [x, y] of [
    [180, 220],
    [340, 360],
    [700, 260],
    [640, 520],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 30, y - 70, x + 70, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "#5a3a28";
  ctx.lineWidth = 6;
  for (const [x, y] of [
    [300, 210],
    [620, 250],
    [780, 480],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x - 36, y + 16);
    ctx.quadraticCurveTo(x, y - 28, x + 36, y + 16);
    ctx.stroke();
  }
  frameMap(ctx, S, "#3d6a5c");
  plaque(ctx, theme.name || "江南烟雨", theme.en);
}

function paintSilkCenter(ctx, S) {
  const sand = ctx.createLinearGradient(0, 0, S, S);
  sand.addColorStop(0, "#f0d7a2");
  sand.addColorStop(0.55, "#e2b56a");
  sand.addColorStop(1, "#c9844a");
  ctx.fillStyle = sand;
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = "#8d5a3a";
  ctx.beginPath();
  ctx.moveTo(40, 260);
  for (let x = 40; x <= 980; x += 70) {
    const peak = x % 140 === 40;
    ctx.lineTo(x, peak ? 120 : 230);
  }
  ctx.lineTo(980, 280);
  ctx.lineTo(40, 280);
  ctx.fill();
  ctx.strokeStyle = "#6a3a28";
  ctx.lineWidth = 5;
  ctx.setLineDash([14, 12]);
  ctx.beginPath();
  ctx.moveTo(120, 340);
  ctx.bezierCurveTo(300, 480, 480, 260, 680, 420);
  ctx.bezierCurveTo(820, 540, 860, 360, 960, 300);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#2f6a4e";
  for (const [x, y] of [
    [260, 430],
    [520, 340],
    [760, 460],
  ]) {
    ctx.beginPath();
    ctx.ellipse(x, y + 18, 34, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 3, y - 28, 6, 36);
  }
  frameMap(ctx, S, "#6a4024");
  plaque(ctx, theme.name || "丝路商队", theme.en);
}

function paintCenter() {
  const S = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (theme.center === "jiangnan") paintJiangnanCenter(ctx, S);
  else if (theme.center === "silk") paintSilkCenter(ctx, S);
  else paintWorldCenter(ctx, S);
  speckle(ctx, S, S, 900);
  return canvas;
}

function paintCard(kind) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  const chance = kind === "chance";
  ctx.fillStyle = chance ? "#e36a2a" : "#2c3e8f";
  ctx.fillRect(0, 0, 256, 360);
  const grd = ctx.createLinearGradient(0, 0, 256, 360);
  grd.addColorStop(0, "rgba(255,255,255,0.18)");
  grd.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 256, 360);
  ctx.strokeStyle = "rgba(255,244,220,0.9)";
  ctx.lineWidth = 8;
  ctx.strokeRect(16, 16, 224, 328);
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, 200, 304);
  ctx.fillStyle = "#fff8ee";
  ctx.font = `700 132px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(chance ? "?" : "!", 128, 148);
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText(chance ? "机会" : "命运", 128, 250);
  return canvas;
}

function woodCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#6b4128";
  ctx.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 1024; y += 2) {
    const n = Math.sin(y * 0.035) * 18 + Math.sin(y * 0.11 + 1.7) * 10;
    const r = Math.floor(112 + n);
    const g = Math.floor(64 + n * 0.45);
    const b = Math.floor(36 + n * 0.2);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, y, 1024, 2);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(40,18,8,0.35)";
  ctx.lineWidth = 3;
  for (const y of [0, 341, 682]) {
    ctx.beginPath();
    ctx.moveTo(0, y + 8);
    for (let x = 0; x <= 1024; x += 48) {
      ctx.lineTo(x, y + Math.sin(x * 0.01) * 3);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 7; i++) {
    const x = 80 + Math.random() * 860;
    const y = 80 + Math.random() * 860;
    const rg = ctx.createRadialGradient(x, y, 2, x, y, 28);
    rg.addColorStop(0, "rgba(48,22,10,0.55)");
    rg.addColorStop(1, "rgba(48,22,10,0)");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

function feltCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#c8c8c8";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3500; i++) {
    const light = Math.random() > 0.5;
    ctx.fillStyle = light ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.08)";
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 2);
  }
  return canvas;
}

function gradientBg() {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#2c261e");
  g.addColorStop(0.42, "#16130f");
  g.addColorStop(1, "#0c0a08");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 256);
  return canvas;
}

function layoutSlots() {
  const cells = new Array(40);
  const put = (i, x, z, w, d, rot) => {
    cells[i] = { i, x, z, w, d, rot };
  };
  const c = CORNER / 2;
  put(0, BOARD_HALF - c, BOARD_HALF - c, CORNER_SIZE, CORNER_SIZE, 0);
  put(10, -(BOARD_HALF - c), BOARD_HALF - c, CORNER_SIZE, CORNER_SIZE, 0);
  put(20, -(BOARD_HALF - c), -(BOARD_HALF - c), CORNER_SIZE, CORNER_SIZE, Math.PI);
  put(30, BOARD_HALF - c, -(BOARD_HALF - c), CORNER_SIZE, CORNER_SIZE, Math.PI);
  for (let k = 1; k <= 9; k++) {
    const along = BOARD_HALF - CORNER - SLOT * (k - 0.5);
    const back = -(BOARD_HALF - CORNER - SLOT * (k - 0.5));
    put(k, along, BOARD_HALF - c, SIDE_W, SIDE_D, 0);
    put(10 + k, -(BOARD_HALF - c), along, SIDE_W, SIDE_D, -Math.PI / 2);
    put(20 + k, back, -(BOARD_HALF - c), SIDE_W, SIDE_D, Math.PI);
    put(30 + k, BOARD_HALF - c, back, SIDE_W, SIDE_D, Math.PI / 2);
  }
  return cells;
}

function addBox(parent, w, h, d, x, y, z, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildToken(shape, color) {
  const root = new THREE.Group();
  const stand = new THREE.Mesh(standGeo, standMat);
  stand.position.y = 0.02;
  stand.castShadow = true;
  stand.receiveShadow = true;
  root.add(stand);
  const fig = new THREE.Group();
  fig.position.y = 0.04;
  root.add(fig);
  const tint = new THREE.Color(color);
  if (shape === "triangle") buildHat(fig, tint);
  else if (shape === "square") buildDog(fig, tint);
  else if (shape === "star") buildShip(fig, tint);
  else buildCar(fig, tint);
  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  root.scale.setScalar(1.72);
  return root;
}

function buildCar(fig, color) {
  const paint = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.22,
    metalness: 0.18,
    clearcoat: 0.85,
    clearcoatRoughness: 0.18,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xb9e6ff,
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.55,
  });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.92 });
  const lamp = new THREE.MeshStandardMaterial({
    color: 0xfff4d2,
    emissive: 0xffe7a2,
    emissiveIntensity: 0.45,
    roughness: 0.3,
  });
  addBox(fig, 0.26, 0.09, 0.5, 0, 0.12, 0, paint);
  addBox(fig, 0.22, 0.08, 0.22, 0, 0.2, -0.02, glass);
  const wheelGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.05, 14);
  for (const [x, z] of [
    [-0.15, 0.15],
    [0.15, 0.15],
    [-0.15, -0.16],
    [0.15, -0.16],
  ]) {
    const w = new THREE.Mesh(wheelGeo, rubber);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.065, z);
    fig.add(w);
  }
  addBox(fig, 0.045, 0.03, 0.02, -0.07, 0.12, 0.25, lamp);
  addBox(fig, 0.045, 0.03, 0.02, 0.07, 0.12, 0.25, lamp);
}

function buildHat(fig, color) {
  const felt = new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0.02 });
  const dark = new THREE.MeshStandardMaterial({
    color: color.clone().multiplyScalar(0.45),
    roughness: 0.6,
    metalness: 0.1,
  });
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.028, 28), felt);
  brim.position.y = 0.03;
  fig.add(brim);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.135, 0.22, 24), felt);
  crown.position.y = 0.15;
  fig.add(crown);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.138, 0.138, 0.035, 24), dark);
  band.position.y = 0.08;
  fig.add(band);
}

function buildDog(fig, color) {
  const fur = new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.04 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 });
  addBox(fig, 0.2, 0.14, 0.32, 0, 0.14, 0, fur);
  addBox(fig, 0.16, 0.14, 0.16, 0, 0.26, 0.16, fur);
  addBox(fig, 0.1, 0.07, 0.1, 0, 0.22, 0.26, fur);
  addBox(fig, 0.045, 0.1, 0.05, -0.06, 0.36, 0.14, fur);
  addBox(fig, 0.045, 0.1, 0.05, 0.06, 0.36, 0.14, fur);
  const leg = new THREE.BoxGeometry(0.05, 0.1, 0.05);
  for (const [x, z] of [
    [-0.06, 0.1],
    [0.06, 0.1],
    [-0.06, -0.1],
    [0.06, -0.1],
  ]) {
    const m = new THREE.Mesh(leg, fur);
    m.position.set(x, 0.05, z);
    fig.add(m);
  }
  const tail = addBox(fig, 0.045, 0.12, 0.045, 0, 0.24, -0.18, fur);
  tail.rotation.x = 0.7;
  const eye = new THREE.SphereGeometry(0.018, 8, 8);
  for (const x of [-0.04, 0.04]) {
    const e = new THREE.Mesh(eye, dark);
    e.position.set(x, 0.28, 0.24);
    fig.add(e);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), dark);
  nose.position.set(0, 0.22, 0.31);
  fig.add(nose);
}

function buildShip(fig, color) {
  const metal = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.28,
    metalness: 0.82,
    clearcoat: 0.35,
    clearcoatRoughness: 0.2,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: color.clone().multiplyScalar(0.45),
    roughness: 0.4,
    metalness: 0.6,
  });
  addBox(fig, 0.2, 0.08, 0.46, 0, 0.09, -0.02, metal);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.22, 10), metal);
  bow.rotation.x = Math.PI / 2;
  bow.position.set(0, 0.09, 0.28);
  fig.add(bow);
  addBox(fig, 0.12, 0.08, 0.16, 0, 0.16, -0.06, dark);
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.038, 0.1, 12), dark);
  stack.position.set(0, 0.24, -0.08);
  fig.add(stack);
}

function makeHouse() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(houseBodyGeo, houseMat);
  body.position.y = 0.075;
  g.add(body);
  const roof = new THREE.Mesh(houseRoofGeo, houseRoofMat);
  roof.position.y = 0.2;
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  const door = new THREE.Mesh(houseDoorGeo, trimMat);
  door.position.set(0, 0.05, 0.09);
  g.add(door);
  g.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return g;
}

function makeHotel() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(hotelBodyGeo, hotelMat);
  body.position.y = 0.13;
  g.add(body);
  const roof = new THREE.Mesh(hotelRoofGeo, hotelRoofMat);
  roof.position.y = 0.28;
  g.add(roof);
  const chimney = new THREE.Mesh(chimneyGeo, hotelRoofMat);
  chimney.position.set(0.12, 0.35, -0.04);
  g.add(chimney);
  const door = new THREE.Mesh(hotelDoorGeo, trimMat);
  door.position.set(0, 0.07, 0.11);
  g.add(door);
  for (const x of [-0.12, 0, 0.12]) {
    const win = new THREE.Mesh(windowGeo, windowMat);
    win.position.set(x, 0.18, 0.115);
    g.add(win);
  }
  g.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return g;
}

function addPips(group, size, geo, mat) {
  const h = size / 2;
  const spread = size * 0.26;
  const r = size * 0.09;
  const layouts = {
    1: [[0, 0]],
    2: [[-1, -1], [1, 1]],
    3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  };
  // +Y 为 1，-Y 为 6，+Z 为 2，-Z 为 5，+X 为 3，-X 为 4。对面之和为 7。
  const faces = [
    { v: 1, n: [0, 1, 0], u: [1, 0, 0], t: [0, 0, -1] },
    { v: 6, n: [0, -1, 0], u: [1, 0, 0], t: [0, 0, 1] },
    { v: 2, n: [0, 0, 1], u: [1, 0, 0], t: [0, 1, 0] },
    { v: 5, n: [0, 0, -1], u: [-1, 0, 0], t: [0, 1, 0] },
    { v: 3, n: [1, 0, 0], u: [0, 0, -1], t: [0, 1, 0] },
    { v: 4, n: [-1, 0, 0], u: [0, 0, 1], t: [0, 1, 0] },
  ];
  const inset = h - r * 0.35;
  for (const face of faces) {
    for (const [pu, pv] of layouts[face.v]) {
      const pip = new THREE.Mesh(geo, mat);
      pip.position.set(
        face.n[0] * inset + face.u[0] * pu * spread + face.t[0] * pv * spread,
        face.n[1] * inset + face.u[1] * pu * spread + face.t[1] * pv * spread,
        face.n[2] * inset + face.u[2] * pu * spread + face.t[2] * pv * spread
      );
      pip.castShadow = false;
      group.add(pip);
    }
  }
}

function clearGroup(group) {
  while (group.children.length) group.remove(group.children[0]);
}

export class BoardView {
  constructor(canvas) {
    this.canvas = canvas;
    this.onPick = null;
    this.onHover = null;
    this._gen = 0;
    this._diceBusy = false;
    this._shownA = 0;
    this._shownB = 0;
    this._built = false;
    this._players = [];
    this.tokenMap = new Map();
    this.tiles = [];
    this._pickables = [];
    this.dieSize = 0.56;
    this.ready = this._boot();
  }

  get rolling() {
    return this._diceBusy;
  }

  async _boot() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    this.renderer.setClearColor(0x100e0c, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.98;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    ANISO = this.renderer.capabilities.getMaxAnisotropy();

    this.scene = new THREE.Scene();
    this.scene.background = makeTex(gradientBg());
    this.scene.fog = new THREE.Fog(0x100e0c, 48, 110);

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.08, 140);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 7.5;
    this.controls.maxDistance = 52;
    this.controls.minPolarAngle = 0.22;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.08;
    this.controls.target.set(...CAM.table.target);
    this.camera.position.set(...CAM.table.pos);
    this.controls.update();

    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      this.scene.environmentIntensity = 0.52;
      pmrem.dispose();
    } catch (_) {
      /* 没有环境贴图时仍靠直接光 */
    }

    this.scene.add(new THREE.HemisphereLight(0xfff3e2, 0x3a2618, 0.55));
    this.scene.add(new THREE.AmbientLight(0xfff5ea, 0.12));
    const key = new THREE.DirectionalLight(0xfff4e4, 2.8);
    key.position.set(7.5, 16.5, 9.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 2;
    key.shadow.camera.far = 42;
    key.shadow.camera.left = -16;
    key.shadow.camera.right = 16;
    key.shadow.camera.top = 16;
    key.shadow.camera.bottom = -16;
    key.shadow.bias = -0.00035;
    key.shadow.normalBias = 0.035;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xc5d4ff, 0.55);
    fill.position.set(-10, 8, -6);
    this.scene.add(fill);

    await Promise.race([
      (async () => {
        try {
          await document.fonts.load(`600 72px "Noto Serif SC"`);
        } catch (_) {}
        try {
          await document.fonts.ready;
        } catch (_) {}
      })(),
      new Promise((resolve) => setTimeout(resolve, 2800)),
    ]);

    this._buildRoom();
    this._buildBoard();
    this._bindPointer();
    this._resize = () => {
      const w = this.canvas.clientWidth || 1;
      const h = this.canvas.clientHeight || 1;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    };
    this._resize();
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this.canvas);
    window.addEventListener("resize", this._resize);
    this._built = true;
    this._raf = requestAnimationFrame((now) => this._frame(now));
  }

  _buildRoom() {
    const wood = makeTex(woodCanvas(), [2.4, 2.4]);
    const tableTop = new THREE.MeshPhysicalMaterial({
      map: wood,
      roughness: 0.48,
      metalness: 0.05,
      clearcoat: 0.32,
      clearcoatRoughness: 0.42,
    });
    const edge = new THREE.MeshStandardMaterial({ color: 0x4a2c1b, roughness: 0.72 });
    const table = new THREE.Mesh(new THREE.BoxGeometry(70, 0.46, 70), [
      edge,
      edge,
      tableTop,
      edge,
      edge,
      edge,
    ]);
    table.position.y = -0.23;
    table.receiveShadow = true;
    table.castShadow = true;
    this.scene.add(table);

    const legGeo = new THREE.BoxGeometry(0.72, 6.6, 0.72);
    for (const [x, z] of [
      [15.4, 15.4],
      [15.4, -15.4],
      [-15.4, 15.4],
      [-15.4, -15.4],
    ]) {
      const leg = new THREE.Mesh(legGeo, edge);
      leg.position.set(x, -3.76, z);
      leg.castShadow = true;
      this.scene.add(leg);
    }

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0x14110e, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -7.06;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this._addLamp(-13.15, 6.8);
    this._addBank(12.7, 5.4);
  }

  _addLamp(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const brass = new THREE.MeshStandardMaterial({
      color: 0xc6a15a,
      metalness: 0.86,
      roughness: 0.28,
    });
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0xf3e6c8,
      roughness: 0.72,
      side: THREE.DoubleSide,
    });
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.06, 20), brass);
    foot.position.y = 0.03;
    g.add(foot);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.35, 12), brass);
    stem.position.y = 0.72;
    g.add(stem);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.38, 24, 1, true), shadeMat);
    shade.position.y = 1.52;
    g.add(shade);
    const bulb = new THREE.PointLight(0xffb15e, 18, 16, 2);
    bulb.position.y = 1.42;
    g.add(bulb);
    g.traverse((obj) => {
      if (obj.isMesh) obj.castShadow = false;
    });
    this.scene.add(g);
  }

  _addBank(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = -0.45;
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x6a3d24, roughness: 0.62 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.62, 1.15), boxMat);
    box.position.y = 0.31;
    box.castShadow = true;
    box.receiveShadow = true;
    g.add(box);
    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 256;
    labelCanvas.height = 96;
    const ctx = labelCanvas.getContext("2d");
    ctx.fillStyle = "#f3ead7";
    ctx.fillRect(0, 0, 256, 96);
    ctx.strokeStyle = "#8a6239";
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 240, 80);
    ctx.fillStyle = "#3a2a1c";
    ctx.font = `700 48px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("银行", 128, 50);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.92, 0.34),
      new THREE.MeshStandardMaterial({ map: makeTex(labelCanvas), roughness: 0.7 })
    );
    label.position.set(0, 0.34, 0.58);
    g.add(label);
    this.scene.add(g);
  }

  _buildBoard() {
    const felt = makeTex(feltCanvas(), [4, 4]);
    this._feltMat = new THREE.MeshStandardMaterial({
      map: felt,
      color: theme.felt || "#1c5a38",
      roughness: 0.68,
      metalness: 0.03,
    });
    const green = this._feltMat;
    const base = new THREE.Mesh(new THREE.BoxGeometry(OUTER * 2, 0.2, OUTER * 2), [
      cardboardMat,
      cardboardMat,
      green,
      cardboardMat,
      cardboardMat,
      cardboardMat,
    ]);
    base.position.y = BASE_TOP - 0.1;
    base.castShadow = true;
    base.receiveShadow = true;
    this.scene.add(base);

    const boltGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.02, 14);
    const boltMat = new THREE.MeshStandardMaterial({
      color: 0xd4b06a,
      metalness: 0.85,
      roughness: 0.28,
    });
    for (const [sx, sz] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const bolt = new THREE.Mesh(boltGeo, boltMat);
      bolt.position.set(sx * (OUTER - 0.28), BASE_TOP + 0.012, sz * (OUTER - 0.28));
      bolt.castShadow = true;
      this.scene.add(bolt);
    }

    this.boardRoot = new THREE.Group();
    this.boardRoot.position.y = BASE_TOP;
    this.scene.add(this.boardRoot);

    const gutter = new THREE.Mesh(
      new THREE.BoxGeometry(BOARD_HALF * 2, 0.012, BOARD_HALF * 2),
      new THREE.MeshStandardMaterial({ color: 0x0d1c14, roughness: 0.92 })
    );
    gutter.position.y = 0.008;
    gutter.receiveShadow = true;
    this.boardRoot.add(gutter);

    const info = layoutSlots();
    const inner = BOARD_HALF - CORNER + GUTTER / 2 - 0.03;
    const cells = getActiveMap().cells;
    info.forEach((cell, i) => {
      this.tiles[i] = this._createTile(cell, cells[i]);
    });

    const centerBody = new THREE.Mesh(
      new THREE.BoxGeometry(inner * 2, TILE_H - 0.008, inner * 2),
      cardboardMat
    );
    centerBody.position.y = (TILE_H - 0.008) / 2;
    centerBody.castShadow = true;
    centerBody.receiveShadow = true;
    this.boardRoot.add(centerBody);
    this._centerMat = new THREE.MeshStandardMaterial({
      map: makeTex(paintCenter()),
      roughness: 0.84,
      metalness: 0,
      color: 0xffffff,
    });
    const centerPrint = new THREE.Mesh(
      new THREE.PlaneGeometry(inner * 2 - 0.06, inner * 2 - 0.06),
      this._centerMat
    );
    centerPrint.rotation.x = -Math.PI / 2;
    centerPrint.position.y = TILE_H + 0.002;
    centerPrint.receiveShadow = true;
    this.boardRoot.add(centerPrint);

    this._cardStack("chance", -4.55, -1.15, 0.24);
    this._cardStack("fate", 4.7, -0.85, -0.3);

    this._dieGeo = new RoundedBoxGeometry(this.dieSize, this.dieSize, this.dieSize, 3, 0.065);
    this._dieMat = new THREE.MeshPhysicalMaterial({
      color: 0xf4f1ea,
      roughness: 0.24,
      metalness: 0,
      clearcoat: 0.35,
      clearcoatRoughness: 0.2,
    });
    this._pipGeo = new THREE.SphereGeometry(this.dieSize * 0.09, 12, 10);
    this._pipMat = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.42 });
    this.dieA = this._makeDie();
    this.dieB = this._makeDie();
    this.boardRoot.add(this.dieA, this.dieB);
    this._diceRest = [new THREE.Vector3(-0.48, 0, 3.42), new THREE.Vector3(0.52, 0, 3.08)];
    this.resetTable();

    this.highlightMat = new THREE.MeshBasicMaterial({
      color: 0xf2d48a,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    this.highlight = new THREE.Group();
    this.highlight.visible = false;
    const unit = new THREE.PlaneGeometry(1, 1);
    this._frameParts = [0, 1, 2, 3].map(() => {
      const m = new THREE.Mesh(unit, this.highlightMat);
      m.rotation.x = -Math.PI / 2;
      m.raycast = () => {};
      this.highlight.add(m);
      return m;
    });
    this.boardRoot.add(this.highlight);

    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.016, 8, 28),
      new THREE.MeshStandardMaterial({
        color: 0xf0d78c,
        metalness: 0.72,
        roughness: 0.28,
        emissive: 0x8a5a16,
        emissiveIntensity: 0.45,
      })
    );
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = 0.045;
    this.ring.visible = false;

    this._ndc = new THREE.Vector2();
    this._raycaster = new THREE.Raycaster();
  }

  _createTile(info, def) {
    const group = new THREE.Group();
    group.position.set(info.x, 0, info.z);
    group.rotation.y = info.rot;

    const body = new THREE.Mesh(new THREE.BoxGeometry(info.w, TILE_H, info.d), cardboardMat);
    body.position.y = TILE_H / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    body.userData.index = info.i;
    group.add(body);

    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x3a2d22,
      roughness: 0.4,
      metalness: 0.12,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });
    const rim = new THREE.Mesh(new THREE.PlaneGeometry(info.w - 0.012, info.d - 0.012), rimMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = TILE_H + 0.0015;
    rim.receiveShadow = true;
    rim.userData.index = info.i;
    group.add(rim);

    const print = new THREE.Mesh(
      new THREE.PlaneGeometry(info.w - PRINT_INSET, info.d - PRINT_INSET),
      new THREE.MeshStandardMaterial({
        map: makeTex(paintTile(def, info.w - PRINT_INSET, info.d - PRINT_INSET)),
        roughness: 0.88,
        metalness: 0,
        color: 0xffffff,
      })
    );
    print.rotation.x = -Math.PI / 2;
    print.position.y = TILE_H + 0.004;
    print.receiveShadow = true;
    print.userData.index = info.i;
    group.add(print);

    const buildings = new THREE.Group();
    group.add(buildings);
    this.boardRoot.add(group);
    this._pickables.push(body, rim, print);
    return {
      group,
      rim,
      print,
      buildings,
      w: info.w,
      d: info.d,
      i: info.i,
      sig: "",
    };
  }

  _cardStack(kind, x, z, rot) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    const top = new THREE.MeshStandardMaterial({
      map: makeTex(paintCard(kind)),
      roughness: 0.55,
      color: 0xffffff,
    });
    const side = new THREE.MeshStandardMaterial({ color: 0xf7f2e8, roughness: 0.8 });
    const geo = new THREE.BoxGeometry(1.28, 0.02, 1.92);
    for (let i = 0; i < 5; i++) {
      const mats = i === 4 ? [side, side, top, side, side, side] : side;
      const card = new THREE.Mesh(geo, mats);
      card.position.y = TILE_H + 0.012 + i * 0.012;
      card.position.x = (i - 2) * 0.012;
      card.rotation.z = (i - 2) * 0.01;
      card.castShadow = true;
      card.receiveShadow = true;
      g.add(card);
    }
    this.boardRoot.add(g);
  }

  _makeDie() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(this._dieGeo, this._dieMat);
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    addPips(g, this.dieSize, this._pipGeo, this._pipMat);
    return g;
  }

  _dieQuat(value, yaw) {
    const face = new THREE.Quaternion();
    const x = new THREE.Vector3(1, 0, 0);
    const z = new THREE.Vector3(0, 0, 1);
    switch (value) {
      case 6:
        face.setFromAxisAngle(x, Math.PI);
        break;
      case 3:
        face.setFromAxisAngle(z, Math.PI / 2);
        break;
      case 4:
        face.setFromAxisAngle(z, -Math.PI / 2);
        break;
      case 2:
        face.setFromAxisAngle(x, -Math.PI / 2);
        break;
      case 5:
        face.setFromAxisAngle(x, Math.PI / 2);
        break;
      default:
        break;
    }
    const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw || 0);
    return spin.multiply(face);
  }

  _seatDice() {
    const y = TILE_H + this.dieSize / 2;
    this.dieA.position.set(this._diceRest[0].x, y, this._diceRest[0].z);
    this.dieB.position.set(this._diceRest[1].x, y, this._diceRest[1].z);
  }

  resetTable() {
    if (!this.dieA) return;
    this._diceBusy = false;
    this._shownA = 0;
    this._shownB = 0;
    this.dieA.quaternion.copy(this._dieQuat(5, 0.42));
    this.dieB.quaternion.copy(this._dieQuat(3, -0.55));
    this._seatDice();
  }

  showDice(a, b) {
    if (this._diceBusy || !this.dieA) return;
    if (!(a > 0) || !(b > 0)) return;
    if (this._shownA === a && this._shownB === b) return;
    this._shownA = a;
    this._shownB = b;
    this.dieA.quaternion.copy(this._dieQuat(a, 0.35));
    this.dieB.quaternion.copy(this._dieQuat(b, -0.5));
    this._seatDice();
  }

  rollDice(a, b, fast) {
    const A = Math.max(1, Math.min(6, a | 0));
    const B = Math.max(1, Math.min(6, b | 0));
    const gen = this._gen;
    this._diceBusy = true;
    const dice = [this.dieA, this.dieB];
    const targets = [
      this._dieQuat(A, Math.random() * Math.PI * 2),
      this._dieQuat(B, Math.random() * Math.PI * 2),
    ];
    const spins = dice.map(() => ({
      x: (Math.random() * 2 - 1) * 16,
      y: (Math.random() * 2 - 1) * 12,
      z: (Math.random() * 2 - 1) * 16,
    }));
    const dur = fast ? 460 : 980;
    const t0 = performance.now();
    dice.forEach((die) => {
      die.userData.snap = null;
    });
    return new Promise((resolve) => {
      const frame = (now) => {
        if (this._gen !== gen) {
          this._diceBusy = false;
          resolve();
          return;
        }
        const t = Math.min(1, (now - t0) / dur);
        dice.forEach((die, i) => {
          const rest = this._diceRest[i];
          const bounce =
            t < 0.8 ? Math.abs(Math.sin(t * Math.PI * 3.05)) * (1 - t) * 1.2 : (1 - t) * 0.05;
          die.position.set(
            rest.x + Math.sin(t * 10 + i * 2) * 0.16 * (1 - t),
            TILE_H + this.dieSize / 2 + bounce,
            rest.z + Math.cos(t * 8 + i) * 0.1 * (1 - t)
          );
          if (t < 0.76) {
            die.rotation.set(spins[i].x * t, spins[i].y * t, spins[i].z * t);
            if (t > 0.7 && !die.userData.snap) die.userData.snap = die.quaternion.clone();
          } else if (die.userData.snap) {
            const k = (t - 0.76) / 0.24;
            const e = k * k * (3 - 2 * k);
            die.quaternion.slerpQuaternions(die.userData.snap, targets[i], e);
          }
        });
        if (t < 1) requestAnimationFrame(frame);
        else {
          dice.forEach((die, i) => {
            die.quaternion.copy(targets[i]);
            die.userData.snap = null;
          });
          this._shownA = A;
          this._shownB = B;
          this._diceBusy = false;
          this._seatDice();
          resolve();
        }
      };
      requestAnimationFrame(frame);
    });
  }

  cut() {
    this._gen += 1;
    this._diceBusy = false;
    for (const token of this.tokenMap.values()) token.userData.busy = false;
  }

  setCamera(name) {
    const preset = CAM[name] || CAM.table;
    this._cam = {
      fp: this.camera.position.clone(),
      ft: this.controls.target.clone(),
      tp: new THREE.Vector3(...preset.pos),
      tt: new THREE.Vector3(...preset.target),
      t0: performance.now(),
      dur: 680,
    };
  }

  setTheme(map) {
    if (!map || !this._built) return;
    theme = map;
    if (this._feltMat) this._feltMat.color.set(map.felt);
    if (this._centerMat) {
      const old = this._centerMat.map;
      this._centerMat.map = makeTex(paintCenter());
      this._centerMat.needsUpdate = true;
      if (old) old.dispose();
    }
    (map.cells || []).forEach((def, i) => {
      const tile = this.tiles[i];
      if (!tile?.print) return;
      const old = tile.print.material.map;
      tile.print.material.map = makeTex(
        paintTile(def, tile.w - PRINT_INSET, tile.d - PRINT_INSET)
      );
      tile.print.material.needsUpdate = true;
      if (old) old.dispose();
      tile.sig = "";
    });
  }

  sync(state) {
    if (!this._built || !state) return;
    this._players = state.players;
    this._syncTokens(state);
    state.cells.forEach((cell, i) => {
      const tile = this.tiles[i];
      if (!tile) return;
      const sig = `${cell.level || 0}|${cell.owner == null ? "-" : cell.owner}`;
      if (tile.sig === sig) return;
      tile.sig = sig;
      this._paintRim(tile, cell, state);
      this._rebuildBuildings(tile, cell);
    });
    const current = state.players[state.turn];
    if (current && !current.bankrupt && state.phase !== "ended") this._highlightAt(current.position);
    else this.highlight.visible = false;
    this.showDice(state.lastDiceA, state.lastDiceB);
  }

  _paintRim(tile, cell, state) {
    const owned = cell.owner != null;
    const color = owned ? state.players[cell.owner]?.color || "#f0d78c" : "#3a2d22";
    tile.rim.material.color.set(color);
    tile.rim.material.emissive.set(owned ? color : "#000000");
    tile.rim.material.emissiveIntensity = owned ? 0.28 : 0;
  }

  _rebuildBuildings(tile, cell) {
    clearGroup(tile.buildings);
    if (cell.type !== "property") return;
    const level = Math.max(0, Math.min(cell.level || 0, MAX_BUILD_LEVEL));
    if (!level) return;
    if (level >= MAX_BUILD_LEVEL) {
      const hotel = makeHotel();
      hotel.position.set(0, TILE_H, -tile.d / 2 + 0.22);
      tile.buildings.add(hotel);
      return;
    }
    const gap = Math.min(0.32, (tile.w - 0.28) / level);
    const span = (level - 1) * gap;
    for (let i = 0; i < level; i++) {
      const house = makeHouse();
      house.position.set(-span / 2 + i * gap, TILE_H, -tile.d / 2 + 0.18);
      tile.buildings.add(house);
    }
  }

  _syncTokens(state) {
    const sig = state.players.map((p) => `${p.id}:${p.shape}:${p.color}`).join("|");
    if (sig !== this._tokenSig) {
      this._tokenSig = sig;
      for (const token of this.tokenMap.values()) this.boardRoot.remove(token);
      this.tokenMap.clear();
      for (const player of state.players) {
        const token = buildToken(player.shape, player.color);
        token.userData.id = player.id;
        token.userData.jitter = ((player.id * 17) % 7) * 0.03 - 0.09;
        token.userData.busy = false;
        this.boardRoot.add(token);
        this.tokenMap.set(player.id, token);
      }
    }
    const groups = new Map();
    for (const player of state.players) {
      const token = this.tokenMap.get(player.id);
      if (!token) continue;
      if (player.bankrupt) {
        token.visible = false;
        continue;
      }
      token.visible = true;
      if (!groups.has(player.position)) groups.set(player.position, []);
      groups.get(player.position).push(player);
    }
    for (const [index, list] of groups) {
      list.sort((a, b) => a.id - b.id);
      list.forEach((player, slot) => {
        const token = this.tokenMap.get(player.id);
        if (!token || token.userData.busy) return;
        token.position.copy(this._anchor(index, slot, list.length));
        this._faceIndex(token, index);
      });
    }
    const current = state.players[state.turn];
    const token = current && this.tokenMap.get(current.id);
    if (token && !current.bankrupt && state.phase !== "ended") {
      token.add(this.ring);
      this.ring.visible = true;
    } else this.ring.visible = false;
  }

  _anchor(index, slot, count) {
    const tile = this.tiles[index];
    const cols = count >= 3 ? 2 : Math.max(1, count);
    const col = slot % cols;
    const row = Math.floor(slot / cols);
    const gx = Math.min(0.34, (tile.w - 0.4) / Math.max(1, cols));
    const ox = (col - (cols - 1) / 2) * gx;
    const oz = tile.d / 2 - 0.48 - row * 0.3;
    const v = new THREE.Vector3(ox, TILE_H, oz);
    tile.group.updateWorldMatrix(true, false);
    tile.group.localToWorld(v);
    this.boardRoot.worldToLocal(v);
    return v;
  }

  _faceIndex(token, index) {
    const a = this.tiles[index].group.position;
    const b = this.tiles[(index + 1) % 40].group.position;
    token.rotation.set(0, Math.atan2(b.x - a.x, b.z - a.z) + (token.userData.jitter || 0), 0);
  }

  _occupancy(index, movingId) {
    const ids = [];
    for (const player of this._players) {
      if (player.bankrupt || player.id === movingId) continue;
      if (player.position === index) ids.push(player.id);
    }
    ids.push(movingId);
    ids.sort((a, b) => a - b);
    return { slot: Math.max(0, ids.indexOf(movingId)), count: ids.length };
  }

  _highlightAt(index) {
    const tile = this.tiles[index];
    if (!tile) {
      this.highlight.visible = false;
      return;
    }
    tile.group.add(this.highlight);
    this.highlight.position.set(0, TILE_H + 0.012, 0);
    const t = 0.05;
    const { w, d } = tile;
    this._frameParts[0].scale.set(w, t, 1);
    this._frameParts[0].position.set(0, 0, d / 2 - t / 2);
    this._frameParts[1].scale.set(w, t, 1);
    this._frameParts[1].position.set(0, 0, -d / 2 + t / 2);
    this._frameParts[2].scale.set(t, d, 1);
    this._frameParts[2].position.set(w / 2 - t / 2, 0, 0);
    this._frameParts[3].scale.set(t, d, 1);
    this._frameParts[3].position.set(-w / 2 + t / 2, 0, 0);
    this.highlight.visible = true;
  }

  async walk(playerId, from, steps, fast) {
    const token = this.tokenMap.get(playerId);
    if (!token || steps <= 0) return;
    const gen = this._gen;
    token.userData.busy = true;
    const stepMs = fast ? 85 : 175;
    try {
      for (let i = 1; i <= steps; i++) {
        if (this._gen !== gen) return;
        const index = (from + i) % 40;
        const occ = this._occupancy(index, playerId);
        const dest = this._anchor(index, occ.slot, occ.count);
        const start = token.position.clone();
        token.rotation.set(
          0,
          Math.atan2(dest.x - start.x, dest.z - start.z) + (token.userData.jitter || 0),
          0
        );
        this._highlightAt(index);
        await this._hop(token, start, dest, stepMs, gen);
      }
    } finally {
      if (this._gen === gen) token.userData.busy = false;
    }
  }

  _hop(token, start, dest, ms, gen) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const frame = (now) => {
        if (this._gen !== gen) {
          token.rotation.x = 0;
          resolve();
          return;
        }
        const t = Math.min(1, (now - t0) / ms);
        const e = t * t * (3 - 2 * t);
        token.position.lerpVectors(start, dest, e);
        token.position.y = start.y + (dest.y - start.y) * e + Math.sin(Math.PI * t) * 0.36;
        token.rotation.x = Math.sin(Math.PI * t) * -0.3;
        if (t < 1) requestAnimationFrame(frame);
        else {
          token.position.copy(dest);
          token.rotation.x = 0;
          resolve();
        }
      };
      requestAnimationFrame(frame);
    });
  }

  _bindPointer() {
    let down = null;
    this.canvas.addEventListener("pointerdown", (ev) => {
      down = { x: ev.clientX, y: ev.clientY };
      this._cam = null;
    });
    this.canvas.addEventListener("pointerup", (ev) => {
      if (!down) return;
      const dx = ev.clientX - down.x;
      const dy = ev.clientY - down.y;
      down = null;
      if (dx * dx + dy * dy > 36) return;
      const index = this._pick(ev);
      if (index != null) this.onPick?.(index);
    });
    this.canvas.addEventListener("pointermove", (ev) => {
      const index = this._pick(ev);
      this.canvas.style.cursor = index == null ? "grab" : "pointer";
      this.onHover?.(index, ev.clientX, ev.clientY);
    });
    this.canvas.addEventListener("pointerleave", () => {
      this.canvas.style.cursor = "grab";
      this.onHover?.(null, 0, 0);
    });
    this.canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());
  }

  _pick(ev) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    this._ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this._ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._ndc, this.camera);
    const hits = this._raycaster.intersectObjects(this._pickables, false);
    if (!hits.length) return null;
    const index = hits[0].object.userData.index;
    return index == null ? null : index;
  }

  _frame(now) {
    this._raf = requestAnimationFrame((t) => this._frame(t));
    if (this._cam) {
      const k = Math.min(1, (now - this._cam.t0) / this._cam.dur);
      const e = k * k * (3 - 2 * k);
      this.camera.position.lerpVectors(this._cam.fp, this._cam.tp, e);
      this.controls.target.lerpVectors(this._cam.ft, this._cam.tt, e);
      if (k >= 1) this._cam = null;
    }
    if (this.highlightMat) {
      this.highlightMat.opacity = 0.72 + Math.sin(now * 0.004) * 0.22;
    }
    if (this.ring?.material) {
      this.ring.material.emissiveIntensity = 0.28 + Math.sin(now * 0.005) * 0.22;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
