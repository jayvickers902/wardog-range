/* Regression checks for the world-space arithmetic behind the ruler.
   No dependencies and no build step:

       node tests/ruler-core.test.js

   These cover the numbers the page promises, not the pixels. Image alignment
   is a separate question and is checked against the game, not in here --
   see docs/MAP-REFERENCE-REVIEW.md. */
"use strict";

const Core = require("../src/ruler-core.js");

let passed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    failures.push(name + "\n    " + err.message);
  }
}
function eq(actual, expected, what) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) throw new Error((what || "value") + ": expected " + b + ", got " + a);
}
function near(actual, expected, tol, what) {
  if (!(Math.abs(actual - expected) <= tol)) {
    throw new Error((what || "value") + ": expected " + expected + " +/- " + tol + ", got " + actual);
  }
}
function isNull(actual, what) {
  if (actual !== null) throw new Error((what || "value") + ": expected null, got " + JSON.stringify(actual));
}

/* ---- parsing a marked chat coordinate ---------------------------------- */

check("labelled pair in either axis order", () => {
  eq(pick(Core.parsePair("x98.43, y110.38")), { x: 98.43, y: 110.38 });
  eq(pick(Core.parsePair("y110.38 x98.43")), { x: 98.43, y: 110.38 });
  eq(pick(Core.parsePair("X 98.43 · Y 110.38")), { x: 98.43, y: 110.38 });
  eq(pick(Core.parsePair("x98.43,y110.38")), { x: 98.43, y: 110.38 });
});

check("a name in front of the pair is not part of it", () => {
  const p = Core.parsePair("Tower 4  x70.36 y100.25");
  eq(pick(p), { x: 70.36, y: 100.25 });
  eq("Tower 4  x70.36 y100.25".slice(0, p.at).trim(), "Tower 4", "name offset");
});

check("zero is a coordinate, not a missing value", () => {
  eq(pick(Core.parsePair("x0 y0")), { x: 0, y: 0 });
  eq(pick(Core.parsePair("x0.00, y163.84")), { x: 0, y: 163.84 });
});

check("negative and unicode minus signs", () => {
  eq(pick(Core.parsePair("x-3.5 y12")), { x: -3.5, y: 12 });
  eq(pick(Core.parsePair("x−3.5 y12")), { x: -3.5, y: 12 });
});

check("comma decimal separators", () => {
  eq(pick(Core.parsePair("x98,43 y110,38")), { x: 98.43, y: 110.38 });
  eq(pick(Core.parsePair("98,43 110,38")), { x: 98.43, y: 110.38 });
});

check("an unlabelled pair must be the whole field", () => {
  eq(pick(Core.parsePair("98.43, 110.38")), { x: 98.43, y: 110.38 });
  eq(pick(Core.parsePair("98.43 110.38")), { x: 98.43, y: 110.38 });
  eq(pick(Core.parsePair("98.43/110.38")), { x: 98.43, y: 110.38 });
  // A chat line with loose numbers in it is ambiguous, so it is refused
  // rather than guessed at.
  isNull(Core.parsePair("[12:04] Tower 4 98.43 110.38"), "chat timestamp");
  isNull(Core.parsePair("98.43 110.38 12.0"), "three numbers");
});

check("incomplete or ambiguous input is refused", () => {
  isNull(Core.parsePair(""), "empty");
  isNull(Core.parsePair("   "), "blank");
  isNull(Core.parsePair("x98.43"), "one axis");
  isNull(Core.parsePair("98.43"), "one number");
  isNull(Core.parsePair("x98.43 x110.38"), "same axis twice");
  isNull(Core.parsePair("y98.43 y110.38"), "same axis twice");
  isNull(Core.parsePair("no numbers here"), "prose");
  isNull(Core.parsePair("x98.43m y110.38"), "unit suffix");
});

check("game units become metres at 100 m per unit", () => {
  eq(Core.gamePoint("x98.43, y110.38", 100), { x: 9843, y: 11038 });
  eq(Core.gamePoint("x0 y0", 100), { x: 0, y: 0 });
  isNull(Core.gamePoint("nonsense", 100), "unparseable");
});

/* ---- the distance model ------------------------------------------------ */

const A = Core.gamePoint("x98.43, y110.38", 100);
const B = Core.gamePoint("x94.53, y109.03", 100);

check("the worked example from the community guide", () => {
  const g = Core.solve(A, B);
  near(g.range, 412.7044947659285, 1e-9, "range");
  eq(Math.round(g.range), 413, "displayed metres");
});

check("one hundredth of a unit is one metre", () => {
  const near1 = Core.solve({ x: 0, y: 0 }, { x: 1, y: 0 });
  near(near1.range, 1, 1e-12, "0.01 unit on one axis");
  const full = Core.solve({ x: 0, y: 0 }, { x: 100, y: 0 });
  near(full.range, 100, 1e-12, "1.00 unit on one axis");
  const same = Core.solve({ x: 9843, y: 11038 }, { x: 9843, y: 11038 });
  eq(same.range, 0, "equal endpoints");
});

check("swapping the endpoints leaves the distance alone", () => {
  near(Core.solve(A, B).range, Core.solve(B, A).range, 0, "swapped range");
});

check("bearings are grid north, clockwise, with mils on the 6400 scale", () => {
  eq(Core.solve({ x: 0, y: 0 }, { x: 0, y: 100 }).brg, 0, "due north");
  eq(Core.solve({ x: 0, y: 0 }, { x: 100, y: 0 }).brg, 90, "due east");
  eq(Core.solve({ x: 0, y: 0 }, { x: 0, y: -100 }).brg, 180, "due south");
  eq(Core.solve({ x: 0, y: 0 }, { x: -100, y: 0 }).brg, 270, "due west");
  near(Core.solve(A, B).brg, 250.9066, 1e-4, "worked example bearing");
  near(Core.solve({ x: 0, y: 0 }, { x: 100, y: 0 }).mils, 1600, 1e-9, "east in mils");
});

/* ---- camera transforms ------------------------------------------------- */

const VIEW = { cx: 8192, cy: 8192, span: 1000 };
const WIDE = { w: 1600, h: 900 };

check("one scale serves both axes of a rectangular viewport", () => {
  // span is measured across the shorter side, so a metre is the same number
  // of pixels horizontally and vertically. Anything else tilts the ruler.
  const k = Core.scale(VIEW, WIDE);
  near(k, 0.9, 1e-12, "pixels per metre");
  const east = Core.toScreen({ x: VIEW.cx + 100, y: VIEW.cy }, VIEW, WIDE);
  const north = Core.toScreen({ x: VIEW.cx, y: VIEW.cy + 100 }, VIEW, WIDE);
  near(east.x - WIDE.w / 2, 90, 1e-9, "100 m east in pixels");
  near(WIDE.h / 2 - north.y, 90, 1e-9, "100 m north in pixels");
});

check("north is up and the centre of the view is the centre of the screen", () => {
  const mid = Core.toScreen({ x: VIEW.cx, y: VIEW.cy }, VIEW, WIDE);
  eq(mid, { x: 800, y: 450 }, "view centre");
  const up = Core.toScreen({ x: VIEW.cx, y: VIEW.cy + 50 }, VIEW, WIDE);
  if (!(up.y < mid.y)) throw new Error("increasing y must move up the screen");
});

check("screen and world round-trip in every viewport shape", () => {
  [WIDE, { w: 900, h: 1600 }, { w: 1000, h: 1000 }, { w: 360, h: 640 }].forEach((size) => {
    [{ x: 0, y: 0 }, { x: 16384, y: 16384 }, { x: 9843, y: 11038 }].forEach((p) => {
      const back = Core.toWorld(Core.toScreen(p, VIEW, size), VIEW, size);
      near(back.x, p.x, 1e-6, "round-trip x in " + size.w + "x" + size.h);
      near(back.y, p.y, 1e-6, "round-trip y in " + size.w + "x" + size.h);
    });
  });
});

check("zoom and viewport shape do not move a measurement", () => {
  const spans = [80, 1000, 16384];
  const sizes = [WIDE, { w: 900, h: 1600 }, { w: 360, h: 640 }];
  const truth = Core.solve(A, B).range;
  spans.forEach((span) => {
    sizes.forEach((size) => {
      const v = { cx: 1234, cy: 5678, span: span };
      const a = Core.toWorld(Core.toScreen(A, v, size), v, size);
      const b = Core.toWorld(Core.toScreen(B, v, size), v, size);
      near(Core.solve(a, b).range, truth, 1e-6, "range at span " + span + " in " + size.w + "x" + size.h);
    });
  });
});

/* ---- endpoint updates -------------------------------------------------- */

check("setting an endpoint leaves the previous pair untouched", () => {
  const before = { a: { x: 1, y: 2 }, b: { x: 3, y: 4 } };
  const after = Core.withEndpoint(before, "b", { x: 9, y: 9 });
  eq(before, { a: { x: 1, y: 2 }, b: { x: 3, y: 4 } }, "original");
  eq(after, { a: { x: 1, y: 2 }, b: { x: 9, y: 9 } }, "updated copy");
});

check("an endpoint can be set before there is a measurement at all", () => {
  eq(Core.withEndpoint(null, "a", { x: 5, y: 6 }), { a: { x: 5, y: 6 }, b: null });
});

check("a bad point or a bad endpoint name changes nothing", () => {
  const before = { a: { x: 1, y: 2 }, b: null };
  eq(Core.withEndpoint(before, "b", { x: NaN, y: 4 }), before, "NaN point");
  eq(Core.withEndpoint(before, "b", null), before, "missing point");
  eq(Core.withEndpoint(before, "c", { x: 3, y: 4 }), before, "unknown endpoint");
  eq(before, { a: { x: 1, y: 2 }, b: null }, "original");
});

check("finitePoint refuses everything that is not a pair of numbers", () => {
  [null, undefined, {}, { x: 1 }, { x: 1, y: "2" }, { x: NaN, y: 1 }, { x: 1, y: Infinity }]
    .forEach((v) => { if (Core.finitePoint(v)) throw new Error("accepted " + JSON.stringify(v)); });
  if (!Core.finitePoint({ x: 0, y: -0 })) throw new Error("rejected a valid point");
});

/* ---- distance ring spacing ---- */

check("ring spacing keeps rings apart on screen", () => {
  // k is pixels per metre. At 0.5 px/m a 100 m ring is 50 px, too close to
  // read, so the step has to climb until 70 px is cleared.
  if (Core.ringStep(1000, 0.5) * 0.5 < 70) throw new Error("rings closer than 70 px");
  if (Core.ringStep(20000, 0.02) * 0.02 < 70) throw new Error("rings closer than 70 px zoomed out");
  // 25 m would be 50 px apart, too close; 50 m is 100 px and only ten rings.
  eq(Core.ringStep(500, 2), 50, "50 m steps once 50 m clears 70 px");
  // Same zoom, more ground to cover: ten 50 m rings would become twenty, so
  // the count limit takes over from the spacing limit.
  eq(Core.ringStep(1000, 2), 100, "count limit coarsens the step");
});

check("ring spacing keeps the count readable", () => {
  // Twelve rings is the ceiling however far in the camera goes.
  [0.05, 0.2, 0.5, 1, 4, 20].forEach((k) => {
    [500, 2000, 8000, 30000].forEach((far) => {
      var n = far / Core.ringStep(far, k);
      if (n > 12.0001) throw new Error(n.toFixed(1) + " rings at k=" + k + " far=" + far);
    });
  });
});

check("ring spacing is in metres on both sides of the comparison", () => {
  // The bug this pins: comparing a radius in metres against a spacing in
  // pixels. That made the rings coarser the further in you zoomed, which is
  // backwards -- zooming in should if anything give finer rings, never
  // coarser. Same ground, same ring count expectation, four zoom levels.
  var seen = [1, 2, 4, 8].map((z) => Core.ringStep(2000, 0.25 * z));
  for (var i = 1; i < seen.length; i++) {
    if (seen[i] > seen[i - 1]) {
      throw new Error("step grew from " + seen[i - 1] + " to " + seen[i] + " on zooming in");
    }
  }
});

check("ring spacing only ever uses round numbers", () => {
  var ok = { 25: 1, 50: 1, 100: 1, 200: 1, 250: 1, 500: 1, 1000: 1, 2000: 1, 2500: 1, 5000: 1, 10000: 1 };
  [0.01, 0.03, 0.137, 0.5, 1.1, 3, 17].forEach((k) => {
    [100, 900, 4321, 16384].forEach((far) => {
      var st = Core.ringStep(far, k);
      if (!ok[st]) throw new Error("odd step " + st + " at k=" + k + " far=" + far);
    });
  });
});

/* ---- landmark files -------------------------------------------------------
   A landmark list is an export from somewhere else, so these checks are about
   what happens to a file nobody here wrote: which key holds the points, what
   the numbers mean, and what becomes of an entry that cannot be believed. */

const T = 16384;
function poi(raw) { return Core.readPoi(raw, T); }

check("game readout is recognised without being told", () => {
  const r = poi({ points: [{ name: "Tower 4", kind: "tower", x: 85.91, y: 72.59 }] });
  eq(r.units, "readout", "units");
  eq(r.points[0], { name: "Tower 4", kind: "tower", x: 8591, y: 7259 }, "point");
});

check("metres are recognised without being told", () => {
  const r = poi({ points: [{ name: "Depot", x: 8591, y: 7259 }] });
  eq(r.units, "metres", "units");
  near(r.points[0].x, 8591, 0.001, "x");
});

check("the file's own units beat the guess", () => {
  const r = poi({ units: "metres", points: [{ name: "Hut", x: 120, y: 90 }] });
  eq(r.units, "metres", "units");
  eq([r.points[0].x, r.points[0].y], [120, 90], "point");
});

check("a southward y axis is flipped to the game's", () => {
  const r = poi({ yDirection: "south", units: "metres", points: [{ name: "A", x: 100, y: 384 }] });
  eq(r.yDown, true, "yDown");
  eq(r.points[0].y, T - 384, "y");
});

check("points outside the square are dropped and counted", () => {
  const r = poi({ units: "metres", points: [
    { name: "in", x: 10, y: 10 },
    { name: "out", x: -5, y: 10 },
    { name: "far", x: T + 1, y: 10 }
  ] });
  eq(r.points.length, 1, "kept");
  eq(r.dropped, 2, "dropped");
});

check("a bare array of points is a landmark file too", () => {
  const r = poi([{ name: "A", x: 10.5, y: 20.5 }, { name: "B", x: 11.5, y: 21.5 }]);
  eq(r.points.length, 2, "points");
});

check("features keep their numbers outside and their names inside", () => {
  const r = poi({ features: [
    { geometry: { coordinates: [85.91, 72.59] }, properties: { name: "Tower 4", type: "Fuel Refill" } }
  ] });
  eq(r.points[0].name, "Tower 4", "name");
  eq(r.points[0].kind, "fuel-refill", "kind");
});

check("a category is a slug, and missing means other", () => {
  const r = poi({ markers: [
    { name: "A", category: "Spawn Point", x: 10, y: 10 },
    { name: "B", x: 11, y: 11 }
  ] });
  eq(r.kinds, [{ kind: "other", count: 1 }, { kind: "spawn-point", count: 1 }], "kinds");
});

check("the same landmark twice is one landmark", () => {
  const r = poi([{ name: "A", kind: "tower", x: 10, y: 10 }, { name: "A", kind: "tower", x: 10, y: 10 }]);
  eq(r.points.length, 1, "points");
  eq(r.dropped, 1, "dropped");
});

check("numbers written as strings still count", () => {
  const r = poi([{ name: "A", x: "85,91", y: "72.59" }]);
  eq([r.points[0].x, r.points[0].y], [8591, 7259], "point");
});

check("a file with nothing readable in it reads as nothing", () => {
  [null, 42, "hello", {}, [], { points: [] }, { points: [{ name: "A" }] },
    { points: [{ name: "A", x: "north", y: 3 }] }].forEach((raw) => {
    if (poi(raw) !== null) throw new Error("expected null for " + JSON.stringify(raw));
  });
});

check("one unreadable entry does not lose the rest", () => {
  const r = poi([{ name: "A", x: 10, y: 10 }, { nope: true }, null, { name: "B", x: 11, y: 11 }]);
  eq(r.points.length, 2, "points");
  eq(r.dropped, 2, "dropped");
});

check("an enormous file is capped rather than swallowed", () => {
  const many = [];
  for (let i = 0; i < 4200; i++) many.push({ name: "P" + i, x: 10 + i / 1000, y: 20 });
  const r = poi(many);
  eq(r.points.length, 4000, "points");
  eq(r.dropped, 200, "dropped");
});

/* ---- weapon envelopes -------------------------------------------------- */

check("L81 marks shortfall and overshoot with rounded metres", () => {
  const l81 = { min: 52, max: 685, lowArcFrom: null };
  eq(Core.envelope(50.6, l81), { level: "short", label: "TOO CLOSE · 1 M SHORT OF MINIMUM" });
  eq(Core.envelope(686.4, l81), { level: "far", label: "OUT OF RANGE · 1 M BEYOND MAXIMUM" });
});

check("the envelope boundaries are inside the range", () => {
  const l81 = { min: 52, max: 685, lowArcFrom: null };
  const sph2 = { min: 745, max: 2660, lowArcFrom: 1070 };
  eq(Core.envelope(l81.min, l81), { level: "ok", label: "IN RANGE" }, "L81 minimum");
  eq(Core.envelope(l81.max, l81), { level: "ok", label: "IN RANGE" }, "L81 maximum");
  eq(Core.envelope(sph2.lowArcFrom, sph2), { level: "ok", label: "IN RANGE" }, "SPH-2 high-arc boundary");
  eq(Core.envelope(sph2.max, sph2), { level: "ok", label: "IN RANGE" }, "SPH-2 maximum");
});

check("SPH-2 reports high arc below its low-arc distance", () => {
  eq(Core.envelope(900, { min: 745, max: 2660, lowArcFrom: 1070 }), {
    level: "high", label: "IN RANGE · HIGH ARC ONLY"
  });
});

check("a weapon without a maximum stays in range", () => {
  eq(Core.envelope(10, { min: 100, max: null, lowArcFrom: null }), { level: "ok", label: "IN RANGE" });
  eq(Core.envelope(100000, { min: 100, max: undefined, lowArcFrom: null }), { level: "ok", label: "IN RANGE" });
});

/* ---- drive time -------------------------------------------------------- */

check("drive time pads seconds below ten", () => {
  eq(Core.driveTime(100, 40), "0:09");
});

check("drive time formats a multi-minute journey", () => {
  eq(Core.driveTime(4000, 40), "6:00");
});

check("non-positive road speeds use forty kilometres per hour", () => {
  eq(Core.driveTime(1000, 0), "1:30", "zero speed fallback");
  eq(Core.driveTime(1000, -20), "1:30", "negative speed fallback");
});

check("doubling road speed halves the travel time", () => {
  eq(Core.driveTime(4000, 40), "6:00", "forty kilometres per hour");
  eq(Core.driveTime(4000, 80), "3:00", "eighty kilometres per hour");
});

check("an unrepresentable drive time is an em dash", () => {
  eq(Core.driveTime(Infinity, 40), "—");
});

/* ---- fitting a view ---------------------------------------------------- */

check("a square box spans the same either way round the viewport", () => {
  const box = { minX: 0, maxX: 100, minY: 0, maxY: 100 };
  eq(Core.fitView(box, { w: 1600, h: 900 }, 1), { cx: 50, cy: 50, span: 100 }, "wide viewport");
  eq(Core.fitView(box, { w: 900, h: 1600 }, 1), { cx: 50, cy: 50, span: 100 }, "tall viewport");
  eq(Core.fitView(box, { w: 1600, h: 900 }, 2), { cx: 50, cy: 50, span: 200 }, "wide viewport with margin");
});

check("a box wider than tall is fitted by its width", () => {
  eq(Core.fitView({ minX: 10, maxX: 210, minY: 20, maxY: 70 }, { w: 1600, h: 900 }, 1), {
    cx: 110, cy: 45, span: 112.5
  });
});

check("a non-unit view margin expands the fitted span", () => {
  eq(Core.fitView({ minX: -20, maxX: 20, minY: 10, maxY: 30 }, { w: 1000, h: 500 }, 1.5), {
    cx: 0, cy: 20, span: 30
  });
});

check("a non-positive view margin falls back to one", () => {
  const box = { minX: 0, maxX: 40, minY: 0, maxY: 20 };
  eq(Core.fitView(box, { w: 800, h: 400 }, 0), Core.fitView(box, { w: 800, h: 400 }, 1), "zero margin");
  eq(Core.fitView(box, { w: 800, h: 400 }, -2), Core.fitView(box, { w: 800, h: 400 }, 1), "negative margin");
});

/* ---- grid spacing ------------------------------------------------------ */

check("grid spacing chooses the first major step that clears 46 pixels", () => {
  eq(Core.gridStep(0.046), { major: 1000, minor: null }, "1000 metre major");
  eq(Core.gridStep(0.023), { major: 2000, minor: null }, "2000 metre major");
  eq(Core.gridStep(0.0115), { major: 4000, minor: null }, "4000 metre major");
});

check("grid spacing falls through to 4000 when zoomed out", () => {
  eq(Core.gridStep(0.001), { major: 4000, minor: null });
});

check("minor grid lines appear on both sides of their threshold", () => {
  eq(Core.gridStep(0.341).minor, 100, "minor above threshold");
  eq(Core.gridStep(0.34).minor, 100, "minor at threshold");
  isNull(Core.gridStep(0.33).minor, "minor below threshold");
});

check("grid thresholds are inclusive", () => {
  eq(Core.gridStep(0.046).major, 1000, "exactly 46 pixels");
  eq(Core.gridStep(0.34).minor, 100, "exactly 34 pixels");
});

/* ---- which tiles to draw ---- */

// The shipped shape: 16,384 m, 512 px tiles, a 2,560 px overview underneath.
// Levels 8 and 16 span the map; 64 covers a 4 x 4 square of its own tiles,
// which is exactly tile 8_8 of level 16.
const PX = 512, BASE = T / 2560;
const WHOLE = { 8: [0, 0, 8, 8], 16: [0, 0, 16, 16] };
const ZONE = { 8: [0, 0, 8, 8], 16: [0, 0, 16, 16], 64: [32, 32, 36, 36] };
function ids(plan) { return plan.map((t) => t.across + "/" + t.x + "_" + t.y); }

check("no tiles while the overview is as sharp as the screen", () => {
  eq(Core.tilePlan(WHOLE, { minX: 0, maxX: T, minY: 0, maxY: T }, BASE, T, PX, BASE), [], "at the overview");
  eq(Core.tilePlan(WHOLE, { minX: 0, maxX: T, minY: 0, maxY: T }, 20, T, PX, BASE), [], "zoomed out");
});

check("no tiles when nothing was cut", () => {
  eq(Core.tilePlan({}, { minX: 0, maxX: 100, minY: 0, maxY: 100 }, 0.1, T, PX, BASE), []);
  eq(Core.tilePlan(null, { minX: 0, maxX: 100, minY: 0, maxY: 100 }, 0.1, T, PX, BASE), []);
});

check("the coarsest level at least as sharp as the screen is the one fetched", () => {
  // level 8 is 4 m/px, level 16 is 2 m/px; this rect is inside 8's tile 0_7
  // and 16's tile 1_15 (both the southwest corner, rows counted from north)
  const rect = { minX: 1100, maxX: 1200, minY: 100, maxY: 200 };
  eq(ids(Core.tilePlan(WHOLE, rect, 5, T, PX, BASE)), ["8/0_7"], "5 m/px");
  eq(ids(Core.tilePlan(WHOLE, rect, 4, T, PX, BASE)), ["8/0_7"], "exactly 4 m/px");
  eq(ids(Core.tilePlan(WHOLE, rect, 3, T, PX, BASE)), ["16/1_15"], "3 m/px drops the covered 8");
  eq(ids(Core.tilePlan(WHOLE, rect, 0.1, T, PX, BASE)), ["16/1_15"], "past the finest");
});

check("finer ground only where a finer level was cut", () => {
  // Straddles level 64's east edge at x = 9,216 m, inside level 16's 8_8 and 9_8.
  const rect = { minX: 9100, maxX: 9300, minY: 7500, maxY: 7600 };
  eq(ids(Core.tilePlan(ZONE, rect, 0.4, T, PX, BASE)), ["16/9_8", "64/35_34"],
    "16 east of the square, 64 inside it, and 16/8_8 left out under the 64s");
});

check("a coarse tile the fine square only partly covers is kept underneath", () => {
  // 16/7_8 is west of the fine square, 16/8_8 wholly inside it
  const rect = { minX: 7200, maxX: 8300, minY: 7700, maxY: 7900 };
  eq(ids(Core.tilePlan(ZONE, rect, 0.4, T, PX, BASE)), ["16/7_8", "64/32_33"]);
  const corner = { 8: [0, 0, 8, 8], 64: [32, 32, 34, 36] };  // one corner of 8's tile 4_4
  eq(ids(Core.tilePlan(corner, { minX: 8200, maxX: 8300, minY: 7700, maxY: 7900 }, 0.4, T, PX, BASE)),
    ["8/4_4", "64/32_33"], "partly covered 8 stays below the 64");
});

check("tile ranges stop at the map edge and at a view edge on a tile boundary", () => {
  eq(ids(Core.tilePlan(WHOLE, { minX: -500, maxX: 1024, minY: T - 1024, maxY: T + 500 }, 1, T, PX, BASE)),
    ["16/0_0"]);
});

check("levels paint coarsest first", () => {
  const plan = Core.tilePlan(ZONE, { minX: 7100, maxX: 9300, minY: 7000, maxY: 8000 }, 0.4, T, PX, BASE);
  const order = plan.map((t) => t.across);
  eq(order.slice().sort((a, b) => a - b), order);
});

/* ---- typed and pasted coordinates are refused, not rescued ------------- */

const MAX_UNITS = 163.84;

check("a typed axis takes whole numbers, decimals and a decimal comma", () => {
  eq(Core.readAxis("98.43", MAX_UNITS), { value: 98.43, error: null });
  eq(Core.readAxis(" 62,45 ", MAX_UNITS), { value: 62.45, error: null }, "comma and spaces");
  eq(Core.readAxis("0", MAX_UNITS), { value: 0, error: null }, "zero");
  eq(Core.readAxis(".5", MAX_UNITS), { value: 0.5, error: null }, "leading point");
  eq(Core.readAxis("12.", MAX_UNITS), { value: 12, error: null }, "trailing point mid-typing");
  eq(Core.readAxis("163.84", MAX_UNITS), { value: 163.84, error: null }, "far edge");
});

check("a typed axis is never cut down to a number it starts with", () => {
  ["12abc", "1e2", "-1", "−5", "1,2,3", "12 34", "x98", "0x10", "."].forEach((s) => {
    eq(Core.readAxis(s, MAX_UNITS), { value: null, error: "format" }, JSON.stringify(s));
  });
});

check("a typed axis past the terrain edge is refused, not clamped to it", () => {
  eq(Core.readAxis("9999", MAX_UNITS), { value: null, error: "range" });
  eq(Core.readAxis("163.85", MAX_UNITS), { value: null, error: "range" });
});

check("an empty axis is missing, which is not the same as wrong", () => {
  eq(Core.readAxis("", MAX_UNITS), { value: null, error: "empty" });
  eq(Core.readAxis("   ", MAX_UNITS), { value: null, error: "empty" });
  eq(Core.readAxis(undefined, MAX_UNITS), { value: null, error: "empty" });
});

check("a pasted pair must land inside the terrain square", () => {
  eq(Core.boundedGamePoint("X 98.43, Y 62.45", 100, MAX_UNITS), { x: 9843, y: 6245 });
  eq(Core.boundedGamePoint("y62,45 x98,43", 100, MAX_UNITS), { x: 9843, y: 6245 }, "reversed, decimal comma");
  eq(Core.boundedGamePoint("x0 y163.84", 100, MAX_UNITS), { x: 0, y: 16384 }, "corners are inside");
  isNull(Core.boundedGamePoint("x9999 y10", 100, MAX_UNITS), "far past the east edge");
  isNull(Core.boundedGamePoint("x-1 y10", 100, MAX_UNITS), "west of the map");
  isNull(Core.boundedGamePoint("x10 y163.85", 100, MAX_UNITS), "a hundredth past the north edge");
  isNull(Core.boundedGamePoint("x10", 100, MAX_UNITS), "one axis");
});

/* ---- the bearing as printed --------------------------------------------- */

check("a bearing a hair west of north prints as 0.0, never 360.0", () => {
  eq(Core.bearingText(Core.solve({ x: 0, y: 0 }, { x: -0.01, y: 1000 })), "0.0");
  eq(Core.bearingText({ range: 500, brg: 359.97 }), "0.0");
  eq(Core.bearingText({ range: 500, brg: 359.94 }), "359.9");
});

check("the same point twice has no bearing to print", () => {
  eq(Core.bearingText(Core.solve({ x: 9843, y: 6245 }, { x: 9843, y: 6245 })), "—");
  eq(Core.bearingText(Core.solve({ x: 0, y: 0 }, { x: 0.3, y: 0 })), "—", "rounds to 0 m");
  eq(Core.bearingText(Core.solve({ x: 0, y: 0 }, { x: 1, y: 0 })), "90.0", "one metre east");
  eq(Core.bearingText(null), "—", "no solution");
});

/* ---- dragging a pin ------------------------------------------------------ */

check("a dragged pin moves by the pointer's travel, wherever it was grabbed", () => {
  const view = { cx: 8192, cy: 8192, span: 12000 }, size = { w: 1000, h: 1000 };
  const pin = { x: 9843, y: 6245 };
  const k = Core.scale(view, size);                 // 1/12 px per metre
  const pinPx = Core.toScreen(pin, view, size);
  // Grabbed at the dot, and grabbed 60 px out along the label.
  [0, 60].forEach((grabDx) => {
    const down = { x: pinPx.x + grabDx, y: pinPx.y };
    const up = { x: down.x + 10, y: down.y };
    const moved = Core.dragPoint(pin, Core.toWorld(down, view, size), Core.toWorld(up, view, size));
    near(moved.x - pin.x, 10 / k, 1e-6, "east travel grabbed at +" + grabDx + " px");
    near(moved.y, pin.y, 1e-6, "north unchanged grabbed at +" + grabDx + " px");
  });
});

check("a drag that returns to where it started leaves the pin where it was", () => {
  const pin = { x: 123.4, y: 5678.9 }, from = { x: 5000, y: 5000 };
  eq(Core.dragPoint(pin, from, from), pin);
});

/* ---- saved target names -------------------------------------------------- */

check("default saved names count on from the highest one left", () => {
  eq(Core.nextSavedName([]), "Target 1");
  eq(Core.nextSavedName(undefined), "Target 1");
  eq(Core.nextSavedName([{ name: "Target 3" }, { name: "Target 1" }]), "Target 4", "after deleting Target 2");
  eq(Core.nextSavedName([{ name: "Ridge MG" }, { name: "Target 2" }]), "Target 3", "renamed rows ignored");
  eq(Core.nextSavedName([{ name: "Ridge MG" }]), "Target 1");
});

/* ------------------------------------------------------------------------ */

function pick(p) { return p ? { x: p.x, y: p.y } : null; }

if (failures.length) {
  console.error(failures.length + " failed, " + passed + " passed\n");
  failures.forEach((f) => console.error("  FAIL  " + f));
  process.exit(1);
}
console.log(passed + " checks passed");
