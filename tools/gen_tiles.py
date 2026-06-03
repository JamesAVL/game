"""gen_tiles.py — one 16x16 tileset strip per world.

Each strip has 12 tiles in the index order documented in game/world.js:
  0 floor  1 floor2  2 wall  3 wall-alt  4 obstacle  5 deco
  6 path   7 water   8 door  9 accent    10 deco2     11 solid-feature
A generic painter draws them from a per-zone palette, with a zone-specific
"obstacle" shape (tree / ice / coral / spire / crater / urn).
"""

import os
from pnglib import Canvas, shade

T = 16


def h(x, y, seed):  # cheap deterministic hash -> 0..1
    v = (x * 374761393 + y * 668265263 + seed * 982451653) & 0xFFFFFFFF
    v = (v ^ (v >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((v ^ (v >> 16)) & 0xFFFF) / 65535.0


def floor(cv, ox, base, spec, seed, density=0.10):
    cv.rect(ox, 0, T, T, base)
    for y in range(T):
        for x in range(T):
            if h(x, y, seed) < density:
                cv.set(ox + x, y, spec)


def wall(cv, ox, base, hi, lo):
    cv.rect(ox, 0, T, T, base)
    cv.hline(ox, 0, T, hi)
    cv.hline(ox, T - 1, T, lo)
    # brick seams
    for y in (5, 10, 15):
        cv.hline(ox, y, T, lo)
    off = 0
    for y in range(0, T, 5):
        cv.vline(ox + (8 + off) % T, y, 5, lo)
        cv.vline(ox + (0 + off) % T, y, 5, lo)
        off += 8


def obstacle(cv, ox, kind, pal):
    base = pal["feat"]; hi = pal["feat_hi"]; dk = shade(base, -0.35)
    # transparent bg so floor shows under non-square shapes when placed? tiles are
    # opaque; paint floor first then the object on top.
    floor(cv, ox, pal["floor"], pal["floor2"], 1, 0.06)
    cx = ox + 8
    if kind == "tree":
        cv.rect(cx - 1, 9, 3, 6, pal.get("trunk", (90, 65, 40)))
        cv.ellipse(cx, 6, 6, 5, base)
        cv.ellipse(cx - 2, 4, 4, 3, hi)
        cv.ellipse(cx + 3, 7, 3, 3, dk)
    elif kind == "ice":
        cv.fill_poly([(cx - 5, 14), (cx - 2, 4), (cx + 1, 8), (cx + 4, 3), (cx + 6, 14)], base)
        cv.line(cx - 1, 6, cx + 2, 13, hi)
        cv.set(cx, 5, (255, 255, 255))
    elif kind == "coral":
        cv.rect(cx - 1, 8, 2, 7, base)
        cv.rect(cx - 4, 6, 2, 6, base); cv.rect(cx + 3, 5, 2, 8, base)
        cv.rect(cx - 4, 6, 2, 2, hi); cv.rect(cx + 3, 5, 2, 2, hi)
        cv.set(cx, 7, hi)
    elif kind == "spire":
        cv.fill_poly([(cx - 4, 15), (cx, 2), (cx + 4, 15)], base)
        cv.fill_poly([(cx - 4, 15), (cx, 2), (cx, 15)], hi)
        cv.set(cx, 4, pal.get("glow", (220, 120, 240)))
    elif kind == "crater":
        cv.ellipse(cx, 11, 6, 4, dk)
        cv.ellipse(cx, 10, 6, 4, base, fill=False)
        cv.ellipse(cx, 11, 3, 2, shade(base, -0.2))
    elif kind == "urn":
        cv.ellipse(cx, 9, 4, 5, base)
        cv.rect(cx - 2, 3, 4, 2, hi)
        cv.ellipse(cx - 1, 8, 2, 3, hi)
    else:  # rock
        cv.ellipse(cx, 10, 6, 5, base)
        cv.ellipse(cx - 2, 8, 3, 2, hi)


def water(cv, ox, deep, shallow, seed):
    cv.rect(ox, 0, T, T, deep)
    for y in range(T):
        for x in range(T):
            if h(x, y, seed) < 0.12:
                cv.set(ox + x, y, shallow)
    cv.hline(ox + 2, 4, 5, shallow)
    cv.hline(ox + 9, 10, 4, shallow)


def deco(cv, ox, pal, kind="plant"):
    floor(cv, ox, pal["floor"], pal["floor2"], 3, 0.06)
    cx = ox + 8
    c = pal.get("deco", (90, 150, 70)); hi = shade(c, 0.3)
    if kind == "plant":
        for dx in (-2, 0, 2):
            cv.line(cx + dx, 13, cx + dx + (dx // 2), 8, c)
        cv.set(cx, 7, hi); cv.set(cx - 2, 9, hi)
    else:
        cv.ellipse(cx, 11, 3, 2, c)
        cv.set(cx, 9, hi)


def make(pal, kind, out):
    cv = Canvas(T * 12, T)
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
    cv.rect_outline(8 * T + 3, 3, 10, 10, shade(pal["path"], -0.3))
    # 9 accent / portal pad
    floor(cv, 9 * T, pal["accent"], shade(pal["accent"], 0.2), 7, 0.08)
    cv.rect_outline(9 * T + 2, 2, 12, 12, shade(pal["accent"], -0.25))
    deco(cv, 10 * T, pal, "rock")                                     # 10
    # 11 solid feature (building / pillar block)
    cv.rect(11 * T, 0, T, T, pal["wall"])
    cv.rect(11 * T, 0, T, 3, pal["wall_hi"])
    cv.rect_outline(11 * T, 0, T, T, shade(pal["wall"], -0.4))
    cv.rect(11 * T + 5, 5, 6, 8, shade(pal["wall"], -0.5))
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
