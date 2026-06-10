// crimps.js — definitions for every crimp-off (rhythm boss battle).
// Charts are generated deterministically so they feel musical without
// hand-placing every note; lyrics are spread evenly across the song.

// deterministic note chart: wanders across 4 lanes on a rhythmic grid
function makeChart({ seed = 1, length = 240, base = 2, runChance = 0.18, doubleChance = 0.08 }) {
  let s = seed >>> 0;
  const rnd = () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const notes = [];
  let lane = 0, step = 0;
  while (step < length) {
    notes.push([step, lane]);
    if (rnd() < doubleChance && step > 16) notes.push([step, (lane + 2) % 4]);
    lane = (lane + (rnd() < 0.5 ? 1 : 3)) % 4;
    let gap = base;
    const r = rnd();
    if (r < runChance) gap = 1;
    else if (r > 0.82) gap = base * 2;
    step += gap;
  }
  return notes;
}

function lyrics(lines, totalBeats) {
  const step = totalBeats / (lines.length + 1);
  return lines.map((t, i) => [Math.round(step * (i + 1)), t]);
}

// deterministic post-pass: convert notes with breathing room into HOLDS
// ([step, lane] -> [step, lane, holdSteps]). Counts never change, so the
// locked chart invariants survive; only the shape gains a third field.
export function addHolds(notes, seed = 1, chance = 0.18) {
  let s = (seed * 2654435761) >>> 0 || 1;
  const rnd = () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  return notes.map(([step, lane], i) => {
    const next = notes[i + 1];
    const gap = next ? next[0] - step : 8;
    if (gap >= 4 && rnd() < chance) return [step, lane, Math.min(gap - 1, 6)];
    return [step, lane];
  });
}

// deterministic mirror transform: from `fromStep` onward every lane flips
// left<->right (lane -> 3-lane). The Flighty Zeus crimp it backwards.
export function mirrorPass(notes, fromStep) {
  return notes.map(([step, lane, hold]) => {
    const l = step >= fromStep ? 3 - lane : lane;
    return hold ? [step, l, hold] : [step, l];
  });
}

// a rematch chart: same song, denser + reseeded. tier 1+ for remixes/NG+.
export function makeVariant(id, tier = 1) {
  const base = CRIMPS[id];
  if (!base || !base._chart) return base;
  const c = base._chart;
  const notes = makeChart({
    seed: c.seed + tier * 7919,
    length: c.length,
    base: Math.max(1, c.base - 1),
    runChance: Math.min(0.4, c.runChance + 0.06 * tier),
    doubleChance: Math.min(0.3, c.doubleChance + 0.04 * tier),
  });
  return { ...base, notes, tier, name: base.name + " (remix)", bpm: base.bpm + 8 * tier };
}

function crimp(o) {
  let notes = makeChart(o.chart);
  if (o.holds !== false) notes = addHolds(notes, o.chart.seed, o.holds || 0.16);
  if (o.mirror) notes = mirrorPass(notes, o.mirror);
  const lastStep = notes[notes.length - 1][0];
  const beats = lastStep / 4;
  return {
    name: o.name,
    face: o.face,
    trackKey: o.trackKey,
    bpm: o.bpm,
    bg0: o.bg0, bg1: o.bg1,
    bossScale: o.bossScale || 2,
    intro: o.intro || "",
    notes,
    lyrics: lyrics(o.lyrics, beats),
    _chart: o.chart,
  };
}

export const CRIMPS = {
  tutorial: crimp({
    name: "Naboo", face: "naboo", trackKey: "crimp_tutorial", bpm: 116,
    bg0: "#1a2040", bg1: "#3a2a6a", bossScale: 2,
    intro: "Just feel the rhythm, you berks...",
    chart: { seed: 7, length: 96, base: 4, runChance: 0, doubleChance: 0 },
    lyrics: ["Come with me", "on a journey", "through the crimp", "feel the funk", "and let it flow", "nice one"],
  }),

  yeti: crimp({
    name: "The Grand Yeti", face: "boss_yeti", trackKey: "crimp_yeti", bpm: 100,
    bg0: "#0e1c14", bg1: "#1e3a26", bossScale: 2,
    intro: "HhhrrRRMMM. (It means: crimp-off.)",
    chart: { seed: 404, length: 180, base: 4, runChance: 0.06, doubleChance: 0.14 },
    lyrics: ["we are the forest", "we are the fuzz", "bouncy bouncy", "moss in our minds", "sap in our veins",
      "the trees taught us this one", "bouncy bouncy", "fuzzy forever", "up the mountain", "good time, such a good time"],
  }),

  saboo: crimp({
    name: "Saboo & Kirk", face: "boss_saboo", trackKey: "crimp_saboo", bpm: 142,
    bg0: "#160a24", bg1: "#2c1444", bossScale: 2,
    intro: "You know NOTHING of the crunch.",
    chart: { seed: 999, length: 230, base: 2, runChance: 0.18, doubleChance: 0.08 },
    lyrics: ["behold the crunch", "you know nothing of the crunch", "I was robbed in oh-six", "the board remembers",
      "Kirk, do the thing", "(Kirk does the thing)", "ouija up the tempo", "your funk is provisional",
      "banished to the bin of sound", "the crunch! the crunch!"],
  }),

  zeus_final: crimp({
    name: "Flighty Zeus Ultimate", face: "boss_zeus", trackKey: "crimp_zeus_final", bpm: 148,
    bg0: "#241430", bg1: "#4a2a5a", bossScale: 2,
    intro: "Six records deep. We are the ENCORE.",
    chart: { seed: 1212, length: 260, base: 2, runChance: 0.20, doubleChance: 0.10 },
    mirror: 130, holds: 0.22,
    lyrics: ["the final reflection", "six records deep", "we are the encore", "you're the rehearsal",
      "give us the funk, boys", "it fits us better", "you've nicked my trousers", "you've nicked my JAZZ",
      "two worlds, one stage", "smash the glass", "crimp of legends", "no more mirrors"],
  }),

  hitcher: crimp({
    name: "The Hitcher", face: "boss_hitcher", trackKey: "crimp_hitcher", bpm: 134,
    bg0: "#0c120c", bg1: "#1e2c1a", bossScale: 2,
    intro: "Evenin'. Lovely night for an abduction.",
    chart: { seed: 666, length: 220, base: 2, runChance: 0.14, doubleChance: 0.05 },
    lyrics: ["evenin', little man", "I'm the cockney nightmare", "green as a gooseberry", "thumb like a skeleton key",
      "eels in the kettle", "eels in the post", "eels up the drainpipe", "want any? want any?",
      "polos for the eel man", "your mate's in the cellar", "London says goodnight", "oi oi", "eels eels eels"],
  }),

  zeus: crimp({
    name: "The Flighty Zeus", face: "boss_zeus", trackKey: "crimp_zeus", bpm: 126,
    bg0: "#1a2030", bg1: "#3a4464", bossScale: 2,
    intro: "We're you. But retail-ready.",
    chart: { seed: 515, length: 210, base: 2, runChance: 0.16, doubleChance: 0.06 },
    mirror: 105, // halfway through, every lane flips: they crimp it backwards
    lyrics: ["we're the Flighty Zeus", "better than the real thing", "mirror mirror men", "your haircut, but improved",
      "your banter, but managed", "we crimp it backwards", "left is right tonight", "two plastic boys",
      "shinier than you", "go on, catch your reflection", "we already did"],
  }),

  jazz: crimp({
    name: "Spirit of Jazz", face: "boss_jazz", trackKey: "crimp_jazz", bpm: 128,
    bg0: "#2a1010", bg1: "#5a2a10", bossScale: 2,
    intro: "I'm the Spirit of Jazz, baby!",
    chart: { seed: 21, length: 180, base: 3, runChance: 0.10, doubleChance: 0.04 },
    lyrics: ["I'm the spirit of jazz", "be-bop a doo-wop", "smoky little man", "playin' all the wrong notes", "Howard loves me so",
      "scattin' in the cold", "blow your little trumpet", "freezin' to the bone", "jazz it up now", "yeah yeah yeah"],
  }),

  gregg: crimp({
    name: "Old Gregg", face: "boss_gregg", trackKey: "crimp_gregg", bpm: 112,
    bg0: "#06202a", bg1: "#0a4a4a", bossScale: 2,
    intro: "Do you love me?",
    chart: { seed: 44, length: 170, base: 3, runChance: 0.10, doubleChance: 0.05 },
    lyrics: ["I'm Old Gregg!", "do you love me?", "I gotta mangina", "make an album with me", "drink your Bailey's",
      "from a shoe", "downstairs mix-up", "love games down here", "the funk lives in me", "you'll love me too"],
  }),

  crackfox: crimp({
    name: "The Crack Fox", face: "boss_crackfox", trackKey: "crimp_crackfox", bpm: 132,
    bg0: "#161008", bg1: "#3a2a12", bossScale: 2,
    intro: "Heeere come the Crack Fox!",
    chart: { seed: 88, length: 210, base: 2, runChance: 0.16, doubleChance: 0.06 },
    lyrics: ["scuttle in the bins", "shiny shiny things", "rusty little kettle", "my best friend", "feed me feed me",
      " messy little fox", "jumpin' on the bags", "got the fizzy in me", "faster faster now", "wheee", "can't catch me", "crack crack crack"],
  }),

  nana: crimp({
    name: "Nanageddon", face: "boss_nana", trackKey: "crimp_nana", bpm: 120,
    bg0: "#100620", bg1: "#2a0a3a", bossScale: 2,
    intro: "Naaaaaanageddon!",
    chart: { seed: 131, length: 190, base: 3, runChance: 0.13, doubleChance: 0.06 },
    lyrics: ["raised from the nightosphere", "demon nana risen", "all dark and shadow", "candles on the floor",
      "wrong incantation", "now she's here for tea", "biscuits of the damned", "send her back below", "crimp her down", "begone foul gran"],
  }),

  moon: crimp({
    name: "The Moon", face: "boss_moon", trackKey: "crimp_moon", bpm: 92,
    bg0: "#0a0a28", bg1: "#1a1a48", bossScale: 2,
    intro: "Hello. I'm the moon. Do do dooo.",
    chart: { seed: 200, length: 150, base: 4, runChance: 0.04, doubleChance: 0.02 },
    lyrics: ["I'm the moon", "the big white face", "made of milk they say", "lookin' down on you", "do do do",
      "little jelly man", "talkin' to myself", "lonely up so high", "nice and dreamy", "goodnight"],
  }),

  tony: crimp({
    name: "Tony Harrison", face: "boss_tony", trackKey: "crimp_tony", bpm: 138,
    bg0: "#1a0626", bg1: "#3a0a4a", bossScale: 2,
    intro: "This is an OUTRAGE!",
    chart: { seed: 333, length: 240, base: 2, runChance: 0.16, doubleChance: 0.08 },
    lyrics: ["this is an OUTRAGE", "I'm Tony Harrison", "a pink old cephalopod", "the board of shaman", "Saboo and Kirk",
      "you cannot crimp like me", "the wind! the wind!", "an absolute disgrace", "feel my tentacle wrath", "the funk is mine",
      "out-crimp the council", "this is a circus", "an OUTRAGE I say", "the crimp of legends"],
  }),
};

// tournament round 1: every beaten boss has a remix on the shelf (+8bpm,
// denser, reseeded) — the champion picks their own gauntlet.
for (const id of ["jazz", "gregg", "crackfox", "nana", "moon", "tony"]) {
  CRIMPS[id + "_remix"] = makeVariant(id, 1);
}
