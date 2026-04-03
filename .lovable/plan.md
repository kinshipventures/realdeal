

# RealDeal Gap Analysis - Eisenhower Matrix

## Current State

- **v2.0**: Shipped (68/68 requirements), 3 known broken routes + 1 data integrity gap from audit
- **v2.1**: 3/4 phases complete (Auth, Enrichment/Follow-ups, Sharing done). Reporting (Phase 20) not started.
- **Phase 22** (Airtable->Supabase migration): 2/3 plans done, Plan 22-03 (swap data layer) incomplete
- **Phase 24** (Orb Map overhaul): All 3 plans marked complete
- **Phase 25** (Sidebar nav): Plan exists, partially implemented (sidebar is live)
- **21 pending todos** in `.planning/todos/pending/`

## Eisenhower Matrix

```text
                        URGENT                          NOT URGENT
              +-------------------------------+-------------------------------+
              |                               |                               |
              |  1. Broken navigation routes  |  5. Phase 20: Reporting       |
              |     (P0 - 3 locations use      |     (pod distribution,        |
              |      /record/:id, no route)   |      pipeline velocity,       |
              |                               |      engagement over time,    |
              |  2. Phase 22-03: Supabase     |      CSV export, saved        |
   IMPORTANT  |     data layer swap           |      configs)                 |
              |     (migration incomplete -   |                               |
              |      app may still hit         |  6. Multi-user team access    |
              |      Airtable in places)       |     (filtered views per user, |
              |                               |      role-based scoping)      |
              |  3. mergeRecords backlink gap  |                               |
              |     (P1 - dangling company     |  7. Gmail integration         |
              |      refs after merge)         |     (cross-channel timeline,  |
              |                               |      blocked on OAuth creds)  |
              |                               |                               |
              +-------------------------------+-------------------------------+
              |                               |                               |
              |  4. Focus filter semantic     |  8. Orb map visual bugs       |
              |     mismatch (P2 - focus       |     (overlap on large pods,   |
              |     links to wrong section)   |      plus-orb position,       |
              |                               |      disappear on zoom-out)   |
              |                               |                               |
              |  9. Contact modal overlaps    | 10. Import flows              |
   NOT        |     project detail page       |     (LP lists, Talent list    |
   IMPORTANT  |                               |      from Google Sheets)      |
              | 10. Project cards dark mode   |                               |
              |     contrast                  | 11. iMessage bot, Google Cal,  |
              |                               |     email drafting, history    |
              |                               |     backfill (all future/      |
              |                               |     blocked on 3rd-party)     |
              |                               |                               |
              +-------------------------------+-------------------------------+
```

## Breakdown

### Quadrant 1: Do First (Urgent + Important)

| # | Item | Effort | Impact | Status |
|---|------|--------|--------|--------|
| 1 | Fix 3 broken `/record/:id` routes -> `/contact/:id` | ~10 min | Unblocks pipeline and nurturing flows | Known since v2.0 audit |
| 2 | Phase 22-03: Supabase data layer swap | Medium | Completes migration, removes Airtable dependency | 2/3 plans done |
| 3 | mergeRecords backlink fix | ~30 min | Prevents dangling company refs | Known P1 |

**Lowest-hanging fruit**: Item 1. Three lines of code, fixes two broken user flows.

### Quadrant 2: Schedule (Not Urgent + Important)

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 5 | Phase 20: Reporting | Large | Completes v2.1 milestone |
| 6 | Multi-user team access | Large | Enables Briell + team usage |
| 7 | Gmail integration | Large | Cross-channel visibility (top user request) |

### Quadrant 3: Delegate/Quick Fix (Urgent + Not Important)

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 4 | Focus filter -> distinct NurturingHub section | ~1 hr | Fixes semantic mismatch |
| 9 | Contact modal z-index overlap | ~15 min | Visual bug |
| 10 | Dark mode contrast on project cards | ~15 min | Visual polish |

### Quadrant 4: Eliminate/Defer (Not Urgent + Not Important)

Items 8, 10, 11 - orb map visual edge cases, import flows (blocked on data), and third-party integrations (blocked on credentials/APIs).

## Recommended Execution Order

1. **Fix broken routes** (10 min, highest ROI in the entire backlog)
2. **mergeRecords backlink** (30 min, data integrity)
3. **Focus filter fix** (1 hr, completes nurturing flow)
4. **Phase 22-03** (complete Supabase swap)
5. **Phase 20: Reporting** (last v2.1 blocker)
6. **UI bugs** (modal overlap, dark mode contrast)

