# Project Operations

Covers contribution workflow, data sources, deployment, and runtime setup.

## 1. Project Overview
- Production: `https://breakfastclubbing.com`
- Runtime data: Google Sheet CSV → `js/script.js` and `js/calendar-view.js`
- Curated overrides: `js/club-overrides.js`

## 2. Local Development
```
cd /Users/mikekilcoyne/Desktop/FIND_MY_BK_CLUB
python3 -m http.server 8080
open http://127.0.0.1:8080
```

## 3. Contribution Workflow
Current production workflow for this repo is lightweight:
1. Make a focused, scoped change.
2. QA locally.
3. Run the release guardrails.
4. Push to `main`.
5. Confirm the Netlify deploy and spot-check production.

If/when the project returns to a multi-contributor workflow, use the branch + PR flow below instead of pushing directly to `main`.

### Optional Team Workflow
1. Open an issue for the update.
2. Create a branch.
3. Make a focused, scoped change.
4. Open a PR with source links.
5. Request review.

### Data Source Priority
1. Latest Breakfast Club sheet
2. Recent Breakfast Clubbing newsletters
3. Direct host-confirmed details

### Change Checklist
- [ ] Change is scoped to specific clubs or functionality
- [ ] Sources included in PR description or deploy note
- [ ] No stale/outdated notes introduced
- [ ] `HOST:` labels included when IG handles are present
- [ ] Links open correctly (Instagram/LinkedIn/Google Maps)
- [ ] `npm run check:release` passed
- [ ] Production spot-check completed after deploy

### Contribution Ground Rules
- Keep edits minimal and specific.
- Prefer fresh source info over old notes.
- If details are incomplete, use: `Contact host for more info`.
- If no reliable schedule detail exists, `First Thursday` is the fallback label.
- Keep layout mobile-friendly. Preserve existing style language unless a design change is requested.
- Avoid unnecessary dependencies.

## 4. Governance
- Be respectful and constructive.
- Focus on accurate, up-to-date information.
- Assume good intent and collaborate in good faith.
- No harassment, hate speech, personal attacks, doxxing, or knowingly false submissions.
- Maintainers may remove contributions that violate this and may limit access for repeated abuse.

## 5. Deployment (Netlify + Namecheap)
### Current Production Flow
1. QA locally: `python3 -m http.server 8080`
2. Run `npm run check:release`
3. Push to `main`
4. Netlify auto-deploys production
5. Spot-check `https://breakfastclubbing.com`
6. If needed, use the Netlify dashboard rollback

### Hosting Setup Reference
For a fresh Netlify/Namecheap setup:
1. Push repository to GitHub.
2. In Netlify → Add new site → Import existing project.
3. Build settings:
   - Build command: *(leave blank)*
   - Publish directory: `.`
4. Add custom domains: `breakfastclubbing.com` and `www.breakfastclubbing.com`.
5. In Namecheap DNS (Advanced DNS):
   - `A` record: `@` → `75.2.60.5`
   - `A` record: `@` → `99.83.190.102`
   - `CNAME`: `www` → `<your-netlify-site>.netlify.app`
6. SSL provisions automatically after DNS resolves.

### Recommended Netlify Settings
- Current state: production auto-deploys from `main`; branch protection is not enabled.
- Optional hardening for a future team workflow:
  - Enable Deploy Previews for pull requests.
  - Enable branch deploys for testing.
  - Protect `main` branch (require PR + 1 review).

## 6. Analytics (GA4)
- Runtime: `js/analytics.js`
- Config: `js/analytics-config.js`
- Set `window.BK_GA4_ID = "G-XXXXXXXXXX"` — if blank, analytics stays disabled.

## 7. Security
- Sensitive exports (host contacts, raw snapshots) stay in `private/` only.
- Never commit local sensitive files.
