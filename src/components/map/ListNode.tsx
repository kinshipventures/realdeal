import type React from 'react'
import { useNavigate } from 'react-router'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { Pod, HexColor } from '../../lib/types'
import { SolidOrb, POD_SHIFT_COLORS } from './SolidOrb'

export type ListNodeData = {
  list: Pod
  contactCount: number
  overdueCount: number
  healthPercent?: number
  loading?: boolean
  loadError?: boolean
  animationDelay?: string
  orbitStartX?: number
  orbitStartY?: number
  capacity?: number | null
  memberCount?: number
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
  const { list, contactCount, overdueCount, healthPercent, loading, loadError, animationDelay, orbitStartX, orbitStartY, capacity, memberCount } = data
  const navigate = useNavigate()
  const color = (list.color ?? '#718096') as HexColor
  const shiftColor = (POD_SHIFT_COLORS[color] ?? POD_SHIFT_COLORS[color.toUpperCase()]) as HexColor | undefined

  return (
    <div
      className="orbit-start"
      style={{
        '--orbit-start-x': `${orbitStartX ?? 0}px`,
        '--orbit-start-y': `${orbitStartY ?? 0}px`,
      } as React.CSSProperties}
    >
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

      <SolidOrb
        size={SIZE}
        color={color}
        shiftColor={shiftColor}
        healthPercent={healthPercent}
        glowIntensity={list.is_priority ? 'high' : 'low'}
        animationDelay={animationDelay}
        onClick={() => navigate(`/pod/${list.id}`)}
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
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            position: 'relative', zIndex: 1, padding: '0 12px',
            width: '100%', height: '100%',
          }}>
            <span style={{
              fontSize: fontSize(list.name),
              fontWeight: 600,
              color: 'rgba(255,255,255,0.95)',
              textAlign: 'center',
              lineHeight: 1.25,
              letterSpacing: '-0.01em',
              userSelect: 'none',
            }}>
              {list.name}
            </span>
            {overdueCount > 0 && (
              <div style={{
                position: 'absolute',
                top: -2, right: 4,
                width: 8, height: 8,
                borderRadius: '50%',
                background: '#FF3B30',
                border: '1.5px solid rgba(255,255,255,0.9)',
              }} />
            )}
          </div>
        )}
      </SolidOrb>
    </div>
  )
}
