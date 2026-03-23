# Milestones

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
