// normalmap.js — per-pixel normal-mapped lighting for a sprite, on the CPU.
//
// Our sprites ship a companion normal map (derived procedurally in the Python
// pipeline). Given a light direction, this relights the sprite's albedo through
// that normal map into an offscreen canvas — real 2.5D shading on pixel art.
// Albedo/normal pixels are read once and cached; only the lit output is rebuilt
// per call (sprites are small — a boss is ~56x84 — so this is cheap).

const srcCache = new WeakMap(); // Image -> { w, h, px:Uint8ClampedArray }
const outCache = new WeakMap(); // albedo Image -> { canvas, ctx, id }

function pixelsOf(img) {
  let d = srcCache.get(img);
  if (d) return d;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const cx = c.getContext("2d", { willReadFrequently: true });
  cx.imageSmoothingEnabled = false;
  cx.drawImage(img, 0, 0);
  d = { w: img.width, h: img.height, px: cx.getImageData(0, 0, img.width, img.height).data };
  srcCache.set(img, d);
  return d;
}

// Returns a canvas the size of `albedo`, lit by direction (lx,ly,lz) with the
// given ambient floor (0..1) and light colour multipliers. Falls back to the
// raw albedo image if the normal map is missing.
export function litSprite(albedo, normal, lx, ly, lz, ambient = 0.45, colR = 1, colG = 1, colB = 1) {
  if (!normal) return albedo;
  const A = pixelsOf(albedo), N = pixelsOf(normal);
  if (A.w !== N.w || A.h !== N.h) return albedo;
  const w = A.w, h = A.h;

  let o = outCache.get(albedo);
  if (!o) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const cx = c.getContext("2d");
    o = { canvas: c, ctx: cx, id: cx.createImageData(w, h) };
    outCache.set(albedo, o);
  }

  const inv = 1 / (Math.hypot(lx, ly, lz) || 1);
  lx *= inv; ly *= inv; lz *= inv;
  const a = A.px, n = N.px, out = o.id.data;
  for (let i = 0; i < a.length; i += 4) {
    const al = a[i + 3];
    if (al === 0) { out[i + 3] = 0; continue; }
    // decode normal (rgb 0..255 -> -1..1); flat (no normal) reads as +Z
    const nx = n[i] / 127.5 - 1, ny = n[i + 1] / 127.5 - 1, nz = n[i + 2] / 127.5 - 1;
    let diff = nx * lx + ny * ly + nz * lz;
    if (diff < 0) diff = 0;
    const s = ambient + diff * (1 - ambient);
    const r = a[i] * s * colR, g = a[i + 1] * s * colG, b = a[i + 2] * s * colB;
    out[i] = r > 255 ? 255 : r;
    out[i + 1] = g > 255 ? 255 : g;
    out[i + 2] = b > 255 ? 255 : b;
    out[i + 3] = al;
  }
  o.ctx.putImageData(o.id, 0, 0);
  return o.canvas;
}
