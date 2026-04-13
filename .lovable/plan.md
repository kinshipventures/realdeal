

# User Settings Page

## Summary
Split the current Account page into a proper settings experience with tabbed navigation covering Profile, Preferences, Integrations, and Team - giving users control over app behavior, defaults, and appearance.

## What changes

### New route structure
Keep `/account` but add a tabbed layout at the top:
- **Profile** - existing name/email (already built)
- **Preferences** - new app behavior controls
- **Integrations** - meeting notes providers (moved from current page)
- **Team** - existing team management (moved from current page)

### Preferences section (new)
Controls for app-level settings, all backed by localStorage:

| Setting | Control | Storage key | Default |
|---------|---------|-------------|---------|
| Default pod cadence | Segmented picker (Weekly/Biweekly/Monthly/Quarterly) | `realdeal:default-cadence` | monthly |
| Pods view mode | Toggle (Map/List) | `realdeal:pods-view-mode` | map |
| Dashboard preset | Segmented picker (Full/Focus) | `realdeal:dashboard-config:v5` (preset field) | full |
| Sidebar collapsed | Toggle | `realdeal:sidebar-collapsed` | expanded |
| Notifications/reminders | Toggle for overdue nudges | new key `realdeal:show-nudges` | on |
| Reset onboarding | Button to re-trigger onboarding flow | clears `realdeal:onboarding-complete:*` | - |

### Visual design
- Tab bar at top of page (Profile / Preferences / Integrations / Team) with underline active indicator
- Same 480px max-width, 48px top padding
- HIG-aligned: 44px touch targets on tabs, 16px input fonts, consistent spacing

## Files modified

### `src/components/settings/AccountPage.tsx`
- Add tab state (`profile | preferences | integrations | team`)
- Render tab bar at top
- Move Meeting Notes section into "Integrations" tab
- Move Team section into "Team" tab
- Add new "Preferences" tab with the settings controls above
- Each control reads/writes its own localStorage key directly
- Dashboard preset change calls the same logic as `useDashboardConfig`

### `src/components/settings/PreferencesTab.tsx` (new)
- Self-contained component for all preference controls
- Segmented picker sub-component for cadence/preset/view mode
- Toggle switch sub-component for boolean settings
- Reset onboarding button with confirmation

No database changes needed - all preferences are localStorage-backed.

