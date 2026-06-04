"""gen_props.py — searchable scenery + switch/gate sprites.

A strip of 16x24 frames (objects bottom-aligned, like NPCs; the overworld
draws them at dy-8). Index order is the contract with PROP_INDEX in
src/data/items.js.

  0 bin        1 snowmound   2 shell      3 urn        4 bush
  5 crate      6 rock        7 switch_up  8 switch_dn  9 gate_closed
 10 gate_open 11 chest
"""

import os
from pnglib import Canvas, shade

FW, FH = 16, 24
N = 12


def base_shadow(cv, ox):
    for dx in range(-5, 6):
        a = 70 - abs(dx) * 9
        if a > 0:
            cv.set(ox + 8 + dx, 22, (0, 0, 0, a))


def bin_(cv, ox):
    c = (120, 126, 138); hi = (170, 176, 188); dk = shade(c, -0.4)
    cv.rect(ox + 3, 8, 10, 13, c)
    cv.rect(ox + 3, 8, 3, 13, hi)
    for x in range(ox + 4, ox + 13, 2):
        cv.vline(x, 9, 11, dk)
    cv.rect(ox + 2, 6, 12, 2, hi)          # lid
    cv.set(ox + 8, 5, dk)


def snowmound(cv, ox):
    c = (224, 238, 250); hi = (255, 255, 255); dk = (180, 206, 232)
    cv.ellipse(ox + 8, 18, 7, 5, c)
    cv.ellipse(ox + 6, 15, 4, 3, hi)
    cv.set(ox + 11, 19, dk)
    cv.set(ox + 4, 20, dk)


def shell(cv, ox):
    c = (240, 180, 200); hi = (255, 220, 235); dk = (200, 120, 150)
    cv.ellipse(ox + 8, 17, 6, 5, c)
    for a in (-3, 0, 3):
        cv.line(ox + 8, 21, ox + 8 + a, 12, dk)
    cv.ellipse(ox + 8, 20, 2, 1, hi)


def urn(cv, ox):
    c = (202, 176, 132); hi = (236, 214, 168); dk = shade(c, -0.4)
    cv.ellipse(ox + 8, 15, 5, 7, c)
    cv.rect(ox + 5, 6, 6, 3, c)
    cv.rect(ox + 4, 5, 8, 2, hi)
    cv.ellipse(ox + 6, 13, 2, 3, hi)
    cv.set(ox + 10, 17, dk)


def bush(cv, ox):
    c = (74, 140, 66); hi = (110, 180, 96); dk = shade(c, -0.4)
    cv.ellipse(ox + 8, 16, 7, 5, c)
    cv.ellipse(ox + 5, 13, 3, 3, hi)
    cv.ellipse(ox + 11, 17, 2, 2, dk)
    for (bx, by) in [(ox + 6, 12), (ox + 10, 13)]:
        cv.set(bx, by, (240, 90, 120))   # berries


def crate(cv, ox):
    c = (150, 110, 66); hi = (188, 146, 96); dk = shade(c, -0.4)
    cv.rect(ox + 3, 9, 11, 12, c)
    cv.rect_outline(ox + 3, 9, 11, 12, dk)
    cv.line(ox + 3, 9, ox + 13, 20, dk)
    cv.line(ox + 13, 9, ox + 3, 20, dk)
    cv.hline(ox + 3, 9, 11, hi)


def rock(cv, ox):
    c = (150, 152, 168); hi = (196, 198, 214); dk = shade(c, -0.4)
    cv.ellipse(ox + 8, 17, 7, 5, c)
    cv.ellipse(ox + 5, 14, 3, 2, hi)
    cv.set(ox + 11, 18, dk)


def switch_(cv, ox, pressed):
    base = (90, 80, 110); hi = (140, 128, 170)
    cv.ellipse(ox + 8, 20, 6, 3, base)            # pad
    cv.ellipse(ox + 8, 20, 6, 3, hi, fill=False)
    top = (230, 80, 90) if not pressed else (90, 200, 120)
    y = 15 if not pressed else 18
    cv.ellipse(ox + 8, y, 4, 3, top)
    cv.ellipse(ox + 8, y, 4, 3, shade(top, 0.3), fill=False)
    if not pressed:
        cv.rect(ox + 6, 17, 4, 3, base)


def gate(cv, ox, open_):
    post = (110, 96, 70); hi = (150, 132, 100); bar = (180, 186, 198)
    # posts
    cv.rect(ox + 2, 6, 2, 16, post); cv.rect(ox + 12, 6, 2, 16, post)
    cv.vline(ox + 2, 6, 16, hi)
    if not open_:
        for y in (9, 13, 17):
            cv.hline(ox + 3, y, 10, bar)
        cv.rect(ox + 7, 6, 2, 16, bar)
    else:
        cv.set(ox + 4, 8, hi)  # subtle open frame only


def chest(cv, ox):
    c = (150, 110, 66); hi = (200, 160, 96); gold = (224, 190, 110); dk = shade(c, -0.45)
    cv.rect(ox + 3, 12, 11, 9, c)
    cv.rect(ox + 3, 8, 11, 5, hi)
    cv.rect_outline(ox + 3, 8, 11, 13, dk)
    cv.hline(ox + 3, 13, 11, gold)
    cv.rect(ox + 7, 12, 2, 3, gold)


PAINTERS = [bin_, snowmound, shell, urn, bush, crate, rock,
            lambda cv, ox: switch_(cv, ox, False),
            lambda cv, ox: switch_(cv, ox, True),
            lambda cv, ox: gate(cv, ox, False),
            lambda cv, ox: gate(cv, ox, True),
            chest]


def main():
    here = os.path.dirname(__file__)
    out = os.path.join(here, "..", "assets", "sprites", "props.png")
    cv = Canvas(FW * len(PAINTERS), FH)
    for i, paint in enumerate(PAINTERS):
        ox = i * FW
        base_shadow(cv, ox)
        paint(cv, ox)
    cv.write(out)
    print("wrote", out)


if __name__ == "__main__":
    main()
