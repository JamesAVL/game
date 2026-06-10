// shop.js — the Nabootique counter: a pushed scene in the PauseMenu idiom
// (panel + cursor rows + the same tap-row hit-test), BUY and SELL tabs.
// Buying gear marks it owned (equip in the Wardrobe); items restock forever.

import { Scenes, VIEW_W, VIEW_H, ART, Input } from "../engine/core.js";
import { drawText, textCentered, panel } from "../engine/gfx.js";
import { Sfx } from "../engine/audio.js";
import { GS } from "./state.js";
import { GEAR } from "../data/gear.js";
import { ITEMS } from "../data/items.js";
import { evalWhen } from "../data/quests.js";

const W = 220 * ART, H = 140 * ART;
const ROW_H = 11 * ART, LIST_Y = 36 * ART;

export class ShopMenu {
  constructor(shop, overworld) {
    this.shop = shop;
    this.ow = overworld;
    this.tab = "buy";          // buy | sell
    this.sel = 0;
    this.block = 0.12;
  }

  enter() { Sfx.confirm(); }

  rows() {
    if (this.tab === "buy") {
      return this.shop.stock
        .filter((s) => !s.require || evalWhen(s.require, GS))
        .map((s) => {
          if (s.gear) {
            const g = GEAR[s.gear];
            return { kind: "gear", id: s.gear, name: g.name, desc: g.desc,
              price: s.price != null ? s.price : g.price, owned: GS.hasGear(s.gear) };
          }
          const it = ITEMS[s.item] || { name: s.item, desc: "" };
          return { kind: "item", id: s.item, name: it.name, desc: it.desc, price: s.price || 10 };
        });
    }
    // sell: spare items at the shop's rate (gear is keepsake, never sold)
    return GS.itemList()
      .filter((id) => !id.startsWith("note_") && id !== "record")
      .map((id) => {
        const it = ITEMS[id] || { name: id, desc: "" };
        const base = 20;
        return { kind: "sell", id, name: it.name + " x" + GS.count(id), desc: it.desc,
          price: Math.max(1, Math.round(base * (this.shop.sellRate || 0.5))) };
      });
  }

  update(dt) {
    this.block = Math.max(0, this.block - dt);
    const rows = this.rows();
    if (Input.pressed("cancel") || Input.pressed("pause")) { Sfx.cancel(); Scenes.pop(); return; }
    if (Input.pressed("left") || Input.pressed("right")) {
      this.tab = this.tab === "buy" ? "sell" : "buy";
      this.sel = 0; Sfx.move();
    }
    if (Input.pressed("up")) { this.sel = Math.max(0, this.sel - 1); Sfx.move(); }
    if (Input.pressed("down")) { this.sel = Math.min(Math.max(0, rows.length - 1), this.sel + 1); Sfx.move(); }
    const tap = Input.tap();
    if (tap) {
      const x = (VIEW_W - W) / 2, y = (VIEW_H - H) / 2;
      const i = Math.round((tap.y - (y + LIST_Y)) / ROW_H);
      if (i >= 0 && i < rows.length && tap.x >= x && tap.x <= x + W) this.sel = i;
      // tap the tab strip to flip
      if (tap.y < y + 22 * ART && tap.y > y + 4 * ART) {
        this.tab = tap.x < VIEW_W / 2 ? "buy" : "sell";
        this.sel = 0;
      }
    }
    if (Input.pressed("confirm") && this.block <= 0 && rows.length) {
      const r = rows[Math.min(this.sel, rows.length - 1)];
      this.act(r);
    }
  }

  act(r) {
    if (r.kind === "sell") {
      GS.removeItem(r.id, 1);
      GS.addShrapnel(r.price);
      Sfx.pickup();
      this.ow && this.ow.questBump();
      return;
    }
    if (r.kind === "gear") {
      if (r.owned) { Sfx.cancel(); return; }
      if (!GS.spend(r.price)) { Sfx.cancel(); this.toastNo(); return; }
      GS.ownGear(r.id);
      Sfx.win();
      this.ow && this.ow.toast("Bought " + r.name + "! Equip it in the Wardrobe.");
      this.ow && this.ow.questBump();
      return;
    }
    if (!GS.spend(r.price)) { Sfx.cancel(); this.toastNo(); return; }
    GS.addItem(r.id);
    Sfx.pickup();
    this.ow && this.ow.questBump();
  }

  toastNo() { this.no = 0.8; }

  render(ctx) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const x = (VIEW_W - W) / 2, y = (VIEW_H - H) / 2;
    panel(ctx, x, y, W, H);
    drawText(ctx, this.shop.name.toUpperCase(), x + 10 * ART, y + 6 * ART, { color: "#ffd86a" });
    drawText(ctx, GS.shrapnel() + " shrapnel", x + W - 78 * ART, y + 6 * ART, { color: "#ffe9a0" });
    // tabs
    drawText(ctx, "BUY", x + 40 * ART, y + 18 * ART, { color: this.tab === "buy" ? "#ffd86a" : "#7a7a96" });
    drawText(ctx, "SELL", x + W - 60 * ART, y + 18 * ART, { color: this.tab === "sell" ? "#ffd86a" : "#7a7a96" });

    const rows = this.rows();
    if (!rows.length) {
      drawText(ctx, this.tab === "buy" ? "Sold out. Come back later." : "Nothing to flog.", x + 14 * ART, y + LIST_Y, { color: "#cfcfe6" });
    }
    rows.slice(0, 7).forEach((r, i) => {
      const yy = y + LIST_Y + i * ROW_H;
      const seld = i === this.sel;
      if (seld) drawText(ctx, ">", x + 8 * ART, yy, { color: "#ffd86a" });
      const label = r.owned ? r.name + "  (owned)" : r.name;
      drawText(ctx, label, x + 16 * ART, yy, { color: r.owned ? "#7a7a96" : seld ? "#ffd86a" : "#fff" });
      if (!r.owned) drawText(ctx, String(r.price), x + W - 36 * ART, yy, { color: "#ffe9a0" });
    });

    // selected row's description + keeper's line
    const r = rows[Math.min(this.sel, rows.length - 1)];
    if (r) drawText(ctx, r.desc, x + 12 * ART, y + H - 30 * ART, { color: "#9fd0ff", maxWidth: W - 24 * ART });
    if (this.no > 0) {
      this.no -= 1 / 60;
      textCentered(ctx, "Not enough shrapnel. " + this.shop.keeper + " doesn't do tabs.", VIEW_W / 2, y + H - 38 * ART, { color: "#ff8a8a" });
    }
    drawText(ctx, "</> tabs   z buy/sell   esc leave", x + 12 * ART, y + H - 10 * ART, { color: "#7a7a96" });
  }
}
