import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { Category, HexColor } from '../../lib/types'
import { SolidOrb } from './SolidOrb'

export type CategoryNodeData = {
  category: Category
  listColor?: string | null
  contactCount?: number
  animationDelay?: string
  onClick: () => void
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
  const { category, listColor, contactCount, animationDelay, onClick } = data
  const accentColor = (listColor ?? '#718096') as HexColor

  return (
    <>
      <Handle type="target" position={Position.Left}
        style={{ opacity: 0, width: 1, height: 1, top: SIZE / 2, left: SIZE / 2, transform: 'translate(-50%, -50%)' }}
      />
      <Handle type="source" position={Position.Right}
        style={{ opacity: 0, width: 1, height: 1, top: SIZE / 2, right: 'auto', left: SIZE / 2, transform: 'translate(-50%, -50%)' }}
      />

      <SolidOrb
        size={SIZE}
        color={accentColor}
        glowIntensity="low"
        animationDelay={animationDelay}
        onClick={onClick}
      >
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          position: 'relative', zIndex: 1, padding: '0 8px',
        }}>
          <span style={{
            fontSize: fontSize(category.name),
            fontWeight: 500,
            color: 'rgba(255,255,255,0.90)',
            textAlign: 'center',
            lineHeight: 1.3,
            letterSpacing: '-0.005em',
            userSelect: 'none',
          }}>
            {category.name}
          </span>
          {contactCount !== undefined && (
            <span style={{
              fontSize: 8, color: 'rgba(255,255,255,0.50)',
              letterSpacing: '0.01em', userSelect: 'none',
            }}>
              {contactCount}
            </span>
          )}
        </div>
      </SolidOrb>
    </>
  )
}
