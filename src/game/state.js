// state.js — the persistent game state: story flags, inventory, party stats,
// crimp records collected, current zone + position, and save/load.
//
// v2 adds the deep-gameplay layer: Shrapnel (currency), quests, gear/wardrobe,
// collectible sets, per-crimp bests, the world clock, and visited zones.
// Migration is automatic: load() deep-defaults every new key, so v1 saves
// continue seamlessly.

import { Save } from "../engine/save.js";

function fresh() {
  return {
    v: 2,
    flags: {},
    items: {},
    stats: { level: 1, xp: 0, xpNext: 10, style: 5, jazz: 5 },
    records: [],            // ids of crimp records won (one per world)
    unlocked: { hub: true, nabootique: true },
    zone: "hub",
    spawn: null,            // {x,y,dir} override, else zone default
    playtime: 0,
    difficulty: Save.optGet("difficulty", "normal"),  // easy | normal | hard
    // ---- v2: the deep-gameplay layer ------------------------------------
    shrapnel: 0,            // currency: Naboo pays wages in loose change
    quests: {},             // qid -> { stage, state: "active"|"done" }
    gear: { vince: null, howard: null, charm: null },  // equipped ids
    owned: {},              // gearId -> true (the wardrobe)
    collections: {},        // setId -> { [idx]: true }
    bests: {},              // crimpId -> { grade, acc, combo, tier }
    clock: 9 * 60,          // game-time minutes (a day = 24 real minutes)
    day: 0,
    visited: { hub: true }, // zoneId -> true (map / fast travel)
    arcade: { best: 0, lastDay: -1 },
    ng: 0,
  };
}

export const DIFFICULTIES = ["easy", "normal", "hard"];

// grade ladder, best-first (used by quests' `best` conditions and the album)
export const GRADES = ["S", "A", "B", "C", "F"];
export function gradeAtLeast(g, want) {
  return GRADES.indexOf(g) > -1 && GRADES.indexOf(g) <= GRADES.indexOf(want);
}

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

  // ---- currency ------------------------------------------------------------
  shrapnel() { return this.data.shrapnel || 0; },
  addShrapnel(n) { this.data.shrapnel = Math.max(0, (this.data.shrapnel || 0) + Math.round(n)); },
  spend(n) {
    if ((this.data.shrapnel || 0) < n) return false;
    this.data.shrapnel -= n;
    return true;
  },

  // ---- quests --------------------------------------------------------------
  questState(id) { return this.data.quests[id] || null; },
  startQuest(id) { if (!this.data.quests[id]) this.data.quests[id] = { stage: 0, state: "active" }; },
  advanceQuest(id) { const q = this.data.quests[id]; if (q && q.state === "active") q.stage++; },
  completeQuest(id) { const q = this.data.quests[id]; if (q) q.state = "done"; },

  // ---- gear / wardrobe -------------------------------------------------------
  ownGear(id) { this.data.owned[id] = true; },
  hasGear(id) { return !!this.data.owned[id]; },
  equip(slot, id) { this.data.gear[slot] = id; },
  equipped(slot) { return this.data.gear[slot]; },

  // ---- collections -----------------------------------------------------------
  collFound(setId, idx) {
    const c = this.data.collections[setId] || (this.data.collections[setId] = {});
    if (c[idx]) return false;
    c[idx] = true;
    return true;
  },
  collHas(setId, idx) { return !!(this.data.collections[setId] || {})[idx]; },
  collCount(setId) { return Object.keys(this.data.collections[setId] || {}).length; },

  // ---- crimp bests -------------------------------------------------------------
  best(crimpId) { return this.data.bests[crimpId] || null; },
  setBest(crimpId, perf) {
    const cur = this.data.bests[crimpId];
    const better = !cur ||
      GRADES.indexOf(perf.grade) < GRADES.indexOf(cur.grade) ||
      (perf.grade === cur.grade && perf.acc > cur.acc);
    if (better) this.data.bests[crimpId] = { grade: perf.grade, acc: perf.acc, combo: perf.combo, tier: perf.tier || 0 };
    return better;
  },

  // ---- clock --------------------------------------------------------------------
  clockHM() {
    const m = Math.floor(this.data.clock % (24 * 60));
    return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(Math.floor(m % 60)).padStart(2, "0");
  },

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
    // every key absent from an old save deep-defaults from fresh()
    this.data = Object.assign(fresh(), d);
    this.data.stats = Object.assign(fresh().stats, d.stats || {});
    this.data.gear = Object.assign(fresh().gear, d.gear || {});
    this.data.arcade = Object.assign(fresh().arcade, d.arcade || {});
    this.data.unlocked = Object.assign(fresh().unlocked, d.unlocked || {});
    this.data.v = 2;
    return true;
  },
};
