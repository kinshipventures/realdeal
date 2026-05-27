import type React from 'react'
import { useRef } from 'react'
import { hexToRgba, hexToRgbValues } from '../../lib/utils'
import type { HexColor } from '../../lib/types'

export const POD_SHIFT_COLORS: Record<string, string> = {
  '#E53935': '#FF8A80',
  '#FF6B8A': '#FF80AB',
  '#7E57C2': '#B39DDB',
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
  // glowIntensity retained for drop-in compatibility
  void glowIntensity

  const orbRef = useRef<HTMLDivElement>(null)
  const glowSize = size >= 96 ? 28 : 20
  const restShadow = `0 0 ${glowSize}px ${hexToRgba(color, 0.25)}, 0 8px 20px -4px rgba(0,0,0,0.18)`
  const hoverShadow = `0 0 ${glowSize}px ${hexToRgba(color, 0.40)}, 0 12px 28px -4px rgba(0,0,0,0.22)`

  const bg = shiftColor
    ? `linear-gradient(135deg, ${color} 0%, ${shiftColor} 100%)`
    : `linear-gradient(135deg, ${color} 0%, ${color} 100%)`

  const scale = size >= 96 ? '1.05' : '1.08'
  const lift = '-3px'

  // Health ring geometry
  const containerSize = size + 8
  const ringRadius = (containerSize - 4) / 2
  const cx = containerSize / 2
  const cy = containerSize / 2
  const circumference = 2 * Math.PI * ringRadius

  return (
    <div
      style={{
        position: 'relative',
        width: healthPercent !== undefined ? containerSize : size,
        height: healthPercent !== undefined ? containerSize : size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {healthPercent !== undefined && (
        <svg
          width={containerSize}
          height={containerSize}
          viewBox={`0 0 ${containerSize} ${containerSize}`}
          className="health-ring-enter"
          style={{
            position: 'absolute', top: 0, left: 0, pointerEvents: 'none',
            animationDelay: animationDelay
              ? `${parseFloat(animationDelay) + 0.7}s`
              : '0.7s',
          }}
        >
          {/* Track circle */}
          <circle
            cx={cx}
            cy={cy}
            r={ringRadius}
            fill="none"
            stroke="var(--stroke-subtle)"
            strokeWidth={2}
          />
          {/* Fill arc */}
          <circle
            cx={cx}
            cy={cy}
            r={ringRadius}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={`${(healthPercent / 100) * circumference} ${circumference}`}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </svg>
      )}

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
