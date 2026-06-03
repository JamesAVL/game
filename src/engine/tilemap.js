// tilemap.js — renders a tile grid (ground + overlay layers) and answers
// collision queries. Built from authored text maps in world.js.

import { TILE, VIEW_W, VIEW_H } from "./core.js";

export class Tilemap {
  // grid/over: 2D arrays [y][x] of tile indices (-1 = empty). solids: 2D bool.
  constructor(tilesetImg, grid, solids, over) {
    this.img = tilesetImg;
    this.grid = grid;
    this.solids = solids;
    this.over = over || null;
    this.h = grid.length;
    this.w = grid[0].length;
    this.cols = tilesetImg ? Math.max(1, Math.floor(tilesetImg.width / TILE)) : 1;
    this.pxW = this.w * TILE;
    this.pxH = this.h * TILE;
  }

  solidAt(px, py) {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return true;
    return !!this.solids[ty][tx];
  }

  // Box collision: returns true if a w×h box at (x,y) hits a solid tile.
  boxHits(x, y, w, h) {
    return (
      this.solidAt(x, y) || this.solidAt(x + w - 1, y) ||
      this.solidAt(x, y + h - 1) || this.solidAt(x + w - 1, y + h - 1) ||
      this.solidAt(x + w / 2, y + h - 1) || this.solidAt(x + w / 2, y)
    );
  }

  _drawLayer(ctx, layer, cam) {
    if (!this.img) return;
    const x0 = Math.max(0, Math.floor(cam.x / TILE));
    const y0 = Math.max(0, Math.floor(cam.y / TILE));
    const x1 = Math.min(this.w, Math.ceil((cam.x + VIEW_W) / TILE));
    const y1 = Math.min(this.h, Math.ceil((cam.y + VIEW_H) / TILE));
    for (let ty = y0; ty < y1; ty++) {
      for (let tx = x0; tx < x1; tx++) {
        const t = layer[ty][tx];
        if (t < 0) continue;
        const sx = (t % this.cols) * TILE;
        const sy = Math.floor(t / this.cols) * TILE;
        ctx.drawImage(this.img, sx, sy, TILE, TILE,
          Math.round(tx * TILE - cam.x), Math.round(ty * TILE - cam.y), TILE, TILE);
      }
    }
  }

  renderGround(ctx, cam) { this._drawLayer(ctx, this.grid, cam); }
  renderOver(ctx, cam) { if (this.over) this._drawLayer(ctx, this.over, cam); }
}
