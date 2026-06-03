// zones.js — every explorable area as an authored grid + entity list.
// Maps are built with helpers (blank/rect/scatter) so tile coordinates stay
// exact. Tile chars follow the LEGEND in game/world.js.

function blank(w, h, edge = "#", floor = ".") {
  const m = [];
  for (let y = 0; y < h; y++) {
    let r = "";
    for (let x = 0; x < w; x++) r += (x === 0 || y === 0 || x === w - 1 || y === h - 1) ? edge : floor;
    m.push(r);
  }
  return m;
}
function set(m, x, y, ch) { if (m[y]) m[y] = m[y].substring(0, x) + ch + m[y].substring(x + 1); }
function rect(m, x, y, w, h, ch) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(m, x + i, y + j, ch); }
function hline(m, x, y, w, ch) { for (let i = 0; i < w; i++) set(m, x + i, y, ch); }
function vline(m, x, y, h, ch) { for (let i = 0; i < h; i++) set(m, x, y + i, ch); }
function scatter(m, ch, list) { for (const [x, y] of list) set(m, x, y, ch); }

// ---------------------------------------------------------------------------
// HUB — the Zooniverse courtyard with portals to every world
// ---------------------------------------------------------------------------
function hubMap() {
  const m = blank(34, 22, "#", ".");
  // the Nabootique shop (top-left)
  rect(m, 3, 2, 8, 4, "X"); set(m, 6, 5, "D"); set(m, 7, 5, "D");
  // pond (top-right)
  rect(m, 24, 3, 6, 4, "~"); set(m, 23, 4, "~"); set(m, 30, 4, "~");
  // stone plaza in the middle
  rect(m, 11, 9, 12, 5, "_");
  // a few trees & bushes
  scatter(m, "O", [[14, 4], [19, 5], [5, 16], [28, 16], [12, 17], [22, 18]]);
  scatter(m, "\"", [[8, 8], [26, 9], [4, 12], [30, 12], [16, 19], [9, 19]]);
  // portal alcoves along the bottom
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
    { type: "portal", x: 5, y: 18, to: "tundra", color: "#9fe0ff", label: "The Frozen Tundra" },
    { type: "portal", x: 10, y: 18, to: "sea", color: "#5affc0", label: "Old Gregg's Sea" },
    { type: "portal", x: 15, y: 18, to: "forest", color: "#ff9a5a", label: "The Forest of Bins" },
    { type: "portal", x: 20, y: 18, to: "night", color: "#c77aff", label: "The Nightosphere" },
    { type: "portal", x: 25, y: 18, to: "moon", color: "#fff2a0", label: "The Moon" },
    { type: "portal", x: 29, y: 8, to: "temple", color: "#ff7ad8", label: "Xooberon Temple" },
  ],
};

// ---------------------------------------------------------------------------
// generic world arena
// ---------------------------------------------------------------------------
function worldMap(w, h, decorate) {
  const m = blank(w, h);
  if (decorate) decorate(m);
  return m;
}

const TUNDRA = {
  id: "tundra", name: "The Frozen Tundra", tileset: "tiles_tundra", music: "amb_cold",
  spawn: { x: 9, y: 16, dir: "up" },
  map: worldMap(20, 19, (m) => {
    scatter(m, "O", [[4, 6], [15, 5], [7, 9], [13, 11], [3, 13], [16, 13]]); // ice rocks
    scatter(m, "\"", [[6, 14], [12, 14], [9, 7]]);                            // frozen shrubs
    rect(m, 8, 3, 4, 1, "~");                                                  // cracked ice
  }),
  entities: [
    { type: "portal", x: 9, y: 17, to: "hub", color: "#9fe0ff", label: "Return to the Zooniverse" },
    { type: "npc", x: 5, y: 15, sprite: "fossil", dialog: "tundra_explorer" },
    { type: "item", x: 16, y: 9, item: "jazzcig", flag: "got_jazzcig", onGet: "got_jazzcig" },
    {
      type: "boss", x: 9, y: 4, sprite: "boss_jazz", crimp: "jazz", name: "Spirit of Jazz",
      dialog: "jazz_pre", winDialog: "jazz_win", loseDialog: "jazz_lose", afterDialog: "jazz_after",
      winFlag: "beat_jazz", record: "rec_jazz", unlock: "sea", xp: 20,
    },
  ],
};

const SEA = {
  id: "sea", name: "Old Gregg's Sea", tileset: "tiles_sea", music: "amb_water",
  spawn: { x: 10, y: 16, dir: "up" },
  map: worldMap(22, 19, (m) => {
    scatter(m, "~", [[3, 4], [4, 4], [18, 5], [19, 5], [3, 11], [18, 12]]); // deep pools
    scatter(m, "O", [[6, 7], [15, 8], [9, 10], [13, 12]]);                   // coral/rocks
    scatter(m, "\"", [[7, 14], [14, 14], [11, 6]]);                          // seaweed
  }),
  entities: [
    { type: "portal", x: 10, y: 17, to: "hub", color: "#5affc0", label: "Return to the Zooniverse" },
    { type: "npc", x: 5, y: 15, sprite: "fossil", dialog: "sea_fossil" },
    { type: "item", x: 17, y: 10, item: "baileys", flag: "got_baileys", onGet: "got_baileys" },
    {
      type: "boss", x: 10, y: 4, sprite: "boss_gregg", crimp: "gregg", name: "Old Gregg",
      dialog: "gregg_pre", winDialog: "gregg_win", loseDialog: "gregg_lose", afterDialog: "gregg_after",
      require: "baileys", requireDialog: "gregg_need",
      winFlag: "beat_gregg", record: "rec_gregg", unlock: "forest", xp: 28,
    },
  ],
};

const FOREST = {
  id: "forest", name: "The Forest of Bins", tileset: "tiles_forest", music: "amb_forest",
  spawn: { x: 11, y: 17, dir: "up" },
  map: worldMap(24, 20, (m) => {
    scatter(m, "O", [[4, 5], [8, 4], [13, 5], [18, 6], [6, 9], [16, 10], [10, 12], [20, 13], [3, 14]]); // trees
    scatter(m, "\"", [[7, 7], [14, 8], [11, 10], [17, 14], [5, 16]]);                                    // ferns
    scatter(m, "X", [[12, 13], [13, 13]]);                                                               // bin pile
  }),
  entities: [
    { type: "portal", x: 11, y: 18, to: "hub", color: "#ff9a5a", label: "Return to the Zooniverse" },
    { type: "npc", x: 6, y: 16, sprite: "naboo", dialog: "forest_naboo" },
    { type: "item", x: 19, y: 9, item: "bin", flag: "got_bin", onGet: "got_bin" },
    {
      type: "boss", x: 11, y: 4, sprite: "boss_crackfox", crimp: "crackfox", name: "The Crack Fox",
      dialog: "crackfox_pre", winDialog: "crackfox_win", loseDialog: "crackfox_lose", afterDialog: "crackfox_after",
      require: "bin", requireDialog: "crackfox_need",
      winFlag: "beat_crackfox", record: "rec_crackfox", unlock: "night", xp: 36,
    },
  ],
};

const NIGHT = {
  id: "night", name: "The Nightosphere", tileset: "tiles_night", music: "amb_dark",
  spawn: { x: 11, y: 16, dir: "up" },
  map: worldMap(22, 19, (m) => {
    scatter(m, "O", [[5, 6], [16, 6], [8, 9], [14, 11], [4, 12], [17, 13]]); // jagged spires
    scatter(m, "X", [[10, 8], [11, 8]]);                                      // altar
    scatter(m, "\"", [[7, 13], [15, 14]]);                                    // candles
  }),
  entities: [
    { type: "portal", x: 11, y: 17, to: "hub", color: "#c77aff", label: "Return to the Zooniverse" },
    { type: "npc", x: 6, y: 15, sprite: "naboo", dialog: "night_naboo" },
    {
      type: "boss", x: 11, y: 4, sprite: "boss_nana", crimp: "nana", name: "Nanageddon",
      dialog: "nana_pre", winDialog: "nana_win", loseDialog: "nana_lose", afterDialog: "nana_after",
      winFlag: "beat_nana", record: "rec_nana", unlock: "moon", xp: 44,
    },
  ],
};

const MOON = {
  id: "moon", name: "The Moon", tileset: "tiles_moon", music: "amb_moon",
  spawn: { x: 11, y: 16, dir: "up" },
  map: worldMap(22, 19, (m) => {
    scatter(m, "O", [[5, 8], [16, 9], [8, 12], [14, 13]]);     // craters / rocks
    scatter(m, "\"", [[9, 6], [13, 7], [6, 14], [17, 13]]);    // moon dust tufts
  }),
  entities: [
    { type: "portal", x: 11, y: 17, to: "hub", color: "#fff2a0", label: "Return to the Zooniverse" },
    {
      type: "boss", x: 11, y: 5, sprite: "boss_moon", crimp: "moon", name: "The Moon",
      dialog: "moon_pre", winDialog: "moon_win", loseDialog: "moon_lose", afterDialog: "moon_after",
      winFlag: "beat_moon", record: "rec_moon", unlock: "temple", xp: 52,
    },
  ],
};

const TEMPLE = {
  id: "temple", name: "Xooberon Temple", tileset: "tiles_temple", music: "amb_temple",
  spawn: { x: 12, y: 17, dir: "up" },
  map: worldMap(26, 20, (m) => {
    rect(m, 2, 2, 22, 1, "="); // back wall band
    scatter(m, "X", [[6, 5], [19, 5], [6, 10], [19, 10]]);     // pillars
    scatter(m, "O", [[10, 8], [15, 8]]);                        // braziers
    scatter(m, "+", [[12, 6], [13, 6]]);                        // dais
    scatter(m, "\"", [[8, 14], [17, 14]]);
  }),
  entities: [
    { type: "portal", x: 12, y: 18, to: "hub", color: "#ff7ad8", label: "Return to the Zooniverse" },
    { type: "npc", x: 7, y: 16, sprite: "naboo", dialog: "temple_naboo" },
    {
      type: "boss", x: 12, y: 5, sprite: "boss_tony", crimp: "tony", name: "Tony Harrison",
      dialog: "tony_pre", winDialog: "tony_win", loseDialog: "tony_lose", afterDialog: "tony_after",
      winFlag: "beat_tony", record: "rec_tony", xp: 80,
    },
  ],
};

export const ZONES = { hub: HUB, tundra: TUNDRA, sea: SEA, forest: FOREST, night: NIGHT, moon: MOON, temple: TEMPLE };
