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

  bollo: (api) => {
    // quest chain: Bollo's Banana (steps tracked in GS.data.quests.banana)
    if (api.quest("banana") >= 3) return [
      B("Bollo's banana is home. Bollo is at peace."),
      V("It's just a banana, Bollo."),
      B("...it is never just a banana."),
    ];
    if (api.has("banana")) return {
      pages: [
        B("!!! Bollo's banana! You found it!"),
        H("It was buried under the bins. It's gone a bit... jazzy."),
        B("Bollo never forget this. Bollo owe you big."),
      ],
      onDone: () => { api.take("banana"); api.setQuest("banana", 3); api.addXp(30); api.toast("Quest complete: Bollo's Banana!"); },
    };
    if (api.quest("banana") >= 1) return [
      B("Banana still missing. Bollo checked the Forest of Bins twice."),
      B("Howard should lead the way out there. Howard... senses things. Jazz things."),
    ];
    return {
      pages: [
        B("..."),
        B("Bollo got a bad feeling about this quest."),
        V("Bollo, you always have a bad feeling. Last week you had a bad feeling about a sandwich."),
        B("...the sandwich tried something. Bollo was right about the sandwich."),
        H("Any words of wisdom for our journey, Bollo?"),
        B("Keep the beat. Hit the notes. And... Bollo's banana is GONE. Stolen. Probably in the Forest of Bins."),
        B("Find it and Bollo make it worth your while. Let Howard lead - his jazz nose will sniff it out."),
      ],
      onDone: () => { api.setQuest("banana", 1); api.toast("New quest: Bollo's Banana"); },
    };
  },

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
  gregg_require: (api) => [
    { speaker: "Gregg", text: "Old Gregg don't crimp dry. Bring Old Gregg his Bailey's first." },
    H("Bailey's... I'm sure I saw a bottle buried in a snowmound back in the Tundra."),
  ],
  gregg_pre: (api) => [
    { speaker: "Gregg", text: "You found all me Crimp Notes! You DO love me!" },
    V("We've got the notes, Gregg. Time to crimp."),
    { speaker: "Gregg", text: "Now we crimp. About the funk. About my mangina. Mostly the funk." },
  ],
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
  crackfox_require: (api) => [
    { speaker: "CrackFox", text: "No shiny, no crimpy! Bring the Crack Fox somethin' SHINY first!" },
    V("Shiny... there was a gleaming bin lid washed up somewhere in Gregg's sea."),
  ],
  crackfox_pre: (api) => [
    { speaker: "CrackFox", text: "Ooooh! Three shiny shiny notes! For meeee?" },
    V("They're ours, you horrible little fox. Now sing."),
    { speaker: "CrackFox", text: "Crack crack crack! Faster faster! Can't catch the Crack Fox! CRIMP!" },
  ],
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

  // ---- hub flavour searches ---------------------------------------------
  hub_search1: (api) => [V("A crate of Naboo's 'special' incense. Smells of liquorice and regret."), H("Don't light that near the trumpet, Vince.")],
  hub_search2: (api) => [H("A Zooniverse bin. Bob Fossil's lunch is in here. And his diary."), V("'Dear diary, today I shouted at a heron.' ...riveting stuff.")],

  // ---- jazz-trance secrets (revealed only when Howard leads) -------------
  hidden_tundra: (api) => [
    H("My jazz sense led us straight to it. A stash of warm memories. And 20 XP of pure funk."),
    V("You're like a sniffer dog for noodling, Howard."),
  ],
  hidden_forest: (api) => ({
    pages: [
      H("There. Buried under the bin bags. One banana, distinctly Bollo-shaped."),
      V("Bollo's banana! He's going to do that little shoulder dance."),
    ],
    onDone: () => { if (api.quest("banana") >= 1) api.setQuest("banana", 2); },
  }),
  hidden_moon: (api) => [
    H("A cache of moon-funk, hidden where only a man of jazz would think to look."),
    V("It hums, Howard. The rock is actually humming."),
  ],

  // ---- collectible hint (boss locked) -----------------------------------
  collect_tundra: (api) => [N("Three Crimp Notes are frozen out here. Gather all 3 before the Spirit of Jazz will crimp ya.")],
  collect_sea: (api) => [{ speaker: "Gregg", text: "No notes, no love! Find all 3 Crimp Notes first, ya creamy little men." }],
  collect_forest: (api) => [{ speaker: "CrackFox", text: "Shiny notes! Bring the Crack Fox all 3 shiny notes, then we crimp! Scuttle!" }],
  collect_night: (api) => [{ speaker: "Nana", text: "No tea and no crimp until you've collected all 3 notes, dearies. Chop chop." }],
  collect_moon: (api) => [{ speaker: "Moon", text: "Find me three little notes... then we'll have a dreamy old crimp. Do do dooo." }],
  collect_temple: (api) => [{ speaker: "Tony", text: "You dare approach with fewer than THREE notes?! An OUTRAGE! Gather them all!" }],

  // ---- chest containing Note C ------------------------------------------
  chest_tundra: (api) => [V("A Crimp Note, iced over in an old kit-bag. Shiny!")],
  chest_sea: (api) => [V("A Crimp Note, tucked inside a treasure chest. Bit damp, still funky.")],
  chest_forest: (api) => [V("A Crimp Note in a chest the Crack Fox forgot about. Result!")],
  chest_night: (api) => [V("A Crimp Note glowing inside a cursed little chest. Spooky AND shiny.")],
  chest_moon: (api) => [V("A Crimp Note floating in a moon-chest. It hums to itself.")],
  chest_temple: (api) => [V("A Crimp Note in an ancient reliquary. Tony's going to be furious.")],

  // ---- searchable scenery (lore + a little XP) --------------------------
  search1_tundra: (api) => [H("A frozen snow mound. ...There's a tiny igloo with a 'BACK IN 5 MINS' sign."), V("The tundra postman. Classic.")],
  search2_tundra: (api) => [V("A frosty rock shaped exactly like Howard's worried face."), H("It does not.")],
  search1_sea: (api) => [V("A giant shell. Put it to your ear..."), H("...it's just Old Gregg going 'do you love me' on a loop. Lovely.")],
  search2_sea: (api) => [H("A barnacled rock. Someone scratched 'GREGG WOZ ERE' into it. And a little mangina.")],
  search1_forest: (api) => [V("A bin overflowing with rubbish the Crack Fox calls 'treasure'."), H("A kettle, three odd shoes and... is that a Magnum?")],
  search2_forest: (api) => [V("A fern with a face. It blinks at you, slowly."), H("Everything in this forest has a face, Vince. Keep moving.")],
  search1_night: (api) => [H("A demonic urn, still warm. There's a price sticker: 'Nan's Best Casserole'.")],
  search2_night: (api) => [V("A jagged rock humming a minor chord. The Nightosphere's quite musical, actually.")],
  search1_moon: (api) => [V("A moon rock. It is, disappointingly, just a rock."), H("On the MOON though, Vince. Context.")],
  search2_moon: (api) => [H("An abandoned crate of moon-milk. Best before: the dawn of time.")],
  search1_temple: (api) => [N("A shaman urn. Inscribed: 'Saboo woz robbed at the crimp-off, 2006.'")],
  search2_temple: (api) => [V("A dusty crate of ceremonial capes. Ooh, this one's got tassels!"), H("Focus, Vince.")],

  // ---- third searchable per zone (extra flavour + XP) -------------------
  search3_tundra: (api) => [V("A snowman built to look exactly like you, Howard. Worried little face and all."), H("...who keeps DOING this?"), V("It's even got a tiny moustache made of twigs. Art.")],
  search3_sea: (api) => [H("A bottle with a note inside. It just says 'DO YOU LOVE ME' in wet biro, four hundred times."), V("He's persistent, you've got to give him that.")],
  search3_forest: (api) => [V("The Crack Fox's shrine: a throne of bin lids and one very smug-looking shoe."), H("He's crowned the shoe, Vince. The shoe is the king.")],
  search3_night: (api) => [H("A demonic knitting basket. Half-finished cardigan. Pattern reads: 'ETERNAL TORMENT (medium)'."), V("She drops a stitch and a soul in the same row. Efficient.")],
  search3_moon: (api) => [V("The Moon's private diary. Page one: 'do do dooo'. Page two: 'do do dooo'. It's all do do dooo."), H("Consistent voice, I'll give it that.")],
  search3_temple: (api) => [N("A shaman scoreboard. Tony Harrison's name is at the top, underlined eleven times, in glitter."), V("Someone's compensating.")],

  // ---- side-quest NPC per zone (one-time XP) ----------------------------
  side_tundra: (api) => {
    if (api.flag("sq_tundra")) return [F("Toasty now, ta! Bob Fossil salutes you!")];
    return { pages: [F("B-Bob Fossil's f-freezing! Do a little dance to warm me up? Go on!"), V("...we did a dance."), F("MARVELLOUS! Have some experience points, you beautiful creatures!")], onDone: () => { api.addXp(15); api.setFlag("sq_tundra"); } };
  },
  side_sea: (api) => {
    if (api.flag("sq_sea")) return [F("Still hiding. Don't tell the merman. Ta though!")];
    return { pages: [F("Pssst. Bob Fossil here. Tell Old Gregg I think his album's GREAT and I'll give ya a tip."), V("Done."), F("Knew it. Here's some hard-won zoo wisdom. *XP get*")], onDone: () => { api.addXp(18); api.setFlag("sq_sea"); } };
  },
  side_forest: (api) => {
    if (api.flag("sq_forest")) return [N("Cheers for the help. Mind the fox.")];
    return { pages: [N("Help me re-light these forest candles and I'll share a shaman trick."), V("Consider them lit."), N("Nice one. Have some XP, on the house.")], onDone: () => { api.addXp(22); api.setFlag("sq_forest"); } };
  },
  side_night: (api) => {
    if (api.flag("sq_night")) return [N("The nan's almost contained. Ta.")];
    return { pages: [N("Quick — chant the counter-spell with me. It's mostly 'oi, nan, behave'."), V("OI, NAN, BEHAVE!"), N("Perfect pitch. Take this XP for your trouble.")], onDone: () => { api.addXp(26); api.setFlag("sq_night"); } };
  },
  side_moon: (api) => {
    if (api.flag("sq_moon")) return [B("...Bollo still got a bad feeling. But thanks.")];
    return { pages: [B("Bollo followed you to the moon. Bollo does not like the moon's FACE."), V("It's a friendly face, Bollo."), B("...Bollo gives you XP so we can leave sooner.")], onDone: () => { api.addXp(30); api.setFlag("sq_moon"); } };
  },
  side_temple: (api) => {
    if (api.flag("sq_temple")) return [N("You're ready. Go show the council the funk.")];
    return { pages: [N("Limber up your crimping muscles with me before you face Tony."), H("Scales. Lovely. I do love a scale."), N("You're tuned. Take this XP and go make me proud.")], onDone: () => { api.addXp(34); api.setFlag("sq_temple"); } };
  },
};
