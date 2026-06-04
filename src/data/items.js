// items.js — inventory item metadata + icon columns (items.png) and prop
// sprite columns (props.png). Icon/prop order is the contract with
// tools/gen_items.py and tools/gen_props.py.

export const ITEM_INDEX = {
  baileys: 0,
  polo: 1,
  hat: 2,
  banana: 3,
  mirror: 4,
  record: 5,
  jazzcig: 6,
  bin: 7,
  key: 8,
  cream: 9,
  // per-zone collectibles all share the "crimp note" icon (column 10)
  note_tundra: 10, note_sea: 10, note_forest: 10, note_night: 10, note_moon: 10, note_temple: 10,
};

// columns in assets/sprites/props.png (16x24 frames)
export const PROP_INDEX = {
  bin: 0, snowmound: 1, shell: 2, urn: 3, bush: 4, crate: 5, rock: 6,
  switch_up: 7, switch_down: 8, gate_closed: 9, gate_open: 10, chest: 11,
};

const NOTE = { name: "Crimp Note", desc: "A shimmering fragment of pure crimp. Collect them to power up." };

export const ITEMS = {
  baileys: { name: "Bailey's", desc: "From the off-licence. Smooth. Creamy. Watery." },
  polo: { name: "Polo Mint", desc: "The mint with the hole. The Hitcher wants these." },
  hat: { name: "Naboo's Hat", desc: "A shaman's pointed hat. Faintly magical." },
  banana: { name: "Bollo's Banana", desc: "Bollo has a bad feeling about giving this up." },
  mirror: { name: "Tiny Mirror", desc: "For checking the hair. Vince's most prized tool." },
  record: { name: "Crimp Record", desc: "A shimmering disc of pure crimp." },
  jazzcig: { name: "Jazz Cigarette", desc: "Howard insists it is purely for the trumpet tone." },
  bin: { name: "Shiny Bin Lid", desc: "One man's rubbish is the Crack Fox's treasure." },
  key: { name: "Ornate Key", desc: "Opens something it really shouldn't." },
  cream: { name: "Funk Cream", desc: "Spread it on toast. Or your soul." },
  note_tundra: NOTE, note_sea: NOTE, note_forest: NOTE, note_night: NOTE, note_moon: NOTE, note_temple: NOTE,
};
