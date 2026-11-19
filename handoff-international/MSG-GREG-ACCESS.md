# Message to Greg — access

**Written 2026-11-19.** Supersedes Message 1 of `MSG-GREG-DOMAIN.md`, which
asked for "Owner on Vercel" as a single catch-all. That was imprecise: the
three systems have different role models, and on Supabase the obvious ask has
a side effect worth avoiding.

---

## What to ask for, per platform

| System | Ask for | Why that level |
|---|---|---|
| **Vercel** | **Member** | Covers domains, env vars and DNS — everything currently blocking. Owner adds billing and team deletion, which you don't need unless you're taking the team over. |
| **Supabase** | **Transfer the project**, or Administrator | Auth URL config, the club-row fixes, sending invitations. See the wrinkle below. |
| **GitHub** | **Collaborator (Write)** | The design delta as a PR instead of Greg hand-applying a change list. |

### The Supabase wrinkle

**Supabase permissions are organisation-level, not project-level.** There's no
way to grant access to one project. Adding you to Greg's org means adding you to
*everything in it* — which, if he has other clients there, he may reasonably not
want to do, and you'd be seeing things that aren't yours either.

So for Supabase the cleaner ask is a **project transfer** into an org you own,
with Greg added back as Administrator. Same access for him, no exposure either
way, and the host data ends up in the name of the business. Supabase supports it
natively: Project Settings → General → Transfer project.

That needs a Supabase account on your side first, so sign up before sending this
if you haven't.

### Which email to use

**`kilcoyne.michael@gmail.com`** on all three — Mike's call, 2026-11-19.

An earlier draft suggested the business address. The practical argument runs
the other way: an invitation has to go to the address the account already uses,
and the existing Vercel account is on the Gmail one. Inviting anything else
creates a second account rather than granting access to the existing one. It
also signs in cleanly via Google on all three platforms.

Worth revisiting only if these accounts ever need to survive a handover — at
that point transfer them to a business address rather than trying to rename
them.

---

## The message *(send this)*

> Hey Greg — couple of access bits so I'm not a bottleneck on the DNS stuff.
> All on `kilcoyne.michael@gmail.com`:
>
> - **Vercel** — add me as a Member? Just need domains + env vars.
> - **GitHub** — collaborator, so I can put the design changes up as a PR
>   instead of sending you a list to apply.
> - **Supabase** — access is org-wide there, so adding me means sharing
>   everything else in your org too. Easier to transfer the project to an org
>   on my side and add you straight back as Admin. Settings → General →
>   Transfer project.
>
> Fine if any of it waits till after we're live — just say which and I'll route
> through you meanwhile.
>
> Cheers 🙏

---

## Notes for Mike, not for sending

- **Member can't initiate a project transfer on either platform.** That's an
  Owner action on Vercel and Owner/Administrator on Supabase. So if the end
  state is you owning the infrastructure, Greg does the transfer — being a
  Member first doesn't move you toward it.
- **If he's on Vercel Hobby he cannot add members at all**, at any price short
  of upgrading. If that's the answer, the Vercel ask becomes a transfer too, and
  Message 2 of `MSG-GREG-DOMAIN.md` is the fallback list of clicks for him.
- **Vercel Pro is $20/month per seat**, so adding you costs him money if he's
  paying. Worth saying you'll cover it, or taking the transfer route, rather
  than letting that be an unspoken reason it stalls.
- **The access question decides the DNS question.** If you end up owning the
  Vercel account, DNS-at-Vercel becomes fine and the nameserver switch can
  stand. If you stay a guest, revert `breakfastclubinternational.com` to
  Namecheap BasicDNS so you can run Phase C yourself. Don't settle the DNS until
  this lands.
- Deliberately framed as workflow, not trust. The transfer is the real ask, and
  it goes down better as "org-wide access is awkward for both of us" than as
  "I'd like to own the database."
