import { useState, useCallback } from 'react'

export type WidgetId =
  | 'equity'
  | 'todays-focus'
  | 'pod-health'
  | 'coming-up'

export type Preset = 'full' | 'focus'

export const ALL_WIDGETS: { id: WidgetId; label: string }[] = [
  { id: 'todays-focus', label: "Today's Focus" },
  { id: 'equity', label: 'Equity Ring' },
  { id: 'pod-health', label: 'Pod Health' },
  { id: 'coming-up', label: 'Coming Up' },
]

export const PRESET_CONFIGS: Record<Preset, WidgetId[]> = {
  full: ['todays-focus', 'equity', 'pod-health', 'coming-up'],
  focus: ['todays-focus', 'coming-up'],
}

const DEFAULT_ORDER: WidgetId[] = [
  'todays-focus',
  'equity',
  'pod-health',
  'coming-up',
]

const STORAGE_KEY = 'realdeal:dashboard-config:v8'

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
    if (!raw) return { preset: 'full', visible: new Set(PRESET_CONFIGS.full), order: DEFAULT_ORDER, equityPodIds: null }
    const parsed = JSON.parse(raw) as StoredConfig
    const preset: Preset = parsed.preset === 'focus' ? 'focus' : 'full'

    // Filter out any unknown widget IDs from older configs (post-cleanup).
    const known = new Set(ALL_WIDGETS.map(w => w.id) as WidgetId[])
    const safeFilter = (ids: unknown): WidgetId[] =>
      Array.isArray(ids) ? (ids.filter(id => known.has(id as WidgetId)) as WidgetId[]) : []

    const storedSet = new Set(safeFilter(parsed.visible))
    const defaults = new Set(PRESET_CONFIGS[preset])
    for (const id of ALL_WIDGETS.map(w => w.id)) {
      if (!storedSet.has(id) && defaults.has(id)) {
        storedSet.add(id)
      }
    }

    const storedOrder: WidgetId[] = safeFilter(parsed.order)
    const orderSet = new Set(storedOrder)
    for (const id of DEFAULT_ORDER) {
      if (!orderSet.has(id)) storedOrder.push(id)
    }

    const equityPodIds: string[] | null = parsed.equityPodIds ?? null

    return { preset, visible: storedSet, order: storedOrder, equityPodIds }
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
      const updated: DashboardConfig = { preset, visible: new Set(PRESET_CONFIGS[preset]), order: prev.order, equityPodIds: prev.equityPodIds }
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
