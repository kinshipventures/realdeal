# Phase 19: Enrichment + Follow-ups - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Contacts get richer via manual enrichment (stubbed data source) and follow-ups drive action from the nurturing hub. Manual follow-up CRUD -- set/edit/complete with dashboard surfacing. Enrichment builds the full UX with a mock provider; real data source plugs in later. Requirements: ENR-01, ENR-02, ENR-03, ENR-04, FLW-01, FLW-02, FLW-03, FLW-04.

</domain>

<decisions>
## Implementation Decisions

### Enrichment trigger
- **D-01:** Manual "Enrich" button on contact detail -- user deliberately triggers enrichment per contact
- **D-02:** No background/automatic enrichment -- manual only for Phase 19
- **D-03:** Pod-level `enrichment_opt_in` toggle (already exists on PodDetailPage) gates which contacts can be enriched

### Enrichment field scope
- **D-04:** Broad field coverage -- company, LinkedIn, role, website, location, specialization, and other existing Contact fields
- **D-05:** Only fills fields that are currently empty by default
- **D-06:** When a field already has a value and enrichment finds different data, show a "suggested update" the user can accept or reject per field

### Enrichment visual treatment
- **D-07:** Small indicator next to each individual field that was auto-filled (not a single contact-level badge)
- **D-08:** Before/after values logged to contact timeline as `field_update` system event with `event_detail` JSON

### Enrichment data source
- **D-09:** Stub/mock data source for Phase 19 -- build complete UX with placeholder enrichment results
- **D-10:** Architecture: Supabase Edge Function interface so a real provider (Apollo, People Data Labs, etc.) plugs in with one swap
- **D-11:** Edge function keeps API keys server-side, client calls the function endpoint
- **D-12:** "External enrichment APIs -- anti-feature per Moj" concern is addressed by manual trigger + user review flow (not auto-scraping)

### Follow-up creation flow
- **D-13:** Nurturing hub rows get an inline calendar icon alongside existing quick-log buttons (call/email/text/meeting)
- **D-14:** Clicking the calendar icon expands an inline date picker + action text field on that row
- **D-15:** Contact detail pinned bar becomes editable -- click date or action text to edit inline
- **D-16:** When no follow-up exists, show a "Set follow-up" button in the pinned bar area

### Follow-up completion
- **D-17:** Completing a follow-up clears `next_follow_up_date` and `next_action` on the contact
- **D-18:** Completion logs to the contact timeline (FLW-04)
- **D-19:** No auto-prompt for next follow-up -- that's algorithm phase territory

### Follow-up surfacing
- **D-20:** Overdue follow-ups appear in NeedsAttentionWidget with red date styling
- **D-21:** Overdue follow-ups also remain in ComingUpWidget sorted to top with distinct visual treatment
- **D-22:** Nurturing hub "needs attention" section surfaces overdue follow-ups alongside cadence-overdue contacts
- **D-23:** Overdue follow-ups are a stronger signal than cadence-overdue (user explicitly set a date)

### Claude's Discretion
- Enrichment button placement and styling within contact detail
- Mock enrichment data generation strategy
- Edge function interface contract (request/response shape)
- Follow-up date picker component choice
- Timeline event formatting for enrichment and follow-up entries
- How "suggested update" accept/reject UI works (inline diff, modal, etc.)

</decisions>

<specifics>
## Specific Ideas

- Enrichment should feel intentional, not surveillance-y -- the manual trigger + review flow is the product answer to Moj's "anti-feature" concern
- Stub approach lets Moj experience the full enrichment UX and decide on a real provider without committing now
- Follow-ups are signals, not tasks (per MVP PDF section 7) -- no global task list, no task management UI
- Follow-up creation should be zero-navigation from the nurturing hub (user is already looking at contacts needing attention)

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Enrichment requirements
- `.planning/REQUIREMENTS.md` -- ENR-01 through ENR-04 definitions
- `docs/Kinship Brain — MVP (Moj Mar 28).pdf` section 4.2 -- AI Enrichment spec (web search, never silent override, before/after logging, visual marking)

### Follow-up requirements
- `.planning/REQUIREMENTS.md` -- FLW-01 through FLW-04 definitions
- `docs/Kinship Brain — MVP (Moj Mar 28).pdf` section 7 -- Follow-ups spec (signals not tasks, no global task list, managed through pods, dashboard surfacing)

### Existing enrichment/follow-up schema
- `src/lib/types.ts` -- `Contact.next_follow_up_date`, `Contact.next_action`, `Pod.enrichment_opt_in`
- `src/lib/airtable.ts` -- `mapContact()` (field mapping), `updateContact()` (directFields allowlist), `logInteraction()` (does NOT clear follow-up fields)

### Existing display surfaces
- `src/components/nurturing/NurturingHub.tsx` -- "upcoming dates this week" section, NurturingRow quick-log buttons
- `src/components/dashboard/widgets/ComingUpWidget.tsx` -- merged birthdays + follow-ups
- `src/components/dashboard/widgets/NeedsAttentionWidget.tsx` -- overdue/dormant contacts (follow-ups to be added)
- `src/components/contacts/ContactDetail.tsx` line 868 -- pinned follow-up bar (read-only, needs edit capability)

### Timeline system
- `src/components/contacts/InteractionSection.tsx` -- interaction display, system event rendering
- `src/lib/timeline.ts` -- `logSystemEvent()` helper for `field_update` events

### Pod enrichment toggle
- `src/components/pods/PodDetailPage.tsx` lines 333-341 -- existing `enrichment_opt_in` checkbox

### Design system
- `docs/design-system.md` -- tokens, typography, spacing, motion curves

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `logSystemEvent()` in `timeline.ts`: already supports `field_update` type with `event_detail` JSON -- use for enrichment before/after logging
- `NurturingRow` quick-log button pattern: inline action buttons on nurturing hub rows -- extend with calendar icon for follow-up creation
- `updateContact()` directFields allowlist: `next_follow_up_date` and `next_action` already included -- no schema changes needed for follow-ups
- `enrichment_opt_in` on Pod type and PodDetailPage toggle: already wired, just needs to gate enrichment execution

### Established Patterns
- Click-to-edit in ContactDetail: `editingField` state + blur-save pattern -- reuse for pinned bar follow-up editing
- System events in InteractionSection: compact single-line entries with dot indicator -- use same pattern for enrichment timeline entries
- `cachedFetch()` stale-while-revalidate: follow cache invalidation pattern after follow-up mutations

### Integration Points
- ContactDetail pinned bar (line 868): convert from read-only to editable, add "Set follow-up" when empty
- NurturingHub NurturingRow: add calendar icon action alongside quick-log buttons
- NeedsAttentionWidget: add overdue follow-up contacts to the existing overdue/dormant list
- ComingUpWidget: add visual distinction for overdue items (red styling) vs upcoming
- Supabase Edge Functions: new infrastructure for enrichment endpoint (first edge function in the project)

</code_context>

<deferred>
## Deferred Ideas

- **Relationship intelligence algorithm** -- smarter equity scoring, auto-suggested follow-ups, intelligent "needs attention" ranking based on full relationship picture (interaction history, cadence, relationship type, recency, pod priority). Own phase (e.g., Phase 24).
- **Real enrichment provider** -- swap stub for Apollo, People Data Labs, or similar via the edge function interface. Separate task once Moj approves the UX flow.
- **Bulk enrichment** -- enrich all contacts in a pod at once. Deferred until real provider is connected.
- **Auto-prompt for next follow-up** after completing one -- requires algorithm phase intelligence.

</deferred>

---

*Phase: 19-enrichment-followups*
*Context gathered: 2026-04-02*
