"""gen_items.py — a strip of 32x32 inventory icons (native ART resolution).
Order matches ITEM_INDEX in src/data/items.js."""

import os
from pnglib import Canvas, shade, CS

T = 32
CLR = (0, 0, 0, 0)


N_ICONS = 22  # 0-10 classic items, 11 shrapnel, 12-17 gear, 18-21 collectibles


def main():
    here = os.path.dirname(__file__)
    out = os.path.join(here, "..", "assets", "items", "items.png")
    cv = Canvas(T * N_ICONS, T, cs=CS)

    def at(i):
        return i * T

    # 0 Bailey's bottle
    x = at(0)
    cv.rect(x + 12, 6, 8, 4, (210, 210, 220))          # cap
    cv.rect(x + 10, 10, 12, 18, (120, 84, 50))         # bottle
    cv.rect(x + 10, 10, 3, 18, (150, 110, 72))         # highlight
    cv.rect(x + 12, 14, 8, 8, (235, 225, 200))         # label
    cv.set(x + 15, 17, (255, 245, 225))
    cv.rect_outline(x + 12, 14, 8, 8, (180, 150, 110))

    # 1 Polo mint
    x = at(1)
    cv.ellipse(x + 16, 16, 12, 12, (240, 245, 250))
    cv.ellipse(x + 16, 16, 12, 12, (180, 200, 210), fill=False)
    cv.ellipse(x + 12, 11, 4, 3, (255, 255, 255))      # sheen
    cv.ellipse(x + 16, 16, 4, 4, CLR)                  # hole

    # 2 Naboo's hat (pointed)
    x = at(2)
    cv.fill_poly([(x + 16, 2), (x + 6, 24), (x + 26, 24)], (120, 80, 200))
    cv.fill_poly([(x + 16, 2), (x + 11, 24), (x + 16, 24)], (150, 110, 240))
    cv.rect(x + 4, 24, 24, 4, (90, 60, 160))
    cv.ellipse(x + 14, 9, 2, 3, (210, 190, 255))       # star
    cv.set(x + 14, 8, (255, 255, 255))

    # 3 Banana
    x = at(3)
    cv.fill_poly([(x + 6, 22), (x + 12, 8), (x + 24, 10), (x + 26, 18), (x + 14, 26)], (230, 200, 60))
    cv.fill_poly([(x + 9, 20), (x + 13, 11), (x + 22, 12), (x + 12, 23)], (245, 220, 90))
    cv.rect(x + 11, 7, 3, 3, (90, 70, 30))             # stem
    cv.line(x + 10, 20, x + 22, 14, (200, 170, 40))

    # 4 Mirror
    x = at(4)
    cv.ellipse(x + 16, 13, 10, 10, (150, 120, 70))     # frame
    cv.ellipse(x + 16, 13, 8, 8, (200, 230, 245))      # glass
    cv.ellipse(x + 12, 9, 3, 3, (255, 255, 255))       # glint
    cv.rect(x + 14, 23, 4, 7, (150, 120, 70))          # handle

    # 5 Crimp Record
    x = at(5)
    cv.ellipse(x + 16, 16, 14, 14, (30, 30, 40))
    cv.ellipse(x + 16, 16, 14, 14, (140, 90, 220), fill=False)
    cv.ellipse(x + 16, 16, 9, 9, (40, 40, 52), fill=False)
    cv.ellipse(x + 16, 16, 4, 4, (230, 200, 120))
    cv.ellipse(x + 10, 10, 3, 2, (180, 140, 255))      # sheen

    # 6 Jazz cigarette
    x = at(6)
    cv.rect(x + 6, 16, 18, 4, (240, 240, 230))
    cv.rect(x + 22, 16, 4, 4, (220, 120, 40))          # ember
    cv.rect(x + 6, 16, 18, 1, (255, 255, 255))
    for (sx, sy) in [(x + 4, 13), (x + 2, 9), (x + 3, 5)]:
        cv.ellipse(sx, sy, 2, 2, (170, 170, 180, 160))

    # 7 Shiny bin lid
    x = at(7)
    cv.ellipse(x + 16, 18, 14, 8, (170, 175, 185))
    cv.ellipse(x + 16, 16, 14, 8, (210, 215, 225), fill=False)
    cv.ellipse(x + 16, 16, 8, 4, (190, 195, 205))
    cv.rect(x + 14, 9, 4, 4, (120, 125, 135))          # knob
    cv.ellipse(x + 10, 16, 3, 2, (255, 255, 255))      # glint

    # 8 Ornate key
    x = at(8)
    cv.ellipse(x + 10, 12, 6, 6, (220, 190, 110))      # bow
    cv.ellipse(x + 10, 12, 3, 3, (120, 90, 40))
    cv.rect(x + 14, 14, 12, 4, (220, 190, 110))        # shaft
    cv.rect(x + 22, 18, 4, 4, (220, 190, 110))         # teeth
    cv.rect(x + 18, 18, 2, 3, (220, 190, 110))
    cv.set(x + 8, 9, (255, 235, 170))

    # 9 Funk cream jar
    x = at(9)
    cv.rect(x + 8, 12, 16, 16, (235, 230, 210))
    cv.rect(x + 8, 8, 16, 4, (190, 150, 90))           # lid
    cv.rect(x + 10, 16, 12, 5, (200, 120, 180))        # label
    cv.set(x + 13, 18, (240, 160, 220))
    cv.rect(x + 8, 12, 3, 16, (245, 242, 226))         # highlight

    # 10 Crimp note (collectible)
    x = at(10)
    cv.ellipse(x + 12, 24, 5, 4, (120, 90, 230))       # note head
    cv.ellipse(x + 12, 24, 3, 2, (180, 150, 255))
    cv.rect(x + 16, 6, 3, 18, (90, 220, 255))          # stem
    cv.fill_poly([(x + 19, 6), (x + 26, 8), (x + 26, 14), (x + 19, 12)], (90, 220, 255))  # flag
    cv.set(x + 18, 8, (200, 245, 255))

    # 11 Shrapnel (the currency: a battered coin)
    x = at(11)
    cv.ellipse(x + 16, 16, 11, 11, (220, 180, 80))
    cv.ellipse(x + 16, 16, 11, 11, (160, 120, 40), fill=False)
    cv.ellipse(x + 16, 16, 7, 7, (240, 205, 110), fill=False)
    cv.rect(x + 14, 11, 4, 10, (170, 130, 50))         # dented "S"-ish stamp
    cv.rect(x + 12, 11, 4, 3, (170, 130, 50))
    cv.rect(x + 16, 18, 4, 3, (170, 130, 50))
    cv.ellipse(x + 11, 11, 2, 2, (255, 240, 180))      # glint

    # 12 Goth Phase (black lace + eyeliner vibes: a dark heart)
    x = at(12)
    cv.ellipse(x + 11, 12, 6, 6, (40, 30, 55))
    cv.ellipse(x + 21, 12, 6, 6, (40, 30, 55))
    cv.fill_poly([(x + 5, 14), (x + 27, 14), (x + 16, 27)], (40, 30, 55))
    cv.ellipse(x + 11, 11, 2, 2, (110, 80, 160))       # violet sheen
    cv.line(x + 9, 20, x + 23, 20, (90, 60, 130))

    # 13 Mirrorball Suit
    x = at(13)
    cv.ellipse(x + 16, 16, 12, 12, (200, 210, 230))
    for gx in range(6, 27, 5):
        cv.vline(x + gx, 6, 21, (150, 160, 190))
    for gy in range(7, 27, 5):
        cv.hline(x + 6, gy, 21, (150, 160, 190))
    cv.ellipse(x + 11, 10, 3, 3, (255, 255, 255))      # disco glint
    cv.set(x + 23, 20, (255, 255, 255))

    # 14 Jazz Trumpet
    x = at(14)
    cv.rect(x + 5, 15, 16, 3, (230, 190, 90))          # tube
    cv.fill_poly([(x + 21, 11), (x + 28, 8), (x + 28, 24), (x + 21, 21)], (240, 205, 110))  # bell
    cv.rect(x + 9, 11, 2, 5, (230, 190, 90))           # valves
    cv.rect(x + 13, 11, 2, 5, (230, 190, 90))
    cv.rect(x + 17, 11, 2, 5, (230, 190, 90))
    cv.rect(x + 3, 14, 3, 5, (200, 160, 70))           # mouthpiece

    # 15 Bainbridge Flute
    x = at(15)
    cv.rect(x + 4, 14, 24, 4, (210, 215, 225))
    cv.rect(x + 4, 14, 24, 1, (240, 245, 250))
    for hx in range(12, 26, 4):
        cv.set(x + hx, 16, (90, 95, 110))
    cv.rect(x + 4, 13, 4, 6, (180, 185, 195))          # head joint

    # 16 Naboo's Talisman
    x = at(16)
    cv.line(x + 8, 6, x + 16, 12, (170, 140, 60))      # cord
    cv.line(x + 24, 6, x + 16, 12, (170, 140, 60))
    cv.ellipse(x + 16, 19, 8, 8, (120, 80, 200))       # amulet
    cv.ellipse(x + 16, 19, 8, 8, (90, 60, 160), fill=False)
    cv.ellipse(x + 16, 19, 3, 3, (220, 190, 255))      # third eye
    cv.set(x + 16, 19, (255, 255, 255))

    # 17 Carpet Thread
    x = at(17)
    cv.rect(x + 7, 9, 18, 14, (170, 60, 70))           # carpet square
    cv.rect(x + 9, 11, 14, 10, (220, 150, 70))
    cv.rect(x + 12, 13, 8, 6, (120, 160, 190))
    for fy in (9, 22):
        for fx in range(8, 25, 3):
            cv.set(x + fx, fy + (1 if fy > 10 else 0), (240, 220, 140))  # tassels
    cv.line(x + 24, 10, x + 28, 5, (240, 220, 140))    # the loose thread

    # 18 Celebrity Radiator
    x = at(18)
    cv.rect(x + 6, 10, 20, 14, (200, 205, 215))
    for rx in range(8, 25, 4):
        cv.rect(x + rx, 11, 2, 12, (160, 165, 180))
    cv.rect(x + 6, 10, 20, 2, (230, 235, 245))
    cv.set(x + 26, 13, (120, 125, 140))                # valve
    cv.ellipse(x + 12, 7, 3, 2, (255, 170, 90))        # rising heat
    cv.ellipse(x + 20, 6, 2, 2, (255, 170, 90, 160))

    # 19 Jazz Rare (smooth fusion vinyl, golden label)
    x = at(19)
    cv.ellipse(x + 16, 16, 13, 13, (35, 30, 28))
    cv.ellipse(x + 16, 16, 13, 13, (190, 150, 60), fill=False)
    cv.ellipse(x + 16, 16, 8, 8, (45, 40, 36), fill=False)
    cv.ellipse(x + 16, 16, 4, 4, (220, 170, 70))
    cv.ellipse(x + 11, 10, 3, 2, (120, 110, 100))      # sheen

    # 20 Shiny Thing (it is simply shiny)
    x = at(20)
    cv.fill_poly([(x + 16, 4), (x + 21, 13), (x + 28, 16), (x + 21, 19), (x + 16, 28),
                  (x + 11, 19), (x + 4, 16), (x + 11, 13)], (235, 240, 250))
    cv.fill_poly([(x + 16, 9), (x + 19, 14), (x + 16, 19), (x + 13, 14)], (180, 220, 255))
    cv.set(x + 16, 13, (255, 255, 255))

    # 21 Yeti Tuft (a puff of legendary shag)
    x = at(21)
    cv.ellipse(x + 16, 17, 10, 9, (236, 240, 246))
    cv.ellipse(x + 11, 13, 5, 4, (255, 255, 255))
    cv.ellipse(x + 21, 21, 4, 3, (200, 208, 220))
    for (tx, ty) in [(x + 8, 23), (x + 14, 26), (x + 21, 25), (x + 25, 14), (x + 16, 7)]:
        cv.line(tx, ty, tx + 2, ty + 3, (216, 222, 232))

    cv.outline((26, 20, 34))   # crisp dark rim so icons read as world pickups
    cv.write(out)
    print("wrote", out)


if __name__ == "__main__":
    main()
