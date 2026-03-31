# Milestones

## v2.0 RealDeal MVP (Shipped: 2026-03-31)

**Phases completed:** 8 phases, 23 plans, 37 tasks

**Key accomplishments:**

- Idempotent Airtable migration script that adds Type/Status/company fields to Contacts, creates Company records from existing text values, links them via self-referencing linked field, and creates Pipelines/Pipeline Stages/Opportunities/Projects tables — migration ran successfully against live base
- Updated types.ts, airtable.ts, and sampleData.ts with full v2 schema support — 5 new type aliases, 4 new interfaces, extended Contact, 4 new TABLES entries, field interfaces, mappers, stale-while-revalidate caches, CRUD functions, and demo data for all new entity types
- Full-page RecordPage at /record/:id with conditional Contact/Company field rendering, Field Config data layer, and navigation wired from search/map/panel to record view
- Type-first CreateRecordModal with Contact/Company forms, company typeahead linking, and AssociatedPeopleWidget for bidirectional company-contact relationships
- Per-pod custom field cards with Airtable Metadata API field creation, multi-entry modal mode, and CSV import with type/pod assignment
- Extended Pod and Contact interfaces with 4 new Airtable fields, added pod CRUD, routed CSV imports through Pending status, and wired cadence_override into equity scoring
- Tinder-style swipe intake queue with all-in-one categorization modal: pending tray widget on dashboard, pointer-gesture card stack, pod multi-select with required field enforcement, capacity warnings, and timeline entry on save
- Pod orb clicks navigate to /pod/:id, category-drill fully removed, capacity indicators on orbs, '+' orb opens PodCreateModal
- Type System (src/lib/types.ts)
- Filterable, sortable records table at /records with saved views, column visibility, multi-select, and recency filter — accessible from both desktop pill nav and mobile tab bar
- Working bulk action bar with 4 operations (add to pod, field update, CSV export, archive), each writing appropriate system events to affected records' timelines
- Kanban pipeline board with dnd-kit drag-and-drop, tab switching, undo toast, stage columns with inline edit/color picker, and opportunity cards with priority/avatar/archive — wired to Airtable data layer
- OpportunityDetail.tsx
- Pipelines wired into nav (Pulse|Map|Contacts|Pipelines), RecordPage widget with opportunity deep-links, and shared AddToPipelineModal for single + bulk contact flows
- Project CRUD API with timeline event writes, opportunity linking, notes, and full demo mode support for all mutations
- Full project UI: card grid landing page, tabbed detail page with contact slide-out overlay, creation and attach modals, nav pill entry and routes
- ProjectsWidget on record pages, Add to Project bulk action in Records List, and project_event timeline rendering — projects fully integrated across all relationship record surfaces
- 500-line monolithic Dashboard.tsx decomposed into 8 toggleable widget components with localStorage-backed config, full/focus presets, and a slide-in settings panel
- NurturingRow
- RecordPage banner strip:
- email_2/email_3 on Contact, enrichment_opt_in on Pod, clickable website links, status badge, no-pod hygiene signal, and toolbar WYSIWYG export with copy-to-clipboard across 9 files

---

## v2.0 Kinship Brain MVP (In Progress)

**Goal:** Ship a usable V1 that supports Kinship's real workflows — organizing relationships, maintaining them, running pipelines + projects, pulling reports, and sharing lists.

**Source of Truth:** docs/Kinship Brain — MVP.pdf (Mar 28)

**Phases completed:** 4 of 10 (Phases 10-13)

- Phase 10: Data Architecture Rebuild (2 plans)
- Phase 11: Relationship Records (3 plans)
- Phase 12: Pods Overhaul + Categorization (4 plans)
- Phase 13: Timeline + Records List (3 plans)

**Phases remaining:** 6 (Phases 14-19)

- Phase 14: Pipelines (Kanban boards)
- Phase 15: Projects (initiative containers)
- Phase 16: Basic Enrichment
- Phase 17: Reporting + Exports
- Phase 18: Nurturing + Dashboard
- Phase 19: Sharing + Polish

**Key accomplishments so far:**

- Relationship-first Airtable schema with Pipelines, Opportunities, Projects, PipelineStages tables
- Record detail pages with per-type field layouts (Person vs Company), custom fields, company-contact linking
- Pods as behavioral containers with unlimited sub-pods, categorization tray, pod detail pages
- Unified activity timeline with system events, filterable records list with bulk actions, CSV export

---

## v1.2 Demo Ready (Shipped: 2026-03-29)

**Phases completed:** 3 phases, 6 plans, 11 tasks

**Key accomplishments:**

- 25 contacts and 45 interactions imported into Airtable across 6 pods with full field data including LinkedIn, Country, Gender, Intel/Notes, Fund tags, and follow-up fields
- 15 new Contact fields + 4 Interaction fields with Airtable mappers and enriched demo data for V1 schema
- Recent Activity feed, merged birthdays+follow-ups Upcoming section, and per-contact frequency in overdue queue
- Enriched ContactDetail panel with 4 organized sections (Contact Info, Relationship, Fund Tags, Follow-Up) and interaction timeline with source labels and summaries
- Add Contact modal with structured form (name/email/pod validation) and brain dump path (free text to Unsorted), triggered by dashboard FAB

---

## v1.1 Polish & Features (Shipped: 2026-03-25)

**Phases completed:** 3 phases, 5 plans, 10 tasks

**Key accomplishments:**

- Linear/Spotlight-style command palette for instant contact search by name, company, or role — accessible via Cmd+K or nav icon from any view
- Birthday utility (getUpcomingBirthdays) + Dashboard "Coming Up" section showing contacts with birthdays in the next 14 days
- Rotating gradient insight card showing weekly people reached, top pod, and most connected contact with Fraunces display type and pod-colored backgrounds
- One-liner:
- Campaign detail panel with status toggle cycle, inline creation form, and add-to-campaign from ContactDetail — full campaign lifecycle UI

---

## v1.0 Kinship Brain MVP (Shipped: 2026-03-23)

**Phases completed:** 4 phases, 14 plans, 23 tasks

**Key accomplishments:**

- Birthday countdown, milestones, interests, and relationship context added to ContactDetail with Airtable read/write support
- Import script deduplicates on name OR email (case-insensitive exact match) — no duplicate contacts on re-import even when email is absent.
- Segmented equity ring with per-type colored arcs and score/label display added to contact profiles
- CSS design token foundation via Tailwind v4 @theme, Playfair Display + Plus Jakarta Sans fonts, and full glass-to-solid orb system migration with white labels and dark 136px hub
- Green header band on dashboard with white equity ring, full inline-style-to-token migration across all surfaces, green nav pill, clean background, serif headings, and Trolley-aligned design system docs
- Fraunces font swap, dark mode CSS token overrides, interaction color tokens, focus ring, and dormancy label copy — foundation for all subsequent design plans
- Two-tone diagonal gradient orbs with per-pod colored glow halos (hover-reactive) and optional SVG health ring arc
- orbit-slide animation flies pod orbs from hub center to orbital positions using CSS var translate offsets, with dashed concentric orbit rings (r=200/310/420) as a viewport-tracked SVG overlay
- Mini orb pod cards with two-tone gradients and pod-colored hover shadows, plus semantic type colors throughout the interaction timeline
- Task 1 — Responsive nav (App.tsx):
- One-liner:
- Inline SVG sparklines in pod cards showing 30-day interaction trend, plus skeleton shimmer replacing all dashboard loading spinners
- Browser-based CSV import at /import with drag-and-drop, dedup index, pod selector, progress bar, and inline results — Briell can import contacts without terminal access
- 312-line operational handoff covering app usage, Airtable field conventions, import workflow, known issues, and plain-language backlog for Briell and Moj

---
