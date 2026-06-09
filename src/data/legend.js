// legend.js — the shared text-map character legend (pure data, no engine
// imports, so tools/validate_zones.mjs and Vitest can use the real thing).
//
// Tile-index convention shared by every generated tileset (gen_tiles.py):
//  0 floor   1 floor-variant   2 wall          3 wall-alt(solid)
//  4 obstacle(solid)  5 deco    6 path          7 water/hazard(solid)
//  8 door    9 accent-floor   10 deco2         11 solid-feature
// Overlay tiles (drawn above entities; columns 12+ in each strip):
// 12 canopy  13 arch-top      14 hanging(vines/icicles)  15 glow-haze
//
// Cell fields: t = ground tile (-1 paints nothing), solid = blocks walking,
// over = overlay tile drawn above the party, void = a chasm (the parallax
// backdrop shows through where the ground layer paints nothing).
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
  // ---- depth layers ----
  "^": { t: 0, over: 12 },             // walk under a tree canopy
  "A": { t: 6, over: 13 },             // walk under an arch / overhang
  ";": { t: 0, over: 14 },             // walk under hanging vines / icicles
  "!": { t: 0, over: 15 },             // walk through a glowing haze
  "%": { t: -1, solid: true, void: true }, // chasm: backdrop shows through
};
