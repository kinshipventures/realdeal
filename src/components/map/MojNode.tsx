import type React from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { hexToRgba } from '../../lib/utils'

export type MojNodeData = Record<string, never>
export type MojNodeType = Node<MojNodeData, 'moj'>

export const MOJ_ID = 'moj-center'
export const MOJ_SIZE = 116

const ACCENT = '#C8906A'

const bg = [
  'radial-gradient(ellipse 52% 32% at 30% 22%, rgba(255,255,255,0.76) 0%, transparent 100%)',
  `radial-gradient(ellipse 44% 44% at 68% 72%, ${hexToRgba(ACCENT, 0.16)} 0%, transparent 100%)`,
  `radial-gradient(ellipse 80% 80% at 48% 52%, ${hexToRgba(ACCENT, 0.07)} 0%, transparent 100%)`,
  'rgba(255,255,255,0.56)',
].join(', ')

const shadow = [
  `0 0 40px ${hexToRgba(ACCENT, 0.16)}`,
  '0 6px 24px rgba(0,0,0,0.08)',
  'inset 0 1.5px 0 rgba(255,255,255,0.92)',
].join(', ')

export function MojNodeComponent(_: NodeProps<MojNodeType>) {
  return (
    <>
      <Handle type="source" position={Position.Right}
        style={{ opacity: 0, width: 1, height: 1, top: MOJ_SIZE / 2, right: 'auto', left: MOJ_SIZE / 2, transform: 'translate(-50%, -50%)' }}
      />
      <Handle type="target" position={Position.Left}
        style={{ opacity: 0, width: 1, height: 1, top: MOJ_SIZE / 2, left: MOJ_SIZE / 2, transform: 'translate(-50%, -50%)' }}
      />

      <div
        className="orb-enter"
        style={{
          width: MOJ_SIZE,
          height: MOJ_SIZE,
          borderRadius: '50%',
          background: bg,
          border: '1px solid rgba(255,255,255,0.70)',
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
          color: 'rgba(0,0,0,0.70)',
          letterSpacing: '-0.01em',
          userSelect: 'none',
          position: 'relative',
          zIndex: 1,
          lineHeight: 1.2,
        }}>
          MRM
        </span>

        {/* Color rim */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '18%',
          right: '18%',
          height: 2,
          background: `linear-gradient(90deg, transparent, ${ACCENT}DD, transparent)`,
          borderRadius: '0 0 1px 1px',
        }} />
      </div>
    </>
  )
}
