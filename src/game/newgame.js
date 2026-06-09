// @ts-check
// newgame.js — pure New Game+ carry-over rules, separated from state.js (which
// pulls in the DOM via core.js) so Vitest can lock the whitelist.

// keepsake items that survive a New Journey+ (charms + quest mementos);
// crimp notes and records always reset — they ARE the journey
export const CARRY_ITEMS = ["mirror", "hat", "baileys", "polo", "jazzcig", "cream", "bin", "key", "banana"];

/**
 * Copy the whitelisted spoils of a finished run onto a fresh save.
 * Mutates and returns `freshData`. Pure: no engine imports.
 * @template {{ngPlus?: number, grades?: object, medals?: object,
 *            flags: Record<string, any>, items: Record<string, number>}} T
 * @param {T} freshData a brand-new save (state.js fresh())
 * @param {Partial<T>} oldData the completed run
 * @returns {T}
 */
export function plusCarry(freshData, oldData) {
  const old = oldData || {};
  freshData.ngPlus = (old.ngPlus || 0) + 1;
  freshData.grades = Object.assign({}, old.grades);
  freshData.medals = Object.assign({}, old.medals);
  for (const [k, v] of Object.entries(old.flags || {})) {
    if (k.startsWith("codex_") || k === "ending_seen") freshData.flags[k] = v;
  }
  const oldItems = /** @type {Record<string, number>} */ (old.items || {});
  for (const id of CARRY_ITEMS) {
    if (oldItems[id] > 0) freshData.items[id] = oldItems[id];
  }
  return freshData;
}
