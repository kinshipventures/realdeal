# Phase 16: Dashboard + Nurturing Hub - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Modular operating dashboard with configurable widgets and a nurturing drill-down for relationship maintenance. The dashboard is the primary daily surface — founders live here. Nurturing signals surface across the dashboard, record pages, and pipeline cards.

Depends on Phase 15 (navigation patterns, widget conventions, slide-out patterns). Reporting (Phase 17) is separate — saved reports widget deferred.

</domain>

<decisions>
## Implementation Decisions

### Dashboard configurability
- **D-01:** Toggle list + fixed presets. Settings panel where user checks/unchecks widgets and picks from presets. No drag-and-drop grid. Persisted to localStorage.
- **D-02:** Two presets: "Full" (all widgets visible — current dashboard behavior) and "Focus" (only actionable sections: Today's Focus, Needs Attention, upcoming dates, pending tray). Toggle list handles any further customization.
- **D-03:** No multiple named dashboard views (DASH-03 descoped to presets + toggles). Small team, two presets covers the real need.

### Dashboard section consolidation
- **D-04:** Merge overdue queue + dormant cleanup into a single "Needs Attention" section. Dormant contacts are a subset of stale relationships. One section, grouped by severity (overdue first, then dormant/stale).
- **D-05:** Equity ring and WrappedCard stay as toggleable widgets. Default visible in "Full" preset, hidden in "Focus" preset. No removal — the toggle system handles taste.
- **D-06:** Replace current verbose campaigns section with compact link cards. Small cards showing active campaign names with progress indicator, click navigates to campaign detail. Same treatment for active pipelines. Keeps the dashboard scannable — detail lives on dedicated pages.
- **D-07:** All existing sections (pod health cards, Today's Focus, birthdays, pending tray, equity ring, WrappedCard) become toggleable widgets. Nothing removed from the codebase.

### Nurturing drill-down
- **D-08:** Nurturing is NOT a new top-level nav pill. It's a sub-view within the dashboard route (e.g., `/pulse/nurturing`). Accessible via contextual "See all" links on dashboard sections. Matches PDF's "dashboard layers" description.
- **D-09:** Single scrollable view with section headers. Primary sections (expanded): "Due Soon", "Needs Attention" (overdue), "Stale", "Upcoming Dates". Secondary section (collapsed by default with count badge): "Data Hygiene" containing missing required fields + pod capacity maintenance. Empty sections collapse automatically.
- **D-10:** Nurturing signal thresholds reuse existing equity system. "Due soon" = overdue contacts (existing `isOverdue()`). "Stale" = dormant contacts (existing `isDormant()`). Renamed UI labels, same underlying logic. No new scoring — preserves PDF's warning against hardcoding cadence-only logic that blocks future intelligence.
- **D-11:** Each contact row in the drill-down has three actions: Log interaction (opens type picker — call, email, text, meeting, note), Snooze 30d (suppress from list temporarily, reuses existing snooze pattern), and click-to-navigate to full record.
- **D-12:** Entry points to nurturing drill-down: contextual "See all" links on each relevant dashboard section header. Today's Focus → drill-down filtered to attention signals. Overdue/Needs Attention → filtered to overdue. Birthdays → filtered to upcoming dates. All land on the same drill-down view, pre-filtered by signal type.

### Signal propagation across surfaces
- **D-13:** Record page signals use tiered severity. Urgent signals (overdue, stale) show a colored banner strip below the record header — dismissible per-session. Informational signals (upcoming birthday, missing fields) show as a badge/indicator on the HealthWidget in the right column. Two visual tiers.
- **D-14:** Pipeline card signals use subtle dot indicators on contact avatars. Red dot for overdue, orange for due soon. No text on the card — hover shows the reason. Keeps the Kanban clean.
- **D-15:** Dashboard widget cross-surfacing: existing widgets absorb signals rather than adding new summary widgets. Today's Focus folds in "due soon" contacts. Pod health cards can show missing fields counts. No new "Nurturing Summary" widget.

### Quick access widgets
- **D-16:** Compact link cards at the bottom of the dashboard for active pipelines and active campaigns. Each card shows name + brief status, click navigates to the dedicated page. Not full widgets — navigational shortcuts.
- **D-17:** Saved reports quick access deferred to Phase 17 (Reporting). The widget slot exists in the toggle list but is hidden until reporting ships.

### Claude's Discretion
- Settings panel UI (gear icon placement, panel/modal design)
- Widget toggle list layout and interaction
- Preset switching UX
- Nurturing drill-down layout and responsive treatment
- Banner strip design (color, icon, dismiss button)
- Dot indicator sizing and hover tooltip design
- Compact link card design for pipelines/campaigns
- "Due Soon" / "Needs Attention" section header design
- Snooze button placement and confirmation
- Interaction logger inline vs modal on nurturing rows
- Scroll behavior and section collapse animation
- localStorage key naming for widget config persistence

</decisions>

<specifics>
## Specific Ideas

- The PDF says "the dashboard is where founders live" — this should feel like a morning briefing, not a metrics dashboard. Actionable sections first, health/vanity metrics second.
- Follow-ups should feel "instructional, not assigned" (PDF Section 9). The language should be "Consider reaching out to..." not "Overdue: contact now."
- The nurturing drill-down should feel like a focused work mode — the dashboard shows the highlights, the drill-down is where you sit down and work through your list.
- Compact link cards for pipelines/campaigns should feel like the "quick access" cards in Linear's home view — minimal, navigational, not data-heavy.
- The "Data Hygiene" collapsed section should feel like a gentle nudge, not a warning. Badge count is sufficient — no red alerts for missing fields.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product spec
- `docs/Kinship Brain — MVP (Moj Mar 28).pdf` — Section 12 (Dashboard), Section 7 (Follow-ups), Section 5 (Contextual Intelligence). Dashboard is primary operating surface, follow-ups are dashboard-led signals not tasks, intelligence layer separate from cadence.

### Requirements
- `.planning/REQUIREMENTS.md` — DASH-01 through DASH-06, NURT-01 through NURT-06

### Prior phase context
- `.planning/phases/14-pipelines/14-CONTEXT.md` — D-09: slide-out panel pattern, D-14: RecordPage widget pattern
- `.planning/phases/15-projects/15-CONTEXT.md` — D-10: RecordPage widget pattern (ProjectsWidget)

### Current code (dashboard — will be refactored)
- `src/components/dashboard/Dashboard.tsx` — Current monolithic dashboard (~500 lines). All sections hardcoded. Will be broken into toggleable widget components.
- `src/components/dashboard/WrappedCard.tsx` — Cycling gradient insight card. Becomes a toggleable widget.

### Current code (equity/scoring — reused, not changed)
- `src/lib/equity.ts` — `isOverdue()`, `isDormant()`, `todaysFocus()`, `contactCadenceDays()`, `scoreLabel()`, `daysSinceContact()`. All reused for nurturing signals.
- `src/lib/birthdays.ts` — `getUpcomingBirthdays()`. Reused for "Upcoming Dates" section.

### Current code (UI patterns to follow)
- `src/components/categorization/PendingTrayWidget.tsx` — Dashboard widget pattern with "See all" behavior
- `src/components/records/RecordPage.tsx` — Right-column widget layout for HealthWidget signal badges
- `src/components/records/HealthWidget.tsx` — Will receive nurturing signal badges
- `src/components/pipelines/OpportunityCard.tsx` — Will receive avatar dot indicators
- `src/components/contacts/InteractionSection.tsx` — Interaction logger pattern for nurturing row actions
- `src/App.tsx` — Router config for nurturing sub-route
- `docs/design-system.md` — Design tokens, typography, spacing, motion curves

### Current code (reusable patterns)
- `src/lib/escapeStack.ts` — Layered escape handling for settings panel
- `src/components/map/SolidOrb.tsx` — `POD_SHIFT_COLORS` for compact link card accents
- Snooze pattern in `Dashboard.tsx` — `getSnoozedIds()`, `snoozeContact()`, localStorage persistence

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Full equity system**: `isOverdue()`, `isDormant()`, `todaysFocus()`, `scoreLabel()` — all nurturing signal logic already exists. No new scoring needed.
- **Birthday system**: `getUpcomingBirthdays()` returns contacts with upcoming birthdays. Reused for "Upcoming Dates."
- **Snooze pattern**: `getSnoozedIds()` / `snoozeContact()` in Dashboard.tsx — extract and reuse in nurturing drill-down.
- **Interaction logger**: InteractionSection pattern for logging interactions inline.
- **PendingTrayWidget**: Dashboard widget with count badge and "See all" link — direct pattern for section headers.
- **HealthWidget**: Right-column widget that will receive nurturing signal badges.
- **OpportunityCard**: Pipeline card component that will receive avatar dot indicators.

### Established Patterns
- Stale-while-revalidate caching — all data fetches already use this.
- localStorage persistence — node positions, snooze state. Widget config will follow same pattern.
- Graduated loading — Dashboard.tsx already loads contacts, pods, interactions independently. Widget toggle state loads synchronously from localStorage.
- Escape stack — for settings panel overlay.

### Key Refactoring
- **Dashboard.tsx decomposition**: Current 500-line monolith needs to be broken into individual widget components that the toggle system can show/hide. Each section becomes its own component receiving data via props.
- **Snooze extraction**: `getSnoozedIds()` / `snoozeContact()` should move to a shared utility so both the dashboard "Needs Attention" section and the nurturing drill-down can use them.

### Integration Points
- **App.tsx**: Add `/pulse/nurturing` sub-route under the dashboard route.
- **Dashboard.tsx**: Refactor into widget-based architecture with toggle/preset system.
- **HealthWidget.tsx**: Add nurturing signal badges (overdue banner, birthday badge).
- **OpportunityCard.tsx**: Add avatar dot indicators for linked contacts with active signals.
- **equity.ts**: No changes — reuse existing functions.
- **localStorage**: New key for widget config (visible widgets + active preset).

</code_context>

<deferred>
## Deferred Ideas

- Saved reports quick access widget — Phase 17 (Reporting)
- Multiple named dashboard views (DASH-03) — descoped to presets + toggles for V1
- Drag-and-drop widget reordering — future enhancement if presets prove insufficient
- Advanced intelligence layer beyond cadence (PDF Section 5) — V2 Copilot
- Maintenance module with drag-and-drop relationship hygiene — V2 (PDF "Later Versions")
- Brain view vs Feed view vs Maintenance view toggle — V2 (PDF "Later Versions")
- Gifting reminders in calendar section — future enhancement, no gifting data yet
- Pipeline velocity signals on dashboard — Phase 17 (Reporting)
- Scheduled/automated nurturing notifications — requires backend (out of scope)

</deferred>

---

*Phase: 16-dashboard-nurturing*
*Context gathered: 2026-03-30*
