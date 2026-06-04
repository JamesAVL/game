// dialogue.js — typewriter dialogue boxes with portraits and choice menus.
// A "script" is an array of pages; pages are either text or choice nodes:
//   { speaker, text, face }                     -- a spoken/narration page
//   { choice: prompt, options: [{label, next}] } -- player picks; `next` is a
//                                                    page array spliced in.
// onDone() fires after the final page.

import { Scenes, VIEW_W, VIEW_H, ART, Input, img } from "../engine/core.js";
import { drawText, textCentered, panel, drawFrame, LINE_H } from "../engine/gfx.js";
import { Sfx } from "../engine/audio.js";

// speaker face -> sprite source (col/row in a 16x24 (×ART) sheet, or whole image)
const FACES = {
  Vince: { key: "vince", col: 0, row: 0, fw: 16 * ART, fh: 24 * ART },
  Howard: { key: "howard", col: 0, row: 0, fw: 16 * ART, fh: 24 * ART },
  Naboo: { key: "naboo", whole: true },
  Bollo: { key: "bollo", whole: true },
  Fossil: { key: "fossil", whole: true },
  Jazz: { key: "boss_jazz", whole: true },
  Gregg: { key: "boss_gregg", whole: true },
  CrackFox: { key: "boss_crackfox", whole: true },
  Nana: { key: "boss_nana", whole: true },
  Moon: { key: "boss_moon", whole: true },
  Tony: { key: "boss_tony", whole: true },
};

const NAME_COLOR = {
  Vince: "#9fd0ff", Howard: "#e0b070", Naboo: "#c79aff", Bollo: "#bda9a0",
  Fossil: "#e8d27a", Jazz: "#ff8a4a", Gregg: "#7affc0", CrackFox: "#ff9a5a",
  Nana: "#ff7ad0", Moon: "#fff2a0", Tony: "#ff9ad8", "": "#dddddd",
};

export class Dialogue {
  constructor(pages, onDone) {
    this.pages = pages.slice();
    this.onDone = onDone || null;
    this.i = 0;
    this.typed = 0;
    this.t = 0;
    this.sel = 0;
    this.dismissBlock = 0.08; // small delay so the opening key isn't eaten
  }

  cur() { return this.pages[this.i]; }
  isChoice() { return this.cur() && this.cur().choice !== undefined; }
  fullText() { const p = this.cur(); return p ? (p.text || p.choice || "") : ""; }

  enter() { Sfx.confirm(); }

  finish() {
    Scenes.pop();
    if (this.onDone) this.onDone();
  }

  advance() {
    this.i++;
    this.typed = 0; this.t = 0; this.sel = 0;
    if (this.i >= this.pages.length) this.finish();
  }

  update(dt) {
    this.dismissBlock = Math.max(0, this.dismissBlock - dt);
    const p = this.cur();
    if (!p) { this.finish(); return; }
    const full = this.fullText();

    // typewriter
    if (this.typed < full.length) {
      this.t += dt;
      const cps = 48;
      while (this.t > 1 / cps && this.typed < full.length) {
        this.t -= 1 / cps;
        this.typed++;
        if (this.typed % 2 === 0 && full[this.typed - 1] !== " ") Sfx.blip();
      }
    }
    const fullyTyped = this.typed >= full.length;

    if (this.isChoice() && fullyTyped) {
      const opts = p.options;
      if (Input.pressed("up")) { this.sel = (this.sel - 1 + opts.length) % opts.length; Sfx.move(); }
      if (Input.pressed("down")) { this.sel = (this.sel + 1) % opts.length; Sfx.move(); }
      if (Input.pressed("confirm") && this.dismissBlock <= 0) {
        Sfx.confirm();
        const chosen = opts[this.sel];
        const next = chosen.next || [];
        this.pages.splice(this.i + 1, 0, ...next);
        if (chosen.act) chosen.act();
        this.advance();
      }
      return;
    }

    if ((Input.pressed("confirm") || Input.pressed("cancel")) && this.dismissBlock <= 0) {
      if (!fullyTyped) { this.typed = full.length; Sfx.blip(); }
      else { Sfx.confirm(); this.advance(); }
    }
  }

  render(ctx) {
    const p = this.cur();
    if (!p) return;
    const bx = 8 * ART, bh = 54 * ART, by = VIEW_H - bh - 6 * ART, bw = VIEW_W - 16 * ART;
    panel(ctx, bx, by, bw, bh);

    let tx = bx + 8 * ART;
    const face = FACES[p.speaker];
    if (face && img(face.key)) {
      const fbx = bx + 6 * ART, fby = by + 8 * ART;
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(fbx - 1 * ART, fby - 1 * ART, 34 * ART, 38 * ART);
      const im = img(face.key);
      if (face.whole) {
        const s = Math.min(32 * ART / im.width, 36 * ART / im.height);
        ctx.drawImage(im, fbx + (32 * ART - im.width * s) / 2, fby + (36 * ART - im.height * s), im.width * s, im.height * s);
      } else {
        drawFrame(ctx, im, face.fw, face.fh, face.col, face.row, fbx + 8 * ART, fby + 6 * ART);
      }
      tx = bx + 46 * ART;
    }

    if (p.speaker) drawText(ctx, p.speaker, tx, by + 6 * ART, { color: NAME_COLOR[p.speaker] || "#fff", shadow: "#000" });

    const shown = this.fullText().slice(0, this.typed);
    const wrapped = drawText(ctx, shown, tx, by + 18 * ART, { color: "#f4f4ff", maxWidth: bx + bw - tx - 6 * ART, shadow: "#1a1430" });

    if (this.isChoice() && this.typed >= this.fullText().length) {
      const baseY = by + 18 * ART + (wrapped.split("\n").length) * LINE_H + 2 * ART;
      p.options.forEach((o, k) => {
        const yy = baseY + k * (LINE_H);
        if (k === this.sel) drawText(ctx, ">", tx, yy, { color: "#ffd86a" });
        drawText(ctx, o.label, tx + 8 * ART, yy, { color: k === this.sel ? "#ffd86a" : "#bbbbcc" });
      });
    } else if (this.typed >= this.fullText().length) {
      // blinking advance arrow
      if (Math.floor(performance.now() / 350) % 2 === 0)
        drawText(ctx, ">", bx + bw - 12 * ART, by + bh - 12 * ART, { color: "#ffd86a" });
    }
  }
}

export function say(pages, onDone) { Scenes.push(new Dialogue(pages, onDone)); }
