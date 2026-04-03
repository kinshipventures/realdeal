import { getStraightPath, type EdgeProps, type Edge } from '@xyflow/react'

export type GradientEdgeData = { color: string; healthPercent?: number }
export type GradientEdgeType = Edge<GradientEdgeData>

export function GradientEdgeComponent({
  id, sourceX, sourceY, targetX, targetY, data,
}: EdgeProps<GradientEdgeType>) {
  const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY })
  const gradientId = `grad-${id}`
  const color = data?.color ?? 'rgba(255,255,255,0.9)'
  const health = data?.healthPercent ?? 0

  const strokeWidth = 1.5 + (health / 100) * 3.5
  const stopOpacity = 0.15 + (health / 100) * 0.55

  return (
    <g className="edge-enter">
      <defs>
        <linearGradient id={gradientId} x1={sourceX} y1={sourceY} x2={targetX} y2={targetY} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={color} stopOpacity={stopOpacity} />
          <stop offset="100%" stopColor={color} stopOpacity={stopOpacity * 0.25} />
        </linearGradient>
      </defs>
      <path d={path} stroke={`url(#${gradientId})`} strokeWidth={strokeWidth} fill="none" />
    </g>
  )
}
