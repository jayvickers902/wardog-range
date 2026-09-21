"""Wrap src/page.html into a standalone index.html.

src/page.html is the single source of truth. It is written body-first (no
doctype/html/head/body tags) so the same file can be published directly as a
Claude Artifact, which supplies its own skeleton. This script adds the skeleton
a normally-hosted page needs and writes index.html, which is what serve.py and
Vercel actually serve. Edit src/page.html, never index.html.

It also tells the page which map tiles exist. The extents are read off
maps/tiles/ rather than kept in the page by hand, so a recut with
tools/cut-tiles.py needs nothing more than a rebuild.

    python build.py
"""

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
TILES = ROOT / "maps" / "tiles"
TILE_SLOT = "/* INLINE_TILE_COVER */{}"


def tile_cover():
    """{map: {across: [x0, y0, x1, y1]}} for every tile level on disk: tile
    indices from the west and north edges, x1 and y1 exclusive. A level is
    always cut as one full rectangle, so anything else is a half-finished or
    stale cut and stops the build rather than leaving holes in the map."""
    cover = {}
    if not TILES.is_dir():
        return cover
    for mdir in sorted(p for p in TILES.iterdir() if p.is_dir()):
        levels = sorted((p for p in mdir.iterdir() if p.is_dir() and p.name.isdigit()),
                        key=lambda p: int(p.name))
        for ldir in levels:
            xy = [tuple(int(v) for v in f.stem.split("_")) for f in ldir.glob("*.webp")]
            if not xy:
                continue
            xs = [x for x, _ in xy]
            ys = [y for _, y in xy]
            box = [min(xs), min(ys), max(xs) + 1, max(ys) + 1]
            area = (box[2] - box[0]) * (box[3] - box[1])
            if len(xy) != area:
                sys.exit("build: %s has %d tiles, not the full %d x %d rectangle it spans"
                         % (ldir, len(xy), box[2] - box[0], box[3] - box[1]))
            cover.setdefault(mdir.name, {})[ldir.name] = box
    return cover


def main():
    body = SRC.read_text(encoding="utf-8")
    body = body.replace('/* INLINE_RULER_CORE */', (ROOT / "src" / "ruler-core.js").read_text(encoding="utf-8"))
    if TILE_SLOT not in body:
        sys.exit("build: %r not found in %s" % (TILE_SLOT, SRC))
    cover = tile_cover()
    body = body.replace(TILE_SLOT, json.dumps(cover, separators=(",", ":")))
    i = body.find(MARKER)
    if i < 0:
        sys.exit("build: %r not found in %s" % (MARKER, SRC))
    out = HEAD + body[:i] + "</head>\n<body>\n" + body[i:] + "\n</body>\n</html>\n"
    OUT.write_text(out, encoding="utf-8", newline="\n")
    print("build: wrote %s (%s bytes)" % (OUT, format(OUT.stat().st_size, ",")))
    for name, levels in cover.items():
        print("       tiles %-10s %s" % (name, "  ".join(
            "%s:%dx%d" % (n, bx[2] - bx[0], bx[3] - bx[1]) for n, bx in levels.items())))


if __name__ == "__main__":
    main()
