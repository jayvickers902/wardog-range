# Wardog Range

Range, bearing and mils between two map grid coordinates, for WARDOGS
(Bulkhead / Team17).

Enter your position once and every marker resolves live: range in metres,
bearing in degrees plus compass point, the same bearing in mils (6400 per
circle), transit time at a set speed, and a signed E/N offset so a mistyped
coordinate is obvious rather than silently producing a confident wrong bearing.

Three things it does beyond plain trigonometry:

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

There is also no map selection yet. All three maps (Bakurani, Ozeti,
Zestafona) share the same 16.384 km square, the same 100 m unit and the same
north-up convention, so the arithmetic does not change between them. What a map
picker would buy is per-map terrain height, named POI presets, coordinate bounds
checking and the A-P x 1-16 grid reference -- not different trigonometry.

## Layout

    src/page.html   source of truth -- body-only, also publishable as an Artifact
    build.py        wraps src/page.html into index.html
    index.html      generated; served locally and by Vercel
    serve.py        local static server

Edit `src/page.html`, then `python build.py`. Never edit `index.html`.

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
