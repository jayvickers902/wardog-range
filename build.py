"""Wrap src/page.html into a standalone index.html.

src/page.html is the single source of truth. It is written body-first (no
doctype/html/head/body tags) so the same file can be published directly as a
Claude Artifact, which supplies its own skeleton. This script adds the skeleton
a normally-hosted page needs and writes index.html, which is what serve.py and
Vercel actually serve. Edit src/page.html, never index.html.

It also tells the page what map imagery exists: every tile level's extent,
each map's download size, and a version that changes whenever any map file
does. The extents are read off maps/tiles/ rather than kept in the page by
hand, so a recut with tools/cut-tiles.py needs nothing more than a rebuild.
The version goes on every map URL, which is what lets those URLs be cached
for good.

    python build.py                 # index.html -- live at once through serve.py
    python build.py preview.html    # a scratch copy beside it, to try first
"""

import hashlib
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src" / "page.html"
OUT = ROOT / "index.html"

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<meta name="description" content="Range and bearing between two points on a WARDOGS map.">
"""

MARKER = '<div class="shell">'
MAPS = ROOT / "maps"
TILES = MAPS / "tiles"
TILE_SLOT = "/* INLINE_TILES */{}"


def tile_levels(mdir):
    """{across: [x0, y0, x1, y1]} for one map's tile levels on disk, and the
    bytes they add up to: tile indices from the west and north edges, x1 and
    y1 exclusive. A level is always cut as one full rectangle, so anything
    else is a half-finished or stale cut and stops the build rather than
    leaving holes in the map."""
    levels, size = {}, 0
    dirs = sorted((p for p in mdir.iterdir() if p.is_dir() and p.name.isdigit()),
                  key=lambda p: int(p.name))
    for ldir in dirs:
        files = list(ldir.glob("*.webp"))
        if not files:
            continue
        xy = [tuple(int(v) for v in f.stem.split("_")) for f in files]
        xs = [x for x, _ in xy]
        ys = [y for _, y in xy]
        box = [min(xs), min(ys), max(xs) + 1, max(ys) + 1]
        area = (box[2] - box[0]) * (box[3] - box[1])
        if len(xy) != area:
            sys.exit("build: %s has %d tiles, not the full %d x %d rectangle it spans"
                     % (ldir, len(xy), box[2] - box[0], box[3] - box[1]))
        levels[ldir.name] = box
        size += sum(f.stat().st_size for f in files)
    return levels, size


def map_version():
    """A short hash of every map file's name and content. Any recut or new
    overview changes it, so a cached copy of the old one is never reused."""
    h = hashlib.sha1()
    for f in sorted(MAPS.rglob("*.webp")):
        h.update(f.relative_to(MAPS).as_posix().encode())
        h.update(f.read_bytes())
    return h.hexdigest()[:10]


def tiles_meta():
    maps = {}
    if TILES.is_dir():
        for mdir in sorted(p for p in TILES.iterdir() if p.is_dir()):
            levels, size = tile_levels(mdir)
            if levels:
                maps[mdir.name] = {"bytes": size, "levels": levels}
    return {"v": map_version(), "maps": maps}


def main():
    out_path = ROOT / sys.argv[1] if len(sys.argv) > 1 else OUT
    body = SRC.read_text(encoding="utf-8")
    body = body.replace('/* INLINE_RULER_CORE */', (ROOT / "src" / "ruler-core.js").read_text(encoding="utf-8"))
    if TILE_SLOT not in body:
        sys.exit("build: %r not found in %s" % (TILE_SLOT, SRC))
    meta = tiles_meta()
    body = body.replace(TILE_SLOT, json.dumps(meta, separators=(",", ":")))
    i = body.find(MARKER)
    if i < 0:
        sys.exit("build: %r not found in %s" % (MARKER, SRC))
    out = HEAD + body[:i] + "</head>\n<body>\n" + body[i:] + "\n</body>\n</html>\n"
    out_path.write_text(out, encoding="utf-8", newline="\n")
    print("build: wrote %s (%s bytes), maps v%s" % (out_path, format(out_path.stat().st_size, ","), meta["v"]))
    for name, m in meta["maps"].items():
        print("       tiles %-10s %5.1f MB  %s" % (name, m["bytes"] / 1e6, "  ".join(
            "%s:%dx%d" % (n, bx[2] - bx[0], bx[3] - bx[1]) for n, bx in m["levels"].items())))


if __name__ == "__main__":
    main()
