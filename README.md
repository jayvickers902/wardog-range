# Wardog Range

Range, bearing and mils between two map grid coordinates, for WARDOGS
(Bulkhead / Team17).

Enter your position once and every marker resolves live: range in metres,
bearing in degrees plus compass point, the same bearing in mils (6400 per
circle), transit time at a set speed, and a signed E/N offset so a mistyped
coordinate is obvious rather than silently producing a confident wrong bearing.

Four things it does beyond plain trigonometry:

- **A two-click ruler on the map.** Click a start point, click a destination,
  read the metres. The line follows the pointer between the two clicks, so the
  distance is there before you commit to it. Either end can be dragged,
  retyped, swapped or undone afterwards, and the pair stays put while you pan
  and zoom around it. Each map ships a downscaled render of its terrain and
  keeps its own ruler, markers, saved pairs, image and camera.
- **Observer and gun can be separate positions.** Solutions are fired from the
  gun; a `From obs` column keeps your own range and bearing to the same marker,
  so you can spot from one place and shoot from another.
- **Weapon envelopes.** Pick L81 or SPH-2 and the band column becomes
  `Too close` / `High arc only` / `In envelope` / `Out of range`, with the
  grouping radius at that range.
- **Paste a marked coordinate.** In game, right-click the map, Mark Coordinates
  [M], paste the chat line. A pair pasted into any Grid X box fills both boxes.

## Calibration

One grid square is 1 km, and the in-game readout is in hundreds of metres, so
`x72.88 / y105.33` is 7288 m east, 10533 m north. Y increases northward.
Bearings are grid north, clockwise. The whole terrain runs 0 to 163.84 on both
axes -- 16.384 km a side, 256 km(2).

Checked against the community's worked example: a gun at `x98.43 / y110.38`
firing at `x94.53 / y109.03` is 413 m, which is the 412 m the guides quote.

With no weapon selected the bands are plain distance brackets (close / direct /
long / extreme).

## The map

The map and its distance readout are the whole screen: a compact header, the
board, and a measurement panel beside it on a desktop or a collapsible one
below it on a phone. Everything else -- the observer and gun positions, the
polar plot, the range card, weapon settings and the map image controls -- lives
behind **Details**, because none of it is needed to answer "how far is that".

### Measuring

The ruler has four states and says which one it is in, above the board:

1. **Click your start point.** It becomes **A**, a labelled amber disc.
2. **Move the pointer.** The line, the prospective **B** and the distance
   preview follow it, so you can see the answer before you commit.
3. **Click your destination.** B lands, the result stops being a preview, and
   the finished distance is what gets announced to a screen reader -- the
   preview frames are deliberately silent.
4. **Adjust.** Drag either end, retype either coordinate, **Swap A / B**, or
   **Undo**. A finished pair survives panning, zooming, resizing, switching
   maps and reloading; only you can move it.

Tick **Keep A** and the next click on the ground moves B and leaves A where it
is -- the case where you are ranging several things from one position. Leave it
off and a click on a finished pair starts a new measurement, which the prompt
tells you before the click and Undo takes back after it.

**Save pair** keeps both endpoints, not just one, under the map they were
measured on. Saved measurements are listed in the panel; clicking one restores
it and frames it.

### Typing coordinates instead

**A · From** and **B · To** each take a game coordinate pair directly. In game:
zoom to the point, right-click, **Mark Coordinates [M]**, copy the chat line,
paste it into A or B. A paste that contains a readable pair lands immediately;
otherwise press Enter or **Apply**.

These two fields are always game units, whatever the advanced **Metres** toggle
in Details is set to. A marked chat line is always in game units, and reading
`x98.43` as 98 metres rather than 9,843 would be wrong by a factor of a
hundred. Both halves of a pair are validated before either endpoint moves, so
a rejected or half-finished paste leaves the previous measurement exactly as it
was, with the reason under the field.

The panel echoes each endpoint back in the game's own notation
(`x98.43, y110.38`) so you can check it against the screen you copied it from.
**Copy distance** and **Copy A + B** go the other way, into squad chat.

### Reading the board

The board is the whole terrain square in plan view, 16.384 km a side, north up.
A scale bar sits on the map at all times, and next to it the grid interval
currently drawn -- 1,000 m, 100 m or 10 m, whichever has room to be read at
this zoom. That number is printed rather than implied, because a square that
silently changes what it is worth is worse than no grid.

The edge scale is labelled with the game's own kilometre grid numbers, 0 to 16
on both axes, because that is what the game prints down the edges of its map --
checked against an in-game capture rather than assumed. The grid is numeric on
both axes, not letters against numbers, its ticks sit on the kilometre lines,
and **y counts upward**: 1 at the bottom, 16 at the top, north up. The marked
coordinate you paste is in hundredths of those numbers, so `x100.29` sits just
past the line marked `10`.

Drag empty ground to pan, scroll or pinch to zoom; the wheel zooms about the
cursor. Two fingers is always a gesture and never a placement, and a cancelled
gesture cannot leave a drag stuck. Clicks resolve to the nearest metre.

Focus the board and it can be driven from the keyboard: arrow keys pan, `+` and
`-` zoom, `0` fits the map, `Enter` places a point at the crosshair, `A` and
`B` arm an endpoint for the next click, `N` starts a new measurement, `U`
undoes, `F` frames the pair. `Escape` abandons a half-finished measurement and
puts the last finished one back. Shortcuts are scoped to the board, so they
never fire while you are typing in a field.

### What the numbers are, and are not

Distance is `hypot(Bx - Ax, By - Ay)` on world coordinates in metres, never on
screen pixels or the camera scale. That is why zooming, panning, resizing the
window, switching display preferences and reloading cannot change a
measurement, and why swapping the endpoints gives the same number back.

The map picker does not change that arithmetic. All three maps (Bakurani,
Ozeti, Zestafona) share the same 16.384 km square, the same 100 m unit and the
same north-up convention. What picking a map buys is separate state per map --
its own ruler, observer, gun, markers, saved pairs, background image and camera
position -- rather than one pile shared by all three. Per-map terrain height
and named POI presets would need game data nobody has published.

Rounding a result to the metre is a statement about the arithmetic, not about
the picture underneath it. Where a click lands on the terrain render is a
separate question, and it is answered one map at a time.

**Ozeti is verified.** Its render was registered against an in-game overview on
19 September 2026 and agrees to **20 m RMS** across the playable area, from
nine independent tiles, with no detectable scale or rotation error. The board
draws its playable boundary -- which is not the edge of the terrain, and is
smaller -- and the footer says the map is aligned.

**Bakurani is partly checked.** A second overview identified it outright and
confirmed its scale and orientation -- nine tiles, 12 m spread -- but that
capture carries kilometre labels on one axis only, so its placement is good to
about 110 m east and its north anchor was fitted rather than measured. The
board says exactly that instead of claiming alignment.

**Zestafona is verified** to 28 m RMS, from the best capture of the three --
tick marks on both axes, so both anchors are measured rather than fitted. Its
render is the flattest of the three, so individual tiles correlate weakly; the
evidence is that eight of nine agree to within 19 m of each other, where the
same capture against the wrong map scatters across hundreds. It draws no
playable boundary, because that measurement disagrees with the published figure
by up to 320 m and this capture cannot settle which is right. A verified
placement and settled bounds are separate claims.

The three renders came from separate sources, so no map's result ever carries
over to another. Each was checked on its own capture.

### Reading coordinates off the game

On the in-game map the **y** value is printed above the marked point and the
**x** value to its right, so reading down the screen hands them to you in the
opposite order to the one you type. `x85.91, y72.59` and `x72.59, y85.91` are
both real places -- on Bakurani they are 1,889 m apart -- so no amount of
validation here can catch a transposition. Paste the chat line rather than
retyping it and the labels come with it; the From and To boxes read `x` and `y`
in either order.

`docs/MAP-REFERENCE-REVIEW.md` has the method, the residuals and the limits.
Whatever the footer says, 6.4 m per source pixel cannot show you a building --
for a point you need to be exact about, type the coordinate.

### The map image

Each map ships a plan-view render of its terrain as `maps/<map>.webp`, cut down
from a full-resolution export: 2560 px square, WebP quality 75, roughly 1-1.5 MB
each against 0.4-1.5 GB for the originals. Only the selected map is fetched, so
a download is the price of switching maps, not of opening the page.

The renders need no aligning. Each covers exactly the same 16.384 km square the
board draws, square and north-up, so it is pinned corner to corner: the grid
lands on it because the two describe the same ground, not because somebody
dragged it into place. **Fade** takes it back under the grid, **Remove** clears
it, **Shipped map** returns it to that exact placement.

Downscaling that hard costs detail. At 2560 px one pixel is about 6.4 m -- enough
to recognise a village, a ridge or a road junction, not enough to read a
building. The art is Bulkhead's, carried here small and lossy so the board is
not a blank grid. To re-cut them, change `target` and `q` in the conversion and
re-run it against the originals.

They are also drawn the way the game draws its map, rather than as the bright
green terrain renders they arrive as. The in-game map is very nearly greyscale
-- measured at 0.014 saturation with a neutral channel balance, over the
playable area of the Ozeti capture -- and considerably darker. **Game style**
in Details applies that: a desaturate to 0.08 (not all the way to the measured
0.014, so rivers stay findable) and a levels curve that puts each render's
25th and 75th luminance percentiles onto the 62 and 97 measured from the game.

The curve is per map, because the three renders came from different sources and
share no tone curve -- Zestafona is flat and needs contrast, Bakurani is bright
and has snow caps that would drag a naive fit around, which is why the fit uses
quartiles rather than the far tails. It is an SVG filter over the image, so
nothing is baked into the files and **Full colour** puts them back.

A screenshot you drop in yourself is never styled. It is already the game's own
map, and running the treatment over it a second time would just crush it.

You can still supply your own picture instead: drop or paste a screenshot of the
in-game map, then **Adjust** to drag and scale it until its grid lines up with
the board's. A dropped screenshot is downscaled to 1600 px and re-encoded as
JPEG on the way in, then kept in `localStorage` under `wardogs-map-bg-<map>`,
one per map, separate from the rest of the state so a quota failure on a big
screenshot cannot take the markers with it. A shipped render stores only its
path and placement there, which costs nothing, and **Remove** stores `{off:1}`
so a bare grid survives a reload instead of the render coming straight back.

Alignment of your own image is by eye, so it is as accurate as you make it.
Every number still comes from where you click on the grid, never from the image
-- a misaligned picture gives you confidently wrong coordinates, the same way a
mistyped position does.

A fresh map starts empty: no markers, and the observer parked in the middle of
the square as an obvious placeholder rather than a plausible-looking position.
Markers go away one at a time with the `x` at the right-hand end of their row --
that column is pinned, so it stays on screen when the card is wide enough to
scroll sideways. `Reset` clears the lot, on every map, and puts the observer
back in the middle; it does not re-seed anything, so what it leaves is what a
first visit sees.

`Reset` leaves the map image alone: it is aligned to a coordinate system that
Reset does not change, and throwing away a screenshot somebody lined up by hand
is not what that button is for. `Remove` is next to the image controls.

## Game data

Everything below is community measurement. Bulkhead has published none of it,
and the community sites contradict each other (Bakurani's tower count is
variously reported as 1, 5 and 7). Treat it as a starting point, not truth.

    L81 mortar   52-685 m level ground, high arc only, sight 120-950 mil, 50 MOA
    SPH-2        745-2660 m level ground, elevation 0-1400 mil, 10 MOA
                 low arc only from about 1070 m out

`Spread` is `range x MOA x pi / 10800`, the grouping radius at that range. That
puts the mortar at 9.96 m at its maximum and the SPH-2 at 7.74 m at its own,
which reproduces the +/-10 m and +/-7.7 m the community quotes -- the formula
and their measurements agree.

### What this does not model

The page is flat-ground and two-dimensional. There is no terrain height, and
altitude is the largest error term in indirect fire: the mortar reaches roughly
735 m firing 100 m downhill and about 625 m firing 100 m uphill, an 8% swing
this tool cannot see. Fire a ranging shell.

## Layout

    src/page.html       source of truth -- body-only, also publishable as an Artifact
    src/ruler-core.js   world-space arithmetic; inlined into the page by build.py
    build.py            wraps src/page.html into index.html
    index.html          generated; served locally and by Vercel
    maps/               shipped terrain renders, one WebP per map
    tests/              regression checks for src/ruler-core.js
    tools/              map calibration against in-game captures
    docs/               the distance-map plan and the map reference review
    serve.py            local static server

`maps/` sits next to `index.html` and is referenced by relative path, so it
travels with a normal deploy but not with the Artifact publish, which is a
single file. The page fetches each render once to check it is really there and
falls back to the bare grid if it is not, so the Artifact build still works --
it just starts empty and waits for a dropped screenshot.

Edit `src/page.html`, then `python build.py`. Never edit `index.html`.

The parsing, the distance model and the camera transforms live in
`src/ruler-core.js`, which `build.py` inlines into the generated page so it
stays a single self-contained file. Keeping them in their own module is what
makes them testable outside a browser.

## Tests

    node tests/ruler-core.test.js

No dependencies and no build step. They cover what the page promises about
numbers: the coordinate parser including the inputs it must refuse, the 413 m
worked example to the last decimal, one hundredth of a unit being one metre,
swapped endpoints giving the same distance, and the camera transforms holding
one scale on both axes of a rectangular viewport at every zoom and viewport
shape.

They do not cover where a click lands on the terrain image. That is a question
for a live game, and it has its own tool:

    python tools/register-overview.py <capture> <map> --x-km N --y-km N

Give it a fully zoomed-out in-game map capture and it reports, in metres, where
our render disagrees with the game -- tile by tile, so a scale error cannot
hide behind a flattering average. It needs `numpy`, `scipy` and `pillow`, and
it writes nothing back: copy the numbers into `MAP_DEFS` and the review doc
yourself, with the date and the capture that produced them.

## Running it

    python build.py
    python serve.py

Local:  http://wardog-range.localhost/  (Caddy, via the port registry)
Public: https://wardogs.dudgy.net/

## Deploying

    python build.py
    vercel deploy --prod --yes
    vercel alias set <deployment-url> wardogs.dudgy.net

`*.dudgy.net` is a wildcard CNAME to Vercel, so no DNS change is needed for a
new subdomain -- deploy and alias is the whole job. The Cloudflare tunnel on
this machine serves `cs-api.dudgy.net` and is not involved.

## Ports

The local port is owned by `C:\projects\homepanel\ports.toml`
(`ports get wardog-range`). Do not hardcode a different one.

## Artifact

`src/page.html` is also published as a Claude Artifact:
https://claude.ai/artifact/NGqoragQF3aDtHiuzqPutx

To update it from a later session, publish `src/page.html` while passing that
URL, otherwise a second, separate artifact is created.

## Serving: two live paths, pick one

DNS for `wardogs.dudgy.net` currently points at the Cloudflare tunnel
`wardogs` (`0b182840-eec8-483a-aa63-9468ed818d2c`, config in
`~/.cloudflared/wardogs-config.yml`), which forwards to `serve.py` on this
machine. That means the site is down whenever this PC is off.

A Vercel deployment of the same page already exists and is aliased to the same
hostname. To hand the name back to Vercel -- always-on, global, no local
dependency -- delete the `wardogs.dudgy.net` CNAME record in the Cloudflare
dashboard. The `*.dudgy.net` wildcard then resolves to Vercel again and the
existing alias takes over. The tunnel and `serve.py` can then be stopped.

**Do not do that yet.** Vercel Deployment Protection is switched on for this
project, and it gates the production custom domain, not just the `*.vercel.app`
URLs. Verified 2026-09-19 by hitting the Vercel edge directly with the real Host
header:

    curl -sI --resolve wardogs.dudgy.net:443:76.76.21.21 https://wardogs.dudgy.net/
    HTTP/1.1 302 Found
    Location: https://vercel.com/sso-api?url=https%3A%2F%2Fwardogs.dudgy.net%2F

So deleting the CNAME today would hand the hostname to Vercel and immediately
break it for everyone not logged into the Vercel account. Turn protection off
first (Vercel dashboard -> project -> Settings -> Deployment Protection), confirm
that curl returns 200, then move the DNS.
