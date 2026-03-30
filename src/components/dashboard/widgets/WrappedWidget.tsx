import { WrappedCard } from '../WrappedCard'
import type { WrappedInsight } from '../WrappedCard'

interface WrappedWidgetProps {
  insights: WrappedInsight[]
  loading: boolean
}

export function WrappedWidget({ insights, loading }: WrappedWidgetProps) {
  if (loading) return null
  return <WrappedCard insights={insights} />
}
