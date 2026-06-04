"""gen_items.py — a strip of 32x32 inventory icons (native ART resolution).
Order matches ITEM_INDEX in src/data/items.js."""

import os
from pnglib import Canvas, shade

T = 32
CLR = (0, 0, 0, 0)


def main():
    here = os.path.dirname(__file__)
    out = os.path.join(here, "..", "assets", "items", "items.png")
    cv = Canvas(T * 11, T, scale=1)

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

    cv.write(out)
    print("wrote", out)


if __name__ == "__main__":
    main()
