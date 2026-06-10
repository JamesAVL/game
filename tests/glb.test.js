// glb.test.js — locks the GLB contract between the Python voxel pipeline and
// the JS engine: container structure, accessor integrity, the quad-color
// invariant of greedy meshing, and the person-rig node names the runtime
// animation driver depends on.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const MODELS = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "models");

// the rig contract: voxanim drives exactly these parts
const PERSON_PARTS = ["armL", "armR", "head", "legL", "legR", "torso"];
const PERSON_MODELS = ["bollo", "fossil", "howard", "naboo", "vince"];

function parseGLB(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  expect(dv.getUint32(0, true)).toBe(0x46546c67); // magic "glTF"
  expect(dv.getUint32(4, true)).toBe(2);          // version
  expect(dv.getUint32(8, true)).toBe(buf.length); // total length

  const jsonLen = dv.getUint32(12, true);
  expect(dv.getUint32(16, true)).toBe(0x4e4f534a); // "JSON"
  expect(jsonLen % 4).toBe(0);
  const doc = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf-8"));

  const binOff = 20 + jsonLen;
  const binLen = dv.getUint32(binOff, true);
  expect(dv.getUint32(binOff + 4, true)).toBe(0x004e4942); // "BIN\0"
  expect(binLen % 4).toBe(0);
  expect(binOff + 8 + binLen).toBe(buf.length);
  const bin = buf.subarray(binOff + 8, binOff + 8 + binLen);
  return { doc, bin };
}

function accessorData(doc, bin, idx) {
  const acc = doc.accessors[idx];
  const view = doc.bufferViews[acc.bufferView];
  expect(view.byteOffset % 4).toBe(0);
  const slice = bin.subarray(view.byteOffset, view.byteOffset + view.byteLength);
  const comps = { VEC3: 3, VEC4: 4, SCALAR: 1 }[acc.type];
  const n = acc.count * comps;
  if (acc.componentType === 5126) return { acc, data: new Float32Array(slice.buffer, slice.byteOffset, n) };
  if (acc.componentType === 5121) return { acc, data: new Uint8Array(slice.buffer, slice.byteOffset, n) };
  if (acc.componentType === 5123) return { acc, data: new Uint16Array(slice.buffer, slice.byteOffset, n) };
  if (acc.componentType === 5125) return { acc, data: new Uint32Array(slice.buffer, slice.byteOffset, n) };
  throw new Error("unknown componentType " + acc.componentType);
}

const files = readdirSync(MODELS).filter((f) => f.endsWith(".glb")).sort();

describe("voxel GLB models", () => {
  it("the five person models exist", () => {
    for (const m of PERSON_MODELS) expect(files).toContain(m + ".glb");
  });

  for (const file of files) {
    describe(file, () => {
      const buf = readFileSync(join(MODELS, file));
      const { doc, bin } = parseGLB(buf);

      it("is a well-formed GLB the engine can trust", () => {
        expect(doc.asset.version).toBe("2.0");
        expect(doc.scenes[doc.scene].nodes.length).toBeGreaterThan(0);
        expect(doc.materials).toHaveLength(1);
        for (const mesh of doc.meshes) {
          const prim = mesh.primitives[0];
          expect(prim.mode).toBe(4);
          expect(prim.attributes.POSITION).toBeDefined();
          expect(prim.attributes.COLOR_0).toBeDefined();
          expect(prim.attributes.NORMAL).toBeUndefined(); // flat shading by spec
        }
      });

      it("accessors match the binary payload (counts, min/max)", () => {
        for (const mesh of doc.meshes) {
          const prim = mesh.primitives[0];
          const pos = accessorData(doc, bin, prim.attributes.POSITION);
          const col = accessorData(doc, bin, prim.attributes.COLOR_0);
          const idx = accessorData(doc, bin, prim.indices);
          expect(col.acc.count).toBe(pos.acc.count);
          expect(col.acc.normalized).toBe(true);
          for (let c = 0; c < 3; c++) {
            let lo = Infinity, hi = -Infinity;
            for (let i = c; i < pos.data.length; i += 3) {
              lo = Math.min(lo, pos.data[i]);
              hi = Math.max(hi, pos.data[i]);
            }
            expect(pos.acc.min[c]).toBe(lo);
            expect(pos.acc.max[c]).toBe(hi);
          }
          for (const i of idx.data) expect(i).toBeLessThan(pos.acc.count);
        }
      });

      it("indices form quads whose four corners share one color", () => {
        for (const mesh of doc.meshes) {
          const prim = mesh.primitives[0];
          const col = accessorData(doc, bin, prim.attributes.COLOR_0);
          const idx = accessorData(doc, bin, prim.indices);
          expect(idx.data.length % 6).toBe(0);
          for (let q = 0; q < idx.data.length; q += 6) {
            // greedy mesher emits [a, b, c, a, c, d]
            expect(idx.data[q + 3]).toBe(idx.data[q]);
            expect(idx.data[q + 4]).toBe(idx.data[q + 2]);
            const corners = [idx.data[q], idx.data[q + 1], idx.data[q + 2], idx.data[q + 5]];
            const r = col.data[corners[0] * 4], g = col.data[corners[0] * 4 + 1], b = col.data[corners[0] * 4 + 2];
            for (const v of corners) {
              expect(col.data[v * 4]).toBe(r);
              expect(col.data[v * 4 + 1]).toBe(g);
              expect(col.data[v * 4 + 2]).toBe(b);
              expect(col.data[v * 4 + 3]).toBe(255);
            }
          }
        }
      });

      if (PERSON_MODELS.includes(file.replace(".glb", ""))) {
        it("carries the person rig (root + 6 named parts with pivots)", () => {
          const names = doc.nodes.map((n) => n.name).sort();
          expect(names).toEqual([...PERSON_PARTS, "root"].sort());
          const root = doc.nodes.find((n) => n.name === "root");
          expect(root.children).toHaveLength(6);
          for (const part of PERSON_PARTS) {
            const node = doc.nodes.find((n) => n.name === part);
            expect(node.mesh).toBeDefined();
          }
          // pivots: hips/shoulders/neck sit above the feet, in tile units
          for (const part of ["armL", "armR", "head"]) {
            const node = doc.nodes.find((n) => n.name === part);
            expect(node.translation[1]).toBeGreaterThan(0.5);
          }
        });
      }
    });
  }
});
