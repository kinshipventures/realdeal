import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, KeyRound, Link, ShieldCheck, Users, X } from 'lucide-react'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import {
  createCollaborationApprovalRequest,
  getCollaborationAccessGrants,
  getCollaborationApprovalRequests,
  resolveCollaborationApprovalRequest,
  type CollaborationAccessGrant,
  type CollaborationApprovalRequest,
  type CollaborationFieldScope,
  type CollaborationRequestType,
} from '@/lib/collaboration'
import { fetchWorkspaceMembers, type WorkspaceMember } from '@/lib/supabase-data'
import type { Campaign, CampaignContact, Contact } from '@/lib/types'
import { CollaborationQuickAccessModal, type CollaborationResourceOption } from '../collaboration/CollaborationQuickAccessModal'

const FIELD_SCOPE_OPTIONS: Array<{ value: CollaborationFieldScope; label: string }> = [
  { value: 'public_profile', label: 'Public profile' },
  { value: 'private_contact', label: 'Private contact' },
  { value: 'relationship_private', label: 'Relationship private' },
  { value: 'investment_private', label: 'Investment private' },
  { value: 'campaign_private', label: 'Campaign private' },
]

function titleCase(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function formatDate(value: string | null): string {
  if (!value) return 'No expiration'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function CampaignPermissionsPanel({
  campaign,
  campaignContacts,
  contacts,
  onClose,
}: {
  campaign: Campaign
  campaignContacts: CampaignContact[]
  contacts: Contact[]
  onClose: () => void
}) {
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [grants, setGrants] = useState<CollaborationAccessGrant[]>([])
  const [requests, setRequests] = useState<CollaborationApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showShareModal, setShowShareModal] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)

  const campaignContactIds = useMemo(
    () => new Set(campaignContacts.map(item => item.contact_id)),
    [campaignContacts],
  )
  const campaignPeople = useMemo(
    () => contacts.filter(contact => campaignContactIds.has(contact.id)),
    [campaignContactIds, contacts],
  )
  const campaignResources: CollaborationResourceOption[] = useMemo(() => [{
    id: campaign.id,
    label: campaign.name,
    type: 'campaign',
    description: titleCase(campaign.type),
  }], [campaign.id, campaign.name, campaign.type])

  const loadData = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    setError('')
    try {
      const [nextMembers, nextGrants, nextRequests] = await Promise.all([
        fetchWorkspaceMembers(workspaceId),
        getCollaborationAccessGrants(workspaceId),
        getCollaborationApprovalRequests(workspaceId),
      ])
      setMembers(nextMembers)
      setGrants(nextGrants)
      setRequests(nextRequests)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign permissions')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const campaignGrants = grants.filter(grant => (
    !grant.revoked_at &&
    (
      (grant.resource_type === 'campaign' && grant.resource_id === campaign.id) ||
      (grant.resource_type === 'contact' && grant.resource_id && campaignContactIds.has(grant.resource_id))
    )
  ))
  const campaignRequests = requests.filter(request => request.campaign_id === campaign.id)
  const pendingRequests = campaignRequests.filter(request => request.status === 'pending')
  const publicLinkGrants = campaignGrants.filter(grant => grant.subject_type === 'public_link')

  async function handleResolve(request: CollaborationApprovalRequest, status: 'approved' | 'rejected') {
    if (!workspaceId) return
    await resolveCollaborationApprovalRequest(request.id, workspaceId, status)
    await loadData()
  }

  if (!workspaceId) {
    return (
      <section style={panelStyle}>
        <PanelHeader title="Permissions" onClose={onClose} />
        <EmptyState title="No workspace selected" detail="Choose a workspace before managing campaign permissions." />
      </section>
    )
  }

  return (
    <section style={panelStyle}>
      <PanelHeader title="Campaign Permissions" onClose={onClose} />
      <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '0 0 14px', lineHeight: 1.5 }}>
        Manage campaign access, private field requests, public links, and approval status without changing campaign logic.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
        <SummaryCard icon={<Users size={15} />} label="Active access" value={campaignGrants.length} />
        <SummaryCard icon={<ShieldCheck size={15} />} label="Pending approvals" value={pendingRequests.length} />
        <SummaryCard icon={<Link size={15} />} label="Public links" value={publicLinkGrants.length} />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <button type="button" onClick={() => setShowShareModal(true)} style={primaryButtonStyle}>
          <KeyRound size={14} />
          Share campaign
        </button>
        <button type="button" onClick={() => setShowRequestModal(true)} style={secondaryButtonStyle}>
          <ShieldCheck size={14} />
          Request approval
        </button>
      </div>

      {error && <div style={{ ...noticeStyle, color: 'var(--health-fading)' }}>{error}</div>}

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', padding: 12 }}>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <AccessList grants={campaignGrants} />
          <RequestList requests={campaignRequests} onResolve={handleResolve} />
        </div>
      )}

      {showShareModal && (
        <CollaborationQuickAccessModal
          workspaceId={workspaceId}
          members={members}
          resources={campaignResources}
          title="Share campaign"
          detail="Grant campaign-level access for internal operators, external teams, organizations, or public reviewers."
          onClose={() => setShowShareModal(false)}
          onCreated={async () => {
            setShowShareModal(false)
            await loadData()
          }}
        />
      )}

      {showRequestModal && (
        <ApprovalRequestModal
          workspaceId={workspaceId}
          campaign={campaign}
          contacts={campaignPeople}
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

function PanelHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
      <h2 style={{ fontSize: 15, fontWeight: 850, margin: 0, color: 'var(--color-text-primary)' }}>{title}</h2>
      <button type="button" onClick={onClose} aria-label="Close permissions" title="Close permissions" style={iconButtonStyle}>
        <X size={14} />
      </button>
    </div>
  )
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div style={{ border: '1px solid var(--edge)', borderRadius: 8, padding: 12, background: 'var(--surface-panel)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(0,61,165,0.08)', color: 'var(--color-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 850, color: 'var(--color-text-primary)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 3 }}>{label}</div>
      </div>
    </div>
  )
}

function AccessList({ grants }: { grants: CollaborationAccessGrant[] }) {
  if (grants.length === 0) {
    return <EmptyState title="No campaign access yet" detail="Share this campaign or selected campaign contacts to track access here." />
  }
  return (
    <div style={listPanelStyle}>
      <div style={sectionTitleStyle}>Access</div>
      {grants.map(grant => (
        <div key={grant.id} style={rowStyle}>
          <div>
            <div style={rowPrimaryStyle}>{grant.subject_label}</div>
            <div style={rowSecondaryStyle}>{titleCase(grant.resource_type)} - {grant.resource_label}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={pillStyle}>{titleCase(grant.permission_level)}</div>
            <div style={rowSecondaryStyle}>{formatDate(grant.expires_at)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function RequestList({
  requests,
  onResolve,
}: {
  requests: CollaborationApprovalRequest[]
  onResolve: (request: CollaborationApprovalRequest, status: 'approved' | 'rejected') => void
}) {
  if (requests.length === 0) {
    return <EmptyState title="No campaign approvals yet" detail="Create requests for campaign participation or private field access." />
  }
  return (
    <div style={listPanelStyle}>
      <div style={sectionTitleStyle}>Approvals</div>
      {requests.map(request => (
        <div key={request.id} style={rowStyle}>
          <div>
            <div style={rowPrimaryStyle}>{request.contact_label ?? request.campaign_label ?? 'Campaign request'}</div>
            <div style={rowSecondaryStyle}>{titleCase(request.request_type)} - {request.requested_by_label}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={statusPillStyle(request.status)}>{titleCase(request.status)}</div>
            {request.status === 'pending' && (
              <>
                <button type="button" onClick={() => onResolve(request, 'approved')} aria-label="Approve request" title="Approve request" style={iconButtonStyle}>
                  <Check size={13} />
                </button>
                <button type="button" onClick={() => onResolve(request, 'rejected')} aria-label="Reject request" title="Reject request" style={iconButtonStyle}>
                  <X size={13} />
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function ApprovalRequestModal({
  workspaceId,
  campaign,
  contacts,
  onClose,
  onCreated,
}: {
  workspaceId: string
  campaign: Campaign
  contacts: Contact[]
  onClose: () => void
  onCreated: () => void
}) {
  const [requestType, setRequestType] = useState<CollaborationRequestType>('campaign_participation')
  const [contactId, setContactId] = useState('')
  const [requestedByLabel, setRequestedByLabel] = useState('Campaign team')
  const [reason, setReason] = useState('')
  const [fieldScopes, setFieldScopes] = useState<CollaborationFieldScope[]>(['public_profile', 'campaign_private'])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const contact = contacts.find(item => item.id === contactId)

  function toggleScope(scope: CollaborationFieldScope) {
    setFieldScopes(current => (
      current.includes(scope) ? current.filter(item => item !== scope) : [...current, scope]
    ))
  }

  async function handleSubmit() {
    if (!requestedByLabel.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      await createCollaborationApprovalRequest({
        workspace_id: workspaceId,
        campaign_id: campaign.id,
        campaign_label: campaign.name,
        contact_id: contact?.id ?? null,
        contact_label: contact?.name ?? (contacts.length > 0 ? `${contacts.length} campaign contacts` : null),
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
    <div style={modalBackdropStyle} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="New campaign approval request" style={modalStyle} onClick={event => event.stopPropagation()}>
        <PanelHeader title="New approval request" onClose={onClose} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <SelectField label="Request type" value={requestType} onChange={value => setRequestType(value as CollaborationRequestType)}>
            <option value="campaign_participation">Campaign participation</option>
            <option value="private_information_access">Private information access</option>
          </SelectField>
          <TextField label="Requested by" value={requestedByLabel} onChange={setRequestedByLabel} />
          <SelectField label="Contact" value={contactId} onChange={setContactId}>
            <option value="">All campaign contacts</option>
            {contacts.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </SelectField>
          <TextField label="Reason" value={reason} onChange={setReason} placeholder="Campaign context or access reason" />
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={fieldLabelStyle}>Requested fields</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {FIELD_SCOPE_OPTIONS.map(scope => (
              <label key={scope.value} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-primary)' }}>
                <input
                  type="checkbox"
                  checked={fieldScopes.includes(scope.value)}
                  onChange={() => toggleScope(scope.value)}
                  style={{ accentColor: 'var(--color-brand)' }}
                />
                {scope.label}
              </label>
            ))}
          </div>
        </div>
        {error && <div style={{ color: 'var(--health-fading)', fontSize: 12, marginTop: 12 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={saving || !requestedByLabel.trim()} style={{ ...primaryButtonStyle, opacity: saving || !requestedByLabel.trim() ? 0.62 : 1 }}>
            {saving ? 'Saving...' : 'Create request'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div style={{ border: '1px solid var(--edge)', borderRadius: 8, padding: 16, background: 'var(--surface-panel)' }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>{detail}</div>
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
      <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} style={inputStyle} />
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

const panelStyle: React.CSSProperties = {
  border: '1px solid var(--edge)',
  borderRadius: 12,
  background: 'var(--surface-panel)',
  padding: 14,
  marginBottom: 14,
}

const listPanelStyle: React.CSSProperties = {
  border: '1px solid var(--edge)',
  borderRadius: 10,
  background: 'var(--color-surface)',
  padding: 12,
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'center',
  padding: '10px 0',
  borderTop: '1px solid var(--divider)',
}

const rowPrimaryStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 750,
  color: 'var(--color-text-primary)',
}

const rowSecondaryStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--color-text-tertiary)',
  marginTop: 3,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 850,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--color-text-tertiary)',
  marginBottom: 8,
}

const noticeStyle: React.CSSProperties = {
  border: '1px solid var(--edge)',
  borderRadius: 8,
  padding: 10,
  fontSize: 12,
  marginBottom: 12,
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

const iconButtonStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: '1px solid var(--edge)',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
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

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1200,
  background: 'rgba(15,23,42,0.36)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
}

const modalStyle: React.CSSProperties = {
  width: 'min(620px, 100%)',
  maxHeight: 'min(760px, calc(100vh - 40px))',
  overflowY: 'auto',
  borderRadius: 14,
  border: '1px solid var(--edge)',
  background: 'var(--color-surface)',
  boxShadow: '0 24px 70px rgba(15,23,42,0.22)',
  padding: 20,
}

const pillStyle: React.CSSProperties = {
  display: 'inline-flex',
  minHeight: 22,
  alignItems: 'center',
  padding: '0 8px',
  borderRadius: 999,
  background: 'rgba(0,61,165,0.08)',
  color: 'var(--color-brand)',
  fontSize: 11,
  fontWeight: 750,
}

function statusPillStyle(status: CollaborationApprovalRequest['status']): React.CSSProperties {
  const tone = status === 'approved'
    ? ['rgba(37,180,57,0.10)', 'var(--color-brand)']
    : status === 'rejected'
      ? ['rgba(225,29,72,0.10)', 'var(--health-fading)']
      : ['rgba(245,166,35,0.14)', '#a16207']

  return {
    display: 'inline-flex',
    minHeight: 22,
    alignItems: 'center',
    padding: '0 8px',
    borderRadius: 999,
    background: tone[0],
    color: tone[1],
    fontSize: 11,
    fontWeight: 750,
  }
}
