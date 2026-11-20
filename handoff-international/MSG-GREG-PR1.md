# Message to Greg — PR 1 is up

**2026-11-20.** [PR #33](https://github.com/eljamapps/breakfast-club-rebuild/pull/33)
— `design/clubby-egg-and-marks`, 2 commits, 6 files, open and MERGEABLE.

The two asks are the ones he has to do himself: approve the workflow run, and
turn on preview deployments. Without the second, neither of us can actually
look at this.

---

## The message *(send this)*

> Hey Greg — PR **#33** is up (Clubby's egg, some hand-drawn marks in the hero,
> "Find your club").
>
> Needs two clicks from you: **"Approve and run workflows"** so CI runs, and
> **Vercel preview deploys** switched on for branches if you can — way easier
> to judge design on a live URL.
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
