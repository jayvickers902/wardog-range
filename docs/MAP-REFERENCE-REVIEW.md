# Map reference review

Reviewed 19 September 2026 for the distance-map implementation.

## Supported coordinate behavior

[Jupliket's in-game coordinate guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3800319041) documents right-clicking the map, choosing Mark Coordinates, copying the displayed pair, and calculating distance as `100 * hypot(deltaX, deltaY)`. It recommends zooming in before marking a point.

Independent arithmetic for the guide's example:

```text
A: x98.43, y110.38
B: x94.53, y109.03
east difference: -390 m
north difference: -135 m
straight-line distance: 412.7044947659285 m
rounded display: 413 m
```

The conversion describes coordinate precision. It does not establish how accurately a point can be located in a low-resolution image.

## Independent community map metadata

The open-source [Apollyon calculator](https://github.com/apollyon-sys/wardogs-calculator) was checked at commit `6a9fcd9afcea4254df59dfba4df5cc2627a92112`, dated 18 September 2026. These are that project's calibrations and assets, not independently verified game specifications.

| Map | Playable X in game units | Playable Y in game units | Meters per game unit |
| --- | --- | --- | --- |
| Bakurani | 23.35 to 133.60 | 19.34 to 129.65 | 100 |
| Ozeti | 57.58 to 143.07 | 21.81 to 99.56 | 100 |
| Zestafona | 19.90 to 124.89 | 50.70 to 141.90 | 100 |

Sources: [Bakurani definition](https://github.com/apollyon-sys/wardogs-calculator/blob/6a9fcd9afcea4254df59dfba4df5cc2627a92112/maps/bakurani.json), [Ozeti definition](https://github.com/apollyon-sys/wardogs-calculator/blob/6a9fcd9afcea4254df59dfba4df5cc2627a92112/maps/ozeti.json), [Zestafona definition](https://github.com/apollyon-sys/wardogs-calculator/blob/6a9fcd9afcea4254df59dfba4df5cc2627a92112/maps/zestafona.json).

All three definitions use a tile extent of X -0.03 to 163.81 and Y -0.01 to 163.83 game units. They choose grayscale as their default map style and provide a color alternative. Their [map documentation](https://github.com/apollyon-sys/wardogs-calculator/blob/6a9fcd9afcea4254df59dfba4df5cc2627a92112/docs/maps.md) explicitly distinguishes playable bounds from tile bounds and states that calibration can be refined with new in-game references.

These offsets must not be copied onto the local `maps/*.webp` files solely because both sets depict the same map. An independently sourced or cropped raster may have different placement. The original local files were already present before this implementation; the prior README described them as 2,560-pixel reductions of full-terrain renders with no verifiable original-source URL or control-point record.

## Limits of this review

- The 100 m/unit convention is corroborated by the guide and all three community definitions.
- Full-raster dimensions, playable bounds, and a map's screen appearance are separate properties. Do not conflate them when calculating range or fitting the camera.
- The existing local 16,384 m image extent implies 6.4 m per source pixel for a 2,560-pixel raster. It is an inherited placement assumption, not a measured calibration result.
- At the time of the original review no live-game capture had been supplied. One has since been checked for Ozeti; see the section above. Bakurani and Zestafona are still in the state this paragraph describes.
- Image-search results included unrelated games and were rejected. They must not be used as Wardogs visual references.
- Community landmark coordinates can be comparison candidates but must not be labeled verified in-game control points without matching evidence.

## Ozeti verified against a live game, 19 September 2026

A fully zoomed-out in-game Ozeti map capture was supplied and checked against
`maps/ozeti.webp`. This section is the record the plan asks for: the evidence,
the method, the residuals, and what they do not cover.

### What the capture establishes on its own

- The in-game map grid is **numeric on both axes**, roughly 1 to 16, with
  `1KM` printed down the edge for every row. One square is 1 km, confirming the
  100 m per game unit convention from a second, independent direction.
- **Y counts upward.** The left axis runs 1 at the bottom to 13 at the top.
  This closes the open question about row direction: north is up, and the
  app's convention matches the game. A grid reference is not upside down.
- The axis ticks sit on **integer kilometre grid lines**, not square centres.
  This is confirmed indirectly but decisively: had the anchor been half a
  square out, every residual below would have been about 500 m rather than 20.
- The capture is **isotropic** -- 64.37 px/km horizontally against 64.44 px/km
  vertically, a 0.1% difference. The game's own map is not stretched.
- The playable boundary measures **X 56.93 to 143.46, Y 21.65 to 100.42** in
  game units, from the centre of the drawn boundary stroke.

That last figure independently corroborates the Apollyon definition for Ozeti
(57.58 to 143.07, 21.81 to 99.56): the four edges differ by -0.66, +0.36,
-0.20 and +0.85 units, so at worst 85 m. The stored `playableExtent` in
`src/page.html` keeps the Apollyon numbers, as the citable published source,
with this as corroboration rather than a replacement.

### Where the raster actually sits

The terrain inside the playable area was registered against the shipped
render, placed corner to corner on the 0 to 16,384 m square exactly as before.
Brightness will not correlate between a drawn map and a terrain render, so the
match is on gradient magnitude: rivers, roads and field edges appear in both.

A whole-area correlation peaked one pixel from the assumed placement, 46 sigma
above the background. Because a single global match only proves a translation,
the check was repeated on a 3x3 grid of ~2.8 km tiles:

| | west | centre | east |
| --- | --- | --- | --- |
| **north** | +7 E, -16 N | +2 E, -17 N | +2 E, -16 N |
| **middle** | +7 E, -19 N | +2 E, -19 N | +2 E, -19 N |
| **south** | +8 E, -22 N | +2 E, -22 N | +2 E, -22 N |

All nine matched significantly (SNR 9.7 to 28.0). Summary: mean offset +5 m
east and -19 m north, spread 3 m and 2 m, **RMS radial error 20 m, worst tile
24 m**.

The offsets do not grow towards the edges, so there is no detectable scale
error, and they do not rotate, so there is no detectable rotation. One pixel of
the reference capture is 15.5 m, which makes the whole residual about 1.3
reference pixels.

**Conclusion: the corner-to-corner placement of `maps/ozeti.webp` is correct to
20 m RMS across the playable area.** The constant ~19 m northward bias is
smaller than the resolution of the evidence and is indistinguishable from error
in reading the capture's own axes, so it is recorded and **not** corrected.
Correcting it would be fitting the raster to a measurement of a screenshot.

`tools/register-overview.py` performs this check. The numbers above reproduce
with:

    python tools/register-overview.py <capture> ozeti \
        --x-km 3 --y-km 13 --playable 264.83 258.12 821.78 765.72

### The map's appearance, measured

The same capture settles how the game draws its map, which the plan asks for
under visual fidelity. Sampled over the playable area, away from the objective
markers:

| | luminance mean | sd | p25 | p75 | saturation |
| --- | --- | --- | --- | --- | --- |
| in-game overview | 77.9 | 23.1 | 62.0 | 97.0 | **0.012** |
| `maps/ozeti.webp` as shipped | 184.2 | 34.8 | 165.0 | 213.5 | 0.666 |

The game's map is **effectively greyscale** -- 0.012 saturation, channel
balance R 0.994 / G 1.004 / B 1.002 -- and roughly half the brightness of the
render. That the Apollyon project defaults to grayscale is consistent with
this rather than a style choice.

A close-in capture of the same map measures 0.309 saturation with a blue cast,
but that sample is dominated by water; it is not evidence of a global tint, and
the overview is the better measure of the base terrain treatment.

`src/page.html` applies a desaturate to 0.08 and a per-map linear levels curve
mapping each render's p25/p75 onto the game's 62/97. Quartiles rather than the
tails, because Bakurani's snow caps and the water bodies distort a p5/p95 fit:
fitted on the tails Bakurani came out at sd 13.8 against the game's 23.1, and
on quartiles it lands at 32.7, with Ozeti at 23.9 and Zestafona at 25.5.

Only the shipped renders are treated. A player's own screenshot of the in-game
map has the treatment already.

## Bakurani partly checked, 19 September 2026

A second in-game overview was supplied, of a different map. Correlating a
central block of it against each raster identified it outright: Bakurani at
SNR 26.6, against 3.3 for Ozeti and 3.4 for Zestafona.

Registering it on a 3x3 grid of ~4.4 km tiles matched all nine, SNR 15.8 to
33.9, with an east/north spread of **12 m**. A raster cropped or scaled
differently would drift systematically across those tiles by far more, so
**scale and orientation are confirmed**. The east offsets do trend from +94 m
in the west column to +122 m in the east, and the north from +7 m at the top
to -22 m at the bottom; both are about 0.3% over the map, which is under one
capture pixel per tile and is not a scale error worth acting on.

Translation is weaker than for Ozeti, and deliberately recorded as such. That
capture prints kilometre labels along the **top edge only**:

- The east anchor comes from text-glyph centroids rather than tick marks. It
  lands at +106 m, which is about 7 screen pixels. Map labels are usually drawn
  slightly to the right of the line they name -- this repo's own board offsets
  them by 3 px -- so a bias of that size and sign is expected from the reading
  method, not from the raster.
- The north anchor could **not** be measured. There is no left-hand axis in the
  capture, so the vertical placement was fitted by correlation and the north
  residual is not an independent result. Only its spread is.

`MAP_DEFS.bakurani` therefore carries `calibration: "partial"` with a 110 m
figure, and the board says "scale and orientation checked in game; placement to
~110 m" rather than claiming alignment. A capture showing both axes would
finish it. Its playable bounds are still unmeasured: no boundary box was
visible in this capture.

## Zestafona verified, 19 September 2026

A third overview, and the best of them: tick marks on **both** axes, 63.32 px/km
east against 63.21 north, tick residuals of 0.6 and 2.4 px. Both anchors are
measured rather than fitted, which is what Bakurani's capture could not offer.

Nine ~3.5 km tiles: **eight agree to within 19 m of each other**, median offset
+14 m east and -23 m north, spread 7 m and 9 m, **RMS 28 m**.

### Why agreement, not confidence, is the test

Per-tile SNR ran 2.1 to 7.5 here, against 9.7 to 28.0 on Ozeti. Zestafona's
render is the flattest of the three -- it was measured at sd 18.1 against
Ozeti's 34.8 when the tone curves were fitted -- so its edges are weak and its
correlation peaks are shallow even where the placement is exact. Judged on peak
strength alone this map would have been rejected.

What cannot happen by accident is independent tiles agreeing. A false peak
lands anywhere in the +/-500 m search window, so a single tile landing within
60 m of the median by luck is about a 0.4% event. Eight of nine did.

The control is free, and was run: the same capture against the wrong maps.

| registered against | tiles near the median | verdict |
| --- | --- | --- |
| Zestafona | 8 of 9 | median +14 m E, -23 m N |
| Bakurani | 1 of 9 | scattered, offsets to 635 m |
| Ozeti | 0 of 9 | scattered, offsets to 704 m |

`tools/register-overview.py` now reports this clustering statistic instead of
counting confident peaks. Ozeti re-checked under the new rule is unchanged at
20 m RMS, worst agreeing tile 6 m.

### Playable bounds deliberately left unset

The boundary in this capture measures X 19.65 to 125.75, Y 47.48 to 143.76.
East agrees with the community figures to 25 m and 86 m, but north disagrees by
322 m and 186 m: the box reads about 560 m taller than published. The terrain
itself registers to 28 m, so this is not a placement error -- it is either the
boundary reading or the published figure, and this capture cannot say which.

`MAP_DEFS.zestafona.playableExtent` therefore stays null and the board draws no
boundary for it, unlike Ozeti where the two agreed to 85 m. A map may have a
verified placement and unsettled bounds; they are separate claims.

## What a close capture cannot do

A zoomed-in capture of the SPH-2 spawn was also supplied, at roughly 2 to 3 m
per pixel over about 2 km of ground. Searching the whole raster across eight
assumed scales produced peaks of SNR 7.7 to 9.2 that landed in four different
places, moving by tens of kilometres between neighbouring scales. That is
noise, not a match, and none of it was used.

This is the same limit recorded above: the renders hold 6.4 m per pixel, so a
capture zoomed past roughly 1 km of visible ground has no features left that
the raster also contains. Control points have to come from a wide view. The
coordinate readout on such a capture is still exact -- it is only the imagery
that cannot be matched.

### What this does not cover

- **Bakurani and Zestafona remain unverified.** The three rasters were reduced
  from separate sources; one being right says nothing about the others. Their
  `calibration` stays `unverified` and the app says so under the board.
- Ozeti was checked across its playable area. Terrain outside that boundary is
  drawn from the same raster under the same transform, but was not separately
  measured.
- 20 m RMS is the agreement between our raster and the game's *map*. It is not
  a claim about the game's map against the game's *world*.
- Resolution is unchanged. 6.4 m per source pixel still cannot show a building,
  and a result rounded to the metre still does not imply metre placement.

## Calibration completion procedure

For each map, retain a dated current-game overview and zoomed landmark captures with game coordinates. Match at least three well-separated locations to the raster to detect translation, scale, and orientation errors. If more than a translation/scale is needed, investigate crop/aspect/projection before introducing a more flexible transform. Check additional independent points after fitting; record residual errors in meters and the resolution of the source evidence. Keep numerical distance checks separate from imagery checks.

Ship exact coordinate arithmetic with honest image provenance. The calibration status should be available in map details, and imported screenshots should keep an explicit user-aligned status until checked.
