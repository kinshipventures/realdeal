# Phase 1: Contact Profiles - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Opening a contact shows enriched context — milestones, interests, relationship history, birthday countdown, and their equity score. Import script has dedup logic for clean data. This phase adds new Airtable fields, wires them into the existing ContactDetail panel, surfaces the equity score per-contact, and hardens the import script.

</domain>

<decisions>
## Implementation Decisions

### Profile layout
- **D-01:** Equity score + label (e.g. "Healthy · 72") in the header area, below name/role, always visible. Small and understated.
- **D-02:** Birthday, milestones, interests, and relationship context fields extend the existing "context" section in ContactDetail — no new sections.
- **D-03:** All new fields (milestones, interests, relationship context) are freeform text — same textarea pattern as existing notes/past-clients fields. Compatible with Briell editing directly in Airtable.
- **D-04:** Birthday field is a date input. When birthday is within 30 days, an inline "in X days" label appears next to the date. Subtle, no special UI treatment beyond the text.

### Equity score display
- **D-05:** Score + label in header. Tapping/clicking the score reveals a small breakdown: counts by interaction type (e.g. "3 calls, 2 emails, 1 intro") for the last 90 days. Progressive disclosure — collapsed by default.
- **D-06:** Score label gets a subtle color tint matching its state (Thriving/Healthy/Cooling/Dormant). Stays within the glass/neutral palette — not traffic-light bright.
- **D-07:** Ship with current weights (intro=5, meeting=4, call=3, text=2, email=2, note=0). Easy to tune later — it's one constant object. Don't block on Moj feedback.

### Import dedup
- **D-08:** Import script must check name + email before creating contacts (DATA-01). Existing email-only dedup is insufficient.

### Claude's Discretion
- Exact color values for score label tints
- Birthday countdown wording and threshold edge cases
- Score breakdown expand/collapse animation
- Import script: exact matching strategy for name+email (case sensitivity, fuzzy vs exact)
- New Airtable field naming (must follow Briell's conventions — Title Case with spaces)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing code
- `src/components/contacts/ContactDetail.tsx` — Current profile panel with inline-editable fields, auto-save on blur pattern
- `src/components/contacts/ContactPanel.tsx` — Contact list panel that opens ContactDetail
- `src/lib/equity.ts` — `contactEquityScore()`, `scoreLabel()`, `INTERACTION_WEIGHTS`, `indexByContact()`
- `src/lib/airtable.ts` — Data layer: `ContactFields` interface, `updateContact()`, cache invalidation pattern
- `src/lib/types.ts` — `Contact` interface (needs new fields), `InteractionType`, `Interaction`
- `src/scripts/importServiceProviders.ts` — Current import script with email-only dedup

### Design system
- `docs/design-system.md` — Token set, typography, spacing, glass orb visual rules

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ContactDetail.field()` renderer: handles label + display/input toggle with auto-save on blur. Extend for new fields.
- `contactEquityScore()` in equity.ts: already returns 0-100. Just need to call it per-contact and display.
- `indexByContact()`: pre-indexes interactions by contact ID for O(1) lookup.
- `INTERACTION_WEIGHTS` constant: the source of truth for score calculation.

### Established Patterns
- Inline-editable fields with `editingField` state and `handleBlur` auto-save (ContactDetail.tsx)
- Module-level caches with TTL and stale-while-revalidate (airtable.ts)
- Airtable field naming: Title Case with spaces (e.g. "Past Clients", "Recommended By")

### Integration Points
- `Contact` type in types.ts needs `birthday`, `milestones`, `interests`, `relationship_context` fields
- `ContactFields` interface in airtable.ts needs matching Airtable field names
- `mapContact()` in airtable.ts needs to map new fields
- `updateContact()` in airtable.ts needs to handle new fields in the PATCH body
- InteractionSection already loads per-contact interactions — score breakdown can reuse this data

</code_context>

<specifics>
## Specific Ideas

- Score should feel like a health indicator, not a judgment — "Healthy · 72" not "Score: 72/100"
- Birthday countdown is informational nudge, not an alert — "in 12 days" in tertiary text
- Breakdown expand should feel like Apple's disclosure triangles — clean, not accordion-y

</specifics>

<deferred>
## Deferred Ideas

- Birthday surfacing on the orb map or dashboard focus items — already handled by todaysFocus() in equity.ts, can enhance later
- Structured tags for interests (comma-separated pills) — revisit if freeform feels limiting after real use

</deferred>

---

*Phase: 01-contact-profiles*
*Context gathered: 2026-03-20*
