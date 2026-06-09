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

// stage: the layered parallax backdrop behind the boss. `bands` are sinuous
// silhouette planes (back -> front) that drift at different speeds and swell
// with the beat; `motes` are drifting front-plane specks. Drawn by crimp.js.
function stage(c0, c1, c2, o = {}) {
  return {
    bands: [
      { color: c0, y: o.y0 || 0.50, amp: o.amp ? o.amp * 0.6 : 6, freq: o.freq ? o.freq * 0.7 : 0.8, speed: 2.5 },
      { color: c1, y: o.y1 || 0.64, amp: o.amp || 10, freq: o.freq || 1.3, speed: 6 },
      { color: c2, y: o.y2 || 0.78, amp: o.amp ? o.amp * 1.4 : 14, freq: o.freq ? o.freq * 1.5 : 2.0, speed: 12 },
    ],
    motes: o.motes,
  };
}

function crimp(o) {
  const notes = makeChart(o.chart);
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
    stage: o.stage,
    notes,
    lyrics: lyrics(o.lyrics, beats),
  };
}

export const CRIMPS = {
  tutorial: crimp({
    name: "Naboo", face: "naboo", trackKey: "crimp_tutorial", bpm: 116,
    bg0: "#1a2040", bg1: "#3a2a6a", bossScale: 2,
    intro: "Just feel the rhythm, you berks...",
    stage: stage("#2a3060", "#222a52", "#1a2244", { motes: { color: "#bfa8ff", n: 12, rise: true, alpha: 0.5 } }),
    chart: { seed: 7, length: 96, base: 4, runChance: 0, doubleChance: 0 },
    lyrics: ["Come with me", "on a journey", "through the crimp", "feel the funk", "and let it flow", "nice one"],
  }),

  jazz: crimp({
    name: "Spirit of Jazz", face: "boss_jazz", trackKey: "crimp_jazz", bpm: 128,
    bg0: "#2a1010", bg1: "#5a2a10", bossScale: 2,
    intro: "I'm the Spirit of Jazz, baby!",
    stage: stage("#4a2014", "#3a180e", "#2a1008", { freq: 1.6, motes: { color: "#ffb15a", n: 16, rise: true, alpha: 0.6 } }),
    chart: { seed: 21, length: 180, base: 3, runChance: 0.10, doubleChance: 0.04 },
    lyrics: ["I'm the spirit of jazz", "be-bop a doo-wop", "smoky little man", "playin' all the wrong notes", "Howard loves me so",
      "scattin' in the cold", "blow your little trumpet", "freezin' to the bone", "jazz it up now", "yeah yeah yeah"],
  }),

  gregg: crimp({
    name: "Old Gregg", face: "boss_gregg", trackKey: "crimp_gregg", bpm: 112,
    bg0: "#06202a", bg1: "#0a4a4a", bossScale: 2,
    intro: "Do you love me?",
    stage: stage("#0c3a44", "#08303a", "#06262e", { amp: 16, freq: 2.2, motes: { color: "#bfeaff", n: 20, rise: true, alpha: 0.55 } }),
    chart: { seed: 44, length: 170, base: 3, runChance: 0.10, doubleChance: 0.05 },
    lyrics: ["I'm Old Gregg!", "do you love me?", "I gotta mangina", "make an album with me", "drink your Bailey's",
      "from a shoe", "downstairs mix-up", "love games down here", "the funk lives in me", "you'll love me too"],
  }),

  crackfox: crimp({
    name: "The Crack Fox", face: "boss_crackfox", trackKey: "crimp_crackfox", bpm: 132,
    bg0: "#161008", bg1: "#3a2a12", bossScale: 2,
    intro: "Heeere come the Crack Fox!",
    stage: stage("#3a2c14", "#2e2210", "#22180a", { freq: 2.6, amp: 8, motes: { color: "#a8b85a", n: 14, rise: false, alpha: 0.5 } }),
    chart: { seed: 88, length: 210, base: 2, runChance: 0.16, doubleChance: 0.06 },
    lyrics: ["scuttle in the bins", "shiny shiny things", "rusty little kettle", "my best friend", "feed me feed me",
      " messy little fox", "jumpin' on the bags", "got the fizzy in me", "faster faster now", "wheee", "can't catch me", "crack crack crack"],
  }),

  nana: crimp({
    name: "Nanageddon", face: "boss_nana", trackKey: "crimp_nana", bpm: 120,
    bg0: "#100620", bg1: "#2a0a3a", bossScale: 2,
    intro: "Naaaaaanageddon!",
    stage: stage("#341050", "#2a0a42", "#1e0632", { freq: 3.0, amp: 12, motes: { color: "#ffd86a", n: 12, rise: true, alpha: 0.6 } }),
    chart: { seed: 131, length: 190, base: 3, runChance: 0.13, doubleChance: 0.06 },
    lyrics: ["raised from the nightosphere", "demon nana risen", "all dark and shadow", "candles on the floor",
      "wrong incantation", "now she's here for tea", "biscuits of the damned", "send her back below", "crimp her down", "begone foul gran"],
  }),

  moon: crimp({
    name: "The Moon", face: "boss_moon", trackKey: "crimp_moon", bpm: 92,
    bg0: "#0a0a28", bg1: "#1a1a48", bossScale: 2,
    intro: "Hello. I'm the moon. Do do dooo.",
    stage: stage("#1c2050", "#161a42", "#101434", { freq: 0.6, amp: 7, motes: { color: "#fff6c0", n: 22, rise: false, alpha: 0.7 } }),
    chart: { seed: 200, length: 150, base: 4, runChance: 0.04, doubleChance: 0.02 },
    lyrics: ["I'm the moon", "the big white face", "made of milk they say", "lookin' down on you", "do do do",
      "little jelly man", "talkin' to myself", "lonely up so high", "nice and dreamy", "goodnight"],
  }),

  tony: crimp({
    name: "Tony Harrison", face: "boss_tony", trackKey: "crimp_tony", bpm: 138,
    bg0: "#1a0626", bg1: "#3a0a4a", bossScale: 2,
    intro: "This is an OUTRAGE!",
    stage: stage("#52104a", "#42083a", "#30062a", { freq: 2.4, amp: 14, motes: { color: "#ff7ad8", n: 18, rise: true, alpha: 0.65 } }),
    chart: { seed: 333, length: 240, base: 2, runChance: 0.16, doubleChance: 0.08 },
    lyrics: ["this is an OUTRAGE", "I'm Tony Harrison", "a pink old cephalopod", "the board of shaman", "Saboo and Kirk",
      "you cannot crimp like me", "the wind! the wind!", "an absolute disgrace", "feel my tentacle wrath", "the funk is mine",
      "out-crimp the council", "this is a circus", "an OUTRAGE I say", "the crimp of legends"],
  }),
};
