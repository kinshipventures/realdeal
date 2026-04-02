# Phase 19: Enrichment + Follow-ups - Research

**Researched:** 2026-04-01
**Domain:** Contact enrichment (stub/edge function), follow-up CRUD, dashboard surfacing
**Confidence:** HIGH

## Summary

Phase 19 adds two per-contact capabilities: manual enrichment that auto-fills empty fields via a stubbed Supabase Edge Function, and follow-up CRUD (set/edit/complete) surfaced on the dashboard and nurturing hub. Both features have full schema support already in `Contact` (`next_follow_up_date`, `next_action`, `linkedin`, `company`, etc.) and `Pod` (`enrichment_opt_in`). All required `updateContact()` fields are already in the directFields allowlist. The timeline system (`logSystemEvent()` with `field_update` type) is ready for enrichment before/after logging and follow-up completion logging.

The only new infrastructure is a Supabase Edge Function (`enrich-contact`) -- the project already has one Edge Function (`airtable-proxy`) that establishes the pattern: Deno.serve, CORS headers, JSON body in/out. The stub function generates deterministic mock data server-side without any external API key.

Follow-up features are purely client-side: `updateContact()` writes `next_follow_up_date`/`next_action`, `logSystemEvent()` logs completion, and existing widgets (ComingUpWidget, NeedsAttentionWidget) need small additions to surface overdue items. The nurturing hub NurturingRow needs a calendar icon action alongside existing quick-log buttons, expanding to an inline date + action text form.

**Primary recommendation:** Build follow-up CRUD first (pure client-side, zero new infrastructure), then layer on the enrichment edge function and field-level indicator UI.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Manual "Enrich" button on contact detail -- user deliberately triggers enrichment per contact
- **D-02:** No background/automatic enrichment -- manual only for Phase 19
- **D-03:** Pod-level `enrichment_opt_in` toggle gates which contacts can be enriched
- **D-04:** Broad field coverage -- company, LinkedIn, role, website, location, specialization, and other existing Contact fields
- **D-05:** Only fills fields that are currently empty by default
- **D-06:** When a field already has a value and enrichment finds different data, show a "suggested update" the user can accept or reject per field
- **D-07:** Small indicator next to each individual field that was auto-filled (not a single contact-level badge)
- **D-08:** Before/after values logged to contact timeline as `field_update` system event with `event_detail` JSON
- **D-09:** Stub/mock data source for Phase 19
- **D-10:** Architecture: Supabase Edge Function interface so a real provider plugs in with one swap
- **D-11:** Edge function keeps API keys server-side, client calls the function endpoint
- **D-12:** Manual trigger + user review flow addresses "anti-feature" concern
- **D-13:** Nurturing hub rows get an inline calendar icon alongside existing quick-log buttons
- **D-14:** Clicking calendar icon expands inline date picker + action text field on that row
- **D-15:** Contact detail pinned bar becomes editable -- click date or action text to edit inline
- **D-16:** When no follow-up exists, show "Set follow-up" button in pinned bar area
- **D-17:** Completing a follow-up clears `next_follow_up_date` and `next_action` on the contact
- **D-18:** Completion logs to the contact timeline (FLW-04)
- **D-19:** No auto-prompt for next follow-up
- **D-20:** Overdue follow-ups appear in NeedsAttentionWidget with red date styling
- **D-21:** Overdue follow-ups also remain in ComingUpWidget sorted to top with distinct visual treatment
- **D-22:** Nurturing hub "needs attention" section surfaces overdue follow-ups alongside cadence-overdue contacts
- **D-23:** Overdue follow-ups are a stronger signal than cadence-overdue

### Claude's Discretion

- Enrichment button placement and styling within contact detail
- Mock enrichment data generation strategy
- Edge function interface contract (request/response shape)
- Follow-up date picker component choice
- Timeline event formatting for enrichment and follow-up entries
- How "suggested update" accept/reject UI works (inline diff, modal, etc.)

### Deferred Ideas (OUT OF SCOPE)

- Relationship intelligence algorithm (own phase ~24)
- Real enrichment provider (Apollo, People Data Labs, etc.)
- Bulk enrichment
- Auto-prompt for next follow-up after completing one
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ENR-01 | System can auto-fill company info, LinkedIn, and role from a web enrichment API | Edge function stub returns mock data for all enrichable fields; `updateContact()` directFields already includes all target fields |
| ENR-02 | Every enrichment change is logged to the contact's timeline with before/after values | `logSystemEvent()` with `field_update` type and `event_detail` JSON already exists in `timeline.ts` |
| ENR-03 | Enrichment only runs for contacts/pods where opt-in is enabled | `Pod.enrichment_opt_in` field exists, toggle rendered in PodDetailPage; client checks before calling edge function |
| ENR-04 | AI-filled fields are visually marked as enriched | Per-field indicator state stored in component (or contact `custom_fields`); small badge/dot next to field label |
| FLW-01 | User can set a follow-up date and next action on any record | `Contact.next_follow_up_date` and `Contact.next_action` exist; `updateContact()` accepts both; pinned bar in ContactDetail needs edit mode |
| FLW-02 | Due and overdue follow-ups surface on the dashboard | ComingUpWidget already renders follow-up items; NeedsAttentionWidget needs overdue follow-up row variant |
| FLW-03 | Nurturing hub shows a "create follow-up" action that sets date + action inline | NurturingRow gets a calendar icon button; expand pattern matches existing `showLog` inline picker pattern |
| FLW-04 | Completing a follow-up logs it to the timeline | `logSystemEvent()` call on complete, then `updateContact()` to clear fields |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase Edge Functions (Deno) | current (project) | Server-side enrichment endpoint | Already in project -- `airtable-proxy` function establishes exact pattern |
| React state + `<input type="date">` | (React 18, project) | Inline date picker for follow-up | Zero-dependency native date input; consistent with existing `logDate` pattern in InteractionSection |
| `logSystemEvent()` (`src/lib/timeline.ts`) | (project) | Timeline logging for enrichment + follow-up events | Already handles `field_update` type with `event_detail` JSON |
| `updateContact()` (`src/lib/airtable.ts`) | (project) | Persist follow-up fields and enriched fields | `next_follow_up_date`, `next_action`, and all enrichable fields are in directFields allowlist |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `supabase.functions.invoke()` | (project Supabase client) | Call edge function from browser | Client-side enrichment trigger -- replaces raw fetch for auth token propagation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `<input type="date">` | react-datepicker, react-day-picker | External libs add bundle weight; native input matches existing InteractionSection pattern and is sufficient for a single date field |
| Per-field enrichment badge in component state | Storing enriched fields in `custom_fields` JSON | Component state is simpler and sufficient for Phase 19 -- `custom_fields` approach would persist across sessions but adds schema coupling that the real provider swap may change |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Project Structure
```
supabase/functions/enrich-contact/
  index.ts            # edge function -- stub enrichment provider
src/lib/
  enrichment.ts       # client: callEnrichFunction(), field merging logic, enriched-fields tracking
src/components/contacts/
  ContactDetail.tsx   # add Enrich button, per-field indicators, suggested-update UI, editable pinned bar
src/components/nurturing/
  NurturingRow.tsx    # add calendar icon + inline follow-up form
src/components/dashboard/widgets/
  NeedsAttentionWidget.tsx  # add overdue follow-up rows
  ComingUpWidget.tsx        # add overdue visual treatment (red date)
```

### Pattern 1: Supabase Edge Function (Deno) -- established by airtable-proxy

**What:** Deno.serve handler with CORS preflight, JSON body in, JSON out. Function deployed to `supabase/functions/<name>/index.ts`.
**When to use:** Any server-side operation needing secret keys or external HTTP calls.

```typescript
// Source: supabase/functions/airtable-proxy/index.ts (existing project pattern)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  const { contactId, name, email } = await req.json()
  // ... generate stub enrichment data
  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
```

**Client call pattern using supabase.functions.invoke:**
```typescript
// Source: Supabase JS client docs
const { data, error } = await supabase.functions.invoke('enrich-contact', {
  body: { contactId, name, email, company },
})
```

### Pattern 2: Inline expand on NurturingRow -- established by showLog pattern

**What:** Boolean `showFollowUp` state, toggled by calendar icon. Expanded area renders date input + text input + save/cancel buttons inline below the row.
**When to use:** Zero-navigation action from the nurturing hub -- same `showLog` expand pattern already in NurturingRow.

```typescript
// Matches existing showLog expand in NurturingRow.tsx
const [showFollowUp, setShowFollowUp] = useState(false)
const [followUpDate, setFollowUpDate] = useState('')
const [followUpAction, setFollowUpAction] = useState('')
```

### Pattern 3: editingField click-to-edit -- established by ContactDetail

**What:** `editingField` state tracks which field is active; click sets editing mode, blur saves via `updateContact()`.
**When to use:** Inline editable fields in ContactDetail. Reuse for pinned follow-up bar editing.

```typescript
// Source: src/components/contacts/ContactDetail.tsx line 103
const [editingField, setEditingField] = useState<keyof Contact | null>(null)
// click date chip -> setEditingField('next_follow_up_date')
// blur -> save via updateContact(), setEditingField(null)
```

### Pattern 4: logSystemEvent for enrichment + follow-up completion

**What:** `logSystemEvent()` in `timeline.ts` creates an `Interaction` record of type `field_update`. For enrichment, `event_detail` holds `{ fields: { company: { before: null, after: 'Acme' }, ... } }`. For follow-up completion, `event_detail` holds `{ action: 'Call about deal', date: '2026-04-15' }`.
**When to use:** Any automated or system-driven change that should appear in the timeline.

```typescript
// Source: src/lib/timeline.ts
await logSystemEvent({
  contactId: contact.id,
  type: 'field_update',
  detail: {
    source: 'enrichment',
    fields: { company: { before: null, after: 'Kinship Ventures' } },
  },
  notes: 'Enriched: company',
})
```

### Pattern 5: Enrichment opt-in gate (client-side)

**What:** Before calling the edge function, check that the contact's pods all have `enrichment_opt_in: true`. If none do, show a disabled button with a tooltip.
**When to use:** ENR-03 enforcement -- gate runs client-side for immediate feedback, edge function can also validate as a secondary guard.

### Anti-Patterns to Avoid
- **Polling for enrichment result:** The stub is synchronous -- no need for polling. Real provider swap may need async job pattern, but that's a deferred concern.
- **Storing enriched-field markers in Supabase:** For Phase 19 (stub), component state tracking which fields were enriched in the current session is sufficient. Do not add a DB column for enriched_fields until a real provider is connected.
- **Auto-saving follow-up on every keystroke:** Use explicit save action (Save button or Enter key) -- not onChange auto-save -- to avoid partial writes during typing.
- **Clearing follow-up on any interaction log:** `logInteraction()` already does NOT clear follow-up fields (confirmed in airtable.ts line 503-507). Only explicit "complete" action should clear them.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Server-side secret isolation | Custom proxy route | Supabase Edge Function | Pattern already established by airtable-proxy; Deno env vars keep keys server-side |
| Timeline event logging | Custom interaction writer | `logSystemEvent()` in timeline.ts | Already handles field_update type with event_detail JSON exactly as needed |
| Follow-up field persistence | Custom Supabase query | `updateContact()` | Both `next_follow_up_date` and `next_action` already in directFields allowlist |
| Date input | Date picker library | `<input type="date">` | Native input; same pattern used for `logDate` in InteractionSection.tsx |

**Key insight:** The schema, cache, and timeline infrastructure are fully in place. This phase is UI + one new edge function -- avoid duplicating what already exists.

## Common Pitfalls

### Pitfall 1: Enrichment triggers on non-opted-in pods
**What goes wrong:** User clicks Enrich on a contact in a pod where `enrichment_opt_in` is false. Enrichment runs silently, violating ENR-03.
**Why it happens:** Contact belongs to multiple pods; checking `contact.list_ids.some(id => pod.enrichment_opt_in)` can pass if any pod has opt-in, not all.
**How to avoid:** Define the rule: enrichment is allowed if the contact is in AT LEAST ONE opted-in pod (not all). Make this rule explicit in the gating check. Expose a disabled-state button with a tooltip when no pods are opted in.
**Warning signs:** Enrichment running when `enrichment_opt_in: false` on all contact pods.

### Pitfall 2: Suggested-update accept/reject loses original value
**What goes wrong:** User opens the suggested-update UI for a field that already has a value. They reject the suggestion. The original value has been overwritten.
**Why it happens:** Applying enrichment data before user confirms.
**How to avoid:** Hold enrichment results in component state (never write to contact until user confirms). Only call `updateContact()` on explicit accept.
**Warning signs:** Original field values not restored after rejection.

### Pitfall 3: Follow-up date timezone shift
**What goes wrong:** User sets 2026-04-15, it saves as 2026-04-14 due to UTC conversion.
**Why it happens:** `new Date('2026-04-15')` parses as UTC midnight, which is the previous day in US timezones.
**How to avoid:** Use `new Date(date + 'T00:00:00')` for display (already done in ContactDetail line 889). For comparison (overdue check), compare ISO date strings directly without Date constructor: `contact.next_follow_up_date < today.toISOString().slice(0, 10)`.
**Warning signs:** Follow-up shows as overdue one day early.

### Pitfall 4: Contact cache stale after enrichment mutation
**What goes wrong:** Enrichment updates contact fields via `updateContact()`. The contacts cache still has stale values. Dashboard widgets show old data.
**Why it happens:** `updateContact()` does patch the in-memory cache (`_contactsCache[idx] = updated`) -- but only if the cache entry exists. If cache has been invalidated between load and mutation, the updated contact is not written back.
**How to avoid:** After `updateContact()` returns the updated contact, call the `onContactUpdated` callback (already in ContactDetail pattern) to push the fresh contact to parent state.
**Warning signs:** Fields in parent view don't reflect enrichment results after modal/panel re-render.

### Pitfall 5: Edge function not deployed / local dev mismatch
**What goes wrong:** Edge function works in production (Supabase cloud) but `supabase.functions.invoke()` fails locally because the function isn't running.
**Why it happens:** First edge function beyond airtable-proxy; dev may not be running `supabase functions serve`.
**How to avoid:** For Phase 19 (stub), fall back gracefully: if the edge function call fails, surface an inline error on the Enrich button. Document the local dev command in plan tasks.
**Warning signs:** Enrichment throws a network error locally but works on Vercel.

## Code Examples

### Enrichment edge function stub
```typescript
// supabase/functions/enrich-contact/index.ts
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const { name, email, company } = await req.json()
  // Deterministic stub -- real provider replaces this block
  const stub = {
    company: company ?? `${name?.split(' ')[1] ?? 'Ventures'} Co.`,
    role: 'Partner',
    linkedin: `https://linkedin.com/in/${name?.toLowerCase().replace(' ', '-') ?? 'contact'}`,
    website: null,
    location: 'San Francisco, CA',
    specialization: null,
  }
  return new Response(JSON.stringify({ ok: true, data: stub }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
```

### Overdue follow-up check (string comparison -- no Date constructor)
```typescript
// Safe: string comparison avoids timezone shift
function isFollowUpOverdue(contact: Contact): boolean {
  if (!contact.next_follow_up_date) return false
  const today = new Date().toISOString().slice(0, 10)  // 'YYYY-MM-DD'
  return contact.next_follow_up_date < today
}
```

### Follow-up completion handler
```typescript
// Source: timeline.ts + airtable.ts patterns
async function handleCompleteFollowUp(contact: Contact) {
  await logSystemEvent({
    contactId: contact.id,
    type: 'field_update',
    detail: {
      source: 'follow_up_completed',
      action: contact.next_action,
      date: contact.next_follow_up_date,
    },
    notes: `Follow-up completed: ${contact.next_action ?? 'Follow up'}`,
  })
  const updated = await updateContact(contact.id, {
    next_follow_up_date: null,
    next_action: null,
  })
  onContactUpdated(updated)
}
```

### Per-field enrichment indicator (component state approach)
```typescript
// In ContactDetail component
const [enrichedFields, setEnrichedFields] = useState<Set<keyof Contact>>(new Set())

// After accepting enrichment for a field:
setEnrichedFields(prev => new Set([...prev, 'company']))

// In field renderer -- small dot next to label:
{enrichedFields.has(key) && (
  <span title="AI-enriched" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-brand)', display: 'inline-block' }} />
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Airtable REST data layer | Supabase (Postgres + realtime) | Phase 22 | `updateContact()` now calls `supabase.from('contacts').update()` -- no Airtable REST involved |
| Single pinned follow-up bar (read-only) | Editable pinned bar with set/edit/complete | Phase 19 | Requires editing mode state in ContactDetail |
| No enrichment surface | Manual Enrich button + field indicators | Phase 19 | First enrichment UX -- stub only |

**Deprecated/outdated:**
- `supabase/` directory references to Airtable proxy: the `airtable-proxy` edge function is legacy from the migration period. Do not use as a model for authentication pattern -- the `enrich-contact` function should validate the caller's JWT using `supabase.auth.getUser()` from the Deno Supabase client if auth enforcement is needed.

## Open Questions

1. **Enrichment opt-in gate: ANY vs ALL pods**
   - What we know: Contact can belong to multiple pods with mixed `enrichment_opt_in` values
   - What's unclear: Should enrichment require all pods to be opted in, or any one?
   - Recommendation: Allow if ANY pod is opted in -- this is less restrictive and more useful. Show a tooltip listing which pods are opted in.

2. **Suggested-update UI surface**
   - What we know: D-06 says "accept or reject per field" -- but the UI pattern is at Claude's discretion
   - What's unclear: Inline diff within the field row vs. a review section at the bottom of the contact form
   - Recommendation: Inline approach -- directly below each field that has a suggested change, show a two-row diff (current value vs suggested) with Accept/Keep buttons. This is lower cognitive load than a separate review section.

3. **Per-field enrichment indicator persistence across sessions**
   - What we know: Component state resets on page reload
   - What's unclear: Does Moj need to see "this field was enriched" after closing and reopening contact detail?
   - Recommendation: For Phase 19, session-only is fine. The timeline entry (ENR-02) provides the permanent record. Do not add a DB column until the real provider is connected and the UX is validated.

4. **Edge function local dev**
   - What we know: `supabase functions serve` runs functions locally on port 54321
   - What's unclear: Whether Vercel prod deploy auto-deploys edge functions or requires `supabase functions deploy`
   - Recommendation: Plan task should include `supabase functions deploy enrich-contact` as a manual step, separate from the Vercel deploy.

## Sources

### Primary (HIGH confidence)
- `src/lib/airtable.ts` - updateContact directFields allowlist, cache invalidation pattern, logInteraction (no follow-up clear)
- `src/lib/timeline.ts` - logSystemEvent implementation, field_update type, event_detail shape
- `src/lib/types.ts` - Contact type (next_follow_up_date, next_action, linkedin, enrichment fields), Pod.enrichment_opt_in
- `src/components/contacts/ContactDetail.tsx` - editingField pattern, pinned bar location (line 868), blur-save
- `src/components/nurturing/NurturingRow.tsx` - showLog inline expand pattern, ghost button style, LOG_TYPES
- `src/components/dashboard/widgets/ComingUpWidget.tsx` - UpcomingItem type, follow-up rendering already present
- `src/components/dashboard/widgets/NeedsAttentionWidget.tsx` - OverdueRow pattern, props interface
- `supabase/functions/airtable-proxy/index.ts` - established Deno edge function pattern (CORS, JSON in/out)
- `.planning/phases/19-enrichment-followups/19-CONTEXT.md` - locked decisions D-01 through D-23

### Secondary (MEDIUM confidence)
- Supabase edge function docs pattern inferred from existing airtable-proxy and standard Deno.serve API

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all patterns verified against existing project code
- Architecture: HIGH - follows established codebase conventions (editingField, showLog, logSystemEvent)
- Pitfalls: HIGH - derived from reading actual code paths (cache behavior, timezone handling in ContactDetail line 889)

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable stack, no fast-moving dependencies)
