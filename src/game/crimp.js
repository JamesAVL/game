// crimp.js — the "crimp-off" rhythm battle. Notes fall down 4 lanes to a hit
// line in time with an original chiptune track; landing them fills YOUR crimp
// meter and drains the boss's. Out-crimp them before the song ends to win.

import { Scenes, VIEW_W, VIEW_H, ART, Input, img, clamp } from "../engine/core.js";
import { Particles, Juice } from "../engine/particles.js";
import { drawText, textCentered, panel, drawFrame } from "../engine/gfx.js";
import { Sfx, playMusic, stopMusic, audioTime, duckMusic, setMusicBrightness, getReactive } from "../engine/audio.js";
import { litSprite } from "../engine/normalmap.js";
import { GS } from "./state.js";
import { prepareChart, applyMechanic, gradeFor, MECHANIC_HINTS } from "./crimp_logic.js";

// parse a "#rrggbb" lane colour to an [r,g,b] triple for particle bursts
function hexRGB(h) {
  const m = /^#?([0-9a-f]{6})$/i.exec(h || "");
  if (!m) return [255, 230, 120];
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

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

    // ---- level perks (stack on top of difficulty; all modestly capped) -----
    // Vince's Style + Howard's Jazz grow as you level, making crimps kinder:
    // a starting-meter head start, slightly wider hit windows, and a bigger
    // payoff per landed note. Exploring/levelling before a boss actually helps.
    const lvl = (GS.data.stats && GS.data.stats.level) || 1;
    const over = Math.max(0, lvl - 1);
    this.headStart = Math.min(15, over * 1.5);
    this.gainMul = 1 + Math.min(0.35, over * 0.035);
    this.perfWin = this.D.perfWin + Math.min(0.025, over * 0.0025);
    this.goodWin = this.D.goodWin + Math.min(0.05, over * 0.005);

    this.you = Math.min(80, this.D.startYou + this.headStart); this.boss = 50;
    this.combo = 0; this.maxCombo = 0;
    this.hits = 0; this.perfects = 0;
    this.judge = ""; this.judgeT = 0; this.judgeCol = "#fff";
    this.state = "count";        // count -> play -> over
    this.countT = 3.0;
    this.result = null;

    // lane layout from difficulty
    this.laneCount = DIFF_LANES[GS.data.difficulty] || 3;
    this.dirs = DIR_SETS[this.laneCount];
    this.laneCols = this.dirs.map((d) => DIR_COL[d]);
    this.totalW = this.laneCount * LANE_W + (this.laneCount - 1) * GAP;
    this.x0 = (VIEW_W - this.totalW) / 2 + 20 * ART;
    this.flashLane = new Array(this.laneCount).fill(0);

    // chart prep + the boss's signature mechanic live in crimp_logic.js (pure,
    // unit-tested): lane remap, density thinning, then deterministic note flags
    const prepped = prepareChart(def, this.laneCount, this.D.minGap);
    const mech = applyMechanic(prepped, def.mechanic, def.bpm, this.laneCount);
    this.notes = mech.notes;
    this.segments = mech.segments;   // outrage scramble windows (for warnings)
    this.mech = def.mechanic || null;
    this.barLen = (60 / def.bpm) * 4;
    this.activeHolds = [];
    this.total = this.notes.length;

    // ---- pre-fight tone (dialogue choice; small, flavour-scale modifier) ---
    // respect: the boss eases off a touch. mock: you crimp hotter but fluffs
    // sting more — bravado cuts both ways.
    this.missMul = 1;
    if (def.tone === "respect") this.boss -= 3;
    else if (def.tone === "mock") { this.gainMul *= 1.05; this.missMul = 1.15; }

    // ---- charm (one key item carried into the battle; see items.js) --------
    this.charm = def.charm || null;  // { id, name, type, ... } resolved upstream
    this.saves = 0;
    this.encore = false;
    if (this.charm) {
      const c = this.charm;
      if (c.type === "slow") this.travel += c.n;
      else if (c.type === "head") this.you = Math.min(90, this.you + c.n);
      else if (c.type === "boss") this.boss -= c.n;
      else if (c.type === "window") { this.perfWin *= c.mul; this.goodWin *= c.mul; }
      else if (c.type === "save") this.saves = c.n;
      else if (c.type === "encore") this.encore = true;
    }
    this.lyrics = (def.lyrics || []).map(([beat, text]) => ({ t: beat * (60 / def.bpm), text }));
    this.lastT = this.notes.length ? this.notes[this.notes.length - 1].t : 4;
    this.danceT = 0;
  }

  enter() { Sfx.confirm(); Particles.clear(); Juice.clear(); }
  exit() { stopMusic(); }

  now() { return audioTime() - this.startAudio; }

  begin() {
    // Graceful lead-in: notes fall from the top for `travel` seconds (now() runs
    // from -travel up to 0) before the first note reaches the hit line and the
    // music drops — so you can read the pattern instead of losing points cold.
    this.startAudio = audioTime() + this.travel;
    this.musicStarted = false;
    this.state = "play";
  }

  finish(win) {
    this.state = "over";
    this.overT = 0;
    this.result = win;
    this.grade = gradeFor(this.hits, this.total, this.maxCombo);
    if (win && this.def.id) GS.setGrade(this.def.id, this.grade);
    stopMusic();
    if (win) Sfx.win(); else Sfx.lose();
    // big finish: hit-stop + flash + a burst over the boss
    Juice.freeze(0.16);
    Juice.flash(win ? "#fff7d8" : "#ff6a6a", win ? 0.8 : 0.5, 0.3);
    Juice.shake(win ? 5 * ART : 7 * ART, 0.4);
    const col = win ? [255, 240, 180] : [255, 110, 110];
    Particles.burst(VIEW_W / 2 + 40 * ART, VIEW_H / 2 - 10 * ART, 60, { color: col, speed: 170, life: 0.9, size: 2 * ART, gravity: 40 * ART, drag: 1.8 });
  }

  judgeHit(kind, mult = 1) {
    const D = this.D, g = this.gainMul * mult;
    if (kind === "perfect") { this.you += 4.6 * g; this.boss -= 4.8 * g; this.perfects++; this.hits++; this.combo++; Sfx.perfect(); this.judge = mult > 1 ? "GHOST CRIMP!" : "CRIMP!"; this.judgeCol = "#ffd86a"; }
    else if (kind === "good") { this.you += 3.2 * g; this.boss -= 3.4 * g; this.hits++; this.combo++; Sfx.hit(); this.judge = mult > 1 ? "GHOST!" : "GOOD"; this.judgeCol = "#8aff6a"; }
    else if (this.saves > 0) {
      // a charmed Howard absorbs the fluff: no penalty, combo survives
      this.saves--; Sfx.hit(); this.judge = "HOWARD'S GOT IT"; this.judgeCol = "#9fd0ff";
    }
    else { this.you -= 2.4 * D.missYou * this.missMul; this.boss += 2.0 * D.missBoss; this.combo = 0; Sfx.miss(); this.judge = "FLUFF!"; this.judgeCol = "#ff6a6a"; Juice.shake(4 * ART, 0.22); }
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    if (this.combo > 0 && this.combo % 10 === 0) { const b = this.encore ? 2 : 1; this.you += 2 * b; this.boss -= 1 * b; }
    // interactive mix: a hot combo opens the backing track up; a fluff ducks and
    // muffles it for a beat, so the music tracks how well you're crimping.
    if (kind === "miss") { duckMusic(0.5, 0.26); setMusicBrightness(0.5); }
    else setMusicBrightness(0.8 + Math.min(0.2, this.combo * 0.02));
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
    if (best && bestD <= this.goodWin) {
      best.dead = true;
      const cx = this.laneX(lane) + LANE_W / 2;
      const cy = HIT_Y + 5 * ART;
      if (best.cursed) {
        // hex mechanic: striking a cursed note is the mistake
        this.you -= 2.4 * this.D.missYou; this.boss += 2.0 * this.D.missBoss;
        this.combo = 0; Sfx.miss();
        this.judge = "HEXED!"; this.judgeCol = "#c77aff"; this.judgeT = 0.5;
        this.you = clamp(this.you, 0, 100); this.boss = clamp(this.boss, 0, 100);
        Juice.shake(5 * ART, 0.25);
        Particles.burst(cx, cy, 14, { color: [180, 90, 220], speed: 80, life: 0.5, size: 1.6 * ART, gravity: 20 * ART, drag: 2 });
        return;
      }
      const perfect = bestD <= this.perfWin;
      this.judgeHit(perfect ? "perfect" : "good", best.ghost ? 2 : 1);
      if (best.hold) { best.holding = true; this.activeHolds.push(best); }
      // celebratory burst at the struck receptor — additive, so bloom glows it
      const col = perfect ? [255, 216, 106] : hexRGB(this.laneCols[lane]);
      Particles.burst(cx, cy, perfect ? 16 : 9, {
        color: col, speed: perfect ? 95 : 65, life: perfect ? 0.55 : 0.4,
        size: 1.6 * ART, gravity: 60 * ART, drag: 2.2,
      });
      if (this.combo > 0 && this.combo % 10 === 0) {
        Particles.burst(cx, cy, 26, { color: [255, 240, 180], speed: 130, life: 0.7, size: 1.8 * ART, gravity: 40 * ART });
        Juice.shake(2.5 * ART, 0.18);
      }
    } else {
      // empty/mistimed tap: only breaks the combo (no meter penalty -> forgiving)
      this.combo = 0;
    }
  }

  update(dt) {
    this.danceT += dt;
    if (this.judgeT > 0) this.judgeT -= dt;
    for (let i = 0; i < this.laneCount; i++) if (this.flashLane[i] > 0) this.flashLane[i] -= dt;

    if (this.state === "count") {
      this.countT -= dt;
      if (this.countT <= 0) this.begin();
      return;
    }

    if (this.state === "play") {
      // music drops exactly when the first note reaches the line (now() >= 0)
      if (!this.musicStarted && this.now() >= 0) { playMusic(this.def.track); this.musicStarted = true; }
      // lane input — arrow keys / touch arrows mapped per lane direction
      for (let i = 0; i < this.laneCount; i++) if (Input.pressed(this.dirs[i])) this.tryLane(i);
      const t = this.now();
      // missed notes (passed hit line without being struck); cursed notes are
      // *meant* to be left alone, so they slip past without penalty
      for (const n of this.notes) {
        if (!n.dead && n.t < t - this.goodWin) {
          n.dead = true;
          if (!n.cursed) this.judgeHit("miss");
        }
      }
      // sustained notes: keep the lane key down until the tail runs out
      for (const n of this.activeHolds) {
        if (!n.holding) continue;
        const end = n.t + n.hold;
        if (t >= end) {
          n.holding = false;
          const g = this.gainMul;
          this.you = clamp(this.you + 2.6 * g, 0, 100);
          this.boss = clamp(this.boss - 1.6 * g, 0, 100);
          this.judge = "HELD!"; this.judgeCol = "#5ad6ff"; this.judgeT = 0.5;
          Sfx.perfect();
          Particles.burst(this.laneX(n.lane) + LANE_W / 2, HIT_Y + 5 * ART, 18,
            { color: [90, 214, 255], speed: 100, life: 0.6, size: 1.6 * ART, gravity: 50 * ART, drag: 2 });
        } else if (!Input.isDown(this.dirs[n.lane])) {
          n.holding = false;
          this.combo = 0;
          this.you = clamp(this.you - 1.2, 0, 100);
          this.judge = "DROPPED"; this.judgeCol = "#ff9a5a"; this.judgeT = 0.5;
          Sfx.cancel();
        }
      }
      this.activeHolds = this.activeHolds.filter((n) => n.holding);
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

  _hint() {
    const touch = typeof document !== "undefined" && document.documentElement.classList.contains("has-touch");
    return touch ? "Tap the lanes in time!" : "Hit the ARROW keys in time!";
  }

  // layered parallax stage: sinuous silhouette bands (back -> front, each
  // drifting at its own speed) that swell with the beat, plus floating motes.
  // Config is data-driven per boss (def.stage, built in data/crimps.js).
  _stage(ctx) {
    const st = this.def.stage;
    if (!st) return;
    const beat = getReactive().bass;
    for (let bi = 0; bi < st.bands.length; bi++) {
      const b = st.bands[bi];
      ctx.fillStyle = b.color;
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.moveTo(0, VIEW_H);
      const step = 8 * ART;
      for (let x = 0; x <= VIEW_W + step; x += step) {
        const ph = (x / ART) * 0.012 * b.freq + this.danceT * b.speed * 0.12 + bi * 1.7;
        const y = b.y * VIEW_H
          + Math.sin(ph) * b.amp * ART * (1 + beat * 0.25)
          + Math.sin(ph * 2.7) * b.amp * 0.35 * ART;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(VIEW_W + step, VIEW_H);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const m = st.motes;
    if (m) {
      ctx.fillStyle = m.color;
      for (let i = 0; i < m.n; i++) {
        const sp = (m.rise ? -1 : 1) * (6 + (i % 5) * 3) * ART;
        const x = (i * 197 * ART + Math.sin(this.danceT * 0.7 + i) * 14 * ART) % VIEW_W;
        const y = (i * 131 * ART + this.danceT * sp) % VIEW_H;
        ctx.globalAlpha = m.alpha * (0.6 + 0.4 * Math.sin(this.danceT * 2 + i * 1.3)) * (0.7 + beat * 0.5);
        ctx.fillRect((x + VIEW_W) % VIEW_W, (y + VIEW_H) % VIEW_H, ART, ART);
      }
      ctx.globalAlpha = 1;
    }
  }

  render(ctx) {
    // ---- backdrop: sky gradient + layered parallax stage ----
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, this.def.bg0 || "#1a1140");
    g.addColorStop(1, this.def.bg1 || "#3a1a5a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this._stage(ctx);
    ctx.save();

    // ---- boss sprite, bobbing ----
    // bossScale stays as-is: the PNG is baked ART× larger and the canvas is ART×
    // larger too, so the boss keeps the same on-screen fraction automatically.
    const bim = img(this.def.face);
    if (bim) {
      const scale = this.def.bossScale || 2;
      const bw = bim.width * scale, bh = bim.height * scale;
      const bob = Math.sin(this.danceT * 6) * 3 * ART;
      // normal-mapped lighting: a light orbits the boss and flares to the beat,
      // so the surface relief catches highlights in time with the music.
      const nim = img(this.def.face + "_n");
      const lx = Math.cos(this.danceT * 1.1) * 0.8;
      const ly = -0.35 + Math.sin(this.danceT * 0.7) * 0.25;
      const beat = getReactive().bass;
      const src = nim ? litSprite(bim, nim, lx, ly, 0.7, 0.42 + beat * 0.22, 1.0, 0.97, 0.9) : bim;
      ctx.drawImage(src, VIEW_W / 2 - bw / 2 + 40 * ART, 30 * ART + bob - bh / 2 + 30 * ART, bw, bh);
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
      const mt = this.mech ? this.mech.type : null;
      const span = HIT_Y - TOP_Y;
      // y for a note dt seconds from the hit line; "drift" warps the glide
      // visually but keeps both endpoints honest (judgement is untouched)
      const yFor = (dt) => {
        let prog = 1 - dt / this.travel;
        if (mt === "drift")
          prog += Math.sin(this.danceT * this.mech.speed + prog * 3) * this.mech.amp * Math.sin(Math.PI * Math.max(0, Math.min(1, prog)));
        return TOP_Y + prog * span + 5 * ART;
      };
      // active hold tails: shrink from the receptor up as you keep holding
      for (const n of this.activeHolds) {
        if (!n.holding) continue;
        const yEnd = yFor(n.t + n.hold - t);
        ctx.fillStyle = this.laneCols[n.lane];
        ctx.globalAlpha = 0.75;
        const cx = this.laneX(n.lane) + LANE_W / 2;
        ctx.fillRect(cx - 3 * ART, yEnd, 6 * ART, Math.max(0, HIT_Y + 5 * ART - yEnd));
        ctx.globalAlpha = 1;
      }
      for (const n of this.notes) {
        if (n.dead) continue;
        const dt = n.t - t;
        if (dt > this.travel || dt < -0.25) continue;
        const y = yFor(dt);
        const cx = this.laneX(n.lane) + LANE_W / 2;
        // fog mechanic: notes fade out inside the murk band; a combo thins it
        let alpha = 1;
        if (mt === "fog") {
          const fy0 = TOP_Y + this.mech.y0 * span, fy1 = TOP_Y + this.mech.y1 * span;
          if (y > fy0 && y < fy1) alpha = Math.min(1, 0.08 + (this.combo >= 5 ? 0.3 : 0) + this.combo * 0.02);
        }
        if (n.ghost) alpha *= 0.35 + 0.6 * Math.abs(Math.sin(this.danceT * 7 + n.t * 3));
        ctx.globalAlpha = alpha;
        if (n.hold) { // pending tail, drawn behind the head
          ctx.fillStyle = this.laneCols[n.lane];
          ctx.globalAlpha = alpha * 0.45;
          ctx.fillRect(cx - 3 * ART, yFor(dt + n.hold), 6 * ART, Math.max(0, y - yFor(dt + n.hold)));
          ctx.globalAlpha = alpha;
        }
        if (n.cursed) { // hex: an outlined, sickly note you must NOT strike
          this._arrow(ctx, cx, y, this.dirs[n.lane], LANE_W * 0.42, "#c77aff", true);
          drawText(ctx, "x", cx - 2 * ART, y - 3 * ART, { color: "#c77aff" });
        } else {
          this._arrow(ctx, cx, y, this.dirs[n.lane], LANE_W * 0.42, this.laneCols[n.lane], false);
          if (n.scram) this._arrow(ctx, cx, y, this.dirs[n.lane], LANE_W * 0.42, "rgba(255,255,255,0.7)", true);
        }
        ctx.globalAlpha = 1;
      }
      // fog: paint the murk itself so the vanishing reads as weather, not a bug
      if (mt === "fog") {
        const fy0 = TOP_Y + this.mech.y0 * span, fy1 = TOP_Y + this.mech.y1 * span;
        const fa = Math.max(0.08, 0.30 - this.combo * 0.02);
        const fg = ctx.createLinearGradient(0, fy0, 0, fy1);
        fg.addColorStop(0, "rgba(58,42,18,0)");
        fg.addColorStop(0.3, "rgba(58,42,18," + fa + ")");
        fg.addColorStop(0.7, "rgba(58,42,18," + fa + ")");
        fg.addColorStop(1, "rgba(58,42,18,0)");
        ctx.fillStyle = fg;
        ctx.fillRect(this.x0 - GAP, fy0, this.totalW + GAP * 2, fy1 - fy0);
      }
      // outrage: announce each scramble one bar early, tint while it blows
      if (mt === "outrage") {
        for (const [s0, s1] of this.segments) {
          if (t >= s0 - this.barLen && t < s0 && Math.floor(performance.now() / 180) % 2 === 0)
            textCentered(ctx, "THE WIND! LANES SCRAMBLE!", VIEW_W / 2, 44 * ART, { color: "#ff7ad8", shadow: "#000" });
          if (t >= s0 && t < s1) {
            ctx.fillStyle = "rgba(255,122,216,0.07)";
            ctx.fillRect(this.x0, TOP_Y, this.totalW, HIT_Y - TOP_Y + 14 * ART);
          }
        }
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
      const mh = this.mech && MECHANIC_HINTS[this.mech.type];
      if (mh) textCentered(ctx, mh, VIEW_W / 2, VIEW_H - 40 * ART, { color: "#ffb15a", shadow: "#000" });
      if (this.charm) textCentered(ctx, "Charm: " + this.charm.name + " (" + this.charm.label + ")", VIEW_W / 2, VIEW_H - 50 * ART, { color: "#9fd0ff", shadow: "#000" });
      textCentered(ctx, this._hint(), VIEW_W / 2, VIEW_H - 30 * ART, { color: "#cfcfe6" });
    }

    // graceful lead-in: notes are gliding in but nothing scores yet
    if (this.state === "play" && this.now() < 0) {
      if (Math.floor(performance.now() / 350) % 2 === 0)
        textCentered(ctx, "GET READY...", VIEW_W / 2, 40 * ART, { color: "#ffd86a", shadow: "#000" });
    }

    if (this.state === "over") {
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      const win = this.result;
      textCentered(ctx, win ? "CRIMP VICTORY!" : "OUT-CRIMPED...", VIEW_W / 2, 56 * ART, { color: win ? "#ffd86a" : "#ff7a7a", scale: 2, shadow: "#000" });
      const acc = this.total ? Math.round((this.hits / this.total) * 100) : 0;
      textCentered(ctx, "Accuracy " + acc + "%   Max combo " + this.maxCombo, VIEW_W / 2, 88 * ART, { color: "#fff" });
      const gcol = { S: "#ffd86a", A: "#8aff6a", B: "#9fd0ff", C: "#cfcfe6" }[this.grade] || "#fff";
      textCentered(ctx, "GRADE", VIEW_W / 2 - 14 * ART, 100 * ART, { color: "#9a9ab6" });
      textCentered(ctx, this.grade, VIEW_W / 2 + 14 * ART, 96 * ART, { color: gcol, scale: 2, shadow: "#000" });
      textCentered(ctx, win ? "You feel the funk flow through you." : "Shake it off and try again.", VIEW_W / 2, 116 * ART, { color: "#cfcfe6" });
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
