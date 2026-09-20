# Wardogs distance map plan

Prepared 19 September 2026. Planning only; application code has not been changed.

Make the main task: **choose two locations and immediately read their distance in meters**. The map should use the same visual landmarks and coordinate conventions as the current in-game map. Desktop play with a second screen or quick app switching is the primary workflow; phone use remains supported.

## What is already there

Reviewed `src/page.html`, `README.md`, the shipped map assets, and the running app at http://wardog-range.localhost/.

- Two-click measurement, draggable endpoints, a line label, integer meter results, wheel zoom, panning, and coordinate parsing already exist. Improve these rather than rebuilding the calculator.
- Bakurani, Ozeti, and Zestafona have separate saved positions, markers, measurements, and background images.
- The observer form comes before the map. The map is a square capped at `72vh` wide, with substantial unused space beside it; its bottom and measurement area fall below the initial viewport at the inspected desktop size.
- The first measurement point has no live distance preview before the second click. Endpoints have no prominent A/B labels. A third empty-ground click silently replaces the completed measurement.
- Paste currently creates markers or populates observer/gun fields. There are no direct coordinate inputs for measurement A and B. Pasted values follow the global input-unit toggle, so a game coordinate pasted in Metres mode can become 100 times too small.
- The grid supports 1,000 m and 100 m lines, but there is no persistent scale bar. The shipped images are 2,560 pixels across, approximately 6.4 m per source pixel under the current extent assumption.
- Camera position resets on map changes. Pointer handling tracks one gesture; pinch zoom and keyboard map operation need explicit support.

## 1. Establish map fidelity and calibration

Use a current in-game map capture as the visual reference, including an overview and a close zoom. Record its game version/date. Match terrain treatment, road/building visibility, coordinate labels, north direction, grid line hierarchy, map symbols, and zoom behavior.

Verify each map separately. Store a small definition for each map: image extent, playable extent, coordinate origin and orientation, meters per game unit, asset version, and verified landmark coordinates. Image dimensions alone do not establish its coordinate placement. Playable bounds and the image's full terrain bounds must be separate.

The existing conversion is supported by current community references: one game coordinate unit is 100 m. Keep world positions in meters and calculate straight-line distance with `hypot(B.x - A.x, B.y - A.y)`. Do not derive distance from screen pixels or the camera zoom.

Check several widely separated landmarks and reserve additional landmarks to verify the fitted alignment. Record the observed error. Do not claim a map is verified solely because a coordinate-only calculation is correct. In-game letter/number grid labels and their direction remain unverified in this repository; reproduce them only after checking a current reference.

If shipped imagery is insufficient for recognizing a building, add higher-resolution local tiles loaded only for the visible area. Keep the existing overview as a loading/failure fallback. Record asset provenance. Coordinate entry should remain usable while imagery loads. Numeric rounding to 1 m must not be presented as proof of 1 m placement accuracy.

## 2. Put the map and measurement first

Use a compact header with map selection and a fullscreen action. Let the map occupy the remaining screen, with a compact measurement panel beside it on desktop and a collapsible bottom panel on phones. Keep the result visible without scrolling.

Primary controls: **Measure**, **New measurement**, **Fit measurement**, and map zoom/fit. Place image adjustment, the polar plot, saved range card, weapon settings, and observer/gun settings inside a secondary Details area. Reuse the existing dark palette where it fits the verified game reference.

The measurement panel contains:

- **A · From** and **B · To**, each with a clearly labeled game-coordinate field and a Set on map action.
- A large result such as **413 m**, labeled Straight-line distance.
- Secondary bearing, with other existing values available in Details.
- A swap action and the option to keep A fixed while choosing another B.

Initial help is one short prompt: "Click your start point, then your destination." Help can expand to show the coordinate-copy workflow. A first visit must not label the existing center placeholder as the user's known location; use an unset position until explicitly supplied.

## 3. Refine the existing ruler

Use explicit states: choose A, choose B, completed, and edit endpoint.

1. First click places a labeled A marker.
2. Pointer movement previews the line, prospective B, and distance in meters.
3. Second click fixes B and the result. Touch users can complete this with two taps.
4. Drag either endpoint or edit its coordinate field to update the same measurement.
5. A completed measurement stays in place while navigating. Start another with New measurement, or choose another B when Keep A is enabled.

Label A and B with both text and distinguishable marker shapes. Keep their visible labels and hit areas consistent in screen pixels at every zoom. Clamp result labels inside the visible map and avoid covering the endpoints.

Add Undo for endpoint changes. Escape cancels a draft/edit and restores the last completed measurement where applicable. Provide visible controls and coordinate entry as alternatives to dragging. Saving a distance should retain both endpoints and the map identity; the current Save as marker action stores only one endpoint and does not preserve the measured pair.

## 4. Connect directly to the in-game coordinate workflow

Allow a complete game coordinate pair or marked chat line to be pasted into either From or To. Show the normalized `x98.43, y110.38` value so players can compare it with the game.

Game-coordinate fields always interpret their contents as game units, regardless of any advanced meter-input preference. An optional raw-meter input must be explicitly labeled and separate. Validate both coordinates before changing either endpoint; reject invalid or ambiguous input without replacing the current measurement. Handle zero values, labeled axis order, decimal separators, and surrounding chat text deliberately.

The in-game handoff is: zoom to the point, right-click and use Mark Coordinates, copy the pair, then paste it into A or B in this app. Provide a concise help example and Copy coordinates/Copy distance actions. Keep keyboard paste working if clipboard-button access is unavailable.

## 5. Make distance readable at a glance

Add an always-visible meter scale bar derived from the camera scale. Draw 1,000 m, 100 m, and close-zoom 10 m grid intervals only when they have enough space to read. Show the current grid spacing explicitly so zoom changes cannot alter the player's interpretation of a square.

Use the verified in-game coordinate labels along the edges and a clear north indicator. Keep the measurement line legible against both snow and dark terrain. Use meters as the main result even above 1,000 m; kilometers can be secondary context.

Keep wheel zoom anchored beneath the cursor. Distinguish a click from a pan by a threshold in actual screen pixels. Support one-finger pan and two-finger pinch without placing points when a gesture ends. Add keyboard pan/zoom and endpoint actions, with shortcuts disabled while typing. Remember each map's camera view along with its saved measurement.

Verified landmark names and coordinate search can follow after the core flow works. Optional distance rings around A can follow if playtesting shows they help repeated estimates. Avoid adding these controls to the first-use screen by default.

## Implementation order

1. **Coordinate correctness:** add map definitions and reference checks; separate game-coordinate parsing from meter input; validate the distance model and transforms.
2. **Core measuring experience:** revise the layout, add direct A/B fields, label endpoints, implement live preview, explicit completion/edit states, Undo, and persistent meter output.
3. **Map familiarity:** apply the verified game styling and labels, adaptive grids, scale bar, suitable imagery, and per-map camera restoration.
4. **Input and regression checks:** finish touch and keyboard support, verify responsive layout, and migrate saved state without losing existing markers or custom backgrounds.

Keep the existing plain HTML/JavaScript and SVG approach. `src/page.html` remains the source of truth; generate `index.html` through `python build.py`. Refactor the coordinate parser, measurement state, and camera transforms into testable functions as needed, without introducing a framework migration. A rectangular map viewport needs one consistent pixels-per-meter scale on both axes; stretching the current square transforms would distort the ruler.

Development uses the existing registered app and http://wardog-range.localhost/. Resolve its port with `ports get wardog-range`; any new listener must be claimed through the registry. Automated test listeners use port 0.

## Implementation status

Updated 19 September 2026, after the first implementation pass.

**Built.** Steps 2 to 4 of the implementation order are done. The layout is now
a header, a board and a measurement panel, with the observer/gun settings, the
polar plot, the range card, weapon settings and the image controls moved into a
Details dialog. The ruler has explicit choose-A / choose-B / complete / edit
states with a live pointer preview, direct game-coordinate fields for A and B,
Undo, Swap, Keep A, Fit, per-map saved pairs, and copy actions. The board's
viewBox now tracks its pixel size so a rectangular viewport keeps one scale on
both axes; endpoint marks and grab radii are constant in screen pixels. An
always-visible scale bar, an explicit grid-interval readout with 1,000/100/10 m
tiers, per-map camera restoration, pinch zoom, a touch-sized drag threshold and
board-scoped keyboard control are in. Unset observer and gun positions no
longer draw as if they were known. `src/ruler-core.js` carries the parser, the
distance model and the camera transforms, and `tests/ruler-core.test.js` checks
them outside a browser with `node tests/ruler-core.test.js`.

**Deliberate reading of one ambiguity.** Section 3 could be read as forbidding
a map click from starting a new measurement once a pair is finished. That would
leave a click on the board doing nothing, which reads as a broken map. Instead
the click starts a new measurement, the prompt above the board says so before
the click, and Undo takes it back after it. With **Keep A** ticked the same
click moves B and leaves A alone.

**Step 1, one map of three.** An in-game Ozeti overview was supplied on
19 September 2026 and the raster registered against it: 20 m RMS across the
playable area, no detectable scale or rotation error, from nine independent
tiles. Ozeti now carries `calibration: "verified"` with its residual and its
playable bounds, the board draws that boundary, and the footer says the map is
aligned. `tools/register-overview.py` makes the check repeatable. The same
capture settled the grid convention: numeric axes, 1 km squares, y counting
north upward, ticks on integer kilometre lines -- so the board's edge labels
now use the game's own kilometre numbers instead of raw readout values.

All three maps have since been checked against their own in-game capture:
Ozeti to 20 m RMS, Zestafona to 28 m, Bakurani to about 110 m -- weaker only
because its capture carries kilometre labels on one axis and no tick marks, so
its north anchor was fitted rather than measured. Playable bounds are settled
for Ozeti alone; Zestafona's reading disagrees with the published figure by up
to 320 m and Bakurani's was never visible, so neither draws a boundary.

Higher-resolution imagery is done. The board now carries 4 m and 2 m per pixel
tile levels above the 2,560 px overview, cut from the full-size exports by
`tools/cut-tiles.py`, fetched only for the ground on screen, with the overview
kept underneath as the base and the fallback. Every tile registers at exactly
0 m against the overview, so the calibration transfers untouched.

Landmark search and distance rings remain open, as does the in-game letter
grid -- which the captures show does not exist: the game numbers both axes.

**Checked in a browser.** The two-click flow, the preview, endpoint dragging,
Undo, Escape, coordinate entry and its rejections, pan, wheel zoom, pinch, the
keyboard map, per-map state and camera restoration, and reload persistence were
all exercised against the running app. The responsive layout was confirmed at
1366 x 768, 1920 x 1080 and 360 px: no page scrolling, no horizontal overflow,
44 px touch targets.

## Acceptance criteria

- At desktop sizes such as 1366 × 768 and 1920 × 1080, the main map controls and distance result are visible together without page scrolling. At 360 px phone width, controls remain usable without horizontal overflow.
- A new user can select two visible locations and read a distance in two clicks/taps. After identifying the locations, the target is under five seconds; verify this in a short playtest.
- The coordinate pair `x98.43, y110.38` to `x94.53, y109.03` produces approximately 412.7045 m internally and **413 m** when displayed. A 0.01-unit axis change produces 1 m; a 1.00-unit change produces 100 m; equal endpoints produce 0 m.
- Swapping endpoints leaves distance unchanged. Zooming, panning, resizing, changing display preferences, and reloading do not change the world-space measurement.
- Map-click positions match independently checked in-game landmarks within a documented tolerance appropriate to the reference and image resolution. This is a separate check from arithmetic correctness.
- Invalid, incomplete, or ambiguous pasted text leaves the previous valid measurement intact. No paste path can silently reinterpret game coordinates as raw meters.
- Panning, pinching, or clicking UI controls never accidentally replaces a completed measurement. Cancelled gestures cannot leave a stuck drag state.
- A, B, markers, custom backgrounds, and camera views stay associated with the correct map. Existing saved state loads through the migration.
- From/To can be set and edited without dragging. Controls have visible focus, readable contrast, accessible labels, and touch targets around 44 px. Announce completed results to assistive technology rather than every preview frame.

## Evidence and remaining checks

- [Jupliket's Steam guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3800319041), published 12 September 2026, documents the Mark Coordinates workflow, the ×100 conversion, and the 413 m worked example. This is community guidance, not an official game specification.
- [Apollyon's calculator map documentation](https://github.com/apollyon-sys/wardogs-calculator/blob/main/docs/maps.md) distinguishes playable bounds from terrain-image bounds and describes calibration that can be refined with in-game references. Use it as an independent cross-check, not as a replacement for validating this app's assets.
- Exact current in-game styling, grid naming/orientation, per-map landmark alignment, and close-zoom imagery quality still need reference validation. The current review establishes the app's behavior and implementation gaps; it does not certify the imagery against a live game session.

The first release covers a dependable two-point map ruler and a direct in-game coordinate workflow. Elevation-aware routes, automatic player tracking, live squad synchronization, and changes to ballistics are separate features.
