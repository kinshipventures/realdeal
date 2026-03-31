# Phase 15: Projects - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Projects as lightweight initiative containers distinct from pipelines. Users can create projects (events, outreach, initiatives), attach contacts and opportunities, maintain a notes/updates feed, and view a simple overview page. No dashboards, milestones, or analytics (V2). Projects reference relationships — no duplication.

Depends on Phase 14 (shares navigation patterns, slide-out/widget conventions, bulk action bar).

</domain>

<decisions>
## Implementation Decisions

### Navigation & routing
- **D-01:** New top-level nav pill entry: `Pulse | Map | Records | Pipelines | Projects`. Route at `/projects`. First-class surface — projects are same tier as pipelines per PDF.
- **D-02:** Projects landing page is a card grid. Each project card shows name, description snippet, contact count, opportunity count. Projects are few in number — cards give each one visual weight.
- **D-03:** "+" button on the Projects page opens a creation modal with name, description (optional), owner (optional). Consistent with pipeline and record creation patterns.
- **D-04:** Empty state uses existing EmptyState component with illustration + "Create your first project" CTA. Messaging references real use cases: podcast outreach, philanthropy campaigns, SPV initiatives, events.

### Project detail page
- **D-05:** Full page at `/projects/:id`. The PDF explicitly says "overview page" — projects are richer than opportunities and need space for attached records, opportunities, and notes.
- **D-06:** Single column layout with project header (name, description, owner) at top, then tabbed sections below: Contacts | Opportunities | Notes. Simple and scannable — avoids two-column complexity for what the PDF calls "simple."
- **D-07:** Notes/updates tab is a chronological timeline-style feed. Each note is a timestamped entry. Add note via input at top, most recent first. Uses Interactions table entries scoped to the project (not the single Airtable Notes text field) to support proper history.
- **D-08:** Contacts and Opportunities tabs show simple lists — rows with name, key detail, and link to navigate to the record. Remove button on each row. Compact and scannable.

### Attaching records & opportunities
- **D-09:** "+" button at the top of Contacts and Opportunities tabs opens a search/picker modal. Search existing records, select one or more, attach. Same pattern as AddToPipelineModal.
- **D-10:** ProjectsWidget in the right column of RecordPage — shows project cards this contact is part of, with "+" to add to a project. Mirrors PipelinesWidget. Clicking a project navigates to `/projects/:id`.
- **D-11:** "Add to Project" ships as a new bulk action in Records List alongside existing bulk actions (Add to Pod, Add to Pipeline, etc.). Select records, pick project from dropdown, confirm. PDF explicitly lists "Bulk add to projects."

### Timeline integration
- **D-12:** Project actions write `project_event` entries to the Interactions table for each linked relationship record. Events include: added to project, removed from project, project note added. Uses `event_detail` JSON field for metadata (project name, action type). Consistent with pipeline_event pattern.

### Claude's Discretion
- Project card design (gradient, shadow, layout within grid)
- Tab component implementation (reuse existing or new)
- Search modal layout for attaching records
- Project header edit UX (inline vs modal)
- Notes input design (simple text input vs rich editor)
- Card grid responsive/mobile treatment
- Project creation modal layout

</decisions>

<specifics>
## Specific Ideas

- Projects should feel lighter than pipelines — no Kanban, no stages, no drag-and-drop. They're containers, not workflows.
- The PDF's "Projects vs Pipelines" distinction is critical: "Pipelines focus on stages and movement. Projects focus on context, scope, and collection of people/opportunities around a theme or initiative."
- Project cards on the grid should feel clean and informative — similar energy to pod health cards on the dashboard.
- "Some projects may still be managed in external tools (e.g., ClickUp), but the CRM should hold the core relationship data" — keep it lightweight, not a PM tool replacement.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product spec
- `docs/Kinship Brain — MVP (Moj Mar 28).pdf` — V1 scope boundary, Projects listed as V1 module. Section 10 "Associations & organization" confirms projects visible from relationship record. Section 5 timeline includes project events.
- `docs/Kinship Brain — Initial Outline (Lovable).pdf` — Section 7 "Projects Module": full spec for project creation, attached records/opportunities, notes/updates, Projects vs Pipelines distinction. Section 2 "Records List & Bulk Actions": "Bulk add to projects." Section 2 "Associations": projects as canonical hub association.

### Requirements
- `.planning/milestones/v2.0-REQUIREMENTS.md` — PROJ-01 through PROJ-03
- `.planning/REQUIREMENTS.md` — PROJ-01 through PROJ-06

### Prior phase context
- `.planning/phases/14-pipelines/14-CONTEXT.md` — D-01: nav pill pattern, D-09: slide-out panel pattern, D-14: RecordPage widget pattern (PipelinesWidget), D-18: bulk action pattern in Records List, D-19: timeline event writing pattern

### Current code (data layer — already built)
- `src/lib/types.ts` — `Project` interface (id, name, description, owner, relationship_ids, opportunity_ids, notes, created_at)
- `src/lib/airtable.ts` — `getProjects()`, `createProject()`, `invalidateProjectsCache()` + stale-while-revalidate caching
- `src/lib/sampleData.ts` — `DEMO_PROJECTS` (2 projects: "Fund III Launch", "Podcast Outreach S2")

### Current code (UI patterns to follow)
- `src/components/pipelines/PipelinesPage.tsx` — Top-level module page pattern (nav pill entry, route)
- `src/components/records/RecordPage.tsx` — Full page layout pattern, right-column widgets
- `src/components/records/RecordWidgets.tsx` — Widget container (add ProjectsWidget alongside PipelinesWidget)
- `src/components/records/PipelinesWidget.tsx` — Direct pattern reference for ProjectsWidget
- `src/components/records/RecordsList.tsx` — Bulk action bar pattern for "Add to Project"
- `src/components/campaigns/CampaignDetail.tsx` — Slide-out/modal patterns
- `src/components/empty/EmptyState.tsx` — Empty state component with orb icon, heading, CTA
- `src/App.tsx` — Router config + floating pill navigator for adding Projects entry
- `docs/design-system.md` — Design tokens, typography, spacing, motion curves

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Full project data layer**: Types, Airtable CRUD, caching, and demo data all exist. No data layer work needed — this phase is pure UI + minor airtable.ts additions (updateProject, addRecordToProject, removeRecordFromProject).
- **PipelinesWidget**: Direct pattern clone for ProjectsWidget on RecordPage.
- **RecordsList bulk actions**: Existing bulk action bar with "Add to Pipeline" — extend with "Add to Project" using same modal pattern.
- **EmptyState component**: Reusable for no-projects state.
- **Floating pill nav**: Add "Projects" entry alongside existing entries in App.tsx.
- **escapeStack.ts**: Layered escape handling for modals.
- **InteractionSection**: Timeline rendering — project_event type needs a renderer added here.

### Established Patterns
- Stale-while-revalidate caching — already applied to project fetches.
- `pipeline_event` InteractionType precedent — create matching `project_event` type.
- Route-based navigation with `useNavigate` — add `/projects` and `/projects/:id` routes.
- Widget pattern on RecordPage — PipelinesWidget is the template for ProjectsWidget.
- Bulk action modal pattern — AddToPipelineModal is the template for AddToProjectModal.

### Integration Points
- **App.tsx**: Add `/projects` and `/projects/:id` routes, add "Projects" nav pill entry.
- **RecordWidgets.tsx**: Add ProjectsWidget component showing linked projects.
- **RecordsList.tsx**: Add "Add to Project" bulk action button + modal.
- **airtable.ts**: Add `updateProject()`, `addRecordToProject()`, `removeRecordFromProject()`. Add `project_event` writing via timeline.
- **types.ts**: Add `project_event` to InteractionType union if not present.
- **sampleData.ts**: Demo mode mutations for project operations.
- **InteractionSection.tsx**: Add `project_event` renderer.

</code_context>

<deferred>
## Deferred Ideas

- Project dashboards and analytics — V2 per PDF scope boundary
- Project milestones and progress tracking — V2
- ClickUp/Notion/Asana project sync — V2 (Initial Outline S11: Deep Integrations)
- Project templates — future enhancement
- Project-level permissions ("Share this project only with the comms team") — V2 (Initial Outline S10)
- Project status field (active/archived/completed) — could add later, not in V1 requirements

</deferred>

---

*Phase: 15-projects*
*Context gathered: 2026-03-30*
