# What We Talked About View Scope

## Current Base

This scope was created from `origin/main` / `main` at:

- branch: `codex/wwta-view-scope`
- base commit: `93efd57d`

This worktree is intentionally clean so the standalone view can be planned against the latest site without mixing in the saved V1 preview branch.

---

## Product Direction

`What We Talked About` should live as its own top-level view, similar to:

- `Calendar View`
- `Map View`

It should not be wired into each club card for launch.

That lowers implementation risk and gives the feature a clearer editorial identity.

---

## Recommended Route

Add a dedicated page:

- `what-we-talked-about.html`

With matching scoped files:

- `css/what-we-talked-about.css`
- `js/what-we-talked-about.js`

Recommended entry points in the UI:

- desktop top bar, alongside `Map View`
- left rail resource/module area, similar to `Calendar View` and `World View`
- mobile action row, as a third peer to `Calendar` and `Map`

Best label for now:

- `What We Talked About`

If the label feels too long in mobile UI, shorten only the button label, not the page title:

- mobile button: `Recaps`
- page title: `What We Talked About`

---

## Why This Is The Right Place

The current latest site already has a clean pattern for standalone alternate views:

- `map-view.html` + `js/map-view.js` + `css/map-view.css`
- `calendar-view.html` + `js/calendar-view.js` + `css/calendar-view.css`

So this new feature should follow the same structure rather than being embedded in `index.html` card logic.

That keeps:

- homepage club list simpler
- design experiments more isolated
- rollout safer

---

## Dynamic Data Requirements

The page needs two independent data layers:

1. club metadata
2. recap topics + media

### 1. Club metadata

Already available from the live site pipeline:

- Google Sheet CSV via existing front-end fetch
- static geographic fallback in `data/clubs-map.json`

Needed fields for this new page:

- `city`
- `displayCity`
- `region`
- `venue`
- `eventTime`
- `scheduleLabel`
- `upcoming_date`

This should reuse the same normalization/override logic as the main list and map view.

### 2. Recap topics

`origin/main` does not currently include the Substack parsing function.

For dynamic recap topics, add a Netlify function:

- `netlify/functions/fetch-substack-topics.js`

Job of that function:

- fetch Breakfast Industries Substack RSS
- parse city recap sections
- normalize city names
- return recent topics keyed by city
- optionally return source dates

This should be treated as the primary recap source for launch.

Future optional sources:

- Instagram captions
- LinkedIn post copy

But those should be phase-two or later, not required for the first standalone view.

---

## Photo System Recommendation

The page should support all clubs, even when bespoke BK Club media is unavailable.

Recommended media waterfall:

1. BK Club supplied photo set for that city
2. locally curated approved placeholder photo set for that city
3. generic location-based fallback image set

Recommended manifest:

- `data/wwta-media.json`

Each city entry can contain:

- `city`
- `displayCity`
- `photos`
- `photoTreatment`
- `photoPositionY`
- `attribution`
- `placeholderQuery`
- `placeholderSource`

Example conceptual shape:

```json
{
  "milan": {
    "photos": [
      "./assets/wwta/milan/group-1.jpg"
    ],
    "photoTreatment": "polaroid-frame",
    "photoPositionY": "20%",
    "placeholderQuery": "milan cafe morning",
    "placeholderSource": "manual"
  }
}
```

---

## Styling Rule For Photos

All group photos should use a consistent visual treatment across clubs.

Rule:

- raw group photo inside a synthetic polaroid-like frame
- blurred duplicate of the same image behind it
- same visual language as the existing Hamptons polaroids

This creates consistency even when source assets vary widely in quality and orientation.

So the media system should support at least these treatments:

- `native-polaroid`
- `polaroid-frame`
- `editorial-artwork`
- later: `journal-fill`

For launch, only these are necessary:

- `native-polaroid`
- `polaroid-frame`

---

## Page Behavior Recommendation

Launch version of the standalone page should:

- open on a featured city or latest recap
- allow left/right navigation between clubs
- load city title and meta dynamically
- load topic list dynamically
- load photo/media treatment dynamically

Recommended page structure:

1. page-level header/nav
2. hero recap stage
3. club selector or swipe/arrow navigation

The current V1 overlay design can be adapted almost directly into the hero recap stage.

Important difference:

- on the standalone page, the composition should be the page itself
- not a modal sitting above another page

---

## Implementation Strategy

### Phase 1

Build the route and dynamic data plumbing:

- new standalone HTML/CSS/JS files
- nav links added in existing shared UI
- dynamic club metadata loading
- dynamic Substack recap loading
- local media manifest with fallback support

### Phase 2

Port the approved V1 Hamptons composition into the standalone page:

- typed `What we talked about...`
- club title + subhead
- rotating photo stage
- type-on topic words

### Phase 3

Expand photo coverage across all clubs:

- real BK Club photos where available
- placeholder/location images where not
- synthetic polaroid frame treatment for non-polaroid images

---

## Open Questions For Friday

- Should the page default to the newest recap across all clubs, or a curated featured club?
- Should club navigation be by arrows only, or also via city picker / region filter?
- Do we want placeholder city imagery manually approved per location?
- Should the view include source attribution/date by default?
- Should clubs without recap topics still appear with a media-only placeholder state, or be hidden until topics exist?

---

## Recommendation

Proceed with a standalone `What We Talked About` page built on latest `origin/main`.

Do not wire launch through the club cards.

Use:

- shared dynamic club metadata
- new Substack topics function
- local media manifest with consistent polaroid-style treatment for group photos

That is the cleanest path to an implementation that feels editorial, dynamic, and maintainable.
