import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { Pod, HexColor } from '../../lib/types'
import { GlassOrb } from './GlassOrb'

export type ListNodeData = {
  list: Pod
  contactCount: number
  overdueCount: number
  loading?: boolean
  loadError?: boolean
  animationDelay?: string
  onClick?: () => void
}
export type ListNodeType = Node<ListNodeData>

const SIZE = 96

function fontSize(name: string): number {
  if (name.length <= 4) return 13
  if (name.length <= 8) return 11
  if (name.length <= 14) return 10
  return 9
}

export function ListNodeComponent({ data }: NodeProps<ListNodeType>) {
  const { list, contactCount, overdueCount, loading, loadError, animationDelay, onClick } = data
  const color = (list.color ?? '#718096') as HexColor

  return (
    <>
      <Handle type="source" position={Position.Right}
        style={{ opacity: 0, width: 1, height: 1, top: SIZE / 2, right: 'auto', left: SIZE / 2, transform: 'translate(-50%, -50%)' }}
      />
      <Handle type="target" position={Position.Left}
        style={{ opacity: 0, width: 1, height: 1, top: SIZE / 2, left: SIZE / 2, transform: 'translate(-50%, -50%)' }}
      />

      {/* Overdue pulse ring — outside the orb, positioned absolutely */}
      {overdueCount > 0 && (
        <div style={{
          position: 'absolute',
          inset: -8,
          borderRadius: '50%',
          border: `1.5px solid rgba(255,59,48,0.35)`,
          animation: 'pulse-ring 2.4s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      <GlassOrb
        size={SIZE}
        color={color}
        glowIntensity={list.is_priority ? 'high' : 'low'}
        animationDelay={animationDelay}
        onClick={onClick}
        className={loadError ? 'orb-error-flash' : undefined}
      >
        {loading ? (
          <div style={{
            width: 18, height: 18,
            borderRadius: '50%',
            border: '1.5px solid rgba(255,255,255,0.15)',
            borderTopColor: 'rgba(255,255,255,0.7)',
            animation: 'spin 0.75s linear infinite',
          }} />
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            position: 'relative', zIndex: 1, padding: '0 10px',
          }}>
            <span style={{
              fontSize: fontSize(list.name),
              fontWeight: 600,
              color: 'rgba(0,0,0,0.72)',
              textAlign: 'center',
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
              userSelect: 'none',
            }}>
              {list.name}
            </span>
            <span style={{
              fontSize: 9, color: 'rgba(0,0,0,0.30)',
              letterSpacing: '0.01em', userSelect: 'none',
            }}>
              {contactCount}
            </span>
            {overdueCount > 0 && (
              <span style={{
                fontSize: 9, color: 'hsla(20, 80%, 45%, 0.80)',
                display: 'flex', alignItems: 'center', gap: 3, userSelect: 'none',
              }}>
                <span style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: 'hsla(20, 80%, 45%, 0.80)', flexShrink: 0,
                }} />
                {overdueCount}
              </span>
            )}
          </div>
        )}

        {/* Color bottom rim */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '18%',
          right: '18%',
          height: 2,
          background: `linear-gradient(90deg, transparent, ${color}DD, transparent)`,
          borderRadius: '0 0 1px 1px',
        }} />
      </GlassOrb>
    </>
  )
}
