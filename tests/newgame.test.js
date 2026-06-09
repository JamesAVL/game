import { describe, it, expect } from "vitest";
import { plusCarry, CARRY_ITEMS } from "../src/game/newgame.js";

// New Journey+ carry-over: a fresh save inherits ONLY the whitelisted spoils.
// Mirrors state.js fresh() shape (kept minimal — plusCarry only touches these).
function freshLike() {
  return {
    flags: {}, items: {}, records: [], grades: {}, medals: {}, quests: {},
    unlocked: { hub: true }, zone: "hub", ngPlus: 0,
    stats: { level: 1, xp: 0, xpNext: 10, style: 5, jazz: 5 },
  };
}

function finishedRun() {
  return {
    ngPlus: 0,
    flags: {
      ending_seen: true, beat_jazz: true, beat_tony: true, intro_done: true,
      codex_jazz: true, codex_search1_sea: true, tone_jazz: "mock",
      tundra_noteA: true, sw_tundra_g: true,
    },
    items: { mirror: 1, hat: 1, key: 1, note_tundra: 3, record: 1 },
    records: ["rec_jazz", "rec_tony"],
    grades: { jazz: "S", tony: "A" },
    medals: { jazz: { fc: true, nm: false } },
    quests: { banana: 3 },
    unlocked: { hub: true, tundra: true, sea: true },
    stats: { level: 9, xp: 4, xpNext: 100, style: 21, jazz: 21 },
    zone: "temple",
  };
}

describe("plusCarry (New Journey+)", () => {
  const d = plusCarry(freshLike(), finishedRun());

  it("increments the NG+ counter", () => {
    expect(d.ngPlus).toBe(1);
    expect(plusCarry(freshLike(), { ...finishedRun(), ngPlus: 2 }).ngPlus).toBe(3);
  });

  it("carries grades, medals, codex flags and ending_seen", () => {
    expect(d.grades).toEqual({ jazz: "S", tony: "A" });
    expect(d.medals.jazz.fc).toBe(true);
    expect(d.flags.codex_jazz).toBe(true);
    expect(d.flags.codex_search1_sea).toBe(true);
    expect(d.flags.ending_seen).toBe(true);
  });

  it("carries keepsake items but never notes or records", () => {
    expect(d.items.mirror).toBe(1);
    expect(d.items.hat).toBe(1);
    expect(d.items.key).toBe(1);
    expect(d.items.note_tundra).toBeUndefined();
    expect(d.items.record).toBeUndefined();
    for (const id of Object.keys(d.items)) expect(CARRY_ITEMS).toContain(id);
  });

  it("resets progression: records, boss flags, unlocks, stats, quests, zone", () => {
    expect(d.records).toEqual([]);
    expect(d.flags.beat_jazz).toBeUndefined();
    expect(d.flags.intro_done).toBeUndefined();
    expect(d.flags.tundra_noteA).toBeUndefined();
    expect(d.flags.sw_tundra_g).toBeUndefined();
    expect(d.flags.tone_jazz).toBeUndefined();
    expect(d.unlocked).toEqual({ hub: true });
    expect(d.stats.level).toBe(1);
    expect(d.quests).toEqual({});
    expect(d.zone).toBe("hub");
  });

  it("tolerates a missing/partial old save", () => {
    const e = plusCarry(freshLike(), {});
    expect(e.ngPlus).toBe(1);
    expect(e.items).toEqual({});
  });
});
