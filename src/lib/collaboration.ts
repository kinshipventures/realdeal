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
export type PublicCampaignReviewStatus = 'approved' | 'rejected' | 'discussion'

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
  resource_type:
    | CollaborationResourceType
    | 'approval_request'
    | 'export'
    | 'public_campaign_link'
    | 'saved_view'
    | 'contact_proposal'
    | 'campaign_update'
  resource_id: string | null
  resource_label: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface CollaborationSavedView {
  id: string
  workspace_id: string
  owner_user_id: string | null
  view_type: 'relationships' | 'campaign'
  label: string
  resource_id: string | null
  filters: Record<string, unknown>
  visible_fields: string[]
  sort_state: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CollaborationPublicCampaignLink {
  id: string
  workspace_id: string
  campaign_id: string
  campaign_label: string
  token: string
  field_scopes: CollaborationFieldScope[]
  permissions: string[]
  contacts_snapshot: Record<string, unknown>[]
  expires_at: string | null
  created_by: string | null
  created_at: string
  revoked_at: string | null
}

export interface CollaborationPublicLinkReview {
  id: string
  public_link_id: string
  token: string
  contact_id: string | null
  reviewer_label: string
  status: PublicCampaignReviewStatus
  comment: string | null
  created_at: string
}

export interface CollaborationContactProposal {
  id: string
  workspace_id: string
  campaign_id: string | null
  campaign_label: string | null
  proposed_by_label: string
  status: CollaborationRequestStatus
  contact_payload: Record<string, unknown>
  matched_contact_id: string | null
  source_public_token: string | null
  reviewer_id: string | null
  review_note: string | null
  created_at: string
  resolved_at: string | null
}

export interface CollaborationCampaignUpdate {
  id: string
  workspace_id: string
  campaign_id: string
  campaign_label: string
  contact_id: string | null
  contact_label: string | null
  update_type: string
  status: string | null
  note: string | null
  created_by_label: string
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

export interface CreatePublicCampaignLinkInput {
  workspace_id: string
  campaign_id: string
  campaign_label: string
  field_scopes: CollaborationFieldScope[]
  permissions: string[]
  contacts_snapshot: Record<string, unknown>[]
  expires_at?: string | null
}

export interface CreatePublicLinkReviewInput {
  public_link_id: string
  token: string
  contact_id?: string | null
  reviewer_label: string
  status: PublicCampaignReviewStatus
  comment?: string | null
}

export interface CreateContactProposalInput {
  workspace_id: string
  campaign_id?: string | null
  campaign_label?: string | null
  proposed_by_label: string
  contact_payload: Record<string, unknown>
  matched_contact_id?: string | null
  source_public_token?: string | null
}

export interface CreateCampaignUpdateInput {
  workspace_id: string
  campaign_id: string
  campaign_label: string
  contact_id?: string | null
  contact_label?: string | null
  update_type: string
  status?: string | null
  note?: string | null
  created_by_label: string
}

export interface CreateSavedViewInput {
  workspace_id: string
  view_type: CollaborationSavedView['view_type']
  label: string
  resource_id?: string | null
  filters?: Record<string, unknown>
  visible_fields?: string[]
  sort_state?: Record<string, unknown>
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

function nullWhenMissing<T>(error: unknown): T | null {
  if (isMissingCollaborationTable(error)) return null
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

export async function getCollaborationSavedViews(
  workspaceId: string,
  viewType?: CollaborationSavedView['view_type'],
): Promise<CollaborationSavedView[]> {
  let query = db
    .from('collaboration_saved_views')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })

  if (viewType) query = query.eq('view_type', viewType)

  const { data, error } = await query
  if (error) return emptyWhenMissing<CollaborationSavedView>(error)
  return (data ?? []) as CollaborationSavedView[]
}

export async function createCollaborationSavedView(input: CreateSavedViewInput): Promise<CollaborationSavedView> {
  const owner_user_id = await getCurrentUserId()
  const { data, error } = await db
    .from('collaboration_saved_views')
    .insert({
      workspace_id: input.workspace_id,
      owner_user_id,
      view_type: input.view_type,
      label: input.label,
      resource_id: input.resource_id ?? null,
      filters: input.filters ?? {},
      visible_fields: input.visible_fields ?? [],
      sort_state: input.sort_state ?? {},
    })
    .select()
    .single()

  if (error) throw error
  await recordCollaborationAuditEvent({
    workspace_id: input.workspace_id,
    event_type: 'saved_view_created',
    resource_type: 'saved_view',
    resource_id: data.id,
    resource_label: input.label,
    metadata: { view_type: input.view_type, resource_id: input.resource_id ?? null },
  })
  return data as CollaborationSavedView
}

export async function getCollaborationPublicCampaignLinks(
  workspaceId: string,
  campaignId?: string,
): Promise<CollaborationPublicCampaignLink[]> {
  let query = db
    .from('collaboration_public_campaign_links')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (campaignId) query = query.eq('campaign_id', campaignId)

  const { data, error } = await query
  if (error) return emptyWhenMissing<CollaborationPublicCampaignLink>(error)
  return (data ?? []) as CollaborationPublicCampaignLink[]
}

export async function getPublicCampaignLinkByToken(token: string): Promise<CollaborationPublicCampaignLink | null> {
  const { data, error } = await db.rpc('get_public_campaign_link', { link_token: token })

  if (error) return nullWhenMissing<CollaborationPublicCampaignLink>(error)
  return ((Array.isArray(data) ? data[0] : data) ?? null) as CollaborationPublicCampaignLink | null
}

export async function createCollaborationPublicCampaignLink(
  input: CreatePublicCampaignLinkInput,
): Promise<CollaborationPublicCampaignLink> {
  const created_by = await getCurrentUserId()
  const token = crypto.randomUUID().replace(/-/g, '')
  const { data, error } = await db
    .from('collaboration_public_campaign_links')
    .insert({
      ...input,
      token,
      created_by,
      expires_at: input.expires_at ?? null,
    })
    .select()
    .single()

  if (error) throw error
  await recordCollaborationAuditEvent({
    workspace_id: input.workspace_id,
    event_type: 'public_campaign_link_created',
    resource_type: 'public_campaign_link',
    resource_id: data.id,
    resource_label: input.campaign_label,
    metadata: {
      campaign_id: input.campaign_id,
      field_scopes: input.field_scopes,
      permissions: input.permissions,
      contacts_count: input.contacts_snapshot.length,
    },
  })
  return data as CollaborationPublicCampaignLink
}

export async function revokeCollaborationPublicCampaignLink(id: string, workspaceId: string): Promise<void> {
  const { data, error } = await db
    .from('collaboration_public_campaign_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (error) throw error
  await recordCollaborationAuditEvent({
    workspace_id: workspaceId,
    event_type: 'public_campaign_link_revoked',
    resource_type: 'public_campaign_link',
    resource_id: id,
    resource_label: data.campaign_label,
    metadata: { campaign_id: data.campaign_id },
  })
}

export async function getPublicLinkReviews(publicLinkId: string): Promise<CollaborationPublicLinkReview[]> {
  const { data, error } = await db
    .from('collaboration_public_link_reviews')
    .select('*')
    .eq('public_link_id', publicLinkId)
    .order('created_at', { ascending: false })

  if (error) return emptyWhenMissing<CollaborationPublicLinkReview>(error)
  return (data ?? []) as CollaborationPublicLinkReview[]
}

export async function getPublicLinkReviewsByToken(token: string): Promise<CollaborationPublicLinkReview[]> {
  const { data, error } = await db.rpc('get_public_link_reviews', { link_token: token })

  if (error) return emptyWhenMissing<CollaborationPublicLinkReview>(error)
  return (data ?? []) as CollaborationPublicLinkReview[]
}

export async function createPublicLinkReview(
  input: CreatePublicLinkReviewInput,
): Promise<CollaborationPublicLinkReview> {
  const { data, error } = await db
    .from('collaboration_public_link_reviews')
    .insert({
      public_link_id: input.public_link_id,
      token: input.token,
      contact_id: input.contact_id ?? null,
      reviewer_label: input.reviewer_label,
      status: input.status,
      comment: input.comment ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as CollaborationPublicLinkReview
}

export async function getCollaborationContactProposals(workspaceId: string): Promise<CollaborationContactProposal[]> {
  const { data, error } = await db
    .from('collaboration_contact_proposals')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) return emptyWhenMissing<CollaborationContactProposal>(error)
  return (data ?? []) as CollaborationContactProposal[]
}

export async function createCollaborationContactProposal(
  input: CreateContactProposalInput,
): Promise<CollaborationContactProposal> {
  const { data, error } = await db
    .from('collaboration_contact_proposals')
    .insert({
      workspace_id: input.workspace_id,
      campaign_id: input.campaign_id ?? null,
      campaign_label: input.campaign_label ?? null,
      proposed_by_label: input.proposed_by_label,
      contact_payload: input.contact_payload,
      matched_contact_id: input.matched_contact_id ?? null,
      source_public_token: input.source_public_token ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw error
  await recordCollaborationAuditEvent({
    workspace_id: input.workspace_id,
    event_type: 'contact_proposal_created',
    resource_type: 'contact_proposal',
    resource_id: data.id,
    resource_label: String(input.contact_payload.name ?? input.campaign_label ?? 'Contact proposal'),
    metadata: { campaign_id: input.campaign_id ?? null, matched_contact_id: input.matched_contact_id ?? null },
  }).catch(() => undefined)
  return data as CollaborationContactProposal
}

export async function resolveCollaborationContactProposal(
  id: string,
  workspaceId: string,
  status: Extract<CollaborationRequestStatus, 'approved' | 'rejected'>,
  reviewNote?: string | null,
): Promise<CollaborationContactProposal> {
  const reviewer_id = await getCurrentUserId()
  const { data, error } = await db
    .from('collaboration_contact_proposals')
    .update({ reviewer_id, status, review_note: reviewNote ?? null, resolved_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (error) throw error
  await recordCollaborationAuditEvent({
    workspace_id: workspaceId,
    event_type: `contact_proposal_${status}`,
    resource_type: 'contact_proposal',
    resource_id: id,
    resource_label: String(data.contact_payload?.name ?? 'Contact proposal'),
    metadata: { campaign_id: data.campaign_id, matched_contact_id: data.matched_contact_id },
  })
  return data as CollaborationContactProposal
}

export async function getCollaborationCampaignUpdates(
  workspaceId: string,
  campaignId?: string,
): Promise<CollaborationCampaignUpdate[]> {
  let query = db
    .from('collaboration_campaign_updates')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (campaignId) query = query.eq('campaign_id', campaignId)

  const { data, error } = await query
  if (error) return emptyWhenMissing<CollaborationCampaignUpdate>(error)
  return (data ?? []) as CollaborationCampaignUpdate[]
}

export async function createCollaborationCampaignUpdate(
  input: CreateCampaignUpdateInput,
): Promise<CollaborationCampaignUpdate> {
  const { data, error } = await db
    .from('collaboration_campaign_updates')
    .insert({
      workspace_id: input.workspace_id,
      campaign_id: input.campaign_id,
      campaign_label: input.campaign_label,
      contact_id: input.contact_id ?? null,
      contact_label: input.contact_label ?? null,
      update_type: input.update_type,
      status: input.status ?? null,
      note: input.note ?? null,
      created_by_label: input.created_by_label,
    })
    .select()
    .single()

  if (error) throw error
  await recordCollaborationAuditEvent({
    workspace_id: input.workspace_id,
    event_type: 'campaign_update_created',
    resource_type: 'campaign_update',
    resource_id: data.id,
    resource_label: input.campaign_label,
    metadata: {
      campaign_id: input.campaign_id,
      contact_id: input.contact_id ?? null,
      update_type: input.update_type,
      status: input.status ?? null,
    },
  })
  return data as CollaborationCampaignUpdate
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
