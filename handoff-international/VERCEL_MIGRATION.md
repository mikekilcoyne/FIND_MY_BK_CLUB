# Moving to Vercel — the plan

**Written 2026-11-19.** Companion to `README.md` §12 (the back-end debug pass).
Everything factual here was checked against the live sites, not assumed. Where
something depends on Greg's repo, which this has no access to, it says so
instead of guessing.

**Design:** the language settled on 2026-11-18 is the target — `zany-kit.css`,
`zany-preview.html`, `clubby-icon.svg`. `DESIGN-DELTA.md` lists what Greg's
build has to change to match it. Clubby already has a live trigger and panel
on the new site, so `clubby.html` in this repo is superseded as code (the
character and icon carry over).

**Decisions taken 2026-11-19, which this plan is now built around:**

1. **Supabase is the roster.** Not the Sheet. §5.1 is settled; what remains is
   getting the Netlify side onto it, which needs three fields it cannot see yet
   — see §5.1.
2. **The passport and the other half-finished features are for later.** They
   stay on Netlify, untouched, and nothing in this plan waits on them.
3. **Host confirmation happens through login on the new site**, and email
   login gets added alongside Google and Apple. Almost all of this turned out
   to be built already — see `HOST-CONFIRMATION.md`.
4. **The Clubby poster ships deliberately unfinished.** V1 gives someone
   info, text and texture to carry into Canva — roughly 80% of a poster. V1.1
   of the site is where that becomes 90–95%. See §6.1.

---

## 1. What this assumes

The public site lives on Vercel at `breakfastclubinternational.com`.
`breakfastclubbing.com` does not simply point at it, because three things on
the Netlify side cannot be moved by changing a DNS record. Those are in §3.

This is a sequence, not a switch. The honest version is that Netlify keeps
serving part of the product for months, and the job is to shrink that part
deliberately rather than discover what was still load-bearing after it 404s.

---

## 2. Where it actually stands

**Two back ends, drawing on the same original source.**

| | Netlify (`breakfastclubbing.com`) | Vercel (new) |
|---|---|---|
| Roster source | Google Sheet → `get-clubs` → CSV | Supabase `clubs` table |
| Auth | email + **4-digit PIN** | Google / Apple OAuth |
| Host surface | `/admin`, `/clubby-admin` | `/host` dashboard |
| Storage | Netlify Blobs (7 stores) | Supabase |
| Email | SendGrid, 2 cron functions | — |

**The finding that shapes everything below:** Supabase is not independent of the
Sheet. It is a copy of it.

```
Sheet rows where Active = Yes : 48
Supabase clubs (/api/discover): 48
Only difference: "CT" → "Fairfield County, CT"
```

48 for 48. The new site was seeded from the Master Sheet. That lone rename —
plus the `United States` country value that is `USA` on all 23 other US rows —
says it was seeded **once and hand-edited since**, not synced on a schedule. A
running sync would have overwritten the rename.

If that reading is right, you have two rosters drifting apart with nothing
reconciling them, and the drift is already visible in the country count. **§7
Q1 is the question that settles it, and it is Greg's to answer.**

---

## 3. The three things that must never 404

Not preferences. Constraints.

1. **`/passport?stamp=…`** — printed on **locked, read-only NFC tags** already in
   the world. They cannot be reprogrammed or reprinted. Whatever happens, that
   URL must resolve forever, **and the query string must survive the hop** — a
   redirect that drops `?stamp=` turns every tag into a blank passport.
2. **`/what-we-talked-about`** — linked from host reminder emails already sitting
   in inboxes.
3. **The starter-kit PDF** — same, and it is 25 MB, so it is a file move, not a
   copy-paste.

Everything else in this document is negotiable. These are not.

---

## 4. Inventory — what moves, what dies, what stays

### Functions (14)

**Port — the site breaks without them**

| Function | Does | Note |
|---|---|---|
| `get-clubs` | Sheet → CSV, email columns stripped | New, 2026-11-19. Obsolete if Supabase becomes the one roster — that is the point of §5.1 |
| `get-flyer` | serves a flyer from Blobs | **7 front-end call sites**, the most-used function here |
| `get-public-flyers` | flyer wall index | |
| `get-wwta` | "what we talked about" topics | |
| `get-popups` | pop-up events | |
| `live-club-overrides` | per-club overrides on top of the roster | |
| `submit-club-update` | host update form → SendGrid → human approval | 3 call sites. The moderation gate — keep the shape |
| `get-transit-estimate` | travel time, cached in Blobs | |

**Retire — do not port**

| Function | Why |
|---|---|
| `admin-api` | 626 lines of 4-digit-PIN auth. Vercel already has OAuth and `/host`. See §5.3 |
| `debug-blobs-env` | diagnostic, Netlify-specific |
| `log-clubby-miss` | Clubby never shipped — see §6 |

**Decide**

| Function | Question |
|---|---|
| `weekly-host-reminder` + `send-host-reminder-background` | Scheduled SendGrid mail. Vercel has cron, so this ports — but it is the one piece that sends to **every host**, so it moves last and gets tested against a real inbox |
| `receive-club-update-email` | Inbound email webhook. Whatever receives that mail has to be repointed |

### Blob stores (7)

`bk-flyers`, `bk-transit-cache`, `wwta-admin-topics`, `clubby-misses`,
`club-update-intake`, `host-email-config`, `admin-credentials`.

**Netlify Blobs has no Vercel equivalent.** Each becomes Supabase Storage, a
Supabase table, or Vercel Blob. `bk-flyers` is the one with real content in it
and the one `get-flyer` serves from, so it is the migration that matters;
`admin-credentials` should simply be deleted along with the PIN system.

### Pages

| Netlify | Vercel today | |
|---|---|---|
| `/clubs`, `/gallery`, `/host-guide`, `/start` | **200** | done |
| `/fly-er` | 308 → `/gallery` | already handled |
| `/passport` | 404 | §5.4, the hard one |
| `/what-we-talked-about` | 404 | must resolve — §3 |
| `/map-view`, `/calendar-view` | 404 | |
| `/flyers` | 404 (`/gallery` covers it) | check the URL is redirected |
| `/admin`, `/clubby-admin` | 404 | retiring anyway |
| `/clubby` | 404 both sides | §6 |

---

## 5. The sequence

### 5.0 — Finish what is in flight *(now)*

The security work in README §12 lands regardless of destination, because it is
live today:

- Set `SHEET_CSV_URL` on Netlify, deploy, confirm `get-clubs` returns CSV with
  no `Emails` column.
- **Google Sheet → File → Share → Publish to web → Stop publishing.** Do this
  one now. It kills the `/d/e/2PACX-…/pub?output=csv` link, which is the
  dangerous one: it needs no file ID, no sign-in, and it was printed in public
  source for anyone to find.
- Set `SUPER_ADMIN_EMAILS`.
- Fix the `United States` cell so the country count stops lying.

**Correction to earlier advice — do not set the Sheet to "Restricted" yet.**
README §12.10 step 3 says to flip both switches. That is wrong while Netlify
still reads the Sheet. `get-clubs` does a plain anonymous `fetch()`, which only
works while the file is link-readable; set it to Restricted and Google returns
its sign-in page, the function 502s, and the site falls back to the frozen local
snapshot. Not an outage — that fallback exists and works — but the roster
silently stops updating, which is the failure mode hardest to notice.

So the honest state of it:

| | Effect |
|---|---|
| Stop publishing to web | **Do now.** Kills the worst link. `get-clubs` unaffected |
| Share → Restricted | **Wait.** Breaks `get-clubs` until §5.1 lands |

Keeping link-sharing on is a partial fix and worth saying so plainly: the file
ID was in public client source until 2026-11-18 and is still in git history, so
"only someone with the URL can read it" is weaker than it sounds. It is better
than published-to-web and worse than closed.

**It stops being a compromise once §5.1 lands.** When `get-clubs` reads Supabase
instead, nothing in the serving path touches Google, and the Sheet can be set to
Restricted with no consequence at all. That is the reason §5.1 is the next task
rather than a tidy-up.

### 5.1 — Get Netlify onto Supabase *(decided — this is the next real task)*

Supabase is the roster. The Netlify side still reads the Sheet, so that is the
gap to close, and closing it is what finally lets the Sheet be locked down
properly (§5.0).

**`get-clubs` is the seam, and it was built to be swapped.** It returns CSV in
the shape `club-data.js` already parses, so the source behind it can change from
Sheet to Supabase without the front end knowing. Today: Sheet → CSV. Tomorrow:
Supabase → the same CSV. The client never changes again.

**What blocks it: three fields `/api/discover` does not expose.**

| Front end reads | `/api/discover` | |
|---|---|---|
| `city`, `venue_name`, `frequency`, `start_time`, `latitude`, `longitude`, `host_name` | ✅ | direct |
| `flyer_url` | `poster_url` | rename |
| `host_instagram`, `host_linkedin`, `host_linkedin_2` | `host_instagram_urls`, `host_linkedin_urls` | arrays |
| `whatsapp` | `whatsapp_url` | rename |
| `active` | — | implicit: the endpoint only returns active clubs |
| **`featured`** | **missing** | drives the featured strip on the home view |
| **`is_new`** | **missing** | drives the NEW badge — the tag you asked for |
| **`upcoming_date`** | **missing** | `schedule_rule` may cover it; needs checking |

`featured` and `is_new` are not cosmetic — `scripts/release-smoke-check.sh`
asserts both (`badge-featured`, `region-pill-new`), so they are load-bearing on
the home view today.

**The ask for Greg is small and specific:** add `featured`, `is_new` and
`upcoming_date` to `/api/discover`. They are almost certainly already columns on
the `clubs` table, since they came over in the seed from the Sheet. Then
`get-clubs` reads that endpoint instead of Google, and the Sheet is out of the
serving path entirely.

The alternative is giving `get-clubs` a Supabase service key and querying the
table directly, which avoids waiting on Greg but puts a second set of
credentials and a second schema assumption into this repo. Prefer extending the
endpoint.

### 5.2 — Read-only surfaces

`/map-view`, `/calendar-view`, `/flyers`. They read the roster and render; with
§5.1 done they read Supabase directly and the Netlify copies get redirected.
Lowest risk in the whole plan — no writes, no auth, no stored state.

### 5.3 — Retire the PIN system

**Do not port `admin-api`.** It was hardened on 2026-11-18 (rate limiting, super
admins) because it is live and was brute-forceable, not because it has a
future. A 4-digit PIN is weak however well rate-limited, and Vercel already has
Google and Apple OAuth working plus a `/host` dashboard.

The sequence: confirm `/host` covers what hosts actually do on `/admin` — club
details, flyer upload, WWTA entries, pop-ups — then move them across, then
delete `admin-api` and the `admin-credentials` store together.

**Check Supabase RLS on `host_applications` and `club_hosts` before this.** A
missing policy is the difference between "a host edits their own club" and "any
signed-in user edits any club", and it will not show up in the UI.

### 5.4 — The passport *(deferred, deliberately)*

**For later.** It stays on Netlify, untouched, and nothing else in this plan
waits on it.

That is the right call, and it costs almost nothing: `breakfastclubbing.com`
stays up for the §3 paths regardless, so the passport is already covered by a
site you are keeping. It is also the surface with the deepest back-end
dependency — `get-flyer`, `get-public-flyers`, `get-wwta`, `clubs-map.json`,
`flyer-wall.json`, `wwta-substack-cache.json` — and the only one with physical
objects pointing at it, so it is exactly the wrong thing to move while
everything else is in motion.

When it eventually moves: redirect `/passport*` with the query string preserved
and `status = 301`, and **test with a real tag**, not a typed URL. The tags
encode a specific format, and a dropped `?stamp=` or a 308-vs-301 is invisible
until someone taps one in a café.

Note that `clubs-map.json` is the *old* roster. Once §5.1 lands, the passport is
the last thing still reading it — worth knowing before it drifts further from
Supabase.

### 5.5 — Netlify becomes a redirect shell

The end state: `netlify.toml` and nothing else, holding the §3 paths and the
marketing redirects. Keep the domain and the site — never delete it. Those NFC
tags outlive every decision in this document.

---

## 6. Clubby

`clubby.html` is 404 on the live site and was untracked in git until
2026-11-19. **The visitor-facing front door has never shipped**, so there is
nothing to migrate — only a decision about whether it ships at all, and if so,
on which platform.

It works. It was exercised in-browser on 2026-11-19: city lookup, club card,
the no-club recruitment moment, correct voice. If it ships, ship it on Vercel
and skip the Netlify round trip entirely. `WHATSAPP_GROUP_URL` is still `""` —
guarded, so it degrades rather than breaking, but it wants the real link.

`clubby-admin.html` **is** live, and retires with the PIN system in §5.3.

---

## 7. What only Greg can answer

1. **Can `featured`, `is_new` and `upcoming_date` be added to `/api/discover`?**
   This is the one that unblocks everything — see §5.1. They are almost
   certainly already columns on `clubs`, since they came over in the seed.
2. **Does anything on Vercel still read the Google Sheet?** Supabase being the
   roster suggests not, and the `Fairfield County, CT` rename says it was seeded
   once rather than synced. Worth one sentence of confirmation before the Sheet
   is restricted at the end of §5.1 — the failure, if there is a sync, looks
   like nothing at all until the roster goes stale.
3. **What is the RLS policy on `host_applications`, `club_hosts` and
   `club_invitations`?** See `HOST-CONFIRMATION.md` §4 — the host confirmation
   model rests on who is allowed to call `create_club_invitation`.
4. **Does `/host` already cover the flyer upload and WWTA entry that hosts do on
   `/admin`?** That is the gate on §5.3. Note that `/host` turns out to be far
   more complete than assumed: it already has the full invite, co-host and
   club-editing surface. See `HOST-CONFIRMATION.md` §1.
5. **Where should `bk-flyers` live?** Supabase Storage is the obvious answer if
   Supabase is already in the stack.

---

## 8. Loose end found on the way

`js/word-cloud.js:1903` calls `/.netlify/functions/fetch-substack-topics`, which
**does not exist in this repo and 404s live**. It is properly wrapped in a
try/catch that falls back to curated topics, so nothing breaks and nobody would
ever notice — which is the problem. The word cloud has been running on the
curated list the whole time.

Either build the function or delete the call. A permanently-failing fetch that
silently degrades is the kind of thing that survives a migration and then gets
debugged at length two years later.
