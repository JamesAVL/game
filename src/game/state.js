// state.js — the persistent game state: story flags, inventory, party stats,
// crimp records collected, current zone + position, and save/load.

import { Save } from "../engine/core.js";

function fresh() {
  return {
    flags: {},
    items: {},
    stats: { level: 1, xp: 0, xpNext: 10, style: 5, jazz: 5 },
    records: [],            // ids of crimp records won (one per world)
    unlocked: { hub: true },
    zone: "hub",
    spawn: null,            // {x,y,dir} override, else zone default
    playtime: 0,
    difficulty: Save.optGet("difficulty", "normal"),  // easy | normal | hard
  };
}

export const DIFFICULTIES = ["easy", "normal", "hard"];

export const GS = {
  data: fresh(),

  reset() { this.data = fresh(); },

  // ---- flags -------------------------------------------------------------
  flag(k) { return !!this.data.flags[k]; },
  setFlag(k, v = true) { this.data.flags[k] = v; },

  // ---- inventory ---------------------------------------------------------
  has(id) { return (this.data.items[id] || 0) > 0; },
  count(id) { return this.data.items[id] || 0; },
  addItem(id, n = 1) { this.data.items[id] = (this.data.items[id] || 0) + n; },
  removeItem(id, n = 1) { this.data.items[id] = Math.max(0, (this.data.items[id] || 0) - n); },
  itemList() { return Object.keys(this.data.items).filter((k) => this.data.items[k] > 0); },

  // ---- difficulty --------------------------------------------------------
  difficulty() { return this.data.difficulty || "normal"; },
  setDifficulty(d) { this.data.difficulty = d; Save.optSet("difficulty", d); },
  cycleDifficulty() {
    const i = DIFFICULTIES.indexOf(this.difficulty());
    this.setDifficulty(DIFFICULTIES[(i + 1) % DIFFICULTIES.length]);
    return this.difficulty();
  },

  // ---- progression -------------------------------------------------------
  unlock(zone) { this.data.unlocked[zone] = true; },
  isUnlocked(zone) { return !!this.data.unlocked[zone]; },
  hasRecord(id) { return this.data.records.includes(id); },
  addRecord(id) { if (!this.hasRecord(id)) this.data.records.push(id); },
  recordCount() { return this.data.records.length; },

  // ---- stats / XP --------------------------------------------------------
  addXp(n) {
    const s = this.data.stats;
    s.xp += n;
    const ups = [];
    while (s.xp >= s.xpNext) {
      s.xp -= s.xpNext;
      s.level++;
      s.xpNext = Math.floor(s.xpNext * 1.6) + 6;
      s.style += 2; s.jazz += 2;
      ups.push(s.level);
    }
    return ups; // array of new levels reached
  },

  // ---- persistence -------------------------------------------------------
  save() { return Save.write(this.data); },
  load() {
    const d = Save.read();
    if (!d) return false;
    this.data = Object.assign(fresh(), d);
    this.data.stats = Object.assign(fresh().stats, d.stats || {});
    return true;
  },
};
