"""Wrap src/page.html into a standalone index.html.

src/page.html is the single source of truth. It is written body-first (no
doctype/html/head/body tags) so the same file can be published directly as a
Claude Artifact, which supplies its own skeleton. This script adds the skeleton
a normally-hosted page needs and writes index.html, which is what serve.py and
Vercel actually serve. Edit src/page.html, never index.html.

    python build.py
"""

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
<meta name="description" content="Range, bearing and mils between map grid coordinates.">
"""

MARKER = '<div class="shell">'


def main():
    body = SRC.read_text(encoding="utf-8")
    i = body.find(MARKER)
    if i < 0:
        sys.exit("build: %r not found in %s" % (MARKER, SRC))
    out = HEAD + body[:i] + "</head>\n<body>\n" + body[i:] + "\n</body>\n</html>\n"
    OUT.write_text(out, encoding="utf-8", newline="\n")
    print("build: wrote %s (%s bytes)" % (OUT, format(OUT.stat().st_size, ",")))


if __name__ == "__main__":
    main()
