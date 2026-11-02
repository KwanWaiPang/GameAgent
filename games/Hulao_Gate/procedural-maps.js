/**
 * Procedural albedo and tangent-space normal maps for the Hulao battlefield.
 * Textures are generated on a canvas so the game stays free of third-party art.
 */

export function lcg(seed) {
  let state = seed >>> 0;
  return () => ((state = (1664525 * state + 1013904223) >>> 0) / 4294967296);
}

function dataColorSpace(T) {
  return T.NoColorSpace ?? T.LinearSRGBColorSpace;
}

export function makeCanvasTexture(T, canvas, srgb) {
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = srgb ? T.SRGBColorSpace : dataColorSpace(T);
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

export function normalFromCanvas(T, sourceCanvas, strength = 2) {
  const n = sourceCanvas.width;
  const ctx = sourceCanvas.getContext("2d");
  if (!n || !ctx || typeof ctx.getImageData !== "function" || typeof ctx.createImageData !== "function") return null;
  let src;
  try {
    src = ctx.getImageData(0, 0, n, n);
  } catch {
    return null;
  }
  if (!src?.data || src.data.length < n * n * 4) return null;
  const outCanvas = document.createElement("canvas");
  outCanvas.width = outCanvas.height = n;
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx || typeof outCtx.createImageData !== "function") return null;
  const out = outCtx.createImageData(n, n);
  const sample = (x, y) => {
    const px = (x + n) % n;
    const py = (y + n) % n;
    const i = (py * n + px) * 4;
    return (src.data[i] + src.data[i + 1] + src.data[i + 2]) / (255 * 3);
  };
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = (sample(x + 1, y) - sample(x - 1, y)) * strength;
      const dy = (sample(x, y + 1) - sample(x, y - 1)) * strength;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const i = (y * n + x) * 4;
      out.data[i] = Math.round((-dx * inv * 0.5 + 0.5) * 255);
      out.data[i + 1] = Math.round((-dy * inv * 0.5 + 0.5) * 255);
      out.data[i + 2] = Math.round((inv * 0.5 + 0.5) * 255);
      out.data[i + 3] = 255;
    }
  }
  outCtx.putImageData(out, 0, 0);
  return makeCanvasTexture(T, outCanvas, false);
}

/** Colored or grayscale canvas plus a matching normal map. Material color should stay white when the canvas carries the hue. */
export function detailTextures(T, draw, size = 256, strength = 1.6) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  draw(ctx, size);
  const map = makeCanvasTexture(T, canvas, true);
  const normalMap = normalFromCanvas(T, canvas, strength);
  return { map, normalMap };
}

export function assignDetail(T, material, detail, repeatX = 1, repeatY = 1, normalScale = 0.6) {
  if (!detail?.map) return;
  detail.map.repeat.set(repeatX, repeatY);
  material.map = detail.map;
  if (detail.normalMap) {
    detail.normalMap.repeat.set(repeatX, repeatY);
    material.normalMap = detail.normalMap;
    material.normalScale = new T.Vector2(normalScale, normalScale);
  }
  material.needsUpdate = true;
}
