# LinkedIn Photo Ingestion Workflow

## Goal

Keep `Latest Happenings` fresh by moving Breakfast Club international photos from LinkedIn into a Google Drive folder, then syncing that folder into this repo's WWTA media files.

## Recommended source-of-truth

Use **Google Drive** as the canonical inbox, not LinkedIn itself.

Why:
- LinkedIn is good as the upstream discovery surface.
- Google Drive is much easier to organize by city, review by hand, and sync into the repo.
- This repo already stores WWTA media as local assets plus JSON references, so Drive maps cleanly onto the existing structure.

## Important constraint

Do **not** assume we can reliably pull arbitrary "tagged photos" from LinkedIn with a public API.

For practical purposes, the safest workflow is:

1. Collect photo candidates from LinkedIn manually or via a no-code tool.
2. Save them into a shared Google Drive folder with city-based subfolders.
3. Run the repo sync script to ingest them into `assets/photos/club_updates/` and `data/club-story-media.json`.
4. Review locally, commit, and push.

## Folder convention

Use a Drive folder that mirrors `club-story-media.json` slugs:

```text
Latest Happenings Intake/
  copenhagen/
    copenhagen-2026-04-10.jpg
  mexico-city/
    mexico-city-2026-04-10.jpg
  vienna/
    vienna-2026-04-10.jpg
```

Rules:
- Folder names must match the `slug` values in `data/club-story-media.json`
- Use image files only: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.avif`, `.heic`
- Prefer descriptive, dated filenames

## Repo sync

From the repo root:

```bash
npm run sync:latest-happenings -- "/path/to/local/mirrored/Latest Happenings Intake" --dry-run
```

Then run it for real:

```bash
npm run sync:latest-happenings -- "/path/to/local/mirrored/Latest Happenings Intake"
```

What it does:
- copies files into `assets/photos/club_updates/<slug>/`
- appends new media paths into `data/club-story-media.json`
- updates `updatedAt`
- sets `source` to `drive` for synced entries when appropriate

## Easiest operational setup

### Option A: Manual LinkedIn -> Drive -> Repo

Best first version.

1. Review new BC international tagged photos on LinkedIn.
2. Save the best images into the city folder in Drive.
3. Let Google Drive for Desktop mirror that folder locally.
4. Run `npm run sync:latest-happenings`.
5. Review the WWTA page locally.
6. Commit and push.

### Option B: LinkedIn -> Drive automation -> Repo

Only do this if the LinkedIn account/page access is stable.

Good pattern:

1. Use Zapier, Make, or another automation tool to watch for approved LinkedIn source events you control.
2. Save matching images into the Drive city folders.
3. Keep the repo sync step unchanged.

This keeps LinkedIn-specific fragility out of the site code.

## What to avoid

- Do not build the site to fetch live directly from LinkedIn at runtime.
- Do not depend on a brittle scrape of LinkedIn HTML.
- Do not mix city naming between Drive folders and JSON slugs.

## Review checklist

Before commit:

1. Run the sync in `--dry-run` first.
2. Confirm new files landed in the right city folders.
3. Check `data/club-story-media.json` for the intended slugs only.
4. Open `http://127.0.0.1:8890/what-we-talked-about.html`
5. Verify the new images show in the right club carousel.

## Future upgrade path

If we later get dependable LinkedIn API access for the specific account/page we control, we can add a scheduled Netlify or local script that writes into the same Drive-backed folder structure or directly into the same JSON/assets path.

The key is to keep the final ingest contract stable:

- local files in `assets/photos/club_updates/...`
- references in `data/club-story-media.json`
