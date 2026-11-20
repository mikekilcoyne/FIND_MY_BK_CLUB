# Follow-up to Greg — after the domain went live

**Written 2026-11-20.** breakfastclubinternational.com is up: apex 200, `www`
308s to it, Let's Encrypt cert issued 2026-11-19 18:50, `server: Vercel`. Mail
survived on both domains (5 MX on the new one, Workspace on the old).

Mike's goal, in his words: *get the design tweaks in, start pushing it out to
people, then forward breakfastclubbing.com to it.* This message asks only for
what blocks that.

**Verified against the live site:** it serves `Find a club` and the terracotta
accent, so none of the design delta is applied yet. Nothing of ours is on there.

**Could not verify:** whether Supabase's redirect allow-list includes the new
domain. The project ref isn't in the HTML and I couldn't find it in the first
25 JS chunks, so I can't test the OAuth callback from outside. It stays an
open risk, which is why it's ask #2 rather than a note.

---

## The message *(send this)*

> Domain's live and the cert's issued — nice one.
>
> Two things to get the design changes in:
>
> **1. GitHub collaborator** — `kilcoyne.michael@gmail.com`. That's the one
> actually blocking me; Vercel access doesn't help here since the site builds
> from the repo. Four changes plus a few drop-in files. I'll put it up as a PR
> for you to review rather than pushing to main.
>
> **2. Quick check — Supabase → Authentication → URL Configuration.** Now the
> domain's live, Site URL wants to be `https://breakfastclubinternational.com`
> with `https://breakfastclubinternational.com/auth/callback` in the Redirect
> URLs. Keep the existing vercel.app entries so previews still log in. If it's
> still on the vercel.app URL, login will appear to work and then dump people
> back on the old address — easy to miss now, horrible to debug later.
>
> Then the bigger two when you've got time: **email login** (`signInWithOtp`)
> and **Resend wired to Supabase SMTP**. Those are what let us actually invite
> the 48 existing hosts — a good number are on their own business domains with
> no Google or Apple account, so right now they can't log in at all.
>
> Cheers 🙏

---

## Notes for Mike, not for sending

- **GitHub is the ask that matters.** Vercel Member lets you change domains and
  env vars; it does not let you ship code. The site builds from Greg's repo, so
  the repo is the only path to the design changes. If he grants one thing, that
  is the one.
- **Don't forward breakfastclubbing.com yet.** That's Phase E and it's the
  point of no return. It should come after the design lands and login is
  confirmed working on the new domain — otherwise you're routing everyone to a
  site that still looks wrong and may bounce them to a vercel.app URL when they
  sign in.
- **The order for "pushing it out to people" is the reverse of the instinct.**
  Hosts first, then the public: the hosts need to claim and fix their clubs
  (22 are missing a day or time) before the roster is worth sending traffic to.
  That's `HOST-CONFIRMATION.md` §5, and it needs email login first.
- Still outstanding on your side and unrelated to Greg: the two Netlify env
  vars for Phase A. `main` is 22 commits ahead and clean.
