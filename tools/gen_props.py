"""gen_props.py — searchable scenery + switch/gate sprites.

A strip of 32x48 frames (objects bottom-aligned, like NPCs; the overworld
draws them at dy-8*ART). Authored natively at ART resolution (scale=1).
Index order is the contract with PROP_INDEX in src/data/items.js.

  0 bin        1 snowmound   2 shell      3 urn        4 bush
  5 crate      6 rock        7 switch_up  8 switch_dn  9 gate_closed
 10 gate_open 11 chest
"""

import os
from pnglib import Canvas, shade, CS

FW, FH = 32, 48
N = 12


def base_shadow(cv, ox):
    for dx in range(-11, 12):
        a = 80 - abs(dx) * 6
        if a > 0:
            cv.set(ox + 16 + dx, 45, (0, 0, 0, a))
            if a > 36:
                cv.set(ox + 16 + dx, 44, (0, 0, 0, a - 36))


def bin_(cv, ox):
    c = (120, 126, 138); hi = (170, 176, 188); dk = shade(c, -0.4)
    cv.rect(ox + 6, 16, 20, 26, c)
    cv.rect(ox + 6, 16, 6, 26, hi)
    for x in range(ox + 9, ox + 26, 4):
        cv.vline(x, 18, 22, dk)
    cv.rect(ox + 4, 12, 24, 4, hi)          # lid
    cv.rect(ox + 4, 12, 24, 1, shade(hi, 0.3))
    cv.rect(ox + 14, 9, 4, 3, dk)           # handle


def snowmound(cv, ox):
    c = (224, 238, 250); hi = (255, 255, 255); dk = (180, 206, 232)
    cv.ellipse(ox + 16, 36, 14, 10, c)
    cv.ellipse(ox + 11, 30, 8, 6, hi)
    cv.ellipse(ox + 22, 38, 4, 2, dk)
    cv.set(ox + 8, 40, dk); cv.set(ox + 24, 34, hi)


def shell(cv, ox):
    c = (240, 180, 200); hi = (255, 220, 235); dk = (200, 120, 150)
    cv.ellipse(ox + 16, 34, 12, 10, c)
    for a in (-6, -2, 2, 6):
        cv.line(ox + 16, 42, ox + 16 + a, 24, dk)
    cv.ellipse(ox + 16, 40, 4, 2, hi)
    cv.ellipse(ox + 13, 30, 3, 2, hi)


def urn(cv, ox):
    c = (202, 176, 132); hi = (236, 214, 168); dk = shade(c, -0.4)
    cv.ellipse(ox + 16, 30, 10, 14, c)
    cv.rect(ox + 10, 12, 12, 6, c)
    cv.rect(ox + 8, 10, 16, 4, hi)
    cv.ellipse(ox + 12, 26, 3, 6, hi)
    cv.ellipse(ox + 21, 32, 3, 5, dk)


def bush(cv, ox):
    c = (74, 140, 66); hi = (110, 180, 96); dk = shade(c, -0.4)
    cv.ellipse(ox + 16, 32, 14, 10, c)
    cv.ellipse(ox + 10, 26, 6, 5, hi)
    cv.ellipse(ox + 22, 34, 4, 3, dk)
    for (bx, by) in [(ox + 12, 24), (ox + 20, 26), (ox + 16, 30)]:
        cv.ellipse(bx, by, 1, 1, (240, 90, 120))   # berries
        cv.set(bx, by - 1, (255, 160, 180))


def crate(cv, ox):
    c = (150, 110, 66); hi = (188, 146, 96); dk = shade(c, -0.4)
    cv.rect(ox + 6, 18, 22, 24, c)
    cv.rect_outline(ox + 6, 18, 22, 24, dk)
    cv.line(ox + 6, 18, ox + 27, 41, dk)
    cv.line(ox + 27, 18, ox + 6, 41, dk)
    cv.rect(ox + 6, 18, 22, 2, hi)
    cv.vline(ox + 6, 18, 24, hi)


def rock(cv, ox):
    c = (150, 152, 168); hi = (196, 198, 214); dk = shade(c, -0.4)
    cv.ellipse(ox + 16, 34, 14, 10, c)
    cv.ellipse(ox + 10, 28, 6, 4, hi)
    cv.line(ox + 18, 26, ox + 22, 40, dk)
    cv.set(ox + 24, 36, dk)


def switch_(cv, ox, pressed):
    base = (90, 80, 110); hi = (140, 128, 170)
    cv.ellipse(ox + 16, 40, 12, 6, base)            # pad
    cv.ellipse(ox + 16, 40, 12, 6, hi, fill=False)
    cv.ellipse(ox + 12, 38, 4, 2, hi)
    top = (230, 80, 90) if not pressed else (90, 200, 120)
    y = 30 if not pressed else 36
    if not pressed:
        cv.rect(ox + 12, 32, 8, 8, base)            # stem
        cv.vline(ox + 12, 32, 8, hi)
    cv.ellipse(ox + 16, y, 8, 5, top)
    cv.ellipse(ox + 16, y, 8, 5, shade(top, 0.3), fill=False)
    cv.ellipse(ox + 13, y - 1, 3, 1, shade(top, 0.4))


def gate(cv, ox, open_):
    post = (110, 96, 70); hi = (150, 132, 100); bar = (180, 186, 198); bardk = shade(bar, -0.3)
    cv.rect(ox + 4, 12, 4, 32, post); cv.rect(ox + 24, 12, 4, 32, post)
    cv.vline(ox + 4, 12, 32, hi); cv.vline(ox + 24, 12, 32, hi)
    if not open_:
        for y in (18, 26, 34):
            cv.rect(ox + 6, y, 20, 3, bar)
            cv.hline(ox + 6, y, 20, shade(bar, 0.25))
            cv.hline(ox + 6, y + 2, 20, bardk)
        cv.rect(ox + 14, 12, 4, 32, bar)
    else:
        cv.set(ox + 8, 16, hi); cv.set(ox + 22, 16, hi)


def chest(cv, ox):
    c = (150, 110, 66); hi = (200, 160, 96); gold = (224, 190, 110); dk = shade(c, -0.45)
    cv.rect(ox + 6, 24, 22, 18, c)
    cv.rect(ox + 6, 16, 22, 10, hi)            # domed lid
    cv.ellipse(ox + 17, 16, 11, 5, hi)
    cv.rect_outline(ox + 6, 16, 22, 26, dk)
    cv.hline(ox + 6, 26, 22, gold)
    cv.rect(ox + 14, 24, 4, 6, gold)           # lock
    cv.set(ox + 15, 27, dk)
    cv.hline(ox + 8, 18, 18, shade(hi, 0.25))


PAINTERS = [bin_, snowmound, shell, urn, bush, crate, rock,
            lambda cv, ox: switch_(cv, ox, False),
            lambda cv, ox: switch_(cv, ox, True),
            lambda cv, ox: gate(cv, ox, False),
            lambda cv, ox: gate(cv, ox, True),
            chest]


def main():
    here = os.path.dirname(__file__)
    out = os.path.join(here, "..", "assets", "sprites", "props.png")
    cv = Canvas(FW * len(PAINTERS), FH, cs=CS)
    step = int(FW * CS + 0.5)   # device cell width
    for i, paint in enumerate(PAINTERS):
        # ground shadow goes straight on the strip (behind the object)
        base_shadow(cv, i * FW)
        # paint the object on its own canvas so we can rim it without rimming
        # the soft ground shadow, then composite it over the shadow
        tmp = Canvas(FW, FH, cs=CS)
        paint(tmp, 0)
        tmp.outline((16, 12, 24))
        cv.blit(tmp, i * step, 0)
    cv.write(out)
    print("wrote", out)


if __name__ == "__main__":
    main()
