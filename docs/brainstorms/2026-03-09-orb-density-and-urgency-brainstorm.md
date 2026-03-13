# Orb Density Signals + Homepage Urgency

**Date:** 2026-03-09
**Status:** Ready for planning

---

## What We're Building

Two connected improvements that make the orb map feel alive and actionable instead of inert:

1. **Contact counts on orbs** — Every orb shows how many contacts it contains. List orbs on home show total contacts. Category orbs inside a list show per-category counts.

2. **Overdue urgency signals on home** — List orbs display a warm-colored dot + overdue count when contacts in that list are overdue (no contact in 30+ days). Gives Moj an at-a-glance read on where attention is needed before she even clicks in.

---

## Why This Approach

The orbs currently feel like labels floating in space. There's no information density — you can't tell if a list has 5 contacts or 500, or if anyone needs attention. The fix is additive: layer data onto the existing visual system without changing the orb structure.

Counts go inside/below the orb label — secondary text, small and muted. Overdue signal uses a warm dot + number, rendered inline with the count. No modals, no separate views, no new navigation.

---

## Key Decisions

| Decision | Choice | Reason |
|---|---|---|
| Count placement (home) | Inside list orb, below name | Same visual pattern as category count |
| Count placement (list view) | Inside/below category orb | Small secondary text, consistent |
| Overdue signal | Warm dot + number inline | Actionable (you know how many) without being alarming |
| Urgency location | Home view list orbs only | That's the decision-making layer — where to go |
| Category urgency | Not in v1 | YAGNI — adds complexity, less needed |

---

## Data Requirements

- **List orbs**: total contact count per list + overdue count per list
- **Category orbs**: total contact count per category

Currently `getOverdueContacts(listId)` exists. Contact counts will need either a new lightweight fetch or piggybacking on existing data loads.

**Performance concern**: fetching counts for every list on home load could mean N API calls. Options:
- Fetch full contacts per list and derive count client-side (already doing this in part)
- Add a `countsByList` helper that runs in parallel
- Accept the latency and show counts progressively as they load

---

## Open Questions

- Should overdue count on list orb include ALL lists' contacts, or just the ones visible to Moj? (likely all — she manages the whole network)
- If a list has 0 overdue, does the warm dot disappear entirely? (yes — only show when there's something to act on)
- Should counts animate in, or just appear? (appear — keep it simple)

---

## Out of Scope (v1)

- Overdue signals on category orbs
- "Last contacted" timestamps on orbs
- Color-coding orbs by recency heat
