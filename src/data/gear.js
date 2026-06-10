// gear.js — outfits, instruments and charms. Three slots: vince / howard /
// charm. Mods feed game/perks.js (Vince mods scale with Style, Howard's with
// Jazz, charms are flat). Outfits also recolour the voxel rigs in 3D zones.
// `icon` indexes assets/items/items.png columns (contract w/ gen_items.py).

export const GEAR = {
  // ---- Vince's wardrobe (Style-scaled) -----------------------------------
  outfit_goth: {
    slot: "vince", name: "Goth Phase", icon: 12,
    desc: "Powered by the tears of Robert Smith.",
    mods: { headStart: 6 },
    price: 90,
  },
  outfit_mirrorball: {
    slot: "vince", name: "Mirrorball Suit", icon: 13,
    desc: "Pure glam. The crowd loves it.",
    mods: { hypeRate: 0.25, shrapMul: 0.10 },
    price: 160,
  },
  // ---- Howard's kit (Jazz-scaled) -----------------------------------------
  gear_trumpet: {
    slot: "howard", name: "Jazz Trumpet", icon: 14,
    desc: "Purely for the tone.",
    mods: { goodWinBonus: 0.02, perfWinBonus: 0.008 },
    price: 120,
  },
  gear_flute: {
    slot: "howard", name: "Bainbridge Flute", icon: 15,
    desc: "A man of action woodwind.",
    mods: { gainMul: 0.10 },
    price: 120,
  },
  // ---- Naboo's charms (flat; one equipped) ----------------------------------
  charm_shaman: {
    slot: "charm", name: "Naboo's Talisman", icon: 16,
    desc: "Board of Shamen approved. Forgives a fluff.",
    mods: { comboShield: 2 },
    price: 200,
  },
  charm_carpet: {
    slot: "charm", name: "Carpet Thread", icon: 17,
    desc: "A thread of magic carpet. Unlocks fast travel.",
    mods: {},
    grants: "fasttravel",
    price: 0, // quest reward, never stocked
  },
};

export const GEAR_SLOTS = ["vince", "howard", "charm"];
export const SLOT_LABEL = { vince: "Vince", howard: "Howard", charm: "Charm" };
