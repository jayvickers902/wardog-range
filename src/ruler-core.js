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
  /* ---- landmark lists ----
     A landmark file is somebody else's export of game data this page has
     never had, so nothing about its shape is assumed past a name and two
     numbers: the usual keys are tried in turn, a GeoJSON-ish feature is
     unwrapped, and anything that will not reduce to a point inside the
     terrain square is counted and dropped rather than drawn somewhere
     plausible. Units are read from the file when it says and inferred when
     it does not: the game readout stops at 163.84 and metres run to 16384,
     so the two ranges cannot be mistaken for each other. What no file can
     tell us is whether x and y arrived the right way round -- that one is on
     the reader, which is why the loader reports a count and the map prints
     coordinates under the pointer. */
  var POI_CAP = 4000;
  var POI_LISTS = ["points", "markers", "pois", "landmarks", "items", "locations", "features", "results", "data"];
  var POI_X = ["x", "X", "posX", "worldX", "east"];
  var POI_Y = ["y", "Y", "posY", "worldY", "north"];
  var POI_NAME = ["name", "label", "title", "text"];
  var POI_KIND = ["kind", "type", "category", "group", "layer", "icon"];

  function poiNum(v) {
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v === "string" && /^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(v.trim())) {
      var n = Number(v.trim().replace(",", "."));
      return isFinite(n) ? n : null;
    }
    return null;
  }
  function poiField(o, keys) {
    for (var i = 0; i < keys.length; i++) {
      var v = o[keys[i]];
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return null;
  }
  function poiSlug(v) {
    var s = String(v == null ? "" : v).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return s.slice(0, 24) || "other";
  }
  function poiXY(o) {
    var pair = o.coordinates || o.coords || o.position || o.pos || o.at ||
      (o.geometry && o.geometry.coordinates) || null;
    if (Array.isArray(pair)) {
      return pair.length >= 2 ? { x: poiNum(pair[0]), y: poiNum(pair[1]) } : { x: null, y: null };
    }
    if (pair && typeof pair === "object") {
      return { x: poiNum(poiField(pair, POI_X)), y: poiNum(poiField(pair, POI_Y)) };
    }
    return { x: poiNum(poiField(o, POI_X)), y: poiNum(poiField(o, POI_Y)) };
  }
  function poiEntry(o) {
    if (!o || typeof o !== "object") return null;
    // A feature keeps its numbers outside and its names inside, so both
    // halves are consulted before anything is given up on.
    var inner = o.properties && typeof o.properties === "object" ? o.properties : null;
    var xy = poiXY(o);
    if ((xy.x === null || xy.y === null) && inner) xy = poiXY(inner);
    if (xy.x === null || xy.y === null) return null;
    var name = poiField(o, POI_NAME);
    if (name === null && inner) name = poiField(inner, POI_NAME);
    var kind = poiField(o, POI_KIND);
    if (kind === null && inner) kind = poiField(inner, POI_KIND);
    return {
      name: String(name === null ? "" : name).replace(/\s+/g, " ").trim().slice(0, 48),
      kind: poiSlug(kind),
      x: xy.x,
      y: xy.y
    };
  }
  function readPoi(raw, terrain) {
    if (!(terrain > 0)) return null;
    var meta = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    var body = Array.isArray(raw) ? raw : null;
    for (var i = 0; !body && i < POI_LISTS.length; i++) {
      if (Array.isArray(meta[POI_LISTS[i]])) body = meta[POI_LISTS[i]];
    }
    if (!body || !body.length) return null;
    var read = [], dropped = 0, j = 0;
    for (; j < body.length && read.length < POI_CAP; j++) {
      var e = poiEntry(body[j]);
      if (e) read.push(e); else dropped++;
    }
    dropped += body.length - j;
    if (!read.length) return null;

    var said = String(poiField(meta, ["units", "unit"]) || "").toLowerCase();
    var units = /^(m$|metre|meter|world)/.test(said) ? "metres"
      : /^(readout|game|grid)/.test(said) ? "readout" : null;
    if (!units) {
      var max = 0;
      read.forEach(function (e) { max = Math.max(max, Math.abs(e.x), Math.abs(e.y)); });
      units = max > terrain / 100 ? "metres" : "readout";
    }
    var k = units === "readout" ? 100 : 1;
    var down = meta.yDown === true ||
      /^(south|down|image|screen)/.test(String(poiField(meta, ["yDirection", "yAxis"]) || "").toLowerCase());

    var seen = {}, points = [], count = {}, order = [];
    read.forEach(function (e) {
      var x = e.x * k, y = down ? terrain - e.y * k : e.y * k;
      if (!(x >= 0 && x <= terrain && y >= 0 && y <= terrain)) { dropped++; return; }
      var key = e.kind + "|" + e.name + "|" + Math.round(x) + "|" + Math.round(y);
      if (seen[key]) { dropped++; return; }
      seen[key] = 1;
      if (count[e.kind] === undefined) { count[e.kind] = 0; order.push(e.kind); }
      count[e.kind]++;
      points.push({ name: e.name || "Unnamed", kind: e.kind, x: x, y: y });
    });
    if (!points.length) return null;
    return {
      points: points,
      kinds: order.sort().map(function (n) { return { kind: n, count: count[n] }; }),
      units: units,
      yDown: down,
      dropped: dropped
    };
  }


  /* ---- weapon envelope ----
     Community numbers measured on level ground. The verdict comes back as a
     level rather than a colour: the palette belongs to the page, and a level
     can be asserted in a test without pinning a hex. */
  function envelope(range, weapon) {
    if (!weapon || !(weapon.max > 0)) return { level: "ok", label: "IN RANGE" };
    if (range < weapon.min) {
      return { level: "short", label: "TOO CLOSE · " + Math.round(weapon.min - range) + " M SHORT OF MINIMUM" };
    }
    if (range > weapon.max) {
      return { level: "far", label: "OUT OF RANGE · " + Math.round(range - weapon.max) + " M BEYOND MAXIMUM" };
    }
    if (weapon.lowArcFrom && range < weapon.lowArcFrom) {
      return { level: "high", label: "IN RANGE · HIGH ARC ONLY" };
    }
    return { level: "ok", label: "IN RANGE" };
  }
  // How long it takes to drive there, which is the other thing worth knowing
  // about a range: m:ss at a fixed road speed.
  function driveTime(metres, kmh) {
    var speed = kmh > 0 ? kmh : 40;
    var sec = Math.round(metres / (speed * 1000 / 3600));
    if (!isFinite(sec) || sec < 0) return "—";
    return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
  }
  // The view that frames a world box. span is measured across the *shorter*
  // viewport axis, so each side has to be converted into that axis's terms
  // before the larger of the two decides -- comparing a width in metres
  // against a height in metres frames the box correctly only when the
  // viewport happens to be square.
  function fitView(box, size, margin) {
    var shorter = Math.min(size.w, size.h), m = margin > 0 ? margin : 1;
    var span = Math.max((box.maxX - box.minX) * shorter / size.w,
      (box.maxY - box.minY) * shorter / size.h) * m;
    return { cx: (box.minX + box.maxX) / 2, cy: (box.minY + box.maxY) / 2, span: span };
  }
  // Grid spacing: the coarsest kilometre multiple still far enough apart to
  // read, plus the 100 m minor lines once they have room of their own.
  var MAJOR_STEPS = [1000, 2000, 4000];
  function gridStep(k) {
    var major = MAJOR_STEPS[MAJOR_STEPS.length - 1];
    for (var i = 0; i < MAJOR_STEPS.length; i++) {
      if (MAJOR_STEPS[i] * k >= 46) { major = MAJOR_STEPS[i]; break; }
    }
    return { major: major, minor: k * 100 >= 34 ? 100 : null };
  }

  var api = { copy: copy, finitePoint: finitePoint, parsePair: parsePair, gamePoint: gamePoint,
    solve: solve, scale: scale, toScreen: toScreen, toWorld: toWorld, withEndpoint: withEndpoint,
    ringStep: ringStep, readPoi: readPoi,
    envelope: envelope, driveTime: driveTime, fitView: fitView, gridStep: gridStep };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WardogCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
