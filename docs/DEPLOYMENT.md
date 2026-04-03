# Deployment Guide (Netlify + Namecheap)

This file has two jobs:
- document the current production deploy workflow
- keep the original hosting setup notes for rebuilding/migrating the site later

## 1. Current Production Deploy Flow
1. QA locally with `python3 -m http.server 8080`
2. Run `npm run check:release`
3. Push to `main`
4. Netlify auto-deploys production
5. Verify the live site at `https://breakfastclubbing.com`
6. If the deploy is bad, roll back in the Netlify dashboard

Current reality:
- Production is tied to `main`
- There is no branch protection right now
- Deploy previews/PR gates are optional improvements, not enforced safeguards today

## 2. Push Repository
Push this folder to GitHub (recommended for community PR workflow).

## 3. Create Netlify Site
1. In Netlify, choose **Add new site > Import an existing project**.
2. Connect GitHub and pick this repo.
3. Build settings:
   - Build command: *(leave blank)*
   - Publish directory: `.`
4. Deploy.

## 4. Set Custom Domain in Netlify
1. Go to **Site settings > Domain management > Add custom domain**.
2. Add `breakfastclubbing.com`.
3. Add `www.breakfastclubbing.com` (optional, recommended).
4. Set apex (`breakfastclubbing.com`) as primary.

## 5. Update Namecheap DNS
In Namecheap > Domain List > Manage > Advanced DNS:

Create/confirm records:
- `A` record
  - Host: `@`
  - Value: `75.2.60.5`
  - TTL: Automatic
- `A` record
  - Host: `@`
  - Value: `99.83.190.102`
  - TTL: Automatic
- `CNAME` record
  - Host: `www`
  - Value: `<your-netlify-site>.netlify.app`
  - TTL: Automatic

Note: Netlify sometimes offers alternate DNS targets in UI; if shown, follow Netlify UI values.

## 6. HTTPS
Netlify provisions SSL automatically after DNS resolves.

## 7. Recommended Netlify Settings
- Current state: production auto-deploys from `main`
- Optional improvements:
  - Enable Deploy Previews for pull requests
  - Enable branch deploys for testing updates
  - Add team members as Maintainers/Collaborators

## 8. Community Moderation Setup
In GitHub repo settings:
- Current state: `main` is not protected
- Optional improvements:
  - Protect `main` branch (require PR, at least 1 review)
  - Require status checks if you later add CI
  - Keep issue templates and PR template enabled
