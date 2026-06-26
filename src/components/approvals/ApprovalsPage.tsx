import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Link, Search, ShieldCheck, UserPlus, Users, X } from 'lucide-react'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { getCampaigns, getCategories, getContacts, getPods } from '@/lib/data'
import type { Campaign, Category, Contact, Pod } from '@/lib/types'
import {
  getCollaborationAccessGrants,
  getCollaborationApprovalRequests,
  getCollaborationContactProposals,
  getCollaborationPublicCampaignLinks,
  resolveCollaborationApprovalRequest,
  resolveCollaborationContactProposal,
  revokeCollaborationAccessGrant,
  revokeCollaborationPublicCampaignLink,
  type CollaborationAccessGrant,
  type CollaborationApprovalRequest,
  type CollaborationContactProposal,
  type CollaborationFieldScope,
  type CollaborationPermissionLevel,
  type CollaborationPublicCampaignLink,
} from '@/lib/collaboration'
import type { CampaignContactSnapshot } from '@/lib/collaborationPolicy'

type ApprovalTab = 'requests' | 'proposals'
type SharedSourceFilter = 'all' | 'campaign' | 'pod' | 'sub_pod' | 'direct' | 'public_link'
type SharedContactRow = {
  id: string
  contactId: string | null
  contactName: string
  company: string | null
  sourceType: Exclude<SharedSourceFilter, 'all'>
  sourceLabel: string
  campaignId: string | null
  podIds: string[]
  subPodIds: string[]
  sharedWith: string
  permissionLabel: string
  permissionValue: CollaborationPermissionLevel | 'public_link'
  fieldScopes: CollaborationFieldScope[]
  status: 'active' | 'expired' | 'revoked'
  expiresAt: string | null
  createdAt: string
  revokeKind: 'grant' | 'public_link'
  revokeId: string
}

const PERMISSION_OPTIONS: Array<{ value: 'all' | CollaborationPermissionLevel | 'public_link'; label: string }> = [
  { value: 'all', label: 'All permissions' },
  { value: 'view', label: 'Reader' },
  { value: 'comment', label: 'Commenter' },
  { value: 'suggest', label: 'Contributor' },
  { value: 'edit', label: 'Editor' },
  { value: 'approve', label: 'Approver' },
  { value: 'admin', label: 'Admin' },
  { value: 'public_link', label: 'Public link' },
]

const SOURCE_OPTIONS: Array<{ value: SharedSourceFilter; label: string }> = [
  { value: 'all', label: 'All shared contacts' },
  { value: 'campaign', label: 'Shared campaigns' },
  { value: 'pod', label: 'Shared pods' },
  { value: 'sub_pod', label: 'Shared sub-pods' },
  { value: 'direct', label: 'Direct contacts' },
  { value: 'public_link', label: 'Public links' },
]

function titleCase(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function permissionLabel(value: CollaborationPermissionLevel | 'public_link', publicPermissions?: string[]): string {
  if (value === 'view') return 'Reader'
  if (value === 'comment') return 'Commenter'
  if (value === 'suggest') return 'Contributor'
  if (value === 'edit') return 'Editor'
  if (value === 'approve') return 'Approver'
  if (value === 'admin') return 'Admin'
  if (publicPermissions?.length) return publicPermissions.map(titleCase).join(', ')
  return 'Public link'
}

function fieldScopeSummary(scopes: CollaborationFieldScope[]): string {
  if (scopes.length === 0) return 'No field groups'
  if (scopes.length === 1) return titleCase(scopes[0])
  return `${scopes.length} field groups`
}

function accessStatus(expiresAt: string | null, revokedAt?: string | null): SharedContactRow['status'] {
  if (revokedAt) return 'revoked'
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return 'expired'
  return 'active'
}

function contactFromMap(contactMap: Map<string, Contact>, contactId: string | null | undefined): Contact | null {
  if (!contactId) return null
  return contactMap.get(contactId) ?? null
}

function rowsForGrant(
  grant: CollaborationAccessGrant,
  contacts: Contact[],
  contactMap: Map<string, Contact>,
  campaignMap: Map<string, Campaign>,
): SharedContactRow[] {
  const status = accessStatus(grant.expires_at, grant.revoked_at)
  const base = {
    sharedWith: grant.subject_label,
    permissionLabel: permissionLabel(grant.permission_level),
    permissionValue: grant.permission_level,
    fieldScopes: grant.field_scopes,
    status,
    expiresAt: grant.expires_at,
    createdAt: grant.created_at,
    revokeKind: 'grant' as const,
    revokeId: grant.id,
  }

  const makeRow = (contact: Contact, sourceType: SharedContactRow['sourceType'], sourceLabel = grant.resource_label, campaignId: string | null = null): SharedContactRow => ({
    ...base,
    id: `${grant.id}-${contact.id}-${sourceType}`,
    contactId: contact.id,
    contactName: contact.name,
    company: contact.company,
    sourceType,
    sourceLabel,
    campaignId,
    podIds: contact.list_ids,
    subPodIds: contact.category_ids,
  })

  if (grant.resource_type === 'contact') {
    const contact = contactFromMap(contactMap, grant.resource_id)
    return contact ? [makeRow(contact, 'direct')] : []
  }

  if (grant.resource_type === 'pod') {
    return contacts
      .filter(contact => Boolean(grant.resource_id && contact.list_ids.includes(grant.resource_id)))
      .map(contact => makeRow(contact, 'pod'))
  }

  if (grant.resource_type === 'campaign') {
    const campaign = grant.resource_id ? campaignMap.get(grant.resource_id) : null
    const contactIds = campaign?.contact_ids ?? []
    return contactIds
      .map(contactId => contactFromMap(contactMap, contactId))
      .filter((contact): contact is Contact => Boolean(contact))
      .map(contact => makeRow(contact, 'campaign', campaign?.name ?? grant.resource_label, campaign?.id ?? grant.resource_id ?? null))
  }

  if (grant.resource_type === 'company') {
    return contacts
      .filter(contact => (
        grant.resource_id
        && (contact.id === grant.resource_id || contact.company_record_id === grant.resource_id || contact.company_ids.includes(grant.resource_id))
      ))
      .map(contact => makeRow(contact, 'direct'))
  }

  return []
}

function rowsForPublicLink(link: CollaborationPublicCampaignLink): SharedContactRow[] {
  const snapshots = (link.contacts_snapshot ?? []) as CampaignContactSnapshot[]
  const status = accessStatus(link.expires_at, link.revoked_at)
  return snapshots.map(snapshot => ({
    id: `${link.id}-${snapshot.contact_id}`,
    contactId: snapshot.contact_id,
    contactName: snapshot.name,
    company: snapshot.company,
    sourceType: 'public_link',
    sourceLabel: link.campaign_label,
    campaignId: link.campaign_id,
    podIds: snapshot.pod_ids,
    subPodIds: snapshot.sub_pod_ids,
    sharedWith: 'Public review link',
    permissionLabel: permissionLabel('public_link', link.permissions),
    permissionValue: 'public_link',
    fieldScopes: link.field_scopes,
    status,
    expiresAt: link.expires_at,
    createdAt: link.created_at,
    revokeKind: 'public_link',
    revokeId: link.id,
  }))
}

export function ApprovalsPage() {
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id
  const [tab, setTab] = useState<ApprovalTab>('requests')
  const [requests, setRequests] = useState<CollaborationApprovalRequest[]>([])
  const [proposals, setProposals] = useState<CollaborationContactProposal[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pods, setPods] = useState<Pod[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [grants, setGrants] = useState<CollaborationAccessGrant[]>([])
  const [publicLinks, setPublicLinks] = useState<CollaborationPublicCampaignLink[]>([])
  const [sourceFilter, setSourceFilter] = useState<SharedSourceFilter>('all')
  const [campaignFilter, setCampaignFilter] = useState('all')
  const [podFilter, setPodFilter] = useState('all')
  const [subPodFilter, setSubPodFilter] = useState('all')
  const [permissionFilter, setPermissionFilter] = useState<'all' | CollaborationPermissionLevel | 'public_link'>('all')
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const pendingRequests = useMemo(() => requests.filter(request => request.status === 'pending'), [requests])
  const pendingProposals = useMemo(() => proposals.filter(proposal => proposal.status === 'pending'), [proposals])
  const contactMap = useMemo(() => new Map(contacts.map(contact => [contact.id, contact])), [contacts])
  const campaignMap = useMemo(() => new Map(campaigns.map(campaign => [campaign.id, campaign])), [campaigns])
  const sharedRows = useMemo(() => {
    const grantRows = grants.flatMap(grant => rowsForGrant(grant, contacts, contactMap, campaignMap))
    const linkRows = publicLinks.flatMap(rowsForPublicLink)
    return [...grantRows, ...linkRows]
  }, [campaignMap, contactMap, contacts, grants, publicLinks])
  const filteredSharedRows = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    return sharedRows.filter(row => {
      if (sourceFilter !== 'all') {
        if (sourceFilter === 'sub_pod') {
          if (row.subPodIds.length === 0) return false
        } else if (row.sourceType !== sourceFilter) {
          return false
        }
      }
      if (campaignFilter !== 'all' && row.campaignId !== campaignFilter) return false
      if (podFilter !== 'all' && !row.podIds.includes(podFilter)) return false
      if (subPodFilter !== 'all' && !row.subPodIds.includes(subPodFilter)) return false
      if (permissionFilter !== 'all' && row.permissionValue !== permissionFilter) return false
      if (!query) return true

      return [
        row.contactName,
        row.company,
        row.sourceLabel,
        row.sharedWith,
        row.permissionLabel,
        row.fieldScopes.map(titleCase).join(' '),
      ].some(value => String(value ?? '').toLowerCase().includes(query))
    })
  }, [campaignFilter, permissionFilter, podFilter, searchText, sharedRows, sourceFilter, subPodFilter])
  const activeSharedRows = useMemo(() => sharedRows.filter(row => row.status === 'active'), [sharedRows])
  const activePublicLinks = useMemo(() => publicLinks.filter(link => !link.revoked_at), [publicLinks])
  const sharedContactCount = useMemo(() => new Set(activeSharedRows.map(row => row.contactId ?? row.contactName)).size, [activeSharedRows])

  const loadData = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    setError('')
    try {
      const [
        nextRequests,
        nextProposals,
        nextContacts,
        nextPods,
        nextCategories,
        nextCampaigns,
        nextGrants,
        nextPublicLinks,
      ] = await Promise.all([
        getCollaborationApprovalRequests(workspaceId),
        getCollaborationContactProposals(workspaceId),
        getContacts(),
        getPods(),
        getCategories(),
        getCampaigns(),
        getCollaborationAccessGrants(workspaceId),
        getCollaborationPublicCampaignLinks(workspaceId),
      ])
      setRequests(nextRequests)
      setProposals(nextProposals)
      setContacts(nextContacts.filter(contact => contact.status !== 'Archived'))
      setPods(nextPods)
      setCategories(nextCategories)
      setCampaigns(nextCampaigns.filter(campaign => campaign.status !== 'hidden'))
      setGrants(nextGrants)
      setPublicLinks(nextPublicLinks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shared contacts')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleResolveRequest(request: CollaborationApprovalRequest, status: 'approved' | 'rejected') {
    if (!workspaceId) return
    await resolveCollaborationApprovalRequest(request.id, workspaceId, status)
    await loadData()
  }

  async function handleResolveProposal(proposal: CollaborationContactProposal, status: 'approved' | 'rejected') {
    if (!workspaceId) return
    await resolveCollaborationContactProposal(proposal.id, workspaceId, status)
    await loadData()
  }

  async function handleRevokeSharedRow(row: SharedContactRow) {
    if (!workspaceId || row.status !== 'active') return
    if (row.revokeKind === 'grant') {
      await revokeCollaborationAccessGrant(row.revokeId, workspaceId)
    } else {
      await revokeCollaborationPublicCampaignLink(row.revokeId, workspaceId)
    }
    await loadData()
  }

  return (
    <main className="content-enter" style={{ padding: '32px clamp(16px, 4vw, 36px) 80px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 28, fontWeight: 850 }}>
            Shared contacts
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--color-text-tertiary)', fontSize: 13, lineHeight: 1.5 }}>
            Manage shared contacts, permissions, public links, campaign access, and approval queues from one place.
          </p>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 18 }}>
        <SummaryCard icon={<Users size={16} />} label="Shared contacts" value={sharedContactCount} />
        <SummaryCard icon={<ShieldCheck size={16} />} label="Active access" value={activeSharedRows.length} />
        <SummaryCard icon={<Link size={16} />} label="Public links" value={activePublicLinks.length} />
        <SummaryCard icon={<UserPlus size={16} />} label="Pending approvals" value={pendingRequests.length + pendingProposals.length} />
      </section>

      <section style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 850, color: 'var(--color-text-primary)' }}>
              Shared contact manager
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.45 }}>
              Filter active shares by campaigns, pods, sub-pods, public links, direct contacts, and permission level.
            </p>
          </div>
        </div>

        <SharedContactFilters
          searchText={searchText}
          sourceFilter={sourceFilter}
          campaignFilter={campaignFilter}
          podFilter={podFilter}
          subPodFilter={subPodFilter}
          permissionFilter={permissionFilter}
          campaigns={campaigns}
          pods={pods}
          categories={categories}
          onSearchTextChange={setSearchText}
          onSourceFilterChange={setSourceFilter}
          onCampaignFilterChange={setCampaignFilter}
          onPodFilterChange={setPodFilter}
          onSubPodFilterChange={setSubPodFilter}
          onPermissionFilterChange={setPermissionFilter}
        />
      </section>

      {error && <div style={{ ...noticeStyle, color: 'var(--health-fading)' }}>{error}</div>}

      {loading ? (
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, padding: 24 }}>Loading...</div>
      ) : (
        <SharedContactsTable rows={filteredSharedRows} onRevoke={handleRevokeSharedRow} />
      )}

      <section style={{ marginTop: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 850, color: 'var(--color-text-primary)' }}>
              Approvals
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.45 }}>
              Review campaign participation, private information access, and proposed contacts.
            </p>
          </div>
        </div>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 18 }}>
          <SummaryCard icon={<ShieldCheck size={16} />} label="Pending requests" value={pendingRequests.length} />
          <SummaryCard icon={<UserPlus size={16} />} label="Pending proposals" value={pendingProposals.length} />
          <SummaryCard icon={<Check size={16} />} label="Resolved items" value={requests.length + proposals.length - pendingRequests.length - pendingProposals.length} />
        </section>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--edge)', marginBottom: 16 }}>
          <TabButton active={tab === 'requests'} onClick={() => setTab('requests')}>Approval Requests</TabButton>
          <TabButton active={tab === 'proposals'} onClick={() => setTab('proposals')}>Contact Proposals</TabButton>
        </div>

        {loading ? (
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, padding: 24 }}>Loading...</div>
        ) : tab === 'requests' ? (
          <ApprovalRequestsTable requests={requests} onResolve={handleResolveRequest} />
        ) : (
          <ContactProposalsTable proposals={proposals} onResolve={handleResolveProposal} />
        )}
      </section>
    </main>
  )
}

function SharedContactFilters({
  searchText,
  sourceFilter,
  campaignFilter,
  podFilter,
  subPodFilter,
  permissionFilter,
  campaigns,
  pods,
  categories,
  onSearchTextChange,
  onSourceFilterChange,
  onCampaignFilterChange,
  onPodFilterChange,
  onSubPodFilterChange,
  onPermissionFilterChange,
}: {
  searchText: string
  sourceFilter: SharedSourceFilter
  campaignFilter: string
  podFilter: string
  subPodFilter: string
  permissionFilter: 'all' | CollaborationPermissionLevel | 'public_link'
  campaigns: Campaign[]
  pods: Pod[]
  categories: Category[]
  onSearchTextChange: (value: string) => void
  onSourceFilterChange: (value: SharedSourceFilter) => void
  onCampaignFilterChange: (value: string) => void
  onPodFilterChange: (value: string) => void
  onSubPodFilterChange: (value: string) => void
  onPermissionFilterChange: (value: 'all' | CollaborationPermissionLevel | 'public_link') => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.4fr) repeat(5, minmax(150px, 1fr))', gap: 10, alignItems: 'center' }}>
      <label style={{ ...inputWrapStyle, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px' }}>
        <Search size={14} color="var(--color-text-tertiary)" />
        <input
          value={searchText}
          onChange={event => onSearchTextChange(event.target.value)}
          placeholder="Search shared contacts"
          style={{ border: 0, outline: 'none', background: 'transparent', width: '100%', fontSize: 13, color: 'var(--color-text-primary)' }}
        />
      </label>
      <Select value={sourceFilter} onChange={value => onSourceFilterChange(value as SharedSourceFilter)}>
        {SOURCE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>
      <Select value={campaignFilter} onChange={onCampaignFilterChange}>
        <option value="all">All campaigns</option>
        {campaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
      </Select>
      <Select value={podFilter} onChange={onPodFilterChange}>
        <option value="all">All pods</option>
        {pods.map(pod => <option key={pod.id} value={pod.id}>{pod.name}</option>)}
      </Select>
      <Select value={subPodFilter} onChange={onSubPodFilterChange}>
        <option value="all">All sub-pods</option>
        {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
      </Select>
      <Select value={permissionFilter} onChange={value => onPermissionFilterChange(value as typeof permissionFilter)}>
        {PERMISSION_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>
    </div>
  )
}

function SharedContactsTable({
  rows,
  onRevoke,
}: {
  rows: SharedContactRow[]
  onRevoke: (row: SharedContactRow) => void
}) {
  if (rows.length === 0) {
    return <EmptyState title="No shared contacts match this view" detail="Shared campaign contacts, pod contacts, sub-pod contacts, direct contacts, and public links will appear here." />
  }

  return (
    <div style={tableStyle}>
      <Header columns="1.1fr 1fr 0.85fr 0.9fr 0.85fr 0.8fr 84px" labels={['Contact', 'Shared through', 'Shared with', 'Permission', 'Fields', 'Status', '']} />
      {rows.map(row => (
        <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 0.85fr 0.9fr 0.85fr 0.8fr 84px', minHeight: 62, alignItems: 'center', borderBottom: '1px solid var(--divider)' }}>
          <Cell primary={row.contactName} secondary={row.company ?? 'No company'} />
          <Cell primary={row.sourceLabel} secondary={titleCase(row.sourceType)} />
          <Cell primary={row.sharedWith} secondary={formatDate(row.createdAt)} />
          <div style={{ padding: '10px 12px' }}>
            <TagPill tone={row.permissionValue === 'public_link' ? 'gray' : 'blue'}>{row.permissionLabel}</TagPill>
          </div>
          <Cell primary={fieldScopeSummary(row.fieldScopes)} secondary={row.fieldScopes.map(titleCase).join(', ')} />
          <div style={{ padding: '10px 12px' }}>
            <TagPill tone={row.status === 'active' ? 'green' : row.status === 'expired' ? 'yellow' : 'red'}>
              {titleCase(row.status)}
            </TagPill>
          </div>
          <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'flex-end' }}>
            <IconButton label={row.revokeKind === 'public_link' ? 'Revoke public link' : 'Revoke access'} disabled={row.status !== 'active'} onClick={() => onRevoke(row)}>
              <X size={14} />
            </IconButton>
          </div>
        </div>
      ))}
    </div>
  )
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div style={{ border: '1px solid var(--edge)', borderRadius: 10, background: 'var(--surface-panel)', padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(0,61,165,0.08)', color: 'var(--color-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 850, color: 'var(--color-text-primary)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
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
        marginBottom: -1,
      }}
    >
      {children}
    </button>
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
    return <EmptyState title="No approval requests" detail="Campaign participation and private data requests will appear here." />
  }

  return (
    <div style={tableStyle}>
      <Header columns="1fr 1fr 1fr 0.75fr 96px" labels={['Request', 'Target', 'Fields', 'Status', '']} />
      {requests.map(request => (
        <div key={request.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.75fr 96px', minHeight: 62, alignItems: 'center', borderBottom: '1px solid var(--divider)' }}>
          <Cell primary={titleCase(request.request_type)} secondary={request.requested_by_label} />
          <Cell primary={request.contact_label ?? request.campaign_label ?? 'Request'} secondary={request.reason ?? formatDate(request.created_at)} />
          <Cell primary={`${request.requested_field_scopes.length} groups`} secondary={request.requested_field_scopes.map(titleCase).join(', ')} />
          <div style={{ padding: '10px 12px' }}><StatusPill status={request.status} /></div>
          <Actions disabled={request.status !== 'pending'} onApprove={() => onResolve(request, 'approved')} onReject={() => onResolve(request, 'rejected')} />
        </div>
      ))}
    </div>
  )
}

function ContactProposalsTable({
  proposals,
  onResolve,
}: {
  proposals: CollaborationContactProposal[]
  onResolve: (proposal: CollaborationContactProposal, status: 'approved' | 'rejected') => void
}) {
  if (proposals.length === 0) {
    return <EmptyState title="No contact proposals" detail="External or campaign-specific proposed contacts will appear here for review." />
  }

  return (
    <div style={tableStyle}>
      <Header columns="1fr 1fr 1fr 0.75fr 96px" labels={['Contact', 'Campaign', 'Proposed by', 'Status', '']} />
      {proposals.map(proposal => (
        <div key={proposal.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.75fr 96px', minHeight: 62, alignItems: 'center', borderBottom: '1px solid var(--divider)' }}>
          <Cell primary={String(proposal.contact_payload.name ?? 'New contact')} secondary={String(proposal.contact_payload.company ?? proposal.contact_payload.email ?? formatDate(proposal.created_at))} />
          <Cell primary={proposal.campaign_label ?? 'General proposal'} secondary={proposal.matched_contact_id ? 'Possible match found' : 'No match linked'} />
          <Cell primary={proposal.proposed_by_label} secondary={proposal.review_note ?? ''} />
          <div style={{ padding: '10px 12px' }}><StatusPill status={proposal.status} /></div>
          <Actions disabled={proposal.status !== 'pending'} onApprove={() => onResolve(proposal, 'approved')} onReject={() => onResolve(proposal, 'rejected')} />
        </div>
      ))}
    </div>
  )
}

function Header({ columns, labels }: { columns: string; labels: string[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: columns, minHeight: 38, alignItems: 'center', background: 'var(--tint)', borderBottom: '1px solid var(--edge)' }}>
      {labels.map((label, index) => <div key={`${label}-${index}`} style={headerCellStyle}>{label}</div>)}
    </div>
  )
}

function Cell({ primary, secondary }: { primary: string; secondary?: string }) {
  return (
    <div style={{ padding: '10px 12px', minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 750, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{primary}</div>
      {secondary && <div style={{ marginTop: 3, fontSize: 11, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{secondary}</div>}
    </div>
  )
}

function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={event => onChange(event.target.value)} style={inputStyle}>
      {children}
    </select>
  )
}

function StatusPill({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const style = status === 'approved'
    ? ['rgba(37,180,57,0.10)', 'var(--color-brand)']
    : status === 'rejected'
      ? ['rgba(225,29,72,0.10)', 'var(--health-fading)']
      : ['rgba(245,166,35,0.14)', '#a16207']

  return (
    <span style={{ display: 'inline-flex', minHeight: 22, alignItems: 'center', padding: '0 8px', borderRadius: 999, background: style[0], color: style[1], fontSize: 11, fontWeight: 750 }}>
      {titleCase(status)}
    </span>
  )
}

function TagPill({ tone, children }: { tone: 'green' | 'yellow' | 'red' | 'gray' | 'blue'; children: React.ReactNode }) {
  const style = {
    green: ['rgba(37,180,57,0.10)', 'var(--color-brand)'],
    yellow: ['rgba(245,166,35,0.14)', '#a16207'],
    red: ['rgba(225,29,72,0.10)', 'var(--health-fading)'],
    gray: ['var(--tint)', 'var(--color-text-tertiary)'],
    blue: ['rgba(0,61,165,0.08)', 'var(--color-brand)'],
  }[tone]

  return (
    <span style={{ display: 'inline-flex', minHeight: 22, alignItems: 'center', padding: '0 8px', borderRadius: 999, background: style[0], color: style[1], fontSize: 11, fontWeight: 750, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

function Actions({ disabled, onApprove, onReject }: { disabled: boolean; onApprove: () => void; onReject: () => void }) {
  return (
    <div style={{ padding: '10px 12px', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
      <IconButton label="Approve" disabled={disabled} onClick={onApprove}><Check size={14} /></IconButton>
      <IconButton label="Reject" disabled={disabled} onClick={onReject}><X size={14} /></IconButton>
    </div>
  )
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} style={{ ...iconButtonStyle, opacity: disabled ? 0.45 : 1, cursor: disabled ? 'default' : 'pointer' }}>
      {children}
    </button>
  )
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div style={{ border: '1px solid var(--edge)', borderRadius: 10, background: 'var(--surface-panel)', padding: 22, textAlign: 'center' }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{detail}</div>
    </div>
  )
}

const tableStyle: React.CSSProperties = {
  border: '1px solid var(--edge)',
  borderRadius: 10,
  background: 'var(--surface-panel)',
  overflowX: 'auto',
  overflowY: 'hidden',
}

const inputWrapStyle: React.CSSProperties = {
  width: '100%',
  height: 38,
  borderRadius: 8,
  border: '1px solid var(--edge)',
  background: 'var(--surface-panel)',
  boxSizing: 'border-box',
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

const headerCellStyle: React.CSSProperties = {
  padding: '0 12px',
  fontSize: 11,
  fontWeight: 850,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--color-text-tertiary)',
}

const noticeStyle: React.CSSProperties = {
  border: '1px solid var(--edge)',
  borderRadius: 8,
  padding: 10,
  fontSize: 12,
  marginBottom: 12,
}

const iconButtonStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: '1px solid var(--edge)',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}
