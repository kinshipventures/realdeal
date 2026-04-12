

## Plan: Fix Pod Drill-Down + Enhance Orb Hover/Click Interactions

### Problem

Two issues:

1. **Drill-down shows nothing for pods without categories.** "Maps Lite" (805 contacts), "Unsorted", "Family & Friends", "General", etc. have 0 categories in the database. When clicked, `buildDrillNodes` generates only the center hub orb with nothing around it - looks broken.

2. **Orb interactions feel flat.** Hover does a basic scale+lift. No press feedback beyond a quick shrink. No visual preview of what's inside a pod before clicking.

### Root cause (drill-down)

`categoriesByPodRef.current[pod.id]` returns `[]` for pods with no categories. `buildDrillNodes` creates only the center node. `buildDrillEdges` returns `[]`. Result: empty drill-down.

Database confirms: 6 of 13 pods have 0 categories. The 4 pods with categories + contacts work fine (Service Providers: 198 cats, Maps: 46, Talent: 14, SPV: 4).

### Changes

**1. Handle category-less pods gracefully**

When a pod has 0 categories, skip the drill-down animation entirely and navigate directly to `/pod/:id` (the pod detail page). This is immediate, expected behavior - there's nothing to "explore" visually.

In `drillIntoPod`: check `categoriesByPodRef.current[pod.id]?.length`. If 0, call `navigate(/pod/${pod.id})` and return without animating.

- File: `OrbMap.tsx`

**2. Enhanced hover: satellite category dots expand into orbiting ring**

This already exists in CSS (`.satellite-ring`, `.satellite-expand`, `.satellite-dot`) and is rendered in `ListNode.tsx` lines 104-136. The satellites expand on `.orbit-start:hover`. This should already work - need to verify the CSS is connecting properly and the `categories` data is being passed.

- Files: `OrbMap.tsx` (verify categoriesByPod passed), `src/index.css` (verify satellite CSS)

**3. Enhanced hover: subtle glow pulse on hover**

Add a soft breathing glow animation on hover that makes orbs feel alive. The current hover only changes `boxShadow` via JS - add a CSS keyframe that pulses the glow intensity.

- File: `src/index.css`

**4. Enhanced press: haptic-style bounce**

Replace the flat `scale(0.93)` active state with a spring-back animation: press down to 0.92, then on release bounce to 1.04 before settling at 1.0. Uses a CSS transition with overshoot bezier.

- File: `src/index.css`

**5. Add hover tooltip with pod stats**

The tooltip system already exists (`hoveredPod` state, `handlePodHoverEnter/Leave`). Verify it renders and enhance it to show: pod name, contact count, health score label, last interaction date, and category count.

- File: `OrbMap.tsx` (tooltip JSX section)

**6. Drill-down entrance: staggered spring animation for category orbs**

Category orbs currently use `orb-enter` which is a simple fade. Add a spring-in keyframe where orbs scale from 0 and overshoot to 1.05 before settling, with staggered delays (already passed as `animationDelay`).

- File: `src/index.css` (new `@keyframes cat-spring-in`)
- File: `CategoryNode.tsx` (use `cat-spring-in` class)

### Files modified

- `src/components/map/OrbMap.tsx` - category-less pod early exit, tooltip enrichment
- `src/components/map/CategoryNode.tsx` - spring entrance animation class
- `src/index.css` - glow pulse hover, spring press, category entrance keyframe

### Expected result

- Pods with categories: click drills into rich visual with sized orbs, health rings, gradient edges, staggered spring entrance
- Pods without categories: click navigates directly to pod detail page
- All pod orbs: glow-pulse on hover, satellite dots expand, spring bounce on press
- Hover tooltip shows rich pod stats

