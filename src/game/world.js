// world.js — turn authored text-map zone definitions into a Tilemap plus a
// list of live entities (npcs, warps, items, signs, bosses, triggers).

import { TILE, img } from "../engine/core.js";
import { Tilemap } from "../engine/tilemap.js";
import { ZONES } from "../data/zones.js";
import { GS } from "./state.js";
import { phase } from "./clock.js";

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
  "%": { t: 2, solid: false, secret: true },  // looks like wall, walks like floor
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

  const entities = (def.entities || [])
    // collected collectibles stay collected across visits
    .filter((e) => !(e.type === "collectible" && GS.collHas(e.set, e.idx)))
    // conditional presence: { when: { phase, flag, minRecords } }, checked on entry
    .filter((e) => {
      if (!e.when) return true;
      if (e.when.flag && !GS.flag(e.when.flag)) return false;
      if (e.when.minRecords && GS.recordCount() < e.when.minRecords) return false;
      if (e.when.phase && phase(GS) !== e.when.phase) return false;
      return true;
    })
    .map((e) => ({
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
    // wandering NPCs drift off their tile, so they don't block (you can brush past)
    if (e.type === "npc" && e.wander) continue;
    if (e.type === "npc" || e.type === "boss" || e.type === "sign" || e.type === "portal" ||
        e.type === "search" || e.type === "minigame") {
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
