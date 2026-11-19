# Hand-off → `breakfast-club-rebuild` (Greg's Vercel repo)

Everything in this folder is for the **new** site. I don't have access to that
repo, so these are drop-ins rather than commits. Checked against the live
deployment on **2026-11-18**.

Public alias that works without a Vercel login: **`breakfast-club-rebuild.vercel.app`**
(the `…-emtprnjd2-greg-woulfes-projects…` URL is behind deployment protection and
bounces to a Vercel login — don't share that one.)

| File | Goes to | What it does |
|---|---|---|
| `vercel.json` | repo root | redirect map, both directions |
| `zany-kit.css` | `app/` or `public/` | the 7 character elements |
| `zany.js` | `public/` | behaviour (vanilla, no deps) |
| `ZanyLayer.tsx` | `components/` | Next.js wrapper for `zany.js` |
| `clubby-icon.svg` | `public/` | egg + Tamagotchi-face chat icon |
| `zany-preview.html` | — | local demo, not for the repo |

---

## 1. Redirects — current state: nothing is mapped

Every old URL except `/` currently 404s on the new site. Measured:

| Old URL | Old site | New site today | Should be |
|---|---|---|---|
| `/` | 200 | 200 | — |
| `/index.html` | 200 | 308 → `/` | already fine |
| `/fly-er` | 200 | 308 → `/gallery` | already fine |
| `/map-view` | 200 | **404** | `/clubs` |
| `/calendar-view` | 200 | **404** | `/clubs` |
| `/typeout?city=X` | 200 | **404** | `/clubs?city=X` |
| `/flyers` | 200 | **404** | `/gallery` |
| `/journey-home` | 200 | **404** | `/start` |
| `/copy` | 200 | **404** | `/` |
| `/passport` | 200 | **404** | → breakfastclubbing.com |
| `/admin` | 200 | **404** | → breakfastclubbing.com |
| `/clubby-admin` | 200 | **404** | → breakfastclubbing.com |
| `/what-we-talked-about` | 200 | **404** | → breakfastclubbing.com |

`vercel.json` covers all of them.

### The domain model I'd argue for

**Don't repoint `breakfastclubbing.com` at Vercel wholesale.** It isn't just
marketing pages — it's the app:

- **Netlify Functions** (`/.netlify/functions/*`) — 10 of them: the admin API,
  club-update intake, flyer serving, the weekly host reminder cron.
- **Netlify Blobs** — flyers, host credentials, club updates. The data lives
  with the Netlify site.
- **`/passport`** — NFC stickers on café tables and printed QR codes point here
  (`/passport?stamp=<club>&via=nfc`). `PASSPORT.md` says tags are **locked
  read-only** so they cannot be rewritten. A 301 keeps them alive; a 404 kills
  them permanently.
- **`/what-we-talked-about`** and the **25 MB starter-kit PDF** — both linked
  from host reminder emails already sitting in inboxes.

So: **`breakfastclubinternational.com` → Vercel** (new front door),
**`breakfastclubbing.com` stays on Netlify** and redirects only its marketing
paths onward. Same user-facing result, none of the breakage, and no DNS move on
the domain that's carrying the backend. The Netlify side of that is already
written — see `netlify.toml` in this repo.

### DNS as it stands

- `breakfastclubbing.com` → Netlify (NS1 nameservers), **live**
- `findmybreakfast.club` → Netlify, 301s onward, **live**
- `breakfastclubinternational.com` → **still parked at Namecheap**
  (`192.64.119.117`), `www` is a Namecheap parking page. Nothing points at
  Vercel yet — this is the first thing to do.

---

## 2. Canonical URLs still say `breakfastclubbing.com` ⚠️

If the new domain is primary, this is wrong everywhere and will split SEO:

```
<link rel="canonical" href="https://breakfastclubbing.com"/>
<meta property="og:url" content="https://breakfastclubbing.com"/>
<meta property="og:image" content="https://breakfastclubbing.com/og-breakfast-club.png"/>
<meta name="twitter:image" content="https://breakfastclubbing.com/og-breakfast-club.png"/>
```

`sitemap.xml` lists six `breakfastclubbing.com` URLs; `robots.txt` has
`Host: https://breakfastclubbing.com`. All should become
`breakfastclubinternational.com`. Set it from one env var
(`NEXT_PUBLIC_SITE_URL`) rather than in six places.

Also: the footer links to `https://breakfastclubbing.com`. Once that domain
redirects here, that link becomes a **round trip back to the page you're on**.

Two routes are missing from `sitemap.xml`: `/start` and `/host`.

---

## 3. Wordmark → "breakfastclub international"

Current: `<span class="type-wordmark">breakfastclub</span>` — Instrument Sans,
weight 500, 24px, letter-spacing −1.2px.

Same face, weight shift to keep the lockup from shouting:

```html
<span class="type-wordmark">breakfastclub<span class="intl"> international</span></span>
```
```css
.type-wordmark .intl { font-weight: 400; opacity: .55; }
```

This matches Clubby's existing lockup, which is already `BREAKFAST CLUB` over
`INTERNATIONAL` (`CLUBBY.md` §2).

Also update `<title>` and the og/twitter titles. Header has `border-r pr-8` —
check the 992–1200px range, the longer wordmark gets tight.

---

## 4. Club roster — gaps

New site has **48**. `data/clubs-map.json` in the Netlify repo has **47**. They
are not the same 47/48.

**On the new site, missing from the data file:** Honolulu, Newcastle

**In the data file, missing from the new site:** `NY - UWS`
→ Almost certainly the **Manhattan** chapter (Heidi Hartwig), which is active —
20 mentions in the host chat, most recent 15 Oct 2026 ("Bfast club Manhattan
today!"). It should not have been dropped.

**Renamed:** `Melbourne - CBD, AU` → `Melbourne — Fitzroy`; `CT` → `Fairfield
County, CT` (the data file's label is literally `"CT"` — worth fixing there).

**In the host WhatsApp chat but on neither list** — all with evidence:

| Club | Evidence | RSVP |
|---|---|---|
| **Houston** | 10 Nov 2026: "Breakfast Club Houston coming December 16th!" | `luma.com/uwkr5daf` |
| **San Miguel de Allende** | Launched Oct 2026, recap posted 14 Oct | — |
| **LA Westside** | Active 16 Nov 2026: "LA Westside BC is this Friday, Nov 20" | — |
| **Austin** | Apr 2026: "So excited to host Austin"; flyer exists in repo | — |

Also mentioned, unconfirmed: Munich (Jan 2026 launch), Roma, Lisbon.

That's roughly **52–53 clubs**, not 48. Worth one pass with Ben before the
domain switch — the homepage headline number is the first thing people read.

**One more:** the homepage "Jump to a club" dropdown lists **47** while
`/clubs` lists **48** — **Miami is missing from the homepage picker.** The
region counts (11+26+2+2+6+1) sum to 48, so the dropdown is the odd one out.

### RSVP links

Seven Luma links and one Partiful in the chat. Suggest an optional
`rsvpURL` field per club; render a "Save a seat" button when present, nothing
when absent. The Netlify `clubs-map.json` has no such field yet — adding it
there first keeps one source of truth.

---

## 5. The zany kit

Seven elements, all in `zany-kit.css`. Pulled from the HINT deck and dialled
back, because the new site's clean aesthetic is the thing worth protecting.

1. **`.bc-hop`** — per-letter bounce. One headline only.
2. **`.bc-sticker`** — rotated badge. Hard corners + 2px ink border + offset
   block shadow (Breakfast Club's square-style, *not* the deck's pill).
3. **`.bc-scribble`** — handwritten aside that writes itself on when scrolled to.
4. **`.bc-doodles`** — margin marks. See below.
5. **`.bc-grain`** — paper texture over the page. Takes the edge off flat white.
6. **`.bc-tilt`** — poster cards straighten and lift on hover.
7. **`.bc-new-badge`** — the **New** flag over a flyer, e.g. Houston / Dec 16.
   Variants: `--soon` (teal), `--popup` (magenta).

**Doodles earn their place or they go.** Cut: star, arrow, plate — generic
decoration. Kept/added, all on-theme: two cups side by side (community),
croissant, coffee cup, steam, a wave hello (new in town), two speech bubbles
(conversation), heart. They sit in the **outer margins only**, at 0.45 opacity,
and are hidden below 860px where the margins disappear.

Install, plain HTML:
```html
<link rel="stylesheet" href="/zany-kit.css">
<script src="/zany.js" defer></script>
```
Next.js: import the CSS in `app/layout.tsx`, drop `<ZanyLayer />` in the body.

Everything stops under `prefers-reduced-motion`; static styling survives.

Open `zany-preview.html` to see it. In this repo:
`npx serve .` then `/handoff-international/zany-preview.html`.

---

## 6. Clubby icon

`clubby-icon.svg` — an egg with a cracked top, round glasses, dot eyes and a
smile. The egg doubles as the speech bubble (tail at bottom-left), which is the
detail that makes it read as chat rather than as breakfast. On hover the whole
egg scales and leans out past the button's edge — the spill-over — and the smile
widens; it blinks on its own every ~4s. Holds up down to 24px.

Shell colour is the `--bc-egg` token (default `#fffaf0`); outline and face are
`currentColor`. A warmer tan shell is a one-line override.

**Inline the SVG.** Through an `<img>` or a CSS mask it's a flat picture and the
hover behaviour can't reach inside it. Styles are in `zany-kit.css` §8.

**Note:** XML comments can't contain two consecutive hyphens, so the file's
header comment names the custom property in prose rather than writing `var(...)`
with the leading dashes. Writing it literally makes the file fail to parse when
served as a standalone `.svg` — an HTML parser tolerates it once inlined, so the
breakage only appears when something references the file by URL.

---

## 8. Functional audit — live site, 2026-11-18

Checked against `breakfast-club-rebuild.vercel.app`.

**Working:** no console errors on `/` or `/clubs`; search filters correctly
(`paris`→1, `new york`→6, `melb`→2); region chips work; the club dialog is a
native `<dialog>`, Escape closes it and focus lands on the close button;
mobile at 375px has **zero horizontal overflow and no tap target under 32px**.

### Bugs

1. **US clubs are split across two country labels.** 23 clubs say `USA`,
   one says `United States` (Fairfield County, CT). So searching "united
   states" returns **1 club instead of 24**, and "USA" silently omits
   Fairfield. One label, applied everywhere. (Same club whose label in
   `clubs-map.json` is literally `"CT"` — fix both.)

2. **"1 clubs match"** — needs pluralisation.

3. **Miami missing from the homepage "Jump to a club" picker.** `/clubs` lists
   48, the dropdown lists 47.

4. **LinkedIn links render the profile slug, not the person.** The Paris
   dialog shows the hosts correctly — "Lisa Ono, Karla Rodriguez, Fanny
   Leonard" — then links labelled `lisaonocreate` and
   `karla-rodríguez-c-a71935198`. See §7; the names are already in the data.
   Note there are **three host names but only two links**, so pairing by
   position will mismatch — pair explicitly.

5. **Probable dead LinkedIn URL.** `linkedin.com/in/karla-rodríguez-c-a71935198`
   contains a non-ASCII `í`. LinkedIn slugs are ASCII, so this is likely meant
   to be `karla-rodriguez-c-a71935198`. Worth clicking before shipping — I
   couldn't verify it, because LinkedIn returns the same response to automated
   requests whether or not a profile exists.

6. **Gallery is missing ~18 flyers.** The site serves 36; this repo's
   `flyer-wall.json` has 54 across 34 cities. Absent include **Barcelona,
   Lisbon, Honolulu, Amsterdam, Berlin, Biarritz, Manila, Seattle, Toronto,
   Panama City**. Lisbon is notable — there's a flyer for it and chat activity,
   but no club entry anywhere.

7. **Flyer filenames carry no city.** Most are `unknown-<timestamp>.jpg`, with
   the city only in `alt`. Fine for rendering, bad for maintenance — a flyer
   can't be traced back to its club without opening it.

### Note on `/start`

It's an OAuth wall — "Continue with Google" / "Continue with Apple", no form.
So host sign-in is **already partly built** on the new site. Worth knowing
before adding Supabase Auth: the decision may be about consolidating two auth
systems (this one, and the PIN-based Netlify admin) rather than building one.

---

## 9. Copy — "Find your club"

`Find a club` → **`Find your club`** everywhere it appears. One-to-one, spoken
to a person: "a club" is a directory, "your club" is an invitation, and the
second one is what the site is actually offering.

Places it appears on the live site:

- hero CTA on `/`
- footer link
- the `/clubs` page heading area
- `No club near you? Start one` at the foot of `/clubs`

**Carry it through, same principle:**

| Now | Suggested |
|---|---|
| Find a club | **Find your club** |
| Host a club *(nav, `/start`)* | **Start your club** |
| No club near you? Start one | **No club near you yet? Start yours** |

"Host a club" is doubly worth changing: it's second person *and* it drops the
jargon. Someone who has never done this doesn't yet think of themselves as a
host — they think about starting something. "Host" is what they become
afterwards. Flagging rather than assuming, since it renames a nav item.

Rendered lowercase per §5, these read as `find your club` / `start your club`.

---

## 10. The headline count — "53 clubs · 18 countries (and counting)"

**The 53 reconciles exactly.** 48 live + the five in §4: Houston, San Miguel de
Allende, LA Westside, Austin, and Manhattan (the dropped `NY - UWS`). That is
the number, and "and counting" is the right tail on it.

**The 18 does not follow yet, and the current 17 is already wrong.** Counted
off the live page:

| | |
|---|---|
| Distinct country labels rendered | **17** |
| After merging `USA` + `United States` | **16** |
| What the site says | *"48 clubs in 17 countries"* |

So the headline is inflated by the duplicate label from §8.1 — the same bug
that breaks the search also adds a phantom country. Real figure today is **16**.

And none of the five new clubs adds a country: four are USA, San Miguel is
Mexico, both already counted. So 53 clubs is still **16 countries** unless two
genuinely new ones land. The nearest candidate is **Lisbon (Portugal)** — it has
a flyer in `flyer-wall.json` and chat activity, but no club entry anywhere. That
would make 17.

Before publishing 18, either find the two new countries or the number inherits
the double-count. **Compute it from deduped country codes, not from distinct
label strings** — that's what let 16 read as 17 in the first place.

---

## 11. Host login — verified 2026-11-18

**It's Supabase OAuth and it's working.** Project `ktpldkgzngbieormqyau.supabase.co`.

| Provider | Result |
|---|---|
| Google | **enabled** — 302 to `accounts.google.com` |
| Apple | **enabled** — 302 to `appleid.apple.com` |
| GitHub | not enabled — *"provider is not enabled"* |
| (nonsense provider) | *"could not be found"* |

The last two rows are the control: the endpoint returns a **different** error for
a real-but-disabled provider than for one that doesn't exist, which is what makes
the two 302s above mean something rather than the endpoint redirecting for
anything it's handed.

**The callback route is real, not a stub.** `/auth/callback` 307s to
`/start?error=missing-code` when called without a code — it handles the failure
path, which most half-finished auth wiring doesn't.

**The app adapts to its domain by itself.** From the bundle:

```js
await supabase.auth.signInWithOAuth({
  provider,
  options: { redirectTo: `${window.location.origin}/auth/callback?next=${...}` }
});
```

`window.location.origin`, not a hard-coded host — so on
`breakfastclubinternational.com` it becomes
`https://breakfastclubinternational.com/auth/callback` with no code change.

### The one thing to do before the domain switch

Add the new domain to **Supabase → Authentication → URL Configuration**:

- **Site URL** → `https://breakfastclubinternational.com`
- **Redirect URLs** → `https://breakfastclubinternational.com/auth/callback`
  (keep the Vercel preview URL too, or preview deploys stop being able to log in)

If this isn't done, login doesn't error — it **silently redirects to the old Site
URL after a successful sign-in**, which is far more confusing to debug than a
hard failure.

I could not read the current allowlist from outside, and that's by design:
Supabase 302s to the provider regardless of `redirect_to` and only validates it
at the callback. A probe with a made-up domain was "accepted" too, so **do not
read that as the allowlist being open** — it just can't be tested from here.
Check it in the dashboard.

### Still unknown

What's behind the login — whether there's a host dashboard, and whether it
reads the same club data. That needs an actual signed-in session, which I
haven't done and wouldn't without you asking.

---

> **Design:** `DESIGN-DELTA.md` measures Greg's new Vercel design against what
> was settled on 2026-11-18. Most of the button/type decisions in this file do
> not survive it — read that first before rebuilding anything visual.
>
> **Where this is going:** `VERCEL_MIGRATION.md` holds the plan for moving to
> Vercel, written after the 2026-11-19 decisions (Supabase is the roster; the
> passport and other half-finished features wait; the Clubby poster ships at
> ~80% with Canva as the finishing step). Where it and this section disagree,
> the migration plan is newer.

## 12. Back-end debug pass — 2026-11-18

A full sweep of the Netlify back end, Clubby, the roster pipeline and the host
login. Everything below was reproduced against the live site or the real code,
not inferred. Fixes applied in this pass are marked **FIXED**; things only you
can do are marked **NEEDS YOU**.

### 12.1 Host email addresses were public — three separate ways

This is the serious one, and it is also the direct answer to "how do we stop
strangers tweaking clubs", because it turned out the two halves of that question
are the same question.

| # | Where | Exposed | Status |
|---|---|---|---|
| 1 | `https://breakfastclubbing.com/data/clubs-map.json` | 27 host emails | **FIXED** |
| 2 | `https://breakfastclubbing.com/netlify/functions/send-host-reminder-background.js` | 41 host emails in `FALLBACK_HOSTS` | **FIXED** (path now 404s) |
| 3 | The published Google Sheet, whose URL was in that public source | **75 host emails** | **NEEDS YOU** |

**Why #2 happened.** `netlify.toml` sets `publish = "."`, so the whole repo root
is served as static files. That includes `netlify/functions/`, which is *not*
where functions are invoked from (that is `/.netlify/functions/`, with the
leading dot). So the entire server source was downloadable — `admin-api.js` came
back 200 at 29 KB. Verified before the fix:

```
/netlify/functions/admin-api.js                      200  29022B
/netlify/functions/send-host-reminder-background.js  200  (41 host emails)
/scripts/import-whatsapp-export.mjs                  200  14053B
```

That gave away the admin auth scheme, the owner's master email, every action
name and its role gate, the Blobs store names — and the Sheet URL.

**#3 is the one that still needs doing.** The URL was a Google "publish to web"
CSV link, which needs no Google sign-in at all. Confirmed still open:

```
GET .../pub?output=csv   ->  200, text/csv, 14153 bytes, 75 distinct emails
```

10 of those hosts are EU/UK (Amsterdam, Barcelona, Bassano, Biarritz,
Copenhagen, London, Lugano, Milano, NY-LES, Paris), which makes this a GDPR
matter, not just an untidiness one.

**Do NOT just restrict the Sheet — read 12.9 first.** The front end fetches it
from the browser, so locking it without preparing the fallback takes the map and
calendar down. The safe sequence is in 12.9.

Once that is prepared: **File → Share → Publish to web → Stop publishing**. Do
not also set **Share** to "Restricted" yet — see 12.10 step 3 and
`VERCEL_MIGRATION.md` §5.0; it breaks `get-clubs` until the Netlify side reads
Supabase. Link-sharing stays on for now, which is a partial fix and known to be
one. Then put the URL in Netlify
→ Site settings → Environment variables as `SHEET_CSV_URL`. The hardcoded
fallbacks are gone from the source, so with it unset the reminder functions fall
through to `FALLBACK_HOSTS` rather than to a public URL. They keep sending; they
just stop picking up Sheet edits.

Note that the emails remain in git history and in already-deployed bundles.
Rotating what is secret here is not possible — you cannot change people's email
addresses — so closing the paths is the whole of the available fix.

### 12.2 The admin PIN was brute-forceable — **FIXED**

The credential is `<email>:<4-digit PIN>`, and four digits is enforced
server-side (`/^\d{4}$/` at `add_host`). That is 10,000 possibilities. There was
no rate limiting, no lockout, and Netlify Functions provide none by default. The
email half was not secret — see 12.1.

So the whole attack was: fetch `clubs-map.json`, pick a host, try 0000–9999.
Average 5,000 requests, which is minutes of scripted traffic. The owner's own
address is in that file too, and `ADMIN_PIN` is also four digits, so the master
account was reachable the same way — every club, plus pop-ups and host records.

`admin-api.js` now freezes an address for 15 minutes after 5 failed attempts
inside a 15-minute window, returns 429 with `Retry-After`, and emails you when a
freeze trips. That turns an exhaustive search from roughly 20 minutes into
roughly 500 hours.

Two deliberate choices worth knowing:

- **The freeze is checked before the PIN is compared.** Checking after would
  still let an attacker learn a correct PIN on the attempt that trips it.
- **It is keyed on email, not IP.** An IP key is trivially evaded from a botnet.
  The trade-off is that someone who knows a host's address can keep that host
  locked out in 15-minute windows. That is a nuisance; takeover is not.

Tested against the real handler with an in-memory Blobs stub — 13 assertions,
all passing, including the two that actually matter: a **correct** PIN on a
frozen account still gets 429, and a valid master credential still authenticates
and reaches action dispatch.

**Still worth doing:** 4 digits is weak even rate-limited. 6 digits is a
one-character change to that regex plus the `maxlength` attributes in
`admin.html` and `clubby-admin.html`. Separately, `admin.html` stores
`email:PIN` in `localStorage` when "remember me" is ticked, so it survives
indefinitely and any XSS on the origin reads it. `clubby-admin.html` is better
behaved — `type="password"`, never persisted.

### 12.3 The next deploy would have deleted 41 live images — **FIXED**

41 tracked asset files were deleted in the working tree: 17 flyers in
`data/flyer-wall.json`, 24 club photos in `data/club-story-media.json`, 3 of
them also referenced straight from JS. **Every one was still referenced**, and
all 41 were still live on the deployed site (spot-checked, 200).

`npm run deploy` is `netlify deploy --prod`, which uploads the **working
directory**, not git. So the next deploy would have taken out the flyer wall and
most of the club photos, and the only clue would have been broken images.

Restored from HEAD. `data/flyer-wall.json` and `data/club-story-media.json` now
have **zero** broken asset references. Worth a glance at what deleted them —
nothing in the repo does this, so it looks like a manual or external cleanup.

### 12.4 The release gate was failing for the wrong reason — **FIXED**

`npm run check:release` called `rg --pcre2` directly. ripgrep is not installed
here, and with `set -e` on and each check exiting 1, the script died on check #1:

```
[fail] Home view still renders featured badges
       Missing pattern in js/script.js
```

Which reads exactly like a real regression in the home view. It was not — the
matcher was missing. The script now picks `rg`, then `grep -P`, then `perl`, and
exits 2 with a clear message if it has none. Both the `grep` and `perl` paths
verified: **19/19 checks pass** on each. Nothing was actually broken in the site;
the gate had just stopped being able to tell you that.

### 12.5 Clubby — working, with one fix

Exercised in the browser against the local server. The chat renders, a city
lookup works end to end ("Paris" → club card with map, flyer and RSVP), and the
flyer resolves to a real file.

**Fixed: the RSVP button had become a loop.** Removing host emails (12.1) meant
`rsvpURL` fell through to `c.link || "map-view.html"` — and 26 of those 27 clubs
have `link` set to the Breakfast Club homepage. So "Host / RSVP" would have
reloaded the page you were already on. There is now a `rsvpLinkFor()` helper
that treats a bare homepage link as no link and falls back to a prefilled mail
to HQ with the club and host named. Verified in the live DOM: the Paris card's
RSVP is a real `mailto:` and no card links back to the homepage.

Clubby's copy was updated to match, because `rsvpAnswer()` claimed the button
"opens a note straight to <host>" — it must not promise a line it no longer has.

**The better fix, when there is time:** a relay function in the shape of
`submit-club-update.js` (form → function → SendGrid), so a visitor can write to
the host without the address ever reaching the browser. That restores the
original behaviour properly instead of routing through HQ.

**Not a bug:** `WHATSAPP_GROUP_URL` is still `""` in `clubby.html`, but it is
guarded — empty routes people to the host instead of rendering a dead button.
Paste the `chat.whatsapp.com` link when you want the direct path back.

### 12.6 The roster now lives in two places

This changes what "make sure all the clubs are in there" means.

The new site does **not** read `data/clubs-map.json`. It reads Supabase, served
through a public endpoint:

```
GET https://breakfast-club-rebuild.vercel.app/api/discover  ->  48 clubs
```

Tables in the bundle: `clubs`, `events`, `club_hosts`, `host_applications`.
So editing `clubs-map.json` no longer affects the new site at all — that file now
only drives the Netlify app surface (passport, Clubby, map view). **Any club you
add has to be added in the Sheet or in Supabase, not in the repo.**

The payload carries `host_name`, `host_instagram_urls` and `host_linkedin_urls`,
all of which are already public on the site, and **no** emails or phone numbers.
That endpoint is clean.

Three rosters, counted:

| Source | Clubs | Countries |
|---|---|---|
| New site (`/api/discover`) | 48 | 16 real (17 labels) |
| Google Sheet, `Active` ≠ No | 50 | 17 |
| `data/clubs-map.json` | 47 | — |

The live site is exactly the Sheet rows where `Active` is `Yes`, so the pipeline
is consistent. Two things make the numbers look wrong:

- **`Fairfield County, CT` has `Country` = "United States"** where the other 23
  US clubs say "USA". That one row is why a naive count says 17 countries. It is
  a one-cell fix in the Sheet.
- Six Sheet rows are held back: **New York – Upper West, Norwich, Las Vegas,
  Austin, Boulder, Philadelphia** (all `Active = No`), plus **Riyadh** and
  **New York – Ellenville** with `Active` blank.

**Houston, San Miguel de Allende and LA Westside are in none of the three.** They
exist only in the WhatsApp chat, so they need adding to the Sheet from scratch.

### 12.7 About "53 clubs · 18 countries"

53 is reachable. **18 is not.**

- **Clubs:** 48 live + 5 of the 6 held-back rows = 53. Or add the three
  WhatsApp-only clubs and activate two. Several routes get you there.
- **Countries:** after fixing the Fairfield cell, the live set is **16**.
  Activating **Riyadh** adds Saudi Arabia → **17**. Every other pending club is
  in a country that is already counted (Norwich/UK, Las Vegas, Austin, Boulder,
  Philadelphia, Houston, LA Westside all USA; San Miguel de Allende is Mexico).

So the highest honest number today is **17**, and only with Riyadh live. The
nearest truthful headlines:

- **"48 clubs · 16 countries"** — exactly what is live right now
- **"53 clubs · 17 countries"** — activate 5 held-back rows including Riyadh
- **"53 clubs · 18 countries"** — needs a club in one more country

Flagging it rather than quietly shipping 18, because the roster is public and
countable: anyone can open `/api/discover` and get 48.

### 12.8 Host dashboard — it exists

`/host` returns 200 and renders "Host dashboard", client-side, gated after load
("Loading dashboard…" is all an unauthenticated fetch gets). `/admin` is 404 on
the new site. The page shell being public is fine **provided** Supabase RLS is
what gates the data — that is the thing to confirm in the dashboard, since it
cannot be checked from outside without signing in.

`host_applications` and `club_hosts` are the tables to check RLS on first. A
missing policy there is the difference between "hosts edit their own club" and
"any authenticated user edits any club", and it will not show up in the UI.


### 12.9 Correction — the Sheet fix is not as simple as 12.1 first said

Found while reviewing the diff before committing, and it contradicts the
instruction above, so it is written out rather than quietly patched in.

`js/club-data.js` — **client-side, public by definition** — hardcodes the same
Sheet CSV URL and fetches it straight from the visitor's browser:

```js
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1_4MoIXg…/export?format=csv&gid=105813476";
…
const sheetRes = await fetch(SHEET_CSV_URL);
```

Two consequences, both of which change the advice in 12.1:

**1. Blocking `/netlify/*` did not close the Sheet leak.** It closed one route to
the URL. The front end still hands the same URL to every visitor who loads the
site, and the Sheet still carries the `Emails` column. Restricting the Sheet is
not *a* fix for that path — it is the *only* fix.

**2. Restricting the Sheet, on its own, breaks the site.** `fetchSheetRows()`
falls back to `./data/clubs-sheet-local.csv` when the Sheet fetch fails — a good
design, except:

```
data/clubs-sheet-local.csv   — does not exist on disk
GET /data/clubs-sheet-local.csv  → 404
.gitignore:4: *.csv          — so it could not ship even if it did
```

So the fallback throws, and club data fails to load on the map and calendar
views. Had you followed 12.1 as originally written, the site would have gone
down and the cause would have looked unrelated.

**The safe sequence, either way you go:**

*Quick, same day:* export the Sheet to `data/clubs-sheet-local.csv` **with the
`Emails` column deleted**, add `!data/clubs-sheet-local.csv` to `.gitignore` so
it actually deploys, confirm it is live, and only then restrict the Sheet. Club
data then goes stale until someone re-exports — acceptable for days, not months.

*Proper:* a `get-clubs` function that fetches the Sheet server-side using
`SHEET_CSV_URL` and strips `Emails` before returning it, with `club-data.js`
pointed at the function instead of at Google. Same shape as the other read
functions in `netlify/functions/`. Live updates continue, the URL never reaches
a browser, and the emails never leave the server. This is the one to build.

**Built 2026-11-19 — see 12.10.** The proxy is in, so the Sheet can now be
locked down.

### 12.10 The proxy — built, and what you do now

`netlify/functions/get-clubs.js` fetches the Sheet server-side off
`SHEET_CSV_URL` and removes email columns before responding. `js/club-data.js`
now points at `/.netlify/functions/get-clubs` instead of at Google, so the Sheet
URL never reaches a browser.

It returns CSV rather than JSON on purpose: `club-data.js` already has a parser
and every caller downstream expects that shape, so the client change is one
line instead of a rewrite of working code.

Three details worth knowing:

- **It drops any column matching `/e-?mail/i`, not a fixed list.** A
  `Host_Email_2` added to the Sheet next year is caught automatically. The cost
  of missing one is publishing personal data, so it errs toward dropping.
- **It also redacts addresses found in other columns.** Someone writing "reach
  me at x@y.com" into `Host_Bio` would otherwise sail straight through. The
  address is replaced, the surrounding text kept.
- **Google returns its sign-in page as a 200 with HTML**, not an error, when a
  Sheet is private. The function detects that and fails rather than handing the
  client a CSV parse of a login screen.

**The fallback now exists.** `data/clubs-sheet-local.csv` is generated by
`scripts/snapshot-clubs.mjs`, which reuses the same `stripEmails()` the function
uses — two copies of that logic would eventually disagree, and the way they
would disagree is one of them publishing addresses. The script refuses to write
the file if an address survives. `.gitignore` had `*.csv`, so it now carries an
explicit `!data/clubs-sheet-local.csv`.

That fallback also fixes local development: a static preview runs no functions,
so `/.netlify/functions/get-clubs` 404s and the snapshot takes over. Verified in
the browser — the calendar view reports "58 clubs loaded from local snapshot"
and renders 84 occurrences, with no addresses anywhere on the page.

**What you do now, in order:**

1. Netlify → Site settings → Environment variables →
   `SHEET_CSV_URL` = the Sheet's CSV export URL.
2. Deploy. Check `/.netlify/functions/get-clubs` returns CSV with no `Emails`
   column, and that the map and calendar still fill.
3. **Publish to web → Stop publishing.** Do this one now; it kills the
   `/d/e/2PACX-…/pub?output=csv` link, which needs no file ID and no sign-in.

   **Do NOT set Share → Restricted yet** — superseded by `VERCEL_MIGRATION.md`
   §5.0. `get-clubs` fetches the Sheet anonymously, so restricting it makes the
   function 502 and the site falls back to the frozen snapshot: no outage, but
   the roster silently stops updating. Restricted becomes safe once `get-clubs`
   reads Supabase instead (migration plan §5.1).
4. Re-run `node scripts/snapshot-clubs.mjs` after meaningful Sheet edits. It
   only surfaces when the function is down, so a little stale is fine; months
   stale is not.

Tested: 22 assertions against the real Sheet export — all 75 addresses gone,
1245 surviving cells byte-identical to the source, quoted commas and escaped
quotes intact, and an address planted in a non-email column redacted.

One cosmetic wart: running the snapshot script prints a
`MODULE_TYPELESS_PACKAGE_JSON` warning, because the functions are ESM and
`package.json` has no `"type": "module"`. Adding it would silence the warning
and nothing in the repo uses CommonJS, but it changes module resolution for the
whole project, so it was left alone rather than bundled into a security fix.
