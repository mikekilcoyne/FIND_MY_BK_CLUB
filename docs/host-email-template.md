# Host Email Template

Source of truth for the weekly host reminder / update email.

Use this file to:
- update the intro copy
- swap in a new article
- change the featured club / announcement
- update CTA labels and links
- keep the footer and `p.s.` consistent across sends

## Current Send

### Subject

`Breakfast Club reminder — update your club listing`

For multi-club hosts:

`Breakfast Club reminder — update your club listings`

### Link Slots

- `ARTICLE_URL`: `https://www.nytimes.com/2026/03/23/t-magazine/nyc-creative-scenes.html`
- `LATEST_HAPPENINGS_GIF_URL`: `https://breakfastclubbing.com/assets/LATEST_HAPPENINS.gif`
- `MASTER_SHEET_LINK`: `https://docs.google.com/spreadsheets/d/1_4MoIXgSHjERztj0LPPC-XAa7nzFlfrdcjEQdBeSqto/edit`
- `FLYER_FOLDER_LINK`: `https://drive.google.com/drive/folders/1RghGzP25aW2chs1aPGxAzE9fZgFHucRe`
- `BC_INTERNATIONAL_EMAIL_URL`: `TODO`
- `FLYER_UPDATE_LIST_URL`: `TODO`

### Body Copy

```md
Hey hosts,

Every week, I read something that reminds me what we're building together as a BC community around the world is not only meaningful, but necessary.

This week, it was this piece in T Magazine: [Have You Found Your Microscene?](https://www.nytimes.com/2026/03/23/t-magazine/nyc-creative-scenes.html)

Stoked that we're helping create those micro-scenes around the globe.

Newest micro-scene:
NYC - Upper West Side | Wednesdays @ 8:30 AM | Viand Cafe, 2130 Broadway

We're also getting close on a new site feature: 'Latest Happenings.'

Here's an early preview:
https://breakfastclubbing.com/assets/LATEST_HAPPENINS.gif

It pulls from the same Substack photos and recap updates already being shared, so as long as we've got those, you're golden.

Anywho, call for updates. For [CITY], here's where to update:

- BC International Email: TODO
- Flyer Update list: TODO
- Master Sheet: https://docs.google.com/spreadsheets/d/1_4MoIXgSHjERztj0LPPC-XAa7nzFlfrdcjEQdBeSqto/edit
- Flyer Folder: https://drive.google.com/drive/folders/1RghGzP25aW2chs1aPGxAzE9fZgFHucRe

If everything looks right, no action needed. See you at the table.

Questions? ben@breakfastclubbing.com

p.s. — Any cool ideas for the site? Email mike@breakfastclubbing.com and he'll make it happen. Big thanks to Kilcoyne for making this happen.
```

## Editing Checklist

- Confirm the article link is current
- Confirm the featured club / newest micro-scene line
- Confirm the GIF is deployed and publicly reachable
- Confirm CTA labels and URLs
- Keep the footer, unsubscribe language, and sender details intact
- Keep the once-per-cycle reminder lock in `netlify/functions/weekly-host-reminder.js`

## Implementation Notes

- Live send template: `/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB/netlify/functions/weekly-host-reminder.js`
- Test send template: `/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB/netlify/functions/send-test-email.mjs`
- Public GIF asset: `/Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB/assets/LATEST_HAPPENINS.gif`

When this file changes, mirror those edits into the live and test email templates.

## Repeatable Test Send Workflow

### 1. Deploy the GIF only for preview

```bash
mkdir -p /tmp/latest-happenings-preview
cp /Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB/assets/LATEST_HAPPENINS.gif /tmp/latest-happenings-preview/LATEST_HAPPENINS.gif
cd /tmp/latest-happenings-preview
netlify deploy --dir=. --json --site 75fd9acb-ca00-45e3-bcb9-9e0906ea82b0
```

Use the resulting draft URL with `/LATEST_HAPPENINS.gif` appended.

### 2. Load env vars locally

```bash
cd /Users/yellowsatinjacket/Desktop/#Active_Projects/FIND_MY_BK_CLUB
set -a && source .env && set +a
```

### 3. Send the test email

```bash
TEST_EMAIL_TO="mk@yellowsatinjacket.com" \
TEST_GIF_URL="https://DRAFT-DEPLOY-URL.netlify.app/LATEST_HAPPENINS.gif" \
TEST_CITY_LABEL="New York — Williamsburg" \
TEST_FLYER_EXAMPLE="NewYorkWilliamsburg_2026-03-23.jpg" \
node netlify/functions/send-test-email.mjs
```

### Test Overrides

- `TEST_EMAIL_TO`: comma-separated preview recipients
- `TEST_GIF_URL`: draft or production GIF URL
- `TEST_ARTICLE_URL`: article override for a specific send
- `TEST_CITY_LABEL`: city name used in the CTA block
- `TEST_FLYER_EXAMPLE`: example flyer filename shown in the email

## Last Week Reference

Use this as the style baseline for CTA, footer, and `p.s.` copy.

```md
Hey hosts —

Recently got this article forwarded from CDMX's host Steve, called "The Great Friendship Flattening".

Quick thought from my end: We breakfast for the people (familiar and new), the conversation (pointed and arcane) and especially for the vibes (positive, collaborative, forward-looking). Because it's fun. And we can all use a little more of that.

You can read the full article here.

Anywho, call for updates (I'm gonna aim to make these more dynamic).

For New York — Hamptons, here's where to update:

→ Master Sheet (update your listing)
→ Flyer Folder (upload this week's flyer)

Flyer naming: City_YYYY-MM-DD.jpg (e.g. NewYorkHamptons_2026-03-22.jpg)

If everything looks right, no action needed. See you at the table.

Questions? ben@breakfastclubbing.com

p.s. — Any cool ideas for the site? Email mike@breakfastclubbing.com and he'll make it happen. Big thanks to Kilcoyne for making this happen.

p.p.s. — Kilcoyne's working on a 'Word Cloud' feature that was inspired by another BC International host. It's gonna be super sick, so I encourage you to share your 'What We Talked About' posts and make sure they're in your updates.

Breakfast Club HQ · New York, NY
You're receiving this because you host a Breakfast Club location.
To stop receiving these emails, reply with "unsubscribe" and we'll remove you.
```
