"""gen_ui.py — title logo + starry title background."""

import os
import math
from pnglib import Canvas, shade, lerp
import gen_font as gf


def big_text(cv, s, x, y, scale, color, outline=(12, 8, 24), shadow=None):
    for ch in s:
        g = gf.glyph_for(ch)
        for ry, row in enumerate(g):
            for rx, c in enumerate(row):
                if c == "#":
                    for sy in range(scale):
                        for sx in range(scale):
                            cv.set(x + rx * scale + sx, y + ry * scale + sy, color)
        x += (len(g[0]) + 1) * scale
    return x


def text_w(s, scale):
    return len(s) * (6 * scale)


def logo(out):
    cv = Canvas(260, 70)
    # "THE MIGHTY" small, gradient gold
    t1 = "THE MIGHTY"
    x = (260 - text_w(t1, 2)) // 2
    big_text(cv, t1, x, 4, 2, (255, 210, 110))
    # "BOOSH" big with per-row gradient (purple->cyan)
    t2 = "BOOSH"
    scale = 6
    w = text_w(t2, scale)
    bx = (260 - w) // 2
    by = 24
    # draw glyphs with vertical gradient
    cx = bx
    for ch in t2:
        g = gf.glyph_for(ch)
        for ry, row in enumerate(g):
            col = lerp((180, 130, 255), (90, 220, 255), ry / 6)
            for rx, c in enumerate(row):
                if c == "#":
                    for sy in range(scale):
                        for sx in range(scale):
                            cv.set(cx + rx * scale + sx, by + ry * scale + sy, col)
        cx += (len(g[0]) + 1) * scale
    # outline pass for both
    cv.outline((16, 10, 30))
    cv.write(out)
    print("wrote", out)


def starfield(out, w=320, h=180):
    cv = Canvas(w, h)
    # vertical gradient night sky
    for y in range(h):
        t = y / h
        cv.hline(0, y, w, lerp((14, 10, 40), (42, 18, 70), t))
    # stars (deterministic)
    def hsh(i):
        v = (i * 2654435761) & 0xFFFFFFFF
        return v
    for i in range(150):
        v = hsh(i)
        sx = v % w
        sy = (v // w) % (h - 30)
        b = 150 + (v % 100)
        cv.set(sx, sy, (b, b, min(255, b + 30)))
        if i % 11 == 0:
            cv.set(sx + 1, sy, (b, b, b)); cv.set(sx, sy + 1, (b, b, b))
    # a crescent moon, top-right
    mx, my = w - 50, 38
    cv.ellipse(mx, my, 16, 16, (245, 244, 220))
    cv.ellipse(mx + 6, my - 3, 14, 14, (42, 18, 70))
    # little face on the moon
    cv.set(mx - 4, my - 2, (60, 60, 60)); cv.set(mx - 6, my + 2, (60, 60, 60))
    # distant hills silhouette
    for x in range(w):
        hh = int(12 + 8 * math.sin(x * 0.05) + 4 * math.sin(x * 0.13))
        for y in range(h - hh, h):
            cv.set(x, y, (18, 12, 34))
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
