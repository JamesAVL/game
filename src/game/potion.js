// potion.js — "Shaman Simon": Naboo's potion-mixing minigame. Four ingredient
// shelves map to the four crimp lanes (left/up/down/right), so keyboard,
// touch lane-taps and MIDI all work with zero new input code. Naboo flashes a
// growing sequence (a synth pitch per lane); echo it back. Seeded by the
// game-day so the daily potion is the same for everyone — and daily-capped.

import { Scenes, VIEW_W, VIEW_H, ART, Input } from "../engine/core.js";
import { drawText, textCentered, panel } from "../engine/gfx.js";
import { Sfx, tone } from "../engine/audio.js";
import { Particles } from "../engine/particles.js";
import { GS } from "./state.js";

const DIRS = ["left", "up", "down", "right"];
const COLS = ["#ff5a8a", "#ffd24a", "#5ad6ff", "#8aff6a"];
const NAMES = ["Newt Tears", "Moon Dust", "Funk Moss", "Eel Jelly"];
const TONES = [330, 415, 494, 587];
const MAX_ROUND = 8;

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

export class PotionGame {
  constructor(overworld) {
    this.ow = overworld;
    this.rnd = rng(1009 + (GS.data.day || 0) * 131);
    this.seq = [];
    this.round = 0;
    this.state = "intro";   // intro -> show -> echo -> over
    this.showI = 0;
    this.showT = 0;
    this.echoI = 0;
    this.flash = [0, 0, 0, 0];
    this.earned = 0;
    this.t = 0;
  }

  enter() { Sfx.confirm(); }

  _grow() {
    this.seq.push(Math.floor(this.rnd() * 4) % 4);
    this.round++;
    this.state = "show";
    this.showI = 0;
    this.showT = 0.55;
  }

  _ping(lane, good = true) {
    this.flash[lane] = 0.28;
    tone(good ? TONES[lane] : 120, good ? "triangle" : "sawtooth", 0.18, 0.2);
  }

  finish(won) {
    this.state = "over";
    this.won = won;
    // payout: 5/round, daily-capped via the arcade day stamp
    const today = GS.data.day || 0;
    const capped = GS.data.arcade.lastDay === today && GS.data.arcade.potionPaid;
    this.earned = capped ? 0 : (this.round - (won ? 0 : 1)) * 5;
    if (this.earned > 0) {
      GS.addShrapnel(this.earned);
      GS.data.arcade.lastDay = today;
      GS.data.arcade.potionPaid = true;
    }
    if (this.round >= 5) GS.setFlag("mg_potion_r5");
    if (won) GS.setFlag("mg_potion_perfect");
    if (won) Sfx.win(); else Sfx.lose();
    this.ow && this.ow.questBump();
  }

  update(dt) {
    this.t += dt;
    for (let i = 0; i < 4; i++) if (this.flash[i] > 0) this.flash[i] -= dt;

    if (this.state === "intro") {
      if (Input.pressed("confirm")) { this._grow(); }
      if (Input.pressed("cancel")) Scenes.pop();
      return;
    }

    if (this.state === "show") {
      this.showT -= dt;
      if (this.showT <= 0) {
        if (this.showI < this.seq.length) {
          this._ping(this.seq[this.showI]);
          this.showI++;
          this.showT = 0.5;
        } else {
          this.state = "echo";
          this.echoI = 0;
        }
      }
      return;
    }

    if (this.state === "echo") {
      for (let lane = 0; lane < 4; lane++) {
        if (Input.pressed(DIRS[lane])) {
          if (lane === this.seq[this.echoI]) {
            this._ping(lane);
            this.echoI++;
            if (this.echoI >= this.seq.length) {
              Particles.burst(VIEW_W / 2, VIEW_H / 2 - 20 * ART, 20,
                { color: [180, 140, 255], speed: 90, life: 0.6, size: 1.6 * ART, gravity: -20 * ART });
              if (this.round >= MAX_ROUND) this.finish(true);
              else this._grow();
            }
          } else {
            this._ping(lane, false);
            this.finish(false);
          }
          return;
        }
      }
      if (Input.pressed("cancel")) this.finish(false);
      return;
    }

    if (this.state === "over" && this.t > 0.5 && (Input.pressed("confirm") || Input.pressed("cancel"))) {
      Scenes.pop();
    }
  }

  render(ctx) {
    // murky back-room gradient
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, "#181028");
    g.addColorStop(1, "#2a1a3a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    textCentered(ctx, "NABOO'S POTION", VIEW_W / 2, 10 * ART, { color: "#c79aff", shadow: "#000" });
    textCentered(ctx, "Round " + this.round + " / " + MAX_ROUND, VIEW_W / 2, 22 * ART, { color: "#fff" });

    // the cauldron
    const cy = VIEW_H / 2 + 30 * ART;
    ctx.fillStyle = "#241a30";
    ctx.beginPath(); ctx.ellipse(VIEW_W / 2, cy, 46 * ART, 16 * ART, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6a4a9a";
    ctx.beginPath(); ctx.ellipse(VIEW_W / 2, cy - 4 * ART, 38 * ART, 10 * ART, 0, 0, Math.PI * 2); ctx.fill();
    const glow = 0.3 + 0.2 * Math.sin(this.t * 3);
    ctx.globalAlpha = glow;
    ctx.fillStyle = "#b48aff";
    ctx.beginPath(); ctx.ellipse(VIEW_W / 2, cy - 4 * ART, 30 * ART, 7 * ART, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // four ingredient shelves, one per lane direction
    const w = 52 * ART, gap = 12 * ART;
    const total = 4 * w + 3 * gap;
    const x0 = (VIEW_W - total) / 2;
    for (let i = 0; i < 4; i++) {
      const x = x0 + i * (w + gap), y = VIEW_H / 2 - 36 * ART;
      const lit = this.flash[i] > 0;
      ctx.globalAlpha = lit ? 1 : 0.6;
      panel(ctx, x, y, w, 34 * ART, { border: lit ? "#ffffff" : COLS[i] });
      ctx.fillStyle = COLS[i];
      ctx.globalAlpha = lit ? 0.9 : 0.35;
      ctx.fillRect(x + 6 * ART, y + 6 * ART, w - 12 * ART, 14 * ART);
      ctx.globalAlpha = 1;
      textCentered(ctx, NAMES[i], x + w / 2, y + 24 * ART, { color: lit ? "#fff" : "#cfcfe6" });
      const key = { left: "<", up: "^", down: "v", right: ">" }[DIRS[i]];
      textCentered(ctx, key, x + w / 2, y - 8 * ART, { color: COLS[i] });
    }

    if (this.state === "intro") {
      panel(ctx, VIEW_W / 2 - 90 * ART, VIEW_H - 42 * ART, 180 * ART, 30 * ART);
      textCentered(ctx, "Watch the shelves flash, then echo the", VIEW_W / 2, VIEW_H - 38 * ART, { color: "#fff" });
      textCentered(ctx, "order. Arrows / lane taps. Z to start.", VIEW_W / 2, VIEW_H - 28 * ART, { color: "#fff" });
    } else if (this.state === "show") {
      textCentered(ctx, "WATCH...", VIEW_W / 2, VIEW_H - 30 * ART, { color: "#ffd86a" });
    } else if (this.state === "echo") {
      textCentered(ctx, "YOUR TURN  (" + this.echoI + "/" + this.seq.length + ")", VIEW_W / 2, VIEW_H - 30 * ART, { color: "#8aff6a" });
    } else if (this.state === "over") {
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      textCentered(ctx, this.won ? "POTION PERFECTED!" : "THE POTION CURDLES", VIEW_W / 2, VIEW_H / 2 - 24 * ART,
        { color: this.won ? "#8aff6a" : "#ff8a8a", scale: 2, shadow: "#000" });
      const line = this.earned > 0 ? "+" + this.earned + " shrapnel" : "(today's wages already paid)";
      textCentered(ctx, "Round " + this.round + "   " + line, VIEW_W / 2, VIEW_H / 2 + 2 * ART, { color: "#fff" });
      textCentered(ctx, "Naboo: " + (this.won ? "Not bad. For a berk." : "That's a soup. You've made soup."),
        VIEW_W / 2, VIEW_H / 2 + 16 * ART, { color: "#c79aff" });
      textCentered(ctx, "press Z", VIEW_W / 2, VIEW_H / 2 + 34 * ART, { color: "#9a7adf" });
    }
  }
}
