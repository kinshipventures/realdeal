# Phase 12: Pods Overhaul + Categorization - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Pods become behavioral containers with required questions, sub-pods, capacity limits, and intake workflow. All new records from external sources (CSV import, future email parsing) pass through a Pending Categorization tray before entering the CRM. Manual creation bypasses pending — categorization happens inline at creation time.

Depends on Phase 11 (relationship records, custom fields). Nurturing Hub curation UI is Phase 16. Timeline event expansion is Phase 13.

</domain>

<decisions>
## Implementation Decisions

### Pending tray
- **D-01:** Dashboard widget showing pending count + preview. Visible on every app open as passive awareness. Tapping opens the categorization queue.
- **D-02:** Manual "Add Contact" skips the pending tray — pod assignment and required questions are answered inline during creation (existing CreateRecordModal flow). Pending tray is for imports and external sources only.
- **D-03:** Gentle urgency — shows count, no color escalation or badges. Present when ready, not nagging. Like an inbox you check when you want to.
- **D-04:** Tinder-style swipe queue for processing pending contacts. Cards in a stack — swipe/tap through one by one with quick-assign. Each card adapts to available data (smart preview: shows name, email, company, brain-dump notes, source — whatever fields exist).
- **D-05:** Skip sends contact to back of queue. No snooze timer. User sees it again next round through the queue.

### Categorization modal
- **D-06:** All-in-one screen. Pod multi-select at top, required questions appear inline below as pods are selected. Primary pod radio selector. One scroll, one save.
- **D-07:** Required questions are enforced — Save button disabled until all required fields for all selected pods are answered. Skip button available to defer (sends back to queue).
- **D-08:** Smart preview on swipe cards — shows whatever fields exist from creation source. If brain dump was captured, show it. If CSV had company/role, show those. Adapts to available data.

### Capacity limits
- **D-09:** Soft cap with warning. User can still add past the limit, but UI warns "Maps is at 152/150 — consider reviewing." Options: [Review Pod] or [Add Anyway].
- **D-10:** Per-pod configurable capacity. Any pod can optionally set a capacity number. Most leave blank (unlimited). Field on Pod record in Airtable.
- **D-11:** "Manage up or out" curation UI deferred to Nurturing Hub (Phase 16). Phase 12 only adds the data model (capacity field) and the soft-cap warning at add time.

### Pod management
- **D-12:** Pod detail page at `/pod/:id`. Shows: settings (name, color, description, cadence, capacity) at top, required fields section, sub-pods list, member list with equity scores. Accessed from orb map click or nav.
- **D-13:** Pod creation available from both: '+' orb on the orb map home view (quick creation) and a dedicated form on a pods management area (detailed creation).
- **D-14:** New Pod fields in Airtable: `description` (long text), `capacity` (number, nullable = unlimited).

### Sub-pods
- **D-15:** Categories ARE sub-pods — UI label rename only. Same Airtable Categories table, same `list_id` parent link, same `category_ids` on contacts. No data migration.
- **D-16:** Sub-pods inherit parent pod cadence unless overridden (future consideration — not required in Phase 12).

### Orb map updates
- **D-17:** Pod orbs show existing health ring (equity score) plus a capacity indicator for capacity-limited pods (fraction label or subtle arc). Pending count as a small badge on the dashboard widget, not on orbs.
- **D-18:** Orb map click navigates to `/pod/:id` detail page instead of current category-drill behavior. Category/sub-pod navigation moves to the pod detail page.

### Claude's Discretion
- Swipe queue animation and gesture implementation (CSS transitions vs gesture library)
- Dashboard widget visual design and placement among existing widgets
- Pod detail page layout and responsive behavior
- How the all-in-one categorization form handles many pods with many required fields (scroll vs collapse)
- Exact orb capacity indicator visual treatment
- Whether to add a "Pods" section to the nav pill or rely on orb map as entry point
- Pod creation form field ordering and validation

</decisions>

<specifics>
## Specific Ideas

- "Pods are behavioral containers, not folders" — from spec §6. They define intake fields, cadence, and logic.
- Swipe queue should feel fast and low-friction — more Superhuman triage than spreadsheet processing.
- The all-in-one categorization screen dynamically reveals question sections as pods are toggled — progressive disclosure, not a wizard.
- "Records do not exist until approved" — from spec §3.1. The Status field (Pending/Active/Archived) from Phase 10 is the gate.
- Follow-up logic always flows from the primary pod — spec §6.2.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product spec
- `docs/Kinship Brain — Initial Outline (Lovable).pdf` — Appendix A system structure, especially §6 (Customizable Pods), §3 (Relationship Creation & Intake)
- `docs/Kinship Brain — MVP (Moj Mar 28).pdf` §3 — Relationship Creation & Intake (automatic intake queue, approval flow, initial context capture)
- `docs/Kinship Brain — MVP (Moj Mar 28).pdf` §6 — Customizable Pods (pod capabilities, logic rules, sub-pods)

### Prior phase context
- `.planning/phases/10-data-architecture-rebuild/10-CONTEXT.md` — D-08: Status field (Pending/Active/Archived) on Contacts table, D-09: Categories = sub-pods
- `.planning/phases/11-relationship-records/11-CONTEXT.md` — D-18 through D-21: Custom fields system, Field Config table, pod-scoped fields
- `.planning/phases/11-relationship-records/11-CONTEXT.md` — D-22 through D-26: Record creation flow, pod assignment required on create

### Current code
- `src/lib/airtable.ts` — Pod (List) CRUD, Category CRUD, Contact status field, cache patterns
- `src/lib/types.ts` — Pod interface (name, color, owner, is_priority, cadence), Category interface (list_id, name, color), Contact interface (list_ids, category_ids, status)
- `src/components/map/OrbMap.tsx` — Current orb map with pod → category drill navigation
- `src/components/map/SolidOrb.tsx` — Orb component with health ring + POD_SHIFT_COLORS
- `src/components/contacts/CreateRecordModal.tsx` — Current creation flow (extends for inline categorization)
- `src/components/dashboard/Dashboard.tsx` — Widget layout (pending tray widget goes here)
- `src/lib/equity.ts` — Pod equity scoring, cadence constants
- `docs/design-system.md` — Full token set, typography, spacing, motion curves

### Requirements
- `.planning/REQUIREMENTS.md` — POD-01 through POD-10, CAT-01 through CAT-06

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CreateRecordModal.tsx`: Type-first creation flow with pod multi-select — extend for inline categorization (D-02)
- `SolidOrb.tsx` + health ring SVG: Add capacity arc/label for capacity-limited pods
- `CategoryTable.tsx`: Member list with equity scores — reuse pattern for pod detail page member section
- `SearchPalette.tsx`: Typeahead pattern — reuse for pod search in categorization modal
- `escapeStack.ts`: Layered escape handling for swipe queue overlay
- Field Config table + `PodFieldsWidget`: Already renders pod-scoped required fields — powers the categorization form's dynamic question sections

### Established Patterns
- Dashboard widget cards (WrappedCard, PodCard pattern) — pending tray widget follows same pattern
- Slide-out panels with cubic-bezier(0.87, 0, 0.13, 1) at 350ms — swipe queue could use similar motion
- Module-level cache with explicit invalidation — apply to any new pod fields
- `contact.status` field already supports Pending/Active/Archived filtering via `getActiveContacts()`
- Pod color system (POD_SHIFT_COLORS) — pod detail page and categorization UI use same colors

### Integration Points
- Pod table needs new Airtable fields: `description` (long text), `capacity` (number)
- Pod TypeScript interface needs: `description`, `capacity` fields
- New route: `/pod/:id` in App.tsx router
- Dashboard.tsx: Add pending tray widget component
- OrbMap.tsx: Pod orb click → navigate to `/pod/:id` instead of current category drill
- CreateRecordModal: Already handles pod assignment — ensure Status='Active' for manual creates
- CSV import flow: Set Status='Pending' instead of 'Active' for imported records

</code_context>

<deferred>
## Deferred Ideas

- Curation UI ("manage people up or out") for capacity-limited pods — Phase 16 (Nurturing Hub, NURT-03)
- Sub-pod cadence override (sub-pod overrides parent pod cadence) — future enhancement
- Conditional pod logic ("if in X pod, override Y pod") — spec marks as "Future"
- Trigger logic types (time-based, activity-based, manual only) — spec §6.1, not MVP-critical
- Review expectations (yearly, quarterly pod reviews) — spec §6.1, Phase 16 territory
- Email parsing as pending source (CAT-02 mentions email parsing) — blocked on Gmail integration (v2.1+)
- Meeting note-taker summaries as pending source (CAT-02) — blocked on integration (v2.1+)

</deferred>

---

*Phase: 12-pods-overhaul-categorization*
*Context gathered: 2026-03-29*
