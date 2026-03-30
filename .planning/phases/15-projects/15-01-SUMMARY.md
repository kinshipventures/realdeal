---
phase: 15-projects
plan: 01
subsystem: database
tags: [airtable, typescript, projects, timeline, demo-mode]

requires:
  - phase: 14-pipelines
    provides: pipeline_event pattern in InteractionType + createInteraction() signature

provides:
  - project_event in InteractionType, SystemEventType, SYSTEM_TYPES
  - updateProject, addRecordToProject, removeRecordFromProject
  - addOpportunityToProject, removeOpportunityFromProject, addProjectNote
  - DEMO_PROJECT_INTERACTIONS with 4 sample entries merged into DEMO_INTERACTIONS
affects: [15-02-projects-ui, 15-03-projects-integration, 16-enrichment, timeline rendering]

tech-stack:
  added: []
  patterns:
    - "Project mutations invalidate _projectsCache = null inline before returning"
    - "Timeline events write via createInteraction() on add/remove/note — same pattern as pipeline_event"
    - "Demo mode uses in-memory array mutation (push/filter/Object.assign) — no Airtable calls"

key-files:
  created: []
  modified:
    - src/lib/types.ts
    - src/lib/airtable.ts
    - src/lib/sampleData.ts

key-decisions:
  - "createProject gains isDemoMode branch inline (Rule 2 — missing critical for demo consistency)"
  - "addRecordToProject/removeRecordFromProject write timeline events for linked relationship records — matches pipeline_event precedent"
  - "addProjectNote writes project_event for every linked record so project notes appear in each contact's timeline"
  - "DEMO_PROJECT_INTERACTIONS merged into DEMO_INTERACTIONS at module load via forEach push — keeps single source of truth for demo timeline data"

patterns-established:
  - "Project CRUD pattern: fetch all → find → mutate → PATCH Airtable → invalidate cache → return mapped"
  - "Demo mode branching: if (isDemoMode()) { mutate DEMO array; return } at top of each function"

requirements-completed: [PROJ-01, PROJ-02, PROJ-04]

duration: 12min
completed: 2026-03-30
---

# Phase 15 Plan 01: Projects Data Layer Summary

**Project CRUD API with timeline event writes, opportunity linking, notes, and full demo mode support for all mutations**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-30T00:00:00Z
- **Completed:** 2026-03-30T00:12:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `project_event` registered in InteractionType, SystemEventType, and SYSTEM_TYPES — renders as system event dot in timeline
- 6 new exported project functions covering full CRUD + association surface area
- Timeline auto-writes when records are added/removed from projects or project notes are added
- Demo mode fully supported — all mutations operate on DEMO_PROJECTS / DEMO_INTERACTIONS in-place
- `DEMO_PROJECT_INTERACTIONS` (4 entries) merged into DEMO_INTERACTIONS at module load

## Task Commits

1. **Task 1: Add project_event type and project CRUD functions** - `7396558` (feat)
2. **Task 2: Add DEMO_PROJECT_INTERACTIONS to sampleData** - `819c6df` (feat)

## Files Created/Modified
- `src/lib/types.ts` — Added project_event to InteractionType, SystemEventType, SYSTEM_TYPES
- `src/lib/airtable.ts` — Added updateProject, addRecordToProject, removeRecordFromProject, addOpportunityToProject, removeOpportunityFromProject, addProjectNote with demo mode branches; also added isDemoMode branch to createProject
- `src/lib/sampleData.ts` — Added DEMO_PROJECT_INTERACTIONS export and merge into DEMO_INTERACTIONS

## Decisions Made
- createProject was missing a demo mode branch (Rule 2 auto-fix) — added inline before the Airtable API call for consistency with all other write functions
- addProjectNote writes to every linked relationship record's timeline — matches the product intent where project notes surface in contact context
- DEMO_PROJECT_INTERACTIONS merged via forEach push rather than concat to keep DEMO_INTERACTIONS as a mutable array (required for runtime demo mutations)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added isDemoMode branch to createProject**
- **Found during:** Task 1 (reviewing existing createProject before adding new functions)
- **Issue:** createProject had no demo mode check — would throw 401 in demo mode if called
- **Fix:** Added isDemoMode() branch that creates a demo project in DEMO_PROJECTS and returns it
- **Files modified:** src/lib/airtable.ts
- **Verification:** Build passes, consistent with all other write functions
- **Committed in:** 7396558 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Fix essential for demo mode correctness. No scope creep.

## Issues Encountered
None — plan executed cleanly. createInteraction signature required passing full Interaction shape minus id/created_at, which matched the plan's `event_detail` requirement.

## Known Stubs
None — all functions are fully wired. DEMO_PROJECT_INTERACTIONS provides real data for timeline display.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All project CRUD functions exported and type-safe — Plan 02 (projects UI) can import directly
- project_event renders as system event dot-line in existing timeline component without changes
- Demo mode ready for projects UI testing without Airtable credentials

---
*Phase: 15-projects*
*Completed: 2026-03-30*
