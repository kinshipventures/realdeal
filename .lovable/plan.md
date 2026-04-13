

# Apple HIG Audit - Improvement Plan

## HIG Principles Applied

Apple's four core design principles: **Clarity** (interfaces easily understood), **Deference** (focus on content, not chrome), **Depth** (visual layers communicate hierarchy), **Consistency** (familiar patterns throughout). Plus specific HIG standards around touch targets, typography, navigation, feedback, and motion.

---

## Findings & Improvements

### 1. Touch Targets & Hit Areas

**Problem:** Several interactive elements fall below Apple's 44x44pt minimum.
- `CloseButton` defaults to 26px (`ui.tsx` line 77) - critically undersized
- Mobile tab bar height is 48px but individual tab labels/icons lack explicit 44pt tap zones
- Urgent banner buttons on RecordPage use `padding: 4px 12px` - too small
- Dashboard settings gear is correctly 44x44 but other icon buttons (dismiss "x", snooze) are not
- Filter dropdowns and small action pills throughout RecordsList lack minimum height enforcement

**Fix:** Create a shared `MIN_TAP = 44` constant. Audit every `<button>` and clickable element across all components. Increase `CloseButton` default to 36px with a 44px hit area wrapper. Set `min-height: 44px` on all interactive rows and buttons.

### 2. Navigation & Tab Bar

**Problem:** Mobile bottom tab bar deviates from HIG conventions.
- Tab bar height is 48px (HIG recommends 49pt + safe area inset)
- No visual separation between icon and label - they render inline
- Active state is just color change with no fill/weight shift
- 5 tabs is at the HIG limit but "Search" as a tab is unconventional - search should be a toolbar action or pull-down, not a persistent tab
- No haptic feedback indication on tab switch

**Fix:**
- Increase tab bar to 49px + safe area padding (already has `env(safe-area-inset-bottom)` but base height needs bump)
- Add filled icon variants for active state (HIG: active = filled, inactive = outlined)
- Replace "Search" tab with a search bar at the top of the active page or keep Cmd+K only
- Stack icon above label with 2px gap (HIG standard tab layout)

### 3. Typography Scale

**Problem:** Inconsistent font sizes that don't follow a clear type ramp.
- Input fields use 13px (`CreateRecordModal`) - HIG minimum body is 17pt for readability
- Labels at 11px (`labelStyle`) fall below HIG's 13pt minimum for legible text
- Heading sizes vary (28px on RecordsList, custom sizes elsewhere) without a unified scale
- The `font-size: 10px` used for demo toggle and various badges is below readable threshold

**Fix:** Establish a HIG-aligned type ramp: 11pt (caption2), 13pt (footnote), 15pt (subheadline), 17pt (body), 20pt (title3), 22pt (title2), 28pt (title1), 34pt (large title). Map all text usage to this scale. Increase form inputs to 16px minimum (also prevents iOS zoom-on-focus).

### 4. Form Inputs & iOS Zoom Prevention

**Problem:** Input `fontSize: 13` in CreateRecordModal and other forms triggers iOS Safari auto-zoom when focused (anything below 16px triggers this).

**Fix:** Set all `<input>`, `<select>`, `<textarea>` to `font-size: 16px` minimum. Update `inputStyle`, `compactInput`, and search inputs across SearchPalette, RecordsList filters, and ImportPanel.

### 5. Modal & Sheet Presentation

**Problem:** Modals use custom implementations without consistent presentation.
- `SearchPalette` uses a fixed overlay with custom backdrop
- `CreateRecordModal` uses a different overlay pattern
- `CategorizationQueue` uses `<dialog>` element
- `DashboardSettings` uses yet another pattern
- No consistent dismiss affordance (some use X, some use backdrop click, some use Escape)

**Fix:**
- Standardize on a shared `Sheet` / `Modal` primitive that handles: backdrop blur, border radius (top corners for sheets), drag-to-dismiss on mobile, Escape key, backdrop click
- On mobile, present modals as bottom sheets with a drag handle (HIG pattern)
- Ensure all modals have consistent 12px top corner radius and grabber indicator on mobile

### 6. Feedback & Loading States

**Problem:** Insufficient user feedback during async operations.
- `saving` state in CreateRecordModal shows "Saving..." text but no spinner or progress
- No success confirmation after creating a record - modal just closes
- Import operations lack granular progress feedback
- Bulk actions in RecordsList have no undo confirmation beyond a brief toast

**Fix:**
- Add inline spinners next to action buttons during save
- Show brief success checkmark animation after mutations (0.8s, then auto-dismiss)
- Add progress bar to import flow showing percentage complete
- Ensure all destructive actions (delete, archive) have a confirmation sheet with red destructive button styling per HIG

### 7. Color & Contrast

**Problem:** Some color usages don't meet HIG contrast guidance.
- `--color-text-tertiary` at `rgba(0,0,0,0.40)` on `#F5F4F0` background = ~3.2:1 ratio (below 4.5:1 for body text)
- `--text-muted` at `rgba(0,0,0,0.35)` is even lower
- Dashboard gear button `rgba(255,255,255,0.80)` on brand green may be borderline
- Badge/pill text at small sizes with low-contrast colors

**Fix:** Bump `--color-text-tertiary` to `rgba(0,0,0,0.48)` and `--text-muted` to `rgba(0,0,0,0.45)`. Ensure all text below 19pt meets 4.5:1 contrast ratio. Verify white-on-green passes at the sizes used.

### 8. Spacing & Layout Consistency

**Problem:** Inconsistent padding and margins across pages.
- RecordPage uses `padding: 24px 32px` for the grid
- Dashboard uses `padding: 24px 24px 80px`
- RecordsList uses `clamp(16px, 4vw, 32px)`
- Different border-radius values: 6, 7, 8, 10, 12, 16, 20, 24px used without clear system

**Fix:** Standardize on the 8pt grid already declared in the design system. Define three standard content paddings: `16px` (compact/mobile), `24px` (default), `32px` (spacious/desktop). Limit border-radius to 4 tiers: `8px` (small controls), `12px` (cards), `16px` (panels), `20px` (sheets/large containers).

### 9. Animations & Motion

**Problem:** Motion timings are inconsistent and some lack `prefers-reduced-motion` respect.
- Orb hover uses `0.18s` with spring curve
- Content enter uses various durations
- SearchPalette entrance is `200ms` with overshoot (`1.1` in bezier)
- Sidebar transition is `0.2s`
- No `prefers-reduced-motion` media query wrapping animations

**Fix:** Add a global `@media (prefers-reduced-motion: reduce)` block that disables or minimizes all transitions/animations. Standardize on three motion tiers: `0.15s` (micro-interactions), `0.25s` (element transitions), `0.35s` (page/panel transitions). Remove overshoot curves - HIG favors ease-in-out, not bouncy physics.

### 10. Empty States & Onboarding

**Problem:** Empty states vary in quality and some lack clear CTAs.
- "Record not found" shows no suggested action
- Some empty states use the custom `EmptyState` component, others use inline text
- Onboarding step indicators are custom dots without HIG-standard page control styling

**Fix:** Ensure every empty state has: an SF Symbols-style icon, a title, a subtitle explaining why it's empty, and a primary action button. Standardize all empty states through the existing `EmptyState` component.

### 11. Destructive Actions

**Problem:** Delete/archive actions lack proper safeguarding.
- "Let go" button on RecordPage archives immediately with no confirmation
- Dismiss banner button ("x") has no undo
- Bulk archive in RecordsList needs stronger confirmation

**Fix:** All destructive actions get a confirmation alert/sheet with a red "Delete"/"Archive" button and a "Cancel" option. Use `color: #FF3B30` (HIG destructive red) for destructive button labels.

---

## Implementation Order

1. **Touch targets & input sizes** - highest impact on usability, prevents iOS zoom bug
2. **Typography scale** - establishes consistent readability
3. **Modal/sheet standardization** - creates reusable primitive for all overlays
4. **Mobile tab bar** - aligns primary navigation with HIG
5. **Spacing & border-radius** - visual consistency pass
6. **Contrast fixes** - accessibility compliance
7. **Motion & reduced-motion** - accessibility + polish
8. **Feedback states** - loading/success/error consistency
9. **Empty states** - completeness
10. **Destructive action safeguards** - safety

## Files Modified

- `src/index.css` - type ramp, motion tokens, reduced-motion, contrast fixes, border-radius scale
- `src/components/ui.tsx` - CloseButton size, shared Sheet/Modal primitive
- `src/App.tsx` - mobile tab bar redesign, FAB sizing
- `src/components/nav/Sidebar.tsx` - spacing adjustments
- `src/components/search/SearchPalette.tsx` - motion curve fix, input size
- `src/components/records/CreateRecordModal.tsx` - input sizes, feedback states
- `src/components/records/RecordPage.tsx` - button sizes, destructive confirmations
- `src/components/records/RecordsList.tsx` - filter heights, touch targets
- `src/components/dashboard/Dashboard.tsx` - spacing standardization
- `src/components/dashboard/DashboardSettings.tsx` - sheet presentation
- `src/components/categorization/CategorizationQueue.tsx` - sheet standardization
- `src/components/onboarding/OnboardingFlow.tsx` - page control styling
- `src/components/contacts/ContactDetail.tsx` - touch targets, sheet presentation

