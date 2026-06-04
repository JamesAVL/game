// zones.js — every explorable area as an authored grid + entity list.
// Maps are built with helpers (blank/rect/scatter/pocket) so tile coordinates
// stay exact. Tile chars follow the LEGEND in game/world.js.
//
// Worlds share a layout via makeWorld(): explore a larger map, gather 3 Crimp
// Notes (one in the open, one behind a switch-gated pocket, one in a chest),
// search themed scenery for XP/lore, help a side-quest NPC, then out-crimp the
// boss (gated on the 3 notes). Crimps are boss-only.

function blank(w, h, edge = "#", floor = ".") {
  const m = [];
  for (let y = 0; y < h; y++) {
    let r = "";
    for (let x = 0; x < w; x++) r += (x === 0 || y === 0 || x === w - 1 || y === h - 1) ? edge : floor;
    m.push(r);
  }
  return m;
}
function set(m, x, y, ch) { if (m[y] && x >= 0 && x < m[y].length) m[y] = m[y].substring(0, x) + ch + m[y].substring(x + 1); }
function rect(m, x, y, w, h, ch) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(m, x + i, y + j, ch); }
function hline(m, x, y, w, ch) { for (let i = 0; i < w; i++) set(m, x + i, y, ch); }
function vline(m, x, y, h, ch) { for (let i = 0; i < h; i++) set(m, x, y + i, ch); }
function scatter(m, ch, list) { for (const [x, y] of list) set(m, x, y, ch); }
// hollow wall box (a pocket room); caller punches a door + places a gate
function pocket(m, x, y, w, h) {
  for (let i = 0; i < w; i++) { set(m, x + i, y, "#"); set(m, x + i, y + h - 1, "#"); }
  for (let j = 0; j < h; j++) { set(m, x, y + j, "#"); set(m, x + w - 1, y + j, "#"); }
}

// ---------------------------------------------------------------------------
// HUB — the Zooniverse courtyard with portals to every world
// ---------------------------------------------------------------------------
function hubMap() {
  const m = blank(34, 22, "#", ".");
  rect(m, 3, 2, 8, 4, "X"); set(m, 6, 5, "D"); set(m, 7, 5, "D");   // Nabootique
  rect(m, 24, 3, 6, 4, "~"); set(m, 23, 4, "~"); set(m, 30, 4, "~"); // pond
  rect(m, 11, 9, 12, 5, "_");                                        // plaza
  scatter(m, "O", [[14, 4], [19, 5], [5, 16], [28, 16], [12, 17], [22, 18]]);
  scatter(m, "\"", [[8, 8], [26, 9], [4, 12], [30, 12], [16, 19], [9, 19]]);
  scatter(m, "+", [[5, 18], [10, 18], [15, 18], [20, 18], [25, 18], [29, 8]]);
  return m;
}

const HUB = {
  id: "hub", name: "The Zooniverse", tileset: "tiles_hub", music: "hub",
  spawn: { x: 16, y: 11, dir: "down" },
  map: hubMap(),
  entities: [
    { type: "npc", x: 6, y: 6, sprite: "naboo", dialog: "naboo" },
    { type: "npc", x: 9, y: 7, sprite: "bollo", dialog: "bollo" },
    { type: "npc", x: 20, y: 6, sprite: "fossil", dialog: "fossil" },
    { type: "search", x: 13, y: 8, prop: "crate", dialog: "hub_search1", xp: 3 },
    { type: "search", x: 27, y: 10, prop: "bin", dialog: "hub_search2", xp: 3 },
    { type: "portal", x: 5, y: 18, to: "tundra", color: "#9fe0ff", label: "The Frozen Tundra" },
    { type: "portal", x: 10, y: 18, to: "sea", color: "#5affc0", label: "Old Gregg's Sea" },
    { type: "portal", x: 15, y: 18, to: "forest", color: "#ff9a5a", label: "The Forest of Bins" },
    { type: "portal", x: 20, y: 18, to: "night", color: "#c77aff", label: "The Nightosphere" },
    { type: "portal", x: 25, y: 18, to: "moon", color: "#fff2a0", label: "The Moon" },
    { type: "portal", x: 29, y: 8, to: "temple", color: "#ff7ad8", label: "Xooberon Temple" },
  ],
};

// ---------------------------------------------------------------------------
// generic world factory (30x26)
// ---------------------------------------------------------------------------
function makeWorld(cfg) {
  const W = 30, H = 26;
  const m = blank(W, H);
  // themed obstacle clusters + deco for a maze-y feel (kept non-sealing).
  // NB: none of these may land on an entity tile (see tools/validate_zones.mjs).
  scatter(m, "O", cfg.rocks || [[6, 6], [23, 6], [9, 16], [20, 17], [13, 20], [27, 16]]);
  scatter(m, "\"", cfg.deco || [[8, 10], [18, 9], [11, 15], [25, 14], [7, 21]]);
  // branching walls (each has a gap)
  hline(m, 9, 13, 10, "#"); set(m, 13, 13, "."); set(m, 14, 13, ".");
  vline(m, 22, 5, 9, "#"); set(m, 22, 9, ".");
  // switch-gated pocket (top-left) holding Note B
  pocket(m, 3, 4, 5, 5); set(m, 5, 8, ".");   // door at (5,8) — a gate sits here

  return {
    id: cfg.id, name: cfg.name, tileset: cfg.tileset, music: cfg.music,
    weather: cfg.weather, onEnter: cfg.onEnter,
    spawn: { x: 15, y: 23, dir: "up" },
    collect: { item: cfg.note, need: 3, label: "Crimp Notes", dialog: "collect_" + cfg.id },
    map: m,
    entities: [
      { type: "portal", x: 15, y: 24, to: "hub", color: cfg.color, label: "Return to the Zooniverse" },
      { type: "npc", x: 9, y: 22, sprite: cfg.npc, dialog: "side_" + cfg.id },
      // three Crimp Notes
      { type: "item", x: 26, y: 21, item: cfg.note, flag: cfg.id + "_noteA" },
      { type: "item", x: 5, y: 6, item: cfg.note, flag: cfg.id + "_noteB" },          // inside pocket
      { type: "search", x: 21, y: 6, prop: "chest", item: cfg.note, flag: cfg.id + "_noteC", dialog: "chest_" + cfg.id },
      // searchable scenery (lore + a little XP)
      { type: "search", x: 6, y: 19, prop: cfg.props[0], dialog: "search1_" + cfg.id, xp: 5 },
      { type: "search", x: 25, y: 18, prop: cfg.props[1], dialog: "search2_" + cfg.id, xp: 5 },
      // switch -> gate puzzle (opens the pocket with Note B)
      { type: "switch", x: 24, y: 11, gate: cfg.id + "_g", toast: "A gate creaks open to the north-west!" },
      { type: "gate", x: 5, y: 8, gate: cfg.id + "_g" },
      cfg.boss,
    ],
  };
}

const TUNDRA = makeWorld({
  id: "tundra", name: "The Frozen Tundra", tileset: "tiles_tundra", music: "amb_cold",
  weather: "snow", onEnter: "tundra_enter", color: "#9fe0ff", note: "note_tundra",
  npc: "fossil", props: ["snowmound", "rock"],
  boss: {
    type: "boss", x: 15, y: 3, sprite: "boss_jazz", crimp: "jazz", name: "Spirit of Jazz",
    dialog: "jazz_pre", winDialog: "jazz_win", loseDialog: "jazz_lose", afterDialog: "jazz_after",
    winFlag: "beat_jazz", record: "rec_jazz", unlock: "sea", xp: 20,
  },
});

const SEA = makeWorld({
  id: "sea", name: "Old Gregg's Sea", tileset: "tiles_sea", music: "amb_water",
  weather: "bubbles", onEnter: "sea_enter", color: "#5affc0", note: "note_sea",
  npc: "fossil", props: ["shell", "rock"],
  boss: {
    type: "boss", x: 15, y: 3, sprite: "boss_gregg", crimp: "gregg", name: "Old Gregg",
    dialog: "gregg_pre", winDialog: "gregg_win", loseDialog: "gregg_lose", afterDialog: "gregg_after",
    winFlag: "beat_gregg", record: "rec_gregg", unlock: "forest", xp: 28,
  },
});

const FOREST = makeWorld({
  id: "forest", name: "The Forest of Bins", tileset: "tiles_forest", music: "amb_forest",
  weather: "leaves", onEnter: "forest_enter", color: "#ff9a5a", note: "note_forest",
  npc: "naboo", props: ["bin", "bush"],
  boss: {
    type: "boss", x: 15, y: 3, sprite: "boss_crackfox", crimp: "crackfox", name: "The Crack Fox",
    dialog: "crackfox_pre", winDialog: "crackfox_win", loseDialog: "crackfox_lose", afterDialog: "crackfox_after",
    winFlag: "beat_crackfox", record: "rec_crackfox", unlock: "night", xp: 36,
  },
});

const NIGHT = makeWorld({
  id: "night", name: "The Nightosphere", tileset: "tiles_night", music: "amb_dark",
  weather: "embers", onEnter: "night_enter", color: "#c77aff", note: "note_night",
  npc: "naboo", props: ["urn", "rock"],
  boss: {
    type: "boss", x: 15, y: 3, sprite: "boss_nana", crimp: "nana", name: "Nanageddon",
    dialog: "nana_pre", winDialog: "nana_win", loseDialog: "nana_lose", afterDialog: "nana_after",
    winFlag: "beat_nana", record: "rec_nana", unlock: "moon", xp: 44,
  },
});

const MOON = makeWorld({
  id: "moon", name: "The Moon", tileset: "tiles_moon", music: "amb_moon",
  weather: "stars", onEnter: "moon_enter", color: "#fff2a0", note: "note_moon",
  npc: "bollo", props: ["rock", "crate"],
  boss: {
    type: "boss", x: 15, y: 3, sprite: "boss_moon", crimp: "moon", name: "The Moon",
    dialog: "moon_pre", winDialog: "moon_win", loseDialog: "moon_lose", afterDialog: "moon_after",
    winFlag: "beat_moon", record: "rec_moon", unlock: "temple", xp: 52,
  },
});

const TEMPLE = makeWorld({
  id: "temple", name: "Xooberon Temple", tileset: "tiles_temple", music: "amb_temple",
  weather: "dust", onEnter: "temple_enter", color: "#ff7ad8", note: "note_temple",
  npc: "naboo", props: ["urn", "crate"],
  boss: {
    type: "boss", x: 15, y: 3, sprite: "boss_tony", crimp: "tony", name: "Tony Harrison",
    dialog: "tony_pre", winDialog: "tony_win", loseDialog: "tony_lose", afterDialog: "tony_after",
    winFlag: "beat_tony", record: "rec_tony", xp: 80,
  },
});

export const ZONES = { hub: HUB, tundra: TUNDRA, sea: SEA, forest: FOREST, night: NIGHT, moon: MOON, temple: TEMPLE };
