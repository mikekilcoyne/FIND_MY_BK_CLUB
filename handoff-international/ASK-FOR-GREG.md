# Ask for Greg

**Rewritten 2026-11-19** around email login, after reading the deployed bundle
and finding that the host confirmation system is already built
(`HOST-CONFIRMATION.md`). The earlier version led with three API fields; those
are still needed, but they are no longer the thing standing between here and a
working roster.

Two asks and one question. That is more than the one-ask rule this file used to
preach, but both are small, both are launch-blocking, and the question is a
five-second dashboard check. A third ask would be the one to cut.

---

## The message

> Hey Greg — went through the new site's back end properly this week. The host
> setup is genuinely impressive: invitations, co-host roles, transfer lead,
> hosts editing their own schedule and venue. I'd assumed we'd need to build
> most of that, and it's all sitting there already.
>
> Two things, both small.
>
> **1. Email login.** Right now the only auth in the app is
> `signInWithOAuth` — Google and Apple. No `signInWithOtp` anywhere. That
> blocks us on inviting the existing hosts, because a good number of them are
> on their own business domains with no Google or Apple account, so they can't
> log in at all.
>
> Magic link rather than a password, if you agree — nothing to reset, and the
> click proves the email, which is the same thing the invitation proves:
>
> ```js
> await supabase.auth.signInWithOtp({
>   email,
>   options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
> });
> ```
>
> The bit that's easy to miss: **Supabase's built-in mailer is rate-limited to
> a handful an hour and isn't meant for production.** Point SMTP at the
> SendGrid account that already sends the host reminders, or the 48 invites
> won't go out in one sitting.
>
> **2. Three fields on `/api/discover`.** I've moved breakfastclubbing.com off
> reading the Google Sheet directly — it's been publicly readable this whole
> time and the Emails column has every host's personal address in it. It now
> goes through a function, and the last step is pointing that function at
> Supabase so nothing touches the Sheet at all.
>
> `/api/discover` gets me almost everything, but three are missing:
>
> - **`featured`** — drives the featured strip
> - **`is_new`** — drives the NEW badge
> - **`upcoming_date`** — the next specific date, where a club has one
>
> They should already be columns on `clubs` from the seed. `schedule_rule` is
> only populated on 1 of 48, so it isn't standing in for `upcoming_date` yet.
> Everything else maps fine — `poster_url`→`flyer_url`, `whatsapp_url`→
> `whatsapp`, host URL arrays are good, and `active` is implicit since the
> endpoint only returns active clubs.
>
> **And one question:** who's allowed to call `create_club_invitation`? The
> whole confirm-the-hosts plan rests on it, so I want to be sure an
> authenticated user can't invite themselves to someone else's club. Same for
> RLS on `club_hosts` and `club_invitations`. I can read the function names
> from outside but not the policies.
>
> Cheers — the rest of it is in much better shape than I expected.

---

## If he asks why the Sheet matters

It's a "publish to web" CSV link: no Google sign-in, no file ID needed. Anyone
with the URL got all ~75 host email addresses, and the URL was printed in the
old site's client-side JavaScript. Ten of those hosts are EU/UK, so it's a GDPR
thing rather than untidiness.

---

## Hold back for later

Real, none of it blocking, and sending it now buries the two asks above.

**Greg's:**
- **`poster_url` is empty on 28 of 48 clubs** — the gallery runs at about 40%
  coverage, and the old Netlify flyer wall has flyers Supabase doesn't know
  about. Ten are a straight transfer; see `ROSTER-GAPS.md` §B.
- Whether `create_club_invitation` sends the mail or only mints the row. It
  decides whether inviting 48 hosts is a loop in the admin UI or a mail merge,
  but it doesn't change what he builds.

**Not Greg's — Ben's and the hosts':**
- `frequency` missing on 12 of 48 and `start_time` on 16. Checked against the
  Sheet and it's absent there too, so the seed didn't drop it — the data has
  never existed. Fixes itself once hosts are logged in and can edit their own
  schedule, which is the argument for doing the invites first.
- Berlin, Chicago and Ibiza have no host on record at all. No login flow helps
  a club nobody runs; those need asking in the group, or dropping.
