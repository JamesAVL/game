// demo3d.js — the M1 proving ground: a voxel character turning on a podium,
// rendered by three.js through the FULL present chain (capture -> composite ->
// bloom/grade/CRT) with a 2D overlay on top. Reached via __BOOSH.demo3d().
// If this looks right on desktop + phone, the whole 3D bridge is sound.

import * as THREE from "three";
import { VIEW_W, VIEW_H, ART, Input, Scenes } from "../engine/core.js";
import { Scene3D } from "../engine/scene3d.js";
import { instantiate } from "../engine/gltf.js";
import { drawText, textCentered, panel } from "../engine/gfx.js";

const CAST = ["model_vince", "model_howard", "model_naboo", "model_bollo", "model_fossil"];

export class Demo3D {
  constructor() {
    this.t = 0;
    this.who = 0;
    this.scene = null;
  }

  enter() {
    if (!Scene3D.available()) return;
    const s = new THREE.Scene();
    s.background = new THREE.Color(0x141220);
    s.fog = new THREE.Fog(0x141220, 8, 18);

    const sun = new THREE.DirectionalLight(0xfff2dd, 2.4);
    sun.position.set(3, 6, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -4; sun.shadow.camera.right = 4;
    sun.shadow.camera.top = 4; sun.shadow.camera.bottom = -4;
    s.add(sun);
    s.add(new THREE.HemisphereLight(0x8a90c0, 0x2a2438, 1.4));

    const podium = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.6, 0.4, 24),
      new THREE.MeshLambertMaterial({ color: 0x4a4066 }),
    );
    podium.position.y = -0.2;
    podium.receiveShadow = true;
    s.add(podium);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshLambertMaterial({ color: 0x232038 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.4;
    floor.receiveShadow = true;
    s.add(floor);

    this.rig = null;
    this.scene = s;
    this.cam = new THREE.PerspectiveCamera(38, VIEW_W / VIEW_H, 0.1, 60);
    this.cam.position.set(0, 2.4, 4.6);
    this.cam.lookAt(0, 1.0, 0);
    this._mount(0);
  }

  _mount(i) {
    if (!this.scene) return;
    if (this.rig) this.scene.remove(this.rig.group);
    this.who = ((i % CAST.length) + CAST.length) % CAST.length;
    this.rig = instantiate(CAST[this.who]);
    if (this.rig) this.scene.add(this.rig.group);
  }

  update(dt) {
    this.t += dt;
    if (Input.pressed("cancel")) { Scenes.pop(); return; }
    if (Input.pressed("right") || Input.pressed("confirm")) this._mount(this.who + 1);
    if (Input.pressed("left")) this._mount(this.who - 1);
    if (this.rig) {
      this.rig.group.rotation.y = this.t * 0.9;
      // a little walk-cycle so the rig pivots prove themselves
      const ph = Math.sin(this.t * 7);
      this.rig.parts.legL.rotation.x = ph * 0.5;
      this.rig.parts.legR.rotation.x = -ph * 0.5;
      this.rig.parts.armL.rotation.x = -ph * 0.4;
      this.rig.parts.armR.rotation.x = ph * 0.4;
      this.rig.group.position.y = Math.abs(ph) * 0.04;
    }
  }

  render(ctx) {
    const ok = this.scene && Scene3D.renderWorld(this.scene, this.cam);
    // a fullscreen 3D scene owns the frame: wipe whatever scenes below drew
    // into the overlay so the captured world shows through, then draw HUD
    if (ok) ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    // 2D overlay rides on top of the captured 3D frame (or stands alone)
    if (!ok) {
      ctx.fillStyle = "#141220";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      textCentered(ctx, "3D UNAVAILABLE (WebGL2 required)", VIEW_W / 2, VIEW_H / 2, { scale: 2 });
      return;
    }
    panel(ctx, 8 * ART, 8 * ART, 150 * ART, 28 * ART);
    drawText(ctx, "VOXEL BRIDGE DEMO", 14 * ART, 13 * ART, { color: "#ffd86a", scale: 2 });
    drawText(ctx, CAST[this.who].replace("model_", "").toUpperCase() + "  [</>] swap  [esc] back", 14 * ART, 27 * ART);
  }
}
