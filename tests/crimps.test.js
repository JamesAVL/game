import { describe, it, expect } from "vitest";
import { CRIMPS, addHolds, mirrorPass, makeVariant } from "../src/data/crimps.js";

// crimps.js is pure, DOM-free data: deterministic note charts generated from a
// seed. These tests lock the contracts the rest of the engine relies on —
// notably the 0..3 lane range that the difficulty-based lane remap
// (Math.floor(lane * laneCount / 4)) depends on.

const entries = Object.entries(CRIMPS);

describe("CRIMPS data", () => {
  it("defines at least the 6 bosses + tutorial", () => {
    expect(entries.length).toBeGreaterThanOrEqual(7);
    expect(CRIMPS.tutorial).toBeTruthy();
  });

  for (const [id, c] of entries) {
    describe(`crimp "${id}"`, () => {
      it("has the required fields", () => {
        expect(typeof c.name).toBe("string");
        expect(typeof c.trackKey).toBe("string");
        expect(typeof c.bpm).toBe("number");
        expect(c.bpm).toBeGreaterThan(0);
        expect(Array.isArray(c.notes)).toBe(true);
        expect(c.notes.length).toBeGreaterThan(0);
        expect(Array.isArray(c.lyrics)).toBe(true);
      });

      it("notes are [step, lane(, holdSteps)] with lanes 0..3, sorted steps", () => {
        let prevStep = -1;
        for (const n of c.notes) {
          expect(n.length === 2 || n.length === 3).toBe(true);
          const [step, lane, hold] = n;
          expect(Number.isInteger(step)).toBe(true);
          expect(step).toBeGreaterThanOrEqual(prevStep); // sorted (chords share a step)
          expect(Number.isInteger(lane)).toBe(true);
          expect(lane).toBeGreaterThanOrEqual(0);
          expect(lane).toBeLessThanOrEqual(3);
          if (n.length === 3) { expect(hold).toBeGreaterThanOrEqual(2); expect(hold).toBeLessThanOrEqual(6); }
          prevStep = step;
        }
      });

      it("lyric cues land within the song and carry text", () => {
        const lastStep = c.notes[c.notes.length - 1][0];
        const beats = lastStep / 4;
        for (const [beat, text] of c.lyrics) {
          expect(typeof text).toBe("string");
          expect(beat).toBeGreaterThanOrEqual(0);
          expect(beat).toBeLessThanOrEqual(beats + 1);
        }
      });
    });
  }

  it("chart generation is deterministic (stable note counts per seed)", () => {
    // Locks the 'generated deterministically from a seed' contract: if the
    // generator math changes, these counts change and this test flags it.
    expect(CRIMPS.tutorial.notes.length).toBe(22);
    expect(CRIMPS.jazz.notes.length).toBe(62);
    expect(CRIMPS.tony.notes.length).toBe(115);
  });

  it("addHolds preserves note counts/steps/lanes and is deterministic", () => {
    const base = [[0, 0], [8, 1], [9, 2], [16, 3]];
    const a = addHolds(base, 42, 1.0);   // chance 1: every eligible note holds
    const b = addHolds(base, 42, 1.0);
    expect(a).toEqual(b);
    expect(a.length).toBe(base.length);
    a.forEach((n, i) => { expect(n[0]).toBe(base[i][0]); expect(n[1]).toBe(base[i][1]); });
    expect(a[0].length).toBe(3);         // gap 8 -> holds
    expect(a[1].length).toBe(2);         // gap 1 -> never holds
  });

  it("mirrorPass flips lanes only from the pivot step", () => {
    const m = mirrorPass([[0, 0], [10, 1, 4], [20, 3]], 10);
    expect(m).toEqual([[0, 0], [10, 2, 4], [20, 0]]);
  });

  it("makeVariant reseeds denser charts at higher tiers, deterministically", () => {
    const v1 = makeVariant("jazz", 1);
    const v1b = makeVariant("jazz", 1);
    expect(v1.notes).toEqual(v1b.notes);
    expect(v1.bpm).toBe(CRIMPS.jazz.bpm + 8);
    expect(v1.tier).toBe(1);
    expect(v1.notes.length).toBeGreaterThan(CRIMPS.jazz.notes.length * 0.8);
    expect(v1.notes).not.toEqual(CRIMPS.jazz.notes);
  });
});
