export const WIDGET_STYLE: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--edge)',
  borderRadius: 12,
  padding: '16px 20px',
  marginBottom: 12,
}

export function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const h = ((hash % 360) + 360) % 360
  return `hsl(${h}, 45%, 55%)`
}

export function avatarBg(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const h = ((hash % 360) + 360) % 360
  return `hsl(${h}, 45%, 92%)`
}

