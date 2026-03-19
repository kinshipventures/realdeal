---
title: "Social Equity App Redesign"
type: feat
date: 2026-03-18
deepened: 2026-03-18
brainstorm: docs/brainstorms/2026-03-18-app-redesign-social-equity-brainstorm.md
---

# Social Equity App Redesign

## Enhancement Summary

**Deepened on:** 2026-03-18
**Research agents used:** Architecture Strategist, Performance Oracle, TypeScript Reviewer, Frontend Races Reviewer, Code Simplicity Reviewer, Pattern Recognition Specialist, Best Practices Researcher, Framework Docs Researcher, Code Architect, Frontend Design Specialist

### Key Improvements from Research
1. **Scoped interactions fetch** — filter to 90-day window via Airtable `filterByFormula` instead of fetching entire table. Eliminates unbounded growth risk.
2. **Pre-indexed interaction map** — `Map<contactId, Interaction[]>` in one pass, eliminates O(n*m) scoring.
3. **Score normalization** — 0-100 scale with labeled thresholds (Thriving/Healthy/Cooling/Dormant).
4. **Floating pill navigator** — replaces traditional tab bar. Frosted glass, compact, Apple Dynamic Island energy.
5. **Conic gradient ring** — for equity score visualization. Not a progress bar or meter.
6. **ReactFlowProvider at app level** — preserves React Flow store across tab switches without re-initialization.
7. **Graduated loading** — per-section skeletons, not one global spinner. Stats + overdue load instantly from warm cache; equity waits for interactions.
8. **Existing race condition fixes** — ContactPanel needs canceled flag, ContactDetail auto-save needs generation counter. Fix during Phase 1.
9. **Focus capped at 3** — research shows 2-3 daily nudges is optimal. More causes decision paralysis.
10. **Optimistic cache append** — after logging interactions, append to cache instead of full invalidation.

### New Considerations Discovered
- React Router does NOT preserve component state between sibling routes — OrbMap unmounts on tab switch
- Airtable has no ETags or conditional requests — module-level caching is the correct strategy
- `fitView` overrides `setViewport` — must choose one or the other on Map remount
- Snooze state in localStorage is device-local — known limitation, document it
- The background gradient is duplicated in OrbMap.tsx and Dashboard.tsx — AppShell should own it

---

## Overview

Transform Kinship Brain from a visual network explorer into a **social equity dashboard** — an Oura ring for relationships. The app becomes a daily-use tool that surfaces who needs attention, tracks relationship health through weighted interaction scoring, and nudges Moj toward consistent micro-habits of care.

Two-view architecture: **Dashboard** (home) and **Map** (tab), with floating pill navigation between them.

## Problem Statement

The current app is a visual map you explore. There's no reason to open it daily. No health signals, no nudges, no scoring. You have to remember who needs attention. The app should tell you.

Moj's philosophy: **give more than you take**. Trust is built on small micro habits, not grand gestures. The app should make those habits effortless and make relationship debt visible.

## Proposed Solution

### Phase 1: Foundation (Data + Navigation Shell + Bug Fixes)
### Phase 2: Dashboard Core (Equity Scores + Overdue)
### Phase 3: Today's Focus + Dormant Cleanup
### Phase 4: Enriched Contact Profiles
### Phase 5: Visual Overhaul (Spotify Wrapped Energy)
### Phase 6: Future — Calendar Sync, AI Enrichment

---

## Technical Approach

### Architecture Decisions

**1. Lists → Pods: Rename the interface**
~~Type alias only.~~ **Revised:** Rename the `List` interface to `Pod` throughout. A type alias adds noise — it communicates intent in source but the compiler treats them identically. Pick one name and use it everywhere. The Airtable table stays "Lists" (no migration needed) — the mapping happens in `airtable.ts` at the field-mapping boundary.

**2. Pod cadence: New Airtable field**
Add a `Cadence` single-select field to the Lists table in Airtable (values: `weekly`, `biweekly`, `monthly`, `quarterly`). Default: `monthly`. Briell adds the field; we read it in the app.

Map cadence to days with `as const satisfies`:
```typescript
const CADENCE_DAYS = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
} as const satisfies Record<Cadence, number>
```

`isOverdue` accepts `Cadence`, resolves to days internally:
```typescript
function isOverdue(contact: Contact, cadence: Cadence = 'monthly'): boolean {
  const threshold = CADENCE_DAYS[cadence]
  // ...
}
```

**3. Interaction history: Scoped fetchAll with 90-day filter**
~~Fetch the entire Interactions table.~~ **Revised:** Use Airtable's `filterByFormula` to fetch only interactions from the last 90 days:

```
filterByFormula: IS_AFTER({Date}, DATEADD(TODAY(), -90, 'days'))
```

This caps the fetch regardless of how large the Interactions table grows. At 300 contacts with ~10 interactions each in 90 days, that's ~3k records = 30 paginated requests. Cache module-level with stale-while-revalidate, identical pattern to contacts/categories.

**Performance insight:** Pre-index interactions by contact_id in a single O(m) pass:
```typescript
const byContact = new Map<string, Interaction[]>()
for (const ix of allInteractions) {
  const arr = byContact.get(ix.contact_id)
  if (arr) arr.push(ix)
  else byContact.set(ix.contact_id, [ix])
}
```
This eliminates the O(n*m) filter-per-contact pattern. Scoring 300 contacts drops from ~5ms to ~1ms.

**After logging an interaction, optimistic cache append** instead of full invalidation:
```typescript
if (_interactionsCache && mapped) {
  _interactionsCache.push(mapped)
}
```

**4. Social equity score: Weighted sum within 90-day window, normalized 0-100**
Simple and explainable:

```
Score = sum of (weight x recencyMultiplier) for each interaction in last 90 days

Weights:
  intro    = 5
  meeting  = 4
  call     = 3
  text     = 2
  email    = 2
  note     = 0  (internal, doesn't count)

Recency multiplier:
  0-30 days ago   = 1.0
  31-60 days ago  = 0.6
  61-90 days ago  = 0.3
  90+ days ago    = 0 (excluded)
```

**Normalization:** `Math.min(100, Math.round(rawScore * scaleFactor))` where scaleFactor is calibrated so a contact with a meeting + call in the last 30 days scores ~70-80. Start with `scaleFactor = 5`, tunable in `equity.ts`.

**Score thresholds (from Oura's model):**
- 85-100: **Thriving** — regular, meaningful contact
- 70-84: **Healthy** — solid but could use attention
- 40-69: **Cooling** — relationship is drifting
- 0-39: **Dormant** — at risk of losing the connection

Per-contact score is normalized 0-100. Per-pod score is the average across contacts. Overall score is the average across priority pods. Display the number with a qualitative label: "Healthy (78)".

**5. Intro DOES update `last_contacted_at`**
Change the existing exclusion. An intro is the highest-value interaction — it should count for overdue tracking. One-line change in `logInteraction()`.

**6. `isOverdue()` becomes cadence-aware**
Accepts `Cadence` type, resolves to days internally via `CADENCE_DAYS` const map. No raw numbers in the API.

**7. Grace period: 14 days, global**
A contact is excluded from overdue calculations if `created_at` is less than 14 days ago.

**8. Floating pill navigation (not tab bar)**
~~New `AppShell.tsx`.~~ **Revised:** Inline `AppShell` in `App.tsx` (too simple for its own file). Renders a floating pill navigator centered at viewport bottom — two segments: "Pulse" and "Map". Frosted glass background (`backdrop-filter: blur(20px)`), compact like Apple's Dynamic Island.

**Critical: React Router unmounts components on route change.** React Flow state is lost. Solution: wrap the app in `ReactFlowProvider` at the `App.tsx` level (above the router), so the React Flow store persists across tab switches.

**Map viewport persistence:** Use `useOnViewportChange({ onEnd })` to save viewport to localStorage. Restore in `onInit` callback. Do NOT use `fitView` if restoring a saved viewport — `fitView` overrides `setViewport`.

**AppShell owns the background gradient** — remove the duplicate from both `OrbMap.tsx` and `Dashboard.tsx`.

**9. Dormant cleanup: localStorage snooze**
"Keep" stores `{ contactId: snoozedUntil }` in localStorage (key: `kinshipbrain:dormant-snooze`). Re-surfaces after 30 days. "Reach out now" opens ContactDetail with interaction form focused. "Remove" shows inline confirm, then deletes from Airtable.

**Known limitation:** Snooze state is device-local. Moj's snooze on one device won't show on another. Acceptable for V1 — move to an Airtable `Snoozed Until` field on Contacts if multi-device matters later.

**10. Today's Focus algorithm**
~~Pick top 5.~~ **Revised:** Pick top **3**. Research shows 2-3 daily nudges is optimal — more causes decision paralysis. Oura shows one daily highlight. Cap it.

Ranked selection:
1. Most overdue contacts in priority pods (sorted by days overdue descending)
2. Contacts with upcoming milestones (birthday within 30 days) — when data exists
3. Serendipity pick: random contact from priority pods not contacted in 2+ weeks

Simplified from 4 criteria to 3. "Score dropping" was over-engineered — overdue already captures this. No tiebreakers needed when capped at 3.

Refresh: computed fresh on each dashboard load from cached data. After logging an interaction, optimistic cache append triggers recomputation via `useMemo` — the contact drops off if no longer overdue.

---

## Implementation Phases

### Phase 1: Foundation (Data + Navigation Shell + Bug Fixes)

Set up the infrastructure everything else builds on. **Also fix existing race conditions** surfaced during research.

#### 1.0 — Existing bug fixes (do first)

Fix these regardless of the redesign:

**ContactPanel missing canceled flag** (`src/components/contacts/ContactPanel.tsx`):
```typescript
useEffect(() => {
  let canceled = false
  setLoading(true)
  getContacts(categoryId)
    .then(data => { if (!canceled) setContacts(data) })
    .catch(() => { if (!canceled) setLoadError(true) })
    .finally(() => { if (!canceled) setLoading(false) })
  return () => { canceled = true }
}, [categoryId])
```

**ContactDetail auto-save race condition** (`src/components/contacts/ContactDetail.tsx`):
Add a generation counter so only the latest response wins when tabbing through fields quickly:
```typescript
const saveGenRef = useRef(0)
function handleBlur(key, value) {
  const gen = ++saveGenRef.current
  updateContact(contact.id, { [key]: value })
    .then(updated => {
      if (gen !== saveGenRef.current) return
      onSaved(updated)
    })
}
```

**InteractionSection concurrent operations** (`src/components/contacts/InteractionSection.tsx`):
Unify scattered booleans into a single operation state:
```typescript
const [opState, setOpState] = useState<'idle' | 'logging' | 'deleting' | 'updating'>('idle')
// Guard all handlers with: if (opState !== 'idle') return
```

**CreateCategoryNode timeout cleanup** — store timeout ID, clear on unmount.

#### 1.1 — Airtable schema updates

**Requires Briell to add in Airtable:**
- `Cadence` field on Lists table (single select: weekly, biweekly, monthly, quarterly, default: monthly)

**New contact fields (add when ready, not blocking Phase 1):**
- `Birthday` (date)
- `Interests` (long text)
- `Milestones` (long text)
- `Relationship Context` (long text)

#### 1.2 — Types + data layer

**`src/lib/types.ts`**
```typescript
// Rename List → Pod
export type Cadence = 'weekly' | 'biweekly' | 'monthly' | 'quarterly'

export interface Pod {
  id: string
  name: string
  color: string
  owner: Owner
  is_priority: boolean
  cadence: Cadence | null  // null = default monthly
  created_at: string
}

// New contact fields
export interface Contact {
  // ... existing fields ...
  birthday: string | null
  interests: string | null
  milestones: string | null
  relationship_context: string | null
}

// Focus system
export type FocusReason = 'overdue' | 'birthday' | 'serendipity'

export interface FocusItem {
  contact: Contact
  pod: Pod | null
  reason: FocusReason
  score: number
}
```

**`src/lib/airtable.ts`**
- Add `_interactionsCache` with stale-while-revalidate (same pattern as contacts/categories)
- Add `getAllInteractions()` — fetches with 90-day `filterByFormula`, cached
- Add `invalidateInteractionsCache()`
- Optimistic cache append in `createInteraction()` — push to cache array, avoid full re-fetch
- Update `ListFields` → `PodFields`, include `Cadence`
- Update `ContactFields` to include new fields
- Change `isOverdue(contact, cadence: Cadence = 'monthly')` — accepts Cadence, resolves internally
- Add `isInGracePeriod(contact)` — `created_at` < 14 days ago
- Change `logInteraction()` — remove intro exclusion from `last_contacted_at` update

**Consider: Extract a generic cache factory** since this is the 3rd identical cache pattern:
```typescript
function createCache<T>(fetcher: () => Promise<T[]>) {
  // TTL, SWR, in-flight dedup — one implementation, three consumers
}
```

#### 1.3 — Social equity computation

**`src/lib/equity.ts`** (new file — scoring is complex enough for its own module)

All functions accept **pre-filtered data** (pure transforms, no internal filtering):

```typescript
export const INTERACTION_WEIGHTS = {
  intro: 5, meeting: 4, call: 3, text: 2, email: 2, note: 0,
} as const satisfies Record<InteractionType, number>

export const CADENCE_DAYS = {
  weekly: 7, biweekly: 14, monthly: 30, quarterly: 90,
} as const satisfies Record<Cadence, number>

// Takes interactions already filtered to one contact
export function contactEquityScore(interactions: Interaction[]): number

// Takes contacts already in this pod + their interactions pre-indexed
export function podEquityScore(
  contacts: Contact[],
  interactionsByContact: Map<string, Interaction[]>
): number

// Average across priority pods only
export function overallEquityScore(
  priorityPods: Pod[],
  contacts: Contact[],
  interactionsByContact: Map<string, Interaction[]>
): number

export function isDormant(contact: Contact): boolean  // 90+ days no contact

export function todaysFocus(
  contacts: Contact[],
  interactionsByContact: Map<string, Interaction[]>,
  pods: Pod[],
  limit?: number  // default 3
): FocusItem[]
```

#### 1.4 — Navigation shell + React Flow persistence

**`src/App.tsx`** — inline `AppShell` component + routing:
```tsx
// ReactFlowProvider at app level — preserves store across tab switches
<ReactFlowProvider>
  <BrowserRouter>
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="map" element={<OrbMap />} />
      </Route>
    </Routes>
  </BrowserRouter>
</ReactFlowProvider>
```

**`src/components/ui.tsx`** — add `FloatingNav` component (two-segment pill, frosted glass).

**AppShell owns the background gradient.** Remove duplicates from OrbMap.tsx (`BG` constant) and Dashboard.tsx.

**Map viewport persistence:**
- Add `useOnViewportChange({ onEnd })` in OrbMap to save viewport to localStorage
- Restore in `onInit` callback: `instance.setViewport(savedViewport)`
- Remove `fitView` when a saved viewport exists — it overrides `setViewport`

#### Acceptance Criteria — Phase 1
- [ ] `Pod` interface replaces `List` throughout (renamed, not aliased)
- [ ] `_interactionsCache` fetches 90-day scoped interactions and caches
- [ ] Pre-indexed `Map<contactId, Interaction[]>` built in one pass
- [ ] Optimistic cache append after creating interactions
- [ ] `isOverdue()` accepts `Cadence` type, resolves internally
- [ ] `isInGracePeriod()` excludes new contacts from overdue
- [ ] `logInteraction()` updates `last_contacted_at` for intros
- [ ] `contactEquityScore()` returns normalized 0-100 score
- [ ] Floating pill navigation between Dashboard and Map
- [ ] `ReactFlowProvider` at app level — Map store persists across tab switches
- [ ] Map viewport saves/restores via localStorage
- [ ] AppShell owns background gradient (no duplicates)
- [ ] ContactPanel canceled flag bug fixed
- [ ] ContactDetail auto-save generation counter bug fixed
- [ ] InteractionSection unified operation state
- [ ] All existing functionality still works

---

### Phase 2: Dashboard Core (Equity Scores + Overdue)

The main event — rebuild Dashboard as the social equity command center.

#### Dashboard architecture

**One file, local sub-components.** `PodCard`, `FocusCard`, `OverdueRow`, `DormantRow` defined at the bottom of `Dashboard.tsx`. No extraction until the file hits a natural seam.

**Graduated loading — per-section, not global.** Three separate loading booleans (`contactsLoading`, `listsLoading`, `interactionsLoading`). Each section renders its own skeleton while its data resolves. Stats + overdue load instantly from warm cache; equity scores wait for interactions.

```typescript
useEffect(() => {
  getPods().then(d => { setPods(d); setPodsLoading(false) }).catch(...)
  getContacts().then(d => { setContacts(d); setContactsLoading(false) }).catch(...)
  getAllInteractions().then(d => { setAllInteractions(d); setInteractionsLoading(false) }).catch(...)
}, [])
```

**All derived data via `useMemo`** — scores are always computed, never stored:
- `interactionsByContact` — `Map<string, Interaction[]>` pre-indexed
- `overdueContacts` — filtered + sorted by daysOverdue descending
- `podStats` — per-pod: contactCount, overdueCount, equityScore
- `overallScore` — average across priority pods
- `focusItems` — from `todaysFocus()`, top 3

**Error handling:** If `getAllInteractions()` fails, equity scores show a dash (`—`). Overdue list and stats bar still render normally from contacts cache. Only equity-dependent sections degrade.

#### 2.1 — Overall equity score display

Top of dashboard. **Conic gradient ring** visualization:
- SVG `<circle>` with `stroke-dasharray` and `stroke-dashoffset` — proportional fill, ~15 lines of SVG
- Gradient sweeps through 2-3 accent colors (warm coral to electric violet)
- Score number displayed below/beside the ring in large display type (DM Sans 700) — NOT inside the ring
- Qualitative label alongside: "Healthy (78)"
- Unfilled ring portion as a faint ghost stroke (not empty space)
- Load animation: overshoot easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`)
- If interactions haven't loaded yet: skeleton ring

#### 2.2 — Pod health cards

Horizontal scroll or wrapping grid of cards:
- **White card body with thick left gradient border** (4-5px) — each pod's 2-color gradient signature. NOT gradient-filled cards (visual noise with multiple cards).
- Pod name (600 weight) + equity score
- Contact count + overdue count in tight row with tabular numerals
- Cadence label (weekly/monthly/etc.)
- **Ambient glow** for healthy pods — faint box-shadow in pod color at 0.08-0.12 opacity. Neglected pods: no glow. Creates unconscious visual hierarchy.
- Tapping → navigates to `/map` (stretch: `?pod=id` query param for auto-select)

#### 2.3 — Overdue contacts list

Always-visible section:
- All contacts past their pod's cadence window (excluding grace period contacts)
- Sorted by most overdue first
- Shows: name, pod name, days overdue, last interaction type + date
- Tapping → opens ContactDetail
- Uses `.interactive-row` CSS class (existing pattern)

#### 2.4 — Dashboard stats bar

Quick-scan numbers alongside the equity score:
- Total pods
- Total contacts
- Recently contacted (last 7 days)
- Overdue count

#### Acceptance Criteria — Phase 2
- [ ] Conic gradient ring displays overall equity score (0-100)
- [ ] Score has qualitative label (Thriving/Healthy/Cooling/Dormant)
- [ ] Per-pod health cards with gradient border, scores, counts, ambient glow
- [ ] Overdue contacts list sorted by most overdue, excludes grace period
- [ ] Stats bar shows pod/contact/recent/overdue counts
- [ ] Graduated loading: stats + overdue instant, equity waits for interactions
- [ ] Tapping a pod navigates to map
- [ ] Tapping an overdue contact opens their detail
- [ ] Dashboard loads in < 2 seconds on warm cache

---

### Phase 3: Today's Focus + Dormant Cleanup

Daily nudges and network curation.

#### 3.1 — Today's Focus section

Prominent section on dashboard, above overdue list. **3 cards** (not 5 — research-backed cap).

**Card design — personality through copy, not chrome:**
- Variable card heights — let content dictate size
- Warm background tint (`rgba(255, 245, 235, 0.6)`), rounded corners (12-14px)
- Thin top accent line (2px) in a color that signals the reason
- Personality in the text: "You haven't talked to Sarah in 42 days. That's not like you." — not "Sarah Chen — last contacted: 42 days ago."
- Tapping → opens ContactDetail
- After logging interaction → contact drops from Focus on next render (optimistic cache append triggers `useMemo` recomputation)

**Focus algorithm:** "Most overdue in priority pods" is the primary criterion. Simple, explainable. Don't over-engineer the selection.

#### 3.2 — Dormant contact cleanup

Collapsible section on dashboard (shows count in header: "4 contacts need a decision"). Only renders if dormant.length > 0.

**Graduated dormancy tiers** (visual, not functional):
- 90-120 days: "Cooling off"
- 120-180 days: "Going dormant"
- 180+ days: "At risk of losing"

Three actions per contact:
- **Keep** → snoozes for 30 days (localStorage write), dismiss from list
- **Reach out now** → opens ContactDetail with interaction form focused
- **Remove** → inline confirm in same row ("Remove?" with yes/no), then `deleteContact()`

Batch presentation: scrollable list, not one-at-a-time.

#### Acceptance Criteria — Phase 3
- [ ] Today's Focus shows 3 curated contacts with personality-driven reasons
- [ ] Focus uses "most overdue in priority pods" as primary criterion
- [ ] Focus updates reactively after logging interactions
- [ ] Dormant contacts (90+ days) surfaced in collapsible section
- [ ] Graduated dormancy labels (cooling/dormant/at risk)
- [ ] "Keep" snoozes for 30 days via localStorage
- [ ] "Reach out now" opens contact detail with interaction form
- [ ] "Remove" has inline confirm before deletion
- [ ] Empty states for Focus (all caught up) and Dormant (none dormant)

---

### Phase 4: Enriched Contact Profiles

Richer contact detail for understanding people as humans.

#### 4.1 — New profile sections

Add to `ContactDetail.tsx`:

**Life Events & Milestones** section:
- Birthday (date field, show countdown if within 30 days — feeds into Focus algorithm)
- Free-text milestones field for noting: new job, baby, launch, move

**Interests & Passions** section:
- Free-text field for what they care about
- Helps connect on a personal level, not just business

**Relationship Context** section:
- How you know them
- Who introduced you (linked to `recommended_by` field)
- Shared connections, shared experiences, what you've done for each other

#### 4.2 — Equity score on contact detail

Show the person's equity score on their profile:
- Score number with qualitative label
- Breakdown: which interaction types contributed, when
- Cadence status: on track / overdue / dormant

#### Acceptance Criteria — Phase 4
- [ ] Birthday field with countdown display when within 30 days
- [ ] Milestones free-text section on contact detail
- [ ] Interests section on contact detail
- [ ] Relationship context section on contact detail
- [ ] Per-contact equity score visible on profile with label
- [ ] Score breakdown shows interaction types and recency
- [ ] New fields read from and save to Airtable

---

### Phase 5: Visual Overhaul (Spotify Wrapped Energy)

Transform the visual identity from muted glass to vibrant and expressive.

#### Design philosophy: Two moods, one soul

**Map = the quiet room** — where Moj reflects on her network structure. Keep the glass orb system. Don't inject gradients or bold color here.

**Dashboard = the morning briefing** — where the network talks back with energy and personality. Full vibrant treatment.

Connected through shared materials: grain overlay, frosted glass, DM Sans, warm base palette.

#### 5.1 — New color system

**Keep the muted base, add a vibrant accent layer:**

- **Base layer** (unchanged): `#F5F4F0`, warm whites, subtle gradient mesh. The canvas.
- **Accent layer** (new): 5 high-saturation colors for data viz, indicators, and interactive highlights. NOT backgrounds. Think: colored ink on a cream-paper magazine.
  - Warm coral: `#FF6B4A`
  - Electric violet: `#7B61FF`
  - Vivid teal: `#00C9A7`
  - Amber: `#FFB547`
  - Deep rose: `#E8456B`
- **Gradient pairs**: Each accent gets a partner. Coral-to-amber. Violet-to-rose. Teal-to-violet.
- **Rule**: Vibrant colors are earned — they appear on things that represent health, activity, attention needed. They're signal, not decoration.
- **Typography**: DM Sans stays, but 700 weight for headline numbers. Consider a display typeface (Instrument Serif or Fraunces) just for the equity score number.

#### 5.2 — Dashboard visual design

- Equity score as conic gradient ring with accent color sweep
- Pod cards with gradient left borders (not gradient fills — too noisy)
- Today's Focus cards with warm tint background and personality
- Overdue list with color-coded urgency
- Animated load with overshoot easing
- Background gradient mesh shifts slightly warmer/more saturated than Map

#### 5.3 — Map visual refresh

- Glass orb concept stays — Map is the quiet room
- Push color intensity: relax opacity ceiling from 0.16 to ~0.25-0.30
- The orb's subtle tint color **matches** its full vibrant accent on the Dashboard — same color, different energy level
- Hover/press states more dynamic
- Keep grain overlay as connective tissue

#### 5.4 — Floating pill navigator

- Frosted glass (`backdrop-filter: blur(20px)` + semi-transparent white)
- Centered at viewport bottom, 8-12px above edge
- Two segments: "Pulse" and "Map" (or "Today" / "Network")
- Active segment: solid fill with slight elevation. Inactive: ghost text.
- Compact — Apple Dynamic Island energy, never dominates

#### Acceptance Criteria — Phase 5
- [ ] Accent color palette defined (5 colors + gradient pairs)
- [ ] Dashboard has vibrant, expressive visual treatment
- [ ] Pod cards use gradient left borders (not fills)
- [ ] Equity score ring uses conic gradient with accent colors
- [ ] Map orbs refreshed with higher opacity ceiling (~0.25-0.30)
- [ ] Floating pill navigator with frosted glass
- [ ] Background mesh shifts between views (warmer on Dashboard)
- [ ] Typography: 700 weight for score, possible display typeface
- [ ] Load animations with overshoot easing
- [ ] Overall vibe: Spotify Wrapped energy, not bank statement

---

### Phase 6: Future — Calendar Sync, AI Enrichment

Not in scope for this plan, but design decisions should accommodate:

- **Google Calendar sync** — match calendar events to contacts, show "upcoming" on dashboard
- **AI enrichment** — surface signals from social media, email, messages to auto-suggest milestones and interests
- **Team permissions** — differentiate Moj's view from team member views
- **Push notifications** — mobile notifications for daily nudge
- **Mobile app** — responsive design first, then native consideration
- **Airtable computed fields** — move equity scoring server-side via Airtable formula/rollup fields to eliminate client-side computation entirely

---

## Key Technical Files

| File | Changes |
|---|---|
| `src/lib/types.ts` | Rename `List` → `Pod`, add `Cadence`, `FocusItem`, `FocusReason`, new Contact fields |
| `src/lib/airtable.ts` | `_interactionsCache` with 90-day filter, `isOverdue(Cadence)`, optimistic append, grace period, intro fix |
| `src/lib/equity.ts` | **New** — scoring (pure transforms), dormancy, Today's Focus algorithm |
| `src/App.tsx` | Inline `AppShell`, `ReactFlowProvider` at app level, routing restructure |
| `src/components/ui.tsx` | Add `FloatingNav` pill component |
| `src/components/dashboard/Dashboard.tsx` | **Major rebuild** — graduated loading, equity ring, pod cards, Focus, dormant, local sub-components |
| `src/components/contacts/ContactDetail.tsx` | New profile sections, auto-save generation counter fix |
| `src/components/contacts/ContactPanel.tsx` | Canceled flag fix |
| `src/components/contacts/InteractionSection.tsx` | Unified operation state fix |
| `src/components/map/OrbMap.tsx` | "Pod" UI strings, viewport persistence via `useOnViewportChange`, remove background gradient |
| `src/components/map/ListNode.tsx` | Rename to PodNode? Or keep filename, update UI strings |
| `src/styles/globals.css` | Accent color tokens, gradient pairs, typography updates |
| `docs/design-system.md` | Update with new visual direction + accent palette |

## Dependencies & Prerequisites

**Requires Briell (Airtable admin):**
- Add `Cadence` field to Lists table (Phase 1 blocker)
- Add `Birthday`, `Interests`, `Milestones`, `Relationship Context` fields to Contacts table (Phase 4 blocker)

**No new npm dependencies required.** SVG ring is ~15 lines, no library. Floating nav is CSS. Everything built with existing stack.

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Interactions fetch still slow with 90-day filter | Low | High | filterByFormula caps growth; loading skeleton per section |
| Scoring formula feels wrong to Moj | Medium | Medium | Ship simple version, iterate on weights with her feedback |
| Visual overhaul scope creep | High | Medium | Phase 5 is last — ship functional dashboard first |
| Airtable rate limits (5 req/sec) on startup burst | Low | Medium | Concurrent fetches with stale-while-revalidate; sequential pagination is self-throttling |
| React Flow state lost on tab switch | None | High | ReactFlowProvider at app level prevents this |
| Pod rename touches many files | Medium | Low | Find-and-replace List→Pod; do it once in Phase 1 |
| Snooze state not shared across devices/team | Low (for now) | Low | Document limitation; move to Airtable field later |

## Success Metrics

1. **Moj opens the app daily** — it becomes a morning habit
2. **Team understands the network** — Briell can look at it and immediately understand what needs attention
3. **Relationship behavior changes** — more consistent check-ins, fewer dormant contacts over time
4. **Overdue count trends down** — measurable from the data over weeks

## References

- Brainstorm: `docs/brainstorms/2026-03-18-app-redesign-social-equity-brainstorm.md`
- Design system: `docs/design-system.md`
- Current dashboard: `src/components/dashboard/Dashboard.tsx`
- Data layer: `src/lib/airtable.ts`
- React Flow state pattern: `docs/solutions/react-patterns/state-refresh-circular-callback-pattern.md`
- Oura readiness score methodology: https://ouraring.com/blog/readiness-score/
- React Flow viewport API: https://reactflow.dev/api-reference/hooks/use-react-flow
- React Router layout routes: https://reactrouter.com/start/data/routing
- Airtable rate limits: https://airtable.com/developers/web/api/rate-limits
