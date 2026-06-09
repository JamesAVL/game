import { describe, it, expect } from "vitest";
import { DIALOG } from "../src/data/dialogue.js";
import { ZONES } from "../src/data/zones.js";
import { CRIMPS } from "../src/data/crimps.js";
import { CODEX, pickEnding, codexCount } from "../src/data/codex.js";

// dialogue.js is pure data (functions of an `api`), so we can execute every
// script against a stub api and lock the contracts: every dialog id wired in
// zones.js exists, every script yields well-formed pages, every codex entry
// maps to a real unlock source, and the ending choice is deterministic.

function stubApi(overrides = {}) {
  return {
    gs: { data: { grades: {}, flags: {}, quests: {} } },
    flag: () => false,
    setFlag: () => {},
    has: () => false,
    count: () => 0,
    give: () => {},
    take: () => {},
    addXp: () => {},
    unlock: () => {},
    addRecord: () => {},
    hasRecord: () => false,
    recordCount: () => 0,
    quest: () => 0,
    setQuest: () => {},
    leader: () => "vince",
    ending: () => "funk",
    toast: () => {},
    goto: () => {},
    startCrimp: () => {},
    say: () => {},
    save: () => {},
    ...overrides,
  };
}

function pagesOf(id, api = stubApi()) {
  let r = DIALOG[id](api);
  if (Array.isArray(r)) r = { pages: r };
  return r.pages;
}

describe("dialog wiring", () => {
  it("every dialog id referenced in zones.js exists in DIALOG", () => {
    const missing = [];
    for (const def of Object.values(ZONES)) {
      const refs = [def.onEnter, def.collect && def.collect.dialog];
      for (const e of def.entities || [])
        refs.push(e.dialog, e.requireDialog, e.winDialog, e.loseDialog, e.afterDialog, e.emptyDialog, e.onGet, e.onReveal);
      for (const id of refs) if (id && !DIALOG[id]) missing.push(def.id + ":" + id);
    }
    expect(missing).toEqual([]);
  });

  for (const id of Object.keys(DIALOG)) {
    it(`"${id}" yields well-formed pages on the default path`, () => {
      const pages = pagesOf(id);
      expect(Array.isArray(pages)).toBe(true);
      expect(pages.length).toBeGreaterThan(0);
      for (const p of pages) {
        if (p.choice !== undefined) {
          expect(typeof p.choice).toBe("string");
          expect(p.options.length).toBeGreaterThanOrEqual(2);
          for (const o of p.options) expect(typeof o.label).toBe("string");
        } else {
          expect(typeof p.text).toBe("string");
          expect(p.text.length).toBeGreaterThan(0);
        }
      }
    });
  }

  it("every boss pre-fight script offers the tone choice", () => {
    for (const id of ["jazz", "gregg", "crackfox", "nana", "moon", "tony"]) {
      const pages = pagesOf(id + "_pre");
      const choice = pages.find((p) => p.choice !== undefined);
      expect(choice, id).toBeTruthy();
      expect(choice.options.length).toBe(2);
    }
  });
});

describe("codex", () => {
  it("every entry maps to a real unlock source (search dialog or boss crimp)", () => {
    for (const c of CODEX) {
      const src = c.id.replace(/^codex_/, "");
      expect(!!DIALOG[src] || !!CRIMPS[src], c.id).toBe(true);
    }
  });

  it("counts unlocked entries from flags", () => {
    expect(codexCount({ flags: {} })).toBe(0);
    expect(codexCount({ flags: { [CODEX[0].id]: true, [CODEX[1].id]: true } })).toBe(2);
  });
});

describe("pickEnding", () => {
  const tones = (v) => ({ tone_jazz: v, tone_gregg: v, tone_crackfox: v, tone_nana: v });

  it("legend: 4+ S grades or a near-full ledger", () => {
    expect(pickEnding({ grades: { a: "S", b: "S", c: "S", d: "S" }, flags: {} })).toBe("legend");
    const flags = {};
    for (const c of CODEX.slice(0, Math.ceil(CODEX.length * 0.85))) flags[c.id] = true;
    expect(pickEnding({ grades: {}, flags })).toBe("legend");
  });

  it("respect: mostly respectful tones", () => {
    expect(pickEnding({ grades: {}, flags: tones("respect") })).toBe("respect");
  });

  it("funk: the default", () => {
    expect(pickEnding({ grades: {}, flags: {} })).toBe("funk");
    expect(pickEnding({ grades: { a: "S" }, flags: tones("mock") })).toBe("funk");
  });

  it("ending text actually varies in tony_win", () => {
    const texts = ["legend", "respect", "funk"].map((e) =>
      pagesOf("tony_win", stubApi({ ending: () => e })).map((p) => p.text || p.choice).join("|"));
    expect(new Set(texts).size).toBe(3);
  });
});
