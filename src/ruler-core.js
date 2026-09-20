/* Pure world-space operations shared by the map and regression tests.
   build.py inlines this file so the generated page stays self-contained. */
(function (root) {
  "use strict";
  function copy(value) { return value == null ? null : JSON.parse(JSON.stringify(value)); }
  function finitePoint(p) {
    return !!p && typeof p.x === "number" && typeof p.y === "number" && Number.isFinite(p.x) && Number.isFinite(p.y);
  }
  function parsePair(text) {
    var s = String(text).normalize("NFKC").replace(/[−–]/g, "-").trim();
    if (!s) return null;
    var matches = Array.from(s.matchAll(/\b([xy])\s*[:=]?\s*([+-]?(?:\d+(?:[.,]\d+)?|\.\d+))/gi));
    if (matches.length) {
      if (matches.length !== 2 || matches[0][1].toLowerCase() === matches[1][1].toLowerCase()) return null;
      var result = { at: matches[0].index };
      for (var m of matches) {
        var tail = s.slice(m.index + m[0].length);
        if (/^[.\d]/.test(tail) || /^,\d/.test(tail) || /^[a-z]/i.test(tail)) return null;
        result[m[1].toLowerCase()] = Number(m[2].replace(",", "."));
      }
      return finitePoint(result) ? result : null;
    }
    // Unlabelled pairs must occupy the entire field: chat timestamps and
    // marker numbers must never be mistaken for either coordinate.
    var dot = "([+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+))";
    var comma = "([+-]?\\d+(?:[.,]\\d+)?)";
    var pair = s.match(new RegExp("^" + comma + "\\s*[;/|]\\s*" + comma + "$")) ||
      s.match(new RegExp("^" + dot + "\\s*,\\s*" + dot + "$")) ||
      s.match(new RegExp("^" + comma + "\\s+" + comma + "$"));
    if (!pair) return null;
    var p = { x: Number(pair[1].replace(",", ".")), y: Number(pair[2].replace(",", ".")), at: 0 };
    return finitePoint(p) ? p : null;
  }
  function gamePoint(text, metersPerUnit) {
    var p = parsePair(text);
    return p ? { x: p.x * metersPerUnit, y: p.y * metersPerUnit } : null;
  }
  function solve(a, b) {
    var east = b.x - a.x, north = b.y - a.y;
    var bearing = (Math.atan2(east, north) * 180 / Math.PI + 360) % 360;
    return { range: Math.hypot(east, north), brg: bearing, mils: bearing * 6400 / 360 };
  }
  function scale(view, size) { return Math.min(size.w, size.h) / view.span; }
  function toScreen(p, view, size) {
    var k = scale(view, size);
    return { x: size.w / 2 + (p.x - view.cx) * k, y: size.h / 2 - (p.y - view.cy) * k };
  }
  function toWorld(p, view, size) {
    var k = scale(view, size);
    return { x: view.cx + (p.x - size.w / 2) / k, y: view.cy - (p.y - size.h / 2) / k };
  }
  // Ring spacing for the distance rings: the coarsest round number that is
  // still far enough apart to tell one ring from the next, and fine enough
  // that the whole view is not one ring. farM is the radius being covered, in
  // metres; k is screen pixels per metre. Both limits are in the same terms,
  // which is worth stating because they were not always: comparing a distance
  // in metres against a spacing in pixels quietly gives sparser rings the
  // further in you zoom, and looks plausible the whole time.
  var RING_STEPS = [25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000];
  function ringStep(farM, k) {
    for (var i = 0; i < RING_STEPS.length; i++) {
      if (RING_STEPS[i] * k >= 70 && farM / RING_STEPS[i] <= 12) return RING_STEPS[i];
    }
    return RING_STEPS[RING_STEPS.length - 1];
  }

  function withEndpoint(measure, endpoint, point) {
    if (!finitePoint(point) || (endpoint !== "a" && endpoint !== "b")) return copy(measure);
    var next = copy(measure) || { a: null, b: null };
    next[endpoint] = { x: point.x, y: point.y };
    return next;
  }
  var api = { copy: copy, finitePoint: finitePoint, parsePair: parsePair, gamePoint: gamePoint,
    solve: solve, scale: scale, toScreen: toScreen, toWorld: toWorld, withEndpoint: withEndpoint,
    ringStep: ringStep };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WardogCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
