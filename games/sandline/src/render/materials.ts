import * as THREE from 'three';

export interface EnvironmentAssetStatus { requested: number; loaded: number; failed: string[]; textureBytes: number; }

function canvasTexture(paint: (ctx: CanvasRenderingContext2D, size: number) => void, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  paint(canvas.getContext('2d')!, size);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;
  return map;
}

function lit(name: string, color: string, map: THREE.Texture | null, roughness: number, metalness = 0) {
  const material = new THREE.MeshStandardMaterial({
    name, color, map, roughness, metalness, vertexColors: true,
  });
  return material;
}

/** Procedural stand-ins for the desert material slots. No external images. */
export function createEnvironmentMaterials() {
  const plasterMap = canvasTexture((ctx, size) => {
    ctx.fillStyle = '#efe2cc';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 1800; i++) {
      ctx.fillStyle = i % 3 ? 'rgba(120,96,70,0.08)' : 'rgba(255,248,230,0.16)';
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 6 + Math.random() * 18);
    }
  });
  const stoneMap = canvasTexture((ctx, size) => {
    ctx.fillStyle = '#d9c4a2';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 48) {
      for (let x = -20; x < size; x += 72) {
        ctx.fillStyle = (x + y) % 140 < 70 ? '#cbb492' : '#e6d3b4';
        ctx.fillRect(x + (y / 48 % 2) * 28, y + 2, 64, 42);
      }
    }
  });
  const pavingMap = canvasTexture((ctx, size) => {
    ctx.fillStyle = '#cbbfa8';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 32) for (let x = 0; x < size; x += 32) {
      ctx.fillStyle = (x + y) % 64 ? '#d8ccb4' : '#b7aa94';
      ctx.fillRect(x + 1, y + 1, 30, 30);
    }
  });
  const dirtMap = canvasTexture((ctx, size) => {
    ctx.fillStyle = '#c4a574';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 2400; i++) {
      ctx.fillStyle = 'rgba(90,60,30,0.15)';
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }
  });
  const brickMap = canvasTexture((ctx, size) => {
    ctx.fillStyle = '#8d7356';
    ctx.fillRect(0, 0, size, size);
    for (let row = 0; row < 8; row++) for (let col = -1; col < 5; col++) {
      const x = col * 64 + (row % 2) * 32;
      const y = row * 32;
      ctx.fillStyle = ['#a68462', '#b49270', '#967456', '#c4a484'][(row + col) & 3];
      ctx.fillRect(x + 2, y + 2, 60, 28);
    }
  });
  const woodMap = canvasTexture((ctx, size) => {
    ctx.fillStyle = '#8a6240';
    ctx.fillRect(0, 0, size, size);
    for (let x = 0; x < size; x += 14) {
      ctx.fillStyle = x % 28 ? '#a07850' : '#6e4c30';
      ctx.fillRect(x, 0, 10, size);
    }
  });
  const metalMap = canvasTexture((ctx, size) => {
    ctx.fillStyle = '#8e9894';
    ctx.fillRect(0, 0, size, size);
    for (let x = 0; x < size; x += 16) {
      const grad = ctx.createLinearGradient(x, 0, x + 16, 0);
      grad.addColorStop(0, '#5e6864');
      grad.addColorStop(0.4, '#d0d6d0');
      grad.addColorStop(1, '#6a746e');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, 16, size);
    }
  });
  const clothMap = canvasTexture((ctx, size) => {
    ctx.fillStyle = '#d7c8a2';
    ctx.fillRect(0, 0, size, size);
    for (let x = 0; x < size; x += 4) {
      ctx.fillStyle = 'rgba(80,70,40,0.15)';
      ctx.fillRect(x, 0, 1, size);
    }
  });
  const status: EnvironmentAssetStatus = { requested: 0, loaded: 0, failed: [], textureBytes: 0 };
  const materials = {
    plaster: lit('plaster', '#fff6e7', plasterMap, 0.92),
    stone: lit('stone', '#f0debf', stoneMap, 0.9),
    paving: lit('paving', '#e9deca', pavingMap, 0.94),
    dirt: lit('dirt', '#e2c897', dirtMap, 1),
    brick: lit('brick', '#e3d2b2', brickMap, 0.95),
    wood: lit('wood', '#dcc69e', woodMap, 0.86),
    metal: lit('metal', '#c5c5ad', metalMap, 0.55, 0.35),
    cloth: lit('cloth', '#bbb28f', clothMap, 1),
    glass: lit('glass', '#d5e4ea', null, 0.2, 0.15),
    grime: lit('grime', '#ffffff', null, 1),
    signs: lit('signs', '#f4efe4', null, 0.8),
    trim: lit('trim', '#e5d5b7', null, 0.8),
    hardware: lit('hardware', '#c8c8c0', null, 0.45, 0.4),
    dark: lit('dark', '#2a2622', null, 0.95),
    paint: lit('paint', '#d8cbb4', null, 0.9),
    roof: lit('roof', '#a86848', null, 0.92),
  };
  materials.grime.transparent = true;
  materials.grime.depthWrite = false;
  materials.grime.opacity = 0.35;
  return { materials, status, ready: Promise.resolve(status) };
}

export type EnvironmentMaterials = ReturnType<typeof createEnvironmentMaterials>['materials'];
export type EnvironmentMaterialKey = keyof EnvironmentMaterials;
