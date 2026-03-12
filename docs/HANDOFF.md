# Handoff — Breakfast Clubbing

> Keep this file current. Update it before ending any session.
> Last updated: 2026-03-12 (session 2)

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
map-view.html           Interactive world map

css/
  styles.css            Main styles (club list, layout, night edition, cards)
  responsive-framework.css  Shared breakpoints + spacing tokens
  calendar-view.css     Calendar-specific styles
  map-view.css          Map-specific styles

js/
  script.js             Club list: CSV fetch, parse, render
  club-overrides.js     Curated overrides for specific clubs (single source of truth)
  calendar-view.js      Calendar logic
  map-view.js           Map + trip planner logic
  analytics-config.js   GA4 measurement ID
  analytics.js          GA4 bootstrap + SXSW callout (date-gated, expires 2026-03-15)

data/
  clubs-map.json        48 map pins — must stay in sync with Google Sheet count

.github/
  ISSUE_TEMPLATE/
    club-update.yml     Host submission form (GitHub Issues) — still active

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

### Live on main branch (committed this session)
- Club list with Google Sheets CSV data
- Calendar view with AT NIGHT badge fix
- Responsive framework (960px / 640px breakpoints)
- Club card layout — `.club-card` system (city, subline, host, utility row)
- Night edition + flagship card variants
- Mobile action row (Calendar + green Map+NEW buttons in left rail)
- Mobile resources hamburger (IG / weekly reminder / host kit)
- Interactive map view — Leaflet, region filters, city cards, trip planner
- "Next up" dates computed dynamically from schedule data
- 48 clubs in map (matches front page count); Austin SXSW pop-up included
- SXSW callout above top-bar on all breakpoints (auto-expires 2026-03-15)
- "Map View NEW" green CTA in desktop top-bar
- Squircle buttons (border-radius: 10px throughout)
- GA4 analytics hooks

---

## Post-SXSW Cleanup (after March 15)
- Remove Austin entry from `data/clubs-map.json` and `js/club-overrides.js`
- Update club count if Austin is not a permanent club
- `analytics.js` SXSW callout will auto-hide but the code can be removed after the event

## Deployment Notes
- Push to `main` → Netlify auto-deploys. No branch protection (solo project).
- QA locally first: `python3 -m http.server 8080`
- Rollback: Netlify dashboard keeps last 20 deploys, one-click restore.

## Host Submission
GitHub Issues template at `.github/ISSUE_TEMPLATE/club-update.yml` — still active.
Direct link: `github.com/mikekilcoyne/FIND_MY_BK_CLUB/issues/new?template=club-update.yml`
Surface this link somewhere on the site for hosts to find.

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

---

## Backlog: Email-to-Site Update Pipeline

**Concept:** Hosts email `set@breakfastclubbing.com` with freeform updates (new venue, new date, flyer, etc.) and it automatically creates a pending row in the Google Sheet for review before going live.

**Approved approach:**
- Review queue (not auto-publish) — updates land in a "Pending" tab, approved manually
- AI-parsed freeform — Claude API extracts structured data from natural language emails

**Stack:**
```
email → inbound email service → webhook → Netlify Function
      → Claude API (parse) → Google Sheets API (write pending row)
      → manual approval → site reflects on next load
```

**Inbound email provider: SendGrid** (confirmed via `dig MX pauseforshabbat.com` → `mx.sendgrid.net`)
Already in use on `pauseforshabbat.com`. Use the same SendGrid account — just add a new inbound parse route for `set@breakfastclubbing.com`.

**Netlify Function stack:** `@anthropic-ai/sdk`, `googleapis`, inbound email provider SDK.
**Environment vars needed:** `ANTHROPIC_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`, email provider webhook secret.
**Google Sheet:** add a "Pending" tab with columns: status, city, venue, date, host, notes, raw_email, received_at.
