# Claude Hand-Off

## Read This First

Do **not** change direction, rebuild flows, or replace working features.

Work with what is already in this repo now:

- keep the current flyer wall implementation
- keep the current `Latest happenings...` card-button approach
- keep the current Polaroid / WWTA route
- do **not** invent a new WWTA page
- do **not** bring back fullscreen flyer lightbox behavior
- do **not** redesign badges/buttons from scratch

This needs finish/polish, not reinvention.

## Current Dev Context

- Repo: `/Users/mikekilcoyne/Desktop/_PROJECTS/Find_MY_BK_CLUB_main_recovery`
- Primary local preview: `http://127.0.0.1:8081`
- If the local server is down, restart it from repo root with:

```bash
python3 -m http.server 8081
```

## What Is Already Working

### 1. Fly-er Wall

The current wall is already switched to the poster-wall version, with:

- black / legible hero text
- no fullscreen lightbox
- scroll-first poster wall behavior
- updated poster assets wired into `data/flyer-wall.json`

Recent wall assets already added:

- Copenhagen
- San Francisco
- Denver
- London
- Los Angeles / Silverlake
- Vienna
- Austin

Files involved:

- `fly-er.html`
- `js/flyer-page.js`
- `css/flyer-page.css`
- `data/flyer-wall.json`

### 2. Latest Happenings Card Button

The old-style `NEW Latest happenings...` button is already restored on cards and routes into the original WWTA / Polaroid flow:

- `./what-we-talked-about.html?city=...&mode=polaroid`

This was intentionally put back using the existing visual language, not a new CTA system.

Files involved:

- `js/club-data.js`
- `js/script.js`
- `js/calendar-view.js`
- `css/club-card.css`
- `what-we-talked-about.html`
- `js/what-we-talked-about.js`

### 3. Badge / Pill Cleanup Started

The `NEW` visual system has already been pushed toward the same uppercase / spaced treatment as the `FLY-ERS` pill.

Files touched:

- `css/styles.css`
- `css/club-card.css`

## Source-Of-Truth Sheet Status

Live sheet:

- `https://docs.google.com/spreadsheets/d/1_4MoIXgSHjERztj0LPPC-XAa7nzFlfrdcjEQdBeSqto/edit?gid=105813476#gid=105813476`

As checked on **April 28, 2026**, the live CSV export currently returns **51 rows**, not 52.

Important sheet facts:

- `Austin` **is already in the sheet** and marked active.
- `Los Angeles` exists as a single row in the sheet.
- `LA East` is **not** currently a separate sheet row.
- The live LA row is still the older Venice / Westside setup upstream.

## Austin Status

Austin is already patched locally to stop being hidden and to use the newer Jo's Coffee setup.

Current locally confirmed Austin flyer:

- `BC_Austin_April26_Flyer.png`

That is the latest Austin flyer currently confirmed in the Drive-backed flyer folder.

If a newer Austin flyer exists, it was **not** present in the local Drive flyer folder when this hand-off was written.

## Los Angeles / LA East Status

Current intent:

- keep the sheet LA row as **LA West** / Venice
- add **LA East** as a separate local card
- show LA East with a **RETURNING** tag
- include LA East in the `New` filter bucket for now

What has already been done:

- `js/club-overrides.js`
  - existing LA row was changed to `LA West`
  - static LA East club data was added under `window.STATIC_CLUBS`
  - LA East is set with:
    - `displayCity: "LA East"`
    - `statusBadge: "Returning"`
    - `isNew: true`
    - `Lamill Coffee, Silverlake`

What is **not finished yet**:

- the **list view** still does **not** merge `window.STATIC_CLUBS`
- the **calendar view** already has a static-club merge path

Result:

- the homepage/list still shows **51 clubs**
- LA East is not yet appearing in the list
- once list-view static merge is added cleanly, the site should move toward the intended **52-club** state

## Word Cloud Status

This is the biggest remaining cleanup item.

The user wants the **word cloud functionality removed / hidden for now**, especially from the Polaroid route.

Important constraint:

- do **not** rebuild WWTA
- do **not** replace the Polaroid route with a new page
- do **not** rip out the existing overlay behavior blindly

Why this needs care:

- `what-we-talked-about.html` still loads the old `word-cloud.js` stack
- that stack is currently doing more than just the cloud visuals; it also helps power the working overlay behavior

Safe goal:

- keep `what-we-talked-about.html?mode=polaroid` working
- hide / disable the cloud-specific UI / layer
- preserve the Polaroid behavior already restored

Files to inspect carefully:

- `what-we-talked-about.html`
- `js/what-we-talked-about.js`
- `js/word-cloud.js`
- `js/word-cloud-topics.js`
- `css/word-cloud.css`

## Minimal Next Steps For Claude

### Priority 1

Finish the LA East list-view merge without rebuilding anything.

Specifically:

1. In `js/script.js`, add the same kind of `window.STATIC_CLUBS` merge that already exists in `js/calendar-view.js`.
2. Keep the merge minimal and data-shaped to match the existing list renderer.
3. Verify:
   - LA East appears
   - Austin remains visible
   - count updates from 51 toward the intended 52

### Priority 2

Hide/remove word-cloud functionality from the Polaroid flow without breaking the Polaroid flow.

That means:

- no new WWTA page
- no new architecture
- just suppress the cloud layer / cloud-only affordances

### Priority 3

Check badge consistency after LA East lands:

- `FLY-ERS` pill
- `NEW` filter pill
- `NEW Latest happenings...` badge
- `RETURNING` tag on LA East

Keep the typography / spacing consistent. Do not introduce a new badge language.

## Files Already Changed In This Pass

- `js/club-data.js`
- `js/script.js`
- `js/calendar-view.js`
- `js/club-overrides.js`
- `css/styles.css`
- `css/club-card.css`
- `data/flyer-wall.json`
- `what-we-talked-about.html`

## Final Reminder

Please **do not rebuild features**.

The user was specifically frustrated by earlier detours that replaced working patterns with new ones.

The right move from here is:

- finish the current implementation
- preserve the existing design language
- patch the missing pieces only
