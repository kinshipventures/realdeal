

# Entity & Naming Standardization

## Mismatches Found

| Location | Current | Should Be | Type |
|----------|---------|-----------|------|
| Sidebar nav label | "Dashboard" | "Pulse" | Name mismatch - route is `/pulse`, mobile tab says "Pulse", but desktop sidebar says "Dashboard" |
| Sidebar nav label | "Account" | "Settings" | Name mismatch - page title says "Settings", tabs say Profile/Preferences/etc, but nav says "Account" |
| DashboardSettings widget ID | `granola-sync` | `meeting-notes` | Stale ID - widget was generalized to multi-provider "Meeting Notes" but ID still says granola |
| DashboardSettings section map | `'granola-sync': 'Activity & Links'` | `'meeting-notes': 'Activity & Links'` | Stale reference |
| Dashboard.tsx render branch | `id === 'granola-sync'` | should render `MeetingNotesWidget` | Old GranolaSyncWidget still referenced alongside new MeetingNotesWidget |
| GranolaSyncWidget.tsx | File still exists | Delete | Replaced by MeetingNotesWidget but never removed |
| InteractionSection.tsx | `granola_link` display label "view notes" | Should check `meeting_link` too | Only checks legacy field name |
| CampaignBoard.tsx, NurturingRow.tsx | `granola_link: null` in interaction objects | Should use `meeting_link` | Stale field name in hardcoded objects |
| LearnPage.tsx | "Dashboard" concept label | "Pulse" | Stale naming |
| ChangelogPage.tsx | "Pulse is the dashboard" | "Pulse is your daily view" | Confusing mixed terminology |
| Mobile tab bar | Missing Settings/Account tab | Add gear icon tab or ensure Account accessible | No way to reach settings on mobile except via URL |
| Sidebar `isRelationships` | Includes `/category/` paths | Sidebar uses it but App.tsx `isRelationships` does not include `/category/` | Inconsistent active-state detection between Sidebar and App.tsx mobile bar |

## Plan

### Files to modify

**`src/components/nav/Sidebar.tsx`**
- Change `label="Dashboard"` to `label="Pulse"` (line 133)
- Change `label="Account"` to `label="Settings"` (line 267)
- Rename `DashboardIcon` to `PulseIcon`

**`src/App.tsx`**
- Mobile tab: add `/category/` to `isRelationships` check for consistency with sidebar
- Mobile tab: add a Settings tab (gear icon) pointing to `/account`

**`src/components/dashboard/useDashboardConfig.ts`**
- Rename widget ID `'granola-sync'` to `'meeting-notes'` in `WidgetId` type, `ALL_WIDGETS`, `PRESET_CONFIGS`, and `DEFAULT_ORDER`
- Add migration: if localStorage config contains `granola-sync`, rename it to `meeting-notes`

**`src/components/dashboard/DashboardSettings.tsx`**
- Update `WIDGET_SECTION` key from `'granola-sync'` to `'meeting-notes'`

**`src/components/dashboard/Dashboard.tsx`**
- Update render branch from `id === 'granola-sync'` to `id === 'meeting-notes'`
- Remove any remaining `GranolaSyncWidget` import

**`src/components/dashboard/widgets/GranolaSyncWidget.tsx`**
- Delete file

**`src/components/contacts/InteractionSection.tsx`**
- Check both `granola_link` and `meeting_link` for the "view notes" link display

**`src/components/campaigns/CampaignBoard.tsx`**
- Replace `granola_link: null` with `meeting_link: null` in hardcoded interaction objects

**`src/components/nurturing/NurturingRow.tsx`**
- Same: `granola_link` to `meeting_link`

**`src/components/learn/LearnPage.tsx`**
- Rename "Dashboard" concept row label to "Pulse"

**`src/components/changelog/ChangelogPage.tsx`**
- Update "Pulse is the dashboard" text to remove "dashboard" wording

No database changes needed. All fixes are UI label and stale reference cleanup.

