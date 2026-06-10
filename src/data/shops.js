// shops.js — shop stock lists. `gear` entries sell once (owned check);
// `item` entries restock forever. `require` gates stock on story flags.

export const SHOPS = {
  nabootique: {
    name: "The Nabootique",
    keeper: "Naboo",
    blurb: "Don't lick the stock.",
    stock: [
      { gear: "outfit_goth" },
      { gear: "outfit_mirrorball" },
      { gear: "gear_trumpet" },
      { gear: "charm_shaman", require: { flag: "beat_nana" } },
      { item: "baileys", price: 25 },
      { item: "polo", price: 10 },
    ],
    sellRate: 0.5,
  },
};
