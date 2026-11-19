# Greg's build vs what we settled — the delta

> **Corrected 2026-11-19 (later the same day).** The first version of this
> file read Greg's live build as the new direction and declared the
> 2026-11-18 decisions dead. That was backwards. **The design language settled
> on 2026-11-18 is the target** — the kit in `zany-kit.css`, the preview in
> `zany-preview.html`, and the Clubby icon in `clubby-icon.svg` (the egg with
> specs that blinks, double-blinks and gets bored). Greg's build is the older
> styling that gets brought up to it.
>
> The measurements in §1 and the Clubby findings in §3 are still accurate as a
> record of what Greg's build looks like today. Read them as *what his build
> has to change*, not as a spec to rebuild the kit against. **Do not rewrite
> `zany-kit.css` or redraw `clubby-icon.svg` from this file.**

**Measured 2026-11-19** off the live
`breakfast-club-rebuild.vercel.app`, from computed styles, not screenshots.

Use this as the change list for Greg's build. The kit files are the source
of truth for the design itself.

---

## 1. The measurements

| | Settled 2026-11-18 — the target | Greg's build today |
|---|---|---|
| Typeface | Helvetica Neue | **Instrument Sans** |
| Headline case | ALL CAPS | **Sentence case** |
| Headline weight | Medium (500) | **Regular (400)** |
| Headline tracking | normal | **−4.29px at 64px** — very tight |
| Body copy | lowercase, opt-in via `.bc-lower` | sentence case |
| Buttons | 7px radius + `3px 3px 0` shadow | **`border-radius: 999px`, no shadow** |
| Tags | 3px radius + `2px 2px 0` shadow | — |
| Button shadow colour | **accent**, flipping to ink on accent buttons | n/a (no shadows) |
| Borders | 2px ink | **1px transparent** |
| Page background | `#ffffff` | `#ffffff` ✅ (panels `#f2f2f2`) |
| Accent | **`#ffd700` gold** | **`#b87649` terracotta** — no gold anywhere |
| Ink | `#111111` | `#111111` ✅ |

Ink and the white page are already shared. Everything else in the right column
is something Greg's build changes to match the left.

Three of those rows are easy to lose, and each was a specific call on
2026-11-18 rather than a default:

- **Tags differ from buttons** — `--bc-radius-tag: 3px` / `--bc-shadow-tag:
  2px 2px 0` against `7px` / `3px 3px 0` for buttons. A club tag like "Popup"
  and a "Find your club" button are deliberately not the same object.
- **The shadow contrasts the fill.** `.bc-btn` sets `--bc-btn-shadow` to the
  **accent**, and `.bc-btn--accent` flips it back to ink. This was the fix for
  a dark button whose dark shadow disappeared behind it — a single ink shadow
  everywhere looks right in isolation and muddy on a black button.
- **Lowercase is opt-in, never on `<body>`.** `.bc-lower` is applied per block,
  with `.bc-keepcase` for anything inside it that must keep its capitals.
  `text-transform` is blind: on a whole page it also lowercases city names,
  venue names and host names. Lowercase the voice, leave proper nouns alone.

**Correction:** an earlier version of this table listed the target page
background as `#efefef`. That is the old `css/design-tokens.css` value, not the
kit's — `zany-kit.css` sets `--bc-paper: #ffffff`. Greg's build is already
white, so that row is not a change he has to make.

---

## 2. What Greg's build needs, in order

1. **Clubby** — swap his placeholder trigger for the settled launcher
   (`.bc-clubby` + inline `clubby-icon.svg`). See §3.
2. **Buttons, tags and panels** — the square system in `zany-kit.css` §§2, 7,
   10, 11 replaces his pills and 1px borders.
3. **Accent** — `#ffd700` replaces `#b87649`.
4. **"Find your club"** — his button still reads "Find a club". Copy change.

Already right on his build, nothing to do:

- **"Everyone's invited." / "Especially you."** — the hero already does the
  offset.
- **The flyer stocks, tape and polaroid** (`zany-kit.css` §§13–14) are poster
  materials and drop in as they are.

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

1. **`clubby.html` in this repo is superseded as code.** It was never
   deployed (404 on `breakfastclubbing.com`) and the new site has its own chat
   panel. What carries across is the character and the icon, not the page.
2. **Replace the trigger, not just the icon.** His slot is a 56×56 black
   circle sized for a 24×24 stroke icon. The settled Clubby is the 48×48 egg
   with a filled shell, specs, blink, double-blink and bored state — it does
   not go into that slot. The button is swapped for `.bc-clubby` (`zany-kit.css`
   §8) with `clubby-icon.svg` inlined, keeping his `aria-label` and click
   handler. **Do not redraw the icon to fit his slot.**
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

1. **Send Greg §2 as the change list**, with `zany-kit.css`, `zany.js`,
   `ZanyLayer.tsx` and `clubby-icon.svg` as the drop-ins.
2. **Send Greg the voice doc** — the panel's copy is the gap, and it is the
   cheapest improvement on this list. `CLUBBY_VOICE.md` §§1–2 and §4.
3. **Check "Clubs near Sydney"** before promising geolocation (§3 item 4).

---

## 5. How this was measured

Computed styles pulled live in the browser, so these are rendered values rather
than authored ones:

- `getComputedStyle` on `body`, `h1` and the "Find a club" button
- a sweep of `backgroundColor` across the first 1500 elements for the palette
- `document.styleSheets` for custom properties — the new site exposes exactly
  one, `--font-instrument-sans`, so it is not token-driven the way this repo is

Re-measure rather than trusting this file if the design moves again.
