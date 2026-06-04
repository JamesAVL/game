"""gen_npcs.py — single-pose 16x24 NPC sprites (face down)."""

import os
from pnglib import Canvas, CS
import artlib
from artlib import PAL


def npc(pal, out):
    cv = Canvas(artlib.FRAME_W, artlib.FRAME_H, cs=1)  # native 48x72 detail
    artlib.draw_person(cv, 0, 0, "down", 0, pal)
    cv.outline((16, 12, 24))   # crisp dark rim
    cv.write(out)
    print("wrote", out)


def main():
    here = os.path.dirname(__file__)
    spr = os.path.join(here, "..", "assets", "sprites")

    naboo = {
        "skin": (210, 168, 120), "skin_d": (176, 138, 96),
        "hair": PAL["naboo_turban"], "hair_hi": PAL["naboo_robe_hi"],
        "top": PAL["naboo_robe"], "top_hi": PAL["naboo_robe_hi"],
        "bottom": (80, 54, 140), "shoe": (60, 40, 110), "hair_style": "turban",
    }
    bollo = {
        "skin": (78, 64, 64), "skin_d": (58, 46, 48),
        "hair": PAL["bollo_fur"], "hair_hi": PAL["bollo_fur_hi"],
        "top": PAL["bollo_fur"], "top_hi": PAL["bollo_fur_hi"],
        "bottom": PAL["bollo_fur"], "shoe": (40, 32, 34), "hair_style": "fur",
    }
    fossil = {
        "skin": (228, 184, 150), "skin_d": (190, 150, 122),
        "hair": (120, 96, 70), "hair_hi": (150, 124, 96),
        "top": PAL["fossil_shirt"], "top_hi": (236, 222, 160),
        "bottom": PAL["fossil_short"], "shoe": (70, 54, 40), "hair_style": "bald",
    }
    npc(naboo, os.path.join(spr, "naboo.png"))
    npc(bollo, os.path.join(spr, "bollo.png"))
    npc(fossil, os.path.join(spr, "fossil.png"))


if __name__ == "__main__":
    main()
