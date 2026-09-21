# Handoff: Wardog Range — simplified range & bearing tool

## Overview

A rebuild of the WARDOGS range tool (`jayvickers902/wardog-range`, live at
`wardogs.dudgy.net`). The existing page had grown into a settings surface: unit
toggles, observer/gun split, overlays, landmark loaders, screenshot alignment, a
details drawer and a multi-column range card. This design reduces it to the
three decisions a player actually makes mid-match:

1. Which map am I on.
2. Am I in the mortar (L81) or the artillery tank (SPH-2).
3. Where am I, and where is the target.

Everything else was cut. The map is the interface: click to place, drag to
adjust, and read one number off the rail.

## About the Design Files

The files in this bundle are **design references created in HTML** — a working
prototype showing intended look and behaviour, not production code to lift
wholesale. `Wardog Range.dc.html` is a "Design Component": a single streaming
HTML file whose markup lives in an `<x-dc>` template and whose behaviour lives
in a `class Component extends DCLogic` script, glued together by `support.js`.
That runtime is a prototyping harness, **not** something to ship.

The task is to **recreate this design in the target codebase's environment**.
For this project that environment already exists and is unusual: the real app is
a single hand-written `src/page.html` (body-only, no build step, no framework,
vanilla ES5-flavoured JS) that `build.py` wraps into `index.html`. Stay in that
world — plain DOM, inline `<style>` in the page head, no npm, no bundler — unless
the owner decides otherwise. The DC template maps cleanly onto plain elements;
`renderVals()` maps onto a single `render()` that rewrites the derived bits.

The geometry in `ruler-core.js` (also bundled) is **already the production
source of truth** and should be reused verbatim, not reimplemented. The
prototype's `toScreen` / `toWorld` / `solve` / `parsePair` are deliberate
reimplementations of it and should be deleted in favour of `WardogCore`.

## Fidelity

**High-fidelity.** Colours, type, spacing and interaction timings are final and
exact. Recreate pixel-perfectly. Every hex in this document is literal — the
prototype uses no CSS custom properties, but the production page should define
them as `:root` tokens (see Design Tokens).

The palette and type stack are deliberately borrowed from the owner's other
project, `jayvickers902/tarkov-squad-planner` (`src/index.css`), at his request:
"the tarkov squad planner I think looks the best and would do well stylistically
here." Token names below match that file so the two projects stay in sync.

---

## Screens / Views

There are two views in one page: a full-screen **Setup overlay** and the
**Board** underneath it. The overlay is not a route — the board is mounted and
measured behind it the whole time, which is why the map is already fitted when
the overlay closes.

---

### 1. Setup overlay

**Purpose:** the two picks that must happen before any number means anything.
Shown on first load, and any time the user clicks CHANGE in the header.

**Layout**

- `position: fixed; inset: 0; z-index: 60`, background `#0c0e0d` (opaque — the
  board must not show through).
- `display: flex; flex-direction: column; align-items: center; justify-content: center`
- `gap: 34px`, `padding: 32px 20px`, `overflow: auto`
- Fades in: `animation: wdIn .18s ease` where `@keyframes wdIn { from {opacity:0} to {opacity:1} }`

**Components**

**Wordmark block** — centred column, `gap: 6px`
- `WARDOGS` — Rajdhani 700, 30px, `letter-spacing: .24em`, `line-height: 1`, `#c9a84c`
- `RANGE & BEARING` — Share Tech Mono, 11px, `letter-spacing: .2em`, `#6f7a6c`

**Step heading** (used twice) — row, `align-items: center`, `gap: 10px`
- Label: Share Tech Mono 11px, `letter-spacing: .16em`, `#c9a84c`. Text is
  `01  MAP` and `02  WHAT ARE YOU IN` (two spaces, rendered as a `&nbsp;`).
- Followed by a `flex: 1; height: 1px; background: #262b25` rule.
- Both step blocks are `width: 100%; max-width: 760px`.

**Map cards** — `display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px`

Each card is a `<button>`:
- `position: relative; overflow: hidden; height: 118px`
- `display: flex; align-items: flex-end`, `padding: 0`
- `background: #131614`, `border-radius: 6px`, `cursor: pointer`
- `border: 1px solid #262b25`, **selected → `#c9a84c`**, hover → `#c9a84c`
- `transition: border-color .15s`

Card internals, three stacked layers:
1. Art layer — `position: absolute; inset: 0`, `background-image: url('maps/<id>.webp')`,
   `background-size: cover; background-position: center`, `opacity: .85`,
   `filter: saturate(.4) brightness(.62) contrast(1.15)`
2. Scrim — `position: absolute; inset: 0`,
   `background: linear-gradient(180deg, rgba(12,14,13,.25), rgba(12,14,13,.92))`
3. Text — `position: relative`, column, `gap: 2px`, `padding: 12px 14px`, left-aligned
   - Name: Rajdhani 700, 20px, `letter-spacing: .08em`, `line-height: 1.1`, `#f4efe1`
   - Note: Share Tech Mono, 10px, `letter-spacing: .12em`

The note is the map's real calibration status, carried through from
`src/page.html` so the accuracy caveat stays visible at the moment of choosing:

| Map | Note | Note colour |
| --- | --- | --- |
| Bakurani | `PLACEMENT ~110 M` | `#e0913f` |
| Ozeti | `ALIGNED · 20 M RMS` | `#66b778` |
| Zestafona | `ALIGNED · 28 M RMS` | `#66b778` |

**Weapon cards** — the whole step-2 block is `opacity: .42` until a map is
picked, then `1` (no transition specified; a `.15s` ease is acceptable).

Grid: `repeat(auto-fit, minmax(220px, 1fr))`, `gap: 12px`. Each card is a `<button>`:
- `display: flex; align-items: center; justify-content: space-between; gap: 14px`
- `padding: 16px`, `background: #131614`, `border-radius: 6px`
- `border: 1px solid #262b25`, selected/hover → `#c9a84c`, `transition: border-color .15s`
- Left column (`gap: 3px`, left-aligned):
  - Name: Rajdhani 700, 20px, `letter-spacing: .08em`, `line-height: 1.1`, `#f4efe1`
  - Sub: Share Tech Mono 10px, `letter-spacing: .12em`, `#8d998b`
- Right: Share Tech Mono 11px, `letter-spacing: .06em`, `#c9a84c`, `white-space: nowrap`

| Card | Name | Sub | Right band |
| --- | --- | --- | --- |
| `l81` | L81 Mortar | Man-placed, high arc only | `52–685 m` |
| `sph2` | SPH-2 | Artillery tank | `745–2660 m` |

**Behaviour**
- Clicking a map sets the map, **clears both points**, sets the armed endpoint
  back to `gun`, and refits the view to that map's home box. The overlay stays open.
- Clicking a weapon sets the weapon and **closes the overlay if a map is
  already chosen** (`setupOpen = !map`). So the common path is two clicks, no
  confirm button.
- Re-opening via CHANGE keeps the current picks highlighted; picking the same
  map again is destructive (clears points) — this is intentional, it doubles as
  "start over on this map".

---

### 2. Board (main view)

**Layout:** `height: 100dvh`, column flex.
- Header: `flex: 0 0 auto`, `height: 46px`
- Body: `flex: 1; min-height: 0; display: flex` → map (`flex: 1; min-width: 0`) +
  rail (`flex: 0 0 306px`)

This is a desktop tool used alt-tabbed out of a game; it is intentionally not
responsive below roughly 900px.

#### 2a. Header

`display: flex; align-items: center; gap: 14px; padding: 0 14px; height: 46px`,
`border-bottom: 1px solid #262b25`, `background: #0c0e0d`.

- `WARDOGS` — Rajdhani 700, 15px, `letter-spacing: .2em`, `#c9a84c`
- Divider — `width: 1px; height: 18px; background: #262b25`
- **Context button** — `display: flex; align-items: center; gap: 9px`,
  `background: transparent`, `border: 1px solid #2c3129`, `border-radius: 4px`,
  `padding: 4px 10px`, hover border `#c9a84c`. Contents:
  - Map name — Rajdhani 600, 14px, `letter-spacing: .08em`, `#f4efe1`
  - Divider — `1px × 12px`, `#2c3129`
  - Weapon short (`MORTAR` / `SPH-2`) — Share Tech Mono 11px, `letter-spacing: .1em`, `#c9a84c`
  - `CHANGE` — Share Tech Mono 10px, `#6f7a6c`
  - Clicking opens the setup overlay.
- Spacer `flex: 1`
- **Cursor readout** — Share Tech Mono 10px, `letter-spacing: .12em`, `#4d564b`.
  Shows `X 72.88  Y 105.33` (two spaces) live under the pointer; falls back to
  the current map's calibration note when the pointer is off the map.

#### 2b. Map

Container: `position: relative; flex: 1; min-width: 0; overflow: hidden`,
`background: #090b0a`, `touch-action: none`, `user-select: none`,
`cursor: crosshair` — switching to `grabbing` while panning.

Stacked children, in paint order:

1. **Raster** — a plain `<div>`, absolutely positioned, sized in screen px from
   the current view:
   `left/top` = `toScreen({x:0, y:16384})`, `width/height` = the span to
   `toScreen({x:16384, y:0})`.
   `background-image: url('maps/<id>.webp'); background-size: 100% 100%; background-repeat: no-repeat`,
   `filter: saturate(.3) brightness(.46) contrast(1.18)`, `pointer-events: none`.

   > Do **not** use an `<img src>` bound to a template value here — in the
   > prototype's streaming runtime that fired a request for the literal
   > placeholder string. In a normal codebase an `<img>` is fine; the
   > background-image approach is kept because it also makes the filter and
   > sizing one declaration.

   The filter exists because the shipped renders are bright and green while the
   in-game map is near-greyscale and dark. `src/page.html` already carries
   per-map tone curves (`MAP_DEFS.<id>.style` slope/intercept) measured against
   real captures — **prefer those over this blanket filter** when wiring into
   production.

2. **Vignette** — `position: absolute; inset: 0`, `pointer-events: none`,
   `background: radial-gradient(ellipse at center, rgba(12,14,13,0) 45%, rgba(12,14,13,.55) 100%)`

3. **SVG overlay** — `position: absolute; inset: 0; width: 100%; height: 100%`,
   `pointer-events: none`, `overflow: visible`. Everything inside is in screen
   coordinates, recomputed each render. Children in order:

   - **Dead-ground rects** (only for maps with a *verified* playable extent —
     currently Ozeti only). Four rects covering the viewport outside the
     playable box, `fill: rgba(9,11,10,.62)`, no stroke. Then one outline rect
     over the playable box itself: `fill: none`, `stroke: rgba(201,168,76,.4)`,
     `stroke-width: 1`, `stroke-dasharray: 8 6`.
   - **Minor grid** — every 100 m, drawn only when `k * 100 >= 34` screen px.
     `stroke: #c9a84c`, `stroke-opacity: .09`, `stroke-width: 1`. Skipped where
     a line coincides with a major line.
   - **Major grid** — step is the first of `1000 / 2000 / 4000` m whose on-screen
     spacing is `>= 46` px. `stroke: #c9a84c`, `stroke-opacity: .28`, `stroke-width: 1`.
   - **Envelope rings** around the gun (only once the gun is placed):
     - min range — `r = weapon.min * k`, `stroke: #c9a84c`, opacity `.5`, width `1`, `dash 5 5`
     - max range — `r = weapon.max * k`, `stroke: #c9a84c`, opacity `.65`, width `1.2`, `dash 5 5`
     - low-arc threshold (SPH-2 only, 1070 m) — `stroke: #e0913f`, opacity `.35`, width `1`, `dash 2 6`
   - **Shot line** — gun → target, `stroke-width: 1.5`, `stroke-opacity: .85`.
     Colour is the envelope verdict colour (green / orange / red), so the line
     itself says whether the shot is on.
   - **Edge labels** — one per major gridline, Share Tech Mono 10px, `#6f7a6c`.
     Vertical lines label along the top (`y = 13`, `x = line + 4`, anchor start);
     horizontal lines label down the left (`x = 5`, `y = line - 4`, anchor start).
     Value is the **game readout number** (metres ÷ 100, zero decimals).

4. **Pins** — absolute-positioned zero-size divs at the point's screen position,
   `z-index: 5`, `cursor: grab`, `touch-action: none`.
   - Dot: `left: -7px; top: -7px; width: 14px; height: 14px; border-radius: 50%`,
     `border: 2px solid #0c0e0d`,
     `box-shadow: 0 0 0 1px <colour>, 0 2px 8px rgba(0,0,0,.8)`
   - Label: `position: absolute; left: 18px; top: -9px`, Rajdhani 700, 13px,
     `letter-spacing: .1em`, `white-space: nowrap`, `text-shadow: 0 1px 4px #000`
   - Gun pin: `#c9a84c`, label is the weapon short (`MORTAR` / `SPH-2`)
   - Target pin: `#e06b6b`, label `TARGET`

5. **Status chip** — `position: absolute; left: 10px; bottom: 9px`, row, `gap: 10px`,
   `background: rgba(9,11,10,.8)`, `border: 1px solid #1a1f19`, `border-radius: 3px`,
   `padding: 3px 8px`, `pointer-events: none`. Two Share Tech Mono 10px
   `letter-spacing: .12em` `#4d564b` strings:
   - scale — `<m/px> M/PX · DOUBLE-CLICK TO FIT` (2dp below 1 m/px, else rounded)
   - prompt — `CLICK TO PLACE YOUR <WEAPON>` → `CLICK TO PLACE THE TARGET` →
     `DRAG A PIN TO ADJUST`, following what is already placed.

6. **North mark** — `position: absolute; right: 12px; top: 10px`, centred column,
   `gap: 1px`, `pointer-events: none`. `N` in Rajdhani 700 13px `#c9a84c`, above a
   `1px × 16px` bar with `background: linear-gradient(180deg, #c9a84c, rgba(201,168,76,0))`.

#### 2c. Solution rail

`flex: 0 0 306px`, column, `border-left: 1px solid #262b25`,
`background: #0c0e0d`, `overflow-y: auto`.

**Block 1 — solution.** `padding: 16px 16px 18px`, `border-bottom: 1px solid #262b25`,
`background: #101310`.
- Range: Rajdhani 700, **52px**, `line-height: .9`, `letter-spacing: .01em`,
  `font-variant-numeric: tabular-nums`. Colour = envelope verdict colour, or
  `#3a4038` when unsolved (displays `—`). Followed by a Share Tech Mono 13px
  `#6f7a6c` `m`, baseline-aligned.
- Row of two stats, `gap: 14px`, split by a `1px` `#262b25` vertical rule,
  `margin-top: 10px`. Each is a column, `gap: 1px`:
  - Caption: Share Tech Mono 10px, `letter-spacing: .14em`, `#6f7a6c` — `BEARING`, `DRIVE`
  - Value: Rajdhani 700, 24px, `line-height: 1`, tabular-nums. Bearing `#e4e0d4`
    (`123.4°`), drive `#9aa697` (`m:ss`).
- Verdict pill: `margin-top: 12px`, `display: block`, `padding: 6px 10px`,
  `border-radius: 3px`, Share Tech Mono 10px, `letter-spacing: .12em`, centred.
  `color: <verdict>`, `background: <verdict>1a`, `border: 1px solid <verdict>55`.
  Unsolved state: text `PLACE BOTH POINTS`, `color: #4d564b`, transparent
  background, `border-color: #23271f`.

**Blocks 2 & 3 — gun and target.** `padding: 14px 16px`, `border-bottom: 1px solid #1a1f19`.
- Title row, `gap: 8px`, `margin-bottom: 9px`: a `9px` dot (`#c9a84c` for gun,
  `#e06b6b` for target), the label in Share Tech Mono 11px `letter-spacing: .16em`
  `#e4e0d4` (weapon short / `TARGET`), spacer, then the **SET ON MAP** chip.
- Chip style — `border-radius: 3px`, Share Tech Mono 9px, `letter-spacing: .12em`,
  `padding: 4px 8px`:
  - inactive: `background: transparent`, `border: 1px solid #23271f`, `color: #6f7a6c`
  - active (this endpoint is armed): `background: rgba(201,168,76,.14)`,
    `border-color: #c9a84c`, `color: #e8c96a`
  - hover: `border-color: #c9a84c`
- Coordinate fields — `display: grid; grid-template-columns: 1fr 1fr; gap: 8px`.
  Each is a labelled column, `gap: 4px`:
  - Label `X` / `Y`: Share Tech Mono 10px, `letter-spacing: .14em`, `#6f7a6c`
  - Input: `background: #191c18`, `border: 1px solid #3a4038`, `border-radius: 4px`,
    `color: #e4e0d4`, `font-size: 15px`, `padding: 7px 9px`, `width: 100%`,
    Share Tech Mono, `outline: none` on focus.
- **Paste field** (target block only) — `margin-top: 8px`, full width,
  `background: #101310`, `border: 1px solid #23271f`, `border-radius: 4px`,
  `color: #e4e0d4`, `font-size: 12px`, `padding: 7px 9px`,
  `transition: border-color .2s`. Placeholder:
  `or paste the Mark Coordinates line`.
  Border flashes `#66b778` for 700 ms on success, sticks `#e06b6b` on a failed parse.

**Block 4 — saved.** `padding: 14px 16px`, column, `gap: 9px`.
- Header row: `SAVED` in Share Tech Mono 10px `letter-spacing: .16em` `#6f7a6c`,
  a `1px` `#1a1f19` rule filling the gap, and a `+ SAVE TARGET` chip (inactive
  chip style).
- Row: `display: flex; align-items: center; gap: 8px`, `background: #131614`,
  `border: 1px solid #23271f`, `border-radius: 4px`, `padding: 6px 6px 6px 10px`.
  - Name button (flex 1, truncating): Rajdhani 600, 14px, `letter-spacing: .04em`,
    `#e9e5d9`; below it the coords in Share Tech Mono 10px `letter-spacing: .06em`
    `#6f7a6c`, format `72.88 / 105.33`. Hover `opacity: .75`. Click loads it as
    the target.
  - Range chip: Share Tech Mono 11px, colour = that row's envelope verdict.
    Recomputed live from the current gun position; `—` when no gun.
  - Delete: `22 × 22`, `display: grid; place-items: center`, transparent,
    `border: 1px solid #23271f`, `border-radius: 3px`, `#4d564b`, `font-size: 13px`,
    glyph `×`. Hover → border and colour `#e06b6b`.
- Empty state: `NOTHING SAVED ON THIS MAP`, Share Tech Mono 10px,
  `letter-spacing: .1em`, `#3a4038`, `padding: 2px 0 4px`.
- Footer: `NEW MEASUREMENT` button, `align-self: flex-start`, `margin-top: 2px`,
  transparent, `border: 1px solid #23271f`, `border-radius: 4px`, `#4d564b`,
  Share Tech Mono 10px, `letter-spacing: .12em`, `padding: 5px 10px`.
  Hover → `border-color: #3a4038`, `color: #8d998b`. Clears the target only
  (keeps the gun) and arms `target`.

---

## Interactions & Behaviour

### Placing and adjusting points

The armed endpoint (`arm`, `'gun' | 'target'`) decides what the next map click
sets. It starts at `gun`, and **auto-advances to `target` the first time the gun
is placed by clicking** — so the opening sequence is genuinely click, click,
read. It does not auto-advance when the gun is set by dragging, typing or paste.

- **Click empty map** → place the armed endpoint there. Implemented as
  pointerdown/up with a **3 px movement threshold**: move more than 3 px and it
  is a pan, not a click.
- **Drag a pin** → move that point continuously. `pointerdown` on the pin stops
  propagation so it never starts a pan.
- **Drag empty map** → pan. `cx -= dx / k`, `cy += dy / k`.
- **Wheel** → zoom about the pointer. `span *= Math.exp(deltaY * 0.0014)`,
  clamped to `[120 m, maxSpan]`, then the world point under the cursor is pinned:
  `cx = wx - (px - w/2) / k'`, `cy = wy + (py - h/2) / k'`.
  The listener must be attached natively with `{ passive: false }`.
- **Double-click** → refit to the map's home view.
- All points are clamped to `0 … 16384` on both axes.

### Coordinate fields

This is the fiddly part and the thing the owner asked for specifically: *"two
number fields that can be adjusted with arrow keys or typed over."*

- Values are displayed as the **game readout** — metres ÷ 100, fixed 2 dp
  (`72.88`). Internally everything is metres.
- **A field holds an uncommitted draft string while it is being edited.** Naively
  binding `value` to `(m/100).toFixed(2)` and committing on every keystroke makes
  the field untypable: `1` reformats to `1.00` and the caret jumps to the end, so
  `103.83` can never be entered. Instead: keystrokes write the raw text into a
  per-field draft that owns the display, *and* (when the text parses) commit to
  the point so the map updates live. Blur or Enter drops the draft and the
  canonical 2 dp format returns.
- Setting the point from the map, a saved row or a paste clears that point's drafts.
- **ArrowUp / ArrowDown nudge by 1 m; with Shift, 10 m.** The nudge drops any
  draft first, so it always steps from the committed value. Enter blurs.

### Pasting a marked coordinate

Reuses `WardogCore.parsePair` from `ruler-core.js`. In game: right-click the map
→ Mark Coordinates [M] → paste the chat line. Accepts labelled pairs in either
axis order (`x70.36 y100.25`, `Y 100.25 · X 70.36`), decimal commas, and bare
pairs — but a bare pair must occupy the whole field, so chat timestamps and
marker numbers are never mistaken for coordinates. Pasted numbers are always
game units (× 100 to metres). A paste that parses is taken immediately on the
`paste` event (preventDefault); Enter also commits.

### Solution

```
dE = target.x - gun.x
dN = target.y - gun.y
range   = hypot(dE, dN)                       // metres
bearing = (atan2(dE, dN) * 180/PI + 360) % 360 // grid north, clockwise
```

Verdict, against the selected weapon:

| Condition | Label | Colour |
| --- | --- | --- |
| `r < min` | `TOO CLOSE · <min-r> M SHORT OF MINIMUM` | `#e06b6b` |
| `r > max` | `OUT OF RANGE · <r-max> M BEYOND MAXIMUM` | `#e06b6b` |
| `lowArcFrom && r < lowArcFrom` | `IN RANGE · HIGH ARC ONLY` | `#e0913f` |
| otherwise | `IN RANGE` | `#66b778` |

Drive time = `range / (speed * 1000/3600)`, formatted `m:ss`, speed fixed at
**40 km/h** (exposed as a prop in the prototype; there is deliberately no UI
control for it).

### What was deliberately removed

Do not reintroduce these without asking. From the current live page: the
readout/metres unit toggle, the observer-vs-gun split and the `From obs` column,
mils, spread/grouping radius, compass points, the transit-speed input, the
multi-row range card table, the polar plot, the distance-rings overlay, the
landmark JSON loader and its category chips, the screenshot drop-and-align flow,
the tile-pyramid zoom controls, the fullscreen and fit buttons, the Details
drawer and the long explanatory footer.

Two of these are worth flagging as judgement calls the owner signed off on:
**mils** were cut because he reads bearing in degrees, and the **screenshot
alignment** flow was cut because the shipped map renders already cover it.

---

## State Management

Single state object, no store needed.

| Key | Type | Notes |
| --- | --- | --- |
| `setupOpen` | boolean | true until both map and weapon are chosen |
| `map` | `'bakurani' \| 'ozeti' \| 'zestafona' \| null` | |
| `weapon` | `'l81' \| 'sph2' \| null` | |
| `gun` | `{x, y}` metres, or null | |
| `target` | `{x, y}` metres, or null | |
| `arm` | `'gun' \| 'target'` | which endpoint the next map click sets |
| `saved` | `{ [mapId]: Array<{id, name, x, y}> }` | per-map, capped at 8, newest first |
| `view` | `{cx, cy, span}` world metres | `span` is across the **shorter** viewport axis |
| `size` | `{w, h}` px | from a ResizeObserver on the map container |
| `cursor` | `{x, y}` or null | live pointer position in world metres |
| `drag` | `{kind: 'pan' \| 'gun' \| 'target'}` or null | |
| `draft` | `{ [which+axis]: string }` | uncommitted field text, see above |

Persisted to `localStorage` under `wardog-simple-v1`: `map`, `weapon`, `gun`,
`target`, `saved`. Nothing else — view, drafts and drag state are ephemeral.
Note this is a **new key**; the live page uses `wardogs-range-plot-v2`. Decide
whether to migrate or to let the old key lie.

There is no data fetching. The only network requests are the three map rasters
and the Google Fonts stylesheet.

### Coordinate system

Straight from `src/page.html` — reuse these, do not re-derive:

- `TERRAIN = 16384` m square, origin **southwest**, **y increases north**.
- One grid square is 1 km; the in-game readout is in hundreds of metres, so
  `x72.88` is 7288 m east. `metersPerUnit = 100`.
- Each `maps/<id>.webp` covers the full square corner to corner
  (`imageExtent = {0,0 → 16384,16384}`), so it needs no alignment.
- `scale k = min(w, h) / span`;
  `toScreen: {w/2 + (x-cx)k, h/2 - (y-cy)k}`; `toWorld` is its inverse.
- **Playable extent** is a different and smaller thing than the terrain square,
  and only Ozeti's is verified:
  `{minX: 5758, maxX: 14307, minY: 2181, maxY: 9956}`. Where it exists and is
  verified, it is the home box and the ground outside it is shaded.
  Bakurani and Zestafona open on the full square.
- Home view = the box centred, with span sized to fit plus a `1.06` margin.
  Max zoom-out span = the full square plus `1.15`. Min span 120 m.

### Weapon data

Community measurement, level ground, **not published by Bulkhead** — carried
over from `src/page.html`. The tool models no terrain height, and altitude is
the largest error term in indirect fire (the mortar reaches ~735 m firing 100 m
downhill and ~625 m uphill). Keep whatever disclaimer the production page settles
on; this design has no room for the old footer essay, so a short line near the
verdict pill or in an info affordance is the place for it.

| id | name | short | min | max | lowArcFrom |
| --- | --- | --- | --- | --- | --- |
| `l81` | L81 Mortar | MORTAR | 52 | 685 | — |
| `sph2` | SPH-2 | SPH-2 | 745 | 2660 | 1070 |

---

## Design Tokens

Names match `tarkov-squad-planner/src/index.css` so the two projects can share a
vocabulary. The prototype inlines the hex values; production should define these
as `:root` custom properties.

**Colour**

| Token | Hex | Used for |
| --- | --- | --- |
| `--bg` | `#0c0e0d` | page, header, rail |
| `--sur` | `#131614` | cards, saved rows |
| `--sur2` | `#191c18` | coordinate inputs |
| `--brd` | `#262b25` | primary borders, header rule |
| `--brdm` | `#2c3129` | header button border |
| `--brds` | `#3a4038` | input borders; also the unsolved range colour |
| `--brdo` | `#23271f` | chip / saved-row borders |
| `--gold` | `#c9a84c` | accent: wordmark, gun, grid, rings, selection |
| `--goldtx` | `#e8c96a` | active chip text |
| `--tx` | `#e4e0d4` | body text |
| `--txt` | `#f4efe1` | card and map titles |
| `--txb` | `#e9e5d9` | saved-row names |
| `--txm` | `#9aa697` | drive time |
| `--txd` | `#8d998b` | weapon sub-labels |
| `--txf` | `#6f7a6c` | micro labels, captions |
| `--txl` | `#4d564b` | faintest text, map chip |
| `--pill` | `#101310` | solution block, paste field |
| `--red` | `#e06b6b` | target pin, out-of-envelope |
| `--grn` | `#66b778` | in envelope, verified calibration |
| `--org` | `#e0913f` | high arc only, partial calibration |
| — | `#090b0a` | map letterbox behind the raster |
| — | `#1a1f19` | faintest divider |

Verdict colours are composed at three strengths: solid for text, `+1a` (10%)
for fills, `+55` (33%) for borders.

**Typography** — three families, loaded from Google Fonts:
`Rajdhani` 500/600/700, `Noto Sans` 400/600, `Share Tech Mono` 400.

| Role | Stack | Size / weight / tracking |
| --- | --- | --- |
| Display numbers | Rajdhani 700 | 52px range, 24px stats, `line-height: .9–1`, tabular-nums |
| Headings / names | Rajdhani 700 | 20px cards, 15px wordmark, `.08–.2em` |
| Body / buttons | Rajdhani 600 or Noto Sans 400 | 14px |
| Micro labels | Share Tech Mono | 9–11px, `.1–.2em`, uppercase |
| Inputs | Share Tech Mono | 15px (coords), 12px (paste) |

All numeric displays use `font-variant-numeric: tabular-nums` so values do not
jitter while dragging.

**Spacing** — 2 / 4 / 6 / 8 / 9 / 10 / 12 / 14 / 16 / 18 / 34 px. Rail blocks are
`14px 16px`; the solution block is `16px 16px 18px`.

**Radius** — `3px` chips and pills, `4px` inputs, buttons and rows, `6px` setup
cards, `50%` dots.

**Shadows** — only on pins: `0 0 0 1px <colour>, 0 2px 8px rgba(0,0,0,.8)`. Pin
labels get `text-shadow: 0 1px 4px #000`. No elevation shadows anywhere else.

**Motion** — `.15s` border-colour on interactive cards and chips, `.2s` on the
paste field, `.18s` fade on the setup overlay. Nothing else animates; pan and
zoom are direct manipulation with no easing.

---

## Assets

| Asset | Source |
| --- | --- |
| `maps/bakurani.webp` | `jayvickers902/wardog-range@master`, 2560 px overview, 6.4 m/px |
| `maps/ozeti.webp` | same |
| `maps/zestafona.webp` | same |
| Rajdhani, Noto Sans, Share Tech Mono | Google Fonts |

The rasters are **not bundled here** — they already live in the target repo at
`maps/`, and this design references them at exactly that path. The repo also
ships a tile pyramid at `maps/tiles/<map>/<level>/` (levels 8 and 16, i.e. 4 m/px
and 2 m/px, 512 px tiles) which this design does **not** use. Wiring it back in
is a straightforward win at high zoom and the loader in `src/page.html`
(`pickLevel`, `TILE_LEVELS`, `tileFail`) can be lifted wholesale.

No icons. There are no SVG illustrations anywhere in this design — every mark on
screen is either type, a geometric primitive, or the map raster.

## Files

| File | What it is |
| --- | --- |
| `Wardog Range.dc.html` | The design. Template in `<x-dc>`, behaviour in the `Component` class at the bottom. |
| `support.js` | Prototyping runtime for the above. Not for production. |
| `ruler-core.js` | Copy of `wardog-range/src/ruler-core.js` — the production geometry and parsing, already unit-tested in `tests/ruler-core.test.js`. Reuse as-is. |

Upstream source of truth, all in `jayvickers902/wardog-range@master`:
`src/page.html` (MAP_DEFS, calibration, tone curves, tile loader, weapon data),
`src/ruler-core.js`, `maps/`, `build.py`, `README.md`.
Visual language: `jayvickers902/tarkov-squad-planner@main`, `src/index.css`.
