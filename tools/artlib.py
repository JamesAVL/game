"""artlib.py — shared palette + a parametric pixel-art character drawer.

draw_person() paints a top-down character into a 48x72 frame (native ART=3
detail) for any of the 4 facing directions and a walk frame, given a palette
dict. The heroes (Vince, Howard) and the humanoid NPCs all reuse it so the cast
looks like it belongs to one world; bosses are drawn bespoke in their own
generators.
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
# generators build their Canvas with cs=1 so these pixels map 1:1 to the final
# PNG (which is already at engine ART resolution, 16*ART x 24*ART = 48x72).
FRAME_W, FRAME_H = 48, 72

TRANSPARENT = (0, 0, 0, 0)


def _legs(cv, cx, top_y, frame, leg_col, leg_sh, foot_col):
    """Two trousered legs + boots with a walk offset based on frame (0..3)."""
    la, ra = 0, 0
    if frame == 1:
        la, ra = -3, 3
    elif frame == 3:
        la, ra = 3, -3
    leg_hi = shade(leg_col, 0.18)
    boot_hi = shade(foot_col, 0.35)
    boot_sole = shade(foot_col, -0.45)
    for (x, off) in ((cx - 9, la), (cx + 2, ra)):
        h = 13 + (1 if off > 0 else 0)
        cv.rect(x, top_y, 7, h, leg_col)
        cv.rect(x, top_y, 2, h, leg_sh)          # inner crease shadow
        cv.vline(x + 6, top_y, h, leg_sh)         # outer edge shadow
        cv.vline(x + 2, top_y, h - 1, leg_hi)     # highlight crease
        # boot
        cv.rect(x - 1, top_y + h, 9, 4, foot_col)
        cv.hline(x - 1, top_y + h, 9, boot_hi)
        cv.hline(x - 1, top_y + h + 3, 9, boot_sole)


def draw_person(cv, ox, oy, direction, frame, pal):
    """Paint a detailed character into the 48x72 cell at (ox,oy).

    pal keys: skin, skin_d, hair, hair_hi, top, top_hi, bottom, shoe,
              hair_style ('vince'|'short'|'turban'|'bald'|'fur'),
              accessory (optional callable(cv,ox,oy,direction)).
    """
    cx = ox + 24
    bob = 3 if frame in (1, 3) else 0
    skin = pal["skin"]
    skin_d = pal.get("skin_d", shade(skin, -0.2))
    skin_hi = shade(skin, 0.16)
    hair = pal["hair"]
    hair_hi = pal.get("hair_hi", shade(hair, 0.3))
    top = pal["top"]
    top_hi = pal.get("top_hi", shade(top, 0.25))
    top_sh = shade(top, -0.28)
    bottom = pal["bottom"]
    shoe = pal.get("shoe", PAL["black"])
    style = pal.get("hair_style", "short")
    ink = PAL["ink"]
    white = PAL["white"]

    # ---- soft ground shadow (ellipse) ----
    for dx in range(-13, 14):
        a = 110 - abs(dx) * 7
        if a > 0:
            cv.set(cx + dx, oy + 68, (0, 0, 0, min(120, a)))
            if a > 50:
                cv.set(cx + dx, oy + 67, (0, 0, 0, a - 50))

    head_y = oy + 10 + bob
    body_y = oy + 31 + bob

    # ---- legs (behind body) ----
    _legs(cv, cx, oy + 52, frame, bottom, shade(bottom, -0.32), shoe)

    # ---- arms (behind torso edges) ----
    arm_swing = 3 if frame == 1 else (-3 if frame == 3 else 0)
    arm_col = shade(top, -0.12)
    lay = body_y + 3 + max(0, arm_swing)
    ray = body_y + 3 + max(0, -arm_swing)
    cv.rect(cx - 15, lay, 4, 15, arm_col)
    cv.vline(cx - 15, lay, 15, shade(top, -0.3))
    cv.rect(cx + 11, ray, 4, 15, arm_col)
    cv.vline(cx + 14, ray, 15, shade(top, -0.3))
    # hands
    cv.rect(cx - 15, lay + 15, 4, 3, skin)
    cv.rect(cx + 11, ray + 15, 4, 3, skin)

    # ---- torso ----
    cv.rect(cx - 11, body_y, 22, 23, top)
    cv.rect(cx - 11, body_y, 6, 23, top_hi)        # left highlight band
    cv.rect(cx + 8, body_y, 3, 23, top_sh)         # right shadow band
    cv.hline(cx - 11, body_y + 22, 22, top_sh)     # hem
    cv.vline(cx, body_y + 2, 19, shade(top, -0.16))  # centre seam
    cv.hline(cx - 6, body_y, 12, shade(top, 0.12))   # collar
    # neck
    cv.rect(cx - 3, body_y - 3, 6, 3, skin_d)

    # ---- head ----
    cv.ellipse(cx, head_y + 9, 10, 10, skin)
    cv.ellipse(cx - 3, head_y + 6, 5, 5, skin_hi)       # forehead/cheek highlight
    cv.vline(cx + 8, head_y + 4, 12, shade(skin, -0.14))  # right edge shade
    cv.rect(cx - 9, head_y + 6, 2, 8, skin_d)           # left cheek shadow
    cv.set(cx - 9, head_y + 9, skin_d)                  # ears
    cv.set(cx + 8, head_y + 9, skin)

    if direction == "up":
        pass  # back of head, hair covers it below
    elif direction in ("left", "right"):
        s = 1 if direction == "right" else -1
        cv.vline(cx - 6 * s, head_y + 4, 12, skin_d)    # far cheek shadow
        ex = cx + 2 * s
        cv.rect(ex, head_y + 8, 3, 3, white)            # eye
        cv.rect(ex + (1 if s > 0 else 0), head_y + 8, 2, 2, ink)  # pupil
        cv.hline(ex - 1, head_y + 5, 4, hair)           # brow
        nx = cx + 9 * s                                 # nose out of the profile
        cv.set(nx, head_y + 10, skin)
        cv.set(nx, head_y + 11, skin_d)
        cv.set(cx + 8 * s, head_y + 11, skin_d)
        cv.hline(cx + 2 * s, head_y + 15, 4, shade(skin, -0.32))  # mouth
    else:  # down
        for side in (-1, 1):
            ex = cx + (3 if side > 0 else -7)
            cv.rect(ex, head_y + 8, 4, 3, white)        # eye white
            cv.rect(ex + (2 if side > 0 else 0), head_y + 8, 2, 3, ink)  # pupil
            cv.set(ex + (2 if side > 0 else 0), head_y + 8, white)       # glint
        cv.hline(cx - 7, head_y + 5, 4, hair)           # brows
        cv.hline(cx + 3, head_y + 5, 4, hair)
        cv.set(cx, head_y + 10, skin_d)                 # nose
        cv.set(cx, head_y + 11, skin_d)
        cv.set(cx - 1, head_y + 12, shade(skin, -0.3))
        cv.hline(cx - 3, head_y + 15, 7, shade(skin, -0.3))  # mouth
        cv.set(cx - 3, head_y + 15, shade(skin, -0.45))
        cv.set(cx + 3, head_y + 15, shade(skin, -0.45))

    _draw_hair(cv, cx, head_y, direction, style, hair, hair_hi)

    acc = pal.get("accessory")
    if acc:
        acc(cv, ox, oy + bob, direction)


def _draw_hair(cv, cx, head_y, direction, style, hair, hair_hi):
    if style == "vince":
        # big backcombed black mane rising above and behind the head
        for x in range(cx - 15, cx + 16):
            h = 20 - abs(x - cx)
            if direction == "up":
                h += 3
            if h < 0:
                continue
            for y in range(head_y - h, head_y + 4):
                cv.set(x, y, hair)
        # spiky crown highlights
        for sx in range(cx - 12, cx + 13, 4):
            for k in range(2):
                cv.set(sx, head_y - 17 + abs(sx - cx) + k, hair_hi)
        cv.rect(cx - 5, head_y - 2, 3, 3, hair_hi)
        if direction == "down":
            cv.hline(cx - 9, head_y, 18, hair)          # fringe
            cv.hline(cx - 9, head_y + 1, 6, hair)
            cv.hline(cx + 4, head_y + 1, 5, hair)
        elif direction in ("left", "right"):
            fx = cx - 10 if direction == "right" else cx + 6
            cv.rect(fx, head_y, 5, 7, hair)
    elif style == "short":
        cv.rect(cx - 9, head_y - 3, 18, 6, hair)
        cv.rect(cx - 6, head_y - 2, 5, 2, hair_hi)
        if direction == "up":
            cv.rect(cx - 9, head_y, 18, 9, hair)
        elif direction in ("left", "right"):
            fx = cx - 10 if direction == "right" else cx + 6
            cv.rect(fx, head_y, 5, 6, hair)
    elif style == "turban":
        cv.rect(cx - 12, head_y - 9, 24, 12, hair)
        cv.rect(cx - 12, head_y - 3, 24, 3, hair_hi)
        cv.hline(cx - 12, head_y - 9, 24, shade(hair, -0.3))
        cv.rect(cx + 7, head_y - 8, 3, 4, hair_hi)      # jewel/fold
        cv.set(cx + 8, head_y - 6, PAL["white"])
    elif style == "fur":
        for x in range(cx - 12, cx + 13):
            h = 9 if abs(x - cx) < 7 else 6
            for y in range(head_y - h, head_y + 18):
                cv.set(x, y, hair)
        for sx in range(cx - 9, cx + 10, 5):
            cv.vline(sx, head_y - 6, 6, hair_hi)
        cv.set(cx - 6, head_y - 6, hair_hi)
    elif style == "bald":
        cv.rect(cx - 9, head_y - 3, 18, 4, hair)
        cv.hline(cx - 7, head_y - 3, 14, shade(hair, 0.25))
        cv.set(cx + 6, head_y, hair)
        cv.set(cx - 7, head_y, hair)


# ---- accessories ---------------------------------------------------------
def acc_moustache(cv, ox, oy, direction):
    cx = ox + 24
    head_y = oy + 10
    col = PAL["howard_hair"]
    col_hi = shade(col, 0.25)
    if direction == "down":
        cv.hline(cx - 6, head_y + 13, 12, col)
        cv.hline(cx - 6, head_y + 14, 4, col)
        cv.hline(cx + 2, head_y + 14, 4, col)
        cv.hline(cx - 5, head_y + 13, 10, col_hi)
    elif direction == "left":
        cv.hline(cx - 9, head_y + 13, 9, col)
        cv.hline(cx - 9, head_y + 14, 4, col)
    elif direction == "right":
        cv.hline(cx, head_y + 13, 9, col)
        cv.hline(cx + 5, head_y + 14, 4, col)


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
