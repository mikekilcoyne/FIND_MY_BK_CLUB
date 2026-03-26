# What We Talked About — Data Pull Plan

## Recommendation

Do not build this as an equal-weight scraper across every source.

Best source order:

1. Substack RSS as primary recap/topic source
2. LinkedIn links referenced inside Substack as secondary enrichment
3. Breakfast Clubbing Instagram as media support
4. WhatsApp as manual/export-only input

That gives us the fastest path to a solid first 10-20 clubs.

---

## What We Verified

Public feed:

- `https://breakfastindustries.substack.com/feed`

Latest public issue in the feed:

- `Breakfast Clubbing #97`
- published Monday, March 23, 2026

The issue description says BC is on in:

- Milan
- PDX
- Cambridge
- Toronto
- Hamptons
- Williamsburg
- Miami
- CDMX
- San Francisco
- Boston
- DC
- DTBK
- Manhattan
- Paris
- SOMa (New Jersey)

This gives us a clean first batch of 15 clubs from one current public source.

---

## Why Substack Should Be Primary

Substack is the strongest launch source because it is:

- public
- structured enough to parse repeatedly
- already organized around recap/report content
- often includes direct “we talked about” language
- often includes linked LinkedIn posts and inline images

That means one function can likely supply:

- topics by city
- source dates
- source URLs
- sometimes image URLs

without login-based scraping.

---

## Why LinkedIn Should Be Secondary

LinkedIn is useful, but best as enrichment, not primary ingestion.

Use it for:

- referenced source post URLs
- optional deeper recap copy
- host-level post attribution

Do not make it the first dependency because public access and structure are inconsistent.

---

## Why Instagram Should Be Secondary

Instagram is strongest for:

- photos
- visual tone
- occasional caption support

It is weaker for reliable structured recap ingestion.

Best use:

- manual or semi-manual media curation
- club photo sourcing
- occasional backup caption/topic signal

---

## Why WhatsApp Should Not Block Launch

WhatsApp is valuable, but not ideal as a launch-time live pull.

Problems:

- not public
- requires export or special access
- privacy risk is higher
- message structure will vary a lot by club

Best use:

- manual source for clubs where recap coverage is weak
- later import path via curated exports

---

## First Batch To Build

Recommended first 15 clubs from the latest public issue:

1. Milano, IT
2. Portland, OR
3. Cambridge, MA
4. Toronto, ON
5. New York — Hamptons, NY
6. New York — Williamsburg, NY
7. Miami, FL
8. Mexico City, MX
9. San Francisco, CA
10. Boston, MA
11. Washington, DC
12. New York — Downtown Brooklyn, NY
13. Manhattan / exact club mapping still needs confirmation
14. Paris, FR
15. Maplewood, NJ

This is the best starting set because it already exists together in one recent source.

---

## Data Model We Need

For each club:

- `cityKey`
- `displayCity`
- `topics`
- `sourceDate`
- `sourceType`
- `sourceUrl`
- `sourceLinks`
- `photos`
- `photoTreatment`
- `photoPositionY`
- `placeholderQuery`

Recommended split:

- dynamic recap payload from a Netlify function
- static photo/media strategy in `data/wwta-media.json`

---

## Next Implementation Steps

1. Add `netlify/functions/fetch-substack-topics.js` to the clean latest-site branch.
2. Make it return topics, dates, and source URLs keyed by city.
3. Seed `data/wwta-media.json` for the first 15 clubs.
4. Hook the standalone page to those 15 clubs first.
5. Expand coverage after the first batch feels editorially coherent.

---

## Product Constraint

Do not wait until every club is fully solved.

Better launch path:

- first 10-20 clubs with strong topic/media coverage
- then expand

That gets the feature reviewable much faster.
