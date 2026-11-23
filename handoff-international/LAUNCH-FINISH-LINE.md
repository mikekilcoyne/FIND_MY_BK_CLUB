# BC International — launch finish line

**Written 2026-11-22.** Target: **launch week Mon 30 Nov – Fri 4 Dec**, after
Thanksgiving (Thu 26 Nov). Everything here was checked against the live
deployment and the repos on 22 Nov, not recalled.

## Where it stands

| | |
|---|---|
| Live preview | https://breakfast-club-rebuild-gold.vercel.app — your Vercel (Hobby), your Supabase |
| Code | `eljamapps/breakfast-club-rebuild`, branch `design/zany-pass` (5 commits on top of PR #33). All five gates green: lint, qa:style, typecheck, 280 tests, build |
| Data | 48 clubs published, RLS verified, 61 flyers (23 new from the hosts' chat) |
| Live domain | `breakfastclubinternational.com` still serves **Greg's** project and **Greg's** Supabase. Nothing of today's is on it |

Owners: **M** = Mike, **G** = Greg, **B** = Ben.

---

## 1. Blockers — must be done before launch

### A. Decide the launch path — the call with Greg and Ben (M, G, B)
This gates almost everything below. There are two working stacks:

- **Greg's**: his Vercel + his Supabase, serving the live domain today, old design.
- **Yours**: your Vercel + your Supabase, new design, new data.

**Recommendation: point the domain at yours.** It's the stack you rebuilt so
nothing waits on anyone's availability, and the DNS is already yours to change
(Namecheap). Merging into Greg's repo instead would put the new design on Greg's
Supabase, which has different data and different auth.

Settle on the call: which stack, who can deploy, and whether Greg keeps
committing (then he needs Administrator on your Supabase and access to your
Vercel project).

### B. Sign-in works end to end (M)
Today a host **cannot** sign in on your deployment.
- [ ] Supabase → Authentication → **URL Configuration**: Site URL = the launch
      domain; Redirect URLs = `https://breakfastclubinternational.com/auth/callback`,
      `https://breakfast-club-rebuild-gold.vercel.app/auth/callback`,
      `http://localhost:3000/auth/callback`. Currently unset.
- [ ] **Google provider**: create an OAuth client in Google Cloud (redirect URI
      = `https://<project-ref>.supabase.co/auth/v1/callback`), enable in
      Supabase. Currently **off**, so "Continue with Google" errors.
- [ ] **Email**: works today on Supabase's built-in mailer, which is rate-limited
      to a handful an hour and sends from Supabase. Wire **Resend** into
      Supabase → Authentication → SMTP before any bulk invite. Verify both
      domains in Resend; use the `send.` subdomain so it doesn't add a root SPF
      to breakfastclubbing.com (see `MSG-GREG-EMAIL.md`).
- [ ] Make yourself admin (`app_metadata.role = "admin"`), then **sign out and
      back in**. `SUPABASE-WALKTHROUGH.md` Part 6.
- [ ] Test on a phone and a laptop: email link, Google, `/host` loads as admin.

### C. Vercel project setup (M)
- [ ] **Store the env vars on the project.** It has none today; every deploy
      worked because the keys were passed by hand from your laptop. A redeploy
      from the dashboard, or any Git-triggered build, would build with no
      database. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (host venue search). Never the
      service-role key.
- [ ] **Upgrade to Pro** before a real brand domain lives there. Hobby is
      non-commercial.
- [ ] **Connect Git** to a repo you control, so a deploy doesn't depend on one
      laptop. The commit-author check now passes, since your commit email
      is on your account.
- [ ] Add `breakfastclubinternational.com` to the project; it's the cutover in
      §3.

### D. Get the code a permanent home (M, G)
- [ ] Merge PR #33, then `design/zany-pass`, into the repo chosen in A. Both
      pass `scripts/checks-merge.sh` locally.

### E. Roster and data (M, B)
- [ ] Paste `~/Downloads/BC International Master Sheet — new flyers 2026-11-22.csv`
      into the Google Sheet (20 flyer links, Paris's upcoming date, two new
      rows). It holds host emails; keep it out of any repo.
- [ ] Complete **Houston** and **San Miguel de Allende** (coordinates, host,
      `Active = Yes`) or leave them off the map at launch.
- [ ] Fix the two known sheet errors: row 20 longitude `73.4687` → `-73.4687`,
      and `United States` → `USA`.
- [ ] **22 clubs have no day or time.** Hosts fix these by claiming their clubs;
      that's the invite in §3.
- [ ] Re-import into Supabase. Run `check-sheet-alignment.mjs` first; it's the
      gate. The curated overlay still overrides `Flyer_URL` for 20 clubs.
- [ ] **Hard-coded counts.** The hero sticker and the share card both say
      "48 clubs · 16 countries". If the roster changes before launch, update
      `components/hero.tsx` and re-render the card.

### F. The old site keeps three promises (M)
`breakfastclubbing.com` stays up; these must never 404:
- [ ] `/passport?stamp=…` — printed on locked NFC tags; the query must survive.
- [ ] `/what-we-talked-about` — linked from emails already in inboxes.
- [ ] The starter-kit PDF.
- [ ] Everything else 301s to the new domain, query strings preserved. Test
      with a real NFC tag, not a typed URL.

### G. Security clean-up (M)
- [ ] Revoke the Vercel token and the Supabase access token used on 22 Nov.
- [ ] Delete the spare Supabase secret key created by mistake.
- [ ] Delete `handoff-international/local-secrets/` (gitignored, but still on disk).
- [ ] 2FA on Vercel. Google Sheet → stop "Publish to web".

---

## 2. Should do before launch — quality

- [ ] **Device QA**: iPhone Safari, Android Chrome, iPad, laptop; day **and**
      night mode; `/`, `/clubs`, `/gallery`, `/start`, `/host`.
- [ ] **Headline font off Apple devices.** Helvetica Neue is a system font,
      not served to visitors. Windows and Android fall back to Helvetica or
      Arial, so the headline looks different there. Decide: accept it, or
      license a webfont.
- [ ] **Clubby's chat**: confirm it answers on *your* deployment. It runs on an
      agent framework through Vercel's AI Gateway, which may need enabling or
      credits on your account. Rewrite the greeting per `CLUBBY_VOICE.md`: "Hi!
      I'm Clubby…" is the register that doc exists to fix.
- [ ] **Performance**: the poster wall loads its flyers twice (for the seamless
      loop) unoptimised, and globe.gl comes from unpkg at runtime. Run
      Lighthouse; consider `next/image` optimisation and self-hosting globe.gl.
- [ ] **Footer copy**: "© Breakfast Club" vs "BC International"; footer link
      labels are title case while the rest of the site went lowercase.
- [ ] **Water-caustics globe backdrop**: the image never reached disk. Drop
      the file in `public/` and it's a one-line change.

---

## 3. Launch week

| When | What |
|---|---|
| **Before Thanksgiving** (Mon 23 – Wed 25) | Call with Greg and Ben (§1A). Blockers B, C, G. Resend DNS, since propagation takes time |
| **Mon 30 Nov** | Code freeze. Device QA (§2). Dry-run sign-in with a real host |
| **Tue 1 Dec** (morning) | DNS cutover at Namecheap → your Vercel. Verify SSL, sign-in redirects, the share card on the real domain, old-site redirects (§1F) |
| **Wed 2 Dec** | Host invites: the 48 "claim your club" emails from Ben's breakfastclubbing.com address (`HOST-CONFIRMATION.md` §5). Hosts before the public, so the roster is right first |
| **Thu 3 Dec** | Public announcement: newsletter, Instagram, hosts' chat |
| **Fri 4 Dec** | Buffer; fix what the hosts report |

---

## 4. After launch

- **NEW / JUST LAUNCHED from real data**: an `is_new` column plus carrying the
  sheet's `Is_New` through the importer. Today NEW comes only from upcoming
  flyer dates.
- `featured` and `upcoming_date` columns (`REBUILD-DAY.md` §1.3).
- Hey!/Zow! shout component; lowercase body copy beyond the hero.
- Retire the Netlify PIN admin; Netlify becomes a redirect shell.
- Passport stays on Netlify until it's deliberately moved.
