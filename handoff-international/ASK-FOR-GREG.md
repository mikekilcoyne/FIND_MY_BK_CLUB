# Ask for Greg — three fields on `/api/discover`

Paste-ready. Trim to taste; the specifics are the bit worth keeping.

Context for Mike, not for sending: this is the one thing blocking
`VERCEL_MIGRATION.md` §5.1, which is in turn what lets the Google Sheet be
locked down properly. Keep the ask to one thing — a message with five requests
in it gets read and deferred.

---

## The message

> Hey Greg — small API ask, should be quick.
>
> We're locking down the Master Sheet. It's been publicly readable this whole
> time, and the Emails column has every host's personal address in it, so that
> needs closing. I've moved breakfastclubbing.com off reading the Sheet directly
> and behind a function instead.
>
> Last step is pointing that function at Supabase so nothing touches the Sheet
> at all. `/api/discover` gets me almost everything — but three fields are
> missing, and two of them are load-bearing on the old site:
>
> - **`featured`** — drives the featured strip on the home view
> - **`is_new`** — drives the NEW badge on recently-added clubs
> - **`upcoming_date`** — the next specific date, where a club has one
>
> They should already be columns on `clubs` — they came over in the seed from
> the Sheet. `schedule_rule` is only populated on 1 of 48 clubs, so it isn't
> standing in for `upcoming_date` yet.
>
> Everything else maps fine: `poster_url`→`flyer_url`, `whatsapp_url`→
> `whatsapp`, the host URL arrays are good, and `active` is implicit since the
> endpoint only returns active clubs.
>
> One question while you're in there: **does anything on your side still read
> the Google Sheet?** A sync, a build step, a seed script. If something does,
> tell me before I restrict it — the failure mode is the roster quietly going
> stale rather than anything visibly breaking.
>
> Cheers.

---

## If he asks why it matters

The Sheet is a "publish to web" CSV link. No Google sign-in, no file ID
required — anyone who had the URL got all ~75 host email addresses, and the URL
was printed in the old site's client-side JavaScript. Ten of those hosts are
EU/UK, so it's a GDPR thing, not just untidiness.

---

## Hold these back for a second message

One ask lands; a list gets deferred. These are real but none of them is
blocking, and two aren't Greg's problem.

**For Greg, later:**
- **RLS on `host_applications` and `club_hosts`.** Worth confirming a policy
  exists. The difference between "a host edits their own club" and "any
  signed-in user edits any club" doesn't show up in the UI.
- **`poster_url` is empty on 28 of 48 clubs**, so the gallery is running at
  about 40% coverage. The Netlify flyer wall has more flyers than Supabase
  knows about — probably worth a second pass at the seed.

**Not Greg's — this one is Ben's and the hosts':**
- `frequency` is missing on 12 of 48 clubs and `start_time` on 16. Checked
  against the Sheet and it's missing *there* too, so this isn't something the
  seed dropped — the data has never existed. "When does this club meet" being
  blank for a quarter of the roster is a content gap, and the only fix is
  asking those hosts.
