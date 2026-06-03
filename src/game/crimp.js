// crimp.js — the "crimp-off" rhythm battle. Notes fall down 4 lanes to a hit
// line in time with an original chiptune track; landing them fills YOUR crimp
// meter and drains the boss's. Out-crimp them before the song ends to win.

import { Scenes, VIEW_W, VIEW_H, Input, img, clamp } from "../engine/core.js";
import { drawText, textCentered, panel, drawFrame } from "../engine/gfx.js";
import { Sfx, playMusic, stopMusic, audioTime } from "../engine/audio.js";

const LANES = 4;
const LANE_W = 24;
const GAP = 8;
const TOTAL_W = LANES * LANE_W + (LANES - 1) * GAP;
const X0 = (VIEW_W - TOTAL_W) / 2 + 20;
const TOP_Y = 16;
const HIT_Y = 150;
const TRAVEL = 1.45;                 // seconds a note is visible before its hit time
const LANE_COL = ["#ff5a8a", "#ffd24a", "#5ad6ff", "#8aff6a"];
const LANE_KEY = ["lane0", "lane1", "lane2", "lane3"];
const LANE_LBL = ["D", "F", "J", "K"];

export class Crimp {
  // def: { boss, name, face, track, bpm, notes:[[step,lane]...], lyrics:[[beat,text]],
  //        startStyle, intro, onResult(win) }
  constructor(def) {
    this.def = def;
    this.you = 50; this.boss = 50;
    this.combo = 0; this.maxCombo = 0;
    this.hits = 0; this.perfects = 0; this.total = def.notes.length;
    this.judge = ""; this.judgeT = 0; this.judgeCol = "#fff";
    this.state = "count";        // count -> play -> over
    this.countT = 3.0;
    this.shake = 0;
    this.result = null;
    const sd = 60 / def.bpm / 4;  // seconds per 16th step
    this.notes = def.notes.map(([step, lane]) => ({ t: step * sd, lane, dead: false }))
      .sort((a, b) => a.t - b.t);
    this.lyrics = (def.lyrics || []).map(([beat, text]) => ({ t: beat * (60 / def.bpm), text }));
    this.lastT = this.notes.length ? this.notes[this.notes.length - 1].t : 4;
    this.flashLane = [0, 0, 0, 0];
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
    if (kind === "perfect") { this.you += 4.2; this.boss -= 4.2; this.perfects++; this.hits++; this.combo++; Sfx.perfect(); this.judge = "CRIMP!"; this.judgeCol = "#ffd86a"; }
    else if (kind === "good") { this.you += 2.6; this.boss -= 2.4; this.hits++; this.combo++; Sfx.hit(); this.judge = "GOOD"; this.judgeCol = "#8aff6a"; }
    else { this.you -= 3.0; this.boss += 3.0; this.combo = 0; Sfx.miss(); this.judge = "FLUFF!"; this.judgeCol = "#ff6a6a"; this.shake = 0.25; }
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
      if (n.t - t > 0.25) break;
    }
    this.flashLane[lane] = 0.12;
    if (best && bestD <= 0.16) {
      best.dead = true;
      this.judgeHit(bestD <= 0.06 ? "perfect" : "good");
    } else {
      // wasted press: mashing is punished so timing matters
      this.combo = 0;
      this.you = clamp(this.you - 1.1, 0, 100);
      this.boss = clamp(this.boss + 0.6, 0, 100);
    }
  }

  update(dt) {
    this.danceT += dt;
    if (this.judgeT > 0) this.judgeT -= dt;
    if (this.shake > 0) this.shake -= dt;
    for (let i = 0; i < LANES; i++) if (this.flashLane[i] > 0) this.flashLane[i] -= dt;

    if (this.state === "count") {
      this.countT -= dt;
      if (this.countT <= 0) this.begin();
      return;
    }

    if (this.state === "play") {
      // lane input
      for (let i = 0; i < LANES; i++) if (Input.pressed(LANE_KEY[i])) this.tryLane(i);
      const t = this.now();
      // missed notes (passed hit line without being struck)
      for (const n of this.notes) {
        if (!n.dead && n.t < t - 0.17) { n.dead = true; this.judgeHit("miss"); }
      }
      // resolve
      if (this.boss <= 0) { this.finish(true); }
      else if (this.you <= 0) { this.finish(false); }
      else if (t > this.lastT + 1.2) { this.finish(this.you >= this.boss); }
      return;
    }

    if (this.state === "over") {
      this.overT += dt;
      const tapped = Input.pressed("confirm") || Input.pressed("cancel") ||
        Input.pressed("lane0") || Input.pressed("lane1") || Input.pressed("lane2") || Input.pressed("lane3");
      if (this.overT > 1.0 && tapped) {
        const cb = this.def.onResult;
        Scenes.pop();
        if (cb) cb(this.result);
      }
    }
  }

  laneX(i) { return X0 + i * (LANE_W + GAP); }

  render(ctx) {
    // ---- backdrop ----
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, this.def.bg0 || "#1a1140");
    g.addColorStop(1, this.def.bg1 || "#3a1a5a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    let sx = 0, sy = 0;
    if (this.shake > 0) { sx = (Math.random() - 0.5) * 4; sy = (Math.random() - 0.5) * 4; }
    ctx.save(); ctx.translate(sx, sy);

    // ---- boss sprite, bobbing ----
    const bim = img(this.def.face);
    if (bim) {
      const scale = this.def.bossScale || 2;
      const bw = bim.width * scale, bh = bim.height * scale;
      const bob = Math.sin(this.danceT * 6) * 3;
      ctx.drawImage(bim, VIEW_W / 2 - bw / 2 + 40, 30 + bob - bh / 2 + 30, bw, bh);
    }

    // ---- lanes ----
    for (let i = 0; i < LANES; i++) {
      const lx = this.laneX(i);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(lx, TOP_Y, LANE_W, HIT_Y - TOP_Y + 14);
      // receptor
      const flash = this.flashLane[i] > 0;
      ctx.strokeStyle = LANE_COL[i];
      ctx.globalAlpha = flash ? 1 : 0.7;
      ctx.lineWidth = 2;
      ctx.strokeRect(lx + 2, HIT_Y, LANE_W - 4, 10);
      if (flash) { ctx.fillStyle = LANE_COL[i]; ctx.globalAlpha = 0.4; ctx.fillRect(lx + 2, HIT_Y, LANE_W - 4, 10); }
      ctx.globalAlpha = 1;
      drawText(ctx, LANE_LBL[i], lx + LANE_W / 2 - 2, HIT_Y + 13, { color: LANE_COL[i] });
    }

    // ---- notes ----
    if (this.state !== "count") {
      const t = this.now();
      for (const n of this.notes) {
        if (n.dead) continue;
        const dt = n.t - t;
        if (dt > TRAVEL || dt < -0.25) continue;
        const prog = 1 - dt / TRAVEL;          // 0 at spawn, 1 at hit line
        const y = TOP_Y + prog * (HIT_Y - TOP_Y);
        const lx = this.laneX(n.lane);
        this._note(ctx, lx + 2, y - 5, LANE_W - 4, 10, LANE_COL[n.lane]);
      }
    }

    // ---- HUD: meters ----
    this._meter(ctx, 6, 6, 90, "VINCE & HOWARD", this.you, "#5ad6ff");
    this._meter(ctx, VIEW_W - 96, 6, 90, this.def.name, this.boss, "#ff6a8a", true);

    if (this.combo >= 3) {
      textCentered(ctx, this.combo + " CRIMP COMBO", VIEW_W / 2, 30, { color: "#ffd86a", shadow: "#000" });
    }
    if (this.judgeT > 0) {
      const s = this.judgeT > 0.4 ? 2 : 1;
      textCentered(ctx, this.judge, VIEW_W / 2, 120, { color: this.judgeCol, scale: s, shadow: "#000" });
    }

    // current lyric
    const t = this.now();
    let line = this.def.intro || "";
    for (const ly of this.lyrics) if (t >= ly.t) line = ly.text;
    if (line) {
      panel(ctx, 30, VIEW_H - 16, VIEW_W - 60, 14);
      textCentered(ctx, line, VIEW_W / 2, VIEW_H - 13, { color: "#fff2c0" });
    }

    ctx.restore();

    if (this.state === "count") {
      const n = Math.ceil(this.countT);
      const label = n > 0 ? String(n) : "CRIMP!";
      textCentered(ctx, label, VIEW_W / 2, VIEW_H / 2 - 16, { color: "#ffd86a", scale: 4, shadow: "#000" });
      textCentered(ctx, "Hit  D F J K  (or arrow keys) in time!", VIEW_W / 2, VIEW_H - 30, { color: "#cfcfe6" });
    }

    if (this.state === "over") {
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      const win = this.result;
      textCentered(ctx, win ? "CRIMP VICTORY!" : "OUT-CRIMPED...", VIEW_W / 2, 56, { color: win ? "#ffd86a" : "#ff7a7a", scale: 2, shadow: "#000" });
      const acc = this.total ? Math.round((this.hits / this.total) * 100) : 0;
      textCentered(ctx, "Accuracy " + acc + "%   Max combo " + this.maxCombo, VIEW_W / 2, 88, { color: "#fff" });
      textCentered(ctx, win ? "You feel the funk flow through you." : "Shake it off and try again.", VIEW_W / 2, 102, { color: "#cfcfe6" });
      if (this.overT > 1.0 && Math.floor(performance.now() / 400) % 2 === 0)
        textCentered(ctx, "press Z  /  tap a lane", VIEW_W / 2, 130, { color: "#9a7adf" });
    }
  }

  _note(ctx, x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(x, y + 1, w, h - 2);
    ctx.fillRect(x + 1, y, w - 2, h);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(x + 1, y + 1, w - 2, 2);
  }

  _meter(ctx, x, y, w, label, val, col, right = false) {
    drawText(ctx, label, x, y, { color: "#fff", shadow: "#000", scale: 1 });
    const by = y + 9, h = 7;
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(x, by, w, h);
    const fw = Math.round((w - 2) * val / 100);
    ctx.fillStyle = col;
    if (right) ctx.fillRect(x + 1 + (w - 2 - fw), by + 1, fw, h - 2);
    else ctx.fillRect(x + 1, by + 1, fw, h - 2);
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, by + 0.5, w - 1, h - 1);
  }
}

export function startCrimp(def) { Scenes.push(new Crimp(def)); }
