# Launch checklist

**Written 2026-11-19.** Ordered so nothing waits on a later step. Phase A is
unblocked right now; B needs one thing from Greg; C is yours alone; E is the
point of no return and comes last.

Each step says **who**, **where**, and **how you know it worked**. If a verify
step fails, stop there — every one of them is cheap to re-run and the next step
assumes the last one passed.

---

## What I need from Greg — one ask, then four code items

### The ask: make me a collaborator on three things

This collapses most of the checklist into things I can just do.

| System | What | Unlocks |
|---|---|---|
| **Vercel** | Member on the project | domains, env vars (B1, B2) |
| **Supabase** | Member on the org/project | URL config, the data fixes, sending invites (B5, G) |
| **GitHub** | Collaborator on the app repo | the design work as a PR (F) |

If he can't add members on his plan, the fallback is a list of clicks for him —
that's Message 2 in `MSG-GREG-DOMAIN.md`.

### Code — his regardless of access

1. **`signInWithOtp`** — email login. The only auth call in the app today is
   `signInWithOAuth` (Google/Apple). This is what blocks inviting the existing
   hosts; many are on business domains with no Google or Apple account.
2. **Resend wired to Supabase SMTP** — Authentication → Providers → enable
   Email, then SMTP pointed at Resend. The built-in mailer is a few an hour, so
   without this the invites stall partway through the 48.
3. **`featured`, `is_new`, `upcoming_date` on `/api/discover`** — drives the
   featured strip, the NEW badge, and next-date. Should already be columns on
   `clubs` from the seed.
4. **Confirm RLS** on `create_club_invitation`, `club_hosts`,
   `club_invitations`. The whole confirm-the-hosts plan rests on it, and the
   policies aren't visible from outside. Also: does `create_club_invitation`
   send the mail or only mint the row? That decides whether inviting 48 hosts
   is a loop in the admin UI or a mail merge.

### One question worth asking now

**Is production the latest build?** I've reviewed
`breakfast-club-rebuild.vercel.app` (HTTP 200, public). If newer work is sitting
on an unpromoted preview, pointing DNS will look like it "didn't work" when it's
actually serving an older build.

---

## What I can handle

**Without any new access:**

- Every verify step below — DNS, headers, redirects, the email-free check
- The Netlify side end to end: the branch, the redirect gating, the deploy
- Exact record values for Namecheap and NS1, then confirming they propagated
- Every message — to Greg, and the host "claim your club" email
- The design drop-ins are already written: `zany-kit.css`, `zany.js`,
  `ZanyLayer.tsx`, `clubby-icon.svg`, plus the change list in `DESIGN-DELTA.md` §2

**With repo access:** the design work as a PR against Greg's app (F).

**With Supabase access:** the data fixes, and driving the invitations.

**What I can't do, ever:** click in Namecheap, Netlify, Vercel, Supabase or
Google Workspace Admin. Those are your logins. I'll give you the exact values
and verify the result.

---

## Phase A — today, nothing blocking

Closes the live privacy exposure. Independent of the domain.

### A1 · Merge the branch — *me*

14 commits on `backend-hardening-2026-11`, unmerged. The new-domain redirects in
it are **commented out** as of this afternoon, so this is now safe to ship
before the domain exists.

### A2 · Netlify env vars — *you*

Netlify → the site → Site configuration → Environment variables → Add.

```
SHEET_CSV_URL
```
```
https://docs.google.com/spreadsheets/d/1_4MoIXgSHjERztj0LPPC-XAa7nzFlfrdcjEQdBeSqto/export?format=csv&gid=105813476
```

```
SUPER_ADMIN_EMAILS
```
```
mk@yellowsatinjacket.com, ben.dietz@gmail.com, charlanoelcaponi@gmail.com, greg@futurecapable.com.au
```

Add any other addresses the four of you actually log in with — that's the point
of it being a list.

### A3 · Deploy — *you*

**Corrected 2026-11-19:** `npm run deploy` runs `netlify deploy --prod
--skip-functions-cache`, and **the Netlify CLI isn't installed on this
machine** — not globally, not as a local dep, not in your login shell. It would
fail with "command not found." The site itself is still linked
(`.netlify/state.json`, siteId `75fd9acb-ca00-45e3-bcb9-9e0906ea82b0`), so only
the binary is missing.

Use npx, which needs no install:

```bash
npx netlify-cli@latest login
```

```bash
npx netlify-cli@latest deploy --prod --skip-functions-cache
```

The login opens a browser once and is remembered after that.

**Or skip the CLI entirely** if this Netlify site auto-deploys from the GitHub
repo — in that case pushing `main` is the deploy, and the CLI never comes into
it. You'll know from Netlify → Site configuration → Build & deploy whether a
repo is connected. Worth checking before installing anything, because that path
is better long-term anyway.

If you push: `main` is 16 commits ahead of `origin/main` and not yet pushed.

### A4 · Verify — *me, but here they are*

```bash
curl -s https://breakfastclubbing.com/.netlify/functions/get-clubs | head -1
```
Expect a CSV header row **with no `Emails` column**. JSON with an error means
the env var didn't take.

```bash
curl -sI https://breakfastclubbing.com/ | head -1
```
Expect **200**, not a 301 — the redirects are still gated at this point. A 301
here means the gating didn't hold and you should stop.

```bash
curl -so /dev/null -w "%{http_code}\n" https://breakfastclubbing.com/netlify/functions/admin-api.js
```
Expect **404**. This is the one that was serving the auth scheme and 41 host
emails as a static file.

### A5 · Google Sheet → stop publishing — *you*

File → Share → **Publish to web** → **Stop publishing**.

**Do not touch Share → Restricted.** `get-clubs` fetches the Sheet anonymously;
Restricted makes Google return an HTML sign-in page instead of CSV, the function
502s, and the site silently falls back to a frozen snapshot. Link-sharing stays
on until the Netlify side reads Supabase instead.

These are two different URLs, which is why this works: *publish to web* serves
`/pub?...output=csv` and dies here; `get-clubs` uses `/export?format=csv`, which
runs on link-sharing and keeps working.

Re-run A4's first command after this. Still a CSV header = correct.

---

## Phase B — the new domain goes live

**Blocked on Greg** for B1–B2 only.

Current state, checked today: `breakfastclubinternational.com` has **no A record
and no www record** — it doesn't resolve at all. It does have five Namecheap
`eforward` MX records and a Namecheap SPF.

So there is **nothing to delete** at Namecheap. (An earlier note in
`MSG-GREG-DOMAIN.md` said to remove a parking A record and a
`parkingpage.namecheap.com` CNAME — those aren't there. Corrected.)

### B1 · Add the domains in Vercel — *Greg, or me with access*

Settings → Domains → add both, apex canonical so www redirects to it:

- `breakfastclubinternational.com`
- `www.breakfastclubinternational.com`

### B2 · Get the records back — *Greg*

Vercel shows an A record for the apex and a CNAME for www. Usually
`76.76.21.21` and `cname.vercel-dns.com`, **but use whatever his dashboard
shows** — Vercel issues per-project values now.

**Do not switch nameservers to Vercel.** Greg suggested this for
breakfastclubbing.com, which would take down Google Workspace mail (`ben@`,
`mk@`, `set@`), the passport and its physical NFC tags, `/what-we-talked-about`,
and all 14 functions. We're keeping DNS where it is and adding records.

### B3 · Add them at Namecheap — *you*

Domain List → breakfastclubinternational.com → Manage → **Advanced DNS**.

Add the A record for `@` and the CNAME for `www`. **Keep all five MX records and
the SPF TXT** — Phase C needs them until it replaces them deliberately.

TTL is 30 minutes, so give it a few.

### B4 · Verify — *me*

```bash
dig +short A breakfastclubinternational.com; curl -sI https://breakfastclubinternational.com | head -1
```
Expect an IP, then **200**. Also confirm mail survived:

```bash
dig +short MX breakfastclubinternational.com
```
Expect the five `eforward` records still there.

### B5 · Supabase URL configuration — *Greg, or me with access*

Authentication → URL Configuration:

- Site URL → `https://breakfastclubinternational.com`
- Redirect URLs → add `https://breakfastclubinternational.com/auth/callback`
- **Keep the existing `vercel.app` entries** so preview deploys still log in

This one fails quietly — login still *works*, it just bounces people back to the
old URL afterwards, which is horrible to debug later.

### B6 · Smoke test — *you, two minutes*

Load the new domain. Sign in with Google. Confirm you land back on
breakfastclubinternational.com and not a `vercel.app` URL.

---

## Phase C — keep `ben@breakfastclubbing.com`, gain it at the new domain

**Yours alone. Not blocked on anyone.** Do it as a separate sitting from Phase B
— never change A records and MX records in the same session, or a bounce tells
you nothing about which edit caused it.

### The answer to both your questions: you get both addresses, one inbox

`ben@breakfastclubbing.com` is **not at risk from any of this.** The web
redirect is HTTP; the mailbox is an MX record. They're independent. The only
thing that would kill it is switching nameservers, which we're not doing.

And the clean move to the new domain is a **Google Workspace domain alias** —
not a migration, not forwarding. You add `breakfastclubinternational.com` as an
alias, and every existing mailbox automatically also receives at the new domain.
`ben@breakfastclubinternational.com` lands in the same inbox as
`ben@breakfastclubbing.com`. No new licence, no mail to move, nothing to
cut over. Free, up to 20 aliases.

The alternative — Namecheap forwarding the new address to the old one — is
worse: you can't cleanly *send* as the new address, and forwarded mail breaks
SPF alignment, so it lands in spam more often.

### C1 · Add the alias — *you*

admin.google.com → Account → Domains → Manage domains → **Add a domain** →
choose **domain alias** (not secondary domain — that needs separate licences).

If you're not a Workspace super admin on that account, Ben probably is.

### C2 · Verify ownership — *you + me*

Google gives you a TXT record. Add it at Namecheap → Advanced DNS, then hit
Verify. I'll confirm it's visible first:

```bash
dig +short TXT breakfastclubinternational.com | grep google-site-verification
```

### C3 · Point the new domain's mail at Google — *you*

Still in Namecheap → Advanced DNS, for **breakfastclubinternational.com only**:

- **Delete** the five `eforward1–5.registrar-servers.com` MX records
- **Add** one MX: host `@`, value `smtp.google.com`, priority `1`
- **Replace** the SPF TXT — delete
  `v=spf1 include:spf.efwd.registrar-servers.com ~all`, add:

```
v=spf1 include:_spf.google.com ~all
```

This ends Namecheap email forwarding on that domain. **If you have any forwarder
set up there, write down where it points before deleting** — it stops working
the moment the MX changes.

Leave the A and CNAME from Phase B alone. The website is unaffected.

### C4 · Verify — *me, then you*

```bash
dig +short MX breakfastclubinternational.com; dig +short TXT breakfastclubinternational.com
```
Expect `1 smtp.google.com.` and the Google SPF.

Then send a real test from your phone to `ben@breakfastclubinternational.com`
and confirm it arrives in the existing inbox.

---

## Phase D — Resend and email login

**Greg's.** SendGrid is being retired, so both domains get set up fresh in
Resend.

### D1 · Verify both domains in Resend — *Greg*

Both, not one:

- `breakfastclubbing.com` — DNS is on **NS1 (Netlify)**, so those records come
  to me
- `breakfastclubinternational.com` — DNS is at **Namecheap**, so those are yours

**Where to send from, and why it's split:**

| | From |
|---|---|
| Magic links, invitations accepted, anything user-triggered | `breakfastclubinternational.com` |
| **The one bulk send — the 48 "claim your club" invites** | `breakfastclubbing.com` |

The bulk send goes from the old domain because those 48 people have received
mail from it before; a brand-new domain whose first act is 48 messages at once
looks exactly like a spam run. Meanwhile the magic links warm the new domain
properly — they're requested by the recipient, so they get opened, which is the
best reputation signal there is. No second migration: both are authenticated
from day one.

```
From:     Breakfast Club <hello@breakfastclubinternational.com>
Reply-To: ben@breakfastclubbing.com
```

Reply-To on a real human mailbox, so hitting reply reaches someone.

**One caution on the SPF for breakfastclubbing.com:** there is **no SPF record
on it today** — I checked the authoritative nameservers, there's no `v=spf1` at
all. Don't let Resend's wizard add one covering only Resend; Google Workspace
also sends from that domain. Resend's `send.` subdomain setup puts SPF on the
subdomain and avoids the question entirely. Use that.

### D2 · Add the DNS records — *you, values from Greg*

I'll verify each one resolves before you tell Resend to check.

### D3 · Supabase SMTP + `signInWithOtp` — *Greg*

Authentication → Providers → enable Email. SMTP → Resend credentials. Then the
code:

```js
await supabase.auth.signInWithOtp({
  email,
  options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
});
```

### D4 · Test — *you*

Request a magic link to an address that is **not** Google or Apple — a business
domain. That's the whole reason this phase exists.

---

## Phase E — the redirect. Point of no return.

Only once Phase B is proven and the new site is one you're happy for everyone to
land on. After this, breakfastclubbing.com is a doorway.

### E1 · Ungate the redirects — *me*

Section 3 of `netlify.toml` is commented out with a banner. I strip the comments
and redeploy. 14 rules: homepage, `/clubs`, `/gallery`, `/flyers`, `/map-view`,
`/start` and the rest.

**What deliberately does not redirect** — these stay on Netlify, and the rules
are ordered so they win: `/passport` (physical NFC tags point at it),
`/what-we-talked-about`, `/admin`, `/clubby`, `/clubby-admin`, and all 14
functions.

### E2 · Verify — *me*

```bash
curl -sI https://breakfastclubbing.com/ | head -2
```
Expect **301** to breakfastclubinternational.com.

```bash
for p in passport what-we-talked-about clubby admin; do printf "%-22s " "$p"; curl -so /dev/null -w "%{http_code}\n" https://breakfastclubbing.com/$p; done
```
Expect **200** on all four. A 301 on `/passport` means the NFC tags are dead.

### E3 · Confirm mail survived — *you*

Send one message to `ben@breakfastclubbing.com`. It should arrive exactly as
before — nothing in E touches MX. Worth doing anyway, because this is the step
where you'll worry about it.

---

## Phase F — the design delta

Parallel. Any time after B, doesn't block launch.

The change list is `DESIGN-DELTA.md` §2, and the drop-ins are written:
`zany-kit.css`, `zany.js`, `ZanyLayer.tsx`, `clubby-icon.svg`.

Four changes in priority order: the Clubby launcher (replace the trigger, not
just the icon), the square button/tag/panel system, accent `#b87649` → `#ffd700`,
and "Find a club" → "Find your club".

**With repo access I do this as a PR.** Without it, Greg applies the list.

Separately, `CLUBBY_VOICE.md` §§1–2 and §4 are the copy fix for his chat panel —
cheapest improvement on the list.

---

## Phase G — invite the 48 hosts

Needs D (email login) and Greg's RLS confirmation. This is the actual work and
it's operational, not technical — the software is done, the roster isn't.

1. Greg confirms RLS on `create_club_invitation` and `club_hosts`
2. **Invite five hosts you can phone** if something's confusing. Fix whatever
   that surfaces.
3. Then the remaining 43
4. *Then* `CHASE-HOSTS.md`, reframed as a nudge alongside the invite rather
   than a request to reply with details — 22 clubs are missing a day or time,
   and a logged-in host fixes their own via `update_host_club_schedule`
5. Berlin, Chicago and Ibiza have **no host on record at all**. No login flow
   helps a club nobody runs — ask in the group, or drop them.

---

## Data fixes — any time, need Supabase access

- **NY-LES** still shows the old venue on the new site. Should be **Forget Me
  Not, 138 Division St, Thursdays 9:30am**. The move landed in this repo's
  `clubs-map.json` but never in Supabase.
- **Fairfield County, CT** has country `United States` where every other row
  says `USA`. It's why the country count reads 17 instead of 16.
- **`zany-preview.html:239` says "53 clubs · 18 countries · and counting."**
  Not supportable. True today is **48 · 16**; the ceiling is **53 · 17** with
  Riyadh. 18 isn't reachable — Lisbon was the only candidate for an 18th
  country and it's inactive. Your call on the headline, but it shouldn't go to
  Greg as-is.
