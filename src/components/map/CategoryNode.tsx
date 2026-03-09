import type React from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { Category } from '../../lib/types'
import { hexToRgba } from '../../lib/utils'

export type CategoryNodeData = {
  category: Category
  listColor?: string | null
  animationDelay?: string
  onClick: () => void
}
export type CategoryNodeType = Node<CategoryNodeData>

function fontSize(name: string): number {
  if (name.length <= 5) return 11
  if (name.length <= 10) return 10
  if (name.length <= 16) return 9
  return 8
}

export function CategoryNodeComponent({ data }: NodeProps<CategoryNodeType>) {
  const { category, listColor, animationDelay, onClick } = data
  const SIZE = 64

  const accentColor = listColor ?? '#718096'

  const bg = [
    `radial-gradient(ellipse 52% 32% at 30% 22%, rgba(255,255,255,0.72) 0%, transparent 100%)`,
    `radial-gradient(ellipse 40% 40% at 68% 70%, ${hexToRgba(accentColor, 0.12)} 0%, transparent 100%)`,
    `rgba(255,255,255,0.56)`,
  ].join(', ')

  const shadow = [
    `0 0 20px ${hexToRgba(accentColor, 0.10)}`,
    `0 3px 12px rgba(0,0,0,0.06)`,
    `inset 0 1px 0 rgba(255,255,255,0.90)`,
  ].join(', ')

  const shadowHover = [
    `0 0 32px ${hexToRgba(accentColor, 0.18)}`,
    `0 6px 20px rgba(0,0,0,0.08)`,
    `inset 0 1px 0 rgba(255,255,255,0.95)`,
  ].join(', ')

  return (
    <>
      <Handle type="target" position={Position.Left}
        style={{ opacity: 0, width: 1, height: 1, top: SIZE / 2, left: SIZE / 2, transform: 'translate(-50%, -50%)' }}
      />
      <Handle type="source" position={Position.Right}
        style={{ opacity: 0, width: 1, height: 1, top: SIZE / 2, right: 'auto', left: SIZE / 2, transform: 'translate(-50%, -50%)' }}
      />

      <div
        className="orb-enter orb-interactive"
        onClick={onClick}
        style={{
          '--orb-scale': '1.1',
          '--orb-lift': '-1px',
          width: SIZE,
          height: SIZE,
          borderRadius: '50%',
          position: 'relative',
          cursor: 'pointer',
          background: bg,
          border: '1px solid rgba(255,255,255,0.65)',
          boxShadow: shadow,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          animationDelay,
        } as React.CSSProperties}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLElement).style.boxShadow = shadowHover
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLElement).style.boxShadow = shadow
        }}
      >
        <span style={{
          fontSize: fontSize(category.name),
          fontWeight: 500,
          color: 'rgba(0,0,0,0.60)',
          textAlign: 'center',
          lineHeight: 1.3,
          letterSpacing: '-0.005em',
          padding: '0 8px',
          userSelect: 'none',
          position: 'relative',
          zIndex: 1,
        }}>
          {category.name}
        </span>

        {/* Color rim */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '20%',
          right: '20%',
          height: 1.5,
          background: `linear-gradient(90deg, transparent, ${accentColor}99, transparent)`,
        }} />
      </div>
    </>
  )
}
