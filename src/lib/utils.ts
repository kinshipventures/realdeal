import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function expandHex(hex: string): string {
  if (hex.length === 4) return '#' + hex[1]+hex[1] + hex[2]+hex[2] + hex[3]+hex[3]
  return hex
}

export function hexToRgba(hex: string, alpha: number): string {
  hex = expandHex(hex)
  const n = parseInt(hex.replace('#', ''), 16)
  if (isNaN(n)) return `rgba(113, 128, 150, ${alpha})`
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

// Returns raw "r, g, b" channels for use in rgba(var(--orb-color-rgb), alpha).
// Must be raw channels, never rgb(...) — see CLAUDE.md CSS custom property note.
export function lightenHex(hex: string, amount: number): string {
  hex = expandHex(hex)
  const n = parseInt(hex.replace('#', ''), 16)
  if (isNaN(n)) return '#b0b0b0'
  const r = Math.min(255, ((n >> 16) & 255) + Math.round(255 * amount))
  const g = Math.min(255, ((n >> 8) & 255) + Math.round(255 * amount))
  const b = Math.min(255, (n & 255) + Math.round(255 * amount))
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

export function darkenHex(hex: string, amount: number): string {
  hex = expandHex(hex)
  const n = parseInt(hex.replace('#', ''), 16)
  if (isNaN(n)) return '#404040'
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - amount)))
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - amount)))
  const b = Math.max(0, Math.round((n & 255) * (1 - amount)))
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

export function hexToRgbValues(hex: string): string {
  hex = expandHex(hex)
  const n = parseInt(hex.replace('#', ''), 16)
  if (isNaN(n)) return '113, 128, 150'  // fallback: default gray
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export function avatarHue(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return Math.abs(hash) % 360
}

export function initials(name: string): string {
  return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export function daysOverdue(contact: { last_contacted_at: string | null }): number | null {
  if (!contact.last_contacted_at) return null
  return Math.floor((Date.now() - new Date(contact.last_contacted_at).getTime()) / 86_400_000)
}
