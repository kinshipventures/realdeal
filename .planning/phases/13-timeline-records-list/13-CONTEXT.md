# Phase 13: Timeline + Records List - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Unified activity timeline on every relationship record and a filterable records list as a new top-level view with bulk actions. The timeline becomes the single source of truth for all activity on a record. The records list becomes the primary way to browse, filter, and act on relationships across pods.

Depends on Phase 12 (pods, categorization, custom fields). Pipeline events (TL-05) will be populated by Phase 14 — Phase 13 builds the renderer and type, Phase 14 writes the data.

</domain>

<decisions>
## Implementation Decisions

### Timeline event types & storage
- **D-01:** System events stored in the same Interactions Airtable table alongside human interactions. New type values: `pod_change`, `field_update`, `categorization`, `pipeline_event` (Phase 14 populates). One table = one query for the full timeline.
- **D-02:** New fields on Interactions table: `event_detail` (long text, JSON string for event-specific metadata) and `actor` (single line text, future-proofs for multi-user).
- **D-03:** InteractionType union expands: `'call' | 'email' | 'text' | 'meeting' | 'intro' | 'note' | 'pod_change' | 'field_update' | 'categorization' | 'pipeline_event'`

### Timeline visual hierarchy
- **D-04:** Two visual treatments — human actions (call, email, text, meeting, intro, note) render as full cards with notes/details. System events (pod_change, field_update, categorization) render as compact single-line entries between cards. Like GitHub's "added a label" entries between comments.
- **D-05:** Default view shows human actions only. System events hidden by default, revealed via a "+ System events" toggle chip. Founders care about "when did I last talk to this person" not "when was their cadence changed."

### Timeline filtering
- **D-06:** Additive multi-select filter chips. Toggle individual types on/off. All human types on by default. "All" chip acts as select-all/deselect-all. Separate "+ System events" toggle for system event visibility.
- **D-07:** Filter chips sit above the timeline, below the interaction log form. Compact horizontal row — wraps on mobile.

### Timeline event writing
- **D-08:** Every mutation that changes a record's pod membership, field values, or categorization status writes a system event to the Interactions table. "Nothing changes on a relationship without being visible in the timeline" (TL-04).
- **D-09:** Pipeline event type + renderer built in Phase 13 but left empty — Phase 14 writes pipeline_event entries when stages change, notes are added, or cards are archived.
- **D-10:** Actor field stores "You" for now (single-user). Schema supports future multi-user without migration.

### Records List — location & navigation
- **D-11:** New top-level route at `/records` with its own entry in the floating pill navigator: `[ Pulse | Map | Records ]`. First-class surface alongside Dashboard and Map.
- **D-12:** Full-width table with filter bar above. Click row navigates to `/record/:id`.

### Records List — default columns
- **D-13:** Default visible columns: Name, Company, Pod (primary), Equity score. Additional columns (Type, Status, Last Contact, Cadence, Location, Follow-up) available via column visibility toggle but hidden by default. Clean default, power when needed.

### Records List — filtering
- **D-14:** Filter bar with: text search, Pod dropdown, Type dropdown (Person/Company), Status dropdown (Active/Pending/Archived), and any custom field filter. Filters are combinable (AND logic).
- **D-15:** Saved views via a "Views" dropdown in the filter bar. Save current filter config as a named view (e.g., "My LPs", "Overdue Contacts"). Select a saved view to restore all filters. "All Records" is the built-in default.
- **D-16:** Saved views stored in localStorage (no Airtable table). Simple key-value: view name → serialized filter config. Sufficient for single-user, no sync needed.

### Records List — bulk actions
- **D-17:** All four bulk actions ship in Phase 13:
  1. **Add to pod** — select records, assign to pod (with required fields enforcement per record)
  2. **Bulk field update** — select records, update a shared field value
  3. **Export to CSV** — download selected records as CSV with visible columns
  4. **Bulk archive** — set selected records' status to Archived (soft delete, reversible)
- **D-18:** Checkbox column on left for multi-select. Bulk action bar appears above the table when 1+ records are selected. Shows count + action buttons.
- **D-19:** "Add to pipeline" and "Add to project" bulk actions deferred to Phase 14 and Phase 15 respectively — those modules don't exist yet.

### Claude's Discretion
- Timeline compact event line styling (icon, color, typography)
- Filter chip visual design and responsive behavior
- Records List table responsive/mobile treatment (cards vs. truncated table)
- Column visibility toggle UI (dropdown, sidebar, or inline)
- Bulk action confirmation patterns (inline vs. modal)
- Saved views dropdown styling and management (rename, delete)
- How bulk "Add to pod" handles required fields for many records (sequential modal vs. batch)
- Sort indicators and default sort order for Records List
- Empty state for Records List with no matching filters

</decisions>

<specifics>
## Specific Ideas

- Timeline compact events should feel like GitHub issue event lines — contextual but not attention-grabbing. Dotted leader, muted text, no card border.
- Filter chips follow the same chip pattern as the rest of the app — small, tappable, clear active/inactive state.
- Records List should feel like a proper data table — Linear's issue list or Notion's database view. Clean rows, clear hierarchy, sortable columns.
- "Views" dropdown mirrors Notion's saved views pattern — dropdown with list of views + "Save current view" at bottom.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product spec
- `docs/Kinship Brain — Initial Outline (Lovable).pdf` — Appendix A, especially §4 (Timeline), §5 (Records List), §7 (Follow-ups & Nurturing signals on timeline)
- `docs/Kinship Brain — MVP (Moj Mar 28).pdf` §4 — Activity Timeline requirements, source attribution, filtering

### Prior phase context
- `.planning/phases/10-data-architecture-rebuild/10-CONTEXT.md` — D-01: Interactions table structure, D-08: Status field on Contacts
- `.planning/phases/11-relationship-records/11-CONTEXT.md` — D-01 through D-05: RecordPage layout (60/40 grid, timeline left, widgets right)
- `.planning/phases/12-pods-overhaul-categorization/12-CONTEXT.md` — D-06: Categorization modal writes timeline events (CAT-06)

### Current code
- `src/components/contacts/InteractionSection.tsx` — Existing timeline component with CRUD (human interactions only). Extend for system events + filter chips.
- `src/components/contacts/CategoryTable.tsx` — Existing sortable/filterable table. Reference pattern for Records List (sort, search, filter, equity badges).
- `src/components/records/RecordPage.tsx` — Record layout with timeline on left. Timeline enhancements land here.
- `src/components/records/RecordTimeline.tsx` — Timeline wrapper component.
- `src/lib/airtable.ts` — Interaction CRUD, cache patterns, table IDs. Expand for new event types + event_detail field.
- `src/lib/types.ts` — InteractionType union, Interaction interface. Expand with new types + fields.
- `src/lib/equity.ts` — Scoring weights by type. System events should have weight 0 (no effect on equity).
- `src/lib/sampleData.ts` — Demo data. Add sample system events for demo mode.
- `src/App.tsx` — Router config. Add `/records` route.
- `docs/design-system.md` — Design tokens, typography, spacing, motion curves.

### Requirements
- `.planning/REQUIREMENTS.md` — TL-01 through TL-06, LIST-01 through LIST-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `InteractionSection.tsx`: Self-contained timeline component with log form, type pills, chronological list, edit/delete. Extend with filter chips and system event renderer.
- `CategoryTable.tsx`: Full sortable/filterable table with multi-column sort, text search, overdue/cooling toggles, equity badges. Reference pattern for Records List — consider extracting shared table primitives.
- `RecordTimeline.tsx`: Wrapper component that houses InteractionSection. Filter state could live here.
- `TYPE_COLORS` map in InteractionSection: Add entries for new system event types (muted colors).
- `escapeStack.ts`: Layered escape handling for any modals triggered by bulk actions.
- `SolidOrb.tsx` + `POD_SHIFT_COLORS`: Pod color in Records List pod column.

### Established Patterns
- Stale-while-revalidate caching in airtable.ts — apply to any new queries.
- Optimistic updates with revert on failure — apply to bulk operations.
- `formatRelativeTime()` for "3d ago" timestamps — reuse in timeline entries.
- Type-driven rendering via `TYPE_COLORS[type]` / `TYPE_LABELS[type]` — extend for system event types.
- Floating pill navigator pattern — add "Records" entry.
- Route-based navigation with `useNavigate` — add `/records` route.

### Integration Points
- Interactions table: Add `event_detail` (long text) and `actor` (single line text) fields via Airtable MCP.
- `InteractionType` union: Expand with 4 new types.
- `Interaction` interface: Add `event_detail` and `actor` fields.
- `mapInteraction()` in airtable.ts: Handle new types + fields.
- Equity scoring: System event types must have weight 0.
- Every existing mutation that changes pod membership or field values needs a side-effect call to create a system event.
- Nav pill in App.tsx: Add "Records" entry.
- Demo data: Add sample system events.

</code_context>

<deferred>
## Deferred Ideas

- Pipeline event population — Phase 14 writes `pipeline_event` entries when it ships
- "Add to pipeline" bulk action — Phase 14
- "Add to project" bulk action — Phase 15
- Column customization persistence to Airtable (for multi-user sync) — future, localStorage sufficient for now
- Timeline search (full-text search within timeline entries) — future enhancement
- Timeline grouping by date (Today, This Week, This Month headers) — could be nice but not required
- Bulk import from external sources (email, calendar) into timeline — blocked on integrations (v2.1+)

</deferred>

---

*Phase: 13-timeline-records-list*
*Context gathered: 2026-03-29*
