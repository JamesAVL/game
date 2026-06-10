// core.js — engine primitives: config, canvas, fixed-timestep loop, input,
// asset loading, save system, and a tiny scene stack.

import { Renderer } from "./renderer.js";
import { Particles, Juice } from "./particles.js";
import { getReactive } from "./audio.js";
import { loadModel } from "./gltf.js";

// ART is the global art/render scale. The internal canvas, every layout
// constant, and the generated PNG assets are all expressed as base * ART so a
// future resolution change is a single edit. CONTRACT: this MUST equal
// ART in tools/artlib.py (both 3) — assets are baked at this scale. 960x540
// internal (×2 = 1920×1080 on the desktop integer-scale path).
export const ART = 3;
export const VIEW_W = 320 * ART;
export const VIEW_H = 180 * ART;
export const TILE = 16 * ART;

// ---------------------------------------------------------------------------
// Canvas / rendering target
// ---------------------------------------------------------------------------
// The visible canvas (#game) is owned by the Renderer (WebGL2, or a 2D
// fallback). The game itself draws every frame into an offscreen 2D canvas at
// the fixed internal resolution; the Renderer then presents that frame to the
// screen, optionally running post-processing during the upscale. Scene code is
// unchanged — it still receives this same `ctx` in render(ctx).
export const canvas = document.getElementById("game");

const sceneCanvas = document.createElement("canvas");
sceneCanvas.width = VIEW_W;
sceneCanvas.height = VIEW_H;
export const ctx = sceneCanvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

Renderer.init(canvas, sceneCanvas, VIEW_W, VIEW_H);

// Fit the 320x180 canvas to the viewport. On desktop we use crisp integer
// scaling; on touch devices we scale fractionally to fill the width and
// reserve a bottom band for the on-screen controls (set as --reserve).
function resize() {
  const touch = document.documentElement.classList.contains("has-touch");
  const portrait = window.innerHeight >= window.innerWidth;
  const wrap = document.getElementById("wrap");
  // native touch overlays the game directly (no reserved control band)
  const reserve = 0;
  const availW = window.innerWidth;
  const availH = window.innerHeight - reserve;
  let scale = Math.min(availW / VIEW_W, availH / VIEW_H);
  if (!touch) scale = Math.max(1, Math.floor(scale));   // desktop: crisp integer
  canvas.style.width = Math.round(VIEW_W * scale) + "px";
  canvas.style.height = Math.round(VIEW_H * scale) + "px";
  if (wrap) wrap.style.height = availH + "px";
  document.documentElement.style.setProperty("--reserve", reserve + "px");
}
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", resize);
resize();

// ---------------------------------------------------------------------------
// Input — keyboard mapped to semantic actions, with edge detection.
// ---------------------------------------------------------------------------
// Each physical key maps to one or more semantic actions. Movement (WASD +
// arrows) and the four crimp lanes (D F J K, mirrored onto the arrows) can
// overlap freely because a key can fire several actions.
const KEYMAP = {
  ArrowUp: ["up", "lane1"], KeyW: ["up"],
  ArrowDown: ["down", "lane2"], KeyS: ["down"],
  ArrowLeft: ["left", "lane0"], KeyA: ["left"],
  ArrowRight: ["right", "lane3"], KeyD: ["right", "lane0"],
  Enter: ["confirm"], Space: ["confirm"], KeyZ: ["confirm"],
  Escape: ["cancel"], KeyX: ["cancel"], Backspace: ["cancel"],
  KeyM: ["mute"], KeyP: ["pause"],
  KeyF: ["lane1"], KeyJ: ["lane2"], KeyK: ["lane3"],
};

const down = new Set();
const pressedThisFrame = new Set();
let pendingPress = [];
let pendingTap = null;   // {x,y} in internal-canvas coords, set by a native tap
let tapThisFrame = null;

export const Input = {
  isDown(a) { return down.has(a); },
  pressed(a) { return pressedThisFrame.has(a); },
  anyPressed() { return pressedThisFrame.size > 0; },
  // native touch / on-screen controls feed the same action set as the keyboard
  _touchDown(a) { if (!down.has(a)) pendingPress.push(a); down.add(a); },
  _touchUp(a) { down.delete(a); },
  // a positional tap, in internal-canvas coords, for one frame (like pressed)
  _touchTap(x, y) { pendingTap = { x, y }; },
  tap() { return tapThisFrame; },
  // called once per frame by the loop, after update
  _flip() {
    pressedThisFrame.clear();
    for (const a of pendingPress) pressedThisFrame.add(a);
    pendingPress = [];
    tapThisFrame = pendingTap;
    pendingTap = null;
  },
};

// map a client/screen coordinate onto the internal canvas (handles the
// integer/letterboxed display scaling), so taps hit the right game location.
export function clientToCanvas(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  if (!r.width || !r.height) return { x: 0, y: 0 };
  return {
    x: (clientX - r.left) / r.width * VIEW_W,
    y: (clientY - r.top) / r.height * VIEW_H,
  };
}

function actionsFor(code) {
  return KEYMAP[code] || [];
}

window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  for (const a of actionsFor(e.code)) {
    if (!down.has(a)) pendingPress.push(a);
    down.add(a);
  }
});
window.addEventListener("keyup", (e) => {
  for (const a of actionsFor(e.code)) down.delete(a);
});
window.addEventListener("blur", () => down.clear());

// ---------------------------------------------------------------------------
// Assets — manifest of generated PNGs.
// ---------------------------------------------------------------------------
export const MANIFEST = {
  font: "assets/ui/font.png",
  logo: "assets/ui/logo.png",
  vince: "assets/sprites/vince.png",
  howard: "assets/sprites/howard.png",
  naboo: "assets/sprites/naboo.png",
  bollo: "assets/sprites/bollo.png",
  fossil: "assets/sprites/fossil.png",
  boss_jazz: "assets/sprites/boss_jazz.png",
  boss_gregg: "assets/sprites/boss_gregg.png",
  boss_crackfox: "assets/sprites/boss_crackfox.png",
  boss_nana: "assets/sprites/boss_nana.png",
  boss_moon: "assets/sprites/boss_moon.png",
  boss_tony: "assets/sprites/boss_tony.png",
  boss_yeti: "assets/sprites/boss_yeti.png",
  boss_hitcher: "assets/sprites/boss_hitcher.png",
  boss_zeus: "assets/sprites/boss_zeus.png",
  boss_saboo: "assets/sprites/boss_saboo.png",
  // companion normal maps for per-pixel boss lighting in the crimp
  boss_jazz_n: "assets/sprites/boss_jazz_n.png",
  boss_gregg_n: "assets/sprites/boss_gregg_n.png",
  boss_crackfox_n: "assets/sprites/boss_crackfox_n.png",
  boss_nana_n: "assets/sprites/boss_nana_n.png",
  boss_moon_n: "assets/sprites/boss_moon_n.png",
  boss_tony_n: "assets/sprites/boss_tony_n.png",
  boss_yeti_n: "assets/sprites/boss_yeti_n.png",
  boss_hitcher_n: "assets/sprites/boss_hitcher_n.png",
  boss_zeus_n: "assets/sprites/boss_zeus_n.png",
  boss_saboo_n: "assets/sprites/boss_saboo_n.png",
  tiles_hub: "assets/tiles/hub.png",
  tiles_tundra: "assets/tiles/tundra.png",
  tiles_sea: "assets/tiles/sea.png",
  tiles_forest: "assets/tiles/forest.png",
  tiles_night: "assets/tiles/night.png",
  tiles_moon: "assets/tiles/moon.png",
  tiles_temple: "assets/tiles/temple.png",
  tiles_yeti: "assets/tiles/yeti.png",
  tiles_eelpit: "assets/tiles/eelpit.png",
  tiles_mirror: "assets/tiles/mirror.png",
  items: "assets/items/items.png",
  props: "assets/sprites/props.png",
  bg_stars: "assets/bg/stars.png",
  bg_title: "assets/bg/title.png",
  // voxel GLB models (tools/gen_vox_*.py) — parsed by engine/gltf.js
  model_vince: "assets/models/vince.glb",
  model_howard: "assets/models/howard.glb",
  model_naboo: "assets/models/naboo.glb",
  model_bollo: "assets/models/bollo.glb",
  model_fossil: "assets/models/fossil.glb",
  model_props: "assets/models/props.glb",
  model_boss_jazz: "assets/models/boss_jazz.glb",
  model_boss_gregg: "assets/models/boss_gregg.glb",
  model_boss_crackfox: "assets/models/boss_crackfox.glb",
  model_boss_nana: "assets/models/boss_nana.glb",
  model_boss_moon: "assets/models/boss_moon.glb",
  model_boss_tony: "assets/models/boss_tony.glb",
  model_boss_yeti: "assets/models/boss_yeti.glb",
  model_boss_hitcher: "assets/models/boss_hitcher.glb",
  model_boss_zeus: "assets/models/boss_zeus.glb",
  model_boss_saboo: "assets/models/boss_saboo.glb",
  model_tilekit_hub: "assets/models/tilekit_hub.glb",
  model_tilekit_tundra: "assets/models/tilekit_tundra.glb",
  model_tilekit_sea: "assets/models/tilekit_sea.glb",
  model_tilekit_forest: "assets/models/tilekit_forest.glb",
  model_tilekit_night: "assets/models/tilekit_night.glb",
  model_tilekit_moon: "assets/models/tilekit_moon.glb",
  model_tilekit_temple: "assets/models/tilekit_temple.glb",
  model_tilekit_yeti: "assets/models/tilekit_yeti.glb",
  model_tilekit_eelpit: "assets/models/tilekit_eelpit.glb",
  model_tilekit_mirror: "assets/models/tilekit_mirror.glb",
};

const images = {};
export function img(key) { return images[key]; }

export function loadAll(onProgress) {
  const keys = Object.keys(MANIFEST);
  let loaded = 0;
  const tick = (res) => () => { loaded++; onProgress && onProgress(loaded, keys.length); res(); };
  return Promise.all(keys.map((k) => new Promise((res) => {
    const ok = tick(res);
    if (MANIFEST[k].endsWith(".glb")) {
      loadModel(k, MANIFEST[k]).then(ok, (e) => { console.warn("missing model", k, e); ok(); });
      return;
    }
    const im = new Image();
    im.onload = () => { images[k] = im; ok(); };
    im.onerror = () => { console.warn("missing asset", k, MANIFEST[k]); ok(); };
    im.src = MANIFEST[k];
  })));
}

// ---------------------------------------------------------------------------
// Save system (localStorage) — lives in save.js (DOM-free) so the game-state
// layer can import it under node; re-exported here for engine callers.
// ---------------------------------------------------------------------------
export { Save } from "./save.js";

// ---------------------------------------------------------------------------
// Scene stack — scenes implement {enter, update(dt), render(ctx), exit, onTop}.
// ---------------------------------------------------------------------------
const stack = [];
export const Scenes = {
  push(s) { stack.push(s); s.enter && s.enter(); },
  pop() { const s = stack.pop(); s && s.exit && s.exit(); const t = this.top(); t && t.onTop && t.onTop(); },
  replace(s) { while (stack.length) this.pop(); this.push(s); },
  top() { return stack[stack.length - 1]; },
  size() { return stack.length; },
  update(dt) {
    // update only the top scene; render the whole stack bottom->top
    const t = this.top();
    if (t && t.update) t.update(dt);
  },
  render(ctx) {
    for (const s of stack) if (s.render) s.render(ctx);
  },
};

// ---------------------------------------------------------------------------
// Fixed-timestep loop
// ---------------------------------------------------------------------------
export function startLoop() {
  const STEP = 1 / 60;
  let last = performance.now() / 1000;
  let acc = 0;
  function frame() {
    const now = performance.now() / 1000;
    const dt = Math.min(0.25, now - last);
    last = now;
    if (Juice.frozen()) {
      // hit-stop: hold the simulation for impact, but keep timers + rendering alive
      Juice.tickFreeze(dt);
      Juice.update(dt);
    } else {
      acc += dt;
      while (acc >= STEP) {
        Scenes.update(STEP);
        Particles.update(STEP);
        Juice.update(STEP);
        Input._flip();
        acc -= STEP;
      }
    }
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    // global screen-shake kicks the whole frame (HUD included); particles draw
    // into the scene buffer so the renderer's bloom turns them into glow.
    const sh = Juice.offset();
    ctx.save();
    ctx.translate(Math.round(sh.x), Math.round(sh.y));
    Scenes.render(ctx);
    Particles.draw(ctx);
    ctx.restore();
    // impact flash (drawn into the scene buffer so it blooms)
    const fa = Juice.flashAlpha();
    if (fa > 0) {
      ctx.save();
      ctx.globalAlpha = fa;
      ctx.fillStyle = Juice.flashCol;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.restore();
    }
    Renderer.present(getReactive().bass); // bloom pulses to the music
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
