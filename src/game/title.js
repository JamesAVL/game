// title.js — title screen + intro narration, then hands off to the overworld.

import { Scenes, VIEW_W, VIEW_H, Input, img, Save } from "../engine/core.js";
import { drawText, textCentered, panel } from "../engine/gfx.js";
import { Sfx, playMusic, stopMusic } from "../engine/audio.js";
import { GS } from "./state.js";
import { Overworld } from "./overworld.js";
import { Dialogue } from "./dialogue.js";
import { TRACKS } from "../data/music.js";
import { DIALOG } from "../data/dialogue.js";

export class Title {
  constructor() {
    this.sel = 0;
    this.t = 0;
    this.hasSave = Save.exists();
    this.items = this.hasSave ? ["Continue", "New Journey"] : ["New Journey"];
    this.started = false;
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
    if (Input.pressed("confirm")) {
      Sfx.confirm();
      const c = this.items[this.sel];
      this.startGame(c === "New Journey");
    }
  }

  render(ctx) {
    // starry backdrop
    const bg = img("bg_title");
    if (bg) ctx.drawImage(bg, 0, 0, VIEW_W, VIEW_H);
    else { ctx.fillStyle = "#0a0820"; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }

    const logo = img("logo");
    if (logo) {
      const bob = Math.sin(this.t * 1.5) * 2;
      ctx.drawImage(logo, (VIEW_W - logo.width) / 2, 22 + bob);
    } else {
      textCentered(ctx, "THE MIGHTY BOOSH", VIEW_W / 2, 40, { color: "#ffd86a", scale: 2 });
    }
    textCentered(ctx, "Journey Through the Zooniverse", VIEW_W / 2, 92, { color: "#c79aff" });

    const y0 = 118;
    this.items.forEach((it, i) => {
      const yy = y0 + i * 14;
      if (i === this.sel) {
        if (Math.floor(this.t * 3) % 2 === 0) drawText(ctx, ">", VIEW_W / 2 - 44, yy, { color: "#ffd86a" });
      }
      textCentered(ctx, it, VIEW_W / 2, yy, { color: i === this.sel ? "#ffd86a" : "#9aa0c0", shadow: "#000" });
    });

    textCentered(ctx, "a crimping adventure", VIEW_W / 2, VIEW_H - 10, { color: "#5a5a7a" });
  }
}
