"""gen_icon.py — the PWA / app install icon: a crescent moon over a starry
night, matching the title screen. Drawn at an exact 512x512 (scale=1)."""
import os
import pnglib
from pnglib import Canvas


def build(path):
    S = 512
    bg = (18, 10, 40, 255)
    c = Canvas(S, S, fill=bg, scale=1)

    # a few stars
    for (sx, sy, sr, b) in [
        (96, 110, 6, 255), (150, 330, 4, 220), (412, 392, 6, 240),
        (84, 260, 4, 200), (430, 150, 5, 235), (220, 452, 5, 215),
        (300, 70, 4, 210), (60, 420, 4, 190),
    ]:
        c.circle(sx, sy, sr, (b, b, 255, 255))

    # crescent moon: a bright disc with the background disc carved out of it
    mx, my, mr = 300, 220, 150
    c.circle(mx, my, mr, (245, 238, 200, 255))
    c.circle(mx + 78, my - 46, mr, bg)

    c.write(path)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    build(os.path.join(here, "..", "assets", "ui", "icon.png"))


if __name__ == "__main__":
    main()
