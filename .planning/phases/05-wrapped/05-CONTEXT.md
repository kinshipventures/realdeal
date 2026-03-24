# Phase 5: Wrapped - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Single rotating insight card on the dashboard showing bite-sized relationship stats. Three insights cycle on tap: people reached, top pod, most connected. Not a separate view or fullscreen slideshow — a dashboard component.

</domain>

<decisions>
## Implementation Decisions

### Format and placement
- **D-01:** Single insight card on the dashboard, positioned below pod health cards and above the "coming up" birthday section
- **D-02:** One card visible at a time — tap/click to cycle to the next insight. No auto-rotation timer.
- **D-03:** Three insights in rotation: people reached (unique contacts with interactions), top pod (highest equity score), most connected (contact with most interactions)

### Visual treatment
- **D-04:** Wrapped card style from `docs/design-exploration/10-data-visualization.html` — pod-colored gradient background, white text, radial highlight overlay
- **D-05:** Big stat: Fraunces 900 weight, large display size, tight letter-spacing. Label below in Fraunces 700. Sub-label in body font at reduced opacity.
- **D-06:** Card uses `POD_SHIFT_COLORS` gradient map for background (same as orbs and dashboard pod cards). Top pod card uses that pod's color; others use brand green gradient.
- **D-07:** Subtle dot indicators showing current position in the 3-card rotation (like carousel dots)

### Data scope
- **D-08:** "People reached" and "most connected" use rolling 7-day window from today
- **D-09:** "Top pod" uses existing `podEquityScore()` which already operates on a 90-day rolling window — no custom window needed
- **D-10:** All data computed client-side from existing cached contacts, pods, and interactions — no new Airtable calls

### Empty state
- **D-11:** When no interactions exist in the window, show an empty state card with encouraging copy (Claude's discretion on exact copy)
- **D-12:** Empty state card shows a dismiss/hide option on hover — hides the card for the session (not permanently)

### Claude's Discretion
- Exact card dimensions and border-radius
- Transition animation between cards (fade, slide, or crossfade)
- Specific gradient angle and radial overlay positioning
- Empty state copy and dismiss interaction pattern
- Whether "most connected" shows contact name only or name + interaction count

</decisions>

<specifics>
## Specific Ideas

- Moj described this as "Spotify Wrapped energy" during the 3/18 in-person session — but scope shifted to daily/weekly insight cards rather than a monthly ceremony
- "Simple things that can give clear takeaways" — not expansive, just punchy
- Design exploration already has CSS for both small wrapped cards (grid) and full slides — use the card variant as reference

</specifics>

<canonical_refs>
## Canonical References

### Visual spec
- `docs/design-exploration/10-data-visualization.html` — Wrapped card CSS (`.wrapped-card`, `.wrapped-stat`, `.wrapped-label`), full slide variant, health bars
- `docs/design-system.md` — Color tokens, typography scale, spacing grid, motion curves

### Scoring and data
- `src/lib/equity.ts` — `podEquityScore()`, `contactEquityScore()`, `indexByContact()`, `INTERACTION_WEIGHTS`
- `src/lib/types.ts` — `Interaction`, `InteractionType`, `Contact`, `Pod` interfaces

### Existing patterns
- `src/components/map/SolidOrb.tsx` — `POD_SHIFT_COLORS` gradient map for pod-colored backgrounds
- `src/components/dashboard/Dashboard.tsx` — PANEL style constant, section header pattern, existing layout order

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `equity.ts` scoring functions — `podEquityScore()` and `indexByContact()` give us everything for top pod and interaction counts
- `POD_SHIFT_COLORS` — already maps pod hex colors to gradient shift colors, reuse for card backgrounds
- `getContacts()` and `getInteractions()` from `airtable.ts` — cached data, no new API calls needed
- Fraunces font already loaded at weights 400/700/800/900

### Established Patterns
- Dashboard sections use `PANEL` style constant and serif section headers (`fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-serif)'`)
- Pod health cards in Dashboard already use `linear-gradient(135deg, color, shiftColor)` — same pattern for wrapped card backgrounds

### Integration Points
- New insight card renders inside `Dashboard.tsx` between pod health cards section and "coming up" birthday section
- Uses same `contacts`, `pods`, `interactions` state already loaded in Dashboard
- Stat computation can be a `useMemo` in Dashboard or extracted to a small utility

</code_context>

<deferred>
## Deferred Ideas

- Full-screen swipeable Wrapped slideshow (monthly/quarterly ceremony) — future phase if Moj wants it
- Shareable Wrapped images (export as PNG for social) — future
- Historical trend comparison ("up 20% from last week") — future, needs interaction history beyond 90-day cache

</deferred>

---

*Phase: 05-wrapped*
*Context gathered: 2026-03-24*
