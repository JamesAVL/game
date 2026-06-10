// validate_zones.mjs — static reachability/placement checks for every zone.
//
// Catches the class of bug where an entity is placed on a solid tile or behind
// an impassable wall (e.g. a collectible the player can never reach). Run with
//   node tools/validate_zones.mjs
// Exits non-zero (and prints a report) if any zone fails.
//
// The solidity rules below MUST mirror src/game/world.js:
//   - LEGEND solid chars: # = O ~ X   (world.js:13-26)
//   - solid entity types: npc, boss, sign, portal, search, and a CLOSED gate
//     (world.js buildZone solid loop)
// zones.js is pure data (no engine imports), so we can import it directly.

import { ZONES } from "../src/data/zones.js";

const SOLID_CHARS = new Set(["#", "=", "O", "~", "X"]);
const SOLID_TYPES = new Set(["npc", "boss", "sign", "portal", "search", "minigame"]);
const STAND_ON = new Set(["item", "switch", "collectible"]);  // player stands on the tile
const ADJACENT = new Set(["npc", "boss", "sign", "portal", "search", "gate", "minigame", "shop"]); // interact from beside

function buildGrid(def) {
  const rows = def.map;
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const solidMap = [];
  for (let y = 0; y < h; y++) {
    solidMap.push(new Array(w).fill(false));
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x] || ".";
      solidMap[y][x] = SOLID_CHARS.has(ch);
    }
  }
  return { w, h, solidMap };
}

// flood fill walkable tiles from spawn. `gatesOpen` decides whether closed
// gates count as walls. Stand-on entities (item/switch) are passable.
function flood(def, grid, gatesOpen) {
  const { w, h, solidMap } = grid;
  const blocked = new Set();
  for (const e of def.entities || []) {
    if (SOLID_TYPES.has(e.type)) blocked.add(e.x + "," + e.y);
    if (e.type === "gate" && !gatesOpen) blocked.add(e.x + "," + e.y);
  }
  const walkable = (x, y) =>
    x >= 0 && y >= 0 && x < w && y < h && !solidMap[y][x] && !blocked.has(x + "," + y);

  const seen = new Set();
  const sx = def.spawn.x, sy = def.spawn.y;
  if (!walkable(sx, sy)) return { seen, walkable, spawnOk: false };
  const stack = [[sx, sy]];
  seen.add(sx + "," + sy);
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = nx + "," + ny;
      if (walkable(nx, ny) && !seen.has(k)) { seen.add(k); stack.push([nx, ny]); }
    }
  }
  return { seen, walkable, spawnOk: true };
}

function reachable(seen, walkable, e, mode) {
  if (mode === "stand") return walkable(e.x, e.y) && seen.has(e.x + "," + e.y);
  // adjacent: at least one orthogonal neighbour is reachable
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
    if (seen.has((e.x + dx) + "," + (e.y + dy))) return true;
  return false;
}

let failures = 0;
const fail = (zone, msg) => { console.error(`  ✗ [${zone}] ${msg}`); failures++; };

for (const [id, def] of Object.entries(ZONES)) {
  const grid = buildGrid(def);
  const { w, h, solidMap } = grid;
  const ents = def.entities || [];

  // 1. items must sit on a non-solid map tile
  for (const e of ents) {
    if (e.type === "item" && (e.y < 0 || e.y >= h || e.x < 0 || e.x >= w || solidMap[e.y][e.x]))
      fail(id, `item '${e.item}' on a SOLID/out-of-bounds tile (${e.x},${e.y})`);
  }

  // 2. no two entities share a tile
  const at = new Map();
  for (const e of ents) {
    const k = e.x + "," + e.y;
    if (at.has(k)) fail(id, `entities overlap at (${e.x},${e.y}): '${at.get(k)}' and '${e.type}'`);
    else at.set(k, e.type);
  }

  // 3. no solid entity on the spawn tile
  for (const e of ents)
    if (SOLID_TYPES.has(e.type) && e.x === def.spawn.x && e.y === def.spawn.y)
      fail(id, `solid '${e.type}' sits on the spawn tile (${e.x},${e.y})`);

  // 4. reachability
  const open = flood(def, grid, true);    // gates open: everything must be reachable
  const closed = flood(def, grid, false); // gates closed: switches must be reachable
  if (!open.spawnOk) { fail(id, `spawn tile (${def.spawn.x},${def.spawn.y}) is not walkable`); continue; }

  for (const e of ents) {
    const mode = STAND_ON.has(e.type) ? "stand" : ADJACENT.has(e.type) ? "adjacent" : null;
    if (!mode) continue;
    if (!reachable(open.seen, open.walkable, e, mode))
      fail(id, `'${e.type}'${e.item ? " '" + e.item + "'" : ""} at (${e.x},${e.y}) is UNREACHABLE (gates open)`);
    if (e.type === "switch" && closed.spawnOk && !reachable(closed.seen, closed.walkable, e, "stand"))
      fail(id, `switch '${e.gate}' at (${e.x},${e.y}) is unreachable while its gate is closed (deadlock)`);
  }

  // collectible objective sanity: enough notes exist to satisfy `need`
  if (def.collect) {
    const have = ents.filter((e) => (e.type === "item" || e.type === "search") && e.item === def.collect.item).length;
    if (have < def.collect.need)
      fail(id, `objective needs ${def.collect.need} '${def.collect.item}' but only ${have} are placed`);
  }
}

if (failures) {
  console.error(`\nzone validation FAILED: ${failures} problem(s).`);
  process.exit(1);
} else {
  console.log(`zone validation passed: ${Object.keys(ZONES).length} zones OK.`);
}
