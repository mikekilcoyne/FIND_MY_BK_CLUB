# SEO & Discovery

**State: half-built. Foundation laid, city pages not started.** Picking this up? Read
"What's left" at the bottom — it's the actual to-do list.

---

## Why this exists

Google Search Console, week of 2026-09-24: **25 clicks, 333 impressions**, up 525% and
296%. Small, but climbing fast. Three things in that data set the whole direction:

- **23 of 25 clicks land on the homepage.** The map, the fly-er wall, the passport —
  nothing. As far as search is concerned this is a one-page site.
- **People search by city.** `breakfast club cambridge` showed up as a query.
- **The audience is already global.** US 44%, Australia 12%, Denmark 8%, Germany 4%,
  Spain 4%.

And the reason none of it converts:

- The homepage serves **180 words** of crawlable text. The club list is fetched from the
  Google Sheet by `js/script.js` *after* load, so no club name, city or venue exists in
  the HTML a crawler sees.
- There was no `robots.txt` and no `sitemap.xml` — both 404'd in production.
- There's no `<meta name="description">`, only `og:` tags, which Google mostly ignores
  for snippets.
- `/admin.html` was fully crawlable.

**The Cambridge example, which is the whole problem in one row.** Someone searched
"breakfast club cambridge". Cambridge, MA *is* in the roster. Its record:

```
venue:         ''
host:          ''
schedule:      { type: 'unknown' }
upcoming_date: ''
```

Empty. So even a perfectly optimised page would have nothing true to say. **SEO here is
downstream of data accuracy** — that's not a slogan, it's 21 of 47 clubs.

---

## The control panel: `data/seo.json`

One file, every switch. Nothing is inferred from club names — if a city needs a
different label or URL, you declare it, same rule as `CITY_ALIASES` in the Passport.

```bash
npm run build:seo            # regenerate robots.txt + sitemap.xml
npm run build:seo -- --check # verify they're current, change nothing (exit 1 if stale)
```

`robots.txt` and `sitemap.xml` are **generated** — the header says so. Edit
`data/seo.json`, re-run, commit all three.

### The flags

| Flag | Applies to | Meaning |
|---|---|---|
| `indexed` | pages | `false` → blocked in robots.txt **and** left out of the sitemap |
| `noindexReason` | pages | Why it's blocked. Required reading before you flip one to `true` |
| `publish` | clubs | `false` → no page, no sitemap entry |
| `title` / `description` | both | `null` falls back to the template in `defaults` |
| `priority` | both | Sitemap hint, 0.0–1.0, relative not absolute |
| `clubPages.enabled` | global | **Master switch.** `false` until city pages actually exist |

`clubPages.enabled` is the important one. It's `false` right now, so the 26
publish-ready cities are deliberately kept out of the sitemap — flipping it before the
pages exist would advertise 26 404s to Google, which is worse than doing nothing. The
build script refuses to let that happen: it checks each slug has a matching file and
fails if not.

### The validator

`scripts/build-seo.mjs` fails loudly rather than guessing. It errors if a club is in
`clubs-map.json` but missing from `seo.json` (or vice versa), if two clubs share a slug,
or if a listed page doesn't exist on disk. So the config can't silently drift from the
roster.

---

## Done

- `robots.txt` — generated. `/admin.html`, `/clubby-admin.html`, `/copy.html`,
  `/typeout.html`, `/journey-home.html`, `/flyers.html` and `/passport.html` are blocked.
  The admin panel being openly crawlable was the urgent one.
- `sitemap.xml` — generated, 5 real pages, referenced from robots.txt.
- `data/seo.json` — all 47 clubs classified. 26 publish-ready, 21 held back as thin.
- Per-page titles and descriptions written and stored — **but not yet rendered into the
  HTML.** See below.

## What's left

Roughly in order. 1 and 2 are quick and independently valuable.

1. **Render the meta tags.** `data/seo.json` holds a `title` and `description` for every
   indexed page; nothing reads them yet. Either paste them into each page's `<head>` by
   hand (12 files, 20 minutes, zero machinery) or have `build-seo.mjs` inject them. Hand-
   pasting is probably right — it keeps the no-build-step promise.
2. **JSON-LD on the homepage.** `Organization`, plus `Event` for upcoming meetups. This
   is how you get rich results for "breakfast club <city>" without city pages existing.
3. **Fix the 21 thin clubs.** Run `npm run build:seo` to list them. Each needs a venue
   and a confirmed schedule. Start with Cambridge — it has proven search demand and an
   empty record. This is the highest-value work here and it isn't code.
4. **Build the city pages.** The one real architectural decision:

   - **Prerender at deploy** — a script reads `clubs-map.json` + `seo.json` and writes 26
     static HTML files. Fast, crawlable, cacheable. Costs the no-build-step ethos that
     makes this repo pleasant to work in.
   - **Netlify function per route** — no build step, HTML rendered server-side on
     request. Keeps the ethos, adds a cold-start and a redirect rule.
   - **Do nothing and rely on client rendering** — Google *sometimes* executes JS. It is
     slow, unreliable, and clearly isn't working today. Not recommended.

   Recommendation: prerender. The content changes weekly at most, and a deploy-time
   script is easier to debug than a function. But it's a real trade and worth a
   conversation, not a unilateral call.

5. **Flip `clubPages.enabled` to `true`** once those pages exist and `npm run build:seo`
   passes.
6. **"Find your nearest club."** `clubs-map.json` already carries lat/long for all 47, so
   this is a geolocation call and a distance sort — no new data, no backend. Pair it with
   step 3, because a confidently wrong nearest-club is worse than none.

## Not done deliberately

- `build:seo --check` is **not** wired into `npm run check:release`. It probably should
  be, but adding a new way for deploys to fail is the repo owner's call, not a drive-by.
