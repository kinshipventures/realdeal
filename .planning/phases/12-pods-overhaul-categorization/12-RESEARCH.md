# Phase 12: Pods Overhaul + Categorization — Research

**Researched:** 2026-03-29
**Domain:** React SPA — pod data model extension, Airtable schema, intake triage UX, swipe queue, categorization modal, pod detail page, orb map navigation change
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Pending tray:**
- D-01: Dashboard widget showing pending count + preview. Visible on every app open. Tapping opens categorization queue.
- D-02: Manual "Add Contact" skips pending tray — pod assignment + required questions answered inline. Pending tray is for imports and external sources only.
- D-03: Gentle urgency — shows count, no color escalation or badges.
- D-04: Tinder-style swipe queue. Cards in a stack, swipe/tap through one at a time. Smart preview adapts to available data.
- D-05: Skip sends contact to back of queue. No snooze timer.

**Categorization modal:**
- D-06: All-in-one screen. Pod multi-select at top, required questions inline below as pods are selected. Primary pod radio. One scroll, one save.
- D-07: Required questions enforced — Save disabled until all required fields for all selected pods are answered. Skip defers back to queue.
- D-08: Smart preview on swipe cards — shows whatever fields exist from creation source.

**Capacity limits:**
- D-09: Soft cap with warning. User can add past limit. UI warns "Maps is at 152/150 — consider reviewing." Options: [Review Pod] or [Add Anyway].
- D-10: Per-pod configurable capacity. Field on Pod record in Airtable.
- D-11: Curation UI deferred to Phase 16. Phase 12 only adds data model (capacity field) + soft-cap warning at add time.

**Pod management:**
- D-12: Pod detail page at `/pod/:id`. Shows: settings, required fields section, sub-pods list, member list with equity scores.
- D-13: Pod creation from '+' orb on orb map home view AND from pods management area.
- D-14: New Pod fields in Airtable: `description` (long text), `capacity` (number, nullable = unlimited).

**Sub-pods:**
- D-15: Categories ARE sub-pods — UI label rename only. Same Airtable Categories table, same parent link. No data migration.
- D-16: Sub-pod cadence override deferred.

**Orb map updates:**
- D-17: Pod orbs show health ring + capacity indicator for capacity-limited pods. Pending count badge on dashboard widget only.
- D-18: Orb map click navigates to `/pod/:id` instead of current category-drill behavior.

### Claude's Discretion
- Swipe queue animation and gesture implementation (CSS transitions vs gesture library)
- Dashboard widget visual design and placement among existing widgets
- Pod detail page layout and responsive behavior
- How the all-in-one categorization form handles many pods with many required fields (scroll vs collapse)
- Exact orb capacity indicator visual treatment
- Whether to add a "Pods" section to the nav pill or rely on orb map as entry point
- Pod creation form field ordering and validation

### Deferred Ideas (OUT OF SCOPE)
- Curation UI for capacity-limited pods — Phase 16 (NURT-03)
- Sub-pod cadence override
- Conditional pod logic ("if in X pod, override Y pod")
- Trigger logic types (time-based, activity-based)
- Review expectations (yearly, quarterly pod reviews)
- Email parsing as pending source (v2.1+)
- Meeting note-taker summaries as pending source (v2.1+)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| POD-01 | User can create unlimited pods | Pod creation form + Airtable createPod CRUD — existing pattern from Categories CRUD |
| POD-02 | Customize pod: name, color, description | Extend PodFields interface with `description`; color already exists; form on pod detail page |
| POD-03 | Pods support unlimited sub-pods (categories) | Categories table is already sub-pods (D-15); UI label rename only, no schema change |
| POD-04 | Relationships belong to multiple pods; one marked Primary | Add `primary_list_id` field to Contacts table; multi-select already in CreateRecordModal |
| POD-05 | Each pod defines required questions answered during categorization | FieldConfig table already has `required` boolean + `scope_pod_id`; categorization form reads these |
| POD-06 | Pods drive: required fields, follow-up cadence, external list inclusion | Required fields from FieldConfig; cadence already on Pod; external lists deferred |
| POD-07 | Capacity-limited pods (e.g., Maps ~150) | New `capacity` number field on Lists table; soft-cap check in categorization and add flows |
| POD-08 | Workflows for "managing up or out" | Data model only in Phase 12 (capacity field + count); curation UI is Phase 16 |
| POD-09 | Individual records can override pod-level cadence | Add `cadence_override` field to Contacts (nullable Cadence type); equity.ts reads override first |
| POD-10 | Pod bubbles UI fixed and scalable for large pod systems | Orb map already has multi-ring layout (RING_RADII [210, 330, 460]); no structural change needed |
| CAT-01 | All unsorted contacts appear in Pending Categorization tray before entering CRM | Dashboard widget + swipe queue overlay; contacts with Status='Pending' are the data source |
| CAT-02 | Pending records from: manual entry (skipped per D-02), CSV import, future sources | csvImport.ts sets `status: 'Active'` today — change to `'Pending'`; brain dump already sets Pending |
| CAT-03 | Categorization modal: select pods, complete required questions, add notes, assign primary pod | New CategorizationModal component; reads FieldConfig for required questions per pod |
| CAT-04 | Record cannot be added to pod until required questions answered | Save button disabled logic in CategorizationModal; validates all required fields across all selected pods |
| CAT-05 | Save moves record from Pending into CRM (Status = Active) | `updateContact({ status: 'Active', list_ids: selectedPods, primary_list_id: primaryPod, custom_fields: answers })` |
| CAT-06 | Every categorization action saved to record timeline | Write Interaction record with type='note', notes=structured string; Phase 13 expands timeline types |
</phase_requirements>

---

## Summary

Phase 12 converts pods from passive grouping containers into behavioral containers with required intake questions, capacity constraints, and a formal categorization workflow for externally sourced records. The Airtable schema needs two new fields on the Lists (Pods) table (`description`, `capacity`) and one on Contacts (`primary_list_id` for primary pod tracking, `cadence_override` for per-record cadence).

The categorization flow is the centerpiece: CSV imports and brain-dump entries land with `status: 'Pending'`. A dashboard widget surfaces the pending count. An overlay swipe queue lets the user triage one card at a time, launching a categorization modal for each. The modal reads pod-specific required fields from the existing FieldConfig table (already built in Phase 11), enforces completion before saving, then promotes the record to Active.

The orb map navigation fundamentally changes: pod orb clicks navigate to `/pod/:id` (new route) instead of the current category-drill behavior. The pod detail page consolidates settings, required fields, sub-pods, and members.

**Primary recommendation:** Build in 4 sequential waves — (1) data model + Airtable fields, (2) pending tray + swipe queue, (3) categorization modal with required field enforcement, (4) pod detail page + orb map navigation change.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React + TypeScript | Already in project | All UI components | Project standard |
| react-router | Already in project | `/pod/:id` route | Already used for `/record/:id` |
| Airtable REST API | Already in project | Pod CRUD, contact updates | Project's only backend |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS transitions (built-in) | n/a | Swipe queue card animations | Preferred — no gesture library needed for tap/swipe on a stack |
| @xyflow/react | Already in project | OrbMap — add pod detail navigation | Already the map renderer |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS transitions for swipe | react-spring or framer-motion | Overkill — the queue is tap-to-advance with optional swipe gesture; pure CSS transform + transition covers it without adding a dependency |
| Native touch events for swipe | Hammer.js / use-gesture | Adds weight; the Tinder pattern can be achieved with `onPointerDown`/`onPointerUp` delta tracking in ~40 lines |

**Installation:** No new packages required. Phase 12 is pure product logic + new components on the existing stack.

---

## Architecture Patterns

### Recommended Project Structure

New files this phase creates (existing files modified in-place):

```
src/
├── components/
│   ├── pods/
│   │   ├── PodDetailPage.tsx       # /pod/:id — settings, fields, sub-pods, members
│   │   ├── PodCreateModal.tsx      # Quick creation from orb map '+' orb
│   │   └── PodCapacityBadge.tsx    # Reusable capacity indicator (fraction + arc)
│   ├── categorization/
│   │   ├── PendingTrayWidget.tsx   # Dashboard widget: count + preview
│   │   ├── CategorizationQueue.tsx # Swipe queue overlay (card stack)
│   │   └── CategorizationModal.tsx # All-in-one: pod select, required fields, primary pod
│   └── map/
│       └── ListNode.tsx            # Modify: click → navigate('/pod/:id')
├── lib/
│   └── airtable.ts                 # Add: getPendingContacts, updatePod, createPod, getPodMemberCount
```

### Pattern 1: Pending Tray Widget

**What:** Dashboard widget reads `contacts.filter(c => c.status === 'Pending')`. Shows count badge + 2–3 preview names. "Review" button opens CategorizationQueue overlay.

**When to use:** Rendered once in Dashboard.tsx alongside existing widgets. Conditionally hidden when pending count is 0 (or shows "0 pending" in muted state — Claude's discretion).

**Example:**
```typescript
// Derived from existing getActiveContacts() pattern in airtable.ts
export async function getPendingContacts(): Promise<Contact[]> {
  const all = await getContacts()
  return all.filter(c => c.status === 'Pending')
}
```

### Pattern 2: Swipe Queue (Card Stack)

**What:** Full-screen overlay with a stack of contact cards. CSS `z-index` stack — top card is interactive. Swipe left = skip (back to queue), swipe right / tap "Categorize" = open CategorizationModal for that contact.

**Implementation approach:** Track pointer delta on the card. At release: if delta > 80px left → `handleSkip()`, otherwise snap back. Skip requeues contact at array end (local state only — no Airtable write). Categorize opens modal overlay.

```typescript
// Card position: translate via CSS custom property
// style={{ transform: `translateX(${dragX}px) rotate(${dragX * 0.05}deg)` }}
// Transition: 'transform 0.15s ease' when not dragging, 'none' when dragging
```

### Pattern 3: Categorization Modal (All-in-One)

**What:** Pod multi-select at top → selected pods render their required FieldConfig sections inline below → primary pod radio per selected pod → contextual notes textarea → Save / Skip footer.

**Required field enforcement:**
```typescript
// All required fields across all selected pods must have non-empty values
const allRequiredAnswered = selectedPodIds.every(podId => {
  const podRequired = fieldConfigs.filter(fc => fc.scope_pod_id === podId && fc.required)
  return podRequired.every(fc => {
    const val = answers[fc.name]
    return val !== null && val !== undefined && val !== ''
  })
})
// Save button: disabled={!allRequiredAnswered || !primaryPodId || saving}
```

**Save sequence:**
1. `updateContact(id, { status: 'Active', list_ids: selectedPodIds, primary_list_id: primaryPodId, custom_fields: mergedAnswers })`
2. Write timeline entry: `createInteraction({ contact_id: id, type: 'note', notes: categorizationSummary })`
3. Remove contact from local pending queue state
4. Advance to next card

### Pattern 4: Soft Capacity Warning

**What:** When user selects a pod during categorization (or adds a contact via CreateRecordModal), check pod member count against pod.capacity. If exceeded, show inline warning before saving.

```typescript
async function getPodMemberCount(podId: string): Promise<number> {
  const contacts = await getActiveContacts()
  return contacts.filter(c => c.list_ids.includes(podId)).length
}

// In categorization save: if pod.capacity && memberCount >= pod.capacity → show warning modal
// Warning: "Maps is at {count}/{capacity} — consider reviewing"
// Options: [Review Pod] → navigate('/pod/:id') | [Add Anyway] → proceed with save
```

### Pattern 5: Pod Detail Page

**What:** Full-page route at `/pod/:id`. Layout mirrors RecordPage two-column pattern. Left: member list (ContactCard rows with equity scores). Right: settings (name, color, description, cadence, capacity), required fields section (list of FieldConfig records for this pod), sub-pods section.

**Data requirements:**
- `getPods()` to find pod by id
- `getContacts()` filtered by `c.list_ids.includes(podId)` for members
- `getFieldConfigs()` filtered by `fc.scope_pod_id === podId`
- `getCategories(podId)` for sub-pods
- All interactions (for equity scores per member)

### Pattern 6: Orb Map Navigation Change

**What:** `ListNode.tsx` currently calls `onListClick(id)` which triggers category-drill view in OrbMap. Change to `navigate('/pod/${id}')`.

**Impact:** OrbMap's `handleListClick`, `buildCategoryNodes`, category-drill state can be removed entirely once pod detail page is live — or kept as fallback. Recommend full removal in this phase (D-18 is definitive).

**OrbMap state to remove:** `viewState === 'categories'`, `selectedListId`, `buildCategoryNodes`, `buildCategoryEdges`, `handleListClick`. The category-drill view in the map is replaced by the pod detail page.

### Anti-Patterns to Avoid

- **Separate Pending table:** Status field on Contacts is the gate (D-08 from Phase 10). Don't create a new table.
- **Blocking save with a wizard:** The categorization flow is one scroll, not a multi-step wizard. Required fields appear inline as pods are toggled.
- **Writing primary pod as a separate junction table:** `primary_list_id` is a simple text field (single record ID) on the Contacts table — not a linked record field (Airtable limitation: a contact can only have one primary, stored as a single value).
- **Fetching all contacts on every queue action:** Use the module-level contacts cache. Invalidate only after a categorization save.
- **Adding gesture library:** Pointer delta tracking in ~40 lines is sufficient for the swipe queue. Don't add react-spring or framer-motion.
- **Keeping category-drill in OrbMap:** D-18 is a clean cut. Remove the category-drill view code when wiring pod orb click to `/pod/:id`. Dead code causes future confusion.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pod-scoped required field rendering | Custom field renderer | Existing `PodFieldsWidget` field rendering logic | Already handles text/multiline/number/select/date/checkbox with inline editing |
| Pod color display | Custom color picker | Existing `POD_SHIFT_COLORS` + color swatch chips | Pod colors are a closed set; consistent with rest of app |
| Card stack z-ordering | Complex DOM manipulation | CSS `z-index` on array-indexed cards | Stack of 3–5 cards; simple CSS is sufficient |
| Typeahead for pod search in categorization | New typeahead | `SearchPalette` pattern (filter-on-type, keyboard nav) | Already proven in the app |
| Escape key handling in queue overlay | Global keydown listener | `useEscape(stableCallback)` from `escapeStack.ts` | Handles layered modals correctly |
| Required field completion check | Complex validation | Simple `every()` over filtered FieldConfigs | The data model already provides everything needed |

---

## Airtable Schema Changes

### Lists (Pods) Table — New Fields

| Field Name | Airtable Type | Notes |
|-----------|---------------|-------|
| `Description` | Long text | Optional pod description. Maps to `Pod.description`. |
| `Capacity` | Number (integer) | Optional capacity limit. Null = unlimited. Maps to `Pod.capacity`. |

### Contacts Table — New Fields

| Field Name | Airtable Type | Notes |
|-----------|---------------|-------|
| `Primary Pod` | Single line text | Stores a single Pod record ID. Not a linked record — Airtable linked fields return arrays; we need a single canonical value. Read as `primary_list_id` in TypeScript. |
| `Cadence Override` | Single select | Values: `weekly`, `biweekly`, `monthly`, `quarterly`. Null = use pod cadence. Maps to `cadence_override` on Contact. |

### TypeScript Interface Changes

```typescript
// types.ts additions

export interface Pod {
  // ... existing fields ...
  description: string | null    // new
  capacity: number | null       // new — null = unlimited
}

export interface Contact {
  // ... existing fields ...
  primary_list_id: string | null    // new — primary pod record ID
  cadence_override: Cadence | null  // new — per-record cadence override
}
```

### airtable.ts additions

```typescript
// PodFields interface additions
interface PodFields {
  // ... existing ...
  Description?: string
  Capacity?: number
}

// ContactFields interface additions
interface ContactFields {
  // ... existing ...
  'Primary Pod'?: string
  'Cadence Override'?: Cadence
}

// mapPod additions
function mapPod(r): Pod {
  return {
    // ... existing ...
    description: r.fields.Description ?? null,
    capacity: r.fields.Capacity ?? null,
  }
}

// mapContact additions
function mapContact(r): Contact {
  return {
    // ... existing ...
    primary_list_id: r.fields['Primary Pod'] ?? null,
    cadence_override: (r.fields['Cadence Override'] as Cadence) ?? null,
  }
}

// New CRUD functions needed
export async function createPod(data: Omit<Pod, 'id' | 'created_at'>): Promise<Pod>
export async function updatePod(id: string, data: Partial<Omit<Pod, 'id' | 'created_at'>>): Promise<Pod>
export async function getPendingContacts(): Promise<Contact[]>
```

---

## CSV Import Change (CAT-02)

The current `csvImport.ts` sets `status: 'Active'` on line 147. Change to `'Pending'`.

```typescript
// csvImport.ts line ~147 — change:
// status: 'Active',
// to:
status: 'Pending',
```

This single-line change routes all CSV imports through the pending tray. Brain dump creation in CreateRecordModal already sets `status: 'Pending'` (line ~222 of records/CreateRecordModal.tsx).

---

## Equity Scoring — Cadence Override

`equity.ts` currently reads cadence from the pod (`pod.cadence`). Add per-record override:

```typescript
// equity.ts — contactCadenceDays should check contact.cadence_override first
export function contactCadenceDays(contact: Contact, pod: Pod | null): number {
  const cadence = contact.cadence_override ?? pod?.cadence ?? 'monthly'
  return CADENCE_DAYS[cadence]
}
```

The `contactCadenceDays` function already exists in `equity.ts` (confirmed by Dashboard.tsx import). Extend it to accept and prefer `contact.cadence_override`.

---

## CAT-06: Timeline Entry for Categorization

Phase 13 expands the timeline type system. For Phase 12, write a standard interaction note:

```typescript
// After successful categorization save:
await createInteraction({
  contact_id: contactId,
  type: 'note',
  date: new Date().toISOString().split('T')[0],
  notes: `Categorized into: ${selectedPodNames.join(', ')}. Primary pod: ${primaryPodName}.`,
})
```

This satisfies CAT-06 without requiring Phase 13's new interaction types. Phase 13 can retroactively reformat these timeline entries.

---

## Common Pitfalls

### Pitfall 1: Primary Pod Field as Linked Record
**What goes wrong:** Defining `Primary Pod` as an Airtable linked record field returns an array `['recXXX']`. The app has to unwrap it everywhere, and the field semantics ("exactly one") are lost.
**Why it happens:** Instinct to use linked records for record-ID references.
**How to avoid:** Use a single-line text field storing the raw record ID. Simpler to read, write, and map. The `contact.list_ids` linked field already handles the "is this contact in this pod?" membership question — `primary_list_id` is just a pointer.
**Warning signs:** Seeing `r.fields['Primary Pod']?.[0]` in mapContact — that's the linked record pattern leaking in.

### Pitfall 2: Orb Map Category-Drill State Left Partially
**What goes wrong:** OrbMap retains category-drill state variables (`viewState`, `selectedListId`, `buildCategoryNodes`) while `ListNode` now navigates away. The state is dead but still reactive, causing confusing renders or TypeScript errors.
**Why it happens:** Partial refactor — connecting navigation first without cleaning the drill-down code.
**How to avoid:** Remove the category-drill mode entirely from OrbMap in the same task as the `ListNode` navigation change. One atomic change.
**Warning signs:** `viewState` still referenced in OrbMap after the navigation change.

### Pitfall 3: Pending Queue Showing Brain Dumps Mixed With CSV Imports
**What goes wrong:** Brain dumps (name='Brain Dump', needs_review=true) and CSV imports both have `status: 'Pending'`, but their smart preview cards need to render differently — brain dump shows the `intel_notes` dump text, CSV import shows name/email/company.
**Why it happens:** Both are "pending" but the available fields differ significantly.
**How to avoid:** Smart preview in the swipe card checks available fields: if `contact.intel_notes` is populated and name='Brain Dump', prioritize showing the dump text. Otherwise show name, email, company, role, source indicator. No structural split needed — just field-presence conditional rendering (D-08 explicitly calls for this).
**Warning signs:** Swipe card shows "Brain Dump" as the contact name with empty preview fields.

### Pitfall 4: Required Field Validation Racing Across Multiple Pods
**What goes wrong:** User selects Pod A (2 required fields) and Pod B (1 required field). All 3 must be answered. If `fieldConfigs` hasn't loaded yet when the modal opens, validation passes incorrectly.
**Why it happens:** `getFieldConfigs()` is async; opening the modal immediately checks required fields.
**How to avoid:** Load `fieldConfigs` before rendering the modal (or show a loading state). The categorization queue loads field configs once when the overlay opens, not per card. Pass configs as props to the modal.
**Warning signs:** Save button enables before user has answered all fields.

### Pitfall 5: Capacity Count Including Pending Contacts
**What goes wrong:** Pod capacity check counts `contacts.filter(c => c.list_ids.includes(podId))` including pending contacts, inflating the count.
**Why it happens:** Pending contacts have `list_ids` pre-set (e.g., brain dumps with pod already selected).
**How to avoid:** Capacity count should only include `status === 'Active'` contacts: `contacts.filter(c => c.status === 'Active' && c.list_ids.includes(podId)).length`.
**Warning signs:** Pod shows "at capacity" even with fewer active members than the limit.

### Pitfall 6: OrbMap `useNavigate` Import Missing
**What goes wrong:** `ListNode.tsx` currently calls a prop callback. Changing to `navigate('/pod/:id')` requires importing `useNavigate` from react-router inside the node component.
**Why it happens:** React Flow node components render inside the flow canvas — they need their own router hook, not a prop.
**How to avoid:** `ListNodeComponent` already lives inside the router tree (OrbMap is rendered inside AppShell which is in `<Routes>`), so `useNavigate` works fine inside `ListNodeComponent`. Just add the import.
**Warning signs:** "useNavigate() may be used only in the context of a <Router> component" error.

---

## Code Examples

### Pending Contacts Getter
```typescript
// Source: airtable.ts — follows existing getActiveContacts() pattern (line 1146)
export async function getPendingContacts(): Promise<Contact[]> {
  const all = await getContacts()
  return all.filter(c => c.status === 'Pending')
}
```

### Soft Capacity Warning Check
```typescript
// Called in CategorizationModal before final save
async function checkCapacities(podIds: string[], pods: Pod[]): Promise<Pod[]> {
  const activeContacts = await getActiveContacts()
  return pods.filter(pod => {
    if (!pod.capacity) return false
    const count = activeContacts.filter(c => c.list_ids.includes(pod.id)).length
    return count >= pod.capacity
  })
}
// Returns pods that are at/over capacity — triggers warning modal
```

### Swipe Card Drag Logic
```typescript
// CategorizationQueue — pointer-based drag on top card
const [dragX, setDragX] = useState(0)
const [dragging, setDragging] = useState(false)
const startX = useRef(0)

function handlePointerDown(e: React.PointerEvent) {
  startX.current = e.clientX
  setDragging(true)
  e.currentTarget.setPointerCapture(e.pointerId)
}
function handlePointerMove(e: React.PointerEvent) {
  if (!dragging) return
  setDragX(e.clientX - startX.current)
}
function handlePointerUp() {
  setDragging(false)
  if (dragX < -80) handleSkip()
  else setDragX(0)
}
// Card style: transform: `translateX(${dragX}px) rotate(${dragX * 0.04}deg)`
// Transition: dragging ? 'none' : 'transform 0.2s cubic-bezier(0.87, 0, 0.13, 1)'
```

### Categorization Save Sequence
```typescript
async function handleCategorize() {
  setSaving(true)
  try {
    // 1. Promote contact to Active with pod assignments
    await updateContact(contact.id, {
      status: 'Active',
      list_ids: selectedPodIds,
      primary_list_id: primaryPodId,
      custom_fields: { ...contact.custom_fields, ...answers },
    })
    // 2. Write timeline entry (CAT-06)
    const podNames = selectedPodIds.map(id => pods.find(p => p.id === id)?.name ?? id)
    await createInteraction({
      contact_id: contact.id,
      type: 'note',
      date: new Date().toISOString().split('T')[0],
      notes: `Categorized into: ${podNames.join(', ')}. Primary: ${primaryPodName}.`,
    })
    // 3. Advance queue
    invalidateContactsCache()
    onCategorized(contact.id)
  } finally {
    setSaving(false)
  }
}
```

### Pod Detail Page Route (App.tsx)
```typescript
// Add alongside existing routes in App.tsx
<Route path="pod/:id" element={<PodDetailPage />} />
```

### OrbMap ListNode Navigation Change
```typescript
// ListNode.tsx — replace prop callback with useNavigate
import { useNavigate } from 'react-router'
// ...
const navigate = useNavigate()
// onClick: navigate(`/pod/${data.id}`)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Category-drill in OrbMap (nested click into sub-pods) | Navigate to `/pod/:id` detail page | Phase 12 | OrbMap becomes a top-level pod browser only; sub-pod management moves to detail page |
| All imported contacts go Active immediately | CSV imports land as Pending | Phase 12 (1-line change in csvImport.ts) | All external records require categorization before entering CRM |
| Pod = grouping label with color | Pod = behavioral container (required fields, capacity, description) | Phase 12 | Pod becomes the unit of relationship intent |
| Categories = flat grouping within pod | Sub-pods = same data, renamed UI label | Phase 12 | No migration, UI label change only |

---

## Implementation Order (Wave Recommendation)

The 16 requirements decompose naturally into 4 waves:

**Wave 1 — Data Model (no UI yet)**
- Airtable schema: add `Description` + `Capacity` to Lists table
- Airtable schema: add `Primary Pod` + `Cadence Override` to Contacts table
- TypeScript interface updates: `Pod`, `Contact`
- `airtable.ts`: `mapPod`, `mapContact`, `createPod`, `updatePod`, `getPendingContacts`
- `csvImport.ts`: set `status: 'Pending'` instead of `'Active'`
- `equity.ts`: `contactCadenceDays` reads `cadence_override` first

**Wave 2 — Pending Tray + Swipe Queue**
- `PendingTrayWidget.tsx` in Dashboard
- `CategorizationQueue.tsx` swipe overlay
- Swipe gesture (pointer events, drag/snap)
- Skip logic (requeue to array end)

**Wave 3 — Categorization Modal**
- `CategorizationModal.tsx`: pod multi-select, dynamic required fields, primary pod radio, notes
- Required field validation + disabled Save
- Save sequence: updateContact → createInteraction → advance queue
- Capacity soft-cap warning

**Wave 4 — Pod Detail Page + Orb Map Rewire**
- `PodDetailPage.tsx` at `/pod/:id`
- `PodCreateModal.tsx`
- App.tsx route additions
- OrbMap: remove category-drill, `ListNode` click → `navigate('/pod/:id')`
- `PodCapacityBadge.tsx` on `ListNode` (capacity-limited pods show fraction)

---

## Open Questions

1. **Primary Pod field — Airtable linked record vs text**
   - What we know: The app uses Airtable linked record fields (`string[]`) for all record-ID references (`list_ids`, `company_record_id`). Single-value linked records still return `string[]` from the API.
   - What's unclear: Should `primary_list_id` be a linked record field (returns `['recXXX']` — need `[0]`) or a plain text field (returns `'recXXX'` directly)?
   - Recommendation: Use single-line text field for simplicity. Document the choice in mapContact with a comment.

2. **Pod detail page: orb map entry point vs nav pill**
   - What we know: Current nav has Pulse + Map + Search. Pod detail is at `/pod/:id` — only reachable from map click or direct link.
   - What's unclear: Do users need a "Pods" nav entry for a birds-eye pods list? Context says it's at Claude's discretion.
   - Recommendation: Skip nav pill addition in Phase 12. The orb map IS the pod browser. Add a Pods nav item in Phase 16 when the full management surface exists.

3. **Categorization queue capacity warning placement**
   - What we know: D-09 says warn at add time. The categorization modal is the "add time."
   - What's unclear: Should the warning show when a pod is SELECTED in the modal, or only when the user tries to SAVE?
   - Recommendation: Show warning inline when pod is selected (on-toggle), not on save attempt. This lets user course-correct before filling out required fields.

---

## Sources

### Primary (HIGH confidence)
- Direct code audit: `src/lib/airtable.ts`, `src/lib/types.ts`, `src/lib/fieldConfig.ts`, `src/lib/equity.ts`, `src/lib/csvImport.ts`
- Direct code audit: `src/components/records/CreateRecordModal.tsx`, `src/components/records/PodFieldsWidget.tsx`
- Direct code audit: `src/components/map/OrbMap.tsx`, `src/components/map/SolidOrb.tsx`
- Direct code audit: `src/components/dashboard/Dashboard.tsx`, `src/App.tsx`
- `.planning/phases/10-data-architecture-rebuild/10-CONTEXT.md` — Status field decisions
- `.planning/phases/11-relationship-records/11-CONTEXT.md` — FieldConfig system, CreateRecordModal, PodFieldsWidget
- `.planning/phases/12-pods-overhaul-categorization/12-CONTEXT.md` — All decisions D-01 through D-18

### Secondary (MEDIUM confidence)
- REQUIREMENTS.md — POD-01 through POD-10, CAT-01 through CAT-06 (authoritative for what must be true)
- docs/design-system.md — motion curves (cubic-bezier(0.87, 0, 0.13, 1)), spacing grid, surface tokens

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all existing code audited directly
- Architecture patterns: HIGH — derived from direct reading of all relevant source files
- Airtable schema changes: HIGH — modeled after existing field patterns in the codebase
- Pitfalls: HIGH — derived from actual code patterns and decision constraints, not speculation

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable stack — no time-sensitive dependencies)
