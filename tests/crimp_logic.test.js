import { describe, it, expect } from "vitest";
import { prepareChart, applyMechanic, gradeFor, betterGrade, MECHANIC_HINTS } from "../src/game/crimp_logic.js";
import { CRIMPS } from "../src/data/crimps.js";

// crimp_logic.js is the pure battle core: chart prep, the per-boss signature
// mechanics, and grading. These tests lock determinism + fairness contracts.

const LANES = [2, 3, 4]; // easy / normal / hard
const MIN_GAP = { 2: 0.24, 3: 0.17, 4: 0.12 };

function prepped(id, laneCount) {
  return prepareChart(CRIMPS[id], laneCount, MIN_GAP[laneCount]);
}

describe("prepareChart", () => {
  for (const lanes of LANES) {
    it(`keeps lanes in range and respects minGap at ${lanes} lanes`, () => {
      for (const [id, c] of Object.entries(CRIMPS)) {
        const notes = prepareChart(c, lanes, MIN_GAP[lanes]);
        expect(notes.length, id).toBeGreaterThan(0);
        let last = -Infinity;
        for (const n of notes) {
          expect(n.lane).toBeGreaterThanOrEqual(0);
          expect(n.lane).toBeLessThan(lanes);
          expect(n.t - last).toBeGreaterThanOrEqual(MIN_GAP[lanes]);
          last = n.t;
        }
      }
    });
  }

  it("is deterministic (same def + params => identical notes)", () => {
    const a = prepped("tony", 4), b = prepped("tony", 4);
    expect(a).toEqual(b);
  });
});

describe("applyMechanic", () => {
  it("is deterministic across runs", () => {
    for (const id of ["jazz", "gregg", "nana", "tony"]) {
      const c = CRIMPS[id];
      const a = applyMechanic(prepped(id, 4), c.mechanic, c.bpm, 4);
      const b = applyMechanic(prepped(id, 4), c.mechanic, c.bpm, 4);
      expect(a.notes).toEqual(b.notes);
      expect(a.segments).toEqual(b.segments);
    }
  });

  it("every boss mechanic has a countdown hint", () => {
    for (const c of Object.values(CRIMPS)) {
      const list = Array.isArray(c.mechanic) ? c.mechanic : (c.mechanic ? [c.mechanic] : []);
      for (const m of list) expect(MECHANIC_HINTS[m.type], c.name).toBeTruthy();
    }
  });

  it("stacked mechanics (hitcher) apply all layers deterministically", () => {
    const c = CRIMPS.hitcher;
    expect(Array.isArray(c.mechanic)).toBe(true);
    const a = applyMechanic(prepped("hitcher", 4), c.mechanic, c.bpm, 4);
    const b = applyMechanic(prepped("hitcher", 4), c.mechanic, c.bpm, 4);
    expect(a.notes).toEqual(b.notes);
    expect(a.notes.some((n) => n.cursed)).toBe(true);   // hex layer
    expect(a.notes.some((n) => n.scram)).toBe(true);    // outrage layer
    expect(a.segments.length).toBeGreaterThan(0);
    for (const n of a.notes) { expect(n.lane).toBeGreaterThanOrEqual(0); expect(n.lane).toBeLessThan(4); }
  });

  it("hold tails never reach the next note (0.25s of slack)", () => {
    for (const lanes of LANES) {
      const c = CRIMPS.gregg;
      const { notes } = applyMechanic(prepped("gregg", lanes), c.mechanic, c.bpm, lanes);
      for (let i = 0; i < notes.length - 1; i++) {
        if (notes[i].hold)
          expect(notes[i].t + notes[i].hold).toBeLessThanOrEqual(notes[i + 1].t - 0.25 + 1e-9);
      }
      expect(notes.some((n) => n.hold)).toBe(true);
    }
  });

  it("hex curses stay rare, spaced, and never adjacent", () => {
    for (const lanes of LANES) {
      const c = CRIMPS.nana;
      const { notes } = applyMechanic(prepped("nana", lanes), c.mechanic, c.bpm, lanes);
      const cursed = notes.filter((n) => n.cursed).length;
      expect(cursed).toBeGreaterThan(0);
      expect(cursed / notes.length).toBeLessThanOrEqual(0.2);
      for (let i = 1; i < notes.length; i++)
        expect(notes[i].cursed && notes[i - 1].cursed).toBeFalsy();
    }
  });

  it("outrage scrambles keep lanes in range and segments ordered", () => {
    for (const lanes of LANES) {
      const c = CRIMPS.tony;
      const { notes, segments } = applyMechanic(prepped("tony", lanes), c.mechanic, c.bpm, lanes);
      expect(segments.length).toBeGreaterThan(0);
      let prevEnd = -Infinity;
      for (const [s0, s1] of segments) {
        expect(s0).toBeGreaterThanOrEqual(prevEnd); // no overlap
        expect(s1).toBeGreaterThan(s0);
        prevEnd = s1;
      }
      for (const n of notes) {
        expect(n.lane).toBeGreaterThanOrEqual(0);
        expect(n.lane).toBeLessThan(lanes);
      }
      expect(notes.some((n) => n.scram)).toBe(true);
    }
  });

  it("render-only mechanics (fog/drift) leave the chart untouched", () => {
    for (const id of ["crackfox", "moon"]) {
      const c = CRIMPS[id];
      const base = prepped(id, 3);
      const { notes, segments } = applyMechanic(prepped(id, 3), c.mechanic, c.bpm, 3);
      expect(notes).toEqual(base);
      expect(segments).toEqual([]);
    }
  });
});

describe("grading", () => {
  it("applies the S/A/B/C thresholds", () => {
    expect(gradeFor(100, 100, 60)).toBe("S");   // 100% + half-chart combo
    expect(gradeFor(96, 100, 20)).toBe("A");    // accurate but choppy => no S
    expect(gradeFor(86, 100, 10)).toBe("A");
    expect(gradeFor(72, 100, 10)).toBe("B");
    expect(gradeFor(40, 100, 5)).toBe("C");
    expect(gradeFor(0, 0, 0)).toBe("C");
  });

  it("betterGrade keeps the best of two", () => {
    expect(betterGrade(undefined, "B")).toBe("B");
    expect(betterGrade("B", "S")).toBe("S");
    expect(betterGrade("S", "A")).toBe("S");
    expect(betterGrade("A", "A")).toBe("A");
  });
});
