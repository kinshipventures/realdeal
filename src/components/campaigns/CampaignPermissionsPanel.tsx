import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Copy, ExternalLink, KeyRound, Link, MessageSquare, ShieldCheck, UserPlus, Users, X } from 'lucide-react'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import {
  createCollaborationCampaignUpdate,
  createCollaborationContactProposal,
  createCollaborationApprovalRequest,
  createCollaborationPublicCampaignLink,
  getCollaborationAccessGrants,
  getCollaborationApprovalRequests,
  getCollaborationCampaignUpdates,
  getCollaborationPublicCampaignLinks,
  resolveCollaborationApprovalRequest,
  revokeCollaborationPublicCampaignLink,
  type CollaborationAccessGrant,
  type CollaborationApprovalRequest,
  type CollaborationCampaignUpdate,
  type CollaborationFieldScope,
  type CollaborationPublicCampaignLink,
  type CollaborationRequestType,
} from '@/lib/collaboration'
import { buildCampaignContactSnapshot, getCampaignAccessArea, publicCampaignPath } from '@/lib/collaborationPolicy'
import { fetchWorkspaceMembers, type WorkspaceMember } from '@/lib/supabase-data'
import type { Campaign, CampaignContact, CampaignStage, Contact } from '@/lib/types'
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
  stages,
  onClose,
}: {
  campaign: Campaign
  campaignContacts: CampaignContact[]
  contacts: Contact[]
  stages: CampaignStage[]
  onClose: () => void
}) {
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [grants, setGrants] = useState<CollaborationAccessGrant[]>([])
  const [requests, setRequests] = useState<CollaborationApprovalRequest[]>([])
  const [publicLinks, setPublicLinks] = useState<CollaborationPublicCampaignLink[]>([])
  const [updates, setUpdates] = useState<CollaborationCampaignUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showShareModal, setShowShareModal] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showPublicLinkModal, setShowPublicLinkModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showProposalModal, setShowProposalModal] = useState(false)

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
      const [nextMembers, nextGrants, nextRequests, nextPublicLinks, nextUpdates] = await Promise.all([
        fetchWorkspaceMembers(workspaceId),
        getCollaborationAccessGrants(workspaceId),
        getCollaborationApprovalRequests(workspaceId),
        getCollaborationPublicCampaignLinks(workspaceId, campaign.id),
        getCollaborationCampaignUpdates(workspaceId, campaign.id),
      ])
      setMembers(nextMembers)
      setGrants(nextGrants)
      setRequests(nextRequests)
      setPublicLinks(nextPublicLinks)
      setUpdates(nextUpdates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign permissions')
    } finally {
      setLoading(false)
    }
  }, [campaign.id, workspaceId])

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
  const activePublicLinks = publicLinks.filter(link => !link.revoked_at)

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
        <SummaryCard icon={<Link size={15} />} label="Public links" value={activePublicLinks.length} />
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
        <button type="button" onClick={() => setShowPublicLinkModal(true)} style={secondaryButtonStyle}>
          <Link size={14} />
          Public review link
        </button>
        <button type="button" onClick={() => setShowUpdateModal(true)} style={secondaryButtonStyle}>
          <MessageSquare size={14} />
          Add update
        </button>
        <button type="button" onClick={() => setShowProposalModal(true)} style={secondaryButtonStyle}>
          <UserPlus size={14} />
          Propose contact
        </button>
      </div>

      <div style={{ ...noticeStyle, marginBottom: 14 }}>
        <strong style={{ color: 'var(--color-text-primary)' }}>{getCampaignAccessArea(campaign)}</strong>
        <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 6 }}>
          access area. Private fields stay hidden unless they are explicitly enabled for this campaign or link.
        </span>
      </div>

      {error && <div style={{ ...noticeStyle, color: 'var(--health-fading)' }}>{error}</div>}

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', padding: 12 }}>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <AccessList grants={campaignGrants} />
          <RequestList requests={campaignRequests} onResolve={handleResolve} />
          <PublicLinksList
            links={publicLinks}
            onCopy={(link) => navigator.clipboard?.writeText(`${window.location.origin}${publicCampaignPath(link.token)}`)}
            onRevoke={async (link) => {
              await revokeCollaborationPublicCampaignLink(link.id, workspaceId)
              await loadData()
            }}
          />
          <CampaignUpdatesList updates={updates} />
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

      {showPublicLinkModal && (
        <PublicLinkModal
          workspaceId={workspaceId}
          campaign={campaign}
          contacts={campaignPeople}
          campaignContacts={campaignContacts}
          stages={stages}
          onClose={() => setShowPublicLinkModal(false)}
          onCreated={async () => {
            setShowPublicLinkModal(false)
            await loadData()
          }}
        />
      )}

      {showUpdateModal && (
        <CampaignUpdateModal
          workspaceId={workspaceId}
          campaign={campaign}
          contacts={campaignPeople}
          onClose={() => setShowUpdateModal(false)}
          onCreated={async () => {
            setShowUpdateModal(false)
            await loadData()
          }}
        />
      )}

      {showProposalModal && (
        <ContactProposalModal
          workspaceId={workspaceId}
          campaign={campaign}
          contacts={contacts}
          onClose={() => setShowProposalModal(false)}
          onCreated={async () => {
            setShowProposalModal(false)
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

function PublicLinksList({
  links,
  onCopy,
  onRevoke,
}: {
  links: CollaborationPublicCampaignLink[]
  onCopy: (link: CollaborationPublicCampaignLink) => void
  onRevoke: (link: CollaborationPublicCampaignLink) => void
}) {
  if (links.length === 0) {
    return <EmptyState title="No public review links" detail="Create a limited public link for reviewers who do not need a Real Deal account." />
  }

  return (
    <div style={listPanelStyle}>
      <div style={sectionTitleStyle}>Public links</div>
      {links.map(link => (
        <div key={link.id} style={rowStyle}>
          <div>
            <div style={rowPrimaryStyle}>{link.campaign_label}</div>
            <div style={rowSecondaryStyle}>{link.contacts_snapshot.length} contacts - {formatDate(link.expires_at)}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button type="button" onClick={() => onCopy(link)} aria-label="Copy public link" title="Copy public link" style={iconButtonStyle}>
              <Copy size={13} />
            </button>
            <a href={publicCampaignPath(link.token)} target="_blank" rel="noreferrer" aria-label="Open public link" title="Open public link" style={iconAnchorStyle}>
              <ExternalLink size={13} />
            </a>
            <button type="button" onClick={() => onRevoke(link)} disabled={Boolean(link.revoked_at)} aria-label="Revoke public link" title="Revoke public link" style={{ ...iconButtonStyle, opacity: link.revoked_at ? 0.45 : 1 }}>
              <X size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function CampaignUpdatesList({ updates }: { updates: CollaborationCampaignUpdate[] }) {
  if (updates.length === 0) {
    return <EmptyState title="No campaign updates yet" detail="Add campaign-specific updates to preserve history without editing the main contact record." />
  }

  return (
    <div style={listPanelStyle}>
      <div style={sectionTitleStyle}>Activity & export history</div>
      {updates.map(update => (
        <div key={update.id} style={rowStyle}>
          <div>
            <div style={rowPrimaryStyle}>{update.contact_label ?? update.campaign_label}</div>
            <div style={rowSecondaryStyle}>{titleCase(update.update_type)}{update.status ? ` - ${titleCase(update.status)}` : ''}</div>
          </div>
          <div style={{ textAlign: 'right', maxWidth: 210 }}>
            <div style={rowSecondaryStyle}>{update.created_by_label}</div>
            <div style={rowSecondaryStyle}>{update.note ?? formatDate(update.created_at)}</div>
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

function PublicLinkModal({
  workspaceId,
  campaign,
  contacts,
  campaignContacts,
  stages,
  onClose,
  onCreated,
}: {
  workspaceId: string
  campaign: Campaign
  contacts: Contact[]
  campaignContacts: CampaignContact[]
  stages: CampaignStage[]
  onClose: () => void
  onCreated: () => void
}) {
  const [fieldScopes, setFieldScopes] = useState<CollaborationFieldScope[]>(['public_profile'])
  const [permissions, setPermissions] = useState<string[]>(['view_campaign', 'review_contacts', 'comment', 'propose_contacts'])
  const [expirationDays, setExpirationDays] = useState<number | null>(30)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleScope(scope: CollaborationFieldScope) {
    setFieldScopes(current => {
      if (scope === 'public_profile') return current.includes(scope) ? current : [...current, scope]
      return current.includes(scope) ? current.filter(item => item !== scope) : [...current, scope]
    })
  }

  function togglePermission(permission: string) {
    setPermissions(current => (
      current.includes(permission)
        ? current.filter(item => item !== permission)
        : [...current, permission]
    ))
  }

  async function handleSubmit() {
    if (saving || contacts.length === 0) return
    setSaving(true)
    setError('')
    try {
      const snapshots = campaignContacts
        .map(campaignContact => {
          const contact = contacts.find(item => item.id === campaignContact.contact_id)
          if (!contact) return null
          const stage = stages.find(item => item.id === campaignContact.stage_id)
          return buildCampaignContactSnapshot({
            contact,
            campaignContact,
            stageName: stage?.name ?? null,
            fieldScopes,
          })
        })
        .filter(Boolean) as ReturnType<typeof buildCampaignContactSnapshot>[]

      await createCollaborationPublicCampaignLink({
        workspace_id: workspaceId,
        campaign_id: campaign.id,
        campaign_label: campaign.name,
        field_scopes: fieldScopes,
        permissions,
        contacts_snapshot: snapshots,
        expires_at: expirationDays ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString() : null,
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create public link')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={modalBackdropStyle} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Create public campaign link" style={modalStyle} onClick={event => event.stopPropagation()}>
        <PanelHeader title="Create public campaign link" onClose={onClose} />
        <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '0 0 14px', lineHeight: 1.5 }}>
          The link stores a limited snapshot of this campaign, so reviewers only see the fields selected here.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <section style={miniPanelStyle}>
            <div style={sectionTitleStyle}>Visible fields</div>
            {FIELD_SCOPE_OPTIONS.map(scope => (
              <label key={scope.value} style={checkboxRowStyle}>
                <input
                  type="checkbox"
                  checked={fieldScopes.includes(scope.value)}
                  disabled={scope.value === 'public_profile'}
                  onChange={() => toggleScope(scope.value)}
                  style={{ accentColor: 'var(--color-brand)' }}
                />
                {scope.label}
              </label>
            ))}
          </section>
          <section style={miniPanelStyle}>
            <div style={sectionTitleStyle}>Link permissions</div>
            {[
              ['view_campaign', 'View campaign'],
              ['review_contacts', 'Approve or reject contacts'],
              ['comment', 'Add comments'],
              ['propose_contacts', 'Propose contacts'],
              ['export_approved_contacts', 'Export approved view'],
            ].map(([value, label]) => (
              <label key={value} style={checkboxRowStyle}>
                <input
                  type="checkbox"
                  checked={permissions.includes(value)}
                  onChange={() => togglePermission(value)}
                  style={{ accentColor: 'var(--color-brand)' }}
                />
                {label}
              </label>
            ))}
          </section>
        </div>
        <div style={{ marginTop: 12 }}>
          <SelectField label="Expiration" value={String(expirationDays ?? '')} onChange={value => setExpirationDays(value ? Number(value) : null)}>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="">No expiration</option>
          </SelectField>
        </div>
        {error && <div style={{ color: 'var(--health-fading)', fontSize: 12, marginTop: 12 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={saving || contacts.length === 0} style={{ ...primaryButtonStyle, opacity: saving || contacts.length === 0 ? 0.62 : 1 }}>
            {saving ? 'Creating...' : 'Create link'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CampaignUpdateModal({
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
  const [contactId, setContactId] = useState('')
  const [updateType, setUpdateType] = useState('campaign_participation')
  const [status, setStatus] = useState('pending')
  const [createdByLabel, setCreatedByLabel] = useState('Campaign team')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const contact = contacts.find(item => item.id === contactId)

  async function handleSubmit() {
    if (!createdByLabel.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      await createCollaborationCampaignUpdate({
        workspace_id: workspaceId,
        campaign_id: campaign.id,
        campaign_label: campaign.name,
        contact_id: contact?.id ?? null,
        contact_label: contact?.name ?? null,
        update_type: updateType,
        status,
        note: note.trim() || null,
        created_by_label: createdByLabel.trim(),
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add update')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={modalBackdropStyle} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Add campaign update" style={modalStyle} onClick={event => event.stopPropagation()}>
        <PanelHeader title="Add campaign update" onClose={onClose} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <SelectField label="Contact" value={contactId} onChange={setContactId}>
            <option value="">Campaign-level update</option>
            {contacts.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </SelectField>
          <SelectField label="Update type" value={updateType} onChange={setUpdateType}>
            <option value="campaign_participation">Campaign participation</option>
            <option value="outreach_result">Outreach result</option>
            <option value="response_confirmation">Response or confirmation</option>
            <option value="future_relationship_note">Future relationship note</option>
          </SelectField>
          <SelectField label="Status" value={status} onChange={setStatus}>
            <option value="proposed">Proposed</option>
            <option value="pending">Pending approval</option>
            <option value="approved">Approved</option>
            <option value="contacted">Contacted</option>
            <option value="responded">Responded</option>
            <option value="confirmed">Confirmed</option>
            <option value="declined">Declined</option>
            <option value="no_response">No response</option>
          </SelectField>
          <TextField label="Created by" value={createdByLabel} onChange={setCreatedByLabel} />
        </div>
        <div style={{ marginTop: 12 }}>
          <TextField label="Note" value={note} onChange={setNote} placeholder="Campaign-specific note" />
        </div>
        {error && <div style={{ color: 'var(--health-fading)', fontSize: 12, marginTop: 12 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={saving || !createdByLabel.trim()} style={{ ...primaryButtonStyle, opacity: saving || !createdByLabel.trim() ? 0.62 : 1 }}>
            {saving ? 'Saving...' : 'Add update'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ContactProposalModal({
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
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [proposedByLabel, setProposedByLabel] = useState('Campaign team')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const matchedContact = useMemo(() => {
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedName = name.trim().toLowerCase()
    return contacts.find(contact => (
      (normalizedEmail && [contact.email, contact.email_2, contact.email_3].some(value => value?.toLowerCase() === normalizedEmail)) ||
      (normalizedName && contact.name.toLowerCase() === normalizedName)
    ))
  }, [contacts, email, name])

  async function handleSubmit() {
    if (!name.trim() || !proposedByLabel.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      await createCollaborationContactProposal({
        workspace_id: workspaceId,
        campaign_id: campaign.id,
        campaign_label: campaign.name,
        proposed_by_label: proposedByLabel.trim(),
        matched_contact_id: matchedContact?.id ?? null,
        contact_payload: {
          name: name.trim(),
          company: company.trim() || null,
          email: email.trim() || null,
          role: role.trim() || null,
        },
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create proposal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={modalBackdropStyle} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Propose contact" style={modalStyle} onClick={event => event.stopPropagation()}>
        <PanelHeader title="Propose contact" onClose={onClose} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <TextField label="Name" value={name} onChange={setName} />
          <TextField label="Company" value={company} onChange={setCompany} />
          <TextField label="Email" value={email} onChange={setEmail} />
          <TextField label="Role" value={role} onChange={setRole} />
          <TextField label="Proposed by" value={proposedByLabel} onChange={setProposedByLabel} />
        </div>
        {matchedContact && (
          <div style={{ ...noticeStyle, marginTop: 12 }}>
            Possible existing match: <strong>{matchedContact.name}</strong>. This proposal will be linked instead of creating a duplicate.
          </div>
        )}
        {error && <div style={{ color: 'var(--health-fading)', fontSize: 12, marginTop: 12 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={saving || !name.trim() || !proposedByLabel.trim()} style={{ ...primaryButtonStyle, opacity: saving || !name.trim() || !proposedByLabel.trim() ? 0.62 : 1 }}>
            {saving ? 'Saving...' : 'Create proposal'}
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

const miniPanelStyle: React.CSSProperties = {
  border: '1px solid var(--edge)',
  borderRadius: 10,
  background: 'var(--surface-panel)',
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

const iconAnchorStyle: React.CSSProperties = {
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
  textDecoration: 'none',
}

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minHeight: 28,
  fontSize: 13,
  color: 'var(--color-text-primary)',
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
