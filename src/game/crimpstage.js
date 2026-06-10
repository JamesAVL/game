// crimpstage.js — the crimp-off goes 3D: the boss as a voxel rig dancing on
// a podium under an orbiting spotlight that flares to the beat (normalmap.js's
// litSprite orbit reborn as a real light). Vince + Howard stand stage-left
// hyping. Lanes, notes, meters, lyrics stay byte-for-byte 2D overlay; the
// 2D litSprite path remains the fallback when no model exists.

import * as THREE from "three";
import { VIEW_W, VIEW_H } from "../engine/core.js";
import { Scene3D } from "../engine/scene3d.js";
import { instantiate, hasModel, voxMaterial } from "../engine/gltf.js";
import { dance, walk, face } from "../engine/voxanim.js";

export class CrimpStage3D {
  constructor(def) {
    this.ok = false;
    this.react = { t: 0, kind: null };
    if (!Scene3D.available()) return;
    const key = "model_" + def.face;
    if (!hasModel(key)) return;

    const scene = new THREE.Scene();
    this._own = [];
    const bg0 = new THREE.Color(def.bg0 || "#1a1140");
    const bg1 = new THREE.Color(def.bg1 || "#3a1a5a");
    scene.background = bg0;
    scene.fog = new THREE.Fog(bg0, 10, 24);

    // gradient backdrop wall
    const c = document.createElement("canvas");
    c.width = 4; c.height = 64;
    const g = c.getContext("2d").createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, "#" + bg0.getHexString());
    g.addColorStop(1, "#" + bg1.getHexString());
    const cx2 = c.getContext("2d");
    cx2.fillStyle = g; cx2.fillRect(0, 0, 4, 64);
    const btex = this._track(new THREE.CanvasTexture(c));
    const back = new THREE.Mesh(
      this._track(new THREE.PlaneGeometry(40, 18)),
      this._track(new THREE.MeshBasicMaterial({ map: btex })),
    );
    back.position.set(0, 6, -8);
    scene.add(back);

    // stage floor + podium
    const floor = new THREE.Mesh(
      this._track(new THREE.PlaneGeometry(40, 24)),
      this._track(new THREE.MeshLambertMaterial({ color: bg1.clone().multiplyScalar(0.5) })),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const podium = new THREE.Mesh(
      this._track(new THREE.CylinderGeometry(2.2, 2.5, 0.5, 24)),
      this._track(new THREE.MeshLambertMaterial({ color: bg1.clone().multiplyScalar(0.8) })),
    );
    podium.position.y = 0.25;
    podium.receiveShadow = true; podium.castShadow = true;
    scene.add(podium);

    scene.add(new THREE.HemisphereLight(0x9aa0d0, 0x202038, 0.9));
    const fill = new THREE.DirectionalLight(0xffffff, 0.7);
    fill.position.set(-4, 8, 6);
    scene.add(fill);

    // the orbiting spot — the soul of the old normal-mapped lighting
    this.spot = new THREE.SpotLight(0xfff0d0, 260, 30, 0.5, 0.5, 1.6);
    this.spot.castShadow = true;
    this.spot.shadow.mapSize.set(512, 512);
    scene.add(this.spot);
    // magenta rim from behind
    const rim = new THREE.SpotLight(0xff7ad8, 120, 30, 0.7, 0.6, 1.8);
    rim.position.set(0, 5, -6);
    scene.add(rim);

    // the boss on the podium
    this.boss = instantiate(key);
    this.boss.group.position.set(0, 0.5, 0);
    const span = (def.bossScale || 2) * 0.9;
    this.boss.group.scale.setScalar(span);
    scene.add(this.boss.group);
    this.spot.target = this.boss.group;

    // Vince + Howard hyping stage-left, inside the frame
    this.vince = instantiate("model_vince");
    this.howard = instantiate("model_howard");
    if (this.vince) { this.vince.group.position.set(-3.1, 0, 3.0); scene.add(this.vince.group); }
    if (this.howard) { this.howard.group.position.set(-4.2, 0, 3.9); scene.add(this.howard.group); }

    this.cam = new THREE.PerspectiveCamera(38, VIEW_W / VIEW_H, 0.3, 60);
    this.baseDist = 9.2;
    this.dolly = 0;
    this.scene = scene;
    this.t = 0;
    this.ok = true;
  }

  _track(r) { this._own.push(r); return r; }

  // boss flinches when YOU land a perfect, flexes when you fluff
  hit(kind) {
    this.react = { t: 0.3, kind };
  }

  sync(dt, danceT, bass, combo) {
    if (!this.ok) return;
    this.t += dt;
    dance(this.boss, danceT, bass);
    if (this.react.t > 0) {
      this.react.t -= dt;
      const k = this.react.t / 0.3;
      if (this.react.kind === "perfect") this.boss.group.rotation.z = Math.sin(k * Math.PI) * 0.12;
      else this.boss.group.scale.y = (1 + Math.sin(k * Math.PI) * 0.12) * (this.boss.group.scale.x);
    }
    if (this.vince) { dance(this.vince, danceT + 0.5, bass * 0.6); face(this.vince, "right", dt); }
    if (this.howard) { walk(this.howard, danceT * 0.7, false, dt); face(this.howard, "right", dt); }

    // orbiting spot, flaring on the bass (the litSprite orbit, reborn)
    const a = danceT * 1.1;
    this.spot.position.set(Math.cos(a) * 6, 5.5 + Math.sin(danceT * 0.7) * 1.2, Math.sin(a) * 4 + 4);
    this.spot.intensity = 220 + bass * 300;

    // camera: low concert angle, slow sway, combo dolly
    const want = Math.min(4, Math.floor(combo / 10)) * 0.22;
    this.dolly += (want - this.dolly) * Math.min(1, dt * 3);
    const dist = this.baseDist - this.dolly;
    const sway = Math.sin(this.t * 0.4) * 0.06;
    this.cam.position.set(Math.sin(sway) * dist - 1.2, 2.6, Math.cos(sway) * dist);
    this.cam.lookAt(0, 1.6, 0);
  }

  render() {
    if (!this.ok) return false;
    return Scene3D.renderWorld(this.scene, this.cam);
  }

  dispose() {
    for (const r of this._own || []) r.dispose && r.dispose();
    this.ok = false;
  }
}
