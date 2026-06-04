"""gen_characters.py — hero spritesheets for Vince & Howard.

Sheet layout (contract with engine/sprite.js):
  rows = directions [down, up, left, right]
  cols = 4 walk frames (0,2 neutral; 1,3 stepping)
  cell = 16x24
"""

import os
from pnglib import Canvas, CS
import artlib

DIRS = ["down", "up", "left", "right"]
FW, FH = artlib.FRAME_W, artlib.FRAME_H
NFR = 4


def build_sheet(pal, out_path):
    # cs=1: artlib now authors natively at the engine frame size (48x72) with detail
    cv = Canvas(FW * NFR, FH * len(DIRS), cs=1)
    for r, d in enumerate(DIRS):
        for f in range(NFR):
            artlib.draw_person(cv, f * FW, r * FH, d, f, pal)
    cv.outline((16, 12, 24))   # crisp dark rim makes the figures pop
    cv.write(out_path)
    print("wrote", out_path)


def main():
    here = os.path.dirname(__file__)
    spr = os.path.join(here, "..", "assets", "sprites")
    vince, howard = artlib.hero_palettes()
    build_sheet(vince, os.path.join(spr, "vince.png"))
    build_sheet(howard, os.path.join(spr, "howard.png"))


if __name__ == "__main__":
    main()
