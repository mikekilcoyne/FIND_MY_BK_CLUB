# Clubby — Chat-First Breakfast Club App

**Status:** working prototype, not wired to backend. **Owner:** Michael Kilcoyne.
**Last updated:** 2026-08-13.

Read this before touching `clubby.html` or `clubby-admin.html`.

**Companion docs:**
- `CLUBBY_VOICE.md` — how he talks. Character brief (nerdy, awkward, kind,
  open to connection), house style, line banks per moment, the HAL gag.
- `CLUBBY_START_A_CLUB.md` — the start-a-club flow. **Supersedes** the
  "guided 3-question flow ending in Starter Kit" described in §5 below.

---

## 1. What Clubby is

A Clippy-inspired mascot named **Clubby** who fronts Breakfast Club International
as a chat interface. He replaces "browse a directory" with "ask a question."

The one job of the whole experience:

> Move someone from **"Is there a breakfast club in my city?"** to **"This looks really cool."**

Clubby has a personality — warm, a little quirky, never corporate. His own
self-description (already written into `clubby-admin.html`): *an Egg-Moji — kinda an
egg, kinda an emoji, kinda your personal Breakfast Club robot assistant.*

Opening line:

> Hey, I'm Clubby. The Breakfast Club mascot. What are you trying to find?

---

## 2. Where we are right now

Two prototypes exist in the repo root. Both are plain HTML/CSS/JS, no build step.

| File | What it is | State |
|---|---|---|
| `clubby.html` | **Visitor-facing** landing + chat. Built 2026-08-11. | Prototype, untracked, scripted responses only |
| `clubby-admin.html` | **Host/admin** chat. Committed (`35dc363`…`02d2fad`). | Talks to `/.netlify/functions/admin-api` |

### `clubby.html` — what works

- BC lockup: `BREAKFAST CLUB` over `INTERNATIONAL`, the second line letter-spaced
  to span the first exactly, forming the `[______]` rectangle.
- Type-out intro in the site's established style.
- Chat thread: Clubby bubbles + user bubbles, suggestion chips under each turn.
- Square-style club card (city, host, venue, when + Map / Flyer / Host-RSVP footer).
- Two **style options**, toggled top-left:
  - **CLEAN** — the default. Light paper, hard 2px borders, offset block shadows.
  - **PHOTO** — full-bleed Gaussian-blurred background, frosted-glass bubbles.
- Light/dark theme toggle, top-right.
- Scripted intent routing for: city lookup, "what happens," who attends, host/RSVP,
  writing help, club updates, photo upload, "start a club."

### Update 2026-08-13 (later): P1 built

`clubby.html` now reads live data. Shipped in this pass: fetch of all four data
files (`cache: "no-store"`) + live-club-overrides merge via `js/club-data.js`;
alias/fuzzy/chapter-aware matching (`placeKey()` handles `NY - Hamptons` vs
`new york - hamptons` vs `Maplewood/SOMa`); NYC/Melbourne chapter pickers;
card footer wired (Map → `mapsURL`, Flyer → latest from `flyer-wall.json`,
RSVP → `mailto:` host); real polaroids from `club-story-media.json`; flyer,
pop-up, WhatsApp-join (`WHATSAPP_GROUP_URL` const, still empty — paste link
from BC Master doc), meta and greeting intents; guided 3-question start-a-club
flow ending in Starter Kit + drafted invite; never-dead-end fallback with
re-railing chips; geolocation "nearest club"; unmatched inputs logged to
`netlify/functions/log-clubby-miss.js` (Blobs store `clubby-misses`, JSONL per
day — mine it for new aliases). Emoji stripped from dialogue (admin precedent);
mobile lockup now fits the viewport and compacts once chat starts. Painted
PHOTO background still pending a real photo. Not yet deployed.

### The matcher (`resolvePlace`) — read before touching lookup

One entry point resolves anything location-shaped. Order matters:
exact key → multi-word phrase → city+modifier combo → substring → single words
(longest first) → fuzzy. It returns `{kind}` of `club`, `multi` (chapters of one
city), `group` (a country/state/region), or `confirm`.

- **`GEO`** maps each club's `clubs-map.json` city string to `{country, state}`.
  The roster names places inconsistently (`berlin` vs `paris, france` vs
  `soma, nj, usa`), so geography is declared here, never parsed. **Adding a club
  means adding its GEO row** or it won't answer to its country/state.
- **`COUNTRY_WORDS` / `STATE_WORDS` / `REGION_WORDS`** are what people type
  (`oz`, `aus`, `england`, `cali`, `the states`) → the group key.
- **Ambiguity is a feature:** "washington state" → Seattle, "washington dc" →
  DC, "portland" → both chapters as chips.
- **Fuzzy:** Levenshtein ≤2. Distance 1 on a word ≥6 chars is accepted silently
  (thumb typos: `melborne`, `amsterdamn`, `san fransisco`). Anything looser
  returns `confirm`, and Clubby asks "I've got X — is that it?" with Yes/No
  chips rather than guessing.
- `findClub()` is a thin back-compat wrapper; new code should call
  `resolvePlace()` and hand the result to `deliverPlace()`.

### Known gaps in `clubby.html`

- **Responses are hardcoded.** ~11 cities are inlined in a `CLUBS` object as a
  sample. It does not read `data/clubs-map.json`. Nothing is live.
- **The PHOTO background is painted, not a photo.** It's a `<canvas>` that draws a
  café scene (warm window light, six silhouetted figures at a long table, bokeh,
  vignette) and then CSS-blurs it. It exists to judge the *treatment*.
  **Next step: swap it for a real photo** — an Unsplash-style shot of people
  talking around a table, or a Breakfast Club Hamptons image from
  `assets/photos/`. Replace the `<canvas id="bgCanvas">` with an `<img>`/CSS
  `background-image` and delete `paintScene()`.
- Card footer links (Map / Flyer / RSVP) are `href="#"` stubs.
- Polaroid thumbnails are emoji placeholders, not real photos.

### Open decision: emoji

Commit `e1bafd4` for the admin build reads **"mood-based mascot faces, no emoji"** —
the deliberate move was from emoji toward Clubby's own expressions. `clubby.html`
still has ~36 emoji in its copy from the first draft, while now also using the
mood faces. **Pick one and apply it consistently.** Recommendation: follow the
admin precedent — strip emoji from Clubby's dialogue, let the face carry the tone.

---

## 3. Design system — do not reinvent

Defined in `css/design-tokens.css` (single source of truth) and
`css/square-style.css`. Both prototypes inline these values rather than importing.

- **Type:** `"Helvetica Neue", Helvetica, Arial, sans-serif`. Bold (700) for all
  headers. H1 and H2 are **ALL CAPS** — enforced globally in `design-tokens.css`.
- **Accent:** `#ffd700` BK yolk-yellow, black text on it.
- **Pop / action:** `#25d366` WhatsApp green (used for RSVP and share).
- **Square style:** hard corners (`border-radius: 0`), `2px solid #111` borders,
  offset block shadows (`3px 3px 0`, `4px 4px 0`, `8px 8px 0`). Hover nudges
  the element up-left and deepens the shadow; active pushes it down-right.
- **Landing page stays clean and simple.** Quirk lives in the chips, cards, and
  Clubby's voice — not the header.

### The mascot

`EGG_BODY` + four faces (`neutral`, `thinking`, `happy`, `concerned`) as inline
SVG. Currently **duplicated** in both files. When productionizing, extract to
`js/clubby-faces.js` and import in both.

### The lockup fit — subtle, already-fixed bug

`fitLockup()` letter-spaces `INTERNATIONAL` to match `BREAKFAST CLUB`'s width.

The original version measured with `l2.getBoundingClientRect().width`. Because
`.l2` is `display: block`, that returns the **container** width, not the text
width — so `extra` always computed to `0` and the line never stretched.
Measured live on the committed admin file: container `307.7px`, actual text
`141.8px`, `letter-spacing: normal`.

Fixed in both files (2026-08-13) by measuring with a `Range`:

```js
const textWidth = node => {
  const r = document.createRange(); r.selectNodeContents(node);
  return r.getBoundingClientRect().width;
};
```

Also: `letter-spacing` adds a gap after *every* glyph including the last, so
divide by the full character count (13) and add matching `padding-left` to
re-center. Re-run on `document.fonts.ready` or it measures the fallback font.

---

## 4. Data Clubby should read

All local JSON, already in the repo. See `MEMORY.md` → *Data sources*.

| Source | Contains | Use for |
|---|---|---|
| `data/clubs-map.json` | 47 clubs: city, region, host, email, venue, lat/long, `schedule`, `mapsURL` | City lookup, club card |
| `data/club-story-media.json` | Per-club photos, keyed by bare-city `slug` | "What do they talk about" polaroids |
| `data/flyer-wall.json` | 42 flyers, `city` / `url` / `date` | Flyer button |
| `data/popups-sample.json` | One-time events | Pop-up answers |
| `data/wwta-media.json` | Per-city display config | WWTA |

**Slug gotcha:** naming differs between sources. Site uses `soma, nj` where the
sheet says `Maplewood, NJ`; WWTA keys on bare city (`mexico-city`, not
`mexico-city-mx`). Any lookup needs a normalizing layer — don't assume a join.

### Existing Netlify Functions to reuse

`admin-api.js` (auth + club/flyer/pop-up writes), `submit-club-update.js`,
`get-public-flyers.js`, `get-flyer.js`, `get-popups.js`, `get-wwta.js`,
`live-club-overrides.js`, `get-transit-estimate.js`.

Storage is **Netlify Blobs**. Deploy is `npm run deploy` (netlify --prod).
Local preview: `.claude/launch.json` defines a `static` server on **port 8083**
(`node scripts/preview-server.mjs`) → `http://localhost:8083/clubby.html`.

---

## 5. Features to build out

Ordered. Each is independently shippable.

### P1 — Make it real
1. **Read live data.** Replace the inlined `CLUBS` object with a fetch of
   `data/clubs-map.json` + `club-story-media.json`. Build the slug-normalizing
   layer here, once.
2. **Real city matching.** Aliases (`NYC`→New York, `SF`, `CDMX`), fuzzy match,
   and "nearest club" via the lat/long already in `clubs-map.json`.
3. **Wire the card footer.** Map → `mapsURL`; Flyer → open the existing flyer
   lightbox (`js/flyer-lightbox.js`); RSVP → host email / WhatsApp.
4. **Swap the painted background for a real photo** (see §2).

### P2 — The personality layer
5. **Real LLM responses.** See §6 — this is the one architectural decision.
6. **Writing help.** Invite copy, flyer headlines, intro DMs, recap captions —
   in the Breakfast Club voice. Clubby already offers this; it needs a real brain.
7. **Mood faces driven by intent** — `thinking` while fetching, `happy` on a hit,
   `concerned` on an error. Partly wired in `clubby.html`.

### P3 — Contribution loop
8. **Photo upload → auto-attach to club.** User drops a photo, Clubby infers the
   club (from their history or by asking), posts to Blobs, appends to
   `club-story-media.json`. Reuse the `admin-api.js` upload path.
9. **Club updates via chat.** Natural-language "the venue moved" → structured
   update → `submit-club-update.js` → host ping. Admin flow already does this.
10. **"Start a club" funnel.** Starter Kit PDF + drafted launch flyer + first
    invite, then into the host roster.

### P4 — App shell
11. **Mobile/PWA.** Add a manifest + service worker; it's already a single
    full-height chat column, so it installs cleanly. No native app needed.
12. **Merge admin + visitor.** One Clubby; the host tools appear only when the
    session is authenticated. `admin-api.js` already returns `master` vs
    per-club scope.

---

## 6. The one real architectural decision

Everything in `clubby.html` today is **scripted regex routing** — zero API cost,
zero latency, but it only answers what it was told to answer.

Turning Clubby into an actual conversational agent means a Netlify Function
holding an Anthropic API key and calling Claude with the club data as context.
Never call the API from the browser — the key would be public.

Three options, cheapest first:

- **A. Stay scripted.** Free. Fine for the core "find my city" path, which is
  most of the value. Brittle for anything off-script.
- **B. Hybrid (recommended).** Scripted for the known paths — city lookup, card,
  RSVP. Call the model only for open-ended turns: writing help, "what's it like,"
  anything unmatched. Most sessions never hit the API.
- **C. Full LLM** with the club roster as tool-calls. Best personality, highest
  cost per session.

If you build B or C, use a current model id — `claude-fable-5` or
`claude-sonnet-5`. Sonnet is the sensible default for short chat turns.

---

## 7. Working agreement

From `CLAUDE_HANDOFF.md`, and it still applies:

> Do **not** change direction, rebuild flows, or replace working features.
> Finish/polish only.

The main site (`index.html` and friends) is live and working. Clubby is additive —
a new front door, not a replacement. Don't refactor the existing site to serve it.

Prefer guardrails over one-off fixes: preview-by-default scripts, idempotent
staging, reconcile against existing slugs rather than minting duplicates.
