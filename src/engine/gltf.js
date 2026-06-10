// gltf.js — loading + instancing for the procedural voxel GLB models.
//
// The Python pipeline (tools/gltflib.py) writes minimal binary glTF: meshes
// with POSITION + COLOR_0 and named part nodes whose translations are the
// rig pivots. This module parses them once (cached like img()) and stamps out
// instances: every mesh gets one shared flat-shaded vertex-color material so
// the whole voxel world is a single material family (and a tiny GPU state).
//
// Color management is bypassed engine-wide (see scene3d.js): palette bytes in
// the GLB are the same bytes the 2D art uses, and they pass through untouched.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const loader = new GLTFLoader();
const models = {}; // key -> THREE.Group (master copy, never in a scene)

// one material to rule the voxel look: lit, flat-shaded via derivatives
// (our GLBs ship no normals — the glTF flat-shading contract), vertex colors.
export const voxMaterial = new THREE.MeshLambertMaterial({
  vertexColors: true,
  flatShading: true,
});

export function loadModel(key, url) {
  return fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(r.status + " " + url);
      return r.arrayBuffer();
    })
    .then((buf) => new Promise((res, rej) => loader.parse(buf, "", res, rej)))
    .then((gltf) => {
      gltf.scene.traverse((o) => {
        if (o.isMesh) {
          o.material = voxMaterial;
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      models[key] = gltf.scene;
      return gltf.scene;
    });
}

export function hasModel(key) { return !!models[key]; }

// Stamp out an instance: a deep clone of the node tree (geometry + material
// stay shared) plus a name -> node map so voxanim can drive the rig parts.
export function instantiate(key) {
  const master = models[key];
  if (!master) return null;
  const group = master.clone(true);
  const parts = {};
  group.traverse((o) => { if (o.name) parts[o.name] = o; });
  return { group, parts };
}
