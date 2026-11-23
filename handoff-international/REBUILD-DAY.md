# Rebuild day — runbook

**Written 2026-11-21 for 2026-11-22.** Companion to `SUPABASE-REBUILD.md`,
which is the *why*. This is the order of operations, the commands, and the
three things that will stop you if you hit them cold.

**New to Supabase? Use `SUPABASE-WALKTHROUGH.md` instead** — same sequence, but
every click, with the concepts explained and the two-URL OAuth trap spelled out.
This doc is the condensed version.

Checked against `../breakfast-club-rebuild` on 2026-11-21. Supabase CLI 3.2.0
confirmed working via `npx` — Homebrew is not needed and the Command Line Tools
error can be ignored.

**Scope for the day: a working Supabase project with 48 published clubs, Google
login, and the app running against it locally and on a Vercel preview URL.**
Not the domain. Not the host invites. Those are separate days and §7 says why.

**Updated the morning of 2026-11-22**: §1.4 added, §1.2 done, and the sheet
export verified — see §9. The alignment gate passes and the import is clean.
The only thing still missing before `--apply` is the Supabase project itself.

---

## 1. Four findings that change the plan

Each of these is a thing you'd otherwise discover at the worst moment.

### 1.1 `is_admin()` is a JWT claim, not a table row

```sql
create function public.is_admin() returns boolean language sql stable as $$
  select coalesce(auth.jwt()->'app_metadata'->>'role' = 'admin', false)
$$;
```

There is no `admin_users` table to insert yourself into. Admin is
`app_metadata.role = 'admin'` on your auth user, and `app_metadata` can only be
written server-side — service role key or the dashboard. **And the claim is read
from the token, so you must sign out and back in after setting it.** Otherwise
every admin-gated thing fails and looks like a permissions bug. Phase 3.

### 1.2 The importer silently drops WhatsApp links and descriptions

`scripts/import-master-sheet.mjs` hardcodes `whatsapp_url: null` and
`description: null` on every row, even though the Sheet has a `WhatsApp` column
and the `clubs` table has a `whatsapp_url` column. `poster_url` only survives if
the Sheet's `Flyer_URL` is a direct image URL — anything else is dropped with a
review note.

So a clean reseed loses every WhatsApp link. One line to fix in the importer
before you run it, and much easier than noticing in a fortnight. Phase 4.

### 1.3 `featured`, `is_new` and `upcoming_date` don't exist

**Correction to `VERCEL_MIGRATION.md` §5.1**, which says they are "almost
certainly already columns on the `clubs` table, since they came over in the
seed." They are not. They appear nowhere in the 9 migrations — not as columns,
not in any function. `grep` across `supabase/migrations/` returns nothing.

That matters twice over:

- The ask to Greg in §5.1 was never "expose three existing columns." It was
  "add three columns and then expose them," which is a bigger favour than it
  was framed as. Moot now that you own the project.
- `scripts/release-smoke-check.sh` on the Netlify side asserts `badge-featured`
  and `region-pill-new`, so they're load-bearing on the old home view. If you
  want parity, that's **your own migration to write** — which is the first real
  upside of owning this.

Not a blocker for tomorrow. Note it, write the migration later.

### 1.4 The curated overlay is keyed on row *position*, and it overrides the sheet

**Found 2026-11-22, and it gates the whole import.**

`lib/club-preview-data.json` holds 48 curated entries keyed by `source_row` —
which the importer computes as `index + 2`, i.e. the physical row number in the
exported CSV. And curated values **win over the sheet**:

```js
const city = curated?.city ?? String(row.City ?? "").trim()
```

Same for `region`, `latitude`, `longitude`, `time_zone`, `venue_name`,
`start_time`, `frequency` and `poster_url`. The `Fairfield County, CT` rename
lives here, at `source_row` 20 — it was never a Supabase hand-edit.

So **if the Master Sheet has been sorted, or had a row inserted or deleted,
since that file was generated, curated data lands on the wrong club** — wrong
city, wrong venue, wrong coordinates, and because `time_zone` falls back to
`tzLookup(lat, lng)`, a wrong timezone derived from the wrong coordinates. No
error, no warning, 48 plausible-looking rows.

Demonstrated: a test sheet of four invented cities came back as `chicago`,
`ibiza`, `lugano` and `new-york-hudson`. The curated `source_row` values run
2–57 and are **non-contiguous**, so the sheet they were generated against had
~56 data rows with the inactive ones interleaved. Any reordering since is
invisible.

**The check is written and it's dependency-free:**

```bash
cd ~/Desktop/1_ACTIVE_PROJECTS/Find_MY_BK_CLUB_main_recovery/handoff-international && node check-sheet-alignment.mjs ~/path/to/master-sheet.csv
```

It compares each curated entry against the sheet row it would claim, by city
tokens and by distance between the two sets of coordinates, and exits non-zero
if anything looks wrong. It writes nothing and touches no database.

If it comes back dirty you have two options: restore the sheet's original row
order, or regenerate `club-preview-data.json` against the sheet as it stands.
**Do not import until it's clean** — a silently mis-seeded roster is far more
expensive to unpick than an hour spent here, because every club looks fine
individually.

## 2. Before you start

Twenty minutes, and better done tonight so tomorrow is uninterrupted. Needs
your password or your card, so it can't be delegated.

1. **Supabase account + organisation**, on your personal Google account. Signs
   in via Google on all three platforms — same reasoning as
   `MSG-GREG-ACCESS.md`.
2. **Free or Pro.** Free is 500 MB database, 1 GB file storage, 50k monthly
   active users, 2 active projects — plenty for 48 clubs. Pro at $25/month per
   org buys daily backups and stops the project pausing after a week idle. For
   the only copy of the host roster, take Pro. Confirm the current figures on
   `supabase.com/pricing` rather than trusting this line.
3. **Pick a region and write it down.** It can't be changed later without a
   full migration. **`us-east-1` (East US, N. Virginia).** Corrected 2026-11-22:
   an earlier draft here said London or Frankfurt on the assumption the hosts
   skew UK/Europe. The export says otherwise — 26 of 48 clubs are North
   American, 24 in the USA. More decisively, server-side queries run in Vercel
   functions whose default region is `iad1`, so `us-east-1` co-locates them.
   Only pick London if you want EU data residency, and then set Vercel's
   function region to `lhr1` to match. See `SUPABASE-WALKTHROUGH.md` Part 2.
4. **Export the Master Sheet to CSV.** The importer takes a path as its first
   argument and there's no copy in the repo. Save it somewhere stable, not
   Downloads.
5. **A Resend account** if you haven't — independent track, doesn't block
   anything below, and `MSG-GREG-EMAIL.md` §3 has the DNS.

## 3. Phase 1–3: project, schema, admin

**Phase 1 — create the project.** Dashboard. Note the project ref, the URL, the
anon key and the service role key. Put them in `.env.local` in the repo, not in
a note app:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon>
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role>
```

`.env.local` is gitignored. The service role key bypasses RLS entirely — it
never goes in a `NEXT_PUBLIC_` var and never into Vercel's client-side env.

**Phase 2 — push the schema.**

```bash
cd ~/Desktop/1_ACTIVE_PROJECTS/breakfast-club-rebuild && npx --yes supabase@latest login
```

```bash
cd ~/Desktop/1_ACTIVE_PROJECTS/breakfast-club-rebuild && npx --yes supabase@latest link --project-ref <project-ref>
```

```bash
cd ~/Desktop/1_ACTIVE_PROJECTS/breakfast-club-rebuild && npx --yes supabase@latest db push --remote
```

**Corrected 2026-11-22 against CLI 3.2.0:** `link` takes no database password —
it has no such flag and doesn't prompt. `db push` **defaults to the local
database**, so `--remote` is required or it silently targets a Docker stack that
isn't there. `db push --remote` is where the password is asked for; let it
prompt rather than passing `-p`, which would put it in shell history.

All 9 migrations should apply in one pass. §7 of `SUPABASE-REBUILD.md` confirms
every recreated policy is preceded by `drop policy if exists`, so a duplicate-
policy failure on the first command is already ruled out.

**Checkpoint:** Table Editor shows `clubs`, `club_hosts`, `host_applications`,
`events`, `club_invitations`, `club_schedule_exceptions`, and an
`event-posters` bucket under Storage. RLS enabled on all six.

**Phase 3 — make yourself admin.** The §1.1 gotcha, in order:

1. Configure Google as an auth provider first (Phase 5) or you can't sign in
   to create the user. **This is the one ordering trap in the day** — Phase 3
   needs a user, and a user needs a working provider.
2. Sign in once on `localhost:3000` to create your auth user.
3. Authentication → Users → copy your user id.
4. Set the claim:

```bash
curl -X PUT "$SUPABASE_URL/auth/v1/admin/users/<user-id>" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Content-Type: application/json" --data '{"app_metadata":{"role":"admin"}}'
```

5. **Sign out and back in.** The claim is in the token, not the database.

**Checkpoint:** decode your JWT (jwt.io, or the browser's session storage) and
confirm `app_metadata.role` is `admin`. Don't move on until you've seen it.

## 4. Phase 4: seed the 48 clubs

**§1.2 is already done.** `scripts/import-master-sheet.mjs` now carries
`WhatsApp` and `Host_Bio` through to `whatsapp_url` and `description`, with the
link validated against the same pattern as
`20261105000000_self_serve_2.sql:196` (`wa.me` or `chat.whatsapp.com` only), and
a review note when a link is present but rejected. Verified against a synthetic
sheet covering all four cases. **Uncommitted, and sitting on the
`design/clubby-egg-and-marks` branch** — move it to its own branch before
committing so it doesn't land in PR #33.

**Then check the alignment — §1.4, and this is a gate, not a suggestion:**

```bash
cd ~/Desktop/1_ACTIVE_PROJECTS/Find_MY_BK_CLUB_main_recovery/handoff-international && node check-sheet-alignment.mjs ~/path/to/master-sheet.csv
```

Clean, or stop and fix it. Everything below assumes it passed.

**Dry run.** No `--apply`, so it touches nothing:

```bash
cd ~/Desktop/1_ACTIVE_PROJECTS/breakfast-club-rebuild && node scripts/import-master-sheet.mjs ~/path/to/master-sheet.csv
```

It writes `migration-review.json` and prints a count. Read it. Expect notes
about missing coordinates, region/coordinate conflicts, `Flyer_URL`s that
aren't direct images, and every row with an `Upcoming_Date` (events are
deliberately not imported — they need host confirmation).

**Fix the Sheet, don't fix the data downstream.** While you're in there, the
two known inconsistencies: `United States` vs `USA` across the 24 US rows, and
whether `Fairfield County, CT` or `CT` is canonical. Re-run the dry run until
the review file is boring.

**Apply.**

```bash
cd ~/Desktop/1_ACTIVE_PROJECTS/breakfast-club-rebuild && SUPABASE_URL="https://<ref>.supabase.co" SUPABASE_SERVICE_ROLE_KEY="<service-role>" node scripts/import-master-sheet.mjs ~/path/to/master-sheet.csv --apply
```

It upserts on `slug`, so it's safely re-runnable.

**But — the trap — it writes `status: 'draft'` on every run.** Re-running after
you've published resets all 48 to draft and the public site empties out. So
publish *last*, and if you ever re-run the importer, publish again after.

## 5. Phase 5: publish, auth, verify

**Publish.** The importer's own closing line is "Review and publish them in
Supabase." `status` is `check (status in ('draft','published','archived'))`, and
`clubs_read` only shows `published` rows to anon — so until this runs, the
public site shows zero clubs. SQL editor:

```sql
update public.clubs set status = 'published' where status = 'draft';
```

Spot-check a handful in the Table Editor first. 48 rows is small enough to
actually look at.

**Google OAuth.** Create an OAuth client on Workspace, add it under
Authentication → Providers → Google. Ten minutes. Note this has to happen
*before* Phase 3 step 2 — see the ordering trap above.

**Auth → URL Configuration.** Site URL
`https://breakfastclubinternational.com`, with
`https://breakfastclubinternational.com/auth/callback` in the redirect list,
plus `http://localhost:3000/auth/callback` for local work and your Vercel
preview URLs. This is what `MSG-GREG-NEXT.md` ask #2 was chasing — on your own
project it's a form you fill in.

**Verify locally.** `npm run dev`, then: clubs render on the home view, a club
page opens, Google login completes and lands back on the app rather than a
stray URL, and the `/host` dashboard loads for your now-admin user.

**Then Vercel.** New project off the repo, the four env vars, deploy to a
preview URL. Confirm the same four things on the preview.

## 6. Order, and what's parallel

```
Supabase org ─┬─ create project ── db push ── Google provider ──┬─ sign in ── set admin claim ── re-login
              │                                                 │
              └─ (Phase 2 checkpoint)                            └─ importer dry run ── fix Sheet ── apply ── publish
                                                                                                              │
Resend account ── verify both domains ── DNS ──────────────────────────── Auth → SMTP ────────────────────────┤
                                                                                                              │
                                                                            Vercel project ── env vars ── preview
```

Resend runs entirely in parallel and only converges at Auth → SMTP, which isn't
needed until magic links exist. If Resend verification stalls on DNS
propagation, nothing else waits.

## 7. Deliberately not today

- **The domain cutover.** `breakfastclubinternational.com` is on Namecheap
  nameservers with A records at Vercel, so it's yours to move whenever — but
  moving it before the design lands points everyone at a site that still looks
  wrong. Phase E in `LAUNCH-CHECKLIST.md`.
- **The 48 host invites.** Needs email login (`signInWithOtp`) and Resend
  wired to SMTP first. `HOST-CONFIRMATION.md` §5. Also the thing that makes
  this rebuild cheap today and expensive later, so don't let it creep forward.
- **Dropping the Apple button.** Its own small PR, separate from the design
  work. Until then the button renders and errors when tapped, which is ugly but
  not fatal.
- **The `featured` / `is_new` / `upcoming_date` migration.** §1.3. Write it when
  you want home-view parity, not while standing up the project.
- **Deleting anything of Greg's.** His project costs nothing to leave running
  and it's your rollback if the reseed goes sideways.

## 8. If it goes wrong

- **`db push` fails on a migration.** Read the error for which file. The chain
  is verified clean on an empty database, so a failure means something is
  already in there — most likely a half-finished earlier attempt. Easiest fix
  is a fresh project rather than unpicking it.
- **Everything 403s / `is_admin()` false.** You didn't re-login after setting
  the claim. §1.1.
- **Site renders but zero clubs.** They're still `draft`. §5.
- **Login bounces to the wrong URL.** Redirect list in Auth → URL
  Configuration.
- **Clubs imported but no WhatsApp links.** §1.2 — you ran the stock importer
  rather than the patched one. Re-run with the fix, then re-publish.
- **Clubs imported but the data is subtly wrong** — right cities, odd venues or
  map pins in the wrong place. That's §1.4. Stop, run the alignment check, and
  reseed rather than editing 48 rows by hand.

---

## 9. Verified against the real export, 2026-11-22

Export: `~/Downloads/BC International Master Sheet.csv` — 57 lines, all 23
expected columns, 56 data rows, 48 active. Exactly the shape §1.4 predicted.

### The alignment gate passes

47 of 48 curated entries line up with the sheet rows they claim, so **the row
order is intact** — nothing has been sorted or deleted since
`club-preview-data.json` was generated. The §1.4 disaster case did not happen.

One row differs, and it is a deliberate correction rather than drift:

| | Sheet row 20 | Curated |
|---|---|---|
| City | `CT` | `Fairfield County, CT` |
| Longitude | **`73.4687`** | **`-73.4687`** |
| Country | `United States` | `USA` |
| Venue | Zucchero Cafe | Zucchero Cafe |

The sheet holds a **positive** longitude, which puts a Connecticut club in
Kazakhstan — 10,291 km out. The overlay carries
`"coordinate_note": "Corrected west longitude from source sheet"` and fixes both
that and the country spelling. `check-sheet-alignment.mjs` now recognises a
`coordinate_note` as an explicit correction and reports it separately instead of
failing the gate. Two entries carry one: row 20, and row 42 (Detroit,
"Approximate city centre").

**Still worth fixing at source**, so the overlay stops being load-bearing:
sheet row 20's longitude to `-73.4687`, and `United States` to `USA` across the
US rows. Neither blocks the import.

### The dry run is clean

48 clubs ready. **Zero blocking issues. Zero rejected WhatsApp links.** All 27
review notes are the same by-design entry — `Upcoming_Date requires host
confirmation; no event imported` — so no `events` rows are created, which is
intended. 20 of the 48 carry a `poster_url`.

### What §1.2's patch actually recovers

Honest accounting, because the raw column counts are misleading — `Host_Bio`
contains commas, so a naive split over-counts both columns:

| | In the sheet | On active rows | Imported |
|---|---|---|---|
| `WhatsApp` | 4 | 3 | **3** |
| `Host_Bio` | 1 | 0 | 0 |

So the WhatsApp half of the patch works and recovers all three links that exist
— Mexico City, New York–Hamptons, San Francisco. **The description half is a
no-op against today's data**: the single bio in the sheet sits on an inactive
row. It stays in because it costs nothing and bios are coming, but it changes
nothing today. Worth knowing so nobody goes looking for 48 missing bios.

### What still blocks `--apply`

Only the Supabase project. §2 steps 1–3 are untouched: no account, no org, no
region chosen, so no `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` to import
against. Everything downstream of that is now proven to work.

