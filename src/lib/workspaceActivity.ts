import { supabase } from '@/integrations/supabase/client'
import { getActiveWorkspaceId } from './workspace'
import { isDemoMode } from './sampleData'

export type WorkspaceActivityEntityType =
  | 'workspace'
  | 'workspace_invite'
  | 'workspace_member'
  | 'contact'
  | 'company'
  | 'pod'
  | 'sub_pod'
  | 'campaign'
  | 'campaign_contact'
  | 'campaign_stage'
  | 'interaction'

export type WorkspaceActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'invited'
  | 'accepted_invite'
  | 'revoked_invite'
  | 'removed'
  | 'renamed'
  | 'completed'
  | 'contacted'
  | 'moved'

export interface WorkspaceActivityEvent {
  id: string
  workspace_id: string
  actor_user_id: string | null
  actor_label: string
  actor_email: string | null
  action: WorkspaceActivityAction | string
  entity_type: WorkspaceActivityEntityType | string
  entity_id: string | null
  entity_label: string | null
  related_type: string | null
  related_id: string | null
  related_label: string | null
  changes: Record<string, unknown>
  metadata: Record<string, unknown>
  created_at: string
}

export interface WorkspaceActivityInput {
  workspaceId?: string | null
  action: WorkspaceActivityAction
  entityType: WorkspaceActivityEntityType
  entityId?: string | null
  entityLabel?: string | null
  relatedType?: string | null
  relatedId?: string | null
  relatedLabel?: string | null
  changes?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface WorkspaceActivityFilters {
  actorUserId?: string
  entityType?: WorkspaceActivityEntityType | 'all'
  action?: WorkspaceActivityAction | 'all'
  search?: string
  dateFrom?: string
  dateTo?: string
}

export const WORKSPACE_ACTIVITY_ENTITY_OPTIONS: Array<{ value: WorkspaceActivityEntityType | 'all'; label: string }> = [
  { value: 'all', label: 'All records' },
  { value: 'contact', label: 'Contacts' },
  { value: 'company', label: 'Companies' },
  { value: 'pod', label: 'Pods' },
  { value: 'sub_pod', label: 'Sub-pods' },
  { value: 'campaign', label: 'Campaigns' },
  { value: 'campaign_contact', label: 'Campaign contacts' },
  { value: 'campaign_stage', label: 'Campaign stages' },
  { value: 'interaction', label: 'Touchpoints' },
  { value: 'workspace_member', label: 'Team members' },
  { value: 'workspace_invite', label: 'Team invites' },
  { value: 'workspace', label: 'Workspace' },
]

export const WORKSPACE_ACTIVITY_ACTION_OPTIONS: Array<{ value: WorkspaceActivityAction | 'all'; label: string }> = [
  { value: 'all', label: 'All actions' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'invited', label: 'Invited' },
  { value: 'accepted_invite', label: 'Accepted invite' },
  { value: 'revoked_invite', label: 'Revoked invite' },
  { value: 'removed', label: 'Removed' },
  { value: 'renamed', label: 'Renamed' },
  { value: 'completed', label: 'Completed' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'moved', label: 'Moved' },
]

const ENTITY_LABELS: Record<string, string> = {
  workspace: 'workspace',
  workspace_invite: 'team invite',
  workspace_member: 'team member',
  contact: 'contact',
  company: 'company',
  pod: 'pod',
  sub_pod: 'sub-pod',
  campaign: 'campaign',
  campaign_contact: 'campaign contact',
  campaign_stage: 'campaign stage',
  interaction: 'touchpoint',
}

const FIELD_LABEL_OVERRIDES: Record<string, string> = {
  list_ids: 'Pods',
  category_ids: 'Sub-pods',
  primary_list_id: 'Primary pod',
  company_ids: 'Companies',
  company_record_id: 'Primary company',
  stage_id: 'Campaign stage',
  next_step: 'Next step',
  next_step_due: 'Next step due',
  moved_at: 'Moved at',
  custom_fields: 'Custom fields',
  last_contacted_at: 'Last contacted',
}

function normalizeActivityRow(row: any): WorkspaceActivityEvent {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    actor_user_id: row.actor_user_id ?? null,
    actor_label: row.actor_label ?? 'System',
    actor_email: row.actor_email ?? null,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id ?? null,
    entity_label: row.entity_label ?? null,
    related_type: row.related_type ?? null,
    related_id: row.related_id ?? null,
    related_label: row.related_label ?? null,
    changes: row.changes ?? {},
    metadata: row.metadata ?? {},
    created_at: row.created_at,
  }
}

function titleize(value: string): string {
  const override = FIELD_LABEL_OVERRIDES[value]
  if (override) return override
  return value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase())
}

function compactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.slice(0, 12)
  if (value && typeof value === 'object') return '[updated]'
  if (typeof value === 'string' && value.length > 160) return `${value.slice(0, 157)}...`
  return value ?? null
}

function activityDateStart(value: string): string {
  return value.includes('T') ? value : `${value}T00:00:00`
}

function activityDateEnd(value: string): string {
  return value.includes('T') ? value : `${value}T23:59:59.999`
}

export function buildActivityChanges(patch: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(patch)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, { to: compactValue(value) }])
  )
}

async function resolveActor() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { id: null, email: null, label: 'System' }

  const email = user.email ?? null
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email')
    .eq('id', user.id)
    .maybeSingle()

  const label = profile?.display_name || profile?.email || email || 'Team member'
  return { id: user.id, email: profile?.email ?? email, label }
}

export async function recordWorkspaceActivityEvent(input: WorkspaceActivityInput): Promise<void> {
  if (isDemoMode()) return
  const workspaceId = input.workspaceId ?? getActiveWorkspaceId()
  if (!workspaceId) return

  const actor = await resolveActor()
  const { error } = await supabase.from('workspace_activity_events' as any).insert({
    workspace_id: workspaceId,
    actor_user_id: actor.id,
    actor_label: actor.label,
    actor_email: actor.email,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    entity_label: input.entityLabel ?? null,
    related_type: input.relatedType ?? null,
    related_id: input.relatedId ?? null,
    related_label: input.relatedLabel ?? null,
    changes: input.changes ?? {},
    metadata: input.metadata ?? {},
  })

  if (error) throw error
}

export function queueWorkspaceActivityEvent(input: WorkspaceActivityInput): void {
  void recordWorkspaceActivityEvent(input).catch(error => {
    console.warn('Failed to record workspace activity:', error)
  })
}

export async function fetchWorkspaceActivityEvents(
  workspaceId: string,
  filters: WorkspaceActivityFilters = {},
  limit = 250,
): Promise<WorkspaceActivityEvent[]> {
  if (isDemoMode()) return []

  let query = supabase
    .from('workspace_activity_events' as any)
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (filters.actorUserId) query = query.eq('actor_user_id', filters.actorUserId)
  if (filters.entityType && filters.entityType !== 'all') query = query.eq('entity_type', filters.entityType)
  if (filters.action && filters.action !== 'all') query = query.eq('action', filters.action)
  if (filters.dateFrom) query = query.gte('created_at', activityDateStart(filters.dateFrom))
  if (filters.dateTo) query = query.lte('created_at', activityDateEnd(filters.dateTo))

  const { data, error } = await query
  if (error) throw error

  const rows = ((data ?? []) as any[]).map(normalizeActivityRow)
  const search = filters.search?.trim().toLowerCase()
  if (!search) return rows

  return rows.filter(event => {
    const haystack = [
      event.actor_label,
      event.actor_email,
      event.action,
      event.entity_type,
      event.entity_label,
      event.related_label,
      JSON.stringify(event.changes),
      JSON.stringify(event.metadata),
    ].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(search)
  })
}

export function describeWorkspaceActivity(event: WorkspaceActivityEvent): string {
  const actor = event.actor_label || event.actor_email || 'Someone'
  const entityType = ENTITY_LABELS[event.entity_type] ?? event.entity_type.replace(/_/g, ' ')
  const entity = event.entity_label || entityType
  const related = event.related_label ? ` in ${event.related_label}` : ''

  switch (event.action) {
    case 'created':
      return `${actor} created ${entity}${related}.`
    case 'updated':
      return `${actor} updated ${entity}${related}.`
    case 'deleted':
      return `${actor} deleted ${entity}${related}.`
    case 'invited':
      return `${actor} invited ${entity}.`
    case 'accepted_invite':
      return `${actor} joined ${entity}.`
    case 'revoked_invite':
      return `${actor} revoked the invite for ${entity}.`
    case 'removed':
      return `${actor} removed ${entity}.`
    case 'renamed':
      return `${actor} renamed ${entity}.`
    case 'completed':
      return `${actor} completed ${entity}.`
    case 'contacted':
      return `${actor} contacted ${entity}.`
    case 'moved':
      return `${actor} moved ${entity}${related}.`
    default:
      return `${actor} changed ${entity}${related}.`
  }
}

export function summarizeActivityChanges(event: WorkspaceActivityEvent): string {
  const entries = Object.entries(event.changes ?? {})
  if (entries.length === 0) return ''

  return entries.slice(0, 4).map(([field, detail]) => {
    const label = titleize(field)
    if (detail && typeof detail === 'object' && 'to' in detail) {
      const value = (detail as { to?: unknown }).to
      if (value === null || value === undefined || value === '') return label
      if (Array.isArray(value)) return `${label}: ${value.length} selected`
      return `${label}: ${String(value)}`
    }
    return label
  }).join(' | ')
}
