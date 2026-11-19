# Roster gaps — what's missing and who can fix it

**Generated 2026-11-19** from the live `/api/discover`
(48 clubs), the Master Sheet, and `data/flyer-wall.json`.

Supabase is the roster, so "missing" means missing *there* — that is what the
public site renders. Split by **who can actually fix it**, because most of this
needs no host at all.

No email addresses here on purpose. Contact details are in the Sheet's `Emails`
column; this file is in a git repo and does not need a copy.

---

## A. In the Sheet, not in Supabase — pure data transfer (1)

Nobody needs asking. Copy it across.

| Club | Missing from Supabase |
|---|---|
| New York — Hudson | how often |

## B. Flyer already exists on Netlify — transfer (10)

`poster_url` is empty in Supabase, but the file is sitting in
`assets/flyers/2026/` and showing on the old flyer wall right now. These are
the gallery's easiest wins.

| Club | File |
|---|---|
| Amsterdam | `Amsterdam_2026-06-19.gif` |
| Berlin | `Berlin_2026-06-18.jpg` |
| Biarritz | `Biarritz_2026-06-19.jpg` |
| Burlington, VT | `BurlingtonVT_2026-04-13.jpg` |
| Honolulu | `Honolulu_2026-06-19.jpg` |
| Manila | `00000006-PHOTO-2026-07-07-10-45-58.jpg` |
| Panama City | `Panama_2026-06-18.jpg` |
| Portland, OR | `PortlandOR_2026-03-16.jpg` |
| Seattle | `Seattle_2026-05-14.jpg` |
| Toronto | `Toronto_2026-05-27.jpg` |

## C. Missing everywhere — only the host can answer (29)

Not a seed bug. Checked against the Sheet and it is blank there too, so this
data has never existed. "When does this club meet" is the one that matters —
a club nobody can turn up to is worse than no listing.

| Club | Host | Instagram | Missing |
|---|---|---|---|
| Atlanta | Stephanie Nelson | — | **how often, time, venue, flyer** |
| Barcelona | Nicole Ingra & Kevin Maguire | @nicoleingra @newfatherhood | **time** |
| Bassano del Grappa | Charla Caponi & Amy Rich | @cncbassano | **how often, time, venue, flyer** |
| Berlin | — | — | **how often, time, venue** |
| Boston | Hannah Schon, Lizzie Milstein, Kevin Johanes | — | **how often, flyer** |
| Brighton | Amy Daroukakis | — | **how often, time, venue, flyer** |
| Chicago | — | — | **how often, time, venue, flyer** |
| Detroit | CeCe Chin | @ce_ce_chin | **flyer** |
| Ibiza | — | — | **how often, venue, flyer** |
| London | Victoria Gates Fleming | @thehungrycrumpet | **time** |
| Lugano | Camilla Finocchiaro Aprile & Elettra Fiumi | @fossilfloss @efiumi | **how often, flyer** |
| Maplewood, NJ | James Friedman | @jamesfthrone | **time** |
| Melbourne — Fitzroy | Celeste Blewitt & Josh Gardiner | @celeste.style | **flyer** |
| Melbourne — Richmond | Penelope Barr, Caitlin Guilfoyle, Jess Price | @thejesspricelist | **flyer** |
| Mexico City | Steve Bryant | @stevebryant | **time, flyer** |
| Miami | Jeff Carvalho | @jeffcarvalho | **flyer** |
| Milano | Charla Caponi, Moritz Gaudlitz & Giorgio Bar | @cncbassano @giorgiogolab @why | **how often** |
| New York — Downtown Brooklyn | Kat Popiel & Lynn Juang | @missllamamanyc @lynnjuang | **time, flyer** |
| New York — Hamptons | Michael Kilcoyne & Adam H. | @themichaelkilcoyne @adamh929 | **flyer** |
| New York — Hudson | Peter Spear & Mark Depace | — | **time, flyer** |
| Panama City | Carla Batista, Jacob Larrinaga & Daniela Jov | @carlibee___ @academiadespiert | **time** |
| Paris | Lisa Ono, Karla Rodriguez, Fanny Leonard | @karlarodce @lisaonocreate | **how often** |
| Portland, ME | Michele Martin & Lydia Wagner | — | **how often** |
| Portland, OR | Nina Sers & Chelsea Place | @ninasers | **time** |
| Singapore | Seraphina Woon | @iamawookiee | **time, flyer** |
| Sydney | Elisha Akhtar | @ElishaAkhtar | **flyer** |
| Toronto | Jared Gordon & Sarah Phillips | @jgo_unchained @sarphilli | **time** |
| Vienna | Carla Moss | @carlatoria | **time** |
| Wilmington | Andrea Capodilupo, Kiah Palumbo | @dreadreon, @kiahpalumbo | **flyer** |

### Chase these 22 first

Flyers are nice to have. A missing day or time means someone reads the page and
still cannot show up.

- [ ] **Atlanta** — Stephanie Nelson  — needs how often, time, venue
- [ ] **Barcelona** — Nicole Ingra & Kevin Maguire @nicoleingra @newfatherh — needs time
- [ ] **Bassano del Grappa** — Charla Caponi & Amy Rich @cncbassano — needs how often, time, venue
- [ ] **Berlin** — —  — needs how often, time, venue
- [ ] **Boston** — Hannah Schon, Lizzie Milstein, Kevin Joh  — needs how often
- [ ] **Brighton** — Amy Daroukakis  — needs how often, time, venue
- [ ] **Chicago** — —  — needs how often, time, venue
- [ ] **Ibiza** — —  — needs how often, venue
- [ ] **London** — Victoria Gates Fleming @thehungrycrumpet — needs time
- [ ] **Lugano** — Camilla Finocchiaro Aprile & Elettra Fiu @fossilfloss @efiumi — needs how often
- [ ] **Maplewood, NJ** — James Friedman @jamesfthrone — needs time
- [ ] **Mexico City** — Steve Bryant @stevebryant — needs time
- [ ] **Milano** — Charla Caponi, Moritz Gaudlitz & Giorgio @cncbassano @giorgiogola — needs how often
- [ ] **New York — Downtown Brooklyn** — Kat Popiel & Lynn Juang @missllamamanyc @lynnjua — needs time
- [ ] **New York — Hudson** — Peter Spear & Mark Depace  — needs time
- [ ] **Panama City** — Carla Batista, Jacob Larrinaga & Daniela @carlibee___ @academiade — needs time
- [ ] **Paris** — Lisa Ono, Karla Rodriguez, Fanny Leonard @karlarodce @lisaonocrea — needs how often
- [ ] **Portland, ME** — Michele Martin & Lydia Wagner  — needs how often
- [ ] **Portland, OR** — Nina Sers & Chelsea Place @ninasers — needs time
- [ ] **Singapore** — Seraphina Woon @iamawookiee — needs time
- [ ] **Toronto** — Jared Gordon & Sarah Phillips @jgo_unchained @sarphill — needs time
- [ ] **Vienna** — Carla Moss @carlatoria — needs time

---

## Appendix — flyers for clubs that are in no roster

`data/flyer-wall.json` carries flyers for cities that do not appear in Supabase
under any spelling. Most are naming drift and need no action — `NY - Hamptons`
vs `New York — Hamptons`, `CT` vs `Fairfield County, CT`, `Melbourne - CBD` vs
`Melbourne — Fitzroy`.

Two are not drift:

- **`Austin, TX`** — `BC_Austin_April26_Flyer.png`. Austin is in the Sheet with
  `Active = No`, so this is a held-back club with artwork already made.
- **`Lisbon, PT`** — `Lisbon_evergreen.jpg`. **Lisbon is in no roster at all**:
  not Supabase, not the Sheet, not `clubs-map.json`. Only a flyer, and an
  "evergreen" one, which means someone made it to last.

### Lisbon — not a club *(settled 2026-11-19)*

**Inactive.** So the flyer is exactly what it looked like: artwork without a
club behind it.

That closes the question `README.md` §12.7 opened. With Lisbon out, every
remaining held-back club is in a country already counted — Norwich (UK), Las
Vegas, Austin, Boulder, Philadelphia (all USA), Houston, LA Westside (USA),
San Miguel de Allende (Mexico). Riyadh is the only one that adds a country.

| | Clubs | Countries |
|---|---|---|
| Live today | 48 | 16 |
| + fix the `United States` cell | 48 | 16 *(the count stops lying)* |
| + activate Riyadh | 49 | **17** |
| + the 5 other held-back rows | **54** | **17** |

**So "53 clubs · 18 countries" is not reachable, and 17 is the ceiling** until
there is a club in a genuinely new country. I briefly had this at 18 on the
strength of the Lisbon flyer; that was wrong.

The honest options stand as: **"48 clubs · 16 countries"** today, or
**"53 clubs · 17 countries"** with Riyadh and four more activated.
