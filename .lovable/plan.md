

# Meeting Notes Integration - Multi-Provider Support

## What changes

Generalize the Granola-only meeting notes sync into a multi-provider system supporting Granola, Otter.ai, Fireflies.ai, and Fathom. Rename the widget, update data types, and add the integration to onboarding/account settings.

## Architecture

```text
src/lib/meeting-sync.ts          # Provider-agnostic sync engine + provider registry
  |-- GranolaProvider             # Existing logic, extracted
  |-- OtterProvider               # API key based (otter.ai)
  |-- FirefliesProvider           # API key based (fireflies.ai)
  |-- FathomProvider              # API key based (fathom.video)

src/components/dashboard/widgets/MeetingNotesWidget.tsx  # Replaces GranolaSyncWidget
```

## Files modified

### 1. `src/lib/meeting-sync.ts` (new, replaces `src/lib/granola.ts`)
- Define a `MeetingProvider` interface: `{ id, name, icon, keyPrefix, keyPattern, validate, sync }`
- Register 4 providers: Granola (`grn_`), Otter.ai, Fireflies.ai, Fathom
- Extract current Granola sync logic into a `GranolaProvider` implementation
- Other providers: stub sync functions that store/validate API keys but return `{ total_notes: 0, matched: 0, interactions_created: 0, skipped: 0 }` with a "coming soon" flag
- Shared helpers: `getProviderKey(id)`, `setProviderKey(id, key)`, `getConnectedProviders()`, `syncProvider(id)`
- Keep localStorage keys backward-compatible (`realdeal:granola-api-key` still works)

### 2. `src/lib/types.ts`
- Update `InteractionSource` to: `'Gmail' | 'Granola' | 'Otter' | 'Fireflies' | 'Fathom' | 'Manual'`
- Rename `granola_link` to `meeting_link` on `Interaction` interface (keep `granola_link` as deprecated alias)

### 3. `src/components/dashboard/widgets/MeetingNotesWidget.tsx` (new, replaces `GranolaSyncWidget.tsx`)
- Show all providers in a card list with connect/sync per provider
- Each provider row: icon + name + status badge (Connected/Coming Soon) + Sync/Connect button
- Connected providers show last sync time and sync button
- Unconnected providers show API key input on click
- Sync results shown inline per provider
- Widget heading: "meeting notes" (unchanged)

### 4. `src/components/dashboard/widgets/GranolaSyncWidget.tsx`
- Delete (replaced by MeetingNotesWidget)

### 5. `src/components/dashboard/useDashboardConfig.ts`
- Widget ID stays `'granola-sync'` internally for backward compatibility, label changes to "Meeting Notes"

### 6. `src/components/dashboard/Dashboard.tsx`
- Import `MeetingNotesWidget` instead of `GranolaSyncWidget`
- Render `MeetingNotesWidget` where `GranolaSyncWidget` was

### 7. `src/components/onboarding/OnboardingFlow.tsx`
- Add a "Meeting Notes" connection option in the import step
- Show provider picker (Granola, Otter, Fireflies, Fathom) with API key input
- Optional step - can skip

### 8. `src/components/settings/AccountPage.tsx`
- Add "Meeting Notes" section showing connected providers with manage/disconnect options

### 9. `src/lib/supabase-data.ts`
- Update `logInteraction` call signature to accept `meeting_link` alongside `granola_link`

## Provider details

| Provider | Key prefix | API base | Status |
|----------|-----------|----------|--------|
| Granola | `grn_` | `api.granola.ai/v1` | Full sync |
| Otter.ai | `otter_` | TBD | Connect only (coming soon) |
| Fireflies.ai | `ff_` | TBD | Connect only (coming soon) |
| Fathom | `fathom_` | TBD | Connect only (coming soon) |

## What stays the same
- Core sync logic for Granola is unchanged
- Dashboard widget position/ordering backward compatible
- Existing synced data and localStorage keys preserved

