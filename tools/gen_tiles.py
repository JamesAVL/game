"""gen_tiles.py — one 16x16 tileset strip per world.

Each strip has 12 tiles in the index order documented in game/world.js:
  0 floor  1 floor2  2 wall  3 wall-alt  4 obstacle  5 deco
  6 path   7 water   8 door  9 accent    10 deco2     11 solid-feature
A generic painter draws them from a per-zone palette, with a zone-specific
"obstacle" shape (tree / ice / coral / spire / crater / urn).
"""

import os
from pnglib import Canvas, shade, CS

T = 48   # tiles authored natively at engine ART=3 resolution (cs=1)


def h(x, y, seed):  # cheap deterministic hash -> 0..1
    v = (x * 374761393 + y * 668265263 + seed * 982451653) & 0xFFFFFFFF
    v = (v ^ (v >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((v ^ (v >> 16)) & 0xFFFF) / 65535.0


def floor(cv, ox, base, spec, seed, density=0.10):
    cv.rect(ox, 0, T, T, base)
    spec2 = shade(base, 0.10)
    spec3 = shade(base, -0.08)
    for y in range(T):
        for x in range(T):
            r = h(x, y, seed)
            if r < density:
                cv.set(ox + x, y, spec)
            elif r < density + 0.05:
                cv.set(ox + x, y, spec2)
            elif r < density + 0.09:
                cv.set(ox + x, y, spec3)   # third speckle tone -> richer grain


def wall(cv, ox, base, hi, lo):
    cv.rect(ox, 0, T, T, base)
    cv.rect(ox, 0, T, 3, hi)
    cv.rect(ox, T - 3, T, 3, lo)
    bevel = shade(base, 0.12)
    mortar = shade(base, -0.22)
    for i, ry in enumerate(range(0, T, 12)):    # brick rows (12px tall)
        cv.hline(ox, ry, T, mortar)
        cv.hline(ox, ry + 1, T, bevel)
        off = 0 if i % 2 == 0 else 12           # running bond
        for sx in range(off, T + 1, 24):        # 24px bricks
            cv.vline(ox + (sx % T), ry, 12, mortar)
            cv.vline(ox + (sx % T) + 1, ry + 1, 10, bevel)


def obstacle(cv, ox, kind, pal):
    base = pal["feat"]; hi = pal["feat_hi"]; dk = shade(base, -0.35)
    floor(cv, ox, pal["floor"], pal["floor2"], 1, 0.06)
    cx = ox + 24
    if kind == "tree":
        trunk = pal.get("trunk", (90, 65, 40))
        cv.rect(cx - 3, 27, 6, 18, trunk); cv.vline(cx - 3, 27, 18, shade(trunk, -0.3))
        cv.vline(cx + 1, 27, 17, shade(trunk, 0.2))
        cv.ellipse(cx, 18, 18, 15, base)
        cv.ellipse(cx - 6, 12, 10, 9, hi)
        cv.ellipse(cx + 9, 21, 8, 7, dk)
        for (lx, ly) in [(cx - 12, 9), (cx + 6, 6), (cx + 14, 17), (cx - 14, 21), (cx, 8)]:
            cv.set(lx, ly, hi); cv.set(lx + 1, ly, hi)
    elif kind == "ice":
        cv.fill_poly([(cx - 15, 42), (cx - 6, 12), (cx + 3, 24), (cx + 12, 9), (cx + 18, 42)], base)
        cv.line(cx - 3, 18, cx + 6, 39, hi)
        cv.line(cx + 9, 15, cx + 13, 36, shade(base, -0.2))
        cv.ellipse(cx, 15, 3, 3, (255, 255, 255))
    elif kind == "coral":
        cv.rect(cx - 3, 24, 6, 21, base)
        cv.rect(cx - 12, 18, 6, 18, base); cv.rect(cx + 9, 15, 6, 24, base)
        cv.rect(cx - 12, 18, 6, 5, hi); cv.rect(cx + 9, 15, 6, 5, hi)
        cv.ellipse(cx, 21, 5, 5, hi); cv.ellipse(cx - 9, 18, 3, 3, hi)
    elif kind == "spire":
        cv.fill_poly([(cx - 12, 45), (cx, 6), (cx + 12, 45)], base)
        cv.fill_poly([(cx - 12, 45), (cx, 6), (cx, 45)], hi)
        glow = pal.get("glow", (220, 120, 240))
        cv.ellipse(cx, 14, 3, 4, glow); cv.ellipse(cx, 9, 2, 2, (255, 255, 255))
    elif kind == "crater":
        cv.ellipse(cx, 33, 18, 12, dk)
        cv.ellipse(cx, 30, 18, 12, base, fill=False)
        cv.ellipse(cx, 33, 9, 6, shade(base, -0.2))
        cv.ellipse(cx - 5, 30, 3, 2, hi)
    elif kind == "urn":
        cv.ellipse(cx, 27, 12, 15, base)
        cv.rect(cx - 6, 9, 12, 6, hi); cv.rect(cx - 8, 14, 16, 3, shade(base, -0.2))
        cv.ellipse(cx - 3, 24, 5, 8, hi)
        cv.ellipse(cx + 5, 30, 3, 5, dk)
    else:  # rock
        cv.ellipse(cx, 30, 18, 15, base)
        cv.ellipse(cx - 6, 24, 9, 6, hi)
        cv.line(cx + 3, 21, cx + 8, 39, dk)


def water(cv, ox, deep, shallow, seed):
    cv.rect(ox, 0, T, T, deep)
    mid = shade(deep, 0.12)
    for y in range(T):
        for x in range(T):
            r = h(x, y, seed)
            if r < 0.10:
                cv.set(ox + x, y, shallow)
            elif r < 0.18:
                cv.set(ox + x, y, mid)
    # ripple lines
    for (rx, ry, w) in [(6, 12, 15), (27, 21, 14), (12, 33, 16), (30, 40, 11), (3, 27, 9)]:
        cv.hline(ox + rx, ry, w, shallow)
        cv.hline(ox + rx + 1, ry + 1, w - 2, mid)


def deco(cv, ox, pal, kind="plant"):
    floor(cv, ox, pal["floor"], pal["floor2"], 3, 0.06)
    cx = ox + 24
    c = pal.get("deco", (90, 150, 70)); hi = shade(c, 0.3); dk = shade(c, -0.3)
    if kind == "plant":
        for dx in (-8, -2, 4, 9):
            cv.line(cx + dx, 39, cx + dx + (dx // 3), 21, c)
        cv.line(cx, 40, cx, 18, c)
        cv.set(cx, 18, hi); cv.set(cx - 6, 24, hi); cv.set(cx + 6, 22, hi)
    else:
        cv.ellipse(cx, 33, 9, 6, c)
        cv.ellipse(cx - 3, 30, 3, 2, hi)
        cv.set(cx + 5, 34, dk)


def make(pal, kind, out):
    cv = Canvas(T * 12, T, cs=1)   # T=48 native
    floor(cv, 0 * T, pal["floor"], pal["floor2"], 1, 0.10)            # 0
    floor(cv, 1 * T, pal["floor"], shade(pal["floor"], -0.12), 2, 0.16)  # 1
    wall(cv, 2 * T, pal["wall"], pal["wall_hi"], shade(pal["wall"], -0.35))  # 2
    wall(cv, 3 * T, shade(pal["wall"], -0.15), pal["wall_hi"], shade(pal["wall"], -0.45))  # 3
    obstacle(cv, 4 * T, kind, pal)                                    # 4
    deco(cv, 5 * T, pal, "plant")                                     # 5
    floor(cv, 6 * T, pal["path"], shade(pal["path"], 0.1), 4, 0.10)   # 6 path
    water(cv, 7 * T, pal["water"], pal["water_hi"], 5)                # 7
    # 8 door / threshold
    floor(cv, 8 * T, pal["path"], shade(pal["path"], -0.1), 6, 0.05)
    cv.rect_outline(8 * T + 9, 9, 30, 30, shade(pal["path"], -0.3))
    cv.rect_outline(8 * T + 11, 11, 26, 26, shade(pal["path"], -0.15))
    # 9 accent / portal pad
    floor(cv, 9 * T, pal["accent"], shade(pal["accent"], 0.2), 7, 0.08)
    cv.rect_outline(9 * T + 6, 6, 36, 36, shade(pal["accent"], -0.25))
    cv.ellipse(9 * T + 24, 24, 8, 8, shade(pal["accent"], 0.25))
    deco(cv, 10 * T, pal, "rock")                                     # 10
    # 11 solid feature (building / pillar block)
    cv.rect(11 * T, 0, T, T, pal["wall"])
    cv.rect(11 * T, 0, T, 8, pal["wall_hi"])
    cv.rect_outline(11 * T, 0, T, T, shade(pal["wall"], -0.4))
    cv.rect(11 * T + 14, 14, 21, 24, shade(pal["wall"], -0.5))
    cv.rect(11 * T + 17, 17, 15, 18, shade(pal["wall"], -0.3))
    cv.write(out)
    print("wrote", out)


PALETTES = {
    "hub": (dict(floor=(96, 156, 78), floor2=(84, 142, 66), wall=(156, 156, 172), wall_hi=(190, 190, 206),
                 feat=(60, 120, 58), feat_hi=(96, 168, 88), trunk=(96, 66, 42), path=(196, 180, 134),
                 water=(70, 120, 200), water_hi=(130, 180, 235), accent=(214, 184, 96), deco=(70, 140, 64)), "tree"),
    "tundra": (dict(floor=(206, 228, 242), floor2=(220, 238, 250), wall=(150, 196, 226), wall_hi=(200, 226, 244),
                    feat=(176, 212, 240), feat_hi=(232, 245, 255), path=(186, 214, 238),
                    water=(94, 154, 212), water_hi=(150, 200, 240), accent=(180, 220, 246), deco=(150, 196, 220)), "ice"),
    "sea": (dict(floor=(46, 96, 116), floor2=(40, 86, 104), wall=(196, 92, 122), wall_hi=(230, 140, 165),
                 feat=(220, 96, 130), feat_hi=(255, 150, 180), path=(120, 150, 150),
                 water=(20, 60, 92), water_hi=(60, 120, 160), accent=(120, 220, 200), deco=(80, 170, 150)), "coral"),
    "forest": (dict(floor=(74, 114, 58), floor2=(64, 102, 50), wall=(92, 66, 44), wall_hi=(128, 96, 64),
                    feat=(58, 116, 54), feat_hi=(96, 162, 84), trunk=(86, 60, 38), path=(124, 98, 66),
                    water=(60, 112, 150), water_hi=(110, 160, 190), accent=(210, 170, 80), deco=(72, 132, 60)), "tree"),
    "night": (dict(floor=(44, 32, 64), floor2=(52, 38, 74), wall=(74, 44, 96), wall_hi=(110, 70, 140),
                   feat=(96, 54, 120), feat_hi=(150, 96, 180), glow=(220, 120, 240), path=(64, 46, 86),
                   water=(120, 44, 140), water_hi=(180, 90, 200), accent=(180, 90, 210), deco=(120, 70, 150)), "spire"),
    "moon": (dict(floor=(178, 180, 198), floor2=(166, 168, 188), wall=(138, 140, 162), wall_hi=(196, 198, 214),
                  feat=(150, 152, 174), feat_hi=(210, 212, 226), path=(196, 198, 212),
                  water=(110, 120, 170), water_hi=(160, 170, 210), accent=(232, 230, 184), deco=(150, 152, 174)), "crater"),
    "temple": (dict(floor=(152, 122, 88), floor2=(140, 112, 80), wall=(182, 152, 112), wall_hi=(214, 188, 142),
                    feat=(202, 176, 132), feat_hi=(236, 214, 168), path=(168, 138, 98),
                    water=(80, 130, 160), water_hi=(130, 175, 200), accent=(224, 190, 112), deco=(176, 146, 100)), "urn"),
}


def main():
    here = os.path.dirname(__file__)
    out = os.path.join(here, "..", "assets", "tiles")
    for name, (pal, kind) in PALETTES.items():
        make(pal, kind, os.path.join(out, name + ".png"))


if __name__ == "__main__":
    main()
