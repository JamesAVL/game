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
  // canopy overhangs flanking the courtyard trees (walk-under depth layer)
  scatter(m, "^", [[13, 4], [15, 4], [18, 5], [20, 5], [4, 16], [6, 16], [27, 16], [29, 16]]);
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
    { type: "search", x: 13, y: 8, prop: "crate", dialog: "hub_search1", xp: 3, item: "mirror", who: "vince" },
    { type: "search", x: 27, y: 10, prop: "bin", dialog: "hub_search2", xp: 3, item: "hat", who: "howard" },
    { type: "portal", x: 5, y: 18, to: "tundra", color: "#9fe0ff", label: "Tundra" },
    { type: "portal", x: 10, y: 18, to: "sea", color: "#5affc0", label: "The Sea" },
    { type: "portal", x: 15, y: 18, to: "forest", color: "#ff9a5a", label: "The Bins" },
    { type: "portal", x: 20, y: 18, to: "night", color: "#c77aff", label: "Nightosphere" },
    { type: "portal", x: 25, y: 18, to: "moon", color: "#fff2a0", label: "The Moon" },
    { type: "portal", x: 29, y: 8, to: "temple", color: "#ff7ad8", label: "Temple" },
    // secret 8th boss: materialises by the east hedge once the credits roll;
    // won't crimp without a polo (found on the Moon) — er, the Ornate Key
    {
      type: "boss", x: 31, y: 14, sprite: "boss_hitcher", crimp: "hitcher", name: "The Hitcher",
      appear: "ending_seen", require: "key", requireDialog: "hitcher_need",
      dialog: "hitcher_pre", winDialog: "hitcher_win", loseDialog: "hitcher_lose", afterDialog: "hitcher_after",
      winFlag: "beat_hitcher", record: "rec_hitcher", xp: 100,
    },
  ],
};

// ---------------------------------------------------------------------------
// generic world factory (30x26). The STRUCTURE is shared (explore -> gather 3
// notes -> switch/gate puzzle -> boss) but every zone passes a distinct
// `layout` so the notes, chest, pocket and puzzle sit in different places.
// tools/validate_zones.mjs guarantees nothing ends up unreachable.
// ---------------------------------------------------------------------------
function makeWorld(cfg) {
  const W = 30, H = 26;
  const L = cfg.layout;
  const m = blank(W, H);
  scatter(m, "O", L.rocks);
  scatter(m, "\"", L.deco);
  for (const w of L.walls) {
    if (w.o === "h") hline(m, w.x, w.y, w.n, "#"); else vline(m, w.x, w.y, w.n, "#");
    for (const g of (w.gap || [])) { if (w.o === "h") set(m, w.x + g, w.y, "."); else set(m, w.x, w.y + g, "."); }
  }
  const pk = L.pocket;
  pocket(m, pk.x, pk.y, pk.w, pk.h);
  set(m, pk.door[0], pk.door[1], ".");                 // doorway; a gate sits here

  // depth layers: overlay chars (canopy/arch/hang/haze — walkable, drawn above
  // the party) and void chasms ("%" — solid; the parallax backdrop shows through)
  for (const o of (cfg.overlay || [])) scatter(m, o.ch, o.cells);
  for (const [vx, vy, vw, vh] of (cfg.voids || [])) rect(m, vx, vy, vw, vh, "%");

  const sp = L.spawn || [15, 22];
  // searches: [x, y, prop, dialog, xp, item?, hidden?] — the optional 6th
  // entry tucks a key item into the searchable; a truthy 7th makes it a secret
  // only Howard's jazz trance can reveal
  const searches = L.searches.map((s) => ({ type: "search", x: s[0], y: s[1], prop: s[2], dialog: s[3], xp: s[4], item: s[5] || undefined, hidden: !!s[6] || undefined }));
  return {
    id: cfg.id, name: cfg.name, tileset: cfg.tileset, music: cfg.music,
    weather: cfg.weather, onEnter: cfg.onEnter, backdrop: cfg.backdrop,
    spawn: { x: sp[0], y: sp[1], dir: "up" },
    collect: { item: cfg.note, need: 3, label: "Crimp Notes", dialog: "collect_" + cfg.id },
    map: m,
    entities: [
      { type: "portal", x: 15, y: 24, to: "hub", color: cfg.color, label: "Zooniverse" },
      // three Crimp Notes: one in the open, one behind the gate, one in a chest
      { type: "item", x: L.noteA[0], y: L.noteA[1], item: cfg.note, flag: cfg.id + "_noteA" },
      { type: "item", x: pk.note[0], y: pk.note[1], item: cfg.note, flag: cfg.id + "_noteB" },
      { type: "search", x: L.chest[0], y: L.chest[1], prop: "chest", item: cfg.note, flag: cfg.id + "_noteC", dialog: "chest_" + cfg.id },
      // searchable scenery (lore + XP)
      ...searches,
      // zone NPCs (guide near the entrance + a side-quest character)
      ...(cfg.npcs || []),
      // switch -> gate puzzle (opens the pocket holding Note B)
      { type: "switch", x: L.sw[0], y: L.sw[1], gate: cfg.id + "_g", toast: L.toast || "A gate grinds open somewhere..." },
      { type: "gate", x: pk.door[0], y: pk.door[1], gate: cfg.id + "_g" },
      cfg.boss,
    ],
  };
}

const TUNDRA = makeWorld({
  id: "tundra", name: "The Frozen Tundra", tileset: "tiles_tundra", music: "amb_cold",
  weather: "snow", onEnter: "tundra_enter", color: "#9fe0ff", note: "note_tundra",
  toast: "Ice cracks open a passage to the north-west!",
  overlay: [{ ch: ";", cells: [[4, 1], [5, 1], [6, 1], [12, 1], [13, 1], [21, 1], [22, 1]] }],
  npcs: [
    { type: "npc", x: 13, y: 21, sprite: "fossil", dialog: "tundra_explorer" },
    { type: "npc", x: 22, y: 16, sprite: "fossil", dialog: "side_tundra" },
  ],
  layout: {
    rocks: [[6, 7], [24, 8], [9, 17], [20, 18], [12, 11], [26, 20]],
    deco: [[8, 12], [18, 10], [11, 19], [25, 15], [7, 20]],
    walls: [{ o: "h", x: 8, y: 14, n: 14, gap: [5, 6] }],
    pocket: { x: 3, y: 4, w: 5, h: 5, door: [5, 8], note: [5, 6] },
    noteA: [26, 22], chest: [22, 6], sw: [24, 12],
    searches: [[6, 19, "snowmound", "search1_tundra", 8], [20, 21, "rock", "search2_tundra", 8], [14, 17, "snowmound", "search3_tundra", 14, "baileys"], [10, 10, "snowmound", "hidden_tundra", 20, null, true]],
  },
  boss: {
    type: "boss", x: 15, y: 3, sprite: "boss_jazz", crimp: "jazz", name: "Spirit of Jazz",
    dialog: "jazz_pre", winDialog: "jazz_win", loseDialog: "jazz_lose", afterDialog: "jazz_after",
    winFlag: "beat_jazz", record: "rec_jazz", unlock: "sea", xp: 20,
  },
});

const SEA = makeWorld({
  id: "sea", name: "Old Gregg's Sea", tileset: "tiles_sea", music: "amb_water",
  weather: "bubbles", onEnter: "sea_enter", color: "#5affc0", note: "note_sea",
  toast: "A current parts the reef to the north-east!",
  overlay: [{ ch: ";", cells: [[5, 1], [6, 1], [11, 1], [12, 1], [19, 1], [20, 1], [26, 1]] }],
  npcs: [
    { type: "npc", x: 13, y: 21, sprite: "fossil", dialog: "sea_fossil" },
    { type: "npc", x: 10, y: 9, sprite: "fossil", dialog: "side_sea" },
  ],
  layout: {
    rocks: [[7, 8], [22, 7], [10, 15], [19, 17], [24, 20], [6, 19]],
    deco: [[9, 11], [18, 9], [13, 18], [25, 14], [16, 20]],
    walls: [{ o: "v", x: 15, y: 6, n: 9, gap: [3, 4] }],
    pocket: { x: 22, y: 4, w: 5, h: 5, door: [24, 8], note: [24, 6] },
    noteA: [4, 21], chest: [8, 6], sw: [7, 13],
    searches: [[25, 19, "shell", "search1_sea", 8], [5, 16, "rock", "search2_sea", 8], [18, 14, "shell", "search3_sea", 14, "bin"]],
  },
  boss: {
    type: "boss", x: 15, y: 3, sprite: "boss_gregg", crimp: "gregg", name: "Old Gregg",
    require: "baileys", requireDialog: "gregg_need",
    dialog: "gregg_pre", winDialog: "gregg_win", loseDialog: "gregg_lose", afterDialog: "gregg_after",
    winFlag: "beat_gregg", record: "rec_gregg", unlock: "forest", xp: 28,
  },
});

const FOREST = makeWorld({
  id: "forest", name: "The Forest of Bins", tileset: "tiles_forest", music: "amb_forest",
  weather: "leaves", onEnter: "forest_enter", color: "#ff9a5a", note: "note_forest",
  toast: "Brambles rustle apart to the south-west!",
  overlay: [{
    ch: "^",
    cells: [[7, 9], [9, 9], [20, 9], [22, 9], [12, 12], [14, 12], [5, 16], [7, 16], [22, 16], [24, 16], [24, 21], [26, 21]],
  }],
  npcs: [
    { type: "npc", x: 13, y: 21, sprite: "naboo", dialog: "forest_naboo" },
    { type: "npc", x: 20, y: 14, sprite: "naboo", dialog: "side_forest" },
  ],
  layout: {
    rocks: [[8, 9], [21, 9], [6, 16], [23, 16], [13, 12], [25, 21]],
    deco: [[10, 13], [19, 12], [9, 20], [24, 13], [15, 16]],
    walls: [{ o: "h", x: 9, y: 11, n: 13, gap: [4, 5] }],
    pocket: { x: 3, y: 18, w: 5, h: 5, door: [5, 18], note: [5, 20] },
    noteA: [25, 7], chest: [22, 20], sw: [18, 7],
    searches: [[10, 8, "bin", "search1_forest", 8], [24, 15, "bush", "search2_forest", 8], [13, 20, "bin", "search3_forest", 14, "jazzcig"], [17, 18, "bin", "hidden_forest", 10, "banana", true]],
  },
  boss: {
    type: "boss", x: 15, y: 3, sprite: "boss_crackfox", crimp: "crackfox", name: "The Crack Fox",
    require: "bin", requireDialog: "crackfox_need",
    dialog: "crackfox_pre", winDialog: "crackfox_win", loseDialog: "crackfox_lose", afterDialog: "crackfox_after",
    winFlag: "beat_crackfox", record: "rec_crackfox", unlock: "night", xp: 36,
  },
});

const NIGHT = makeWorld({
  id: "night", name: "The Nightosphere", tileset: "tiles_night", music: "amb_dark",
  weather: "embers", onEnter: "night_enter", color: "#c77aff", note: "note_night",
  toast: "A wall of embers gutters out to the south-east!",
  backdrop: "abyss",
  voids: [[1, 1, 2, 24]],   // the western edge falls away into the nightosphere
  overlay: [{ ch: "!", cells: [[8, 9], [21, 9], [11, 16], [19, 16], [6, 20]] }],
  npcs: [
    { type: "npc", x: 13, y: 21, sprite: "naboo", dialog: "night_naboo" },
    { type: "npc", x: 18, y: 12, sprite: "naboo", dialog: "side_night" },
  ],
  layout: {
    rocks: [[7, 9], [22, 9], [10, 16], [20, 16], [14, 12], [5, 20]],
    deco: [[9, 12], [18, 11], [24, 15], [8, 19], [16, 18]],
    walls: [{ o: "v", x: 15, y: 7, n: 9, gap: [3, 4] }],
    pocket: { x: 22, y: 18, w: 5, h: 5, door: [24, 18], note: [24, 20] },
    noteA: [5, 7], chest: [8, 18], sw: [10, 8],
    searches: [[25, 9, "urn", "search1_night", 8], [6, 15, "rock", "search2_night", 8], [16, 15, "urn", "search3_night", 14, "cream"]],
  },
  boss: {
    type: "boss", x: 15, y: 3, sprite: "boss_nana", crimp: "nana", name: "Nanageddon",
    dialog: "nana_pre", winDialog: "nana_win", loseDialog: "nana_lose", afterDialog: "nana_after",
    winFlag: "beat_nana", record: "rec_nana", unlock: "moon", xp: 44,
  },
});

const MOON = makeWorld({
  id: "moon", name: "The Moon", tileset: "tiles_moon", music: "amb_moon",
  weather: "stars", onEnter: "moon_enter", color: "#fff2a0", note: "note_moon",
  toast: "A crater yawns open to the west...",
  backdrop: "stars",
  voids: [[4, 3, 2, 2], [26, 10, 2, 2], [9, 21, 2, 2]],  // craters open onto space
  npcs: [
    { type: "npc", x: 8, y: 17, sprite: "bollo", dialog: "side_moon" },
  ],
  layout: {
    rocks: [[8, 8], [21, 8], [11, 18], [19, 18], [24, 14], [6, 20]],
    deco: [[10, 11], [18, 10], [13, 16], [23, 16], [9, 20]],
    walls: [{ o: "h", x: 8, y: 13, n: 9, gap: [4] }, { o: "h", x: 18, y: 13, n: 6, gap: [2] }],
    pocket: { x: 3, y: 9, w: 5, h: 6, door: [7, 12], note: [5, 12] },
    noteA: [24, 21], chest: [24, 7], sw: [16, 7],
    searches: [[11, 20, "rock", "search1_moon", 8], [25, 16, "crate", "search2_moon", 8], [15, 11, "rock", "search3_moon", 14, "polo"], [20, 16, "rock", "hidden_moon", 24, null, true]],
  },
  boss: {
    type: "boss", x: 15, y: 3, sprite: "boss_moon", crimp: "moon", name: "The Moon",
    dialog: "moon_pre", winDialog: "moon_win", loseDialog: "moon_lose", afterDialog: "moon_after",
    winFlag: "beat_moon", record: "rec_moon", unlock: "temple", xp: 52,
  },
});

const TEMPLE = makeWorld({
  id: "temple", name: "Xooberon Temple", tileset: "tiles_temple", music: "amb_temple",
  weather: "dust", onEnter: "temple_enter", color: "#ff7ad8", note: "note_temple",
  toast: "Ancient stone grinds aside to the east!",
  overlay: [{ ch: "A", cells: [[12, 17], [13, 17]] }],   // arch over the inner gateway
  npcs: [
    { type: "npc", x: 13, y: 21, sprite: "naboo", dialog: "temple_naboo" },
    { type: "npc", x: 18, y: 19, sprite: "naboo", dialog: "side_temple" },
  ],
  layout: {
    rocks: [[9, 9], [24, 8], [11, 14], [19, 14], [26, 20], [5, 14]],
    deco: [[12, 10], [18, 11], [24, 15], [10, 20], [16, 15]],
    walls: [{ o: "h", x: 6, y: 17, n: 14, gap: [6, 7] }],
    pocket: { x: 22, y: 9, w: 5, h: 6, door: [22, 12], note: [24, 12] },
    noteA: [6, 7], chest: [7, 20], sw: [15, 7],
    searches: [[9, 20, "urn", "search1_temple", 8], [25, 20, "crate", "search2_temple", 8], [14, 16, "urn", "search3_temple", 14, "key"]],
  },
  boss: {
    type: "boss", x: 15, y: 3, sprite: "boss_tony", crimp: "tony", name: "Tony Harrison",
    dialog: "tony_pre", winDialog: "tony_win", loseDialog: "tony_lose", afterDialog: "tony_after",
    winFlag: "beat_tony", record: "rec_tony", xp: 80,
  },
});

export const ZONES = { hub: HUB, tundra: TUNDRA, sea: SEA, forest: FOREST, night: NIGHT, moon: MOON, temple: TEMPLE };
