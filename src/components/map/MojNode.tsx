import type React from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'

export type MojNodeData = Record<string, never>
export type MojNodeType = Node<MojNodeData, 'moj'>

export const MOJ_ID = 'moj-center'
export const MOJ_SIZE = 136

const bg = 'radial-gradient(circle at 35% 35%, #3a3a40 0%, #1C1C1E 50%, #0a0a0c 100%)'
const shadow = 'inset 0 -6px 16px rgba(0,0,0,0.35), 0 0 24px rgba(0,0,0,0.20), 0 6px 24px rgba(0,0,0,0.25)'

export function MojNodeComponent(_: NodeProps<MojNodeType>) {
  return (
    <>
      <Handle type="source" position={Position.Right}
        style={{ opacity: 0, width: 1, height: 1, top: MOJ_SIZE / 2, right: 'auto', left: MOJ_SIZE / 2, transform: 'translate(-50%, -50%)' }}
      />
      <Handle type="target" position={Position.Left}
        style={{ opacity: 0, width: 1, height: 1, top: MOJ_SIZE / 2, left: MOJ_SIZE / 2, transform: 'translate(-50%, -50%)' }}
      />

      <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          className="orb-enter orb-specular"
          style={{
            width: MOJ_SIZE,
            height: MOJ_SIZE,
            borderRadius: '50%',
            background: bg,
            boxShadow: shadow,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
            cursor: 'default',
          } as React.CSSProperties}
        >
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.90)',
            letterSpacing: '-0.01em',
            userSelect: 'none',
            position: 'relative',
            zIndex: 1,
            lineHeight: 1.2,
          }}>
            MRM
          </span>
        </div>
        <div className="orb-floor-shadow" style={{ width: MOJ_SIZE * 0.8, height: MOJ_SIZE * 0.2 }} />
      </div>
    </>
  )
}
