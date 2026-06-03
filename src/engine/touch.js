// touch.js — on-screen controls for touch devices. Buttons feed the same
// semantic actions as the keyboard (Input._touchDown/_touchUp), so every
// scene works unchanged. Two layouts: "explore" (D-pad + A/B/menu) and
// "crimp" (four tappable lanes), switched by inspecting the active scene.

import { Input, Scenes } from "./core.js";

const LANE_COL = ["#ff5a8a", "#ffd24a", "#5ad6ff", "#8aff6a"];
const LANE_LBL = ["D", "F", "J", "K"];

function isTouch() {
  return (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
    ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
}

function bind(el, action) {
  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    el.classList.add("on");
    Input._touchDown(action);
  });
  const up = () => { el.classList.remove("on"); Input._touchUp(action); };
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  el.addEventListener("lostpointercapture", up);
}

function btn(cls, label, action, parent) {
  const b = document.createElement("button");
  b.className = "tc-btn " + cls;
  b.innerHTML = label;
  parent.appendChild(b);
  bind(b, action);
  return b;
}

const STYLE = `
#touch { position:fixed; inset:0; z-index:20; pointer-events:none;
  font-family:monospace; -webkit-user-select:none; user-select:none; }
#touch button { pointer-events:auto; touch-action:none; -webkit-tap-highlight-color:transparent;
  border:2px solid rgba(200,180,255,.5); background:rgba(30,22,55,.5); color:#e8e2ff;
  border-radius:12px; font-size:20px; font-weight:bold; display:flex; align-items:center;
  justify-content:center; backdrop-filter:blur(2px); }
#touch button.on { background:rgba(150,110,230,.75); transform:scale(.94); }
.tc-dpad { position:absolute; left:14px; bottom:16px; width:168px; height:168px; }
.tc-dpad button { position:absolute; width:56px; height:56px; }
.tc-up    { left:56px; top:0; }
.tc-down  { left:56px; top:112px; }
.tc-left  { left:0; top:56px; }
.tc-right { left:112px; top:56px; }
.tc-actions { position:absolute; right:14px; bottom:16px; width:160px; height:160px; }
.tc-actions button { position:absolute; border-radius:50%; }
.tc-a { right:0; bottom:24px; width:76px; height:76px; font-size:22px;
  border-color:rgba(255,216,106,.7); background:rgba(120,90,30,.5); }
.tc-b { right:84px; bottom:8px; width:60px; height:60px;
  border-color:rgba(255,120,120,.6); background:rgba(110,40,40,.45); }
.tc-menu { position:absolute; right:14px; top:14px; width:46px; height:38px; font-size:18px; }
.tc-lanes { position:absolute; left:0; right:0; bottom:0; height:120px; display:flex; gap:6px;
  padding:6px; box-sizing:border-box; }
.tc-lanes button { flex:1; height:100%; font-size:26px; border-width:3px; }
#touch[data-mode="explore"] .tc-lanes { display:none; }
#touch[data-mode="crimp"] .tc-dpad,
#touch[data-mode="crimp"] .tc-a,
#touch[data-mode="crimp"] .tc-b,
#touch[data-mode="crimp"] .tc-menu { display:none; }
`;

export function initTouch() {
  if (!isTouch()) return;
  document.documentElement.classList.add("has-touch");

  const style = document.createElement("style");
  style.textContent = STYLE;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = "touch";
  root.dataset.mode = "explore";
  document.body.appendChild(root);

  // D-pad
  const dpad = document.createElement("div");
  dpad.className = "tc-dpad";
  root.appendChild(dpad);
  btn("tc-up", "&#9650;", "up", dpad);
  btn("tc-down", "&#9660;", "down", dpad);
  btn("tc-left", "&#9664;", "left", dpad);
  btn("tc-right", "&#9654;", "right", dpad);

  // action buttons
  const acts = document.createElement("div");
  acts.className = "tc-actions";
  root.appendChild(acts);
  btn("tc-a", "Z", "confirm", acts);
  btn("tc-b", "X", "cancel", acts);

  btn("tc-menu", "&#9776;", "pause", root);

  // crimp lanes
  const lanes = document.createElement("div");
  lanes.className = "tc-lanes";
  root.appendChild(lanes);
  for (let i = 0; i < 4; i++) {
    const b = btn("tc-lane", LANE_LBL[i], "lane" + i, lanes);
    b.style.borderColor = LANE_COL[i];
    b.style.color = LANE_COL[i];
  }

  // switch layout based on the active scene
  setInterval(() => {
    const top = Scenes.top();
    const inCrimp = top && top.constructor && top.constructor.name === "Crimp";
    root.dataset.mode = inCrimp ? "crimp" : "explore";
  }, 150);
}
