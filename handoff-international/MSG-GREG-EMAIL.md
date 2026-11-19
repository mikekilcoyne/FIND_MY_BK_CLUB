# Reply to Greg — the from-address for Resend

**Written 2026-11-19**, answering: *"Do you have email set up for either domain?
I'll setup resend to handle automatic emails but didn't know if there was email
address to list."*

All DNS claims below were checked against the authoritative nameservers, not
assumed. §3 has the raw records.

---

## The message *(send this)*

> Yeah — breakfastclubbing.com is on Google Workspace, so there are real
> mailboxes:
>
> - `ben@breakfastclubbing.com` — host-facing, Ben reads it
> - `set@breakfastclubbing.com` — what the current system mail already sends as
> - `mk@breakfastclubbing.com` — me
>
> **breakfastclubinternational.com has no real mailboxes** — just Namecheap
> forwarding at the DNS level. So I'd send from breakfastclubbing.com even
> though the site itself lives on the new domain. Two reasons: the hosts
> recognise it, and a brand-new domain has zero sending reputation — the first
> thing out of it would be 48 invites in one go, which is precisely the shape
> of a spam run.
>
> So for Resend:
>
> ```
> From:     Breakfast Club <set@breakfastclubbing.com>
> Reply-To: ben@breakfastclubbing.com
> ```
>
> `set@` is already the system sender on the current site, so it keeps one
> pattern rather than inventing a second. Reply-To on `ben@` means anyone who
> just hits reply reaches a human instead of a void.
>
> Two things before you add the DNS:
>
> **1. That domain's DNS isn't at Namecheap** — it's on NS1 (Netlify DNS). Send
> me Resend's records and I'll add them. One caution: **don't let anything add
> a root SPF record unasked.** There isn't one today, and both Google Workspace
> and SendGrid send from that domain — so a fresh `v=spf1` covering only Resend
> would be worse than having none at all. Resend's `send.` subdomain setup puts
> SPF on the subdomain and sidesteps the whole problem, so that's the one I'd use.
>
> **2. SendGrid is already domain-authenticated on breakfastclubbing.com** —
> `s1`/`s2` DKIM are live and it's what sends the weekly host reminders right
> now. Not saying switch; Resend is probably nicer to work with. Just so you
> know you're not starting from zero if you'd rather reuse it. Either way: one
> sender, not two.
>
> And the bit that's easiest to miss — **Supabase → Authentication → SMTP has
> to point at Resend as well.** Supabase's built-in mailer is rate-limited to a
> handful an hour and explicitly isn't for production, so magic links and
> invitations will stall silently somewhere inside the 48 if that's left on
> default.
>
> Cheers 🙏

---

## Optional paragraph — folds in the email-login ask

This is the natural moment for it: he's wiring mail anyway, and the SMTP point
above only matters *because* of magic links. Append this if you want it in the
same message rather than a separate one. Full version is in `ASK-FOR-GREG.md`.

> Related, while you're in there: the only auth call in the app right now is
> `signInWithOAuth` — Google and Apple. No `signInWithOtp` anywhere. That's
> what blocks inviting the existing hosts, because a good number of them are on
> their own business domains with no Google or Apple account, so they can't log
> in at all. Magic link rather than a password, if you agree — nothing to
> reset, and the click proves the email, which is the same thing the invitation
> already proves.
>
> ```js
> await supabase.auth.signInWithOtp({
>   email,
>   options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
> });
> ```

---

## What's actually on the two domains

Checked 2026-11-19 against the authoritative nameservers.

### breakfastclubbing.com — real email, on Google Workspace

| | |
|---|---|
| Nameservers | `dns1–4.p06.nsone.net` — **NS1, i.e. Netlify DNS** |
| MX | `1 smtp.google.com` — Google Workspace |
| SPF | **none.** No `v=spf1` record exists at the root |
| DKIM | `google._domainkey` (Workspace) + `s1`/`s2._domainkey` → `u60720214.wl215.sendgrid.net` |
| DMARC | `v=DMARC1; p=none;` |

So: Workspace mailboxes for inbound, and **SendGrid already fully
domain-authenticated** for outbound. The repo backs that up — `SENDGRID_API_KEY`
is used by `admin-api.js`, `submit-club-update.js`,
`send-host-reminder-background.js` and `weekly-host-reminder.js`, with
`FROM_EMAIL` set to `set@` in the first two and `ben@` in the reminders.

### breakfastclubinternational.com — forwarding only

| | |
|---|---|
| Nameservers | `dns1/2.registrar-servers.com` — Namecheap BasicDNS |
| MX | five `eforward1–5.registrar-servers.com` — Namecheap email forwarding |
| SPF | `v=spf1 include:spf.efwd.registrar-servers.com ~all` |
| DKIM / DMARC | none |

Forwarding is enabled at the DNS level; whether any address is actually
configured is only visible in the Namecheap dashboard. Either way it's a
forwarder, not a mailbox, and it has never sent anything.

---

## The SPF gap, separately

**breakfastclubbing.com has no SPF record.** Not Resend's doing — it's been
that way. With DMARC at `p=none` nothing is being rejected, so mail delivers
and this has been invisible. But it means outbound from that domain passes on
DKIM alone.

Worth fixing, and the right time is while Resend's records are going in anyway,
because it has to cover every sender at once:

```
v=spf1 include:_spf.google.com include:sendgrid.net ~all
```

Add Resend only if its setup asks for a root SPF rather than the `send.`
subdomain. **One SPF record per domain, ever** — a second one makes SPF fail
outright rather than merging, which is the trap here.

Don't do this in the same change as the Vercel DNS work. One mail change at a
time, so if something bounces you know which edit caused it.

---

## Notes for Mike, not for sending

- **Resend vs SendGrid is genuinely a toss-up.** SendGrid is already
  authenticated and already sends the reminders; Resend is Greg's preference and
  fits the Vercel/Supabase side better. The thing that matters is that it's
  *one* of them, not both — two senders on one domain means two reputations and
  two places to look when mail goes missing.
- If Greg goes with Resend, the Netlify functions still send via SendGrid. That
  is two senders. Fine as a transition, not fine as a resting state — the
  functions move to Supabase eventually anyway (`VERCEL_MIGRATION.md`).
- `receive-club-update-email.js` is an inbound webhook, and there's no
  inbound-parse subdomain in DNS, so nothing Resend adds will disturb it.
