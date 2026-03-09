---
title: "feat: Kinship Brain — Visual Relationship Management App"
type: feat
date: 2026-03-08
---

# Kinship Brain — Visual Relationship Management App

## Overview

Build a visual-first relationship intelligence OS for Moj Mahdara. The primary interface is an interactive orb/node map (React Flow) where lists expand into categories, and categories reveal contacts. Not a CRM — a living network map that reflects how Moj thinks.

**Acceptance criteria locked to SOW Kinship Brain goals:**

- [ ] Single source of truth for contacts across founders, investors, partners, talent, and companies
- [ ] Track relationship history (interactions) in one place per contact
- [ ] Surface follow-up signals so key relationships (MAPS) are actively maintained
- [ ] Visual network map showing how people and opportunities connect across the Kinship ecosystem
- [ ] CSV import to bootstrap existing contact data

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Vite + React 19 + TypeScript | No SSR needed; single-user app; simpler than Next.js |
| Styling | Tailwind v4 | Fast, consistent spacing (8pt grid) |
| Graph UI | React Flow v12 | Draggable nodes, position persistence, good TS support |
| Routing | React Router v7 | Client-side routing for `/contacts/:id` |
| Backend | Supabase | Postgres DB + auto-generated API; Airtable integration deferred |
| Package mgr | pnpm | Faster, preferred |

---

## Phases

---

### Phase 1 — Project Scaffold

**Files to create:**

```
kinshipbrain/
  package.json
  vite.config.ts
  tsconfig.json
  tailwind.config.ts
  index.html
  src/
    main.tsx
    App.tsx
    lib/
      supabase.ts      # Supabase client
      types.ts         # All shared TS types
    styles/
      globals.css
```

**Env setup** (`.env.local`):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

**Acceptance criteria:**
- [ ] `pnpm dev` runs without error
- [ ] Supabase client connects (env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [ ] Tailwind styles apply
- [ ] React Flow renders a test node

---

### Phase 2 — Supabase Schema + Seed Data

#### Schema

```sql
-- Lists (MAPS, LPs, Talent & Influencers, Service Providers, Companies, General)
create table lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text,
  owner text,            -- 'moj_mahdara' | 'kinship_ventures'
  is_priority boolean default false,  -- true for MAPS (drives 30-day follow-up signal)
  created_at timestamptz default now()
);

-- Categories within a list (e.g., MAPS → Art, Music, Silicon Valley/Tech)
create table categories (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references lists(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz default now()
);

-- Contacts
create table contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  company text,
  role text,
  location text,
  website text,
  notes text,
  recommended_by text,     -- free text (v1); contact reference deferred
  specialization text,
  past_clients text,
  last_contacted_at timestamptz,  -- updated by interaction logging (not notes)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Many-to-many: contact ↔ list/category
create table list_memberships (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade,
  list_id uuid references lists(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,  -- nullable
  added_at timestamptz default now(),
  unique(contact_id, list_id, category_id)
);

-- Interaction history
create table interactions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade,
  type text not null check (type in ('call','email','meeting','intro','event','note')),
  date timestamptz not null default now(),  -- user-editable (can backdate)
  notes text,
  created_at timestamptz default now()
);

-- Persisted node positions (orb map layout)
create table node_positions (
  id uuid primary key default gen_random_uuid(),
  node_id text not null,       -- references list.id or category.id
  node_type text not null check (node_type in ('list','category')),
  x float not null,
  y float not null,
  updated_at timestamptz default now(),
  unique(node_id, node_type)
);
```

**Indexes:**
```sql
create index idx_list_memberships_list_id on list_memberships(list_id);
create index idx_list_memberships_contact_id on list_memberships(contact_id);
create index idx_interactions_contact_id on interactions(contact_id);
create index idx_interactions_date on interactions(date desc nulls last);
create index idx_contacts_last_contacted on contacts(last_contacted_at desc nulls last);
```

#### Seed: Lists + Categories

Hardcoded migration to create Moj's lists and categories based on the Trolley CRM doc:

```sql
-- Lists
insert into lists (name, color, owner, is_priority) values
  ('MAPS', '#E53E3E', 'moj_mahdara', true),
  ('MAPS Lite', '#ED8936', 'moj_mahdara', false),
  ('Talent & Influencers', '#38B2AC', 'moj_mahdara', false),
  ('MM Professionals & Resources', '#805AD5', 'moj_mahdara', false),
  ('Family & Friends', '#D69E2E', 'moj_mahdara', false),
  ('General', '#718096', 'moj_mahdara', false),
  ('Services for Founders', '#48BB78', 'moj_mahdara', false),
  ('LPs', '#F6AD55', 'kinship_ventures', false),
  ('Pipeline', '#68D391', 'kinship_ventures', false),
  ('SPV', '#63B3ED', 'kinship_ventures', false),
  ('Companies', '#FC8181', 'kinship_ventures', false);

-- MAPS categories
insert into categories (list_id, name) select id, unnest(array[
  'Art', 'Music', 'VCS / Investment Exec', 'Hospitality',
  'Silicon Valley / Tech', 'Philanthropy', 'Beauty', 'Fashion',
  'Family & Friends'
]) from lists where name = 'MAPS';

-- Talent categories
insert into categories (list_id, name) select id, unnest(array[
  'Celebrities', 'Musicians', 'Athletes', 'Execs / Thought Leaders',
  'Micro (5-20k)', 'Pro/MUA/Industry', 'Fashion', 'Beauty Editors',
  'DJs', 'Models', 'Fitness', 'Music', 'Latinx', 'Asian',
  'Natural Hair', 'African American'
]) from lists where name = 'Talent & Influencers';

-- LP categories
insert into categories (list_id, name) select id, unnest(array[
  'LP ABG', 'LP Internal', 'LP PR', 'Existing SPVs'
]) from lists where name = 'LPs';

-- Service Provider categories (from Service Providers CSV)
insert into categories (list_id, name) select id, unnest(array[
  'Web Development & Design', 'Branding', 'PR', 'Marketing',
  'Legal', 'Finance', 'HR + Benefits', 'Recruiting',
  'Executive Coaching', 'SEO', 'Design', 'Copywriting'
]) from lists where name = 'Services for Founders';
```

#### CSV Import Script

**Service Providers CSV column mapping (hardcoded):**

| CSV Column | DB Field |
|---|---|
| Agency | name |
| Contact name | notes (prepended as "Contact: [name]") |
| Category | → category lookup |
| Contact Info | phone |
| Website | website |
| Email | email |
| Location | location |
| Specialization | specialization |
| Past Clients | past_clients |
| Recommended by | recommended_by |
| Notes | notes |

**Implementation:** `src/lib/importServiceProviders.ts` — Node script, run once with `pnpm run seed`.

```
src/
  scripts/
    importServiceProviders.ts
```

**Acceptance criteria:**
- [ ] Schema migrations run cleanly (`supabase db push`)
- [ ] All lists and categories seeded
- [ ] Service Providers CSV imports without errors
- [ ] Imported contacts appear in correct categories

---

### Phase 3 — Orb Map (Core UI)

The map is the app's home screen and primary navigation. Built with React Flow.

**Interaction model:**
1. App loads → full-screen orb map showing all list nodes
2. Click a list node → **existing list nodes fade/shrink, category nodes for that list animate in** (same canvas, no page change). A breadcrumb shows: Home > [List Name].
3. Click a category node → contact panel slides in from the right (map stays visible behind it)
4. Drag any node → position saves to `node_positions` on drag end (not on every move)
5. Breadcrumb "Home" → animate back to all list nodes

**Files:**

```
src/
  components/
    map/
      OrbMap.tsx           # React Flow canvas, loads list nodes
      ListNode.tsx         # Custom node: list orb (colored circle + label)
      CategoryNode.tsx     # Custom node: category orb
      useNodePositions.ts  # Hook: load/save positions from Supabase
    contacts/
      ContactPanel.tsx     # Side drawer: contact list for selected category
      ContactCard.tsx      # Row inside the panel
```

**Node visual spec:**

```
ListNode:
  - Colored circle, 80px diameter
  - List name centered (bold, white)
  - If is_priority=true and any contacts need follow-up: red ring pulse

CategoryNode:
  - Colored circle, 56px diameter
  - Category name (smaller)
  - Lines connecting to parent list node
```

**Position persistence:**
- Load: `select * from node_positions` on mount
- Save: `upsert node_positions` on React Flow `onNodeDragStop`
- Default layout: React Flow + `@dagrejs/dagre` auto-layout for first load (before any positions saved). Note: dagre is not bundled in React Flow v12 — install separately.

**Acceptance criteria:**
- [ ] All lists render as orb nodes on home screen
- [ ] Clicking a list expands to show category nodes
- [ ] Clicking a category opens contact panel
- [ ] Dragging a node and refreshing preserves position
- [ ] Lines connect category nodes to their parent list node
- [ ] Follow-up indicator shows on MAPS node when contacts are overdue

---

### Phase 4 — Contact Management

**Contact detail view** — full-screen route `/contacts/:id`

```
src/
  components/
    contacts/
      ContactDetail.tsx    # Full contact view (fields + interaction history)
      ContactForm.tsx      # Add / edit form
      InteractionList.tsx  # Timeline of logged interactions
```

**Contact fields (in form):**
Name*, Email, Phone, Company, Role, Location, Website, Specialization, Past Clients, Recommended By, Notes, List + Category assignment*

**Contact panel behavior:**
- Shows all contacts in the selected category
- Search input at top (filters within panel)
- Each row: name, company, last contacted badge, follow-up flag
- "Add contact" button at bottom
- Click contact → opens ContactDetail

**Delete behavior:**
- Hard delete with confirmation modal
- Cascade deletes interactions and list_memberships (FK on delete cascade)

**Acceptance criteria:**
- [ ] Add contact with required list/category assignment
- [ ] Edit any contact field
- [ ] Delete contact with confirmation (no orphaned records)
- [ ] Contact detail shows all fields + full interaction history
- [ ] Contact shows all lists it belongs to (in detail view)
- [ ] Search filters contacts within panel

---

### Phase 5 — Interaction Logging + Follow-up Signals

**Log interaction:**
- Quick-add button on contact detail header
- Form: type selector (call / email / meeting / intro / event / note), date (defaults to today, editable), notes
- On submit: insert to `interactions`, update `last_contacted_at` on contact **if type ≠ note**
- Interactions can be edited and deleted from the timeline

**Follow-up signal logic:**
- MAPS contacts only (`is_priority = true` on their list)
- Flag fires when `last_contacted_at < now() - interval '30 days'` OR `last_contacted_at IS NULL`
- Signal shows: red indicator on MAPS list node, orange badge on contact row in panel

```
src/
  lib/
    followUp.ts    # getOverdueContacts(listId): queries + computes overdue state
```

**Acceptance criteria:**
- [ ] Logging a call/email/meeting/intro/event updates `last_contacted_at`
- [ ] Logging a note does NOT update `last_contacted_at`
- [ ] MAPS contacts not contacted in 30+ days show a follow-up indicator
- [ ] New MAPS contacts with no interactions immediately show follow-up indicator
- [ ] Indicator appears on the map node AND the contact row
- [ ] Interactions can be edited and deleted

---

## Design Defaults (SpecFlow resolutions)

These were identified as gaps and resolved with defaults — no new scope:

| Decision | Default |
|---|---|
| Orphaned contacts | Not allowed — list required on add |
| `recommended_by` | Free text (contact reference deferred) |
| Follow-up: which types update `last_contacted_at` | All except `note` |
| MAPS identification | `is_priority` boolean on `lists` |
| Contact panel layout | Side drawer, map stays visible |
| Delete type | Hard delete + confirmation |
| Edit interactions | Supported |
| Backdate interactions | Yes, date field user-editable |
| Null `last_contacted_at` | Treated as never contacted, signal fires |
| CSV re-import | Upsert on email |
| Default node layout | `@dagrejs/dagre` auto-layout before positions saved |
| Search | Panel-level only (within selected category) |

---

## Dependencies & Risks

| Risk | Mitigation |
|---|---|
| React Flow bundle weight (~180KB raw) | Lazy load the map component |
| Node position state gets stale | Debounce saves; only save on `onNodeDragStop` |
| CSV import creates duplicates | Upsert on email; log skipped rows |
| `last_contacted_at` drift on delete | On interaction delete, re-query `max(date) from interactions where contact_id = ? and type != 'note'` and update contact. Application-level, not a DB trigger. |

---

## References

- Brainstorm: `docs/brainstorms/2026-03-08-kinship-brain-app-brainstorm.md`
- Service Providers CSV: `~/Downloads/Service Providers - Sheet1 (1).csv`
- React Flow docs: https://reactflow.dev
- Trolley CRM reference: `2026 Trolley CRM.pdf`
