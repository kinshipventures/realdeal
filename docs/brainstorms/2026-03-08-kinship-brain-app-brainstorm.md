---
date: 2026-03-08
topic: kinship-brain-app
---

# Kinship Brain App

## What We're Building

A relationship intelligence OS for Moj Mahdara (CEO, Kinship Ventures). Not a CRM — a living network map that reflects how Moj actually thinks about her relationships. The primary interface is a visual, interactive orb/node map where each "list" (MAPS, LPs, Talent, Service Providers, etc.) is a node that expands into subcategories, and contacts live inside those categories.

The app is a single-user tool (Moj only, for now). It starts with CSV data import and is architected to support Airtable integration later. The SOW's Kinship Brain Context section defines the acceptance criteria.

## Acceptance Criteria (from SOW)

- Single source of truth for founders, investors, partners, talent, and companies
- Track relationship history, opportunities, projects, and communications in one place
- Surface follow-ups, milestones, and relationship signals so key connections are actively maintained
- Support relationship marketing, introductions, fundraising pipelines, partnerships, and ecosystem building
- Visualize how people, companies, and opportunities connect across the Kinship ecosystem

## Why This Approach

### Approach A: Visual-first (orb map as primary UI) — CHOSEN

The map IS the app. Moj navigates by clicking into network nodes, drilling down from list → category → contacts. This mirrors her mental model exactly (the MAPS methodology is inherently visual — circles, categories, connections). Interactive, draggable nodes give her a sense of ownership over her network layout.

**Pros:**
- Matches how Moj actually thinks
- MAPS methodology is already orb-based — zero translation cost
- Visually distinctive, not generic
- Encourages engagement (it's alive, not a spreadsheet)

**Cons:**
- More complex to build than a table/list UI
- Graph libraries add technical weight

**Best when:** The user's mental model is relational and spatial, not tabular. This is that.

---

### Approach B: List-first with map as secondary view

Standard contact list with filtering/search as the primary interface. Network map is a "visualization" tab.

**Pros:** Simpler to build, familiar UX pattern
**Cons:** Doesn't reflect how Moj thinks. Feels like every other CRM.

---

### Approach C: Hybrid — split view

Left: orb map. Right: contact detail/list panel. Inspired by the Lovable prototype.

**Pros:** Both modalities available simultaneously
**Cons:** Cramped on smaller screens, loses the visual impact of the map

---

## Key Decisions

- **Visual-first**: Orb map is the primary navigation, not a secondary feature
- **Library**: React Flow for draggable node-based UI (handles complex graph interactions well)
- **Single user**: No auth/permissions complexity in MVP
- **Data seeding**: CSV import (Service Providers CSV as first test dataset)
- **No external integrations in MVP**: Airtable connection planned but deferred
- **Stack**: TypeScript + React, Supabase, Tailwind
- **Interaction model**: Click list node → expand to categories → click category → see contacts in side panel or drill-down view

## Data Model (high level)

```
contacts
  - id, name, email, phone, company, role
  - location, website, notes
  - recommended_by, specialization, past_clients (from CSV)
  - created_at, updated_at

lists
  - id, name, color, owner (moj_mahdara | kinship_ventures)

categories
  - id, list_id, name, color

list_memberships
  - contact_id, list_id, category_id (nullable), added_at

interactions
  - id, contact_id, type (call | email | meeting | intro | event | note)
  - date, notes
  - created_at
```

## MVP Feature Scope

**Must have:**
- Interactive orb map (lists as nodes, expandable to categories)
- Contact detail view (all fields + interaction history)
- Add/edit contact
- Log interaction (quick-add)
- "Last contacted" + follow-up signal on contact cards
- CSV import (Service Providers as seed data)

**Defer:**
- Airtable sync
- Network graph showing connections between contacts
- Follow-up cadence automation
- Multi-user / permissions
- Mobile

## Resolved Decisions

- **Node layout**: Drag-to-reposition, positions persist to DB. Moj owns her map layout.
- **Follow-up threshold**: 30 days for MAPS contacts. Other lists TBD (can be configured later).

## Open Questions

- Are "companies" their own entity or just a field on a contact?

## Next Steps

→ `/workflows:plan` for implementation details
