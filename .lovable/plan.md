

# Dashboard HIG Polish - 10 Issues

Based on the Apple Human Interface Guidelines review, here are the 10 issues and the implementation plan to fix them all in a single pass.

## Issues

1. **Flat visual hierarchy** - All section headings use identical `fontSize: 15, fontWeight: 700` with no typographic distinction between primary/secondary sections
2. **Mixed hover patterns** - PodHealthWidget uses JS `onMouseEnter`/`onMouseLeave` refs; TodaysFocusWidget uses inline event handlers; RecentActivity/ComingUp use CSS class `interactive-row` - three different approaches
3. **No section grouping** - 8+ widgets stack vertically with identical `marginBottom: 24` and no visual containers or logical groupings
4. **Missing scroll affordance** - Pod health row has a right-side gradient fade but no left-side indicator when scrolled; no snap behavior
5. **No press/active feedback** - Cards and rows lack `:active` scale-down for tactile response (Apple HIG requires visible press states)
6. **Inconsistent panel materials** - Some widgets use the `PANEL` style object (backdrop-filter); PodHealthWidget and TodaysFocusWidget render bare cards without it
7. **Skeleton mismatch** - `DashboardSkeleton` renders 3 pod cards and 2 rows but doesn't mirror the actual widget count or shapes
8. **Section headers lack affordance** - "See all" links are plain unstyled text buttons with no hover state or chevron indicator
9. **Touch targets too small** - Dormant action buttons ("Keep", "Reach out", "Let go") have `padding: 3px 10px` - below Apple's 44px minimum
10. **No entrance animation** - Widgets appear instantly with no staggered fade-in, making the page feel static

## Plan

### File: `src/index.css`

Add shared CSS classes:

- `.dashboard-section` - grouped container with subtle background, border-radius, padding
- `.dashboard-heading` - primary section heading style (Fraunces, 16px)
- `.dashboard-subheading` - secondary heading style (13px, uppercase tracking)
- `.see-all-link` - styled "See all" with hover opacity + chevron `::after`
- `.widget-card:active` - scale(0.98) press feedback
- `.widget-enter` - fade-in + translateY(8px) animation with `--stagger` delay variable
- `.action-pill-hig` - minimum 44px touch target for small action buttons

### File: `src/components/dashboard/Dashboard.tsx`

- Wrap widgets into 2-3 logical groups with `.dashboard-section` containers:
  - **Network pulse**: Pod Health + Wrapped + Equity (already in header)
  - **Action items**: Today's Focus + Needs Attention + Coming Up
  - **Activity & links**: Recent Activity + Quick Links
- Add `className="widget-enter"` with `style={{ '--stagger': N }}` to each widget for staggered entrance
- Update `DashboardSkeleton` to mirror actual widget layout (grouped sections, correct counts)

### File: `src/components/dashboard/widgets/PodHealthWidget.tsx`

- Replace JS `onMouseEnter`/`onMouseLeave` ref pattern with CSS class `.widget-card` for hover lift + shadow
- Add `:active` press state via the class
- Add left-side gradient fade when scroll position > 0 (use a `useRef` + scroll listener to toggle)
- Add `scroll-snap-type: x mandatory` and `scroll-snap-align: start` to cards

### File: `src/components/dashboard/widgets/TodaysFocusWidget.tsx`

- Replace inline `onMouseEnter`/`onMouseLeave` handlers with `.widget-card` CSS class
- Wrap in `PANEL` style for consistent material
- Replace "See all" with `.see-all-link` class

### File: `src/components/dashboard/widgets/NeedsAttentionWidget.tsx`

- Increase dormant action button padding to meet 44px touch target
- Replace "See all" with `.see-all-link` class
- Add `.widget-card` hover/press class to overdue rows

### File: `src/components/dashboard/widgets/RecentActivityWidget.tsx`

- Replace heading with `.dashboard-heading` class
- Replace "See all" with `.see-all-link` class (add a "See all" link if missing)

### File: `src/components/dashboard/widgets/ComingUpWidget.tsx`

- Replace "See all" with `.see-all-link` class

### File: `src/components/dashboard/widgets/QuickLinksWidget.tsx`

- Add `.widget-card` hover/press class to link buttons

### File: `src/components/dashboard/widgets/WrappedWidget.tsx`

- No changes needed (WrappedCard has its own animation)

## Technical details

- All hover/press states consolidated into 2 CSS classes: `.widget-card` (cards with lift) and `.interactive-row` (existing, already used by some widgets)
- Entrance animation uses a single `@keyframes widget-fade-in` with `opacity` + `translateY`, gated by `--stagger` custom property for sequential reveal
- Section grouping uses lightweight containers (subtle `var(--tint)` background, 1px border, 16px radius) - not heavy cards
- Touch target fix: dormant buttons get `min-height: 44px` and `padding: 8px 16px`
- Scroll affordance: left gradient toggles via `data-scrolled` attribute set by scroll listener

