import type React from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import type { HexColor } from '../../lib/types'

const SIZE = 20

export type SatelliteNodeData = {
  name: string
  color: HexColor
  orbitStartX?: number
  orbitStartY?: number
  animationDelay?: string
  onClick?: () => void
}
export type SatelliteNodeType = Node<SatelliteNodeData>

export function SatelliteNodeComponent({ data }: NodeProps<SatelliteNodeType>) {
  const { name, color, orbitStartX, orbitStartY, animationDelay, onClick } = data

  return (
    <div
      className="orb-enter"
      style={{
        '--orbit-start-x': `${orbitStartX ?? 0}px`,
        '--orbit-start-y': `${orbitStartY ?? 0}px`,
        animationDelay,
      } as React.CSSProperties}
    >
      <div
        onClick={onClick}
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px ${color}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          fontSize: 5.5,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.85)',
          letterSpacing: '0.02em',
          userSelect: 'none',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.3)'
          e.currentTarget.style.boxShadow = `0 0 12px ${color}60`
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = `0 0 8px ${color}40`
        }}
        title={name}
      >
        {name.length <= 4 ? name.toUpperCase() : name.slice(0, 2).toUpperCase()}
      </div>
    </div>
  )
}
