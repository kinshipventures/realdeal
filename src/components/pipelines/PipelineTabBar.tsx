import { useRef, useState } from 'react'
import { MoreHorizontal, Plus } from 'lucide-react'
import type { Pipeline } from '../../lib/types'

interface Props {
  pipelines: Pipeline[]
  hiddenPipelines: Pipeline[]
  activePipelineId: string | null
  onSelect: (id: string) => void
  onCreateClick: () => void
  onHide: (id: string) => void
  onUnhide: (id: string) => void
}

export function PipelineTabBar({
  pipelines,
  hiddenPipelines,
  activePipelineId,
  onSelect,
  onCreateClick,
  onHide,
  onUnhide,
}: Props) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [confirmHideId, setConfirmHideId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  function handleMenuToggle(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setMenuOpenId(prev => (prev === id ? null : id))
    setConfirmHideId(null)
  }

  function handleHideClick(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setConfirmHideId(id)
  }

  function handleConfirmHide(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    onHide(id)
    setMenuOpenId(null)
    setConfirmHideId(null)
  }

  function handleCancelHide(e: React.MouseEvent) {
    e.stopPropagation()
    setConfirmHideId(null)
  }

  function handleTabClick(id: string) {
    setMenuOpenId(null)
    setConfirmHideId(null)
    onSelect(id)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 40,
        borderBottom: '1px solid var(--edge)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        maskImage: 'linear-gradient(to right, black 90%, transparent)',
        position: 'relative',
      }}
      onClick={() => { setMenuOpenId(null); setConfirmHideId(null) }}
    >
      {/* Active pipelines */}
      {pipelines.map(pipeline => {
        const isActive = pipeline.id === activePipelineId
        return (
          <div
            key={pipeline.id}
            style={{ position: 'relative', flexShrink: 0 }}
          >
            <button
              onClick={() => handleTabClick(pipeline.id)}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                border: 'none',
                background: 'transparent',
                color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: isActive ? 600 : 400,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 13,
                borderBottom: isActive ? '2px solid var(--color-brand)' : '2px solid transparent',
                height: 40,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
              }}
            >
              {pipeline.name}
              <span
                onClick={e => handleMenuToggle(e, pipeline.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  opacity: menuOpenId === pipeline.id ? 1 : 0,
                  transition: 'opacity 120ms',
                  cursor: 'pointer',
                  color: 'var(--color-text-tertiary)',
                }}
                className="tab-kebab"
                aria-label="Pipeline options"
              >
                <MoreHorizontal size={16} />
              </span>
            </button>

            {/* Dropdown menu */}
            {menuOpenId === pipeline.id && (
              <div
                ref={menuRef}
                style={{
                  position: 'absolute',
                  top: 40,
                  left: 0,
                  background: 'var(--surface-panel)',
                  border: '1px solid var(--edge)',
                  borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                  zIndex: 100,
                  minWidth: 180,
                  padding: '4px 0',
                }}
                onClick={e => e.stopPropagation()}
              >
                {confirmHideId === pipeline.id ? (
                  <div style={{ padding: '8px 14px' }}>
                    <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                      Hide pipeline? You can unhide it from the tab bar anytime.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={e => handleConfirmHide(e, pipeline.id)}
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: 'none',
                          background: 'var(--color-text-primary)',
                          color: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        Hide
                      </button>
                      <button
                        onClick={handleCancelHide}
                        style={{
                          fontSize: 12,
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--edge)',
                          background: 'transparent',
                          color: 'var(--color-text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={e => handleHideClick(e, pipeline.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      fontSize: 13,
                      padding: '8px 14px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    Hide pipeline
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Hidden pipelines section */}
      {hiddenPipelines.length > 0 && (
        <>
          <span
            style={{
              fontSize: 11,
              color: 'var(--color-text-tertiary)',
              padding: '0 8px',
              flexShrink: 0,
            }}
          >
            Hidden
          </span>
          {hiddenPipelines.map(pipeline => (
            <button
              key={pipeline.id}
              onClick={() => onUnhide(pipeline.id)}
              title="Click to unhide"
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                border: 'none',
                background: 'transparent',
                color: 'var(--color-text-secondary)',
                fontWeight: 400,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 13,
                opacity: 0.45,
                height: 40,
                whiteSpace: 'nowrap',
                borderBottom: '2px solid transparent',
              }}
            >
              {pipeline.name}
            </button>
          ))}
        </>
      )}

      {/* New pipeline "+" tab */}
      <button
        onClick={onCreateClick}
        aria-label="New pipeline"
        style={{
          height: 40,
          padding: '0 12px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: 'var(--color-text-tertiary)',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <Plus size={16} />
      </button>

      {/* Hover reveal for kebab — global style injection */}
      <style>{`
        .tab-kebab { opacity: 0 !important; }
        button:hover .tab-kebab { opacity: 1 !important; }
      `}</style>
    </div>
  )
}
