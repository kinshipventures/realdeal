# Phase 4: Search + Birthdays - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Global contact search accessible from any view, plus a dashboard birthday reminders section for upcoming birthdays within 14 days. Two independent features sharing a phase because they're both quick UI additions on top of existing data.

</domain>

<decisions>
## Implementation Decisions

### Search: entry point
- **D-01:** Command palette overlay (Linear/Spotlight style) — centered modal with blurred background, not a persistent input
- **D-02:** Desktop: keyboard shortcut Cmd+K opens palette. Visible trigger: search icon added to the floating pill nav between Pulse and Map tabs
- **D-03:** Mobile: search icon added as third item in bottom tab bar (Pulse | Search | Map). Opens same command palette overlay
- **D-04:** Escape key dismisses palette (use existing escapeStack pattern)

### Search: filtering
- **D-05:** Client-side instant filter against in-memory contacts cache — no Airtable API calls during search. Contacts are already cached from Dashboard/OrbMap load
- **D-06:** Match against: name, company, role (case-insensitive, substring match)
- **D-07:** Filter as-you-type with no debounce (client-side, no network)

### Search: results
- **D-08:** Compact single-line rows: name (bold) + pod-colored dot + pod name (muted) + relative last-contact time (right-aligned)
- **D-09:** Clicking a result: dismiss palette, open ContactDetail side panel for that contact (same pattern as clicking contacts elsewhere)
- **D-10:** Empty results copy: "No one by that name" (from Phase 02.1 copy audit)
- **D-11:** Placeholder text: "Find someone..." (from Phase 02.1 copy audit)

### Birthdays: dashboard placement
- **D-12:** New "Coming Up" section on dashboard, positioned between green header band and Today's Focus
- **D-13:** Shows contacts with birthdays in the next 14 days, sorted by soonest first
- **D-14:** Section header: "Coming Up"
- **D-15:** Section hidden entirely when no birthdays in the next 14 days (no empty state)

### Birthdays: row treatment
- **D-16:** Compact rows matching dashboard list style: pod-colored dot, name (bold), date (e.g. "Mar 28"), days until (e.g. "5d"), pod name
- **D-17:** Today's birthdays show "Today" instead of "1d" and get a subtle warm background tint to distinguish from upcoming
- **D-18:** Clicking a birthday row opens ContactDetail panel (no birthday-specific actions or quick-log buttons)

### Claude's Discretion
- Keyboard navigation within command palette (arrow keys, enter to select)
- Command palette animation (fade/scale entrance)
- Exact warm tint color for today's birthday rows
- Whether search also appears in Today's Focus when birthday reason applies
- Sort order when multiple birthdays are on the same day

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system
- `docs/design-system.md` — Token set, typography, spacing, panel styles
- `DESIGN.md` — Full design system spec (colors, motion, dark mode tokens)

### Existing patterns
- `src/components/dashboard/Dashboard.tsx` — Dashboard layout, section structure, existing list patterns (overdue, dormant, focus)
- `src/App.tsx` — Pill nav (desktop) and bottom tab bar (mobile) — search icon inserts here
- `src/lib/escapeStack.ts` — Escape key handler stack — command palette pushes/pops here

### Data layer
- `src/lib/airtable.ts` — Contact cache (`_contactsCache`), `getContacts()`, Birthday field mapping (line 219)
- `src/lib/types.ts` — `Contact.birthday: ISODate | null`, `FocusReason = 'overdue' | 'birthday' | 'serendipity'`
- `src/lib/equity.ts` — `todaysFocus()` already supports birthday reason

### Prior phase context
- `.planning/phases/02.1-design-implementation/02.1-CONTEXT.md` — Copy/voice decisions (empty state copy, field renames, section headers)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `_contactsCache` in airtable.ts: already-loaded contacts for instant search filtering
- `ContactDetail` component: opens as side panel, accepts a contact — reuse for search result clicks and birthday row clicks
- `escapeStack`: push/pop pattern for dismissing overlay — use for command palette
- `Avatar` component in ui.tsx: initials circle, could use in search results if needed later
- `useIsMobile()` hook in App.tsx: breakpoint detection for nav layout switching
- `POD_SHIFT_COLORS` in SolidOrb: pod color mapping for the colored dots in results/birthday rows

### Established Patterns
- Dashboard sections: each is a `<section>` with header text + list of rows inside PANEL-styled container
- Graduated loading: each data source loads independently with its own loading state
- Contact selection: `setSelectedContact(contact)` opens ContactDetail panel

### Integration Points
- Pill nav in App.tsx (desktop): add search icon button between Pulse and Map
- Bottom tab bar in App.tsx (mobile): add Search as middle tab
- Dashboard.tsx: add Coming Up section between header band and Today's Focus
- Contact cache: search component reads from same cache Dashboard uses

</code_context>

<deferred>
## Deferred Ideas

- Search by pod/category name (e.g. type "LPs" to see all LP contacts) — future enhancement
- Search history / recent searches — unnecessary at this scale
- Birthday notifications / push reminders — requires backend, out of scope
- Birthday year / age display — privacy concern, just show month + day

</deferred>

---

*Phase: 04-search-birthdays*
*Context gathered: 2026-03-24*
