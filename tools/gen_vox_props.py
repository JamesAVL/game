"""gen_vox_props.py — the 12 searchable-scenery props as one props.glb.

Each prop is gen_props.py's own painter (same art, same palette) extruded
into voxels: paint at device resolution, downsample 3x (back to logical
pixels), extrude with a per-prop depth. Node names match PROP_INDEX keys in
src/data/items.js. Origin: center-bottom (feet), like the character rigs.
"""

import os
from pnglib import Canvas, CS
from gltflib import GLB
from voxlib import greedy_mesh, extrude_canvas
import gen_props

# logical depth (voxels) per prop — boxy things thick, flat things thin
DEPTHS = {
    "bin": 10, "snowmound": 12, "shell": 6, "urn": 9, "bush": 12,
    "crate": 11, "rock": 11, "switch_up": 10, "switch_down": 10,
    "gate_closed": 3, "gate_open": 3, "chest": 10,
}

NAMES = ["bin", "snowmound", "shell", "urn", "bush", "crate", "rock",
         "switch_up", "switch_down", "gate_closed", "gate_open", "chest"]


def main():
    here = os.path.dirname(__file__)
    models = os.path.join(here, "..", "assets", "models")
    os.makedirs(models, exist_ok=True)
    glb = GLB()
    for i, name in enumerate(NAMES):
        cv = Canvas(gen_props.FW, gen_props.FH, cs=CS)   # 48x72 device
        gen_props.PAINTERS[i](cv, 0)                      # no shadow, no rim
        vox = extrude_canvas(cv, down=3, depth=DEPTHS[name])
        # extrude_canvas yields x 0..15, y 0..23 (feet at y=0 after flip)
        positions, colors, indices = greedy_mesh(vox, origin=(8.0, 0.0, 0.0))
        mesh = glb.add_mesh(name, positions, colors, indices)
        glb.add_node(name, mesh=mesh)
    out = os.path.join(models, "props.glb")
    glb.write(out)
    print("wrote", out, "(%d props)" % len(NAMES))


if __name__ == "__main__":
    main()
