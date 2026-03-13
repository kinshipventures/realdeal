import type React from 'react'
import { hexToRgba, hexToRgbValues } from '../../lib/utils'
import type { HexColor } from '../../lib/types'

interface GlassOrbProps {
  size: number
  color: HexColor
  glowIntensity?: 'low' | 'high'  // 'high' = priority boost; visual prop, not domain prop
  animationDelay?: string
  onClick?: () => void
  className?: string               // escape hatch for additional CSS classes (e.g. error animation)
  children: React.ReactNode
}

export function GlassOrb({
  size,
  color,
  glowIntensity = 'low',
  animationDelay,
  onClick,
  className,
  children,
}: GlassOrbProps) {
  const bg = [
    `radial-gradient(ellipse 52% 32% at 30% 22%, rgba(255,255,255,0.72) 0%, transparent 100%)`,
    `radial-gradient(ellipse 42% 42% at 70% 74%, ${hexToRgba(color, 0.14)} 0%, transparent 100%)`,
    `radial-gradient(ellipse 85% 85% at 48% 52%, ${hexToRgba(color, 0.07)} 0%, transparent 100%)`,
    `rgba(255,255,255,0.54)`,
  ].join(', ')

  // Scale proportional to orb size; larger orbs feel heavier and need more glow radius
  const scale = size >= 96 ? '1.06' : '1.1'
  const lift = size >= 96 ? '-2px' : '-1px'
  const glowSize = size >= 96 ? '32px' : '20px'
  const glowSizeHover = size >= 96 ? '48px' : '32px'
  const glowOpacity = glowIntensity === 'high' ? '0.18' : '0.10'
  const glowOpacityHover = glowIntensity === 'high' ? '0.26' : '0.16'

  const baseClass = `orb-enter orb-interactive`
  const finalClass = className ? `${baseClass} ${className}` : baseClass

  return (
    <div
      className={finalClass}
      onClick={onClick}
      style={{
        '--orb-scale': scale,
        '--orb-lift': lift,
        '--orb-color-rgb': hexToRgbValues(color),
        '--orb-glow-size': glowSize,
        '--orb-glow-size-hover': glowSizeHover,
        '--orb-glow-opacity': glowOpacity,
        '--orb-glow-opacity-hover': glowOpacityHover,
        width: size,
        height: size,
        borderRadius: '50%',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        background: bg,
        border: '1px solid rgba(255,255,255,0.65)',
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
