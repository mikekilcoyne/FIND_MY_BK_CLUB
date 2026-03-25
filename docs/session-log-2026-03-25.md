# Session Log — March 25, 2026

## What we locked today

V1 of the "What we talked about..." overlay is approved for now.

Key decisions locked:

- Full-screen cycling photo background
- Slow push-in motion on each shot
- Typed top line: `What we talked about...`
- Blinking caret remains visible after typeout completes
- Fixed title stack:
  - `BK Club [City]`
  - `[Venue] | [Cadence] | [Time]`
- Floating topic words appear one-by-one with a fast typeout treatment
- Hamptons preview is the reference composition for this phase

---

## Git state

- Ran `git fetch origin`
- Latest upstream base is `origin/main` at commit `93efd57d`
- V1 was saved locally on branch `codex/word-cloud-v1`
- V1 commit: `92f3d4cb` (`Add word cloud preview v1`)
- Nothing has been pushed yet

This matters because the current worktree still contains unrelated local edits that should not be mixed into the next implementation pass.

---

## Where this should live next

For the next push, this should be treated as a modular feature, not as a broad homepage restyle.

Recommended placement:

- Keep the visual system in:
  - `css/word-cloud.css`
  - `js/word-cloud.js`
  - `js/word-cloud-topics.js`
- Keep dedicated review routes in:
  - `word-cloud-preview-hamptons.html`
  - `word-cloud-preview-nj.html`
- Keep homepage integration limited to:
  - overlay mount in `index.html`
  - explicit trigger wiring in `js/script.js`

Meaning:

- the preview pages remain the safe sandbox for design iteration
- the live site only gets the minimum shared overlay entry points
- the feature should remain namespaced under `wc-` styles/classes so it does not leak into the rest of the site

---

## Recommended next implementation approach

Do not continue the next phase in this same mixed worktree.

Safer path:

1. Create a fresh worktree from `origin/main`
2. Bring over only the approved word-cloud V1 pieces
3. Re-test the feature against the latest live site styling
4. Decide whether launch version lives:
   - behind the existing "What we talked about" card CTA
   - or on a separate recap/club-story route first

Best current recommendation:

- keep it behind the club CTA first
- avoid turning it into a global ambient homepage treatment until the latest-site pass is stable

That gives the team a contained entry point and lowers the risk of style collisions with the main directory/list experience.

---

## Phase Two: data + photo system

Goal:

- support all clubs, even when BK Club does not yet have a bespoke photo asset ready

Recommended content waterfall:

1. BK Club supplied photo(s) for that city
2. Stored local asset manifest for approved club images
3. Placeholder location image for the city

For placeholder imagery, use something emblematic of the location:

- Milan: espresso bar / street / arcade mood
- Copenhagen: bikes / cafe / design-forward street
- Denver: mountains / cafe / morning light

Suggested implementation shape:

- add a city media manifest, for example:
  - `data/club-story-media.json`
- each city entry can include:
  - `photos`
  - `photoPositionY`
  - `attribution`
  - `placeholderQuery`
  - `placeholderSource`

The recap/topic pipeline should stay separate from the media pipeline:

- topics from Substack / BK Club updates
- photos from curated asset manifest or fallback provider

That split will make it easier to improve one side without destabilizing the other.

---

## Open product / engineering questions for Friday

Topics to discuss with Ben:

- Should this live only as an overlay from each club card, or should there also be a standalone recap page?
- Should placeholder imagery be manually approved per city, or can it be auto-selected from a provider?
- Do we want one hero image per club, or short rotating sets where assets exist?
- Should the live site pull only Substack recap topics, or also Instagram / LinkedIn captions when available?
- Where should club-owned media live long-term: repo assets, CMS, or another storage layer?

---

## Current recommendation

Design is locked enough for V1.

Next pass should focus on:

- clean integration on top of latest `origin/main`
- isolating the feature so it cannot disturb core site styling
- building the all-clubs media fallback system cleanly

No more visual tuning is needed before that integration pass unless feedback changes the direction.
