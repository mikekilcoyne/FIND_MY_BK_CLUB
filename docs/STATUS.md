# Status

Where the project actually is. **Last updated: 2026-09-18.**

If you're new: read this top to bottom once, then [`../README.md`](../README.md) for how
to run it. Everything below is current as of the date above — if that date is stale,
trust `git log` over this file.

---

## Live on breakfastclubbing.com

The front page, calendar and map are the stable core. These are the newer things —
roughly newest first.

### Passport — *P0 pilot, not linked from anywhere*
`passport.html` · `js/passport.js` · [full spec](../PASSPORT.md)

A card per **morning**, not per club — the Copenhagen 10 Jun card only exists for people
who were at that table. Stamps are device-local (`localStorage`, one `bkPassport` key),
no backend, no accounts.

Scoped to a **six-club Northeast weekly pilot** via `LAUNCH_CLUBS` in `js/passport.js`;
empty that array to open it to the whole roster. Stamping works today over NFC or QR —
both are just a URL (`/passport?stamp=williamsburg`), resolved to the card nearest today
so a sticker on a table keeps working month to month.

Deliberately unlinked: P0 is a link you send to ten people, not a nav item.

### Clubby — chat-style admin *(prototype)*
`clubby-admin.html` · shipped Jul 2026

An admin surface as a conversation instead of a form grid. Full BC lockup, mood-based
mascot faces, merges live overrides. It's a test build sitting alongside `admin.html`,
not a replacement yet.

### Fly-Er wall + Easy to Share
`fly-er.html` · `js/flyer-page.js` · `js/flyer-lightbox.js`

Two-wide wall, newest first. Every lightbox has a share bar — WhatsApp, SMS, copy link —
with the payload pre-written ("Everyone's invited. Especially you." + the flyer URL).
The front-page callout opens the same lightbox instead of navigating away.

Flyers come from the blob store via `get-public-flyers`, with `data/flyer-wall.json` as
the static fallback. Uploads go through `/admin` → Flyer Dump.

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

### Smaller, still live
- **"This week" filter** — next 10 days, includes recurring clubs by weekday, not just
  dated ones
- **Weekly host reminder email** — `weekly-host-reminder.js` +
  `send-host-reminder-background.js` (background function, so no timeout)
- **Trip planner** on the map view
- **Square Style overlay** sitewide

---

## In flight

### Email-to-site update pipeline — *partially built*
The idea: hosts email `set@breakfastclubbing.com` in plain language ("we moved to
Forget Me Not, Thursdays 9:30") and it lands as a pending row for review.

Built: `netlify/functions/receive-club-update-email.js`. A trusted approver sending
`SITE: ...` directly, or using the `APPROVE:` path, writes live club overrides into
Netlify Blobs. The site reads those before rendering cards.

Not built: the AI parse step for *freeform* host email, the Google Sheet "Pending" tab,
and the review queue UI. Inbound provider is SendGrid (already in use on another domain
— add a parse route rather than standing up something new). Needs
`ANTHROPIC_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`, and the provider webhook secret.

### Roster upkeep
Ongoing and never finished. Most recent: NY-LES moved to Forget Me Not, 138 Division St,
Thursdays 9:30am (Sep 2026). Clubs change venue constantly; this is the least glamorous
and most valuable work in the repo.

---

## Brewing

Not started, wanted, roughly in priority order.

**"Hot, New Clubs" strip** on the front page, under the pop-ups — newest/most interesting
clubs with their flyers, reusing the popup-strip visual language. No new design system.
Candidates from the hosts chat: Honolulu, Brighton, Manila, Milan, LA East. Match each to
its newest flyer in `data/flyer-wall.json`.

**Passport: breadth vs depth.** The real problem. Most people attend *one* city,
repeatedly — but a repeat stamp currently looks identical to a new city, so ~80% of
attendees stall at one card. Needs its own treatment: a streak, a "Regular", "Founding
member of Maplewood, 11 mornings." Solve this before the Passport goes anywhere near the
nav.

**Passport V2: "Want to add to the discussion?"** After a check-in, prompt for a
contribution. Everyone at the table gets their own Sticky; zoom out to see the table's,
then every table's. This is the missing *input* side of Latest Happenings — WWTA would
stop being reported after the fact and start being collected at the table.

**Multi-city itinerary builder** — "hit 3 in 3 days" loops, route lines, save a trip
plan. Long-standing Phase 2 on the map.

**MadLib Missed Connections** — depth per event. Deliberately queued behind the map:
scale before novelty.

---

## Known rough edges

Small, real, and mostly pickup-able:

- **Dead SXSW code.** `js/analytics.js` still carries the March 2026 SXSW callout
  (`sxswCallout()`, ~line 47). It auto-expired 2026-03-15 and hasn't rendered in six
  months. Safe to delete.
- **No "evergreen" flag on uploaded flyers.** Blob flyers can't be marked evergreen, so
  a recurring-design flyer expires by date like a one-off.
- **Lisbon flyer** exists only as a chat image. Pop-up data is in `popups-sample.json`
  but the image was never added to the production blob store.
- **Word-cloud suppression on the Polaroid route** — carried over from an old pass, never
  resolved. Tread carefully, there's history in the git log.
- **Two admin surfaces.** `admin.html` and `clubby-admin.html` both exist. No decision
  yet on whether Clubby replaces or supplements.
- **The repo is heavy.** `.git` is ~1.4GB; `downloads/` (546MB of scraped Substack and
  WhatsApp media) and `assets/` (248MB) are committed. A fresh clone is slow. Not worth
  rewriting history over, but don't add to it — raw flyer dumps are gitignored now, and
  cleaned flyers go to `assets/flyers/<year>/` as `City_YYYY-MM-DD.ext`.

---

## Good first things to pick up

Ranked by "useful without needing the whole history in your head":

1. **Delete the SXSW callout** from `js/analytics.js`. Small, obviously correct, gets you
   through the run-QA-push loop once.
2. **Build the "Hot, New Clubs" strip.** Self-contained, visible, reuses an existing
   pattern. Highest value per hour on this list.
3. **Roster accuracy.** Walk the club list against the sheet and the hosts chat, fix what
   moved. Dull, always needed, immediately felt by users.
4. **The evergreen flyer flag** — touches `admin.html` + `admin-api.js` + the wall's date
   filter. Good way to learn the flyer path end to end.
5. **Passport breadth-vs-depth.** The interesting one, but read [`../PASSPORT.md`](../PASSPORT.md)
   fully first — there are decisions already made that shouldn't be relitigated.

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
