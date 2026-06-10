// zones.js — every explorable area as an authored grid + entity list.
// Maps are built with helpers (blank/rect/scatter/pocket) so tile coordinates
// stay exact. Tile chars follow the LEGEND in game/world.js.
//
// Worlds share a layout via makeWorld(): explore a larger map, gather 3 Crimp
// Notes (one in the open, one behind a switch-gated pocket, one in a chest),
// search themed scenery for XP/lore, help a side-quest NPC, then out-crimp the
// boss (gated on the 3 notes). Crimps are boss-only.

// per-zone ambient gloom, the single source for BOTH render paths (2D light
// pass + 3D sun/hemisphere scaling). level 1 = fully lit (entry omitted).
export const ZONE_LIGHT = {
  night: { level: 0.34 },
  moon: { level: 0.5 },
  sea: { level: 0.52 },
  temple: { level: 0.58 },
  eelpit: { level: 0.4 },
  mirror: { level: 0.66 },
};

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
  scatter(m, "\"", [[8, 8], [26, 9], [30, 12], [16, 19], [9, 19]]);
  scatter(m, "+", [[5, 18], [10, 18], [15, 18], [20, 18], [25, 18], [29, 8]]);
  // an old store room nobody remembers; its east wall isn't all wall ("%")
  pocket(m, 2, 11, 4, 3);
  set(m, 5, 12, "%");
  return m;
}

const HUB = {
  id: "hub", name: "The Zooniverse", tileset: "tiles_hub", music: "hub",
  view: "3d",
  spawn: { x: 16, y: 11, dir: "down" },
  map: hubMap(),
  entities: [
    // the Nabootique door tiles lead inside (shop, wardrobe stock, potions)
    { type: "warp", x: 6, y: 5, to: "nabootique", tox: 6, toy: 8, todir: "up" },
    { type: "warp", x: 7, y: 5, to: "nabootique", tox: 7, toy: 8, todir: "up" },
    { type: "npc", x: 4, y: 7, sprite: "naboo", dialog: "naboo" },
    { type: "npc", x: 9, y: 7, sprite: "bollo", dialog: "bollo", wander: 2 },
    { type: "npc", x: 20, y: 6, sprite: "fossil", dialog: "fossil", wander: 3 },
    { type: "search", x: 13, y: 8, prop: "crate", dialog: "hub_search1", xp: 3 },
    { type: "search", x: 27, y: 10, prop: "bin", dialog: "hub_search2", xp: 3 },
    // the forgotten store room (behind the secret wall at (5,12))
    { type: "search", x: 3, y: 12, prop: "crate", dialog: "hub_storeroom", shrapnel: 40, xp: 6 },
    // at night, someone leaves polos by the east bin. nobody asks why.
    { type: "search", x: 24, y: 12, prop: "rock", dialog: "night_polos", item: "polo",
      flag: "night_polos_found", when: { phase: "night" } },
    { type: "portal", x: 5, y: 18, to: "tundra", color: "#9fe0ff", label: "Tundra" },
    { type: "portal", x: 10, y: 18, to: "sea", color: "#5affc0", label: "The Sea" },
    { type: "portal", x: 15, y: 18, to: "forest", color: "#ff9a5a", label: "The Bins" },
    { type: "portal", x: 20, y: 18, to: "night", color: "#c77aff", label: "Nightosphere" },
    { type: "portal", x: 25, y: 18, to: "moon", color: "#fff2a0", label: "The Moon" },
    { type: "portal", x: 29, y: 8, to: "temple", color: "#ff7ad8", label: "Temple" },
    { type: "portal", x: 29, y: 14, to: "yeti", color: "#9fffb0", label: "Yeti Woods" },
    { type: "portal", x: 31, y: 11, to: "onion", color: "#ffb0e8", label: "Velvet Onion" },
  ],
};

// ---------------------------------------------------------------------------
// THE NABOOTIQUE — Naboo's shop interior: counter (buy/sell), Howard's record
// crate, and the potion back room. Always unlocked; entered via the hub doors.
// ---------------------------------------------------------------------------
function nabootiqueMap() {
  const m = blank(14, 10, "#", ".");
  set(m, 11, 0, "D");                          // back-room door (dressing)
  rect(m, 2, 3, 4, 1, "X");                    // the counter
  scatter(m, "X", [[1, 1], [12, 4], [1, 4]]);  // shelving units of dodgy stock
  scatter(m, "\"", [[9, 2], [3, 7]]);          // rugs/incense
  set(m, 6, 9, "D"); set(m, 7, 9, "D");        // doorway back to the hub
  return m;
}

const NABOOTIQUE = {
  id: "nabootique", name: "The Nabootique", tileset: "tiles_hub", music: "hub",
  view: "3d",
  spawn: { x: 6, y: 7, dir: "up" },
  onEnter: "nabootique_enter",
  map: nabootiqueMap(),
  entities: [
    { type: "shop", x: 3, y: 3, shop: "nabootique" },
    { type: "shop", x: 4, y: 3, shop: "nabootique" },
    { type: "npc", x: 6, y: 2, sprite: "naboo", dialog: "naboo_shop" },
    { type: "npc", x: 9, y: 5, sprite: "bollo", dialog: "bollo_decks" },
    { type: "search", x: 10, y: 6, prop: "crate", dialog: "howard_crate", flag: "howard_crate_seen" },
    { type: "minigame", x: 11, y: 1, game: "potion", label: "Potion room" },
    // THE TWIST: at four records the shrine mirror has had enough
    { type: "trigger", x: 6, y: 8, dialog: "the_twist", once: true, when: { minRecords: 4 } },
    { type: "trigger", x: 7, y: 8, dialog: "the_twist", once: true, when: { minRecords: 4 } },
    // the way into the Mirror World, once Naboo's polish does its work
    { type: "portal", x: 12, y: 7, to: "mirror", color: "#cfd8f4", label: "The Mirror", when: { flag: "mirror_key" } },
    { type: "warp", x: 6, y: 9, to: "hub", tox: 6, toy: 6, todir: "down" },
    { type: "warp", x: 7, y: 9, to: "hub", tox: 7, toy: 6, todir: "down" },
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

  const sp = L.spawn || [15, 22];
  const searches = L.searches.map((s) => ({ type: "search", x: s[0], y: s[1], prop: s[2], dialog: s[3], xp: s[4] }));
  return {
    id: cfg.id, name: cfg.name, tileset: cfg.tileset, music: cfg.music,
    view: "3d",
    weather: cfg.weather, onEnter: cfg.onEnter,
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
      // switch -> gate puzzle (opens the pocket holding Note B)
      { type: "switch", x: L.sw[0], y: L.sw[1], gate: cfg.id + "_g", toast: L.toast || "A gate grinds open somewhere..." },
      { type: "gate", x: pk.door[0], y: pk.door[1], gate: cfg.id + "_g" },
      cfg.boss,
      // per-world extras: collectibles, side-quest props, secrets
      ...(cfg.extra || []),
    ],
  };
}

const TUNDRA = makeWorld({
  id: "tundra", name: "The Frozen Tundra", tileset: "tiles_tundra", music: "amb_cold",
  weather: "snow", onEnter: "tundra_enter", color: "#9fe0ff", note: "note_tundra",
  toast: "Ice cracks open a passage to the north-west!",
  layout: {
    rocks: [[6, 7], [24, 8], [9, 17], [20, 18], [12, 11], [26, 20]],
    deco: [[8, 12], [18, 10], [11, 19], [25, 15], [7, 20]],
    walls: [{ o: "h", x: 8, y: 14, n: 14, gap: [5, 6] }],
    pocket: { x: 3, y: 4, w: 5, h: 5, door: [5, 8], note: [5, 6] },
    noteA: [26, 22], chest: [22, 6], sw: [24, 12],
    searches: [[6, 19, "snowmound", "search1_tundra", 8], [20, 21, "rock", "search2_tundra", 8], [14, 17, "snowmound", "search3_tundra", 14]],
  },
  boss: {
    type: "boss", x: 15, y: 3, sprite: "boss_jazz", crimp: "jazz", name: "Spirit of Jazz",
    dialog: "jazz_pre", winDialog: "jazz_win", loseDialog: "jazz_lose", afterDialog: "jazz_after",
    winFlag: "beat_jazz", record: "rec_jazz", xp: 20,
  },
  extra: [
    { type: "collectible", set: "radiators", idx: 0, x: 8, y: 21 },
    { type: "collectible", set: "jazzrecs", idx: 0, x: 22, y: 17 },
  ],
});

const SEA = makeWorld({
  id: "sea", name: "Old Gregg's Sea", tileset: "tiles_sea", music: "amb_water",
  weather: "bubbles", onEnter: "sea_enter", color: "#5affc0", note: "note_sea",
  toast: "A current parts the reef to the north-east!",
  layout: {
    rocks: [[7, 8], [22, 7], [10, 15], [19, 17], [24, 20], [6, 19]],
    deco: [[9, 11], [18, 9], [13, 18], [25, 14], [16, 20]],
    walls: [{ o: "v", x: 15, y: 6, n: 9, gap: [3, 4] }],
    pocket: { x: 22, y: 4, w: 5, h: 5, door: [24, 8], note: [24, 6] },
    noteA: [4, 21], chest: [8, 6], sw: [7, 13],
    searches: [[25, 19, "shell", "search1_sea", 8], [5, 16, "rock", "search2_sea", 8], [18, 14, "shell", "search3_sea", 14]],
  },
  boss: {
    type: "boss", x: 15, y: 3, sprite: "boss_gregg", crimp: "gregg", name: "Old Gregg",
    dialog: "gregg_pre", winDialog: "gregg_win", loseDialog: "gregg_lose", afterDialog: "gregg_after",
    winFlag: "beat_gregg", record: "rec_gregg", xp: 28,
  },
  extra: [
    { type: "collectible", set: "jazzrecs", idx: 1, x: 10, y: 19 },
    { type: "collectible", set: "shinies", idx: 0, x: 20, y: 12 },
  ],
});

const FOREST = makeWorld({
  id: "forest", name: "The Forest of Bins", tileset: "tiles_forest", music: "amb_forest",
  weather: "leaves", onEnter: "forest_enter", color: "#ff9a5a", note: "note_forest",
  toast: "Brambles rustle apart to the south-west!",
  layout: {
    rocks: [[8, 9], [21, 9], [6, 16], [23, 16], [13, 12], [25, 21]],
    deco: [[10, 13], [19, 12], [9, 20], [24, 13], [15, 16]],
    walls: [{ o: "h", x: 9, y: 11, n: 13, gap: [4, 5] }],
    pocket: { x: 3, y: 18, w: 5, h: 5, door: [5, 18], note: [5, 20] },
    noteA: [25, 7], chest: [22, 20], sw: [18, 7],
    searches: [[10, 8, "bin", "search1_forest", 8], [24, 15, "bush", "search2_forest", 8], [13, 20, "bin", "search3_forest", 14]],
  },
  boss: {
    type: "boss", x: 15, y: 3, sprite: "boss_crackfox", crimp: "crackfox", name: "The Crack Fox",
    dialog: "crackfox_pre", winDialog: "crackfox_win", loseDialog: "crackfox_lose", afterDialog: "crackfox_after",
    winFlag: "beat_crackfox", record: "rec_crackfox", xp: 36,
  },
  extra: [
    { type: "collectible", set: "radiators", idx: 1, x: 20, y: 15 },
    { type: "collectible", set: "shinies", idx: 1, x: 7, y: 13 },
  ],
});

const NIGHT = makeWorld({
  id: "night", name: "The Nightosphere", tileset: "tiles_night", music: "amb_dark",
  weather: "embers", onEnter: "night_enter", color: "#c77aff", note: "note_night",
  toast: "A wall of embers gutters out to the south-east!",
  layout: {
    rocks: [[7, 9], [22, 9], [10, 16], [20, 16], [14, 12], [5, 20]],
    deco: [[9, 12], [18, 11], [24, 15], [8, 19], [16, 18]],
    walls: [{ o: "v", x: 15, y: 7, n: 9, gap: [3, 4] }],
    pocket: { x: 22, y: 18, w: 5, h: 5, door: [24, 18], note: [24, 20] },
    noteA: [5, 7], chest: [8, 18], sw: [10, 8],
    searches: [[25, 9, "urn", "search1_night", 8], [6, 15, "rock", "search2_night", 8], [16, 15, "urn", "search3_night", 14]],
  },
  boss: {
    type: "boss", x: 15, y: 3, sprite: "boss_nana", crimp: "nana", name: "Nanageddon",
    dialog: "nana_pre", winDialog: "nana_win", loseDialog: "nana_lose", afterDialog: "nana_after",
    winFlag: "beat_nana", record: "rec_nana", xp: 44,
  },
  extra: [
    { type: "collectible", set: "radiators", idx: 2, x: 18, y: 20 },
    { type: "collectible", set: "shinies", idx: 2, x: 12, y: 18 },
  ],
});

const MOON = makeWorld({
  id: "moon", name: "The Moon", tileset: "tiles_moon", music: "amb_moon",
  weather: "stars", onEnter: "moon_enter", color: "#fff2a0", note: "note_moon",
  toast: "A crater yawns open to the west...",
  layout: {
    rocks: [[8, 8], [21, 8], [11, 18], [19, 18], [24, 14], [6, 20]],
    deco: [[10, 11], [18, 10], [13, 16], [23, 16], [9, 20]],
    walls: [{ o: "h", x: 8, y: 13, n: 9, gap: [4] }, { o: "h", x: 18, y: 13, n: 6, gap: [2] }],
    pocket: { x: 3, y: 9, w: 5, h: 6, door: [7, 12], note: [5, 12] },
    noteA: [24, 21], chest: [24, 7], sw: [16, 7],
    searches: [[11, 20, "rock", "search1_moon", 8], [25, 16, "crate", "search2_moon", 8], [15, 11, "rock", "search3_moon", 14]],
  },
  boss: {
    type: "boss", x: 15, y: 3, sprite: "boss_moon", crimp: "moon", name: "The Moon",
    dialog: "moon_pre", winDialog: "moon_win", loseDialog: "moon_lose", afterDialog: "moon_after",
    winFlag: "beat_moon", record: "rec_moon", xp: 52,
  },
  extra: [
    { type: "collectible", set: "jazzrecs", idx: 2, x: 8, y: 17 },
    { type: "collectible", set: "shinies", idx: 3, x: 20, y: 11 },
  ],
});

const TEMPLE = makeWorld({
  id: "temple", name: "Xooberon Temple", tileset: "tiles_temple", music: "amb_temple",
  weather: "dust", onEnter: "temple_enter", color: "#ff7ad8", note: "note_temple",
  toast: "Ancient stone grinds aside to the east!",
  layout: {
    rocks: [[9, 9], [24, 8], [11, 14], [19, 14], [26, 20], [5, 14]],
    deco: [[12, 10], [18, 11], [24, 15], [10, 20], [16, 15]],
    walls: [{ o: "h", x: 6, y: 17, n: 14, gap: [6, 7] }],
    pocket: { x: 22, y: 9, w: 5, h: 6, door: [22, 12], note: [24, 12] },
    noteA: [6, 7], chest: [7, 20], sw: [15, 7],
    searches: [[9, 20, "urn", "search1_temple", 8], [25, 20, "crate", "search2_temple", 8], [14, 16, "urn", "search3_temple", 14]],
  },
  boss: {
    type: "boss", x: 15, y: 3, sprite: "boss_tony", crimp: "tony", name: "Tony Harrison",
    dialog: "tony_pre", winDialog: "tony_win", loseDialog: "tony_lose", afterDialog: "tony_after",
    winFlag: "beat_tony", record: "rec_tony", xp: 80,
  },
  extra: [
    { type: "collectible", set: "jazzrecs", idx: 3, x: 18, y: 20 },
  ],
});

// Yeti Woods — Act 1's optional breather: no record, pure flavour and loot.
// "Call of the Yeti" energy: pines, a hot spring, something fuzzy watching.
const YETI = makeWorld({
  id: "yeti", name: "Yeti Woods", tileset: "tiles_yeti", music: "amb_yeti",
  weather: "leaves", onEnter: "yeti_enter", color: "#9fffb0", note: "note_yeti",
  toast: "Roots untangle a path to the north-east!",
  layout: {
    rocks: [[7, 8], [23, 9], [11, 16], [21, 17], [15, 12], [6, 21]],
    deco: [[9, 12], [19, 10], [12, 20], [24, 14], [16, 18]],
    walls: [{ o: "h", x: 7, y: 14, n: 12, gap: [4, 5] }],
    pocket: { x: 22, y: 4, w: 5, h: 5, door: [22, 6], note: [24, 6] },
    noteA: [5, 19], chest: [9, 6], sw: [12, 9],
    searches: [[8, 18, "bush", "search1_yeti", 8], [22, 21, "rock", "search2_yeti", 8], [17, 8, "bush", "search3_yeti", 14]],
  },
  boss: {
    type: "boss", x: 15, y: 3, sprite: "boss_yeti", crimp: "yeti", name: "The Grand Yeti",
    dialog: "yeti_pre", winDialog: "yeti_win", loseDialog: "yeti_lose", afterDialog: "yeti_after",
    winFlag: "beat_yeti", xp: 30,
  },
  extra: [
    { type: "npc", x: 6, y: 10, sprite: "fossil", dialog: "kodiak" },
    { type: "collectible", set: "tufts", idx: 0, x: 12, y: 18 },
    { type: "collectible", set: "tufts", idx: 1, x: 25, y: 11 },
    { type: "collectible", set: "tufts", idx: 2, x: 5, y: 9 },
    { type: "collectible", set: "tufts", idx: 3, x: 18, y: 21 },
  ],
});

// The Eel Pit, Old London — Act 2's story descent. Vince goes in ALONE
// (Howard is the Hitcher's "wages"); the follower system simply has nobody
// to follow, and you feel it. Polos buy an audience with the boss.
const EELPIT = makeWorld({
  id: "eelpit", name: "The Eel Pit", tileset: "tiles_eelpit", music: "amb_eel",
  weather: "rain", onEnter: "eelpit_enter", color: "#9fdca0", note: "note_eelpit",
  toast: "A sluice gate shudders open to the north-west!",
  layout: {
    rocks: [[8, 8], [22, 10], [12, 15], [20, 18], [6, 18], [25, 21]],
    deco: [[10, 11], [18, 12], [9, 20], [24, 16], [14, 19]],
    walls: [{ o: "v", x: 14, y: 6, n: 10, gap: [4, 5] }],
    pocket: { x: 3, y: 4, w: 5, h: 5, door: [5, 8], note: [4, 6] },
    noteA: [25, 7], chest: [20, 21], sw: [22, 13],
    searches: [[7, 14, "bin", "search1_eelpit", 10], [24, 8, "rock", "search2_eelpit", 10], [16, 20, "bin", "search3_eelpit", 16]],
  },
  boss: {
    type: "boss", x: 15, y: 3, sprite: "boss_hitcher", crimp: "hitcher", name: "The Hitcher",
    dialog: "hitcher_pre", winDialog: "hitcher_win", loseDialog: "hitcher_lose", afterDialog: "hitcher_after",
    winFlag: "beat_hitcher", xp: 60,
    require: "polo", requireDialog: "hitcher_need_polo",
  },
  extra: [
    { type: "npc", x: 8, y: 10, sprite: "naboo", dialog: "eleanor" },
    { type: "item", x: 11, y: 19, item: "polo", flag: "eel_polo1" },
    { type: "item", x: 23, y: 18, item: "polo", flag: "eel_polo2" },
    { type: "item", x: 6, y: 12, item: "polo", flag: "eel_polo3" },
  ],
});

// Mirror World — the hub, reflected and wrong. Authored by literally
// flipping the hub map; everyone here is a smug reverse of someone you know.
function mirrorMap() {
  return hubMap().map((row) => row.split("").reverse().join(""));
}
const MX = (x) => 33 - x; // mirror an x coordinate across the hub's width

const MIRROR = {
  id: "mirror", name: "Mirror World", tileset: "tiles_mirror", music: "amb_mirror",
  view: "3d",
  weather: "glints", onEnter: "mirror_enter",
  spawn: { x: MX(16), y: 11, dir: "down" },
  map: mirrorMap(),
  entities: [
    { type: "npc", x: MX(4), y: 7, sprite: "naboo", dialog: "mirror_naboo" },
    { type: "npc", x: MX(20), y: 6, sprite: "fossil", dialog: "mirror_fossil" },
    { type: "boss", x: MX(16), y: 16, sprite: "boss_zeus", crimp: "zeus", name: "The Flighty Zeus",
      dialog: "zeus_pre", winDialog: "zeus_win", loseDialog: "zeus_lose", afterDialog: "zeus_after",
      winFlag: "beat_zeus1", xp: 70 },
    { type: "search", x: MX(3), y: 12, prop: "crate", dialog: "mirror_storeroom", shrapnel: 60, xp: 8 },
    { type: "portal", x: MX(5), y: 18, to: "hub", color: "#cfd8f4", label: "Back through" },
  ],
};

// The Velvet Onion — the tournament venue. The stage up top, the green room
// filling with beaten bosses as you win, Dennis running the format.
function onionMap() {
  const m = blank(24, 14, "#", ".");
  rect(m, 4, 2, 16, 3, "_");                       // the stage
  scatter(m, "X", [[2, 2], [21, 2], [2, 4], [21, 4]]); // PA stacks
  rect(m, 3, 9, 18, 1, "\"");                      // the green-room carpet
  scatter(m, "O", [[1, 7], [22, 7]]);
  set(m, 11, 13, "D"); set(m, 12, 13, "D");        // doors to the street
  return m;
}

const ONION = {
  id: "onion", name: "The Velvet Onion", tileset: "tiles_night", music: "amb_onion",
  view: "3d",
  spawn: { x: 11, y: 11, dir: "up" },
  onEnter: "onion_enter",
  map: onionMap(),
  entities: [
    { type: "npc", x: 12, y: 6, sprite: "naboo", dialog: "dennis" },
    // round two waits on the stage once round one is won
    { type: "boss", x: 8, y: 3, sprite: "boss_saboo", crimp: "saboo", name: "Saboo & Kirk",
      dialog: "saboo_pre", winDialog: "saboo_win", loseDialog: "saboo_lose", afterDialog: "saboo_after",
      winFlag: "beat_saboo", xp: 80, when: { flag: "tourney_r1" } },
    // and the final: your reflections, plugged into all six records
    { type: "boss", x: 15, y: 3, sprite: "boss_zeus", crimp: "zeus_final", name: "Flighty Zeus Ultimate",
      dialog: "zeusfinal_pre", winDialog: "ending", loseDialog: "zeusfinal_lose", afterDialog: "zeusfinal_after",
      winFlag: "beat_zeus_final", xp: 120, when: { flag: "beat_saboo" } },
    // the green room fills up as legends fall
    { type: "npc", x: 4, y: 10, sprite: "boss_jazz", dialog: "greenroom_jazz", when: { flag: "beat_jazz" } },
    { type: "npc", x: 7, y: 10, sprite: "boss_gregg", dialog: "greenroom_gregg", when: { flag: "beat_gregg" } },
    { type: "npc", x: 16, y: 10, sprite: "boss_nana", dialog: "greenroom_nana", when: { flag: "beat_nana" } },
    { type: "npc", x: 19, y: 10, sprite: "boss_tony", dialog: "greenroom_tony", when: { flag: "beat_tony" } },
    { type: "search", x: 21, y: 11, prop: "crate", dialog: "onion_merch", shrapnel: 25, xp: 5 },
    { type: "warp", x: 11, y: 13, to: "hub", tox: 31, toy: 12, todir: "down" },
    { type: "warp", x: 12, y: 13, to: "hub", tox: 31, toy: 12, todir: "down" },
  ],
};

export const ZONES = {
  hub: HUB, nabootique: NABOOTIQUE,
  tundra: TUNDRA, sea: SEA, forest: FOREST, night: NIGHT, moon: MOON, temple: TEMPLE,
  yeti: YETI, eelpit: EELPIT, mirror: MIRROR, onion: ONION,
};
