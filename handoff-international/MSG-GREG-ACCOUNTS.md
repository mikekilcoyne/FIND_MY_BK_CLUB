# Message to Greg — accounts moved, design landed

**Written 2026-11-22**, after his reply: *"Vercel and supabase make it hard and
giving you access would give you access to all my projects."*

Supersedes `SUPABASE-REBUILD.md` §4's draft, which asked him about hand-set
dashboard state. That ask is moot — the rebuild is done and the question was
never answered, so there's nothing left waiting on him.

**One correction to the note as dictated:** it said *"I'm gonna setup Supabase +
Vercel accounts on my end."* Both are done as of this morning. Past tense is
stronger — it turns a plan he might have views on into a fact he can work with,
and it tells him the thing he actually cares about: the data is already out of
his org, so his access problem has gone away by itself.

---

## The message *(send this)*

> Morning — couple of updates, and one ask at the end.
>
> **Access, sorted from my end.** I've set up my own Supabase project and
> rebuilt the schema straight from the migrations in the repo, then reseeded the
> 48 clubs off the master sheet. It's all up and running, RLS and all. So I
> don't need adding to your org, and you don't need to hand anything over —
> I'll add you as Administrator on mine whenever you want it.
>
> Same for Vercel, on my own account, building off the repo. Thanks for the
> invite by the way, I've taken it — handy for seeing how the domain's wired.
>
> **Nothing's pointed at the live domain.** `breakfastclubinternational.com` is
> still served by your project exactly as it was.
>
> **On the design** — PR **#33** covers the safe half: Clubby's egg, the
> hand-drawn marks, and "Find your club". I've now also built the other half,
> which is the part we'd flagged as the real conversation:
>
> - **Square geometry.** `--r-sm/md/lg` down to 3–7px, and the controls moved
>   off `--r-pill` onto a new `--r-btn: 7px`. Deliberately *not* a blanket
>   change to `--r-pill` — that token also draws the status dots, the globe pin
>   dot and the notification badge, and squaring those turns them into little
>   squares. So it's a new token swapped in on the control and surface rules
>   only.
> - **2px ink borders and offset block shadows** on buttons and cards, replacing
>   the 1px hairlines.
> - **A gold accent, `#ffd700`** — added as a token rather than a swap, since
>   you were right that there's no accent token to overwrite. The dark primary
>   button throws a gold shadow, light surfaces throw an ink one, so the shadow
>   always contrasts the fill.
> - **Clubby's launcher** goes gold with an ink border, same square family.
> - **The starburst mark** — the last of the 14 hand-drawn marks that wasn't in
>   yet. It's the only filled one, so it needed the mark type to carry its own
>   fill and stroke widths rather than the shared stroke-only ones.
>
> **All of `checks-merge.sh` passes** — lint, `qa:style`, typecheck, 280 tests,
> build. `qa:style` was the one I expected trouble from, since the allowlist is
> SHA256-locked, but the gold is defined in the token layer so the audit is
> happy with it and the locked file doesn't need touching. 0 new violations.
>
> **The ask:** I'm testing properly before anything goes near the live domain,
> and then **let's get on a call before we push it out.** Ben's helping us get
> it to the hosts, so worth the three of us agreeing the order.
>
> Cheers 🙏

---

## Notes for Mike, not for sending

- **"I'll add you as Administrator whenever you want it" is the line that makes
  this land well.** It's the same access the transfer route would have given
  him, so he loses nothing, and it's a genuine offer — you'll want him able to
  debug.
- **Say explicitly that the live domain hasn't moved.** Without that sentence he
  may reasonably assume you've repointed DNS and find out by surprise.
- **Correction to my own earlier advice:** I said not to send Greg the preview
  URL because it points at your Supabase. That was over-cautious. Browsing it is
  read-only — RLS means the publishable key can only see published clubs, and
  looking at a page writes nothing. He should see it, because he's the one who
  has to review the geometry PR and a diff of radius tokens is unreadable.
- **Correction, verified 2026-11-22:** an earlier draft of this message warned
  that the gold would need the SHA256-locked allowlist regenerating. It does
  not. `qa:style` reports **0 new violations** — because the audit objects to
  raw colour *outside* the token layer, and `--accent:#ffd700` is inside it.
  The two violations it did raise were a `padding:10px` of ours, fixed to
  `var(--space-2)`; the audit enforces spacing tokens too, which is easy to
  trip over. All five merge checks now pass locally, so the PR should be clean
  on his CI. Worth saying so in the message: it's the difference between "here's
  a change, mind the CI" and "here's a change, CI's green."
- **The call is the right instinct, and the ordering matters.**
  `HOST-CONFIRMATION.md` §5: hosts before the public. 22 of the 48 clubs are
  missing a day or time, so driving traffic at the roster before hosts fix their
  own entries wastes the one big send.
- **Still blocking a real launch, both yours, neither needing Greg:** Google
  login isn't configured on the new Supabase project — only email is enabled —
  and `signInWithOtp` doesn't exist yet. Those two have to work before any host
  invite goes out.
