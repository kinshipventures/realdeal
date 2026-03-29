# Requirements: Kinship Brain

**Defined:** 2026-03-29
**Core Value:** One place where every relationship lives with full context — so founders never lose track of who matters, what happened, or what's next.
**Source:** docs/Kinship Brain — Initial Outline (Lovable).pdf

## v2.0 Requirements

Requirements for the Kinship Brain rebuild. Each maps to roadmap phases.

### Core Architecture

- [ ] **ARCH-01**: Relationship record is the only core object — a single unified "Relationship Record" (person or company)
- [ ] **ARCH-02**: Pipelines, projects, and campaigns reference relationships via linked records (no copying, no new instances)
- [ ] **ARCH-03**: No duplicate or shadow records created anywhere in the system
- [ ] **ARCH-04**: Every record acts as the canonical hub for all its associations (pods, pipelines, projects, companies/people, emails, meetings)

### Relationship Records

- [ ] **REC-01**: User can create a Contact (person) record with fields: name, email, phone, role/title, company affiliation
- [ ] **REC-02**: User can create a Company (organization) record with fields: name, industry, stage, listed status, ticker, domain
- [ ] **REC-03**: Record type controls available fields, required fields, and UI behavior
- [ ] **REC-04**: User can associate contacts with companies (and vice versa) via linked records
- [ ] **REC-05**: Each record shows in one place: all pods, timeline of interactions/updates, linked pipelines/investments, linked projects, linked companies/people, important dates, and custom fields
- [ ] **REC-06**: Record layout includes central timeline + side/top widgets (data highlights, recent activity, relationship health, pod-based context)
- [ ] **REC-07**: Fields are type-specific (Contact vs Company) AND pod-aware (certain fields appear only when relevant pods are present)
- [ ] **REC-08**: Fields are conditional — only show if relevant for that record type + pod combination
- [ ] **REC-09**: Fields are grouped by pod in the record view (e.g., LP fields grouped together)

### Records List & Bulk Actions

- [ ] **LIST-01**: User can view a Records List with filters: pod/subpod, record type, activity recency, investment status, sector, geography, any field
- [ ] **LIST-02**: User can select multiple records and perform bulk actions: add to projects, add to pipelines, bulk update fields, bulk export
- [ ] **LIST-03**: User can save filter configurations for reuse

### Incoming Contact Categorization

- [ ] **CAT-01**: All unsorted contacts appear in a Pending Categorization tray before entering the CRM
- [ ] **CAT-02**: Pending records can come from: manual entry, email parsing, CSV import, meeting note-taker summaries
- [ ] **CAT-03**: Categorization modal allows user to: select one or more pods, complete pod-specific required questions, add contextual notes, assign primary pod
- [ ] **CAT-04**: A record cannot be added to a pod until required questions for that pod are answered
- [ ] **CAT-05**: Save moves the record from Pending into the CRM
- [ ] **CAT-06**: Every categorization action (who, what pods, what fields) is saved to the record timeline

### Relationship Creation

- [ ] **CRE-01**: User can create a single relationship manually with required fields enforced
- [ ] **CRE-02**: User can create multiple relationships at once
- [ ] **CRE-03**: User can bulk import relationships via CSV with required field enforcement
- [ ] **CRE-04**: No partial or invalid records allowed into the system

### Custom Fields

- [ ] **FLD-01**: User can create custom fields on relationship records
- [ ] **FLD-02**: Fields can be assigned by record type (Contact vs Company)
- [ ] **FLD-03**: Fields can be assigned by pod (appear only when that pod is present)
- [ ] **FLD-04**: User can mark fields as required or optional
- [ ] **FLD-05**: Pod "questions" are structured fields — answers live on the record, visible in pod-specific sections, usable by AI later
- [ ] **FLD-06**: Fields are reusable for filtering and reporting

### Relationship Timeline

- [ ] **TL-01**: Each relationship has one chronological timeline showing all activity
- [ ] **TL-02**: Timeline logs: emails, meetings, notes, projects, pipelines, news alerts, pod changes, categorization actions, field updates
- [ ] **TL-03**: Each timeline entry includes source (email, meeting, user, AI, system), timestamp, and actor
- [ ] **TL-04**: Nothing changes on a relationship without being visible in the timeline
- [ ] **TL-05**: Pipeline events (stage changes, notes, status updates, archived) sync to the relationship timeline
- [ ] **TL-06**: Timeline supports filtering to manage signal vs noise

### Pods

- [ ] **POD-01**: User can create unlimited pods to organize relationships (e.g., Maps, LPs, Talent, Service Providers)
- [ ] **POD-02**: User can customize each pod with name, color, and description
- [ ] **POD-03**: Pods support unlimited sub-pods (e.g., Maps → Music / Tech / Fashion)
- [ ] **POD-04**: Relationships can belong to multiple pods with one marked as Primary
- [ ] **POD-05**: Each pod defines required questions that must be answered during categorization
- [ ] **POD-06**: Pods drive: required fields, follow-up cadence/sequencing, inclusion in external lists
- [ ] **POD-07**: Capacity-limited pods supported (e.g., Maps limited to ~150 to force curation)
- [ ] **POD-08**: System supports workflows for "managing people up or out" of capacity-limited pods
- [ ] **POD-09**: Individual records can override pod-level cadence
- [ ] **POD-10**: Pod bubbles UI is fixed and scalable for large pod systems

### Pipelines

- [ ] **PIPE-01**: User can create unlimited pipelines (LP fundraising, deal flow, talent outreach, partnerships)
- [ ] **PIPE-02**: Each pipeline has customizable stages (name + color) displayed as Kanban board
- [ ] **PIPE-03**: Pipeline cards are "Relationship Opportunities" — linked to one or more relationship records
- [ ] **PIPE-04**: Each opportunity card has its own fields: notes, stage, priority, status
- [ ] **PIPE-05**: Cards show project/investment name in pipeline view, linked back to person/company in record view
- [ ] **PIPE-06**: All pipeline changes (stage, notes, status, archive) sync to the relationship record timeline
- [ ] **PIPE-07**: User can hide pipelines without deleting them (hidden pipelines maintain record connections)
- [ ] **PIPE-08**: User can open full relationship record from any pipeline card
- [ ] **PIPE-09**: User can see and navigate to all pipeline associations from a relationship record

### Projects

- [ ] **PROJ-01**: User can create projects to organize multi-record initiatives (podcast outreach, philanthropy campaigns, SPV outreach, events)
- [ ] **PROJ-02**: Each project has: name, description, owner, associated records, associated opportunities, notes/updates
- [ ] **PROJ-03**: Projects are distinct from pipelines — projects focus on context/scope/collection, pipelines focus on stages/movement
- [ ] **PROJ-04**: User can attach records and opportunities to projects
- [ ] **PROJ-05**: Projects are visible from the relationship record view
- [ ] **PROJ-06**: Project has a simple overview page

### Dashboard

- [ ] **DASH-01**: Modular dashboard with configurable widgets: total records, pod totals, pending categorizations, recently updated records, quick links to pipelines/projects/nurturing hub
- [ ] **DASH-02**: User can show/hide widgets and reorder them
- [ ] **DASH-03**: User can create multiple dashboard views (personal vs workspace default)
- [ ] **DASH-04**: Dashboard surfaces pending follow-ups and stale relationships
- [ ] **DASH-05**: Dashboard shows important dates (birthdays, anniversaries, key dates)
- [ ] **DASH-06**: Dashboard is the primary operating surface — founders live here

### Nurturing & Maintenance Hub

- [ ] **NURT-01**: Dedicated view showing important dates and milestones (birthdays, anniversaries, fund join dates, key deal events, custom dates)
- [ ] **NURT-02**: Surfaces stale relationships ("No interaction for 90 days", "No update since last meeting")
- [ ] **NURT-03**: Maintenance queue for capacity-limited pods — contacts that may need to be "managed up" or "managed out"
- [ ] **NURT-04**: Surfaces contacts missing essential context or pod-required fields
- [ ] **NURT-05**: Basic suggestions: "These people have milestones this week", "These records haven't had any interaction lately"
- [ ] **NURT-06**: All nurturing signals visible in the hub AND surfaced across dashboard widgets, record-level alerts, and pipeline/project views

### Navigation

- [ ] **NAV-01**: User can open full relationship record from any pipeline card, project, or campaign
- [ ] **NAV-02**: User can open pipeline/project/campaign detail from a relationship record's associations
- [ ] **NAV-03**: All navigation preserves context (slide-out panels, no full page reloads)
- [ ] **NAV-04**: Zero context loss when moving between modules

## v2.1+ Requirements (Deferred)

### Workspaces & Teams

- **WS-01**: User can create a workspace or join an existing one
- **WS-02**: All data lives inside a workspace — team members share records, pods, pipelines, dashboards
- **WS-03**: Support Kinship "home" workspace + team/partner workspaces
- **WS-04**: Share curated lists with people outside the system
- **WS-05**: Create list templates (e.g., "LP relationship template", "Vendor perks template")
- **WS-06**: Community-style data contribution model (external users contribute enrichment)

### Permissions & Access Control

- **PERM-01**: Admin/Editor/Viewer role types
- **PERM-02**: Pod-level, pipeline-level, project-level, and record-level permissions
- **PERM-03**: Selective sharing of pods/pipelines with individuals or teams
- **PERM-04**: Private-universe workspaces for sensitive relationships

### Data Enrichment

- **ENRICH-01**: News & press signals (company raises, launches, press mentions, founder activity)
- **ENRICH-02**: Email metadata ingestion (last interaction, direction, subject preview)
- **ENRICH-03**: AI note-taker meeting summary import (synced to timeline, editable)
- **ENRICH-04**: Automatic detection of new contacts from email/meetings
- **ENRICH-05**: Every enrichment update writes to timeline and surfaces in nurturing

### Deep Integrations

- **INT-01**: ClickUp/Notion/Asana — push follow-ups, sync tasks, log CRM activity
- **INT-02**: Social/monitoring tools (Perplexity, Google Alerts) — news signals to timeline
- **INT-03**: Email/shared inbox (Gmail, Outlook, Front) — basic signals + calendar
- **INT-04**: When notable events happen externally, surface as relationship signals

### Gmail Chrome Extension

- **GMAIL-01**: User can create or attach relationship directly from Gmail
- **GMAIL-02**: Extension matches email address to existing relationship
- **GMAIL-03**: User can assign pod + required fields immediately from extension

### AI Copilot

- **COP-01**: Read-only synthesis layer — meeting briefs, relationship summaries
- **COP-02**: Uses only existing data, never invents, signals uncertainty

### Lovable Mini App Spin-Offs

- **MINI-01**: Non-technical users can build micro apps on top of Kinship Brain data
- **MINI-02**: Mini apps query records, pods, pipelines, projects via API
- **MINI-03**: Mini apps write back notes, status changes, tags, timeline events

### Advanced Features

- **ADV-01**: Pipeline relationship recommendations (suggest people based on thesis, pod metadata, past interactions)
- **ADV-02**: Brain View vs Feed View vs Maintenance View toggle
- **ADV-03**: Voice-to-text for context capture
- **ADV-04**: Scheduled reports
- **ADV-05**: Auto-suggest pipeline updates and follow-ups (AI Intelligence Layer)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile app | Works in mobile browser; native app deferred |
| Real authentication | Acceptable risk — private URL, small team (until Workspaces) |
| Backend server | All computation client-side via Airtable REST |
| Toast (Telegram bot) | Separate project, separate repo |
| ClickUp deal pipeline | Stays in ClickUp per current decision |
| WhatsApp/push notifications | Future — requires backend |
| Full RBAC permissions | Deferred until Workspaces & Teams |
| Lovable platform integration | Building standalone, not inside Lovable |

## Traceability

Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|

**Coverage:**
- v2.0 requirements: 68 total
- Mapped to phases: 0
- Unmapped: 68

---
*Requirements defined: 2026-03-29*
*Last updated: 2026-03-29 after source PDF corrected to Initial Outline*
