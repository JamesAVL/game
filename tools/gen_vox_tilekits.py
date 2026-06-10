"""gen_vox_tilekits.py — per-zone 3D tile prototypes as GLB.

Each zone gets tilekit_<zone>.glb with four named meshes the runtime clones
and merges into chunk geometry:
  wall      1-tile cube, brick coursing painted on the shell (same h() hash
            idiom as gen_tiles.py, same palette -> the 2D ground texture and
            the 3D walls are one family)
  wall_alt  the variant course
  feature   1.5-tile-tall block (buildings/pillars) with accent banding
  obstacle  the zone's organic solid: tree / ice shard / coral / spire /
            crater / urn (mirrors gen_tiles.obstacle kinds)

Geometry origin: center of the tile footprint at ground level, so placement
is (x + 0.5, 0, y + 0.5) world units. 1 tile = 16 voxels = 1.0 unit.
"""

import os
from pnglib import shade
from gltflib import GLB
from voxlib import VOX, Vox, greedy_mesh
from gen_tiles import PALETTES, h

T = 16  # voxels per tile side


def brick_box(pal, alt=False):
    """A 1-tile cube with brick coursing painted on its four vertical faces."""
    base = pal["wall"] if not alt else shade(pal["wall"], -0.12)
    hi = pal["wall_hi"]
    mortar = shade(base, -0.25)
    bevel = shade(base, 0.1)
    v = Vox()
    v.box(0, 0, 0, T, T, T, base)
    for y in range(T):
        course = y // 4
        off = 6 if course % 2 else 0
        for u in range(T):
            # front/back faces (vary along x), then side faces (vary along z)
            for (x, z) in ((u, 0), (u, T - 1)):
                if y % 4 == 0 or (u + off) % 12 == 0:
                    v.set(x, y, z, mortar)
                elif y % 4 == 1 and h(u, y, 7) > 0.7:
                    v.set(x, y, z, bevel)
            for (x, z) in ((0, u), (T - 1, u)):
                if y % 4 == 0 or (u + off) % 12 == 0:
                    v.set(x, y, z, mortar)
                elif y % 4 == 1 and h(u, y, 13) > 0.7:
                    v.set(x, y, z, bevel)
    # lit top
    for x in range(T):
        for z in range(T):
            v.set(x, T - 1, z, hi if h(x, z, 3) > 0.25 else shade(hi, -0.08))
    return v


def feature_block(pal):
    """1.5-tile-tall 'building' block: banded, with a doorway-dark inset."""
    base = pal["wall"]
    hi = pal["wall_hi"]
    acc = pal.get("accent", hi)
    H = T + T // 2
    v = Vox()
    v.box(0, 0, 0, T, H, T, base)
    for y in range(H):
        for x in range(T):
            for z in (0, T - 1):
                if y % 5 == 0:
                    v.set(x, y, z, shade(base, -0.2))
                elif h(x, y, 11) > 0.82:
                    v.set(x, y, z, shade(base, 0.08))
        for z_ in range(T):
            for xe in (0, T - 1):
                if y % 5 == 0:
                    v.set(xe, y, z_, shade(base, -0.2))
    # accent cornice + lit top
    for x in range(T):
        for z in range(T):
            v.set(x, H - 1, z, hi)
        for z in (0, T - 1):
            v.set(x, H - 2, z, acc)
    for y in range(H):
        for z in range(T):
            for xe in (0, T - 1):
                if y == H - 2:
                    v.set(xe, y, z, acc)
    # dark window insets on the front
    for (wx, wy) in ((4, 12), (10, 12), (4, 6), (10, 6)):
        for dx in range(3):
            for dy in range(4):
                v.set(wx + dx, wy + dy, T - 1, shade(base, -0.5))
    return v


def obstacle_vox(kind, pal):
    base = pal["feat"]
    hi = pal["feat_hi"]
    dk = shade(base, -0.35)
    v = Vox()
    c = T // 2
    if kind == "tree":
        trunk = pal.get("trunk", (90, 65, 40))
        v.box(c - 2, 0, c - 2, 4, 8, 4, trunk)
        for y in range(0, 8):
            v.set(c - 2, y, c - 2, shade(trunk, -0.3))
        v.ellipsoid(c, 13, c, 7, 6, 7, base)
        v.ellipsoid(c - 3, 16, c - 2, 4, 3, 4, hi)
        v.ellipsoid(c + 4, 11, c + 3, 3, 3, 3, dk)
        for (lx, ly, lz) in ((c - 5, 18, c), (c + 3, 19, c - 3), (c, 20, c + 2)):
            v.set(lx, ly, lz, hi)
    elif kind == "ice":
        # a jagged shard cluster
        for (ox, oz, hgt, r) in ((c - 3, c - 2, 16, 4), (c + 4, c + 2, 10, 3), (c - 1, c + 4, 7, 2)):
            for y in range(hgt):
                rr = max(1, r * (hgt - y) // hgt)
                for x in range(-rr, rr + 1):
                    for z in range(-rr, rr + 1):
                        if x * x + z * z <= rr * rr:
                            col = hi if (x - z + y) % 5 == 0 else base
                            v.set(ox + x, y, oz + z, col)
        v.set(c - 3, 16, c - 2, (255, 255, 255))
    elif kind == "coral":
        for (ox, oz, hgt) in ((c - 5, c - 2, 9), (c, c + 2, 12), (c + 5, c - 1, 7)):
            v.box(ox - 1, 0, oz - 1, 3, hgt, 3, base)
            v.ellipsoid(ox, hgt, oz, 3, 2, 3, hi)
    elif kind == "spire":
        glow = pal.get("glow", (220, 120, 240))
        for y in range(18):
            rr = max(1, (18 - y) * 5 // 18)
            for x in range(-rr, rr + 1):
                for z in range(-rr, rr + 1):
                    if abs(x) + abs(z) <= rr:
                        v.set(c + x, y, c + z, hi if x < 0 else base)
        v.set(c, 18, c, glow)
        v.set(c, 17, c, glow)
        v.set(c - 1, 17, c, (255, 255, 255))
    elif kind == "crater":
        for x in range(T):
            for z in range(T):
                dx, dz = x - c + 0.5, z - c + 0.5
                d = (dx * dx + dz * dz) ** 0.5
                if 4.5 < d < 7.5:
                    v.set(x, 0, z, base)
                    v.set(x, 1, z, hi if d < 5.5 else base)
                    if 5 < d < 7 and h(x, z, 5) > 0.5:
                        v.set(x, 2, z, dk)
                elif d <= 4.5:
                    v.set(x, 0, z, dk)
    elif kind == "urn":
        for y, rr in ((0, 4), (1, 5), (2, 6), (3, 6), (4, 6), (5, 5), (6, 4), (7, 3), (8, 4), (9, 5)):
            for x in range(-rr, rr + 1):
                for z in range(-rr, rr + 1):
                    if x * x + z * z <= rr * rr:
                        col = hi if x < -rr // 2 else (dk if x > rr // 2 else base)
                        v.set(c + x, y, c + z, col)
    else:  # rock
        v.ellipsoid(c, 3, c, 6, 4, 5, base)
        v.ellipsoid(c - 3, 5, c - 2, 3, 2, 3, hi)
    return v


def main():
    here = os.path.dirname(__file__)
    models = os.path.join(here, "..", "assets", "models")
    os.makedirs(models, exist_ok=True)
    for name, (pal, kind) in sorted(PALETTES.items()):
        glb = GLB()
        protos = {
            "wall": brick_box(pal),
            "wall_alt": brick_box(pal, alt=True),
            "feature": feature_block(pal),
            "obstacle": obstacle_vox(kind, pal),
        }
        for pname, vox in protos.items():
            # origin: center of footprint at ground level
            positions, colors, indices = greedy_mesh(vox, origin=(T / 2, 0, T / 2))
            mesh = glb.add_mesh(pname, positions, colors, indices)
            glb.add_node(pname, mesh=mesh)
        out = os.path.join(models, "tilekit_" + name + ".glb")
        glb.write(out)
        print("wrote", out)


if __name__ == "__main__":
    main()
