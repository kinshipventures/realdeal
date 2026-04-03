import { icons } from 'lucide-react'

type Props = {
  name: string
  size?: number
  color?: string
  strokeWidth?: number
  className?: string
}

export function LucideIcon({ name, size = 16, color, strokeWidth = 2, className }: Props) {
  const Icon = icons[name as keyof typeof icons]
  if (!Icon) return null
  return <Icon size={size} color={color} strokeWidth={strokeWidth} className={className} />
}
