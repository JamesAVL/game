// menu.js — pause menu overlay with Resume / Party stats / Save / Quit.

import { Scenes, VIEW_W, VIEW_H, ART, Input, Save } from "../engine/core.js";
import { Renderer } from "../engine/renderer.js";
import { drawText, textCentered, panel } from "../engine/gfx.js";
import { Sfx } from "../engine/audio.js";
import { GS } from "./state.js";
import { ITEMS } from "../data/items.js";
import { Quests } from "./quests.js";
import { crimpPerks } from "./perks.js";
import { GEAR, GEAR_SLOTS, SLOT_LABEL } from "../data/gear.js";
import { MAP_NODES } from "../data/map.js";

export const FX_LABELS = { off: "Off", soft: "Soft", crt: "CRT" };
export function cycleFx() {
  const p = Renderer.cyclePreset();
  Save.optSet("fx", p);
  return p;
}

export class PauseMenu {
  constructor(overworld) {
    this.ow = overworld;
    this.sel = 0;
    this.items = ["Resume", "Journal", "Map", "Party", "Items", "Wardrobe", "Difficulty", "Visual FX", "Save", "Quit to title"];
    this.view = "menu";
    this.wSlot = 0;            // wardrobe slot cursor
    this.mSel = 0;             // map node cursor
    this.block = 0.12;
  }

  label(it) {
    if (it === "Difficulty") {
      const d = GS.difficulty();
      return "Difficulty: " + d.charAt(0).toUpperCase() + d.slice(1);
    }
    if (it === "Visual FX") return "Visual FX: " + (FX_LABELS[Renderer.preset] || Renderer.preset);
    return it;
  }

  update(dt) {
    this.block = Math.max(0, this.block - dt);
    if (this.view === "wardrobe") { this.updateWardrobe(); return; }
    if (this.view === "map") { this.updateMap(); return; }
    if (this.view !== "menu") {
      if (Input.pressed("cancel") || Input.pressed("confirm") || Input.pressed("pause")) { Sfx.cancel(); this.view = "menu"; }
      return;
    }
    if (Input.pressed("up")) { this.sel = (this.sel - 1 + this.items.length) % this.items.length; Sfx.move(); }
    if (Input.pressed("down")) { this.sel = (this.sel + 1) % this.items.length; Sfx.move(); }
    if (Input.pressed("cancel") || Input.pressed("pause")) { if (this.block <= 0) { Sfx.cancel(); Scenes.pop(); } return; }
    // touch: tap a row to select it (the tap's confirm pulse then activates it)
    const tap = Input.tap();
    if (tap) {
      const w = 140 * ART, h = 110 * ART, x = (VIEW_W - w) / 2, y = (VIEW_H - h) / 2;
      const i = Math.round((tap.y - (y + 24 * ART)) / (11 * ART));
      if (i >= 0 && i < this.items.length && tap.x >= x && tap.x <= x + w &&
          Math.abs(tap.y - (y + 24 * ART + i * 11 * ART)) < 6 * ART) this.sel = i;
    }
    const choice = this.items[this.sel];
    if (choice === "Difficulty" && (Input.pressed("left") || Input.pressed("right"))) { GS.cycleDifficulty(); Sfx.move(); }
    if (choice === "Visual FX" && (Input.pressed("left") || Input.pressed("right"))) { cycleFx(); Sfx.move(); }
    if (Input.pressed("confirm") && this.block <= 0) {
      Sfx.confirm();
      if (choice === "Resume") Scenes.pop();
      else if (choice === "Journal") this.view = "journal";
      else if (choice === "Map") { this.view = "map"; this.mSel = 0; }
      else if (choice === "Party") this.view = "party";
      else if (choice === "Items") this.view = "items";
      else if (choice === "Wardrobe") this.view = "wardrobe";
      else if (choice === "Difficulty") { const d = GS.cycleDifficulty(); this.ow.toast("Difficulty: " + d); }
      else if (choice === "Visual FX") { const p = cycleFx(); this.ow.toast("Visual FX: " + (FX_LABELS[p] || p)); }
      else if (choice === "Save") { GS.save(); this.ow.toast("Game saved."); Scenes.pop(); }
      else if (choice === "Quit to title") { GS.save(); location.reload(); }
    }
  }

  render(ctx) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (this.view === "menu") this.renderMenu(ctx);
    else if (this.view === "party") this.renderParty(ctx);
    else if (this.view === "journal") this.renderJournal(ctx);
    else if (this.view === "wardrobe") this.renderWardrobe(ctx);
    else if (this.view === "map") this.renderMap(ctx);
    else this.renderItems(ctx);
  }

  // ---- Map: hub-spoke chart of the worlds; carpet thread = fast travel ----
  _mapList() {
    return Object.keys(MAP_NODES).filter((z) => GS.isUnlocked(z));
  }

  updateMap() {
    if (Input.pressed("cancel") || Input.pressed("pause")) { Sfx.cancel(); this.view = "menu"; return; }
    const list = this._mapList();
    if (Input.pressed("left") || Input.pressed("up")) { this.mSel = (this.mSel + list.length - 1) % list.length; Sfx.move(); }
    if (Input.pressed("right") || Input.pressed("down")) { this.mSel = (this.mSel + 1) % list.length; Sfx.move(); }
    if (Input.pressed("confirm") && this.block <= 0) {
      const z = list[this.mSel];
      if (!GS.hasGear("charm_carpet")) { Sfx.cancel(); return; }
      if (z === GS.data.zone) { Sfx.cancel(); return; }
      Sfx.warp();
      Scenes.pop();
      this.ow.warpTo(z);
    }
  }

  renderMap(ctx) {
    const w = 230 * ART, h = 138 * ART, x = (VIEW_W - w) / 2, y = (VIEW_H - h) / 2;
    panel(ctx, x, y, w, h);
    textCentered(ctx, "THE WORLDS", VIEW_W / 2, y + 7 * ART, { color: "#ffd86a" });
    const list = this._mapList();
    const ix = x + 12 * ART, iy = y + 18 * ART, iw = w - 24 * ART, ih = h - 40 * ART;
    // spokes from the hub
    const hubN = MAP_NODES.hub;
    ctx.strokeStyle = "rgba(154,122,223,0.35)"; ctx.lineWidth = 1 * ART;
    for (const z of list) {
      if (z === "hub") continue;
      const n = MAP_NODES[z];
      ctx.beginPath();
      ctx.moveTo(ix + hubN.x * iw, iy + hubN.y * ih);
      ctx.lineTo(ix + n.x * iw, iy + n.y * ih);
      ctx.stroke();
    }
    list.forEach((z, i) => {
      const n = MAP_NODES[z];
      const nx = ix + n.x * iw, ny = iy + n.y * ih;
      const here = z === GS.data.zone, sel = i === this.mSel;
      ctx.fillStyle = here ? "#ffd86a" : GS.data.visited[z] ? "#9fd0ff" : "#5a5a78";
      ctx.beginPath(); ctx.arc(nx, ny, (sel ? 4 : 2.6) * ART, 0, Math.PI * 2); ctx.fill();
      if (sel) { ctx.strokeStyle = "#ffd86a"; ctx.beginPath(); ctx.arc(nx, ny, 6 * ART, 0, Math.PI * 2); ctx.stroke(); }
      drawText(ctx, n.label, nx - 18 * ART, ny + 7 * ART, { color: sel ? "#ffd86a" : "#cfcfe6" });
    });
    const hint = GS.hasGear("charm_carpet")
      ? "</> pick   z carpet-travel   esc back"
      : "(the Carpet Thread charm unlocks fast travel)";
    drawText(ctx, hint, x + 12 * ART, y + h - 11 * ART, { color: "#7a7a96" });
  }

  // ---- Journal: active quests with current goals, done quests below -------
  renderJournal(ctx) {
    const w = 220 * ART, h = 134 * ART, x = (VIEW_W - w) / 2, y = (VIEW_H - h) / 2;
    panel(ctx, x, y, w, h);
    textCentered(ctx, "JOURNAL", VIEW_W / 2, y + 8 * ART, { color: "#ffd86a" });
    const act = Quests.active(GS), done = Quests.completed(GS);
    let yy = y + 22 * ART;
    if (!act.length && !done.length) {
      drawText(ctx, "No quests yet. Talk to people. Nose about.", x + 12 * ART, yy, { color: "#cfcfe6" });
    }
    for (const { q, stage } of act.slice(0, 4)) {
      drawText(ctx, q.name + "  (" + q.giver + ")", x + 12 * ART, yy, { color: "#ffd86a" });
      yy += 10 * ART;
      drawText(ctx, "> " + q.stages[Math.min(stage, q.stages.length - 1)].goal,
        x + 18 * ART, yy, { color: "#fff", maxWidth: w - 32 * ART });
      yy += 14 * ART;
    }
    if (done.length) {
      drawText(ctx, "Done:", x + 12 * ART, yy, { color: "#7a7a96" });
      yy += 10 * ART;
      for (const { q } of done.slice(0, 3)) {
        drawText(ctx, "* " + q.name, x + 18 * ART, yy, { color: "#8aff6a" });
        yy += 10 * ART;
      }
    }
    drawText(ctx, "(z/esc back)", x + w - 70 * ART, y + h - 11 * ART, { color: "#7a7a96" });
  }

  // ---- Wardrobe: three slots, left/right cycles owned gear ----------------
  updateWardrobe() {
    if (Input.pressed("cancel") || Input.pressed("pause")) { Sfx.cancel(); this.view = "menu"; return; }
    if (Input.pressed("up")) { this.wSlot = (this.wSlot + GEAR_SLOTS.length - 1) % GEAR_SLOTS.length; Sfx.move(); }
    if (Input.pressed("down")) { this.wSlot = (this.wSlot + 1) % GEAR_SLOTS.length; Sfx.move(); }
    const slot = GEAR_SLOTS[this.wSlot];
    if (Input.pressed("left") || Input.pressed("right") || Input.pressed("confirm")) {
      const owned = Object.keys(GEAR).filter((id) => GEAR[id].slot === slot && GS.hasGear(id));
      if (!owned.length) { Sfx.cancel(); return; }
      const opts = [null, ...owned];
      const cur = opts.indexOf(GS.equipped(slot));
      const dir = Input.pressed("left") ? -1 : 1;
      const next = opts[(cur + dir + opts.length) % opts.length];
      GS.equip(slot, next);
      Sfx.confirm();
    }
  }

  renderWardrobe(ctx) {
    const w = 210 * ART, h = 120 * ART, x = (VIEW_W - w) / 2, y = (VIEW_H - h) / 2;
    panel(ctx, x, y, w, h);
    textCentered(ctx, "WARDROBE", VIEW_W / 2, y + 8 * ART, { color: "#ffd86a" });
    GEAR_SLOTS.forEach((slot, i) => {
      const yy = y + 24 * ART + i * 22 * ART;
      const sel = i === this.wSlot;
      if (sel) drawText(ctx, ">", x + 8 * ART, yy, { color: "#ffd86a" });
      const g = GEAR[GS.equipped(slot)];
      drawText(ctx, SLOT_LABEL[slot], x + 16 * ART, yy, { color: sel ? "#ffd86a" : "#9fd0ff" });
      drawText(ctx, g ? g.name : "(nothing)", x + 70 * ART, yy, { color: g ? "#fff" : "#7a7a96" });
      if (g) drawText(ctx, g.desc, x + 16 * ART, yy + 9 * ART, { color: "#8a8ab0", maxWidth: w - 30 * ART });
    });
    const p = crimpPerks(GS);
    drawText(ctx, "Crimp: +" + Math.round(p.headStart) + " start  x" + p.gainMul.toFixed(2) +
      " gain  " + p.comboShield + " shield", x + 12 * ART, y + h - 22 * ART, { color: "#8aff6a" });
    drawText(ctx, "</> equip   (esc back)", x + w - 100 * ART, y + h - 11 * ART, { color: "#7a7a96" });
  }

  renderMenu(ctx) {
    const w = 140 * ART, h = 110 * ART, x = (VIEW_W - w) / 2, y = (VIEW_H - h) / 2;
    panel(ctx, x, y, w, h);
    textCentered(ctx, "PAUSED", VIEW_W / 2, y + 8 * ART, { color: "#ffd86a" });
    this.items.forEach((it, i) => {
      const yy = y + 24 * ART + i * 11 * ART;
      if (i === this.sel) drawText(ctx, ">", x + 18 * ART, yy, { color: "#ffd86a" });
      drawText(ctx, this.label(it), x + 28 * ART, yy, { color: i === this.sel ? "#ffd86a" : "#cfcfe6" });
    });
  }

  renderParty(ctx) {
    const w = 188 * ART, h = 124 * ART, x = (VIEW_W - w) / 2, y = (VIEW_H - h) / 2;
    panel(ctx, x, y, w, h);
    const s = GS.data.stats;
    textCentered(ctx, "THE PARTY", VIEW_W / 2, y + 8 * ART, { color: "#ffd86a" });
    drawText(ctx, "Vince Noir  -  rock & roll star", x + 12 * ART, y + 22 * ART, { color: "#9fd0ff" });
    drawText(ctx, "Howard Moon -  man of jazz", x + 12 * ART, y + 34 * ART, { color: "#e0b070" });
    drawText(ctx, "Level   " + s.level, x + 12 * ART, y + 50 * ART, { color: "#fff" });
    drawText(ctx, "XP      " + s.xp + " / " + s.xpNext, x + 12 * ART, y + 62 * ART, { color: "#fff" });
    drawText(ctx, "Style   " + s.style, x + 12 * ART, y + 74 * ART, { color: "#ff9fd0" });
    drawText(ctx, "Jazz    " + s.jazz, x + 100 * ART, y + 74 * ART, { color: "#9fd0ff" });
    // crimp boost from levels + equipped gear (single source: perks.js)
    const p = crimpPerks(GS);
    drawText(ctx, "Crimp boost  +" + Math.round(p.headStart) + " start  +" +
      Math.round((p.gainMul - 1) * 100) + "% power", x + 12 * ART, y + 90 * ART, { color: "#8aff6a" });
    drawText(ctx, "Records " + GS.recordCount() + " / 6", x + 12 * ART, y + 104 * ART, { color: "#ffd86a" });
    drawText(ctx, GS.shrapnel() + " shrapnel", x + 100 * ART, y + 104 * ART, { color: "#ffe9a0" });
    drawText(ctx, "(z/esc back)", x + w - 70 * ART, y + h - 11 * ART, { color: "#7a7a96" });
  }

  renderItems(ctx) {
    const w = 180 * ART, h = 120 * ART, x = (VIEW_W - w) / 2, y = (VIEW_H - h) / 2;
    panel(ctx, x, y, w, h);
    textCentered(ctx, "ITEMS", VIEW_W / 2, y + 8 * ART, { color: "#ffd86a" });
    const list = GS.itemList();
    if (!list.length) drawText(ctx, "Your pockets are empty.", x + 12 * ART, y + 26 * ART, { color: "#cfcfe6" });
    list.slice(0, 8).forEach((id, i) => {
      const meta = ITEMS[id] || { name: id, desc: "" };
      const yy = y + 24 * ART + i * 11 * ART;
      drawText(ctx, "- " + meta.name + " x" + GS.count(id), x + 12 * ART, yy, { color: "#fff" });
    });
    drawText(ctx, "(z/esc back)", x + w - 70 * ART, y + h - 11 * ART, { color: "#7a7a96" });
  }
}
