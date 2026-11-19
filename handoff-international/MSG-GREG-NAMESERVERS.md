# Reply to Greg — records confirmed, nameservers declined

**Written 2026-11-19.** He sent the Vercel records for the new domain, repeated
the nameserver-switch advice for breakfastclubbing.com, and asked how we want
the design changes delivered.

**The records are correct — verified, not assumed.** The nameserver advice is
not, and the reasoning in it is inverted: he's recommending the switch *in order
to* keep Workspace mail working, and the switch is the thing that would break
it. That's the second time it's come up, so this reply gives the mechanism
rather than just saying no.

### Verification of his records

```
dig +short cd5a8014391d12fc.vercel-dns-016.com   -> 216.150.16.1, 216.150.1.1
whois 216.150.1.1                                -> VERCEL-09, Vercel, Inc (ZEITI)
whois 216.150.16.1                               -> VERCEL-08, Vercel, Inc (ZEITI)
curl --resolve ...:443:216.150.1.1               -> HTTP/2 200, server: Vercel
curl --resolve ...:443:216.150.16.1              -> HTTP/2 200, server: Vercel
```

Both IPs are Vercel-owned and serving, and his CNAME target resolves to exactly
those two. Good to add as-is.

---

## The message *(send this)*

> Records confirmed — I checked them before adding rather than trusting the
> paste: both IPs come back as Vercel, Inc and serve `server: Vercel`, and
> `cd5a8014391d12fc.vercel-dns-016.com` resolves to exactly those two. Adding
> them at Namecheap for breakfastclubinternational.com now.
>
> On the nameservers though, I'd push back — I think the mechanism is backwards
> there. We want the same outcome (Workspace mail surviving); switching
> nameservers to Vercel is the thing that would break it.
>
> **First, breakfastclubbing.com's DNS isn't at Namecheap.** It's on NS1 —
> `dns1-4.p06.nsone.net`, i.e. Netlify DNS. So there's no Namecheap redirect in
> play for that domain and nothing there to avoid.
>
> **Second, Vercel DNS would start that zone empty.** It doesn't import existing
> records. The moment new nameservers propagated, all of this would be gone
> until it was hand-rebuilt:
>
> ```
> MX     1 smtp.google.com             <- all Workspace mail: ben@, mk@, set@
> TXT    google._domainkey             <- DKIM
> TXT    _dmarc
> TXT    google-site-verification x2
> CNAME  s1._domainkey, s2._domainkey
> A      18.208.88.157, 98.84.224.111  <- the site itself
> ```
>
> Rebuildable, sure. But it's a working mail zone and there's no upside to
> moving it.
>
> **Third, and the actual point: breakfastclubbing.com doesn't need to point at
> Vercel at all.** It isn't becoming a redirect-only domain. It keeps serving
> the things the new app doesn't have:
>
> - `/passport` — there are physical NFC tags pointing at that URL. They can't
>   be reissued.
> - `/what-we-talked-about`
> - `/admin` and `/clubby-admin`
> - 14 Netlify functions
>
> Only the marketing pages redirect — homepage, `/clubs`, `/gallery`,
> `/flyers`, `/map-view`, `/start`. Those are 301 rules in `netlify.toml`,
> already written and ordered so the kept paths win. HTTP-level, so they need no
> DNS change whatsoever and the MX is never touched.
>
> So: the new domain takes your records and points at Vercel; the old one stays
> on NS1 exactly as it is. Mail keeps working because nothing goes near it.
>
> On the design changes — **a PR, if you can add me as a collaborator on the
> repo.** It's four changes plus four drop-in files (a CSS kit, a JS file, a
> `ZanyLayer.tsx`, and the Clubby icon as an SVG), and Vercel comments are great
> for "that gold's wrong" but not much use for shipping a stylesheet. If you'd
> rather not add me, no worries — I'll send the files and a change list and you
> can apply it.
>
> Cheers 🙏

---

## Notes for Mike, not for sending

- **Don't let this one slide if he repeats it a third time.** The switch is
  genuinely destructive and it's the single worst thing that could happen in
  this migration: it takes out Ben's email, your email, the NFC passport tags
  and every function in one change, and the blast radius isn't obvious until
  propagation finishes.
- His records go in at **Namecheap**, for the new domain only — Phase B3 of
  `LAUNCH-CHECKLIST.md`. Two A records for `@` (both of them, that's the
  redundancy) and the one CNAME for `www`.
- Worth noticing he answered a question nobody asked — how to deliver the
  design changes. That reads like he's expecting to apply them himself. The PR
  ask is the cheaper path for both of you, so it's worth being direct about it.
