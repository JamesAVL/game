// main.js — boot: load assets, gate audio behind first input, run the loop.

import { loadAll, startLoop, Scenes, Save } from "./engine/core.js";
import { Renderer } from "./engine/renderer.js";
import { Particles, Juice } from "./engine/particles.js";
import { unlockAudio, audioDebug, getReactive, duckMusic, setMusicBrightness } from "./engine/audio.js";
import { Title } from "./game/title.js";
import { GS } from "./game/state.js";
import { initTouch } from "./engine/touch.js";

// restore the saved visual-FX preset (off | soft | crt)
Renderer.setPreset(Save.optGet("fx", "soft"));

// debug handle (handy for testing in the console)
window.__BOOSH = {
  GS, Scenes, Renderer, Particles, Juice,
  Audio: { debug: audioDebug, getReactive, duckMusic, setMusicBrightness },
};

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
