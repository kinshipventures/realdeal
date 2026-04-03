

# Configurable Equity Score Pods

## What

The overall equity score currently uses only pods with `is_priority = true`. Add a "Score Pods" picker to the existing dashboard settings panel so users can check/uncheck which pods feed the equity ring. Defaults to priority pods; persists to localStorage.

## Changes

### 1. `src/components/dashboard/useDashboardConfig.ts`

- Add `equityPodIds: string[] | null` to `StoredConfig` and `DashboardConfig` (null = "use priority pods" default)
- Add `setEquityPods(podIds: string[] | null)` to the hook return
- Bump storage key to `v3` to force clean migration

### 2. `src/components/dashboard/DashboardSettings.tsx`

- Accept new props: `pods: Pod[]`, `equityPodIds: string[] | null`, `onSetEquityPods: (ids: string[] | null) => void`
- Add a "Score Pods" section below presets/above widget list
- Show a "Use priority pods (default)" toggle. When on, `equityPodIds` is null (auto). When off, show pod checkboxes.
- Each pod row: color dot + name + checkbox

### 3. `src/components/dashboard/Dashboard.tsx`

- Destructure `setEquityPods` and `config.equityPodIds` from hook
- Replace `priorityPods` in `overallScore` computation: if `equityPodIds` is null, use priority pods (current behavior); otherwise filter pods by the configured IDs
- Pass `pods`, `equityPodIds`, `onSetEquityPods` to `DashboardSettings`

## Files modified

- `src/components/dashboard/useDashboardConfig.ts`
- `src/components/dashboard/DashboardSettings.tsx`
- `src/components/dashboard/Dashboard.tsx`

