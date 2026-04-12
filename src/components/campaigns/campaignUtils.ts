import type { CampaignType } from '../../lib/types'

// Type labels
export const TYPE_LABELS: Record<CampaignType, string> = {
  event: 'Event',
  investment: 'Investment',
  outreach: 'Outreach',
  deal_flow: 'Deal Flow',
  fundraise: 'Fundraise',
  talent: 'Talent',
  partnerships: 'Partnerships',
  other: 'Other',
}

// Type colors
export const TYPE_COLORS: Record<CampaignType, string> = {
  event: '#4299E1',
  investment: '#48BB78',
  outreach: '#7E57C2',
  deal_flow: '#ED8936',
  fundraise: '#38B2AC',
  talent: '#D53F8C',
  partnerships: '#667EEA',
  other: '#718096',
}

// Lucide icon names per type
export const TYPE_ICONS: Record<CampaignType, string> = {
  event: 'calendar-days',
  investment: 'trending-up',
  outreach: 'send',
  deal_flow: 'git-branch',
  fundraise: 'piggy-bank',
  talent: 'users',
  partnerships: 'handshake',
  other: 'folder',
}

export const STALE_DAYS = 7
export const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000

export function daysUntil(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function daysSince(dateStr: string): number {
  const d = new Date(dateStr)
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatRelativeTime(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
