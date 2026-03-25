# What We Talked About — Friday Pickup Notes

## Current Branch

- branch: `codex/wwta-view-scope`
- base: `origin/main`

This branch is the clean latest-site scaffold for the standalone `What We Talked About` view.

---

## What Is Already Built

The standalone view is scaffolded into the current live-site structure:

- new route: `what-we-talked-about.html`
- new styles: `css/what-we-talked-about.css`
- new page logic: `js/what-we-talked-about.js`
- new media manifest stub: `data/wwta-media.json`

Homepage entry points were also added:

- top bar CTA
- left rail module
- mobile quick-action button

The page currently:

- loads club metadata from `data/clubs-map.json`
- renders a standalone recap-view shell
- supports previous/next club browsing
- supports club pill navigation
- supports placeholder media treatment per city
- attempts live recap-topic loading from a future Netlify function, but falls back cleanly for now

---

## What Is Not Done Yet

This is still a scaffold, not the final feature.

Still needed:

- real recap-topic source via `fetch-substack-topics` function
- actual club photo coverage across all clubs
- final V1 design port from the saved word-cloud/overlay branch
- final decision on exact navigation placement after Ben feedback

The current page is mainly for local scoping and structure review.

---

## Important Branch Context

Approved V1 design work lives separately on:

- `codex/word-cloud-v1`

That branch contains the approved Hamptons visual direction.

This branch is intentionally based on latest `origin/main` so the feature can be integrated without losing or re-introducing older site issues.

When implementation resumes, the right move is:

- bring over only the approved design pieces from `codex/word-cloud-v1`
- not the whole experimental branch wholesale

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

1. Add the dynamic recap function:
   - `netlify/functions/fetch-substack-topics.js`

2. Port the approved V1 composition into the standalone page:
   - typed `What we talked about...`
   - city title
   - venue/cadence/time subhead
   - photo stage
   - animated topic reveal

3. Expand `data/wwta-media.json` so all clubs have a media plan:
   - real photos where available
   - placeholder query/curation where not
   - `photoTreatment` for consistent club-to-club styling

4. Add the synthetic polaroid treatment for raw group photos:
   - framed foreground image
   - blurred duplicate behind it

5. Re-test placement and responsiveness at:
   - desktop
   - tablet
   - mobile

---

## Current Goal For This Branch

Keep this branch focused on:

- latest-site-safe integration
- standalone view structure
- dynamic data/media plumbing

Keep visual lock decisions tied back to the approved V1 branch unless Ben wants the placement or framing strategy to change.
