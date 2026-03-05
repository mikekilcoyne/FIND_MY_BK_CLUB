# Responsive Style Guide

This file defines the default framework for keeping FIND_MY_BK_CLUB clean across desktop, tablet, and mobile.

## 1. Source Of Truth
- Use `css/responsive-framework.css` for shared breakpoints, spacing tokens, and baseline responsive behavior.
- Keep page-specific visual styles in `css/styles.css` and `css/calendar-view.css`.
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
