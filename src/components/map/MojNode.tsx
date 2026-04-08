import type React from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { useNavigate } from 'react-router'
import { scoreLabel } from '../../lib/equity'
import { POD_SHIFT_COLORS } from './SolidOrb'

export type MojNodeData = {
  overallHealth?: number
  totalContacts?: number
  userName?: string
  podName?: string
  podColor?: string
  podId?: string
}
export type MojNodeType = Node<MojNodeData, 'moj'>

export const MOJ_ID = 'moj-center'
export const MOJ_SIZE = 136

const DEFAULT_BG = 'linear-gradient(135deg, #1C1C1E 0%, #2C2C30 100%)'
const shadow = '0 0 24px rgba(0,0,0,0.20), 0 10px 30px -4px rgba(0,0,0,0.25)'

const LABEL_COLORS: Record<string, string> = {
  Thriving: 'rgba(74,222,128,0.85)',
  Steady:   'rgba(96,165,250,0.85)',
  Cooling:  'rgba(251,191,36,0.85)',
  Fading:   'rgba(248,113,113,0.85)',
}

export function MojNodeComponent({ data }: NodeProps<MojNodeType>) {
  const { overallHealth, totalContacts, userName, podName, podColor, podId } = data
  const navigate = useNavigate()
  const hasData = overallHealth !== undefined
  const isDrillDown = !!podName

  const bg = isDrillDown && podColor
    ? `linear-gradient(135deg, ${podColor} 0%, ${POD_SHIFT_COLORS[podColor] ?? POD_SHIFT_COLORS[podColor.toUpperCase()] ?? '#2C2C30'} 100%)`
    : DEFAULT_BG

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
          boxShadow: shadow,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          cursor: isDrillDown ? 'pointer' : 'default',
        } as React.CSSProperties}
        onClick={isDrillDown && podId ? () => navigate(`/pod/${podId}`) : undefined}
      >
        {isDrillDown ? (
          <span style={{
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'var(--font-serif)',
            color: 'rgba(255,255,255,0.95)',
            letterSpacing: '-0.01em',
            userSelect: 'none',
            lineHeight: 1.2,
            textAlign: 'center',
            padding: '0 12px',
          }}>
            {podName}
          </span>
        ) : (
          <>
            {hasData ? (
              <>
                <span style={{
                  fontSize: 8,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.45)',
                  userSelect: 'none',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase' as const,
                  marginBottom: 2,
                }}>
                  Network Health
                </span>
                <span style={{
                  fontSize: 28,
                  fontWeight: 800,
                  fontFamily: 'var(--font-serif)',
                  color: 'rgba(255,255,255,0.95)',
                  letterSpacing: '-0.02em',
                  userSelect: 'none',
                  lineHeight: 1,
                }}>
                  {overallHealth}
                </span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: LABEL_COLORS[scoreLabel(overallHealth!)] ?? 'rgba(255,255,255,0.60)',
                  userSelect: 'none',
                  marginTop: 4,
                }}>
                  {scoreLabel(overallHealth!)}
                </span>
                <span style={{
                  fontSize: 9,
                  fontWeight: 400,
                  color: 'rgba(255,255,255,0.38)',
                  userSelect: 'none',
                  marginTop: 4,
                }}>
                  {totalContacts ?? 0} people
                </span>
              </>
            ) : (
              <span style={{
                fontSize: 14,
                fontWeight: 700,
                fontFamily: 'var(--font-serif)',
                color: 'rgba(255,255,255,0.92)',
                letterSpacing: '-0.01em',
                userSelect: 'none',
                lineHeight: 1.2,
                textAlign: 'center',
                padding: '0 12px',
              }}>
                {userName || 'RealDeal'}
              </span>
            )}
          </>
        )}
      </div>
    </>
  )
}
