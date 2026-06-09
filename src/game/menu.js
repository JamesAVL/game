// menu.js — pause menu overlay with Resume / Party stats / Save / Quit.

import { Scenes, VIEW_W, VIEW_H, ART, Input, Save } from "../engine/core.js";
import { Renderer } from "../engine/renderer.js";
import { drawText, textCentered, panel } from "../engine/gfx.js";
import { Sfx } from "../engine/audio.js";
import { GS } from "./state.js";
import { ITEMS } from "../data/items.js";
import { QUESTS } from "../data/quests.js";
import { CODEX } from "../data/codex.js";

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
    this.items = ["Resume", "Party", "Items", "Codex", "Difficulty", "Visual FX", "Save", "Quit to title"];
    this.view = "menu";
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
      const w = 140 * ART, h = 122 * ART, x = (VIEW_W - w) / 2, y = (VIEW_H - h) / 2;
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
      else if (choice === "Party") this.view = "party";
      else if (choice === "Items") this.view = "items";
      else if (choice === "Codex") this.view = "codex";
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
    else if (this.view === "codex") this.renderCodex(ctx);
    else this.renderItems(ctx);
  }

  renderMenu(ctx) {
    const w = 140 * ART, h = 122 * ART, x = (VIEW_W - w) / 2, y = (VIEW_H - h) / 2;
    panel(ctx, x, y, w, h);
    textCentered(ctx, "PAUSED", VIEW_W / 2, y + 8 * ART, { color: "#ffd86a" });
    this.items.forEach((it, i) => {
      const yy = y + 24 * ART + i * 11 * ART;
      if (i === this.sel) drawText(ctx, ">", x + 18 * ART, yy, { color: "#ffd86a" });
      drawText(ctx, this.label(it), x + 28 * ART, yy, { color: i === this.sel ? "#ffd86a" : "#cfcfe6" });
    });
  }

  renderParty(ctx) {
    const w = 188 * ART, h = 138 * ART, x = (VIEW_W - w) / 2, y = (VIEW_H - h) / 2;
    panel(ctx, x, y, w, h);
    const s = GS.data.stats;
    textCentered(ctx, "THE PARTY", VIEW_W / 2, y + 8 * ART, { color: "#ffd86a" });
    drawText(ctx, "Vince Noir  -  rock & roll star", x + 12 * ART, y + 22 * ART, { color: "#9fd0ff" });
    drawText(ctx, "Howard Moon -  man of jazz", x + 12 * ART, y + 34 * ART, { color: "#e0b070" });
    drawText(ctx, "Level   " + s.level + (GS.data.ngPlus ? "   (New Journey+" + GS.data.ngPlus + ")" : ""), x + 12 * ART, y + 50 * ART, { color: "#fff" });
    drawText(ctx, "XP      " + s.xp + " / " + s.xpNext, x + 12 * ART, y + 62 * ART, { color: "#fff" });
    drawText(ctx, "Style   " + s.style, x + 12 * ART, y + 74 * ART, { color: "#ff9fd0" });
    drawText(ctx, "Jazz    " + s.jazz, x + 100 * ART, y + 74 * ART, { color: "#9fd0ff" });
    // crimp boost earned from levelling (mirrors crimp.js perk caps)
    const over = Math.max(0, s.level - 1);
    const hs = Math.round(Math.min(15, over * 1.5));
    const pw = Math.round(Math.min(35, over * 3.5));
    drawText(ctx, "Crimp boost  +" + hs + " start  +" + pw + "% power", x + 12 * ART, y + 90 * ART, { color: "#8aff6a" });
    drawText(ctx, "Records " + GS.recordCount() + " / " + GS.totalRecords(), x + 12 * ART, y + 104 * ART, { color: "#ffd86a" });
    const gs = Object.values(GS.data.grades || {});
    if (gs.length) {
      const sCount = gs.filter((g) => g === "S").length;
      drawText(ctx, "Grades  " + gs.join(" ") + (sCount ? "   (" + sCount + " S!)" : ""), x + 100 * ART, y + 104 * ART, { color: "#9fd0ff" });
    }
    // active quest (first unfinished chain, current step text)
    for (const [qid, q] of Object.entries(QUESTS)) {
      const step = GS.quest(qid);
      if (step > 0 && step < q.done) {
        drawText(ctx, "Quest: " + q.steps[step], x + 12 * ART, y + 118 * ART, { color: "#c79aff", maxWidth: w - 24 * ART });
        break;
      }
    }
    drawText(ctx, "(z/esc back)", x + w - 70 * ART, y + h - 11 * ART, { color: "#7a7a96" });
  }

  renderCodex(ctx) {
    const w = 188 * ART, h = 130 * ART, x = (VIEW_W - w) / 2, y = (VIEW_H - h) / 2;
    panel(ctx, x, y, w, h);
    const total = CODEX.length;
    const got = CODEX.filter((c) => GS.flag(c.id)).length;
    textCentered(ctx, "NABOO'S LEDGER  " + got + " / " + total, VIEW_W / 2, y + 8 * ART, { color: "#ffd86a" });
    // per-zone completion, plus the latest unlocked entry as a teaser
    const zones = [];
    for (const c of CODEX) if (!zones.includes(c.zone)) zones.push(c.zone);
    zones.forEach((z, i) => {
      const all = CODEX.filter((c) => c.zone === z);
      const have = all.filter((c) => GS.flag(c.id)).length;
      const yy = y + 24 * ART + i * 11 * ART;
      const done = have === all.length;
      drawText(ctx, z, x + 12 * ART, yy, { color: done ? "#8aff6a" : "#cfcfe6" });
      drawText(ctx, have + "/" + all.length, x + w - 40 * ART, yy, { color: done ? "#8aff6a" : "#9a9ab6" });
    });
    let latest = null;
    for (const c of CODEX) if (GS.flag(c.id)) latest = c;
    drawText(ctx, latest ? "Latest: " + latest.title : "Search the worlds to fill the ledger.",
      x + 12 * ART, y + h - 22 * ART, { color: "#c79aff" });
    // challenge medals across all crimps (full combo / no-miss)
    const med = Object.values(GS.data.medals || {});
    const fc = med.filter((m) => m.fc).length, nm = med.filter((m) => m.nm).length;
    if (fc || nm) drawText(ctx, "Medals: " + fc + " full-combo  " + nm + " no-miss", x + 12 * ART, y + h - 33 * ART, { color: "#8aff6a" });
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
