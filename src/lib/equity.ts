import type { Interaction, InteractionType, Contact, Pod, Cadence, FocusItem, ContactFrequency } from './types'

// ── Weights & constants ─────────────────────────────────────────────────────

export const INTERACTION_WEIGHTS = {
  intro: 5,
  meeting: 4,
  call: 3,
  text: 2,
  email: 2,
  note: 0,
  pod_change: 0,
  field_update: 0,
  categorization: 0,
  pipeline_event: 0,
  project_event: 0,
  merge_event: 0,
} as const satisfies Record<InteractionType, number>

export const CADENCE_DAYS = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
} as const satisfies Record<Cadence, number>

const FREQUENCY_DAYS: Record<ContactFrequency, number> = {
  Weekly: 7,
  Monthly: 30,
  Quarterly: 90,
  Annual: 365,
  'As Needed': 999,
}

export function contactCadenceDays(contact: Contact, podCadence: Cadence | null): number {
  if (contact.cadence_override) return CADENCE_DAYS[contact.cadence_override]
  if (contact.contact_frequency) return FREQUENCY_DAYS[contact.contact_frequency]
  return CADENCE_DAYS[podCadence ?? 'monthly']
}

const SCORE_SCALE = 5
const DAY_MS = 24 * 60 * 60 * 1000

// ── Score thresholds ────────────────────────────────────────────────────────

export type ScoreLabel = 'Thriving' | 'Steady' | 'Cooling' | 'Fading'

export function scoreLabel(score: number): ScoreLabel {
  if (score >= 85) return 'Thriving'
  if (score >= 70) return 'Steady'
  if (score >= 40) return 'Cooling'
  return 'Fading'
}

// ── Recency multiplier ─────────────────────────────────────────────────────

function recencyMultiplier(daysAgo: number): number {
  if (daysAgo <= 30) return 1.0
  if (daysAgo <= 60) return 0.6
  if (daysAgo <= 90) return 0.3
  return 0
}

// ── Pre-index interactions by contact ───────────────────────────────────────

export function indexByContact(interactions: Interaction[]): Map<string, Interaction[]> {
  const map = new Map<string, Interaction[]>()
  for (const ix of interactions) {
    const arr = map.get(ix.contact_id)
    if (arr) arr.push(ix)
    else map.set(ix.contact_id, [ix])
  }
  return map
}

// ── Contact equity score ────────────────────────────────────────────────────
// Takes interactions already filtered to one contact. Returns normalized 0-100.

export function contactEquityScore(interactions: Interaction[]): number {
  const now = Date.now()
  let raw = 0
  for (const ix of interactions) {
    const weight = INTERACTION_WEIGHTS[ix.type]
    if (weight === 0) continue
    const daysAgo = (now - new Date(ix.date).getTime()) / DAY_MS
    raw += weight * recencyMultiplier(daysAgo)
  }
  return Math.min(100, Math.round(raw * SCORE_SCALE))
}

// ── Contact equity breakdown ────────────────────────────────────────────────
// Per-type weighted contribution, sorted highest first. Notes excluded (weight 0).

export interface EquityBreakdown {
  type: InteractionType
  score: number    // weighted, recency-adjusted contribution
  weight: number   // raw weight from INTERACTION_WEIGHTS
}

export function contactEquityBreakdown(interactions: Interaction[]): EquityBreakdown[] {
  const now = Date.now()
  const byType = new Map<InteractionType, number>()

  for (const ix of interactions) {
    const weight = INTERACTION_WEIGHTS[ix.type]
    if (weight === 0) continue
    const daysAgo = (now - new Date(ix.date).getTime()) / DAY_MS
    const contribution = weight * recencyMultiplier(daysAgo)
    byType.set(ix.type, (byType.get(ix.type) ?? 0) + contribution)
  }

  return Array.from(byType.entries())
    .filter(([, score]) => score > 0)
    .map(([type, score]) => ({ type, score, weight: INTERACTION_WEIGHTS[type] }))
    .sort((a, b) => b.score - a.score)
}

// ── Pod equity score ────────────────────────────────────────────────────────
// Average contact score across all contacts in the pod.

export function podEquityScore(
  contacts: Contact[],
  byContact: Map<string, Interaction[]>
): number {
  if (contacts.length === 0) return 0
  let sum = 0
  for (const c of contacts) {
    sum += contactEquityScore(byContact.get(c.id) ?? [])
  }
  return Math.round(sum / contacts.length)
}

// ── Overall equity score ────────────────────────────────────────────────────
// Average across priority pods only.

export function overallEquityScore(
  priorityPods: Pod[],
  contacts: Contact[],
  byContact: Map<string, Interaction[]>
): number {
  if (priorityPods.length === 0) return 0
  let sum = 0
  for (const pod of priorityPods) {
    const podContacts = contacts.filter(c => c.list_ids.includes(pod.id))
    sum += podEquityScore(podContacts, byContact)
  }
  const result = Math.round(sum / priorityPods.length)
  return Number.isFinite(result) ? result : 0
}

// ── Dormancy ────────────────────────────────────────────────────────────────

const DORMANT_MS = 90 * DAY_MS

export function isDormant(contact: Contact): boolean {
  if (!contact.last_contacted_at) return true
  return Date.now() - new Date(contact.last_contacted_at).getTime() > DORMANT_MS
}

export function daysSinceContact(contact: Contact): number | null {
  if (!contact.last_contacted_at) return null
  return Math.floor((Date.now() - new Date(contact.last_contacted_at).getTime()) / DAY_MS)
}

// ── Today's Focus ───────────────────────────────────────────────────────────
// Ranked selection: most overdue in priority pods first, then serendipity.

export function todaysFocus(
  contacts: Contact[],
  _byContact: Map<string, Interaction[]>,
  pods: Pod[],
  limit = 3
): FocusItem[] {
  const priorityPodIds = new Set(pods.filter(p => p.is_priority).map(p => p.id))
  const podById = new Map(pods.map(p => [p.id, p]))

  // Score each contact by overdue urgency in priority pods
  const candidates: FocusItem[] = []

  for (const contact of contacts) {
    const inPriorityPod = contact.list_ids.some(id => priorityPodIds.has(id))
    if (!inPriorityPod) continue

    const pod = contact.list_ids.map(id => podById.get(id)).find(p => p?.is_priority) ?? null
    const thresholdDays = contactCadenceDays(contact, pod?.cadence ?? null)
    const thresholdMs = thresholdDays * DAY_MS

    if (!contact.last_contacted_at) {
      // Never contacted — high urgency
      candidates.push({ contact, pod, reason: 'overdue', score: 999 })
      continue
    }

    const elapsed = Date.now() - new Date(contact.last_contacted_at).getTime()
    if (elapsed > thresholdMs) {
      candidates.push({
        contact,
        pod,
        reason: 'overdue',
        score: Math.floor(elapsed / DAY_MS),
      })
    }
  }

  // Sort by score descending (most overdue first)
  candidates.sort((a, b) => b.score - a.score)

  // If we have enough overdue contacts, return those
  if (candidates.length >= limit) return candidates.slice(0, limit)

  // Fill remaining slots with serendipity picks from priority pods
  const picked = new Set(candidates.map(c => c.contact.id))
  const serendipityCandidates = contacts.filter(c =>
    !picked.has(c.id) &&
    c.list_ids.some(id => priorityPodIds.has(id)) &&
    c.last_contacted_at != null
  )

  // Shuffle deterministically by day (same picks within a day)
  const dayKey = Math.floor(Date.now() / DAY_MS)
  const shuffled = serendipityCandidates.sort((a, b) => {
    const ha = hashCode(a.id + dayKey)
    const hb = hashCode(b.id + dayKey)
    return ha - hb
  })

  for (const contact of shuffled) {
    if (candidates.length >= limit) break
    const pod = contact.list_ids.map(id => podById.get(id)).find(p => p?.is_priority) ?? null
    candidates.push({ contact, pod, reason: 'serendipity', score: 0 })
  }

  return candidates.slice(0, limit)
}

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return h
}
