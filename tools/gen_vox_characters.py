"""gen_vox_characters.py — voxel GLB models for the playable cast + NPCs.

One model per character (16 sprite frames become 1 rig): facing is a runtime
Y-rotation, walking is runtime part rotation (legs/arms swing about the
pivots baked here as node translations). Output: assets/models/<name>.glb
"""

import os
from gltflib import GLB
from voxlib import VOX, greedy_mesh, build_person, person_palettes


def save_person(pal, out):
    glb = GLB()
    children = []
    for name, vox, pivot in build_person(pal):
        positions, colors, indices = greedy_mesh(vox, origin=pivot)
        mesh = glb.add_mesh(name, positions, colors, indices)
        children.append(glb.add_node(
            name, mesh=mesh,
            translation=(pivot[0] * VOX, pivot[1] * VOX, pivot[2] * VOX)))
    glb.add_node("root", children=children)
    glb.write(out)
    print("wrote", out, "(%d parts)" % len(children))


def main():
    here = os.path.dirname(__file__)
    models = os.path.join(here, "..", "assets", "models")
    os.makedirs(models, exist_ok=True)
    for name, pal in sorted(person_palettes().items()):
        save_person(pal, os.path.join(models, name + ".glb"))


if __name__ == "__main__":
    main()
