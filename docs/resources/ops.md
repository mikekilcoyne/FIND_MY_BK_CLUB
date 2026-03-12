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
1. Open an issue for the update.
2. Create a branch.
3. Make a focused, scoped change.
4. Open a PR with source links.
5. Request review.

### Data Source Priority
1. Latest Breakfast Club sheet
2. Recent Breakfast Clubbing newsletters
3. Direct host-confirmed details

### PR Checklist
- [ ] Change is scoped to specific clubs or functionality
- [ ] Sources included in PR description
- [ ] No stale/outdated notes introduced
- [ ] `HOST:` labels included when IG handles are present
- [ ] Links open correctly (Instagram/LinkedIn/Google Maps)

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
