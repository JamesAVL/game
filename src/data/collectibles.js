// collectibles.js — themed collectible sets, one per world (placed as
// {type:"collectible", set, idx} entities, mostly in secrets and pockets).
// Completing a set pays out via the quest engine's `collection` conditions.
// `icon` indexes assets/items/items.png (contract w/ gen_items.py).

export const COLLECTIONS = {
  radiators: {
    name: "Celebrity Radiators", icon: 18, total: 3,
    desc: "Naboo's hottest stock. Each one signed. Allegedly.",
  },
  jazzrecs: {
    name: "Howard's Jazz Rares", icon: 19, total: 4,
    desc: "Fusion. Don't fight it, sir.",
  },
  shinies: {
    name: "Shiny Things", icon: 20, total: 4,
    desc: "The Crack Fox's idea of a pension.",
  },
  tufts: {
    name: "Yeti Tufts", icon: 21, total: 4,
    desc: "Shed by the Grand Yeti. Smells of moss and legend.",
  },
};
