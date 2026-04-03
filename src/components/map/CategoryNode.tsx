import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { Category, HexColor } from '../../lib/types'
import { SolidOrb, POD_SHIFT_COLORS } from './SolidOrb'
import { LucideIcon } from '../LucideIcon'

export type CategoryNodeData = {
  category: Category
  listColor?: string | null
  contactCount?: number
  animationDelay?: string
  fading?: boolean
  onClick: () => void
  onIconClick?: (e: React.MouseEvent) => void
}
export type CategoryNodeType = Node<CategoryNodeData>

const SIZE = 64

function fontSize(name: string): number {
  if (name.length <= 5) return 11
  if (name.length <= 10) return 10
  if (name.length <= 16) return 9
  return 8
}

export function CategoryNodeComponent({ data }: NodeProps<CategoryNodeType>) {
  const { category, listColor, contactCount, animationDelay, fading, onClick, onIconClick } = data
  const accentColor = (listColor ?? '#718096') as HexColor
  const shiftColor = (POD_SHIFT_COLORS[accentColor] ?? POD_SHIFT_COLORS[accentColor.toUpperCase()]) as HexColor | undefined
  const hasIcon = !!category.icon

  return (
    <div className={fading ? 'orb-fading' : undefined} style={{ opacity: fading ? undefined : 1, transition: 'opacity 0.15s ease-out' }}>
      <Handle type="target" position={Position.Left}
        style={{ opacity: 0, width: 1, height: 1, top: SIZE / 2, left: SIZE / 2, transform: 'translate(-50%, -50%)' }}
      />
      <Handle type="source" position={Position.Right}
        style={{ opacity: 0, width: 1, height: 1, top: SIZE / 2, right: 'auto', left: SIZE / 2, transform: 'translate(-50%, -50%)' }}
      />

      <SolidOrb
        size={SIZE}
        color={accentColor}
        shiftColor={shiftColor}
        glowIntensity="low"
        animationDelay={animationDelay}
        onClick={onClick}
      >
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: hasIcon ? 1 : 2,
          position: 'relative', zIndex: 1, padding: '0 6px',
        }}>
          {hasIcon && (
            <div
              onClick={onIconClick}
              style={{ cursor: onIconClick ? 'pointer' : 'default', lineHeight: 0 }}
            >
              <LucideIcon name={category.icon!} size={hasIcon ? 18 : 0} color="rgba(255,255,255,0.92)" strokeWidth={1.75} />
            </div>
          )}
          <span style={{
            fontSize: hasIcon ? Math.min(fontSize(category.name), 9) : fontSize(category.name),
            fontWeight: 500,
            color: hasIcon ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.90)',
            textAlign: 'center',
            lineHeight: 1.2,
            letterSpacing: '-0.005em',
            userSelect: 'none',
          }}>
            {category.name}
          </span>
          {!hasIcon && contactCount !== undefined && (
            <span style={{
              fontSize: 8, color: 'rgba(255,255,255,0.50)',
              letterSpacing: '0.01em', userSelect: 'none',
            }}>
              {contactCount}
            </span>
          )}
        </div>
      </SolidOrb>
    </div>
  )
}
