// clock.js — the world clock. Game time advances only while the overworld
// updates (dialogue/menus/crimps pause it for free via the scene contract):
// one real second = one game minute, a full day = 24 real minutes. Outdoor
// zones breathe with the phase; the surreal dark worlds keep their own gloom.

import { ZONE_LIGHT } from "../data/zones.js";

export const DAY_MIN = 24 * 60;

export function tick(gs, dt) {
  gs.data.clock += dt;
  if (gs.data.clock >= DAY_MIN) {
    gs.data.clock -= DAY_MIN;
    gs.data.day = (gs.data.day || 0) + 1;
    return true; // midnight rolled
  }
  return false;
}

export function phase(gs) {
  const h = (gs.data.clock / 60) % 24;
  if (h >= 6 && h < 8) return "dawn";
  if (h >= 8 && h < 18) return "day";
  if (h >= 18 && h < 21) return "dusk";
  return "night";
}

// zones that live under the sky follow the clock
const OUTDOOR = new Set(["hub", "tundra", "forest", "yeti"]);
const PHASE_LEVEL = { dawn: 0.78, day: 1, dusk: 0.72, night: 0.48 };

export function ambientFor(zoneId, gs) {
  const fixed = ZONE_LIGHT[zoneId];
  if (fixed) return fixed.level;          // surreal worlds keep their gloom
  if (!OUTDOOR.has(zoneId)) return 1;     // interiors are always lit
  return PHASE_LEVEL[phase(gs)];
}
