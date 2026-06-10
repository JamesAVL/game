// scene3d.js — the three.js side of the present bridge.
//
// three adopts the SAME canvas + WebGL2 context that renderer.js owns. A 3D
// scene renders first each frame (into the canvas backbuffer), renderer.js
// captures that into a texture (copyTexImage2D — GPU-resident, no readback),
// and the 2D sceneCanvas is composited over it through the existing post-FX
// chain. 2D-only scenes never call this and stay pixel-identical.
//
// State discipline contract: three.resetState() is called before every three
// render (so three never trusts bindings our raw passes changed); renderer.js
// re-binds/disables everything it needs per pass. That boundary is the whole
// interop — neither side uses the other's internals.

import * as THREE from "three";
import { Renderer } from "./renderer.js";

// Palette parity with the 2D art: disable color management end-to-end so the
// bytes painted by tools/*.py land on screen untouched (lighting math happens
// in display space, like the rest of the engine).
THREE.ColorManagement.enabled = false;

export const Scene3D = {
  three: null,        // THREE.WebGLRenderer (shared context) | null
  _failed: false,

  available() {
    if (this._failed) return false;
    if (this.three) return true;
    if (Renderer.mode !== "gl") { this._failed = true; return false; }
    try {
      const r = new THREE.WebGLRenderer({
        canvas: Renderer._display,
        context: Renderer.gl,
        antialias: false,
      });
      r.outputColorSpace = THREE.LinearSRGBColorSpace;
      r.setPixelRatio(1);
      r.setSize(Renderer._W, Renderer._H, false); // never touch CSS sizing
      r.shadowMap.enabled = true;
      r.shadowMap.type = THREE.PCFShadowMap;
      r.autoClear = true;
      this.three = r;
    } catch (e) {
      console.warn("three.js init failed; 3D disabled:", e && e.message);
      this._failed = true;
      return false;
    }
    return true;
  },

  // Render a 3D world into the backbuffer and hand it to the present chain.
  // Call from a scene's render() BEFORE drawing its 2D overlay into ctx.
  renderWorld(scene, camera) {
    if (!this.available()) return false;
    this.three.resetState();
    this.three.render(scene, camera);
    Renderer.captureWorld();
    return true;
  },
};
