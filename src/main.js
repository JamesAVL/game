// main.js — boot: load assets, gate audio behind first input, run the loop.

import { loadAll, startLoop, Scenes, Save, Input } from "./engine/core.js";
import { Renderer } from "./engine/renderer.js";
import { Particles, Juice } from "./engine/particles.js";
import { initMidi, midiStatus } from "./engine/midi.js";
import { unlockAudio, audioDebug, getReactive, duckMusic, setMusicBrightness } from "./engine/audio.js";
import { Title } from "./game/title.js";
import { GS } from "./game/state.js";
import { initTouch } from "./engine/touch.js";

// restore the saved visual-FX preset (off | soft | crt)
Renderer.setPreset(Save.optGet("fx", "soft"));

// register the service worker for offline play (production build only — in dev
// it would shadow Vite's module serving / HMR).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW registration failed:", e));
  });
}

// debug handle (handy for testing in the console)
window.__BOOSH = {
  GS, Scenes, Renderer, Particles, Juice, Input,
  Audio: { debug: audioDebug, getReactive, duckMusic, setMusicBrightness },
  midiStatus,
};

// optional WebMIDI — play the crimp on a real keyboard/pad if one is present
initMidi();

const boot = document.getElementById("boot");

// Web Audio must start from a user gesture.
let audioReady = false;
function tryUnlock() { if (!audioReady) { audioReady = true; unlockAudio(); } }
window.addEventListener("keydown", tryUnlock, { once: false });
window.addEventListener("pointerdown", tryUnlock, { once: false });

loadAll((n, total) => { boot.textContent = "LOADING THE ZOONIVERSE... " + Math.round((n / total) * 100) + "%"; })
  .then(() => {
    boot.classList.add("hidden");
    initTouch();
    Scenes.push(new Title());
    startLoop();
  })
  .catch((e) => { boot.textContent = "Failed to load: " + e; console.error(e); });
