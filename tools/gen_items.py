"""gen_items.py — a strip of 16x16 inventory icons.
Order matches ITEM_INDEX in src/data/items.js."""

import os
from pnglib import Canvas, shade

T = 16


def main():
    here = os.path.dirname(__file__)
    out = os.path.join(here, "..", "assets", "items", "items.png")
    cv = Canvas(T * 11, T)

    def at(i):
        return i * T

    # 0 Bailey's bottle
    x = at(0); cv.rect(x + 6, 3, 4, 2, (210, 210, 220)); cv.rect(x + 5, 5, 6, 9, (120, 84, 50)); cv.rect(x + 6, 7, 4, 4, (235, 225, 200)); cv.set(x + 7, 8, (255, 245, 225))
    # 1 Polo mint
    x = at(1); cv.ellipse(x + 8, 8, 6, 6, (240, 245, 250)); cv.ellipse(x + 8, 8, 2, 2, (0, 0, 0, 0)); cv.ellipse(x + 8, 8, 6, 6, (180, 200, 210), fill=False); cv.rect(x + 7, 7, 2, 2, (0, 0, 0, 0))
    # 2 Naboo's hat (pointed)
    x = at(2); cv.fill_poly([(x + 8, 1), (x + 3, 12), (x + 13, 12)], (120, 80, 200)); cv.rect(x + 2, 12, 12, 2, (90, 60, 160)); cv.set(x + 8, 4, (200, 180, 255))
    # 3 Banana
    x = at(3); cv.fill_poly([(x + 3, 11), (x + 6, 4), (x + 12, 5), (x + 13, 9), (x + 7, 13)], (230, 200, 60)); cv.set(x + 6, 4, (90, 70, 30)); cv.line(x + 5, 10, x + 11, 7, (200, 170, 40))
    # 4 Mirror
    x = at(4); cv.ellipse(x + 8, 7, 5, 5, (200, 230, 245)); cv.ellipse(x + 6, 5, 2, 2, (255, 255, 255)); cv.rect(x + 7, 12, 2, 3, (150, 120, 70))
    # 5 Crimp Record
    x = at(5); cv.ellipse(x + 8, 8, 7, 7, (30, 30, 40)); cv.ellipse(x + 8, 8, 7, 7, (140, 90, 220), fill=False); cv.ellipse(x + 8, 8, 2, 2, (230, 200, 120)); cv.set(x + 5, 5, (180, 140, 255))
    # 6 Jazz cigarette
    x = at(6); cv.rect(x + 3, 8, 9, 2, (240, 240, 230)); cv.rect(x + 11, 8, 2, 2, (220, 120, 40)); cv.set(x + 2, 7, (180, 180, 180)); cv.set(x + 1, 5, (140, 140, 140))
    # 7 Shiny bin lid
    x = at(7); cv.ellipse(x + 8, 9, 7, 4, (170, 175, 185)); cv.ellipse(x + 8, 8, 7, 4, (210, 215, 225), fill=False); cv.rect(x + 7, 5, 2, 2, (120, 125, 135)); cv.set(x + 5, 8, (255, 255, 255))
    # 8 Ornate key
    x = at(8); cv.ellipse(x + 5, 6, 3, 3, (220, 190, 110)); cv.ellipse(x + 5, 6, 1, 1, (120, 90, 40)); cv.rect(x + 7, 7, 6, 2, (220, 190, 110)); cv.rect(x + 11, 9, 2, 2, (220, 190, 110))
    # 9 Funk cream jar
    x = at(9); cv.rect(x + 4, 6, 8, 8, (235, 230, 210)); cv.rect(x + 4, 4, 8, 2, (190, 150, 90)); cv.rect(x + 5, 8, 6, 2, (200, 120, 180)); cv.set(x + 6, 9, (240, 160, 220))
    # 10 Crimp note (collectible)
    x = at(10)
    cv.ellipse(x + 6, 12, 3, 2, (120, 90, 230)); cv.ellipse(x + 6, 12, 2, 1, (180, 150, 255))
    cv.rect(x + 8, 3, 2, 9, (90, 220, 255))
    cv.fill_poly([(x + 10, 3), (x + 13, 4), (x + 13, 7), (x + 10, 6)], (90, 220, 255))
    cv.set(x + 9, 4, (200, 245, 255))

    cv.write(out)
    print("wrote", out)


if __name__ == "__main__":
    main()
