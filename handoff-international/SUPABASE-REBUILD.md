# Supabase — rebuilding it on your side

**Written 2026-11-21.** Decision taken the same day: **rebuild, don't ask for a
transfer.** Greg is busy, the schema is already in the repo, and every infra
change otherwise waits on his availability.

Supersedes the Supabase paragraph of `MSG-GREG-ACCESS.md`, which treated a
project transfer as the only route to owning the data. It wasn't.

Everything below was checked against `../breakfast-club-rebuild` on 2026-11-21.

---

## 1. Why this holds up

| | Where it lives | |
|---|---|---|
| Schema | `supabase/migrations/` — 9 files | `supabase db push` rebuilds it |
| **RLS policies** | **6 of the 9 contain `policy` statements** | incl. `host_claims_and_invitations` and both `self_serve` migrations |
| Storage bucket | `20260928060953_event_poster_storage.sql` | creates `event-posters` with mime + size limits |
| The 48 clubs | `scripts/import-master-sheet.mjs` + the Master Sheet | you own the Sheet |
| Curated overlays | `lib/club-preview-data.json`, `lib/club-public-hosts.json` | in the repo |
| Rollbacks | `supabase/rollbacks/` for both self-serve migrations | |

**This also answers §7 Q3 of `VERCEL_MIGRATION.md` for free.** The RLS question
flagged as Greg-only — who can call `create_club_invitation`, whether
`host_applications` is properly scoped — is readable in the migrations. Read
them before you push; if a policy is missing you want to know now rather than
inherit it.

**The timing is right, and it won't stay right.** The auth table is him, maybe
you, maybe a handful — email login doesn't exist yet and the 48 have never been
invited, so there are almost no real users to migrate. Do this before
`HOST-CONFIRMATION.md` §5 goes out, not after.

## 2. The two things the repo doesn't carry

### Apple OAuth — and it answers itself

`components/social-auth.tsx` hard-codes both buttons, Google and Apple. The
provider secrets live in the Supabase dashboard, not in code, so a fresh project
has Apple unconfigured and the button renders anyway — it just surfaces
`error.message` in a Notice when tapped. Visible, not fatal.

So it's a straight choice, and the cheap answer is the right one:

- **Pay $99/yr** for an Apple Developer account, make a Services ID and a
  signing key, and replicate it. Or
- **Drop the Apple button** in a PR and ship Google + email magic link instead.

Take the second. `MSG-GREG-EMAIL.md` already establishes that the actual blocker
for the 48 hosts is email login — a good number are on their own business
domains with no Google *or* Apple account — so `signInWithOtp` is work you're
doing regardless, and it covers everyone Apple would have. Apple can come back
later if anyone asks for it.

### Hand-set dashboard state — one question, and it's the only one

Migrations capture what was migrated. Auth settings, redirect URLs, email
templates, rate limits, and any policy or trigger added directly in the
dashboard are not in the repo. The `Fairfield County, CT` rename proves Greg
hand-edits, so assume there's some of this.

This is the one thing worth asking him, it isn't an access request, and it's a
one-line answer from a busy person. It's in §4.

### Also worth knowing

- **Storage contents.** The migration makes the `event-posters` bucket, not the
  files in it. Likely near-empty since hosts have never been invited — confirm
  rather than assume.
- **Drift.** A reseed gives you the Sheet's 48, not the live table's, so Greg's
  hand-edits revert. Arguably the point: it forces the reconciliation
  `VERCEL_MIGRATION.md` §2 says is overdue.
- **The importer writes `status: "draft"`**, so there's a promotion step after
  it.
- **There's no `master-sheet-template.csv` in the repo.** The importer takes it
  as an argument — you export it from the Sheet yourself.

## 3. The rebuild, in order

1. **Supabase account + org** on your personal Google account — signs in via
   Google on all three platforms, same reasoning as `MSG-GREG-ACCESS.md`.
2. **Free or Pro.** Free is 500 MB database, 1 GB file storage, 50k monthly
   active users, 2 active projects — comfortably enough for 48 clubs. Two things
   argue for Pro at $25/month per org: Free pauses a project after a week idle,
   and Free has no daily backups. For the only copy of the host roster, the
   backups are the argument. Confirm current figures on `supabase.com/pricing`.
3. ~~**Read the 6 RLS migrations.**~~ **Done 2026-11-21 — see §7. Clean.**
4. **`supabase db push`** against the new project.
5. **Export the Master Sheet to CSV**, then dry-run the importer:
   `node scripts/import-master-sheet.mjs master-sheet-template.csv`. It writes
   `migration-review.json` with the rows that need attention and imports
   nothing. Fix the Sheet, re-run, then add `--apply` with `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` set.
6. **Fix the Sheet while you're in there** — the `United States` vs `USA`
   inconsistency across the 24 US rows, and decide whether `Fairfield County,
   CT` or `CT` is canonical.
7. **Google OAuth client** on Workspace. Ten minutes.
8. **Auth → URL Configuration**: Site URL `https://breakfastclubinternational.com`,
   with `/auth/callback` in the redirect list. This is the thing
   `MSG-GREG-NEXT.md` ask #2 was chasing — on your own project you just set it.
9. **Auth → SMTP → Resend**, once Resend is verified. The built-in mailer is
   rate-limited and not for production; magic links stall silently inside the 48
   if it's left on default.
10. **Promote the imported clubs** out of `draft`.
11. **Drop the Apple button**, add `signInWithOtp`. Separate PR from the design
    work.

Steps 1–2 and the Resend work don't depend on each other — run them in
parallel. Nothing here waits on Greg.

## 4. The message *(send this)*

Answers his Resend question, tells him the plan without making it a negotiation,
and asks the one thing only he knows. Deliberately short — he's busy, and the
less of this that reads as a request the faster it comes back.

> Morning! Glad the changes landed — send the details over whenever, happy to
> fix them.
>
> **Resend** — yeah I'll set it up, don't need a key from you. Two things worth
> flagging since you've done a thousand of these:
>
> I'm verifying **both** domains, not one. Magic links and anything a user
> triggers go from `hello@breakfastclubinternational.com`; the one bulk send —
> the 48 "claim your club" invites — goes from Ben's breakfastclubbing.com address.
> Those 48 have had mail from the old domain before, and a brand-new domain
> whose first act is a 48-message send is indistinguishable from a spam run.
> Reply-To on both is Ben's breakfastclubbing.com address.
>
> Also **don't let it add a root SPF record to breakfastclubbing.com** — there
> isn't one today and Google Workspace sends from that domain, so a fresh
> Resend-only SPF would be worse than none. The `send.` subdomain setup avoids
> it. I'll handle the DNS; the two domains are on different hosts (NS1 for the
> old one, Namecheap for the new) so it's easier from my side anyway.
>
> I'll make you a sending-access key scoped to the domain rather than a full
> one and send it via 1Password — not a trust thing, just that a full key in a
> chat log can send as the brand forever.
>
> **Supabase** — don't worry about access at all, I'd have the same hesitation
> with someone else's org. Everything I need is already in the repo, so I'll
> stand up a fresh project from the migrations and reseed the clubs off the
> master sheet. Cleaner for both of us and it stops me pinging you every time a
> redirect URL needs changing.
>
> **One question before I do:** anything set by hand in the Supabase dashboard
> that isn't in the migrations? Auth settings, email templates, rate limits,
> redirect URLs, anything added straight in the SQL editor. And is there
> anything in the `event-posters` bucket yet, or still empty? A "nope" is a
> perfectly good answer — just don't want to rebuild off an incomplete picture.
>
> (Read through the migrations, by the way — the RLS is tight. The pinned
> `search_path` on the definer functions and the column-level grants instead of
> blanket update are both better than what I usually find. Nothing to fix.)
>
> (Also dropping the Apple login button for now — doing email magic links
> instead, since a good chunk of the 48 hosts are on business domains with no
> Google or Apple account and currently can't log in at all.)
>
> Cheers 🙏

## 5. Unrelated find — it retires one of the PR 1 asks

Preview deploys are off because of `vercel.json` in the repo, not a dashboard
setting: `git.deploymentEnabled` is `{"main": true, "**": false}` and the
`ignoreCommand` reinforces it. So the second ask in `MSG-GREG-PR1.md` is a
one-line PR, not something to chase him for — which matters, because PR 2
squares `--r-pill` across every button, chip and card and can't honestly be
judged from a diff.

## 6. Notes for Mike, not for sending

- **The reply deliberately doesn't ask permission.** You're not taking anything
  from him — his project stays exactly as it is, and he keeps deploying to it
  if he wants. Framing it as a decision already made is both true and less work
  for him than a choice to weigh up.
- **Don't delete or touch his Supabase project.** It costs nothing to leave
  running and it's your rollback if the reseed goes sideways.
- **That risk is now retired.** Step 3 was the one with a real chance of
  finding an inherited bug. It didn't — see §7. Greg's RLS is careful work and
  the rebuild inherits it intact.
- **Vercel and Resend don't wait on any of this.** The domain is already yours
  to move: `breakfastclubinternational.com` is on Namecheap nameservers with A
  records pointed at Vercel, so the cutover is an edit you make, not an ask.

---

## 7. The RLS read — done, 2026-11-21

`VERCEL_MIGRATION.md` §7 Q3 asked what the policies are on `host_applications`,
`club_hosts` and `club_invitations`, and listed it as Greg-only. It wasn't, and
the answer is reassuring: **no missing policy, and the work is more careful than
the question assumed.**

RLS is enabled on all six tables that hold anything: `clubs`, `club_hosts`,
`host_applications`, `events`, `club_invitations`,
`club_schedule_exceptions`.

| Table | Read | Write |
|---|---|---|
| `clubs` | `status='published'` or admin or club host | insert/update **admin only** |
| `club_hosts` | own row (`user_id=auth.uid()`) or admin | insert/delete **admin only** |
| `host_applications` | own row or admin | insert own + forced `status='pending'`; owner update only while `pending`; status changes behind a guarded RPC |
| `events` | published event **on a published club**, or admin, or club host | insert requires admin/host **and** `created_by=auth.uid()`; delete admin, or host while `draft` |
| `club_invitations` | `app_private.can_manage_club_team(club_id)` only | via `create_club_invitation` |
| `club_schedule_exceptions` | published club, or admin, or host | admin or host |
| `storage.objects` (`event-posters`) | — | insert gated on folder depth 1 **and** an `exists` check against `clubs` |

Three things worth noting, because they're the habits of someone who has done
this before:

1. **Every `security definer` function pins `set search_path = ''`.** There's
   even a dedicated migration — `20260924052507_lock_is_admin_search_path.sql` —
   that exists only to fix this on `is_admin`. That's the exact privilege-
   escalation hole most Supabase projects ship with.
2. **Blanket `update` is revoked and replaced with column-level grants** on both
   `events` and `host_applications`. So a host can change a title or a time but
   cannot touch `club_id`, `status` or `created_by` even where the policy lets
   the row through.
3. **Admins share the `authenticated` SQL role**, which the code comments call
   out, so status transitions are deliberately behind guarded RPCs rather than
   policies.

**And the migration chain applies cleanly.** `events_read`, `events_delete` and
`applications_owner_update` are each recreated by a later migration, and every
one is preceded by `drop policy if exists`. So `supabase db push` against an
empty database won't trip over a duplicate policy — which was the one plausible
way the rebuild could fail on the first command.

**What this changes:** the rebuild's risk was never the schema. It's the
dashboard state in §2, which is why that's the only question left for Greg.

