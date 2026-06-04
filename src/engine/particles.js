// particles.js — lightweight game-feel layer: a pooled particle system and a
// global screen-shake. Both are drawn into the scene buffer each frame (before
// the renderer presents), so the post-FX bloom turns bright/additive particles
// into real glow for free.
//
// Particles live in screen space (the same coordinates scenes draw in). The
// loop applies Juice's shake offset around the whole frame, so a single
// Juice.shake() call kicks everything — HUD included — like classic arcade juice.

const MAX = 600;

class ParticleSystem {
  constructor() {
    // structure-of-arrays pool for cheap updates
    this.x = new Float32Array(MAX);
    this.y = new Float32Array(MAX);
    this.vx = new Float32Array(MAX);
    this.vy = new Float32Array(MAX);
    this.life = new Float32Array(MAX); // remaining seconds
    this.max = new Float32Array(MAX); // initial life
    this.size = new Float32Array(MAX);
    this.r = new Uint8Array(MAX);
    this.g = new Uint8Array(MAX);
    this.b = new Uint8Array(MAX);
    this.grav = new Float32Array(MAX);
    this.drag = new Float32Array(MAX);
    this.n = 0; // high-water mark of live slots
  }

  _spawn(x, y, vx, vy, life, size, rgb, grav, drag) {
    let i = this.n < MAX ? this.n++ : this._recycle();
    if (i < 0) return;
    this.x[i] = x; this.y[i] = y; this.vx[i] = vx; this.vy[i] = vy;
    this.life[i] = life; this.max[i] = life; this.size[i] = size;
    this.r[i] = rgb[0]; this.g[i] = rgb[1]; this.b[i] = rgb[2];
    this.grav[i] = grav; this.drag[i] = drag;
  }

  _recycle() {
    // overwrite the shortest-lived particle when the pool is full
    let mi = -1, ml = Infinity;
    for (let i = 0; i < this.n; i++) if (this.life[i] < ml) { ml = this.life[i]; mi = i; }
    return mi;
  }

  // Radial burst of `count` particles. opts: { color:[r,g,b], speed, spread,
  // life, size, gravity, drag, dir (radians, default full circle) }
  burst(x, y, count, opts = {}) {
    const col = opts.color || [255, 230, 120];
    const speed = opts.speed ?? 60;
    const life = opts.life ?? 0.5;
    const size = opts.size ?? 2;
    const grav = opts.gravity ?? 0;
    const drag = opts.drag ?? 2.5;
    const spread = opts.spread ?? Math.PI * 2;
    const base = opts.dir ?? 0;
    for (let k = 0; k < count; k++) {
      const a = base + (spread >= Math.PI * 2 ? Math.random() * Math.PI * 2 : base + (Math.random() - 0.5) * spread);
      const sp = speed * (0.4 + Math.random() * 0.6);
      this._spawn(
        x, y,
        Math.cos(a) * sp, Math.sin(a) * sp,
        life * (0.6 + Math.random() * 0.6),
        size * (0.7 + Math.random() * 0.6),
        col, grav, drag,
      );
    }
  }

  update(dt) {
    let hi = 0;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) continue;
      const d = 1 - this.drag[i] * dt;
      this.vx[i] *= d > 0 ? d : 0;
      this.vy[i] = this.vy[i] * (d > 0 ? d : 0) + this.grav[i] * dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      hi = i + 1;
    }
    this.n = hi;
  }

  draw(ctx) {
    if (this.n === 0) return;
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter"; // additive -> overlaps brighten -> bloom
    for (let i = 0; i < this.n; i++) {
      const l = this.life[i];
      if (l <= 0) continue;
      const a = Math.min(1, l / this.max[i]);
      const s = this.size[i] * (0.4 + 0.6 * a);
      ctx.globalAlpha = a;
      ctx.fillStyle = `rgb(${this.r[i]},${this.g[i]},${this.b[i]})`;
      ctx.fillRect(this.x[i] - s, this.y[i] - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = prev;
  }

  clear() { this.n = 0; }
}

class ScreenShake {
  constructor() {
    this.amp = 0; this.t = 0; this.dur = 0;
    this.freezeT = 0;                 // remaining hit-stop seconds (sim paused)
    this.flashT = 0; this.flashDur = 0; this.flashCol = "#fff"; this.flashA = 0;
  }
  // amp in internal pixels; dur in seconds. Stronger/longer wins.
  shake(amp, dur = 0.3) {
    if (amp >= this.amp || this.t <= 0) { this.amp = amp; this.t = dur; this.dur = dur; }
  }
  // hit-stop: briefly freeze the simulation for impact (the loop keeps drawing).
  freeze(sec) { this.freezeT = Math.max(this.freezeT, sec); }
  frozen() { return this.freezeT > 0; }
  tickFreeze(dt) { if (this.freezeT > 0) this.freezeT = Math.max(0, this.freezeT - dt); }
  // a quick full-screen colour flash (drawn by the loop, over everything).
  flash(color = "#fff", alpha = 0.6, dur = 0.18) { this.flashCol = color; this.flashA = alpha; this.flashT = dur; this.flashDur = dur; }
  update(dt) {
    if (this.t > 0) this.t = Math.max(0, this.t - dt);
    if (this.flashT > 0) this.flashT = Math.max(0, this.flashT - dt);
  }
  offset() {
    if (this.t <= 0) return { x: 0, y: 0 };
    const k = (this.t / this.dur) * this.amp;
    return { x: (Math.random() - 0.5) * 2 * k, y: (Math.random() - 0.5) * 2 * k };
  }
  // current flash alpha (0 when none); loop multiplies by configured strength.
  flashAlpha() { return this.flashDur > 0 ? (this.flashT / this.flashDur) * this.flashA : 0; }
  clear() { this.t = 0; this.amp = 0; this.freezeT = 0; this.flashT = 0; }
}

export const Particles = new ParticleSystem();
export const Juice = new ScreenShake();
