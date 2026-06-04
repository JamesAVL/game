"""artlib.py — shared palette + a parametric pixel-art character drawer.

draw_person() paints a 16x24 top-down character into a frame for any of the
4 facing directions and a walk frame, given a palette dict. The heroes
(Vince, Howard) and the humanoid NPCs all reuse it so the cast looks like it
belongs to one world; bosses are drawn bespoke in their own generators.
"""

from pnglib import Canvas, shade

# ---- a cohesive, slightly neon "Boosh" palette --------------------------
PAL = {
    "black": (24, 20, 32),
    "ink": (40, 34, 52),
    "white": (244, 244, 255),
    "shadow": (0, 0, 0, 90),
    "skin": (236, 196, 168),
    "skin_d": (196, 150, 126),
    "skin_pale": (244, 222, 210),
    "vince_hair": (28, 24, 34),
    "vince_hair_hi": (78, 92, 130),
    "vince_top": (150, 170, 210),
    "vince_top_hi": (210, 224, 248),
    "vince_bottom": (40, 44, 70),
    "vince_boot": (20, 18, 26),
    "howard_hair": (96, 64, 40),
    "howard_top": (150, 116, 72),
    "howard_top_hi": (190, 158, 110),
    "howard_bottom": (78, 60, 42),
    "howard_shirt": (220, 210, 190),
    "naboo_robe": (120, 80, 200),
    "naboo_robe_hi": (160, 120, 240),
    "naboo_turban": (90, 60, 160),
    "bollo_fur": (70, 58, 60),
    "bollo_fur_hi": (104, 90, 92),
    "fossil_shirt": (210, 190, 120),
    "fossil_short": (150, 120, 70),
}

# Characters are authored natively at this (higher-detail) frame size. The
# generators build their Canvas with scale=1 so these pixels map 1:1 to the
# final PNG (which is already at engine ART resolution).
FRAME_W, FRAME_H = 32, 48

TRANSPARENT = (0, 0, 0, 0)


def _legs(cv, cx, top_y, frame, leg_col, leg_sh, foot_col):
    """Draw two legs + boots with a walk offset based on frame (0..3)."""
    la, ra = 0, 0
    if frame == 1:
        la, ra = -2, 2
    elif frame == 3:
        la, ra = 2, -2
    leg_hi = shade(leg_col, 0.18)
    for (x, off) in ((cx - 6, la), (cx + 1, ra)):
        h = 9 + (1 if off > 0 else 0)
        cv.rect(x, top_y, 5, h, leg_col)
        cv.rect(x, top_y, 1, h, leg_sh)        # inner crease shadow
        cv.rect(x + 4, top_y, 1, h, leg_sh)    # outer edge shadow
        cv.vline(x + 1, top_y, h - 1, leg_hi)  # subtle highlight
        # boot
        cv.rect(x - 1, top_y + h, 7, 3, foot_col)
        cv.hline(x - 1, top_y + h, 7, shade(foot_col, 0.35))
        cv.hline(x - 1, top_y + h + 2, 7, shade(foot_col, -0.4))


def _round(cv, x, y):
    cv.set(x, y, TRANSPARENT)


def draw_person(cv, ox, oy, direction, frame, pal):
    """Paint a detailed character into the 32x48 cell at (ox,oy).

    pal keys: skin, skin_d, hair, hair_hi, top, top_hi, bottom, shoe,
              hair_style ('vince'|'short'|'turban'|'bald'|'fur'),
              accessory (optional callable(cv,ox,oy,direction)).
    """
    cx = ox + 16
    bob = 2 if frame in (1, 3) else 0
    skin = pal["skin"]
    skin_d = pal.get("skin_d", shade(skin, -0.2))
    skin_hi = shade(skin, 0.18)
    hair = pal["hair"]
    hair_hi = pal.get("hair_hi", shade(hair, 0.3))
    top = pal["top"]
    top_hi = pal.get("top_hi", shade(top, 0.25))
    top_sh = shade(top, -0.28)
    bottom = pal["bottom"]
    shoe = pal.get("shoe", PAL["black"])
    style = pal.get("hair_style", "short")

    # ---- soft ground shadow (ellipse) ----
    for dx in range(-9, 10):
        a = 90 - abs(dx) * 8
        if a > 0:
            cv.set(cx + dx, oy + 45, (0, 0, 0, a))
            if a > 40:
                cv.set(cx + dx, oy + 44, (0, 0, 0, a - 40))

    head_y = oy + 7 + bob
    body_y = oy + 21 + bob

    # ---- legs (behind body) ----
    _legs(cv, cx, oy + 35, frame, bottom, shade(bottom, -0.32), shoe)

    # ---- arms (behind torso edges) ----
    arm_swing = 2 if frame == 1 else (-2 if frame == 3 else 0)
    arm_col = shade(top, -0.12)
    lay = body_y + 2 + max(0, arm_swing)
    ray = body_y + 2 + max(0, -arm_swing)
    cv.rect(cx - 10, lay, 3, 10, arm_col)
    cv.rect(cx + 7, ray, 3, 10, arm_col)
    cv.vline(cx - 10, lay, 10, shade(top, -0.3))
    cv.vline(cx + 9, ray, 10, shade(top, -0.3))
    # hands
    cv.rect(cx - 10, lay + 10, 3, 2, skin)
    cv.rect(cx + 7, ray + 10, 3, 2, skin)

    # ---- torso ----
    cv.rect(cx - 7, body_y, 14, 15, top)
    cv.rect(cx - 7, body_y, 4, 15, top_hi)        # left highlight band
    cv.rect(cx + 5, body_y, 2, 15, top_sh)        # right shadow band
    cv.hline(cx - 7, body_y + 14, 14, top_sh)     # hem
    cv.set(cx - 7, body_y, top_sh)
    cv.set(cx + 6, body_y, top_sh)
    # neck
    cv.rect(cx - 2, body_y - 2, 4, 2, skin_d)

    # ---- head ----
    cv.rect(cx - 6, head_y, 12, 13, skin)
    cv.rect(cx - 6, head_y, 2, 13, skin_d)        # left cheek shadow
    cv.vline(cx + 5, head_y, 13, shade(skin, -0.12))  # right edge
    cv.rect(cx - 5, head_y + 1, 2, 2, skin_hi)    # forehead highlight
    # round the corners
    for (rx, ry) in ((cx - 6, head_y), (cx + 5, head_y), (cx - 6, head_y + 12), (cx + 5, head_y + 12)):
        _round(cv, rx, ry)

    ink = PAL["ink"]
    white = PAL["white"]
    if direction == "up":
        pass  # back of head, hair covers it below
    elif direction in ("left", "right"):
        s = 1 if direction == "right" else -1
        # far cheek shadow
        cv.vline(cx - 4 * s, head_y + 2, 8, skin_d)
        # single eye
        ex = cx + 1 * s
        cv.rect(ex, head_y + 5, 2, 2, white)
        cv.set(ex + (1 if s > 0 else 0), head_y + 5, ink)
        cv.hline(ex - 1, head_y + 3, 3, hair)     # brow
        # nose sticking out of the profile
        nx = cx + 6 * s
        cv.set(nx, head_y + 6, skin)
        cv.set(nx, head_y + 7, skin_d)
        cv.set(cx + 5 * s, head_y + 7, skin_d)
        # mouth
        cv.hline(cx + 1 * s, head_y + 10, 3, shade(skin, -0.32))
    else:  # down
        # eyes (white + pupil) and brows
        cv.rect(cx - 4, head_y + 5, 3, 2, white)
        cv.rect(cx + 2, head_y + 5, 3, 2, white)
        cv.set(cx - 3, head_y + 5, ink)
        cv.set(cx + 3, head_y + 5, ink)
        cv.hline(cx - 4, head_y + 3, 3, hair)
        cv.hline(cx + 2, head_y + 3, 3, hair)
        # nose + mouth
        cv.set(cx, head_y + 7, skin_d)
        cv.set(cx, head_y + 8, skin_d)
        cv.hline(cx - 2, head_y + 10, 5, shade(skin, -0.3))
        cv.set(cx - 2, head_y + 10, shade(skin, -0.45))
        cv.set(cx + 2, head_y + 10, shade(skin, -0.45))

    _draw_hair(cv, cx, head_y, direction, style, hair, hair_hi)

    acc = pal.get("accessory")
    if acc:
        acc(cv, ox, oy + bob, direction)


def _draw_hair(cv, cx, head_y, direction, style, hair, hair_hi):
    if style == "vince":
        # big backcombed black mane rising above and behind the head
        for x in range(cx - 10, cx + 11):
            h = 14 - abs(x - cx)
            if direction == "up":
                h += 2
            if h < 0:
                continue
            for y in range(head_y - h, head_y + 3):
                cv.set(x, y, hair)
        # spiky crown highlights
        for sx in range(cx - 8, cx + 9, 3):
            cv.set(sx, head_y - 12 + abs(sx - cx), hair_hi)
            cv.set(sx, head_y - 11 + abs(sx - cx), hair_hi)
        cv.rect(cx - 4, head_y - 1, 2, 2, hair_hi)
        if direction == "down":
            cv.hline(cx - 6, head_y, 12, hair)     # fringe
            cv.hline(cx - 6, head_y + 1, 4, hair)
            cv.hline(cx + 3, head_y + 1, 3, hair)
        elif direction in ("left", "right"):
            fx = cx - 7 if direction == "right" else cx + 4
            cv.rect(fx, head_y, 3, 5, hair)
    elif style == "short":
        cv.rect(cx - 6, head_y - 2, 12, 4, hair)
        cv.hline(cx - 6, head_y + 2, 1, hair)
        cv.hline(cx + 5, head_y + 2, 1, hair)
        cv.rect(cx - 4, head_y - 1, 3, 1, hair_hi)
        if direction == "up":
            cv.rect(cx - 6, head_y, 12, 6, hair)
        elif direction in ("left", "right"):
            fx = cx - 7 if direction == "right" else cx + 4
            cv.rect(fx, head_y, 3, 4, hair)
    elif style == "turban":
        cv.rect(cx - 8, head_y - 6, 16, 8, hair)
        cv.rect(cx - 8, head_y - 2, 16, 2, hair_hi)
        cv.hline(cx - 8, head_y - 6, 16, shade(hair, -0.3))
        cv.rect(cx + 5, head_y - 5, 2, 3, hair_hi)   # jewel/fold
        cv.set(cx + 6, head_y - 4, PAL["white"])
    elif style == "fur":
        for x in range(cx - 8, cx + 9):
            h = 6 if abs(x - cx) < 5 else 4
            for y in range(head_y - h, head_y + 12):
                cv.set(x, y, hair)
        # shaggy highlights
        for sx in range(cx - 6, cx + 7, 4):
            cv.vline(sx, head_y - 4, 4, hair_hi)
        cv.set(cx - 4, head_y - 4, hair_hi)
    elif style == "bald":
        cv.rect(cx - 6, head_y - 2, 12, 3, hair)
        cv.hline(cx - 5, head_y - 2, 10, shade(hair, 0.25))
        cv.set(cx + 4, head_y, hair)
        cv.set(cx - 5, head_y, hair)


# ---- accessories ---------------------------------------------------------
def acc_moustache(cv, ox, oy, direction):
    cx = ox + 16
    head_y = oy + 7
    col = PAL["howard_hair"]
    col_hi = shade(col, 0.25)
    if direction == "down":
        cv.hline(cx - 4, head_y + 8, 8, col)
        cv.hline(cx - 4, head_y + 9, 3, col)
        cv.hline(cx + 1, head_y + 9, 3, col)
        cv.hline(cx - 3, head_y + 8, 6, col_hi)
    elif direction == "left":
        cv.hline(cx - 6, head_y + 8, 6, col)
        cv.hline(cx - 6, head_y + 9, 3, col)
    elif direction == "right":
        cv.hline(cx, head_y + 8, 6, col)
        cv.hline(cx + 3, head_y + 9, 3, col)


def hero_palettes():
    """Return (vince_pal, howard_pal)."""
    vince = {
        "skin": PAL["skin_pale"], "skin_d": PAL["skin"],
        "hair": PAL["vince_hair"], "hair_hi": PAL["vince_hair_hi"],
        "top": PAL["vince_top"], "top_hi": PAL["vince_top_hi"],
        "bottom": PAL["vince_bottom"], "shoe": PAL["vince_boot"],
        "hair_style": "vince",
    }
    howard = {
        "skin": PAL["skin"], "skin_d": PAL["skin_d"],
        "hair": PAL["howard_hair"], "hair_hi": shade(PAL["howard_hair"], 0.3),
        "top": PAL["howard_top"], "top_hi": PAL["howard_top_hi"],
        "bottom": PAL["howard_bottom"], "shoe": PAL["black"],
        "hair_style": "short", "accessory": acc_moustache,
    }
    return vince, howard
