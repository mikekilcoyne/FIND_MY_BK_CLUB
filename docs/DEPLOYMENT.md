# Deployment Guide (Netlify + Namecheap)

## 1. Push Repository
Push this folder to GitHub (recommended for community PR workflow).

## 2. Create Netlify Site
1. In Netlify, choose **Add new site > Import an existing project**.
2. Connect GitHub and pick this repo.
3. Build settings:
   - Build command: *(leave blank)*
   - Publish directory: `.`
4. Deploy.

## 3. Set Custom Domain in Netlify
1. Go to **Site settings > Domain management > Add custom domain**.
2. Add `findmybreakfast.club`.
3. Add `www.findmybreakfast.club` (optional, recommended).
4. Set apex (`findmybreakfast.club`) as primary.

## 4. Update Namecheap DNS
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

## 5. HTTPS
Netlify provisions SSL automatically after DNS resolves.

## 6. Recommended Netlify Settings
- Enable Deploy Previews for pull requests.
- Enable branch deploys for testing updates.
- Add team members as Maintainers/Collaborators.

## 7. Community Moderation Setup
In GitHub repo settings:
- Protect `main` branch (require PR, at least 1 review).
- Require status checks if you later add CI.
- Keep issue templates and PR template enabled.
