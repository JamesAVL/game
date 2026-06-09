import { describe, it, expect } from "vitest";
import { ZONES } from "../src/data/zones.js";
import { LEGEND } from "../src/data/legend.js";
import { QUESTS } from "../src/data/quests.js";

// zones.js + legend.js are pure, DOM-free data. These tests lock the text-map
// contract: every authored char must exist in the merged legend (world.js
// silently falls back to floor, which would hide typos), overlay tiles must
// reference the overlay columns (12+) of the generated strips, and void tiles
// must paint nothing and block walking (the parallax backdrop shows through).

const zones = Object.entries(ZONES);

describe("zone map data", () => {
  it("defines the hub + 6 worlds", () => {
    expect(zones.length).toBeGreaterThanOrEqual(7);
    expect(ZONES.hub).toBeTruthy();
  });

  for (const [id, def] of zones) {
    describe(`zone "${id}"`, () => {
      const legend = Object.assign({}, LEGEND, def.legend || {});

      it("uses only chars present in the merged legend", () => {
        const unknown = new Set();
        for (const row of def.map) for (const ch of row) if (!legend[ch]) unknown.add(ch);
        expect([...unknown]).toEqual([]);
      });

      it("has a spawn on a walkable tile", () => {
        const cell = legend[def.map[def.spawn.y][def.spawn.x]];
        expect(cell.solid).toBeFalsy();
      });

      it("only has a backdrop when void tiles exist (and vice versa)", () => {
        let hasVoid = false;
        for (const row of def.map) for (const ch of row) if (legend[ch] && legend[ch].void) hasVoid = true;
        expect(!!def.backdrop).toBe(hasVoid);
      });

      it("keeps leader-gates and trance-secrets off required progression", () => {
        for (const e of def.entities || []) {
          // crimp notes and bosses must stay leader-neutral and visible:
          // who/hidden gating may only decorate optional extras
          const isNote = def.collect && e.item === def.collect.item;
          if (isNote || e.type === "boss" || e.type === "portal" || e.type === "switch" || e.type === "gate") {
            expect(e.who, `${e.type} at (${e.x},${e.y})`).toBeUndefined();
            expect(e.hidden, `${e.type} at (${e.x},${e.y})`).toBeFalsy();
          }
          // every interactable secret still explains itself
          if (e.hidden || e.who) expect(e.dialog, `${e.type} at (${e.x},${e.y})`).toBeTruthy();
        }
      });
    });
  }
});

describe("quest data", () => {
  it("every quest has contiguous step text up to its done step", () => {
    for (const [id, q] of Object.entries(QUESTS)) {
      expect(q.name, id).toBeTruthy();
      expect(q.done, id).toBeGreaterThan(0);
      for (let s = 1; s <= q.done; s++) expect(typeof q.steps[s], `${id} step ${s}`).toBe("string");
    }
  });
});

describe("legend contract", () => {
  it("overlay tiles reference the overlay columns (12+) of the tile strips", () => {
    for (const [ch, cell] of Object.entries(LEGEND)) {
      if (cell.over != null) {
        expect(cell.over, `char '${ch}'`).toBeGreaterThanOrEqual(12);
        expect(cell.over, `char '${ch}'`).toBeLessThan(16);
        expect(cell.solid, `char '${ch}' must be walkable`).toBeFalsy();
      }
    }
  });

  it("void tiles paint nothing and block walking", () => {
    for (const [ch, cell] of Object.entries(LEGEND)) {
      if (cell.void) {
        expect(cell.t, `char '${ch}'`).toBe(-1);
        expect(cell.solid, `char '${ch}'`).toBe(true);
      }
    }
  });

  it("keeps the documented ground indices stable (gen_tiles.py contract)", () => {
    expect(LEGEND["."].t).toBe(0);
    expect(LEGEND["#"].t).toBe(2);
    expect(LEGEND["O"].t).toBe(4);
    expect(LEGEND["~"].t).toBe(7);
    expect(LEGEND["+"].t).toBe(9);
    expect(LEGEND["X"].t).toBe(11);
  });
});
