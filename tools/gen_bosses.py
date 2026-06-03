"""gen_bosses.py — bespoke pixel-art boss sprites (shown large in crimp-offs).

Each is drawn by hand from primitives. Sizes vary; the crimp scene scales them
up (bossScale) and the overworld draws them at native size, feet-aligned.
"""

import os
from pnglib import Canvas, shade

OUT = None


def save(cv, name):
    cv.write(os.path.join(OUT, name + ".png"))
    print("wrote", name)


def outline_dark(cv, col=(12, 8, 20)):
    cv.outline(col)


# --------------------------------------------------------------------------
def jazz():
    cv = Canvas(28, 42)
    body = (70, 70, 84); hi = (120, 120, 140); dk = (40, 40, 52)
    cx = 14
    # smoky lower body tapering into wisps
    cv.fill_poly([(cx - 6, 40), (cx - 4, 24), (cx + 4, 24), (cx + 6, 40)], body)
    cv.fill_poly([(cx - 4, 40), (cx - 2, 30), (cx + 2, 30), (cx + 4, 40)], dk)
    # torso / jacket
    cv.rect(cx - 5, 18, 10, 9, body)
    cv.rect(cx - 5, 18, 3, 9, hi)
    cv.line(cx, 19, cx, 26, dk)
    # white shirt + bow tie
    cv.rect(cx - 1, 19, 2, 5, (235, 235, 245))
    cv.set(cx, 20, (210, 60, 60))
    # arms holding a trumpet
    cv.rect(cx + 4, 19, 2, 6, body)
    cv.rect(cx - 6, 20, 2, 5, body)
    gold = (220, 180, 70); goldhi = (250, 220, 130)
    cv.rect(cx + 5, 22, 6, 2, gold)
    cv.ellipse(cx + 11, 23, 3, 3, gold)
    cv.ellipse(cx + 11, 23, 2, 2, goldhi)
    # head
    cv.ellipse(cx, 13, 5, 5, (90, 90, 104))
    cv.ellipse(cx - 1, 12, 3, 2, hi)
    # sunglasses
    cv.rect(cx - 4, 12, 3, 2, (10, 10, 14))
    cv.rect(cx + 1, 12, 3, 2, (10, 10, 14))
    cv.set(cx - 3, 12, (200, 220, 255))
    # toothy grin
    cv.rect(cx - 2, 15, 5, 1, (235, 235, 245))
    # top hat
    cv.rect(cx - 5, 6, 10, 2, (16, 16, 22))
    cv.rect(cx - 4, 1, 8, 6, (16, 16, 22))
    cv.rect(cx - 4, 5, 8, 1, (210, 60, 60))
    # smoke wisps
    for (wx, wy) in [(cx - 8, 14), (cx + 9, 10), (cx - 7, 6), (cx + 7, 30), (cx - 9, 34)]:
        cv.set(wx, wy, (150, 150, 170, 160))
        cv.set(wx + 1, wy - 1, (110, 110, 130, 120))
    outline_dark(cv)
    save(cv, "boss_jazz")


def gregg():
    cv = Canvas(30, 44)
    green = (96, 168, 120); greenhi = (140, 210, 160); dk = (54, 110, 78)
    cx = 15
    # fish tail
    cv.fill_poly([(cx - 7, 43), (cx, 33), (cx + 7, 43)], green)
    cv.fill_poly([(cx - 4, 42), (cx, 35), (cx + 4, 42)], dk)
    cv.line(cx - 5, 41, cx, 36, greenhi)
    # body
    cv.ellipse(cx, 26, 8, 8, green)
    cv.ellipse(cx - 3, 23, 4, 4, greenhi)
    # scales speckle
    for (sx, sy) in [(cx - 4, 28), (cx + 3, 27), (cx, 30), (cx + 5, 24), (cx - 6, 24)]:
        cv.set(sx, sy, dk)
    # arms
    cv.rect(cx - 9, 22, 2, 7, green); cv.rect(cx + 7, 22, 2, 7, green)
    # head — big and bulbous
    cv.ellipse(cx, 13, 7, 7, green)
    cv.ellipse(cx - 2, 11, 3, 3, greenhi)
    # huge eyes
    cv.ellipse(cx - 3, 12, 3, 3, (245, 245, 245)); cv.ellipse(cx + 3, 12, 3, 3, (245, 245, 245))
    cv.set(cx - 3, 12, (20, 20, 30)); cv.set(cx + 3, 12, (20, 20, 30))
    cv.set(cx - 4, 11, (255, 255, 255)); cv.set(cx + 2, 11, (255, 255, 255))
    # frown / worried mouth
    cv.line(cx - 2, 17, cx + 2, 17, dk)
    # seaweed hair
    for (hx, off) in [(-6, 0), (-3, -1), (0, -2), (3, -1), (6, 0)]:
        cv.line(cx + hx, 7 + off, cx + hx + (1 if hx < 0 else -1), 1, dk)
    save_with_outline(cv, "boss_gregg")


def crackfox():
    cv = Canvas(34, 30)
    fur = (188, 110, 60); furhi = (224, 156, 96); dk = (120, 66, 36); white = (235, 230, 220)
    cx = 17
    # scruffy body, low and twitchy
    cv.ellipse(cx, 20, 11, 7, fur)
    cv.ellipse(cx - 4, 18, 5, 3, furhi)
    # ragged fur tufts
    for tx in range(cx - 10, cx + 11, 3):
        cv.set(tx, 13 + (tx % 3), dk)
    # legs
    for lx in (cx - 7, cx - 2, cx + 3, cx + 8):
        cv.rect(lx, 24, 2, 5, dk)
    # bushy tail
    cv.ellipse(cx + 13, 18, 5, 4, fur); cv.ellipse(cx + 16, 16, 2, 2, white)
    # head tilted, manic
    cv.ellipse(cx - 6, 12, 6, 5, fur)
    cv.fill_poly([(cx - 11, 9), (cx - 9, 3), (cx - 7, 9)], fur)   # ears
    cv.fill_poly([(cx - 4, 9), (cx - 2, 3), (cx, 9)], fur)
    # snout
    cv.fill_poly([(cx - 12, 13), (cx - 16, 14), (cx - 12, 16)], furhi)
    cv.set(cx - 16, 14, (20, 16, 18))
    # wild eyes
    cv.ellipse(cx - 8, 11, 2, 2, white); cv.ellipse(cx - 4, 11, 2, 2, white)
    cv.set(cx - 8, 11, (200, 30, 30)); cv.set(cx - 4, 11, (200, 30, 30))
    # jagged grin
    for gx in range(cx - 12, cx - 5, 2):
        cv.set(gx, 15, white)
    save_with_outline(cv, "boss_crackfox")


def nana():
    cv = Canvas(28, 44)
    card = (150, 70, 110); cardhi = (190, 110, 150); skin = (210, 190, 196); dk = (90, 40, 70)
    cx = 14
    # long skirt
    cv.fill_poly([(cx - 8, 43), (cx - 5, 26), (cx + 5, 26), (cx + 8, 43)], (70, 56, 70))
    # cardigan torso
    cv.rect(cx - 6, 20, 12, 8, card)
    cv.rect(cx - 6, 20, 3, 8, cardhi)
    cv.line(cx, 21, cx, 27, dk)
    for by in (22, 25):  # buttons
        cv.set(cx, by, (230, 220, 180))
    # arms
    cv.rect(cx - 8, 21, 2, 7, card); cv.rect(cx + 6, 21, 2, 7, card)
    cv.set(cx - 8, 28, skin); cv.set(cx + 7, 28, skin)
    # head
    cv.ellipse(cx, 13, 6, 6, skin)
    # grey bun hair
    cv.ellipse(cx, 7, 6, 4, (210, 210, 215))
    cv.ellipse(cx, 4, 3, 3, (225, 225, 230))
    # glowing demon eyes + glasses
    cv.rect(cx - 4, 12, 3, 2, (255, 60, 60)); cv.rect(cx + 1, 12, 3, 2, (255, 60, 60))
    cv.rect_outline(cx - 5, 11, 4, 4, (60, 60, 70)); cv.rect_outline(cx + 1, 11, 4, 4, (60, 60, 70))
    cv.set(cx, 12, (60, 60, 70))
    # sharp grin
    cv.line(cx - 3, 16, cx + 3, 16, dk)
    for gx in range(cx - 3, cx + 4, 2):
        cv.set(gx, 16, (245, 245, 245))
    save_with_outline(cv, "boss_nana")


def moon():
    cv = Canvas(38, 38)
    white = (244, 244, 220); hi = (255, 255, 240); dk = (200, 200, 175)
    cx, cy = 19, 19
    cv.ellipse(cx, cy, 16, 16, white)
    cv.ellipse(cx - 5, cy - 5, 7, 6, hi)
    # craters
    for (mx, my, r) in [(cx + 7, cy - 6, 3), (cx - 9, cy + 6, 2), (cx + 5, cy + 8, 2)]:
        cv.ellipse(mx, my, r, r, dk)
    # the famous face — side profile-ish features
    cv.ellipse(cx - 4, cy - 2, 2, 2, (40, 40, 40))   # eye
    cv.ellipse(cx + 1, cy - 2, 1, 2, (40, 40, 40))   # eye
    cv.fill_poly([(cx - 7, cy + 2), (cx - 9, cy + 5), (cx - 6, cy + 5)], dk)  # nose
    cv.line(cx - 5, cy + 8, cx + 2, cy + 8, (60, 60, 60))   # gentle mouth
    cv.set(cx + 2, cy + 7, (60, 60, 60))
    save_with_outline(cv, "boss_moon", col=(120, 120, 150))


def tony():
    cv = Canvas(38, 44)
    pink = (240, 130, 190); pinkhi = (255, 180, 220); dk = (190, 80, 140)
    cx = 19
    # pedestal
    cv.rect(cx - 8, 38, 16, 5, (120, 100, 150))
    cv.rect(cx - 8, 38, 16, 1, (170, 150, 200))
    # tentacles
    for (tx, sway) in [(-7, -2), (-3, 1), (1, -1), (5, 2), (8, -2)]:
        cv.fill_poly([(cx + tx, 28), (cx + tx + 2, 28), (cx + tx + sway, 38)], pink)
        cv.set(cx + tx + sway, 37, dk)
    # bulbous dome head/body
    cv.ellipse(cx, 18, 11, 13, pink)
    cv.ellipse(cx - 4, 12, 5, 5, pinkhi)
    # speckles
    for (sx, sy) in [(cx + 5, 14), (cx - 6, 20), (cx + 3, 24), (cx, 10)]:
        cv.set(sx, sy, dk)
    # enormous indignant eyes
    cv.ellipse(cx - 5, 16, 4, 4, (245, 245, 245)); cv.ellipse(cx + 5, 16, 4, 4, (245, 245, 245))
    cv.ellipse(cx - 5, 17, 2, 2, (20, 20, 30)); cv.ellipse(cx + 5, 17, 2, 2, (20, 20, 30))
    cv.set(cx - 6, 15, (255, 255, 255)); cv.set(cx + 4, 15, (255, 255, 255))
    # angry brows
    cv.line(cx - 8, 12, cx - 3, 14, dk); cv.line(cx + 8, 12, cx + 3, 14, dk)
    # outraged mouth
    cv.ellipse(cx, 24, 3, 2, (120, 40, 70))
    save_with_outline(cv, "boss_tony")


def save_with_outline(cv, name, col=(12, 8, 20)):
    cv.outline(col)
    save(cv, name)


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
