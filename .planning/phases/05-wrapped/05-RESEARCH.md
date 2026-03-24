# Phase 5: Wrapped - Research

**Researched:** 2026-03-24
**Domain:** Dashboard insight card — data aggregation, animated card carousel, Spotify Wrapped visual treatment
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Single insight card on the dashboard, positioned below pod health cards and above the "coming up" birthday section
- **D-02:** One card visible at a time — tap/click to cycle to the next insight. No auto-rotation timer.
- **D-03:** Three insights in rotation: people reached (unique contacts with interactions), top pod (highest equity score), most connected (contact with most interactions)
- **D-04:** Wrapped card style from `docs/design-exploration/10-data-visualization.html` — pod-colored gradient background, white text, radial highlight overlay
- **D-05:** Big stat: Fraunces 900 weight, large display size, tight letter-spacing. Label below in Fraunces 700. Sub-label in body font at reduced opacity.
- **D-06:** Card uses `POD_SHIFT_COLORS` gradient map for background (same as orbs and dashboard pod cards). Top pod card uses that pod's color; others use brand green gradient.
- **D-07:** Subtle dot indicators showing current position in the 3-card rotation (like carousel dots)
- **D-08:** "People reached" and "most connected" use rolling 7-day window from today
- **D-09:** "Top pod" uses existing `podEquityScore()` which already operates on a 90-day rolling window — no custom window needed
- **D-10:** All data computed client-side from existing cached contacts, pods, and interactions — no new Airtable calls
- **D-11:** When no interactions exist in the window, show an empty state card with encouraging copy (Claude's discretion on exact copy)
- **D-12:** Empty state card shows a dismiss/hide option on hover — hides the card for the session (not permanently)

### Claude's Discretion
- Exact card dimensions and border-radius
- Transition animation between cards (fade, slide, or crossfade)
- Specific gradient angle and radial overlay positioning
- Empty state copy and dismiss interaction pattern
- Whether "most connected" shows contact name only or name + interaction count

### Deferred Ideas (OUT OF SCOPE)
- Full-screen swipeable Wrapped slideshow (monthly/quarterly ceremony) — future phase
- Shareable Wrapped images (export as PNG for social) — future
- Historical trend comparison ("up 20% from last week") — future, needs interaction history beyond 90-day cache
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WRAP-01 | Monthly Wrapped view shows key stats (contacts reached, intros made, top pods) as full-bleed gradient slides | Scoped to dashboard insight card per CONTEXT.md. Data computed from existing `allInteractions` + `byContact` index already in Dashboard state. |
| WRAP-02 | Wrapped slides use Fraunces display type with pod-colored gradients per the design system spec | Fraunces already loaded at weights 400/700/800/900 in index.html. `POD_SHIFT_COLORS` in `SolidOrb.tsx` is the gradient source. CSS spec confirmed in `10-data-visualization.html`. |
</phase_requirements>

---

## Summary

Phase 5 adds a rotating insight card to the Dashboard — three stat cards cycling on tap, styled in the "Spotify Wrapped" aesthetic: full-bleed pod-colored gradient, large Fraunces display numerals, white text hierarchy. The scope was deliberately narrowed from a fullscreen ceremony to a compact dashboard component.

All data dependencies are already wired in `Dashboard.tsx`. The component receives `contacts`, `pods`, and `allInteractions` (and the `byContact` index) as existing state. Three stats need computing via `useMemo`: people reached (7-day window), top pod (best `podEquityScore()`), most connected (contact with the highest interaction count in 7 days). No new Airtable calls.

The visual system is fully specified. The design exploration HTML (`10-data-visualization.html`) contains the exact CSS for `.wrapped-card`, `.wrapped-stat`, `.wrapped-label`, and `.wrapped-sub`. The gradient follows the same `linear-gradient(135deg, color, shiftColor)` pattern already used by pod health cards and SolidOrb. The radial overlay is a `::before` pseudo-element at `radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.12) 0%, transparent 60%)`.

**Primary recommendation:** Build as a single `WrappedCard.tsx` component that accepts an array of insight objects and manages its own `activeIndex` state. Compute insights via `useMemo` in Dashboard and pass down — keeps Dashboard as the single data owner.

---

## Standard Stack

No new dependencies. Everything needed exists in the project.

### Core (already installed)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| React | 19 | Component + state | `useState` for activeIndex, `useMemo` for stats |
| Fraunces | loaded | Display serif font | Weights 400/700/800/900 available |
| POD_SHIFT_COLORS | n/a | Gradient color map | In `src/components/map/SolidOrb.tsx` |
| equity.ts functions | n/a | `podEquityScore`, `indexByContact` | Already imported in Dashboard |

**No new packages required.**

---

## Architecture Patterns

### Recommended Component Structure

```
src/components/dashboard/
├── Dashboard.tsx          # existing — add wrappedInsights useMemo, render <WrappedCard>
└── WrappedCard.tsx        # new — owns activeIndex, renders one insight at a time
```

### Pattern: Insight Object Array

Compute a typed array in Dashboard, pass to WrappedCard. Component is display-only.

```typescript
// Computed in Dashboard via useMemo
interface WrappedInsight {
  type: 'people-reached' | 'top-pod' | 'most-connected'
  stat: string           // e.g. "12", "Sarah Chen", "LPs"
  label: string          // e.g. "people reached", "top pod", "most connected"
  sub: string            // e.g. "this week", "highest equity", "7 interactions"
  color: string          // hex — from pod or brand green
  shiftColor: string     // from POD_SHIFT_COLORS
}
```

### Pattern: WrappedCard Internal State

```typescript
// WrappedCard.tsx
export function WrappedCard({ insights }: { insights: WrappedInsight[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [hovered, setHovered] = useState(false)

  if (dismissed) return null

  const current = insights[activeIndex]

  function handleClick() {
    setActiveIndex(i => (i + 1) % insights.length)
  }

  return (
    <div onClick={handleClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {/* gradient card */}
      {hovered && <DismissButton onClick={() => setDismissed(true)} />}
      {/* dot indicators */}
    </div>
  )
}
```

### Pattern: Visual Spec (from 10-data-visualization.html)

```css
/* .wrapped-card */
border-radius: 16px;
padding: 24px 20px;
text-align: center;
color: white;
position: relative;
overflow: hidden;
background: linear-gradient(135deg, {color} 0%, {shiftColor} 100%);

/* ::before — radial highlight overlay */
content: '';
position: absolute;
inset: 0;
background: radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.12) 0%, transparent 60%);

/* .wrapped-stat — big number */
font-family: var(--font-serif); /* Fraunces */
font-weight: 900;
font-size: 48px;
letter-spacing: -0.04em;
line-height: 1;
position: relative;
z-index: 1;

/* .wrapped-label */
font-size: 12px;
font-weight: 500;
opacity: 0.75;
margin-top: 8px;
position: relative;
z-index: 1;

/* .wrapped-sub */
font-size: 10px;
opacity: 0.50;
margin-top: 4px;
position: relative;
z-index: 1;
```

### Pattern: Gradient Colors

```typescript
// Source: src/components/map/SolidOrb.tsx
export const POD_SHIFT_COLORS: Record<string, string> = {
  '#E53935': '#FF6B4A',
  '#FF6B8A': '#FF8FA5',
  '#7E57C2': '#5C6BC0',
  '#25B439': '#00BFA5',   // brand green — use for people-reached + most-connected
  '#F5A623': '#FFD54F',
  '#1C1C1E': '#2C2C30',
}

// Top pod card: pod.color → POD_SHIFT_COLORS[pod.color] ?? pod.color
// Others: '#25B439' → '#00BFA5'
```

### Pattern: Dot Indicators

Three dots below the card. Active dot is white at full opacity; inactive dots at 0.35 opacity. No animations needed — opacity swap on index change is sufficient.

```tsx
<div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
  {insights.map((_, i) => (
    <div key={i} style={{
      width: 5,
      height: 5,
      borderRadius: '50%',
      background: 'white',
      opacity: i === activeIndex ? 1 : 0.35,
      transition: 'opacity 0.2s',
    }} />
  ))}
</div>
```

### Pattern: Dashboard Insertion Point

From `Dashboard.tsx` layout order (lines 286–322):

```
Pod health cards (line 286)
→ INSERT: <WrappedCard> here
Coming Up / birthdays (line 294)
Today's Focus (line 311)
Needs attention / overdue (line 325)
```

Insert the WrappedCard block between `podStats` cards and `upcomingBirthdays` — this matches D-01.

### Pattern: Stat Computation

All three stats need to be computed from `allInteractions` with a 7-day window (except top pod, which uses `podEquityScore`).

```typescript
const wrappedInsights = useMemo((): WrappedInsight[] => {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

  // People reached: unique contacts touched in last 7 days
  const recentContactIds = new Set(
    allInteractions
      .filter(ix => new Date(ix.date).getTime() >= sevenDaysAgo)
      .map(ix => ix.contact_id)
  )
  const peopleReached = recentContactIds.size

  // Top pod: highest podEquityScore across all pods
  const podScores = pods.map(p => ({
    pod: p,
    score: podEquityScore(contacts.filter(c => c.list_ids.includes(p.id)), byContact),
  }))
  const topPodEntry = podScores.sort((a, b) => b.score - a.score)[0] ?? null

  // Most connected: contact with most interactions in last 7 days
  const countByContact = new Map<string, number>()
  for (const ix of allInteractions) {
    if (new Date(ix.date).getTime() >= sevenDaysAgo) {
      countByContact.set(ix.contact_id, (countByContact.get(ix.contact_id) ?? 0) + 1)
    }
  }
  let topContactId: string | null = null
  let topCount = 0
  for (const [id, count] of countByContact) {
    if (count > topCount) { topCount = count; topContactId = id }
  }
  const topContact = topContactId ? contacts.find(c => c.id === topContactId) : null

  // Guard: if no recent activity, return empty array → WrappedCard shows empty state
  if (peopleReached === 0) return []

  const insights: WrappedInsight[] = []

  insights.push({
    type: 'people-reached',
    stat: String(peopleReached),
    label: 'people reached',
    sub: 'this week',
    color: '#25B439',
    shiftColor: '#00BFA5',
  })

  if (topPodEntry) {
    const shiftColor = POD_SHIFT_COLORS[topPodEntry.pod.color] ?? topPodEntry.pod.color
    insights.push({
      type: 'top-pod',
      stat: topPodEntry.pod.name,
      label: 'top pod',
      sub: `${topPodEntry.score} equity score`,
      color: topPodEntry.pod.color,
      shiftColor,
    })
  }

  if (topContact) {
    insights.push({
      type: 'most-connected',
      stat: topContact.name.split(' ')[0], // first name only fits display size
      label: 'most connected',
      sub: `${topCount} interaction${topCount !== 1 ? 's' : ''} this week`,
      color: '#25B439',
      shiftColor: '#00BFA5',
    })
  }

  return insights
}, [allInteractions, contacts, pods, byContact])
```

### Anti-Patterns to Avoid

- **Putting `activeIndex` in Dashboard state:** WrappedCard owns its own display state. Dashboard only owns data.
- **Using `type="button"` on the card div:** Card is a `div` with `onClick` and `cursor: pointer`, not a `<button>`. Matches existing interactive card patterns in Dashboard.
- **Auto-rotation timer:** Explicitly excluded per D-02. Do not add a `setInterval`.
- **Persistent dismiss:** D-12 says session-only. Use `useState(false)` — no localStorage write.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Gradient colors | Custom color mapping | `POD_SHIFT_COLORS` from `SolidOrb.tsx` |
| Pod scoring | Custom aggregation | `podEquityScore()` from `equity.ts` |
| Interaction index | Re-scanning all interactions | `byContact` (already computed in Dashboard) |
| Font loading | Adding new font | Fraunces already loaded at all needed weights |

---

## Common Pitfalls

### Pitfall 1: `stat` display overflows for long pod/contact names

**What goes wrong:** "Top pod" and "most connected" show a name as the big stat. Long names (e.g. "Service Providers") overflow the card width at 48px Fraunces.

**Why it happens:** The design spec uses numbers as the primary stat — names at 48px/900 weight are wide.

**How to avoid:** Cap display: first name only for contacts (split on space, take index 0). For pod names, truncate at ~12 chars with ellipsis, or reduce font-size to 32px when `stat.length > 10`.

**Warning signs:** Test with the actual "Service Providers" pod name during implementation.

### Pitfall 2: `wrappedInsights` returns stale data during interaction load

**What goes wrong:** `allInteractions` is loaded asynchronously (`interactionsLoading` state). If `wrappedInsights` useMemo runs before interactions are ready, it always shows empty state.

**Why it happens:** `useMemo` runs eagerly on every dependency change — including the initial `[]` before data loads.

**How to avoid:** Gate the WrappedCard render on `!interactionsLoading`:
```tsx
{!interactionsLoading && wrappedInsights !== undefined && (
  <WrappedCard insights={wrappedInsights} />
)}
```

### Pitfall 3: `POD_SHIFT_COLORS` lookup fails for pod color not in the map

**What goes wrong:** A pod created with a hex color not in the 6-key `POD_SHIFT_COLORS` map returns `undefined`, breaking the gradient.

**Why it happens:** The map only covers the design system pod palette. Custom or future colors aren't included.

**How to avoid:** Always use a fallback: `POD_SHIFT_COLORS[pod.color] ?? pod.color`. This produces a single-color gradient (still valid CSS) rather than broken output.

### Pitfall 4: `z-index: 1` missing on text elements inside the gradient card

**What goes wrong:** The `::before` radial overlay pseudo-element sits on top of text, making it unreadable.

**Why it happens:** The `::before` overlay has no z-index — it stacks on top of siblings unless text has `position: relative; z-index: 1`.

**How to avoid:** All text elements (stat, label, sub, dots) need `position: relative; z-index: 1`. This is explicit in the design exploration CSS spec and must be replicated in the React inline styles.

---

## Code Examples

### Full WrappedCard structure (inline styles matching project patterns)

```tsx
// Source: docs/design-exploration/10-data-visualization.html (.wrapped-card spec)
// Pattern: mirrors PodCard inline style approach in Dashboard.tsx

<div
  onClick={handleClick}
  onMouseEnter={() => setHovered(true)}
  onMouseLeave={() => setHovered(false)}
  style={{
    borderRadius: 16,
    padding: '24px 20px',
    textAlign: 'center',
    color: 'white',
    position: 'relative',
    overflow: 'hidden',
    background: `linear-gradient(135deg, ${current.color} 0%, ${current.shiftColor} 100%)`,
    cursor: 'pointer',
    userSelect: 'none',
    marginBottom: 24,
  }}
>
  {/* Radial overlay — same as pod health cards */}
  <div style={{
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.12) 0%, transparent 60%)',
    pointerEvents: 'none',
  }} />

  {/* Big stat */}
  <div style={{
    fontFamily: 'var(--font-serif)',
    fontWeight: 900,
    fontSize: 48,
    letterSpacing: '-0.04em',
    lineHeight: 1,
    position: 'relative',
    zIndex: 1,
  }}>
    {current.stat}
  </div>

  {/* Label */}
  <div style={{
    fontSize: 12,
    fontWeight: 500,
    opacity: 0.75,
    marginTop: 8,
    position: 'relative',
    zIndex: 1,
  }}>
    {current.label}
  </div>

  {/* Sub-label */}
  <div style={{
    fontSize: 10,
    opacity: 0.50,
    marginTop: 4,
    position: 'relative',
    zIndex: 1,
  }}>
    {current.sub}
  </div>

  {/* Dot indicators */}
  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16, position: 'relative', zIndex: 1 }}>
    {insights.map((_, i) => (
      <div key={i} style={{
        width: 5, height: 5, borderRadius: '50%', background: 'white',
        opacity: i === activeIndex ? 1 : 0.35, transition: 'opacity 0.2s',
      }} />
    ))}
  </div>

  {/* Dismiss button — show on hover */}
  {hovered && (
    <button onClick={e => { e.stopPropagation(); setDismissed(true) }} style={{
      position: 'absolute', top: 10, right: 10,
      background: 'rgba(255,255,255,0.20)', border: 'none',
      borderRadius: 6, padding: '2px 8px',
      color: 'white', fontSize: 11, cursor: 'pointer',
      zIndex: 2,
    }}>
      hide
    </button>
  )}
</div>
```

### Empty state card

```tsx
// When wrappedInsights.length === 0 (no interactions in window)
<div style={{
  borderRadius: 16,
  padding: '24px 20px',
  textAlign: 'center',
  color: 'white',
  position: 'relative',
  overflow: 'hidden',
  background: 'linear-gradient(135deg, #25B439 0%, #00BFA5 100%)',
  marginBottom: 24,
}}>
  <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.12) 0%, transparent 60%)', pointerEvents: 'none' }} />
  <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 18, position: 'relative', zIndex: 1 }}>
    Your week is quiet
  </div>
  <div style={{ fontSize: 12, opacity: 0.70, marginTop: 6, position: 'relative', zIndex: 1 }}>
    Log an interaction to start your weekly pulse.
  </div>
  {hovered && <button ...>hide</button>}
</div>
```

---

## Integration Map

### Where to insert in Dashboard.tsx

Current layout order (confirmed by reading Dashboard.tsx lines 286–322):

```
line 286: Pod health cards (podStats horizontal scroll)
↓ INSERT WrappedCard here (new, ~5 lines)
line 294: "coming up" section (upcomingBirthdays)
line 311: "today's focus" section (focusItems)
line 325: "needs attention" section (overdueContacts)
```

```tsx
{/* Wrapped insight card */}
{!interactionsLoading && (
  <WrappedCard insights={wrappedInsights} />
)}
```

### Existing imports already in Dashboard.tsx

```typescript
import { POD_SHIFT_COLORS } from '../map/SolidOrb'        // already imported
import { podEquityScore, indexByContact } from '../../lib/equity'  // already imported
// allInteractions, contacts, pods, byContact — all in existing state
```

The only new import needed is `WrappedCard` itself.

---

## Sources

### Primary (HIGH confidence)
- `/Users/gabrielmurray/dev/kinshipbrain/docs/design-exploration/10-data-visualization.html` — `.wrapped-card`, `.wrapped-stat`, `.wrapped-label`, `.wrapped-sub` CSS spec; radial overlay pattern
- `/Users/gabrielmurray/dev/kinshipbrain/src/components/map/SolidOrb.tsx` — `POD_SHIFT_COLORS` map (6 pod hex colors → shift colors)
- `/Users/gabrielmurray/dev/kinshipbrain/src/lib/equity.ts` — `podEquityScore()`, `indexByContact()`, `INTERACTION_WEIGHTS`
- `/Users/gabrielmurray/dev/kinshipbrain/src/components/dashboard/Dashboard.tsx` — existing state shape, layout order, `byContact` pattern, `PANEL` constant, `useMemo` patterns
- `/Users/gabrielmurray/dev/kinshipbrain/.planning/phases/05-wrapped/05-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)
- `/Users/gabrielmurray/dev/kinshipbrain/docs/design-system.md` — typography scale (Fraunces weights confirmed), spacing grid, color tokens

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all assets verified in codebase
- Architecture: HIGH — component shape derived from existing Dashboard patterns + explicit CONTEXT.md decisions
- Data computation: HIGH — all functions verified in equity.ts, all state confirmed in Dashboard.tsx
- Visual spec: HIGH — exact CSS values read from design exploration HTML
- Pitfalls: HIGH — derived from reading actual code, not assumptions

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable codebase, low churn)
