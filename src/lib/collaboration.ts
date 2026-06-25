import { supabase } from '@/integrations/supabase/client'

export type CollaborationSubjectType = 'user' | 'team' | 'organization' | 'public_link'
export type CollaborationResourceType = 'contact' | 'company' | 'pod' | 'campaign' | 'field_group'
export type CollaborationPermissionLevel = 'view' | 'comment' | 'suggest' | 'edit' | 'approve' | 'admin'
export type CollaborationFieldScope =
  | 'public_profile'
  | 'private_contact'
  | 'relationship_private'
  | 'investment_private'
  | 'campaign_private'

export type CollaborationRequestStatus = 'pending' | 'approved' | 'rejected'
export type CollaborationRequestType = 'campaign_participation' | 'private_information_access'

export interface CollaborationAccessGrant {
  id: string
  workspace_id: string
  subject_type: CollaborationSubjectType
  subject_id: string | null
  subject_label: string
  resource_type: CollaborationResourceType
  resource_id: string | null
  resource_label: string
  permission_level: CollaborationPermissionLevel
  field_scopes: CollaborationFieldScope[]
  expires_at: string | null
  created_by: string | null
  created_at: string
  revoked_at: string | null
}

export interface CollaborationApprovalRequest {
  id: string
  workspace_id: string
  campaign_id: string | null
  campaign_label: string | null
  contact_id: string | null
  contact_label: string | null
  request_type: CollaborationRequestType
  requested_by: string | null
  requested_by_label: string
  approver_id: string | null
  status: CollaborationRequestStatus
  reason: string | null
  requested_field_scopes: CollaborationFieldScope[]
  created_at: string
  resolved_at: string | null
}

export interface CollaborationAuditEvent {
  id: string
  workspace_id: string
  actor_user_id: string | null
  actor_label: string
  event_type: string
  resource_type: CollaborationResourceType | 'approval_request' | 'export'
  resource_id: string | null
  resource_label: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface CreateAccessGrantInput {
  workspace_id: string
  subject_type: CollaborationSubjectType
  subject_id?: string | null
  subject_label: string
  resource_type: CollaborationResourceType
  resource_id?: string | null
  resource_label: string
  permission_level: CollaborationPermissionLevel
  field_scopes: CollaborationFieldScope[]
  expires_at?: string | null
}

export interface CreateApprovalRequestInput {
  workspace_id: string
  campaign_id?: string | null
  campaign_label?: string | null
  contact_id?: string | null
  contact_label?: string | null
  request_type: CollaborationRequestType
  requested_by_label: string
  approver_id?: string | null
  reason?: string | null
  requested_field_scopes: CollaborationFieldScope[]
}

// Generated Supabase types will include these tables after the migration is applied.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

function isMissingCollaborationTable(error: unknown): boolean {
  const code = (error as { code?: string })?.code
  const message = String((error as { message?: string })?.message ?? '').toLowerCase()
  return code === '42P01' || message.includes('does not exist') || message.includes('schema cache')
}

function emptyWhenMissing<T>(error: unknown): T[] {
  if (isMissingCollaborationTable(error)) return []
  throw error
}

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export async function getCollaborationAccessGrants(workspaceId: string): Promise<CollaborationAccessGrant[]> {
  const { data, error } = await db
    .from('collaboration_access_grants')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) return emptyWhenMissing<CollaborationAccessGrant>(error)
  return (data ?? []) as CollaborationAccessGrant[]
}

export async function createCollaborationAccessGrant(input: CreateAccessGrantInput): Promise<CollaborationAccessGrant> {
  const created_by = await getCurrentUserId()
  const { data, error } = await db
    .from('collaboration_access_grants')
    .insert({ ...input, created_by })
    .select()
    .single()

  if (error) throw error
  await recordCollaborationAuditEvent({
    workspace_id: input.workspace_id,
    event_type: 'access_grant_created',
    resource_type: input.resource_type,
    resource_id: input.resource_id ?? null,
    resource_label: input.resource_label,
    metadata: {
      subject_label: input.subject_label,
      permission_level: input.permission_level,
      field_scopes: input.field_scopes,
    },
  })
  return data as CollaborationAccessGrant
}

export async function revokeCollaborationAccessGrant(id: string, workspaceId: string): Promise<void> {
  const { data, error } = await db
    .from('collaboration_access_grants')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (error) throw error
  await recordCollaborationAuditEvent({
    workspace_id: workspaceId,
    event_type: 'access_grant_revoked',
    resource_type: data.resource_type,
    resource_id: data.resource_id,
    resource_label: data.resource_label,
    metadata: {
      subject_label: data.subject_label,
      permission_level: data.permission_level,
    },
  })
}

export async function getCollaborationApprovalRequests(workspaceId: string): Promise<CollaborationApprovalRequest[]> {
  const { data, error } = await db
    .from('collaboration_approval_requests')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) return emptyWhenMissing<CollaborationApprovalRequest>(error)
  return (data ?? []) as CollaborationApprovalRequest[]
}

export async function createCollaborationApprovalRequest(
  input: CreateApprovalRequestInput,
): Promise<CollaborationApprovalRequest> {
  const requested_by = await getCurrentUserId()
  const { data, error } = await db
    .from('collaboration_approval_requests')
    .insert({ ...input, requested_by, status: 'pending' })
    .select()
    .single()

  if (error) throw error
  await recordCollaborationAuditEvent({
    workspace_id: input.workspace_id,
    event_type: 'approval_request_created',
    resource_type: 'approval_request',
    resource_id: data.id,
    resource_label: input.campaign_label ?? input.contact_label ?? 'Approval request',
    metadata: {
      request_type: input.request_type,
      requested_field_scopes: input.requested_field_scopes,
    },
  })
  return data as CollaborationApprovalRequest
}

export async function resolveCollaborationApprovalRequest(
  id: string,
  workspaceId: string,
  status: Extract<CollaborationRequestStatus, 'approved' | 'rejected'>,
): Promise<CollaborationApprovalRequest> {
  const approver_id = await getCurrentUserId()
  const { data, error } = await db
    .from('collaboration_approval_requests')
    .update({ approver_id, status, resolved_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (error) throw error
  await recordCollaborationAuditEvent({
    workspace_id: workspaceId,
    event_type: `approval_request_${status}`,
    resource_type: 'approval_request',
    resource_id: id,
    resource_label: data.campaign_label ?? data.contact_label ?? 'Approval request',
    metadata: {
      request_type: data.request_type,
      requested_by_label: data.requested_by_label,
    },
  })
  return data as CollaborationApprovalRequest
}

export async function getCollaborationAuditEvents(workspaceId: string): Promise<CollaborationAuditEvent[]> {
  const { data, error } = await db
    .from('collaboration_audit_events')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return emptyWhenMissing<CollaborationAuditEvent>(error)
  return (data ?? []) as CollaborationAuditEvent[]
}

export async function recordCollaborationAuditEvent(input: {
  workspace_id: string
  event_type: string
  resource_type: CollaborationAuditEvent['resource_type']
  resource_id?: string | null
  resource_label?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  const actor_user_id = await getCurrentUserId()
  const { data: profile } = actor_user_id
    ? await supabase.from('profiles').select('display_name, email').eq('id', actor_user_id).single()
    : { data: null }
  const actor_label = profile?.display_name || profile?.email || 'System'

  const { error } = await db
    .from('collaboration_audit_events')
    .insert({
      workspace_id: input.workspace_id,
      actor_user_id,
      actor_label,
      event_type: input.event_type,
      resource_type: input.resource_type,
      resource_id: input.resource_id ?? null,
      resource_label: input.resource_label ?? null,
      metadata: input.metadata ?? {},
    })

  if (error && !isMissingCollaborationTable(error)) throw error
}
