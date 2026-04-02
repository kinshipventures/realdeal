import { useCallback, useRef, useState } from 'react'
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
  const [insertIndex, setInsertIndex] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])

  const orderedWidgets = config.order
    .map(id => ALL_WIDGETS.find(w => w.id === id))
    .filter(Boolean) as { id: WidgetId; label: string }[]

  const equityWidget = ALL_WIDGETS.find(w => w.id === 'equity')!

  function getInsertIndex(clientY: number): number {
    for (let i = 0; i < rowRefs.current.length; i++) {
      const row = rowRefs.current[i]
      if (!row) continue
      const rect = row.getBoundingClientRect()
      const mid = rect.top + rect.height / 2
      if (clientY < mid) return i
    }
    return rowRefs.current.length
  }

  function handlePointerDown(e: React.PointerEvent, index: number) {
    // Only left mouse button
    if (e.button !== 0) return
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setDragIndex(index)
    setInsertIndex(index)

    function onMove(ev: PointerEvent) {
      setInsertIndex(getInsertIndex(ev.clientY))
    }

    function onUp(ev: PointerEvent) {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      const finalInsert = getInsertIndex(ev.clientY)
      // Adjust for the removal of the dragged item
      const to = finalInsert > index ? finalInsert - 1 : finalInsert
      if (to !== index) onReorder(index, to)
      setDragIndex(null)
      setInsertIndex(null)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  // Show a drop indicator line between rows
  function showIndicator(rowIndex: number): 'above' | 'below' | null {
    if (dragIndex === null || insertIndex === null) return null
    if (insertIndex === rowIndex && insertIndex !== dragIndex && insertIndex !== dragIndex + 1) return 'above'
    if (insertIndex === rowIndex + 1 && insertIndex !== dragIndex && insertIndex !== dragIndex + 1) return 'below'
    return null
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
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
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
            const indicator = showIndicator(index)
            return (
              <div
                key={widget.id}
                ref={el => { rowRefs.current[index] = el }}
                style={{
                  opacity: isDragging ? 0.4 : 1,
                  position: 'relative',
                  transition: isDragging ? 'none' : 'opacity 0.15s',
                }}
              >
                {indicator === 'above' && (
                  <div style={{ position: 'absolute', top: 0, left: 20, right: 20, height: 2, background: 'var(--color-brand)', borderRadius: 1, zIndex: 1 }} />
                )}
                <WidgetRow
                  widget={widget}
                  visible={config.visible.has(widget.id)}
                  onToggle={onToggle}
                  draggable
                  onGripPointerDown={e => handlePointerDown(e, index)}
                />
                {indicator === 'below' && (
                  <div style={{ position: 'absolute', bottom: 0, left: 20, right: 20, height: 2, background: 'var(--color-brand)', borderRadius: 1, zIndex: 1 }} />
                )}
              </div>
            )
          })}
          {/* Bottom drop zone indicator */}
          {dragIndex !== null && insertIndex === orderedWidgets.length && insertIndex !== dragIndex && insertIndex !== dragIndex + 1 && (
            <div style={{ margin: '0 20px', height: 2, background: 'var(--color-brand)', borderRadius: 1 }} />
          )}
        </div>
      </div>
    </>
  )
}

function DragHandle({ onPointerDown }: { onPointerDown?: (e: React.PointerEvent) => void }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="currentColor"
      onPointerDown={onPointerDown}
      style={{ color: 'var(--color-text-tertiary)', flexShrink: 0, cursor: 'grab', touchAction: 'none' }}
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
  onGripPointerDown,
}: {
  widget: { id: WidgetId; label: string }
  visible: boolean
  onToggle: (id: WidgetId) => void
  draggable: boolean
  onGripPointerDown?: (e: React.PointerEvent) => void
}) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 20px',
        borderBottom: '1px solid var(--divider)',
        userSelect: 'none',
      }}
    >
      {draggable ? <DragHandle onPointerDown={onGripPointerDown} /> : <div style={{ width: 12 }} />}
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
