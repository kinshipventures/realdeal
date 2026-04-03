# Phase 24: Orb Map Experience Overhaul - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform the orb map from a static pod picker into a full network exploration tool with in-canvas navigation, visual health indicators, map-native interactions, and animated state transitions. The map becomes a two-level drill-down: hub view (pods orbiting MRM) and pod view (categories orbiting selected pod). Desktop-focused.

</domain>

<decisions>
## Implementation Decisions

### Navigation depth + drill-down
- **D-01:** Clicking a pod orb zooms into it - the pod becomes the new center hub (same layout pattern as the top-level MRM hub) with its categories orbiting around it as orb nodes
- **D-02:** Recursive layout structure: pod drill-down reuses the same orbital ring layout as the hub view. The clicked pod grows to center hub size, categories orbit it
- **D-03:** Two levels deep only: hub > pod > (category click navigates to PodDetailPage). Categories are the deepest canvas level
- **D-04:** Clicking a category orb in the pod drill-down view navigates to PodDetailPage (leaves the map), not a side drawer
- **D-05:** Back navigation: toolbar back arrow + breadcrumb (Hub > Pod Name). The center pod orb is NOT a back button - it stays as the visual hero/anchor with no click action at the drill-down level
- **D-06:** The center orb in drill-down is purely visual/informational (pod name, health ring). Not interactive

### Visual health + edge connections
- **D-07:** Hub-to-pod edges on the hub view only (spoke pattern from MRM to each pod orb). No edges on the pod drill-down view
- **D-08:** Edge health encoding: thickness + opacity. Healthy pods get thick, bright edges. Fading pods get thin, dim edges. Color stays neutral (white/gray) - no color coding on edges
- **D-09:** No extra attention signals beyond existing health rings and the new edge thickness. "Needs attention" semantics need broader definition first (deferred)
- **D-10:** GradientEdge component exists but may need adaptation for thickness-based health encoding

### Map interactions + hub behavior
- **D-11:** MRM hub orb becomes a network stats display - shows overall network health score, total contacts, or a key metric. Informational only, no click action
- **D-12:** Hover tooltip on pod orbs: floating card showing health score, contact count, overdue count, last interaction date. Read-only info, no actions
- **D-13:** No map-native search/filter UI. Instead, bridge Cmd+K search to the map: when search results return, matching pods pulse/highlight on the canvas
- **D-14:** Category orb click in drill-down navigates to PodDetailPage (confirmed in D-04)

### State transitions + animation
- **D-15:** Hub-to-pod drill-in: smooth zoom + reorganize (~400-600ms). Camera zooms toward clicked pod, other pods fade out, clicked pod moves to center and grows, categories animate outward from behind the pod into orbital positions
- **D-16:** Pod-to-hub zoom-back: full reverse of drill-in animation. Categories collapse back, pod shrinks to orbital position, other pods fade back in. Spatial continuity
- **D-17:** Keep existing orbit-start entrance animation for initial hub load (orbs animate from hub center outward)
- **D-18:** Mobile is not a priority for this phase. Basic tap navigation, no custom gestures. Desktop is the focus

### Claude's Discretion
- Animation easing curves and exact timing within the 400-600ms window
- Hover tooltip layout and exact stats shown
- Hub orb stat display design (which metric, typography)
- Edge thickness range (min/max px) and opacity mapping from health scores
- Breadcrumb/toolbar styling
- How the Cmd+K search highlight bridge works technically
- Category orbital ring radius and spacing at drill-down level

</decisions>

<specifics>
## Specific Ideas

- Pod drill-down should feel like "zooming into a planet" - the pod IS the new center of gravity
- The orbital ring pattern is the map's visual language at every level - hub and drill-down should feel like the same system at different scales
- Hub orb is the identity anchor - it should always feel like the most important thing on screen
- Edge thickness communicates health through visual weight, not color - keeps the palette clean

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Map components
- `src/components/map/OrbMap.tsx` - Current map canvas, hubLayout(), buildHomeNodes(), viewport persistence
- `src/components/map/SolidOrb.tsx` - Shared orb component, POD_SHIFT_COLORS, health ring SVG
- `src/components/map/ListNode.tsx` - Pod orb node (96px), satellite category dots on hover
- `src/components/map/CategoryNode.tsx` - Category orb node (64px), currently used in old view
- `src/components/map/MojNode.tsx` - Hub orb (136px), currently inert
- `src/components/map/GradientEdge.tsx` - Edge component (exists but unused, buildHomeEdges returns [])

### Supporting code
- `src/lib/equity.ts` - Health scoring: contactEquityScore, podEquityScore, overallEquityScore, scoreLabel
- `src/hooks/useNodePositions.ts` - Position persistence to localStorage
- `src/lib/types.ts` - Pod, Category, Contact, HexColor types
- `src/components/pods/PodDetailPage.tsx` - Target for category click navigation

### Design system
- `docs/design-system.md` - Token set, typography, spacing grid, motion curves
- `src/index.css` - CSS custom properties, orbit-start animation, health-ring-enter, parallax-layer

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SolidOrb`: Already handles gradient, health ring, hover states - can be reused at both hub and drill-down levels
- `hubLayout()`: Multi-ring orbital layout with priority-based ring assignment - can be adapted for category layout
- `GradientEdge`: Exists but unused - needs adaptation for health-based thickness/opacity
- `POD_SHIFT_COLORS`: Gradient mapping used across map and PodDetailPage
- Orbit-start entrance CSS animation: Already working, keep for initial load
- `indexByContact` / `podEquityScore`: Health data pipeline already feeds into map nodes

### Established Patterns
- React Flow `useNodesState` / `useEdgesState` for graph state management
- Node position persistence via localStorage (`realdeal:node-positions:v2`)
- Viewport persistence via localStorage (`realdeal:map-viewport`)
- CSS custom properties for animation parameters (`--orbit-start-x/y`, `--depth`)
- Snap-to-ring drag behavior with spring easing

### Integration Points
- `navigate('/pod/${list.id}')` in ListNode needs to become drill-down instead of route navigation
- `buildHomeEdges()` currently returns [] - needs to build health-coded hub-to-pod edges
- MojNode needs to render network stats instead of just "MRM"
- SearchPalette (Cmd+K) needs a callback/event to highlight matching pods on the map

</code_context>

<deferred>
## Deferred Ideas

- "Needs attention" semantics and CTAs - requires broader definition of what attention means and what actions to surface
- Additional attention signals (pulse, badges) - blocked on the above
- Map-native filter bar - Cmd+K bridge is sufficient for now
- Three-level drill-down (pod > category > contacts as orbs) - two levels is the scope
- Custom mobile gestures - desktop focus for this phase
- Cross-pod relationship edges (contacts that appear in multiple pods) - future feature
- Contact presence on the map canvas - future feature

</deferred>

---

*Phase: 24-orb-map-experience-overhaul*
*Context gathered: 2026-04-02*
