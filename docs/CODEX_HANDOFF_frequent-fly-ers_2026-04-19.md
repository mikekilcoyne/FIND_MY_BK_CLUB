# Frequent Fly-Ers Handoff

Updated: 2026-04-19 11:53:56 EDT

## What Changed

- Added a dedicated flyer wall page at [fly-er.html](/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB__main_recovery/fly-er.html).
- Added wall styling in [css/flyer-page.css](/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB__main_recovery/css/flyer-page.css).
- Added flyer wall logic in [js/flyer-page.js](/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB__main_recovery/js/flyer-page.js).
- Homepage feature callout in [index.html](/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB__main_recovery/index.html) now points into `fly-er.html`.
- Austin is restored and updated in [js/club-data.js](/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB__main_recovery/js/club-data.js), [js/club-overrides.js](/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB__main_recovery/js/club-overrides.js), and [data/clubs-map.json](/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB__main_recovery/data/clubs-map.json).
- Added the Austin flyer asset at [assets/flyers/austin-apr-26-2026.png](/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB__main_recovery/assets/flyers/austin-apr-26-2026.png).
- Linked in the external `BC Flyers 2026` folder via `assets/flyers/2026` symlink.
- Generated flyer manifest at [data/flyer-wall.json](/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB__main_recovery/data/flyer-wall.json).
- Restyled the flyer lightbox in [css/flyer-lightbox.css](/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB__main_recovery/css/flyer-lightbox.css) and [js/flyer-lightbox.js](/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB__main_recovery/js/flyer-lightbox.js).
- Added hand-drawn arrow asset at [assets/ui/handdrawn-arrows/arrow-right-drawn.png](/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB__main_recovery/assets/ui/handdrawn-arrows/arrow-right-drawn.png) and use mirrored left/right nav in the lightbox.
- Added textured wall treatment using [assets/ui/wwta-paper-texture.jpg](/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB__main_recovery/assets/ui/wwta-paper-texture.jpg).

## Current UX State

- Main page title is `Frequent Fly-Ers`.
- Subhead is `Scroll BC Fly-Ers from Across the Globe.`
- Flyer wall uses flyer images only.
- Large strip labels on the wall were removed because they were obscuring flyers.
- Clicking a flyer opens a fullscreen lightbox over the page.
- Lightbox has:
  - white textured paper background
  - slim thumbnail rail under the main flyer
  - city title centered on top of the flyer
  - title fades on hover and auto-fades on touch/mobile
  - hand-drawn image arrows for left/right navigation
  - softer flyer edges and a paper-like texture overlay on the flyer image
  - long city titles shrink down before hard cropping

## Verification Run

- `node --check js/flyer-page.js`
- `node --check js/flyer-lightbox.js`
- Local server running at `http://127.0.0.1:8082/fly-er.html`

## Likely Next Tweaks

- Fine-tune title scaling for especially long city names if any still feel too wide.
- Curate ordering / dedupe behavior in `data/flyer-wall.json` for repeated-city flyers.
- Decide whether `assets/flyers/2026` should remain a symlink or be replaced with copied assets for portability.
- Optional: soften or intensify the paper overlay on the fullscreen flyer image depending on visual review.

## Important Repo Context

- The worktree already had unrelated user changes before this flyer work. Do not blindly commit everything.
- Notable unrelated dirty files include:
  - `docs/host-email-template.md`
  - `netlify/functions/receive-club-update-email.js`
  - `netlify/functions/send-test-email.mjs`
  - `netlify/functions/weekly-host-reminder.js`
  - `package.json`
  - deleted `assets/polaroid-backdrops/polaroid-backdrop-08-blank-dark.png`

## Flyer Work File Set

- [fly-er.html](/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB__main_recovery/fly-er.html)
- [css/flyer-page.css](/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB__main_recovery/css/flyer-page.css)
- [js/flyer-page.js](/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB__main_recovery/js/flyer-page.js)
- [css/flyer-lightbox.css](/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB__main_recovery/css/flyer-lightbox.css)
- [js/flyer-lightbox.js](/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB__main_recovery/js/flyer-lightbox.js)
- [data/flyer-wall.json](/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB__main_recovery/data/flyer-wall.json)
- [js/club-data.js](/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB__main_recovery/js/club-data.js)
- [js/club-overrides.js](/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB__main_recovery/js/club-overrides.js)
- [data/clubs-map.json](/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB__main_recovery/data/clubs-map.json)
- [index.html](/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB__main_recovery/index.html)
