# Wardog Range usability and aiming plan

Reviewed 21 September 2026 against commit `afe8bcf`, the running app at
http://wardog-range.localhost/, the current source, and the calibration record.
Written as a proposal. See **Implementation status** for what has since been
done.

The priority is to make the two points reliable and easy to adjust. The core
world-coordinate distance and bearing calculations are sound in the cases
reviewed, and all 61 existing regression checks pass. Actual shot placement
also depends on map registration, the coordinates supplied, and game behavior
that the current two-dimensional range check does not model.

## Findings that determine the order

| Priority | Finding | Evidence |
| --- | --- | --- |
| P0 | Double-clicking to fit can overwrite an endpoint. | Reproduced: a 413 m measurement became 2,326 m after double-clicking empty ground. Placement runs on pointer-up before the fit handler. |
| P0 | Dragging a pin by its label snaps the point toward the cursor. | Reproduced: dragging the gun label 10 px moved the gun about 544 m at a scale of about 12 m/px. The initial grab offset is discarded. |
| P0 | Invalid coordinates can become plausible, incorrect points. | Reproduced: entering `9999` commits `163.84` without an error. Code also accepts numeric prefixes through `parseFloat`; a new endpoint gets a zero for its missing axis. |
| P1 | Precision entry is easier for the target than the gun. | Only the target has a Mark Coordinates paste field. Existing 1 m / Shift+10 m keyboard nudges are undocumented on the board. |
| P1 | Setup does not contain keyboard focus. | Reproduced: after opening CHANGE, Tab focuses the obscured SET ON MAP button. The overlay has no dialog semantics or cancel control. |
| P1 | The aiming readout and important caveats are hard to scan. | Range is prominent; bearing shares a smaller row with drive time. The height caveat is 9 px and low contrast. The calibration note is replaced by pointer coordinates while using the map. |
| P1 | Map placement quality varies substantially. | Current records report 20 m RMS for Ozeti, 28 m RMS for Zestafona, and roughly 110 m placement uncertainty for Bakurani, whose north anchor was not independently measured. |
| P2 | Supporting actions interrupt or lose context. | Code review: reselecting the current map clears both endpoints; every render replaces saved-target buttons; uncached detail downloads can hold the setup screen open. |

## Implementation status, 21 September 2026

Phases 1 to 3 are implemented in `src/page.html` and `src/ruler-core.js`,
checked in a browser against an isolated build at 1280×720 and 800×720, and
described in the README. The core checks grew from 61 to 71: strict axis
reading, bounded pastes, offset-preserving drag, bearing text at north and for
coincident points, and saved-name numbering.

- **1. Placement and editing.** Drags are previews with the grab offset kept
  and pointer capture. They commit once on release, and Escape or
  pointercancel restores them. Only the primary pointer counts, and a release
  away from its press is a pan. Double-click-to-fit is gone; FIT SHOT and `F`
  replace it, and a double-click's second click is dropped. Undo covers
  placement, drag, paste, field edits and nudge sessions (one step each),
  saves, renames, deletes and clears, by button or Ctrl+Z outside text fields.
  Typed axes are read whole-field and bounded to 0–163.84, and invalid or
  half-finished drafts never move a point. Pasted pairs are bounded too.
- **2. Precise coordinates.** Both endpoints have a paste box, and a whole line
  pasted into an X or Y box also works. Results and failures are confirmed in
  words. The nudge keys are on the board. The armed endpoint is named on the
  status line and marked on its pin and chip. A pasted, typed or clicked gun
  hands the next click to the target. The gun can be locked. Zoom and fit
  buttons are back, and pins have a 32 px invisible hit area around an exact
  centre. The magnified preview was not built: offset-preserving drag, zoom
  and nudges were tested first, as the plan suggested.
- **3. Reading and recovery.** Range and bearing are the same size. The
  verdict reads "Within level-ground range", the height caveat sits under it,
  and drive time is a quiet labelled line. A placement line independent of the
  pointer names each point's source and the map's alignment figure. CHANGE is a
  modal dialog with focus management, inert background, and CANCEL/Escape that
  restores the shot. Reselecting the current map or changing only the weapon
  keeps the shot, and CLEAR BOTH POINTS is the explicit reset. Saved rows are
  updated in place, named on save and renamable. The board opens as soon as a
  weapon is picked, with a loading chip, a partial-failure count and a RETRY
  that fetches only the missing squares. Committed results are announced to
  screen readers once.
- **4. Calibration.** The stale passages in `docs/MAP-REFERENCE-REVIEW.md` are
  reconciled, and it opens with a consolidated current-status table. New
  registration work waits on the Bakurani capture described there.
- **5. Game behaviour.** Not started; it needs a dated in-game test set.

## 1. Protect placement and editing — first implementation

Treat a drag as a transaction: retain its starting point, show a live preview,
commit on a valid release, and restore the start on cancellation. Track the
active pointer, retain the pointer-to-pin offset, and use pointer capture.
Ignore secondary pointers until a deliberate multi-touch gesture is supported.
Persist a completed change once rather than writing storage on every move.

Replace the conflicting double-click-to-fit gesture with an explicit small Fit
control and keyboard shortcut. Keep ordinary placement immediate. Add one-step
Undo for placement, dragging, coordinate commits, and target clearing, with
Escape cancelling a pending adjustment. Native undo inside a text field should
continue to edit text. These recovery behaviors follow the intent of
[W3C's pointer cancellation guidance](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html).

Use strict whole-field numeric parsing and terrain bounds validation. Invalid
or incomplete drafts must not overwrite the last valid point; a new point is
usable only after both axes are valid. Show an inline error explaining the
allowed game-coordinate range, 0–163.84. Reject out-of-range pasted pairs too.
Do not silently convert an invalid entry into an edge coordinate. Keep decimal
comma support and the existing protection against swapped labelled axes.

Acceptance: fitting never changes coordinates; a 10 px drag moves a point by
10 px converted through the current map scale regardless of where it was
grabbed; cancel restores the original state; Undo reverses one whole action;
invalid or incomplete input cannot produce a newly committed firing readout.

Primary files: `src/page.html` interaction and input handlers; pure validation
and state helpers in `src/ruler-core.js` where useful for meaningful tests.

## 2. Make precise coordinates the easy path

Give both endpoints a clearly labelled Mark Coordinates paste action. Reuse
the existing labelled-pair parser, including reversed X/Y order and decimal
commas. Confirm success with text such as “Gun set: X 98.43 / Y 62.45”; explain
parse failures in text as well as color. A complete pasted pair is one commit.

Expose the existing nudges with a short hint: “Arrow keys: 1 m · Shift: 10 m.”
Identify the armed endpoint in words and on the map, with the next-click hint
following that selection even when both points already exist. Allow a placed
gun to be locked while adjusting targets.

Add compact zoom and Fit shot controls so a player can bring both points into
view, then refine a point. Keep a precise crosshair center with a larger
invisible hit area. Consider a magnified placement preview only after testing
whether zoom, offset-preserving drag, and nudging solve the problem.

The previous design intentionally removed zoom/fit buttons. This proposal
explicitly reintroduces a minimal set to fix discoverability and keyboard
operation while preserving the map, weapon, and two-point workflow.

Acceptance: either endpoint can be set from a game chat line without retyping;
the UI always states which point the next click will change; fine adjustment
works with both pointer and keyboard without losing the other endpoint.

## 3. Make the board faster to read and recover

Give distance and bearing comparable visual weight. Retain degrees, as the
current design records that preference. Move drive time into a quieter position
and label it as a straight-line estimate at 40 km/h. Make the level-ground
qualification readable beside the range verdict. Use “Within level-ground
range” where needed to communicate what the check establishes.

Keep a short placement-quality note visible independently of the hover
readout. Record whether each point was entered/pasted or clicked, so advice can
be specific: “Paste game coordinates for more precise placement.” Do not turn
the existing RMS registration figures into an unsupported shot-error radius.
Handle coincident points with no bearing, and normalize rounded north bearings
to 0.0° rather than displaying 360.0°.

Make CHANGE a proper accessible dialog: move focus inside on opening, contain
Tab navigation, make the board inert, support cancel/Escape when returning to
an existing setup, and restore focus on closing. Follow the
[W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
Expose map/weapon selection and endpoint arming to assistive technology; give
coordinate fields distinct names such as “Gun X” and “Target X.” Announce
committed results without speaking every pointer movement.

Reselecting the current map should preserve the shot; make reset explicit.
Allow changing the weapon without reselecting the map. Update saved rows in
place so hover redraws do not discard their keyboard focus, and allow useful
names instead of accumulating indistinguishable “Target 9” entries.

Keep the existing detailed-tile cache and download work. Make coordinate entry
available while map detail loads, show an honest loading/partial-failure state,
and offer retry. Test making the board usable once the overview and visible
tiles are ready while the rest of the pack continues in the background.
Preserve a clear way to wait for all detail if that is the player's preference.

Target desktop and split-screen use first. Check 1280×720 and 800×720, plus
browser zoom and keyboard operation. A phone layout is a later scope decision;
the current README explicitly describes a desktop-focused tool.

Acceptance: both aiming numbers and qualifications are readable at a glance;
all core tasks work from the keyboard; opening CHANGE or changing only the
weapon does not lose the shot; loading imagery does not block coordinate work.

## 4. Improve calibration with independent evidence

Start with Bakurani. Obtain a current-game overview with both axes and several
widely separated, clearly identified landmarks with marked game coordinates.
Use the existing registration tool and fine tiles where appropriate. Reserve
additional landmarks for validation rather than fitting and scoring the same
points. Record source resolution, date/game version, systematic offsets,
residual spread, and worst error.

Only apply a map transform when the evidence resolves it more accurately than
the current registration. The existing Ozeti review explicitly says its small
systematic offset cannot be distinguished from screenshot-axis reading error;
automatically subtracting that offset would not establish an improvement.

Track registration, coordinate-entry precision, and click-placement precision
separately. A shared translation can cancel when both endpoints are clicked on
the same raster, but remain relevant when one endpoint is typed and the other
clicked. Test both workflows before reporting improved distance accuracy.
Entered game coordinates bypass this app's raster placement error, but are
still only as good as the coordinates marked in game.

Consolidate calibration metadata and reconcile stale passages in
`docs/MAP-REFERENCE-REVIEW.md` that still describe Zestafona as unverified or
the overview resolution as the only available detail.

Acceptance: any new “verified” label has independent held-out evidence; changes
improve the documented residuals beyond measurement uncertainty; pure coordinate
calculations remain unchanged. This phase depends on new game reference data.

## 5. Validate game behavior before adding trajectory features

The app currently supplies horizontal range, bearing, and community-derived
level-ground range limits. Audit those limits against a dated current-game
test set for each supported weapon and arc. Capture gun/target coordinates,
available height information, selected in-game settings, and repeated observed
results. Separate repeatable bias from shot-to-shot variation.

Use those results to decide whether a small optional height/arc adjustment or
a measured game-specific lookup would improve the tool. Validate it on shots
not used to derive it. Do not substitute three-dimensional straight-line
distance or an assumed real-world projectile model for the game's behavior.
Keep unsupported cases explicitly approximate.

Acceptance: a proposed correction demonstrates a measured improvement on
independent in-game trials before becoming part of the aiming readout. This
work is data-dependent and should not delay the interaction fixes.

## Delivery and verification

Implement phases 1–3 in small reviewable changes, then perform calibration and
weapon validation as their evidence becomes available. Keep plain HTML,
JavaScript, and SVG; extend the existing core rather than migrating frameworks.

Keep the 61 existing checks and add focused regressions for the reproduced
interaction failures, invalid/partial input, zero-length bearings, and rounding
at north. Browser checks should cover pin-center and pin-label dragging, fit
and undo, cancelled gestures, typing/pasting both endpoints, map/weapon changes,
dialog focus, and preservation of range/bearing across camera changes. Test
cache hits, interrupted downloads, and partial tile failure for loading changes.

Only modify `src/page.html` and the core as application sources; `index.html`
is generated. The current server exposes this workspace through the public
tunnel, so implementation verification should use an isolated local copy
before rebuilding the served page. Any new listener must use the port registry;
automated test listeners bind port 0. Link local apps through their registered
`http://<name>.localhost/` hostnames.
