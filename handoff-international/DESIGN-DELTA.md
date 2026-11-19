# Greg's new design vs what we settled — the delta

**Measured 2026-11-19** off the live
`breakfast-club-rebuild.vercel.app`, from computed styles, not screenshots.

**Read this before touching `zany-kit.css`, `clubby-icon.svg` or
`CLUBBY_VOICE.md`.** Most of the 2026-11-18 design decisions were made against
the *old* Netlify site and do not survive contact with the new one.

---

## 1. The measurements

| | Settled 2026-11-18 (old site) | Greg's live design |
|---|---|---|
| Typeface | Helvetica Neue | **Instrument Sans** |
| Headline case | ALL CAPS | **Sentence case** |
| Headline weight | Medium (500) | **Regular (400)** |
| Headline tracking | normal | **−4.29px at 64px** — very tight |
| Buttons | 7px radius + `3px 3px 0` ink shadow | **`border-radius: 999px`, no shadow** |
| Borders | 2px ink | **1px transparent** |
| Page background | `#efefef` | **`#ffffff`** (panels `#f2f2f2`) |
| Accent | **`#ffd700` gold** | **`#b87649` terracotta** — no gold anywhere |
| Ink | `#111111` | `#111111` ✅ |

Ink is the only token that survives unchanged.

**So the square style is gone.** Hard corners, 2px ink borders and offset block
shadows — the thing `CLAUDE.md` describes and `css/square-style.css` implements
— are the old site's language. The new one is soft, rounded, white and warm.

`CLAUDE.md` is not wrong; it describes *this* repo, which still looks like that.
It is just no longer describing where the site is going.

---

## 2. What survives, what gets re-expressed, what is dead

**Survives untouched**

- **"Everyone's invited." / "Especially you."** — Greg's hero already does the
  offset, exactly as asked for. Nothing to do.
- **The flyer stocks** (paper / fabric / sandstone, `zany-kit.css` §13). They are
  poster textures, not UI chrome, and are independent of the button language.
- **The poster-maker rules** — locale-appropriate stock, the three vibes, the
  "taped on, never composited" rule for personal elements.

**Needs re-expressing in the new language**

- **Clubby's icon.** The character is right; the execution is for the wrong
  system. See §3 — the slot is already cut and it is more specific than assumed.
- **The doodles.** Hand-drawn marks still fit a warm editorial site, but they
  were tuned against `#efefef` and gold. Retune to white and `#b87649`.
- **"Find your club"** — Greg's button still reads "Find a club". Still just a
  copy change, and still worth making.

**Dead — do not port**

- Square buttons, the 3px/2px offset shadow pair, the shadow-contrasts-fill
  rule, the 2px ink borders. All of `zany-kit.css` §§1–12 that encodes them.
- ALL CAPS headers and the Helvetica Neue Medium decision.
- `#ffd700` as the accent.

---

## 3. Clubby is already live on the new site

The find that matters most, and the one most likely to cause duplicated work.

**The trigger exists**, bottom-right:

```
button.clubby-trigger
  56 × 56   border-radius: 999px   background: #111
  aria-label="Ask Clubby"
  contains a 24×24 stroke SVG (generic chat bubble — a placeholder)
```

**The panel exists and works.** It opens on click and greets with:

> Hi! I'm Clubby. Ask me about a club, venue, or confirmed event.

with three chips — *Clubs near Sydney* · *What happens at a breakfast?* ·
*How do I start one?* — and an input placeholder *"Ask about a club…"*.

### What this means

1. **`clubby.html` in this repo is superseded.** It was never deployed (404 on
   `breakfastclubbing.com`) and the new site has its own implementation. Do not
   spend more time on it; the work to carry across is the *character*, not the
   code.
2. **The egg icon has a real, specific slot.** `clubby-icon.svg` is drawn at
   48×48 with a `fill`ed shell and multiple stroke widths. The slot wants
   **24×24, stroke-only, `currentColor`, on a dark circle** — so it needs
   redrawing at that size, not scaling. At 24px the glasses, the crack, the
   highlights and the double-blink will not all survive; decide which two
   details carry the character and drop the rest.
3. **The voice does not match `CLUBBY_VOICE.md`.** "Hi! I'm Clubby. Ask me about
   a club, venue, or confirmed event." is the bland register that document
   exists to fix — and it opens with an exclamation mark, which the tone dial
   lists as a tell. The chips are closer. This is a copy hand-off to Greg, and
   `CLUBBY_VOICE.md` §§1–2 and §4 are already written for it.
4. **"Clubs near Sydney"** suggests geolocation is wired, which the old Clubby
   also had (`geoNearest`). Worth checking whether it is real before promising
   it.

---

## 4. What to do next

1. **Confirm the design is final** before rebuilding anything against it. It
   was described as "wholly updated"; this records it as measured on
   2026-11-19, and a moving target is not worth chasing twice.
2. **Rewrite the kit's chrome** against the measured tokens above, keeping
   §§13–14 (stocks, tape, polaroid) as they are.
3. **Redraw the Clubby mark at 24×24 stroke-only** for the existing trigger.
4. **Send Greg the voice doc** — the panel's copy is the gap, and it is the
   cheapest improvement on this list.
5. Leave `clubby.html`, `zany-preview.html` and the square-style work in the
   repo as reference. They are the record of what was decided and why, even
   where the execution no longer applies.

---

## 5. How this was measured

Computed styles pulled live in the browser, so these are rendered values rather
than authored ones:

- `getComputedStyle` on `body`, `h1` and the "Find a club" button
- a sweep of `backgroundColor` across the first 1500 elements for the palette
- `document.styleSheets` for custom properties — the new site exposes exactly
  one, `--font-instrument-sans`, so it is not token-driven the way this repo is

Re-measure rather than trusting this file if the design moves again.
