"""gen_bosses.py — bespoke pixel-art boss sprites (shown large in crimp-offs).

Each is drawn by hand from primitives, authored natively at the engine's ART
resolution (scale=1) for genuine detail. Sizes vary; the crimp scene scales
them up (bossScale) and the overworld draws them at native size, feet-aligned.
"""

import os
from pnglib import Canvas, shade

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
    cv = Canvas(56, 84, scale=1)
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
    outline_dark(cv)
    save(cv, "boss_jazz")


def gregg():
    cv = Canvas(60, 88, scale=1)
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
    save_with_outline(cv, "boss_gregg")


def crackfox():
    cv = Canvas(68, 60, scale=1)
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
    save_with_outline(cv, "boss_crackfox")


def nana():
    cv = Canvas(56, 88, scale=1)
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
    save_with_outline(cv, "boss_nana")


def moon():
    cv = Canvas(76, 76, scale=1)
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
    save_with_outline(cv, "boss_moon", col=(120, 120, 150))


def tony():
    cv = Canvas(76, 88, scale=1)
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
    save_with_outline(cv, "boss_tony")


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


if __name__ == "__main__":
    main()
