# Codex Handoff — Latest Happenings: Hamptons Photo Update

**Date:** 2026-04-09  
**Repo:** `FIND_MY_BK_CLUB__main_recovery` (branch: `main`)  
**Feature:** Latest Happenings / What We Talked About — Hamptons block photo update

---

## Context

The "Latest Happenings" feature lives on `what-we-talked-about.html`. It's a photo viewer with polaroid frame overlays, frame-switching (multiple backdrop options), and swipe/arrow navigation between club photos from around the world.

**The feature is NOT yet in this repo.** It exists only in the archived wordcloud worktree:

```
/Users/yellowsatinjacket/Desktop/#Active_Projects/_ARCHIVE_FIND_MY_BK_CLUB_WORKTREES_2026-03-30/FIND_MY_BK_CLUB__wordcloud.tar.gz
```

The local dev server (Python, port 8890) runs from this repo's root. The plan is to port the feature here and commit it.

---

## The Task

### 1. Copy new Hamptons photos from Downloads → assets

Source (8 photos, all clean film-grain shots, no baked-in white polaroid border):

```
~/Downloads/Polaroid.png
~/Downloads/Polaroid 2.png
~/Downloads/Polaroid 3.png
~/Downloads/Polaroid 4.png
~/Downloads/Polaroid 5.png
~/Downloads/Polaroid 6.png
~/Downloads/Polaroid 7.png
~/Downloads/Polaroid 8.png
```

Destination in this repo:

```
assets/photos/Polaroid.png
assets/photos/Polaroid 2.png
... etc.
```

The `slug: "hamptons"` entry in `club-story-media.json` references `./assets/photos/Polaroid.png` through `Polaroid 6.png`. The new set goes up to Polaroid 8.png — **add all 8**.

### 2. Port the WWTA feature files from the wordcloud archive

Extract these from the tarball and add to this repo (do not overwrite existing files that are already in main recovery):

| Archive path | Destination |
|---|---|
| `FIND_MY_BK_CLUB__wordcloud/what-we-talked-about.html` | `what-we-talked-about.html` |
| `FIND_MY_BK_CLUB__wordcloud/js/what-we-talked-about.js` | `js/what-we-talked-about.js` |
| `FIND_MY_BK_CLUB__wordcloud/js/word-cloud.js` | `js/word-cloud.js` |
| `FIND_MY_BK_CLUB__wordcloud/js/word-cloud-topics.js` | `js/word-cloud-topics.js` |
| `FIND_MY_BK_CLUB__wordcloud/js/wordcloud2.js` | `js/wordcloud2.js` |
| `FIND_MY_BK_CLUB__wordcloud/css/word-cloud.css` | `css/word-cloud.css` |
| `FIND_MY_BK_CLUB__wordcloud/data/club-story-media.json` | `data/club-story-media.json` |
| `FIND_MY_BK_CLUB__wordcloud/data/wwta-media.json` | `data/wwta-media.json` |
| `FIND_MY_BK_CLUB__wordcloud/assets/polaroid-backdrops/` | `assets/polaroid-backdrops/` (full dir) |
| `FIND_MY_BK_CLUB__wordcloud/assets/ui/` | `assets/ui/` (full dir — contains change-frame button images) |
| `FIND_MY_BK_CLUB__wordcloud/assets/photos/club_updates/` | `assets/photos/club_updates/` (full dir — WhatsApp photos for all other clubs) |

### 3. Update `data/club-story-media.json` — Hamptons block

After copying the data file from the archive, update the `slug: "hamptons"` entry to reference all 8 new photos and remove the `photoTreatment: "polaroid-frame"` (since the new photos don't have baked-in borders, and the JS frame overlay is controlled separately):

**Before (from archive):**
```json
{
  "slug": "hamptons",
  "displayName": "Hamptons",
  "region": "Northeast US",
  "source": "curated",
  "photoTreatment": "polaroid-frame",
  "photos": [
    "./assets/photos/Polaroid.png",
    "./assets/photos/Polaroid 2.png",
    "./assets/photos/Polaroid 3.png",
    "./assets/photos/Polaroid 4.png",
    "./assets/photos/Polaroid 5.png",
    "./assets/photos/Polaroid 6.png"
  ]
}
```

**After:**
```json
{
  "slug": "hamptons",
  "displayName": "Hamptons",
  "region": "Northeast US",
  "source": "curated",
  "photos": [
    "./assets/photos/Polaroid.png",
    "./assets/photos/Polaroid 2.png",
    "./assets/photos/Polaroid 3.png",
    "./assets/photos/Polaroid 4.png",
    "./assets/photos/Polaroid 5.png",
    "./assets/photos/Polaroid 6.png",
    "./assets/photos/Polaroid 7.png",
    "./assets/photos/Polaroid 8.png"
  ]
}
```

> **Note on photoTreatment:** The `wwta-media.json` already uses `"native-polaroid"` for Hamptons, which is the correct treatment for these real-film photos. If `word-cloud.js` applies the frame overlay based on `photoTreatment: "polaroid-frame"`, confirm whether the Hamptons block should use `"native-polaroid"` or `"polaroid-frame"` by checking how `word-cloud.js` handles each value before finalizing.

---

## What Already Exists in This Repo (do not duplicate)

The following files from the archive are **already present** in main recovery and should not be overwritten without diff-checking:

- `js/script.js`, `js/club-overrides.js`, `js/club-data.js`, `js/analytics.js`, `js/analytics-config.js`
- `css/styles.css`, `css/club-card.css`, `css/map-view.css`, `css/calendar-view.css`
- `data/clubs-map.json`
- All HTML except `what-we-talked-about.html`

---

## Key Files for Reference (already extracted to /tmp during scoping)

```
/tmp/FIND_MY_BK_CLUB__wordcloud/js/what-we-talked-about.js
/tmp/FIND_MY_BK_CLUB__wordcloud/js/word-cloud.js
/tmp/FIND_MY_BK_CLUB__wordcloud/data/club-story-media.json
/tmp/FIND_MY_BK_CLUB__wordcloud/data/wwta-media.json
/tmp/FIND_MY_BK_CLUB__wordcloud/what-we-talked-about.html
```

These may still be available at /tmp — verify before re-extracting.

---

## What the Photos Look Like

All 8 are real Hamptons BK Club film shots (grainy, analog aesthetic) without any white polaroid border baked into the image:

- `Polaroid.png` — Tutto Caffè exterior (the venue sign)
- `Polaroid 2.png` — Two attendees chatting at the table
- `Polaroid 7.png` — Attendee at what looks like a gallery space
- `Polaroid 8.png` — Host portrait (smiling, blue jacket)
- Polaroid 3–6 not individually confirmed but same set/session

---

## Dev Server

Python server is running on port 8890 from this repo root. Once `what-we-talked-about.html` is in place, it should be accessible at:

```
http://127.0.0.1:8890/what-we-talked-about.html
```
