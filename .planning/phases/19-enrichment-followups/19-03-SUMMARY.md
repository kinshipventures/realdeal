---
phase: 19-enrichment-followups
plan: 03
subsystem: ui
tags: [enrichment, supabase-functions, contact-detail, react]

requires:
  - phase: 19-01
    provides: ContactDetail with follow-up UI and onSaved prop pattern
  - phase: 19-02
    provides: Follow-up surfacing widgets

provides:
  - Supabase edge function stub for contact enrichment (swappable for real provider)
  - Client-side enrichment module: callEnrichFunction, isEnrichmentAllowed, computeFieldDiffs, applyEnrichment
  - Enrich button on ContactDetail gated by pod opt-in (enrichment_opt_in field)
  - Per-field AI-enriched indicator dots for company, role, linkedin, website, location, specialization
  - Suggested-update accept/reject UI inline on each enrichable field
  - Timeline logging of enrichment field changes with before/after values

affects:
  - ContactDetail (pods prop added, enrichment state)
  - Dashboard (pods threaded to ContactDetail)
  - ProjectDetailPage (pods=[] placeholder)

tech-stack:
  added: []
  patterns:
    - Edge function stub pattern: deterministic mock in Deno.serve handler, real provider replaces inner block only
    - Enrichment gating via pod opt-in: isEnrichmentAllowed checks contact.list_ids against pods with enrichment_opt_in=true
    - Suggested-update state: computeFieldDiffs splits enrichment data into autoFill (empty fields) and suggestedUpdates (differing existing values)

key-files:
  created:
    - supabase/functions/enrich-contact/index.ts
    - src/lib/enrichment.ts
  modified:
    - src/components/contacts/ContactDetail.tsx
    - src/components/dashboard/Dashboard.tsx
    - src/components/projects/ProjectDetailPage.tsx

key-decisions:
  - "Edge function stays in supabase/ directory despite project using Airtable -- supabase client is still present for auth and functions.invoke, swapping enrichment provider only requires changing edge function body"
  - "Suggested-update UI embedded directly in field() renderer and linkedinField() -- avoids new component extraction for simple inline pattern"
  - "ProjectDetailPage passes pods=[] -- enrichment disabled there; pods not in project context scope"

requirements-completed: [ENR-01, ENR-02, ENR-03, ENR-04]

duration: ~10min
completed: 2026-04-02
---

# Phase 19 Plan 03: Enrichment Engine Summary

**Supabase edge function stub + enrichment client module with Enrich button, opt-in gate, per-field indicator dots, and inline suggested-update accept/reject UI in ContactDetail**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-02T17:38:11Z
- **Completed:** 2026-04-02T17:42:43Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Edge function stub at `supabase/functions/enrich-contact/index.ts` returns deterministic mock data -- real provider plugs in by swapping handler body only
- `src/lib/enrichment.ts` exports full enrichment API: gating check, field diffing, edge function call, timeline-logged apply
- ContactDetail receives `pods` prop, Enrich button triggers enrichment flow, empty fields auto-fill, existing fields show inline suggested-update with Accept/Keep current

## Task Commits

1. **Task 1: Edge function stub + enrichment client module** - `721235d` (feat)
2. **Tasks 2+3: Enrich button + per-field dots + suggested-update UI** - `ca9fc6e` (feat)

## Files Created/Modified

- `supabase/functions/enrich-contact/index.ts` - Deterministic mock enrichment edge function (deploy via `supabase functions deploy enrich-contact`)
- `src/lib/enrichment.ts` - callEnrichFunction, isEnrichmentAllowed, computeFieldDiffs, applyEnrichment, ENRICHABLE_FIELDS
- `src/components/contacts/ContactDetail.tsx` - pods prop, enrichment state, Enrich button, per-field dots, suggested-update UI
- `src/components/dashboard/Dashboard.tsx` - pods={pods} threaded to ContactDetail
- `src/components/projects/ProjectDetailPage.tsx` - pods={[]} (enrichment disabled in project context)

## Decisions Made

- Edge function stays in `supabase/` -- the supabase client is present for auth, and `functions.invoke` is the correct call pattern regardless of data layer
- Suggested-update UI embedded directly in each field renderer rather than extracted -- pattern is simple enough inline, avoids new component
- ProjectDetailPage passes `pods={[]}` -- enrichment button shows as disabled there; pods not available in project context without additional fetch

## Deviations from Plan

None - plan executed exactly as written. The `supabase/` concern noted in the execution context was pre-addressed: the edge function belongs there as the supabase client handles function invocations.

## Issues Encountered

None.

## User Setup Required

The edge function must be deployed separately from the Vercel app:
```bash
supabase functions deploy enrich-contact
```
Requires Supabase CLI installed and project linked (`supabase link`). Until deployed, clicking Enrich will return an error -- the button is visible but the call will fail gracefully with an inline error message.

## Next Phase Readiness

- ENR-01 through ENR-04 complete
- Phase 19 fully done (all 3 plans shipped)
- Edge function swap path clear: change `supabase/functions/enrich-contact/index.ts` handler body to call Apollo/PDL/etc., no client changes needed

---
*Phase: 19-enrichment-followups*
*Completed: 2026-04-02*
