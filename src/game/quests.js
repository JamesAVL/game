// quests.js — the quest runtime. Zero polling: overworld's api() mutators
// (give/take/setFlag/addRecord/...) call Quests.check after every state
// change; any active stage whose `when` now holds advances, completed quests
// pay their reward, and the caller toasts the journal updates.

import { QUESTS, evalWhen } from "../data/quests.js";

export const Quests = {
  start(gs, id) {
    if (!QUESTS[id] || gs.questState(id)) return false;
    gs.startQuest(id);
    return true;
  },

  // Re-evaluate every active quest's current stage. Returns a list of
  // advances: { id, name, completed, goalText } — one per stage crossed.
  check(gs) {
    const out = [];
    for (const id of Object.keys(gs.data.quests)) {
      const q = QUESTS[id];
      const st = gs.data.quests[id];
      if (!q || st.state !== "active") continue;
      let guard = 0;
      while (st.stage < q.stages.length && evalWhen(q.stages[st.stage].when, gs) && guard++ < 16) {
        st.stage++;
        if (st.stage >= q.stages.length) {
          st.state = "done";
          out.push({ id, name: q.name, completed: true });
        } else {
          out.push({ id, name: q.name, completed: false, goalText: q.stages[st.stage].goal });
        }
      }
    }
    return out;
  },

  active(gs) {
    return Object.keys(gs.data.quests)
      .filter((id) => QUESTS[id] && gs.data.quests[id].state === "active")
      .map((id) => ({ id, q: QUESTS[id], stage: gs.data.quests[id].stage }));
  },

  completed(gs) {
    return Object.keys(gs.data.quests)
      .filter((id) => QUESTS[id] && gs.data.quests[id].state === "done")
      .map((id) => ({ id, q: QUESTS[id] }));
  },
};
