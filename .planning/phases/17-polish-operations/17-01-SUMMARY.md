---
phase: 17-polish-operations
plan: 01
subsystem: ui
tags: [react, typescript, airtable, data-model, export, clipboard]

# Dependency graph
requires:
  - phase: 16-dashboard-nurturing
    provides: NurturingHub dataHygieneItems pattern, RecordPage fieldConfigs
  - phase: 14-pipelines
    provides: OpportunityCard component and OpportunityStatus type
  - phase: 12-pods-overhaul-categorization
    provides: PodDetailPage settings section pattern
provides:
  - email_2/email_3 on Contact type and Airtable field maps
  - enrichment_opt_in on Pod type and Airtable field maps
  - DetailsWidget with clickable website links, email_2/email_3 fields, missing-field indicators
  - OpportunityCard status badge for won/lost/archived
  - NurturingHub no-pod-assigned hygiene signal
  - PodDetailPage enrichment opt-in toggle
  - RecordsList toolbar export (filtered view CSV + copy-to-clipboard)
affects: [17-02-plan, future enrichment phases, reporting phase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - requiredFieldKeys Set passed from RecordWidgets to DetailsWidget for per-field indicators
    - cellValue helper extracted from handleExportCsv for reuse across export modes
    - STATUS_BADGE_STYLES pattern for non-open opportunity statuses

key-files:
  created: []
  modified:
    - src/lib/types.ts
    - src/lib/airtable.ts
    - src/lib/sampleData.ts
    - src/components/records/DetailsWidget.tsx
    - src/components/records/RecordWidgets.tsx
    - src/components/pipelines/OpportunityCard.tsx
    - src/components/nurturing/NurturingHub.tsx
    - src/components/pods/PodDetailPage.tsx
    - src/components/records/RecordsList.tsx

key-decisions:
  - "email_2/email_3 added as direct Contact fields (not arrays) per D-06 three-field pattern"
  - "enrichment_opt_in at pod level only per D-04; defaults false in mapPod and sampleData"
  - "requiredFieldKeys computed in RecordWidgets (not RecordPage) to keep DetailsWidget props clean"
  - "Toolbar export uses filtered array not selected - WYSIWYG semantics match user expectation"
  - "Bulk action bar export kept for selected-rows convenience alongside toolbar export"

patterns-established:
  - "Missing-field indicator: dashed border bottom + rgba(0,0,0,0.35) text + 'Add...' placeholder"
  - "STATUS_BADGE_STYLES object keyed by OpportunityStatus for pill badges"
  - "handleCopyToClipboard: tab-separated with 2s Copied! feedback via copyFeedback state"

requirements-completed: [PIPE-04, POL-01, POL-02, POL-03, POL-04, POL-05, POL-06, POL-07, POL-08, POL-09]

# Metrics
duration: 35min
completed: 2026-03-31
---

# Phase 17 Plan 01: Polish + Data Model Extensions Summary

**email_2/email_3 on Contact, enrichment_opt_in on Pod, clickable website links, status badge, no-pod hygiene signal, and toolbar WYSIWYG export with copy-to-clipboard across 9 files**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-03-31T00:00:00Z
- **Completed:** 2026-03-31T00:35:00Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Data model extended: email_2/email_3 on Contact, enrichment_opt_in on Pod with full Airtable field map (mapContact, createContact, updateContact, mapPod, updatePod) and sampleData coverage
- DetailsWidget enhanced: website URLs as clickable ExternalLink, email_2/email_3 editable fields, required empty fields show dashed-border "Add..." indicator via requiredFieldKeys Set
- OpportunityCard shows STATUS_BADGE_STYLES pill for won/lost/archived; NurturingHub adds no-pod-assigned hygiene group; PodDetailPage has enrichment opt-in checkbox
- RecordsList toolbar export (Download icon + dropdown) exports full filtered view as CSV download or tab-separated clipboard copy; bulk action bar export unchanged for selected rows

## Task Commits

1. **Task 1: Data model extensions** - `28826cb` (feat)
2. **Task 2: Polish fixes** - `304f1d7` (feat)
3. **Task 3: Export refactor** - `b79a742` (feat)

## Files Created/Modified
- `src/lib/types.ts` - email_2/email_3 on Contact, enrichment_opt_in on Pod
- `src/lib/airtable.ts` - Field maps for all new fields across mapContact/mapPod/createContact/updateContact/updatePod
- `src/lib/sampleData.ts` - Demo helpers updated; 2 contacts with email_2, all pods with enrichment_opt_in: false
- `src/components/records/DetailsWidget.tsx` - ExternalLink import, requiredFieldKeys prop, missing-field indicators, email_2/email_3 fields, website link rendering
- `src/components/records/RecordWidgets.tsx` - Computes and passes requiredFieldKeys to DetailsWidget
- `src/components/pipelines/OpportunityCard.tsx` - STATUS_BADGE_STYLES, status badge render, instructional tooltip text
- `src/components/nurturing/NurturingHub.tsx` - noPod array in dataHygieneItems, noPod hygiene group render with orange dot
- `src/components/pods/PodDetailPage.tsx` - enrichment_opt_in checkbox in settings grid
- `src/components/records/RecordsList.tsx` - Download import, cellValue extracted, handleExportCsv parameterized, handleCopyToClipboard, toolbar export dropdown

## Decisions Made
- email_2/email_3 as direct Contact fields (not arrays) - simpler access, matches D-06 three-field spec
- requiredFieldKeys computed in RecordWidgets (not RecordPage) to avoid threading extra state through RecordPage
- Toolbar export targets `filtered` array for WYSIWYG semantics; bulk bar export targets `selected` for per-row convenience

## Deviations from Plan

None - plan executed exactly as written. Airtable prerequisite fields (Email 2, Email 3, Enrichment Opt-In) noted - code defaults to null/false when absent, writes will 422 until fields are created in Airtable.

## Issues Encountered
None

## User Setup Required
The following fields must be created manually in Airtable before new data will persist:
- Contacts table: "Email 2" (email type), "Email 3" (email type)
- Lists table: "Enrichment Opt-In" (checkbox type)

Reads and UI work immediately (default null/false). Writes to these fields will fail with 422 until the fields exist.

## Known Stubs
None - all new fields flow through to UI rendering. enrichment_opt_in is a future-use toggle (no enrichment pipeline yet), but it saves to Airtable and renders correctly.

## Next Phase Readiness
- Plan 17-02 can proceed: all data model prerequisites are in place
- email_2/email_3 ready for merge/dedup workflows
- enrichment_opt_in stored at pod level, ready for Phase 17 enrichment plan

---
*Phase: 17-polish-operations*
*Completed: 2026-03-31*
