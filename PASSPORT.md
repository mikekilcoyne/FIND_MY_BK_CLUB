# Passport — Breakfast Club trading cards

**Status:** P0 prototype at `/passport`, scoped to a **Northeast weekly pilot**.
Device-local, no backend.
**Owner:** Michael Kilcoyne. **Last updated:** 2026-08-20.

Read this before touching `passport.html`, `css/passport.css` or `js/passport.js`.

---

## 1. What it is

`flyers.html` is already titled *Frequent Fly-Ers*. The passport is that joke one
level up: frequent flyer → passport → stamps.

- **Card** = one fly-er = one morning. Not one club — one *event*.
- **Stamp** = you were there.
- **Passport** = your run of them.

Cards being per-morning is the point: scarcity is real rather than invented. The
Copenhagen 10 Jun card can only be held by people who showed up on 10 Jun.

**The fly-er gate is the growth engine.** No fly-er → no cards → your city sits
greyed out in everyone else's passport.

## Launch scope

`LAUNCH_CLUBS` in `js/passport.js` limits the deck to six weekly Northeast
clubs. Empty the array to open it to the whole roster.

| Club | Runs | Cards |
|---|---|---|
| NY - Hamptons | Weekly, Wed | 2 |
| NY - Williamsburg | Weekly, Wed | 2 |
| NY - LES | Weekly, Thu | 1 |
| Maplewood, NJ | Weekly, Fri | 4 |
| NY - Downtown Brooklyn | Weekly, Thu | **0 — locked** |
| NY - UWS | Weekly, Wed | **0 — locked** |

Downtown Brooklyn and UWS open the pilot locked inside their own launch. Get a
fly-er from both hosts before this is linked anywhere.

---

## 2. Decisions already made (2026-08-20)

| Fork | Decision |
|---|---|
| Check-in trust | **Time window only.** Signed link live ~30 min before → 2 hrs after, one stamp per passport per card. No geofence, no rotating code. The prize for cheating is a picture of a breakfast. |
| Identity | **Device-local, claim later.** Stamp first, zero fields. Ask for an email only once someone has 2–3 cards and something to lose. |
| First build | **Passport page with self-serve stamps.** Answers "do people screenshot this?" before any backend exists. |

Deliberately **not** in P0: per-card serial numbers. They mean nothing while
stamping is self-serve, and minting fake "No. 007"s poisons them for when
they're real.

---

## 3. What's built

Three files, no build step, same conventions as the fly-er wall.

- `passport.html` — page shell, booklet, tally, share bar, filters
- `css/passport.css` — all styling
- `js/passport.js` — data, cards, stamps, deep links

**Design language is not new.** Local tokens mirror `clubby.html`'s set
(`--card` / `--ink-soft` / `--pop` / `--shadow` / `--shadow-sm`) on top of
`css/design-tokens.css`, so the passport, Clubby and the square-style club cards
stay one system. Dark mode mirrors Clubby's dark palette. Hard corners, 2px ink
borders, offset block shadows, ALL CAPS Helvetica Neue Bold.

**Cards are square and clean.** The fly-er sits *behind* the type as a ghosted
backdrop (22% opacity + a paper scrim) — flavour, not subject. The deck sits in
a bound booklet with an ink spine.

**Data**, same dual-source pattern as `js/flyer-page.js`:

| Source | Live | Fallback |
|---|---|---|
| Fly-ers | `get-public-flyers` | `data/flyer-wall.json` |
| Clubs | — | `data/clubs-map.json` |
| Table topics | `get-wwta` | `data/wwta-substack-cache.json` |

**Storage:** one `localStorage` key, `bkPassport`, shaped so P1 is a straight
POST of the same object — no migration.

```json
{ "v": 1, "id": "BKP-XXXXXXXX", "createdAt": "…", "holder": "",
  "stamps": [{ "cardId": "maplewood__2026-05-29", "city": "Maplewood, NJ",
               "date": "2026-05-29", "stampedAt": "…", "source": "nfc" }] }
```

**`CITY_ALIASES` in `js/passport.js`** — the roster and the fly-er filenames name
the same place differently (`NY - Lower East Side` vs `NY - LES`, `Panama City,
PA` where PA means Panama). Declared, never parsed — same rule as Clubby's `GEO`
table. **A club showing as locked when it shouldn't be needs a row here.**

---

## 4. Tap to stamp — NFC and QR

Both are the *same URL*. The tag/QR is only a delivery mechanism.

```
/passport?stamp=williamsburg              → card nearest today
/passport?stamp=williamsburg&date=2026-08-27
/passport?stamp=<cardId>                  → that exact card
/passport?city=williamsburg               → filter the booklet to one city
```

Resolution picks the card **closest to today**, not simply the newest — so a tag
stuck on a table keeps working every month without being rewritten. The stamp
param is stripped from the URL after firing, so a refresh or a forwarded link
doesn't re-stamp. `?via=` records how it happened (`nfc`, `qr`, `tap`).

### iPhone specifics

- **iPhone XS/XR (2018) and later, iOS 14+: background tag reading, no app.**
  Hold the phone near the tag → a banner appears → tap it → Safari opens the URL
  → the card stamps. iPhone 7/8/X need an app to scan.
- **Web NFC (`NDEFReader`) is Chrome-on-Android only.** Safari does not support
  it, so a web page can never scan a tag itself on iPhone. The OS has to do it,
  which is exactly why the tag holds a plain URL.
- Caveats: screen on and unlocked, and the user still taps a banner. It is not
  fully automatic — closer to AirDrop than to a turnstile.
- Tags: NTAG213/215 stickers, roughly $0.20–0.50 each. Write with the free
  **NFC Tools** app, then lock read-only so nobody rewrites the table's tag.

**This works today against P0** — no backend needed. Write one sticker, put it
on a table, and the demo is real.

---

## 5. Open threads

### Breadth vs depth — the one to solve

Most people attend **one** city, repeatedly. Collecting is a traveller's game.
The passport already counts both axes (`CITIES` / `MORNINGS`), but a repeat stamp
currently looks identical to a new city. Needs its own treatment — a streak, a
"Regular", "Founding member of Maplewood, 11 mornings" — or ~80% of attendees
stall at one card.

### V2: "Want to add to the discussion?"

After a check-in, prompt for a contribution. Everyone at the table gets **their
own Sticky**; a zoom-out view shows the whole table's, then every table's.

Worth noting this is the missing input side of a feature that already exists:
*What We Talked About* currently harvests topics from Substack posts after the
fact. Stickies would make the table itself the source — WWTA stops being
reported and starts being collected. The card back already shows those topics,
so the loop closes on itself.

### Smaller

- Entry point: nothing links to `/passport` yet. Deliberate — P0 is a link you
  send to ten people, not a nav item.
- 17 fly-er image files are deleted from the working tree (tracked in git,
  restore with `git checkout -- assets/flyers/2026`). Cards for those fall back
  to type. Production is unaffected — the blob store serves those.
- Locked cards mail the host via `mailto:` when `clubs-map.json` has an email,
  otherwise link to the fly-er wall.
