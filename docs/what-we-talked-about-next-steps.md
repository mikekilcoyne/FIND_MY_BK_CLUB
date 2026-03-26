# What We Talked About — Friday Pickup Notes

## Current Branch

- branch: `codex/wwta-view-scope`
- base: `origin/main`

This branch is the clean latest-site implementation branch for the standalone `What We Talked About` view.

---

## What Is Already Built

The standalone view now uses the approved Hamptons V1 full-screen treatment on top of the latest live site:

- new route: `what-we-talked-about.html`
- new styles: `css/what-we-talked-about.css`
- new page logic: `js/what-we-talked-about.js`
- new Substack parser: `netlify/functions/fetch-substack-topics.js`
- new local recap snapshot: `data/wwta-substack-cache.json`
- media manifest stub: `data/wwta-media.json`

Homepage entry points were also added:

- top bar CTA
- left rail module
- mobile quick-action button

The page currently:

- loads club metadata from `data/clubs-map.json`
- renders the Hamptons-style full-screen recap layout
- supports previous/next club browsing
- supports club pill navigation
- keeps `What we talked about...` typed at the top with blinking caret
- types the topic words in sequentially as they populate
- cycles recap photos with the framed/blurred-polaroid treatment
- attempts live recap loading from the Netlify function first
- falls back to the local cached Substack snapshot on a plain static server
- currently matches roughly 30+ clubs from the Substack cache into the standalone local view

---

## What Is Not Done Yet

This is no longer just a scaffold, but it is still not the final feature.

Still needed:

- tighten city parsing / alias handling in the Substack parser
- improve topic cleanup for some noisy recap sections
- expand / tune photo positioning for individual clubs in `data/wwta-media.json`
- decide whether to hide clubs with weak recap text or keep them visible with photo-first treatment
- final decision on exact navigation placement after Ben feedback
- optional richer sourcing beyond Substack:
  - LinkedIn
  - Instagram
  - WhatsApp/manual host notes

---

## Important Branch Context

Approved V1 design work originally lived separately on:

- `codex/word-cloud-v1`

That branch contains the original approved Hamptons visual direction.

That direction has now been ported into this clean latest-site branch, so future work should continue here unless there is a reason to revisit the original experiments.

Keep treating this branch as the integration source of truth.

---

## Recommended Friday Conversation With Ben

Decide:

- where the standalone view should live in navigation long-term
- whether the label should remain `What We Talked About` everywhere, or shorten to `Recaps` on mobile only
- whether the page should open on:
  - latest recap
  - featured club
  - selected city from query param
- whether clubs without real recap data should:
  - appear with placeholders
  - or stay hidden until recaps exist

---

## Recommended Next Build Steps

1. Tighten the recap parser:
   - merge duplicate city variants such as `williamsburg 3 11 26`, `cph`, `db`
   - improve topic cleaning so shorter/high-signal phrases win

2. Expand `data/wwta-media.json` so all clubs have a media plan:
   - real photos where available
   - tuned `photoPositionY`
   - any city-specific photo-treatment overrides

3. Decide which clubs should ship in V1:
   - first 10–20 strongest recap/photo matches
   - or all matched clubs with weaker ones lower in the pill rail

4. Re-test placement and responsiveness at:
   - desktop
   - tablet
   - mobile

5. After Ben feedback, finalize homepage placement / copy:
   - `Latest Club Recaps`
   - `New feature: what we talked about. Try it now.`

---

## Current Goal For This Branch

Keep this branch focused on:

- latest-site-safe integration
- standalone recap view
- dynamic data/media plumbing
- the approved Hamptons full-screen visual system as the base framework for all clubs
