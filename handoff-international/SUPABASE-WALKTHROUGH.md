# Supabase, start to finish — the clicks

**Written 2026-11-22.** The step-by-step version of `REBUILD-DAY.md`, for
someone who hasn't used Supabase before. That doc is the *why* and the findings;
this one is the *what to click*.

Keep this open next to the dashboard. Roughly 90 minutes if nothing snags, and
the snaggy part is Part 5.

---

## Part 0 — what you're actually doing

Supabase is a hosted **Postgres database** with four things bolted on: an auto-
generated API over your tables, user login, file storage, and a web dashboard.
Greg's app talks to all four.

You're not copying his database. You're creating an empty one and **replaying
the recipe** — the 9 files in `supabase/migrations/` are a complete description
of every table, permission and rule, written as SQL. Run them in order against
an empty project and you get a structurally identical database. Then you pour
the 48 clubs in from the Master Sheet.

Three words that'll come up:

- **Organisation** — the billing container. Projects live inside one. This is
  the thing that can't be shared per-project, which is the whole reason you're
  doing this.
- **Project** — one database. You want exactly one.
- **Migration** — one SQL file that changes the database's shape. Running them
  in order is how the schema gets built.
- **RLS (Row Level Security)** — per-row permission rules enforced by Postgres
  itself, so "a host can only edit their own club" is guaranteed by the database
  rather than hoped for by the app. Greg's are already written and they're good.
  You inherit them; you don't have to understand them to proceed.

---

## Part 1 — account and organisation

1. Go to **supabase.com** → **Start your project**.
2. **Sign in with GitHub or Google.** Use **your personal Google account** —
   the same identity as your Vercel and Google Workspace, so you're never
   wondering which account owns what.
3. It'll offer to create an organisation. Name it something that isn't a
   person's name — **`Breakfast Club`** — because this is the business's
   infrastructure now.
4. **Plan: choose Pro ($25/month).** Not upselling you — two specific reasons.
   Free pauses a project after a week of inactivity, and Free has no daily
   backups. This database will hold the only copy of the host roster. The
   backups are the argument.

## Part 2 — create the project

**New project**, then three fields that matter:

| Field | What to put | Why it matters |
|---|---|---|
| **Name** | `breakfast-club` | Cosmetic. |
| **Database Password** | Click **Generate**, then **save it in 1Password immediately** | You'll need it in Part 4. It is not fully recoverable later — you'd have to reset it. This is the single most common thing people lose here. |
| **Region** | **East US (North Virginia)** — `us-east-1` | **Cannot be changed later** without a full project migration. See the box below. |

Then **Create new project** and give it two or three minutes to provision.

### Why us-east-1 and not London

Counted off your actual export, not assumed:

| | Active clubs |
|---|---|
| North America | **26** |
| Europe + UK | 13 |
| Australia | 6 |
| Asia | 2 |

24 of the 48 are in the USA, four of those in New York City.

But the roster isn't even the main reason. This is a Next.js app using Server
Components and `@supabase/ssr`, which means **database queries run server-side,
inside Vercel functions** — so the round trip that governs page speed is
Vercel→Supabase, not visitor→Supabase. Vercel's default function region is
`iad1`, Washington DC. Putting the database in `us-east-1` puts it in the same
metro: single-digit milliseconds. Put it in London and every server-side query
crosses the Atlantic at ~80ms, several times per page load.

**The one argument that overrides this** is data residency. The `clubs` and
`host_applications` tables hold host names and email addresses, and 13 of the 48
clubs are UK/EU. Storing that in the US is lawful with the usual safeguards, but
if you'd rather it sat in the EU on principle, then pick **London (`eu-west-2`)
and also set Vercel's function region to `lhr1`** so they stay co-located — do
not split them across the Atlantic. That's a business call, not a technical one.

Absent a residency preference: `us-east-1`.

**Save the password before you click create.** Not after. People click create,
get excited, and lose it.

## Part 3 — the keys

Left sidebar → **Project Settings** (cog) → **API**. You want three values:

| What it's called | What it is | Where it's safe |
|---|---|---|
| **Project URL** | `https://<ref>.supabase.co` | Anywhere. It's public. |
| **anon** / **public** key | The "I'm a member of the public" key. RLS decides what it can see, which is why it's safe to ship to browsers. | Browser, git, anywhere. |
| **service_role** key | **Bypasses RLS entirely.** Full read/write on everything. | Server only. Never in a browser, never in git, never in chat. |

> **Corrected 2026-11-22.** An earlier version of this doc said to prefer the
> legacy `anon` / `service_role` JWTs, on the reasoning that `is_admin()` reads
> a JWT claim. That reasoning was wrong: `is_admin()` reads the *logged-in
> user's session token*, which is a JWT whichever API key style the project
> uses. So the newer keys are fine — and on a project created now they may be
> the only ones offered.
>
> What actually matters is **which slot each one goes in**:
>
> | Slot | Correct key | Never |
> |---|---|---|
> | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_…` or legacy `anon` | a secret key |
> | `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_…` or legacy `service_role` | — |
>
> Both are long strings that look equally opaque, and the dashboard lists them
> next to each other. Putting a secret key in the `NEXT_PUBLIC_` slot compiles
> an RLS-bypassing credential into the JavaScript every visitor downloads. It is
> an easy mistake and a serious one, so verify rather than assume — the check is
> in Part 3.5.

Now create the file. In your editor, make a new file at
`~/Desktop/1_ACTIVE_PROJECTS/breakfast-club-rebuild/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<the anon key>
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<the service_role key>
```

The URL appears twice deliberately: anything prefixed `NEXT_PUBLIC_` is sent to
the browser, so the bare pair is what server-side scripts use. `.env.local` is
already in `.gitignore`, so it can't be committed by accident.

## Part 3.5 — verify the keys before going further

Two minutes, read-only, and it caught a real mistake on the first run. Ask me,
or run it yourself:

```bash
cd ~/Desktop/1_ACTIVE_PROJECTS/breakfast-club-rebuild && set -a && . ./.env.local && set +a && for slot in NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY; do k=$(eval echo \$$slot); printf '%-32s %s  admin:%s\n' "$slot" "$(echo "$k" | cut -d_ -f1-2)_…" "$(curl -s -o /dev/null -w '%{http_code}' "$SUPABASE_URL/auth/v1/admin/users?per_page=1" -H "apikey: $k" -H "Authorization: Bearer $k")"; done
```

**The anon slot must NOT return `admin:200`.** If it does, a secret key is in the
public slot — replace it with the publishable key before anything else, and
delete the misplaced secret key in the dashboard.

Expected output is `admin:401` for the anon slot and `admin:200` for the service
slot.

To confirm the publishable key positively works, ask the client library rather
than curl:

```bash
cd ~/Desktop/1_ACTIVE_PROJECTS/breakfast-club-rebuild && set -a && . ./.env.local && set +a && node -e 'const{createClient}=require("@supabase/supabase-js");createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).from("clubs").select("id").limit(1).then(({error})=>console.log(error?error.code+" "+error.message:"OK"))'
```

Before Part 4 the right answer is a **table-not-found** error (`PGRST205` or
`42P01`) — that proves the key authenticated and the schema simply isn't built
yet. Anything mentioning *API key*, *JWT* or *Unauthorized* means the key is
wrong.

> **Don't use `GET /rest/v1/` as a key test.** That root path serves the OpenAPI
> spec and returns `401` for a publishable key even when the key is perfectly
> valid, with or without an `Authorization` header. It looks like a failure and
> isn't. Verified 2026-11-22.

## Part 4 — build the schema

Three commands. Run them from the app repo.

**Log the CLI in.** Opens a browser, you approve, it comes back:

```bash
cd ~/Desktop/1_ACTIVE_PROJECTS/breakfast-club-rebuild && npx --yes supabase@latest login
```

**Connect the folder to your project.** Your project ref is the string in the
dashboard URL, `supabase.com/dashboard/project/<ref>`:

```bash
cd ~/Desktop/1_ACTIVE_PROJECTS/breakfast-club-rebuild && npx --yes supabase@latest link --project-ref <project-ref>
```

> **This does not ask for your database password.** Corrected 2026-11-22: CLI
> 3.2.0 has no `--password` flag on `link` and doesn't prompt for one — it
> authenticates with the token from `login`. Older guides (and an earlier
> version of this doc) say otherwise.

**Run the migrations.** Note `--remote`:

```bash
cd ~/Desktop/1_ACTIVE_PROJECTS/breakfast-club-rebuild && npx --yes supabase@latest db push --remote
```

> **`--remote` is not optional.** In CLI 3.2.0 a bare `db push` targets your
> *local* database — which, with no Docker installed, does nothing useful and
> looks like a silent no-op. `--remote` is what aims it at your real project.

**This is the command that wants the database password** from Part 2. Leave
`--password` off and it prompts you, with the input hidden — that's the right
way. There is a `-p <password>` flag, but passing it inline writes your database
password into your shell history, so prefer the prompt.

It'll list the 9 files and ask you to confirm. Say yes. All nine should apply in
one pass — the chain is checked for the usual failure (a policy created twice
without being dropped first) and it's clean.

**Check it worked:** dashboard → **Table Editor**. You should see `clubs`,
`club_hosts`, `host_applications`, `events`, `club_invitations` and
`club_schedule_exceptions`, all empty, each showing **RLS enabled**. Under
**Storage** there should be an `event-posters` bucket.

## Part 4.5 — "Connect to GitHub"? Not here. Yes on Vercel.

The dashboard will offer to connect your repo. **Skip it**, and the reason is
the whole point of this rebuild.

Supabase's GitHub integration watches a branch and **applies migrations
automatically on push**. The repo is `eljamapps/breakfast-club-rebuild` — Greg's.
So connecting it would mean a commit of his could reshape your production
database with no action from you. You are rebuilding specifically so that your
database isn't downstream of someone else's availability; this would hand that
back, with the added charm of being automatic. (Supabase branching, the preview-
database feature, is also a paid per-branch add-on you don't need.)

Today you want exactly one deliberate `db push`, which is Part 4.

**Vercel is the opposite — there you must connect it**, because pulling the repo
and building it is literally how Vercel deploys. That's Part 10.

Two things to know when you do:

- **Only `main` will deploy.** `vercel.json` in the repo sets
  `git.deploymentEnabled` to `{"main": true, "**": false}`, so branch previews
  are off. That's a repo setting, not a Vercel one — it's a one-line PR if you
  want previews, and worth raising since judging design changes from a diff
  isn't realistic.
- **Greg's pushes to `main` will deploy to your project too.** Lower stakes than
  the database — a bad deploy is one click to roll back — but it's the same
  coupling. If and when you want to be properly independent, fork the repo to
  your own GitHub and point Vercel at the fork. Not today; it would orphan the
  open design PRs.

## Part 5 — Google login

The fiddliest part, and there's one mistake nearly everyone makes. Two different
systems each want a URL and **they are not the same URL.**

**First, in Google Cloud Console** (`console.cloud.google.com`):

1. Create a project, or reuse one. **APIs & Services** → **Credentials**.
2. **Create Credentials** → **OAuth client ID**. If it makes you configure a
   consent screen first, do that — External, app name "Breakfast Club", your
   email, save.
3. Application type: **Web application**.
4. Under **Authorised redirect URIs**, add exactly this — **the Supabase
   callback, not your app's**:

   ```
   https://<ref>.supabase.co/auth/v1/callback
   ```

5. Create. Copy the **Client ID** and **Client Secret**.

**Then in Supabase**: **Authentication** → **Providers** → **Google** → enable,
paste both values, save.

**Then still in Supabase**: **Authentication** → **URL Configuration**:

| Field | Value |
|---|---|
| **Site URL** | `http://localhost:3000` for now |
| **Redirect URLs** | `http://localhost:3000/auth/callback` |

Here's the distinction that trips people, worth reading twice:

- The **Google Cloud** redirect URI is where *Google* sends the user back to —
  always Supabase's own callback.
- The **Supabase** redirect URLs are where *Supabase* is allowed to send the
  user after that — your app's pages.

Get them the wrong way round and login completes but dumps you somewhere
strange. We'll add the real domain and the Vercel preview URLs later.

## Part 6 — make yourself an admin

Admin isn't a row in a table here. It's a flag on your login (`app_metadata`),
readable only from your session token. Which means **two** things have to
happen, and missing the second is why this appears broken.

**First, create your user by logging in once:**

```bash
cd ~/Desktop/1_ACTIVE_PROJECTS/breakfast-club-rebuild && npm run dev
```

Open `http://localhost:3000`, click **Continue with Google**, sign in. The site
will look wrong and have no clubs — expected, we haven't imported them.

> The **Continue with Apple** button will error if you click it. Also expected —
> we're dropping it in favour of email login, since a good number of the 48
> hosts have neither a Google nor an Apple account.

**Then set the flag.** Dashboard → **Authentication** → **Users** → click your
row → copy the **User UID**. Tell me the UID and I'll run it, or run it yourself
with the service_role key:

```bash
cd ~/Desktop/1_ACTIVE_PROJECTS/breakfast-club-rebuild && set -a && . ./.env.local && set +a && curl -s -X PUT "$SUPABASE_URL/auth/v1/admin/users/<your-user-uid>" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "Content-Type: application/json" --data '{"app_metadata":{"role":"admin"}}'
```

**Then sign out and sign back in.** This is the step. The flag lives in your
session token, and your current token was issued before the flag existed. Skip
this and every admin action fails with a permissions error that looks like a
bug in the app.

## Part 7 — import the 48 clubs

Already rehearsed against your real export — 48 ready, nothing blocking. Two
commands.

**Confirm the sheet still lines up** (the overlay is keyed on row position, so
re-sorting the sheet would silently scramble it):

```bash
cd ~/Desktop/1_ACTIVE_PROJECTS/Find_MY_BK_CLUB_main_recovery/handoff-international && node check-sheet-alignment.mjs "$HOME/Downloads/BC International Master Sheet.csv"
```

Wait for **"Safe to import."** It'll also note the Connecticut longitude
correction, which is expected and fine.

**Then import for real:**

```bash
cd ~/Desktop/1_ACTIVE_PROJECTS/breakfast-club-rebuild && set -a && . ./.env.local && set +a && node scripts/import-master-sheet.mjs "$HOME/Downloads/BC International Master Sheet.csv" --apply
```

Expect `48 draft clubs ready; 27 rows have review notes`. All 27 are the same
harmless note about `Upcoming_Date` — it means no calendar events were created,
which is intended; those need host confirmation.

## Part 8 — publish them

The import deliberately marks every club **draft**, and the permission rules
only show *published* clubs to the public. So right now the site shows nothing.

Dashboard → **SQL Editor** → **New query**:

```sql
update public.clubs set status = 'published' where status = 'draft';
```

Run. It should report 48 rows.

> **The one trap in this whole document.** If you ever re-run the importer, it
> sets every club back to `draft` and the site empties out. So: publish **last**,
> and if you re-import, publish again afterwards.

## Part 9 — check it actually works

`npm run dev`, then confirm four things:

1. Clubs appear on the home view.
2. A club page opens and the map pin is in the right country.
3. Google login completes and lands you back on the app.
4. `/host` loads for your now-admin user.

If clubs don't appear, it's Part 8. If everything 403s, it's the sign-out in
Part 6. Both are in `REBUILD-DAY.md` §8 with the rest.

## Part 10 — Vercel

Only once Part 9 is clean.

1. **vercel.com** → sign in with the same Google account → **Add New** →
   **Project** → import `breakfast-club-rebuild`.
2. Add the same four environment variables from `.env.local`.
3. Deploy. You'll get a `…vercel.app` URL.
4. Back in Supabase → **Authentication** → **URL Configuration**, add that URL's
   `/auth/callback` to the redirect list, or login won't work on it.
5. Check the same four things from Part 9 on the preview URL.

**Stop there.** Pointing `breakfastclubinternational.com` at it is a separate
decision and shouldn't happen until the design work has landed — otherwise
you're sending everyone to a site that still looks wrong.

---

## If something goes wrong

| Symptom | Cause |
|---|---|
| `db push` fails on a migration | Something's already in the database — likely a half-finished attempt. Easiest fix is a fresh project. |
| Everything returns 403 / "not authorized" | You didn't sign out and back in after Part 6. |
| Site loads but zero clubs | They're still `draft`. Part 8. |
| Login works then lands somewhere odd | The two URLs in Part 5 are crossed. |
| `link` rejects the password | That's the **database** password from Part 2, not your Supabase account password. |
| Clubs imported but the data looks subtly wrong | Stop. Run the Part 7 alignment check and reseed — don't hand-edit 48 rows. |

Anything not on this list, tell me what you see rather than clicking on.
