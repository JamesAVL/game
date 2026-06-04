// light.js — cheap dynamic 2D lighting for the overworld.
//
// A scene is darkened to a per-zone "ambient" level, then light sources punch
// brightness back in. Implemented as a multiply composite: we render to an
// offscreen light buffer (ambient grey + additive radial light gradients), then
// multiply it over the scene. Lit pools return to full scene brightness (and
// pick up the renderer's bloom); everything else sits in atmospheric gloom.
//
// Lights are given in screen-space coordinates: { x, y, r, color:[r,g,b],
// intensity }. Fully-lit zones (level >= 1) skip the whole pass.

let buf = null, bctx = null;

function ensureBuf(w, h) {
  if (!buf || buf.width !== w || buf.height !== h) {
    buf = document.createElement("canvas");
    buf.width = w;
    buf.height = h;
    bctx = buf.getContext("2d");
  }
  return bctx;
}

export function renderLighting(ctx, level, lights, w, h) {
  if (level >= 0.999) return; // fully lit — nothing to darken
  const l = ensureBuf(w, h);

  // ambient floor: a flat grey whose brightness IS the multiply factor
  l.globalCompositeOperation = "source-over";
  const base = Math.max(0, Math.min(255, Math.round(level * 255)));
  l.fillStyle = `rgb(${base},${base},${base})`;
  l.fillRect(0, 0, w, h);

  // light sources add brightness (and a touch of colour) back in
  l.globalCompositeOperation = "lighter";
  for (const li of lights) {
    const c = li.color || [255, 220, 150];
    const k = li.intensity == null ? 1 : li.intensity;
    const g = l.createRadialGradient(li.x, li.y, 0, li.x, li.y, li.r);
    g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${k})`);
    g.addColorStop(0.6, `rgba(${c[0]},${c[1]},${c[2]},${k * 0.35})`);
    g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    l.fillStyle = g;
    l.fillRect(li.x - li.r, li.y - li.r, li.r * 2, li.r * 2);
  }

  // darken the scene by the light buffer
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(buf, 0, 0);
  ctx.globalCompositeOperation = "source-over";
}
