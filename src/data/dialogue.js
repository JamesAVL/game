// dialogue.js — all conversation scripts. Each entry is a function(api) that
// returns either an array of pages or { pages, onDone }. `api` exposes the
// game state helpers (flags, items, xp, unlocks, startCrimp, toast, say...).
// Pages: { speaker, text } or { choice, options:[{label,next,act}] }.

const V = (text) => ({ speaker: "Vince", text });
const H = (text) => ({ speaker: "Howard", text });
const N = (text) => ({ speaker: "Naboo", text });
const B = (text) => ({ speaker: "Bollo", text });
const F = (text) => ({ speaker: "Fossil", text });
const NAR = (text) => ({ speaker: "", text });

export const DIALOG = {
  // ---- intro narration (new game) ---------------------------------------
  intro: (api) => ({
    pages: [
      NAR("Come with us now on a journey through time and space..."),
      NAR("...to the world of The Mighty Boosh."),
      N("Oi. Vince. Howard. Wake up, you berks."),
      V("Alright Naboo? I was having the best dream. I had even bigger hair."),
      H("What's going on, Naboo? It's the middle of the night."),
      N("Something terrible's happened. The power of CRIMP has been scattered across the Zooniverse."),
      N("Six Crimp Records, nicked and hidden in six mad little worlds."),
      V("Crimp? As in our beautiful improvised harmony songs?"),
      N("Exactly. Without them the whole place goes flat. Lifeless. No funk."),
      H("So what do we do, little man?"),
      N("You two travel to each world, out-crimp whoever's guarding the record, and bring it home."),
      N("I've opened the first portal for you. The Frozen Tundra. Off you pop."),
      V("A crimping quest! This is going to be brilliant."),
    ],
    onDone: () => { api.unlock("tundra"); api.setFlag("intro_done"); },
  }),

  // ---- hub NPCs ----------------------------------------------------------
  naboo: (api) => {
    let practice = false;
    const done = api.recordCount();
    const pages = [
      N("Alright. " + (done === 0 ? "First record's out in the Tundra." : "You've got " + done + " of the 6 records.")),
      N("Step into a glowing portal to travel. Sealed ones open as you win records."),
    ];
    if (done >= 6) pages.push(N("You did it. The Zooniverse is funky again. Nice one, you absolute legends."));
    pages.push({
      choice: "Want a quick crimp to practice? No pressure.",
      options: [
        { label: "Go on then", act: () => { practice = true; } },
        { label: "Maybe later" },
      ],
    });
    return { pages, onDone: () => { if (practice) api.startCrimp("tutorial", (win) => { if (win) { api.addXp(6); api.say([N("Smooth. You're a natural. Off you go.")]); } else api.say([N("Bit rusty. Have another go whenever.")]); }); } };
  },

  bollo: (api) => [
    B("..."),
    B("Bollo got a bad feeling about this quest."),
    V("Bollo, you always have a bad feeling. Last week you had a bad feeling about a sandwich."),
    B("...the sandwich tried something. Bollo was right about the sandwich."),
    H("Any words of wisdom for our journey, Bollo?"),
    B("Keep the beat. Hit the notes. And nobody touch Bollo's banana."),
  ],

  fossil: (api) => [
    F("Hello ladies! Bob Fossil, head zookeeper, at your service!"),
    F("I run a TIGHT ship here at the Zooniverse. Mostly by shouting at the animals."),
    V("Bob, do you even know what a crimp is?"),
    F("Course I do! It's the... the thing... with the... the hair? Is it the hair, Howard?"),
    H("It is absolutely not the hair."),
    F("LOOK just go and do your singing thing and make the place nice again. GO ON. SHOO."),
  ],

  // ---- world entry banter ------------------------------------------------
  tundra_enter: (api) => [
    V("Brrr! It's a proper winter wonderland. My hair's gone all static."),
    H("Stay close, Vince. Somewhere out here is a record. And probably death."),
  ],
  sea_enter: (api) => [
    V("We're under the sea! Look at all the bubbles, Howard."),
    H("I can't swim, Vince. I can barely stand near a pond. Let's be quick."),
  ],
  forest_enter: (api) => [
    H("Smell that? Damp leaves, bins, and bad decisions. The forest."),
    V("Something shiny's twitching in the bushes. Keep your wits, Howard."),
  ],
  night_enter: (api) => [
    V("Whoa. The Nightosphere. It's all embers and dread out here."),
    H("Naboo raised a demon. Of course he did. Let's send it home."),
  ],
  moon_enter: (api) => [
    V("We're on the actual MOON. This is the best quest ever."),
    H("It's so quiet up here. Peaceful, even. ...Is the moon humming?"),
  ],
  temple_enter: (api) => [
    H("Xooberon Temple. End of the line. The Board of Shaman await."),
    V("One more crimp-off, Howard. Then we're legends. Let's go."),
  ],

  // ---- tundra ------------------------------------------------------------
  tundra_explorer: (api) => [
    F("I-it's f-f-freezing! Bob Fossil does NOT do cold! My moustache has icicles!"),
    H("Brrr. This wind goes right through you. Proper Arctic, this."),
    V("Howard, you're scared of the tundra, the sea, AND bins."),
    H("I am a man of action, Vince. I am simply RESPECTING the danger."),
    F("There's a little jazzy fella up ahead. Made of smoke. Gave me the willies. GO ON, sort him out!"),
  ],
  got_jazzcig: (api) => [H("A jazz cigarette! Purely for the trumpet tone, you understand. The TONE.")],

  jazz_pre: (api) => [
    { speaker: "Jazz", text: "Weeeell well well. Two little men in the cold." },
    { speaker: "Jazz", text: "I'm the Spirit of Jazz, baby! Smoky, scatty, and I got your record." },
    H("That's... that's the Spirit of Jazz. He's a legend, Vince. A LEGEND."),
    { speaker: "Jazz", text: "You want it back? Then out-crimp me. Be-bop-a-doo-wop, here we GO!" },
  ],
  jazz_win: (api) => [
    { speaker: "Jazz", text: "Daddy-o... you got the funk. Take the record. I gotta go be cool somewhere else." },
    H("We out-crimped the Spirit of Jazz. This is the greatest day of my life."),
    V("A new portal's opened back home. Onward!"),
  ],
  jazz_lose: (api) => [{ speaker: "Jazz", text: "Ha! Too cold for ya? Come back when you've got the rhythm, baby." }],
  jazz_after: (api) => [{ speaker: "Jazz", text: "Hey hey, my favourite double act. Stay smooth." }],

  // ---- sea / Old Gregg ---------------------------------------------------
  sea_fossil: (api) => [
    F("Oh, it's you two. I'm hiding from a... a thing in the water. Don't tell anyone Bob Fossil hides."),
    F("It keeps asking if I love it. I DON'T KNOW HIM well enough yet!"),
    F("Word is it likes a creamy drink. Bring it a Bailey's and it might just calm down."),
  ],
  got_baileys: (api) => [V("Bailey's! From the off-licence of the deep. Creamy. Watery. Perfect.")],
  gregg_need: (api) => [
    { speaker: "Gregg", text: "Do you love me?!" },
    H("AH! What IS that?!"),
    { speaker: "Gregg", text: "I'm Old Gregg! I won't crimp with ya unless ya bring me a Bailey's. From a shoe, ideally." },
    V("We'd better find some Bailey's in this watery place first."),
  ],
  gregg_pre: (api) => ({
    pages: [
      { speaker: "Gregg", text: "Is that... a Bailey's? For Old Gregg?" },
      V("Here you go, Gregg. One creamy treat."),
      { speaker: "Gregg", text: "Awww. You DO love me. Now we crimp. About the funk. About my mangina. Mostly the funk." },
    ],
    onDone: () => api.take("baileys"),
  }),
  gregg_win: (api) => [
    { speaker: "Gregg", text: "You make Old Gregg feel things. Take the record, ya funky little man." },
    V("Lovely chap once you get past the... everything."),
  ],
  gregg_lose: (api) => [{ speaker: "Gregg", text: "You don't love me! Come back when ya feel the funk!" }],
  gregg_after: (api) => [{ speaker: "Gregg", text: "You're me best mate now. Want to see me downstairs mix-up? No? Okay." }],

  // ---- forest / Crack Fox ------------------------------------------------
  forest_naboo: (api) => [
    N("This forest is the Crack Fox's turf. Manky little thing. Lives in the bins."),
    N("He loves anything shiny. Find him a nice shiny bin lid and he'll crimp with ya."),
    N("Don't let him lick you. Trust me on that one."),
  ],
  got_bin: (api) => [V("A shiny bin lid! It's hideous. The Crack Fox is going to LOVE it.")],
  crackfox_need: (api) => [
    { speaker: "CrackFox", text: "Heeeere come the Crack Fox! Scuttle scuttle. You got somethin' shiny for me?" },
    H("He's twitching. Why is he twitching?"),
    { speaker: "CrackFox", text: "No shiny, no crimp! Bring the Crack Fox a shiny thing! Wheee!" },
  ],
  crackfox_pre: (api) => ({
    pages: [
      { speaker: "CrackFox", text: "Ooooh! Shiny shiny bin lid! For meeee?" },
      V("All yours, you horrible little fox. Now sing."),
      { speaker: "CrackFox", text: "Crack crack crack! Faster faster! Can't catch the Crack Fox! CRIMP!" },
    ],
    onDone: () => api.take("bin"),
  }),
  crackfox_win: (api) => [
    { speaker: "CrackFox", text: "You is fast. You is funky. Take the record, scuttle scuttle byeeee." },
    H("I need a wash. And a lie down. And possibly an exorcism."),
  ],
  crackfox_lose: (api) => [{ speaker: "CrackFox", text: "Too slow! The Crack Fox keeps his record! Wheeee!" }],
  crackfox_after: (api) => [{ speaker: "CrackFox", text: "Hello shiny friends! Got any more shiny? No? Scuttle." }],

  // ---- nightosphere / Nanageddon -----------------------------------------
  night_naboo: (api) => [
    N("Right. So. I MAY have read a spell off the wrong page and raised a demon nan."),
    N("Nanageddon. She's all teeth and cardigans. Out-crimp her and send her back below."),
    V("A demon nan. Of course. It's a Tuesday in the Boosh."),
  ],
  nana_pre: (api) => [
    { speaker: "Nana", text: "NAAAAANAGEDDON! Risen from the Nightosphere for a nice cup of tea and YOUR SOULS." },
    H("She's got the record on a little chain round her neck like reading glasses."),
    { speaker: "Nana", text: "Sit up straight and CRIMP, dearies, or it's the naughty step for eternity." },
  ],
  nana_win: (api) => [
    { speaker: "Nana", text: "Ooh, you cheeky monkeys out-crimped your nan. Back to the Nightosphere I pop. Toodle-oo." },
    V("Bye nan! Love the cardigan!"),
  ],
  nana_lose: (api) => [{ speaker: "Nana", text: "Tut tut. No record for naughty boys. Try again, dearies." }],
  nana_after: (api) => [{ speaker: "Nana", text: "Lovely to see you, dears. Mind the candles." }],

  // ---- the moon ----------------------------------------------------------
  moon_pre: (api) => [
    { speaker: "Moon", text: "Hellooo. I'm the moon. Do do dooo. I'm made of milk, they say." },
    V("It's just... a big chatty face up here. I love it."),
    { speaker: "Moon", text: "I been keepin' a shiny record up here for company. You want a crimp about it? Dreamy like." },
  ],
  moon_win: (api) => [
    { speaker: "Moon", text: "That was niiiice. Dreamy. Take the record, little jelly men. Do do dooo." },
    H("Strangely moving, that. I think the moon's my therapist now."),
  ],
  moon_lose: (api) => [{ speaker: "Moon", text: "Oh. We lost the rhythm. S'alright. Have another dream about it." }],
  moon_after: (api) => [{ speaker: "Moon", text: "Niiiight. Do do dooo." }],

  // ---- temple / Board of Shaman finale -----------------------------------
  temple_naboo: (api) => {
    const enough = api.recordCount() >= 5;
    const pages = [
      N("This is it. Xooberon Temple. The Board of Shaman are in there."),
      N("Tony Harrison's got the final record. Pink, eight tentacles, ENORMOUS opinions."),
    ];
    if (!enough) pages.push(N("You'll want the other five records first, mind. He's not a warm-up act."));
    else pages.push(N("You're ready. Go out-crimp the council and finish this. Make me proud, you berks."));
    return pages;
  },
  tony_pre: (api) => [
    { speaker: "Tony", text: "This is an OUTRAGE! Who let two little men into the Board of Shaman?!" },
    H("That's Tony Harrison. He's a... he's a pink octopus on a pedestal."),
    { speaker: "Tony", text: "I am a CEPHALOPOD, you ignorant man-child. And I hold the final Crimp Record." },
    V("Then we'll have to take it the only way that matters. A crimp-off."),
    { speaker: "Tony", text: "You? Out-crimp the council of Saboo and Kirk and ME? The WIND! The WIND! Very well. PREPARE." },
  ],
  tony_win: (api) => [
    { speaker: "Tony", text: "Impossible! Out-crimped! By the hairy one and the... the OTHER one! This is an OUTRAGE!" },
    N("...but a fair one. Take the record. The council bows to the funk."),
    V("That's all six! We did it, Howard!"),
    H("Come here, you magnificent idiot. We are the greatest crimpers in the Zooniverse."),
    NAR("The power of crimp floods back across the worlds. Somewhere, a moon hums a happy little tune."),
    NAR("THANK YOU FOR PLAYING - THE MIGHTY BOOSH: JOURNEY THROUGH THE ZOONIVERSE"),
  ],
  tony_lose: (api) => [{ speaker: "Tony", text: "HA! The council prevails! Begone and practice, you crimping amateurs!" }],
  tony_after: (api) => [{ speaker: "Tony", text: "The legendary crimpers return. It is... an acceptable surprise. The wind!" }],
};
