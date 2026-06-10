# Architecture

**THE MIGHTY BOOSH: CRIMP OF LEGENDS** — a voxel-3D Boosh adventure in vanilla
ES modules. The sim is a from-scratch HTML5 engine (tile-grid collision,
text-map zones, fixed-timestep loop, internal 320×180×`ART` overlay); the
WORLD renders in true voxel 3D through **three.js** (the one runtime dep,
pinned exact — like Vite, it buys no content). Every mesh, texture and sound
remains 100% ours and procedural.

**The 3D bridge:** three.js adopts the SAME canvas + WebGL2 context that
`renderer.js` owns. A 3D scene renders to the backbuffer; `captureWorld()`
grabs it into an RGB8 texture (one GPU copy); every post pass composites the
2D overlay canvas (HUD/dialogue/menus) over that world layer — so 3D emissives
bloom, CRT warps the composite, and 2D-only scenes are pixel-identical to the
old path. No WebGL2 (or no model) ⇒ the classic 2D pixel-art path renders
instead, automatically. State discipline: `three.resetState()` before every
three render; renderer.js defensively resets GL state each present.

**Game structure:** an act-gated open world. The Zooniverse hub (+ Nabootique
interior) feeds 10 worlds; `overworld.checkActs()` opens them in waves (intro:
tundra/forest/yeti → 2 records: sea/night → 4 records: THE TWIST in the
Nabootique → eelpit (solo Vince) → mirror world → act 3: moon/temple/onion →
the tournament). Deep-gameplay layer: quests (`data/quests.js` `when`
conditions, zero-polling bump from the dialogue api), Shrapnel economy +
shop, gear/wardrobe with real crimp modifiers (`game/perks.js` is the ONE
source), crimp grades S–F driving payouts, collectible sets, a world clock
(1s = 1min; day/night in both render paths), NPC wander, secret `%` walls,
a map with carpet fast-travel, and the Potion minigame.

**Toolchain:** **Vite** + TypeScript (incremental, `allowJs`). Commands:
`npm run dev` (HMR), `npm run build` (→ `dist/`, runs `assets` + `validate`
via `prebuild`), `npm run preview`, `npm run typecheck`, `npm test` (Vitest).
Generated assets (PNGs + **GLB voxel models**) live in `assets/`, served at
`/assets/*` by the Vite plugin (dev; content-type by extension) and copied to
`dist/assets/` (build) — not in the module graph, MANIFEST paths stay
relative. Pages deploys `dist/`.

## Layout
```
index.html              # canvas + boot overlay
src/
  main.js               # boot: load assets -> Title scene -> start loop; __BOOSH debug
  engine/
    core.js             # config, canvas/scaling, input, asset loader (PNG+GLB), scene stack, loop
    renderer.js         # WebGL2 present + post-FX (bloom/grade/CRT) + 3D world capture/composite
    scene3d.js          # three.js on the SHARED context; renderWorld() + resetState boundary
    gltf.js             # GLB parse cache + instantiate() voxel rigs (one flat Lambert material)
    voxanim.js          # rig drivers: face/walk/idle/hop/dance on legL..head part nodes
    save.js             # localStorage persistence (DOM-free so state layer runs in vitest)
    particles.js        # pooled additive particles + global screen-shake (Juice)
    light.js            # 2D-path lighting (dark zones / night) — 3D path lights itself
    midi.js             # optional WebMIDI: a keyboard/pad plays the crimp lanes
    normalmap.js        # 2D-fallback boss lighting in the crimp
    gfx.js              # tinted bitmap-font text, sprite frames, camera, UI panels
    audio.js            # chiptune synth + sequencer + SFX + tone(); buses, limiter, analyser
    tilemap.js          # tile-layer render + collision (the sim's source of truth)
    touch.js            # native touch: floating joystick + tap + crimp lane taps
  game/
    state.js            # GS v2: flags, items, stats, records, shrapnel, quests, gear,
                        #   collections, bests, clock/day, visited; auto-migrating load()
    world.js            # text-map zone -> Tilemap + entities (when-filters, %-secrets)
    world3d.js          # WorldView3D: ground bake, tilekit chunks, rigs, portals, camera, sun
    player.js           # party: Vince leads, Howard follows (or is kidnapped: solo())
    overworld.js        # exploration sim: interaction, quests bump, acts, payouts, HUD
    clock.js            # world clock: phase + ambientFor (both render paths)
    quests.js / perks.js / shop.js / potion.js   # quest runtime, crimp modifiers, scenes
    dialogue.js         # typewriter dialogue + portraits + choice menus
    crimp.js            # the rhythm battle: grades, holds, hype, shields
    crimpstage.js       # the 3D stage: dancing voxel boss, orbiting spot, combo dolly
    menu.js / title.js  # pause menu (Journal/Map/Party/Items/Wardrobe) / title + intro
  data/
    zones.js            # all 12 zones (text grids + entities + acts), ZONE_LIGHT
    dialogue.js         # every script incl. the twist + tournament (functions of api)
    crimps.js           # charts (makeChart/addHolds/mirrorPass/makeVariant) + lyrics
    music.js            # all tracks (ambient + crimp) as note strings
    items.js / gear.js / quests.js / shops.js / collectibles.js / map.js
assets/                 # generated PNGs + models/*.glb (voxel rigs, tilekits, props)
tools/                  # Python generators: pnglib/artlib (2D), gltflib/voxlib (3D),
                        #   gen_* per family, gen_vox_* per model family, validate_zones
```

## Key contracts
- **Tile indices** are shared across all tilesets (see `LEGEND` in `world.js` and
  `gen_tiles.py`): 0 floor, 2 wall, 4 obstacle, 7 water, 9 accent, 11 feature;
  `%` renders as wall but walks like floor (secrets). Map chars `#/=/X/O/%`
  map to tilekit prototypes (`wall/wall_alt/feature/obstacle/wall`) in 3D.
- **Voxel world units**: 1 tile = 1.0 unit = 16 voxels; `world = (px/TILE, 0,
  py/TILE)`. Person rigs are six pivoted parts (`legL legR armL armR torso
  head`); GLB node translations ARE the pivots; `voxanim` drives them (facing
  = group yaw; model faces +Z = "down"). New-world recipe: a palette in
  `gen_tiles.py` (yields tileset PNG + tilekit GLB), a `makeWorld` cfg, a boss
  (portrait in `gen_bosses.py` + rig in `gen_vox_bosses.py`), a crimp + track,
  dialogue, MANIFEST keys.
- **Character sheets** are 16×24 frames, rows = [down,up,left,right], 4 walk
  cols (2D fallback + portraits; one GLB rig replaces all 16 frames in 3D).
- **Font atlas** (`gen_font.py` ↔ `gfx.js`): ASCII 32–126, 16-wide grid, 6×8 cells.
- **Zones** are authored as text-map rows built with `blank/rect/scatter` helpers;
  entities accept `when:{phase|flag|minRecords}` (evaluated on entry) and
  `wander:r` (non-blocking strolls). `tools/validate_zones.mjs` guards
  reachability — run it after ANY zone edit.
- **Crimp charts** are deterministic from a seed; `addHolds` (a post-pass that
  preserves note counts), `mirrorPass` (lane-flip from a step), `makeVariant`
  (reseeded +8bpm remixes, registered as `CRIMPS.*_remix`). Grades S/A/B/C/F →
  Shrapnel via `PAYOUT × zone tier × perks.shrapMul` (repeats ×0.25).
- **Quests** (`data/quests.js`): stages with `when` conditions ({flag},{item},
  {collection},{best},{shrapnel}); the overworld api()'s mutators bump
  re-evaluation — never poll. Rewards pay shrapnel/xp/items/gear.
- **Perks** (`game/perks.js`) is the ONE source of crimp modifiers (levels +
  gear; Vince mods scale with Style, Howard's with Jazz; charms are flat).
- **Acts** (`overworld.checkActs`): intro→tundra/forest/yeti; 2 records→sea+
  night; 4→the twist (nabootique trigger)→eelpit→mirror; beat_zeus1→moon+
  temple+onion; 6 records→the tournament (Dennis's dialogue drives rounds).
- `window.__BOOSH = { GS, Scenes, Renderer, startCrimp, demo3d, ... }` is the
  debug surface; the Playwright harness (`tools/_verify_*.mjs`, gitignored)
  drives the real game headless for verification.
- **Rendering pipeline:** scenes draw 2D into the offscreen overlay canvas as
  ever; a 3D scene FIRST renders its three.js world to the backbuffer, calls
  `Renderer.captureWorld()`, then `ctx.clearRect`s the overlay and draws only
  HUD. Every post pass samples `comp()` = overlay over captured world (exact
  overlay passthrough when no world captured). Presets `off | soft | crt`
  persist via `Save.opt("fx")`. GOTCHAS learned the hard way: the world
  texture must be RGB8 (the backbuffer is alpha:false — copyTexSubImage2D
  can't invent alpha); reset `UNPACK_FLIP_Y_WEBGL` to false after the overlay
  upload (three's texImage3D uploads are spec-forbidden under it); any
  fullscreen 3D scene must clear the overlay or opaque scenes below hide the
  world; pin the three version exactly.
- **Game-feel (`particles.js`):** `Particles` (a pooled, additive-blended
  particle system) and `Juice` (global screen-shake) are updated in the
  fixed-step and drawn into the scene buffer by the loop *before* present —
  so additive particles get bloom glow for free, and one `Juice.shake()` kicks
  the whole frame. Used by crimp hit-bursts and overworld pickups.
- **Audio (`audio.js`):** signal path `music voices → musicFilter → musicGain →
  busIn → comp → limiter → master`; SFX go straight to `busIn` so the crimp can
  duck/brighten the *music* only.
- **Lighting (`light.js`):** dark zones (`ZONE_LIGHT` in `overworld.js`) are
  darkened to an ambient level via a multiply pass; `buildLights()` adds a torch
  on the party plus portal/boss glows that cut pools of light through the gloom.
  Drawn before the HUD (HUD stays bright); sunlit zones skip it entirely.
- A master `analyser` exposes `getReactive()`
  ({level,bass}); the loop feeds `bass` to `Renderer.present(beat)` so **bloom
  pulses to the music** — the one bridge that ties the audio and visual focus
  areas together. The crimp drives `setMusicBrightness(combo)` and
  `duckMusic()` on a fluff, so the mix tracks your performance. Still 100%
  synthesised — no samples.
- **Native touch (`touch.js`):** no on-screen d-pad — gestures act on the game
  directly. A floating joystick (touch & drag anywhere) feeds the four direction
  actions; a quick tap fires `confirm` (interact/advance) plus a positional
  `Input.tap()` (canvas coords, via `clientToCanvas`) that the title + pause
  menus hit-test for tap-to-pick; in the crimp, tapping a lane column presses
  that lane. A tiny corner button is the only persistent control (pause). Scenes
  read the same `Input` actions as the keyboard, so nothing else changes.
- **WebMIDI (`midi.js`):** best-effort — a connected MIDI keyboard/pad plays the
  crimp by mapping note pitch-class into the four lanes (low→high =
  left→up→down→right) and feeding `Input._touchDown/_touchUp`, so the crimp
  needs no MIDI awareness. No device/permission ⇒ silently inert.
- **Normal-mapped lighting (`normalmap.js`):** because our sprites are generated,
  `pnglib.Canvas.normal_map()` derives a companion normal map from each sprite's
  luma×alpha heightfield; `gen_bosses.save()` writes `boss_*_n.png` alongside the
  albedo. At runtime `litSprite()` relights the crimp boss per-pixel against that
  normal map with a light that orbits + flares to the beat — real 2.5D shading on
  pixel art, uniquely cheap because the art is procedural.

## Asset pipeline (pure Python stdlib)
- `tools/pnglib.py` — a minimal PNG encoder + pixel-art `Canvas` (shapes, blit,
  outline, gradients, `normal_map()`). No Pillow. **Coordinate scale (`cs`):** a
  Canvas can render logical-coord drawing at `cs×` device pixels (`set()`/shape
  prims are logical and tile gap-free; `_dset`/`_dget` are device-raw). The
  engine runs at **`ART=3`** (960×540); `pnglib.ART`/`CS` must match
  `core.js ART`. Sprites authored natively at the device size (characters
  48×72) use `cs=1`; others pass `cs=CS` (=1.5) to render their ART=2-authored
  art crisply at ART=3.
- `tools/artlib.py` — shared palette + parametric `draw_person()` (heroes + NPCs),
  authored natively at 48×72 with per-direction faces, hair, clothing + outline.
- **3D side (also pure stdlib):** `tools/gltflib.py` writes deterministic
  binary GLB (POSITION float32 + COLOR_0 uint8 + indices; NO normals — the
  glTF flat-shading contract gives the voxel look); `tools/voxlib.py` holds
  sparse `Vox` volumes, the 6-direction greedy mesher (same-color rects → a
  character part is ~50-300 quads), `extrude_canvas` (any painted Canvas →
  voxels) and `build_person` (the voxel rebirth of `draw_person`: six pivoted
  parts on a 16×8×24 grid). `gen_vox_{characters,bosses,tilekits,props}.py`
  emit `assets/models/*.glb`; `tests/glb.test.js` locks the container format,
  accessor integrity, the quad-color invariant and the rig node names.
- `tools/gen_*.py` — one generator per asset family; `gen_all.py` runs them all.
- `tools/preview_vox.py` — dev-only isometric render of the rigs to a PNG.
- Audio is not pre-rendered: `engine/audio.js` synthesises everything at runtime.
- `tools/gen_icon.py` draws the 512² PWA app icon (crescent moon) → `assets/ui/icon.png`.

## PWA (offline)
`public/` holds passthrough files copied to the dist root: `manifest.webmanifest`
(installable, standalone, landscape) and `sw.js` (a stale-while-revalidate
service worker — same-origin GETs are cached, so after the first visit the game
loads instantly and plays fully offline). The SW is registered from `main.js`
**only in production** (`import.meta.env.PROD`) so it never shadows Vite's dev
module serving / HMR.

Run `python tools/gen_all.py` to rebuild every PNG + GLB (deterministic —
run it twice and `git status` stays clean; that IS the determinism test).

## Adding content
- **A world:** a palette in `gen_tiles.py` (one entry yields the 2D tileset
  AND the 3D tilekit), a `makeWorld` cfg in `data/zones.js` (+ `extra`
  entities for collectibles/NPCs), a boss portrait in `gen_bosses.py` + a
  voxel rig in `gen_vox_bosses.py`, a crimp in `data/crimps.js` + a track in
  `music.js`, dialogue in `data/dialogue.js`, MANIFEST keys in `core.js`
  (tiles_*, boss_* + _n, model_boss_*, model_tilekit_*). Wire progression via
  `winFlag`/`record` and the act waves in `overworld.checkActs()`. Then:
  `node tools/validate_zones.mjs && npm test`. Yeti Woods (commit 76508ec)
  is the reference example of the complete recipe.
- **A quest:** an entry in `data/quests.js` (stages + `when` conditions +
  reward) + a giver hook in `data/dialogue.js` (`api.quests.start(id)`).
- **Gear/collectibles:** `data/gear.js` / `data/collectibles.js` + an icon
  column in `gen_items.py` (next free: 22).
- **Future content seeds** (designed in the content bible, not yet built):
  Jungle Room (Tommy Nookah), Coconut Cove (Milky Joe), Black Lake (Black
  Frost), Monkey Hell (Ape of Death), Charlie in the Nabootique cellar,
  Old Gregg "Love Games" duet, kickboxing/arcade/fishing minigames, Album
  view, NG+. The night-only polo search in the hub teases the Hitcher.
