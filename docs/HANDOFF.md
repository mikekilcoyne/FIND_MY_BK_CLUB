# Handoff — Breakfast Clubbing

> Keep this file current. Update it before ending any session.
> Last updated: 2026-03-12

---

## What This Project Is

**breakfastclubbing.com** — a global directory of Breakfast Club meetups.
Static site. No build step. Hosted on Netlify. Data from a Google Sheet (CSV endpoint).

Run locally: `python3 -m http.server 8080` → open `http://127.0.0.1:8080`

---

## File Map

```
index.html              Main club list
calendar-view.html      Monthly calendar view
map-view.html           Interactive world map (untracked — ready to commit)

css/
  styles.css            Main styles (club list, layout, night edition, cards)
  responsive-framework.css  Shared breakpoints + spacing tokens
  calendar-view.css     Calendar-specific styles
  map-view.css          Map-specific styles (untracked)

js/
  script.js             Club list: CSV fetch, parse, render
  club-overrides.js     Curated overrides for specific clubs
  calendar-view.js      Calendar logic
  map-view.js           Map + trip planner logic (untracked)
  analytics-config.js   GA4 measurement ID
  analytics.js          GA4 event helpers

data/
  clubs-map.json        Map pin data (untracked)

docs/
  HANDOFF.md            ← You are here
  CONTRIBUTING.md       Contribution ground rules
  CODE_OF_CONDUCT.md    Conduct standards
  resources/
    mobile-guidelines.md  Layout + card rules (source of truth for UI)
    branding.md           Visual direction + copy tone
    ops.md                Deployment, data sources, workflow
```

---

## Current State (March 12, 2026)

### Live on main branch
- Club list with Google Sheets CSV data
- Calendar view
- Responsive framework (960px / 640px breakpoints)
- Night edition club styling
- "The Original BC" / Williamsburg flagship marker
- Animated global club count in header
- GA4 analytics hooks

### In working copy, not yet committed
- Mobile quick-actions row (Calendar + Map pill buttons in left rail)
- Mobile resources accordion (collapsed by default)
- Map box link in desktop left rail
- **All map view files** (`map-view.html`, `js/map-view.js`, `css/map-view.css`, `data/clubs-map.json`)

### Just implemented (this session)
- Club card layout — `.club-card` replaces the old `.club-row` flat layout
- Card styles: city headline block, subline (freq + venue + badges), host line, utility row
- `.flagship-card` for Williamsburg (warm tint, accent border)
- Badges: `.badge-tbd`, `.badge-night` replacing inline chips

---

## Urgent / Pending

### 🔴 SXSW Banner — MISSING (expires March 15)
The SXSW callout was removed at some point and is no longer in any file.
It must be restored before March 15, 2026.

**Requirements:**
- Top banner on homepage
- Auto-hide after March 15 based on JS date check (`new Date() > new Date('2026-03-15')`)
- Config-driven, not hard-coded
- Was previously date-gated in a prior commit — check git log for reference

### 🟡 Map view — commit-ready
All map files are built and tested. Needs a commit + PR.
Entry point: `map-view.html`. Data: `data/clubs-map.json`.
Features: Leaflet + MarkerCluster, region filter, city card (bottom sheet on mobile), "Feeling Lucky?" trip planner wizard.

### 🟡 Card layout — just built
CSS and JS implementation done this session. Needs visual QA at 1440 / 1024 / 390px widths before committing.

---

## Design Decisions

- **CSS vars:** `--paper`, `--ink`, `--line`, `--link`, `--rail` + night-edition variants in `:root`
- **Spacing grid:** 8px / 12px / spacing tokens in `responsive-framework.css`
- **Typography:** `clamp()` for all major headings
- **Club entries:** flex-column card layout — city (headline), subline (meta), host, utility row
- **Flagship:** Williamsburg `.flagship-card` = warm tint bg + gold border
- **Night edition:** dark gradient background, `--night-ink` text, adapted utility pills
- **Google Maps:** always kept intact as a label — never truncated
- **Social icons:** `renderSocialIcon()` in `script.js` returns `ig-icon-link` / `li-icon-link` anchor elements; styled via `.card-utility a` in card context

---

## Data

Club list data comes from a Google Sheet via CSV:
```
https://docs.google.com/spreadsheets/d/1HTp01deXz7TjPxXtM-a6tXhtUi40XX0K9U_LyLL1aUk/export?format=csv&gid=0
```
Curated overrides (cadence, time, host display, social links) live in `js/club-overrides.js`.
Map data is a separate static file: `data/clubs-map.json`.

---

## Phase 2 (Not Yet Built)

- MadLib Missed Connections (depth per event)
- Multi-city itinerary builder / trip route lines
- Save trip plan
