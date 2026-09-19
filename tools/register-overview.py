"""Check a shipped terrain render against an in-game map capture.

This is the calibration step `docs/DISTANCE-MAP-PLAN.md` asks for, made
repeatable. Give it a fully zoomed-out in-game overview and the map it belongs
to, and it reports where our raster disagrees with the game, in metres.

    python tools/register-overview.py capture.webp ozeti

It needs numpy, scipy and Pillow:

    pip install numpy scipy pillow

How it works. The capture has numbered axes whose ticks sit on integer
kilometre grid lines, which is what turns screen pixels into game coordinates.
From that it crops the playable area, crops the same ground from our raster
under the placement in src/page.html, and correlates the two. Correlating
brightness would fail -- one is a drawn map and the other a terrain render --
so it correlates gradient magnitude instead: rivers, roads and field edges are
in both.

A single global match only proves a translation. A raster that was cropped or
scaled differently would still match at the centre while drifting at the
edges, so the check is repeated on a grid of tiles and the offsets are
inspected for that pattern. Read the per-tile table, not just the summary: a
small mean with a large spread, or offsets growing towards the edges, means
the placement is wrong in a way the average hides.

The verdict is based on tiles AGREEING with each other, not on the strength of
any one peak. A flat, low-contrast render produces weak peaks even where it is
placed perfectly, so a confidence threshold alone would reject a good map. A
false peak, by contrast, lands anywhere in the search window: scatter means no
match, clustering means a real one. There is a free control for this -- run it
against a map the capture is not of, and watch the offsets fly apart.

Nothing here is written back into the app. Copy the numbers into MAP_DEFS and
docs/MAP-REFERENCE-REVIEW.md yourself, with the date and the capture.
"""

import argparse
import statistics
import sys

try:
    import numpy as np
    from PIL import Image
    from scipy.ndimage import sobel, gaussian_filter
    from scipy.signal import fftconvolve
except ImportError as exc:                                   # pragma: no cover
    sys.exit("register-overview needs numpy, scipy and pillow: %s" % exc)

TERRAIN_M = 16384.0
RASTER_PX = 2560
PAD_M = 500.0                                                # correlation search radius
K = RASTER_PX / TERRAIN_M                                    # raster px per metre


# ---------------------------------------------------------------- detection --
def _runs(hits, gap=4):
    out, run = [], []
    for i in hits:
        if run and i - run[-1] <= gap:
            run.append(i)
        else:
            if run:
                out.append(sum(run) / len(run))
            run = [i]
    if run:
        out.append(sum(run) / len(run))
    return out


def find_ticks(img, axis, band, sd=1.5):
    """Tick marks in the axis gutter, as pixel positions along `axis`."""
    a = np.asarray(img, float)
    strip = a[band[0]:band[1], :] if axis == "x" else a[:, band[0]:band[1]]
    prof = strip.mean(axis=0 if axis == "x" else 1)
    med, dev = float(np.median(prof)), float(prof.std()) or 1.0
    return _runs([i for i, v in enumerate(prof) if v > med + sd * dev])


def spaced_run(ticks, tol=0.12):
    """Longest evenly spaced run -- the grid ticks, without the label noise."""
    best = []
    for i in range(len(ticks)):
        for j in range(i + 1, len(ticks)):
            step = ticks[j] - ticks[i]
            if step <= 4:
                continue
            run = [ticks[i]]
            nxt = ticks[i] + step
            for t in ticks[j:]:
                if abs(t - nxt) <= tol * step:
                    run.append(t)
                    nxt = t + step
            if len(run) > len(best):
                best = run
    return best


def trough(prof, a, b):
    """Centroid of the darkness trough: the centre of a drawn boundary line."""
    seg = prof[a:b]
    lo, hi = float(seg.min()), float(seg.max())
    idx = [(i + a, hi - v) for i, v in enumerate(seg) if v < lo + 0.45 * (hi - lo)]
    return sum(i * w for i, w in idx) / sum(w for _, w in idx)


# -------------------------------------------------------------- correlation --
def edges(a, blur=1.5):
    a = gaussian_filter(np.asarray(a, float), blur)
    e = np.log1p(np.hypot(sobel(a, 0), sobel(a, 1)))
    e -= e.mean()
    s = e.std()
    return e / (s if s else 1.0)


def taper(a):
    return a * np.hanning(a.shape[0])[:, None] * np.hanning(a.shape[1])[None, :]


def _refine(arr, i):
    if 0 < i < len(arr) - 1:
        lo, mid, hi = arr[i - 1], arr[i], arr[i + 1]
        d = lo - 2 * mid + hi
        if d:
            return i + 0.5 * (lo - hi) / d
    return float(i)


def register(tile, raster, box_m, pad_m, mppx, mppy):
    """Offset between a capture tile and the same ground on the raster."""
    mx0, my0, mx1, my1 = box_m
    bx0, bx1, by0, by1 = mx0 - pad_m, mx1 + pad_m, my0 - pad_m, my1 + pad_m
    crop = raster.crop((int(round(bx0 * K)), int(round((TERRAIN_M - by1) * K)),
                        int(round(bx1 * K)), int(round((TERRAIN_M - by0) * K))))
    win = crop.resize((int(round((bx1 - bx0) / mppx)),
                       int(round((by1 - by0) / mppy))), Image.LANCZOS)
    corr = fftconvolve(edges(win), taper(edges(tile))[::-1, ::-1], mode="valid")
    if corr.size < 9:
        return None
    pk = np.unravel_index(int(np.argmax(corr)), corr.shape)
    fy, fx = _refine(corr[:, pk[1]], pk[0]), _refine(corr[pk[0], :], pk[1])
    mask = np.ones_like(corr, bool)
    mask[max(0, pk[0] - 8):pk[0] + 9, max(0, pk[1] - 8):pk[1] + 9] = False
    bg = corr[mask]
    snr = (corr[pk] - bg.mean()) / (bg.std() or 1.0) if bg.size else 0.0
    return ((fx - (corr.shape[1] - 1) / 2) * mppx,
            -(fy - (corr.shape[0] - 1) / 2) * mppy, float(snr))


# --------------------------------------------------------------------- main --
def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("capture", help="in-game map overview, fully zoomed out")
    ap.add_argument("map", choices=("bakurani", "ozeti", "zestafona"))
    ap.add_argument("--x-band", type=int, nargs=2, default=(908, 928),
                    metavar=("Y0", "Y1"), help="rows holding the bottom axis ticks")
    ap.add_argument("--y-band", type=int, nargs=2, default=(58, 78),
                    metavar=("X0", "X1"), help="columns holding the left axis ticks")
    ap.add_argument("--x-km", type=float, metavar="FIRST",
                    help="km number printed beside the FIRST detected x tick")
    ap.add_argument("--y-km", type=float, metavar="TOP",
                    help="km number printed beside the TOP (first) detected y tick")
    ap.add_argument("--km-per-tick", type=float, default=1.0,
                    help="ground distance between ticks, km (default 1)")
    ap.add_argument("--force", action="store_true",
                    help="continue even when the two axes disagree on scale")
    ap.add_argument("--playable", type=float, nargs=4,
                    metavar=("L", "T", "R", "B"),
                    help="playable boundary in capture pixels, if auto-detection misses")
    ap.add_argument("--tiles", type=int, default=3)
    ap.add_argument("--inset", type=int, default=12,
                    help="capture pixels trimmed off the playable edge before matching")
    args = ap.parse_args()

    shot = Image.open(args.capture).convert("L")
    print("capture %s  %dx%d" % (args.capture, shot.width, shot.height))

    xt = spaced_run(find_ticks(shot, "x", args.x_band))
    yt = spaced_run(find_ticks(shot, "y", args.y_band))
    if len(xt) < 3 or len(yt) < 3:
        sys.exit("could not find evenly spaced axis ticks -- adjust --x-band/--y-band")
    print("x ticks: %d found, %.1f..%.1f px, median step %.2f"
          % (len(xt), xt[0], xt[-1], statistics.median(np.diff(xt))))
    print("y ticks: %d found, %.1f..%.1f px, median step %.2f"
          % (len(yt), yt[0], yt[-1], statistics.median(np.diff(yt))))

    # The scale comes from the spacing between ticks, fitted across all of
    # them, not from the two end ones: a single spurious tick past the end of
    # the axis would otherwise stretch the whole calibration. Only the anchor
    # -- which km the first tick is -- has to be supplied.
    def slope(ticks):
        idx = np.arange(len(ticks), dtype=float)
        pos = np.asarray(ticks, float)
        return float(np.polyfit(idx, pos, 1)[0]) / args.km_per_tick

    kx, ky = slope(xt), slope(yt)
    resx = max(abs(np.asarray(xt) - (xt[0] + kx * args.km_per_tick * np.arange(len(xt)))))
    resy = max(abs(np.asarray(yt) - (yt[0] + ky * args.km_per_tick * np.arange(len(yt)))))
    print("scale: x %.3f px/km, y %.3f px/km  (ratio %.4f -- 1.0000 means square)"
          % (kx, ky, kx / ky))
    print("  worst tick residual: x %.1f px, y %.1f px" % (resx, resy))
    if max(resx, resy) > 0.25 * min(kx, ky):
        print("  WARNING: ticks are not evenly spaced; check --x-band/--y-band.")
    if abs(kx / ky - 1) > 0.01 and not args.force:
        sys.exit("\nThe axes disagree on scale by %.1f%%. An in-game map is square, so\n"
                 "one of the tick detections is picking up something that is not a\n"
                 "tick. Narrow --x-band/--y-band, or pass --force if you are sure."
                 % (abs(kx / ky - 1) * 100))
    if args.x_km is None or args.y_km is None:
        sys.exit("\nPass --x-km FIRST and --y-km TOP: the km numbers printed beside the\n"
                 "first detected x tick (%.1f px) and the top detected y tick (%.1f px)."
                 % (xt[0], yt[0]))
    x0_km, x0_px = args.x_km, xt[0]
    y0_km, y0_px = args.y_km, yt[0]

    kmx = lambda p: x0_km + (p - x0_px) / kx
    kmy = lambda p: y0_km - (p - y0_px) / ky
    mppx, mppy = 1000.0 / kx, 1000.0 / ky

    a = np.asarray(shot, float)
    if args.playable:
        L, T, R, B = args.playable
    else:
        mid_rows = np.r_[a.shape[0] // 4:a.shape[0] // 3, 2 * a.shape[0] // 3:3 * a.shape[0] // 4]
        mid_cols = np.r_[a.shape[1] // 4:a.shape[1] // 3, 2 * a.shape[1] // 3:3 * a.shape[1] // 4]
        colp, rowp = a[mid_rows, :].mean(axis=0), a[:, mid_cols].mean(axis=1)
        q = a.shape[1] // 4
        L, R = trough(colp, q // 2, q + q // 2), trough(colp, a.shape[1] - q - q // 2, a.shape[1] - q // 2)
        q = a.shape[0] // 4
        T, B = trough(rowp, q // 2, q + q // 2), trough(rowp, a.shape[0] - q - q // 2, a.shape[0] - q // 2)
    print("match region at capture px  L %.1f  T %.1f  R %.1f  B %.1f" % (L, T, R, B))
    print("  spans game units  X %.2f..%.2f   Y %.2f..%.2f"
          % (kmx(L) * 10, kmx(R) * 10, kmy(B) * 10, kmy(T) * 10))
    if args.playable:
        print("  PLAYABLE AREA (from --playable): X %.2f..%.2f  Y %.2f..%.2f"
              % (kmx(L) * 10, kmx(R) * 10, kmy(B) * 10, kmy(T) * 10))
    else:
        # Auto-detection finds the strongest box-like edge, which on a zoomed-out
        # capture is usually the map frame rather than the playable boundary. It
        # is a fine region to correlate over and a bad number to quote, so it is
        # not offered as one.
        print("  (auto-detected: good enough to match over, NOT a playable-boundary")
        print("   measurement -- pass --playable L T R B to measure that properly)")

    raster = Image.open("maps/%s.webp" % args.map).convert("L")
    xs = np.linspace(L + args.inset, R - args.inset, args.tiles + 1)
    ys = np.linspace(T + args.inset, B - args.inset, args.tiles + 1)
    print("\n%s: %dx%d tiles, each ~%.0f m across\n"
          % (args.map, args.tiles, args.tiles, (kmx(xs[1]) - kmx(xs[0])) * 1000))
    print("  tile      centre (game units)     east      north     radial    SNR")
    rows = []
    for j in range(args.tiles):
        for i in range(args.tiles):
            tile = np.asarray(shot.crop((xs[i], ys[j], xs[i + 1], ys[j + 1])), float)
            box = (kmx(xs[i]) * 1000, kmy(ys[j + 1]) * 1000,
                   kmx(xs[i + 1]) * 1000, kmy(ys[j]) * 1000)
            got = register(tile, raster, box, PAD_M, mppx, mppy)
            if not got:
                continue
            de, dn, snr = got
            rows.append(got)
            print("  r%dc%d   x%6.2f y%6.2f    %+6.0f m  %+6.0f m  %6.0f m  %5.1f"
                  % (j, i, (box[0] + box[2]) / 200, (box[1] + box[3]) / 200,
                     de, dn, float(np.hypot(de, dn)), snr))

    if not rows:
        print("\nno tiles registered at all.")
        return

    # Per-tile SNR is a poor verdict on a low-contrast render: a flat, hazy map
    # produces weak peaks even where it is placed perfectly. What cannot happen
    # by chance is independent tiles AGREEING. A false peak lands anywhere in
    # the search window, so scatter is the signature of no match and clustering
    # is the signature of a real one. Run this against the wrong map to see it:
    # the offsets fly apart.
    allde = np.array([r[0] for r in rows])
    alldn = np.array([r[1] for r in rows])
    mde, mdn = float(np.median(allde)), float(np.median(alldn))
    rad = np.hypot(allde - mde, alldn - mdn)
    tol = max(3 * mppx, 60.0)
    near = rad <= tol
    strong = np.array([r[2] >= 6 for r in rows])
    print("\n%d of %d tiles within %.0f m of the median offset; %d also reached SNR 6"
          % (int(near.sum()), len(rows), tol, int((near & strong).sum())))

    chance = (tol ** 2) / (2.0 * PAD_M) ** 2          # one tile, by luck alone
    print("  a tile landing that close by chance: about %.1f%%" % (100 * chance))

    if near.sum() < max(3, int(0.6 * len(rows))):
        print("  SCATTERED -- this is not evidence of alignment, in either direction.")
        print("  Offsets that disagree by hundreds of metres are false peaks, which is")
        print("  what the wrong map looks like. Try another map, or a better capture.")
        return

    de, dn = allde[near], alldn[near]
    print("  median offset   east %+.0f m   north %+.0f m" % (mde, mdn))
    print("  spread (1 sd)   east  %.0f m   north  %.0f m" % (de.std(), dn.std()))
    print("  RMS radial      %.0f m     worst agreeing tile %.0f m"
          % (float(np.sqrt((de ** 2 + dn ** 2).mean())), float(rad[near].max())))
    print("  one capture pixel = %.1f m; one raster pixel = %.1f m" % (mppx, 1 / K))
    print("\n  A median far larger than the spread is a placement offset worth fixing.")
    print("  Offsets growing towards the edges are a scale error; read the table.")
    print("  Neither is meaningful below about one capture pixel.")


if __name__ == "__main__":
    main()
