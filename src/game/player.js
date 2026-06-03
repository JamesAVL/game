// player.js — the party: Vince leads, Howard follows a breadcrumb trail.
// Handles 4-direction movement, tile collision, and walk animation.

import { Input, TILE } from "../engine/core.js";
import { drawFrame } from "../engine/gfx.js";
import { img } from "../engine/core.js";

const SPEED = 70;            // px / second
const FW = 16, FH = 24;      // character frame size
const ROW = { down: 0, up: 1, left: 2, right: 3 };
const ANIM = [0, 1, 2, 3];   // walk frame order
const FRAME_T = 0.12;

export class Party {
  constructor(px, py, dir = "down") {
    this.px = px; this.py = py;       // sprite top-left
    this.dir = dir;
    this.moving = false;
    this.animT = 0; this.frame = 0;
    this.trail = [];
    this.gap = 14;                    // breadcrumbs between Vince and Howard
    this.frozen = false;              // disable control during cutscenes
  }

  // feet collision box
  box() { return { x: this.px + 3, y: this.py + 17, w: 10, h: 6 }; }
  centerX() { return this.px + 8; }
  feetY() { return this.py + 23; }

  // the tile-center point the player is facing (for interaction)
  interactPoint() {
    const cx = this.px + 8, cy = this.py + 20;
    const d = { up: [0, -TILE], down: [0, TILE], left: [-TILE, 0], right: [TILE, 0] }[this.dir];
    return { x: cx + d[0], y: cy + d[1] };
  }

  update(dt, tm) {
    let dx = 0, dy = 0;
    if (!this.frozen) {
      if (Input.isDown("left")) dx -= 1;
      if (Input.isDown("right")) dx += 1;
      if (Input.isDown("up")) dy -= 1;
      if (Input.isDown("down")) dy += 1;
    }
    this.moving = (dx !== 0 || dy !== 0);
    if (dx !== 0 && dy !== 0) { const k = Math.SQRT1_2; dx *= k; dy *= k; }

    if (this.moving) {
      // facing: favour vertical when both pressed equally
      if (dy < 0 && Math.abs(dy) >= Math.abs(dx)) this.dir = "up";
      else if (dy > 0 && Math.abs(dy) >= Math.abs(dx)) this.dir = "down";
      else if (dx < 0) this.dir = "left";
      else if (dx > 0) this.dir = "right";

      const nx = this.px + dx * SPEED * dt;
      const ny = this.py + dy * SPEED * dt;
      // resolve axes independently against the feet box
      let b = this.box();
      if (!tm.boxHits(nx + 3, b.y, b.w, b.h)) this.px = nx;
      b = this.box();
      if (!tm.boxHits(b.x, ny + 17, b.w, b.h)) this.py = ny;

      this.animT += dt;
      if (this.animT >= FRAME_T) { this.animT -= FRAME_T; this.frame = (this.frame + 1) % ANIM.length; }

      // record a breadcrumb
      this.trail.push({ x: this.px, y: this.py, dir: this.dir });
      if (this.trail.length > 80) this.trail.shift();
    } else {
      this.frame = 0; this.animT = 0;
    }
  }

  // Howard's position from the breadcrumb trail
  followerPose() {
    const i = this.trail.length - 1 - this.gap;
    if (i >= 0) return this.trail[i];
    return { x: this.px, y: this.py + 2, dir: this.dir };
  }

  drawables() {
    const vCol = ANIM[this.frame];
    const f = this.followerPose();
    const hFrame = this.moving ? this.frame : 0;
    const draws = [];
    // Howard (follower)
    draws.push({
      y: f.y + 23,
      draw: (ctx, cam) => drawFrame(ctx, img("howard"), FW, FH, ANIM[hFrame], ROW[f.dir], f.x - cam.x, f.y - cam.y),
    });
    // Vince (lead)
    draws.push({
      y: this.feetY(),
      draw: (ctx, cam) => drawFrame(ctx, img("vince"), FW, FH, vCol, ROW[this.dir], this.px - cam.x, this.py - cam.y),
    });
    return draws;
  }
}
