# Status

Where the project actually is. **Last updated: 2026-09-24.**

If you're new: read this top to bottom once, then [`../README.md`](../README.md) for how
to run it. Everything below is current as of the date above — if that date is stale,
trust `git log` over this file.

**About the numbers.** "Built" is a rough eyeball of how much of the work is done, read
off the code — not measured, not a promise. "Impact" is what finishing it would actually
change for people using the site. A thing can be 80% built and low impact; several here
are 0% built and high impact. Those are the good ones.

---

## At a glance

| | Built | Impact | Why |
|---|---|---|---|
| **Discoverability / nearest club** | ~25% | **Highest** | The only item that grows the top of the funnel — see the numbers below |
| **Hot, New Clubs strip** | 0% | **High** | Front-page real estate, reuses an existing pattern, cheap |
| **Host-email intake** | ~45% | **High** | The only path that takes roster upkeep off one person |
| **Passport: breadth vs depth** | 0% | **High** | Gates everything else in the Passport |
| **Passport P0** | ~55% | High, unproven | Growth engine on paper; nobody outside a pilot has held one |
| **Passport V2 (Stickies)** | 0% | High, far off | Closes the loop on Latest Happenings |
| **Evergreen flyer flag** | 0% | Medium | Stops recurring flyers silently expiring |
| **Itinerary builder** | ~30% | Medium | Picker exists; no routes, no save |
| **Clubby admin** | ~40% | **Low** | Duplicates an admin that already works |
| **MadLib Missed Connections** | 0% | Low | Speculative, deliberately queued behind the map |

---

## What the numbers say

Google Search Console, week of 2026-09-24:

| | | |
|---|---|---|
| Clicks | **25** | ↑ 525% |
| Impressions | **333** | ↑ 296% |
| CTR | ~7.5% | healthy — the problem isn't the listing, it's how few there are |

Small, but the growth rate is real. Three things in that data matter:

**Everything lands on the homepage.** 23 of 25 clicks. `/calendar-view` got 1,
`what-we-talked-about.html?city=vienna` got 1. The map, the fly-er wall and the passport
got none. The site is effectively one page as far as search is concerned.

**People search by city.** "breakfast club cambridge" showed up as a query — and
Cambridge, MA *is* in the roster. Someone looked for exactly what this site has and
barely found it.

**The audience is already global.** US 44%, Australia 12%, Denmark 8%, Germany 4%,
Spain 4% — on a site with no localised pages at all.

**Why it isn't ranking:** the homepage serves **180 words** of crawlable text. The club
list is fetched from the Google Sheet by `js/script.js` *after* load, so no club name,
city or venue exists in the HTML a crawler sees. There is no `sitemap.xml`, no
`robots.txt` (both 404 in production), and no `<meta name="description">` — only `og:`
tags, which Google mostly ignores for snippets.

So the directory is invisible for every query except the brand name. That's the gap.

---

## Live on breakfastclubbing.com

The front page, calendar and map are the stable core. These are the newer things —
roughly newest first.

### Fly-Er wall + Easy to Share
`fly-er.html` · `js/flyer-page.js` · `js/flyer-lightbox.js`

Two-wide wall, newest first. Every lightbox has a share bar — WhatsApp, SMS, copy link —
with the payload pre-written ("Everyone's invited. Especially you." + the flyer URL).
The front-page callout opens the same lightbox instead of navigating away.

Flyers come from the blob store via `get-public-flyers`, with `data/flyer-wall.json` as
the static fallback. Uploads go through `/admin` → Flyer Dump.

`flyers.html` is a deliberate redirect shim to `fly-er.html` — the old "This Week's
Flyers" design, retired June 2026. It looks abandoned; it isn't. Leave it.

### Pop-ups
`#popup-strip` on the front page + the pop-up drawer

One-time events, separate from the recurring roster. The drawer auto-detects an RSVP
link in any admin field, shows a capacity note under the button, and hides the
Host/RSVP button entirely when there's no link — no falling back to someone's personal IG.

### Latest Happenings (WWTA)
`what-we-talked-about.html` · `js/what-we-talked-about.js` · `js/word-cloud.js`

What tables actually talked about, harvested from Substack posts. V3 redesign, dated
header, Notes trigger, view toolbar. Reads `get-wwta` with
`data/wwta-substack-cache.json` behind it.

### Admin + live updates
`admin.html` · `netlify/functions/admin-api.js`

Email + 4-digit PIN auth; the `ADMIN_EMAIL` owner is always master. Flyer dump with
date sort, dedupe and ZIP export; inline edit and delete; pop-up management; host access
seeded from the sheet. Approved changes write **live overrides into Netlify Blobs**, so
club edits go out without a deploy.

AI image analysis (flyer auto-detect, pop-up auto-fill, WWTA scan) runs on **Gemini 1.5
Flash** — free tier. Env var is `GEM_KEY`.

### Front-page club update form
`netlify/functions/submit-club-update.js` — the "?" trigger on a club card. Sends a
SendGrid email. Works end to end. Don't confuse it with the inbound email intake below,
which is a different and much less finished thing.

### Smaller, still live
- **"This week" filter** — next 10 days, includes recurring clubs by weekday, not just
  dated ones
- **Weekly host reminder email** — `weekly-host-reminder.js` +
  `send-host-reminder-background.js` (background function, so no timeout)
- **Square Style overlay** sitewide

---

## Half-built

Started, not finished. The order is roughly worst-surprise-first.

### Host-email intake — *writes tickets nothing reads*
**Built: ~45% · Impact: high**

`netlify/functions/receive-club-update-email.js` · `lib/club-update-intake.js`

The idea: hosts email `set@breakfastclubbing.com` in plain language ("we moved to Forget
Me Not, Thursdays 9:30") and the site updates itself.

**Works:** a message from one of the two `TRUSTED_APPROVERS` with a `SITE:` or `APPROVE:`
subject is classified as approved, `applyApprovedLiveUpdate()` writes a live club
override into Netlify Blobs, and the site picks it up with no deploy.

**The trap:** everything else gets `status: "pending"`
([club-update-intake.js:136](../netlify/functions/lib/club-update-intake.js:136)) and is
written to the `club-update-intake` blob store — **and nothing anywhere reads that
store.** No admin tab, no notification, no digest. Grep it: the only references are the
two writes inside the function itself. So the actual host-facing case — a host who isn't
Mike emailing in — lands in a blob and stops, silently. Today the feature only really
works when Mike emails himself.

**Also missing:** the AI parse of freeform email (`parseStructuredSiteUpdate` is a
prefix/field parser, not a model call), and the Google Sheet "Pending" tab. Inbound
provider is SendGrid — already in use on another domain, so add a parse route rather than
standing up something new. Whether that route is actually pointed at the function can't
be confirmed from the repo. Needs `ANTHROPIC_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`,
and the provider webhook secret.

**Finish it and** roster upkeep stops being one person's manual job. That's the highest
structural payoff in the repo — and the cheapest version isn't the AI parse, it's giving
the pending store *any* reader at all.

### Passport — *complete but deliberately stranded*
**Built: ~55% · Impact: high, unproven**

`passport.html` · `js/passport.js` · [full spec](../PASSPORT.md)

A card per **morning**, not per club — the Copenhagen 10 Jun card only exists for people
who were at that table. Stamps are device-local (`localStorage`, one `bkPassport` key),
no backend, no accounts.

The code path is finished: NFC and QR stamping both resolve through one URL
(`/passport?stamp=williamsburg`), picking the card nearest today so a sticker on a table
keeps working month to month. Scoped to a six-club Northeast pilot via `LAUNCH_CLUBS`.

Nothing links to it, and that's intentional — P0 is a link you send to ten people, not a
nav item.

**The blocker is design, not code** — see breadth vs depth below. Anyone who "finishes"
this by wiring it into the nav has shipped the flaw at scale. Read PASSPORT.md fully
before touching it; there are decisions already made that shouldn't be relitigated.

### Clubby — *an orphaned second admin*
**Built: ~40% · Impact: low**

`clubby-admin.html` · shipped Jul 2026

An admin surface as a conversation instead of a form grid. Full BC lockup, mood-based
mascot faces, merges live overrides.

Clubby links *to* `admin.html`; nothing links to Clubby. You can only reach it by typing
the URL. It duplicates override-merging logic that already lives in `admin-api.js`, and
there's no decision on whether it replaces or supplements the real admin.

Low impact on purpose: `admin.html` works. This is a nicer way to do something already
possible. Worth a decision more than worth an investment — either commit to it or delete
it, but two admin surfaces is the actual cost.

### Evergreen flyer flag
**Built: 0% · Impact: medium**

Blob flyers can't be marked evergreen, so a recurring-design flyer expires by date like a
one-off and quietly vanishes off the wall. Touches `admin.html` + `admin-api.js` + the
wall's date filter — a clean vertical slice, and a good way to learn the flyer path end
to end.

---

## Brewing

Not started, wanted, roughly in priority order.

### Discoverability + "find your nearest club"
**Built: ~25% · Impact: highest** · full write-up: [SEO.md](./SEO.md)

*Foundation landed Sep 2026 on branch `seo/discovery-foundation`: `data/seo.json` as a
single control panel, a generator for `robots.txt` + `sitemap.xml`, and all 47 clubs
classified. City pages are the remaining work.*

The only item on this list that grows the top of the funnel. Everything else improves
life for people who already found the site.

Three tiers, cheapest first:

1. **Zero-architecture wins.** `robots.txt`, a `sitemap.xml`, a real
   `<meta name="description">`, distinct `<title>` per page, and JSON-LD
   (`Organization` + `Event`) on the front page. An afternoon; no change to how the site
   works.
2. **Get the roster into the HTML.** The blocker is that clubs render client-side from
   CSV. Either prerender city pages at deploy time (a real build step — weigh it against
   the no-build-step ethos that makes this repo pleasant) or serve them from a Netlify
   function. `/breakfast-club-cambridge` and friends are the pages people are already
   searching for.
3. **Nearest club, on arrival.** `data/clubs-map.json` already carries lat/long for every
   pin, so "your nearest club is Maplewood, 4 miles, Fridays 8:30am" is a geolocation
   call and a distance sort — no new data. Pair it with an accuracy pass so the answer is
   actually right, because a confidently wrong nearest-club is worse than none.

Tier 1 is uncontroversial and should just happen. Tier 2 is the one real architectural
decision in the repo right now.

### "Hot, New Clubs" strip
**Built: 0% · Impact: high**

A strip on the front page under the pop-ups — newest/most interesting clubs with their
flyers, reusing the popup-strip visual language. No new design system. Candidates from
the hosts chat: Honolulu, Brighton, Manila, Milan, LA East. Match each to its newest
flyer in `data/flyer-wall.json`.

Best value per hour in the repo: front-page real estate, an existing pattern to copy, no
backend work, and it makes new clubs feel like news instead of another row.

### Passport: breadth vs depth
**Built: 0% · Impact: high**

The real problem. Most people attend *one* city, repeatedly — but a repeat stamp looks
identical to a new city, so roughly 80% of attendees stall at one card. Needs its own
treatment: a streak, a "Regular", "Founding member of Maplewood, 11 mornings."

This gates the whole Passport. Solve it before the Passport goes anywhere near the nav.

### Passport V2: "Want to add to the discussion?"
**Built: 0% · Impact: high, far off**

After a check-in, prompt for a contribution. Everyone at the table gets their own Sticky;
zoom out to see the table's, then every table's. This is the missing *input* side of
Latest Happenings — WWTA would stop being reported after the fact and start being
collected at the table. The card back already shows those topics, so the loop closes on
itself.

### Multi-city itinerary builder
**Built: ~30% · Impact: medium**

"Hit 3 in 3 days" loops, route lines, save a trip plan. The map already has a trip
planner surface (`js/map-view.js`, around line 1101), but there's no persistence and no
route drawing — zero `localStorage` or `polyline` calls in that file. So the picker
exists and the payoff doesn't.

### MadLib Missed Connections
**Built: 0% · Impact: low**

Depth per event. Deliberately queued behind the map: scale before novelty.

---

## Known rough edges

Small, real, and mostly pickup-able:

- **Dead SXSW code.** `js/analytics.js` still carries the March 2026 SXSW callout
  (`sxswCallout()`, ~line 47). It auto-expired 2026-03-15 and hasn't rendered in six
  months. Safe to delete.
- **Host emails are in public data.** `data/clubs-map.json` carries host email addresses
  and the repo is public — the file is also served to browsers. Being fixed. Don't build
  anything new on that field.
- **Lisbon flyer** exists only as a chat image. Pop-up data is in `popups-sample.json`
  but the image was never added to the production blob store.
- **Word-cloud suppression on the Polaroid route** — carried over from an old pass, never
  resolved. Tread carefully, there's history in the git log.
- **Orphaned experiments.** `copy.html`, `journey-home.html` and `typeout.html` are
  linked from nothing (journey-home links to typeout, and that's the whole graph). Dead
  rather than unfinished — ignore them, or delete them.
- **The repo is heavy.** `.git` is ~1.4GB; `downloads/` (546MB of scraped Substack and
  WhatsApp media) and `assets/` (248MB) are committed. A fresh clone is slow. Not worth
  rewriting history over, but don't add to it — raw flyer dumps are gitignored now, and
  cleaned flyers go to `assets/flyers/<year>/` as `City_YYYY-MM-DD.ext`.

---

## Good first things to pick up

Ranked by "useful without needing the whole history in your head":

1. **Delete the SXSW callout** from `js/analytics.js`. Small, obviously correct, gets you
   through the run-QA-push loop once.
2. **SEO tier 1** — `robots.txt`, `sitemap.xml`, meta descriptions, JSON-LD. Highest
   impact per hour in the repo, and nothing can break.
3. **Build the "Hot, New Clubs" strip.** Self-contained, visible, reuses an existing
   pattern. Highest value per hour on this list.
4. **Give the pending intake store a reader.** Even a read-only list in `/admin` turns a
   silent dead end into a working inbox. Much smaller than the full pipeline.
5. **Roster accuracy.** Walk the club list against the sheet and the hosts chat, fix what
   moved. Dull, always needed, immediately felt by users.
6. **The evergreen flyer flag** — touches `admin.html` + `admin-api.js` + the wall's date
   filter. Good way to learn the flyer path end to end.
7. **Passport breadth-vs-depth.** The interesting one, but read [`../PASSPORT.md`](../PASSPORT.md)
   fully first.

---

## Branches

`main` is the only live branch — it's what Netlify deploys.

Everything else on the remote is **abandoned**: `codex/*` and `agent-*` branches from
Mar–Apr 2026, each 50–67 commits behind `main` and 0–1 commits ahead. Nothing in them is
known to be wanted. Don't branch off them, and don't assume they represent work in
progress. They're due a cleanup.

---

## Doc map, honestly labelled

| File | State |
|---|---|
| `docs/STATUS.md` | **Current.** This file. Keep it that way. |
| `PASSPORT.md` | Current (Aug 2026), and the best-written doc here |
| `docs/resources/*`, `docs/style_guide.md` | Evergreen — design and ops rules |
| `docs/MAP_VIEW.md` | Historical build spec. The map shipped; this is what it was built from |
| `docs/HANDOFF.md` | **Stale** (Mar 2026). Session log. Superseded by this file |
| `CLAUDE_HANDOFF.md` | **Stale** (Jun 2026). Session log |
| `docs/CODEX_HANDOFF_*.md` | **Stale** (Apr 2026). Session logs |

Session logs are kept for archaeology — they record *why* something was done. They are
not instructions, and their "next steps" lists are mostly resolved or abandoned.
