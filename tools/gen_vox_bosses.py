"""gen_vox_bosses.py — the six crimp bosses as part-structured voxel rigs.

Bespoke, not extruded: bosses are the crimp's centerpiece and deserve real
volume. Palettes + silhouettes port straight from gen_bosses.py (the PNGs
those paint remain as dialogue portraits). Part names are what voxanim
drives: head sways/bobs, armL/armR swing (a tail or tentacle counts as an
arm if it should wave), legL/legR shuffle, body is the root mass.
Origin: feet/base center. 1 voxel = 1/16 tile; bosses stand ~2 tiles tall.
"""

import os
from pnglib import shade
from gltflib import GLB
from voxlib import VOX, Vox, greedy_mesh


def save_boss(name, parts):
    here = os.path.dirname(__file__)
    models = os.path.join(here, "..", "assets", "models")
    os.makedirs(models, exist_ok=True)
    glb = GLB()
    children = []
    for pname, vox, pivot in parts:
        positions, colors, indices = greedy_mesh(vox, origin=pivot)
        mesh = glb.add_mesh(pname, positions, colors, indices)
        children.append(glb.add_node(
            pname, mesh=mesh,
            translation=(pivot[0] * VOX, pivot[1] * VOX, pivot[2] * VOX)))
    glb.add_node("root", children=children)
    out = os.path.join(models, name + ".glb")
    glb.write(out)
    print("wrote", out)


def _eyes(head, y, x1, x2, z, white, pupil, w=2):
    for x0 in (x1, x2):
        for dx in range(w):
            for dy in range(2):
                head.set(x0 + dx, y + dy, z, white)
        head.set(x0 + w // 2, y, z, pupil)


# --------------------------------------------------------------------------
def jazz():
    body_c = (70, 70, 84); hi = (120, 120, 140); mid = (92, 92, 108); dk = (40, 40, 52)
    gold = (220, 180, 70); goldhi = (250, 220, 130)
    white = (235, 235, 245); red = (210, 60, 60); hat = (16, 16, 22)

    body = Vox()
    # smoke column tapering to the base
    for y, r in ((0, 3), (2, 4), (4, 5), (6, 6), (8, 7)):
        body.ellipsoid(0, y, 0, r, 2, r, mid if y % 4 else dk)
    # jacket torso
    body.box(-6, 9, -3, 13, 10, 7, body_c)
    for y in range(9, 19):
        for z in range(-3, 4):
            body.set(-6, y, z, hi)
            body.set(6, y, z, dk)
    for x in range(-1, 2):       # shirt front
        for y in range(12, 19):
            body.set(x, y, 3, white)
    body.set(-1, 16, 3, red); body.set(1, 16, 3, red)  # bow tie
    body.set(0, 16, 3, shade(red, -0.3))
    for px in range(-5, 6, 3):   # pinstripes
        for y in range(9, 19):
            body.set(px, y, -3, shade(body_c, 0.08))

    armL = Vox()
    armL.box(-9, 12, -1, 2, 7, 2, body_c)
    armR = Vox()
    armR.box(7, 12, -1, 2, 7, 2, body_c)
    # the gold trumpet, pointing forward
    for z in range(1, 7):
        armR.set(8, 13, z, gold)
    armR.ellipsoid(8, 13, 8, 2, 2, 2, gold)
    armR.set(8, 14, 7, goldhi)
    for z in (2, 3, 4):
        armR.set(8, 14, z, goldhi)

    head = Vox()
    head.ellipsoid(0, 23, 0, 5, 4, 5, mid)
    # sunglasses band
    for x in range(-4, 5):
        head.set(x, 24, 4, hat if abs(x) != 0 else (10, 10, 14))
        head.set(x, 24, 3, hat)
    head.set(-3, 24, 4, (200, 220, 255)); head.set(3, 24, 4, (200, 220, 255))
    for x in range(-2, 3):       # grin
        head.set(x, 21, 4, white if x % 2 else dk)
    # top hat: brim + crown + red band
    for x in range(-6, 7):
        for z in range(-6, 7):
            if x * x + z * z <= 36:
                head.set(x, 27, z, hat)
    head.box(-4, 28, -4, 9, 7, 9, hat)
    for x in range(-4, 5):
        for z in (-4, 4):
            head.set(x, 28, z, red)
        head.set(x, 28, 4, red)
    for z in range(-4, 5):
        head.set(-4, 28, z, red); head.set(4, 28, z, red)
    parts = [("body", body, (0.0, 0.0, 0.5)),
             ("armL", armL, (-8.0, 18.0, 0.0)),
             ("armR", armR, (8.0, 18.0, 0.0)),
             ("head", head, (0.0, 19.0, 0.5))]
    save_boss("boss_jazz", parts)


def gregg():
    green = (96, 168, 120); greenhi = (140, 210, 160); mid = (74, 140, 100); dk = (54, 110, 78)
    white = (245, 245, 245); ink = (20, 20, 30)

    body = Vox()
    # tail fin splaying at the base
    for x in range(-7, 8):
        d = abs(x)
        if d > 2:
            body.box(x, 0, -1, 1, max(1, 5 - d // 2), 3, dk if d % 2 else green)
    # scaly torso
    body.ellipsoid(0, 9, 0, 7, 6, 5, green)
    body.ellipsoid(-3, 12, 1, 3, 3, 3, greenhi)
    for (sx, sy) in ((-4, 8), (3, 7), (0, 5), (5, 10), (-6, 10)):
        body.set(sx, sy, 4, dk)                     # scales
    for y in (7, 9, 11):                            # gill slits
        body.set(-7, y, 0, dk); body.set(7, y, 0, dk)

    armL = Vox(); armL.box(-9, 8, -1, 2, 7, 2, green); armL.set(-9, 13, 0, greenhi)
    armR = Vox(); armR.box(7, 8, -1, 2, 7, 2, green); armR.set(8, 13, 0, greenhi)

    head = Vox()
    head.ellipsoid(0, 21, 0, 6, 6, 6, green)
    head.ellipsoid(-2, 24, 1, 3, 2, 3, greenhi)
    _eyes(head, 21, -4, 2, 6, white, ink, w=3)
    for x in range(-2, 3):                          # worried mouth
        head.set(x, 17, 6, dk)
    for (hx, hz) in ((-4, 0), (-2, -2), (0, 1), (2, -1), (4, 0)):  # seaweed
        for dy in range(3 + (hx % 2)):
            head.set(hx, 27 + dy, hz, dk if dy % 2 else mid)
    parts = [("body", body, (0.0, 0.0, 0.5)),
             ("armL", armL, (-8.0, 14.0, 0.0)),
             ("armR", armR, (8.0, 14.0, 0.0)),
             ("head", head, (0.0, 15.0, 0.5))]
    save_boss("boss_gregg", parts)


def crackfox():
    fur = (188, 110, 60); furhi = (224, 156, 96); mid = (150, 88, 48); dk = (120, 66, 36)
    white = (235, 230, 220); red = (200, 30, 30)

    body = Vox()
    body.ellipsoid(0, 8, 0, 9, 5, 6, fur)
    body.ellipsoid(-4, 10, -1, 4, 3, 3, furhi)
    for tx in range(-8, 9, 3):                      # ragged back tufts
        body.set(tx, 13, 0, dk)
    legL = Vox(); legL.box(-6, 0, 2, 2, 5, 2, dk); legL.set(-6, 0, 3, (20, 16, 18))
    legR = Vox(); legR.box(4, 0, 2, 2, 5, 2, dk); legR.set(5, 0, 3, (20, 16, 18))
    armL = Vox(); armL.box(-6, 0, -3, 2, 5, 2, mid)
    # the bushy tail waves like an arm
    armR = Vox()
    armR.ellipsoid(11, 10, 0, 4, 3, 3, fur)
    armR.ellipsoid(13, 12, 0, 2, 2, 2, white)
    armR.ellipsoid(9, 9, 0, 2, 1, 2, mid)

    head = Vox()
    head.ellipsoid(-1, 16, 2, 5, 4, 4, fur)
    head.ellipsoid(-2, 18, 3, 2, 2, 2, furhi)
    for (ex, h) in ((-4, 4), (2, 4)):               # ears
        for dy in range(h):
            head.set(ex, 20 + dy, 1, fur if dy < h - 1 else dk)
            head.set(ex + 1, 20 + dy, 1, dk if dy < 2 else fur)
    # snout forward
    for dz in range(3):
        head.box(-2, 14, 6 + dz, 3 - dz, 2, 1, furhi)
    head.set(-1, 15, 8, (20, 16, 18))               # nose
    _eyes(head, 17, -3, 1, 5, white, red)
    for x in range(-3, 2):                          # jagged grin
        head.set(x, 13, 5, white if x % 2 else dk)
    parts = [("body", body, (0.0, 0.0, 0.0)),
             ("legL", legL, (-5.0, 5.0, 3.0)),
             ("legR", legR, (5.0, 5.0, 3.0)),
             ("armL", armL, (-5.0, 5.0, -2.0)),
             ("armR", armR, (9.0, 9.0, 0.0)),
             ("head", head, (-1.0, 13.0, 3.0))]
    save_boss("boss_crackfox", parts)


def nana():
    card = (150, 70, 110); cardhi = (190, 110, 150); mid = (120, 56, 90); dk = (90, 40, 70)
    skin = (210, 190, 196); skirt = (70, 56, 70); grey = (210, 210, 215)

    body = Vox()
    for y in range(0, 10):                          # long skirt cone
        r = 8 - y // 2
        for x in range(-r, r + 1):
            for z in range(-r + 2, r - 1):
                if x * x + z * z * 2 <= r * r:
                    body.set(x, y, z, skirt if (x + y) % 5 else (92, 76, 92))
    body.box(-6, 10, -3, 13, 9, 6, card)            # cardigan
    for y in range(10, 19):
        for z in range(-3, 3):
            body.set(-6, y, z, cardhi)
            body.set(6, y, z, mid)
    for by in (12, 15, 18):
        body.set(0, by, 2, (230, 220, 180))         # buttons
    for ky in range(11, 18, 2):                     # knit texture
        for kx in range(-5, 6, 3):
            body.set(kx, ky, 2, shade(card, 0.12))
    body.set(-4, 18, 2, (255, 245, 170))            # brooch

    armL = Vox(); armL.box(-8, 9, -1, 2, 8, 2, card); armL.box(-8, 7, -1, 2, 2, 2, skin)
    armR = Vox(); armR.box(6, 9, -1, 2, 8, 2, card); armR.box(6, 7, -1, 2, 2, 2, skin)

    head = Vox()
    head.ellipsoid(0, 23, 0, 5, 5, 5, skin)
    # glowing demon eyes behind spectacles
    _eyes(head, 23, -3, 1, 5, (255, 60, 60), (255, 180, 180))
    for x in (-4, -1, 0, 3):
        head.set(x, 24, 5, (60, 60, 70))            # glasses frames
    for x in range(-2, 3):                          # sharp grin
        head.set(x, 19, 5, (245, 245, 245) if x % 2 else dk)
    head.ellipsoid(0, 28, -1, 5, 3, 4, grey)        # the bun
    head.ellipsoid(0, 31, -1, 2, 2, 2, (228, 228, 233))
    parts = [("body", body, (0.0, 0.0, 0.0)),
             ("armL", armL, (-7.0, 17.0, 0.0)),
             ("armR", armR, (7.0, 17.0, 0.0)),
             ("head", head, (0.0, 18.0, 0.5))]
    save_boss("boss_nana", parts)


def moon():
    white = (244, 244, 220); hi = (255, 255, 240); mid = (224, 224, 200); dk = (200, 200, 175)
    ink = (40, 40, 40)
    head = Vox()
    head.ellipsoid(0, 11, 0, 10, 10, 10, white)
    head.ellipsoid(-4, 15, 2, 4, 4, 4, hi)
    for (mx, my, mz) in ((5, 16, 5), (-7, 7, 4), (4, 5, 6), (-2, 18, 5), (8, 11, 3)):
        head.set(mx, my, mz, dk)
        head.set(mx, my - 1, mz, mid)               # craters
    def face(u, v, c):
        if v == 13 and u in (-4, -3, 1, 2):
            return ink                              # gentle eyes
        if v == 9 and -4 <= u <= -2:
            return dk                               # the big nose
        if v == 6 and -3 <= u <= 2:
            return (60, 60, 60)                     # gentle mouth
        if v == 8 and u == -5:
            return (255, 235, 200)                  # rosy cheek
        return None
    head.paint_shell(2, 1, face)
    parts = [("head", head, (0.0, 1.0, 0.0))]
    save_boss("boss_moon", parts)


def tony():
    pink = (240, 130, 190); pinkhi = (255, 180, 220); mid = (214, 104, 164); dk = (190, 80, 140)
    white = (245, 245, 245); ink = (20, 20, 30)

    body = Vox()                                    # bulbous dome
    body.ellipsoid(0, 13, 0, 9, 10, 8, pink)
    body.ellipsoid(-3, 19, 1, 2, 2, 2, pinkhi)      # modest crown sheen
    body.ellipsoid(5, 9, -2, 4, 4, 4, mid)
    for (sx, sy, sz) in ((4, 20, 3), (-6, 10, 4), (2, 6, 5), (0, 22, 2)):
        body.set(sx, sy, sz, dk)
    _eyes(body, 14, -5, 2, 7, white, ink, w=3)
    for d in range(4):                              # angry brows
        body.set(-6 + d, 18 - d // 2, 7, dk)
        body.set(6 - d, 18 - d // 2, 7, dk)
    for x in range(-2, 3):                          # outraged mouth
        body.set(x, 9, 7, (120, 40, 70))
        body.set(x, 10, 7, white if x % 2 else (120, 40, 70))

    parts = [("body", body, (0.0, 4.0, 0.5))]
    # five tentacles: outer pair wave as arms, rest are legs/static
    coords = ((-7, "armL"), (-3, "legL"), (0, "tent"), (3, "legR"), (7, "armR"))
    for tx, pname in coords:
        t = Vox()
        for y in range(6):
            sway = (y // 3) * (1 if tx > 0 else -1)
            t.set(tx + sway, 5 - y, 1 - y // 4, pink if y % 2 else mid)
            t.set(tx + sway, 5 - y, 2 - y // 4, dk if y == 5 else pink)
        parts.append((pname, t, (float(tx), 6.0, 0.5)))
    save_boss("boss_tony", parts)


def yeti():
    fur = (228, 232, 238); furhi = (250, 252, 255); mid = (196, 202, 212); dk = (158, 166, 180)
    skin = (120, 130, 150); amber = (236, 168, 84)

    body = Vox()                                    # the mountain of shag
    body.ellipsoid(0, 12, 0, 9, 11, 7, fur)
    body.ellipsoid(-4, 16, 2, 4, 4, 3, furhi)
    body.ellipsoid(5, 8, -2, 4, 4, 3, mid)
    for y in range(3, 22, 3):                       # shag rows
        for x in range(-8, 9, 3):
            if (x + y) % 2:
                body.set(x, y, 7 if abs(x) < 6 else 5, dk)
    legL = Vox(); legL.box(-6, 0, -2, 4, 4, 5, mid); legL.set(-5, 0, 3, (70, 76, 92))
    legR = Vox(); legR.box(2, 0, -2, 4, 4, 5, mid); legR.set(3, 0, 3, (70, 76, 92))
    armL = Vox()
    armL.ellipsoid(-11, 11, 0, 3, 7, 3, fur)
    armL.ellipsoid(-11, 4, 1, 3, 2, 3, skin)
    armR = Vox()
    armR.ellipsoid(11, 11, 0, 3, 7, 3, fur)
    armR.ellipsoid(11, 4, 1, 3, 2, 3, skin)

    head = Vox()
    head.ellipsoid(0, 27, 0, 6, 5, 5, fur)
    # the face plate sits proud on the front
    for x in range(-4, 5):
        for y in range(24, 31):
            if x * x + (y - 27) * (y - 27) <= 18:
                head.set(x, y, 5, skin)
    _eyes(head, 27, -3, 1, 5, amber, (255, 220, 150))
    for x in range(-3, 4):                          # brow shadow
        head.set(x, 29, 5, dk)
    head.set(-3, 24, 5, furhi); head.set(3, 24, 5, furhi)   # tusks
    for x in range(-5, 6, 2):                       # fur crown
        head.set(x, 31 + (x % 2), 3, furhi if x % 4 else fur)
    parts = [("body", body, (0.0, 0.0, 0.0)),
             ("legL", legL, (-4.0, 4.0, 0.5)),
             ("legR", legR, (4.0, 4.0, 0.5)),
             ("armL", armL, (-11.0, 17.0, 0.0)),
             ("armR", armR, (11.0, 17.0, 0.0)),
             ("head", head, (0.0, 22.0, 0.5))]
    save_boss("boss_yeti", parts)


def hitcher():
    skin = (110, 160, 96); skinhi = (150, 200, 130); coat = (34, 36, 42)
    coathi = (64, 68, 78); hat = (22, 22, 28); white = (240, 245, 240)

    body = Vox()
    for y in range(0, 16):                          # long coat, flaring at the hem
        r = 5 + (3 if y < 4 else 1 if y < 8 else 0)
        for x in range(-r, r + 1):
            for z in range(-3, 4):
                if abs(z) <= 3 - (abs(x) > r - 2):
                    body.set(x, y, z, coathi if x < -r + 3 else coat)
    for y in range(2, 15, 4):
        body.set(-1, y, 3, (180, 180, 190)); body.set(2, y, 3, (180, 180, 190))
    for (ex, ez) in ((-4, 2), (3, 1), (0, 3)):      # eels at the hem
        body.set(ex, 0, ez + 1, (70, 100, 80)); body.set(ex + 1, 0, ez + 1, (140, 180, 150))

    armL = Vox(); armL.box(-8, 8, -1, 2, 8, 2, coat); armL.box(-8, 6, -1, 2, 2, 2, skin)
    armR = Vox()                                    # raised, thumb up forever
    armR.box(6, 14, -1, 2, 6, 2, coat)
    armR.box(6, 20, -1, 2, 3, 2, skin)
    armR.set(7, 23, 0, skinhi)

    head = Vox()
    head.ellipsoid(0, 21, 0, 5, 5, 5, skin)
    head.ellipsoid(-2, 24, 1, 2, 2, 2, skinhi)
    def face(u, v, c):
        if v == 21 and u in (-3, -2, -1):
            return white if u != -2 else (20, 20, 24)   # the polo eye
        if v == 21 and u in (2, 3):
            return (40, 70, 40)                          # the squint
        if v == 18 and -2 <= u <= 2:
            return (30, 50, 32) if u % 2 else white      # crooked grin
        return None
    head.paint_shell(2, 1, face)
    for x in range(-6, 7):                          # battered top hat brim
        for z in range(-6, 7):
            if x * x + z * z <= 32:
                head.set(x, 26, z, hat)
    head.box(-4, 27, -4, 9, 6, 9, hat)
    for x in range(-4, 5):
        head.set(x, 27, 4, (90, 160, 90))           # mouldy band
    parts = [("body", body, (0.0, 0.0, 0.5)),
             ("armL", armL, (-7.0, 16.0, 0.0)),
             ("armR", armR, (7.0, 14.0, 0.0)),
             ("head", head, (0.0, 16.0, 0.5))]
    save_boss("boss_hitcher", parts)


def zeus():
    # Lance Dior & Harold Boon: one rig, two smug reflections. The pair share
    # a root; Lance sways as armL's parent, Harold as armR's — so dance() makes
    # them bob in counterphase like a double act.
    from voxlib import build_person
    import artlib
    vince, howard = artlib.hero_palettes()
    chrome = (190, 198, 216)
    lance = dict(vince); lance["top"] = (170, 182, 210); lance["top_hi"] = (226, 232, 248)
    lance["hair_hi"] = chrome
    harold = dict(howard); harold["top"] = (164, 136, 96); harold["top_hi"] = (208, 184, 140)
    harold["accessory"] = "moustache"

    glb_parts = []
    for name, pal, ox in (("armL", lance, -10), ("armR", harold, 10)):
        merged = Vox()
        for _, vox, _pivot in build_person(pal):
            merged.merge(vox, dx=ox)
        # chrome cravat: stamp over the collar
        for x in range(ox - 2, ox + 3):
            merged.set(x, 16, 3, chrome)
        glb_parts.append((name, merged, (float(ox), 0.0, 0.5)))
    save_boss("boss_zeus", glb_parts)


def saboo():
    # Saboo (robbed at Crimp-Off '06, never forgot) + Kirk (does the thing)
    from voxlib import build_person
    saboo_pal = {
        "skin": (190, 150, 120), "skin_d": (160, 122, 96),
        "hair": (40, 30, 60), "hair_hi": (90, 70, 130),
        "top": (60, 40, 100), "top_hi": (100, 70, 160),
        "bottom": (40, 28, 70), "shoe": (30, 20, 50),
        "hair_style": "turban", "robe": True,
    }
    kirk_pal = {
        "skin": (235, 225, 215), "skin_d": (205, 192, 180),
        "hair": (235, 215, 150), "hair_hi": (250, 240, 190),
        "top": (180, 60, 60), "top_hi": (220, 110, 100),
        "bottom": (120, 40, 40), "shoe": (60, 30, 30),
        "hair_style": "short",
    }
    glb_parts = []
    for name, pal, ox, lift in (("armL", saboo_pal, -9, 0), ("armR", kirk_pal, 9, 0)):
        merged = Vox()
        for _, vox, _pivot in build_person(pal):
            merged.merge(vox, dx=ox)
        glb_parts.append((name, merged, (float(ox), float(lift), 0.5)))
    save_boss("boss_saboo", glb_parts)


def main():
    jazz()
    gregg()
    crackfox()
    nana()
    moon()
    tony()
    yeti()
    hitcher()
    zeus()
    saboo()


if __name__ == "__main__":
    main()
