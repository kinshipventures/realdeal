# Phase 1: Contact Profiles - Research

**Researched:** 2026-03-22
**Domain:** React profile UI, SVG segmented ring, Airtable date fields, import dedup
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: New personal fields (birthday, milestones, interests, relationship context) go in a NEW "personal" section, separate from the existing "context" section
- D-02: "context" stays professional (specialization, past clients, recommended by). "personal" is the relationship layer
- D-03: Section order: contact → context → personal → notes → interactions
- D-04: All new text fields (milestones, interests, relationship context) are freeform textarea — same pattern as existing notes/past-clients fields
- D-05: Birthday field is a date input. When birthday is within 30 days, an inline "in X days" label appears next to the date. Subtle, informational nudge — not an alert.
- D-07: Per-contact equity score shown as a segmented/stacked ring — same visual language as the Dashboard EquityRing but broken down by interaction type
- D-08: Each interaction type gets its own color segment. Arc length reflects actual weighted contribution (intros take more arc than texts because they're weighted 5x vs 2x)
- D-09: Score number and label (e.g. "72 · Healthy") displayed alongside the ring
- D-10: Visual approach chosen because Moj prioritizes bold, expressive design — plain numbers don't match the Oura ring / Spotify Wrapped energy
- D-11: Ship with current weights (intro=5, meeting=4, call=3, text=2, email=2, note=0). Easy to tune later. Don't block on Moj feedback.
- D-12: Handle dedup behavior as it comes — match on name + email, specific collision behavior (skip vs update) decided when real CSVs arrive from Briell
- D-13: Script should be ready to run but doesn't need speculative architecture
- D-14: Build UI and Airtable field mappings that work with existing data. Empty fields show placeholders that light up when Briell populates them in Airtable
- D-15: No dummy data systems or speculative integrations

### Claude's Discretion
- Birthday countdown wording and threshold edge cases
- Stacked ring color palette per interaction type
- Interaction type legend/labels around the ring
- Loading and empty states for new sections
- Score label color tint per state (Thriving/Healthy/Cooling/Dormant) — stays within glass/neutral palette
- Import script: exact matching strategy for name+email (case sensitivity, fuzzy vs exact)
- New Airtable field naming (must follow Briell's conventions — Title Case with spaces)

### Deferred Ideas (OUT OF SCOPE)
- Gmail integration for cross-channel contact timeline
- AI enrichment from social/email/messages
- Birthday surfacing on Dashboard (not just profile)
- Structured tags for interests (comma-separated pills)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | Import script has dedup logic — checks name + email before creating contacts | Dedup pattern documented below; existing script already has email-index pattern to extend |
| PROF-01 | Contact profile shows birthday field with countdown when within 30 days | Airtable `date` field type confirmed; countdown math is pure JS |
| PROF-02 | Contact profile has milestones freeform text field | Plugs directly into existing `field()` renderer as multi-line textarea |
| PROF-03 | Contact profile has interests freeform text field | Same as PROF-02 |
| PROF-04 | Contact profile has relationship context freeform text field | Same as PROF-02 |
| PROF-05 | Contact profile displays per-contact equity score with breakdown | Segmented ring pattern and `contactEquityBreakdown()` companion function documented below |
</phase_requirements>

---

## Summary

All six requirements are well-supported by the existing codebase — no new dependencies needed. The work is four discrete additions: (1) new Airtable fields + type wiring, (2) a "personal" section in `ContactDetail`, (3) a `contactEquityBreakdown()` function in `equity.ts` plus a `SegmentedEquityRing` SVG component, and (4) extending the import script dedup from email-only to name+email.

The segmented ring is the only genuinely novel piece of code. The existing `EquityRing` uses a single `strokeDasharray/strokeDashoffset` arc — the segmented version stacks multiple arcs at different `strokeDashoffset` starting positions. The math is straightforward: each segment's arc length is `(segmentWeight / totalWeight) * circumference`, and each segment starts where the previous one ended.

Birthday countdown is pure client-side date math. Airtable stores dates as `YYYY-MM-DD` strings for the `date` field type. The countdown normalizes to "days until next occurrence this year" handling year wrap-around.

**Primary recommendation:** Work in this order — types → airtable layer → profile UI → equity breakdown → segmented ring. The ring depends on the breakdown function; the UI depends on the types.

---

## Standard Stack

No new dependencies required. Everything builds on existing stack.

### Core (existing — no changes)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | Component model | Already in use |
| TypeScript | ~5.x | Types | Already in use |
| Airtable REST API | v0 | Data layer | Project's sole backend |

### No New Libraries
The segmented ring is pure SVG — no charting library needed. `strokeDasharray` and `strokeDashoffset` on `<circle>` elements are sufficient and already used in the codebase. Adding D3 or Recharts for a single ring would violate the minimal dependencies principle.

---

## Architecture Patterns

### Airtable Field Changes

**New fields to add to the Contacts table** (Briell adds in Airtable UI, code maps them):

| Airtable Field Name | Type | Maps to (Contact interface) |
|---------------------|------|-----------------------------|
| `Birthday` | date | `birthday: ISODate \| null` |
| `Milestones` | long text | `milestones: string \| null` |
| `Interests` | long text | `interests: string \| null` |
| `Relationship Context` | long text | `relationship_context: string \| null` |

All field names follow Briell's convention: Title Case with spaces.

**In `airtable.ts` `ContactFields` interface:**
```typescript
interface ContactFields {
  // ... existing fields ...
  Birthday?: string          // YYYY-MM-DD
  Milestones?: string
  Interests?: string
  'Relationship Context'?: string
}
```

**In `mapContact()`:**
```typescript
birthday: r.fields.Birthday ?? null,
milestones: r.fields.Milestones ?? null,
interests: r.fields.Interests ?? null,
relationship_context: r.fields['Relationship Context'] ?? null,
```

**In `updateContact()`** — add to the fields mapping block:
```typescript
if (data.birthday !== undefined) fields.Birthday = data.birthday
if (data.milestones !== undefined) fields.Milestones = data.milestones
if (data.interests !== undefined) fields.Interests = data.interests
if (data.relationship_context !== undefined) fields['Relationship Context'] = data.relationship_context
```

### Birthday Countdown Pattern

Airtable `date` fields return and accept `YYYY-MM-DD` strings (ISO 8601, no time component). Confirmed via Airtable API field model docs.

The birthday countdown requires computing "days until next occurrence" — birthday years are irrelevant, only month+day matter:

```typescript
// Source: client-side calculation, no library needed
function daysUntilBirthday(birthday: string): number | null {
  if (!birthday) return null
  const today = new Date()
  const [, month, day] = birthday.split('-').map(Number)
  const thisYear = new Date(today.getFullYear(), month - 1, day)
  // If already passed this year, use next year
  if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1)
  return Math.ceil((thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
```

Display: only show countdown label when `daysUntilBirthday(birthday) <= 30`. Show `"in X days"` in `text-tertiary` (`rgba(0,0,0,0.28)`) inline next to the date value. "Today" edge case: show `"today"`.

**Birthday field render**: date input (`<input type="date">`) when editing. Display as-is when not editing (the raw `YYYY-MM-DD` is fine for an internal tool). Countdown sits beside it as tertiary inline text.

### Personal Section in ContactDetail

Section order per D-03: contact → context → **personal** → notes → interactions.

The personal section drops directly into the existing scroll body in `ContactDetail.tsx` between the context and notes sections. Uses the same `field()` renderer for milestones, interests, relationship context (all `multi=true`). Birthday gets a custom inline renderer because it's a `type="date"` input, not a text field.

```typescript
// In ContactDetail scrollable body, after context section:
<div style={{ marginBottom: 24 }}>
  <div style={sectionLabel}>personal</div>
  {/* Birthday — custom renderer */}
  <BirthdayField
    value={draft.birthday ?? null}
    editing={editingField === 'birthday'}
    onEdit={() => setEditingField('birthday')}
    onBlur={v => handleBlur('birthday', v)}
  />
  {field('milestones', 'Milestones', true)}
  {field('interests', 'Interests', true)}
  {field('relationship_context', 'Relationship context', true)}
</div>
```

Extract `BirthdayField` as a small local function in the same file — it's used once and has the countdown logic, not worth a separate file.

### Equity Score Breakdown — Companion Function

The existing `contactEquityScore()` returns a single number. A companion function returns per-type contributions for ring segment data.

**New function to add to `equity.ts`:**
```typescript
export interface EquityBreakdown {
  type: InteractionType
  score: number       // weighted, recency-adjusted contribution
  weight: number      // raw weight from INTERACTION_WEIGHTS
}

// Returns per-type breakdown, excluding note (weight=0) and types with 0 score
export function contactEquityBreakdown(interactions: Interaction[]): EquityBreakdown[] {
  const now = Date.now()
  const byType = new Map<InteractionType, number>()

  for (const ix of interactions) {
    const weight = INTERACTION_WEIGHTS[ix.type]
    if (weight === 0) continue
    const daysAgo = (now - new Date(ix.date).getTime()) / DAY_MS
    const contribution = weight * recencyMultiplier(daysAgo)
    byType.set(ix.type, (byType.get(ix.type) ?? 0) + contribution)
  }

  return Array.from(byType.entries())
    .filter(([, score]) => score > 0)
    .map(([type, score]) => ({ type, score, weight: INTERACTION_WEIGHTS[type] }))
    .sort((a, b) => b.score - a.score)
}
```

The ring segments are sized proportionally to their `score` values (not weight), so recency-adjusted contributions drive arc lengths directly.

### Segmented Ring SVG Pattern

The existing `EquityRing` uses one `<circle>` with `strokeDasharray/strokeDashoffset`. The segmented variant uses multiple `<circle>` elements stacked on the same cx/cy/r, each with a different offset to create adjacent arc segments.

**Key math:** Each segment starts where the previous ends. SVG circles start at the right (3 o'clock); rotate the whole SVG `-90deg` to start at top.

```typescript
// Source: derived from existing EquityRing pattern in Dashboard.tsx
function SegmentedEquityRing({ breakdown, score, size }: {
  breakdown: EquityBreakdown[]
  score: number
  size: number
}) {
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const totalScore = breakdown.reduce((s, b) => s + b.score, 0)
  // Scale to score: filled arc = score/100 of circumference
  const filledArc = (score / 100) * circumference

  // Each segment's arc length proportional to its contribution within filledArc
  let offset = 0  // tracks where the next segment starts (as dashoffset)
  const segments = breakdown.map(b => {
    const arcLength = totalScore > 0 ? (b.score / totalScore) * filledArc : 0
    // dasharray: [arcLength, rest]; dashoffset: circumference - offset
    const segmentOffset = circumference - offset
    offset += arcLength
    return { ...b, arcLength, segmentOffset }
  })

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {/* Ghost track */}
      <circle cx={size/2} cy={size/2} r={radius}
        fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={strokeWidth} />
      {/* Segments */}
      {segments.map(seg => (
        <circle key={seg.type}
          cx={size/2} cy={size/2} r={radius}
          fill="none"
          stroke={RING_COLORS[seg.type]}
          strokeWidth={strokeWidth}
          strokeDasharray={`${seg.arcLength} ${circumference}`}
          strokeDashoffset={seg.segmentOffset}
          strokeLinecap="butt"   // butt caps for clean segment joins
        />
      ))}
    </svg>
  )
}
```

**Important:** Use `strokeLinecap="butt"` (not `"round"`) on segmented rings. Round caps bleed into adjacent segments at small sizes.

### Color Palette for Segments (Claude's Discretion)

Interaction types need distinct, readable colors within the glass/neutral design system. Recommended palette — warm/cool contrast, stays within low-saturation family:

| Type | Color | Rationale |
|------|-------|-----------|
| `intro` | `#7B61FF` | Purple — highest value, distinctive |
| `meeting` | `#FF6B4A` | Coral/orange — warm, energetic |
| `call` | `#34C759` | Green — accessible, distinct from others |
| `text` | `#FFB547` | Amber — warm, lighter weight |
| `email` | `#5AC8FA` | Blue — cool, lower energy matches email weight |

These echo the existing gradient colors in `EquityRing` (`#FF6B4A` → `#7B61FF`) and extend them with complements.

### Import Dedup — Name + Email

The existing script already does email-only dedup (builds `emailIndex` Map, checks before creating). To add name+email:

```typescript
// After loading existingContacts, build dual index:
const emailIndex = new Map<string, string>()   // email → record ID
const nameIndex = new Map<string, string>()    // normalizedName → record ID

for (const c of existingContacts) {
  const email = (c.fields.Email as string | undefined)?.toLowerCase()
  const name = (c.fields.Name as string | undefined)?.toLowerCase().trim()
  if (email) emailIndex.set(email, c.id)
  if (name) nameIndex.set(name, c.id)
}

// In the row loop, match on either email OR name:
const email = row['Email']?.trim().toLowerCase()
const name = row['Name']?.trim().toLowerCase()   // adjust column header per CSV
const existingId = (email && emailIndex.get(email)) || (name && nameIndex.get(name))
```

This is case-insensitive exact match — the right level of fidelity for Briell's high-signal network. Fuzzy matching would create false positives.

Dedup behavior (D-12): use PATCH (update) as default since the existing script already does this. If a collision is found, update the record. Log skips/updates with counts at the end.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Donut/ring chart | Custom canvas renderer or D3 donut | SVG `circle` with `strokeDasharray` | Already established in codebase; D3 is massive overkill for a single ring |
| Date picker styling | Custom date picker component | Native `<input type="date">` | Internal tool; native date picker is sufficient and zero-dependency |
| Birthday year calculation | Full date library (date-fns, dayjs) | 5-line vanilla JS | No new dependency for trivial math |

---

## Common Pitfalls

### Pitfall 1: SVG Segment Gap at Seam
**What goes wrong:** Adjacent strokeDasharray segments leave a visible gap or overlap at the join point because floating point rounding accumulates.
**Why it happens:** Arc lengths computed as fractions of circumference don't always sum to exactly the filled arc.
**How to avoid:** Compute segment lengths as fractions, then set the last segment's length to `filledArc - sum(allPrevious)` to absorb rounding error.
**Warning signs:** Visible dark gap or bright overlap between the last segment and the ghost track.

### Pitfall 2: Birthday Field Type Mismatch
**What goes wrong:** Writing a birthday value to Airtable as a full ISO timestamp (e.g. `2026-03-22T00:00:00.000Z`) breaks Airtable's `date`-type field.
**Why it happens:** Airtable's `date` field (no time component) expects `YYYY-MM-DD` only.
**How to avoid:** When saving birthday from `<input type="date">`, the browser returns `YYYY-MM-DD` natively — don't stringify with `new Date().toISOString()`. Write the value raw.
**Warning signs:** Airtable API returns 422 or silently nulls the field on write.

### Pitfall 3: Birthday Countdown Crossing Year Boundary
**What goes wrong:** Contact born Dec 28, today is Jan 3 — countdown shows negative days or 362 days instead of 359.
**Why it happens:** Naive implementation computes days until birthday this year without checking if it's already passed.
**How to avoid:** Check `if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1)` — see the countdown pattern above. This handles Dec/Jan wrap cleanly.
**Warning signs:** Countdown shows large positive number (>200) or negative number for a recent past birthday.

### Pitfall 4: `updateContact()` Missing New Field Keys
**What goes wrong:** Saving birthday/milestones/interests/relationship_context fields silently fails — no error, but Airtable never receives them.
**Why it happens:** `updateContact()` builds its `fields` object with explicit `if (data.xxx !== undefined)` checks. New fields that aren't added to that block are silently dropped.
**How to avoid:** The `updateContact()` field-mapping block must include all four new fields. Easy to miss during type extension.
**Warning signs:** Field updates from ContactDetail don't persist after blur; Airtable record shows no change.

### Pitfall 5: `createContact()` Also Needs New Fields
**What goes wrong:** Creating a new contact via the UI doesn't include birthday etc. even if the user entered them.
**Why it happens:** `createContact()` has its own explicit field mapping — separate from `updateContact()`.
**How to avoid:** Add all four new fields to `createContact()`'s field build block too, matching the `updateContact()` additions.

---

## Code Examples

### Birthday Field Read/Write
```typescript
// Airtable returns: "1985-06-15" (YYYY-MM-DD string for date field type)
// <input type="date"> also returns "1985-06-15" — direct round-trip, no conversion needed

// Writing to Airtable
fields.Birthday = data.birthday ?? undefined  // undefined removes the field, null would 422
```

### Segmented Ring — Empty State
```typescript
// When no interactions exist, show ghost track only
if (breakdown.length === 0) {
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={radius}
        fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={strokeWidth} />
    </svg>
  )
}
```

### Airtable filterByFormula for Dedup Check (alternative single-record lookup)
```typescript
// Not used in batch import (too many API calls) but useful for single-contact dedup in UI:
const formula = `AND({Name}="${name}", {Email}="${email}")`
const url = `${TABLES.contacts}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`
```

### Score Label with Ring — Display Pattern
```typescript
// Alongside ring, per D-09: "72 · Healthy"
<div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(0,0,0,0.85)', letterSpacing: '-0.03em' }}>
  {score}
</div>
<div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 4, letterSpacing: '0.01em' }}>
  {scoreLabel(score)}
</div>
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Single-arc EquityRing in Dashboard | Segmented ring on profile — same SVG, multiple circle elements | Profile ring is richer; dashboard ring stays single-arc (overall score) |
| Email-only dedup in import script | Name + email dual-index dedup | Name fallback catches contacts without email |

---

## Open Questions

1. **Birthday field: does Briell add it before Phase 1 ships?**
   - What we know: STATE.md lists this as a blocker — "Briell needs to add Birthday, Interests, Milestones, Relationship Context fields to Airtable Contacts table before Phase 1 can complete"
   - What's unclear: Whether Briell has done this already or needs to be prompted
   - Recommendation: Add code with the mapping ready. If fields don't exist in Airtable yet, values will come back `undefined` and render as empty placeholders (per D-14 — this is by design).

2. **Ring with zero interactions**
   - What we know: score = 0, breakdown = []
   - What's unclear: Whether to show the ring at all for contacts with no interaction history
   - Recommendation: Show ghost track only (empty ring). Score shows "0 · Dormant". This communicates the relationship is uncharted, which is accurate.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `src/lib/equity.ts`, `src/lib/airtable.ts`, `src/lib/types.ts`, `src/components/contacts/ContactDetail.tsx`, `src/components/dashboard/Dashboard.tsx`, `src/scripts/importServiceProviders.ts`, `docs/design-system.md`
- Airtable API field model docs (airtable.com/developers) — `date` field type confirmed as `YYYY-MM-DD` string

### Secondary (MEDIUM confidence)
- SVG `strokeDasharray` segmented ring pattern — well-established SVG technique, no library needed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all code extends existing patterns
- Architecture: HIGH — field mapping, section order, ring math all derived directly from reading the source
- Pitfalls: HIGH — specific to this codebase's patterns (generation counter, updateContact field mapping)

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable codebase, no fast-moving external dependencies)
