import type { SharedContactBadgeMeta } from '@/hooks/useSharedContactBadges'

type Props = {
  meta: SharedContactBadgeMeta
  showPermission?: boolean
  compact?: boolean
}

export function SharedContactBadge({ meta, showPermission = true, compact = false }: Props) {
  const isInbound = meta.direction === 'shared_with_me'
  const label = isInbound ? 'Shared with me' : 'Shared by me'
  const text = showPermission ? `${label} - ${meta.permissionLabel}` : label

  return (
    <span
      title={meta.sourceLabel}
      aria-label={text}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 'fit-content',
        maxWidth: compact ? 140 : 'clamp(120px, 16vw, 260px)',
        padding: compact ? '2px 6px' : '2px 7px',
        borderRadius: 999,
        background: isInbound
          ? 'color-mix(in srgb, var(--color-brand) 12%, transparent)'
          : 'var(--tint)',
        color: isInbound ? 'var(--color-brand)' : 'var(--color-text-secondary)',
        fontSize: compact ? 9 : 10,
        fontWeight: 700,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        flexShrink: 0,
      }}
    >
      {text}
    </span>
  )
}
