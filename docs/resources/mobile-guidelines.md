# Mobile Guidelines

Mobile-first layout and responsive behavior rules for all views.

## 1. Source of Truth
- Shared responsive behavior: `css/responsive-framework.css`
- Page-specific adjustments: `css/styles.css`, `css/map-view.css`
- Add shared rules first, page-level overrides only when needed.
- New responsive behavior goes into `responsive-framework.css` first.

## 2. Breakpoints
- `desktop`: above `960px`
- `tablet`: `≤ 960px`
- `mobile`: `≤ 640px`

## 3. Layout Rules
- Left rail + content split on desktop only.
- Single-column stack on tablet/mobile.
- No fixed widths in content areas — use `minmax(0, 1fr)` and fluid spacing.
- Ensure headers wrap gracefully before colliding with CTAs.
- Use `clamp()` for major headings.

## 4. Club Card Structure

Each club entry is an `article.club-card` with four vertical blocks:

```
[ City Name (headline)        ]
[ Subline: freq · venue badge ]
[ HOST: name (@handle)        ]
[ Utility: Maps  📷  in       ]
```

### Block Rules

**City Name** (`.city-name`)
- Block element — never shares a line with utility links.
- Never truncated.
- Large, bold. Link if venue exists.
- `.original-bc` modifier for Williamsburg flagship.

**Subline** (`.card-subline`)
- Flex-row, wraps naturally.
- Contains: frequency label, venue name, status badges.
- Badges (`.badge`) use `inline-flex`, `white-space: nowrap`.
- `.badge-tbd` for missing venue, `.badge-night` for night editions.
- Smaller, muted type.

**Host Line** (`.card-host`)
- Uppercase, small, muted.
- Instagram handles rendered as links via `renderTextWithInstagramLinks()`.

**Utility Row** (`.card-utility`)
- Below all metadata.
- Contains: Google Maps button, IG icon, LinkedIn icon, contact note.
- All children styled as pill buttons via `.card-utility a` / `.card-utility button`.
- `flex-wrap: wrap` on container — labels never break mid-word.
- `white-space: nowrap` on each action.

### Card Variants
- `.flagship-card` — Williamsburg: warm yellow tint background, gold border.
- `.night-edition` — dark gradient bg, `--night-ink` text, adapted utility pills.

## 5. Explicitly Remove
- Google Maps inline next to city name.
- Inline badges disrupting headline flow.
- Icons embedded in metadata text runs.
- Mixed font weights on one line.

## 6. Technical Constraints
- Flex-column layout per card.
- 8px or 12px spacing grid (tokens in `responsive-framework.css`).
- `line-height > 1.3` throughout.
- `max-width` controls on metadata lines where needed.
- Avoid truncation unless absolutely required — only metadata may use ellipsis, never city name.

## 7. Wrapping Rules
- Utility labels must not break mid-word.
- `Google Maps` must remain intact as a label.
- Host names wrap naturally.
- Avoid 3+ inline interactive elements on one uninterrupted line.

## 8. Responsive QA Checklist
Before pushing responsive updates:
1. Verify `index.html` at `1440`, `1024`, and `390` widths.
2. Verify `calendar-view.html` at `1440` and `390` widths.
3. Verify `map-view.html` at `1440` and `390` widths.
4. Confirm no horizontal scroll.
5. Confirm top bars and key labels remain readable.
6. Confirm syntax: `node --check js/script.js` and `node --check js/calendar-view.js`
