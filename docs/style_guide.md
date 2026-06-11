# Responsive Style Guide

This file defines the default framework for keeping FIND_MY_BK_CLUB clean across desktop, tablet, and mobile.

## 0. SQUARE STYLE — Current Design Direction (June 2026)

All interactive elements (buttons, chips, pills, badges, inputs, cards, modals)
follow the **Square Style** language, defined in `css/square-style.css` (loaded
last on `index.html` and `fly-er.html` as a pure overlay).

### Tokens (in `:root` of `css/square-style.css`)
- `--sq-ink: #111111` — border + text ink
- `--sq-paper: #ffffff` — fill
- `--sq-pop: #25d366` — action green (WhatsApp share, primary submits)
- `--sq-shadow-sm: 3px 3px 0` / `--sq-shadow: 4px 4px 0` / `--sq-shadow-lg: 8px 8px 0` — offset block shadows, always solid ink, never blurred

### Rules
- **No rounded corners.** `border-radius: 0` on every control and container chip.
- **2px solid ink borders** on all interactive elements.
- **Offset block shadows, not soft shadows.** Small for chips/pills, medium for buttons, large for modals. Containers (club cards, popup cards) use `5px 5px 0`.
- **Press physics:** hover = translate `(-1px,-1px)`–`(-2px,-2px)` + shadow grows; active/selected = translate `(2px,2px)` + shadow shrinks to `1px 1px 0` (element looks pressed in).
- **Labels:** bold (700), uppercase, letter-spacing `0.05em–0.14em`, Helvetica Neue.
- **Primary actions** (Send to a Friend on WhatsApp, Send update) fill with `--sq-pop` green; everything else is paper-white with ink text.
- **Night-edition cards** keep their dark fills but take square shape + 2px borders; shadows go `rgba(0,0,0,.55–.6)` instead of ink.
- Hand-drawn accents (paste strips, poster tilts on the fly-er wall) stay — the zany layer lives *on top of* the square chrome, not instead of it. But buttons are never hand-drawn: "Share Flyer" on cards is a green (`--sq-pop`) square button, same family as the WhatsApp share.
- **Passive info containers stay clean.** Rail boxes (Calendar View, World View) get a single 2px ink top rule, no border box, no shadow. Boxes + shadows are reserved for interactive elements and content cards.

### Covered components
Feature callout button, search input, mobile action buttons, rail
calendar/map boxes, day chips, region filter pills, club cards + timetable
pill + utility icon chips + "Latest happenings…" button + NEW badges + "?"
update trigger, Pop-Up strip cards + drawer (sticker, close, RSVP), club-update
modal (inputs, close, submit), flyer lightbox chrome + Easy to Share bar,
fly-er wall back/jump links, back-to-top.

### Sharability rule
Every surface that shows a flyer must route through the **shared lightbox**
(`js/flyer-lightbox.js` → `window.openFlyerLightbox`) so the Easy to Share bar
(WhatsApp / Text It / Copy Link) is always present. Never register a competing
`window.openFlyerLightbox`; the legacy copy in `js/script.js` is fallback-only,
guarded behind a `typeof` check. Load order on every page: `flyer-lightbox.js`
**before** the page script.

**Share the file, not just a link.** Where the browser supports file sharing
(`navigator.canShare({files})` — most phones), the primary button is
**"Share the Flyer (JPG/PDF)"**: it fetches the actual image and hands it to
the native share sheet (WhatsApp, Messages, AirDrop...). Browsers that can't
share files get the WhatsApp / Text It link buttons instead, and **Download**
is always present. Only `js/flyer-lightbox.js` may define
`window.openFlyerLightbox` — never declare a top-level
`function openFlyerLightbox()` anywhere else; hoisted declarations silently
clobber the shared global (this exact bug shipped twice).

**Never share an expired flyer.** Share Flyer on club cards only surfaces
flyers that are (a) dated today/upcoming, or (b) date-agnostic — flagged
`"evergreen": true` in `data/flyer-wall.json` or carrying no date in JSON or
filename. If a club's flyers are all expired, it gets no Share button.
Every `data/flyer-wall.json` entry must carry a `"date"` (event date) or
`"evergreen": true`; recurring-schedule artwork ("first Wednesday of the
month") is what evergreen means. The wall page shows everything (it's an
archive); sharing is what's date-gated.

### Extending
New components must use the tokens above. Add overrides to
`css/square-style.css` (keep it the last stylesheet) rather than scattering
square treatments through the per-page files until the direction is made
permanent — at that point fold the overlay into the base files. Before
shipping any tweak, check it against this section: square tokens, press
physics, clean containers, shared lightbox for anything shareable.

## 1. Source Of Truth
- Use `css/responsive-framework.css` for shared breakpoints, spacing tokens, and baseline responsive behavior.
- Keep page-specific visual styles in `css/styles.css` and `css/calendar-view.css`.
- `css/square-style.css` is the design-direction overlay — see section 0.
- Prefer tokens and shared classes over one-off media queries whenever possible.

## 2. Breakpoints
- `desktop`: above `960px`
- `tablet`: `<= 960px`
- `mobile`: `<= 640px`

## 3. Layout Rules
- Left rail + content split only on desktop.
- Single-column stack for tablet/mobile.
- Avoid fixed widths in content areas; use `minmax(0, 1fr)` and fluid spacing.
- Ensure headers can wrap gracefully before they collide with CTAs.

## 4. Typography Rules
- Use `clamp(...)` for major headings so text scales smoothly.
- Keep all-caps utility/rail copy tighter with smaller desktop size and slightly larger mobile readability.
- Avoid long unbroken lines that can overflow narrow panels.

## 5. Component Rules
- All media (`img`, `iframe`, `svg`, etc.) must be `max-width: 100%`.
- Buttons/links in top bars must remain clickable at all widths.
- Hide non-essential CTAs on mobile if they create clutter.

## 6. QA Checklist Before Push
1. Verify `index.html` at `1440`, `1024`, and `390` widths.
2. Verify `calendar-view.html` at `1440` and `390` widths.
3. Confirm no horizontal scroll appears.
4. Confirm left-rail headline and top bar remain readable.
5. Confirm syntax checks pass: `node --check js/script.js` and `node --check js/calendar-view.js`.

## 7. Iteration Policy
- New responsive behavior should be added to `css/responsive-framework.css` first.
- Page-level overrides are allowed only when the shared framework cannot express the behavior cleanly.
