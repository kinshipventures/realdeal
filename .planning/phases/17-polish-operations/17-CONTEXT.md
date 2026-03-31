# Phase 17: Polish + Operations - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Close visible functional gaps and add lightweight enrichment to bring the app to MVP-complete quality. Combined scope: polish (clickable fields, pipeline card status, multiple emails, merge, export) + lightweight enrichment (completeness signals, enrichment opt-in stub). No new modules or surfaces - enhances what exists.

Depends on Phase 16 (dashboard widgets, nurturing hub, signal propagation). Reporting (Phase 18) and Sharing (Phase 19) are separate.

</domain>

<decisions>
## Implementation Decisions

### Data completeness signals
- **D-01:** Inline field-level indicators on record pages - empty fields that matter show a subtle "missing" state (dimmed placeholder or dotted border). No aggregate completeness score or ring.
- **D-02:** No new widget for completeness - the nurturing hub's existing "Data Hygiene" section surfaces counts, inline indicators on the record page show specifics. These two layers are sufficient.
- **D-03:** "Enrich" is a stub for V1 - a record-level toggle that sets an `enrichment_opt_in` flag. No actual web search API integration. When enrichment ships in V2, records with this flag get enriched.
- **D-04:** Enrichment opt-in lives at the pod level (like cadence). Pod-level toggle auto-opts-in all members. Individual records can opt-out. No record-level opt-in - pods define behavior.
- **D-05:** No email metadata display (last interaction, subject preview) - Gmail integration isn't connected. Skip for V1.

### Multiple emails + merge
- **D-06:** Three email fields: `email` (existing, primary), `email_2`, `email_3`. No arrays, no tags. Same click-to-edit pattern in DetailsWidget.
- **D-07:** Manual merge via side-by-side comparison modal. User selects two records, picks which field values to keep per field. Interactions/timeline entries combine. One record survives, other is deleted.
- **D-08:** Merge uses union for associations - surviving record inherits all pod memberships, pipeline cards, project attachments, campaign contacts from both records. No data loss.
- **D-09:** Merge action available from two entry points: record page header dropdown (alongside delete) and Records List bulk action bar (select two records).

### Export
- **D-10:** WYSIWYG export - exports visible columns from the current filtered view. If a column is hidden, it's not in the export.
- **D-11:** Export button lives in list toolbar (next to filters/saved views). Not a bulk selection action - exports the full filtered view.
- **D-12:** Export available from all list contexts: Records List, pod detail page, project detail, pipeline view. Same CSV logic, different surfaces.
- **D-13:** Two export formats: CSV file download + copy-to-clipboard as tab-separated text.

### Data hygiene
- **D-14:** No new cleanup surfaces or modules. Nurturing hub's "Data Hygiene" section is sufficient. Merge tool handles dupes when users find them.
- **D-15:** Data Hygiene row click opens the record page - inline missing-field indicators (D-01) guide the user from there. No deep-linking to specific fields.
- **D-16:** Records with no pod assigned surface in Data Hygiene alongside missing required fields.

### Small polish fixes (no discussion needed)
- **D-17:** Website URLs clickable in DetailsWidget (external link, same pattern as LinkedIn).
- **D-18:** Opportunity status badge visible on pipeline cards (gap from PIPE-04). Status already exists in OpportunityDetail - surface it on OpportunityCard.
- **D-19:** Follow-up language uses instructional tone per PDF Section 9: "Consider reaching out to..." not "Overdue: contact now."

### Claude's Discretion
- Missing-field indicator visual treatment (dimmed, dotted border, placeholder text)
- Enrichment toggle placement on pod settings page
- Merge modal layout and field comparison UX
- Export button icon and placement within toolbar
- CSV column ordering and header formatting
- Clipboard copy format (tab-separated with or without headers)
- Status badge design on OpportunityCard (color, position, size)
- Website URL icon treatment in DetailsWidget

</decisions>

<specifics>
## Specific Ideas

- The PDF is written by a non-technical product owner - treat requirements as intent, not implementation specs. "Email metadata + subject preview" means "show email context" but Gmail isn't connected, so skip it.
- PDF Section 4.2 says AI enrichment "never overrides silently" and logs before/after values. The stub toggle sets up this pattern even though actual enrichment is V2.
- PDF Section 8 calls the sub-pod cap "a blocker" and "critical fix" - but the codebase scout found no actual enforced limit. Verify during implementation and close this item if confirmed.
- PDF Section 17 (MVP Guardrails): "No duplicate records, no silent overwrites, everything traceable, everything explainable." The merge tool must write a timeline event on both records documenting the merge action.
- Merge should feel safe - show a clear preview before executing, with an explicit "Merge" confirmation. No undo, so the UI must make consequences obvious.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product spec
- `docs/Kinship Brain — MVP (Moj Mar 28).pdf` - Section 4.2 (AI Enrichment: opt-in, never silent, before/after logging), Section 6 (Basic Enrichment V1 scope: baseline only, email metadata, web search opt-in per contact or pod), Section 8 (Pods: no artificial sub-pod cap, critical fix), Section 9 (Follow-ups: instructional not assigned, dashboard-led signals), Section 15 (Reporting: export CSV, share results), Section 17 (MVP Guardrails: no duplicates, everything traceable)

### Requirements
- `.planning/REQUIREMENTS.md` - PIPE-04 (opportunity card fields - status gap)

### Prior phase context
- `.planning/phases/16-dashboard-nurturing/16-CONTEXT.md` - D-09 (nurturing drill-down sections), D-13/D-14 (signal propagation patterns), D-15 (widget cross-surfacing)
- `.planning/phases/14-pipelines/14-CONTEXT.md` - Pipeline card patterns, OpportunityCard component

### Current code (will be modified)
- `src/components/records/DetailsWidget.tsx` - Add website clickable link, multiple email fields, missing-field indicators
- `src/components/pipelines/OpportunityCard.tsx` - Add status badge
- `src/components/pipelines/OpportunityDetail.tsx` - Status already implemented here, pattern to follow
- `src/components/records/RecordPage.tsx` - Enrichment toggle, merge action in header
- `src/components/records/RecordsList.tsx` - Export button in toolbar, merge in bulk actions
- `src/components/dashboard/widgets/NurturingHub.tsx` - Data Hygiene: add "no pod assigned" signal
- `src/lib/types.ts` - Add email_2, email_3 fields, enrichment_opt_in flag
- `src/lib/airtable.ts` - Merge function (update references, delete loser, combine timelines)

### Current code (patterns to follow)
- `src/components/records/RecordHeader.tsx` - Clickable email/phone/LinkedIn pattern (mailto:, tel:, external link)
- `src/components/contacts/ContactDetail.tsx` - Delete action with confirm modal pattern (reuse for merge)
- `src/lib/escapeStack.ts` - Layered escape handling for merge modal
- `src/components/categorization/CategorizationModal.tsx` - Side-by-side field layout pattern
- `docs/design-system.md` - Design tokens, typography, spacing, motion curves

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **RecordHeader contactMethods**: Already has mailto:/tel:/LinkedIn link pattern - website URL follows the same approach
- **OpportunityDetail status dropdown**: Status field (open/won/lost/archived) already implemented in detail view - extract badge rendering for card
- **ContactDetail delete flow**: Confirm modal + deleteContact() + cache invalidation - merge follows same confirm-then-execute pattern
- **NurturingHub Data Hygiene section**: Already surfaces missing required fields with counts - add "no pod" signal alongside
- **RecordsList bulk action bar**: Already supports select + bulk actions - add merge (when exactly 2 selected) and export

### Established Patterns
- Click-to-edit fields in DetailsWidget - missing-field indicators overlay the same pattern
- localStorage persistence for widget config, node positions, saved views - enrichment opt-in flag stored in Airtable (pod-level field)
- Timeline event logging for all mutations - merge must write merge_event type

### Integration Points
- **types.ts**: Add `email_2`, `email_3` to Contact interface. Add `enrichment_opt_in` to Pod interface.
- **airtable.ts**: New `mergeRecords()` function that updates all foreign references (pipeline cards, project attachments, campaign contacts, pod memberships) to point to surviving record, combines interaction arrays, then deletes the merged record.
- **sampleData.ts**: Demo mode support for new fields and merge action.
- **Airtable schema**: Add Email 2, Email 3 fields to Contacts table. Add Enrichment Opt-In checkbox to Lists table.

</code_context>

<deferred>
## Deferred Ideas

- AI web search enrichment (actual API integration) - V2, when provider is chosen
- Email metadata display (last interaction, subject preview) - blocked on Gmail integration
- Near-duplicate detection (fuzzy name matching) - V2, manual merge sufficient for V1
- PDF export format - V2 if low effort, CSV covers the need
- Drag-and-drop relationship hygiene module - V2 (PDF "Later Versions")
- Bulk enrichment (select records, enrich all) - V2, after web search API ships
- Sub-pod map drill-down navigation (captured as todo) - separate from this phase
- Font verification after Lovable migration (captured as todo) - separate from this phase

</deferred>

---

*Phase: 17-polish-operations*
*Context gathered: 2026-03-30*
