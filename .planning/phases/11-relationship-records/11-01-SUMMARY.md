---
phase: 11-relationship-records
plan: 01
subsystem: ui
tags: [react, airtable, react-router, fieldconfig, record-page]

# Dependency graph
requires:
  - phase: 10-data-architecture-rebuild
    provides: v2 Contact schema with type/status/company_record_id/industry/stage/ticker/domain fields
provides:
  - Full-page RecordPage at /record/:id with two-column layout (timeline left, widgets right)
  - RecordHeader with editable name, type/status badges, contact methods
  - RecordTimeline wrapping InteractionSection
  - RecordWidgets with DetailsWidget (conditional by type) and HealthWidget (equity score ring)
  - fieldConfig.ts module — getFieldConfigs, getFieldConfigsForRecord, createCustomField, FieldConfig type
  - migrateFieldConfig.ts script — idempotent Field Config table creation
  - createContact/updateContact now write all v2 fields to Airtable
  - Navigation wired: search palette, ContactPanel, orb map nodes all route to /record/:id
affects: [11-02, 11-03, all phases referencing relationship records]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - RecordPage loads all data independently (contacts, pods, fieldConfigs) via parallel Promise.all
    - DetailsWidget uses field() helper pattern from ContactDetail — click-to-edit inline fields
    - HealthWidget uses contactEquityScore(interactions) — interactions passed from parent, no re-fetch
    - ContactCard now has "Open" button that navigates to /record/:id — removed full-detail expansion
    - OrbMap CategoryNode onClick uses setSelectedCategoryId (not navigate) — stays on map, shows panel

key-files:
  created:
    - src/components/records/RecordPage.tsx
    - src/components/records/RecordHeader.tsx
    - src/components/records/RecordTimeline.tsx
    - src/components/records/RecordWidgets.tsx
    - src/components/records/DetailsWidget.tsx
    - src/components/records/HealthWidget.tsx
    - src/lib/fieldConfig.ts
    - src/scripts/migrateFieldConfig.ts
  modified:
    - src/lib/airtable.ts
    - src/lib/sampleData.ts
    - src/components/contacts/ContactCard.tsx
    - src/components/contacts/ContactPanel.tsx
    - src/components/map/OrbMap.tsx
    - src/App.tsx
    - package.json

key-decisions:
  - "RecordPage loads interactions via InteractionSection's internal state (InteractionSection fetches its own interactions) — no separate getInteractions call needed at page level"
  - "DetailsWidget renders Contact/Company fields via conditional && blocks (never display:none) — correct per D-11"
  - "ContactPanel ContactDetail overlay removed — ContactCard Open button navigates directly to /record/:id"
  - "FieldConfig circular dep resolved by keeping FieldConfigShape inline in sampleData.ts (types-only), no cross-import"
  - "OrbMap no longer imports useNavigate — CategoryNode onClick uses existing setSelectedCategoryId state"

patterns-established:
  - "RecordPage pattern: useParams -> getContacts().find(id) -> full-page layout with header + two-column body"
  - "Widget card style: rgba(255,255,255,0.92) bg, 1px solid rgba(0,0,0,0.07) border, borderRadius 12px, 16px 20px padding"
  - "Field-conditional rendering: contact.type === 'Contact' && <fields/> vs contact.type === 'Company' && <fields/>"

requirements-completed: [REC-03, REC-05, REC-06, REC-07, REC-08, REC-09]

# Metrics
duration: 45min
completed: 2026-03-29
---

# Phase 11 Plan 01: Relationship Records Summary

**Full-page RecordPage at /record/:id with conditional Contact/Company field rendering, Field Config data layer, and navigation wired from search/map/panel to record view**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-03-29T20:30:00Z
- **Completed:** 2026-03-29T21:15:00Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments

- RecordPage renders at /record/:id with full-width header + two-column body (timeline left, widgets right)
- DetailsWidget shows type-conditional fields: Contact gets birthday/gender/linkedin/location/country/region/frequency, Company gets stage/ticker/domain/industry — no irrelevant fields via && conditionals
- HealthWidget shows equity score ring (SVG) with score number and Thriving/Steady/Cooling/Fading label with color coding
- fieldConfig.ts module with cached CRUD, getFieldConfigsForRecord filter, and createCustomField via Metadata API
- All navigation wired: Cmd+K search → /record/:id, ContactPanel "Open" button → /record/:id, orb map CategoryNode → ContactPanel preview → /record/:id

## Task Commits

1. **Task 1: Data layer — v2 fields, fieldConfig module, migration script** - `d68c71a` (feat)
2. **Task 2: Build RecordPage with header, timeline, widgets** - `f6baa4a` (feat)
3. **Task 3: Wire navigation** - `fad6de4` (feat)

## Files Created/Modified

- `src/components/records/RecordPage.tsx` — Full-page record view, loads contact/pods/fieldConfigs, two-column grid
- `src/components/records/RecordHeader.tsx` — Editable name, type/status badges, back button, contact methods
- `src/components/records/RecordTimeline.tsx` — Left column wrapper around InteractionSection
- `src/components/records/RecordWidgets.tsx` — Right column stacking DetailsWidget + HealthWidget
- `src/components/records/DetailsWidget.tsx` — Click-to-edit fields conditional by Contact/Company type
- `src/components/records/HealthWidget.tsx` — SVG equity ring + score label with color coding
- `src/lib/fieldConfig.ts` — FieldConfig CRUD module with cache, filter, createCustomField
- `src/scripts/migrateFieldConfig.ts` — Idempotent Field Config table creation script
- `src/lib/airtable.ts` — createContact/updateContact now include all v2 fields; TABLES.fieldConfig added
- `src/lib/sampleData.ts` — DEMO_FIELD_CONFIGS added (4 demo field configs)
- `src/components/contacts/ContactCard.tsx` — Simplified to preview row with "Open" navigate button
- `src/components/contacts/ContactPanel.tsx` — ContactDetail overlay removed; uses updated ContactCard
- `src/components/map/OrbMap.tsx` — CategoryNode onClick uses setSelectedCategoryId (not navigate)
- `src/App.tsx` — Added /record/:id route, changed search onSelectContact to navigate, removed ContactDetail slide-out from search

## Decisions Made

- `contactEquityScore` takes only `interactions[]` (not contact+interactions+pods as plan spec indicated) — used actual signature from equity.ts
- `InteractionSection` only takes `contact` and `onContactUpdated` — RecordTimeline wraps it correctly; no extra interaction state needed at RecordPage level
- ContactPanel's `handleSaved` state management removed since ContactCard no longer opens ContactDetail from the panel — contacts list stays static once loaded
- `fieldConfig` TABLES entry is `''` placeholder — populate after running `pnpm migrate:fieldconfig`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] contactEquityScore signature mismatch**
- **Found during:** Task 2 (HealthWidget)
- **Issue:** Plan spec said `contactEquityScore(contact, interactions, pods)` but actual signature is `contactEquityScore(interactions)` — no contact or pods argument
- **Fix:** Used correct signature in HealthWidget; pods prop kept on HealthWidget for forward compatibility
- **Committed in:** f6baa4a (Task 2 commit)

**2. [Rule 1 - Bug] InteractionSection props mismatch**
- **Found during:** Task 2 (RecordTimeline)
- **Issue:** Plan spec listed `onInteractionCreated`, `onInteractionDeleted` as InteractionSection props but actual interface only has `contact` and `onContactUpdated`
- **Fix:** RecordTimeline passes only `contact` and `onContactUpdated` — InteractionSection manages its own interaction state internally
- **Committed in:** f6baa4a (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - interface spec vs actual implementation mismatch)
**Impact on plan:** Both fixes bring implementation in line with actual codebase. No scope change.

## Issues Encountered

- Dynamic import in fieldConfig.ts for sampleData created an unnecessary bundler warning — simplified to static import (no actual circular dependency existed since sampleData only imports from types.ts)

## Known Stubs

- `TABLES.fieldConfig: ''` in airtable.ts — needs to be populated after running `pnpm migrate:fieldconfig`. FieldConfig reads/writes will silently return empty in non-demo mode until populated.

## User Setup Required

Run `pnpm migrate:fieldconfig` to create the Field Config table in Airtable. After running, copy the printed table ID into `src/lib/airtable.ts` at `TABLES.fieldConfig`.

## Next Phase Readiness

- RecordPage fully functional for existing contacts — navigate to /record/:id in browser to verify
- Plan 02 (company linking, AssociatedPeopleWidget) can build directly on RecordPage's RecordWidgets placeholder comment
- Plan 03 (custom fields UI) can build on fieldConfig.ts module and the PodFieldsWidget placeholder in RecordWidgets

---
*Phase: 11-relationship-records*
*Completed: 2026-03-29*

## Self-Check: PASSED

- FOUND: src/components/records/RecordPage.tsx
- FOUND: src/lib/fieldConfig.ts
- FOUND: src/scripts/migrateFieldConfig.ts
- FOUND: .planning/phases/11-relationship-records/11-01-SUMMARY.md
- Commits verified: d68c71a, f6baa4a, fad6de4
