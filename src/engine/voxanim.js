// voxanim.js — part-transform drivers for the voxel person rigs (gltf.js
// instantiate() -> { group, parts: {legL, legR, armL, armR, torso, head} }).
// One model replaces 16 sprite frames: facing is a smoothed Y-rotation of the
// whole group, walking is limb rotation about the pivots baked by the Python
// pipeline. Pure math, no three import needed beyond the objects themselves.

// facing -> group yaw. Models are authored facing +Z, which is "down"
// (toward the camera) in world space.
const YAW = { down: 0, up: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };

function shortestTurn(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function face(rig, dir, dt) {
  const want = YAW[dir] !== undefined ? YAW[dir] : 0;
  const cur = rig.group.rotation.y;
  rig.group.rotation.y = cur + shortestTurn(cur, want) * Math.min(1, dt * 16);
}

// walk-cycle: phase advances outside (tied to the sim's anim frame timing so
// 2D and 3D step on the same beat); amplitude eases in/out with `moving`.
export function walk(rig, t, moving, dt) {
  const p = rig.parts;
  rig._amp = (rig._amp || 0) + ((moving ? 1 : 0) - (rig._amp || 0)) * Math.min(1, dt * 12);
  const a = rig._amp;
  const ph = Math.sin(t * 9) * a;
  if (p.legL) p.legL.rotation.x = ph * 0.55;
  if (p.legR) p.legR.rotation.x = -ph * 0.55;
  if (p.armL) p.armL.rotation.x = -ph * 0.45;
  if (p.armR) p.armR.rotation.x = ph * 0.45;
  // step bounce + idle breath
  const bounce = Math.abs(Math.sin(t * 9)) * 0.045 * a;
  const breath = (1 - a) * Math.sin(t * 2.2) * 0.012;
  rig.group.position.y = bounce + Math.max(0, breath);
  if (p.head) p.head.rotation.x = Math.sin(t * 9 * 0.5) * 0.04 * a;
}

// celebratory / pickup hop (visual only)
export function hop(rig, t01) {
  rig.group.position.y = Math.sin(Math.min(1, t01) * Math.PI) * 0.35;
}

// crimp-stage dance: bob to the beat, swing limbs, squash on bass
export function dance(rig, t, bass = 0) {
  const p = rig.parts;
  rig.group.position.y = Math.abs(Math.sin(t * 6)) * (0.1 + bass * 0.18);
  const sw = Math.sin(t * 6);
  if (p.armL) { p.armL.rotation.x = sw * 0.9; p.armL.rotation.z = 0.3 + bass * 0.5; }
  if (p.armR) { p.armR.rotation.x = -sw * 0.9; p.armR.rotation.z = -0.3 - bass * 0.5; }
  if (p.legL) p.legL.rotation.x = sw * 0.2;
  if (p.legR) p.legR.rotation.x = -sw * 0.2;
  if (p.head) p.head.rotation.z = Math.sin(t * 3) * 0.12;
  const squash = 1 - bass * 0.06;
  rig.group.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
}
