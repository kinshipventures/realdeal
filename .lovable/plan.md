

# Reimagine the Pods/Map Page - Clarity and Purpose

## The Problem

The orb map is visually striking but functionally opaque. A first-time user sees colored circles with small serif text, a dark hub showing "Network Health: 72 / Steady / 48 people", and has no idea what any of it means or what to do. The vision doc says it should be "Montessori-inspired - self-explanatory, no instruction manual needed." Right now it's the opposite.

## Page Purpose (defined)

The map is **"the quiet room"** (from vision.md) - where you reflect on your network's structure and health at a glance. Its job:
1. Show you the shape of your world (who's grouped where)
2. Surface health at a glance (which pods need love, which are thriving)
3. Let you drill into any group to act

## What Changes

### 1. Contextual legend overlay (first visit + toggle)

A small floating card in the bottom-left that explains the visual language on first visit. Dismissible, re-accessible via a "?" button.

Content:
- "Each orb is a pod - a group of people you care about"
- "The ring around each orb shows relationship health"
- "Click any orb to see who's inside"
- Color-coded health key: green = thriving, blue = steady, amber = cooling, red = fading

Persisted to `localStorage` (`realdeal:map-legend-dismissed`). After dismiss, a small "?" icon stays in the corner to re-open.

### 2. Richer orb labels

Currently orbs show only the pod name in small serif text. Add a second line showing the contact count and a tiny health indicator word, making each orb self-describing:

```text
   --------
  | Maps   |   <-- pod name (existing)
  | 12 Steady |  <-- NEW: count + health label
   --------
```

The health label uses the same color system (green/blue/amber/red) as the existing `scoreLabel()`. Font size scales down gracefully - the count + label line is ~8px, sits below the name.

### 3. Hub orb rewrite - warmer, clearer

Replace the clinical "Network Health / 72 / Steady / 48 people" with warmer copy:

```text
   Your Network
       72
     Steady
   48 relationships
```

"Your Network" replaces "Network Health" - more personal, less dashboard. "relationships" replaces "people" - matches the product's language.

### 4. Contextual action hint on hover (richer tooltip)

The existing hover tooltip shows pod name, health score, contact count, overdue count, last interacted. Improve it:
- Add a one-line suggestion: "3 people need attention" or "All caught up" based on overdue count
- Add a subtle "Click to explore" affordance at the bottom

### 5. Welcome state for new users (zero pods)

The current empty state says "Your network starts here / Create your first pod to start mapping relationships." Improve with:
- A brief explanation: "Pods are groups of people you want to nurture - like Investors, Advisors, or Close Friends"
- Two CTAs: "Create a pod" (primary) and "Import contacts" (secondary link)
- A small illustration hint showing what the map will look like with 3 example orbs (static SVG)

### 6. Page header with context

Add a subtle top-left page title area (only on hub view, not drill-down):
- Eyebrow: "YOUR NETWORK" (10px uppercase, tertiary text)
- Below: overall health as a one-liner: "Steady - 5 pods, 48 relationships"
- Keeps the page grounded without cluttering the canvas

## Files Modified

| File | Change |
|------|--------|
| `src/components/map/OrbMap.tsx` | Add legend overlay, page header, improved empty state, richer tooltip |
| `src/components/map/ListNode.tsx` | Add count + health label line below pod name |
| `src/components/map/MojNode.tsx` | Rewrite hub copy ("Your Network", "relationships") |
| `src/components/map/MapLegend.tsx` | **New** - legend overlay component with health key |

## What Stays the Same

- All map interaction (drag, zoom, drill-down, satellite dots)
- Visual system (orb gradients, health rings, parallax)
- List view toggle
- React Flow architecture

## Technical Notes

- Legend uses same `localStorage` pattern as existing `realdeal:orb-hint-dismissed`
- Health label on orbs reuses `scoreLabel()` from `equity.ts`
- No new data fetching - all info already available in node data props
- The existing bottom hint ("Click a pod to see who's inside") gets folded into the new legend - removed as standalone

