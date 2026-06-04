// title.js — title screen + intro narration, then hands off to the overworld.

import { Scenes, VIEW_W, VIEW_H, ART, Input, img, Save } from "../engine/core.js";
import { drawText, textCentered, panel } from "../engine/gfx.js";
import { Sfx, playMusic, stopMusic } from "../engine/audio.js";
import { GS } from "./state.js";
import { Renderer } from "../engine/renderer.js";
import { cycleFx, FX_LABELS } from "./menu.js";
import { Overworld } from "./overworld.js";
import { Dialogue } from "./dialogue.js";
import { TRACKS } from "../data/music.js";
import { DIALOG } from "../data/dialogue.js";

export class Title {
  constructor() {
    this.sel = 0;
    this.t = 0;
    this.hasSave = Save.exists();
    this.items = this.hasSave
      ? ["Continue", "New Journey", "Difficulty", "Visual FX"]
      : ["New Journey", "Difficulty", "Visual FX"];
    this.started = false;
  }

  label(it) {
    if (it === "Difficulty") {
      const d = GS.difficulty();
      return "Difficulty: " + d.charAt(0).toUpperCase() + d.slice(1);
    }
    if (it === "Visual FX") return "Visual FX: " + (FX_LABELS[Renderer.preset] || Renderer.preset);
    return it;
  }

  enter() { if (TRACKS.title) playMusic(TRACKS.title); }

  startGame(fresh) {
    if (fresh) { GS.reset(); Save.clear(); }
    else GS.load();
    stopMusic();
    const ow = new Overworld();
    Scenes.replace(ow);
    if (fresh && DIALOG.intro) {
      // intro narration before control is given
      const built = DIALOG.intro(ow.api());
      const pages = Array.isArray(built) ? built : built.pages;
      const onDone = Array.isArray(built) ? null : built.onDone;
      Scenes.push(new Dialogue(pages, onDone));
    }
  }

  update(dt) {
    this.t += dt;
    if (Input.pressed("up")) { this.sel = (this.sel - 1 + this.items.length) % this.items.length; Sfx.move(); }
    if (Input.pressed("down")) { this.sel = (this.sel + 1) % this.items.length; Sfx.move(); }
    // touch: tap an item to select it (the tap's confirm pulse then activates it)
    const tap = Input.tap();
    if (tap) {
      const y0 = 112 * ART;
      const i = Math.round((tap.y - y0) / (14 * ART));
      if (i >= 0 && i < this.items.length && Math.abs(tap.y - (y0 + i * 14 * ART)) < 9 * ART) this.sel = i;
    }
    const c = this.items[this.sel];
    if (c === "Difficulty" && (Input.pressed("left") || Input.pressed("right"))) { GS.cycleDifficulty(); Sfx.move(); }
    if (c === "Visual FX" && (Input.pressed("left") || Input.pressed("right"))) { cycleFx(); Sfx.move(); }
    if (Input.pressed("confirm")) {
      Sfx.confirm();
      if (c === "Difficulty") { GS.cycleDifficulty(); }
      else if (c === "Visual FX") { cycleFx(); }
      else this.startGame(c === "New Journey");
    }
  }

  render(ctx) {
    // starry backdrop
    const bg = img("bg_title");
    if (bg) ctx.drawImage(bg, 0, 0, VIEW_W, VIEW_H);
    else { ctx.fillStyle = "#0a0820"; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }

    const logo = img("logo");
    if (logo) {
      const bob = Math.sin(this.t * 1.5) * 2 * ART;
      ctx.drawImage(logo, (VIEW_W - logo.width) / 2, 22 * ART + bob);
    } else {
      textCentered(ctx, "THE MIGHTY BOOSH", VIEW_W / 2, 40 * ART, { color: "#ffd86a", scale: 2 });
    }
    textCentered(ctx, "Journey Through the Zooniverse", VIEW_W / 2, 92 * ART, { color: "#c79aff" });

    const y0 = 112 * ART;
    this.items.forEach((it, i) => {
      const yy = y0 + i * 14 * ART;
      if (i === this.sel) {
        if (Math.floor(this.t * 3) % 2 === 0) drawText(ctx, ">", VIEW_W / 2 - 52 * ART, yy, { color: "#ffd86a" });
      }
      const dim = it === "Difficulty" || it === "Visual FX";
      textCentered(ctx, this.label(it), VIEW_W / 2, yy, { color: i === this.sel ? "#ffd86a" : (dim ? "#7f86a8" : "#9aa0c0"), shadow: "#000" });
    });

    textCentered(ctx, "a crimping adventure", VIEW_W / 2, VIEW_H - 10 * ART, { color: "#5a5a7a" });
  }
}
