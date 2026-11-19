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

Use **`mk@breakfastclubbing.com`**, not a personal address, on all three. If
these accounts ever need to outlive a laptop or a handover, they should be tied
to the business identity. (Phase C makes that address work at the new domain
too, so it stays correct after the rename.)

---

## The message *(send this)*

> Hey Greg — couple of access bits so I can stop being a bottleneck on the
> DNS/domain stuff.
>
> **Vercel:** can you add me as a Member on the project? That's enough for
> domains and env vars, which is all I need. `mk@breakfastclubbing.com`.
>
> **GitHub:** collaborator on the repo, same address — then I can put the design
> changes up as a PR rather than sending you a list to apply by hand. It's four
> changes plus a few drop-in files.
>
> **Supabase** is the awkward one, because access is org-wide rather than
> per-project — so adding me would give me sight of anything else you've got in
> there, which neither of us probably wants. Easiest fix is to transfer the
> project into an org on my side and add you straight back as Administrator.
> Settings → General → Transfer project. Nothing changes for you day to day, it
> just means the club data and host records sit under the business account.
> I'll get an org set up so it's ready for you.
>
> Totally fine if any of these need to wait until after we're live — just let me
> know which, so I know what to route through you in the meantime.
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
