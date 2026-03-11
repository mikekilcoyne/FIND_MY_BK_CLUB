# Find My Breakfast Club

Community-maintained directory for Breakfast Club meetups.

## Live Site
- Production domain: `https://breakfastclubbing.com`

## Local Development
1. `cd /Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB`
2. `python3 -m http.server 8080`
3. Open `http://127.0.0.1:8080`

## Project Structure
- `assets/` - public static assets (`.pdf`, `.png`, `.svg`)
- `css/` - page styles and responsive framework
- `js/` - client-side logic and shared overrides
- `docs/` - project docs and style guide
- `private/` - local-only sensitive files (git-ignored, not deployed)
- `index.html` - main club directory page
- `calendar-view.html` - standalone calendar page
- `copy.html` - simple local copy editor

## Data Source
- Runtime data comes directly from the Google Sheet CSV endpoints in `js/script.js` and `js/calendar-view.js`.
- Curated stable updates are set in `js/club-overrides.js` and shared by list + calendar views.
- Sensitive exports (host contacts, raw CSV snapshots, etc.) must stay in `private/` and are never committed.

## Free Analytics Setup (GA4)
- Analytics runtime lives in `js/analytics.js` (loaded on main + calendar pages).
- Set your free GA4 Measurement ID in `js/analytics-config.js`:
  - `window.BK_GA4_ID = "G-XXXXXXXXXX";`
- If the ID is blank, analytics stays disabled automatically.
- Tracked events include:
  - Opening calendar view from main page
  - Calendar month navigation
  - Calendar day selection
  - Google Maps link clicks in calendar day cards

## Recent Tweaks
- Added animated global count headline (`X clubs worldwide (and counting)`).
- Added standalone `Calendar View` page with month navigation and day-level details.
- Added Google Maps + host contact details in calendar day cards (IG-first, email fallback).
- Moved left-rail messaging and simplified mobile chrome for cleaner presentation.
- Added shared responsive framework + style guide for future UI iteration.

## Community Contribution Workflow
1. Open an issue for club updates/fixes.
2. Create a branch.
3. Make a focused change (venue, host, cadence, socials).
4. Open a PR using the PR template.
5. Include source links (sheet row, recent newsletter, or host confirmation).

## Netlify Deployment
This repo is configured for static Netlify hosting.

- Build command: *(none)*
- Publish directory: `.`
- Config file: `netlify.toml`

## Domain
Domain is expected to be `breakfastclubbing.com` via Namecheap DNS.
See deployment notes below for setup steps.
