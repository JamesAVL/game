"""preview_vox.py — dev-only isometric preview of voxel models (no engine
needed). Renders each person rig front-3/4 and back-3/4 into one PNG so art
can be judged from the terminal. Output name starts with _ so the Vite asset
plugin never ships it.   Usage: python preview_vox.py [out.png]
"""

import sys
from pnglib import Canvas, shade
from voxlib import build_person, person_palettes

U, V, H = 4, 2, 5   # iso projection scales (device px)


def project(x, y, z):
    return ((x - z) * U, (x + z) * V - y * H)


def draw_model(cv, ox, oy, voxels):
    # painter's algorithm for camera dir -(1,1,1): ascending x+y+z
    for (x, y, z) in sorted(voxels, key=lambda p: (p[0] + p[1] + p[2], p[1])):
        c = voxels[(x, y, z)]
        if (x + 1, y + 1, z + 1) in voxels and (x + 1, y, z) in voxels \
                and (x, y + 1, z) in voxels and (x, y, z + 1) in voxels:
            continue  # fully hidden from this camera
        corners = {}
        for dx in (0, 1):
            for dy in (0, 1):
                for dz in (0, 1):
                    px, py = project(x + dx, y + dy, z + dz)
                    corners[(dx, dy, dz)] = (ox + px, oy + py)
        top = [corners[(0, 1, 0)], corners[(1, 1, 0)],
               corners[(1, 1, 1)], corners[(0, 1, 1)]]
        right = [corners[(1, 0, 0)], corners[(1, 1, 0)],
                 corners[(1, 1, 1)], corners[(1, 0, 1)]]
        front = [corners[(0, 0, 1)], corners[(1, 0, 1)],
                 corners[(1, 1, 1)], corners[(0, 1, 1)]]
        cv.fill_poly(front, shade(c, -0.05))
        cv.fill_poly(right, shade(c, -0.3))
        cv.fill_poly(top, shade(c, 0.25))


def merged(parts, flip=False):
    out = {}
    for _, vox, _ in parts:
        for (x, y, z), c in vox.v.items():
            if flip:
                out[(-x, y, -z)] = c
            else:
                out[(x, y, z)] = c
    return out


def main(out):
    pals = person_palettes()
    names = sorted(pals)
    CELL_W, CELL_H = 170, 210
    cv = Canvas(CELL_W * len(names), CELL_H * 2, fill=(30, 28, 40, 255))
    for i, name in enumerate(names):
        parts = build_person(pals[name])
        draw_model(cv, i * CELL_W + CELL_W // 2, 170, merged(parts))
        draw_model(cv, i * CELL_W + CELL_W // 2, 170 + CELL_H, merged(parts, flip=True))
    cv.write(out)
    print("wrote", out, "(columns:", ", ".join(names) + "; row1 front-3/4, row2 back-3/4)")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "_preview_vox.png")
