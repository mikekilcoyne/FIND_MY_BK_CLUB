# Host Update Form — Status & Notes

**Status: Parked** — not yet implemented. Reverted from local branch, nothing pushed.

---

## What it is

A `?` button on incomplete club cards (cards missing venue or social contact) that lets visitors submit missing host info. Submissions batch up and get sent as a weekly digest to `mike@breakfastclubbing.com` alongside the existing host reminder email.

---

## Planned architecture

### Storage: Netlify Forms
- A hidden `<form name="host-update" data-netlify="true">` in `index.html` registers the form with Netlify at deploy time (no build step needed)
- The `?` button submits via AJAX fetch — no page reload, no backend function needed for submission:
  ```js
  fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      "form-name": "host-update",
      club: club.city,
      notes: notesValue,
      email: emailValue,
    }).toString(),
  })
  ```
- Submissions appear in Netlify Dashboard → Forms → `host-update`

### Weekly digest: extend `weekly-host-reminder.js`
After the existing host email loop, add a section that:
1. Reads pending submissions via Netlify API:
   ```
   GET https://api.netlify.com/api/v1/sites/{NETLIFY_SITE_ID}/forms
   ```
   Find `host-update` form ID, then:
   ```
   GET https://api.netlify.com/api/v1/sites/{NETLIFY_SITE_ID}/forms/{formId}/submissions?per_page=100
   ```
   Header: `Authorization: Bearer {NETLIFY_API_TOKEN}`

2. If submissions exist, sends a separate SendGrid email to `mike@breakfastclubbing.com`:
   - Subject: `[Weekly Digest] Host update submissions`
   - Body lists each submission: club, notes, email, timestamp

3. Submissions remain in Netlify dashboard as a record

### New env vars needed (Netlify Dashboard → Site settings → Environment variables)
| Var | Where to get it |
|-----|----------------|
| `NETLIFY_API_TOKEN` | Netlify user settings → Personal access tokens |
| `NETLIFY_SITE_ID` | Netlify site settings → General → Site ID |

---

## Files to touch when resuming
- `index.html` — add hidden Netlify form before `</body>`
- `js/script.js` — add `?` button + inline form to incomplete cards (where `club.isIncomplete`)
- `css/styles.css` — styles for `.update-btn`, `.host-update-form`, `.host-update-status`
- `netlify/functions/weekly-host-reminder.js` — add digest section after host email loop

## No package.json / no npm
All code uses native `fetch` only — consistent with the rest of the codebase.
