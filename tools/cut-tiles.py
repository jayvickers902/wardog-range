"""Cut higher-resolution map tiles from the full-size terrain exports.

    python tools/cut-tiles.py                      # all three maps
    python tools/cut-tiles.py ozeti                # one map

The shipped `maps/<map>.webp` overview is 2,560 px, which is 6.4 m per pixel --
enough to recognise a village or a road junction and not enough for anything
finer. These are the levels above it, cut into squares so the page fetches only
the ground on screen instead of a hundred megabytes of map.

Levels are named by how many tiles span the map, which makes the path
self-describing: `maps/tiles/<map>/16/3_9.webp` is one of 16x16 tiles, so
16 x 512 = 8,192 px across 16,384 m, so 2 m per pixel.

Needs pyvips, which streams instead of decoding the whole image:

    pip install "pyvips[binary]"

Pillow would want about 4 GB of resident memory for a 32,768 px source and is
not worth fighting over. Originals are not in the repository -- they are
0.4 to 1.5 GB each -- so this is run by hand when the levels change, not by
build.py.
"""

import os
import pathlib
import sys
import time

try:
    import pyvips
except ImportError:                                          # pragma: no cover
    sys.exit('cut-tiles needs pyvips:  pip install "pyvips[binary]"')

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "maps" / "tiles"
TERRAIN_M = 16384.0
TILE = 512
QUALITY = 72

# Tiles across the whole map. 8 -> 4,096 px -> 4 m/px; 16 -> 8,192 px -> 2 m/px.
LEVELS = (8, 16)

# Not in the repo. Point these wherever the exports actually live.
SOURCES = {
    "bakurani": "C:/Users/jayvi/Downloads/bakurani_map.png",
    "ozeti": "C:/Users/jayvi/Downloads/ozeti_map.png",
    "zestafona": "C:/Users/jayvi/Downloads/zesty_map.png",
}


def cut(name, src):
    if not os.path.exists(src):
        print("  %s: no source at %s -- skipped" % (name, src))
        return 0, 0
    t0 = time.time()
    # sequential access lets libvips stream the decode; the resize happens as
    # the scanlines arrive, so the full-size image is never held anywhere.
    im = pyvips.Image.new_from_file(src, access="sequential")
    print("  %s: source %d x %d, %d bands" % (name, im.width, im.height, im.bands))
    if im.bands == 4:
        im = im.flatten(background=[0, 0, 0])
    elif im.bands == 1:
        im = im.colourspace("srgb")
    im = im[0:3] if im.bands > 3 else im

    biggest = max(LEVELS) * TILE
    base = im.resize(biggest / im.width, kernel="lanczos3").copy_memory()
    print("     streamed down to %d px in %.0fs" % (base.width, time.time() - t0))

    written = wrote_bytes = 0
    for across in sorted(LEVELS, reverse=True):
        side = across * TILE
        lv = base if side == base.width else base.resize(side / base.width, kernel="lanczos3")
        if side != base.width:
            lv = lv.copy_memory()
        d = OUT / name / str(across)
        d.mkdir(parents=True, exist_ok=True)
        for ty in range(across):
            for tx in range(across):
                tile = lv.crop(tx * TILE, ty * TILE, TILE, TILE)
                path = d / ("%d_%d.webp" % (tx, ty))
                tile.webpsave(str(path), Q=QUALITY, effort=4, strip=True)
                wrote_bytes += path.stat().st_size
                written += 1
        print("     level %2d (%5d px, %.1f m/px): %4d tiles"
              % (across, side, TERRAIN_M / side, across * across))
    print("     %s: %d tiles, %.1f MB, %.0fs"
          % (name, written, wrote_bytes / 1e6, time.time() - t0))
    return written, wrote_bytes


def main():
    want = sys.argv[1:] or list(SOURCES)
    bad = [w for w in want if w not in SOURCES]
    if bad:
        sys.exit("unknown map(s): %s" % ", ".join(bad))
    print("cutting tiles into %s" % OUT)
    total = size = 0
    for name in want:
        n, b = cut(name, SOURCES[name])
        total += n
        size += b
    print("\n%d tiles, %.1f MB total" % (total, size / 1e6))
    if total:
        print("Commit them: the page fetches them by relative path, so they have")
        print("to deploy beside index.html the way maps/*.webp already do.")


if __name__ == "__main__":
    main()
