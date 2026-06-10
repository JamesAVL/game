// perks.js — THE single source of truth for crimp modifiers. Replaces the
// level-perk math that used to live (duplicated) in crimp.js and menu.js,
// and folds in equipped gear: Vince-slot mods scale with Style, Howard-slot
// mods with Jazz — the two stats finally do something.

import { GEAR } from "../data/gear.js";

export function crimpPerks(gs) {
  const s = gs.data.stats;
  const over = Math.max(0, s.level - 1);
  const p = {
    headStart: Math.min(15, over * 1.5),       // starting meter bonus
    gainMul: 1 + Math.min(0.35, over * 0.035), // meter gain multiplier
    perfWinBonus: Math.min(0.025, over * 0.0025), // wider perfect window (s)
    goodWinBonus: Math.min(0.05, over * 0.005),   // wider good window (s)
    comboShield: 0,   // fluffs per song that don't break the combo
    hypeRate: 1,      // hype/crowd meter growth multiplier (M3+ crimp depth)
    shrapMul: 1,      // payout multiplier
  };
  for (const slot of ["vince", "howard", "charm"]) {
    const g = GEAR[gs.data.gear[slot]];
    if (!g) continue;
    const k = slot === "vince" ? 1 + s.style / 200
      : slot === "howard" ? 1 + s.jazz / 200 : 1;
    for (const [m, v] of Object.entries(g.mods || {})) {
      if (p[m] === undefined) continue;
      p[m] += v * k;
    }
  }
  p.comboShield = Math.round(p.comboShield);
  return p;
}
