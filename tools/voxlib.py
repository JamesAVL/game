"""voxlib.py — sparse voxel models + greedy meshing + the voxel person rig.

The 3D sibling of artlib/pnglib: every model is a dict of unit cubes, meshed
into merged quads (so a character part is dozens of faces, not thousands) and
written as GLB via gltflib. Everything is deterministic — iteration only ever
happens over sorted keys.

Conventions
  - +Y up, +X right, +Z toward the viewer (glTF right-handed). A character
    authored facing +Z faces "down" (toward the camera) in the game world.
  - 1 voxel = 1 logical art pixel = 1/16 tile (VOX below); a person is
    ~16 voxels wide = 1 tile, matching today's sprite metrics exactly.
  - Colors are RGB tuples (alpha is implicit 255); palettes come from
    artlib.PAL so the voxel cast and the 2D portraits stay one family.
"""

from pnglib import shade

VOX = 1.0 / 16.0  # world units per voxel (1 tile = 16 voxels)

# axis unit vectors, indexable by axis id
_AXES = ((1, 0, 0), (0, 1, 0), (0, 0, 1))


class Vox:
    """A sparse voxel volume: {(x,y,z): (r,g,b)}."""

    def __init__(self):
        self.v = {}

    def set(self, x, y, z, c):
        if len(c) == 4 and c[3] == 0:
            return
        self.v[(x, y, z)] = (c[0], c[1], c[2])

    def get(self, x, y, z):
        return self.v.get((x, y, z))

    def unset(self, x, y, z):
        self.v.pop((x, y, z), None)

    def box(self, x, y, z, w, h, d, c):
        for i in range(w):
            for j in range(h):
                for k in range(d):
                    self.set(x + i, y + j, z + k, c)

    def ellipsoid(self, cx, cy, cz, rx, ry, rz, c):
        for x in range(cx - rx, cx + rx + 1):
            for y in range(cy - ry, cy + ry + 1):
                for z in range(cz - rz, cz + rz + 1):
                    dx = (x - cx) / (rx + 0.5)
                    dy = (y - cy) / (ry + 0.5)
                    dz = (z - cz) / (rz + 0.5)
                    if dx * dx + dy * dy + dz * dz <= 1.0:
                        self.set(x, y, z, c)

    def merge(self, other, dx=0, dy=0, dz=0):
        for (x, y, z), c in sorted(other.v.items()):
            self.v[(x + dx, y + dy, z + dz)] = c

    def mirrored_x(self, about=0.0):
        """Mirror across the plane x = about (use about=-0.5 for even grids)."""
        out = Vox()
        for (x, y, z), c in sorted(self.v.items()):
            out.v[(int(2 * about) - x, y, z)] = c
        return out

    def paint_shell(self, axis, sign, fn):
        """Recolor the outermost voxel of each (u,v) column along an axis.
        fn(u, v, color) -> new color or None to keep. Used for faces, brick
        patterns, anything that lives on a surface."""
        cols = {}
        for (x, y, z) in self.v:
            p = (x, y, z)
            u, v, w = p[(axis + 1) % 3], p[(axis + 2) % 3], p[axis]
            cur = cols.get((u, v))
            if cur is None or (w > cur if sign > 0 else w < cur):
                cols[(u, v)] = w
        for (u, v), w in sorted(cols.items()):
            p = [0, 0, 0]
            p[(axis + 1) % 3], p[(axis + 2) % 3], p[axis] = u, v, w
            key = tuple(p)
            nc = fn(u, v, self.v[key])
            if nc is not None:
                self.v[key] = (nc[0], nc[1], nc[2])

    def bounds(self):
        ks = self.v.keys()
        if not ks:
            return (0, 0, 0, 0, 0, 0)
        xs = [k[0] for k in ks]
        ys = [k[1] for k in ks]
        zs = [k[2] for k in ks]
        return (min(xs), min(ys), min(zs), max(xs), max(ys), max(zs))


def greedy_mesh(vox, scale=VOX, origin=(0.0, 0.0, 0.0)):
    """Mesh a Vox into merged quads -> (positions, colors, indices).

    Classic 6-direction greedy mesher: for every exposed face, slices are
    swept and maximal same-color rectangles merged. Output is deterministic
    (sorted iteration). Vertices are (voxel - origin) * scale; origin is in
    voxel units, letting callers put part pivots at hips/shoulders/necks.
    """
    positions, colors, indices = [], [], []
    cells = vox.v

    for axis in range(3):
        ed = _AXES[axis]
        ua, va = (axis + 1) % 3, (axis + 2) % 3
        for sign in (1, -1):
            # group exposed faces by slice plane
            slices = {}
            for p in cells:
                n = (p[0] + sign * ed[0], p[1] + sign * ed[1], p[2] + sign * ed[2])
                if n in cells:
                    continue
                plane = p[axis] + (1 if sign > 0 else 0)
                slices.setdefault(plane, {})[(p[ua], p[va])] = cells[p]
            for plane in sorted(slices):
                mask = slices[plane]
                done = set()
                for (a, b) in sorted(mask):
                    if (a, b) in done:
                        continue
                    c = mask[(a, b)]
                    w = 1
                    while (a + w, b) in mask and (a + w, b) not in done \
                            and mask[(a + w, b)] == c:
                        w += 1
                    h = 1
                    grow = True
                    while grow:
                        for i in range(w):
                            cell = (a + i, b + h)
                            if cell not in mask or cell in done or mask[cell] != c:
                                grow = False
                                break
                        if grow:
                            h += 1
                    for i in range(w):
                        for j in range(h):
                            done.add((a + i, b + j))
                    # quad corners in voxel space
                    def corner(du, dv):
                        p = [0.0, 0.0, 0.0]
                        p[axis] = plane
                        p[ua] = a + du
                        p[va] = b + dv
                        return p
                    quad = [corner(0, 0), corner(w, 0), corner(w, h), corner(0, h)]
                    if sign < 0:
                        quad = [quad[0], quad[3], quad[2], quad[1]]
                    base = len(positions) // 3
                    for q in quad:
                        positions += [
                            (q[0] - origin[0]) * scale,
                            (q[1] - origin[1]) * scale,
                            (q[2] - origin[2]) * scale,
                        ]
                        colors += [c[0], c[1], c[2], 255]
                    indices += [base, base + 1, base + 2, base, base + 2, base + 3]
    return positions, colors, indices


def extrude_canvas(cv, down=3, depth=2):
    """Lift a pnglib.Canvas into a Vox: downsample the device raster by
    `down` (majority opaque color per block), then extrude each opaque cell
    symmetrically about z=0. `depth` is an int or callable(x, y, color)->int.
    The same trick normal_map() plays with luma, played with geometry."""
    out = Vox()
    bw, bh = cv.w // down, cv.h // down
    for by in range(bh):
        for bx in range(bw):
            tally = {}
            for dy in range(down):
                for dx in range(down):
                    r, g, b, a = cv._dget(bx * down + dx, by * down + dy)
                    if a >= 128:
                        key = (r, g, b)
                        tally[key] = tally.get(key, 0) + 1
            if not tally:
                continue
            color = sorted(tally.items(), key=lambda kv: (-kv[1], kv[0]))[0][0]
            d = depth(bx, by, color) if callable(depth) else depth
            x = bx
            y = bh - 1 - by          # canvas y-down -> world y-up
            for z in range(-(d // 2), d - d // 2):
                out.set(x, y, z, color)
    return out


# ---------------------------------------------------------------------------
# The voxel person rig — artlib.draw_person reborn in 3D.
# Returns [(part_name, Vox, pivot_xyz)] where vox coords are ABSOLUTE in the
# model grid (feet center = (0,0,0), +Z = facing) and pivot is the rotation
# origin in the same units. gen scripts mesh each part with origin=pivot and
# set node.translation = pivot * VOX so runtime rotation swings correctly.
# ---------------------------------------------------------------------------

def build_person(pal):
    """pal keys (same family as artlib): skin, skin_d, hair, hair_hi, top,
    top_hi, bottom, shoe, hair_style (vince|short|turban|fur|bald),
    accessory ("moustache"|None), robe (bool — skirt instead of legs)."""
    skin = pal["skin"]
    skin_d = pal.get("skin_d", shade(skin, -0.2))
    skin_hi = shade(skin, 0.16)
    hair = pal["hair"]
    hair_hi = pal.get("hair_hi", shade(hair, 0.3))
    top = pal["top"]
    top_hi = pal.get("top_hi", shade(top, 0.25))
    top_sh = shade(top, -0.28)
    bottom = pal["bottom"]
    bottom_sh = shade(bottom, -0.32)
    shoe = pal.get("shoe", (24, 20, 32))
    style = pal.get("hair_style", "short")
    ink = (40, 34, 52)
    white = (244, 244, 255)
    robe = pal.get("robe", False)

    parts = []

    # ---- legs (y 0..8: boots 0..1, trousers 2..8) --------------------------
    for name, x0 in (("legL", -4), ("legR", 1)):
        leg = Vox()
        col = top if robe else bottom
        col_sh = top_sh if robe else bottom_sh
        leg.box(x0, 2, -1, 3, 7, 3, col)
        for y in range(2, 9):                    # inner crease shadow
            leg.set(x0 + (2 if x0 < 0 else 0), y, 1, col_sh)
        leg.box(x0, 0, -1, 3, 2, 3, shoe)        # boot
        leg.box(x0, 0, 2, 3, 1, 1, shoe)         # toe cap
        leg.set(x0 + 1, 1, 2, shade(shoe, 0.35))
        parts.append((name, leg, (x0 + 1.5, 9.0, 0.5)))

    # ---- torso (y 9..16) ----------------------------------------------------
    torso = Vox()
    torso.box(-4, 9, -2, 9, 8, 5, top)
    for y in range(9, 17):                       # left highlight / right shade
        for z in range(-2, 3):
            torso.set(-4, y, z, top_hi)
            torso.set(4, y, z, top_sh)
    for x in range(-4, 5):                       # hem
        for z in range(-2, 3):
            torso.set(x, 9, z, top_sh)
    for x in range(-2, 3):                       # collar front
        torso.set(x, 16, 2, shade(top, 0.12))
    for y in range(10, 16):                      # centre seam front
        torso.set(0, y, 2, shade(top, -0.16))
    if robe:                                     # robe skirt flares over hips
        torso.box(-4, 7, -2, 9, 2, 5, top)
        for x in range(-4, 5):
            for z in range(-2, 3):
                torso.set(x, 7, z, top_sh)
    # neck
    torso.box(-1, 17, -1, 3, 1, 3, skin_d)
    parts.append(("torso", torso, (0.0, 9.0, 0.5)))

    # ---- arms (y 9..15 from shoulder, hands at bottom) ----------------------
    arm_col = shade(top, -0.12)
    for name, x0 in (("armL", -6), ("armR", 5)):
        arm = Vox()
        arm.box(x0, 10, -1, 2, 6, 2, arm_col)
        arm.box(x0, 8, -1, 2, 2, 2, skin)        # hand
        for y in range(10, 16):
            arm.set(x0 if x0 < 0 else x0 + 1, y, 0, shade(top, -0.3))
        parts.append((name, arm, (x0 + 1.0, 15.5, 0.0)))

    # ---- head (y 18..24, face on the +Z shell) ------------------------------
    head = Vox()
    head.box(-3, 18, -3, 7, 7, 7, skin)
    for (x, y, z) in [p for p in sorted(head.v) if True]:
        # knock off the 8 cube corners for a rounder skull
        if abs(x) == 3 and abs(z) == 3 and (y == 18 or y == 24):
            head.unset(x, y, z)
    for y in range(19, 24):                      # cheek shading
        for z in range(-2, 3):
            head.set(-3, y, z, skin_d if y < 22 else skin)
            head.set(3, y, z, shade(skin, -0.14))
    for x in range(-2, 1):                       # forehead highlight
        head.set(x, 23, 3, skin_hi)

    def face(u, v, c):
        # u = x, v = y on the +Z shell
        if v == 21 and u in (-2, 1):
            return white
        if v == 21 and u in (-1, 2):
            return ink
        if v == 22 and u in (-2, -1, 1, 2):
            return hair                          # brows
        if v == 20 and u == 0:
            return skin_d                        # nose
        if v == 19 and -1 <= u <= 1:
            return shade(skin, -0.3)             # mouth
        return None
    head.paint_shell(2, 1, face)

    _build_hair(head, style, hair, hair_hi)

    if pal.get("accessory") == "moustache":
        for x in range(-2, 3):
            head.set(x, 19, 4, hair)             # proud and protruding
        head.set(-2, 19, 4, shade(hair, 0.25))
    parts.append(("head", head, (0.0, 18.0, 0.5)))

    return parts


def _build_hair(head, style, hair, hair_hi):
    if style == "vince":
        # the mane: a dome wider than the head, fuller at the back
        head.ellipsoid(0, 25, -1, 5, 4, 4, hair)
        head.ellipsoid(0, 23, -2, 5, 4, 3, hair)
        for x in range(-4, 5):                   # fringe over the forehead
            head.set(x, 24, 3, hair)
            if abs(x) > 1:
                head.set(x, 23, 3, hair)
        for x in (-4, -2, 0, 2, 4):              # spiky crown
            head.set(x, 28, -1, hair)
            head.set(x, 29 if x == 0 else 28, 0 if x == 0 else -1, hair)
        for x in (-3, 0, 3):                     # backcomb highlights
            head.set(x, 27, 0, hair_hi)
            head.set(x, 26, 2, hair_hi)
    elif style == "short":
        head.box(-3, 24, -3, 7, 2, 7, hair)
        head.box(-3, 19, -4, 7, 6, 1, hair)      # back of head
        for x in (-2, 0, 1):
            head.set(x, 25, 1, hair_hi)
    elif style == "turban":
        head.box(-4, 23, -4, 9, 3, 9, hair)
        for x in range(-4, 5):                   # wrap fold line
            head.set(x, 23, 4, shade(hair, -0.3))
        head.box(2, 24, 4, 2, 2, 1, hair_hi)     # jewel/fold
        head.set(2, 25, 4, (244, 244, 255))
    elif style == "fur":
        # fur frames the whole head, face stays open
        head.box(-4, 18, -4, 9, 8, 2, hair)      # back
        head.box(-4, 24, -4, 9, 2, 9, hair)      # crown
        for y in range(18, 25):                  # sides
            for z in range(-3, 4):
                head.set(-4, y, z, hair)
                head.set(4, y, z, hair)
        for x in (-3, 0, 3):
            head.set(x, 25, 2, hair_hi)
    elif style == "bald":
        head.box(-3, 19, -4, 7, 4, 1, hair)      # back rim only
        head.set(-3, 22, -3, hair)
        head.set(3, 22, -3, hair)


def person_palettes():
    """Voxel palettes for the five core cast, straight from artlib."""
    import artlib
    vince, howard = artlib.hero_palettes()
    vince = dict(vince)
    howard = dict(howard)
    howard["accessory"] = "moustache"
    vince.pop("accessory", None)
    PAL = artlib.PAL
    naboo = {
        "skin": (210, 168, 120), "skin_d": (176, 138, 96),
        "hair": PAL["naboo_turban"], "hair_hi": PAL["naboo_robe_hi"],
        "top": PAL["naboo_robe"], "top_hi": PAL["naboo_robe_hi"],
        "bottom": (80, 54, 140), "shoe": (60, 40, 110),
        "hair_style": "turban", "robe": True,
    }
    bollo = {
        "skin": (78, 64, 64), "skin_d": (58, 46, 48),
        "hair": PAL["bollo_fur"], "hair_hi": PAL["bollo_fur_hi"],
        "top": PAL["bollo_fur"], "top_hi": PAL["bollo_fur_hi"],
        "bottom": PAL["bollo_fur"], "shoe": (40, 32, 34), "hair_style": "fur",
    }
    fossil = {
        "skin": (228, 184, 150), "skin_d": (190, 150, 122),
        "hair": (120, 96, 70), "hair_hi": (150, 124, 96),
        "top": PAL["fossil_shirt"], "top_hi": (236, 222, 160),
        "bottom": PAL["fossil_short"], "shoe": (70, 54, 40), "hair_style": "bald",
    }
    return {"vince": vince, "howard": howard, "naboo": naboo,
            "bollo": bollo, "fossil": fossil}
