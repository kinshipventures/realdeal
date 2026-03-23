---
phase: 02-visual-redesign
plan: 01
subsystem: ui
tags: [css-tokens, tailwind-v4, typography, playfair-display, plus-jakarta-sans, solid-orbs, react-flow]

# Dependency graph
requires: []
provides:
  - Design tokens via @theme and :root CSS custom properties in globals.css
  - Playfair Display (headings) + Plus Jakarta Sans (body) replacing DM Sans
  - SolidOrb.tsx — solid fill orb component replacing GlassOrb.tsx
  - Updated node components (ListNode, CategoryNode, MojNode, CreateCategoryNode) using SolidOrb
  - Hub orb dark (#1C1C1E) at 136px with white labels
  - All orb labels white (0.90-0.92) for legibility on solid fills
  - orb-interactive CSS updated to drop shadow system (no glass glow/inset)
affects: [02-02-dashboard, future-plans-using-design-tokens]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "@theme block for utility-mapped tokens (colors, fonts), :root for component constants (orb sizes, shadows)"
    - "SolidOrb: drop-in replacement for GlassOrb — same props interface, solid fill with single subtle radial for depth"
    - "All orb labels use white text on solid fills — standardized across hub, list, category nodes"
    - "Hub orb is pure solid (#1C1C1E), no gradient — category/list orbs use single 18% opacity radial for shape"

key-files:
  created:
    - src/components/map/SolidOrb.tsx
  modified:
    - src/styles/globals.css
    - index.html
    - src/components/map/ListNode.tsx
    - src/components/map/CategoryNode.tsx
    - src/components/map/MojNode.tsx
    - src/components/map/CreateCategoryNode.tsx
  deleted:
    - src/components/map/GlassOrb.tsx

key-decisions:
  - "glowIntensity prop retained in SolidOrb interface for zero-friction drop-in replacement compatibility — unused internally, consumed with void"
  - "Font @import URL moved before @import tailwindcss — CSS spec requires @import rules to precede all other rules"
  - "isDark threshold is #333333 hex comparison — anything <= that string gets pure solid fill, above gets single radial gradient for shape"

patterns-established:
  - "Token pattern: @theme for utility-class-generating tokens, :root for component-specific constants"
  - "Orb text always white on solid fills — rgba(255,255,255,0.90-0.92) for names, 0.50-0.55 for counts"
  - "Hub orb: pure solid color, no gradient, larger (136px), dark (#1C1C1E)"

requirements-completed: [VIS-01, VIS-03]

# Metrics
duration: 3min
completed: 2026-03-23
---

# Phase 02 Plan 01: Design Tokens + Solid Orb System Summary

**CSS design token foundation via Tailwind v4 @theme, Playfair Display + Plus Jakarta Sans fonts, and full glass-to-solid orb system migration with white labels and dark 136px hub**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-23T03:57:06Z
- **Completed:** 2026-03-23T03:59:50Z
- **Tasks:** 2
- **Files modified:** 7 (+ 1 created, 1 deleted)

## Accomplishments
- All design tokens defined as CSS custom properties — @theme block for color/font utilities, :root block for orb sizes/shadows/panel constants
- DM Sans fully removed; Playfair Display on headings, Plus Jakarta Sans on body via Google Fonts
- Glass orb system eliminated — SolidOrb.tsx is a clean drop-in replacement with solid fills and drop shadow depth
- Hub orb (MojNode) updated to 136px dark near-black (#1C1C1E) with white label, matching Trolley PDF
- All orb labels switched to white text for legibility on solid colored fills

## Task Commits

1. **Task 1: Design tokens in globals.css + font loading in index.html** - `b8096e4` (feat)
2. **Task 2: SolidOrb component + node component updates** - `50a080f` (feat)

## Files Created/Modified
- `src/styles/globals.css` - @theme tokens, :root constants, updated body/heading fonts, solid orb shadow system, clean .app-bg
- `index.html` - Google Fonts preconnect + Playfair Display + Plus Jakarta Sans link tags
- `src/components/map/SolidOrb.tsx` - New solid orb component replacing GlassOrb (same props interface)
- `src/components/map/GlassOrb.tsx` - Deleted
- `src/components/map/ListNode.tsx` - SolidOrb import, white labels, removed color rim div
- `src/components/map/CategoryNode.tsx` - SolidOrb import, white labels, removed color rim div
- `src/components/map/MojNode.tsx` - 136px dark solid hub, white label, removed glass artifacts
- `src/components/map/CreateCategoryNode.tsx` - Removed glass-specific --orb-glow-* CSS vars

## Decisions Made
- `glowIntensity` retained in SolidOrb props for drop-in compatibility but consumed with `void glowIntensity` internally — no behavior change needed
- Font `@import url()` moved before `@import "tailwindcss"` — CSS spec requires @imports to precede other rules; vite was warning about this ordering
- Dark color threshold for pure-solid vs. gradient-orb is `<= '#333333'` — simple hex string comparison covers #1C1C1E and other near-blacks cleanly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed CSS @import ordering in globals.css**
- **Found during:** Task 2 build verification
- **Issue:** Vite warned "@ import rules must precede all rules aside from @charset and @layer" — font URL import was placed after `@import "tailwindcss"`
- **Fix:** Moved `@import url(...)` for Google Fonts above `@import "tailwindcss"`
- **Files modified:** src/styles/globals.css
- **Verification:** Build passes with no warnings
- **Committed in:** `50a080f` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** CSS spec compliance fix, no scope creep.

## Issues Encountered
None beyond the @import ordering issue documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All design tokens available for dashboard (02-02) to consume via var(--token)
- SolidOrb component ready; node sizes set (hub 136px, list 96px, category 64px)
- @theme tokens generate both CSS vars and Tailwind utility classes — Dashboard.tsx can use either pattern
- Playfair Display applies automatically via h1/h2/h3/.heading CSS rule — no per-component changes needed for headings

---
*Phase: 02-visual-redesign*
*Completed: 2026-03-23*
