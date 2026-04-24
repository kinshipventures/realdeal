import type React from 'react'
import { useRef } from 'react'
import { hexToRgba, hexToRgbValues } from '../../lib/utils'
import type { HexColor } from '../../lib/types'

export const POD_SHIFT_COLORS: Record<string, string> = {
  '#E53935': '#FF8A80',
  '#FF6B8A': '#FF80AB',
  '#7E57C2': '#B39DDB',
  '#25B439': '#81C784',
  '#25B439': '#81C784',
  '#F5A623': '#FFD54F',
  '#1C1C1E': '#2C2C30',
}

interface SolidOrbProps {
  size: number
  color: HexColor
  shiftColor?: HexColor
  healthPercent?: number
  idleBreath?: number
  glowIntensity?: 'low' | 'high'
  animationDelay?: string
  onClick?: () => void
  ariaLabel?: string
  className?: string
  children: React.ReactNode
}

export function SolidOrb({
  size,
  color,
  shiftColor,
  healthPercent,
  idleBreath,
  glowIntensity,
  animationDelay,
  onClick,
  ariaLabel,
  className,
  children,
}: SolidOrbProps) {
  // healthPercent / glowIntensity / shiftColor retained for drop-in API compat.
  // Landing-style finish uses a single color with a shaded halo behind, no ring.
  void glowIntensity
  void healthPercent
  void shiftColor

  const orbRef = useRef<HTMLDivElement>(null)
  const edge = hexToRgba(color, 0.55)
  const restShadow = `0 6px 18px -4px rgba(0,0,0,0.18), inset 0 0 0 1px ${edge}`
  const hoverShadow = `0 10px 28px -4px rgba(0,0,0,0.22), inset 0 0 0 1px ${edge}`

  // Glass sphere — mirrors landing NetworkMap stops (38% 32%, same opacities).
  const bg = `radial-gradient(circle at 38% 32%, rgba(255,255,255,0.55) 0%, ${hexToRgba(color, 0.62)} 22%, ${hexToRgba(color, 0.82)} 70%, ${hexToRgba(color, 0.72)} 100%)`

  const scale = size >= 96 ? '1.05' : '1.08'
  const lift = '-3px'

  // Shaded halo behind the orb — a solid low-opacity disc with a heavy blur,
  // matching landing's `<circle fill={color} opacity="0.5" filter=stdDev22 />`.
  const haloSize = Math.round(size * 1.8)
  const haloBlur = Math.round(size * 0.5)

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        isolation: 'isolate',
      }}
    >
      {/* Far diffuse halo — color bleeds into the surrounding space */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: haloSize,
          height: haloSize,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: hexToRgba(color, 0.5),
          filter: `blur(${haloBlur}px)`,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />

      <div
        ref={orbRef}
        role={onClick ? 'button' : undefined}
        aria-label={ariaLabel}
        className={`orb-enter orb-interactive${idleBreath ? ' orb-breathing' : ''}${className ? ` ${className}` : ''}`}
        onClick={onClick}
        onMouseEnter={() => {
          if (orbRef.current) orbRef.current.style.boxShadow = hoverShadow
        }}
        onMouseLeave={() => {
          if (orbRef.current) orbRef.current.style.boxShadow = restShadow
        }}
        style={{
          '--orb-scale': scale,
          '--orb-lift': lift,
          '--orb-color-rgb': hexToRgbValues(color),
          '--orb-enter-delay': animationDelay ?? '0s',
          '--orb-breath-scale': idleBreath ? `${1 + idleBreath}` : undefined,
          '--orb-breath-lift': idleBreath ? `${Math.max(1, Math.round(idleBreath * 120))}px` : undefined,
          width: size,
          height: size,
          borderRadius: '50%',
          position: 'relative',
          cursor: onClick ? 'pointer' : 'default',
          background: bg,
          boxShadow: restShadow,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          animationDelay: idleBreath ? undefined : animationDelay,
        } as React.CSSProperties}
      >
        {children}
      </div>
    </div>
  )
}
