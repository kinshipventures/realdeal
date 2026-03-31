import { useState, useCallback } from 'react'

export type WidgetId =
  | 'equity'
  | 'wrapped'
  | 'pod-health'
  | 'todays-focus'
  | 'needs-attention'
  | 'coming-up'
  | 'recent-activity'
  | 'quick-links'
  | 'pending-tray'

export type Preset = 'full' | 'focus'

export const ALL_WIDGETS: { id: WidgetId; label: string }[] = [
  { id: 'equity', label: 'Equity Ring' },
  { id: 'wrapped', label: 'Wrapped Insights' },
  { id: 'pod-health', label: 'Pod Health' },
  { id: 'todays-focus', label: "Today's Focus" },
  { id: 'needs-attention', label: 'Needs Attention' },
  { id: 'coming-up', label: 'Coming Up' },
  { id: 'recent-activity', label: 'Recent Activity' },
  { id: 'quick-links', label: 'Quick Links' },
  { id: 'pending-tray', label: 'Pending Tray' },
]

export const PRESET_CONFIGS: Record<Preset, WidgetId[]> = {
  full: ['equity', 'wrapped', 'pod-health', 'todays-focus', 'needs-attention', 'coming-up', 'recent-activity', 'quick-links', 'pending-tray'],
  focus: ['pending-tray', 'todays-focus', 'needs-attention', 'coming-up', 'quick-links'],
}

const STORAGE_KEY = 'realdeal:dashboard-config:v1'

interface StoredConfig {
  preset: Preset
  visible: WidgetId[]
}

export interface DashboardConfig {
  preset: Preset
  visible: Set<WidgetId>
}

function loadConfig(): DashboardConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { preset: 'full', visible: new Set(PRESET_CONFIGS.full) }
    const parsed = JSON.parse(raw) as StoredConfig
    const preset: Preset = parsed.preset === 'focus' ? 'focus' : 'full'

    // Version-drift protection: fill any missing widget IDs from current preset defaults
    const storedSet = new Set(parsed.visible ?? []) as Set<WidgetId>
    const defaults = new Set(PRESET_CONFIGS[preset])
    for (const id of ALL_WIDGETS.map(w => w.id)) {
      if (!storedSet.has(id) && defaults.has(id)) {
        storedSet.add(id)
      }
    }
    return { preset, visible: storedSet }
  } catch {
    return { preset: 'full', visible: new Set(PRESET_CONFIGS.full) }
  }
}

function saveConfig(config: DashboardConfig) {
  try {
    const stored: StoredConfig = {
      preset: config.preset,
      visible: [...config.visible] as WidgetId[],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch { /* silent */ }
}

export function useDashboardConfig() {
  const [config, setConfig] = useState<DashboardConfig>(loadConfig)

  const isVisible = useCallback((id: WidgetId) => config.visible.has(id), [config.visible])

  const toggleWidget = useCallback((id: WidgetId) => {
    setConfig(prev => {
      const next = new Set(prev.visible)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      const updated = { ...prev, visible: next }
      saveConfig(updated)
      return updated
    })
  }, [])

  const applyPreset = useCallback((preset: Preset) => {
    setConfig(() => {
      const updated: DashboardConfig = { preset, visible: new Set(PRESET_CONFIGS[preset]) }
      saveConfig(updated)
      return updated
    })
  }, [])

  return { config, isVisible, toggleWidget, applyPreset }
}
