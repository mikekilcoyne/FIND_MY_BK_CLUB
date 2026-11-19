# Confirming hosts through login — it is already built

**Written 2026-11-19.** Read this before specifying or building anything for
host confirmation, because the answer is mostly "don't".

Everything below was read out of the deployed JavaScript on
`breakfast-club-rebuild.vercel.app`. The RPC and table names are literal strings
passed to `.rpc()` and `.from()`, so they are reliable. **Their signatures and
their RLS policies are not visible from outside** — that is the boundary of what
this can tell you, and §4 is the list of things only Greg can confirm.

---

## 1. The short version

> **Set up the backend to confirm hosts through login on their end.**

Greg has built it. All of it. What is missing is not engineering — **nobody has
sent the invitations.**

This is the whole host lifecycle, already deployed:

| RPC | Does |
|---|---|
| `create_club_invitation` | issue an invite for a club |
| `revoke_club_invitation` | cancel one |
| `get_club_invitation_preview` | what the invitee sees before accepting |
| `accept_club_invitation` | accept → row in `club_hosts` → `/host` |
| `get_club_team` | who runs this club |
| `remove_club_cohost`, `transfer_club_lead`, `leave_club` | team changes |
| `admin_list_applications`, `approve_host_application`, `admin_decline_application`, `link_host_application` | reviewing people who apply cold |
| `update_host_club_schedule`, `update_host_club_venue`, `update_host_club_profile`, `update_club_location`, `update_club_time_zone` | **a confirmed host editing their own club** |

Tables: `clubs`, `events`, `club_hosts`, `club_invitations`,
`club_schedule_exceptions`, `host_applications`.

It even has host vs co-host roles — the UI reads *"Run {city}"* or
*"Co-host {city}"* — and an invite link format of `?invite=<uuid>`, validated
client-side before it hits the server.

**Do not build a second version of this.**

---

## 2. What this means for the 22 missing schedules

`update_host_club_schedule` is in that list. A confirmed host can already fix
their own day and time.

So the plan in `CHASE-HOSTS.md` — DM 22 people, read their replies, type the
answers into a database by hand — is the worse version of a thing that exists.
Send the invitation instead. The host logs in, lands on `/host`, and fixes their
own club, and the correction arrives already structured and attributed.

That is also why `CHASE-HOSTS.md` is now marked *do not send yet*. It stops
being a transcription job and becomes a nudge: *"here's your invite, your club's
missing its time."*

**The exception is the clubs with no host on record** — Berlin, Chicago, Ibiza.
No login flow helps a club nobody runs. Those still need the group asking who
runs them, and dropping if nobody claims them.

---

## 3. The one real gap — email login

> **Add a regular 'login with regular email' option on login.**

This one is genuinely missing. Across every chunk on `/start` and `/host`, the
only auth call in the entire app is:

```
1  auth.signInWithOAuth     ← Google and Apple only
3  auth.signOut
```

No `signInWithOtp`, no `signInWithPassword`, no `signUp`. The two buttons are
*"Continue with Google"* and *"Continue with Apple"*, and that is the whole of
it.

### Use a magic link, not a password

Supabase supports both. Magic link (email OTP) is the right one here, for three
reasons:

1. **No password to store, forget, or reset.** A password adds a reset flow, a
   strength policy and a support burden, for hosts who sign in a few times a
   year.
2. **The click proves the email.** That is the same thing an invitation proves,
   so it fits the model that already exists rather than adding a second one.
3. **It covers the hosts OAuth cannot reach.** A host whose email is on a
   domain with no Google or Apple account currently cannot log in at all — and
   looking at the roster, a good number are on their own business domains.

On Greg's side it is roughly one button and one call:

```js
await supabase.auth.signInWithOtp({
  email,
  options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
});
```

The existing `/auth/callback` already handles the redirect — it 307s to
`/start?error=missing-code` without a code, so the failure path is real.

### The part that is not code

**Email auth has to be enabled in Supabase → Authentication → Providers**, and
**SMTP has to be configured**, which is the step people miss. Supabase's
built-in sender is rate-limited to a handful of messages an hour and is
explicitly not for production — fine for a test, useless for inviting 48 hosts
in an afternoon.

Point it at the SendGrid account that already sends the host reminders. One set
of credentials, one sender reputation, one place to look when mail goes astray.

I could not check whether email auth is already enabled: `/auth/v1/otp` returns
401 without an API key, which says nothing either way. Greg can see it in the
dashboard in about five seconds.

---

## 4. What only Greg can confirm

1. **Who can call `create_club_invitation`?** The whole model rests on it. If
   its RLS lets any authenticated user invite themselves to any club, the
   confirmation flow confirms nothing.
2. **Is RLS on `club_hosts` scoped to `user_id`?** Same question from the other
   side — it is what stops a confirmed host for one club editing another.
3. **Is email auth enabled, and is SMTP pointed at SendGrid?**
4. **Does `create_club_invitation` send the mail, or just mint the row?** That
   decides whether inviting 48 hosts is a loop in the admin UI or a mail merge.

---

## 5. The sequence

1. Greg confirms §4 — mostly dashboard checks.
2. Add email login (§3). Small, and it unblocks hosts on domains OAuth cannot
   reach.
3. **Seed `club_hosts` by inviting the existing 48.** This is the actual work,
   and it is operational rather than technical. Start with five hosts you can
   phone if something is confusing; fix whatever that surfaces; then send the
   rest.
4. *Then* chase the schedule gaps — `CHASE-HOSTS.md`, reframed as a nudge
   alongside the invite rather than a request to reply with details.
5. Berlin, Chicago and Ibiza separately: find out who runs them, or drop them.

The thing to resist is step 3 feeling too unglamorous to be the plan. It is the
plan. The software is done; the roster is not.
