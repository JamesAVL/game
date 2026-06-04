"""pnglib.py — a tiny, dependency-free PNG encoder + pixel-art canvas.

Pure Python standard library only (zlib + struct). No Pillow, no network.
Everything the asset generators need to paint deterministic pixel art and
write valid 8-bit RGBA PNG files lives here.

Coordinate system: (0,0) is top-left, x grows right, y grows down.
Colors are (r, g, b, a) tuples, 0-255. a defaults to 255 (opaque).
"""

import zlib
import struct
import math

TRANSPARENT = (0, 0, 0, 0)

# Global output scale. Generators author in "logical" pixel coordinates; the
# final PNG is integer-upscaled by this factor (nearest-neighbour, done once at
# write() time so every drawing primitive — incl. get()/outline() — keeps
# operating in logical space).
# CONTRACT: this MUST equal `ART` in src/engine/core.js (both 2). A generator
# that authors genuinely higher-detail art at the full device size opts out by
# constructing its Canvas with scale=1 and doubling its own logical dimensions.
DEFAULT_SCALE = 2


class Canvas:
    """A small RGBA raster with drawing helpers tuned for pixel art."""

    def __init__(self, w, h, fill=TRANSPARENT, scale=None):
        self.w = w
        self.h = h
        self.scale = DEFAULT_SCALE if scale is None else scale
        self.px = bytearray(w * h * 4)
        if fill != (0, 0, 0, 0):
            self.clear(fill)

    # ---- low level -------------------------------------------------------
    def clear(self, color):
        r, g, b, a = _rgba(color)
        for i in range(self.w * self.h):
            o = i * 4
            self.px[o] = r
            self.px[o + 1] = g
            self.px[o + 2] = b
            self.px[o + 3] = a

    def set(self, x, y, color):
        x = int(x)
        y = int(y)
        if x < 0 or y < 0 or x >= self.w or y >= self.h:
            return
        r, g, b, a = _rgba(color)
        o = (y * self.w + x) * 4
        if a == 255:
            self.px[o] = r
            self.px[o + 1] = g
            self.px[o + 2] = b
            self.px[o + 3] = 255
        elif a == 0:
            return
        else:
            # alpha blend over existing
            ba = self.px[o + 3]
            if ba == 0:
                self.px[o] = r
                self.px[o + 1] = g
                self.px[o + 2] = b
                self.px[o + 3] = a
            else:
                fa = a / 255.0
                self.px[o] = int(r * fa + self.px[o] * (1 - fa))
                self.px[o + 1] = int(g * fa + self.px[o + 1] * (1 - fa))
                self.px[o + 2] = int(b * fa + self.px[o + 2] * (1 - fa))
                self.px[o + 3] = max(a, ba)

    def get(self, x, y):
        if x < 0 or y < 0 or x >= self.w or y >= self.h:
            return TRANSPARENT
        o = (y * self.w + x) * 4
        return (self.px[o], self.px[o + 1], self.px[o + 2], self.px[o + 3])

    # ---- shapes ----------------------------------------------------------
    def rect(self, x, y, w, h, color):
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)):
                self.set(xx, yy, color)

    def rect_outline(self, x, y, w, h, color):
        x, y, w, h = int(x), int(y), int(w), int(h)
        for xx in range(x, x + w):
            self.set(xx, y, color)
            self.set(xx, y + h - 1, color)
        for yy in range(y, y + h):
            self.set(x, yy, color)
            self.set(x + w - 1, yy, color)

    def hline(self, x, y, w, color):
        for xx in range(int(x), int(x + w)):
            self.set(xx, y, color)

    def vline(self, x, y, h, color):
        for yy in range(int(y), int(y + h)):
            self.set(x, yy, color)

    def line(self, x0, y0, x1, y1, color):
        x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
        dx = abs(x1 - x0)
        dy = -abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx + dy
        while True:
            self.set(x0, y0, color)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy

    def circle(self, cx, cy, r, color, fill=True):
        cx, cy, r = int(cx), int(cy), int(r)
        for yy in range(cy - r, cy + r + 1):
            for xx in range(cx - r, cx + r + 1):
                d = (xx - cx) ** 2 + (yy - cy) ** 2
                if fill:
                    if d <= r * r:
                        self.set(xx, yy, color)
                else:
                    if (r - 0.7) ** 2 <= d <= (r + 0.2) ** 2:
                        self.set(xx, yy, color)

    def ellipse(self, cx, cy, rx, ry, color, fill=True):
        cx, cy = int(cx), int(cy)
        rx = max(1, int(rx))
        ry = max(1, int(ry))
        for yy in range(cy - ry, cy + ry + 1):
            for xx in range(cx - rx, cx + rx + 1):
                d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
                if fill:
                    if d <= 1.0:
                        self.set(xx, yy, color)
                else:
                    if 0.7 <= d <= 1.1:
                        self.set(xx, yy, color)

    def fill_poly(self, pts, color):
        ys = [p[1] for p in pts]
        for y in range(int(min(ys)), int(max(ys)) + 1):
            xs = []
            n = len(pts)
            for i in range(n):
                x0, y0 = pts[i]
                x1, y1 = pts[(i + 1) % n]
                if (y0 <= y < y1) or (y1 <= y < y0):
                    t = (y - y0) / (y1 - y0)
                    xs.append(x0 + t * (x1 - x0))
            xs.sort()
            for i in range(0, len(xs) - 1, 2):
                for x in range(int(math.floor(xs[i])), int(math.ceil(xs[i + 1])) + 1):
                    self.set(x, y, color)

    # ---- compositing -----------------------------------------------------
    def blit(self, src, dx, dy, sx=0, sy=0, sw=None, sh=None):
        sw = src.w if sw is None else sw
        sh = src.h if sh is None else sh
        for yy in range(sh):
            for xx in range(sw):
                c = src.get(sx + xx, sy + yy)
                if c[3] != 0:
                    self.set(dx + xx, dy + yy, c)

    def outline(self, color, where=TRANSPARENT):
        """Draw `color` on transparent pixels that border a non-transparent
        pixel (4-neighbour). Great for crisp pixel-art borders."""
        adds = []
        for y in range(self.h):
            for x in range(self.w):
                if self.get(x, y)[3] != 0:
                    continue
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    c = self.get(nx, ny)
                    if c[3] != 0 and c != color:
                        adds.append((x, y))
                        break
        for x, y in adds:
            self.set(x, y, color)

    def shade_column(self, x, y, h, top, bottom):
        """Vertical gradient down a 1px column (top->bottom)."""
        for i in range(h):
            t = i / max(1, h - 1)
            self.set(x, y + i, _lerp(top, bottom, t))

    def gradient_v(self, x, y, w, h, top, bottom):
        for i in range(h):
            t = i / max(1, h - 1)
            c = _lerp(top, bottom, t)
            self.hline(x, y + i, w, c)

    # ---- output ----------------------------------------------------------
    def write(self, path):
        s = int(self.scale)
        if s <= 1:
            write_png(path, self.w, self.h, self.px)
            return
        # nearest-neighbour expand each logical pixel into an s×s block
        W, H = self.w * s, self.h * s
        out = bytearray(W * H * 4)
        src = self.px
        rowbytes = W * 4
        for y in range(self.h):
            for x in range(self.w):
                o = (y * self.w + x) * 4
                px = src[o:o + 4]
                for dy in range(s):
                    base = (y * s + dy) * rowbytes + x * s * 4
                    for dx in range(s):
                        out[base + dx * 4:base + dx * 4 + 4] = px
        write_png(path, W, H, out)


# -------- module helpers --------------------------------------------------
def _rgba(c):
    if len(c) == 3:
        return (c[0], c[1], c[2], 255)
    return c


def _lerp(a, b, t):
    a = _rgba(a)
    b = _rgba(b)
    return (
        int(a[0] + (b[0] - a[0]) * t),
        int(a[1] + (b[1] - a[1]) * t),
        int(a[2] + (b[2] - a[2]) * t),
        int(a[3] + (b[3] - a[3]) * t),
    )


def lerp(a, b, t):
    return _lerp(a, b, t)


def shade(color, amount):
    """amount<0 darkens, >0 lightens, in [-1,1]."""
    r, g, b, a = _rgba(color)
    if amount >= 0:
        return (
            int(r + (255 - r) * amount),
            int(g + (255 - g) * amount),
            int(b + (255 - b) * amount),
            a,
        )
    k = 1 + amount
    return (int(r * k), int(g * k), int(b * k), a)


def write_png(path, w, h, rgba_bytes):
    """Encode raw RGBA bytes (w*h*4) into an 8-bit PNG file."""
    raw = bytearray()
    stride = w * 4
    for y in range(h):
        raw.append(0)  # filter type 0 (None) per scanline
        raw.extend(rgba_bytes[y * stride:(y + 1) * stride])
    compressed = zlib.compress(bytes(raw), 9)

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return c + struct.pack(">I", crc)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)  # 8-bit RGBA
    with open(path, "wb") as f:
        f.write(sig)
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", compressed))
        f.write(chunk(b"IEND", b""))
