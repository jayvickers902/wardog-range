# Landmark files

Drop a `.json` list of named places in here as `<map>.json` -- `bakurani.json`,
`ozeti.json`, `zestafona.json` -- and the page draws it on that map: a diamond
per landmark, coloured by category, named once you zoom in far enough to read
them. Categories get a show/hide chip above the board, and clicking a landmark
snaps the measurement endpoint to its exact recorded coordinates instead of to
the pixel you hit.

**Nothing ships here.** Bulkhead has not published a marker list, so this page
has none. It draws whatever you put beside it.

You do not have to put the file in the repo at all: dragging it onto the map,
or picking it under **Details -> Landmarks**, loads it into that browser for
that map alone, with a **Forget** button to take it back out. A file in this
folder is for when you want everyone who loads your copy to get it.

## The shape

The reader is deliberately forgiving, because these files come from somewhere
else. The minimum it needs is a name and two numbers:

    {
      "units": "readout",
      "points": [
        { "name": "Tower 4", "kind": "tower", "x": 85.91, "y": 72.59 },
        { "name": "North depot", "kind": "fuel refill", "x": 40.12, "y": 120.08 }
      ]
    }

- The list can be under `points`, `markers`, `pois`, `landmarks`, `items`,
  `locations`, `features`, `results` or `data` -- or the file can just *be* the
  array.
- A point's coordinates can be `x`/`y`, `posX`/`posY`, `worldX`/`worldY`,
  `east`/`north`, or a two-element `coordinates`/`coords`/`position`/`pos`/`at`
  array. A GeoJSON-ish `{ geometry: { coordinates }, properties: { name } }`
  feature works.
- The name can be `name`, `label`, `title` or `text`; the category can be
  `kind`, `type`, `category`, `group`, `layer` or `icon`. No category means
  "other". Categories are slugged, so `"Fuel Refill"` and `"fuel refill"` are
  one chip.
- Numbers may be strings, and may use a comma for the decimal point.

## Units, and the two things that can go wrong

`units` is `"readout"` (the game's 0-163.84, what the chat line prints) or
`"metres"` (0-16384). Leave it out and it is inferred: the readout stops at
163.84 and metres run to 16384, so the two cannot be confused.

If the file counts y **downward from the north edge** -- an image-space export
rather than a game coordinate -- add `"yDirection": "south"` and it is flipped.
The symptom is a map that looks mirrored top to bottom.

The one thing no file can tell us is whether **x and y arrived the right way
round**. `x85.91, y72.59` and `x72.59, y85.91` are both real places on every
one of these maps, so a transposed file loads silently and puts everything
somewhere plausible and wrong. Check one landmark you know against the game
before trusting the rest. Hovering one prints its recorded coordinates.

Anything that will not reduce to a point inside the terrain square is dropped
rather than drawn somewhere convenient, and the count is reported when the file
loads: *"126 landmarks on Ozeti, 4 skipped."* A file that loses most of itself
that way is usually a units or axis problem, not a bad file.

## Getting one

These lists exist on community map sites, which is where the coordinates in
them came from in the first place. To keep a copy of what your browser already
downloaded while showing you one of those maps: open it, open devtools with
F12, the **Network** tab, reload, and find the request that returns the marker
list -- right-click it, **Save response as**, and name it `<map>.json`. Then
drag it onto this page.

I do not fetch those endpoints myself: the site's `robots.txt` closes that path
to automated clients, and I am one. Your own browser loading a page you are
looking at is not that.
