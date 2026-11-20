# Mike's marks — extracted from the HINT title art

**2026-11-20.** Pulled from
`~/Desktop/Hey, I'm New in Town - Rehearsal/02_MEDIA/04_GRAPHICS/TITLE_ART/`.

Nothing here is redrawn. An earlier pass had me approximating these by hand,
which was wrong on its own terms — a generated imitation of hand-drawn marks is
precisely the register the site is trying to avoid.

## What came from where

**`hey_im_new_in_town_neon_lineart.svg`** — real vector, 3840×2160. Its
`<g id="doodles">` holds 26 children, which is 13 marks drawn twice: a black
`stroke-width:26` underlay and a white `8` core (the neon treatment on the
title card). Three of the X marks are two separate strokes, so 13 paths resolve
to **10 marks**.

| File | ink token | note |
|---|---|---|
| `squiggle-tall.svg` | mint | vertical 3-beat squiggle, 61 points |
| `squiggle-wide.svg` | pink | horizontal squiggle, 61 points |
| `squiggle-flat.svg` | sky | flat horizontal squiggle, 61 points |
| `zigzag.svg` | pink | sharp zigzag, 5 points |
| `triangle-large.svg` | sun | open triangle |
| `triangle-small.svg` | mint | open triangle |
| `ring.svg` | sky | a true `<circle>`, r=80 |
| `cross-small.svg` · `cross-medium.svg` · `cross-tiny.svg` | sun / pink / sun | X, two strokes each |

Each keeps **its original coordinates** — the viewBox was moved to the mark's
bounding box and nothing was resampled, so the linework is bit-for-bit what was
drawn. `stroke="currentColor"` so the kit recolours them; `data-ink` names the
palette token matching the flat stills.

Also extracted whole: `hey-letters.svg`, `hey-3d-side.svg`, `neon-script.svg`
(*I'm New in Town*), `starburst.svg`. These are **outline only** — the source
SVG carries no fill and no blob, because the colour lives in the painted
Procreate layers, not the line art.

**`HINT_title_art_still_01.png`** and **`HINT_ZOW_still.png`** — 897×496 RGBA.
The only source for the magenta blob and for *Zow!*, neither of which exists as
vector. Section 15 of the kit crops them with CSS rather than rebuilding them.

## Consequences worth knowing

- **"Hey!" and "Zow!" are the only two words available.** They exist because
  they were drawn. A third needs Mike to draw it — the caption beside the badge
  carries the variable half instead.
- **The badges are raster and not large.** Fine at badge size, would fall apart
  as a hero. The vector marks are the opposite: infinite scale, no fill.
- **`contact-sheet.html`** renders all 14 on white and on dark. Open it before
  changing any of this.

## If better sources turn up

Layered exports with the painted colour — the blob, the gold letter fills, the
pink underpaint — would let the shout become vector and scale properly. The
Procreate file would have them; `HINT_title_art_Procreate_drawing_screenrec.MP4`
(344 MB) is a screen recording of it being drawn, not a layered export.
