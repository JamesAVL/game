"""gen_all.py — regenerate every game asset deterministically.

Run from anywhere:  python3 tools/gen_all.py
All output lands in ../assets relative to this file.
"""

import gen_font
import gen_characters
import gen_npcs
import gen_bosses
import gen_tiles
import gen_items
import gen_props
import gen_ui
import gen_icon
import gen_vox_characters
import gen_vox_tilekits
import gen_vox_props


def main():
    print("== font ==");        gen_font.build(_p("ui", "font.png"))
    print("== characters =="); gen_characters.main()
    print("== npcs ==");        gen_npcs.main()
    print("== bosses ==");      gen_bosses.main()
    print("== tiles ==");       gen_tiles.main()
    print("== items ==");       gen_items.main()
    print("== props ==");       gen_props.main()
    print("== ui ==");          gen_ui.main()
    print("== icon ==");        gen_icon.main()
    print("== vox characters =="); gen_vox_characters.main()
    print("== vox tilekits ==");   gen_vox_tilekits.main()
    print("== vox props ==");      gen_vox_props.main()
    print("\nAll assets generated.")


import os
def _p(*parts):
    return os.path.join(os.path.dirname(__file__), "..", "assets", *parts)


if __name__ == "__main__":
    main()
