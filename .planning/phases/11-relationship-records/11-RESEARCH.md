# Phase 11: Relationship Records - Research

**Researched:** 2026-03-29
**Domain:** React SPA — record page UI, Airtable custom field management via Metadata API, conditional field rendering
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Record page layout**
- D-01: Full-page view at `/record/:id` — not a slide-out panel
- D-02: Two-column layout: scrolling timeline on the left (~60% width), stacked widget cards on the right (~40%)
- D-03: Header area contains core identity: name (editable), type badge, status badge, role + company (Contact) or industry + domain (Company), contact methods
- D-04: Mobile: collapses to single column — header, then widgets (collapsed/accordioned), then timeline

**Navigation pattern**
- D-05: Existing slide-out panels become lightweight preview cards with "Open Record" action
- D-06: Direct navigation from Cmd+K, orb map nodes, pipeline cards, campaign contacts, dashboard widgets — all go to `/record/:id`
- D-07: Back navigation via "← Back" button using browser history

**Editable fields placement**
- D-08: Core identity fields in header — click-to-edit inline
- D-09: Secondary fields in a "Details" widget card in the right column
- D-10: Pod-specific fields in their own widget cards per pod

**Conditional fields**
- D-11: Auto-hide irrelevant fields based on `record.type`. No grayed-out placeholders.
- D-12: Pod-specific fields appear only when that pod is assigned. Adding a pod reveals its field group; removing hides it.

**Contact vs Company records**
- D-13: One `RecordPage` component handles both types — conditional rendering based on `contact.type`
- D-14: Contact records show linked Company field in header; Company records show "Associated People" widget

**Company-contact linking**
- D-15: Contact's company field is a typeahead search dropdown. "+ Create [name] as company" creates inline.
- D-16: Company records show "Associated People" widget with linked contacts. "+ Add person" searches existing contacts.
- D-17: Linking updates the `Company Record` linked field in Airtable. Immediately visible on both records.

**Custom fields system**
- D-18: Custom fields are real Airtable columns created via Metadata API — queryable, visible in Airtable views
- D-19: New "Field Config" Airtable table tracks field metadata: name, Airtable field ID, field type, scope, required/optional, display order
- D-20: App reads Field Config to determine which fields to show per record based on type and pod membership
- D-21: "+ Add field" appears at bottom of each pod's field group. Inline form creates both Airtable column and Field Config record.

**Record creation**
- D-22: Type-first modal. Step 1: pick Contact or Company. Step 2: type-appropriate form.
- D-23: Contact form: first name*, last name*, email, company (typeahead), pod* (multi-select). Brain dump mode available.
- D-24: Company form: company name* (with duplicate detection), industry, domain, pod* (multi-select).
- D-25: Pod assignment required on create. No orphan records.
- D-26: Bulk creation (CRE-02) and CSV import (CRE-03) in scope as secondary flows.

### Claude's Discretion
- Widget card ordering and visual weight in the right column
- Timeline entry visual design (extend from InteractionSection or redesign)
- Exact field type options for custom field creation (which Airtable field types to expose)
- Empty state for records with no timeline entries
- Whether to add a "Field Config" migration script or create the table in the Phase 11 migration
- Responsive breakpoints for the two-column → single-column collapse

### Deferred Ideas (OUT OF SCOPE)
- Records List with filters (LIST-01 through LIST-03) — separate phase
- Categorization tray / pending intake queue (CAT-01 through CAT-06) — separate phase
- Timeline expansion beyond interactions (pod changes, field updates, pipeline events) — Phase 13
- Pipeline Kanban UI — separate phase
- Project overview page — separate phase
- AI enrichment of fields — v2.1+
- Bulk operations on records — separate phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REC-01 | User can create a Contact record with name, email, phone, role, company affiliation | `createContact()` extended with Type/Status/company_record_id fields; modal adds type-picker step |
| REC-02 | User can create a Company record with name, industry, stage, listed status, ticker, domain | Same `createContact()` with `type:'Company'`; all Company fields already in ContactFields interface |
| REC-03 | Record type controls available fields, required fields, and UI behavior | `contact.type` drives conditional rendering in RecordPage; field groups gated by type |
| REC-04 | User can associate contacts with companies via linked records | `company_record_id` linked field exists in schema; `updateContact()` writes it; bi-directional read via Airtable lookup |
| REC-05 | Each record shows all pods, timeline, linked pipelines/investments, projects, companies/people, dates, custom fields | RecordPage assembles data from contacts + interactions + fieldConfig caches; pipeline/project associations read from Airtable |
| REC-06 | Record layout includes central timeline + side widgets | Two-column RecordPage: InteractionSection in left column, widget cards in right column |
| REC-07 | Fields are type-specific AND pod-aware | Field rendering gated on `contact.type` AND `contact.list_ids` membership |
| REC-08 | Fields are conditional — only show if relevant | No rendering of irrelevant fields — hide entirely, no placeholders |
| REC-09 | Fields are grouped by pod in the record view | Pod-specific field widget cards, one per assigned pod |
| CRE-01 | User can create a single relationship manually with required fields enforced | Type-first modal; required field validation before save |
| CRE-02 | User can create multiple relationships at once | Secondary flow in modal — multi-entry mode (row-by-row) |
| CRE-03 | User can bulk import relationships via CSV | ImportPanel extension with type/pod assignment step |
| CRE-04 | No partial or invalid records allowed | Frontend validation + Airtable write-blocking on required field absence |
| FLD-01 | User can create custom fields on relationship records | Metadata API creates real Airtable columns; Field Config records track them |
| FLD-02 | Fields can be assigned by record type | Field Config `scope_type` column: 'Contact' | 'Company' | 'Both' |
| FLD-03 | Fields can be assigned by pod | Field Config `scope_pod_id` column: linked Pod record ID or null (all) |
| FLD-04 | User can mark fields as required or optional | Field Config `required` boolean column |
| FLD-05 | Pod "questions" are structured fields — answers live on the record | Custom fields stored as real Airtable columns; values on contact record |
| FLD-06 | Fields are reusable for filtering and reporting | Real Airtable columns are native Airtable filter targets; Field Config table enables app-level filtering |
</phase_requirements>

---

## Summary

Phase 11 is the first UI phase of the v2.0 rebuild and replaces the existing `ContactDetail` slide-out with a full-page record view at `/record/:id`. The data layer (Phase 10) is complete — all schema migrations ran, all TypeScript interfaces exist, all CRUD functions are live.

This phase has three implementation streams: (1) the RecordPage UI itself — a two-column layout with conditional field rendering based on record type and pod membership; (2) the record creation modal — a type-first flow extended from the existing `AddContactModal`; and (3) the custom fields system — a Field Config Airtable table that drives field visibility, backed by the Metadata API to create real Airtable columns.

The primary risk is the custom fields system. Creating Airtable fields via the Metadata API is already proven in Phase 10's migration script. The new challenge is doing it on-demand from the UI in response to user input, then reading Field Config records to drive rendering. The Field Config table itself must be created either via a migration script or inline during Phase 11 — this is Claude's discretion.

**Primary recommendation:** Build RecordPage and creation modal first (Wave 1), then add the Field Config + custom field creation system (Wave 2). The record page is valuable without custom fields; the custom field system depends on the record page existing.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-router | Already installed | `/record/:id` route | Already used in App.tsx for all routing |
| React (inline styles) | Already installed | Component rendering | Established pattern — no Tailwind, no CSS modules |
| Airtable REST API | v0 | Record reads/writes | Already the entire data layer |
| Airtable Metadata API | v0 meta | Create custom fields | Proven in Phase 10 migration script |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `escapeStack.ts` | Internal | Layered Escape key handling | All inline dropdowns (typeahead, field type picker) |
| `equity.ts` | Internal | `contactEquityScore()` / `scoreLabel()` | Relationship health widget in right column |
| `birthdays.ts` | Internal | `daysUntilBirthday()` | Important dates widget |
| `SolidOrb.tsx` + `POD_SHIFT_COLORS` | Internal | Pod color chips in header | Pod badge colors |

### Installation
No new dependencies required. All libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── records/
│   │   ├── RecordPage.tsx          # full-page view at /record/:id
│   │   ├── RecordHeader.tsx        # name, type/status badge, identity fields
│   │   ├── RecordTimeline.tsx      # wraps InteractionSection for left column
│   │   ├── RecordWidgets.tsx       # right column: stacked widget cards
│   │   ├── DetailsWidget.tsx       # secondary fields widget card
│   │   ├── PodFieldsWidget.tsx     # per-pod custom field group widget card
│   │   ├── AssociatedPeopleWidget.tsx  # Company-only: linked contacts
│   │   ├── HealthWidget.tsx        # equity score + score label
│   │   └── CreateRecordModal.tsx   # type-first creation modal
│   └── contacts/
│       ├── ContactPanel.tsx        # slimmed to preview card (existing, modify)
│       └── ContactCard.tsx         # row-level preview (existing, modify)
├── lib/
│   ├── fieldConfig.ts              # Field Config CRUD + cache (new)
│   └── airtable.ts                 # extend createContact() with v2 fields
```

### Pattern 1: Conditional field rendering based on type + pods

Fields render only when the condition is satisfied. The contact type and its `list_ids` drive which field groups appear. No `display:none` — don't render the element at all.

```tsx
// Contact-only fields
{contact.type === 'Contact' && (
  <FieldGroup label="Personal">
    <Field label="Birthday" value={contact.birthday} onSave={...} />
    <Field label="LinkedIn" value={contact.linkedin} onSave={...} />
  </FieldGroup>
)}

// Company-only fields
{contact.type === 'Company' && (
  <FieldGroup label="Organization">
    <Field label="Industry" value={contact.industry} onSave={...} />
    <Field label="Stage" value={contact.stage} onSave={...} />
    <Field label="Domain" value={contact.domain} onSave={...} />
  </FieldGroup>
)}

// Pod-specific field group — only renders when that pod is assigned
{contact.list_ids.includes(lpPodId) && (
  <PodFieldsWidget podId={lpPodId} contact={contact} fieldConfigs={fieldConfigs} />
)}
```

### Pattern 2: Click-to-edit inline field (from ContactDetail lines 172-274)

The existing `field()` helper renders a label + value that transforms into an inline input on click. Reuse this pattern for all editable fields on RecordPage.

```tsx
// Existing pattern in ContactDetail — copy and adapt
function field(label: string, key: keyof Contact, inputType: 'text' | 'email' | ...) {
  const isEditing = editingField === key
  return (
    <div onClick={() => !isEditing && setEditingField(key)}>
      <span>{label}</span>
      {isEditing
        ? <input value={draft[key] ?? ''} onChange={...} onBlur={save} autoFocus />
        : <span>{contact[key] ?? <em>—</em>}</span>
      }
    </div>
  )
}
```

### Pattern 3: Typeahead search for company linking (from SearchPalette)

The `SearchPalette` uses debounced input + keyboard navigation. Use the same pattern for the company typeahead in the creation modal and on the Contact record header.

```tsx
// Pattern: debounced search → filter contacts cache → render dropdown
const [query, setQuery] = useState('')
const [results, setResults] = useState<Contact[]>([])

useEffect(() => {
  const timer = setTimeout(async () => {
    if (query.length < 2) { setResults([]); return }
    const companies = await getContactsByType('Company')
    setResults(companies.filter(c =>
      c.name.toLowerCase().includes(query.toLowerCase())
    ))
  }, 150)
  return () => clearTimeout(timer)
}, [query])
```

### Pattern 4: Field Config table + Metadata API for custom fields

Field Config is a new Airtable table. Create it with a migration script (or inline on first `getFieldConfigs()` call). Read it on RecordPage load to determine which custom fields to render per record. On "+ Add field", call Metadata API to create the real column, then write a Field Config record.

```ts
// fieldConfig.ts — new module
interface FieldConfig {
  id: string                           // Airtable record ID
  name: string                         // display name
  airtable_field_id: string            // fldXXX — returned by Metadata API create
  field_type: 'text' | 'number' | 'select' | 'date' | 'checkbox'
  scope_type: 'Contact' | 'Company' | 'Both'
  scope_pod_id: string | null          // null = applies to all pods of this type
  required: boolean
  display_order: number
}

// Create the Airtable column first, then write Field Config record
async function createCustomField(spec: Omit<FieldConfig, 'id' | 'airtable_field_id'>) {
  // 1. Create column via Metadata API
  const field = await metaRequest(`bases/${BASE_ID}/tables/${TABLES.contacts}/fields`, {
    method: 'POST',
    body: JSON.stringify({ name: spec.name, type: airtableTypeMap[spec.field_type] }),
  })
  // 2. Write Field Config record
  await request(TABLES.fieldConfig, {
    method: 'POST',
    body: JSON.stringify({ fields: { ...spec, 'Airtable Field ID': field.id } }),
  })
  _fieldConfigCache = null
}
```

**Airtable field type mapping for custom fields:**
| App type | Airtable type |
|----------|---------------|
| text | singleLineText |
| multiline | multilineText |
| number | number |
| select | singleSelect |
| date | date |
| checkbox | checkbox |

### Pattern 5: Route-level data loading for RecordPage

RecordPage at `/record/:id` loads the contact by ID from the contacts cache. No new fetch function needed — `getContacts()` returns all contacts including Company records.

```tsx
// RecordPage.tsx
export function RecordPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getContacts().then(all => {
      const found = all.find(c => c.id === id)
      setContact(found ?? null)
      setLoading(false)
    })
  }, [id])

  if (loading) return <Spinner />
  if (!contact) return <EmptyState heading="Record not found" />

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '60fr 40fr', gap: 24, padding: 32 }}>
      <div> {/* Left: header + timeline */}
        <RecordHeader contact={contact} onUpdate={setContact} />
        <RecordTimeline contact={contact} onContactUpdated={setContact} />
      </div>
      <div> {/* Right: stacked widget cards */}
        <RecordWidgets contact={contact} onUpdate={setContact} />
      </div>
    </div>
  )
}
```

### Pattern 6: Preview card migration for ContactPanel

ContactPanel and ContactCard need to slim down to preview cards. The full record opens via navigation, not a prop-passed component. This is a simplification — remove the heavy JSX, keep the contact list, add a single "Open Record" button.

```tsx
// ContactCard.tsx — new shape
function ContactCard({ contact }: { contact: Contact }) {
  const navigate = useNavigate()
  return (
    <div style={rowStyle}>
      <Avatar contact={contact} />
      <div>
        <strong>{contact.name}</strong>
        <span>{contact.role ?? contact.industry}</span>
      </div>
      <button onClick={() => navigate(`/record/${contact.id}`)}>Open</button>
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Opening a new ContactDetail slide-out from RecordPage:** RecordPage IS the detail view. Navigation replaces overlays.
- **Storing field visibility rules in component state:** Field Config is the source of truth. Don't hardcode pod field conditions.
- **Writing v2 fields in createContact() without updating the function:** The current `createContact()` doesn't write Type, Status, or company_record_id — this MUST be fixed as part of this phase.
- **Fetching field configs on every render:** Cache them. `_fieldConfigCache` follows the same stale-while-revalidate pattern as contacts.
- **Using grayed-out placeholder fields:** D-11 is explicit — auto-hide, don't disable.
- **Linking company to contact via text field:** Always use `company_record_id` (the linked field). The text `company` field is backward-compat only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Typeahead debounce | Custom debounce hook | `setTimeout` in `useEffect` (already in SearchPalette) | Already proven, 3 lines |
| Escape key layering | Custom event listener | `useEscape(stableCallback)` from `escapeStack.ts` | Existing layered stack handles modal + dropdown conflicts |
| Equity score display | Custom scoring | `contactEquityScore()` + `scoreLabel()` from `equity.ts` | Already handles all interaction types + weights |
| Airtable field creation | Direct fetch with custom headers | `metaRequest()` pattern from migrateSchema.ts | Rate-limit handling, auth, base URL already there |
| Click-outside detection for dropdowns | Custom `mousedown` listener | `useRef` + blur on input | Simpler, no global listener needed |
| Pod color lookup | Map in component | `POD_SHIFT_COLORS` from `SolidOrb.tsx` | Canonical color system, already used everywhere |

**Key insight:** The codebase already has every primitive needed. The work is assembly and extension, not invention.

---

## Common Pitfalls

### Pitfall 1: `createContact()` missing v2 fields
**What goes wrong:** New records created via the modal have `type: undefined`, `status: undefined`, `company_record_id: undefined` — Airtable stores them as blank, existing `getContactsByType()` filter breaks.
**Why it happens:** The current `createContact()` (airtable.ts line 376) doesn't include the v2 fields in the write payload. Phase 10 added the interfaces but didn't update the write path.
**How to avoid:** First task in Phase 11 is extending `createContact()` and `updateContact()` to include `Type`, `Status`, `Company Record`, `Industry`, `Stage`, `Ticker`, `Domain` in the Airtable field payload.
**Warning signs:** Company records appear in `getContactsByType('Contact')` calls; new records show blank type in Airtable.

### Pitfall 2: Company Record linked field returns array
**What goes wrong:** `contact.company_record_id` is set by reading `r.fields['Company Record']?.[0]` (first element of array). When writing, Airtable expects the linked field value as an array: `'Company Record': [companyId]`. Passing a string causes a 422 error.
**Why it happens:** All Airtable linked record fields are arrays, even when single. Established in the codebase (see CategoryFields, OpportunityFields etc. — all use `string[]` for linked fields).
**How to avoid:** Always write `'Company Record': data.company_record_id ? [data.company_record_id] : undefined`.
**Warning signs:** PATCH request returns 422 with "Invalid value for field" error.

### Pitfall 3: Field Config table doesn't exist yet
**What goes wrong:** `getFieldConfigs()` is called before the Field Config table exists in Airtable — returns 404.
**Why it happens:** Phase 10 migration only created Pipelines, PipelineStages, Opportunities, Projects. Field Config is a Phase 11 addition.
**How to avoid:** Create the Field Config table in a Phase 11 migration script (Wave 1 Task 1) before any UI code reads it. The idempotent `createTableIfMissing()` pattern from Phase 10 applies directly.
**Warning signs:** `getFieldConfigs()` throws "Table not found" or returns 404.

### Pitfall 4: Navigation wires not updated — search/map still opens slide-out
**What goes wrong:** Cmd+K search, OrbMap node clicks, and dashboard widgets still open `ContactDetail` slide-out instead of navigating to `/record/:id`.
**Why it happens:** `App.tsx` (line 226-242) hardcodes `<ContactDetail>` for search selections. `OrbMap.tsx` and other components have their own handlers.
**How to avoid:** Plan a dedicated "wire navigation" task that touches App.tsx, SearchPalette callback, OrbMap node click handlers, and any other ContactDetail usages. Use `grep` to find all `<ContactDetail` usages before writing code.
**Warning signs:** Build succeeds but clicking a contact in search opens old slide-out rather than navigating.

### Pitfall 5: RecordPage renders before contact is loaded — null ref crash
**What goes wrong:** `contact.type` accessed on first render before data loads, throws cannot read property of null.
**Why it happens:** Airtable fetch is async; `contact` starts as `null`.
**How to avoid:** Guard with loading state. Show `<Spinner />` until contact is non-null.
**Warning signs:** "Cannot read properties of null" in console on first load.

### Pitfall 6: Metadata API rate limit during custom field creation
**What goes wrong:** User rapidly adds multiple custom fields, hitting Airtable's 5 req/s limit.
**Why it happens:** Each "+ Add field" creates two API calls (Metadata API + record create). Back-to-back creates exceed rate limit.
**How to avoid:** Disable the "+ Add field" button while a create is in-flight. Single-field creation per save action.
**Warning signs:** 429 errors from Metadata API endpoint.

---

## Code Examples

### Extend createContact() with v2 fields
```ts
// src/lib/airtable.ts — add to createContact() field payload
export async function createContact(data: Omit<Contact, 'id' | 'created_at'>): Promise<Contact> {
  // ... existing code ...
  body: JSON.stringify({
    fields: {
      // ... existing fields ...
      Type: data.type ?? 'Contact',
      Status: data.status ?? 'Active',
      'Company Record': data.company_record_id ? [data.company_record_id] : undefined,
      Industry: data.industry ?? undefined,
      Stage: data.stage ?? undefined,
      Ticker: data.ticker ?? undefined,
      Domain: data.domain ?? undefined,
    }
  })
  // ... existing code ...
}
```

### Metadata API call pattern (from Phase 10 migrateSchema.ts)
```ts
// metaRequest is already established in the codebase — reuse it
const META_URL = `https://api.airtable.com/v0/meta/bases/${import.meta.env.VITE_AIRTABLE_BASE_ID}`

async function metaRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${META_URL}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) throw new Error(`Meta API ${res.status}: ${await res.text()}`)
  return res.json()
}
```

### Two-column RecordPage layout
```tsx
// RecordPage layout — CSS Grid, no Tailwind
<div style={{
  display: 'grid',
  gridTemplateColumns: '1fr',  // mobile: single column
  gap: 0,
  minHeight: '100vh',
  background: 'var(--color-bg)',
}}>
  {/* Header spans full width */}
  <RecordHeader contact={contact} onUpdate={setContact} />

  {/* Two-column body — desktop only */}
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'clamp(400px, 60%, 1fr) clamp(280px, 40%, 400px)',
    gap: 24,
    padding: '24px 32px',
    alignItems: 'start',
  }}>
    <RecordTimeline contact={contact} onContactUpdated={setContact} />
    <RecordWidgets contact={contact} fieldConfigs={fieldConfigs} onUpdate={setContact} />
  </div>
</div>
```

### Company duplicate detection
```ts
// Case-insensitive match against existing Company records — same pattern as Phase 10 migration
async function findDuplicateCompany(name: string): Promise<Contact | null> {
  const companies = await getContactsByType('Company')
  const key = name.toLowerCase().trim()
  return companies.find(c => c.name.toLowerCase().trim() === key) ?? null
}
```

### Field Config CRUD — new module
```ts
// src/lib/fieldConfig.ts
let _fieldConfigCache: FieldConfig[] | null = null

export async function getFieldConfigs(): Promise<FieldConfig[]> {
  if (isDemoMode()) return DEMO_FIELD_CONFIGS
  if (_fieldConfigCache) return _fieldConfigCache
  const records = await fetchAll<FieldConfigFields>(TABLES.fieldConfig)
  _fieldConfigCache = records.map(mapFieldConfig)
  return _fieldConfigCache
}

export function getFieldConfigsForRecord(
  configs: FieldConfig[],
  type: RelationshipType,
  podIds: string[]
): FieldConfig[] {
  return configs.filter(fc => {
    const typeMatch = fc.scope_type === 'Both' || fc.scope_type === type
    const podMatch = fc.scope_pod_id === null || podIds.includes(fc.scope_pod_id)
    return typeMatch && podMatch
  })
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ContactDetail slide-out panel | RecordPage full-page at `/record/:id` | Phase 11 | All navigation wires must be updated |
| `company: string` text field | `company_record_id` linked field | Phase 10 | Old text field kept for backward compat; new code should read/write linked field |
| No record types | `type: 'Contact' | 'Company'` on Contact interface | Phase 10 | All reads need to handle both; renders need conditional branching |
| No custom fields | Field Config table + Metadata API | Phase 11 (new) | Custom fields are queryable in Airtable natively |

**Deprecated/outdated:**
- `ContactDetail` as the canonical record view: replaced by `RecordPage`. ContactDetail becomes dead code after this phase; can be removed or kept as slide-out shell for previews.
- `category_ids` as the primary grouping mechanism: pods (`list_ids`) are now the canonical organization unit. Categories still exist but are subordinate.

---

## Implementation Waves

Phase 11 should be planned in two waves:

**Wave 1 — RecordPage + Creation Modal (core, no custom fields)**
1. Extend `createContact()` / `updateContact()` in airtable.ts with v2 fields (Type, Status, Company Record, Industry, Stage, Ticker, Domain)
2. Create Field Config table in Airtable (migration script, idempotent)
3. Build `RecordPage` — header, two-column layout, conditional field rendering, InteractionSection in left column
4. Wire navigation: App.tsx, SearchPalette, OrbMap, ContactPanel → all route to `/record/:id`
5. Extend `AddContactModal` → `CreateRecordModal` with type-picker step + Company form
6. Company-contact linking: typeahead on Contact header + "Associated People" widget on Company

**Wave 2 — Custom Fields System**
7. Build `fieldConfig.ts` module: Field Config CRUD, cache, `getFieldConfigsForRecord()` filter
8. Build PodFieldsWidget — reads Field Config, renders pod-specific fields per assigned pod
9. Build "+ Add field" inline form — calls Metadata API + writes Field Config record
10. Wire custom field values to `updateContact()` (dynamic field key write)
11. Demo data for Field Config (`DEMO_FIELD_CONFIGS`)

---

## Open Questions

1. **Field Config table ID**
   - What we know: Table must be created via migration before app reads it
   - What's unclear: Table ID is only known after creation (like pipelines/projects in Phase 10)
   - Recommendation: Wave 1 task creates the table, stores ID in `TABLES` constant. Plan the fieldConfig task as Wave 1 blocker.

2. **Custom field value storage — dynamic key reads**
   - What we know: Custom fields are real Airtable columns; values live on the contact record
   - What's unclear: TypeScript type for `contact[dynamicFieldId]` — Contact interface doesn't include custom field keys
   - Recommendation: Store custom field values in a `custom_fields: Record<string, unknown>` bag on the Contact interface. The mapper reads all fields not in the static ContactFields interface and puts them there. Alternatively, fetch the record raw and read the field directly by `airtable_field_id`.

3. **CRE-02 bulk creation UX**
   - What we know: Multi-entry mode is in scope as a secondary flow (D-26)
   - What's unclear: Whether it's row-by-row in the same modal, or a separate bulk-import-style UI
   - Recommendation: Row-by-row in modal. Each row is a mini Contact/Company form. "+ Add another" appends a row. Save all writes sequentially. No parallel Airtable writes (rate limit).

4. **RecordPage back navigation from search**
   - What we know: D-07 specifies "← Back" button using browser history
   - What's unclear: If user arrives from Cmd+K (which doesn't push to history traditionally), where does "Back" go?
   - Recommendation: `navigate(-1)` works correctly when SearchPalette uses `navigate('/record/:id')` instead of state. Confirm navigation wires push to history stack.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `src/lib/airtable.ts`, `src/lib/types.ts`, `src/components/contacts/ContactDetail.tsx`, `src/components/contacts/InteractionSection.tsx`, `src/components/contacts/AddContactModal.tsx`, `src/App.tsx`
- Phase 10 summaries: `10-01-SUMMARY.md`, `10-02-SUMMARY.md` — confirmed schema migration complete, Metadata API pattern established
- CONTEXT.md decisions D-01 through D-26 — locked implementation choices
- `docs/design-system.md` — design tokens, typography, spacing

### Secondary (MEDIUM confidence)
- Airtable REST API field type strings verified against Phase 10 migration script (which ran successfully): `singleLineText`, `multilineText`, `number`, `singleSelect`, `date`, `checkbox`

### Tertiary (LOW confidence)
- None — all findings grounded in live codebase and executed Phase 10 work

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, all patterns already established in codebase
- Architecture: HIGH — RecordPage pattern directly extends ContactDetail; Field Config directly extends Phase 10 Metadata API usage
- Pitfalls: HIGH — `createContact()` v2 field gap is observable in current code; linked field array format is established in codebase

**Research date:** 2026-03-29
**Valid until:** Stable — no external dependencies; validity tied to Airtable API stability (very stable)
