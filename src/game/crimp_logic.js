// @ts-check
// crimp_logic.js — pure, DOM-free battle logic for the crimp-off: chart
// preparation (lane remap + density thinning), the per-boss signature
// mechanics, and result grading. Kept free of engine imports so Vitest can
// lock determinism and fairness contracts directly.

/**
 * Same LCG family as data/crimps.js makeChart — keeps everything reproducible.
 * @param {number} seed
 * @returns {() => number} uniform [0,1) generator
 */
export function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

// Build playable notes from a crimp def: seconds from 16th steps, the
// authored 0..3 lanes remapped onto the active lane count (position kept),
// then thinned to a max density so charts stay humanly playable.
/**
 * @typedef {{t: number, lane: number, dead: boolean, ghost?: boolean,
 *            hold?: number, holding?: boolean, cursed?: boolean, scram?: boolean}} Note
 * @typedef {{type: string, rate?: number, seed?: number, min?: number, max?: number,
 *            y0?: number, y1?: number, amp?: number, speed?: number,
 *            everyBars?: number, lenBars?: number}} Mechanic
 */
/**
 * @param {{bpm: number, notes: [number, number][]}} def
 * @param {number} laneCount
 * @param {number} minGap
 * @returns {Note[]}
 */
export function prepareChart(def, laneCount, minGap) {
  const sd = 60 / def.bpm / 4; // seconds per 16th step
  const remap = (/** @type {number} */ lane) => Math.min(laneCount - 1, Math.floor(lane * laneCount / 4));
  const raw = def.notes.map(([step, lane]) => ({ t: step * sd, lane: remap(lane), dead: false }))
    .sort((a, b) => a.t - b.t);
  const notes = [];
  let lastT = -Infinity;
  for (const n of raw) {
    if (n.t - lastT >= minGap) { notes.push(n); lastT = n.t; }
  }
  return notes;
}

// Apply a boss's signature mechanic to a prepared chart. Mutates note flags
// ({ghost, hold, cursed, scram}) deterministically from mechanic.seed and
// returns { notes, segments } — segments are [start,end] windows used by
// "outrage" for its one-bar-early warning. "fog" and "drift" are render-time
// only and pass through untouched.
/**
 * @param {Note[]} notes
 * @param {Mechanic | undefined} mechanic
 * @param {number} bpm
 * @param {number} laneCount
 * @returns {{notes: Note[], segments: [number, number][]}}
 */
export function applyMechanic(notes, mechanic, bpm, laneCount) {
  /** @type {[number, number][]} */
  const segments = [];
  if (!mechanic || !notes.length) return { notes, segments };
  const rnd = lcg(mechanic.seed || 1);

  if (mechanic.type === "swing") {
    // flickering ghost notes worth double — never the opening bars
    const rate = mechanic.rate || 0.2;
    for (let i = 4; i < notes.length; i++) if (rnd() < rate) notes[i].ghost = true;
  } else if (mechanic.type === "hold") {
    // sustains: only where the following note leaves room for the tail
    const rate = mechanic.rate || 0.3;
    const min = mechanic.min || 0.5, max = mechanic.max || 1.2;
    for (let i = 0; i < notes.length - 1; i++) {
      const gap = notes[i + 1].t - notes[i].t;
      if (gap >= min + 0.25 && rnd() < rate) notes[i].hold = Math.min(max, gap - 0.25);
    }
  } else if (mechanic.type === "hex") {
    // cursed notes you must NOT hit; kept clear of their neighbours so a
    // legitimate press can't clip one by accident
    const rate = mechanic.rate || 0.12;
    for (let i = 4; i < notes.length - 1; i++) {
      const clear = notes[i].t - notes[i - 1].t >= 0.3 && notes[i + 1].t - notes[i].t >= 0.3;
      if (clear && rnd() < rate && !notes[i - 1].cursed) notes[i].cursed = true;
    }
  } else if (mechanic.type === "outrage") {
    // periodic lane scrambles (mirrored), announced one bar early via segments
    const barLen = (60 / bpm) * 4;
    const every = (mechanic.everyBars || 8) * barLen;
    const len = (mechanic.lenBars || 2) * barLen;
    const total = notes[notes.length - 1].t;
    for (let s = every; s < total; s += every) {
      segments.push([s, s + len]);
      for (const n of notes) {
        if (n.t >= s && n.t < s + len) { n.lane = laneCount - 1 - n.lane; n.scram = true; }
      }
    }
  }
  return { notes, segments };
}

// hint line shown on the countdown screen so mechanics never blindside you
export const MECHANIC_HINTS = {
  swing: "Flickering ghost notes are worth DOUBLE!",
  hold: "HOLD sustained notes until the tail runs out!",
  fog: "Notes vanish in the murk - keep a combo to see!",
  hex: "Do NOT hit the cursed notes!",
  drift: "The notes drift dreamily - stay loose.",
  outrage: "When the wind howls, the lanes SCRAMBLE!",
};

// ---- grading ---------------------------------------------------------------
export const GRADES = ["C", "B", "A", "S"];

/**
 * @param {number} hits  @param {number} total  @param {number} maxCombo
 * @returns {"S"|"A"|"B"|"C"}
 */
export function gradeFor(hits, total, maxCombo) {
  if (total <= 0) return "C";
  const acc = hits / total;
  if (acc >= 0.95 && maxCombo >= total * 0.5) return "S";
  if (acc >= 0.85) return "A";
  if (acc >= 0.7) return "B";
  return "C";
}

/**
 * Keep the best grade between two (either may be undefined).
 * @param {string=} a  @param {string=} b
 */
export function betterGrade(a, b) {
  const ia = GRADES.indexOf(a || ""), ib = GRADES.indexOf(b || "");
  return ib > ia ? b : (ia >= 0 ? a : b);
}
