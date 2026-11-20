# Message to Greg — PR 1 is up

**2026-11-20.** [PR #33](https://github.com/eljamapps/breakfast-club-rebuild/pull/33)
— `design/clubby-egg-and-marks`, 2 commits, 6 files, open and MERGEABLE.

The two asks are the ones he has to do himself: approve the workflow run, and
turn on preview deployments. Without the second, neither of us can actually
look at this.

---

## The message *(send this)*

> Hey Greg — first design PR is up: **#33**.
>
> It's the small stuff: Clubby's launcher gets the egg instead of the chat
> bubble, my hand-drawn marks scattered in the hero margins, and "Find a club"
> → "Find your club". Nothing existing is restyled.
>
> Two things on your side:
>
> - **CI didn't run** — I think it needs you to hit "Approve and run workflows"
>   (GitHub's default on a PR from a non-owner). I ran lint, qa:style,
>   typecheck, tests and build locally and they all pass, but you'll want to
>   see that go green yourself.
> - **No Vercel preview got built.** If you can switch on preview deploys for
>   branches that'd help a lot — design is much easier to judge on a live URL
>   than in a diff, and it'd save us both a round trip on PR 2.
>
> Colours land as tokens rather than literals so `qa:style` stays happy. One
> heads-up: `AGENTS.md` has a one-line change I didn't make — `next dev`
> rewrote a heading inside its own managed block. Your docs say to commit it,
> so I did, but happy to strip it if you'd rather.
>
> **PR 2** is the bigger one — squaring the buttons and bringing in the gold.
> Sending that separately since it changes tokens used across the whole site
> and deserves its own look.
>
> Cheers 🙏

---

## Notes for Mike, not for sending

- **The preview ask is the important one.** PR 2 squares `--r-pill`, which is
  consumed by every button, chip and card on the site. Judging that from a diff
  is not realistic — it needs a URL to click. Worth chasing if he skips it.
- Deliberately not mentioned: the Netlify Sheet exposure, email login, Resend.
  Those are separate threads and bundling them here buries the two asks.
- If he approves #33 and it merges, the "Go" condition is still PR 2 plus the
  redirect — not this alone.
