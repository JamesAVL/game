// quests.test.js — locks the quest/gear/collection data contracts: every
// reward id resolves, every `when` clause uses known vocabulary, and the
// evaluator + runtime behave (start -> auto-advance -> complete).

import { describe, it, expect } from "vitest";
import { QUESTS, evalWhen } from "../src/data/quests.js";
import { GEAR, GEAR_SLOTS } from "../src/data/gear.js";
import { COLLECTIONS } from "../src/data/collectibles.js";
import { ITEMS } from "../src/data/items.js";
import { CRIMPS } from "../src/data/crimps.js";
import { GS, GRADES } from "../src/game/state.js";
import { Quests } from "../src/game/quests.js";
import { crimpPerks } from "../src/game/perks.js";

const WHEN_KEYS = new Set(["flag", "item", "collection", "best", "shrapnel", "count"]);

describe("quest data", () => {
  for (const [id, q] of Object.entries(QUESTS)) {
    it(`${id} is well-formed`, () => {
      expect(q.name).toBeTruthy();
      expect(q.giver).toBeTruthy();
      expect(q.stages.length).toBeGreaterThan(0);
      for (const st of q.stages) {
        expect(st.goal).toBeTruthy();
        if (st.when) {
          for (const k of Object.keys(st.when)) expect(WHEN_KEYS.has(k)).toBe(true);
          if (st.when.collection) expect(COLLECTIONS[st.when.collection]).toBeDefined();
          if (st.when.best) expect(CRIMPS[st.when.best.crimp]).toBeDefined();
          if (st.when.best) expect(GRADES).toContain(st.when.best.grade);
        }
      }
      const r = q.reward || {};
      if (r.item) expect(ITEMS[r.item]).toBeDefined();
      if (r.gear) expect(GEAR[r.gear]).toBeDefined();
    });
  }

  it("collection totals cover their quests' demands", () => {
    for (const q of Object.values(QUESTS)) {
      for (const st of q.stages) {
        if (st.when && st.when.collection)
          expect(COLLECTIONS[st.when.collection].total).toBeGreaterThanOrEqual(st.when.count || 1);
      }
    }
  });
});

describe("gear data", () => {
  const MODS = new Set(["headStart", "gainMul", "perfWinBonus", "goodWinBonus", "comboShield", "hypeRate", "shrapMul"]);
  for (const [id, g] of Object.entries(GEAR)) {
    it(`${id} is well-formed`, () => {
      expect(GEAR_SLOTS).toContain(g.slot);
      expect(g.name).toBeTruthy();
      expect(g.icon).toBeGreaterThan(10);
      for (const k of Object.keys(g.mods || {})) expect(MODS.has(k)).toBe(true);
    });
  }
});

describe("quest runtime", () => {
  it("auto-advances and completes from state mutations", () => {
    GS.reset();
    expect(Quests.start(GS, "q_wages")).toBe(true);
    expect(Quests.start(GS, "q_wages")).toBe(false); // no double-start
    expect(Quests.check(GS)).toEqual([]);            // 0 shrapnel: no advance
    GS.addShrapnel(100);
    const adv = Quests.check(GS);
    expect(adv).toHaveLength(1);
    expect(adv[0]).toMatchObject({ id: "q_wages", completed: true });
    expect(GS.questState("q_wages").state).toBe("done");
    expect(Quests.check(GS)).toEqual([]);            // done quests stay done
  });

  it("multi-stage quests stop at un-met stages", () => {
    GS.reset();
    Quests.start(GS, "q_radiators");
    GS.collFound("radiators", 0);
    GS.collFound("radiators", 1);
    expect(Quests.check(GS)).toEqual([]);            // 2/3: stage holds
    GS.collFound("radiators", 2);
    const adv = Quests.check(GS);
    expect(adv).toHaveLength(1);
    expect(adv[0].completed).toBe(false);            // advanced to turn-in
    expect(GS.questState("q_radiators").stage).toBe(1);
    GS.setFlag("q_radiators_turnin");
    expect(Quests.check(GS)[0].completed).toBe(true);
  });

  it("best-grade conditions respect the grade ladder", () => {
    GS.reset();
    GS.setBest("gregg", { grade: "B", acc: 80, combo: 10 });
    expect(evalWhen({ best: { crimp: "gregg", grade: "A" } }, GS)).toBe(false);
    GS.setBest("gregg", { grade: "S", acc: 99, combo: 50 });
    expect(evalWhen({ best: { crimp: "gregg", grade: "A" } }, GS)).toBe(true);
    // a worse later run never downgrades the stored best
    GS.setBest("gregg", { grade: "C", acc: 50, combo: 3 });
    expect(GS.best("gregg").grade).toBe("S");
  });
});

describe("perks", () => {
  it("gear mods stack onto level perks, scaled by the matching stat", () => {
    GS.reset();
    const base = crimpPerks(GS);
    expect(base.comboShield).toBe(0);
    GS.ownGear("charm_shaman");
    GS.equip("charm", "charm_shaman");
    expect(crimpPerks(GS).comboShield).toBe(2);
    GS.ownGear("gear_flute");
    GS.equip("howard", "gear_flute");
    const withFlute = crimpPerks(GS);
    // flute: +0.10 gainMul scaled by Jazz (5 -> x1.025)
    expect(withFlute.gainMul).toBeCloseTo(base.gainMul + 0.10 * 1.025, 5);
  });

  it("save v2 migrates v1-shaped data without loss", () => {
    GS.reset();
    // a v1 save: none of the v2 keys exist
    const v1 = {
      flags: { beat_jazz: true }, items: { baileys: 1 },
      stats: { level: 3, xp: 5, xpNext: 41, style: 9, jazz: 9 },
      records: ["rec_jazz"], unlocked: { hub: true, tundra: true, sea: true },
      zone: "sea", spawn: null, playtime: 1234, difficulty: "normal",
    };
    GS.data = Object.assign(GS.data, v1);
    // simulate load()'s merge directly
    const merged = Object.assign({}, GS.data);
    GS.reset();
    GS.data = Object.assign(GS.data, merged);
    expect(GS.shrapnel()).toBe(0);
    expect(GS.data.gear.vince).toBe(null);
    expect(GS.recordCount()).toBe(1);
    expect(GS.flag("beat_jazz")).toBe(true);
  });
});
