# Phase 25: Sidebar Navigation - Research

**Researched:** 2026-04-02
**Domain:** React layout restructure, CSS collapsible sidebar, route changes
**Confidence:** HIGH

## Summary

This phase replaces the floating bottom pill navigator with a collapsible left sidebar. The nav logic is fully self-contained in `AppShell` in `App.tsx` - extraction to a `Sidebar` component is clean with no shared state beyond `showSearch`, `demo`, and `showCreate`. The frosted glass tokens (`--nav-bg`, `backdropFilter`) already exist and are reused verbatim. Route changes are minimal: swap `index` and `map` route paths, add `/pulse` route.

The main structural shift is layout: `AppShell` currently uses `paddingBottom` for the mobile tab bar and nothing for desktop. Desktop changes to `paddingLeft` (collapsed: 56px, expanded: 220px) with a CSS transition. Mobile stays exactly as-is.

The pods sub-nav requires a single `getPods()` call inside the Sidebar component - the cache pattern means it's essentially free after first load.

**Primary recommendation:** Extract nav from `AppShell` into `Sidebar.tsx`, wire sidebar width as a CSS variable on the root layout div, transition via `width` + CSS `transition`. Persist collapsed state to `localStorage`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Left-side collapsible sidebar, Linear-style (expanded ~220px, collapsed ~56px icon-only)
- D-02: Frosted glass surface treatment (backdrop-filter blur, translucent background) consistent with existing --nav-bg tokens
- D-04: Map is the default route - `/` renders OrbMap, Dashboard moves to `/pulse`
- D-05: Nav groups separated visually (not flat list): Map at top, Core section (Pulse/Contacts/Pipelines/Projects), Pods sub-nav, Utilities at bottom (Search, Sign out, Demo toggle)
- D-07: Bottom tab bar stays on mobile, unchanged paradigm
- D-09: `/` -> OrbMap (was Dashboard)
- D-10: `/pulse` -> Dashboard (was `/`)
- D-11: All other routes unchanged

### Claude's Discretion
- Sidebar panel vs blend-into-background treatment (D-03)
- Search bar vs search icon in sidebar (D-06)
- Collapsed state toggle interaction (hover-expand, click-toggle, or both)
- Mobile breakpoint adjustment if needed
- FAB position relative to sidebar on desktop
- Pod sub-nav: fetch strategy, max visible before scroll, expand/collapse behavior
- Demo toggle placement in sidebar utilities section
- Transition/animation for collapse/expand

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope
</user_constraints>

## Standard Stack

No new dependencies. This phase is pure React + CSS using existing project patterns.

### Reused Existing
| Asset | Where | Reuse |
|-------|-------|-------|
| `--nav-bg` | `src/index.css` | Sidebar background color |
| `backdropFilter: blur(20px)` | Current pill nav | Sidebar frosted glass |
| `--edge-strong` | `src/index.css` | Right border of sidebar |
| `--tint-hover` | `src/index.css` | Active nav item background |
| `--color-text-primary/secondary` | `src/index.css` | Nav item text |
| `useIsMobile()` | `App.tsx` line 27 | Responsive breakpoint (767px) |
| `getPods()` | `src/lib/supabase-data.ts` | Pods sub-nav list |
| `supabase.auth.signOut()` | Current nav | Sign out button |

## Architecture Patterns

### Recommended Component Structure

Extract nav logic from `AppShell` into a new component. Keep `AppShell` as the layout shell only.

```
src/
  components/
    nav/
      Sidebar.tsx     -- desktop collapsible sidebar (new)
  App.tsx             -- AppShell updated: paddingLeft instead of paddingBottom on desktop
```

One new file only - `Sidebar.tsx`. All other changes are in `App.tsx`.

### Pattern 1: CSS Width Transition for Collapse/Expand

**What:** Sidebar width driven by a single CSS variable, transitioned. Content items use `overflow: hidden` to hide labels when collapsed.

**When to use:** Simpler than JS-driven animation. No layout jank. Matches Linear behavior.

```tsx
// Sidebar.tsx
const [collapsed, setCollapsed] = useState(() =>
  localStorage.getItem('realdeal:sidebar-collapsed') === '1'
)
const width = collapsed ? 56 : 220

// In AppShell - replace paddingBottom with paddingLeft on desktop
<div style={{
  paddingLeft: isMobile ? 0 : width,
  paddingBottom: isMobile ? 56 : 0,
  height: '100%',
  transition: 'padding-left 0.2s cubic-bezier(0.215, 0.61, 0.355, 1)',
}}>
  <Outlet />
</div>
```

```tsx
// Sidebar.tsx wrapper
<nav style={{
  position: 'fixed',
  top: 0,
  left: 0,
  bottom: 0,
  width,
  transition: 'width 0.2s cubic-bezier(0.215, 0.61, 0.355, 1)',
  background: 'var(--nav-bg)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRight: '1px solid var(--edge-strong)',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 100,
  overflow: 'hidden',
}}>
```

### Pattern 2: Nav Item with Icon + Collapsible Label

**What:** Each nav item has a fixed-width icon zone (56px) and a label that fades/clips when collapsed.

```tsx
// Nav item structure
<button style={{
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '8px 16px',
  background: isActive ? 'var(--tint-hover)' : 'transparent',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
}}>
  <span style={{ width: 20, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
    {/* SVG icon */}
  </span>
  <span style={{
    opacity: collapsed ? 0 : 1,
    transition: 'opacity 0.15s',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    fontSize: 13,
    fontWeight: isActive ? 600 : 500,
    color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
  }}>
    {label}
  </span>
</button>
```

### Pattern 3: Pods Sub-Nav

**What:** Fetch pods once on sidebar mount. Render as collapsible list under a "Pods" section heading. Persist open/closed state to `localStorage`.

```tsx
const [pods, setPods] = useState<Pod[]>([])
const [podsOpen, setPodsOpen] = useState(true)

useEffect(() => {
  getPods().then(setPods)
}, [])
```

- Show pod color dot (8px circle, pod.color) as icon in collapsed state -> no, just hide pods section when collapsed
- When collapsed: pods section hidden entirely (no room for dot-only list)
- When expanded: show section heading "Pods", toggle chevron, list of pod names linking to `/pod/:id`
- Scroll within pods list if > ~8 items (sidebar is full height, section gets `overflowY: auto`, `maxHeight: 200px`)

### Pattern 4: Route Changes

**What:** Swap `index` and `map` routes. Add `/pulse` as alias for Dashboard.

```tsx
// App.tsx Route changes:
// Before:
<Route index element={<Dashboard />} />
<Route path="map" element={<OrbMap />} />

// After:
<Route index element={<OrbMap />} />
<Route path="pulse" element={<Dashboard />} />
<Route path="map" element={<OrbMap />} />  // keep for back-compat / mobile nav
```

Also update `isPulse` detection in `AppShell`:
```tsx
// Before:
const isPulse = !isMap && !isContacts && !isPipelines && !isProjects
  && (location.pathname === '/' || location.pathname.startsWith('/pulse'))

// After:
const isMap = location.pathname === '/' || location.pathname === '/map'
const isPulse = location.pathname === '/pulse' || location.pathname.startsWith('/pulse')
```

### Pattern 5: D-03 Recommendation - Panel Treatment

**Recommendation:** Panel treatment (opaque sidebar with right border). Rationale: OrbMap is a canvas with colors and gradients - a blended/transparent sidebar would compete visually. The existing pill nav uses heavy blur already; a sidebar with `--nav-bg` + `borderRight` creates clear separation. Blend-into-background works for simpler content apps (Notion, Linear's dark mode), not canvas-heavy UIs.

### Pattern 6: D-06 Recommendation - Search in Sidebar

**Recommendation:** Search icon button in the expanded sidebar (not an input field). Clicking opens the existing `SearchPalette` modal. Cmd+K shortcut unchanged. Rationale: sidebar input fields that just trigger a modal are UX theater - icon button is cleaner, consistent with the icon-only collapsed state.

### Pattern 7: D-03 Collapsed Toggle

**Recommendation:** Click-toggle only on a chevron button at the bottom of the sidebar (Linear pattern). No hover-expand - hover-expand creates accidental layout shifts when mousing across the screen. Chevron points right when collapsed, left when expanded.

### Pattern 8: FAB on Desktop

The FAB currently sits at `bottom: 84, right: 24`. With a sidebar, keep `right: 24` (no change needed - FAB is right-anchored, sidebar is left). No adjustment required.

### Pattern 9: Demo Toggle

Move from the fixed centered-bottom pill to a row item in the sidebar utilities section. Use the same visual treatment (brand-tinted when active). On collapse, show as a small dot indicator or just the icon.

### Anti-Patterns to Avoid

- **`position: absolute` for sidebar:** Use `position: fixed` - the Outlet content scrolls, sidebar stays put.
- **JS animation for width:** CSS `transition: width` is smoother. JS animation fights React re-renders.
- **Fetching pods in AppShell:** Fetch in Sidebar only - avoids prop drilling, sidebar owns its data.
- **Keeping `paddingBottom` on desktop:** Replace entirely with `paddingLeft`. Don't stack both.
- **Animating label opacity separately from width:** Fade opacity on a short delay (50ms) after width starts collapsing, so label doesn't overflow during transition.
- **Using `display: none` for labels:** Use `opacity: 0` + `overflow: hidden` so the transition animates smoothly. `display: none` is instant and skips the fade.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Pod color dot in sidebar | Custom color component | Inline `div` 8px circle with `backgroundColor: pod.color` |
| Tooltip on collapsed icon buttons | Custom tooltip | HTML `title` attribute - good enough for utilities, zero deps |
| Scroll in pods list | Virtual scroll | CSS `overflowY: auto` on the list section with `maxHeight` |

## Common Pitfalls

### Pitfall 1: Route detection breaks on `/` -> Map swap
**What goes wrong:** `isPulse` currently includes `pathname === '/'`. After the swap, `/` is Map - `isPulse` must no longer include `/`.
**Why it happens:** The boolean was written when `/` = Dashboard.
**How to avoid:** Update `isMap` and `isPulse` flags in `AppShell` at the same time as the route change.
**Warning signs:** Dashboard not highlighted in sidebar when on `/pulse`, or map not highlighted when on `/`.

### Pitfall 2: Mobile nav still referencing `/` for Pulse
**What goes wrong:** Mobile tab bar button navigates to `'/'` for Pulse, which now shows OrbMap.
**Why it happens:** The route paths change, mobile nav does not.
**How to avoid:** Update mobile Pulse button to navigate to `'/pulse'`.
**Warning signs:** Tapping Pulse on mobile opens the map.

### Pitfall 3: Sidebar content overflows during transition
**What goes wrong:** Text labels overflow the sidebar width during the collapse animation.
**Why it happens:** `width` transitions but content clips late.
**How to avoid:** Set `overflow: hidden` on the sidebar `<nav>` element. Labels use `whiteSpace: nowrap` so they clip cleanly.
**Warning signs:** Text bleeds outside sidebar boundary during animation.

### Pitfall 4: Pods sub-nav adds a loading flash
**What goes wrong:** Sidebar renders empty pods section until `getPods()` resolves.
**Why it happens:** Async fetch with no initial state.
**How to avoid:** Default `pods` state to `[]`, hide the section (not show a spinner) until it resolves. Since `getPods()` uses a stale-while-revalidate cache, after first app load it's instant.
**Warning signs:** Visible empty section or spinner on every navigation.

### Pitfall 5: Collapsed sidebar blocks canvas interaction on OrbMap
**What goes wrong:** The 56px sidebar overlaps the left edge of the React Flow canvas, blocking node interactions.
**Why it happens:** OrbMap fills `100%` width but `paddingLeft` shifts the content area correctly. Canvas uses `width: 100%` within its container.
**How to avoid:** Verify OrbMap's container inherits the `paddingLeft` shift from `AppShell`. If OrbMap uses `position: fixed` or `100vw`, it will need adjusting.
**Warning signs:** Can't click nodes near the left edge of the map.

### Pitfall 6: `pulse/nurturing` route breaks
**What goes wrong:** The `pulse/nurturing` sub-route currently works because Dashboard is at `/`. After moving Dashboard to `/pulse`, the nested route `/pulse/nurturing` works correctly - but `NurturingHub` is a flat sibling route, not a nested route under Dashboard.
**Why it happens:** Looking at App.tsx line 489: `<Route path="pulse/nurturing" element={<NurturingHub />} />` - this is already an absolute path in the route tree, so it will continue to work at `/pulse/nurturing`.
**How to avoid:** No change needed. Just verify `/pulse/nurturing` still resolves.
**Warning signs:** 404 on nurturing hub.

## Code Examples

### Sidebar component skeleton
```tsx
// src/components/nav/Sidebar.tsx
import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { getPods } from '@/lib/supabase-data'
import type { Pod } from '@/lib/types'
import { supabase } from '@/integrations/supabase/client'
import { isDemoMode, setDemoMode } from '@/lib/sampleData'

interface SidebarProps {
  onSearch: () => void
  demo: boolean
  onDemoToggle: () => void
}

export function Sidebar({ onSearch, demo, onDemoToggle }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('realdeal:sidebar-collapsed') === '1'
  )
  const [pods, setPods] = useState<Pod[]>([])
  const [podsOpen, setPodsOpen] = useState(true)
  const width = collapsed ? 56 : 220

  useEffect(() => {
    getPods().then(setPods)
  }, [])

  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('realdeal:sidebar-collapsed', next ? '1' : '0')
  }

  const isMap = location.pathname === '/' || location.pathname === '/map'
  const isPulse = location.pathname.startsWith('/pulse')
  const isContacts = location.pathname === '/contacts'
  const isPipelines = location.pathname.startsWith('/pipelines')
  const isProjects = location.pathname.startsWith('/projects')

  // ... render
}
```

### AppShell layout div update
```tsx
// Replace in AppShell:
// Before:
<div style={{ paddingBottom: isMobile ? 56 : 0, height: '100%' }}>

// After:
<div style={{
  paddingLeft: isMobile ? 0 : width,
  paddingBottom: isMobile ? 56 : 0,
  height: '100%',
  transition: isMobile ? undefined : 'padding-left 0.2s cubic-bezier(0.215, 0.61, 0.355, 1)',
}}>
```

### Sidebar section divider (visual group separation per D-05)
```tsx
<div style={{ height: 1, background: 'var(--divider)', margin: '8px 12px' }} />
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Fixed bottom pill nav | Left sidebar (desktop) | More vertical space for content, persistent visual hierarchy |
| / = Dashboard | / = OrbMap | Map is conceptual home, aligns with product vision |
| Demo toggle as floating pill above nav | Demo toggle in sidebar utilities | Cleaner, no floating overlays |

## Open Questions

1. **Sidebar width on OrbMap canvas**
   - What we know: OrbMap uses React Flow, which fills its container
   - What's unclear: Whether React Flow re-centers nodes correctly when container width changes (sidebar collapse shifts the content area width by 164px)
   - Recommendation: After implementing, test collapse/expand while on OrbMap. If nodes shift awkwardly, call `fitView()` after the CSS transition ends (200ms timeout).

2. **`/map` route retention**
   - What we know: D-09 says `/` -> OrbMap. D-11 says all other routes unchanged.
   - What's unclear: Whether to keep `/map` as an alias or remove it
   - Recommendation: Keep `/map` route pointing to `OrbMap` for backward compat (shared links, mobile nav). Mobile nav continues using `/map`.

3. **Pods sub-nav link behavior**
   - What we know: Pods are accessible via `/pod/:id`
   - What's unclear: Whether clicking a pod in sidebar navigates to `PodDetailPage` or opens the OrbMap at that pod
   - Recommendation: Navigate to `/pod/:id` (PodDetailPage). OrbMap interaction via the canvas itself remains the map entry point.

## Sources

### Primary (HIGH confidence)
- Direct code read of `src/App.tsx` - full nav implementation, route definitions, state
- Direct code read of `src/index.css` - all CSS tokens
- Direct code read of `src/lib/supabase-data.ts` - `getPods()` API and cache pattern
- Direct code read of `src/lib/types.ts` - `Pod` type shape
- Direct code read of `docs/design-system.md` - motion curves, spacing, component patterns

### Secondary (MEDIUM confidence)
- Linear sidebar reference (from CONTEXT.md specifics) - confirmed pattern is click-toggle, icon-only collapsed, labeled expanded

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new deps, all existing patterns
- Architecture: HIGH - read all relevant source files directly
- Pitfalls: HIGH - identified from direct code analysis (route flag logic, mobile nav links, OrbMap canvas)

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable codebase, no external dependencies)
