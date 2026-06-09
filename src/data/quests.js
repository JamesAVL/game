// @ts-check
// quests.js — multi-step quest chains (pure data). Steps are tracked in
// GS.data.quests (questId -> highest step reached); step text is what the
// pause menu shows while the step is active. The final step marks completion.
export const QUESTS = {
  banana: {
    name: "Bollo's Banana",
    done: 3,
    steps: {
      1: "Find Bollo's banana. Howard might sense it in the Forest of Bins.",
      2: "Return the banana to Bollo at the Zooniverse.",
      3: "Bollo has his banana back. All is right with the world.",
    },
  },
};
