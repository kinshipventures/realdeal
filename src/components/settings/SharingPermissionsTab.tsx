import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Clock, KeyRound, Link, Plus, ShieldCheck, Users, X } from 'lucide-react'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { getCampaigns, getContacts, getPods } from '@/lib/data'
import { fetchWorkspaceMembers, type WorkspaceMember } from '@/lib/supabase-data'
import type { Campaign, Contact, Pod } from '@/lib/types'
import {
  createCollaborationAccessGrant,
  createCollaborationApprovalRequest,
  getCollaborationAccessGrants,
  getCollaborationApprovalRequests,
  getCollaborationAuditEvents,
  resolveCollaborationApprovalRequest,
  revokeCollaborationAccessGrant,
  type CollaborationAccessGrant,
  type CollaborationApprovalRequest,
  type CollaborationAuditEvent,
  type CollaborationFieldScope,
  type CollaborationPermissionLevel,
  type CollaborationResourceType,
  type CollaborationSubjectType,
} from '@/lib/collaboration'

type SharingTab = 'access' | 'approvals' | 'fields' | 'links' | 'audit'

type ResourceOption = {
  id: string
  label: string
  type: CollaborationResourceType
  description?: string
}

const TAB_OPTIONS: Array<{ id: SharingTab; label: string }> = [
  { id: 'access', label: 'Shared Access' },
  { id: 'approvals', label: 'Approval Requests' },
  { id: 'fields', label: 'Field Visibility' },
  { id: 'links', label: 'Public Links' },
  { id: 'audit', label: 'Audit History' },
]

const RESOURCE_TYPES: Array<{ value: CollaborationResourceType; label: string }> = [
  { value: 'contact', label: 'Contact' },
  { value: 'company', label: 'Company' },
  { value: 'pod', label: 'Pod / List' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'field_group', label: 'Field group' },
]

const SUBJECT_TYPES: Array<{ value: CollaborationSubjectType; label: string }> = [
  { value: 'user', label: 'User' },
  { value: 'team', label: 'Team' },
  { value: 'organization', label: 'Organization' },
  { value: 'public_link', label: 'Public link' },
]

const PERMISSION_LEVELS: Array<{ value: CollaborationPermissionLevel; label: string }> = [
  { value: 'view', label: 'View' },
  { value: 'comment', label: 'Comment' },
  { value: 'suggest', label: 'Suggest' },
  { value: 'edit', label: 'Edit' },
  { value: 'approve', label: 'Approve' },
  { value: 'admin', label: 'Admin' },
]

const FIELD_SCOPES: Array<{ value: CollaborationFieldScope; label: string; summary: string; defaultStatus: string }> = [
  { value: 'public_profile', label: 'Public profile', summary: 'Name, company, role, city, LinkedIn, pod or list.', defaultStatus: 'External default' },
  { value: 'private_contact', label: 'Private contact', summary: 'Email, phone, address, and contact channels.', defaultStatus: 'Approval required' },
  { value: 'relationship_private', label: 'Relationship private', summary: 'Private notes, relationship activity, context, and communication history.', defaultStatus: 'Internal only' },
  { value: 'investment_private', label: 'Investment private', summary: 'Investment details, commitments, LP/SPV context, and financial fields.', defaultStatus: 'Restricted' },
  { value: 'campaign_private', label: 'Campaign private', summary: 'Campaign notes, outreach status, approval comments, and campaign-only updates.', defaultStatus: 'Campaign scoped' },
]

const EXPIRATION_OPTIONS: Array<{ label: string; days: number | null }> = [
  { label: 'No expiration', days: null },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

const surfaceStyle: React.CSSProperties = {
  border: '1px solid var(--edge)',
  borderRadius: 10,
  background: 'var(--surface-panel)',
}

const smallLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--color-text-tertiary)',
}

function formatDate(value: string | null): string {
  if (!value) return 'No expiration'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function titleCase(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function StatusPill({ tone, children }: { tone: 'green' | 'yellow' | 'red' | 'gray' | 'blue'; children: React.ReactNode }) {
  const colors = {
    green: ['rgba(37,180,57,0.10)', 'var(--color-brand)'],
    yellow: ['rgba(245,166,35,0.14)', '#a16207'],
    red: ['rgba(225,29,72,0.10)', 'var(--health-fading)'],
    gray: ['var(--tint)', 'var(--color-text-tertiary)'],
    blue: ['rgba(0,61,165,0.08)', 'var(--color-brand)'],
  }[tone]

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      minHeight: 22,
      padding: '0 8px',
      borderRadius: 999,
      background: colors[0],
      color: colors[1],
      fontSize: 11,
      fontWeight: 750,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div style={{ ...surfaceStyle, padding: 22, textAlign: 'center' }}>
      <div style={{ fontSize: 13, fontWeight: 750, color: 'var(--color-text-primary)', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>{detail}</div>
    </div>
  )
}

function IconButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        border: '1px solid var(--edge)',
        background: 'transparent',
        color: disabled ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
        cursor: disabled ? 'default' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </button>
  )
}

export function SharingPermissionsTab() {
  const { activeWorkspace } = useWorkspace()
  const [tab, setTab] = useState<SharingTab>('access')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pods, setPods] = useState<Pod[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [grants, setGrants] = useState<CollaborationAccessGrant[]>([])
  const [requests, setRequests] = useState<CollaborationApprovalRequest[]>([])
  const [events, setEvents] = useState<CollaborationAuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAccessModal, setShowAccessModal] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const workspaceId = activeWorkspace?.id

  const resources = useMemo<ResourceOption[]>(() => {
    const people = contacts
      .filter(contact => contact.type !== 'Company')
      .map(contact => ({
        id: contact.id,
        label: contact.name,
        type: 'contact' as const,
        description: [contact.company, contact.email].filter(Boolean).join(' - '),
      }))
    const companies = contacts
      .filter(contact => contact.type === 'Company')
      .map(company => ({
        id: company.id,
        label: company.name,
        type: 'company' as const,
        description: company.domain ?? company.industry ?? undefined,
      }))
    const listOptions = pods.map(pod => ({
      id: pod.id,
      label: pod.name,
      type: 'pod' as const,
      description: 'Pod / list',
    }))
    const campaignOptions = campaigns.map(campaign => ({
      id: campaign.id,
      label: campaign.name,
      type: 'campaign' as const,
      description: titleCase(campaign.type),
    }))
    const fieldOptions = FIELD_SCOPES.map(scope => ({
      id: scope.value,
      label: scope.label,
      type: 'field_group' as const,
      description: scope.defaultStatus,
    }))

    return [...people, ...companies, ...listOptions, ...campaignOptions, ...fieldOptions]
  }, [campaigns, contacts, pods])

  const activeGrants = grants.filter(grant => !grant.revoked_at)
  const pendingRequests = requests.filter(request => request.status === 'pending')
  const publicLinkGrants = grants.filter(grant => grant.subject_type === 'public_link')

  const loadData = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    setError('')
    try {
      const [
        nextContacts,
        nextPods,
        nextCampaigns,
        nextMembers,
        nextGrants,
        nextRequests,
        nextEvents,
      ] = await Promise.all([
        getContacts(),
        getPods(),
        getCampaigns(),
        fetchWorkspaceMembers(workspaceId),
        getCollaborationAccessGrants(workspaceId),
        getCollaborationApprovalRequests(workspaceId),
        getCollaborationAuditEvents(workspaceId),
      ])
      setContacts(nextContacts.filter(contact => contact.status !== 'Archived'))
      setPods(nextPods)
      setCampaigns(nextCampaigns.filter(campaign => campaign.status !== 'hidden'))
      setMembers(nextMembers)
      setGrants(nextGrants)
      setRequests(nextRequests)
      setEvents(nextEvents)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sharing data')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleRevoke(grant: CollaborationAccessGrant) {
    if (!workspaceId) return
    await revokeCollaborationAccessGrant(grant.id, workspaceId)
    await loadData()
  }

  async function handleResolveRequest(
    request: CollaborationApprovalRequest,
    status: 'approved' | 'rejected',
  ) {
    if (!workspaceId) return
    await resolveCollaborationApprovalRequest(request.id, workspaceId, status)
    await loadData()
  }

  if (!activeWorkspace) {
    return <EmptyState title="No workspace selected" detail="Choose a workspace before managing sharing and permissions." />
  }

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px', color: 'var(--color-text-primary)' }}>
            Sharing & Permissions
          </h2>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0, lineHeight: 1.45 }}>
            Manage shared contacts, lists, campaigns, field access, approvals, and audit history.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setShowRequestModal(true)}
            style={secondaryButtonStyle}
          >
            <Clock size={14} />
            New request
          </button>
          <button
            type="button"
            onClick={() => setShowAccessModal(true)}
            style={primaryButtonStyle}
          >
            <Plus size={14} />
            New access
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>
        <SummaryCard icon={<Users size={15} />} label="Active access" value={activeGrants.length} />
        <SummaryCard icon={<ShieldCheck size={15} />} label="Pending approvals" value={pendingRequests.length} />
        <SummaryCard icon={<Link size={15} />} label="Public links" value={publicLinkGrants.length} />
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--edge)', marginBottom: 16, overflowX: 'auto' }}>
        {TAB_OPTIONS.map(option => {
          const active = tab === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setTab(option.id)}
              style={{
                padding: '10px 12px',
                border: 'none',
                borderBottom: active ? '2px solid var(--color-brand)' : '2px solid transparent',
                background: 'transparent',
                color: active ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                fontSize: 12,
                fontWeight: active ? 750 : 550,
                fontFamily: 'inherit',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                marginBottom: -1,
              }}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {error && (
        <div style={{ ...surfaceStyle, padding: 12, marginBottom: 12, color: 'var(--health-fading)', fontSize: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', padding: '20px 0' }}>Loading...</div>
      ) : (
        <>
          {tab === 'access' && (
            <SharedAccessTable grants={grants} onRevoke={handleRevoke} />
          )}
          {tab === 'approvals' && (
            <ApprovalRequestsTable requests={requests} onResolve={handleResolveRequest} />
          )}
          {tab === 'fields' && <FieldVisibilityPanel />}
          {tab === 'links' && <PublicLinksPanel grants={publicLinkGrants} />}
          {tab === 'audit' && <AuditHistoryPanel events={events} />}
        </>
      )}

      {showAccessModal && workspaceId && (
        <AccessGrantModal
          workspaceId={workspaceId}
          members={members}
          resources={resources}
          onClose={() => setShowAccessModal(false)}
          onCreated={async () => {
            setShowAccessModal(false)
            await loadData()
          }}
        />
      )}

      {showRequestModal && workspaceId && (
        <ApprovalRequestModal
          workspaceId={workspaceId}
          resources={resources}
          onClose={() => setShowRequestModal(false)}
          onCreated={async () => {
            setShowRequestModal(false)
            await loadData()
          }}
        />
      )}
    </section>
  )
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div style={{ ...surfaceStyle, minHeight: 76, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: 'rgba(0,61,165,0.08)',
        color: 'var(--color-brand)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 850, color: 'var(--color-text-primary)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  )
}

function SharedAccessTable({
  grants,
  onRevoke,
}: {
  grants: CollaborationAccessGrant[]
  onRevoke: (grant: CollaborationAccessGrant) => void
}) {
  if (grants.length === 0) {
    return <EmptyState title="No shared access yet" detail="Create a grant to share a contact, list, campaign, or field group." />
  }

  return (
    <div style={{ ...surfaceStyle, overflow: 'hidden' }}>
      <TableHeader columns="1.1fr 1fr 0.8fr 0.9fr 0.8fr 80px" labels={['Shared with', 'Resource', 'Permission', 'Fields', 'Expires', '']} />
      {grants.map(grant => (
        <div key={grant.id} style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 0.8fr 0.9fr 0.8fr 80px', alignItems: 'center', minHeight: 58, borderBottom: '1px solid var(--divider)' }}>
          <Cell primary={grant.subject_label} secondary={titleCase(grant.subject_type)} />
          <Cell primary={grant.resource_label} secondary={titleCase(grant.resource_type)} />
          <div style={{ padding: '10px 12px' }}><StatusPill tone="blue">{titleCase(grant.permission_level)}</StatusPill></div>
          <Cell primary={`${grant.field_scopes.length} groups`} secondary={grant.field_scopes.map(titleCase).join(', ')} />
          <Cell primary={grant.revoked_at ? 'Revoked' : formatDate(grant.expires_at)} secondary={grant.revoked_at ? formatDate(grant.revoked_at) : 'Active'} />
          <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'flex-end' }}>
            <IconButton icon={<X size={14} />} label="Revoke access" disabled={Boolean(grant.revoked_at)} onClick={() => onRevoke(grant)} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ApprovalRequestsTable({
  requests,
  onResolve,
}: {
  requests: CollaborationApprovalRequest[]
  onResolve: (request: CollaborationApprovalRequest, status: 'approved' | 'rejected') => void
}) {
  if (requests.length === 0) {
    return <EmptyState title="No approval requests" detail="Requests for campaign participation or private field access will appear here." />
  }

  return (
    <div style={{ ...surfaceStyle, overflow: 'hidden' }}>
      <TableHeader columns="1fr 1fr 0.95fr 0.75fr 96px" labels={['Request', 'Target', 'Fields', 'Status', '']} />
      {requests.map(request => (
        <div key={request.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.95fr 0.75fr 96px', alignItems: 'center', minHeight: 58, borderBottom: '1px solid var(--divider)' }}>
          <Cell primary={titleCase(request.request_type)} secondary={request.requested_by_label} />
          <Cell primary={request.campaign_label ?? request.contact_label ?? 'Request'} secondary={request.reason ?? 'No reason added'} />
          <Cell primary={`${request.requested_field_scopes.length} groups`} secondary={request.requested_field_scopes.map(titleCase).join(', ')} />
          <div style={{ padding: '10px 12px' }}>
            <StatusPill tone={request.status === 'pending' ? 'yellow' : request.status === 'approved' ? 'green' : 'red'}>
              {titleCase(request.status)}
            </StatusPill>
          </div>
          <div style={{ padding: '10px 12px', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <IconButton icon={<Check size={14} />} label="Approve request" disabled={request.status !== 'pending'} onClick={() => onResolve(request, 'approved')} />
            <IconButton icon={<X size={14} />} label="Reject request" disabled={request.status !== 'pending'} onClick={() => onResolve(request, 'rejected')} />
          </div>
        </div>
      ))}
    </div>
  )
}

function FieldVisibilityPanel() {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {FIELD_SCOPES.map(scope => (
        <div key={scope.value} style={{ ...surfaceStyle, padding: 14, display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4 }}>{scope.label}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>{scope.summary}</div>
          </div>
          <StatusPill tone={scope.value === 'public_profile' ? 'green' : 'gray'}>{scope.defaultStatus}</StatusPill>
        </div>
      ))}
    </div>
  )
}

function PublicLinksPanel({ grants }: { grants: CollaborationAccessGrant[] }) {
  if (grants.length === 0) {
    return <EmptyState title="No public links tracked" detail="Public campaign or list links will be tracked here when they are granted through New access." />
  }

  return (
    <div style={{ ...surfaceStyle, overflow: 'hidden' }}>
      <TableHeader columns="1.2fr 1fr 0.8fr 0.8fr" labels={['Link label', 'Resource', 'Fields', 'Expires']} />
      {grants.map(grant => (
        <div key={grant.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 0.8fr', alignItems: 'center', minHeight: 54, borderBottom: '1px solid var(--divider)' }}>
          <Cell primary={grant.subject_label} secondary="Public reviewer" />
          <Cell primary={grant.resource_label} secondary={titleCase(grant.resource_type)} />
          <Cell primary={`${grant.field_scopes.length} groups`} secondary={grant.field_scopes.map(titleCase).join(', ')} />
          <Cell primary={formatDate(grant.expires_at)} secondary={grant.revoked_at ? 'Revoked' : 'Active'} />
        </div>
      ))}
    </div>
  )
}

function AuditHistoryPanel({ events }: { events: CollaborationAuditEvent[] }) {
  if (events.length === 0) {
    return <EmptyState title="No audit events yet" detail="Access grants, revocations, approvals, and exports will be logged here." />
  }

  return (
    <div style={{ ...surfaceStyle, overflow: 'hidden' }}>
      <TableHeader columns="1fr 1fr 0.9fr 0.8fr" labels={['Event', 'Resource', 'Actor', 'Date']} />
      {events.map(event => (
        <div key={event.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.9fr 0.8fr', alignItems: 'center', minHeight: 54, borderBottom: '1px solid var(--divider)' }}>
          <Cell primary={titleCase(event.event_type)} secondary={titleCase(event.resource_type)} />
          <Cell primary={event.resource_label ?? '-'} secondary={event.resource_id ?? ''} />
          <Cell primary={event.actor_label} secondary="Workspace member" />
          <Cell primary={formatDate(event.created_at)} secondary={new Date(event.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} />
        </div>
      ))}
    </div>
  )
}

function TableHeader({ columns, labels }: { columns: string; labels: string[] }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: columns,
      minHeight: 38,
      alignItems: 'center',
      background: 'var(--tint)',
      borderBottom: '1px solid var(--edge)',
    }}>
      {labels.map((label, index) => (
        <div key={`${label}-${index}`} style={{ ...smallLabelStyle, padding: '0 12px' }}>{label}</div>
      ))}
    </div>
  )
}

function Cell({ primary, secondary }: { primary: string; secondary?: string }) {
  return (
    <div style={{ padding: '10px 12px', minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {primary}
      </div>
      {secondary && (
        <div style={{ marginTop: 3, fontSize: 11, color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {secondary}
        </div>
      )}
    </div>
  )
}

function AccessGrantModal({
  workspaceId,
  members,
  resources,
  onClose,
  onCreated,
}: {
  workspaceId: string
  members: WorkspaceMember[]
  resources: ResourceOption[]
  onClose: () => void
  onCreated: () => void
}) {
  const [subjectType, setSubjectType] = useState<CollaborationSubjectType>('user')
  const [subjectId, setSubjectId] = useState('')
  const [subjectLabel, setSubjectLabel] = useState('')
  const [resourceType, setResourceType] = useState<CollaborationResourceType>('contact')
  const filteredResources = resources.filter(resource => resource.type === resourceType)
  const [resourceId, setResourceId] = useState('')
  const [resourceLabel, setResourceLabel] = useState('')
  const [permission, setPermission] = useState<CollaborationPermissionLevel>('view')
  const [fieldScopes, setFieldScopes] = useState<CollaborationFieldScope[]>(['public_profile'])
  const [expirationDays, setExpirationDays] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setResourceId('')
    setResourceLabel('')
  }, [resourceType])

  useEffect(() => {
    if (subjectType !== 'user') {
      setSubjectId('')
      return
    }
    const member = members.find(item => item.user_id === subjectId)
    if (member) setSubjectLabel(member.display_name || member.email || 'User')
  }, [members, subjectId, subjectType])

  useEffect(() => {
    const resource = filteredResources.find(item => item.id === resourceId)
    if (resource) setResourceLabel(resource.label)
  }, [filteredResources, resourceId])

  function toggleFieldScope(scope: CollaborationFieldScope) {
    setFieldScopes(current => {
      if (scope === 'public_profile') return current.includes(scope) ? current : [...current, scope]
      return current.includes(scope) ? current.filter(item => item !== scope) : [...current, scope]
    })
  }

  async function handleSubmit() {
    const resolvedSubjectLabel = subjectLabel.trim()
    const resolvedResourceLabel = resourceLabel.trim()
    if (!resolvedSubjectLabel || !resolvedResourceLabel || fieldScopes.length === 0) return
    setSaving(true)
    setError('')
    try {
      await createCollaborationAccessGrant({
        workspace_id: workspaceId,
        subject_type: subjectType,
        subject_id: subjectId || null,
        subject_label: resolvedSubjectLabel,
        resource_type: resourceType,
        resource_id: resourceId || null,
        resource_label: resolvedResourceLabel,
        permission_level: permission,
        field_scopes: fieldScopes,
        expires_at: expirationDays ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString() : null,
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create access')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="New access" onClose={onClose}>
      <div style={modalGridStyle}>
        <SelectField label="Share with" value={subjectType} onChange={value => setSubjectType(value as CollaborationSubjectType)}>
          {SUBJECT_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
        </SelectField>

        {subjectType === 'user' ? (
          <SelectField label="User" value={subjectId} onChange={setSubjectId}>
            <option value="">Select a user</option>
            {members.map(member => (
              <option key={member.id} value={member.user_id}>{member.display_name || member.email || 'User'}</option>
            ))}
          </SelectField>
        ) : (
          <TextField label="Label" value={subjectLabel} onChange={setSubjectLabel} placeholder="Production team, Investor reviewer, Public link..." />
        )}

        <SelectField label="Resource type" value={resourceType} onChange={value => setResourceType(value as CollaborationResourceType)}>
          {RESOURCE_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
        </SelectField>

        <SelectField label="Resource" value={resourceId} onChange={setResourceId}>
          <option value="">Select a resource</option>
          {filteredResources.map(resource => (
            <option key={resource.id} value={resource.id}>{resource.label}</option>
          ))}
        </SelectField>

        {!resourceId && (
          <TextField label="Resource label" value={resourceLabel} onChange={setResourceLabel} placeholder="Custom list, campaign, or field group" />
        )}

        <SelectField label="Permission level" value={permission} onChange={value => setPermission(value as CollaborationPermissionLevel)}>
          {PERMISSION_LEVELS.map(level => <option key={level.value} value={level.value}>{level.label}</option>)}
        </SelectField>

        <SelectField label="Expiration" value={String(expirationDays ?? '')} onChange={value => setExpirationDays(value ? Number(value) : null)}>
          {EXPIRATION_OPTIONS.map(option => (
            <option key={option.label} value={option.days ?? ''}>{option.label}</option>
          ))}
        </SelectField>

        <div style={{ display: 'grid', gap: 8 }}>
          <span style={fieldLabelStyle}>Visible fields</span>
          {FIELD_SCOPES.map(scope => (
            <label key={scope.value} style={checkboxRowStyle}>
              <input
                type="checkbox"
                checked={fieldScopes.includes(scope.value)}
                disabled={scope.value === 'public_profile'}
                onChange={() => toggleFieldScope(scope.value)}
                style={{ width: 15, height: 15, accentColor: 'var(--color-brand)' }}
              />
              <span>{scope.label}</span>
            </label>
          ))}
        </div>
      </div>

      {error && <div style={{ color: 'var(--health-fading)', fontSize: 12, marginTop: 12 }}>{error}</div>}

      <ModalActions onCancel={onClose} onSubmit={handleSubmit} submitLabel={saving ? 'Saving...' : 'Create access'} disabled={saving} />
    </Modal>
  )
}

function ApprovalRequestModal({
  workspaceId,
  resources,
  onClose,
  onCreated,
}: {
  workspaceId: string
  resources: ResourceOption[]
  onClose: () => void
  onCreated: () => void
}) {
  const campaignResources = resources.filter(resource => resource.type === 'campaign')
  const contactResources = resources.filter(resource => resource.type === 'contact')
  const [requestType, setRequestType] = useState<'campaign_participation' | 'private_information_access'>('campaign_participation')
  const [campaignId, setCampaignId] = useState('')
  const [contactId, setContactId] = useState('')
  const [requestedByLabel, setRequestedByLabel] = useState('')
  const [reason, setReason] = useState('')
  const [fieldScopes, setFieldScopes] = useState<CollaborationFieldScope[]>(['public_profile'])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleFieldScope(scope: CollaborationFieldScope) {
    setFieldScopes(current => (
      current.includes(scope) ? current.filter(item => item !== scope) : [...current, scope]
    ))
  }

  async function handleSubmit() {
    const campaign = campaignResources.find(resource => resource.id === campaignId)
    const contact = contactResources.find(resource => resource.id === contactId)
    if (!requestedByLabel.trim() || (!campaign && !contact)) return
    setSaving(true)
    setError('')
    try {
      await createCollaborationApprovalRequest({
        workspace_id: workspaceId,
        campaign_id: campaign?.id ?? null,
        campaign_label: campaign?.label ?? null,
        contact_id: contact?.id ?? null,
        contact_label: contact?.label ?? null,
        request_type: requestType,
        requested_by_label: requestedByLabel.trim(),
        reason: reason.trim() || null,
        requested_field_scopes: fieldScopes,
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create request')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="New approval request" onClose={onClose}>
      <div style={modalGridStyle}>
        <SelectField label="Request type" value={requestType} onChange={value => setRequestType(value as typeof requestType)}>
          <option value="campaign_participation">Campaign participation</option>
          <option value="private_information_access">Private information access</option>
        </SelectField>
        <TextField label="Requested by" value={requestedByLabel} onChange={setRequestedByLabel} placeholder="Name or team" />
        <SelectField label="Campaign" value={campaignId} onChange={setCampaignId}>
          <option value="">Select a campaign</option>
          {campaignResources.map(resource => <option key={resource.id} value={resource.id}>{resource.label}</option>)}
        </SelectField>
        <SelectField label="Contact" value={contactId} onChange={setContactId}>
          <option value="">Optional contact</option>
          {contactResources.map(resource => <option key={resource.id} value={resource.id}>{resource.label}</option>)}
        </SelectField>
        <TextField label="Reason" value={reason} onChange={setReason} placeholder="Campaign context or access reason" />
        <div style={{ display: 'grid', gap: 8 }}>
          <span style={fieldLabelStyle}>Requested fields</span>
          {FIELD_SCOPES.map(scope => (
            <label key={scope.value} style={checkboxRowStyle}>
              <input
                type="checkbox"
                checked={fieldScopes.includes(scope.value)}
                onChange={() => toggleFieldScope(scope.value)}
                style={{ width: 15, height: 15, accentColor: 'var(--color-brand)' }}
              />
              <span>{scope.label}</span>
            </label>
          ))}
        </div>
      </div>

      {error && <div style={{ color: 'var(--health-fading)', fontSize: 12, marginTop: 12 }}>{error}</div>}

      <ModalActions onCancel={onClose} onSubmit={handleSubmit} submitLabel={saving ? 'Saving...' : 'Create request'} disabled={saving} />
    </Modal>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(15,23,42,0.38)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          width: 'min(620px, 100%)',
          maxHeight: 'min(760px, calc(100vh - 40px))',
          overflowY: 'auto',
          borderRadius: 14,
          border: '1px solid var(--edge)',
          background: 'var(--color-surface)',
          boxShadow: '0 24px 70px rgba(15,23,42,0.22)',
          padding: 20,
        }}
        onClick={event => event.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: 'rgba(0,61,165,0.08)',
              color: 'var(--color-brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <KeyRound size={16} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 850, margin: 0, color: 'var(--color-text-primary)' }}>{title}</h3>
          </div>
          <IconButton icon={<X size={15} />} label="Close" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={fieldLabelStyle}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={fieldLabelStyle}>{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} style={inputStyle}>
        {children}
      </select>
    </label>
  )
}

function ModalActions({
  onCancel,
  onSubmit,
  submitLabel,
  disabled,
}: {
  onCancel: () => void
  onSubmit: () => void
  submitLabel: string
  disabled?: boolean
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
      <button type="button" onClick={onCancel} style={secondaryButtonStyle}>Cancel</button>
      <button type="button" onClick={onSubmit} disabled={disabled} style={{ ...primaryButtonStyle, opacity: disabled ? 0.65 : 1 }}>
        {submitLabel}
      </button>
    </div>
  )
}

const primaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  minHeight: 34,
  padding: '8px 12px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--color-brand)',
  color: '#fff',
  fontSize: 12,
  fontWeight: 750,
  fontFamily: 'inherit',
  cursor: 'pointer',
}

const secondaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  minHeight: 34,
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--edge)',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  fontSize: 12,
  fontWeight: 750,
  fontFamily: 'inherit',
  cursor: 'pointer',
}

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 750,
  color: 'var(--color-text-secondary)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 38,
  borderRadius: 8,
  border: '1px solid var(--edge)',
  background: 'var(--surface-panel)',
  color: 'var(--color-text-primary)',
  fontSize: 13,
  fontFamily: 'inherit',
  padding: '0 10px',
  outline: 'none',
  boxSizing: 'border-box',
}

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minHeight: 28,
  fontSize: 13,
  color: 'var(--color-text-primary)',
}

const modalGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 12,
}
