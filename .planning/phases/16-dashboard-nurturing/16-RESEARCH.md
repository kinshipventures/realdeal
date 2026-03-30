# Phase 16: Dashboard + Nurturing Hub - Research

**Researched:** 2026-03-30
**Domain:** React dashboard refactor, widget architecture, localStorage persistence, sub-route navigation, nurturing signals
**Confidence:** HIGH

## Summary

This phase is a refactor-and-extend of an existing 500-line monolithic `Dashboard.tsx`. The codebase already contains every data primitive needed — equity scoring, dormancy, birthdays, snooze — so zero new data logic is required. The primary work is (1) decomposing the monolith into individually toggleable widget components, (2) adding a localStorage-backed widget config system with two presets, (3) building a `/pulse/nurturing` sub-route as a focused drill-down, and (4) propagating nurturing signals onto record pages and pipeline cards.

No new libraries are needed. Every pattern in this phase already has a precedent in the codebase — follow those patterns exactly rather than introducing abstractions.

**Primary recommendation:** Decompose Dashboard.tsx widget-by-widget with a shared config hook, then build the nurturing drill-down as a self-contained route component, then add signals to HealthWidget and OpportunityCard.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Toggle list + fixed presets. Settings panel where user checks/unchecks widgets and picks from presets. No drag-and-drop grid. Persisted to localStorage.
- **D-02:** Two presets: "Full" (all widgets visible) and "Focus" (only actionable sections: Today's Focus, Needs Attention, upcoming dates, pending tray). Toggle list handles any further customization.
- **D-03:** No multiple named dashboard views (DASH-03 descoped to presets + toggles).
- **D-04:** Merge overdue queue + dormant cleanup into a single "Needs Attention" section. Dormant contacts are a subset. One section, grouped by severity (overdue first, then dormant/stale).
- **D-05:** Equity ring and WrappedCard stay as toggleable widgets. Default visible in "Full" preset, hidden in "Focus" preset.
- **D-06:** Replace current verbose campaigns section with compact link cards. Small cards with name + progress indicator, click navigates to campaign detail. Same treatment for active pipelines.
- **D-07:** All existing sections become toggleable widgets. Nothing removed from codebase.
- **D-08:** Nurturing is NOT a new top-level nav pill. It's a sub-view within the dashboard route (e.g., `/pulse/nurturing`). Accessible via contextual "See all" links on dashboard sections.
- **D-09:** Single scrollable view with section headers. Primary sections (expanded): "Due Soon", "Needs Attention" (overdue), "Stale", "Upcoming Dates". Secondary section (collapsed by default with count badge): "Data Hygiene" (missing required fields + pod capacity maintenance). Empty sections collapse automatically.
- **D-10:** Nurturing signal thresholds reuse existing equity system. "Due soon" = overdue contacts (`isOverdue()`). "Stale" = dormant contacts (`isDormant()`). No new scoring.
- **D-11:** Each contact row in the drill-down has three actions: Log interaction (type picker), Snooze 30d (existing snooze pattern), click-to-navigate to full record.
- **D-12:** Entry points to nurturing drill-down: contextual "See all" links on each relevant dashboard section header. Land on the same drill-down view, pre-filtered by signal type.
- **D-13:** Record page signals use tiered severity. Urgent signals (overdue, stale) show a colored banner strip below the record header — dismissible per-session. Informational signals (upcoming birthday, missing fields) show as a badge/indicator on HealthWidget.
- **D-14:** Pipeline card signals use subtle dot indicators on contact avatars. Red dot for overdue, orange for due soon. No text on the card — hover shows the reason.
- **D-15:** Dashboard widget cross-surfacing: existing widgets absorb signals rather than adding new summary widgets. Today's Focus folds in "due soon" contacts. Pod health cards can show missing fields counts. No new "Nurturing Summary" widget.
- **D-16:** Compact link cards at the bottom of the dashboard for active pipelines and active campaigns. Each card shows name + brief status, click navigates to dedicated page.
- **D-17:** Saved reports quick access deferred to Phase 17.

### Claude's Discretion

- Settings panel UI (gear icon placement, panel/modal design)
- Widget toggle list layout and interaction
- Preset switching UX
- Nurturing drill-down layout and responsive treatment
- Banner strip design (color, icon, dismiss button)
- Dot indicator sizing and hover tooltip design
- Compact link card design for pipelines/campaigns
- "Due Soon" / "Needs Attention" section header design
- Snooze button placement and confirmation
- Interaction logger inline vs modal on nurturing rows
- Scroll behavior and section collapse animation
- localStorage key naming for widget config persistence

### Deferred Ideas (OUT OF SCOPE)

- Saved reports quick access widget (Phase 17)
- Multiple named dashboard views (DASH-03 descoped)
- Drag-and-drop widget reordering
- Advanced intelligence layer beyond cadence (V2 Copilot)
- Maintenance module with drag-and-drop relationship hygiene (V2)
- Brain view / Feed view / Maintenance view toggle (V2)
- Gifting reminders (no gifting data yet)
- Pipeline velocity signals (Phase 17)
- Scheduled/automated nurturing notifications (requires backend)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | Modular dashboard with configurable widgets: total records, pod totals, pending categorizations, recently updated records, quick links to pipelines/projects/nurturing hub | localStorage config hook + widget decomposition; existing PendingTrayWidget is the reference widget pattern |
| DASH-02 | User can show/hide widgets and reorder them | Toggle list + preset system via localStorage; drag-and-drop deferred per D-01 |
| DASH-03 | User can create multiple dashboard views (descoped) | Implemented as two fixed presets (Full/Focus) per D-03; requirement satisfied by presets + toggles |
| DASH-04 | Dashboard surfaces pending follow-ups and stale relationships | Existing `isOverdue()`, `isDormant()`, `todaysFocus()` functions cover this; merged into "Needs Attention" section per D-04 |
| DASH-05 | Dashboard shows important dates (birthdays, anniversaries, key dates) | Existing `getUpcomingBirthdays()` + `followUpItems` logic already in Dashboard.tsx; becomes "Coming Up" widget |
| DASH-06 | Dashboard is the primary operating surface — founders live here | Achieved through Full/Focus presets, actionable section ordering, compact link cards for pipelines/campaigns |
| NURT-01 | Dedicated view showing important dates and milestones | `/pulse/nurturing` sub-route with "Upcoming Dates" section using `getUpcomingBirthdays()` |
| NURT-02 | Surfaces stale relationships | "Stale" section in drill-down using `isDormant()` (90+ days threshold) |
| NURT-03 | Maintenance queue for capacity-limited pods | "Data Hygiene" collapsed section showing pods at/over capacity + contacts that may need managing out |
| NURT-04 | Surfaces contacts missing essential context or pod-required fields | "Data Hygiene" section in drill-down; requires checking fieldConfig required fields vs contact field values |
| NURT-05 | Basic suggestions: milestones this week, no interaction lately | Section headers in drill-down carry the suggestion copy; no AI — copy is static/template-based |
| NURT-06 | All nurturing signals visible in hub AND surfaced across dashboard widgets, record-level alerts, and pipeline/project views | Banner strip on RecordPage + dot indicators on OpportunityCard + dashboard widget absorption (D-13/D-14/D-15) |
</phase_requirements>

---

## Standard Stack

### Core (no new installs — all existing)

| Library/Module | Version | Purpose | Status |
|---|---|---|---|
| React Router v7 | existing | `/pulse/nurturing` sub-route + URL filter params | Already in use |
| `src/lib/equity.ts` | — | `isOverdue()`, `isDormant()`, `todaysFocus()`, `daysSinceContact()`, `scoreLabel()` | Reuse verbatim |
| `src/lib/birthdays.ts` | — | `getUpcomingBirthdays()` for Upcoming Dates section | Reuse verbatim |
| `src/lib/escapeStack.ts` | — | `useEscape()` for settings panel | Reuse verbatim |
| `src/lib/airtable.ts` | — | `isOverdue()`, `isInGracePeriod()`, `getFieldConfigs()` | Reuse existing |
| `localStorage` | native | Widget config persistence, per-session signal dismissals | Follow existing snooze key pattern |

**Installation:** None required.

### Patterns Already Established

| Pattern | Where It Lives | Used For |
|---|---|---|
| Dashboard widget with count badge + "See all" | `PendingTrayWidget.tsx` | Reference for every new widget section header |
| Snooze persistence | `Dashboard.tsx` `getSnoozedIds()` / `snoozeContact()` | Extract to shared util, reuse in drill-down |
| Graduated loading (independent useEffects) | `Dashboard.tsx` | Widget components receive data via props; Dashboard.tsx owns fetch state |
| Escape stack | `escapeStack.ts` | Settings panel overlay |
| Panel style constant | `Dashboard.tsx` `const PANEL` | Copy to each widget file |
| Sub-route pattern | `App.tsx` `<Route path="projects/:id">` | `/pulse/nurturing` follows same nested route structure |

---

## Architecture Patterns

### Recommended Project Structure

```
src/components/dashboard/
├── Dashboard.tsx              # Orchestrator: fetches data, renders widgets in config order
├── useDashboardConfig.ts      # Hook: localStorage read/write for widget visibility + active preset
├── DashboardSettings.tsx      # Settings panel: preset switcher + toggle list
├── widgets/
│   ├── EquityWidget.tsx       # Equity ring + score (was inline in Dashboard.tsx)
│   ├── WrappedWidget.tsx      # Wraps WrappedCard with widget toggle support
│   ├── PodHealthWidget.tsx    # Pod health cards scroll (was inline)
│   ├── TodaysFocusWidget.tsx  # Today's Focus cards + "See all" → /pulse/nurturing?filter=focus
│   ├── NeedsAttentionWidget.tsx # Merged overdue + dormant, grouped by severity
│   ├── ComingUpWidget.tsx     # Birthdays + follow-ups (was upcomingItems)
│   ├── QuickLinksWidget.tsx   # Compact link cards for pipelines + campaigns
│   └── PendingTrayWidget.tsx  # Already exists — move here or leave in categorization/
src/components/nurturing/
├── NurturingHub.tsx           # Route component for /pulse/nurturing
└── NurturingRow.tsx           # Single contact row: name, signal badge, 3 actions
src/lib/
└── snooze.ts                  # Extract getSnoozedIds() / snoozeContact() from Dashboard.tsx
```

### Pattern 1: Widget Config Hook

```typescript
// src/components/dashboard/useDashboardConfig.ts
const STORAGE_KEY = 'kinshipbrain:dashboard-config:v1'

type WidgetId =
  | 'equity' | 'wrapped' | 'pod-health' | 'todays-focus'
  | 'needs-attention' | 'coming-up' | 'quick-links' | 'pending-tray'

type Preset = 'full' | 'focus'

const PRESET_CONFIGS: Record<Preset, WidgetId[]> = {
  full: ['equity', 'wrapped', 'pod-health', 'pending-tray', 'todays-focus', 'needs-attention', 'coming-up', 'quick-links'],
  focus: ['pending-tray', 'todays-focus', 'needs-attention', 'coming-up', 'quick-links'],
}

interface DashboardConfig {
  preset: Preset
  visible: Set<WidgetId>
}
```

**Pattern:** Read from localStorage on mount (synchronous), write on any change. Config changes are immediate — no confirm step.

### Pattern 2: Widget Component Shape

Every widget follows the same shape as PendingTrayWidget:

```typescript
interface FooWidgetProps {
  // only the pre-computed data slice it needs
  contacts: Contact[]
  pods: Pod[]
  // optional: callback for "See all" navigation
  onSeeAll?: () => void
}

export function FooWidget({ contacts, pods, onSeeAll }: FooWidgetProps) {
  // Section header with count badge + "See all" link
  // Section body (list rows or cards)
  // Empty state: collapse (render null) when empty
}
```

**Key rule:** Widgets receive data via props — no internal data fetching. Dashboard.tsx owns all fetch state exactly as today.

### Pattern 3: Nurturing Sub-Route

```typescript
// App.tsx addition
<Route path="record/:id" element={<RecordPage />} />
// Add alongside existing routes:
<Route path="pulse/nurturing" element={<NurturingHub />} />
```

NurturingHub reads `?filter=focus|overdue|stale|dates` from URL search params to pre-scroll/highlight the relevant section. Uses `useSearchParams()` from react-router.

```typescript
// NurturingHub.tsx — reads pre-filter from URL
import { useSearchParams } from 'react-router'
const [params] = useSearchParams()
const initialFilter = params.get('filter') // 'focus' | 'overdue' | 'stale' | 'dates' | null
```

### Pattern 4: Snooze Extraction

Extract from Dashboard.tsx to `src/lib/snooze.ts`:

```typescript
const SNOOZE_KEY = 'kinshipbrain:dormant-snooze'

export function getSnoozedIds(): Set<string> { ... }  // exact copy of existing
export function snoozeContact(id: string): void { ... } // exact copy of existing
```

Dashboard.tsx and NurturingHub.tsx both import from this module. No behavioral change.

### Pattern 5: Nurturing Row Actions

The three-action row for the drill-down:

```typescript
// NurturingRow.tsx
// 1. Log interaction: open inline type picker (call/email/text/meeting/note)
//    — reuse TYPE_ICONS from InteractionSection.tsx
// 2. Snooze 30d: call snoozeContact(id), remove from local list state
// 3. Click row body: navigate(`/record/${contact.id}`)
```

Interaction logging pattern: replicate the compact log flow from InteractionSection. No full modal — a horizontal pill row of type buttons, confirm on click.

### Pattern 6: Record Page Signal Banner

```typescript
// HealthWidget.tsx addition
// Urgent tier: banner strip between RecordHeader and RecordTimeline
// Check: isOverdue(contact, pod.cadence) || isDormant(contact)
// Banner: colored left-border strip, dismissible per-session via sessionStorage key
// sessionStorage key: `kinshipbrain:signal-dismissed:${contact.id}`

// Informational tier: badge count on HealthWidget
// Check: upcoming birthday within 14 days || required fields missing
```

### Pattern 7: Pipeline Card Dot Indicator

```typescript
// OpportunityCard.tsx addition — on each Avatar in the contacts row
// Red dot (8px): isOverdue for linked contact
// Orange dot (8px): isDormant but not overdue (due soon)
// Dot positioned absolute top-right of Avatar div
// title attribute carries the reason text for hover tooltip
```

No new state — dots are derived from the contacts prop. The dots are purely presentational.

### Anti-Patterns to Avoid

- **Widget internal fetching:** Each widget component must NOT call `getContacts()` or `getPods()` directly. All data flows down from Dashboard.tsx via props.
- **New scoring logic:** Do not introduce new thresholds or scoring in the nurturing drill-down. `isOverdue()` = Due Soon, `isDormant()` = Stale. That's it.
- **New nav pill for Nurturing:** Nurturing is a sub-route of `/`, not a top-level destination. The pill nav does NOT get a "Nurturing" entry.
- **Preset persistence as widget visibility:** The `visible` set in localStorage is authoritative. Presets are only write operations — they overwrite the visible set. Loading the page reads the visible set, ignoring preset name.
- **Multiple localStorage keys for widget state:** One key `kinshipbrain:dashboard-config:v1` stores both preset name and visible widget set together.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Signal scoring/thresholds | New scoring logic | `isOverdue()`, `isDormant()` from equity.ts/airtable.ts | Already calibrated, changing them breaks rest of app |
| Snooze persistence | New implementation | Extract existing `getSnoozedIds()` / `snoozeContact()` | Logic already handles expiry cleanup |
| Escape handling for settings panel | Custom key listener | `useEscape()` from escapeStack.ts | Stack prevents multiple panel conflicts |
| Birthday parsing | Date parsing utility | `getUpcomingBirthdays()` from birthdays.ts | Handles 3 date formats, edge cases already solved |
| Interaction type picker icons | New SVG set | `TYPE_ICONS` from InteractionSection.tsx | Already exported, consistent visual language |
| Sub-route | Custom router logic | React Router `<Route>` + `useSearchParams` | Already in use project-wide |

---

## Common Pitfalls

### Pitfall 1: Widget Decomposition Breaks Data Flow

**What goes wrong:** Extracting a widget component and moving `useMemo` hooks inside it causes each widget to independently recalculate `byContact`, `overdueContacts`, etc. — expensive and divergent.
**Why it happens:** Feels natural to co-locate data logic with the component that displays it.
**How to avoid:** Dashboard.tsx keeps all `useMemo` hooks. Widgets receive final computed arrays as props. The only hooks widgets own are display-level (collapsed/expanded state, animation).
**Warning signs:** A widget component importing `getContacts()` or `indexByContact()`.

### Pitfall 2: Widget Config Version Drift

**What goes wrong:** Adding a new widget ID later without bumping the localStorage key causes old configs with missing widget IDs to silently hide the new widget.
**How to avoid:** `useDashboardConfig` should merge stored config with the full widget list: any widget ID not in stored config defaults to the preset default. Never trust the stored set to be complete.

```typescript
// On load: fill gaps from preset defaults
const stored = readFromStorage()
const merged = ALL_WIDGET_IDS.map(id => ({
  id,
  visible: stored.visible.has(id) ?? PRESET_CONFIGS[stored.preset].includes(id)
}))
```

### Pitfall 3: isPulse Route Detection Breaks for Sub-Route

**What goes wrong:** `App.tsx` currently sets `isPulse = location.pathname === '/'`. The nurturing sub-route at `/pulse/nurturing` will NOT match, so the Pulse nav pill de-activates when navigating to the drill-down.
**How to avoid:** Update the route detection in `App.tsx`:
```typescript
const isPulse = !isMap && !isContacts && !isPipelines && !isProjects
  && (location.pathname === '/' || location.pathname.startsWith('/pulse'))
```

### Pitfall 4: NeedsAttention / Dormant Merge Ordering

**What goes wrong:** Merging overdue + dormant contacts into one list without grouping causes less-urgent dormant contacts to appear before urgent overdue ones.
**How to avoid:** Compute two separate arrays, render overdue group first, then dormant group. Do NOT sort the merged array by days since contact — dormant (90+ days, not overdue by cadence) can have fewer days than overdue contacts in high-frequency pods.

### Pitfall 5: Per-Session Banner Dismissal Colliding Across Records

**What goes wrong:** Using a single `sessionStorage` key for "banner dismissed" applies the dismissal to ALL records, not the specific one where the user dismissed it.
**How to avoid:** Namespace by contact ID: `kinshipbrain:signal-dismissed:${contact.id}`.

### Pitfall 6: Dot Indicators Cause Layout Shift on OpportunityCard

**What goes wrong:** Wrapping each Avatar in a `position: relative` div and positioning the dot `absolute` causes the avatar row to reflow if the wrapper div gets an unexpected default display value.
**How to avoid:** The Avatar's current wrapper `div` already has `marginLeft: -8, cursor: pointer, zIndex: ...` inline styles. Add `position: 'relative'` to that existing div rather than introducing a new wrapper.

---

## Code Examples

### Existing snooze functions (extract verbatim to snooze.ts)

Source: `src/components/dashboard/Dashboard.tsx` lines 38-58

```typescript
// src/lib/snooze.ts
const SNOOZE_KEY = 'kinshipbrain:dormant-snooze'

export function getSnoozedIds(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? '{}') as Record<string, number>
    const now = Date.now()
    const active = new Set<string>()
    const cleaned: Record<string, number> = {}
    for (const [id, until] of Object.entries(raw)) {
      if (until > now) { active.add(id); cleaned[id] = until }
    }
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(cleaned))
    return active
  } catch { return new Set() }
}

export function snoozeContact(id: string) {
  try {
    const raw = JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? '{}')
    raw[id] = Date.now() + 30 * 24 * 60 * 60 * 1000
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(raw))
  } catch { /* silent */ }
}
```

### localStorage widget config pattern (follows existing node-positions pattern)

```typescript
// Version bumping convention from codebase:
// 'kinshipbrain:node-positions:v2' — bump on breaking layout change
// Widget config: 'kinshipbrain:dashboard-config:v1'

function readConfig(): DashboardConfig {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!raw) return defaultConfig()
    return {
      preset: raw.preset ?? 'full',
      visible: new Set(raw.visible ?? PRESET_CONFIGS['full']),
    }
  } catch { return defaultConfig() }
}

function writeConfig(config: DashboardConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      preset: config.preset,
      visible: [...config.visible],
    }))
  } catch { /* silent */ }
}
```

### Route addition for nurturing (App.tsx)

```typescript
// Source: existing App.tsx Route pattern
// Add alongside existing record route:
<Route path="record/:id" element={<RecordPage />} />
<Route path="pulse/nurturing" element={<NurturingHub />} />
```

The nurturing route is a sibling of existing routes inside `<Route element={<AppShell />}>`. It inherits the nav, FAB, and search palette from AppShell.

### "See all" link pattern on section headers

```typescript
// Source: PendingTrayWidget.tsx — Review button as model
// Section header row with count badge and "See all" link:
import { useNavigate } from 'react-router'

const navigate = useNavigate()

<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <h2 style={{ /* existing section heading style */ }}>needs attention</h2>
    <span style={{ /* orange pill badge */ }}>{count}</span>
  </div>
  <button onClick={() => navigate('/pulse/nurturing?filter=overdue')} style={{ /* text link style */ }}>
    See all
  </button>
</div>
```

### PANEL constant (copy to each widget file)

```typescript
// Source: Dashboard.tsx line 29
const PANEL: React.CSSProperties = {
  background: 'var(--surface-panel)',
  backdropFilter: 'var(--panel-blur)',
  WebkitBackdropFilter: 'var(--panel-blur)',
  border: 'var(--surface-panel-border)',
  borderRadius: 'var(--panel-radius)',
}
```

### Semantic signal colors (from design-system.md)

```
Overdue (urgent):   #FF3B30  (red)       — dot indicator, banner left-border
Due soon (warning): hsla(20, 80%, 45%)   — orange pill badge, orange dot
Stale (dormant):    var(--color-text-secondary)  — muted, not alarming
Data hygiene:       var(--color-text-tertiary)   — gentle nudge only
```

---

## Integration Points (exact files to modify)

| File | Change | Decision |
|---|---|---|
| `src/App.tsx` | Add `/pulse/nurturing` route; update `isPulse` detection | D-08 |
| `src/components/dashboard/Dashboard.tsx` | Decompose into widget components; add settings panel trigger; replace campaigns/pipeline sections with compact link cards | D-06/D-07 |
| `src/components/records/RecordPage.tsx` | Pass contact + interactions to HealthWidget; add banner strip between header and content | D-13 |
| `src/components/records/HealthWidget.tsx` | Add nurturing signal badges (overdue banner + birthday/missing field indicators) | D-13 |
| `src/components/pipelines/OpportunityCard.tsx` | Add dot indicators to Avatar wrappers for linked contacts with active signals | D-14 |
| `src/lib/snooze.ts` | New file — extract from Dashboard.tsx | D-11 |

---

## Open Questions

1. **Capacity maintenance in Data Hygiene**
   - What we know: NURT-03 asks for capacity-limited pod maintenance; pods have `capacity` field
   - What's unclear: the drill-down should show contacts "to manage up or out" — but the selection logic for which contacts to surface is undefined (oldest contact? lowest equity score?)
   - Recommendation: Show the pod itself (name + current count vs capacity), not individual contacts. Let the user click through to the pod detail page to manage. This avoids invented ranking logic.

2. **Missing required fields detection for NURT-04**
   - What we know: `getFieldConfigs()` returns field configs with `required` flag; contact fields are on the contact object
   - What's unclear: field configs are pod-specific (`pod_id` on FieldConfig). A contact in pod A missing pod A's required field should surface, but a contact NOT in pod A correctly has no value for pod A's required field.
   - Recommendation: For each contact, check each FieldConfig where `required=true` AND `contact.list_ids.includes(fieldConfig.pod_id)`. If the contact's field value for that config is null/empty, flag it. This is O(contacts × fieldConfigs) but client-side and cached.

3. **Compact link card for pipelines — data source**
   - What we know: `PipelinesPage` fetches its own pipeline data; Dashboard.tsx currently doesn't have pipeline data in state
   - What's unclear: does the QuickLinksWidget need live pipeline data (name + opportunity count), or is it purely navigational (name only)?
   - Recommendation: Per D-16, these are "navigational shortcuts" not data-heavy. Fetch pipelines with `getPipelines()` once on Dashboard mount, display name only. Count can be shown but is optional.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|---|---|---|
| Dashboard.tsx as 500-line monolith | Widget-based architecture with config hook | Each widget can be tested and toggled independently |
| All sections always visible | Preset + toggle system (localStorage) | Focus preset removes visual noise for power users |
| Verbose campaign cards with full status details | Compact navigational link cards | Dashboard stays scannable; detail lives on campaign page |
| Separate overdue queue + dormant cleanup | Merged "Needs Attention" section grouped by severity | Single mental model for relationship attention |
| No nurturing drill-down | `/pulse/nurturing` sub-route with pre-filtered sections | Focused "work mode" for processing relationship maintenance queue |

---

## Sources

### Primary (HIGH confidence)

- Codebase direct read — `src/components/dashboard/Dashboard.tsx` — full component inventory
- Codebase direct read — `src/lib/equity.ts` — all scoring functions and thresholds
- Codebase direct read — `src/lib/birthdays.ts` — birthday parsing and windowing
- Codebase direct read — `src/lib/escapeStack.ts` — escape key handling pattern
- Codebase direct read — `src/App.tsx` — existing route structure and isPulse detection
- Codebase direct read — `src/components/records/HealthWidget.tsx` — current widget shape
- Codebase direct read — `src/components/pipelines/OpportunityCard.tsx` — avatar row structure
- Codebase direct read — `src/components/categorization/PendingTrayWidget.tsx` — widget reference pattern
- Codebase direct read — `docs/design-system.md` — color tokens and semantic colors

### Secondary (MEDIUM confidence)

- CONTEXT.md decisions D-01 through D-17 — all locked implementation choices
- React Router v7 `useSearchParams` for URL filter param pattern (standard API, project already uses react-router)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all existing code read directly
- Architecture: HIGH — all patterns derived from existing codebase, no assumptions
- Pitfalls: HIGH — identified from direct code inspection (route detection bug, widget config merging, avatar wrapper reflow)
- Integration points: HIGH — every file listed was read and verified

**Research date:** 2026-03-30
**Valid until:** Stable — no fast-moving dependencies. Valid indefinitely or until codebase restructure.
