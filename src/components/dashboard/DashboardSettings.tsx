import { useCallback, useState } from 'react'
import { useEscape } from '../../lib/escapeStack'
import { ALL_WIDGETS, PRESET_CONFIGS } from './useDashboardConfig'
import type { DashboardConfig, WidgetId, Preset } from './useDashboardConfig'

interface DashboardSettingsProps {
  config: DashboardConfig
  onToggle: (id: WidgetId) => void
  onPreset: (preset: Preset) => void
  onReorder: (from: number, to: number) => void
  onClose: () => void
}

export function DashboardSettings({ config, onToggle, onPreset, onReorder, onClose }: DashboardSettingsProps) {
  const stableClose = useCallback(() => onClose(), [onClose])
  useEscape(stableClose)

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  // Only orderable widgets (equity stays in header)
  const orderedWidgets = config.order
    .map(id => ALL_WIDGETS.find(w => w.id === id))
    .filter(Boolean) as { id: WidgetId; label: string }[]

  // Equity is shown separately at top as non-orderable
  const equityWidget = ALL_WIDGETS.find(w => w.id === 'equity')!

  function handleDragStart(e: React.DragEvent, index: number) {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverIndex(index)
  }

  function handleDrop(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (dragIndex !== null && dragIndex !== index) {
      onReorder(dragIndex, index)
    }
    setDragIndex(null)
    setOverIndex(null)
  }

  function handleDragEnd() {
    setDragIndex(null)
    setOverIndex(null)
  }

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
            x
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
              ? `${PRESET_CONFIGS.focus.length} widgets - essentials only`
              : `${PRESET_CONFIGS.full.length} widgets - everything`}
          </div>
        </div>

        {/* Widget list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          <div style={{ padding: '12px 20px 8px', fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Widgets
          </div>

          {/* Equity - non-orderable, always in header */}
          <WidgetRow
            widget={equityWidget}
            visible={config.visible.has(equityWidget.id)}
            onToggle={onToggle}
            draggable={false}
          />

          {/* Orderable widgets */}
          {orderedWidgets.map((widget, index) => {
            const isDragging = dragIndex === index
            const isOver = overIndex === index && dragIndex !== null && dragIndex !== index
            return (
              <div
                key={widget.id}
                draggable
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={e => handleDragOver(e, index)}
                onDrop={e => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                style={{
                  opacity: isDragging ? 0.4 : 1,
                  borderTop: isOver && overIndex! < dragIndex! ? '2px solid var(--color-brand)' : undefined,
                  borderBottom: isOver && overIndex! > dragIndex! ? '2px solid var(--color-brand)' : '1px solid var(--divider)',
                }}
              >
                <WidgetRow
                  widget={widget}
                  visible={config.visible.has(widget.id)}
                  onToggle={onToggle}
                  draggable
                />
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function DragHandle() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="currentColor"
      style={{ color: 'var(--color-text-tertiary)', flexShrink: 0, cursor: 'grab' }}
    >
      <circle cx="3" cy="2" r="1.2" />
      <circle cx="9" cy="2" r="1.2" />
      <circle cx="3" cy="6" r="1.2" />
      <circle cx="9" cy="6" r="1.2" />
      <circle cx="3" cy="10" r="1.2" />
      <circle cx="9" cy="10" r="1.2" />
    </svg>
  )
}

function WidgetRow({
  widget,
  visible,
  onToggle,
  draggable,
}: {
  widget: { id: WidgetId; label: string }
  visible: boolean
  onToggle: (id: WidgetId) => void
  draggable: boolean
}) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 20px',
      }}
    >
      {draggable ? <DragHandle /> : <div style={{ width: 12 }} />}
      <span style={{ fontSize: 13, color: 'var(--color-text-primary)', flex: 1 }}>
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
}
