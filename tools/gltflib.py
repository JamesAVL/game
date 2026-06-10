"""gltflib.py — a minimal, deterministic binary glTF (GLB) writer. Pure stdlib.

Writes exactly the subset our voxel pipeline needs:
  - meshes with POSITION (float32 VEC3) + COLOR_0 (normalized uint8 VEC4)
    + triangle indices (uint16, auto-promoted to uint32 when needed)
  - named nodes with optional translation + children (part rigs animate at
    runtime, so no rotation/scale/animation data is baked)
  - one shared flat material; NO normals on purpose — per the glTF spec a
    missing NORMAL attribute means flat shading, which three.js honours
    (GLTFLoader sets flatShading), giving the voxel look for free.

Determinism: output bytes are a pure function of the calls made — insertion-
ordered dicts, compact json separators, fixed little-endian packing. Identical
input -> identical .glb, mirroring pnglib's PNG determinism.
"""

import json
import struct

MAGIC = 0x46546C67          # "glTF"
CHUNK_JSON = 0x4E4F534A     # "JSON"
CHUNK_BIN = 0x004E4942      # "BIN\0"

FLOAT = 5126
UBYTE = 5121
USHORT = 5123
UINT = 5125
ARRAY_BUFFER = 34962
ELEMENT_ARRAY_BUFFER = 34963


def _pad(b, align, fill):
    rem = len(b) % align
    if rem:
        b += fill * (align - rem)
    return b


class GLB:
    """Accumulate meshes + nodes, then write a single self-contained .glb."""

    def __init__(self, generator="boosh-vox"):
        self.generator = generator
        self.bin = bytearray()
        self.buffer_views = []
        self.accessors = []
        self.meshes = []
        self.nodes = []
        self._child_set = set()

    # ---- low-level -------------------------------------------------------
    def _view(self, data, target):
        self.bin = _pad(self.bin, 4, b"\x00")
        off = len(self.bin)
        self.bin += data
        self.buffer_views.append({
            "buffer": 0, "byteOffset": off, "byteLength": len(data),
            "target": target,
        })
        return len(self.buffer_views) - 1

    def _accessor(self, view, comp, count, type_, normalized=False,
                  vmin=None, vmax=None):
        a = {"bufferView": view, "componentType": comp, "count": count,
             "type": type_}
        if normalized:
            a["normalized"] = True
        if vmin is not None:
            a["min"] = vmin
        if vmax is not None:
            a["max"] = vmax
        self.accessors.append(a)
        return len(self.accessors) - 1

    # ---- public ------------------------------------------------------------
    def add_mesh(self, name, positions, colors, indices):
        """positions: flat [x,y,z,...] floats; colors: flat [r,g,b,a,...]
        0-255 ints (len/4 == len(positions)/3); indices: triangle list.
        Returns the mesh index."""
        n = len(positions) // 3
        assert len(positions) == n * 3, "positions not a multiple of 3"
        assert len(colors) == n * 4, "colors must be RGBA per vertex"
        assert len(indices) % 3 == 0, "indices must form triangles"

        # POSITION (float32) with required min/max
        vmin = [min(positions[i::3]) for i in range(3)]
        vmax = [max(positions[i::3]) for i in range(3)]
        # round-trip through float32 so min/max match the packed data exactly
        pos_data = struct.pack("<%df" % len(positions), *positions)
        unpacked = struct.unpack("<%df" % len(positions), pos_data)
        vmin = [min(unpacked[i::3]) for i in range(3)]
        vmax = [max(unpacked[i::3]) for i in range(3)]
        pv = self._view(pos_data, ARRAY_BUFFER)
        pa = self._accessor(pv, FLOAT, n, "VEC3", vmin=vmin, vmax=vmax)

        # COLOR_0 (normalized uint8 RGBA)
        cv = self._view(bytes(colors), ARRAY_BUFFER)
        ca = self._accessor(cv, UBYTE, n, "VEC4", normalized=True)

        # indices (uint16 unless the mesh is huge)
        if n > 0xFFFF:
            idx_data = struct.pack("<%dI" % len(indices), *indices)
            icomp = UINT
        else:
            idx_data = struct.pack("<%dH" % len(indices), *indices)
            icomp = USHORT
        iv = self._view(idx_data, ELEMENT_ARRAY_BUFFER)
        ia = self._accessor(iv, icomp, len(indices), "SCALAR")

        self.meshes.append({
            "name": name,
            "primitives": [{
                "attributes": {"POSITION": pa, "COLOR_0": ca},
                "indices": ia, "material": 0, "mode": 4,
            }],
        })
        return len(self.meshes) - 1

    def add_node(self, name, mesh=None, translation=None, children=None):
        """Returns the node index. Nodes never named as a child are scene roots."""
        node = {"name": name}
        if mesh is not None:
            node["mesh"] = mesh
        if translation is not None and any(translation):
            node["translation"] = [float(v) for v in translation]
        if children:
            node["children"] = list(children)
            self._child_set.update(children)
        self.nodes.append(node)
        return len(self.nodes) - 1

    def write(self, path):
        roots = [i for i in range(len(self.nodes)) if i not in self._child_set]
        doc = {
            "asset": {"version": "2.0", "generator": self.generator},
            "scene": 0,
            "scenes": [{"nodes": roots}],
            "nodes": self.nodes,
            "meshes": self.meshes,
            "materials": [{
                "name": "vox",
                "pbrMetallicRoughness": {
                    "baseColorFactor": [1.0, 1.0, 1.0, 1.0],
                    "metallicFactor": 0.0,
                    "roughnessFactor": 1.0,
                },
            }],
            "buffers": [{"byteLength": len(_pad(bytearray(self.bin), 4, b"\x00"))}],
            "bufferViews": self.buffer_views,
            "accessors": self.accessors,
        }
        json_bytes = _pad(bytearray(
            json.dumps(doc, separators=(",", ":")).encode("utf-8")), 4, b"\x20")
        bin_bytes = _pad(bytearray(self.bin), 4, b"\x00")
        total = 12 + 8 + len(json_bytes) + 8 + len(bin_bytes)
        with open(path, "wb") as f:
            f.write(struct.pack("<III", MAGIC, 2, total))
            f.write(struct.pack("<II", len(json_bytes), CHUNK_JSON))
            f.write(json_bytes)
            f.write(struct.pack("<II", len(bin_bytes), CHUNK_BIN))
            f.write(bin_bytes)
