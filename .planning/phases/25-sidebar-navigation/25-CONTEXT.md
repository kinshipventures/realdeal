# Phase 25: Sidebar Navigation - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the floating bottom pill navigator with a collapsible left sidebar on desktop. Map becomes the default route (/). Mobile bottom tab bar stays as-is.

</domain>

<decisions>
## Implementation Decisions

### Sidebar structure
- **D-01:** Left-side collapsible sidebar, Linear-style (expanded ~220px, collapsed ~56px icon-only)
- **D-02:** Frosted glass surface treatment (backdrop-filter blur, translucent background) consistent with existing nav-bg tokens
- **D-03:** Panel vs blend: Claude's discretion

### Navigation hierarchy
- **D-04:** Map is the default route - `/` renders OrbMap, Dashboard moves to `/pulse`
- **D-05:** Nav groups are separated visually (not flat list):
  - Map at the top (home/primary)
  - Core section: Pulse, Contacts, Pipelines, Projects
  - Pods sub-nav: list pod names as expandable/collapsible items under a "Pods" heading
  - Utilities at bottom: Search, Sign out, Demo toggle
- **D-06:** Search gets a visible element at top of sidebar (input field or icon) - Claude's discretion on form factor. Cmd+K shortcut remains.

### Mobile behavior
- **D-07:** Bottom tab bar stays on mobile, unchanged paradigm
- **D-08:** Mobile nav items, FAB placement, and breakpoint: Claude's discretion (current breakpoint is 767px)

### Routing change
- **D-09:** `/` -> OrbMap (was Dashboard)
- **D-10:** `/pulse` -> Dashboard (was `/`)
- **D-11:** All other routes unchanged

### Claude's Discretion
- Sidebar panel vs blend-into-background treatment (D-03)
- Search bar vs search icon in sidebar (D-06)
- Collapsed state toggle interaction (hover-expand, click-toggle, or both)
- Mobile breakpoint adjustment if needed
- FAB position relative to sidebar on desktop
- Pod sub-nav: fetch strategy, max visible before scroll, expand/collapse behavior
- Demo toggle placement in sidebar utilities section
- Transition/animation for collapse/expand

</decisions>

<specifics>
## Specific Ideas

- "Think Linear would be good" - Linear's collapsible sidebar as the reference for expand/collapse behavior
- Pods as sub-nav items in sidebar (like Linear shows teams)
- Map as the conceptual "home" of the app - the visual network is the primary view

</specifics>

<canonical_refs>
## Canonical References

### Design system
- `docs/design-system.md` - Token set, typography, spacing grid, motion curves

### Current navigation
- `src/App.tsx` lines 83-397 - Full current nav implementation (desktop pill + mobile tabs)
- `src/App.tsx` lines 481-504 - Route definitions (need updating for / and /pulse swap)

### Existing patterns
- `src/index.css` - CSS custom properties including --nav-bg, --edge, --color-surface tokens

No external specs - requirements are fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `--nav-bg` CSS variable already defines the frosted glass background color
- `backdrop-filter: blur(20px)` pattern used in current pill nav - reuse for sidebar
- `useIsMobile()` hook in App.tsx (line 27-36) handles responsive breakpoint detection
- Route detection logic (isMap, isPulse, etc.) at lines 42-47 can be extracted into sidebar component

### Established Patterns
- Navigation is currently inline in AppShell - will be extracted to a `Sidebar` component
- CSS custom properties for theming (--edge, --tint-hover, --color-text-primary/secondary)
- Active state uses `aria-current="page"` and visual highlight via --tint-hover background

### Integration Points
- AppShell layout in App.tsx needs to shift from `paddingBottom` to `paddingLeft`/`marginLeft` for sidebar
- FAB positioning (bottom-right) needs adjustment relative to sidebar width
- Demo toggle moves from below-pill to sidebar utilities section
- SearchPalette overlay unaffected (already full-screen modal)
- Escape stack unaffected (sidebar doesn't use it)

</code_context>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 25-sidebar-navigation*
*Context gathered: 2026-04-02*
