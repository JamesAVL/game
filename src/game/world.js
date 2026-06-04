// world.js — turn authored text-map zone definitions into a Tilemap plus a
// list of live entities (npcs, warps, items, signs, bosses, triggers).

import { TILE, img } from "../engine/core.js";
import { Tilemap } from "../engine/tilemap.js";
import { ZONES } from "../data/zones.js";
import { GS } from "./state.js";

// Shared tile-index convention used by every generated tileset (gen_tiles.py):
//  0 floor   1 floor-variant   2 wall          3 wall-alt(solid)
//  4 obstacle(solid)  5 deco    6 path          7 water/hazard(solid)
//  8 door    9 accent-floor   10 deco2         11 solid-feature
export const LEGEND = {
  ".": { t: 0 },
  ",": { t: 1 },
  "#": { t: 2, solid: true },
  "=": { t: 3, solid: true },
  "O": { t: 4, solid: true },
  "\"": { t: 5 },
  "_": { t: 6 },
  "~": { t: 7, solid: true },
  "D": { t: 8 },
  "+": { t: 9 },
  "*": { t: 10 },
  "X": { t: 11, solid: true },
};

export function getZone(id) { return ZONES[id]; }

export function buildZone(id) {
  const def = ZONES[id];
  if (!def) throw new Error("no zone " + id);
  const legend = Object.assign({}, LEGEND, def.legend || {});
  const rows = def.map;
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const grid = [];
  const solids = [];
  for (let y = 0; y < h; y++) {
    grid.push(new Array(w).fill(0));
    solids.push(new Array(w).fill(false));
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x] || ".";
      const cell = legend[ch] || legend["."];
      grid[y][x] = cell.t;
      solids[y][x] = !!cell.solid;
    }
  }
  const tm = new Tilemap(img(def.tileset), grid, solids, null);

  const entities = (def.entities || []).map((e) => ({
    ...e,
    px: e.x * TILE,
    py: e.y * TILE,
    w: (e.w || 1) * TILE,
    h: (e.h || 1) * TILE,
    facing: e.face || "down",
    animT: Math.random() * 2,
  }));

  // solid characters/obstacles block walking; warps/items/triggers/switches do not
  const inb = (e) => e.y >= 0 && e.y < h && e.x >= 0 && e.x < w;
  for (const e of entities) {
    if (e.type === "npc" || e.type === "boss" || e.type === "sign" || e.type === "portal" || e.type === "search") {
      if (inb(e)) solids[e.y][e.x] = true;
    }
    // gates block until their switch flag is set (re-applies on re-entry)
    if (e.type === "gate") {
      if (GS.flag("sw_" + e.gate)) { e._open = true; }
      else if (inb(e)) solids[e.y][e.x] = true;
    }
  }

  return { def, tilemap: tm, entities };
}
