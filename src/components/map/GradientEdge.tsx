import { getSmoothStepPath, type EdgeProps, type Edge } from '@xyflow/react'

export type GradientEdgeData = { color: string }
export type GradientEdgeType = Edge<GradientEdgeData>

export function GradientEdgeComponent({
  id, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, data,
}: EdgeProps<GradientEdgeType>) {
  const [path] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 40 })
  const gradientId = `grad-${id}`
  const color = data?.color ?? 'rgba(0,0,0,0.15)'

  return (
    <g className="edge-enter">
      <defs>
        <linearGradient id={gradientId} x1={sourceX} y1={sourceY} x2={targetX} y2={targetY} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={color} stopOpacity={0.5} />
          <stop offset="100%" stopColor={color} stopOpacity={0.12} />
        </linearGradient>
      </defs>
      <path d={path} stroke={`url(#${gradientId})`} strokeWidth={1.5} fill="none" />
    </g>
  )
}
