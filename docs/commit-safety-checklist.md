# Commit Safety Checklist

Use this before merging or deploying any BreakfastClubbing site update, especially if the change came from a Netlify/live-site fix, a hotfix branch, or a branch that diverged from `main`.

## Goal

Catch accidental feature removals before they ship.

This is meant to protect UI work like:

- sidebar/day navigation
- LinkedIn and Instagram integrations
- updated social icons
- `Night`, `New`, and `Featured` badges/styling
- weekday layout rules like Monday two-card and Tuesday wide-card treatment

## Quick Flow

1. Check what changed in the commit you are about to ship.
2. Compare it against the commit before it.
3. Scan specifically for deleted files, deleted code blocks, and removed feature keywords.
4. Run the repo smoke check before deploying.
5. If the branch diverged from `main`, compare both sides before merging/deploying.
6. Only ship once feature parity is confirmed.

## Commands

### 1. Inspect the commit you are about to ship

```bash
git log --oneline --decorate -5
git show --stat HEAD
git diff --name-status HEAD^ HEAD
```

### 2. Check whether the latest commit removed anything

```bash
git diff --stat HEAD^ HEAD
git diff --diff-filter=D --name-status HEAD^ HEAD
git diff HEAD^ HEAD -- index.html css/styles.css css/club-card.css js/script.js js/club-overrides.js js/calendar-view.js
```

If you see large deletions in those files, stop and review before deploying.

### 3. Run a feature keyword audit

```bash
rg -n "sidebar|linkedin|instagram|Featured|featured|Night|night|New|Monday|Tuesday|day-nav|social" index.html css js
```

Use this to sanity-check that the expected features still exist after the merge.

### 4. Compare the branch you want to deploy against `main`

### 4.5. Run the release smoke check

```bash
npm run check:release
```

This blocks obvious regressions where we accidentally remove:

- featured/new/night site styling
- LinkedIn and Instagram card/social treatments
- correction-mode support in the weekly reminder/test mailer flow

If this fails, stop before deploying and inspect the files called out by the script.

### 5. Compare the branch you want to deploy against `main`

```bash
git fetch origin
git diff --stat origin/main...HEAD
git log --oneline --left-right --cherry-pick origin/main...HEAD
```

This catches the exact situation where `main` contains a newer deploy fix but the branch you want to ship contains newer UI work.

### 5. If you need to restore site polish from an earlier commit

For the recent BreakfastClubbing regression, the site polish lived in:

```bash
git show --stat b7eeff36
```

That commit includes the club-card/day-navigation/social styling work. Review those same UI files before deploying any branch that does not contain it.

## Ship Blockers

Do not deploy if any of these are true:

- `git diff --diff-filter=D` shows deleted site files you did not intend to remove
- `index.html`, `css/styles.css`, `css/club-card.css`, `js/script.js`, `js/club-overrides.js`, or `js/calendar-view.js` have large unexplained deletions
- feature keyword audit shows a missing `linkedin`, `instagram`, `Featured`, `New`, `Night`, `Monday`, or `Tuesday` implementation you expected to keep
- the branch to be deployed is missing known feature commits from the branch that already has the UI fixes

## Safe Merge Habit

Before a deploy PR or Netlify push:

```bash
git fetch origin
npm run check:release
git diff --stat origin/main...HEAD
git diff --name-status origin/main...HEAD
git diff HEAD^ HEAD -- index.html css/styles.css css/club-card.css js/script.js js/club-overrides.js js/calendar-view.js
```

Then answer this in the PR description or deploy note:

`Does this change remove or replace any existing site feature? If yes, list it explicitly. If no, say "No intended feature removals."`

That single sentence makes accidental deletions much easier to catch during review.
