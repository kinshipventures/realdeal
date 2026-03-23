import type React from 'react'
import { hexToRgba, hexToRgbValues } from '../../lib/utils'
import type { HexColor } from '../../lib/types'

interface SolidOrbProps {
  size: number
  color: HexColor
  glowIntensity?: 'low' | 'high'
  animationDelay?: string
  onClick?: () => void
  className?: string
  children: React.ReactNode
}

export function SolidOrb({
  size,
  color,
  glowIntensity = 'low',
  animationDelay,
  onClick,
  className,
  children,
}: SolidOrbProps) {
  // Hub orb (dark colors like #1C1C1E) — pure solid, no gradient needed
  // Category/list orbs — single subtle radial for shape, not glass
  const isDark = color.toLowerCase() <= '#333333'
  const bg = isDark
    ? color
    : `radial-gradient(ellipse 55% 45% at 30% 25%, ${hexToRgba(color, 0.18)} 0%, transparent 100%), ${color}`

  const scale = size >= 96 ? '1.05' : '1.08'
  const lift = '-2px'

  // glowIntensity retained in interface for drop-in compatibility — not used in solid system
  void glowIntensity

  return (
    <div
      className={`orb-enter orb-interactive${className ? ` ${className}` : ''}`}
      onClick={onClick}
      style={{
        '--orb-scale': scale,
        '--orb-lift': lift,
        '--orb-color-rgb': hexToRgbValues(color),
        width: size,
        height: size,
        borderRadius: '50%',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        animationDelay,
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
