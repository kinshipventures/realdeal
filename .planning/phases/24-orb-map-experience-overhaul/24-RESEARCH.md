# Phase 24: Orb Map Experience Overhaul - Research

**Researched:** 2026-04-02
**Domain:** React Flow (@xyflow/react v12), canvas animation, view-state management
**Confidence:** HIGH

## Summary

The map is already built on a solid foundation: React Flow v12 for the canvas, `hubLayout()` for orbital ring math, `SolidOrb` for the shared visual component, and CSS keyframe animations for entrance effects. The overhaul transforms the single-level hub view into a two-level drill-down system without changing the fundamental architecture.

The primary challenge is view-state management during the drill-in/drill-out transition: replacing the current flat node set with a new set while animating position changes. React Flow's `setNodes`/`setEdges` and `setViewport` (from `useReactFlow`) are the levers. The animation sequences (zoom camera + rearrange nodes) require manual `requestAnimationFrame` loops or CSS-class-based transitions applied to node `data` - the same pattern used by the existing snap-to-ring drag behavior.

The Cmd+K search bridge, health-encoded edges, hub stats display, and hover tooltips are all self-contained additions that compose cleanly on top of the existing architecture.

**Primary recommendation:** Drive the drill-in/drill-out with a `mapView` state enum (`'hub' | 'pod'`) in OrbMap, build separate `buildDrillNodes()`/`buildDrillEdges()` functions paralleling `buildHomeNodes()`/`buildHomeEdges()`, and orchestrate the transition with a short animation sequence using `requestAnimationFrame` and `useReactFlow().setViewport`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Clicking a pod orb zooms into it - the pod becomes the new center hub with categories orbiting
- **D-02:** Recursive layout structure - pod drill-down reuses same orbital ring layout as hub view
- **D-03:** Two levels deep only: hub > pod > (category click navigates to PodDetailPage)
- **D-04:** Clicking a category orb in drill-down view navigates to PodDetailPage, not a side drawer
- **D-05:** Back navigation: toolbar back arrow + breadcrumb (Hub > Pod Name). Center pod orb is NOT a back button
- **D-06:** Center orb in drill-down is purely visual/informational - not interactive
- **D-07:** Hub-to-pod edges on hub view only (spoke pattern from MRM). No edges on pod drill-down view
- **D-08:** Edge health encoding: thickness + opacity. Color stays neutral (white/gray)
- **D-09:** No extra attention signals beyond existing health rings and new edge thickness
- **D-10:** GradientEdge component exists but needs adaptation for thickness-based health encoding
- **D-11:** MRM hub orb becomes network stats display - overall health score, total contacts, or key metric. Informational only
- **D-12:** Hover tooltip on pod orbs: floating card showing health score, contact count, overdue count, last interaction date. Read-only
- **D-13:** No map-native search/filter UI. Bridge Cmd+K search to map: matching pods pulse/highlight on canvas
- **D-14:** Category orb click in drill-down navigates to PodDetailPage (confirmed in D-04)
- **D-15:** Hub-to-pod drill-in: smooth zoom + reorganize (~400-600ms)
- **D-16:** Pod-to-hub zoom-back: full reverse of drill-in animation with spatial continuity
- **D-17:** Keep existing orbit-start entrance animation for initial hub load
- **D-18:** Mobile is not a priority - basic tap navigation, desktop is the focus

### Claude's Discretion
- Animation easing curves and exact timing within the 400-600ms window
- Hover tooltip layout and exact stats shown
- Hub orb stat display design (which metric, typography)
- Edge thickness range (min/max px) and opacity mapping from health scores
- Breadcrumb/toolbar styling
- How the Cmd+K search highlight bridge works technically
- Category orbital ring radius and spacing at drill-down level

### Deferred Ideas (OUT OF SCOPE)
- "Needs attention" semantics and CTAs
- Additional attention signals (pulse, badges) beyond confirmed features
- Map-native filter bar
- Three-level drill-down
- Custom mobile gestures
- Cross-pod relationship edges
- Contact presence on the map canvas
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MAP-01 | Navigation depth - pod drill-down, two levels | `buildDrillNodes()` function + `mapView` state enum drives the level switch |
| MAP-02 | Edge connections - hub-to-pod spoke edges with health encoding | `GradientEdge` adaptation with dynamic `strokeWidth` and `opacity` from equity score |
| MAP-03 | Contact presence (deferred per CONTEXT.md) | Out of scope this phase |
| MAP-04 | Health glanceability - health rings already exist, edges add weight signal | `equityByPod` already computed in `OrbMap`, feed into edge data |
| MAP-05 | Hub interactivity - MRM shows network stats | `MojNode` update to render `overallEquityScore` + total contact count |
| MAP-06 | Search/filter bridge - Cmd+K highlights pods | `highlightedPodIds` state in OrbMap, `SearchPalette` callback from App.tsx |
| MAP-07 | State transitions - animated drill-in/out | RAF-based position interpolation + `setViewport` for camera move |
| MAP-08 | Map interactions - hover tooltips on pod orbs | Tooltip overlay positioned relative to node, shown via `hoveredPodId` state |
| MAP-09 | Mobile - basic tap, no custom gestures | No change required (React Flow touch events already work) |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react | ^12.10.1 | Canvas, nodes, edges, viewport | Already in use, v12 is current stable |
| react | ^19.2.0 | Component model | Already in use |
| react-router | ^7.13.1 | Navigation (PodDetailPage target) | Already in use |

### Key APIs Used (verified from codebase)
| API | Purpose |
|-----|---------|
| `useReactFlow().setViewport(vp, {duration})` | Animated camera zoom during drill-in/out |
| `useNodesState` / `useEdgesState` | Node and edge graph state |
| `setNodes(fn)` | Imperatively update node positions during animation |
| `useOnViewportChange` | Persist viewport on pan/zoom |
| `fitView` / `fitViewOptions` | Initial fit - disable for drill-in to control camera manually |

**No new dependencies required.** Everything needed is already in `@xyflow/react` v12.

## Architecture Patterns

### View State Machine
```
mapView: 'hub' | 'pod'
selectedPod: Pod | null   (null when in hub view)
```

State lives in `OrbMap`. Transition functions:
- `drillIntoPod(pod)` - switches to 'pod' view, builds drill nodes, animates camera
- `drillBackToHub()` - switches back to 'hub', rebuilds home nodes, reverses camera

### Recommended Node Structure at Drill-Down Level
```
nodes:
  - moj-center (type: 'moj') - repurposed as pod hero: pod name, health ring, no click
  - category nodes (type: 'category') - 64px, orbiting at radius ~200-230px
  - [no create-category node in this phase - out of scope]
edges: [] (D-07: no edges in drill-down view)
```

### buildDrillNodes() Pattern
Mirrors `buildHomeNodes()` exactly:
- `hubLayout()` can be reused directly - pass categories as the items array, hub center is the selected pod
- Pod orb repurposed as new hub: use `MojNodeComponent` or extend it with pod color/gradient + health ring
- Category nodes built with existing `CategoryNodeComponent` with `onClick: () => navigate('/pod/${pod.id}')`

### Animation Sequence: Drill-In (D-15)
```
1. setViewport - zoom camera toward clicked pod position (~200ms, easeIn)
2. After 150ms - fade out non-selected pods (CSS opacity via node data class flag)
3. setNodes - replace with drill nodes (clicked pod grows to center, cats expand outward)
4. setViewport - re-center on origin (~200ms, easeOut)
Total: ~450ms
```

Use `useReactFlow().setViewport(target, { duration: 200 })` - React Flow v12 supports duration-based viewport animation natively.

### Animation Sequence: Drill-Out (D-16)
Full reverse - categories collapse, pod shrinks back, other pods fade in, camera re-fits.

### Hub Orb Stats (D-11)
`MojNodeComponent` accepts new optional `data` fields:
```typescript
type MojNodeData = {
  overallHealth?: number   // 0-100 from overallEquityScore()
  totalContacts?: number
}
```
Render the score large (Fraunces serif) with a small label below. Already computed in `OrbMap` via `equityByPodRef`.

### Health-Encoded Edges (D-07, D-08)
`GradientEdge` current props: `{ color: string }`. Extend to:
```typescript
type GradientEdgeData = {
  color: string
  healthPercent?: number  // 0-100
}
```
Map health to thickness and opacity:
- thickness: `1.5 + (healthPercent / 100) * 3.5` → range 1.5px (fading) to 5px (thriving)
- opacity: `0.15 + (healthPercent / 100) * 0.55` → range 0.15 (fading) to 0.70 (thriving)

`buildHomeEdges()` currently returns `[]` - replace with:
```typescript
pods.map(pod => ({
  id: `moj-${pod.id}`,
  type: 'gradient',
  source: MOJ_ID,
  target: pod.id,
  data: { color: 'rgba(255,255,255,0.9)', healthPercent: equityByPod[pod.id] ?? 0 }
}))
```

### Cmd+K Search Bridge (D-13)
OrbMap exposes a callback prop or uses a ref-based imperative handle:

**Option A - prop (simpler, recommended):** App.tsx passes `onSearchMatch` callback to OrbMap. When `SearchPalette` selects a contact, App resolves the contact's `list_ids` and calls `onSearchMatch(podIds)`. OrbMap stores `highlightedPodIds: Set<string>` in state and passes a `highlighted` flag to matching pod node data.

Pod node renders a pulsing ring when `highlighted === true` - a CSS class `.orb-highlight-pulse` using the existing `pulse-ring` keyframe already defined in `index.css`.

The highlight clears after 2.5s via `setTimeout` or on next user interaction.

### Hover Tooltip (D-12)
Not a React Flow overlay - render as absolute-positioned div in the OrbMap container, above the canvas:
```
hoveredPod: { podId: string; screenX: number; screenY: number } | null
```
ListNode calls `onHoverEnter(podId, event.clientX, event.clientY)` via node data callback. OrbMap renders the tooltip div at those coordinates. This avoids React Flow's coordinate system complexity.

Tooltip content: pod name, health score + label, contact count, overdue count.

### Breadcrumb Navigation Bar (D-05)
Absolutely positioned overlay inside the OrbMap container (`zIndex: 20`), shown only when `mapView === 'pod'`:
```
[ <- ]  Hub  >  {pod.name}
```
Back arrow calls `drillBackToHub()`. Simple inline styles consistent with the existing reset-layout button style (backdrop blur, border, panel-bg).

### Anti-Patterns to Avoid
- **Do not use React Flow's `onNodeClick` for drill-in without stopping event propagation** - drag and click share the same event; use `onNodeMouseUp` with a drag-distance guard or check React Flow's node `dragging` state
- **Do not persist drill-down positions to localStorage** - `savePosition` should only run in hub view; check `mapView === 'hub'` before calling `savePosition`
- **Do not re-run the orbit-start entrance animation on drill-back** - it plays once on initial load via CSS animation fill mode; re-entering drill nodes will replay it unless you conditionally omit the `orbit-start` class
- **Do not use `fitView` during drill-in transition** - it fights the manual `setViewport` animation; disable `fitView` prop after initial load or use a `fitViewOnInit` ref

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Animated viewport pan/zoom | Manual RAF loop with lerp | `useReactFlow().setViewport(target, { duration })` - built into @xyflow/react v12 |
| Straight-line hub-to-pod edges | Custom SVG path logic | `getStraightPath` from `@xyflow/react` (already imported pattern in GradientEdge) |
| Orbital layout math | New geometry function | Reuse existing `hubLayout()` - pass categories as items |
| Search result highlighting | Custom event bus | React state + prop callback through App.tsx (already the pattern for ContactDetail) |

## Common Pitfalls

### Pitfall 1: Click vs Drag Conflict
**What goes wrong:** `onNodeClick` fires even after a drag, triggering drill-in unintentionally.
**Why it happens:** React Flow fires click on mouseup regardless of drag distance.
**How to avoid:** Track mouse-down position in `onNodeDragStart`; in `onNodeClick` check if `Math.abs(dragDelta) > threshold` (e.g. 5px) and bail. Or use React Flow's `dragging` node property.
**Warning signs:** Drill-in triggers after dragging a pod to a new ring position.

### Pitfall 2: Node Position Persistence Bleeding into Drill View
**What goes wrong:** Category node positions in drill-down get saved to localStorage under their IDs, overwriting positions when they later appear as satellite dots or in the hub view.
**Why it happens:** `handleNodeDragStop` saves position for any node except MOJ_ID.
**How to avoid:** Guard `savePosition` with `if (mapView === 'hub')` or use a separate namespace for drill positions.

### Pitfall 3: `orbit-start` Animation Replay on Drill-Back
**What goes wrong:** When returning to hub view and rebuilding home nodes, all pods replay the orbit-start entrance animation.
**Why it happens:** CSS animation replays whenever the DOM element re-mounts. React Flow unmounts/remounts nodes when `setNodes` replaces the array.
**How to avoid:** On drill-back, set nodes without the `orbit-start` class, or track a `hasAnimated` ref and conditionally apply the class only on initial mount.

### Pitfall 4: `setViewport` with `duration` Conflicting with `useOnViewportChange`
**What goes wrong:** The animated viewport transition triggers `useOnViewportChange`, which tries to write to localStorage mid-animation, causing jank or stale viewport saves.
**Why it happens:** `useOnViewportChange.onEnd` fires after the animation settles, but `onChange` fires continuously during it.
**How to avoid:** Set an `isAnimating` ref; skip localStorage writes in `onChange` when `isAnimating === true`. Only save on `onEnd` when `isAnimating === false`.

### Pitfall 5: Hub Center Coordinate Drift After Drill-Back
**What goes wrong:** After drill-in/out, the hub doesn't re-center correctly because `buildHomeNodes` uses `{ x: 0, y: 0 }` as the logical canvas origin but the viewport has shifted.
**Why it happens:** `setViewport` and node positions are in separate coordinate spaces.
**How to avoid:** Always `setViewport({ x: 0, y: 0, zoom: 1 })` as the terminal state of drill-back, or use `fitView` after the animation completes.

## Code Examples

### Viewport animation (React Flow v12)
```typescript
// Source: @xyflow/react v12 API
const { setViewport } = useReactFlow()

// Animate toward a target position with duration
setViewport({ x: targetX, y: targetY, zoom: 1.4 }, { duration: 300 })
```

### Straight edge path (already available)
```typescript
// Source: @xyflow/react - getStraightPath for hub spokes
import { getStraightPath } from '@xyflow/react'
const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY })
```

### Reusing hubLayout() for category orbital ring
```typescript
// Categories treated as "pods" for layout purposes
const catItems = categories.map(cat => ({ id: cat.id, is_priority: false }))
const { listPositions } = hubLayout(catItems, {})
// listPositions.get(cat.id) gives orbital position
```

### Highlight pulse (existing keyframe)
```css
/* pulse-ring already defined in index.css */
.orb-highlight {
  animation: pulse-ring 1.5s ease-in-out 2;
}
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `buildHomeEdges` returns `[]` | Build health-encoded edges from MRM to each pod | Adds visual health signal without new deps |
| ListNode `onClick: () => navigate('/pod/${id}')` | `onClick: () => drillIntoPod(pod)` | Keeps user on canvas instead of route change |
| MojNode renders static "MRM" text | MojNode renders `overallHealth` score + contact count | Hub becomes informational |

## Open Questions

1. **Drill-in animation: viewport zoom target coordinates**
   - What we know: React Flow node positions are in canvas coordinates; viewport `x/y` are screen-space offsets
   - What's unclear: The exact formula to compute the correct `setViewport` target to zoom toward a specific node's canvas position
   - Recommendation: Use `flowToScreenPosition` from `useReactFlow()` to convert node position to screen coords, then invert for viewport math. Alternatively, just animate to `{ x: -nodePos.x * zoom + canvasCenterX, y: -nodePos.y * zoom + canvasCenterY }`.

2. **Highlight bridge: where to resolve contact -> pod mapping**
   - What we know: `SearchPalette` returns a `Contact` via `onSelectContact`. Contact has `list_ids`.
   - What's unclear: Whether App.tsx or OrbMap should own the contact->pod resolution
   - Recommendation: App.tsx calls `onSearchMatch(contact.list_ids)` into OrbMap via prop - OrbMap already owns pod data and doesn't need to re-fetch.

## Sources

### Primary (HIGH confidence)
- Source code: `src/components/map/OrbMap.tsx` - full architecture, hubLayout, buildHomeNodes, snap-to-ring animation
- Source code: `src/components/map/SolidOrb.tsx` - orb component, health ring geometry
- Source code: `src/components/map/GradientEdge.tsx` - current edge implementation
- Source code: `src/components/map/ListNode.tsx`, `CategoryNode.tsx`, `MojNode.tsx` - node component APIs
- Source code: `src/index.css` - animation keyframes, CSS custom properties, existing classes
- Source code: `src/lib/equity.ts` - health scoring pipeline
- Source code: `src/App.tsx` - SearchPalette wiring, mapView location
- `package.json`: `@xyflow/react: ^12.10.1` - confirmed version

### Secondary (MEDIUM confidence)
- @xyflow/react v12 API: `setViewport` with `{ duration }` option confirmed in v12 changelog and TypeScript types in node_modules

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use, versions confirmed from package.json
- Architecture: HIGH - based on reading actual source code, no assumptions
- Animation patterns: MEDIUM - `setViewport` duration option inferred from v12 types; formula for zoom-to-node coordinates is a known open question
- Pitfalls: HIGH - derived directly from existing code patterns and known React Flow behaviors

**Research date:** 2026-04-02
**Valid until:** 2026-05-02
