// @ts-check
// codex.js — "Naboo's Ledger": lore entries unlocked by playing (pure data).
// Each entry's id is a flag set by the overworld — "codex_<searchDialogId>"
// when a searchable is first rifled, "codex_<crimpId>" when a boss falls.
// The pause menu shows per-zone completion; pickEnding() reads the whole
// save to choose the finale.

export const CODEX = [
  // hub
  { id: "codex_hub_search1", zone: "The Zooniverse", title: "Naboo's Incense" },
  { id: "codex_hub_search2", zone: "The Zooniverse", title: "Fossil's Diary" },
  // tundra
  { id: "codex_search1_tundra", zone: "Frozen Tundra", title: "The Tundra Postman" },
  { id: "codex_search2_tundra", zone: "Frozen Tundra", title: "A Worried Rock" },
  { id: "codex_search3_tundra", zone: "Frozen Tundra", title: "The Twig Moustache" },
  { id: "codex_hidden_tundra", zone: "Frozen Tundra", title: "Stash of Warm Memories" },
  { id: "codex_jazz", zone: "Frozen Tundra", title: "The Spirit of Jazz" },
  // sea
  { id: "codex_search1_sea", zone: "Old Gregg's Sea", title: "The Listening Shell" },
  { id: "codex_search2_sea", zone: "Old Gregg's Sea", title: "Gregg Woz Ere" },
  { id: "codex_search3_sea", zone: "Old Gregg's Sea", title: "Four Hundred Biros" },
  { id: "codex_gregg", zone: "Old Gregg's Sea", title: "Old Gregg" },
  // forest
  { id: "codex_search1_forest", zone: "Forest of Bins", title: "A Fox's Treasure" },
  { id: "codex_search2_forest", zone: "Forest of Bins", title: "The Blinking Fern" },
  { id: "codex_search3_forest", zone: "Forest of Bins", title: "King Shoe" },
  { id: "codex_hidden_forest", zone: "Forest of Bins", title: "The Buried Banana" },
  { id: "codex_crackfox", zone: "Forest of Bins", title: "The Crack Fox" },
  // nightosphere
  { id: "codex_search1_night", zone: "Nightosphere", title: "Nan's Best Casserole" },
  { id: "codex_search2_night", zone: "Nightosphere", title: "The Minor-Chord Rock" },
  { id: "codex_search3_night", zone: "Nightosphere", title: "Eternal Torment (medium)" },
  { id: "codex_nana", zone: "Nightosphere", title: "Nanageddon" },
  // moon
  { id: "codex_search1_moon", zone: "The Moon", title: "Just a Rock (on the Moon)" },
  { id: "codex_search2_moon", zone: "The Moon", title: "Vintage Moon-Milk" },
  { id: "codex_search3_moon", zone: "The Moon", title: "The Moon's Diary" },
  { id: "codex_hidden_moon", zone: "The Moon", title: "The Humming Cache" },
  { id: "codex_moon", zone: "The Moon", title: "The Moon" },
  // temple
  { id: "codex_search1_temple", zone: "Xooberon Temple", title: "Saboo Woz Robbed" },
  { id: "codex_search2_temple", zone: "Xooberon Temple", title: "Ceremonial Tassels" },
  { id: "codex_search3_temple", zone: "Xooberon Temple", title: "The Glitter Scoreboard" },
  { id: "codex_tony", zone: "Xooberon Temple", title: "Tony Harrison" },
  // post-game
  { id: "codex_hitcher", zone: "The Zooniverse", title: "The Hitcher" },
];

/** @param {{flags?: Record<string, any>}} data */
export function codexCount(data) {
  const flags = (data && data.flags) || {};
  return CODEX.filter((c) => flags[c.id]).length;
}

/**
 * Choose the finale from the whole save. Pure + deterministic:
 *  "legend"  — a master's run: 4+ S grades, or the ledger nearly full
 *  "respect" — you mostly faced the bosses with respect
 *  "funk"    — the standard triumphant ending
 * @param {{flags?: Record<string, any>, grades?: Record<string, string>}} data
 * @returns {"legend"|"respect"|"funk"}
 */
export function pickEnding(data) {
  const flags = (data && data.flags) || {};
  const grades = (data && data.grades) || {};
  const sCount = Object.values(grades).filter((g) => g === "S").length;
  if (sCount >= 4 || codexCount(data) >= Math.floor(CODEX.length * 0.8)) return "legend";
  const tones = Object.keys(flags).filter((k) => k.startsWith("tone_"));
  const respects = tones.filter((k) => flags[k] === "respect").length;
  if (tones.length && respects > tones.length / 2) return "respect";
  return "funk";
}
