# Message to Greg — getting the domain live

Two messages. **Send #1 first.** Only send #2 if he comes back saying he can't
add members — which means the scope is on Hobby, where collaborators don't
exist at any price short of upgrading.

Neither includes the email-login or `/api/discover` asks from
`ASK-FOR-GREG.md`. Those are the next conversation. This is only about getting
breakfastclubinternational.com live today.

---

## Message 1 — ask for access *(send this one)*

> Hey Greg — ready to point the domain at the new site.
>
> Easiest thing: can you add me as an **Owner** on the Vercel project? Then I
> can do the domain and the env vars myself and you're not the bottleneck
> every time a setting needs changing. Same for Supabase if you can swing it.
>
> If your plan won't let you add members, no worries — say so and I'll send
> over the handful of things I need you to click instead.
>
> Cheers 🙏

---

## Message 2 — the fallback *(only if he can't add you)*

> No problem — three things then:
>
> **1. Add the domains.** Settings → Domains:
> - `breakfastclubinternational.com`
> - `www.breakfastclubinternational.com`
>
> Set the apex as canonical, so www redirects to it.
>
> Then **send me the DNS records Vercel shows you** — the A record for the
> apex and the CNAME for www. I'm keeping DNS at Namecheap rather than moving
> nameservers to Vercel, because that domain has email forwarding on it (MX
> records) and I don't want to rebuild those. So I just need the record
> values and I'll set them. TTL's 30 minutes, so it'll be live pretty quick.
>
> **2. Supabase → Authentication → URL Configuration.** Set Site URL to
> `https://breakfastclubinternational.com` and add
> `https://breakfastclubinternational.com/auth/callback` to Redirect URLs.
> Keep the existing vercel.app entries so preview deploys still log in.
>
> This one's easy to skip and it fails quietly — login still *works*, it just
> bounces people back to the old URL afterwards, which is a horrible thing to
> debug later.
>
> **3. Quick sanity check: is production the latest build?** I've been
> reviewing `breakfast-club-rebuild.vercel.app`, and that's what the domain
> will serve. If there's newer work sitting on a preview that hasn't been
> promoted, pointing DNS will look like it "didn't work" when it's actually
> just serving the older build.
>
> Also — the link you sent is a protected preview, so it bounces me to a Vercel
> login. The production URL is public and works fine, so I've been using that.
>
> Cheers 🙏

---

## Notes for Mike, not for sending

- **If he adds you as Owner**, do the three things yourself in this order:
  domains → DNS at Namecheap → Supabase URL config. The Supabase step is the
  one people skip.
- **Namecheap:** ~~delete the parking A record and the www CNAME~~ —
  **corrected 2026-11-19:** there is nothing to delete. The domain has no A
  record and no www record at all today; it doesn't resolve. Just add Vercel's
  two records. **Keep all five MX records and the SPF TXT** for now — Phase C of
  `LAUNCH-CHECKLIST.md` replaces them deliberately when the Workspace domain
  alias goes in.
- **Don't** switch nameservers to Vercel. Same reason.
- The redirect from breakfastclubbing.com is separate and comes after — the
  rules are written in `netlify.toml` on the `backend-hardening-2026-11`
  branch, which still needs merging against `origin/main`.
