# Phase 1: Contact Profiles - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Enriched contact profiles with birthday, milestones, interests, and relationship context fields. Per-contact equity score with visual breakdown. Import dedup logic for clean re-imports. New Airtable fields follow Briell's conventions and are editable in Airtable directly.

</domain>

<decisions>
## Implementation Decisions

### Profile field organization
- **D-01:** New personal fields (birthday, milestones, interests, relationship context) go in a NEW "personal" section, separate from the existing "context" section
- **D-02:** "context" stays professional (specialization, past clients, recommended by). "personal" is the relationship layer — this is what drives social equity and separates the app from a generic CRM
- **D-03:** Section order: contact → context → personal → notes → interactions
- **D-04:** All new text fields (milestones, interests, relationship context) are freeform textarea — same pattern as existing notes/past-clients fields. Compatible with Briell editing directly in Airtable.

### Birthday countdown
- **D-05:** Birthday field is a date input. When birthday is within 30 days, an inline "in X days" label appears next to the date. Subtle, informational nudge — not an alert.
- **D-06:** Claude's discretion on exact countdown format and placement within the personal section

### Equity score display on profile
- **D-07:** Per-contact equity score shown as a segmented/stacked ring — same visual language as the Dashboard EquityRing but broken down by interaction type
- **D-08:** Each interaction type gets its own color segment. Arc length reflects actual weighted contribution (intros take more arc than texts because they're weighted 5x vs 2x)
- **D-09:** Score number and label (e.g. "72 · Healthy") displayed alongside the ring
- **D-10:** Visual approach chosen because Moj prioritizes bold, expressive design — plain numbers don't match the Oura ring / Spotify Wrapped energy
- **D-11:** Ship with current weights (intro=5, meeting=4, call=3, text=2, email=2, note=0). Easy to tune later — one constant object. Don't block on Moj feedback.

### Import dedup
- **D-12:** Handle dedup behavior as it comes — match on name + email, specific collision behavior (skip vs update) decided when real CSVs arrive from Briell
- **D-13:** Script should be ready to run but doesn't need speculative architecture

### Data dependency strategy
- **D-14:** Build UI and Airtable field mappings that work with existing data. Empty fields show placeholders that light up when Briell populates them in Airtable
- **D-15:** No dummy data systems or speculative integrations. Plug-and-play when real data arrives.

### Claude's Discretion
- Birthday countdown wording and threshold edge cases
- Stacked ring color palette per interaction type
- Interaction type legend/labels around the ring
- Loading and empty states for new sections
- Score label color tint per state (Thriving/Healthy/Cooling/Dormant) — stays within glass/neutral palette
- Import script: exact matching strategy for name+email (case sensitivity, fuzzy vs exact)
- New Airtable field naming (must follow Briell's conventions — Title Case with spaces)

</decisions>

<specifics>
## Specific Ideas

- Moj wants the app to feel like an "Oura ring for relationships" — the stacked ring on profiles extends that metaphor to individual contacts
- "Make everything bolder" — new profile sections should lean toward the Trolley CRM visual direction
- The professional/personal section split reinforces that this isn't a CRM — the personal layer is what Moj's social equity philosophy is built on (giving > taking, micro-habits of care)
- Score should feel like a health indicator, not a judgment — "Healthy · 72" not "Score: 72/100"
- Birthday countdown is informational nudge — "in 12 days" in tertiary text

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product context
- `docs/context-map.md` — Full synthesis of 8 Granola meeting transcripts. Source of truth for Moj's vision, priorities, and design direction.

### Design system
- `docs/design-system.md` — Token set, typography, spacing, glass orb rules, motion curves

### Existing profile implementation
- `src/components/contacts/ContactDetail.tsx` — Current click-to-edit profile with auto-save, `field()` renderer, generation counter conflict prevention
- `src/components/contacts/InteractionSection.tsx` — Interaction timeline already on profile

### Equity scoring
- `src/lib/equity.ts` — `contactEquityScore()`, `INTERACTION_WEIGHTS`, `indexByContact()`, `scoreLabel()`. Ring needs a companion function that returns per-type breakdown.
- `src/components/dashboard/Dashboard.tsx` — `EquityRing` component (SVG arc). Stacked ring extends this pattern with per-type segments.

### Data layer
- `src/lib/airtable.ts` — `ContactFields` interface, `updateContact()`, cache invalidation. New fields added here.
- `src/lib/types.ts` — `Contact` interface needs `birthday`, `milestones`, `interests`, `relationship_context` fields
- `src/scripts/importServiceProviders.ts` — Current import script pattern. Dedup logic adds here.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ContactDetail.field()` renderer — handles click-to-edit, auto-save on blur, escape revert. New text fields plug in directly.
- `EquityRing` in Dashboard.tsx — SVG arc with gradient. Stacked ring variant needs per-type arc segments instead of single arc.
- `contactEquityScore()` in equity.ts — returns single 0-100 number. Needs companion function returning per-type weighted contributions for ring segments.
- `INTERACTION_WEIGHTS` — defines weight per type. Ring segment proportions derived from these.

### Established Patterns
- Auto-save on blur with generation counter (prevents stale overwrites)
- Escape stack for layered panel dismissal
- Section labels: lowercase, 11px, `rgba(0,0,0,0.25)`, `letterSpacing: 0.01em`
- Airtable field naming: Title Case with spaces (e.g. "Past Clients", "Recommended By")

### Integration Points
- `Contact` type in types.ts — add `birthday`, `milestones`, `interests`, `relationship_context`
- `ContactFields` interface in airtable.ts — add matching Airtable field names
- `mapContact()` in airtable.ts — map new fields
- `updateContact()` — already handles partial updates, new fields work automatically
- InteractionSection already loads per-contact interactions — score breakdown can reuse this data

</code_context>

<deferred>
## Deferred Ideas

- Gmail integration for cross-channel contact timeline — blocked on credentials, separate phase
- AI enrichment from social/email/messages — future
- Birthday surfacing on Dashboard (not just profile) — could enhance todaysFocus() later but not Phase 1 scope
- Structured tags for interests (comma-separated pills) — revisit if freeform feels limiting after real use

</deferred>

---

*Phase: 01-contact-profiles*
*Context gathered: 2026-03-22*
