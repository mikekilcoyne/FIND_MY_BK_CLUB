# Breakfast Club — style guide

**Written 2026-11-20.** Self-contained handoff. Everything below is verified
against the files, not recalled.

Two codebases are in play and they are not the same thing:

| | repo | host | role |
|---|---|---|---|
| **The app** | `eljamapps/breakfast-club-rebuild` (Next 16, React 19, Tailwind 4, Supabase) | Vercel | **breakfastclubinternational.com — the live site** |
| **The old site** | `mikekilcoyne/FIND_MY_BK_CLUB` (static HTML/CSS/JS) | Netlify | breakfastclubbing.com — redirect + a few kept pages |

`handoff-international/zany-kit.css` is the **reference kit**, not shipping
code. It documents the design language in plain CSS. Work lands in the app by
being translated into that repo's token system — §7 explains why you cannot
just drop the kit in.

---

## 1. Tokens

Verified from `zany-kit.css` `:root`.

### Colour

```
--bc-ink        #111111   text, borders, shadows
--bc-paper      #ffffff   page
--bc-accent     #ffd700   gold — the primary accent
--bc-magenta    #b42cb0
--bc-teal       #17b3a6
--bc-tomato     #e5472d
```

### Marker marks (§3)

Chalkier than the primaries on purpose — these sit *behind* content, and
full-strength magenta or tomato fights the copy.

```
--bc-mark-mint   #5fcbb8
--bc-mark-sky    #6cc5e8
--bc-mark-pink   #ef9ac6
--bc-mark-sun    #f6cf4b
--bc-mark-grape  #b42cb0
```

### One sampled value

```
--bc-zow-field   #ba36bd
```

**Sampled off the artwork, not chosen.** 57,391 of the sampled pixels in
`HINT_ZOW_still.png` are exactly this. `--bc-magenta` is `#b42cb0` — close
enough to read as a mistake rather than a choice. Anything butting against the
cropped Zow artwork uses `--bc-zow-field`, or you get a visible band where the
image stops. (The lettering's gold is `#fdc932` against the kit's `#ffd700`,
same story, but that lives *inside* the image so nothing abuts it.)

### Geometry

```
--bc-radius-tag   3px        --bc-shadow-tag   2px 2px 0 ink
--bc-radius-btn   7px        --bc-shadow-btn   3px 3px 0 ink
```

### Type

- Headlines: **Helvetica Neue Medium (500)**, normal tracking, **sentence
  case**
- `--bc-hand`: `"Covered By Your Grace"` → Comic Sans → cursive. Asides and
  captions only.

---

## 2. The rules that are easy to lose

Each was a deliberate call, and each gets silently undone by someone tidying up.

**Headlines are sentence case.** The kit's `h1` sets no `text-transform`.
ALL CAPS belongs to `.bc-sticker` and `.bc-panel-label` only. The old
`css/design-tokens.css` and the root `CLAUDE.md` say ALL CAPS — those describe
the *Netlify* site, not this kit. Uppercasing the app's headlines is a
regression.

**Tags are not buttons.** `3px` / `2px 2px 0` against `7px` / `3px 3px 0`. A
club tag reading "Popup" and a "Find your club" button are deliberately
different objects.

**The shadow contrasts the fill.** `.bc-btn` sets its shadow to the *accent*;
`.bc-btn--accent` flips it back to ink. This was the fix for a dark button
whose dark shadow vanished behind it. A single ink shadow everywhere looks
right in isolation and muddy on a black button.

**Lowercase is opt-in.** `.bc-lower` per block, with `.bc-keepcase` for
anything inside that must keep capitals. Never on `<body>`:
`text-transform` is blind and will lowercase city names, venues and host names.
Lowercase the voice, leave proper nouns alone.

---

## 3. The marks — Mike's artwork

**These are drawn by Mike. Do not redraw, regenerate or "clean up".** An
earlier pass produced generated approximations in the same vocabulary; that was
rejected, correctly. An imitation of a hand-drawn mark is exactly the uncanny
register this project exists to avoid — *"inviting, friendly, open community
made by HOOMANS for HOOMANS."*

**Source:** `~/Desktop/Hey, I'm New in Town - Rehearsal/02_MEDIA/04_GRAPHICS/
TITLE_ART/hey_im_new_in_town_neon_lineart.svg`, `<g id="doodles">`. 26 children
= 13 marks drawn twice (black `stroke-width:26` underlay + white `8` core, the
neon treatment on the title card), resolving to **10 marks** once the three
two-stroke X's are paired.

Extracted individually to `handoff-international/marks/`:

| file | ink | |
|---|---|---|
| `squiggle-tall.svg` | mint | vertical 3-beat, 61 points |
| `squiggle-wide.svg` | pink | horizontal, 61 points |
| `squiggle-flat.svg` | sky | flat horizontal, 61 points |
| `zigzag.svg` | pink | 5 points |
| `triangle-large.svg` · `triangle-small.svg` | sun · mint | open triangles |
| `ring.svg` | sky | a true `<circle>`, r=80 |
| `cross-small.svg` · `cross-medium.svg` · `cross-tiny.svg` | sun · pink · sun | X, two strokes each |

Each keeps **its original coordinates** — only the viewBox moved to its own
bounding box. Nothing resampled. `stroke-width: 26` is the width they were
drawn at in that space, which is why the viewBoxes look large.
`stroke="currentColor"`, `data-ink` names the palette token.

`marks/contact-sheet.html` renders all 14 on white and on dark. Open it before
changing anything here.

### Placement rules

- **Outer margins only.** Copy runs down the left of the column, so nothing
  sits left of 86% except below the 75% line where text has ended. An earlier
  placement at 4%/16% put a mark through the first line of the `h1`.
- **Check collisions by rect intersection, not by eye.** The zigzag at
  94%/83% sat on top of the primary button and looked fine at one width.
- `aria-hidden`, `pointer-events: none`, hidden below 860px where the margins
  disappear.
- Opacity `0.8`. They carry colour now; the old `0.45` read as washed out
  rather than restrained.

---

## 4. Shout — "Hey!" and "Zow!"

Mike's title-card lettering reused as a badge. §15 of the kit.

- **`Hey!`** → a new club. **`Zow!`** → a pop-up.
- **These two words are the only ones available.** They exist because they
  were drawn. A third needs Mike to draw it. The caption beside the badge
  carries the variable half ("new club / Lisbon", "pop-up / this Saturday"),
  set in the kit's own type — the contrast between drawn and set is what stops
  it looking like a bought sticker.
- **Cropped from the source PNGs, not rebuilt in CSS.** A near-miss
  recreation of hand-drawn type with `-webkit-text-stroke` is a forgery:
  close enough to recognise, wrong in every detail that reads as human.
- **Raster, 897×496.** Holds at badge size; falls apart as a hero. The vector
  marks are the opposite — infinite scale, but outline only, no fill and no
  blob, because the colour lives in the painted Procreate layers.
- The `Hey!` crop carries the artwork's **white ground**, so it needs a light
  surface. Set explicitly in the kit rather than relying on the page.

Also extracted whole: `hey-letters.svg`, `hey-3d-side.svg`, `neon-script.svg`
("I'm New in Town"), `starburst.svg` — outline only.

---

## 5. Clubby

The chat launcher. An egg with specs that blinks, double-blinks and gets bored.

- **Replace the button, not just the icon.** The app's slot was a 56×56 black
  circle sized for a 24×24 monoline glyph. The egg does not go into that slot
  and must not be redrawn to fit it.
- **The shell and the speech-bubble tail are ONE path.** The flick at
  bottom-left reads as a chat bubble rather than a chip of shell. Load-bearing
  — lose it and this is an egg with a face, not a chat affordance.
- Shell fill reads `--clubby-egg` (`#fffaf0`); outline and face use
  `currentColor`. Colour the button and the character follows.
- Shipped as `components/ui/clubby-icon.tsx`, deliberately **not** routed
  through the app's `gateway()` icon wrapper — that wraps lucide monoline
  glyphs and would strip the fill.
- **Voice:** `CLUBBY_VOICE.md` §§1–2 and §4. The app's current greeting ("Hi!
  I'm Clubby. Ask me about a club, venue, or confirmed event.") is the bland
  register that doc exists to fix, and it opens with an exclamation mark, which
  the tone dial lists as a tell.
- **Scope, confirmed 2026-11-20:** find clubs, answer hosting questions, give
  people information. **No flyer or poster generation** — there is none in the
  app and none is wanted.

---

## 6. Kit sections

`zany-kit.css`, 15 sections: HOP · STICKER · SCRIBBLE · DOODLE · GRAIN · TILT ·
NEW BADGE · CLUBBY · LOWERCASE BODY · BUTTONS · PANEL · TEXTURE · STOCK ·
FLYER FURNITURE · SHOUT.

`zany-preview.html` renders them all — the reference, never shipped.

---

## 7. How this lands in the app — read before writing code

The app repo **rejects the obvious approach.** Three constraints:

**1. No raw colour outside the token layer.** `scripts/qa/style-audit.mjs`
scans for hex and CSS colour keywords and checks them against
`style-allowlist.json`, which is **SHA256-locked**:

```
"Style allowlist snapshot changed; new entries require design review."
```

So every colour becomes a token in `app/globals.css`. The kit cannot ship as a
stylesheet with literals.

**2. Don't override the primitives.** The audit knows `Button IconButton Field
Card PageHeader ListRow RowMenu StatusLabel Dialog …` and flags selectors that
override them. Square geometry comes from changing the **values** of the radius
and shadow tokens those primitives already consume — not new rules on `.btn`.

**3. The app is heavily token-driven already.** A 16-step type scale with
paired tracking (`--type-display`/`--track-display` … `--type-badge`), radii
(`--r-sm:8px --r-md:12px --r-lg:20px --r-pill:999px`), spacing, control
heights, shadows. Map onto it; don't fight it.

### Gotchas that cost real time

- **`app/globals.css` is intentionally minified. Never run prettier on it.**
  Doing so produced a 2,527-line diff and tripped the style audit by
  re-parsing an existing selector as new. Hand-edit it.
- **`scripts/checks-merge.sh` must pass before a PR is ready** — `lint`,
  `qa:style`, `typecheck`, `test` (280), `build`. Required by their
  `AGENTS.md`.
- **Next.js 16 has breaking changes.** `AGENTS.md`: read
  `node_modules/next/dist/docs/` before writing App Router code.
- **`AGENTS.md` self-modifies.** `next dev` rewrites its own managed block;
  their docs say to commit it.
- **Behaviour belongs in React components**, not `zany.js` + `/public`. App
  Router swaps the DOM without reloading, so a vanilla script decorates the
  first page and silently does nothing after.
- Local dev needs `.env` (Supabase URL + anon key, Google Maps key) or every
  data-driven section renders blank. `vercel env pull` with Vercel access.

### Things previously stated that are wrong

- **`#b87649` is not the site accent.** It appears once, as `--globe-accent`,
  colouring globe pins, and is already a reviewed allowlist entry. The site is
  monochrome; **introducing gold is additive, a design decision, not a swap.**
- **The app is not "barely token-driven."** That came from reading
  `document.styleSheets` on the minified live build. Read the source.
- **The flyer strip does auto-scroll** — `gallery-preview.tsx:55`,
  `autoplaySpeed={reducedMotion ? 0 : 32}`. A `getComputedStyle` animation
  check cannot see a JS scroll loop.

---

## 8. Status

**Shipped — [PR #33](https://github.com/eljamapps/breakfast-club-rebuild/pull/33)**,
open, mergeable, all five gates passing locally:
Clubby's egg · the marks in the hero · "Find a club" → "Find your club".

**PR 2, not started:** square geometry (`--r-pill: 999px` → squared — consumed
site-wide, needs a preview deploy) and the gold accent.

**Also staged, no PR:** Hey!/Zow! badges · lowercase body treatment · Clubby
voice copy · landing-page copy ("Make new friends, wherever you are.", the
"start here, it's just breakfast" scribble, the stats sticker).

**Open decision:** the hero sticker reads **"53 clubs · 18 countries · and
counting."** Not supportable. True today is **48 · 16**; the ceiling is
**53 · 17** with Riyadh. 18 is unreachable — Lisbon was the only candidate for
an 18th country and it's inactive. Mike's call, but it should not ship as-is.

**Page structure is not changing.** Nav → Hero → GalleryPreview (auto-scrolling
flyers) → Workflow (the globe) → InstagramCarousel → Events → Footer. Both PRs
are restyles; nothing moves.
