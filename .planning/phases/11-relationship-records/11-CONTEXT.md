# Phase 11: Relationship Records - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create, view, and manage Contact and Company records with a full layout including timeline, widgets, and conditional custom fields. This is the first UI phase of the v2.0 rebuild — it replaces the existing ContactDetail slide-out with a proper record page.

Depends on Phase 10 (data architecture). Pipeline UI (Kanban), Project UI, Records List, and Categorization Tray are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Record page layout
- **D-01:** Full-page view at `/record/:id` — not a slide-out panel. The relationship record is the canonical hub and needs room for timeline + widgets side by side.
- **D-02:** Two-column layout: scrolling timeline on the left (~60% width), stacked widget cards on the right (~40%). Matches REC-06: "central timeline on the left, side widgets on the right."
- **D-03:** Header area contains core identity: name (editable), type badge (Contact/Company), status badge (Active/Pending/Archived), role + company (Contact) or industry + domain (Company), contact methods (email, phone, LinkedIn).
- **D-04:** Mobile: collapses to single column — header, then widgets (collapsed/accordioned), then timeline.

### Navigation pattern
- **D-05:** Two-tier navigation. Existing slide-out panels (ContactPanel, CategoryNode clicks, etc.) become lightweight preview cards showing name, role/company, equity score, and an "Open Record" action that navigates to `/record/:id`.
- **D-06:** Direct navigation from: Cmd+K search results, orb map nodes, pipeline cards, campaign contacts, dashboard widgets — all go to `/record/:id`.
- **D-07:** Back navigation: "← Back" button in record header returns to previous view (browser history).

### Editable fields placement
- **D-08:** Core identity fields live in the header — click-to-edit inline (same pattern as current ContactDetail).
- **D-09:** Secondary fields (location, birthday, gender, etc.) grouped in a "Details" widget card in the right column.
- **D-10:** Pod-specific fields grouped in their own widget cards per pod (e.g., "LP Fields" card with KV Fund, SPV, Commit Amount).

### Conditional fields
- **D-11:** Auto-hide irrelevant fields based on `record.type`. Contact records show person fields (birthday, gender, role, LinkedIn). Company records show org fields (industry, stage, ticker, domain). No grayed-out placeholders.
- **D-12:** Pod-specific fields only appear when that pod is assigned to the record. Adding a pod reveals its field group; removing a pod hides it.

### Contact vs Company records
- **D-13:** One `RecordPage` component handles both types. Conditional rendering based on `contact.type` determines which fields, widgets, and header layout to show.
- **D-14:** Contact records show a "Company" linked field in the header — clicking navigates to the Company's record page. Company records show an "Associated People" widget listing linked contacts.

### Company-contact linking
- **D-15:** Contact's company field is a typeahead search dropdown. Type to search existing Company records. If no match, "+ Create [name] as company" option creates inline.
- **D-16:** Company records show "Associated People" widget with linked contacts. "+ Add person" searches existing contacts to link.
- **D-17:** Linking a contact to a company updates the `Company Record` linked field in Airtable. The relationship is immediately visible on both records.

### Custom fields system
- **D-18:** Custom fields are real Airtable columns on the Contacts table, created via the Metadata API. Not virtual/JSON — they're queryable and visible in Airtable views.
- **D-19:** A new "Field Config" Airtable table tracks field metadata: name, Airtable field ID, field type, scope (record type and/or pod), required/optional flag, display order.
- **D-20:** App reads Field Config to determine which custom fields to show per record based on type and pod membership. The Field Config table is the source of truth for field visibility rules.
- **D-21:** "+ Add field" button appears at the bottom of each pod's field group on the record page. Inline form: name, type (text/number/select/date/checkbox), required toggle. Creates both the Airtable column and the Field Config record.

### Record creation
- **D-22:** Type-first modal. Step 1: pick Contact or Company. Step 2: type-appropriate form with required fields.
- **D-23:** Contact form: first name*, last name*, email, company (typeahead search), pod* (multi-select). Brain dump mode alternative available (free text → creates as needs_review).
- **D-24:** Company form: company name* (with duplicate detection — warns if similar name exists), industry, domain, pod* (multi-select).
- **D-25:** Pod assignment is required on create. Every record must belong to at least one pod. No orphan records.
- **D-26:** Bulk creation (CRE-02) and CSV import (CRE-03) are in scope but as secondary flows — single creation is the primary UX.

### Claude's Discretion
- Widget card ordering and visual weight in the right column
- Timeline entry visual design (extend from existing InteractionSection or redesign)
- Exact field type options for custom field creation (which Airtable field types to expose)
- Empty state for records with no timeline entries
- Whether to add a "Field Config" migration script or create the table in the Phase 11 migration
- Responsive breakpoints for the two-column → single-column collapse

</decisions>

<specifics>
## Specific Ideas

- "The relationship record is the primary and only core object" — from the spec. Everything attaches to it.
- "Records do not exist until approved" — pod assignment required, no orphans.
- "Nothing changes without being visible" — all mutations should eventually surface in timeline (timeline expansion is Phase 13, but the structure should support it).
- The existing InteractionSection (502 lines) is already a functional timeline — it can serve as the foundation for the timeline column.
- Company duplicate detection during creation: case-insensitive name match, similar to the migration script's deduplication logic.

</specifics>

<canonical_refs>
## Canonical References

### Product spec
- `docs/Kinship Brain — Initial Outline (Lovable).pdf` — System structure appendix, core philosophy
- `docs/Kinship Brain — MVP (Moj Mar 28).pdf` §2 — Relationship Record definition, record types, available/required fields, UI behavior
- `docs/Kinship Brain — MVP (Moj Mar 28).pdf` §3 — Relationship Creation & Intake, creation methods, initial context capture
- `docs/Kinship Brain — MVP (Moj Mar 28).pdf` §4 — Custom Fields definition, field assignment rules, required/optional
- `docs/Kinship Brain — MVP (Moj Mar 28).pdf` §5 — Relationship Timeline (Critical), event types, entry metadata
- `docs/Kinship Brain — MVP (Moj Mar 28).pdf` §10 — Relationship record associations (pods, pipelines, campaigns, people/companies)

### Prior phase context
- `.planning/phases/10-data-architecture-rebuild/10-CONTEXT.md` — D-01 through D-13: data model decisions (single table, Type/Status fields, company linking, new tables)
- `.planning/phases/10-data-architecture-rebuild/10-01-SUMMARY.md` — Migration output: table IDs, field structure

### Current code
- `src/components/contacts/ContactDetail.tsx` — Current 898-line contact view (will be replaced by RecordPage)
- `src/components/contacts/ContactPanel.tsx` — Current slide-out panel (will become lightweight preview)
- `src/components/contacts/InteractionSection.tsx` — 502-line timeline component (foundation for record timeline)
- `src/components/contacts/AddContactModal.tsx` — Current creation modal (structured + brain dump modes — extend for type selection)
- `src/lib/types.ts` — Contact interface with v2 fields (type, status, company_record_id, industry, stage, ticker, domain)
- `src/lib/airtable.ts` — CRUD functions including getContactsByType, getActiveContacts, new entity functions
- `docs/design-system.md` — Full token set, typography, spacing, motion curves

### Requirements
- `.planning/REQUIREMENTS.md` — REC-01 through REC-09, CRE-01 through CRE-04, FLD-01 through FLD-06

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `InteractionSection.tsx`: 502-line timeline component with type pills, summary bar, log form, edit/delete — foundation for record page timeline column
- `ContactDetail.tsx`: Field rendering with `field()` helper (click-to-edit inline) — reuse pattern for record page fields
- `AddContactModal.tsx`: Structured + brain dump creation modes — extend with type picker step
- `SearchPalette.tsx`: Typeahead search pattern (debounced, keyboard nav) — reuse for company linking dropdown
- `SolidOrb.tsx` + `POD_SHIFT_COLORS`: Pod color system — use for pod badge colors on record page
- `escapeStack.ts`: Layered escape handling — needed for inline dropdowns on record page

### Established Patterns
- Click-to-edit inline fields with `field()` renderer in ContactDetail (lines 172-274)
- Stale-while-revalidate caching for all entity reads
- Demo mode branching in all CRUD functions
- Airtable linked record fields return arrays of record IDs — client-side filtering
- Slide-out panels use cubic-bezier(0.87, 0, 0.13, 1) at 350ms

### Integration Points
- New route: `/record/:id` in App.tsx router
- ContactPanel/ContactCard: slim down to preview cards with "Open Record" action
- SearchPalette: results navigate to `/record/:id` instead of opening slide-out
- `createContact()` in airtable.ts: needs Type, Status, Company Record fields in the write payload
- New Field Config table: needs table creation (migration or inline), CRUD functions, cache

</code_context>

<deferred>
## Deferred Ideas

- Records List with filters (LIST-01 through LIST-03) — separate phase
- Categorization tray / pending intake queue (CAT-01 through CAT-06) — separate phase
- Timeline expansion beyond interactions (pod changes, field updates, pipeline events) — Phase 13
- Pipeline Kanban UI — separate phase
- Project overview page — separate phase
- AI enrichment of fields — v2.1+
- Bulk operations on records — separate phase

</deferred>

---

*Phase: 11-relationship-records*
*Context gathered: 2026-03-29*
