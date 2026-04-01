import { useCallback } from 'react'
import { useEscape } from '../../lib/escapeStack'
import { ALL_WIDGETS, PRESET_CONFIGS } from './useDashboardConfig'
import type { DashboardConfig, WidgetId, Preset } from './useDashboardConfig'

interface DashboardSettingsProps {
  config: DashboardConfig
  onToggle: (id: WidgetId) => void
  onPreset: (preset: Preset) => void
  onClose: () => void
}

export function DashboardSettings({ config, onToggle, onPreset, onClose }: DashboardSettingsProps) {
  const stableClose = useCallback(() => onClose(), [onClose])
  useEscape(stableClose)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.20)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 200,
        }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 320,
        maxHeight: 'calc(100vh - 80px)',
        background: 'var(--surface-panel)',
        backdropFilter: 'var(--panel-blur)',
        WebkitBackdropFilter: 'var(--panel-blur)',
        border: '1px solid var(--edge)',
        borderRadius: 16,
        zIndex: 201,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Dashboard
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 18, lineHeight: 1, padding: 4 }}
          >
            ✕
          </button>
        </div>

        {/* Presets */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--divider)' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Preset
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['full', 'focus'] as Preset[]).map(preset => {
              const active = config.preset === preset
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onPreset(preset)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 8,
                    fontSize: 13, fontWeight: 500,
                    background: active ? 'var(--color-brand)' : 'var(--tint)',
                    color: active ? '#fff' : 'var(--color-text-secondary)',
                    border: active ? 'none' : '1px solid var(--edge)',
                    cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}
                >
                  {preset === 'full' ? 'Full' : 'Focus'}
                </button>
              )
            })}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            {config.preset === 'focus'
              ? `${PRESET_CONFIGS.focus.length} widgets — essentials only`
              : `${PRESET_CONFIGS.full.length} widgets — everything`}
          </div>
        </div>

        {/* Widget toggles */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          <div style={{ padding: '12px 20px 8px', fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Widgets
          </div>
          {ALL_WIDGETS.map(widget => {
            const visible = config.visible.has(widget.id)
            return (
              <div
                key={widget.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 20px',
                  borderBottom: '1px solid var(--divider)',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
                  {widget.label}
                </span>
                <button
                  type="button"
                  onClick={() => onToggle(widget.id)}
                  style={{
                    width: 36, height: 20, borderRadius: 10, border: 'none',
                    background: visible ? 'var(--color-brand)' : 'rgba(0,0,0,0.12)',
                    cursor: 'pointer', position: 'relative',
                    transition: 'background 0.15s',
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2,
                    left: visible ? 18 : 2,
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.15s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.20)',
                  }} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
