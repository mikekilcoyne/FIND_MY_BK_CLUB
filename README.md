# Find My Breakfast Club

Community-maintained directory for Breakfast Club meetups.

## Live Site
- Production domain: `https://findmybreakfast.club`

## Local Development
1. `cd /Users/mikekilcoyne/Desktop/BK_CLUB_V2`
2. `python3 -m http.server 8080`
3. Open `http://127.0.0.1:8080`

## Project Structure
- `index.html` - main site
- `styles.css` - visual styling
- `script.js` - data fetch, rendering, rules/overrides
- `copy.html` - simple copy editor
- `copy.js` - stores copy changes in browser local storage
- `breakfast-club-starter-kit-hosts.pdf` - host CTA download

## Data Source
- Primary data comes from the Google Sheet CSV configured in `script.js`.
- Stable updates can be set in `CLUB_OVERRIDES` inside `script.js`.

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
Domain is expected to be `findmybreakfast.club` via Namecheap DNS.
See deployment notes below for setup steps.
