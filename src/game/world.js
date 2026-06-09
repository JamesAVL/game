// world.js — turn authored text-map zone definitions into a Tilemap plus a
// list of live entities (npcs, warps, items, signs, bosses, triggers).

import { TILE, img } from "../engine/core.js";
import { Tilemap } from "../engine/tilemap.js";
import { ZONES } from "../data/zones.js";
import { LEGEND } from "../data/legend.js";
import { GS } from "./state.js";

// The tile-char legend lives in data/legend.js (pure data) so the zone
// validator and tests use the exact same solidity rules. Re-exported for
// existing importers.
export { LEGEND };

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
  const over = [];
  let hasOver = false, hasVoid = false;
  for (let y = 0; y < h; y++) {
    grid.push(new Array(w).fill(0));
    solids.push(new Array(w).fill(false));
    over.push(new Array(w).fill(-1));
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x] || ".";
      const cell = legend[ch] || legend["."];
      grid[y][x] = cell.t;
      solids[y][x] = !!cell.solid;
      if (cell.over != null) { over[y][x] = cell.over; hasOver = true; }
      if (cell.void) hasVoid = true;
    }
  }
  const tm = new Tilemap(img(def.tileset), grid, solids, hasOver ? over : null);

  const entities = (def.entities || []).map((e) => ({
    ...e,
    px: e.x * TILE,
    py: e.y * TILE,
    w: (e.w || 1) * TILE,
    h: (e.h || 1) * TILE,
    facing: e.face || "down",
    animT: Math.random() * 2,
  }));

  // solid characters/obstacles block walking; warps/items/triggers/switches do
  // not. Hidden (trance-revealed) secrets stay walkable too — turning solid on
  // reveal could seal the player in.
  const inb = (e) => e.y >= 0 && e.y < h && e.x >= 0 && e.x < w;
  for (const e of entities) {
    if ((e.type === "npc" || e.type === "boss" || e.type === "sign" || e.type === "portal" || e.type === "search") && !e.hidden) {
      if (inb(e)) solids[e.y][e.x] = true;
    }
    // gates block until their switch flag is set (re-applies on re-entry)
    if (e.type === "gate") {
      if (GS.flag("sw_" + e.gate)) { e._open = true; }
      else if (inb(e)) solids[e.y][e.x] = true;
    }
  }

  return { def, tilemap: tm, entities, hasVoid };
}
