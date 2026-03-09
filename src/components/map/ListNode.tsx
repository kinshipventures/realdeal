import type React from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { List } from '../../lib/types'
import { hexToRgba } from '../../lib/utils'

export type ListNodeData = {
  list: List
  contactCount: number
  overdueCount: number
  loading?: boolean
  animationDelay?: string
  onClick?: () => void
}
export type ListNodeType = Node<ListNodeData>

function fontSize(name: string): number {
  if (name.length <= 4) return 13
  if (name.length <= 8) return 11
  if (name.length <= 14) return 10
  return 9
}

export function ListNodeComponent({ data }: NodeProps<ListNodeType>) {
  const { list, contactCount, overdueCount, loading, animationDelay, onClick } = data
  const color = list.color ?? '#718096'
  const size = 96

  // Glass sphere uses three gradient layers to simulate light physics:
  // 1. Top-left specular highlight (where light enters the glass)
  // 2. Bottom-right color refraction (light exits tinted through glass body)
  // 3. Colored ambient body
  const bg = [
    `radial-gradient(ellipse 52% 32% at 30% 22%, rgba(255,255,255,0.72) 0%, transparent 100%)`,
    `radial-gradient(ellipse 42% 42% at 70% 74%, ${hexToRgba(color, 0.14)} 0%, transparent 100%)`,
    `radial-gradient(ellipse 85% 85% at 48% 52%, ${hexToRgba(color, 0.07)} 0%, transparent 100%)`,
    `rgba(255,255,255,0.54)`,
  ].join(', ')

  const shadow = [
    `0 0 32px ${hexToRgba(color, list.is_priority ? 0.18 : 0.10)}`,
    `0 4px 18px rgba(0,0,0,0.07)`,
    `inset 0 1.5px 0 rgba(255,255,255,0.92)`,
  ].join(', ')

  const shadowHover = [
    `0 0 48px ${hexToRgba(color, list.is_priority ? 0.26 : 0.16)}`,
    `0 8px 28px rgba(0,0,0,0.09)`,
    `inset 0 1.5px 0 rgba(255,255,255,0.95)`,
  ].join(', ')

  return (
    <>
      <Handle type="source" position={Position.Right}
        style={{ opacity: 0, width: 1, height: 1, top: size / 2, right: 'auto', left: size / 2, transform: 'translate(-50%, -50%)' }}
      />
      <Handle type="target" position={Position.Left}
        style={{ opacity: 0, width: 1, height: 1, top: size / 2, left: size / 2, transform: 'translate(-50%, -50%)' }}
      />

      {/* Overdue pulse ring */}
      {overdueCount > 0 && (
        <div style={{
          position: 'absolute',
          inset: -8,
          borderRadius: '50%',
          border: `1.5px solid ${hexToRgba('#FF3B30', 0.35)}`,
          animation: 'pulse-ring 2.4s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Glass orb */}
      <div
        className={`orb-enter${onClick ? ' orb-interactive' : ''}`}
        onClick={onClick}
        style={{
          '--orb-scale': '1.06',
          '--orb-lift': '-2px',
          width: size,
          height: size,
          borderRadius: '50%',
          position: 'relative',
          cursor: onClick ? 'pointer' : 'default',
          background: bg,
          border: `1px solid rgba(255,255,255,0.6)`,
          boxShadow: shadow,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          animationDelay,
        } as React.CSSProperties}
        onMouseEnter={e => {
          if (!onClick) return
          ;(e.currentTarget as HTMLElement).style.boxShadow = shadowHover
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLElement).style.boxShadow = shadow
        }}
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
      </div>
    </>
  )
}
