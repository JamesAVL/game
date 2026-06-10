"""gen_bosses.py — bespoke pixel-art boss sprites (shown large in crimp-offs).

Each is drawn by hand from primitives, authored natively at the engine's ART
resolution (scale=1) for genuine detail. Sizes vary; the crimp scene scales
them up (bossScale) and the overworld draws them at native size, feet-aligned.
"""

import os
from pnglib import Canvas, shade, CS

OUT = None


def save(cv, name):
    cv.write(os.path.join(OUT, name + ".png"))
    # companion normal map for runtime per-pixel lighting (the crimp boss)
    cv.normal_map().write(os.path.join(OUT, name + "_n.png"))
    print("wrote", name, "(+ normal)")


def outline_dark(cv, col=(12, 8, 20)):
    cv.outline(col)


def save_with_outline(cv, name, col=(12, 8, 20)):
    cv.outline(col)
    save(cv, name)


# --------------------------------------------------------------------------
def jazz():
    cv = Canvas(56, 84, cs=CS)
    body = (70, 70, 84); hi = (120, 120, 140); mid = (92, 92, 108); dk = (40, 40, 52)
    cx = 28
    # smoky lower body tapering into wisps
    cv.fill_poly([(cx - 12, 80), (cx - 8, 48), (cx + 8, 48), (cx + 12, 80)], body)
    cv.fill_poly([(cx - 10, 80), (cx - 7, 54), (cx - 4, 54), (cx - 6, 80)], mid)
    cv.fill_poly([(cx - 8, 80), (cx - 4, 60), (cx + 4, 60), (cx + 8, 80)], dk)
    # torso / jacket
    cv.rect(cx - 10, 36, 20, 18, body)
    cv.rect(cx - 10, 36, 7, 18, hi)       # left highlight
    cv.rect(cx + 7, 36, 3, 18, dk)        # right shadow
    cv.line(cx, 38, cx, 53, dk)
    cv.fill_poly([(cx - 6, 36), (cx, 46), (cx - 3, 36)], dk)   # lapels
    cv.fill_poly([(cx + 5, 36), (cx, 46), (cx + 2, 36)], dk)
    # white shirt + red bow tie
    cv.rect(cx - 2, 38, 4, 11, (235, 235, 245))
    cv.fill_poly([(cx - 4, 40), (cx, 42), (cx - 4, 44)], (210, 60, 60))
    cv.fill_poly([(cx + 4, 40), (cx, 42), (cx + 4, 44)], (210, 60, 60))
    cv.set(cx, 42, (150, 30, 30))
    # arms + gold trumpet
    cv.rect(cx + 8, 38, 4, 13, body); cv.rect(cx - 12, 40, 4, 11, body)
    gold = (220, 180, 70); goldhi = (250, 220, 130); golddk = (170, 130, 40)
    cv.rect(cx + 10, 44, 13, 4, gold); cv.hline(cx + 10, 44, 13, goldhi)
    cv.ellipse(cx + 23, 46, 6, 6, gold); cv.ellipse(cx + 23, 46, 4, 4, goldhi); cv.ellipse(cx + 24, 47, 2, 2, golddk)
    # head
    cv.ellipse(cx, 26, 10, 10, (96, 96, 112))
    cv.ellipse(cx - 3, 22, 5, 4, hi)
    cv.ellipse(cx + 4, 29, 3, 3, mid)
    # sunglasses
    cv.rect(cx - 8, 24, 7, 4, (10, 10, 14)); cv.rect(cx + 2, 24, 7, 4, (10, 10, 14))
    cv.rect(cx - 1, 25, 2, 1, (10, 10, 14))
    cv.set(cx - 6, 24, (200, 220, 255)); cv.set(cx + 4, 24, (200, 220, 255))
    # toothy grin
    cv.rect(cx - 4, 31, 9, 2, (235, 235, 245))
    for gx in range(cx - 3, cx + 5, 2):
        cv.vline(gx, 31, 2, dk)
    # top hat
    cv.rect(cx - 10, 12, 20, 4, (16, 16, 22))    # brim
    cv.rect(cx - 8, 2, 16, 12, (16, 16, 22))     # crown
    cv.rect(cx - 7, 3, 3, 8, (44, 44, 56))       # crown highlight
    cv.rect(cx - 8, 10, 16, 2, (210, 60, 60))    # band
    # smoke wisps
    for (wx, wy) in [(cx - 16, 28), (cx + 18, 20), (cx - 14, 12), (cx + 14, 60), (cx - 18, 68)]:
        cv.ellipse(wx, wy, 2, 2, (150, 150, 170, 150))
        cv.set(wx + 2, wy - 2, (110, 110, 130, 110))
    # ---- fine detail: pinstripes, trumpet valves, hat sheen, lapel highlights
    for px in range(cx - 8, cx + 9, 3):
        cv.vline(px, 37, 15, shade(body, 0.06))
    for vx in (cx + 13, cx + 16, cx + 19):
        cv.set(vx, 43, golddk); cv.set(vx, 42, goldhi)
    cv.set(cx - 6, 10, (255, 150, 150)); cv.set(cx + 5, 10, (255, 150, 150))  # band sheen
    cv.line(cx - 5, 37, cx - 1, 45, hi); cv.line(cx + 4, 37, cx + 1, 45, hi)  # lapel edges
    outline_dark(cv)
    save(cv, "boss_jazz")


def gregg():
    cv = Canvas(60, 88, cs=CS)
    green = (96, 168, 120); greenhi = (140, 210, 160); mid = (74, 140, 100); dk = (54, 110, 78)
    cx = 30
    # fish tail
    cv.fill_poly([(cx - 14, 86), (cx, 66), (cx + 14, 86)], green)
    cv.fill_poly([(cx - 8, 84), (cx, 70), (cx + 8, 84)], dk)
    cv.line(cx - 10, 82, cx, 72, greenhi)
    cv.line(cx + 9, 82, cx, 73, mid)
    # body
    cv.ellipse(cx, 52, 16, 16, green)
    cv.ellipse(cx - 6, 46, 8, 8, greenhi)
    cv.ellipse(cx + 6, 56, 6, 6, mid)
    for (sx, sy) in [(cx - 8, 56), (cx + 6, 54), (cx, 60), (cx + 10, 48), (cx - 12, 48), (cx + 2, 50)]:
        cv.ellipse(sx, sy, 2, 1, dk)   # scales
    # arms
    cv.rect(cx - 18, 44, 4, 14, green); cv.rect(cx + 14, 44, 4, 14, green)
    cv.set(cx - 17, 45, greenhi); cv.set(cx + 15, 45, greenhi)
    # big bulbous head
    cv.ellipse(cx, 26, 14, 14, green)
    cv.ellipse(cx - 5, 20, 6, 5, greenhi)
    # huge eyes
    cv.ellipse(cx - 6, 24, 6, 6, (245, 245, 245)); cv.ellipse(cx + 6, 24, 6, 6, (245, 245, 245))
    cv.ellipse(cx - 6, 25, 3, 3, (20, 20, 30)); cv.ellipse(cx + 6, 25, 3, 3, (20, 20, 30))
    cv.set(cx - 8, 22, (255, 255, 255)); cv.set(cx + 4, 22, (255, 255, 255))
    # worried mouth
    cv.line(cx - 4, 34, cx + 4, 34, dk); cv.set(cx - 4, 33, dk); cv.set(cx + 4, 33, dk)
    # seaweed hair strands
    for (hx, off) in [(-12, 0), (-6, -2), (0, -4), (6, -2), (12, 0)]:
        cv.line(cx + hx, 14 + off, cx + hx + (2 if hx < 0 else -2), 2, dk)
        cv.set(cx + hx, 13 + off, mid)
    # ---- fine detail: gill slits, belly sheen, extra scales, fin ribs, eye shine
    for gy in (50, 54, 58):
        cv.hline(cx - 16, gy, 4, dk); cv.hline(cx + 13, gy, 4, dk)
    cv.line(cx - 2, 44, cx - 2, 60, greenhi)            # belly highlight
    for (sx, sy) in [(cx + 2, 58), (cx - 6, 50), (cx + 9, 60), (cx - 10, 56)]:
        cv.set(sx, sy, dk); cv.set(sx + 1, sy, greenhi)
    for rx in (-7, 0, 7):
        cv.line(cx + rx, 78, cx, 70, greenhi)           # tail fin ribs
    cv.set(cx - 8, 22, (255, 255, 255)); cv.set(cx + 4, 22, (255, 255, 255))  # eye shine
    save_with_outline(cv, "boss_gregg")


def crackfox():
    cv = Canvas(68, 60, cs=CS)
    fur = (188, 110, 60); furhi = (224, 156, 96); mid = (150, 88, 48); dk = (120, 66, 36); white = (235, 230, 220)
    cx = 34
    # scruffy low body
    cv.ellipse(cx, 40, 22, 14, fur)
    cv.ellipse(cx - 8, 36, 10, 6, furhi)
    cv.ellipse(cx + 8, 44, 8, 5, mid)
    for tx in range(cx - 20, cx + 21, 4):    # ragged tufts along the back
        cv.vline(tx, 25 + (tx % 4), 3, dk)
    # legs
    for lx in (cx - 14, cx - 4, cx + 6, cx + 16):
        cv.rect(lx, 48, 4, 10, dk); cv.vline(lx, 48, 9, mid)
    # bushy tail
    cv.ellipse(cx + 26, 36, 10, 8, fur); cv.ellipse(cx + 30, 32, 4, 4, white); cv.ellipse(cx + 24, 38, 4, 3, mid)
    # head, tilted and manic (to the left)
    cv.ellipse(cx - 12, 24, 12, 10, fur)
    cv.ellipse(cx - 14, 20, 5, 4, furhi)
    cv.fill_poly([(cx - 22, 18), (cx - 18, 6), (cx - 14, 18)], fur)   # ears
    cv.fill_poly([(cx - 8, 18), (cx - 4, 6), (cx, 18)], fur)
    cv.fill_poly([(cx - 20, 12), (cx - 18, 8), (cx - 16, 12)], dk)
    # snout
    cv.fill_poly([(cx - 24, 26), (cx - 32, 28), (cx - 24, 32)], furhi)
    cv.ellipse(cx - 31, 28, 2, 2, (20, 16, 18))   # nose
    # wild red eyes
    cv.ellipse(cx - 16, 22, 3, 3, white); cv.ellipse(cx - 8, 22, 3, 3, white)
    cv.set(cx - 16, 22, (200, 30, 30)); cv.set(cx - 8, 22, (200, 30, 30))
    cv.set(cx - 17, 21, (255, 120, 120)); cv.set(cx - 9, 21, (255, 120, 120))
    # jagged grin
    for gx in range(cx - 24, cx - 10, 3):
        cv.vline(gx, 30, 3, white)
    # ---- fine detail: whiskers, fur tufts, claws, ear innards, tail flecks
    for (wy) in (27, 29, 31):
        cv.line(cx - 28, wy, cx - 34, wy - 1, white)
    for fx in range(cx - 18, cx + 19, 5):
        cv.set(fx, 28 + (fx % 3), furhi)               # fur flecks on the body
    for lx in (cx - 14, cx - 4, cx + 6, cx + 16):
        cv.set(lx, 58, (20, 16, 18)); cv.set(lx + 3, 58, (20, 16, 18))  # claws
    cv.fill_poly([(cx - 19, 15), (cx - 17, 10), (cx - 15, 15)], dk)     # ear inner
    cv.set(cx + 28, 33, white); cv.set(cx + 32, 30, white)              # tail tuft
    save_with_outline(cv, "boss_crackfox")


def nana():
    cv = Canvas(56, 88, cs=CS)
    card = (150, 70, 110); cardhi = (190, 110, 150); mid = (120, 56, 90); skin = (210, 190, 196); dk = (90, 40, 70)
    cx = 28
    # long skirt
    cv.fill_poly([(cx - 16, 86), (cx - 10, 52), (cx + 10, 52), (cx + 16, 86)], (70, 56, 70))
    cv.fill_poly([(cx - 10, 86), (cx - 6, 56), (cx - 2, 56), (cx - 5, 86)], (92, 76, 92))
    # cardigan torso
    cv.rect(cx - 12, 40, 24, 16, card)
    cv.rect(cx - 12, 40, 7, 16, cardhi)
    cv.rect(cx + 9, 40, 3, 16, mid)
    cv.line(cx, 41, cx, 55, dk)
    for by in (44, 49, 53):
        cv.set(cx, by, (230, 220, 180))   # buttons
    # arms + hands
    cv.rect(cx - 16, 42, 4, 14, card); cv.rect(cx + 12, 42, 4, 14, card)
    cv.rect(cx - 16, 56, 4, 3, skin); cv.rect(cx + 12, 56, 4, 3, skin)
    # head
    cv.ellipse(cx, 26, 12, 12, skin)
    cv.ellipse(cx - 4, 22, 5, 4, shade(skin, 0.2))
    # grey bun
    cv.ellipse(cx, 14, 12, 8, (210, 210, 215))
    cv.ellipse(cx, 8, 6, 6, (228, 228, 233))
    cv.ellipse(cx - 4, 12, 3, 2, (244, 244, 248))
    # glowing demon eyes + glasses
    cv.rect(cx - 8, 24, 6, 4, (255, 60, 60)); cv.rect(cx + 2, 24, 6, 4, (255, 60, 60))
    cv.set(cx - 6, 25, (255, 180, 180)); cv.set(cx + 4, 25, (255, 180, 180))
    cv.rect_outline(cx - 10, 22, 8, 8, (60, 60, 70)); cv.rect_outline(cx + 2, 22, 8, 8, (60, 60, 70))
    cv.line(cx - 2, 25, cx + 2, 25, (60, 60, 70))
    # sharp grin
    cv.line(cx - 6, 32, cx + 6, 32, dk)
    for gx in range(cx - 6, cx + 7, 2):
        cv.vline(gx, 31, 2, (245, 245, 245))
    # ---- fine detail: cardigan knit, brooch, hair wisps, glasses shine
    for ky in range(42, 55, 3):
        for kx in range(cx - 10, cx + 9, 4):
            cv.set(kx, ky, shade(card, 0.12))
    cv.set(cx - 8, 42, (230, 220, 120)); cv.set(cx - 7, 42, (255, 245, 170))  # brooch
    for hx in (cx - 8, cx + 8):
        cv.set(hx, 9, (228, 228, 233)); cv.set(hx + (1 if hx > cx else -1), 8, (244, 244, 248))
    cv.set(cx - 9, 23, (200, 220, 255)); cv.set(cx + 3, 23, (200, 220, 255))  # glasses glint
    save_with_outline(cv, "boss_nana")


def moon():
    cv = Canvas(76, 76, cs=CS)
    white = (244, 244, 220); hi = (255, 255, 240); mid = (224, 224, 200); dk = (200, 200, 175)
    cx, cy = 38, 38
    cv.ellipse(cx, cy, 32, 32, white)
    cv.ellipse(cx - 10, cy - 10, 14, 12, hi)
    cv.ellipse(cx + 12, cy + 12, 12, 12, mid)
    # craters
    for (mx, my, r) in [(cx + 14, cy - 12, 6), (cx - 18, cy + 12, 4), (cx + 10, cy + 16, 4), (cx - 6, cy - 18, 3)]:
        cv.ellipse(mx, my, r, r, dk); cv.ellipse(mx - 1, my - 1, max(1, r - 2), max(1, r - 2), mid)
    # the famous gentle face
    cv.ellipse(cx - 8, cy - 4, 3, 4, (40, 40, 40))      # eyes
    cv.ellipse(cx + 2, cy - 4, 2, 4, (40, 40, 40))
    cv.set(cx - 8, cy - 5, (90, 90, 90)); cv.set(cx + 2, cy - 5, (90, 90, 90))
    cv.fill_poly([(cx - 14, cy + 4), (cx - 18, cy + 10), (cx - 12, cy + 10)], dk)  # big nose
    cv.line(cx - 10, cy + 16, cx + 4, cy + 16, (60, 60, 60))   # gentle mouth
    cv.set(cx + 4, cy + 15, (60, 60, 60)); cv.set(cx - 10, cy + 15, (60, 60, 60))
    # ---- fine detail: extra small craters, surface speckle, soft cheek shading
    for (mx, my, r) in [(cx + 20, cy - 2, 2), (cx - 14, cy - 6, 2), (cx + 2, cy + 22, 2), (cx - 22, cy, 2)]:
        cv.ellipse(mx, my, r, r, dk); cv.set(mx - 1, my - 1, mid)
    for sp in range(24):
        ang = sp * 0.62
        import math as _m
        px = int(cx + _m.cos(ang) * (10 + sp)); py = int(cy + _m.sin(ang) * (6 + sp * 0.4))
        cv.set(px, py, mid)
    cv.ellipse(cx - 12, cy + 6, 3, 2, (255, 235, 200))         # rosy cheek
    save_with_outline(cv, "boss_moon", col=(120, 120, 150))


def tony():
    cv = Canvas(76, 88, cs=CS)
    pink = (240, 130, 190); pinkhi = (255, 180, 220); mid = (214, 104, 164); dk = (190, 80, 140)
    cx = 38
    # pedestal
    cv.rect(cx - 16, 76, 32, 10, (120, 100, 150))
    cv.rect(cx - 16, 76, 32, 2, (170, 150, 200))
    cv.rect(cx - 16, 84, 32, 2, (90, 74, 116))
    # tentacles
    for (tx, sway) in [(-14, -4), (-6, 2), (2, -2), (10, 4), (16, -4)]:
        cv.fill_poly([(cx + tx, 56), (cx + tx + 4, 56), (cx + tx + sway, 76)], pink)
        cv.line(cx + tx + 1, 58, cx + tx + sway, 74, mid)
        cv.set(cx + tx + sway, 75, dk)
    # bulbous dome head/body
    cv.ellipse(cx, 36, 22, 26, pink)
    cv.ellipse(cx - 8, 22, 9, 9, pinkhi)
    cv.ellipse(cx + 10, 44, 8, 10, mid)
    for (sx, sy) in [(cx + 10, 28), (cx - 12, 40), (cx + 6, 48), (cx, 20), (cx - 4, 34)]:
        cv.ellipse(sx, sy, 2, 2, dk)
    # enormous indignant eyes
    cv.ellipse(cx - 10, 32, 7, 7, (245, 245, 245)); cv.ellipse(cx + 10, 32, 7, 7, (245, 245, 245))
    cv.ellipse(cx - 10, 34, 3, 3, (20, 20, 30)); cv.ellipse(cx + 10, 34, 3, 3, (20, 20, 30))
    cv.set(cx - 12, 30, (255, 255, 255)); cv.set(cx + 8, 30, (255, 255, 255))
    # angry brows
    cv.line(cx - 16, 24, cx - 6, 28, dk); cv.line(cx + 16, 24, cx + 6, 28, dk)
    cv.line(cx - 16, 25, cx - 6, 29, dk); cv.line(cx + 16, 25, cx + 6, 29, dk)
    # outraged open mouth
    cv.ellipse(cx, 48, 5, 4, (120, 40, 70)); cv.ellipse(cx, 49, 3, 2, (60, 20, 36))
    cv.hline(cx - 3, 46, 6, (245, 245, 245))                   # top teeth
    # ---- fine detail: tentacle suction cups, dome speckle, eye gleam
    for (tx, sway) in [(-14, -4), (-6, 2), (2, -2), (10, 4), (16, -4)]:
        for cy2 in (62, 68, 73):
            cv.set(cx + tx + 2 + sway // 2, cy2, dk)
    for (sx, sy) in [(cx + 14, 24), (cx - 16, 34), (cx + 8, 52), (cx - 8, 50), (cx + 2, 30)]:
        cv.set(sx, sy, pinkhi)
    cv.set(cx - 12, 30, (255, 255, 255)); cv.set(cx + 8, 30, (255, 255, 255))
    save_with_outline(cv, "boss_tony")


def yeti():
    cv = Canvas(72, 88, cs=CS)
    fur = (228, 232, 238); furhi = (250, 252, 255); mid = (196, 202, 212); dk = (158, 166, 180)
    skin = (120, 130, 150)
    cx = 36
    # mountainous shaggy body
    cv.ellipse(cx, 52, 24, 28, fur)
    cv.ellipse(cx - 9, 40, 12, 12, furhi)
    cv.ellipse(cx + 12, 62, 10, 10, mid)
    # shag strands all over
    for sy in range(30, 80, 7):
        for sx in range(cx - 20, cx + 21, 6):
            off = (sx * 13 + sy * 7) % 5
            cv.vline(sx + off % 3, sy + off, 4, mid if (sx + sy) % 2 else dk)
    # mighty arms reaching down
    cv.ellipse(cx - 24, 52, 7, 16, fur); cv.ellipse(cx + 24, 52, 7, 16, fur)
    cv.ellipse(cx - 25, 44, 4, 6, furhi); cv.ellipse(cx + 23, 44, 4, 6, furhi)
    cv.ellipse(cx - 24, 66, 5, 4, skin); cv.ellipse(cx + 24, 66, 5, 4, skin)
    # face plate
    cv.ellipse(cx, 26, 13, 11, skin)
    cv.ellipse(cx - 4, 22, 6, 4, shade(skin, 0.18))
    # deep-set glowing amber eyes
    cv.ellipse(cx - 6, 24, 3, 3, (236, 168, 84)); cv.ellipse(cx + 6, 24, 3, 3, (236, 168, 84))
    cv.set(cx - 6, 23, (255, 220, 150)); cv.set(cx + 6, 23, (255, 220, 150))
    cv.line(cx - 9, 20, cx - 3, 21, dk); cv.line(cx + 9, 20, cx + 3, 21, dk)  # brow
    # tusky underbite grin
    cv.line(cx - 6, 32, cx + 6, 32, (70, 76, 92))
    cv.rect(cx - 6, 29, 2, 3, furhi); cv.rect(cx + 4, 29, 2, 3, furhi)        # tusks
    # fur crown over the brow
    for hx in range(cx - 12, cx + 13, 3):
        cv.vline(hx, 13 + (hx % 3), 5, fur)
        cv.set(hx, 12 + (hx % 3), furhi)
    # ---- fine detail: chest snow dusting, claw nubs
    for (sx2, sy2) in [(cx - 6, 46), (cx + 4, 50), (cx - 2, 58), (cx + 10, 44)]:
        cv.set(sx2, sy2, furhi)
    for lx in (cx - 26, cx - 22, cx + 22, cx + 26):
        cv.set(lx, 69, (70, 76, 92))
    save_with_outline(cv, "boss_yeti")


def hitcher():
    cv = Canvas(56, 92, cs=CS)
    skin = (110, 160, 96); skinhi = (150, 200, 130); coat = (34, 36, 42); coathi = (64, 68, 78)
    hat = (22, 22, 28); white = (240, 245, 240)
    cx = 28
    # long victorian coat
    cv.fill_poly([(cx - 13, 88), (cx - 10, 40), (cx + 10, 40), (cx + 13, 88)], coat)
    cv.rect(cx - 10, 40, 6, 48, coathi)
    cv.line(cx, 42, cx, 86, (16, 16, 20))
    for by in (48, 58, 68):
        cv.set(cx - 3, by, (180, 180, 190)); cv.set(cx + 3, by, (180, 180, 190))
    # arms; one raised thumb (the eternal hitch)
    cv.rect(cx - 16, 44, 5, 20, coat); cv.rect(cx + 11, 30, 5, 18, coat)
    cv.rect(cx + 12, 24, 4, 7, skin)                    # the thumb, up
    cv.set(cx + 13, 23, skinhi)
    cv.rect(cx - 16, 63, 5, 4, skin)
    # green cockney head
    cv.ellipse(cx, 24, 11, 11, skin)
    cv.ellipse(cx - 4, 19, 5, 4, skinhi)
    # the polo eye + squint
    cv.ellipse(cx - 5, 22, 5, 5, white)
    cv.ellipse(cx - 5, 22, 2, 2, (20, 20, 24))
    cv.ellipse(cx - 5, 22, 5, 5, (200, 205, 200), fill=False)
    cv.line(cx + 2, 21, cx + 8, 22, (40, 70, 40))       # squinting other eye
    # crooked grin
    cv.line(cx - 5, 31, cx + 6, 30, (30, 50, 32))
    for gx in (cx - 3, cx + 1, cx + 4):
        cv.vline(gx, 29, 2, white)
    # battered top hat
    cv.rect(cx - 11, 10, 22, 4, hat)
    cv.rect(cx - 8, 0, 16, 11, hat)
    cv.rect(cx - 7, 1, 3, 8, (50, 50, 60))
    cv.rect(cx - 8, 8, 16, 2, (90, 160, 90))            # mouldy band
    # eels coiling at the hem
    for (ex, ey) in [(cx - 10, 84), (cx + 6, 86), (cx - 2, 88)]:
        cv.ellipse(ex, ey, 4, 2, (70, 100, 80)); cv.set(ex + 3, ey - 1, (140, 180, 150))
    save_with_outline(cv, "boss_hitcher")


def zeus():
    # the Flighty Zeus: Lance Dior + Harold Boon, your reflections gone retail
    cv = Canvas(76, 84, cs=CS)
    chrome = (190, 198, 216); chromehi = (230, 236, 248); ink = (40, 34, 52)
    lt = (150, 170, 210); lthi = (210, 224, 248)       # Lance: vince-ish blues
    ht = (150, 116, 72); hthi = (190, 158, 110)        # Harold: howard-ish tans
    for (cx, top, tophi, mane) in ((24, lt, lthi, True), (52, ht, hthi, False)):
        # legs + torso, sharper than the real thing
        cv.rect(cx - 8, 52, 6, 22, ink); cv.rect(cx + 2, 52, 6, 22, ink)
        cv.rect(cx - 10, 32, 20, 21, top)
        cv.rect(cx - 10, 32, 6, 21, tophi)
        cv.line(cx, 33, cx, 51, shade(top, -0.25))
        cv.rect(cx - 4, 34, 8, 5, chrome)              # chrome cravat
        cv.set(cx - 2, 36, chromehi)
        # head: chrome-pale, smug
        cv.ellipse(cx, 20, 9, 9, (232, 224, 226))
        cv.ellipse(cx - 3, 16, 4, 3, (248, 244, 246))
        # mirrored shades
        cv.rect(cx - 7, 18, 6, 3, chrome); cv.rect(cx + 1, 18, 6, 3, chrome)
        cv.set(cx - 5, 18, chromehi); cv.set(cx + 3, 18, chromehi)
        # one raised eyebrow each (opposite sides: they're reflections)
        cv.hline(cx - 7 if mane else cx + 2, 14, 5, ink)
        cv.line(cx - 3, 26, cx + 3, 25, (150, 90, 110))  # smirk
        if mane:
            for x in range(cx - 13, cx + 14):
                h2 = 14 - abs(x - cx)
                if h2 > 0:
                    for y in range(10 - h2 // 2, 12):
                        cv.set(x, y, ink)
            cv.rect(cx - 4, 8, 3, 2, chrome)            # chrome streak
        else:
            cv.rect(cx - 8, 11, 16, 4, (96, 64, 40))
            cv.hline(cx - 5, 24, 10, (96, 64, 40))      # the moustache, ironed
    # they share a mirrored floor glint
    cv.ellipse(38, 80, 30, 3, (210, 220, 240, 90))
    save_with_outline(cv, "boss_zeus")


def main():
    global OUT
    here = os.path.dirname(__file__)
    OUT = os.path.join(here, "..", "assets", "sprites")
    jazz()
    gregg()
    crackfox()
    nana()
    moon()
    tony()
    yeti()
    hitcher()
    zeus()


if __name__ == "__main__":
    main()
