# Reply to Greg — the from-address for Resend

**Written 2026-11-19**, answering: *"Do you have email set up for either domain?
I'll setup resend to handle automatic emails but didn't know if there was email
address to list."*

**Revised the same day:** SendGrid is being retired — Supabase + Vercel is the
backend. The first draft offered reusing SendGrid since it's already
domain-authenticated. That option is gone, so this now sets both domains up in
Resend from scratch. §3 has the raw DNS either way.

---

## The message *(send this)*

> Yeah — breakfastclubbing.com is on Google Workspace, so there are real
> mailboxes: `ben@`, `set@` and `mk@`. The new domain has no mailbox, just
> Namecheap forwarding at the DNS level, but I'm fixing that this week by adding
> it as a Workspace domain alias — so `ben@breakfastclubinternational.com` will
> land in the same inbox as `ben@breakfastclubbing.com`.
>
> **Verify both domains in Resend, not one.** They do different jobs:
>
> ```
> Magic links, invite-accepted, anything a user triggers
>   → from  hello@breakfastclubinternational.com
>
> The one bulk send — the 48 "claim your club" invites
>   → from  ben@breakfastclubbing.com
>
> Reply-To on both: ben@breakfastclubbing.com
> ```
>
> The reason for the split: those 48 hosts have had mail from
> breakfastclubbing.com before, so it's the safer domain for a single 48-message
> send — a brand-new domain whose first act is a bulk send to 48 people looks
> exactly like a spam run, and these are the people we can least afford to land
> in junk. Meanwhile the magic links warm the new domain properly, because
> they're requested by the recipient and actually get opened, which is the best
> reputation signal going. Both authenticated from day one, so there's no second
> migration later.
>
> Two things on the DNS:
>
> **1. The two domains have different DNS hosts.** breakfastclubbing.com is on
> NS1 (Netlify DNS) and breakfastclubinternational.com is at Namecheap — so
> send me both record sets and I'll add them in the right places. I'll confirm
> each one resolves before you hit verify in Resend.
>
> **2. Don't let the wizard add a root SPF record to breakfastclubbing.com.**
> There isn't one today — I checked the authoritative nameservers, there's no
> `v=spf1` at all. Google Workspace sends from that domain, so a fresh SPF
> covering only Resend would be worse than having none. Resend's `send.`
> subdomain setup puts SPF on the subdomain and sidesteps it entirely — use
> that one.
>
> And the bit that's easiest to miss: **Supabase → Authentication → SMTP has to
> point at Resend as well.** Supabase's built-in mailer is rate-limited to a
> handful an hour and explicitly isn't for production, so magic links and
> invitations will stall silently somewhere inside the 48 if that's left on
> default.
>
> Cheers 🙏

---

## Optional paragraph — folds in the email-login ask

The natural moment for it: he's wiring mail anyway, and the SMTP point above
only matters *because* of magic links. Full version in `ASK-FOR-GREG.md`.

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
| DKIM | `google._domainkey` + `s1`/`s2._domainkey` → `u60720214.wl215.sendgrid.net` |
| DMARC | `v=DMARC1; p=none;` |

The SendGrid DKIM records are live and still authenticate the domain. They're
now legacy — four Netlify functions send through them (`admin-api.js`,
`submit-club-update.js`, `send-host-reminder-background.js`,
`weekly-host-reminder.js`) and all four are on the way out. **Leave the records
in place until those functions stop sending**, then remove them; pulling them
early just bounces the weekly reminders in the meantime.

### breakfastclubinternational.com — forwarding only, no website yet

| | |
|---|---|
| Nameservers | `dns1/2.registrar-servers.com` — Namecheap BasicDNS |
| A / CNAME | **none.** The domain does not resolve at all |
| MX | five `eforward1–5.registrar-servers.com` — Namecheap forwarding |
| SPF | `v=spf1 include:spf.efwd.registrar-servers.com ~all` |
| DKIM / DMARC | none |

A forwarder, not a mailbox, and it has never sent anything. Phase C of
`LAUNCH-CHECKLIST.md` replaces the MX with Google's as part of the domain alias.

---

## The SPF gap on breakfastclubbing.com

**No SPF record exists.** Not Resend's doing — it's been that way. DMARC is at
`p=none` so nothing is being rejected and this has stayed invisible, but it
means outbound from that domain passes on DKIM alone.

Fix it once, at the end, when you know what still sends. Not launch-blocking.
While the Netlify functions are still alive:

```
v=spf1 include:_spf.google.com include:sendgrid.net ~all
```

Drop the `sendgrid.net` include once they're retired. **One SPF record per
domain, ever** — a second one makes SPF fail outright rather than merging, which
is the trap here. And don't bundle this with the Vercel DNS work; one mail change
at a time, so a bounce tells you which edit caused it.

---

## Notes for Mike, not for sending

- The split-sending recommendation is the one thing here Greg might push back
  on, since one domain is simpler. The counter is that it costs nothing — Resend
  verifies as many domains as you like — and the 48-host send is the single
  highest-stakes email this project will ever send.
- During the transition there really are two senders on breakfastclubbing.com
  (Resend and SendGrid). Fine as a transition, not as a resting state.
- `receive-club-update-email.js` is an inbound webhook, and there's no
  inbound-parse subdomain in DNS, so nothing Resend adds will disturb it.
