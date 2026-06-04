// touch.js — NATIVE touch input. No on-screen d-pad: you act on the game
// directly. A floating joystick (touch & drag anywhere) moves the party; a
// quick tap interacts / advances / selects; in the crimp you tap the lane
// columns directly. A tiny pause target sits in the corner. Everything is
// translated into the same semantic Input actions the keyboard feeds, so scenes
// work unchanged; menus + title additionally read Input.tap() for tap-to-pick.

import { Input, Scenes, clientToCanvas, VIEW_W } from "./core.js";
import { GS } from "../game/state.js";

const DIR_SETS = { 2: ["left", "right"], 3: ["left", "up", "right"], 4: ["left", "up", "down", "right"] };
const DIFF_LANES = { easy: 2, normal: 3, hard: 4 };
const DEAD = 16;       // px before a touch becomes a joystick drag
const TAP_MOVE = 16;   // px max movement to still count as a tap
const TAP_MS = 320;    // ms max duration for a tap
const KNOB_MAX = 46;   // px the joystick knob travels

function isTouch() {
  return (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
    ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
}

function inCrimp() {
  const t = Scenes.top();
  return !!(t && t.constructor && t.constructor.name === "Crimp");
}

const STYLE = `
#touch { position:fixed; inset:0; z-index:20; touch-action:none;
  -webkit-user-select:none; user-select:none; -webkit-tap-highlight-color:transparent;
  font-family:monospace; }
.tc-pause { position:absolute; right:12px; top:12px; width:46px; height:38px; z-index:22;
  pointer-events:auto; border:2px solid rgba(200,180,255,.5); background:rgba(30,22,55,.5);
  color:#e8e2ff; border-radius:10px; font-size:18px; display:flex; align-items:center;
  justify-content:center; backdrop-filter:blur(2px); }
.tc-pause.on { background:rgba(150,110,230,.75); transform:scale(.94); }
.tc-stick { position:absolute; width:120px; height:120px; margin:-60px 0 0 -60px; border-radius:50%;
  border:2px solid rgba(200,180,255,.35); background:rgba(40,30,70,.22); display:none; pointer-events:none; }
.tc-stick.on { display:block; }
.tc-knob { position:absolute; left:50%; top:50%; width:54px; height:54px; margin:-27px 0 0 -27px;
  border-radius:50%; background:rgba(170,140,240,.55); border:2px solid rgba(230,220,255,.7);
  transition:transform .03s linear; }
`;

export function initTouch() {
  if (!isTouch()) return;
  document.documentElement.classList.add("has-touch");

  const style = document.createElement("style");
  style.textContent = STYLE;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = "touch";
  document.body.appendChild(root);

  // tiny pause target (corner) — the one persistent button
  const pause = document.createElement("button");
  pause.className = "tc-pause";
  pause.innerHTML = "&#9776;";
  root.appendChild(pause);
  pause.addEventListener("pointerdown", (e) => {
    e.preventDefault(); e.stopPropagation();
    pause.classList.add("on"); Input._touchDown("pause");
  });
  const pauseUp = () => { pause.classList.remove("on"); Input._touchUp("pause"); };
  pause.addEventListener("pointerup", pauseUp);
  pause.addEventListener("pointercancel", pauseUp);

  // floating joystick visual
  const stick = document.createElement("div"); stick.className = "tc-stick";
  const knob = document.createElement("div"); knob.className = "tc-knob";
  stick.appendChild(knob); root.appendChild(stick);

  const pointers = new Map();  // pointerId -> record
  let stickId = null;

  function setDirs(rec, dx, dy) {
    const want = new Set();
    if (dx < -DEAD) want.add("left"); else if (dx > DEAD) want.add("right");
    if (dy < -DEAD) want.add("up"); else if (dy > DEAD) want.add("down");
    for (const d of [...rec.dirs]) if (!want.has(d)) { Input._touchUp(d); rec.dirs.delete(d); }
    for (const d of want) if (!rec.dirs.has(d)) { Input._touchDown(d); rec.dirs.add(d); }
  }
  function releaseDirs(rec) { for (const d of rec.dirs) Input._touchUp(d); rec.dirs.clear(); }

  function laneDir(clientX) {
    const n = DIFF_LANES[GS.data.difficulty] || 3;
    const c = clientToCanvas(clientX, 0);
    const i = Math.max(0, Math.min(n - 1, Math.floor((c.x / VIEW_W) * n)));
    return DIR_SETS[n][i];
  }

  root.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".tc-pause")) return; // pause button handles itself
    e.preventDefault();
    try { root.setPointerCapture(e.pointerId); } catch (_) {}
    if (inCrimp()) {
      const dir = laneDir(e.clientX);
      Input._touchDown(dir);
      pointers.set(e.pointerId, { kind: "lane", lane: dir });
      return;
    }
    pointers.set(e.pointerId, { kind: "pending", sx: e.clientX, sy: e.clientY, t0: performance.now(), dirs: new Set() });
    if (stickId === null) stickId = e.pointerId;
  });

  root.addEventListener("pointermove", (e) => {
    const rec = pointers.get(e.pointerId);
    if (!rec || rec.kind === "lane") return;
    const dx = e.clientX - rec.sx, dy = e.clientY - rec.sy;
    if (rec.kind === "pending" && Math.hypot(dx, dy) > DEAD) {
      rec.kind = "stick";
      if (e.pointerId === stickId) {
        stick.style.left = rec.sx + "px"; stick.style.top = rec.sy + "px";
        stick.classList.add("on");
      }
    }
    if (rec.kind === "stick") {
      setDirs(rec, dx, dy);
      if (e.pointerId === stickId) {
        const m = Math.min(1, Math.hypot(dx, dy) / KNOB_MAX) * KNOB_MAX;
        const a = Math.atan2(dy, dx);
        knob.style.transform = `translate(${Math.cos(a) * m}px, ${Math.sin(a) * m}px)`;
      }
    }
  });

  function endPointer(e) {
    const rec = pointers.get(e.pointerId);
    if (!rec) return;
    pointers.delete(e.pointerId);
    if (rec.kind === "lane") { Input._touchUp(rec.lane); return; }
    if (rec.kind === "stick") {
      releaseDirs(rec);
    } else {
      // a tap: short + barely moved -> position tap + a one-frame confirm pulse
      const dt = performance.now() - rec.t0;
      const moved = Math.hypot((e.clientX ?? rec.sx) - rec.sx, (e.clientY ?? rec.sy) - rec.sy);
      if (dt <= TAP_MS && moved <= TAP_MOVE) {
        const c = clientToCanvas(rec.sx, rec.sy);
        Input._touchTap(c.x, c.y);
        Input._touchDown("confirm");
        setTimeout(() => Input._touchUp("confirm"), 60);
      }
    }
    if (e.pointerId === stickId) {
      stickId = null;
      stick.classList.remove("on");
      knob.style.transform = "";
    }
  }
  root.addEventListener("pointerup", endPointer);
  root.addEventListener("pointercancel", endPointer);
  root.addEventListener("lostpointercapture", endPointer);

  // controls layer exists -> recompute canvas size (no reserved band now)
  window.dispatchEvent(new Event("resize"));
}
