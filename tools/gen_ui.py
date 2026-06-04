"""gen_ui.py — title logo + starry title background (native ART resolution)."""

import os
import math
from pnglib import Canvas, shade, lerp, CS
import gen_font as gf

# logo letters use Scale2x-smoothed glyphs (10x14) drawn at an integer block
# scale, then a 1px advance gap — authored natively (scale=1) for crisp edges.
GW, GH = 10, 14


def draw_big(cv, s, x, y, gs, colorfn, drop=None):
    for ch in s:
        big = gf.scale2x(gf.glyph_for(ch))
        for ry, row in enumerate(big):
            for rx, on in enumerate(row):
                if not on:
                    continue
                col = colorfn(ry)
                for sy in range(gs):
                    for sx in range(gs):
                        px, py = x + rx * gs + sx, y + ry * gs + sy
                        if drop:
                            cv.set(px + gs, py + gs, drop)
                        cv.set(px, py, col)
        x += (GW + 2) * gs
    return x


def text_w(s, gs):
    return len(s) * (GW + 2) * gs


def logo(out):
    cv = Canvas(520, 140, cs=CS)
    # "THE MIGHTY" — gold
    t1 = "THE MIGHTY"
    x = (520 - text_w(t1, 2)) // 2
    draw_big(cv, t1, x, 8, 2, lambda ry: lerp((255, 224, 140), (240, 180, 70), ry / GH), drop=(40, 20, 10))
    # "BOOSH" — big, purple->cyan vertical gradient
    t2 = "BOOSH"
    gs = 6
    bx = (520 - text_w(t2, gs)) // 2
    draw_big(cv, t2, bx, 48, gs, lambda ry: lerp((180, 130, 255), (90, 220, 255), ry / GH), drop=(20, 12, 40))
    cv.outline((16, 10, 30))
    cv.write(out)
    print("wrote", out)


def starfield(out, w=640, h=360):
    cv = Canvas(w, h, cs=CS)
    # vertical gradient night sky
    for y in range(h):
        t = y / h
        cv.hline(0, y, w, lerp((14, 10, 40), (44, 20, 74), t))
    # stars (deterministic), a few twinkly bigger ones
    def hsh(i):
        return (i * 2654435761) & 0xFFFFFFFF
    for i in range(320):
        v = hsh(i)
        sx = v % w
        sy = (v // w) % (h - 60)
        b = 150 + (v % 100)
        cv.set(sx, sy, (b, b, min(255, b + 30)))
        if i % 9 == 0:                                   # twinkle / plus shape
            cv.set(sx + 1, sy, (b, b, b)); cv.set(sx - 1, sy, (b, b, b))
            cv.set(sx, sy + 1, (b, b, b)); cv.set(sx, sy - 1, (b, b, b))
    # crescent moon, top-right, with craters
    mx, my = w - 100, 76
    cv.ellipse(mx, my, 32, 32, (245, 244, 220))
    cv.ellipse(mx - 10, my - 10, 14, 12, (255, 255, 240))
    for (cxr, cyr, r) in [(mx + 8, my + 6, 5), (mx - 4, my + 14, 3), (mx + 14, my - 8, 3)]:
        cv.ellipse(cxr, cyr, r, r, (220, 220, 196))
    cv.ellipse(mx + 12, my - 6, 30, 30, (44, 20, 74))    # bite -> crescent
    # distant layered hills
    for x in range(w):
        hh = int(28 + 16 * math.sin(x * 0.025) + 8 * math.sin(x * 0.065))
        for y in range(h - hh, h):
            cv.set(x, y, (24, 16, 44))
    for x in range(w):
        hh = int(14 + 10 * math.sin(x * 0.04 + 2) + 5 * math.sin(x * 0.11))
        for y in range(h - hh, h):
            cv.set(x, y, (16, 10, 30))
    cv.write(out)
    print("wrote", out)


def main():
    here = os.path.dirname(__file__)
    ui = os.path.join(here, "..", "assets", "ui")
    bg = os.path.join(here, "..", "assets", "bg")
    logo(os.path.join(ui, "logo.png"))
    starfield(os.path.join(bg, "title.png"))
    starfield(os.path.join(bg, "stars.png"))


if __name__ == "__main__":
    main()
