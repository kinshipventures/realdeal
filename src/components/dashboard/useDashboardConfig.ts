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
  | 'gmail-sync'

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
  { id: 'gmail-sync', label: 'Email Sync' },
]

export const PRESET_CONFIGS: Record<Preset, WidgetId[]> = {
  full: ['equity', 'wrapped', 'pod-health', 'todays-focus', 'needs-attention', 'coming-up', 'recent-activity', 'quick-links', 'pending-tray', 'gmail-sync'],
  focus: ['pending-tray', 'todays-focus', 'needs-attention', 'coming-up', 'quick-links'],
}

// Orderable widgets (equity lives in header band, not the widget flow)
export const DEFAULT_ORDER: WidgetId[] = [
  'pending-tray',
  'pod-health',
  'wrapped',
  'todays-focus',
  'coming-up',
  'needs-attention',
  'recent-activity',
  'quick-links',
  'gmail-sync',
]

const STORAGE_KEY = 'realdeal:dashboard-config:v3'

interface StoredConfig {
  preset: Preset
  visible: WidgetId[]
  order: WidgetId[]
  equityPodIds: string[] | null
}

export interface DashboardConfig {
  preset: Preset
  visible: Set<WidgetId>
  order: WidgetId[]
  equityPodIds: string[] | null
}

function loadConfig(): DashboardConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { preset: 'full', visible: new Set(PRESET_CONFIGS.full), order: DEFAULT_ORDER }
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

    // Order drift protection: append any new orderable widget IDs not in stored order
    const storedOrder: WidgetId[] = parsed.order ?? DEFAULT_ORDER
    const orderSet = new Set(storedOrder)
    for (const id of DEFAULT_ORDER) {
      if (!orderSet.has(id)) storedOrder.push(id)
    }

    return { preset, visible: storedSet, order: storedOrder }
  } catch {
    return { preset: 'full', visible: new Set(PRESET_CONFIGS.full), order: DEFAULT_ORDER, equityPodIds: null }
  }
}

function saveConfig(config: DashboardConfig) {
  try {
    const stored: StoredConfig = {
      preset: config.preset,
      visible: [...config.visible] as WidgetId[],
      order: config.order,
      equityPodIds: config.equityPodIds,
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
    setConfig(prev => {
      const updated: DashboardConfig = { preset, visible: new Set(PRESET_CONFIGS[preset]), order: prev.order }
      saveConfig(updated)
      return updated
    })
  }, [])

  const reorderWidgets = useCallback((fromIndex: number, toIndex: number) => {
    setConfig(prev => {
      const next = [...prev.order]
      const [item] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, item)
      const updated = { ...prev, order: next }
      saveConfig(updated)
      return updated
    })
  }, [])

  const setEquityPods = useCallback((podIds: string[] | null) => {
    setConfig(prev => {
      const updated = { ...prev, equityPodIds: podIds }
      saveConfig(updated)
      return updated
    })
  }, [])

  return { config, isVisible, toggleWidget, applyPreset, reorderWidgets, setEquityPods }
}
