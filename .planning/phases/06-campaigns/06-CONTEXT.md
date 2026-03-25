# Phase 6: Campaigns - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning
**Mode:** auto (Claude picked recommended defaults)

<domain>
## Phase Boundary

User can create and track lightweight outreach campaigns (events, SPV rounds, summit invites) from the dashboard. Campaigns pull contacts from across pods, track reach-out status per contact, and show progress. Not a full CRM pipeline — this is "who do I need to reach for this thing?"

</domain>

<decisions>
## Implementation Decisions

### Campaign structure
- **D-01:** A campaign has: name, type (event, investment, outreach, other), target contacts (linked), and an optional deadline date
- **D-02:** New Airtable table "Campaigns" with fields: Name, Type (single select), Deadline (date), Status (active/completed), Contacts (linked to Contacts table)
- **D-03:** A separate "Campaign Contacts" junction table for tracking per-contact status: Campaign (linked), Contact (linked), Status (single select: pending/reached/responded/confirmed), Notes (long text)
- **D-04:** Campaigns pull contacts from across pods — they're independent of pod structure. A campaign might include people from LPs, Service Providers, and MAPs.

### Dashboard display
- **D-05:** Active campaigns appear as a new section on the dashboard, positioned after Today's Focus and before Needs Attention
- **D-06:** Each campaign card shows: name, type badge, progress bar (contacted/total), deadline if set, and a "view" action
- **D-07:** Campaign cards use the same PANEL style constant as other dashboard sections — no special styling
- **D-08:** Maximum 3 active campaigns visible on dashboard. If more exist, show "+N more" link.

### Campaign detail view
- **D-09:** Campaign detail opens as a slide-out panel (same pattern as ContactDetail) — not a separate route
- **D-10:** Detail shows all target contacts with their individual status (pending/reached/responded/confirmed)
- **D-11:** Each contact row has a status toggle — click to advance status (pending → reached → responded → confirmed)
- **D-12:** Contact rows show name, pod, and last contacted date alongside campaign status

### Campaign creation
- **D-13:** Create campaign from a "+" button in the campaigns dashboard section header
- **D-14:** Inline creation form: name input, type selector, optional deadline picker
- **D-15:** After creation, user adds contacts via a search-and-add interface (reuse SearchPalette pattern)
- **D-16:** Can also add contacts to a campaign from ContactDetail (action button: "Add to campaign")

### Lifecycle
- **D-17:** Campaigns are either "active" or "completed" — no archive/delete, just mark complete
- **D-18:** Completed campaigns move to a collapsed "past campaigns" section at bottom of dashboard section
- **D-19:** No auto-completion — user manually marks campaign as complete when done

### Contact status semantics
- **D-20:** Four statuses: pending (haven't reached out), reached (sent the invite/message), responded (they replied), confirmed (committed/attending)
- **D-21:** Status is per-campaign, not global — same contact can be "confirmed" in one campaign and "pending" in another
- **D-22:** Progress bar counts reached + responded + confirmed as "contacted" out of total

### Claude's Discretion
- Exact panel dimensions and transition animation for campaign detail
- Progress bar visual style (color, height, rounded vs square)
- Empty state copy for "no active campaigns"
- How the search-and-add interface works for adding contacts (modal vs inline)
- Type badge colors

</decisions>

<specifics>
## Specific Ideas

- From 3/18 Moj brainstorm: campaigns mentioned for investments, events, and summits — lightweight pipeline, not full CRM
- Trolley CRM PDF shows "Pipeline" list with only 8 contacts — campaigns here are small, targeted outreach, not mass marketing
- "Campaign" in Moj's world = "I need to reach 15-20 specific people about this specific thing" — invitation-style, not broadcast
- Status toggle should feel fast — one click, not a dropdown. Similar to checking off a todo.

</specifics>

<canonical_refs>
## Canonical References

### Requirements
- `.planning/REQUIREMENTS.md` — CAMP-01, CAMP-02, CAMP-03 define the three requirements for this phase

### Design system
- `docs/design-system.md` — Color tokens, typography scale, spacing grid, panel styles
- `docs/design-exploration/10-data-visualization.html` — Health bars and progress visualization patterns

### Existing patterns
- `src/components/contacts/ContactDetail.tsx` — Slide-out panel pattern to reuse for campaign detail
- `src/components/search/SearchPalette.tsx` — Search-and-select pattern for adding contacts to campaigns
- `src/components/dashboard/Dashboard.tsx` — PANEL constant, section header pattern, dashboard layout order

### Data layer
- `src/lib/airtable.ts` — TABLES constant, request/fetchAll helpers, cache patterns. New Campaigns + CampaignContacts tables need to be added here.
- `src/lib/types.ts` — Type definitions. New Campaign and CampaignContact interfaces needed.

### Context from prior discussion
- `2026 Trolley CRM.pdf` — Pipeline list (8 contacts), campaign concept from Moj's existing workflow
- `docs/context-map.md` — "Campaign management" listed as committed feature, "pipeline for investments, events, SPVs"

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ContactDetail.tsx` slide-out panel — same pattern for campaign detail panel (right-side drawer, escape to close, loads data on open)
- `SearchPalette.tsx` — Cmd+K search with result selection. Can adapt the search/filter logic for "add contacts to campaign"
- `PANEL` style constant — consistent card styling across dashboard
- `Avatar` component — for contact rows in campaign detail
- `escapeStack.ts` — layered escape handling for the campaign detail panel

### Established Patterns
- Dashboard sections follow: serif header → content → optional "show more" toggle
- Data fetching: call Airtable REST, parse fields, cache in module-level variable
- Mutations: call API, then invalidate cache and re-fetch
- All Airtable linked fields return arrays of record IDs

### Integration Points
- Dashboard.tsx gets new "campaigns" section between Today's Focus and Needs Attention
- New Airtable tables: Campaigns + CampaignContacts (need table IDs after creation)
- airtable.ts gets new functions: getCampaigns(), getCampaignContacts(), createCampaign(), updateCampaignContactStatus()
- types.ts gets new interfaces: Campaign, CampaignContact, CampaignType, CampaignContactStatus
- ContactDetail.tsx gets an "Add to campaign" action button

</code_context>

<deferred>
## Deferred Ideas

- Mass email/text send from campaign — requires integration (Phase 2+)
- Campaign templates (reusable invite lists) — future if Moj uses campaigns regularly
- Auto-populate campaigns from pod filters ("all LPs in Tech category") — future
- Campaign analytics/reporting — future
- Trolley "YOU Inc. Board" as a special campaign type — separate feature, see TODOS.md

</deferred>

---

*Phase: 06-campaigns*
*Context gathered: 2026-03-25*
