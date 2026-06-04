// crimp.js — the "crimp-off" rhythm battle. Notes fall down 4 lanes to a hit
// line in time with an original chiptune track; landing them fills YOUR crimp
// meter and drains the boss's. Out-crimp them before the song ends to win.

import { Scenes, VIEW_W, VIEW_H, ART, Input, img, clamp } from "../engine/core.js";
import { drawText, textCentered, panel, drawFrame } from "../engine/gfx.js";
import { Sfx, playMusic, stopMusic, audioTime } from "../engine/audio.js";
import { GS } from "./state.js";

const LANE_W = 24 * ART;
const GAP = 8 * ART;
const TOP_Y = 16 * ART;
const HIT_Y = 150 * ART;

// Lanes are directional and their count scales with difficulty. Each lane maps
// to one of the movement Input actions (unused during a crimp) so the arrow
// keys are the primary input with no keymap changes. Colours are keyed by
// direction so they stay stable regardless of how many lanes are shown.
const DIFF_LANES = { easy: 2, normal: 3, hard: 4 };
const DIR_SETS = { 2: ["left", "right"], 3: ["left", "up", "right"], 4: ["left", "up", "down", "right"] };
const DIR_COL = { left: "#ff5a8a", up: "#ffd24a", down: "#5ad6ff", right: "#8aff6a" };

// Per-difficulty tuning. minGap thins the chart to a max note density (also
// drops impossible 16th-runs/chords). Wider windows + a head start + gentler
// misses on easier modes. The song always finishes; you win if you >= boss.
const DIFF = {
  easy:   { perfWin: 0.11, goodWin: 0.22, minGap: 0.24, travel: 1.9, startYou: 62, missYou: 0.4, missBoss: 0.6 },
  normal: { perfWin: 0.09, goodWin: 0.18, minGap: 0.17, travel: 1.7, startYou: 56, missYou: 0.7, missBoss: 1.0 },
  hard:   { perfWin: 0.07, goodWin: 0.15, minGap: 0.12, travel: 1.5, startYou: 50, missYou: 1.0, missBoss: 1.3 },
};

export class Crimp {
  // def: { boss, name, face, track, bpm, notes:[[step,lane]...], lyrics:[[beat,text]],
  //        startStyle, intro, onResult(win) }
  constructor(def) {
    this.def = def;
    this.D = DIFF[GS.data.difficulty] || DIFF.normal;
    this.travel = this.D.travel;
    this.you = this.D.startYou; this.boss = 50;
    this.combo = 0; this.maxCombo = 0;
    this.hits = 0; this.perfects = 0;
    this.judge = ""; this.judgeT = 0; this.judgeCol = "#fff";
    this.state = "count";        // count -> play -> over
    this.countT = 3.0;
    this.shake = 0;
    this.result = null;

    // lane layout from difficulty
    this.laneCount = DIFF_LANES[GS.data.difficulty] || 3;
    this.dirs = DIR_SETS[this.laneCount];
    this.laneCols = this.dirs.map((d) => DIR_COL[d]);
    this.totalW = this.laneCount * LANE_W + (this.laneCount - 1) * GAP;
    this.x0 = (VIEW_W - this.totalW) / 2 + 20 * ART;
    this.flashLane = new Array(this.laneCount).fill(0);

    const sd = 60 / def.bpm / 4;  // seconds per 16th step
    // remap each chart lane (authored 0..3) onto the active lane count, keeping
    // its left->right position; deterministic so charts stay reproducible.
    const remap = (lane) => Math.min(this.laneCount - 1, Math.floor(lane * this.laneCount / 4));
    const raw = def.notes.map(([step, lane]) => ({ t: step * sd, lane: remap(lane), dead: false }))
      .sort((a, b) => a.t - b.t);
    // enforce a global minimum spacing so charts can't be denser than playable
    this.notes = [];
    let lastT = -Infinity;
    for (const n of raw) {
      if (n.t - lastT >= this.D.minGap) { this.notes.push(n); lastT = n.t; }
    }
    this.total = this.notes.length;
    this.lyrics = (def.lyrics || []).map(([beat, text]) => ({ t: beat * (60 / def.bpm), text }));
    this.lastT = this.notes.length ? this.notes[this.notes.length - 1].t : 4;
    this.danceT = 0;
  }

  enter() { Sfx.confirm(); }
  exit() { stopMusic(); }

  now() { return audioTime() - this.startAudio; }

  begin() {
    this.startAudio = audioTime() + 0.001;
    playMusic(this.def.track);
    this.state = "play";
  }

  finish(win) {
    this.state = "over";
    this.overT = 0;
    this.result = win;
    stopMusic();
    if (win) Sfx.win(); else Sfx.lose();
  }

  judgeHit(kind) {
    const D = this.D;
    if (kind === "perfect") { this.you += 4.6; this.boss -= 4.8; this.perfects++; this.hits++; this.combo++; Sfx.perfect(); this.judge = "CRIMP!"; this.judgeCol = "#ffd86a"; }
    else if (kind === "good") { this.you += 3.2; this.boss -= 3.4; this.hits++; this.combo++; Sfx.hit(); this.judge = "GOOD"; this.judgeCol = "#8aff6a"; }
    else { this.you -= 2.4 * D.missYou; this.boss += 2.0 * D.missBoss; this.combo = 0; Sfx.miss(); this.judge = "FLUFF!"; this.judgeCol = "#ff6a6a"; this.shake = 0.2; }
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    if (this.combo > 0 && this.combo % 10 === 0) { this.you += 2; this.boss -= 1; }
    this.you = clamp(this.you, 0, 100);
    this.boss = clamp(this.boss, 0, 100);
    this.judgeT = 0.5;
  }

  tryLane(lane) {
    const t = this.now();
    let best = null, bestD = 1e9;
    for (const n of this.notes) {
      if (n.dead || n.lane !== lane) continue;
      const d = Math.abs(n.t - t);
      if (d < bestD) { bestD = d; best = n; }
      if (n.t - t > 0.3) break;
    }
    this.flashLane[lane] = 0.12;
    if (best && bestD <= this.D.goodWin) {
      best.dead = true;
      this.judgeHit(bestD <= this.D.perfWin ? "perfect" : "good");
    } else {
      // empty/mistimed tap: only breaks the combo (no meter penalty -> forgiving)
      this.combo = 0;
    }
  }

  update(dt) {
    this.danceT += dt;
    if (this.judgeT > 0) this.judgeT -= dt;
    if (this.shake > 0) this.shake -= dt;
    for (let i = 0; i < this.laneCount; i++) if (this.flashLane[i] > 0) this.flashLane[i] -= dt;

    if (this.state === "count") {
      this.countT -= dt;
      if (this.countT <= 0) this.begin();
      return;
    }

    if (this.state === "play") {
      // lane input — arrow keys / touch arrows mapped per lane direction
      for (let i = 0; i < this.laneCount; i++) if (Input.pressed(this.dirs[i])) this.tryLane(i);
      const t = this.now();
      // missed notes (passed hit line without being struck)
      for (const n of this.notes) {
        if (!n.dead && n.t < t - this.D.goodWin) { n.dead = true; this.judgeHit("miss"); }
      }
      // resolve: no mid-song loss -- the song always finishes, then you win if
      // you're ahead. An early KO (boss emptied) ends it triumphantly.
      if (this.boss <= 0) { this.finish(true); }
      else if (t > this.lastT + 1.2) { this.finish(this.you >= this.boss); }
      return;
    }

    if (this.state === "over") {
      this.overT += dt;
      const tapped = Input.pressed("confirm") || Input.pressed("cancel") ||
        Input.pressed("left") || Input.pressed("up") || Input.pressed("down") || Input.pressed("right");
      if (this.overT > 1.0 && tapped) {
        const cb = this.def.onResult;
        Scenes.pop();
        if (cb) cb(this.result);
      }
    }
  }

  laneX(i) { return this.x0 + i * (LANE_W + GAP); }

  render(ctx) {
    // ---- backdrop ----
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, this.def.bg0 || "#1a1140");
    g.addColorStop(1, this.def.bg1 || "#3a1a5a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    let sx = 0, sy = 0;
    if (this.shake > 0) { sx = (Math.random() - 0.5) * 4 * ART; sy = (Math.random() - 0.5) * 4 * ART; }
    ctx.save(); ctx.translate(sx, sy);

    // ---- boss sprite, bobbing ----
    // bossScale stays as-is: the PNG is baked ART× larger and the canvas is ART×
    // larger too, so the boss keeps the same on-screen fraction automatically.
    const bim = img(this.def.face);
    if (bim) {
      const scale = this.def.bossScale || 2;
      const bw = bim.width * scale, bh = bim.height * scale;
      const bob = Math.sin(this.danceT * 6) * 3 * ART;
      ctx.drawImage(bim, VIEW_W / 2 - bw / 2 + 40 * ART, 30 * ART + bob - bh / 2 + 30 * ART, bw, bh);
    }

    // ---- lanes (directional receptors) ----
    const recR = 8 * ART;
    for (let i = 0; i < this.laneCount; i++) {
      const lx = this.laneX(i), cx = lx + LANE_W / 2;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(lx, TOP_Y, LANE_W, HIT_Y - TOP_Y + 14 * ART);
      // receptor: a faint arrow outline, lit when struck
      const flash = this.flashLane[i] > 0;
      const cy = HIT_Y + 5 * ART;
      ctx.globalAlpha = flash ? 1 : 0.55;
      this._arrow(ctx, cx, cy, this.dirs[i], recR, this.laneCols[i], !flash);
      ctx.globalAlpha = 1;
    }

    // ---- notes (arrows falling toward the receptor) ----
    if (this.state !== "count") {
      const t = this.now();
      for (const n of this.notes) {
        if (n.dead) continue;
        const dt = n.t - t;
        if (dt > this.travel || dt < -0.25) continue;
        const prog = 1 - dt / this.travel;     // 0 at spawn, 1 at hit line
        const y = TOP_Y + prog * (HIT_Y - TOP_Y) + 5 * ART;
        const cx = this.laneX(n.lane) + LANE_W / 2;
        this._arrow(ctx, cx, y, this.dirs[n.lane], LANE_W * 0.42, this.laneCols[n.lane], false);
      }
    }

    // ---- HUD: meters ----
    this._meter(ctx, 6 * ART, 6 * ART, 90 * ART, "VINCE & HOWARD", this.you, "#5ad6ff");
    this._meter(ctx, VIEW_W - 96 * ART, 6 * ART, 90 * ART, this.def.name, this.boss, "#ff6a8a", true);

    if (this.combo >= 3) {
      textCentered(ctx, this.combo + " CRIMP COMBO", VIEW_W / 2, 30 * ART, { color: "#ffd86a", shadow: "#000" });
    }
    if (this.judgeT > 0) {
      const s = this.judgeT > 0.4 ? 2 : 1;
      textCentered(ctx, this.judge, VIEW_W / 2, 120 * ART, { color: this.judgeCol, scale: s, shadow: "#000" });
    }

    // current lyric
    const t = this.now();
    let line = this.def.intro || "";
    for (const ly of this.lyrics) if (t >= ly.t) line = ly.text;
    if (line) {
      panel(ctx, 30 * ART, VIEW_H - 16 * ART, VIEW_W - 60 * ART, 14 * ART);
      textCentered(ctx, line, VIEW_W / 2, VIEW_H - 13 * ART, { color: "#fff2c0" });
    }

    ctx.restore();

    if (this.state === "count") {
      const n = Math.ceil(this.countT);
      const label = n > 0 ? String(n) : "CRIMP!";
      textCentered(ctx, label, VIEW_W / 2, VIEW_H / 2 - 16 * ART, { color: "#ffd86a", scale: 4, shadow: "#000" });
      textCentered(ctx, "Hit the ARROW keys in time!", VIEW_W / 2, VIEW_H - 30 * ART, { color: "#cfcfe6" });
    }

    if (this.state === "over") {
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      const win = this.result;
      textCentered(ctx, win ? "CRIMP VICTORY!" : "OUT-CRIMPED...", VIEW_W / 2, 56 * ART, { color: win ? "#ffd86a" : "#ff7a7a", scale: 2, shadow: "#000" });
      const acc = this.total ? Math.round((this.hits / this.total) * 100) : 0;
      textCentered(ctx, "Accuracy " + acc + "%   Max combo " + this.maxCombo, VIEW_W / 2, 88 * ART, { color: "#fff" });
      textCentered(ctx, win ? "You feel the funk flow through you." : "Shake it off and try again.", VIEW_W / 2, 102 * ART, { color: "#cfcfe6" });
      if (this.overT > 1.0 && Math.floor(performance.now() / 400) % 2 === 0)
        textCentered(ctx, "press Z  /  tap a lane", VIEW_W / 2, 130 * ART, { color: "#9a7adf" });
    }
  }

  // a filled (or outlined) equilateral-ish arrow of "radius" r pointing `dir`
  _arrow(ctx, cx, cy, dir, r, col, outline = false) {
    const b = r * 0.78;            // half-width of the base
    let pts;
    if (dir === "up") pts = [[cx, cy - r], [cx - b, cy + b], [cx + b, cy + b]];
    else if (dir === "down") pts = [[cx, cy + r], [cx - b, cy - b], [cx + b, cy - b]];
    else if (dir === "left") pts = [[cx - r, cy], [cx + b, cy - b], [cx + b, cy + b]];
    else pts = [[cx + r, cy], [cx - b, cy - b], [cx - b, cy + b]]; // right
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.lineTo(pts[1][0], pts[1][1]);
    ctx.lineTo(pts[2][0], pts[2][1]);
    ctx.closePath();
    if (outline) {
      ctx.strokeStyle = col; ctx.lineWidth = 2 * ART; ctx.lineJoin = "round"; ctx.stroke();
    } else {
      ctx.fillStyle = col; ctx.fill();
      // glossy top edge for a bit of depth
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1 * ART; ctx.lineJoin = "round"; ctx.stroke();
    }
  }

  _meter(ctx, x, y, w, label, val, col, right = false) {
    drawText(ctx, label, x, y, { color: "#fff", shadow: "#000", scale: 1 });
    const by = y + 9 * ART, h = 7 * ART;
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(x, by, w, h);
    const fw = Math.round((w - 2 * ART) * val / 100);
    ctx.fillStyle = col;
    if (right) ctx.fillRect(x + 1 * ART + (w - 2 * ART - fw), by + 1 * ART, fw, h - 2 * ART);
    else ctx.fillRect(x + 1 * ART, by + 1 * ART, fw, h - 2 * ART);
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1 * ART;
    ctx.strokeRect(x + 0.5 * ART, by + 0.5 * ART, w - 1 * ART, h - 1 * ART);
  }
}

export function startCrimp(def) { Scenes.push(new Crimp(def)); }
