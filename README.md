# Breakfast Club

The site behind **[breakfastclubbing.com](https://breakfastclubbing.com)** — a global
directory of Breakfast Club meetups, plus the flyer wall, the map, and a handful of
things still finding their shape.

Static site. No build step, no framework, no bundler. You open an HTML file and it works.

**New here?** Read [`docs/STATUS.md`](./docs/STATUS.md) — what's live, what's half-built,
what's brewing, and a few things worth picking up.

---

## Run it

```bash
python3 -m http.server 8080
```

Open <http://127.0.0.1:8080>. That's the entire setup for front-end work — nothing to
install.

`npm install` is only needed if you're touching the Netlify functions (pulls in
`@netlify/blobs` and `sharp`).

There's also a start script that diffs your local JS against what's actually live before
it serves anything — useful when you've been away a while and aren't sure your copy is
current:

```bash
bash scripts/start-local.sh 8081
```

Before pushing anything that touches the club list or cards:

```bash
npm run check:release
```

It's a grep-based smoke check (`scripts/release-smoke-check.sh`) that fails if a known
feature hook disappears from the JS/CSS. Cheap insurance against a refactor quietly
deleting the "New" filter or the night badges. Needs `rg` (ripgrep) installed.

---

## The pages

Each page is a standalone HTML file at the repo root, with its CSS in `css/` and its JS
in `js/`.

| Page | What it is |
|---|---|
| `index.html` | Front page — club list, region filters, "this week", pop-ups, fly-er callout |
| `calendar-view.html` | The same clubs as a month grid |
| `map-view.html` | Leaflet world map, region filters, trip planner |
| `flyers.html` → `fly-er.html` | **Fly-Er wall** — every club's poster, newest first |
| `passport.html` | **Passport** — a card per morning you show up. P0 pilot, see [`PASSPORT.md`](./PASSPORT.md) |
| `what-we-talked-about.html` | **Latest Happenings** — table topics harvested from the newsletter |
| `admin.html` | Host/admin panel — flyers, pop-ups, club overrides, host access |
| `clubby-admin.html` | **Clubby** — chat-style admin prototype |
| `typeout.html`, `journey-home.html`, `copy.html` | Experiments, not linked from the site |

---

## Where the data comes from

This is the one thing worth understanding before you change anything.

Club data resolves in **three layers**, highest priority first:

1. **Live overrides** — Netlify Blobs, written by `/admin` and by approved host emails.
   Served by `netlify/functions/live-club-overrides.js`. Updates the site with no deploy.
2. **Curated overrides** — `js/club-overrides.js`, committed to the repo. Cadence, time,
   host display name, social links.
3. **The Google Sheet** — fetched as CSV at page load. The base roster.

Newer pages lean on static JSON instead:

| File | Feeds |
|---|---|
| `data/clubs-map.json` | Map pins, and the club roster the Passport reads |
| `data/flyer-wall.json` | Fly-er manifest + offline fallback for the wall |
| `data/wwta-substack-cache.json` | Table topics for Latest Happenings |
| `data/popups-sample.json` | Pop-up shape reference |

**The pattern to copy:** every live source has a static fallback. If a Netlify function
is down — or you're just on localhost with no functions running — the page renders from
the JSON in `data/`. `js/flyer-page.js` is the clearest example of the dual-source
pattern; `js/passport.js` follows it too.

---

## Netlify functions

`netlify/functions/` — the only server-side code. Highlights:

- `admin-api.js` — the whole `/admin` backend: auth (email + 4-digit PIN), flyer upload,
  pop-ups, club overrides, host access
- `get-public-flyers.js` / `get-flyer.js` — serve flyers out of the blob store
- `live-club-overrides.js` — deploy-free club edits
- `get-wwta.js` / `get-popups.js` — Latest Happenings + pop-ups
- `weekly-host-reminder.js` + `send-host-reminder-background.js` — the weekly host email
- `receive-club-update-email.js` — inbound host-email intake (partial, see STATUS)

---

## Making a change

Push to `main` → Netlify deploys automatically. There's no CI gate and no branch
protection, so the discipline is manual:

1. Make it scoped — one thing at a time.
2. QA locally on both a phone width and a desktop width.
3. `npm run check:release`
4. Push, then spot-check <https://breakfastclubbing.com>.
5. If it's wrong, the Netlify dashboard keeps the last 20 deploys for one-click rollback.

**For a new contributor: open a PR instead of pushing to `main`.** It costs nothing and
gives a review surface while you're getting your bearings.

House rules that matter more than they look:

- Mobile-first. Most people open this on a phone, standing up, before coffee.
- Preserve the existing style language unless a design change is the actual request.
  Hard corners, 2px ink borders, offset block shadows, ALL CAPS Helvetica Neue Bold.
- Google Maps links stay intact as labels — never truncated.
- Incomplete details → `Contact host for more info`. No schedule detail → `First Thursday`.
- Avoid adding dependencies. The no-build-step thing is a feature.

---

## Docs

| Doc | Read it for |
|---|---|
| [`docs/STATUS.md`](./docs/STATUS.md) | **Start here.** Live / in-flight / brewing, and open threads |
| [`PASSPORT.md`](./PASSPORT.md) | The Passport's design decisions and open problems |
| [`docs/SEO.md`](./docs/SEO.md) | Search/discovery: the `data/seo.json` control panel and what's left |
| [`docs/resources/mobile-guidelines.md`](./docs/resources/mobile-guidelines.md) | Layout + card rules |
| [`docs/resources/branding.md`](./docs/resources/branding.md) | Visual direction, copy tone |
| [`docs/style_guide.md`](./docs/style_guide.md) | Type, color, component language |
| [`docs/resources/ops.md`](./docs/resources/ops.md) | Deployment, data sources, workflow |
| [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) | Netlify + DNS setup |
| [`docs/commit-safety-checklist.md`](./docs/commit-safety-checklist.md) | Pre-push checklist |
| [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md) · [`docs/CODE_OF_CONDUCT.md`](./docs/CODE_OF_CONDUCT.md) | Ground rules |

Anything in `docs/` named `*HANDOFF*` is a **session log, not a spec** — a snapshot of
what one working session left behind. Useful for archaeology, frequently out of date.
`docs/STATUS.md` is the one that's meant to be kept current.
