// overworld.js — the explorable scene. Owns the current zone, the party, the
// camera, music, and all interaction (talk, signs, item pickups, warps, and
// boss crimp-offs). Pausing opens the menu.

import { Scenes, VIEW_W, VIEW_H, TILE, ART, Input, img, Save } from "../engine/core.js";
import { drawText, textCentered, textWidth, panel, drawFrame } from "../engine/gfx.js";
import { Camera } from "../engine/gfx.js";
import { Sfx, playMusic, stopMusic } from "../engine/audio.js";
import { buildZone, getZone } from "./world.js";
import { Party } from "./player.js";
import { GS } from "./state.js";
import { Dialogue } from "./dialogue.js";
import { Crimp } from "./crimp.js";
import { DIALOG } from "../data/dialogue.js";
import { CRIMPS } from "../data/crimps.js";
import { ITEMS, ITEM_INDEX, PROP_INDEX } from "../data/items.js";
import { TRACKS } from "../data/music.js";
import { PauseMenu } from "./menu.js";

// per-zone ambient weather (screen-space particles for atmosphere)
const WEATHER = {
  hub: "pollen", tundra: "snow", sea: "bubbles", forest: "leaves",
  night: "embers", moon: "stars", temple: "dust",
};
const WEATHER_CFG = {
  snow: { n: 60, color: "#ffffff", vy: [12, 26], vx: [-8, 8], size: [1, 2], rise: false, sway: 10, alpha: 0.85 },
  bubbles: { n: 34, color: "#bfeaff", vy: [-22, -10], vx: [-4, 4], size: [1, 3], rise: true, sway: 8, alpha: 0.5 },
  embers: { n: 40, color: "#ff9a3a", vy: [-30, -14], vx: [-6, 6], size: [1, 2], rise: true, sway: 6, alpha: 0.8 },
  leaves: { n: 30, color: "#9ad06a", vy: [10, 22], vx: [-14, 14], size: [1, 2], rise: false, sway: 16, alpha: 0.85 },
  stars: { n: 50, color: "#fff6c0", vy: [-6, -2], vx: [-2, 2], size: [1, 2], rise: true, sway: 4, alpha: 0.9, twinkle: true },
  dust: { n: 36, color: "#e6d2a0", vy: [-4, 4], vx: [-5, 5], size: [1, 1], rise: false, sway: 6, alpha: 0.4 },
  pollen: { n: 24, color: "#dfe8a0", vy: [-5, 5], vx: [-6, 6], size: [1, 1], rise: false, sway: 8, alpha: 0.5 },
};

function rr(a, b) { return a + Math.random() * (b - a); }

export class Overworld {
  constructor() {
    this.cam = new Camera();
    this.toastMsg = ""; this.toastT = 0;
    this.musicKey = null;
    this.fadeT = 0;
    this.particles = [];
    this.loadZone(GS.data.zone, GS.data.spawn);
  }

  api() {
    const self = this;
    return {
      gs: GS,
      flag: (k) => GS.flag(k),
      setFlag: (k, v = true) => GS.setFlag(k, v),
      has: (id) => GS.has(id),
      count: (id) => GS.count(id),
      give: (id, n = 1) => { GS.addItem(id, n); self.toast("Got " + (ITEMS[id] ? ITEMS[id].name : id) + "!"); Sfx.pickup(); },
      take: (id, n = 1) => GS.removeItem(id, n),
      addXp: (n) => self.grantXp(n),
      unlock: (z) => { if (!GS.isUnlocked(z)) { GS.unlock(z); self.toast("New path opened!"); } },
      addRecord: (id) => GS.addRecord(id),
      hasRecord: (id) => GS.hasRecord(id),
      recordCount: () => GS.recordCount(),
      toast: (m) => self.toast(m),
      goto: (z, sp) => self.warpTo(z, sp),
      startCrimp: (id, onResult) => self.beginCrimp(id, onResult),
      say: (pages, onDone) => Scenes.push(new Dialogue(pages, onDone)),
      save: () => { GS.save(); self.toast("Game saved."); },
    };
  }

  loadZone(id, spawn) {
    const z = buildZone(id);
    this.zone = z;
    this.def = z.def;
    this.tilemap = z.tilemap;
    this.entities = z.entities;
    this.cam.setBounds(this.tilemap.pxW, this.tilemap.pxH);
    GS.data.zone = id;
    this.fadeT = 0.55;                 // fade in on arrival
    this.weather = z.def.weather || WEATHER[id] || "none";
    this.particles.length = 0;
    const sp = spawn || z.def.spawn || { x: 2, y: 2, dir: "down" };
    // spawn.y is the tile the character STANDS on; the sprite sits 8px (×ART)
    // higher so its feet land in that tile (not the tile below).
    this.party = new Party(sp.x * TILE, sp.y * TILE - 8 * ART, sp.dir || "down");
    this.cam.follow(this.party.centerX(), this.party.feetY());
    this.toast(z.def.name);
    const mk = z.def.music;
    if (mk && mk !== this.musicKey && TRACKS[mk]) { playMusic(TRACKS[mk]); this.musicKey = mk; }
    // run zone-entry script once
    if (z.def.onEnter && !GS.flag("entered_" + id)) {
      GS.setFlag("entered_" + id);
      const built = this.buildDialog(z.def.onEnter);
      if (built) Scenes.push(new Dialogue(built.pages, built.onDone));
    }
  }

  warpTo(zoneId, spawn) {
    if (!GS.isUnlocked(zoneId)) { this.toast("That way is sealed for now."); return; }
    Sfx.warp();
    GS.data.spawn = spawn || null;
    this.loadZone(zoneId, spawn);
  }

  toast(msg) { this.toastMsg = msg; this.toastT = 2.4; }

  grantXp(n) {
    const ups = GS.addXp(n);
    if (ups.length) this.toast("Level up! Now level " + ups[ups.length - 1]);
  }

  buildDialog(id) {
    const fn = DIALOG[id];
    if (!fn) { console.warn("no dialog", id); return null; }
    let r = fn(this.api());
    if (Array.isArray(r)) r = { pages: r, onDone: null };
    return r;
  }

  startDialog(id) {
    const b = this.buildDialog(id);
    if (b) Scenes.push(new Dialogue(b.pages, b.onDone));
  }

  beginCrimp(id, onResult) {
    const base = CRIMPS[id];
    if (!base) { console.warn("no crimp", id); onResult && onResult(true); return; }
    const def = Object.assign({}, base, { track: TRACKS[base.trackKey] || base.track, onResult });
    stopMusic(); this.musicKey = null;
    Scenes.push(new Crimp(def));
  }

  doBoss(ent) {
    const self = this;
    if (ent.winFlag && GS.flag(ent.winFlag)) {
      // already beaten -> friendly post-battle line
      if (ent.afterDialog) this.startDialog(ent.afterDialog);
      return;
    }
    if (ent.require && !GS.has(ent.require)) {
      if (ent.requireDialog) this.startDialog(ent.requireDialog);
      return;
    }
    // collectible-hunt gate: must gather the zone's crimp notes first
    const col = this.def.collect;
    if (col && GS.count(col.item) < col.need) {
      if (col.dialog) this.startDialog(col.dialog);
      else this.toast("Gather all " + col.need + " " + (col.label || "notes") + " first!");
      return;
    }
    const pre = this.buildDialog(ent.dialog);
    const onDone = () => {
      self.beginCrimp(ent.crimp, (win) => {
        if (win) {
          if (ent.winFlag) GS.setFlag(ent.winFlag);
          if (ent.record) GS.addRecord(ent.record);
          if (ent.unlock) { GS.unlock(ent.unlock); }
          if (ent.xp) self.grantXp(ent.xp);
          GS.save();
          if (ent.winDialog) self.startDialog(ent.winDialog);
        } else {
          if (ent.loseDialog) self.startDialog(ent.loseDialog);
        }
        // restore zone music
        if (self.def.music && TRACKS[self.def.music]) { playMusic(TRACKS[self.def.music]); self.musicKey = self.def.music; }
      });
    };
    if (pre) Scenes.push(new Dialogue(pre.pages, onDone));
    else onDone();
  }

  portalPrompt(e) {
    const unlocked = GS.isUnlocked(e.to);
    if (!unlocked) {
      Scenes.push(new Dialogue([{ speaker: "", text: e.label + "\nThe way shimmers but stays sealed. Win more crimp records to open it." }]));
      return;
    }
    let go = false;
    const pages = [{
      choice: e.label + "\nStep through the portal?",
      options: [
        { label: "Yes, come with us", next: [], act: () => { go = true; } },
        { label: "Not just yet", next: [] },
      ],
    }];
    Scenes.push(new Dialogue(pages, () => { if (go) this.warpTo(e.to, e.spawn); }));
  }

  interact() {
    const p = this.party.interactPoint();
    const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
    for (const e of this.entities) {
      const ex = Math.floor(e.px / TILE), ey = Math.floor(e.py / TILE);
      const near = (Math.abs(ex - tx) <= (e.w / TILE) && Math.abs(ey - ty) <= (e.h / TILE)) || (ex === tx && ey === ty);
      if (!near) continue;
      if (e.type === "npc") { if (e.dialog) this.startDialog(e.dialog); return true; }
      if (e.type === "sign") { if (e.dialog) this.startDialog(e.dialog); return true; }
      if (e.type === "boss") { this.doBoss(e); return true; }
      if (e.type === "portal") { this.portalPrompt(e); return true; }
      if (e.type === "search") { this.doSearch(e); return true; }
    }
    return false;
  }

  doSearch(e) {
    const f = e.flag || ("srch_" + e.x + "_" + e.y);
    if (!GS.flag(f)) {
      GS.setFlag(f);
      e._searched = true;
      if (e.item) { GS.addItem(e.item); this.toast("Found " + (ITEMS[e.item] ? ITEMS[e.item].name : e.item) + "!"); Sfx.pickup(); }
      else Sfx.confirm();
      if (e.xp) this.grantXp(e.xp);
      if (e.dialog) this.startDialog(e.dialog);
    } else {
      if (e.emptyDialog) this.startDialog(e.emptyDialog);
      else { Sfx.cancel(); this.toast(e.emptyText || "Nothing left in there."); }
    }
  }

  openGate(gateId) {
    for (const g of this.entities) {
      if (g.type === "gate" && g.gate === gateId) {
        const gx = Math.floor(g.px / TILE), gy = Math.floor(g.py / TILE);
        if (this.tilemap.solids[gy]) this.tilemap.solids[gy][gx] = false;
        g._open = true;
      }
    }
  }

  checkStanding() {
    const cx = this.party.centerX(), cy = this.party.feetY() - 4;
    const tx = Math.floor(cx / TILE), ty = Math.floor(cy / TILE);
    for (const e of this.entities) {
      const ex = Math.floor(e.px / TILE), ey = Math.floor(e.py / TILE);
      if (ex !== tx || ey !== ty) continue;
      if (e.type === "warp") { this.warpTo(e.to, { x: e.tox, y: e.toy, dir: e.todir || "down" }); return; }
      if (e.type === "item") {
        const f = e.flag || ("item_" + e.item + "_" + e.x + "_" + e.y);
        if (!GS.flag(f)) {
          GS.setFlag(f); GS.addItem(e.item);
          Sfx.pickup(); this.toast("Found " + (ITEMS[e.item] ? ITEMS[e.item].name : e.item) + "!");
          e._gone = true;
          if (e.onGet) this.startDialog(e.onGet);
        }
      }
      if (e.type === "trigger" && e.dialog) {
        const f = "trig_" + e.x + "_" + e.y;
        if (!e.once || !GS.flag(f)) { if (e.once) GS.setFlag(f); this.startDialog(e.dialog); }
      }
      if (e.type === "switch") {
        const fk = "sw_" + e.gate;
        if (!GS.flag(fk)) {
          GS.setFlag(fk); Sfx.confirm();
          this.openGate(e.gate);
          this.toast(e.toast || "Something rumbles open nearby!");
        }
      }
    }
  }

  updateWeather(dt) {
    const cfg = WEATHER_CFG[this.weather];
    if (!cfg) { this.particles.length = 0; return; }
    // top up
    while (this.particles.length < cfg.n) {
      this.particles.push({
        x: rr(-10, VIEW_W + 10),
        y: cfg.rise ? rr(0, VIEW_H + 10) : rr(-10, VIEW_H),
        vx: rr(cfg.vx[0], cfg.vx[1]) * ART,
        vy: rr(cfg.vy[0], cfg.vy[1]) * ART,
        s: Math.max(1, Math.round(rr(cfg.size[0], cfg.size[1]) * ART)),
        ph: rr(0, Math.PI * 2),
      });
    }
    for (const p of this.particles) {
      p.ph += dt * 2;
      p.x += (p.vx + Math.sin(p.ph) * cfg.sway * ART) * dt;
      p.y += p.vy * dt;
      if (p.y < -12) { p.y = VIEW_H + 6; p.x = rr(-10, VIEW_W + 10); }
      else if (p.y > VIEW_H + 12) { p.y = -6; p.x = rr(-10, VIEW_W + 10); }
      if (p.x < -14) p.x = VIEW_W + 8; else if (p.x > VIEW_W + 14) p.x = -8;
    }
  }

  renderWeather(ctx) {
    const cfg = WEATHER_CFG[this.weather];
    if (!cfg) return;
    ctx.fillStyle = cfg.color;
    for (const p of this.particles) {
      let a = cfg.alpha;
      if (cfg.twinkle) a *= 0.4 + 0.6 * Math.abs(Math.sin(p.ph));
      ctx.globalAlpha = a;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    }
    ctx.globalAlpha = 1;
  }

  update(dt) {
    GS.data.playtime += dt;
    if (this.toastT > 0) this.toastT -= dt;
    if (this.fadeT > 0) this.fadeT -= dt;
    this.updateWeather(dt);

    if (Input.pressed("pause") || Input.pressed("cancel")) { Scenes.push(new PauseMenu(this)); return; }
    if (Input.pressed("mute")) { import("../engine/audio.js").then((m) => { const muted = m.toggleMute(); this.toast(muted ? "Muted" : "Sound on"); }); }

    this.party.update(dt, this.tilemap);
    // entity collision (block on npc/boss tiles handled via solids in world build)
    GS.data.px = this.party.px; GS.data.py = this.party.py;

    if (Input.pressed("confirm")) { if (this.interact()) return; }
    this.checkStanding();
    this.entities = this.entities.filter((e) => !e._gone);

    this.cam.follow(this.party.centerX(), this.party.feetY());
  }

  drawEntity(ctx, e) {
    const dx = e.px - this.cam.x, dy = e.py - this.cam.y;
    if (e.type === "npc") {
      const im = img(e.sprite);
      // draw only the down-idle frame (works for single sprites and sheets)
      if (im) drawFrame(ctx, im, 16 * ART, 24 * ART, 0, 0, dx, dy - 8 * ART);
    } else if (e.type === "boss") {
      const im = img(e.sprite);
      if (im) ctx.drawImage(im, dx + 8 * ART - im.width / 2, dy + 16 * ART - im.height);
    } else if (e.type === "item") {
      const im = img("items");
      const idx = ITEM_INDEX[e.item] || 0;
      const bob = Math.sin(performance.now() / 300 + e.px) * 1.5 * ART;
      if (im) ctx.drawImage(im, idx * TILE, 0, TILE, TILE, dx, dy + bob, TILE, TILE);
    } else if (e.type === "search") {
      const im = img("props");
      const idx = PROP_INDEX[e.prop] != null ? PROP_INDEX[e.prop] : PROP_INDEX.crate;
      const done = GS.flag(e.flag || ("srch_" + e.x + "_" + e.y));
      ctx.globalAlpha = done ? 0.45 : 1;
      if (im) drawFrame(ctx, im, 16 * ART, 24 * ART, idx, 0, dx, dy - 8 * ART);
      ctx.globalAlpha = 1;
    } else if (e.type === "switch") {
      const im = img("props");
      const on = GS.flag("sw_" + e.gate);
      if (im) drawFrame(ctx, im, 16 * ART, 24 * ART, on ? PROP_INDEX.switch_down : PROP_INDEX.switch_up, 0, dx, dy - 8 * ART);
    } else if (e.type === "gate") {
      const open = GS.flag("sw_" + e.gate);
      const im = img("props");
      ctx.globalAlpha = open ? 0.5 : 1;
      if (im) drawFrame(ctx, im, 16 * ART, 24 * ART, open ? PROP_INDEX.gate_open : PROP_INDEX.gate_closed, 0, dx, dy - 8 * ART);
      ctx.globalAlpha = 1;
    } else if (e.type === "portal") {
      const cx = dx + 8 * ART, cy = dy + 8 * ART;
      const open = GS.isUnlocked(e.to);
      const col = open ? (e.color || "#9fe0ff") : "#555a70";
      const tnow = performance.now() / 1000;
      // swirling glowing ring
      for (let r = 9; r >= 2; r -= 2) {
        ctx.globalAlpha = open ? (0.18 + 0.12 * Math.sin(tnow * 3 + r)) : 0.12;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(cx, cy, (r + (open ? Math.sin(tnow * 2 + r) : 0)) * ART, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // sparkles
      if (open) {
        for (let i = 0; i < 4; i++) {
          const a = tnow * 2 + i * Math.PI / 2;
          ctx.fillStyle = "#ffffff";
          ctx.globalAlpha = 0.6;
          ctx.fillRect(cx + Math.cos(a) * 7 * ART - 0.5 * ART, cy + Math.sin(a) * 7 * ART - 0.5 * ART, 1.5 * ART, 1.5 * ART);
        }
        ctx.globalAlpha = 1;
      }
      // label
      const lbl = open ? e.label : "??? (sealed)";
      const w = textWidth(lbl);
      drawText(ctx, lbl, cx - w / 2, dy - 12 * ART, { color: open ? "#fff" : "#888", shadow: "#000" });
    }
  }

  render(ctx) {
    this.tilemap.renderGround(ctx, this.cam);

    // y-sorted drawables: entities + party
    const list = [];
    for (const e of this.entities) {
      if (["npc", "boss", "item", "portal", "search", "switch", "gate"].includes(e.type))
        list.push({ y: e.py + 16 * ART, draw: (c) => this.drawEntity(c, e) });
    }
    for (const d of this.party.drawables()) list.push(d);
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.draw(ctx, this.cam);

    this.tilemap.renderOver(ctx, this.cam);

    this.renderWeather(ctx);

    // ---- HUD ----
    this.renderHud(ctx);

    // fade-in overlay on zone entry
    if (this.fadeT > 0) {
      ctx.fillStyle = "rgba(8,6,16," + Math.min(1, this.fadeT / 0.55) + ")";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  renderHud(ctx) {
    // top status strip
    drawText(ctx, "Records " + GS.recordCount() + "/6", 6 * ART, 5 * ART, { color: "#ffd86a", shadow: "#000" });
    drawText(ctx, "Lv " + GS.data.stats.level, VIEW_W - 36 * ART, 5 * ART, { color: "#9fd0ff", shadow: "#000" });

    // collectible objective for the current zone
    const col = this.def.collect;
    if (col) {
      const have = GS.count(col.item);
      const done = have >= col.need;
      textCentered(ctx, (col.label || "Notes") + " " + Math.min(have, col.need) + "/" + col.need,
        VIEW_W / 2, 5 * ART, { color: done ? "#8aff6a" : "#c79aff", shadow: "#000" });
    }

    if (this.toastT > 0) {
      const a = Math.min(1, this.toastT);
      const w = Math.min(VIEW_W - 20 * ART, this.toastMsg.length * 6 * ART + 16 * ART);
      ctx.globalAlpha = a;
      panel(ctx, (VIEW_W - w) / 2, 18 * ART, w, 14 * ART);
      textCentered(ctx, this.toastMsg, VIEW_W / 2, 21 * ART, { color: "#fff" });
      ctx.globalAlpha = 1;
    }

    // controls hint (fades after start)
    if (GS.data.playtime < 14) {
      drawText(ctx, "Arrows/WASD move   Z talk   P menu", 6 * ART, VIEW_H - 9 * ART, { color: "rgba(220,220,240,0.7)", shadow: "#000" });
    }
  }
}
