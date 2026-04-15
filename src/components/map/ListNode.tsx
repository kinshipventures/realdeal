import { memo } from 'react'
import type React from 'react'
import { useNavigate } from 'react-router'
import { Position, type NodeProps, type Node } from '@xyflow/react'
import type { Pod, Category, HexColor } from '../../lib/types'
import { SolidOrb, POD_SHIFT_COLORS } from './SolidOrb'
import { LucideIcon } from '../LucideIcon'
import { scoreLabel } from '../../lib/equity'
import { FlowCenterHandle } from './MapPrimitives'

type ListNodeData = {
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
  categories?: Category[]
  depth?: number
  fading?: boolean
  highlighted?: boolean
  onHoverEnter?: (podId: string, x: number, y: number) => void
  onHoverLeave?: () => void
  onDrillIn?: (pod: Pod) => void
}
type ListNodeType = Node<ListNodeData>

const SIZE = 96

function fontSize(name: string): number {
  if (name.length <= 4) return 13
  if (name.length <= 8) return 11
  if (name.length <= 14) return 10
  return 9
}

export const ListNodeComponent = memo(function ListNodeComponent({ data }: NodeProps<ListNodeType>) {
  const { list, contactCount, overdueCount, healthPercent, loading, loadError, animationDelay, orbitStartX, orbitStartY, capacity, memberCount, categories = [], depth = 1.0, fading, highlighted, onHoverEnter, onHoverLeave, onDrillIn } = data
  const navigate = useNavigate()
  const color = (list.color ?? '#718096') as HexColor
  const shiftColor = (POD_SHIFT_COLORS[color] ?? POD_SHIFT_COLORS[color.toUpperCase()]) as HexColor | undefined

  return (
    <div
      className={`orbit-start parallax-layer${fading ? ' orb-fading' : ''}${highlighted ? ' orb-highlight-pulse' : ''}`}
      style={{
        '--orbit-start-x': `${orbitStartX ?? 0}px`,
        '--orbit-start-y': `${orbitStartY ?? 0}px`,
        '--depth': depth,
      } as React.CSSProperties}
      onMouseEnter={(e) => onHoverEnter?.(list.id, e.clientX, e.clientY)}
      onMouseLeave={() => onHoverLeave?.()}
    >
      <FlowCenterHandle type="source" position={Position.Right} size={SIZE} />
      <FlowCenterHandle type="target" position={Position.Left} size={SIZE} />

      <SolidOrb
        size={SIZE}
        color={color}
        shiftColor={shiftColor}
        healthPercent={healthPercent}
        glowIntensity={list.is_priority ? 'high' : 'low'}
        animationDelay={animationDelay}
        onClick={() => onDrillIn ? onDrillIn(list) : navigate(`/pod/${list.id}`)}
        ariaLabel={`Pod: ${list.name}`}
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
              fontWeight: 800,
              fontFamily: 'var(--font-serif)',
              color: 'rgba(255,255,255,0.95)',
              textAlign: 'center',
              lineHeight: 1.25,
              letterSpacing: '-0.01em',
              userSelect: 'none',
            }}>
              {list.name}
            </span>
            {contactCount > 0 && healthPercent !== undefined && (
              <span style={{
                fontSize: 8,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.55)',
                textAlign: 'center',
                userSelect: 'none',
                marginTop: 1,
                letterSpacing: '0.02em',
              }}>
                {contactCount} {scoreLabel(healthPercent)}
              </span>
            )}
          </div>
        )}
      </SolidOrb>

      {/* Satellite category dots - hidden by default, expand + orbit on hover */}
      {categories.length > 0 && (
        <div className="satellite-ring">
          {categories.map((cat, i) => {
            const expandRadius = 62
            const angle = (i / categories.length) * 360
            const satColor = cat.color ?? list.color ?? '#718096'

            return (
              <div
                key={cat.id}
                className="satellite-expand"
                style={{
                  '--expand-radius': `${expandRadius}px`,
                  '--expand-angle': `${angle}deg`,
                  '--sat-delay': `${i * 0.025}s`,
                } as React.CSSProperties}
              >
                <div
                  className="satellite-dot"
                  style={{ background: satColor }}
                  title={cat.name}
                >
                  {cat.icon
                    ? <LucideIcon name={cat.icon} size={10} color="rgba(255,255,255,0.9)" strokeWidth={2} />
                    : (cat.name.length <= 4 ? cat.name.toUpperCase() : cat.name.slice(0, 2).toUpperCase())
                  }
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})
