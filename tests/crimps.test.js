import { describe, it, expect } from "vitest";
import { CRIMPS } from "../src/data/crimps.js";

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

      it("notes are [step, lane] with lanes in 0..3 and non-decreasing steps", () => {
        let prevStep = -1;
        for (const n of c.notes) {
          expect(n).toHaveLength(2);
          const [step, lane] = n;
          expect(Number.isInteger(step)).toBe(true);
          expect(step).toBeGreaterThanOrEqual(prevStep); // sorted (chords share a step)
          expect(Number.isInteger(lane)).toBe(true);
          expect(lane).toBeGreaterThanOrEqual(0);
          expect(lane).toBeLessThanOrEqual(3);
          prevStep = step;
        }
      });

      it("has a valid parallax stage (back-to-front bands + sane motes)", () => {
        const st = c.stage;
        expect(st).toBeTruthy();
        expect(st.bands.length).toBeGreaterThanOrEqual(2);
        let prevY = 0;
        for (const b of st.bands) {
          expect(b.color).toMatch(/^#[0-9a-f]{6}$/i);
          expect(b.y).toBeGreaterThan(0);
          expect(b.y).toBeLessThan(1);
          expect(b.y).toBeGreaterThanOrEqual(prevY); // back bands sit higher
          expect(b.amp).toBeGreaterThan(0);
          expect(b.speed).toBeGreaterThan(0);
          prevY = b.y;
        }
        if (st.motes) {
          expect(st.motes.n).toBeGreaterThan(0);
          expect(st.motes.alpha).toBeGreaterThan(0);
          expect(st.motes.alpha).toBeLessThanOrEqual(1);
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
});
