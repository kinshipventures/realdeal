# Dashboard View

**Date:** 2026-03-09
**Status:** Ready for planning

---

## What We're Building

A dashboard that replaces the current home screen as the default entry point. It surfaces the three things Moj needs most before she even opens an orb:

1. **Needs attention queue** — all overdue contacts across all lists, sorted by how long they've been overdue. Click a contact → ContactDetail panel slides in right there.
2. **Network stats** — total contacts, per-list counts, category count. Compact right column.
3. **Recent activity feed** — last N interactions across the whole network (who was contacted, what type, when).

The orb map is still accessible via a "Map view →" button in the dashboard header.

---

## Why This Approach

The orb map is spatial and exploratory. The dashboard is operational — it answers "what do I do today." Making it the default entry point means Moj opens the app and immediately sees work to do, not just a pretty visualization.

The split layout (queue left, context right) puts the primary action (engaging overdue contacts) in the dominant visual zone, with supporting context in the narrower right column. ContactDetail reuses the existing panel — no new interaction pattern to learn.

---

## Layout

```
┌─────────────────────────────────────────────┐
│  Kinship Brain          [ Map view → ]       │
├──────────────────────────┬──────────────────┤
│  Needs attention (29)    │  Network         │
│                          │  514 contacts    │
│  ● Alice K. · Legal      │  3 lists         │
│    62 days ago           │  26 categories   │
│  ● Bob T. · Design       │                  │
│    45 days ago           ├──────────────────┤
│  ● Maya S. · PR          │  Recent          │
│    38 days ago           │  · Call w/ Alice │
│  ...                     │  · Intro → Bob   │
│                          │  · Note on Maya  │
└──────────────────────────┴──────────────────┘
```

---

## Key Decisions

| Decision | Choice | Reason |
|---|---|---|
| Default route | Dashboard at `/` | That's where work happens |
| Map access | Button in dashboard header | Orb map stays, just not the default |
| Overdue contact action | Click → ContactDetail panel | Reuses existing component, no new pattern |
| Contact filtering | All lists combined, sorted by days overdue | Moj manages the whole network |
| Visual aesthetic | Same glass panel system | Feels like one product |
| Stats scope | Total counts only (no charts) | YAGNI — numbers are enough for now |

---

## Data Requirements

- **Overdue contacts**: filter `_contactsCache` client-side by `isOverdue()` — free, already loaded
- **Network stats**: derived from cache (total, per-list counts) — already computed as `countsByList`
- **Recent activity**: needs `getRecentInteractions(limit)` — fetch all interactions sorted by date desc, limit 20. This is the one new API call. Airtable supports `sort[0][field]=Date&sort[0][direction]=desc&maxRecords=20`.

---

## Routing Change

Currently single-route. Needs:
- `/` → Dashboard (new)
- `/map` → OrbMap (existing, moved)

react-router v7 is already installed. Minimal change — just add routes in `main.tsx`.

---

## Open Questions

- Should overdue contacts be grouped by list, or a flat sorted list? (flat sorted by days overdue — most urgent first)
- What if there are no overdue contacts? (show an empty state: "All caught up.")
- Should ContactDetail on the dashboard close back to dashboard or navigate somewhere? (close back to dashboard)
- Is the recent activity feed global (all contacts) or scoped to overdue contacts? (global — it's a network pulse)

---

## Out of Scope (v1)

- Charts or graphs (contact growth over time, activity frequency, etc.)
- Filtering the overdue queue by list
- Bulk actions on overdue contacts
- Notifications or reminders
