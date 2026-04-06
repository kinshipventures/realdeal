import type { Pod, Contact, Interaction, InteractionType, Pipeline, PipelineStage, Opportunity } from './types'
import { contactEquityScore, scoreLabel, indexByContact, type ScoreLabel } from './equity'

// ── Pod Distribution ────────────────────────────────────────────────────────

export interface PodDistribution {
  podId: string
  podName: string
  color: string | null
  contactCount: number
  health: Record<ScoreLabel, number>
}

export function computePodDistribution(
  pods: Pod[],
  contacts: Contact[],
  interactions: Interaction[],
): PodDistribution[] {
  const byContact = indexByContact(interactions)
  return pods
    .map(pod => {
      const podContacts = contacts.filter(c => c.list_ids.includes(pod.id))
      const health: Record<ScoreLabel, number> = { Thriving: 0, Steady: 0, Cooling: 0, Fading: 0 }
      for (const c of podContacts) {
        const score = contactEquityScore(byContact.get(c.id) ?? [])
        health[scoreLabel(score)]++
      }
      return {
        podId: pod.id,
        podName: pod.name,
        color: pod.color,
        contactCount: podContacts.length,
        health,
      }
    })
    .sort((a, b) => b.contactCount - a.contactCount)
}

// ── Pipeline Velocity ───────────────────────────────────────────────────────

export interface StageVelocity {
  stageId: string
  stageName: string
  color: string | null
  order: number
  count: number
  avgDaysInStage: number | null
}

export interface PipelineVelocityReport {
  pipelineId: string
  pipelineName: string
  stages: StageVelocity[]
  totalOpportunities: number
}

export function computePipelineVelocity(
  pipelines: Pipeline[],
  stages: PipelineStage[],
  opportunities: Opportunity[],
): PipelineVelocityReport[] {
  return pipelines.map(pipeline => {
    const pStages = stages.filter(s => s.pipeline_id === pipeline.id).sort((a, b) => a.order - b.order)
    const pOpps = opportunities.filter(o => pStages.some(s => s.id === o.stage_id))

    const stageData: StageVelocity[] = pStages.map(stage => {
      const stageOpps = pOpps.filter(o => o.stage_id === stage.id)
      // Approximate time-in-stage from created_at (rough since we don't track stage transitions)
      let avgDays: number | null = null
      if (stageOpps.length > 0) {
        const now = Date.now()
        const totalDays = stageOpps.reduce((sum, o) => {
          return sum + (now - new Date(o.created_at).getTime()) / (1000 * 60 * 60 * 24)
        }, 0)
        avgDays = Math.round(totalDays / stageOpps.length)
      }
      return {
        stageId: stage.id,
        stageName: stage.name,
        color: stage.color,
        order: stage.order,
        count: stageOpps.length,
        avgDaysInStage: avgDays,
      }
    })

    return {
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      stages: stageData,
      totalOpportunities: pOpps.length,
    }
  })
}

// ── Engagement Activity ─────────────────────────────────────────────────────

export interface DayActivity {
  date: string // YYYY-MM-DD
  counts: Partial<Record<InteractionType, number>>
  total: number
}

const MEANINGFUL_TYPES: InteractionType[] = ['intro', 'meeting', 'call', 'text', 'email', 'note']

export function computeEngagementActivity(
  interactions: Interaction[],
  days: number = 30,
): DayActivity[] {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  cutoff.setHours(0, 0, 0, 0)

  // Build a map of date -> type -> count
  const byDay = new Map<string, Partial<Record<InteractionType, number>>>()

  for (const ix of interactions) {
    if (!MEANINGFUL_TYPES.includes(ix.type)) continue
    const d = ix.date.slice(0, 10)
    if (d < cutoff.toISOString().slice(0, 10)) continue
    const day = byDay.get(d) ?? {}
    day[ix.type] = (day[ix.type] ?? 0) + 1
    byDay.set(d, day)
  }

  // Fill in missing days
  const result: DayActivity[] = []
  const cursor = new Date(cutoff)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10)
    const counts = byDay.get(key) ?? {}
    const total = Object.values(counts).reduce((s, n) => s + (n ?? 0), 0)
    result.push({ date: key, counts, total })
    cursor.setDate(cursor.getDate() + 1)
  }
  return result
}

// ── Engagement summary stats ────────────────────────────────────────────────

export interface EngagementSummary {
  totalInteractions: number
  byType: Partial<Record<InteractionType, number>>
  activeDays: number
  avgPerDay: number
}

export function computeEngagementSummary(activity: DayActivity[]): EngagementSummary {
  const byType: Partial<Record<InteractionType, number>> = {}
  let total = 0
  let activeDays = 0
  for (const day of activity) {
    total += day.total
    if (day.total > 0) activeDays++
    for (const [type, count] of Object.entries(day.counts)) {
      byType[type as InteractionType] = (byType[type as InteractionType] ?? 0) + (count ?? 0)
    }
  }
  return {
    totalInteractions: total,
    byType,
    activeDays,
    avgPerDay: activity.length > 0 ? Math.round((total / activity.length) * 10) / 10 : 0,
  }
}

// ── CSV Export ───────────────────────────────────────────────────────────────

export function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v
  const csv = [headers.join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function podDistributionToCSV(data: PodDistribution[]) {
  downloadCSV(
    'pod-distribution.csv',
    ['Pod', 'People', 'Thriving', 'Steady', 'Cooling', 'Fading'],
    data.map(d => [d.podName, String(d.contactCount), String(d.health.Thriving), String(d.health.Steady), String(d.health.Cooling), String(d.health.Fading)]),
  )
}

export function pipelineVelocityToCSV(data: PipelineVelocityReport[]) {
  const rows: string[][] = []
  for (const p of data) {
    for (const s of p.stages) {
      rows.push([p.pipelineName, s.stageName, String(s.count), s.avgDaysInStage != null ? String(s.avgDaysInStage) : '-'])
    }
  }
  downloadCSV('pipeline-velocity.csv', ['Pipeline', 'Stage', 'Opportunities', 'Avg Days in Stage'], rows)
}

export function engagementToCSV(data: DayActivity[]) {
  downloadCSV(
    'engagement-activity.csv',
    ['Date', 'Total', 'Calls', 'Emails', 'Texts', 'Meetings', 'Intros', 'Notes'],
    data.map(d => [
      d.date,
      String(d.total),
      String(d.counts.call ?? 0),
      String(d.counts.email ?? 0),
      String(d.counts.text ?? 0),
      String(d.counts.meeting ?? 0),
      String(d.counts.intro ?? 0),
      String(d.counts.note ?? 0),
    ]),
  )
}

// ── Saved report configs ────────────────────────────────────────────────────

export type ReportType = 'pod-distribution' | 'pipeline-velocity' | 'engagement'

export interface SavedReportConfig {
  id: string
  name: string
  type: ReportType
  days?: number
  pipelineId?: string
  createdAt: string
}

const STORAGE_KEY = 'realdeal:saved-reports'

export function getSavedReports(): SavedReportConfig[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch { return [] }
}

export function saveReport(config: Omit<SavedReportConfig, 'id' | 'createdAt'>): SavedReportConfig {
  const saved = getSavedReports()
  const entry: SavedReportConfig = {
    ...config,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  saved.push(entry)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  return entry
}

export function deleteSavedReport(id: string) {
  const saved = getSavedReports().filter(r => r.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
}
