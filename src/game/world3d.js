// world3d.js — WorldView3D: renders a zone in voxel 3D while the sim stays
// exactly what it always was (tile-grid collision, text-map authoring, the
// same entity list). The overworld delegates drawing here when a zone is
// flagged view:"3d" and the bridge is available; the 2D path remains the
// automatic fallback.
//
//   ground   the zone's existing tileset baked once to a CanvasTexture plane
//   solids   tilekit GLB prototypes (wall/wall_alt/feature/obstacle) merged
//            into a handful of meshes
//   people   voxel rigs driven by voxanim (facing = yaw, walking = pivots)
//   props    props.glb clones with state swaps (switch/gate/searched)
//   items    floating billboard sprites of the existing item icons
//   portals  emissive rings + projected 2D labels
//
// 1 tile = 1.0 world unit; world = (px/TILE, 0, py/TILE).

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { VIEW_W, VIEW_H, TILE, ART, img } from "../engine/core.js";
import { Scene3D } from "../engine/scene3d.js";
import { instantiate, hasModel, voxMaterial } from "../engine/gltf.js";
import { face, walk } from "../engine/voxanim.js";
import { drawText, textWidth } from "../engine/gfx.js";
import { GS } from "./state.js";
import { ITEM_INDEX } from "../data/items.js";
import { COLLECTIONS } from "../data/collectibles.js";
import { ZONE_LIGHT } from "../data/zones.js";
import { ambientFor } from "./clock.js";

const PITCH = (-55 * Math.PI) / 180;
const DIST = 13;
const FOV = 38;

// per-zone horizon/fog color (the 3D sibling of the 2D zone palettes)
const FOG = {
  hub: 0x1a2616, nabootique: 0x171022,
  tundra: 0x1c2a38, sea: 0x06202a, forest: 0x161e10,
  night: 0x140822, moon: 0x0a0a20, temple: 0x241408,
  yeti: 0x101c12, eelpit: 0x10160f, mirror: 0x232c44,
};

const fadedMaterial = voxMaterial.clone();
fadedMaterial.transparent = true;
fadedMaterial.opacity = 0.4;

// item-icon sprite textures, cut once from the items strip
const iconTexCache = new Map();
function iconTexture(idx) {
  if (iconTexCache.has(idx)) return iconTexCache.get(idx);
  const strip = img("items");
  if (!strip) return null;
  const c = document.createElement("canvas");
  c.width = TILE; c.height = TILE;
  c.getContext("2d").drawImage(strip, idx * TILE, 0, TILE, TILE, 0, 0, TILE, TILE);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  iconTexCache.set(idx, tex);
  return tex;
}

function spriteFromImage(image, sx, sy, sw, sh) {
  const c = document.createElement("canvas");
  c.width = sw; c.height = sh;
  c.getContext("2d").drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  return tex;
}

export class WorldView3D {
  constructor(ow) {
    this.ow = ow;
    this.ok = false;
    this.t = 0;
    this._own = [];           // disposables created by this view
    if (!Scene3D.available()) return;
    const kitKey = "model_tilekit_" + ow.def.tileset.replace("tiles_", "");
    if (!hasModel(kitKey)) return;
    try {
      this._build(kitKey);
      this.ok = true;
    } catch (e) {
      console.warn("WorldView3D build failed; falling back to 2D:", e);
      this.dispose();
    }
  }

  _track(r) { this._own.push(r); return r; }

  _build(kitKey) {
    const ow = this.ow;
    const def = ow.def;
    const tm = ow.tilemap;
    const w = tm.w, h = tm.h;

    const scene = new THREE.Scene();
    const fog = FOG[def.id] !== undefined ? FOG[def.id] : 0x141220;
    scene.background = new THREE.Color(fog);
    // dark zones: closer fog sells the gloom the 2D light pass used to paint
    const amb = (ZONE_LIGHT[def.id] && ZONE_LIGHT[def.id].level) || 1;
    scene.fog = new THREE.Fog(fog, amb < 1 ? 9 : 16, amb < 1 ? 22 : 34);
    this.scene = scene;

    // ---- lights ----------------------------------------------------------
    const sun = new THREE.DirectionalLight(amb < 1 ? 0xcfd4ff : 0xfff2dd, 2.2 * (0.25 + 0.75 * amb));
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -11; sun.shadow.camera.right = 11;
    sun.shadow.camera.top = 9; sun.shadow.camera.bottom = -9;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 40;
    sun.shadow.normalBias = 0.03;
    scene.add(sun); scene.add(sun.target);
    this.sun = sun;
    scene.add(new THREE.HemisphereLight(0xb8c0e8, 0x3a3448, 1.15 * (0.3 + 0.7 * amb)));

    // dark zones carry their own light: a warm torch on the party plus glow
    // pools on portals and the lurking boss (the buildLights() port)
    if (amb < 1) {
      this.torch = new THREE.PointLight(0xffe2aa, 14, 7, 1.6);
      this.torch.position.y = 1.2;
      scene.add(this.torch);
      let glows = 0;
      for (const e of ow.entities) {
        if (glows >= 5) break;
        const col = e.type === "portal" ? 0x968cff : e.type === "boss" ? 0xff6e78 : 0;
        if (!col) continue;
        const pl = new THREE.PointLight(col, 8, 5.5, 1.7);
        pl.position.set(e.px / TILE + 0.5, 0.7, e.py / TILE + 0.5);
        scene.add(pl);
        glows++;
      }
    }

    // ---- ground: the 2D tileset baked to one textured plane ---------------
    const bake = document.createElement("canvas");
    bake.width = tm.pxW; bake.height = tm.pxH;
    const bctx = bake.getContext("2d");
    bctx.imageSmoothingEnabled = false;
    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        const t = tm.grid[ty][tx];
        if (t < 0) continue;
        const sx = (t % tm.cols) * TILE, sy = Math.floor(t / tm.cols) * TILE;
        bctx.drawImage(tm.img, sx, sy, TILE, TILE, tx * TILE, ty * TILE, TILE, TILE);
      }
    }
    const groundTex = this._track(new THREE.CanvasTexture(bake));
    groundTex.magFilter = groundTex.minFilter = THREE.NearestFilter;
    const ground = new THREE.Mesh(
      this._track(new THREE.PlaneGeometry(w, h)),
      this._track(new THREE.MeshLambertMaterial({ map: groundTex })),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(w / 2, 0, h / 2);
    ground.receiveShadow = true;
    scene.add(ground);

    // ---- solid tiles: tilekit prototypes merged per type ------------------
    const kit = instantiate(kitKey);
    // "%" is the secret passage: renders as wall, walks like floor
    const PROTO = { "#": "wall", "=": "wall_alt", "X": "feature", "O": "obstacle", "%": "wall" };
    const buckets = { wall: [], wall_alt: [], feature: [], obstacle: [] };
    const rows = def.map;
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        const proto = PROTO[rows[y][x]];
        if (!proto || !kit.parts[proto]) continue;
        const g = kit.parts[proto].geometry.clone();
        g.translate(x + 0.5, 0, y + 0.5);
        buckets[proto].push(g);
      }
    }
    for (const list of Object.values(buckets)) {
      if (!list.length) continue;
      const merged = this._track(mergeGeometries(list));
      for (const g of list) g.dispose();
      const mesh = new THREE.Mesh(merged, voxMaterial);
      mesh.castShadow = true; mesh.receiveShadow = true;
      scene.add(mesh);
    }

    // ---- water overlay (the ground texture paints the body) ---------------
    const waterTiles = [];
    for (let y = 0; y < rows.length; y++)
      for (let x = 0; x < rows[y].length; x++)
        if (rows[y][x] === "~") {
          const g = new THREE.PlaneGeometry(1, 1);
          g.rotateX(-Math.PI / 2);
          g.translate(x + 0.5, 0.04, y + 0.5);
          waterTiles.push(g);
        }
    if (waterTiles.length) {
      this.waterMat = this._track(new THREE.MeshBasicMaterial({
        color: 0x9fd8ff, transparent: true, opacity: 0.18,
      }));
      const g = this._track(mergeGeometries(waterTiles));
      for (const w2 of waterTiles) w2.dispose();
      scene.add(new THREE.Mesh(g, this.waterMat));
    }

    // ---- entities ----------------------------------------------------------
    this.views = [];
    this.props = hasModel("model_props") ? instantiate("model_props") : null;
    for (const e of ow.entities) this._makeView(e);

    // ---- the party ----------------------------------------------------------
    this.vince = this._rig("model_vince");
    this.howard = this._rig("model_howard");

    // ---- camera --------------------------------------------------------------
    this.cam = new THREE.PerspectiveCamera(FOV, VIEW_W / VIEW_H, 0.5, 80);
    this.target = new THREE.Vector3(ow.party.centerX() / TILE, 0, ow.party.feetY() / TILE);
    this._aim = this.target.clone();
    this.sync(0); // settle everything before the first frame
    this.cam.position.copy(this._camPos(this.target));
    this.cam.lookAt(this.target);
  }

  _rig(key) {
    const r = instantiate(key);
    if (r) this.scene.add(r.group);
    return r;
  }

  _propClone(name) {
    if (!this.props || !this.props.parts[name]) return null;
    const m = this.props.parts[name].clone(true);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  _makeView(e) {
    const g = new THREE.Group();
    const v = { e, group: g };
    const cx = e.px / TILE + 0.5, cz = e.py / TILE + 1.0;
    g.position.set(cx, 0, cz);

    if ((e.type === "npc" || e.type === "boss") && hasModel("model_" + e.sprite)) {
      v.rig = instantiate("model_" + e.sprite);
      g.add(v.rig.group);
      v.yaw = e.facing || "down";
    } else if (e.type === "npc" || e.type === "boss") {
      // billboard fallback: the existing PNG on a sprite (bosses until M5)
      const im = img(e.sprite);
      if (im) {
        const tex = this._track(e.type === "npc"
          ? spriteFromImage(im, 0, 0, 16 * ART, 24 * ART)
          : spriteFromImage(im, 0, 0, im.width, im.height));
        const mat = this._track(new THREE.SpriteMaterial({ map: tex, transparent: true }));
        const sp = new THREE.Sprite(mat);
        const sw = e.type === "npc" ? 1 : im.width / TILE;
        const sh = e.type === "npc" ? 1.5 : im.height / TILE;
        sp.scale.set(sw, sh, 1);
        sp.position.y = sh / 2;
        sp.center.set(0.5, 0.5);
        g.add(sp);
      }
    } else if (e.type === "search") {
      v.mesh = this._propClone(e.prop) || this._propClone("crate");
      if (v.mesh) g.add(v.mesh);
      v.searchFlag = e.flag || ("srch_" + e.x + "_" + e.y);
    } else if (e.type === "minigame") {
      v.mesh = this._propClone("urn"); // the potion cauldron
      if (v.mesh) g.add(v.mesh);
    } else if (e.type === "switch") {
      v.up = this._propClone("switch_up");
      v.down = this._propClone("switch_down");
      if (v.up) g.add(v.up);
      if (v.down) g.add(v.down);
    } else if (e.type === "gate") {
      v.closed = this._propClone("gate_closed");
      v.open = this._propClone("gate_open");
      if (v.closed) g.add(v.closed);
      if (v.open) g.add(v.open);
    } else if (e.type === "item" || e.type === "collectible") {
      const idx = e.type === "item"
        ? (ITEM_INDEX[e.item] || 0)
        : ((COLLECTIONS[e.set] && COLLECTIONS[e.set].icon) || 0);
      const tex = iconTexture(idx);
      if (tex) {
        const mat = this._track(new THREE.SpriteMaterial({ map: tex, transparent: true }));
        v.sprite = new THREE.Sprite(mat);
        v.sprite.scale.set(0.8, 0.8, 1);
        v.sprite.position.y = 0.55;
        g.add(v.sprite);
      }
      g.position.set(cx, 0, e.py / TILE + 0.5);
    } else if (e.type === "portal") {
      const col = new THREE.Color(e.color || "#9fe0ff");
      v.ringMat = this._track(new THREE.MeshBasicMaterial({ color: col }));
      v.ring = new THREE.Mesh(
        this._track(new THREE.TorusGeometry(0.42, 0.07, 6, 22)), v.ringMat);
      v.ring.rotation.x = Math.PI / 2;
      v.ring.position.y = 0.1;
      g.add(v.ring);
      const discMat = this._track(new THREE.MeshBasicMaterial({
        color: col, transparent: true, opacity: 0.25,
      }));
      const disc = new THREE.Mesh(this._track(new THREE.CircleGeometry(0.4, 18)), discMat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = 0.08;
      g.add(disc);
      g.position.set(cx, 0, e.py / TILE + 0.5);
    } else {
      return; // warps/triggers/shops/minigames are invisible markers
    }
    this.scene.add(g);
    this.views.push(v);
  }

  _camPos(target) {
    return new THREE.Vector3(
      target.x,
      target.y + DIST * Math.sin(-PITCH),
      target.z + DIST * Math.cos(-PITCH),
    );
  }

  sync(dt) {
    const ow = this.ow;
    this.t += dt;

    // ---- party rigs ----
    const px = ow.party.centerX() / TILE, pz = ow.party.feetY() / TILE;
    if (this.vince) {
      this.vince.group.position.x = px;
      this.vince.group.position.z = pz;
      face(this.vince, ow.party.dir, dt || 0.016);
      walk(this.vince, this.t, ow.party.moving, dt || 0.016);
    }
    if (this.howard) {
      this.howard.group.visible = !GS.flag("howard_taken");
      const f = ow.party.followerPose();
      this.howard.group.position.x = (f.x + 8 * ART) / TILE;
      this.howard.group.position.z = (f.y + 23 * ART) / TILE;
      face(this.howard, f.dir, dt || 0.016);
      walk(this.howard, this.t + 0.4, ow.party.moving, dt || 0.016);
    }

    // ---- entities ----
    for (const v of this.views) {
      const e = v.e;
      if (e._gone) { v.group.visible = false; continue; }
      if (e.type === "npc" && e.wander) // strollers track the sim's px/py
        v.group.position.set(e.px / TILE + 0.5, 0, e.py / TILE + 1.0);
      if (v.rig) { face(v.rig, e.facing || "down", dt || 0.016); walk(v.rig, this.t + e.animT, !!e._moving, dt || 0.016); }
      if (v.mesh) v.mesh.traverse((o) => { if (o.isMesh) o.material = GS.flag(v.searchFlag) ? fadedMaterial : voxMaterial; });
      if (v.up) { const on = GS.flag("sw_" + e.gate); v.up.visible = !on; v.down && (v.down.visible = on); }
      if (v.closed) { const open = GS.flag("sw_" + e.gate) || e._open; v.closed.visible = !open; v.open && (v.open.visible = open); }
      if (v.sprite) v.sprite.position.y = 0.55 + Math.sin(this.t * 3 + e.px) * 0.08;
      if (v.ring) {
        const open = GS.isUnlocked(e.to);
        v.ring.rotation.z = open ? this.t * 1.4 : 0;
        v.ringMat.color.set(open ? (e.color || "#9fe0ff") : "#555a70");
      }
    }
    if (this.waterMat) this.waterMat.opacity = 0.14 + 0.06 * Math.sin(this.t * 1.7);

    // ---- camera follow + clamped footprint ----
    const tm = ow.tilemap;
    const aim = this._aim.set(px, 0, pz);
    const hx = 7.6, zNear = 4.6, zFar = 6.2;
    if (tm.w > hx * 2) aim.x = Math.min(Math.max(aim.x, hx), tm.w - hx);
    else aim.x = tm.w / 2;
    if (tm.h > zNear + zFar) aim.z = Math.min(Math.max(aim.z, zFar), tm.h - zNear + 1.5);
    else aim.z = tm.h / 2 + 1;
    const k = dt ? 1 - Math.exp(-8 * dt) : 1;
    this.target.lerp(aim, k);
    this.cam.position.copy(this._camPos(this.target));
    this.cam.lookAt(this.target);

    // sun follows the camera target so the shadow map stays where the eye is
    this.sun.position.set(this.target.x + 6, 11, this.target.z + 4);
    this.sun.target.position.copy(this.target);
    if (this.torch) this.torch.position.set(px, 1.2, pz - 0.3);

    // outdoor zones breathe with the world clock (dawn/dusk/night)
    const amb = ambientFor(this.ow.def.id, GS);
    if (amb !== this._amb) {
      this._amb = amb;
      this.sun.intensity = 2.2 * (0.25 + 0.75 * amb);
      this.sun.color.set(amb < 0.6 ? 0x9fb0e8 : amb < 0.9 ? 0xffd9b0 : 0xfff2dd);
      if (amb < 0.8 && !this.torch) {
        this.torch = new THREE.PointLight(0xffe2aa, 12, 6.5, 1.6);
        this.scene.add(this.torch);
      } else if (amb >= 0.95 && this.torch) {
        this.scene.remove(this.torch);
        this.torch = null;
      }
    }
  }

  // draw the 3D world into the present chain, then the few 2D world-space
  // labels (portal names) projected onto the overlay
  render(ctx) {
    if (!Scene3D.renderWorld(this.scene, this.cam)) return false;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    const v3 = new THREE.Vector3();
    for (const v of this.views) {
      const e = v.e;
      if (e.type !== "portal" || e._gone) continue;
      const dpx = e.px - this.ow.party.px, dpy = e.py - this.ow.party.py;
      if (dpx * dpx + dpy * dpy > (TILE * 2.6) * (TILE * 2.6)) continue;
      const open = GS.isUnlocked(e.to);
      const lbl = open ? e.label : "???";
      v3.set(v.group.position.x, 1.2, v.group.position.z).project(this.cam);
      const sx = (v3.x * 0.5 + 0.5) * VIEW_W, sy = (-v3.y * 0.5 + 0.5) * VIEW_H;
      drawText(ctx, lbl, sx - textWidth(lbl) / 2, sy, { color: open ? "#fff" : "#888", shadow: "#000" });
    }
    return true;
  }

  dispose() {
    for (const r of this._own) r.dispose && r.dispose();
    this._own.length = 0;
    this.scene = null;
    this.ok = false;
  }
}
