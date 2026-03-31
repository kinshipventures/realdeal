# Phase 17: Polish + Operations - Research

**Researched:** 2026-03-30
**Domain:** React component polish, Airtable schema extension, client-side CSV export, record merge operations
**Confidence:** HIGH

## Summary

Phase 17 closes the final functional gaps before MVP-complete. All work touches existing components - no new routes, modules, or surfaces. The scope splits into three categories: small polish fixes (website links, opportunity status badge, follow-up language), data model extensions (email_2/email_3, enrichment_opt_in flag), and two new interactive flows (record merge modal, CSV export).

The codebase has mature patterns for every sub-problem here. DetailsWidget already has click-to-edit fields. RecordHeader already renders clickable contact methods. OpportunityDetail already implements status as a dropdown with styled badges. The delete flow in ContactDetail provides the confirm-modal + cache-invalidation pattern that merge should follow. RecordsList already has a bulk action bar and column visibility system that export maps onto directly.

The highest-complexity item is `mergeRecords()` in airtable.ts - it must update foreign keys across opportunities, projects, campaign contacts, and pod memberships; combine interaction arrays; write timeline events on both records; then delete the loser. This is multi-step and must be atomic in effect even though Airtable has no transactions. Order of operations matters: update all references first, combine timelines second, delete loser last.

**Primary recommendation:** Sequence plans as (1) small polish fixes + type additions, (2) multiple emails + missing-field indicators, (3) merge modal + mergeRecords(), (4) export. Merge is the riskiest item - it should ship in its own plan with explicit demo mode support.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Inline field-level indicators on record pages - empty fields that matter show a subtle "missing" state (dimmed placeholder or dotted border). No aggregate completeness score or ring.
- **D-02:** No new widget for completeness - the nurturing hub's existing "Data Hygiene" section surfaces counts, inline indicators on the record page show specifics.
- **D-03:** "Enrich" is a stub for V1 - a record-level toggle that sets an `enrichment_opt_in` flag. No actual web search API integration.
- **D-04:** Enrichment opt-in lives at the pod level. Pod-level toggle auto-opts-in all members. Individual records can opt-out. No record-level opt-in.
- **D-05:** No email metadata display - Gmail integration isn't connected. Skip for V1.
- **D-06:** Three email fields: `email` (existing, primary), `email_2`, `email_3`. No arrays, no tags. Same click-to-edit pattern in DetailsWidget.
- **D-07:** Manual merge via side-by-side comparison modal. User selects two records, picks which field values to keep per field. Interactions/timeline entries combine. One record survives, other is deleted.
- **D-08:** Merge uses union for associations - surviving record inherits all pod memberships, pipeline cards, project attachments, campaign contacts from both records. No data loss.
- **D-09:** Merge action available from: record page header dropdown (alongside delete) and Records List bulk action bar (select two records).
- **D-10:** WYSIWYG export - exports visible columns from the current filtered view.
- **D-11:** Export button lives in list toolbar (next to filters/saved views). Not a bulk selection action.
- **D-12:** Export available from all list contexts: Records List, pod detail page, project detail, pipeline view.
- **D-13:** Two export formats: CSV file download + copy-to-clipboard as tab-separated text.
- **D-14:** No new cleanup surfaces or modules. Nurturing hub's "Data Hygiene" section is sufficient.
- **D-15:** Data Hygiene row click opens the record page - inline missing-field indicators guide the user from there.
- **D-16:** Records with no pod assigned surface in Data Hygiene alongside missing required fields.
- **D-17:** Website URLs clickable in DetailsWidget (external link, same pattern as LinkedIn).
- **D-18:** Opportunity status badge visible on pipeline cards (gap from PIPE-04).
- **D-19:** Follow-up language uses instructional tone per PDF Section 9: "Consider reaching out to..." not "Overdue: contact now."

### Claude's Discretion

- Missing-field indicator visual treatment (dimmed, dotted border, placeholder text)
- Enrichment toggle placement on pod settings page
- Merge modal layout and field comparison UX
- Export button icon and placement within toolbar
- CSV column ordering and header formatting
- Clipboard copy format (tab-separated with or without headers)
- Status badge design on OpportunityCard (color, position, size)
- Website URL icon treatment in DetailsWidget

### Deferred Ideas (OUT OF SCOPE)

- AI web search enrichment (actual API integration) - V2
- Email metadata display - blocked on Gmail integration
- Near-duplicate detection (fuzzy name matching) - V2
- PDF export format - V2
- Drag-and-drop relationship hygiene module - V2
- Bulk enrichment - V2
- Sub-pod map drill-down navigation - separate
- Font verification after Lovable migration - separate
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x (in use) | Component rendering, state | Already in use |
| TypeScript | 5.x (in use) | Type safety | Already in use |
| Airtable REST API | v0 | Data persistence | Project's only data layer |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | in use | Icons (ExternalLink, Download, Merge, etc.) | All new icon needs |
| react-router | in use | Navigation, useNavigate | RecordPage header dropdown nav |

### No New Dependencies
All phase 17 work uses existing project dependencies. CSV export is a native browser operation (Blob + URL.createObjectURL). Clipboard write is `navigator.clipboard.writeText()`. No library additions needed.

**Installation:** None required.

## Architecture Patterns

### Recommended Project Structure
No new files beyond what's listed in the context. All changes are additive to existing files.

```
src/
├── lib/
│   ├── types.ts          -- Add email_2, email_3, enrichment_opt_in fields
│   └── airtable.ts       -- Add mergeRecords(), updateContact email_2/3, updatePod enrichment_opt_in
├── components/
│   ├── records/
│   │   ├── DetailsWidget.tsx       -- Multiple emails, missing-field indicators, website link
│   │   ├── RecordHeader.tsx        -- Merge action in header dropdown, email_2/3 in contact methods
│   │   └── RecordsList.tsx         -- Export button in toolbar, merge in bulk action bar
│   ├── pipelines/
│   │   └── OpportunityCard.tsx     -- Status badge
│   ├── nurturing/
│   │   └── NurturingHub.tsx        -- D-16: no-pod-assigned signal in Data Hygiene
│   └── merge/
│       └── MergeModal.tsx          -- New file: side-by-side comparison modal (one exception to no-new-files)
```

### Pattern 1: Click-to-Edit with Missing-Field Indicator
**What:** Extend the existing `field()` helper in DetailsWidget to accept a `required` prop. When required + empty, render a dimmed state with a subtle visual cue instead of the em-dash placeholder.
**When to use:** All required fields in DetailsWidget where the field is empty.
**Example:**
```typescript
// Extend existing field() helper signature
function field(key: keyof Contact, label: string, multi = false, required = false) {
  const val = (contact[key] as string | null | undefined) ?? null
  const isMissing = required && !val
  // ...
  return (
    <div
      onClick={() => setEditingField(key)}
      style={{
        fontSize: 13,
        color: val ? 'rgba(0,0,0,0.82)' : isMissing ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.28)',
        borderBottom: isMissing ? '1px dashed rgba(0,0,0,0.2)' : undefined,
        cursor: 'text',
        minHeight: 20,
      }}
    >
      {val ?? (isMissing ? 'Add...' : '\u2014')}
    </div>
  )
}
```

### Pattern 2: Clickable External Link in DetailsWidget
**What:** For `website` field, render as `<a>` when value is present instead of editable text div. Click on label area still opens edit. Add ExternalLink icon (lucide).
**When to use:** Website field only. Same pattern as LinkedIn in RecordHeader.
**Example:**
```typescript
// website field gets special rendering (non-editing state):
{val ? (
  <a
    href={val.startsWith('http') ? val : `https://${val}`}
    target="_blank"
    rel="noopener noreferrer"
    onClick={e => e.stopPropagation()}
    style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
  >
    {val} <ExternalLink size={11} />
  </a>
) : (
  <div onClick={() => setEditingField('website')} style={{ /* empty state */ }}>
    {'\u2014'}
  </div>
)}
```

### Pattern 3: Status Badge on OpportunityCard
**What:** Add a status badge below the contacts/priority row. Extract STATUS_STYLES from OpportunityDetail pattern. Only render when status != 'open' (open is the default, not worth surfacing on card).
**When to use:** OpportunityCard when opportunity.status is 'won', 'lost', or 'archived'.
**Example:**
```typescript
const STATUS_BADGE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  won:      { bg: 'hsla(140, 60%, 45%, 0.15)', color: 'hsla(140, 60%, 35%, 1)', label: 'Won' },
  lost:     { bg: 'rgba(0,0,0,0.07)',           color: 'rgba(0,0,0,0.45)',       label: 'Lost' },
  archived: { bg: 'rgba(0,0,0,0.05)',           color: 'rgba(0,0,0,0.35)',       label: 'Archived' },
}
// Render alongside priority badge, only when status !== 'open'
```

### Pattern 4: CSV Export (client-side)
**What:** Given an array of visible column IDs and filtered contact rows, build a CSV string and trigger a download via Blob. Tab-separated copy uses the same row data but joins with `\t`.
**When to use:** Export button click in RecordsList toolbar.
**Example:**
```typescript
function exportToCSV(contacts: Contact[], visibleColumns: ColumnId[]) {
  const headers = visibleColumns.map(id => COLUMNS.find(c => c.id === id)?.label ?? id)
  const rows = contacts.map(c => visibleColumns.map(col => getCellValue(c, col)))
  const csv = [headers, ...rows].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `records-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function copyToClipboard(contacts: Contact[], visibleColumns: ColumnId[]) {
  const headers = visibleColumns.map(id => COLUMNS.find(c => c.id === id)?.label ?? id).join('\t')
  const rows = contacts.map(c => visibleColumns.map(col => getCellValue(c, col)).join('\t'))
  await navigator.clipboard.writeText([headers, ...rows].join('\n'))
}
```

### Pattern 5: mergeRecords() - Operation Order
**What:** Multi-step Airtable mutation. No transactions, so order matters: update all references first, combine interactions second, write timeline events third, delete loser last.
**When to use:** MergeModal confirm action.
**Example (pseudocode - airtable.ts):**
```typescript
export async function mergeRecords(survivorId: string, loserId: string, fieldOverrides: Partial<Contact>): Promise<Contact> {
  // 1. Fetch both records for union of associations
  const [survivor, loser] = await Promise.all([
    getContacts().then(all => all.find(c => c.id === survivorId)!),
    getContacts().then(all => all.find(c => c.id === loserId)!),
  ])

  // 2. Build merged field set: fieldOverrides wins, then union of lists/categories
  const mergedListIds = [...new Set([...survivor.list_ids, ...loser.list_ids])]
  const mergedCategoryIds = [...new Set([...survivor.category_ids, ...loser.category_ids])]

  // 3. Update all opportunity relationship_ids that reference loser -> point to survivor
  // 4. Update all project relationship_ids that reference loser -> point to survivor
  // 5. Update all campaign_contacts that reference loser -> point to survivor
  // 6. Update survivor record with merged fields + union associations
  // 7. Write timeline event on survivor: { type: 'field_update', notes: 'Merged with [loser.name]' }
  // 8. Write timeline event on loser (before delete): { type: 'field_update', notes: 'Merged into [survivor.name] — record deleted' }
  // 9. Delete loser record
  // 10. Invalidate contacts cache

  invalidateContactsCache()
  return updatedSurvivor
}
```

### Anti-Patterns to Avoid
- **Delete before reference cleanup:** Don't delete the loser record before all foreign keys are updated. Airtable won't enforce referential integrity - orphaned IDs will silently break linked data.
- **Modal without escape handling:** MergeModal must use `useEscape` from escapeStack.ts. Same pattern as ContactDetail, CategorizationModal.
- **Mutating opportunity.relationship_ids client-side only:** All merge reference updates must go to Airtable, not just local state.
- **Export using hidden columns:** WYSIWYG means only `visibleColumns` (the current `visibleColumns` state from RecordsList) go into the export. Don't derive from COLUMNS.defaultVisible.
- **enrichment_opt_in on Contact record:** Decision D-04 locked this to pod level only. Don't add the field to the Contact interface.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV download trigger | Custom download utility | Native Blob + URL.createObjectURL | One-liner, zero deps, works in all modern browsers |
| Clipboard write | execCommand('copy') | navigator.clipboard.writeText() | execCommand is deprecated; async Clipboard API is the standard |
| Modal escape handling | Custom keydown listener | useEscape from escapeStack.ts | Already handles layered modals - don't duplicate |
| Optimistic updates | Complex state machine | Existing pattern in RecordPage (optimistic then revert on error) | Pattern is already battle-tested in this codebase |

**Key insight:** The codebase has a mature and consistent pattern for every operation in this phase. The work is applying existing patterns to new surfaces, not inventing new ones.

## Common Pitfalls

### Pitfall 1: Merge reference updates - partial failure
**What goes wrong:** Updating opportunity/project/campaign references involves multiple Airtable PATCH calls. If one fails mid-sequence, the data is in a partially merged state.
**Why it happens:** No transactions in Airtable REST.
**How to avoid:** Execute reference updates as Promise.all() for parallelism. Wrap entire merge in try/catch. On failure, surface error to user with "merge may be incomplete - check both records." Don't silently swallow.
**Warning signs:** One record shows merged data, the other still has stale references.

### Pitfall 2: updateContact missing email_2/email_3 fields in field map
**What goes wrong:** New fields added to Contact interface and types.ts, but the field mapping in updateContact() in airtable.ts is not updated. Saving email_2 silently does nothing.
**Why it happens:** updateContact builds its fields object with explicit `if (data.X !== undefined) fields.X = data.X` - any new field must be added here.
**How to avoid:** When adding email_2/email_3 to Contact, add corresponding Airtable field name mappings in: ContactFields interface, mapContact(), createContact(), updateContact(). All four must be updated together.
**Warning signs:** Field saves optimistically in UI, but refresh loses the value.

### Pitfall 3: Export includes all contacts, not filtered view
**What goes wrong:** Export function is called with the full contacts array instead of the post-filter `filteredContacts` array.
**Why it happens:** Easy to pass the wrong variable when RecordsList has both `contacts` (full) and the filtered/sorted result.
**How to avoid:** Export function receives the same array that's mapped to rows in the table render. Trace the data flow to confirm - it should be the post-filter, post-sort array.
**Warning signs:** Export CSV contains more rows than what's visible in the UI.

### Pitfall 4: Missing-field indicator requires knowing which fields are "required"
**What goes wrong:** DetailsWidget doesn't know which fields are required - that's in fieldConfigs (loaded by RecordPage). The widget only receives `contact` and `onUpdate`.
**Why it happens:** Field configs are loaded at RecordPage level, not widget level.
**How to avoid:** Pass `fieldConfigs` as a prop to DetailsWidget (RecordPage already has them). Or derive a simpler `requiredFieldKeys: Set<string>` from fieldConfigs at RecordPage level and pass that down. Keep DetailsWidget prop surface minimal.
**Warning signs:** Required indicator never shows because the widget doesn't know which fields are required.

### Pitfall 5: Pod-level enrichment_opt_in field doesn't exist in Airtable yet
**What goes wrong:** Calling `updatePod()` with `enrichment_opt_in: true` silently fails because the field doesn't exist in the Airtable Lists table.
**Why it happens:** New schema fields require manual creation in Airtable (or MCP tool call) before the REST API can write to them.
**How to avoid:** Document Airtable schema changes as a Wave 0 task: add "Enrichment Opt-In" (checkbox) to Lists table, add "Email 2" and "Email 3" (email type) to Contacts table. Verify field names match exactly what the code expects.
**Warning signs:** PATCH returns 422 with "Unknown field name" error.

### Pitfall 6: NurturingHub "no pod assigned" filter needs to distinguish from missing required fields
**What goes wrong:** Contacts with no pod are counted/mixed into the "missing required fields" hygiene count, inflating or confusing the number.
**Why it happens:** Both conditions surface in Data Hygiene but represent different problems.
**How to avoid:** Per D-16, "no pod assigned" is a separate signal alongside missing required fields. Show as distinct row/count in Data Hygiene, not merged into the same bucket.
**Warning signs:** User sees a hygiene count but can't tell if it's "missing fields" or "no pod."

## Code Examples

### Existing: LinkedIn clickable pattern in RecordHeader (HIGH confidence - read from source)
```typescript
// src/components/records/RecordHeader.tsx (line 135)
contact.linkedin ? {
  label: 'LinkedIn',
  href: contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`,
  external: true
} : null
// Rendered as:
<a href={m.href} target="_blank" rel="noopener noreferrer">
  {m.label}
</a>
```

### Existing: missingFieldCount computation pattern (HIGH confidence - read from source)
```typescript
// src/components/records/RecordPage.tsx (lines 114-121)
const missingFieldCount = useMemo(() => {
  if (!contact || fieldConfigs.length === 0) return 0
  return fieldConfigs.filter(fc =>
    fc.required &&
    (fc.scope_pod_id === null || contact.list_ids.includes(fc.scope_pod_id)) &&
    !contact[fc.name as keyof Contact]
  ).length
}, [contact, fieldConfigs])
```
The same filter logic drives which fields show missing-field indicators in DetailsWidget.

### Existing: Opportunity status dropdown in OpportunityDetail (HIGH confidence - read from source)
```typescript
// src/components/pipelines/OpportunityDetail.tsx (line 30)
const STATUS_OPTIONS: OpportunityStatus[] = ['open', 'won', 'lost', 'archived']
// STATUS_BADGE_STYLES pattern to extract for card:
// Each status maps to { bg, color, label } - same shape as PRIORITY_STYLES
```

### Existing: Airtable delete pattern + cache invalidation (HIGH confidence - read from source)
```typescript
// airtable.ts pattern for delete:
export async function deleteContact(id: string): Promise<void> {
  await request(`${TABLES.contacts}/${id}`, { method: 'DELETE' })
  _contactsCache = null
}
// mergeRecords() follows same cache invalidation at the end
```

### Existing: bulk action bar in RecordsList (HIGH confidence - read from source)
```typescript
// RecordsList.tsx - selectedIds Set drives bulk actions
// Merge appears when selectedIds.size === 2
// Export appears in toolbar (not bulk bar), operates on filteredContacts
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| execCommand('copy') for clipboard | navigator.clipboard.writeText() | ~2020 | async, no document focus requirement |
| URL.createObjectURL for file download | Same - still current | - | No change needed |

**Deprecated/outdated:**
- `document.execCommand('copy')`: Deprecated in modern browsers. Use `navigator.clipboard.writeText()`.

## Open Questions

1. **Pod settings page location for enrichment_opt_in toggle**
   - What we know: Pod settings are in PodDetailPage (inline edit on blur per Phase 12 decision). The toggle is Claude's discretion.
   - What's unclear: Whether a checkbox toggle fits naturally in the existing inline-edit pod settings layout.
   - Recommendation: Place as a labeled checkbox in pod settings section, same inline-edit zone as name/description/cadence. No modal needed.

2. **MergeModal entry point from record header**
   - What we know: RecordHeader has no dropdown menu currently - it shows back button, name, type/status badges, company link, and contact methods.
   - What's unclear: Whether "merge" should be an explicit button or inside a `...` overflow menu alongside delete.
   - Recommendation: Add `...` overflow dropdown to RecordHeader (same pattern as delete in ContactDetail), expose "Delete" and "Merge" as items. Keeps the header clean.

3. **Sub-pod cap claim from PDF Section 8**
   - What we know: PDF calls it "a blocker" and "critical fix" but Phase 12 scout found no enforced limit in code.
   - What's unclear: Whether this is truly a non-issue or something subtle.
   - Recommendation: Verify during implementation by checking createCategory() and any capacity checks. If no enforcement found, close as confirmed non-issue and note in commit.

## Sources

### Primary (HIGH confidence)
- Source: direct read of codebase files listed in CONTEXT.md canonical refs
  - `src/components/records/DetailsWidget.tsx` - click-to-edit pattern, field helper
  - `src/components/records/RecordHeader.tsx` - contactMethods array, LinkedIn external link pattern
  - `src/components/records/RecordPage.tsx` - missingFieldCount useMemo, fieldConfigs prop threading
  - `src/components/records/RecordsList.tsx` - column visibility, filtered contacts, bulk action bar structure
  - `src/components/pipelines/OpportunityCard.tsx` - priority badge pattern (basis for status badge)
  - `src/components/pipelines/OpportunityDetail.tsx` - STATUS_OPTIONS, status dropdown
  - `src/components/nurturing/NurturingHub.tsx` - Data Hygiene section, field config usage
  - `src/lib/types.ts` - Contact interface, Pod interface, OpportunityStatus type
  - `src/lib/airtable.ts` - mapContact, updateContact, deleteContact, cache invalidation patterns

### Secondary (MEDIUM confidence)
- MDN Web API - Clipboard API (`navigator.clipboard.writeText`) and Blob/URL.createObjectURL - standard browser APIs, no library needed
- Airtable REST API v0 - PATCH semantics for partial field updates, DELETE record

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - everything in use is already in the project
- Architecture: HIGH - all patterns derived from direct code reads
- Pitfalls: HIGH - derived from actual code structure (field map, cache pattern, prop threading)

**Research date:** 2026-03-30
**Valid until:** 2026-05-01 (stable stack, 30-day window)
