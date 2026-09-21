# Wardog Range

Range and bearing between two points on a WARDOGS map (Bulkhead / Team17).

Pick a map, pick what you are shooting out of, click where you are and click
what you are shooting at. The rail beside the map says how far, on what
bearing, how long the drive is, and whether the shot is actually on. That is
the whole tool.

It is built around the three decisions a player makes mid-match -- which map,
which weapon, where are the two points -- and nothing else. An earlier version
of this page had grown into a settings surface: unit toggles, an observer/gun
split, overlays, a landmark loader, screenshot alignment, a details drawer and
a multi-column range card. All of it is gone. See **What was cut** for the
list, and `design_handoff_wardog_range/` for the design that replaced it.

The three things worth knowing:

- **The map is the interface.** Click to place, drag to adjust, scroll to zoom.
  The two pins and the line between them are the measurement; there is no
  separate ruler mode to be in.
- **The rings say whether the shot is on.** The gun's minimum and maximum range
  are drawn around it, and the line to the target takes the colour of the
  verdict, so the answer is visible on the map before you read the number.
- **You can type or paste instead.** Every coordinate has a field that takes
  the game's own readout, adjusts by arrow key, and accepts a Mark Coordinates
  line pasted straight out of chat.

## Calibration

One grid square is 1 km, and the in-game readout is in hundreds of metres, so
`x72.88 / y105.33` is 7288 m east, 10533 m north. Y increases northward.
Bearings are grid north, clockwise. The whole terrain runs 0 to 163.84 on both
axes -- 16.384 km a side, 256 km².

Checked against the community's worked example: a gun at `x98.43 / y110.38`
firing at `x94.53 / y109.03` is 413 m, which is the 412 m the guides quote.

## The board

Two views in one page. A full-screen **setup overlay** takes the two picks, and
the **board** underneath it does everything else. The overlay is not a route --
the board is mounted and measured behind it the whole time, which is why the
map is already framed the moment the overlay closes.

### Setting up

The overlay asks two questions and then gets out of the way.

**01 MAP** shows the three maps as cards, each carrying its own calibration
status: `ALIGNED · 20 M RMS` in green where the placement has been checked
against the game, `PLACEMENT ~110 M` in orange where it has not been checked
fully. That caveat is on the card rather than in a footer because the moment
you pick a map is the moment it matters.

**02 WHAT ARE YOU IN** shows the L81 mortar and the SPH-2 with the band each
one covers. It is dimmed until a map is picked, and picking a weapon closes the
overlay. So the common path is two clicks and no confirm button.

Picking a map clears both points and reframes the view. That is destructive on
purpose: it doubles as "start over on this map". **CHANGE** in the header
reopens the overlay with the current picks still highlighted.

### Placing the two points

One endpoint is armed at a time, and the chip marked **SET ON MAP** beside each
one says which. It starts on the gun and moves itself to the target the first
time the gun is placed by clicking -- so the opening sequence really is click,
click, read. It does not move itself when the gun is set by dragging, typing or
pasting, because in those cases you said where you wanted it deliberately and
were probably about to correct it.

Click empty ground to place the armed endpoint. Drag a pin to move it. Drag
empty ground to pan and scroll to zoom about the cursor; double-click frames
the map again. A click that shifts more than three pixels is a pan and not a
placement, so a slightly unsteady click still lands where you meant.

**+ SAVE TARGET** files the current target under the map it was measured on,
newest first, eight at a time. A saved row shows its coordinates and its range
from wherever the gun is standing *now*, recomputed live and coloured by the
same verdict -- so moving the gun re-answers every saved target at once,
without loading any of them. Clicking a row loads it as the target.
**NEW MEASUREMENT** clears the target and leaves the gun where it is.

### Typing coordinates instead

Each endpoint has an **X** and a **Y** field in the game's own readout, fixed to
two decimals. In game: zoom to the point, right-click, **Mark Coordinates [M]**,
copy the chat line, paste it into the box under the target block. A paste that
contains a readable pair lands immediately; Enter also commits. The border
flashes green on a good parse and sticks red on a bad one.

The fields take arrow keys: up and down nudge by a metre, with Shift by ten.
The nudge always steps from the committed value, never from half-typed text.

A field holds an uncommitted draft while it is being edited, which is fiddlier
than it sounds and is the reason the code looks the way it does. Binding the
value straight to a two-decimal format makes the field untypable: type `1` and
it reformats to `1.00` with the caret after it, so `103.83` can never be
reached. Instead the keystrokes own the display and the point follows whatever
parses, so the map moves as you type; blur or Enter drops the draft and the
canonical format comes back.

Pasted and typed numbers are always game units. A marked chat line is always in
game units, and reading `x98.43` as 98 metres rather than 9,843 would be wrong
by a factor of a hundred.

### Reading the board

The board is the terrain square in plan view, 16.384 km a side, north up -- or,
where a map's playable boundary has been checked in game, the part of that
square you can play on, with the rest shaded back.

A kilometre grid is drawn in gold, with 100 m minor lines once there is room
for them, and the major lines are labelled along the top and down the left edge
in the game's own readout numbers. The scale in the corner says how many metres
a pixel is worth at the current zoom, and what to do about it.

The coordinates under the pointer are printed in the header as you move, in the
same readout numbers the game uses, so a spot on the board can be read off and
then found in game. Off the map there is nothing to read, and the header falls
back to the current map's calibration note.

Around the gun: a dashed ring at its minimum range, a brighter dashed ring at
its maximum, and for the SPH-2 a third at 1070 m where the low arc starts. The
line from the gun to the target is drawn in the verdict colour -- green, orange
or red -- so the line itself says whether the shot is on.

Under the gun's rings, each map carries the ground a player orients by: the
**control zone** as a pale circle, and the three **faction bases** as squares
in the game's own colours -- Manticore green, Valkyra red, Lonestar blue --
each named above it and turned the way the game draws it. They are there so
the board and the in-game map can be matched at a glance. The zone is drawn
neutral because in game it takes the colour of whoever holds it. They are game
coordinates drawn in world space like the pins, so they sit right against the
grid even where the render beneath is only placed to ~110 m. Bakurani has its
bases but no zone yet: no capture has shown it. The base squares come from the
Apollyon calculator and were checked against our own captures; the zones were
measured off those captures. `docs/MAP-REFERENCE-REVIEW.md` has both.

### What the numbers are, and are not

Range is `hypot(tx - gx, ty - gy)` on world coordinates in metres, never on
screen pixels or the camera scale. That is why zooming, panning, resizing the
window and reloading cannot change a measurement. Bearing is
`atan2(east, north)` in degrees, grid north, clockwise. Drive time is the range
at a fixed 40 km/h; there is deliberately no control for it, because a number
you can adjust is a number you will fiddle with instead of firing.

The map picker does not change that arithmetic. All three maps share the same
16.384 km square, the same 100 m unit and the same north-up convention. What
picking a map buys is separate saved targets and its own render.

Rounding a result to the metre is a statement about the arithmetic, not about
the picture underneath it. Where a click lands on the terrain render is a
separate question, and it is answered one map at a time.

**Ozeti is verified.** Its render was registered against an in-game overview on
19 September 2026 and agrees to **20 m RMS** across the playable area, from
nine independent tiles, with no detectable scale or rotation error. The board
draws its playable boundary -- which is not the edge of the terrain, and is
smaller -- and opens framed on it.

That boundary is also what the board frames. Ozeti's playable area is 8.5 by
7.8 km inside a 16.4 km square, so three quarters of that square is ground
nobody can stand on. The dead ground is still drawn, shaded back, because a
boundary with nothing outside it reads as the edge of the world.

**Bakurani is partly checked.** A second overview identified it outright and
confirmed its scale and orientation -- nine tiles, 12 m spread -- but that
capture carries kilometre labels on one axis only, so its placement is good to
about 110 m east and its north anchor was fitted rather than measured. The
setup card says exactly that instead of claiming alignment.

**Zestafona is verified** to 28 m RMS, from the best capture of the three --
tick marks on both axes, so both anchors are measured rather than fitted. Its
render is the flattest of the three, so individual tiles correlate weakly; the
evidence is that eight of nine agree to within 19 m of each other, where the
same capture against the wrong map scatters across hundreds. It draws no
playable boundary, because that measurement disagrees with the published figure
by up to 320 m and this capture cannot settle which is right. A verified
placement and settled bounds are separate claims.

Bakurani and Zestafona are therefore framed whole, and shade nothing. Shading
ground you can in fact play on is a worse fault than showing ground you cannot.

The three renders came from separate sources, so no map's result ever carries
over to another. Each was checked on its own capture.

### Reading coordinates off the game

On the in-game map the **y** value is printed above the marked point and the
**x** value to its right, so reading down the screen hands them to you in the
opposite order to the one you type. `x85.91, y72.59` and `x72.59, y85.91` are
both real places -- on Bakurani they are 1,889 m apart -- so no amount of
validation here can catch a transposition. Paste the chat line rather than
retyping it and the labels come with it; the parser reads `x` and `y` in either
order, accepts decimal commas, and refuses a bare pair unless it is the whole
field, so a chat timestamp is never mistaken for a coordinate.

`docs/MAP-REFERENCE-REVIEW.md` has the method, the residuals and the limits.
Sharp ground is not accurate ground: the tiles under the control zone go down
to half a metre a pixel, but a placement is still only as good as the card
says. For a point you need to be exact about, type the coordinate.

### The map image

Each map ships a plan-view render of its terrain as `maps/<map>.webp`, cut down
from a full-resolution export: 2560 px square, WebP quality 75, roughly 1-1.5 MB
each against 0.4-1.5 GB for the originals. Only the selected map is fetched, so
a download is the price of switching maps, not of opening the page.

The renders need no aligning. Each covers exactly the same 16.384 km square the
board draws, square and north-up, so it is pinned corner to corner: the grid
lands on it because the two describe the same ground, not because somebody
dragged it into place.

Downscaling that hard costs detail. At 2560 px one pixel is about 6.4 m --
enough to recognise a village, a ridge or a road junction, not enough to read a
building. That is what the tiles below are for; the overview is what you see
zoomed out, and what shows through while a tile is still loading. The art is
Bulkhead's, carried here small and lossy so the board is not a blank grid.

They are also drawn the way the game draws its map, rather than as the bright
green terrain renders they arrive as. The in-game map is very nearly greyscale
-- measured at 0.014 saturation with a neutral channel balance, over the
playable area of the Ozeti capture -- and considerably darker. The board
applies that: a desaturate to 0.08 (not all the way to the measured 0.014, so
rivers stay findable) and a per-map levels curve that maps each render's 25th
and 75th luminance percentiles onto the 62 and 97 measured from the game.
Quartiles rather than the far tails, so Bakurani's snow caps and the water do
not drag the whole curve with them.

Those curves are stored as a slope and an intercept, and the page turns each
pair into a CSS `brightness()` and `contrast()`. The order of those two is not
free to choose. Contrast first drives every bright pixel past 1, where it
clamps, and the brightness that follows flattens all of them to one flat olive;
dimming first keeps the whole range inside the channel and lets only the
shadows clip, which is what a curve with a negative intercept is asking for
anyway.

### Tiles above the overview

Zooming in swaps the overview for finer tiles, one level at a time:

    maps/tiles/<map>/8/<x>_<y>.webp     8 across    4,096 px   4 m/px    whole map
    maps/tiles/<map>/16/<x>_<y>.webp   16 across    8,192 px   2 m/px    whole map
    maps/tiles/<map>/32/<x>_<y>.webp   32 across   16,384 px   1 m/px    3.5 km round the zone
    maps/tiles/<map>/64/<x>_<y>.webp   64 across   32,768 px   0.5 m/px  1.5 km round the zone

The level is named by how many 512 px tiles span the map, so the path says what
it is: 64 tiles over 16,384 m is 0.5 m per pixel. Tile x counts from the west
edge and y from the north.

The two coarse levels cover the whole map. The two fine ones cover a square
round the control zone, because that is the ground people zoom in on, and the
whole map at 0.5 m would be about 4,000 tiles and a few hundred megabytes a
map. 1 m reaches past an SPH-2's 2,660 m from the far edge of the zone; 0.5 m
covers the zone and everywhere a mortar can hit it from. Bakurani's zone has
not been captured yet, so its square is centred on the middle of its three
bases, which lands within about 170 m of the zone on the other two maps.

The fine levels are only cut where the export really has that much detail.
Ozeti and Zestafona are exported at 0.5 m per pixel, Bakurani at 1 m, so
Bakurani stops at level 32 rather than being upsampled into a fake 0.5 m.

| map | 8 | 16 | 32 | 64 | tiles | MB |
|---|---|---|---|---|---:|---:|
| Bakurani | whole | whole | 7.2 x 7.7 km | -- | 530 | 26.3 |
| Ozeti | whole | whole | 7.2 x 7.7 km | 3.3 x 3.3 km | 699 | 33.7 |
| Zestafona | whole | whole | 7.7 x 7.7 km | 3.3 x 3.3 km | 714 | 20.2 |

The fine levels add 39 MB to the 41 MB the coarse ones already were.

The board picks the coarsest level at least as sharp as the screen, counted in
device pixels, and at each spot draws the finest level up to that one which
has it -- so at full zoom the zone is 0.5 m and the ground just outside the
square falls back to 1 m, then 2 m. Only the squares on screen are fetched. The
previous level stays up until the new one has arrived, and the overview stays
underneath everything, so a tile still loading shows coarse ground rather than
a hole. All of it sits under the same tone filter as the overview.

The page is never told by hand what exists. `build.py` reads the tile
directories and writes each level's extent into `index.html`, so the page
never asks for a tile that was not cut; a level that is not one full rectangle
of tiles stops the build. `Core.tilePlan` in `src/ruler-core.js` does the
choosing, with its own checks in the tests.

Placement carries over untouched. Sampled 1 m and 0.5 m tiles, scaled down to
2 m, land on the level-16 tiles under them at exactly 0 px offset, and those
were checked against the overview the calibration was done on.

`tools/cut-tiles.py` cuts them from the full-size exports, which are 0.4 to
1.5 GB each and are not in the repository. `--levels 32,64` recuts just the
fine ones; the size of the square is `DETAIL` at the top of the script. Run
`python build.py` afterwards so the page learns the new extents. It needs pyvips
(`pip install "pyvips[binary]"`), which streams the decode instead of wanting
four gigabytes of memory for a 32,768 px source.

Nothing here came from anyone else's site. [wardogshub.gg](https://wardogshub.gg/map/)
hosts a good interactive viewer of the same maps, and its `robots.txt` closes
the raster to automated fetching; that request is respected here. The exports
these tiles are cut from match or beat what it serves anyway.

## Game data

Everything below is community measurement. Bulkhead has published none of it,
and the community sites contradict each other. Treat it as a starting point,
not truth.

    L81 mortar   52-685 m level ground, high arc only
    SPH-2        745-2660 m level ground, low arc only from about 1070 m out

The verdict beside the range is one of four: `TOO CLOSE` with how far short,
`OUT OF RANGE` with how far over, `IN RANGE · HIGH ARC ONLY` inside the SPH-2's
low-arc threshold, or plain `IN RANGE`.

### What this does not model

The page is flat-ground and two-dimensional. There is no terrain height, and
altitude is the largest error term in indirect fire: the mortar reaches roughly
735 m firing 100 m downhill and about 625 m firing 100 m uphill, an 8% swing
this tool cannot see. Fire a ranging shell. The rail says as much, in one line
under the verdict, which is all the room the design leaves for it.

## What was cut

Recorded so it is not quietly reintroduced. From the earlier page: the
readout/metres unit toggle, the observer-vs-gun split and its `From obs`
column, mils, spread and grouping radius, compass points, the transit-speed
input, the multi-row range card, the polar plot, the distance-rings overlay,
the landmark JSON loader and its category chips, the screenshot drop-and-align
flow, the tile-pyramid zoom controls, the fullscreen and fit buttons, the
Details drawer and the long explanatory footer.

Two were judgement calls rather than simplifications. **Mils** went because the
owner reads bearing in degrees. **Screenshot alignment** went because the
shipped renders already cover what it was for.

The geometry behind the cut features is still in `src/ruler-core.js` and still
tested -- `ringStep` and `readPoi` in particular -- so rings and landmarks
could come back without re-deriving anything. `maps/poi/README.md` still
documents the landmark file format for the same reason; nothing reads it today.

The control zone and faction bases, added on 20 September 2026, are not a
return of the overlays. They are fixed per map, with no toggle, because they
are what a player finds themselves by.

## Layout

    src/page.html       source of truth -- body-only: markup, styles and behaviour
    src/ruler-core.js   world-space arithmetic; inlined into the page by build.py
    build.py            wraps src/page.html into index.html
    index.html          generated; served locally and by Vercel
    maps/               shipped terrain renders, one WebP per map
    maps/tiles/         finer tiles, drawn over the overview as you zoom in
    tests/              regression checks for src/ruler-core.js
    tools/              map calibration, and cutting tiles from the exports
    docs/               the distance-map plan and the map reference review
    design_handoff_wardog_range/   the design this page was built to
    serve.py            local static server

`maps/` sits next to `index.html` and is referenced by relative path, so it
travels with a normal deploy.

Edit `src/page.html`, then `python build.py`. Never edit `index.html`.

The parsing, the distance model, the camera transforms, the weapon envelope,
the drive time, the view fitting and the grid spacing live in
`src/ruler-core.js`, which `build.py` inlines into the generated page so it
stays a single self-contained file. Keeping them in their own module is what
makes them testable outside a browser. The page holds the palette, the DOM and
the event wiring, and nothing else worth asserting about.

There is no build step beyond `build.py`, no framework and no npm. The page is
plain DOM and ES5-flavoured JavaScript with one `<style>` block in its head.
Stay in that world.

## Tests

    node tests/ruler-core.test.js

No dependencies and no build step. They cover what the page promises about
numbers: the coordinate parser including the inputs it must refuse, the 413 m
worked example to the last decimal, one hundredth of a unit being one metre,
swapped endpoints giving the same distance, the camera transforms holding one
scale on both axes of a rectangular viewport at every zoom and viewport shape,
the weapon envelope at each of its boundaries, drive time, the view that frames
a box across the shorter axis, and the grid spacing thresholds.

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

The page is also published as a Claude Artifact:
https://claude.ai/artifact/NGqoragQF3aDtHiuzqPutx

Publish `index.html`, not `src/page.html`. The source file carries
`/* INLINE_RULER_CORE */` where the geometry goes and `build.py` fills it in,
so `src/page.html` on its own has no `WardogCore` and the board never draws.
To update the artifact from a later session, publish while passing that URL,
otherwise a second, separate artifact is created. The renders are referenced by
relative path and do not travel with a single-file publish, so the artifact
copy draws the grid and the rail but not the terrain.

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
