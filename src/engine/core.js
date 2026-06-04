// core.js — engine primitives: config, canvas, fixed-timestep loop, input,
// asset loading, save system, and a tiny scene stack.

export const VIEW_W = 320;
export const VIEW_H = 180;
export const TILE = 16;

// ---------------------------------------------------------------------------
// Canvas / rendering target
// ---------------------------------------------------------------------------
export const canvas = document.getElementById("game");
canvas.width = VIEW_W;
canvas.height = VIEW_H;
export const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

// Fit the 320x180 canvas to the viewport. On desktop we use crisp integer
// scaling; on touch devices we scale fractionally to fill the width and
// reserve a bottom band for the on-screen controls (set as --reserve).
function resize() {
  const touch = document.documentElement.classList.contains("has-touch");
  const portrait = window.innerHeight >= window.innerWidth;
  const wrap = document.getElementById("wrap");
  let reserve = 0;
  if (touch && portrait) reserve = Math.min(Math.max(window.innerHeight * 0.30, 190), 300);
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

export const Input = {
  isDown(a) { return down.has(a); },
  pressed(a) { return pressedThisFrame.has(a); },
  anyPressed() { return pressedThisFrame.size > 0; },
  // on-screen touch controls feed the same action set as the keyboard
  _touchDown(a) { if (!down.has(a)) pendingPress.push(a); down.add(a); },
  _touchUp(a) { down.delete(a); },
  // called once per frame by the loop, after update
  _flip() {
    pressedThisFrame.clear();
    for (const a of pendingPress) pressedThisFrame.add(a);
    pendingPress = [];
  },
};

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
  tiles_hub: "assets/tiles/hub.png",
  tiles_tundra: "assets/tiles/tundra.png",
  tiles_sea: "assets/tiles/sea.png",
  tiles_forest: "assets/tiles/forest.png",
  tiles_night: "assets/tiles/night.png",
  tiles_moon: "assets/tiles/moon.png",
  tiles_temple: "assets/tiles/temple.png",
  items: "assets/items/items.png",
  props: "assets/sprites/props.png",
  bg_stars: "assets/bg/stars.png",
  bg_title: "assets/bg/title.png",
};

const images = {};
export function img(key) { return images[key]; }

export function loadAll(onProgress) {
  const keys = Object.keys(MANIFEST);
  let loaded = 0;
  return Promise.all(keys.map((k) => new Promise((res) => {
    const im = new Image();
    im.onload = () => { images[k] = im; loaded++; onProgress && onProgress(loaded, keys.length); res(); };
    im.onerror = () => { console.warn("missing asset", k, MANIFEST[k]); loaded++; res(); };
    im.src = MANIFEST[k];
  })));
}

// ---------------------------------------------------------------------------
// Save system (localStorage)
// ---------------------------------------------------------------------------
const SAVE_KEY = "boosh_save_v1";
export const Save = {
  write(data) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); return true; } catch (e) { return false; } },
  read() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  clear() { localStorage.removeItem(SAVE_KEY); },
  exists() { return !!localStorage.getItem(SAVE_KEY); },
  // standalone settings (persist even before a game save exists)
  optGet(k, def) { try { const v = localStorage.getItem("boosh_opt_" + k); return v === null ? def : v; } catch (e) { return def; } },
  optSet(k, v) { try { localStorage.setItem("boosh_opt_" + k, v); } catch (e) {} },
};

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
    acc += Math.min(0.25, now - last);
    last = now;
    while (acc >= STEP) {
      Scenes.update(STEP);
      Input._flip();
      acc -= STEP;
    }
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    Scenes.render(ctx);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
