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

/* ------------------------------------------------------------------------ */

function pick(p) { return p ? { x: p.x, y: p.y } : null; }

if (failures.length) {
  console.error(failures.length + " failed, " + passed + " passed\n");
  failures.forEach((f) => console.error("  FAIL  " + f));
  process.exit(1);
}
console.log(passed + " checks passed");
