

## Plan: Enhance Pod Drill-Down Visual Experience

### Problem

The pod drill-down view (screenshot: Talent pod) is visually flat - just a center orb with category orbs floating around it. No edges, no contact counts, no health indicators, no visual hierarchy beyond size. It feels disconnected compared to the hub view.

### Changes

**1. Add contact counts to all category orbs**

`buildDrillNodes()` currently doesn't pass `contactCount` to category nodes. Wire it through so each category orb shows its count beneath the name.

- Files: `OrbMap.tsx` (buildDrillNodes), fetch category contact counts and pass as data

**2. Add health rings to category orbs**

Pass `healthPercent` to category `SolidOrb` based on equity scores for contacts in that category. Shows which categories are thriving vs fading at a glance.

- Files: `CategoryNode.tsx` (pass healthPercent to SolidOrb), `OrbMap.tsx` (compute per-category health)

**3. Add spoke edges from center to category orbs**

Use the existing `GradientEdge` component to draw health-encoded spokes from the center pod to each category. Gives the drill-down the same connected feel as the hub view.

- Files: `OrbMap.tsx` (new `buildDrillEdges()` function)

**4. Size category orbs by contact count**

Instead of uniform 64px, scale category orbs between 56-88px based on relative contact count. Larger categories get larger orbs - instant visual weight.

- Files: `CategoryNode.tsx` (accept dynamic size), `OrbMap.tsx` (compute sizes in buildDrillNodes)

**5. Enrich center hub orb in drill-down**

Show more than just the pod name - add contact count, health score, and health label. Make it feel like the hub-view center orb but pod-scoped.

- Files: `MojNode.tsx` (render health stats when in drill-down mode)

**6. Add subtle orbit ring lines**

Render faint circular ring guides behind category orbs (like planetary orbits) to give spatial structure. CSS-only, using pseudo-elements or an SVG layer.

- Files: `src/index.css` or inline in `OrbMap.tsx`

### Technical details

- `buildDrillNodes` already receives `equityByPod` - need to also pass per-category contact counts (already available from the categories fetch)
- Category health can be derived from contacts in that category using existing `contactEquityScore` 
- `GradientEdge` already supports `healthPercent` for thickness/opacity encoding
- Dynamic sizing: `const size = Math.max(56, Math.min(88, 56 + (count / maxCount) * 32))`
- Orbit rings: absolute-positioned SVG circles at each ring radius with `stroke: rgba(255,255,255,0.06)`

### Files modified
- `src/components/map/OrbMap.tsx` - buildDrillNodes, buildDrillEdges, contact count + health data
- `src/components/map/CategoryNode.tsx` - dynamic size prop, healthPercent passthrough
- `src/components/map/MojNode.tsx` - drill-down health stats display
- `src/index.css` - orbit ring guide styles (if needed)

