// gfx.js — text rendering (tinted bitmap font), sprite frames, camera, panels.

import { img, ctx as mainCtx, VIEW_W, VIEW_H } from "./core.js";

// ---------------------------------------------------------------------------
// Bitmap font  (matches tools/gen_font.py layout)
//   ASCII 32..126, 16 cols, cell 6x8, glyph 5x7.
// ---------------------------------------------------------------------------
const CELL_W = 6, CELL_H = 8, GLYPH_W = 5, GLYPH_H = 7, COLS = 16, FIRST = 32;
export const CHAR_W = GLYPH_W + 1; // advance
export const LINE_H = GLYPH_H + 3;

const tintCache = new Map();
function tinted(color) {
  if (tintCache.has(color)) return tintCache.get(color);
  const f = img("font");
  const c = document.createElement("canvas");
  c.width = f.width; c.height = f.height;
  const cx = c.getContext("2d");
  cx.drawImage(f, 0, 0);
  cx.globalCompositeOperation = "source-in";
  cx.fillStyle = color;
  cx.fillRect(0, 0, c.width, c.height);
  tintCache.set(color, c);
  return c;
}

export function textWidth(str, scale = 1) {
  let max = 0, w = 0;
  for (const ch of str) {
    if (ch === "\n") { max = Math.max(max, w); w = 0; }
    else w += CHAR_W * scale;
  }
  return Math.max(max, w) - scale; // drop trailing pad
}

export function drawText(ctx, str, x, y, opts = {}) {
  const { color = "#f4f4ff", scale = 1, shadow = null, maxWidth = 0 } = opts;
  str = String(str);
  if (maxWidth > 0) str = wrap(str, Math.floor(maxWidth / (CHAR_W * scale)));
  if (shadow) _draw(ctx, str, x + scale, y + scale, scale, shadow);
  _draw(ctx, str, x, y, scale, color);
  return str;
}

function _draw(ctx, str, x, y, scale, color) {
  const font = tinted(color);
  let cx = x, cy = y;
  for (const ch of str) {
    if (ch === "\n") { cx = x; cy += LINE_H * scale; continue; }
    const code = ch.charCodeAt(0);
    if (code < FIRST || code > 126) { cx += CHAR_W * scale; continue; }
    const idx = code - FIRST;
    const sx = (idx % COLS) * CELL_W;
    const sy = Math.floor(idx / COLS) * CELL_H;
    ctx.drawImage(font, sx, sy, GLYPH_W, GLYPH_H, Math.round(cx), Math.round(cy), GLYPH_W * scale, GLYPH_H * scale);
    cx += CHAR_W * scale;
  }
}

export function wrap(str, maxChars) {
  const out = [];
  for (const para of str.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      if (line.length + word.length + 1 > maxChars && line) { out.push(line); line = word; }
      else line = line ? line + " " + word : word;
    }
    out.push(line);
  }
  return out.join("\n");
}

export function textCentered(ctx, str, cx, y, opts = {}) {
  const w = textWidth(str, opts.scale || 1);
  drawText(ctx, str, Math.round(cx - w / 2), y, opts);
}

// ---------------------------------------------------------------------------
// Sprite frame helper
// ---------------------------------------------------------------------------
export function drawFrame(ctx, image, fw, fh, col, row, dx, dy, flip = false) {
  if (!image) return;
  dx = Math.round(dx); dy = Math.round(dy);
  if (flip) {
    ctx.save();
    ctx.translate(dx + fw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(image, col * fw, row * fh, fw, fh, 0, 0, fw, fh);
    ctx.restore();
  } else {
    ctx.drawImage(image, col * fw, row * fh, fw, fh, dx, dy, fw, fh);
  }
}

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------
export class Camera {
  constructor() { this.x = 0; this.y = 0; this.mapW = VIEW_W; this.mapH = VIEW_H; }
  setBounds(w, h) { this.mapW = w; this.mapH = h; }
  follow(tx, ty) {
    this.x = tx - VIEW_W / 2;
    this.y = ty - VIEW_H / 2;
    this.x = Math.max(0, Math.min(this.x, Math.max(0, this.mapW - VIEW_W)));
    this.y = Math.max(0, Math.min(this.y, Math.max(0, this.mapH - VIEW_H)));
  }
}

// ---------------------------------------------------------------------------
// UI panel — a soft rounded box with border, used for dialogue/menus.
// ---------------------------------------------------------------------------
export function panel(ctx, x, y, w, h, opts = {}) {
  const { fill = "rgba(20,16,40,0.92)", border = "#9a7adf", border2 = "#4a3a7a" } = opts;
  ctx.fillStyle = fill;
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillRect(x, y + 1, w, h - 2);
  ctx.fillStyle = border2;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = border;
  // corner accents
  ctx.fillRect(x + 1, y + 1, 2, 1); ctx.fillRect(x + 1, y + 1, 1, 2);
  ctx.fillRect(x + w - 3, y + 1, 2, 1); ctx.fillRect(x + w - 2, y + 1, 1, 2);
  ctx.fillRect(x + 1, y + h - 2, 2, 1); ctx.fillRect(x + 1, y + h - 3, 1, 2);
  ctx.fillRect(x + w - 3, y + h - 2, 2, 1); ctx.fillRect(x + w - 2, y + h - 3, 1, 2);
}

export function fillRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
}
