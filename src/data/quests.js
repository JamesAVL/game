// quests.js — the quest framework's data layer, in the zones/dialogue idiom:
// pure data, importable by tests, no DOM. A quest is stages; each stage has a
// `goal` (journal text) and either a `when` condition (auto-advanced by
// Quests.check whenever game state mutates) or no `when` (advanced explicitly
// from a dialogue act via api.quests.advance).
//
// `when` vocabulary — exactly one key per clause:
//   { flag: "name" }                         a story flag is set
//   { item: "id", count: n }                 holding >= n of an item
//   { collection: "setId", count: n }        found >= n of a collectible set
//   { best: { crimp: "id", grade: "A" } }    beaten a crimp at grade or better
//   { shrapnel: n }                          carrying >= n shrapnel
//
// reward: { shrapnel, xp, item, gear } — paid once on completion.

export const QUESTS = {
  q_radiators: {
    name: "Celebrity Radiators",
    giver: "Naboo", zone: "hub", kind: "collection",
    hook: "Naboo's hottest stock has gone walkabout.",
    stages: [
      { goal: "Find Naboo's 3 celebrity radiators (search the worlds)",
        when: { collection: "radiators", count: 3 } },
      { goal: "Bring them back to Naboo at the Nabootique",
        when: { flag: "q_radiators_turnin" } },
    ],
    reward: { shrapnel: 60, xp: 25, gear: "charm_carpet" },
  },
  q_jazzrares: {
    name: "Fusion Confusion",
    giver: "Howard", zone: "hub", kind: "collection",
    hook: "Howard's jazz rares were 'borrowed' by the worlds. Nobody confesses.",
    stages: [
      { goal: "Recover Howard's 4 jazz rares",
        when: { collection: "jazzrecs", count: 4 } },
    ],
    reward: { shrapnel: 50, xp: 20, gear: "gear_flute" },
  },
  q_potion_apprentice: {
    name: "Shaman's Apprentice",
    giver: "Naboo", zone: "nabootique", kind: "minigame",
    hook: "Naboo needs a potion stirred. It is mostly memory and vibes.",
    stages: [
      { goal: "Mix a potion in Naboo's back room (reach round 5)",
        when: { flag: "mg_potion_r5" } },
    ],
    reward: { shrapnel: 40, xp: 15 },
  },
  q_gregg_encore: {
    name: "Album Feedback, Again",
    giver: "Old Gregg", zone: "sea", kind: "crimp",
    hook: "Gregg wants PROOF you love the album. Grade A proof.",
    stages: [
      { goal: "Out-crimp Old Gregg with grade A or better",
        when: { best: { crimp: "gregg", grade: "A" } } },
    ],
    reward: { shrapnel: 80, item: "baileys" },
  },
  q_fox_shinies: {
    name: "The Shiny Economy",
    giver: "Crack Fox", zone: "forest", kind: "collection",
    hook: "The Crack Fox is going legitimate. He requires start-up shinies.",
    stages: [
      { goal: "Collect 4 Shiny Things for the Crack Fox",
        when: { collection: "shinies", count: 4 } },
      { goal: "Deliver the shinies in the Forest of Bins",
        when: { flag: "q_shinies_turnin" } },
    ],
    reward: { shrapnel: 70, xp: 25 },
  },
  q_wages: {
    name: "Back Wages",
    giver: "Naboo", zone: "nabootique", kind: "fetch",
    hook: "Naboo will pay your wages 'when the till works'. Save up anyway.",
    stages: [
      { goal: "Scrape together 100 shrapnel",
        when: { shrapnel: 100 } },
    ],
    reward: { xp: 30 },
  },
};

// ---------------------------------------------------------------------------
// pure condition evaluator — shared by the runtime and the album/achievements
// ---------------------------------------------------------------------------
import { GRADES } from "../game/state.js";

export function evalWhen(when, gs) {
  if (!when) return false;
  if (when.flag) return !!gs.data.flags[when.flag];
  if (when.item) return (gs.data.items[when.item] || 0) >= (when.count || 1);
  if (when.collection)
    return Object.keys(gs.data.collections[when.collection] || {}).length >= (when.count || 1);
  if (when.best) {
    const b = gs.data.bests[when.best.crimp];
    if (!b) return false;
    if (when.best.tier && (b.tier || 0) < when.best.tier) return false;
    return GRADES.indexOf(b.grade) <= GRADES.indexOf(when.best.grade || "C");
  }
  if (when.shrapnel) return (gs.data.shrapnel || 0) >= when.shrapnel;
  return false;
}
