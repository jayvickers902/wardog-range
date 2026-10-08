"""Cut higher-resolution map tiles from the full-size terrain exports.

    python tools/cut-tiles.py                      # every level of all three maps
    python tools/cut-tiles.py ozeti                # one map
    python tools/cut-tiles.py --levels 32,64       # only these levels

The shipped `maps/<map>.webp` overview is 2,560 px, which is 6.4 m per pixel --
enough to recognise a village or a road junction and not enough for anything
finer. These are the levels above it, cut into squares so the page fetches only
the ground on screen instead of a hundred megabytes of map.

Levels are named by how many tiles span the map, which makes the path
self-describing: `maps/tiles/<map>/16/3_9.webp` is one of 16x16 tiles, so
16 x 512 = 8,192 px across 16,384 m, so 2 m per pixel. Tile x counts from the
west edge and tile y from the north edge.

The two coarse levels cover the whole map. The two fine ones cover only a
square around the control zone, which is where players actually look closely,
because the whole map at 0.5 m per pixel would be about 4,000 tiles and a few
hundred megabytes per map. A fine level is only cut where the export really has
that much detail -- Ozeti and Zestafona are exported at 0.5 m per pixel,
Bakurani at 1 m -- and is never upsampled to fake it.

The page does not need telling what was cut. build.py reads the tile
directories and inlines the extent of every level, so recutting with a
different square is just a recut and a rebuild.

Needs pyvips, which streams instead of decoding the whole image:

    pip install "pyvips[binary]"

Pillow would want about 4 GB of resident memory for a 32,768 px source and is
not worth fighting over. Originals are not in the repository -- they are
0.4 to 1.5 GB each -- so this is run by hand when the levels change, not by
build.py.
"""

import math
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

# Tiles across the map for the fine levels, and the half-width in metres of the
# square each one covers around the zone. 32 -> 1 m/px out to 3.5 km, which is
# past the SPH-2's 2,660 m from the far edge of either zone; 64 -> 0.5 m/px out
# to 1.5 km, the zone plus everywhere a mortar can hit it from.
DETAIL = {32: 3500, 64: 1500}

# Where the fine levels are centred, in world metres from the southwest corner:
# the control zones in the page's GROUND table.
CENTRES = {
    "bakurani": (8097, 6988),
    "ozeti": (9778, 6245),
    "zestafona": (6966, 10058),
}

# Not in the repo. Point these wherever the exports actually live.
SOURCES = {
    "bakurani": "/mnt/c/Users/jayvi/Downloads/bakurani_map.png",
    "ozeti": "/mnt/c/Users/jayvi/Downloads/ozeti_map.png",
    "zestafona": "/mnt/c/Users/jayvi/Downloads/zesty_map.png",
}


def rgb(im):
    if im.bands == 4:
        return im.flatten(background=[0, 0, 0])
    if im.bands == 1:
        return im.colourspace("srgb")
    return im[0:3] if im.bands > 3 else im


def open_source(src):
    # sequential access lets libvips stream the decode; any resize happens as
    # the scanlines arrive, so the full-size image is never held anywhere.
    return pyvips.Image.new_from_file(src, access="sequential")


def write_level(name, across, img, box):
    """Write the tiles in box = (x0, y0, x1, y1), tile indices, x1/y1 exclusive,
    from img, whose top left pixel is the top left of tile (x0, y0)."""
    d = OUT / name / str(across)
    d.mkdir(parents=True, exist_ok=True)
    # A recut with a smaller square must not leave the old edge behind:
    # build.py reads the extent off the files and refuses holes.
    for old in d.glob("*.webp"):
        old.unlink()
    x0, y0, x1, y1 = box
    n = size = 0
    for ty in range(y0, y1):
        for tx in range(x0, x1):
            tile = img.crop((tx - x0) * TILE, (ty - y0) * TILE, TILE, TILE)
            path = d / ("%d_%d.webp" % (tx, ty))
            tile.webpsave(str(path), Q=QUALITY, effort=4, strip=True)
            size += path.stat().st_size
            n += 1
    return n, size


def cut_whole(name, src, levels):
    t0 = time.time()
    im = rgb(open_source(src))
    biggest = max(levels) * TILE
    base = im.resize(biggest / im.width, kernel="lanczos3").copy_memory()
    print("     streamed down to %d px in %.0fs" % (base.width, time.time() - t0))
    n = size = 0
    for across in sorted(levels, reverse=True):
        side = across * TILE
        lv = base if side == base.width else base.resize(side / base.width, kernel="lanczos3").copy_memory()
        a, b = write_level(name, across, lv, (0, 0, across, across))
        n += a
        size += b
        print("     level %2d (%5d px, %.1f m/px): %4d tiles, %5.1f MB"
              % (across, side, TERRAIN_M / side, a, b / 1e6))
    return n, size


def detail_box(across, centre, half):
    step = TERRAIN_M / across
    cx, cy = centre
    x0 = max(0, int(math.floor((cx - half) / step)))
    x1 = min(across, int(math.ceil((cx + half) / step)))
    # tile rows count down from the north edge
    y0 = max(0, int(math.floor((TERRAIN_M - (cy + half)) / step)))
    y1 = min(across, int(math.ceil((TERRAIN_M - (cy - half)) / step)))
    return x0, y0, x1, y1


def cut_detail(name, src, across, width):
    """One fine level over the square around the zone, cut from only that part
    of the export."""
    side = across * TILE
    if side > width:
        print("     level %2d (%.2f m/px): the export is only %d px, skipped rather than upsampled"
              % (across, TERRAIN_M / side, width))
        return 0, 0
    t0 = time.time()
    box = detail_box(across, CENTRES[name], DETAIL[across])
    x0, y0, x1, y1 = box
    f = side / float(width)                  # export px -> level px
    per = TILE / f                           # export px per tile
    left, top = x0 * per, y0 * per
    w, h = (x1 - x0) * per, (y1 - y0) * per
    # A few extra export pixels round the square so the resampling kernel
    # sees real ground at the edge instead of a clamped copy of it.
    pad = 8 if f < 1 else 0
    pl, pt = min(pad, left), min(pad, top)
    pr, pb = min(pad, width - left - w), min(pad, width - top - h)
    im = rgb(open_source(src))
    region = im.crop(int(left - pl), int(top - pt), int(w + pl + pr), int(h + pt + pb))
    if f < 1:
        region = region.resize(f, kernel="lanczos3")
    region = region.copy_memory()
    img = region.crop(int(round(pl * f)), int(round(pt * f)),
                      (x1 - x0) * TILE, (y1 - y0) * TILE)
    n, size = write_level(name, across, img, box)
    step = TERRAIN_M / across
    print("     level %2d (%.2f m/px): tiles %d-%d x %d-%d, %.1f x %.1f km, %4d tiles, %5.1f MB, %.0fs"
          % (across, TERRAIN_M / side, x0, x1 - 1, y0, y1 - 1,
             (x1 - x0) * step / 1000, (y1 - y0) * step / 1000, n, size / 1e6, time.time() - t0))
    return n, size


def cut(name, src, levels):
    if not os.path.exists(src):
        print("  %s: no source at %s -- skipped" % (name, src))
        return 0, 0
    head = pyvips.Image.new_from_file(src)
    print("  %s: source %d x %d, %d bands" % (name, head.width, head.height, head.bands))
    n = size = 0
    whole = [lv for lv in levels if lv in LEVELS]
    if whole:
        a, b = cut_whole(name, src, whole)
        n += a
        size += b
    for across in sorted(lv for lv in levels if lv in DETAIL):
        a, b = cut_detail(name, src, across, head.width)
        n += a
        size += b
    print("     %s: %d tiles, %.1f MB" % (name, n, size / 1e6))
    return n, size


def main():
    args = sys.argv[1:]
    levels = tuple(LEVELS) + tuple(DETAIL)
    if "--levels" in args:
        i = args.index("--levels")
        levels = tuple(int(v) for v in args[i + 1].split(","))
        del args[i:i + 2]
    bad = [lv for lv in levels if lv not in LEVELS and lv not in DETAIL]
    if bad:
        sys.exit("unknown level(s): %s" % ", ".join(map(str, bad)))
    want = args or list(SOURCES)
    bad = [w for w in want if w not in SOURCES]
    if bad:
        sys.exit("unknown map(s): %s" % ", ".join(bad))
    print("cutting levels %s into %s" % (", ".join(map(str, levels)), OUT))
    total = size = 0
    for name in want:
        n, b = cut(name, SOURCES[name], levels)
        total += n
        size += b
    print("\n%d tiles, %.1f MB total" % (total, size / 1e6))
    if total:
        print("Rebuild (python build.py) so the page learns the new extents, then")
        print("commit the tiles: the page fetches them by relative path, so they")
        print("have to deploy beside index.html the way maps/*.webp already do.")


if __name__ == "__main__":
    main()
