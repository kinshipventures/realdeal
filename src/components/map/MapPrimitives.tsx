import type React from 'react'
import { Handle, Position, type Position as FlowPosition } from '@xyflow/react'

interface FlowCenterHandleProps {
  type: 'source' | 'target'
  position: FlowPosition
  size: number
}

export function FlowCenterHandle({ type, position, size }: FlowCenterHandleProps) {
  return (
    <Handle
      type={type}
      position={position}
      style={{
        opacity: 0,
        width: 1,
        height: 1,
        top: size / 2,
        left: size / 2,
        right: 'auto',
        transform: 'translate(-50%, -50%)',
      }}
    />
  )
}

interface MapChromeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shape?: 'square' | 'circle'
  tone?: 'secondary' | 'tertiary'
  size?: number
}

export function MapChromeButton({
  shape = 'square',
  tone = 'secondary',
  size = 32,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}: MapChromeButtonProps) {
  const baseColor = tone === 'secondary'
    ? 'var(--color-text-secondary)'
    : 'var(--color-text-tertiary)'

  return (
    <button
      type="button"
      {...props}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--color-text-primary)'
        onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = baseColor
        onMouseLeave?.(e)
      }}
      style={{
        width: size,
        height: size,
        borderRadius: shape === 'circle' ? '50%' : 8,
        border: '1px solid var(--edge)',
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: baseColor,
        transition: 'background 0.15s, color 0.15s',
        ...style,
      }}
    />
  )
}
