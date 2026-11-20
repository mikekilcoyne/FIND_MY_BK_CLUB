# Design PR into Greg's repo — scope

**2026-11-20.** Repo cloned: `eljamapps/breakfast-club-rebuild`, 63 commits,
`main` at `c3bb107` ("make breakfastclubinternational.com the main site URL").
Next.js 16, React 19, Tailwind 4, Supabase.

Reading the actual codebase corrected two things I had wrong, and turned up a
constraint that changes the whole integration approach.

---

## 1. Two corrections to DESIGN-DELTA

### `#b87649` is not the site accent

It appears **once**: `--globe-accent` in `app/globals.css`, plus a default
parameter in `components/globe.tsx`. It colours the globe's location pins.
Nothing else.

The delta said "Accent `#b87649` terracotta → `#ffd700` gold, no gold anywhere."
Half right — there is no gold. But there is no terracotta *accent* either; the
site is monochrome by design (`--text:#111111`, `--bg:#ffffff`,
`--surface-2:#f2f2f2`). Swapping that hex would recolour globe pins and nothing
else.

**So adding gold is additive, not a swap.** There is no accent token to
overwrite — one has to be introduced. That is a bigger design decision than
"change a hex", and it's Greg's call as much as ours.

It's also already in the reviewed allowlist with a reason citing "spec-r2 P12",
so it was a deliberate exemption, not an oversight.

### The repo is heavily token-driven

DESIGN-DELTA §5 said it "exposes exactly one custom property,
`--font-instrument-sans`, so it is not token-driven the way this repo is."
**Wrong.** `app/globals.css` carries a full system: a 16-step type scale with
paired tracking (`--type-display`/`--track-display` down to `--type-badge`),
radii (`--r-sm:8px --r-md:12px --r-lg:20px --r-pill:999px`), spacing, control
heights, shadows, poster palette.

That measurement came from reading `document.styleSheets` on the live minified
build, which missed it. Should have read the source.

**This is good news** — it means the kit maps onto an existing system instead
of fighting one.

---

## 2. The constraint that reshapes the job

`scripts/checks-merge.sh` runs `lint`, **`qa:style`**, `typecheck`, `test`,
`build`. AGENTS.md requires it to pass before a PR is marked ready.

`qa:style` is `scripts/qa/style-audit.mjs`. It scans for raw colours — hex and
CSS colour keywords — outside the token layer, and checks each against
`style-allowlist.json`. That file is **SHA256-locked**:

```js
if (createHash("sha256").update(bytes).digest("hex") !== snapshot)
  throw new Error("Style allowlist snapshot changed; new entries require design review.");
```

It also knows their primitives (`Button IconButton Field Card PageHeader
ListRow …`) and flags selectors that override them directly.

**What this means:** the kit cannot be dropped in as `zany-kit.css` with raw
hex. Every colour has to be a token in `app/globals.css`, and the square
geometry has to come from changing the **values** of radius and shadow tokens
the primitives already consume — not from new rules overriding `.btn`.

That is a better outcome than the hand-off we planned. It also means **the
`ZanyLayer.tsx` + `zany.js` + `/public` approach is wrong for this repo** — the
behaviour belongs in a React component using their conventions, not a vanilla
script re-run on navigation.

---

## 3. The changes, re-scoped

| # | Change | Where | Risk |
|---|---|---|---|
| 1 | "Find a club" → "Find your club" | `components/hero.tsx:45` | none |
| 2 | Square geometry — radius + shadow tokens | `app/globals.css` `:root` | medium: `--r-pill` is used by more than buttons |
| 3 | Gold accent token (new) | `app/globals.css` | **design decision, not a port** |
| 4 | Clubby egg replaces `MessageCircle` | `components/clubby-fab.tsx` | low, self-contained |
| 5 | Mike's marks as a React component | new `components/marks.tsx` + `public/marks/` | low |
| 6 | Hey!/Zow! shout | new component + `public/marks/*.png` | low |

Changes 1, 4, 5 are safe and self-contained. **2 and 3 are the real
conversation** — 2 because `--r-pill:999px` is consumed site-wide and squaring
it touches everything at once, 3 because it introduces a colour role the design
currently doesn't have.

---

## 4. Suggested PR shape

**Don't send one PR.** Split:

- **PR 1 — safe wins.** Copy fix, Clubby egg, the marks component, the
  Hey!/Zow! shout. All additive, nothing existing restyled. Passes `qa:style`
  cleanly because every colour lands as a new token.
- **PR 2 — the geometry and the accent.** Squaring the radii and introducing
  gold. Needs Greg's eye and probably a style-allowlist review, and it's the
  one that could regress a screen we haven't looked at.

PR 1 can merge today. PR 2 is a conversation with a preview deploy attached,
which is exactly what Vercel gives us on a PR.

---

## 5. Before writing any code

- **Next.js 16 has breaking changes.** AGENTS.md: read
  `node_modules/next/dist/docs/` first. Don't write App Router code from memory.
- Their workflow is `/ship-ticket` + `.agents/ship-profile.md`, one worktree per
  ticket via `agent-workspaces`, closed with `agent-disk close`. I don't have
  that tooling — worth telling Greg I'm working outside it rather than
  pretending otherwise.
- `scripts/qa/capture.mjs` is a Playwright visual harness. Worth running for
  changes 2 and 3; overkill for the rest.
