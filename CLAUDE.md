# Find My BK Club

Static site: plain HTML/CSS/JS, no build step. Netlify Functions + Netlify Blobs.
Deploy `npm run deploy`. Local preview: port 8083 (`.claude/launch.json` → `static`).

Design tokens are in `css/design-tokens.css` — Helvetica Neue Bold, ALL CAPS
headers, `#ffd700` accent. Square style (`css/square-style.css`): hard corners,
2px ink borders, offset block shadows. Don't hardcode these; reference the tokens.

**Working rule:** don't change direction, rebuild flows, or replace working
features. Finish and polish only. See `CLAUDE_HANDOFF.md` for open threads.

## Clubby

Chat-first mascot front door — `clubby.html` (visitor) and `clubby-admin.html`
(hosts). **If the task touches either file, or Clubby generally, read `CLUBBY.md`
first.** It has the current state, the design rules, the data sources, and the
prioritized feature list.
