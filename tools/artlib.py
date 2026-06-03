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

FRAME_W, FRAME_H = 16, 24


def _legs(cv, cx, top_y, frame, leg_col, leg_sh, foot_col):
    """Draw legs+feet with a walk offset based on frame (0..3)."""
    # frame: 0,2 = neutral; 1 = left fwd/right back; 3 = right fwd/left back
    la, ra = 0, 0
    if frame == 1:
        la, ra = -1, 1
    elif frame == 3:
        la, ra = 1, -1
    lx = cx - 2
    rx = cx + 1
    for (x, off) in ((lx, la), (rx, ra)):
        cv.rect(x, top_y, 2, 4 + (1 if off > 0 else 0), leg_col)
        cv.set(x, top_y, leg_sh)
        # foot
        cv.rect(x - (1 if x == lx else 0), top_y + 4 + (1 if off > 0 else 0), 3, 1, foot_col)


def draw_person(cv, ox, oy, direction, frame, pal):
    """Paint a character into the 16x24 cell at (ox,oy).

    pal keys: skin, skin_d, hair, hair_hi, top, top_hi, bottom, shoe,
              hair_style ('vince'|'short'|'turban'|'bald'|'fur'),
              accessory (optional callable(cv,ox,oy,direction)).
    """
    cx = ox + 8
    bob = 1 if frame in (1, 3) else 0
    skin = pal["skin"]
    skin_d = pal.get("skin_d", shade(skin, -0.2))
    hair = pal["hair"]
    hair_hi = pal.get("hair_hi", shade(hair, 0.3))
    top = pal["top"]
    top_hi = pal.get("top_hi", shade(top, 0.25))
    bottom = pal["bottom"]
    shoe = pal.get("shoe", PAL["black"])
    style = pal.get("hair_style", "short")

    # soft shadow on ground
    for dx in range(-4, 5):
        a = 70 - abs(dx) * 8
        if a > 0:
            cv.set(cx + dx, oy + 22, (0, 0, 0, a))

    head_y = oy + 3 + bob
    body_y = oy + 11 + bob

    # ---- legs (drawn first, behind body) ----
    _legs(cv, cx, oy + 18, frame, bottom, shade(bottom, -0.3), shoe)

    # ---- torso ----
    cv.rect(cx - 3, body_y, 6, 7, top)
    cv.rect(cx - 3, body_y, 2, 7, top_hi)  # left highlight strip
    cv.set(cx + 2, body_y + 6, shade(top, -0.3))
    # arms
    arm_swing = 0
    if frame == 1:
        arm_swing = 1
    elif frame == 3:
        arm_swing = -1
    cv.rect(cx - 4, body_y + 1 + max(0, arm_swing), 1, 4, shade(top, -0.15))
    cv.rect(cx + 3, body_y + 1 + max(0, -arm_swing), 1, 4, shade(top, -0.15))
    # hands
    cv.set(cx - 4, body_y + 5 + max(0, arm_swing), skin)
    cv.set(cx + 3, body_y + 5 + max(0, -arm_swing), skin)

    # ---- head ----
    cv.rect(cx - 3, head_y, 6, 6, skin)
    cv.rect(cx - 3, head_y, 1, 6, skin_d)

    if direction == "up":
        # back of head: cover the face with hair
        pass
    elif direction in ("left", "right"):
        # profile: one eye, shade far cheek
        eye_x = cx + 1 if direction == "right" else cx - 1
        cv.set(eye_x, head_y + 2, PAL["ink"])
        cv.set(cx - 2 if direction == "right" else cx + 2, head_y + 3, skin_d)
        # nose
        nx = cx + 3 if direction == "right" else cx - 4
        cv.set(nx, head_y + 3, skin)
    else:  # down
        cv.set(cx - 1, head_y + 2, PAL["ink"])
        cv.set(cx + 1, head_y + 2, PAL["ink"])
        cv.set(cx, head_y + 4, skin_d)  # mouth/chin shade

    _draw_hair(cv, cx, head_y, direction, style, hair, hair_hi)

    acc = pal.get("accessory")
    if acc:
        acc(cv, ox, oy + bob, direction)


def _draw_hair(cv, cx, head_y, direction, style, hair, hair_hi):
    if style == "vince":
        # big backcombed black mane rising above and behind the head
        for x in range(cx - 5, cx + 6):
            h = 7 - abs(x - cx)
            if direction == "up":
                h += 1
            for y in range(head_y - h, head_y + 2):
                cv.set(x, y, hair)
        # spiky crown highlights
        for sx in (cx - 4, cx - 1, cx + 2, cx + 4):
            cv.set(sx, head_y - 6, hair_hi)
            cv.set(sx, head_y - 5, hair)
        cv.set(cx - 2, head_y, hair_hi)
        if direction == "down":
            # fringe sweeping over forehead
            cv.hline(cx - 3, head_y, 6, hair)
            cv.set(cx + 2, head_y + 1, hair)
        elif direction in ("left", "right"):
            fx = cx - 4 if direction == "right" else cx + 3
            cv.rect(fx, head_y, 2, 3, hair)
    elif style == "short":
        cv.rect(cx - 3, head_y - 1, 6, 2, hair)
        cv.set(cx - 3, head_y, hair)
        cv.set(cx + 2, head_y, hair)
        cv.set(cx - 2, head_y - 1, hair_hi)
        if direction == "up":
            cv.rect(cx - 3, head_y, 6, 3, hair)
    elif style == "turban":
        cv.rect(cx - 4, head_y - 3, 8, 4, hair)
        cv.rect(cx - 4, head_y - 1, 8, 1, hair_hi)
        cv.set(cx + 3, head_y - 2, hair_hi)
    elif style == "fur":
        for x in range(cx - 4, cx + 5):
            h = 3 if abs(x - cx) < 3 else 2
            for y in range(head_y - h, head_y + 6):
                cv.set(x, y, hair)
        cv.set(cx - 2, head_y - 2, hair_hi)
    elif style == "bald":
        cv.hline(cx - 3, head_y - 1, 6, hair)


# ---- accessories ---------------------------------------------------------
def acc_moustache(cv, ox, oy, direction):
    cx = ox + 8
    head_y = oy + 3
    col = PAL["howard_hair"]
    if direction == "down":
        cv.hline(cx - 2, head_y + 4, 4, col)
    elif direction == "left":
        cv.hline(cx - 3, head_y + 4, 3, col)
    elif direction == "right":
        cv.hline(cx + 1, head_y + 4, 3, col)


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
