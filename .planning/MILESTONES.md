# Milestones

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
