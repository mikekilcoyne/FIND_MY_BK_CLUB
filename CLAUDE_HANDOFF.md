# Claude Hand-Off

## Read This First

Do **not** change direction, rebuild flows, or replace working features.
Finish/polish only. Same rule as before.

## Pass of June 10–11, 2026 (uncommitted, in working tree)

All changes below are **uncommitted** — preview at `http://127.0.0.1:8081`
(`python3 -m http.server 8081` from repo root), then commit what's approved.

### 1. 15 new flyers added (May–June 2026, from WhatsApp hosts-group export)

- New files in `assets/flyers/2026/` (clean `City_YYYY-MM-DD.jpg` names, resized ≤1200px)
- `data/flyer-wall.json`: 42 entries now. New entries carry a `"date"` field.
  The two raw-named entries (`00000545-…`, `00000578-…`) were replaced by
  `Amsterdam_2026-05-29.jpg` / `Torquay_2026-06-05.jpg` — the raw `00000…` files
  in assets are now unreferenced and can be deleted.
- Biarritz June flyer was converted from the PDF the host shared.

### 2. Fly-er wall static fallback (`js/flyer-page.js`)

- If `/.netlify/functions/get-public-flyers` fails (e.g. local dev), the wall now
  renders from `data/flyer-wall.json` via `loadStaticWall()`. Items get `localUrl`,
  which `createPoster`/`buildGalleryItems` prefer over the Netlify image proxy.

### 3. Easy to Share bar (`js/flyer-lightbox.js` + `css/flyer-lightbox.css`)

- Every flyer lightbox (wall + front page) now has a share bar under the stage:
  big WhatsApp-green **"Send to a Friend on WhatsApp"** (`wa.me/?text=`),
  **"Text It"** (`sms:?&body=`), **"Copy Link"** (clipboard, with "Copied!" state).
- Share payload = "Breakfast Club {city} — {meta}. Everyone's invited. Especially you." + absolute flyer URL.
- Styling: hard-shadow black-border buttons, uppercase Helvetica — in the existing language.

### 4. Front-page fly-er modal (`index.html`, `js/script.js`)

- `index.html` now loads `js/flyer-lightbox.js` (before `script.js`).
- The `#flyer-feature` callout button ("See the Latest Fly-Ers") opens the lightbox
  modal sorted newest-first instead of navigating away. Falls back to the wall page
  if the lightbox is missing. Manifest items now carry `flyerDate` for the sort.

## SESSION END STATE — June 11, 2026 (read this first next time)

- Everything through "blob merge for card Share Flyer" is COMMITTED AND PUSHED (live on breakfastclubbing.com).
- **One commit is LOCAL-ONLY, not pushed:** `Admin auth: ADMIN_EMAIL owner is always master…`
  (`netlify/functions/admin-api.js`). Push with:
  `git -C ~/Desktop/_PROJECTS/Find_MY_BK_CLUB_main_recovery push`
- **Open problem:** Flyer Dump in /admin rejected the owner's uploads with
  "Not authorized for this club." Root cause found: the owner's hosts.json
  entry shadows the env-var master in `getSession()`. The unpushed commit fixes
  this (ADMIN_EMAIL owner always gets master). After pushing, log out/in to
  /admin and retry the dump. If still blocked, verify `ADMIN_EMAIL` env var on
  Netlify matches the login email exactly.
- Flyers staged for upload: `~/Downloads/WhatsApp Chat - Breakfast Club Hosts (Global)/_FLYERS_READY_TO_UPLOAD/`
  (1_UPCOMING_AND_EVERGREEN first; filename convention City_YYYY-MM-DD works with admin auto-detect).
- Still owed: Lisbon flyer image file (exists only as a chat image; pop-up data
  is already in popups-sample.json + needs adding to the production pop-ups blob);
  "evergreen" checkbox in the admin upload form (blob flyers can't be flagged
  evergreen yet, so recurring-design uploads expire by date).

## Not Done Yet — Next Session

### Priority 1: "Hot, New Clubs" section under Pop-Ups (index.html)

- New strip below `#popup-strip`: coolest / most recent clubs + their flyers.
- Candidates from the chat: Honolulu (launch Jun 19), Brighton, Manila (new co-host),
  Milan (first BC), LA East (already in `window.STATIC_CLUBS` with `isNew: true`).
- Reuse popup-strip / club-card visual language. No new design system.
- Match each club to its newest flyer in `data/flyer-wall.json` where one exists.

### Priority 2 (carried over from previous pass)

- LA East list-view merge in `js/script.js` (calendar-view already merges `STATIC_CLUBS`).
- Word-cloud suppression on Polaroid route (careful — see notes in git history of this file).

### Production note

- Once these flyers are uploaded via `/admin` (Netlify blob store), the API path
  serves them; the static manifest stays as the dev/offline fallback. Avoid
  double-uploading the same 15 via admin *and* keeping manifest entries if that
  ever causes visible duplicates on the wall (API wins when it responds, so
  currently no duplication occurs).

## Files Changed In This Pass

- `data/flyer-wall.json`
- `js/flyer-page.js`
- `js/flyer-lightbox.js`
- `js/script.js`
- `css/flyer-lightbox.css`
- `index.html`
- `assets/flyers/2026/` (15 new files)
