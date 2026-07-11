import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, KeyRound, Plus, Search, Trash2, UserPlus, X } from 'lucide-react'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { getCampaigns, getCategories, getContacts, getPods } from '@/lib/data'
import { getUserConnections, type UserConnection } from '@/lib/connections'
import type { Campaign, Category, Contact, Pod } from '@/lib/types'
import { ContactDetail, type ContactDetailShareAccess } from '@/components/contacts/ContactDetail'
import {
  DEFAULT_SHARED_CONTACT_VISIBLE_FIELD_IDS,
  deriveSharedContactFieldScopes,
  SHARED_CONTACT_VISIBLE_FIELD_GROUPS,
  type SharedContactVisibleFieldId,
} from '@/lib/sharedContactVisibleFields'
import {
  createCollaborationAccessGrant,
  deleteCollaborationAccessGrant,
  dismissCollaborationPublicCampaignLink,
  getCollaborationAccessGrants,
  getCollaborationApprovalRequests,
  getIncomingCollaborationAccessGrants,
  getCollaborationPublicCampaignLinks,
  getSharedContactsWithMe,
  removeCollaborationAccessGrant,
  respondIncomingCollaborationAccessGrant,
  resolveSharedContactChangeRequest,
  revokeCollaborationPublicCampaignLink,
  updateCollaborationAccessGrant,
  type CollaborationAccessGrant,
  type CollaborationApprovalRequest,
  type CollaborationFieldScope,
  type CollaborationPermissionLevel,
  type CollaborationPublicCampaignLink,
  type CollaborationResourceType,
  type CollaborationSubjectType,
  type SharedContactAccessSnapshot,
} from '@/lib/collaboration'
import type { CampaignContactSnapshot } from '@/lib/collaborationPolicy'

type SharedSourceFilter = 'all' | 'campaign' | 'pod' | 'sub_pod' | 'direct' | 'public_link'
type SharedStatusFilter = 'all' | 'pending' | 'accepted' | 'removed'
type ShareMode = 'contact' | 'company' | 'pod' | 'sub_pod' | 'campaign'
type ShareResourceOption = {
  id: string
  label: string
  mode: ShareMode
  resourceType: CollaborationResourceType
  description?: string
}
type ShareUserOption = {
  id: string
  user_id: string
  display_name: string | null
  email: string | null
  source: 'connection'
}
type SharedContactRow = {
  id: string
  contactId: string | null
  contact: Contact | null
  contactName: string
  company: string | null
  shareDirection: 'shared_with_me' | 'shared_by_me' | 'public_link'
  shareAccess?: ContactDetailShareAccess
  sourceType: Exclude<SharedSourceFilter, 'all'>
  sourceLabel: string
  campaignId: string | null
  podIds: string[]
  subPodIds: string[]
  sharedWith: string
  permissionLabel: string
  permissionValue: CollaborationPermissionLevel | 'public_link'
  fieldScopes: CollaborationFieldScope[]
  status: 'active' | 'pending' | 'declined' | 'expired' | 'revoked'
  expiresAt: string | null
  createdAt: string
  revokeKind: 'grant' | 'public_link' | 'incoming_grant'
  revokeId: string
  canRevoke: boolean
  incomingGrant?: CollaborationAccessGrant
}

type SharedRequestFeedback = {
  id: number
  tone: 'success' | 'warning' | 'error'
  message: string
}

type ContactPatchRecord = Record<string, unknown>

const SHARED_STRUCTURE_RESOLUTION_PATCH_KEY = '__shared_structure_resolution'

const PERMISSION_OPTIONS: Array<{ value: 'all' | CollaborationPermissionLevel | 'public_link'; label: string }> = [
  { value: 'all', label: 'All permissions' },
  { value: 'view', label: 'Reader' },
  { value: 'suggest', label: 'Editor (request)' },
  { value: 'edit', label: 'Editor' },
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

const STATUS_OPTIONS: Array<{ value: SharedStatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'removed', label: 'Removed' },
]

const SHARE_MODE_OPTIONS: Array<{ value: ShareMode; label: string; description: string }> = [
  { value: 'contact', label: 'Individual contact', description: 'Share one relationship record.' },
  { value: 'company', label: 'Company', description: 'Share a company and linked people.' },
  { value: 'pod', label: 'Pod', description: 'Share everyone in a pod.' },
  { value: 'sub_pod', label: 'Sub-pod', description: 'Share everyone in a sub-pod.' },
  { value: 'campaign', label: 'Campaign', description: 'Share selected campaign contacts.' },
]

const SUBJECT_TYPES: Array<{ value: CollaborationSubjectType; label: string }> = [
  { value: 'user', label: 'User' },
  { value: 'team', label: 'Team' },
  { value: 'organization', label: 'Organization' },
  { value: 'public_link', label: 'Public link reviewer' },
]

const CREATE_PERMISSION_OPTIONS: Array<{ value: CollaborationPermissionLevel; label: string }> = [
  { value: 'view', label: 'Reader' },
  { value: 'suggest', label: 'Editor (request)' },
  { value: 'edit', label: 'Editor' },
]

const EXPIRATION_OPTIONS: Array<{ label: string; days: number | null }> = [
  { label: 'No expiration', days: null },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

function titleCase(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function shareUserSourceLabel(): string {
  return 'Connection'
}

function shareUserOptionLabel(user: ShareUserOption): string {
  const name = user.display_name || 'User'
  const email = user.email || 'No email'
  return `${name} - ${email} - ${shareUserSourceLabel()}`
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function permissionLabel(value: CollaborationPermissionLevel | 'public_link', publicPermissions?: string[]): string {
  if (value === 'view') return 'Reader'
  if (value === 'comment') return 'Commenter'
  if (value === 'suggest') return 'Editor (request)'
  if (value === 'edit') return 'Editor'
  if (value === 'approve') return 'Approver'
  if (value === 'admin') return 'Editor'
  if (publicPermissions?.length) return publicPermissions.map(titleCase).join(', ')
  return 'Public link'
}

function fieldChangeLabel(value: string): string {
  const visibleLabel = SHARED_CONTACT_VISIBLE_FIELD_GROUPS
    .flatMap(group => group.fields)
    .find(field => field.id === value)?.label
  return visibleLabel ?? titleCase(value)
}

function formatPatchValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  if (Array.isArray(value)) return value.length > 0 ? value.map(item => String(item)).join(', ') : '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function pickPatchFields(patch: ContactPatchRecord, fieldKeys: string[]): ContactPatchRecord {
  return fieldKeys.reduce<ContactPatchRecord>((next, key) => {
    next[key] = patch[key]
    return next
  }, {})
}

function publicContactPatchFields(patch: ContactPatchRecord): string[] {
  return Object.keys(patch).filter(key => key !== SHARED_STRUCTURE_RESOLUTION_PATCH_KEY)
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

function grantAccessStatus(grant: CollaborationAccessGrant): SharedContactRow['status'] {
  if (grant.status === 'pending') return 'pending'
  if (grant.status === 'declined') return 'declined'
  return accessStatus(grant.expires_at, grant.revoked_at)
}

function sharedStatusFilterValue(status: SharedContactRow['status']): Exclude<SharedStatusFilter, 'all'> {
  if (status === 'pending') return 'pending'
  if (status === 'active') return 'accepted'
  return 'removed'
}

function sharedStatusLabel(status: SharedContactRow['status']): string {
  return STATUS_OPTIONS.find(option => option.value === sharedStatusFilterValue(status))?.label ?? titleCase(status)
}

function sharedStatusTone(status: SharedContactRow['status']): 'green' | 'yellow' | 'red' {
  if (sharedStatusFilterValue(status) === 'accepted') return 'green'
  if (sharedStatusFilterValue(status) === 'pending') return 'yellow'
  return 'red'
}

function contactFromMap(contactMap: Map<string, Contact>, contactId: string | null | undefined): Contact | null {
  if (!contactId) return null
  return contactMap.get(contactId) ?? null
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function rowsForGrant(
  grant: CollaborationAccessGrant,
  contacts: Contact[],
  contactMap: Map<string, Contact>,
  campaignMap: Map<string, Campaign>,
): SharedContactRow[] {
  const status = grantAccessStatus(grant)
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
    canRevoke: true,
  }

  const makeRow = (contact: Contact, sourceType: SharedContactRow['sourceType'], sourceLabel = grant.resource_label, campaignId: string | null = null): SharedContactRow => ({
    ...base,
    id: `${grant.id}-${contact.id}-${sourceType}`,
    contactId: contact.id,
    contact,
    contactName: contact.name,
    company: contact.company,
    shareDirection: 'shared_by_me',
    shareAccess: {
      direction: 'shared_by_me',
      grantId: grant.id,
      sourceLabel,
      sharedWith: grant.subject_label,
      permissionLevel: grant.permission_level,
      permissionLabel: permissionLabel(grant.permission_level),
      fieldScopes: grant.field_scopes,
      visibleFieldIds: grant.visible_field_ids,
    },
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
    const podContacts = contacts.filter(contact => Boolean(grant.resource_id && contact.list_ids.includes(grant.resource_id)))
    const subPodContacts = contacts.filter(contact => Boolean(grant.resource_id && contact.category_ids.includes(grant.resource_id)))
    const targetContacts = podContacts.length > 0 ? podContacts : subPodContacts
    const sourceType = podContacts.length > 0 ? 'pod' : 'sub_pod'
    return targetContacts.map(contact => makeRow(contact, sourceType))
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
    contact: null,
    contactName: snapshot.name,
    company: snapshot.company,
    shareDirection: 'public_link',
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
    canRevoke: true,
  }))
}

function rowsForIncomingSharedContact(snapshot: SharedContactAccessSnapshot): SharedContactRow {
  const sourceType = sourceTypeForSharedResource(snapshot.resource_type, snapshot.resource_label)

  return {
    id: `${snapshot.grant_id}-${snapshot.contact.id}-incoming`,
    contactId: snapshot.contact.id,
    contact: snapshot.contact,
    contactName: snapshot.contact.name,
    company: snapshot.contact.company,
    shareDirection: 'shared_with_me',
    shareAccess: {
      direction: 'shared_with_me',
      grantId: snapshot.grant_id,
      sourceLabel: snapshot.resource_label,
      sharedWith: snapshot.created_by_label || snapshot.created_by_email || 'Shared contact owner',
      permissionLevel: snapshot.permission_level,
      permissionLabel: permissionLabel(snapshot.permission_level),
      fieldScopes: snapshot.field_scopes,
      visibleFieldIds: snapshot.visible_field_ids,
    },
    sourceType,
    sourceLabel: snapshot.resource_label,
    campaignId: snapshot.resource_type === 'campaign' ? snapshot.resource_id : null,
    podIds: snapshot.contact.list_ids,
    subPodIds: snapshot.contact.category_ids,
    sharedWith: 'You',
    permissionLabel: permissionLabel(snapshot.permission_level),
    permissionValue: snapshot.permission_level,
    fieldScopes: snapshot.field_scopes,
    status: accessStatus(snapshot.expires_at),
    expiresAt: snapshot.expires_at,
    createdAt: snapshot.created_at,
    revokeKind: 'incoming_grant',
    revokeId: snapshot.grant_id,
    canRevoke: false,
  }
}

function sourceTypeForSharedResource(resourceType: CollaborationResourceType, resourceLabel: string): SharedContactRow['sourceType'] {
  if (resourceType === 'campaign') return 'campaign'
  if (resourceType === 'pod' && resourceLabel.toLowerCase().startsWith('sub-pod:')) return 'sub_pod'
  if (resourceType === 'pod') return 'pod'
  return 'direct'
}

function rowForIncomingSharedRequest(grant: CollaborationAccessGrant): SharedContactRow {
  const sourceType = sourceTypeForSharedResource(grant.resource_type, grant.resource_label)
  const sharedBy = grant.created_by_label || grant.created_by_email || 'Shared contact owner'

  return {
    id: `${grant.id}-incoming-request`,
    contactId: null,
    contact: null,
    contactName: grant.resource_label,
    company: grant.created_by_email,
    shareDirection: 'shared_with_me',
    sourceType,
    sourceLabel: grant.resource_label,
    campaignId: grant.resource_type === 'campaign' ? grant.resource_id : null,
    podIds: [],
    subPodIds: [],
    sharedWith: sharedBy,
    permissionLabel: permissionLabel(grant.permission_level),
    permissionValue: grant.permission_level,
    fieldScopes: grant.field_scopes,
    status: grantAccessStatus(grant),
    expiresAt: grant.expires_at,
    createdAt: grant.created_at,
    revokeKind: 'incoming_grant',
    revokeId: grant.id,
    canRevoke: false,
    incomingGrant: grant,
  }
}

function uniqueSharedActionRows(rows: SharedContactRow[]): SharedContactRow[] {
  const seen = new Set<string>()
  return rows.filter(row => {
    const key = `${row.revokeKind}:${row.revokeId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function ApprovalsPage() {
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pods, setPods] = useState<Pod[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [connections, setConnections] = useState<UserConnection[]>([])
  const [grants, setGrants] = useState<CollaborationAccessGrant[]>([])
  const [incomingGrants, setIncomingGrants] = useState<CollaborationAccessGrant[]>([])
  const [incomingSharedContacts, setIncomingSharedContacts] = useState<SharedContactAccessSnapshot[]>([])
  const [publicLinks, setPublicLinks] = useState<CollaborationPublicCampaignLink[]>([])
  const [approvalRequests, setApprovalRequests] = useState<CollaborationApprovalRequest[]>([])
  const [showShareModal, setShowShareModal] = useState(false)
  const [showPendingRequestsModal, setShowPendingRequestsModal] = useState(false)
  const [sourceFilter, setSourceFilter] = useState<SharedSourceFilter>('all')
  const [campaignFilter, setCampaignFilter] = useState('all')
  const [podFilter, setPodFilter] = useState('all')
  const [subPodFilter, setSubPodFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<SharedStatusFilter>('all')
  const [permissionFilter, setPermissionFilter] = useState<'all' | CollaborationPermissionLevel | 'public_link'>('all')
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busySharedRequestId, setBusySharedRequestId] = useState<string | null>(null)
  const [highlightedSharedRequestId, setHighlightedSharedRequestId] = useState<string | null>(null)
  const [sharedRequestFeedback, setSharedRequestFeedback] = useState<SharedRequestFeedback | null>(null)
  const [selectedSharedContact, setSelectedSharedContact] = useState<{ contact: Contact; shareAccess: ContactDetailShareAccess } | null>(null)
  const [editingGrant, setEditingGrant] = useState<CollaborationAccessGrant | null>(null)
  const [selectedSharedRowIds, setSelectedSharedRowIds] = useState<Set<string>>(() => new Set())
  const [busySharedRowIds, setBusySharedRowIds] = useState<Set<string>>(() => new Set())
  const [busySharedBulkAction, setBusySharedBulkAction] = useState<'remove' | 'delete' | null>(null)
  const [busyContactChangeRequestId, setBusyContactChangeRequestId] = useState<string | null>(null)
  const sharedContactManagerRef = useRef<HTMLElement | null>(null)
  const sharedRequestFeedbackTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  const pendingContactChangeRequests = useMemo(() => (
    approvalRequests.filter(request => request.request_type === 'shared_contact_change' && request.status === 'pending')
  ), [approvalRequests])
  const contactMap = useMemo(() => new Map(contacts.map(contact => [contact.id, contact])), [contacts])
  const campaignMap = useMemo(() => new Map(campaigns.map(campaign => [campaign.id, campaign])), [campaigns])
  const sharedRows = useMemo(() => {
    const grantRows = grants.flatMap(grant => rowsForGrant(grant, contacts, contactMap, campaignMap))
    const incomingRows = incomingSharedContacts.map(rowsForIncomingSharedContact)
    const incomingRequestRows = incomingGrants
      .filter(grant => !(grant.status === 'accepted' && accessStatus(grant.expires_at, grant.revoked_at) === 'active'))
      .map(rowForIncomingSharedRequest)
    const linkRows = publicLinks.flatMap(rowsForPublicLink)
    return [...grantRows, ...incomingRows, ...incomingRequestRows, ...linkRows]
  }, [campaignMap, contactMap, contacts, grants, incomingGrants, incomingSharedContacts, publicLinks])
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
      if (statusFilter !== 'all' && sharedStatusFilterValue(row.status) !== statusFilter) return false
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
  }, [campaignFilter, permissionFilter, podFilter, searchText, sharedRows, sourceFilter, statusFilter, subPodFilter])
  const selectedSharedRows = useMemo(
    () => filteredSharedRows.filter(row => selectedSharedRowIds.has(row.id)),
    [filteredSharedRows, selectedSharedRowIds],
  )
  const shareUsers = useMemo<ShareUserOption[]>(() => {
    const byUserId = new Map<string, ShareUserOption>()
    connections
      .filter(connection => connection.status === 'accepted')
      .forEach(connection => {
        if (byUserId.has(connection.connected_user_id)) return
        byUserId.set(connection.connected_user_id, {
          id: `connection-${connection.id}`,
          user_id: connection.connected_user_id,
          display_name: connection.connected_display_name,
          email: connection.connected_email,
          source: 'connection',
        })
      })
    return [...byUserId.values()].sort((a, b) => (
      (a.display_name || a.email || '').localeCompare(b.display_name || b.email || '')
    ))
  }, [connections])
  const shareResourceOptions = useMemo<ShareResourceOption[]>(() => {
    const people = contacts
      .filter(contact => contact.type !== 'Company')
      .map(contact => ({
        id: contact.id,
        label: contact.name,
        mode: 'contact' as const,
        resourceType: 'contact' as const,
        description: [contact.company, contact.email].filter(Boolean).join(' - ') || 'Relationship contact',
      }))
    const companies = contacts
      .filter(contact => contact.type === 'Company')
      .map(company => ({
        id: company.id,
        label: company.name,
        mode: 'company' as const,
        resourceType: 'company' as const,
        description: company.domain ?? company.industry ?? 'Company record',
      }))
    const podOptions = pods.map(pod => ({
      id: pod.id,
      label: pod.name,
      mode: 'pod' as const,
      resourceType: 'pod' as const,
      description: 'Pod contacts',
    }))
    const subPodOptions = categories.map(category => {
      const parentPod = pods.find(pod => pod.id === category.list_id)
      return {
        id: category.id,
        label: category.name,
        mode: 'sub_pod' as const,
        resourceType: 'pod' as const,
        description: parentPod ? `${parentPod.name} sub-pod` : 'Sub-pod contacts',
      }
    })
    const campaignOptions = campaigns.map(campaign => ({
      id: campaign.id,
      label: campaign.name,
      mode: 'campaign' as const,
      resourceType: 'campaign' as const,
      description: `${titleCase(campaign.type)} campaign`,
    }))

    return [...people, ...companies, ...podOptions, ...subPodOptions, ...campaignOptions]
  }, [campaigns, categories, contacts, pods])

  const loadData = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    setError('')
    try {
      const [
        nextContacts,
        nextPods,
        nextCategories,
        nextCampaigns,
        nextConnections,
        nextGrants,
        nextIncomingGrants,
        nextIncomingSharedContacts,
        nextPublicLinks,
        nextApprovalRequests,
      ] = await Promise.all([
        getContacts(),
        getPods(),
        getCategories(),
        getCampaigns(),
        getUserConnections(),
        getCollaborationAccessGrants(workspaceId),
        getIncomingCollaborationAccessGrants(),
        getSharedContactsWithMe(),
        getCollaborationPublicCampaignLinks(workspaceId),
        getCollaborationApprovalRequests(workspaceId),
      ])
      const activeContacts = nextContacts.filter(contact => contact.status !== 'Archived')
      setContacts(activeContacts)
      setPods(nextPods)
      setCategories(nextCategories)
      setCampaigns(nextCampaigns.filter(campaign => campaign.status !== 'hidden'))
      setConnections(nextConnections)
      setGrants(nextGrants)
      setIncomingGrants(nextIncomingGrants)
      setIncomingSharedContacts(nextIncomingSharedContacts)
      setPublicLinks(nextPublicLinks)
      setApprovalRequests(nextApprovalRequests)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shared contacts')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => () => {
    if (sharedRequestFeedbackTimer.current) window.clearTimeout(sharedRequestFeedbackTimer.current)
  }, [])

  useEffect(() => {
    const visibleRowIds = new Set(filteredSharedRows.map(row => row.id))
    setSelectedSharedRowIds(current => {
      const next = new Set([...current].filter(id => visibleRowIds.has(id)))
      return next.size === current.size ? current : next
    })
  }, [filteredSharedRows])

  useEffect(() => {
    if (!workspaceId || loading) return

    let cancelled = false

    async function refreshSharedContactData() {
      if (document.visibilityState === 'hidden') return

      try {
        const [nextConnections, nextIncomingGrants, nextIncomingSharedContacts, nextApprovalRequests] = await Promise.all([
          getUserConnections(),
          getIncomingCollaborationAccessGrants(),
          getSharedContactsWithMe(),
          getCollaborationApprovalRequests(workspaceId),
        ])
        if (cancelled) return

        setConnections(nextConnections)
        setIncomingGrants(nextIncomingGrants)
        setIncomingSharedContacts(nextIncomingSharedContacts)
        setApprovalRequests(nextApprovalRequests)

      } catch (err) {
        if (!cancelled) console.warn('Failed to refresh shared contact requests', err)
      }
    }

    const intervalId = window.setInterval(() => {
      void refreshSharedContactData()
    }, 15000)
    const handleFocus = () => {
      void refreshSharedContactData()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refreshSharedContactData()
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [loading, workspaceId])

  async function handleRespondSharedRequest(grant: CollaborationAccessGrant, status: 'accepted' | 'declined') {
    if (busySharedRequestId) return

    const message = status === 'accepted'
      ? `${grant.resource_label} accepted and added to Shared contact manager.`
      : `${grant.resource_label} declined.`

    setBusySharedRequestId(grant.id)
    setHighlightedSharedRequestId(null)
    setSharedRequestFeedback(null)
    setError('')

    try {
      const updatedGrant = await respondIncomingCollaborationAccessGrant(grant.id, status)
      setIncomingGrants(current => current.map(item => (
        item.id === grant.id ? { ...item, ...updatedGrant } : item
      )))

      if (status === 'accepted') {
        setSourceFilter('all')
        setCampaignFilter('all')
        setPodFilter('all')
        setSubPodFilter('all')
        setStatusFilter('accepted')
        setPermissionFilter('all')
        setSearchText(grant.resource_label)
      } else {
        setStatusFilter('removed')
        setSearchText(grant.resource_label)
      }

      await loadData()

      setHighlightedSharedRequestId(grant.id)
      setSharedRequestFeedback({
        id: Date.now(),
        tone: status === 'accepted' ? 'success' : 'warning',
        message,
      })

      if (sharedRequestFeedbackTimer.current) window.clearTimeout(sharedRequestFeedbackTimer.current)
      sharedRequestFeedbackTimer.current = window.setTimeout(() => {
        setSharedRequestFeedback(null)
        setHighlightedSharedRequestId(null)
      }, 4500)

      if (status === 'accepted') {
        window.requestAnimationFrame(() => {
          sharedContactManagerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
    } catch (err) {
      setSharedRequestFeedback({
        id: Date.now(),
        tone: 'error',
        message: err instanceof Error ? err.message : 'Could not update shared request.',
      })
    } finally {
      setBusySharedRequestId(null)
    }
  }

  async function handleResolveContactChangeRequest(
    request: CollaborationApprovalRequest,
    status: 'approved' | 'rejected',
    approvedPatch: ContactPatchRecord,
  ) {
    if (busyContactChangeRequestId) return

    setBusyContactChangeRequestId(request.id)
    setSharedRequestFeedback(null)
    setError('')

    try {
      await resolveSharedContactChangeRequest(request.id, status, approvedPatch)
      await loadData()
      setSharedRequestFeedback({
        id: Date.now(),
        tone: status === 'approved' ? 'success' : 'warning',
        message: status === 'approved' ? 'Contact change request approved.' : 'Contact change request rejected.',
      })

      if (sharedRequestFeedbackTimer.current) window.clearTimeout(sharedRequestFeedbackTimer.current)
      sharedRequestFeedbackTimer.current = window.setTimeout(() => {
        setSharedRequestFeedback(null)
      }, 4500)
    } catch (err) {
      setSharedRequestFeedback({
        id: Date.now(),
        tone: 'error',
        message: err instanceof Error ? err.message : 'Could not update contact change request.',
      })
    } finally {
      setBusyContactChangeRequestId(null)
    }
  }

  function toggleSharedRowSelection(rowId: string) {
    setSelectedSharedRowIds(current => {
      const next = new Set(current)
      if (next.has(rowId)) {
        next.delete(rowId)
      } else {
        next.add(rowId)
      }
      return next
    })
  }

  function toggleAllVisibleSharedRows() {
    setSelectedSharedRowIds(current => {
      const visibleIds = filteredSharedRows.map(row => row.id)
      const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => current.has(id))
      const next = new Set(current)
      if (allVisibleSelected) {
        visibleIds.forEach(id => next.delete(id))
      } else {
        visibleIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  async function removeSharedRowAccess(row: SharedContactRow) {
    if (!['active', 'pending'].includes(row.status)) return

    if (row.revokeKind === 'public_link') {
      if (!workspaceId) return
      await revokeCollaborationPublicCampaignLink(row.revokeId, workspaceId)
      return
    }

    if (row.revokeKind === 'incoming_grant' && row.incomingGrant && row.status === 'pending') {
      await respondIncomingCollaborationAccessGrant(row.revokeId, 'declined')
      return
    }

    await removeCollaborationAccessGrant(row.revokeId)
  }

  async function deleteSharedRowHistory(row: SharedContactRow) {
    if (row.revokeKind === 'public_link') {
      if (!workspaceId) return
      await dismissCollaborationPublicCampaignLink(row.revokeId, workspaceId)
      return
    }

    await deleteCollaborationAccessGrant(row.revokeId)
  }

  async function runSharedRowsAction(rows: SharedContactRow[], action: 'remove' | 'delete') {
    if (rows.length === 0 || busySharedBulkAction) return

    const rowIds = rows.map(row => row.id)
    setBusySharedBulkAction(action)
    setBusySharedRowIds(current => new Set([...current, ...rowIds]))
    setError('')

    try {
      for (const row of uniqueSharedActionRows(rows)) {
        if (action === 'remove') {
          await removeSharedRowAccess(row)
        } else {
          await deleteSharedRowHistory(row)
        }
      }

      setSelectedSharedRowIds(current => {
        const next = new Set(current)
        rowIds.forEach(id => next.delete(id))
        return next
      })
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} selected shares`)
    } finally {
      setBusySharedBulkAction(null)
      setBusySharedRowIds(current => {
        const next = new Set(current)
        rowIds.forEach(id => next.delete(id))
        return next
      })
    }
  }

  async function handleRevokeSharedRow(row: SharedContactRow) {
    await runSharedRowsAction([row], 'remove')
  }

  async function handleDeleteSharedRow(row: SharedContactRow) {
    await runSharedRowsAction([row], 'delete')
  }

  function handleEditSharedRow(row: SharedContactRow) {
    if (row.revokeKind !== 'grant' || !['active', 'pending'].includes(row.status)) return
    const grant = grants.find(item => item.id === row.revokeId)
    if (grant) setEditingGrant(grant)
  }

  function handleOpenSharedContact(row: SharedContactRow) {
    if (!row.contact || !row.shareAccess) return
    setSelectedSharedContact({ contact: row.contact, shareAccess: row.shareAccess })
  }

  async function handleSharedAccessUpdated(updatedGrant: CollaborationAccessGrant) {
    setGrants(current => current.map(grant => (grant.id === updatedGrant.id ? updatedGrant : grant)))
    setEditingGrant(null)
    await loadData()
  }

  function handleSharedContactSaved(updated: Contact) {
    setContacts(current => current.map(contact => contact.id === updated.id ? updated : contact))
    setSelectedSharedContact(current => current ? { ...current, contact: updated } : current)
  }

  function handleSharedContactDeleted() {
    const deletedId = selectedSharedContact?.contact.id
    if (deletedId) setContacts(current => current.filter(contact => contact.id !== deletedId))
    setSelectedSharedContact(null)
    void loadData()
  }

  return (
    <main className="content-enter" style={{ padding: '32px clamp(16px, 4vw, 36px) 80px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 28, fontWeight: 850 }}>
            Shared contacts
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--color-text-tertiary)', fontSize: 13, lineHeight: 1.5 }}>
            Manage shared contacts, permissions, public links, campaign access, and share requests from one place.
          </p>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 360px)', gap: 10, marginBottom: 18 }}>
        <SummaryCard
          icon={<UserPlus size={16} />}
          label="Pending requests"
          value={pendingContactChangeRequests.length}
          onClick={() => setShowPendingRequestsModal(true)}
        />
      </section>

      <section ref={sharedContactManagerRef} style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 850, color: 'var(--color-text-primary)' }}>
              Shared contact manager
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.45 }}>
              Filter active shares by campaigns, pods, sub-pods, public links, direct contacts, and permission level.
            </p>
            <button type="button" onClick={() => setShowShareModal(true)} style={{ ...headerShareButtonStyle, marginTop: 10 }}>
              <Plus size={15} />
              Share contacts
            </button>
          </div>
        </div>

        <SharedContactFilters
          searchText={searchText}
          sourceFilter={sourceFilter}
          campaignFilter={campaignFilter}
          podFilter={podFilter}
          subPodFilter={subPodFilter}
          statusFilter={statusFilter}
          permissionFilter={permissionFilter}
          campaigns={campaigns}
          pods={pods}
          categories={categories}
          onSearchTextChange={setSearchText}
          onSourceFilterChange={setSourceFilter}
          onCampaignFilterChange={setCampaignFilter}
          onPodFilterChange={setPodFilter}
          onSubPodFilterChange={setSubPodFilter}
          onStatusFilterChange={setStatusFilter}
          onPermissionFilterChange={setPermissionFilter}
        />
      </section>

      {sharedRequestFeedback && (
        <SharedRequestFeedbackBanner key={sharedRequestFeedback.id} feedback={sharedRequestFeedback} />
      )}

      {error && <div style={{ ...noticeStyle, color: 'var(--health-fading)' }}>{error}</div>}

      <SharedContactBulkActions
        selectedCount={selectedSharedRows.length}
        busyAction={busySharedBulkAction}
        onRemoveSelected={() => runSharedRowsAction(selectedSharedRows, 'remove')}
        onDeleteSelected={() => runSharedRowsAction(selectedSharedRows, 'delete')}
      />

      {loading ? (
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, padding: 24 }}>Loading...</div>
      ) : (
        <SharedContactsTable
          rows={filteredSharedRows}
          selectedRowIds={selectedSharedRowIds}
          busyRowIds={busySharedRowIds}
          onToggleRow={toggleSharedRowSelection}
          onToggleAllRows={toggleAllVisibleSharedRows}
          onRevoke={handleRevokeSharedRow}
          onDelete={handleDeleteSharedRow}
          onEditAccess={handleEditSharedRow}
          onOpenContact={handleOpenSharedContact}
          busyRequestId={busySharedRequestId}
          highlightedRequestId={highlightedSharedRequestId}
          onRespondSharedRequest={handleRespondSharedRequest}
        />
      )}

      {showShareModal && workspaceId && (
        <ShareContactsModal
          workspaceId={workspaceId}
          users={shareUsers}
          resources={shareResourceOptions}
          onClose={() => setShowShareModal(false)}
          onCreated={async () => {
            setShowShareModal(false)
            await loadData()
          }}
        />
      )}
      {editingGrant && workspaceId && (
        <EditSharedAccessModal
          workspaceId={workspaceId}
          grant={editingGrant}
          onClose={() => setEditingGrant(null)}
          onUpdated={handleSharedAccessUpdated}
        />
      )}
      {selectedSharedContact && (
        <ContactDetail
          contact={selectedSharedContact.contact}
          categoryId={(selectedSharedContact.contact.category_ids ?? [])[0]}
          onClose={() => setSelectedSharedContact(null)}
          onSaved={handleSharedContactSaved}
          onDeleted={handleSharedContactDeleted}
          pods={pods}
          categories={categories}
          sharedAccess={selectedSharedContact.shareAccess}
        />
      )}
      {showPendingRequestsModal && (
        <PendingContactRequestsModal
          requests={pendingContactChangeRequests}
          busyRequestId={busyContactChangeRequestId}
          onClose={() => setShowPendingRequestsModal(false)}
          onResolve={handleResolveContactChangeRequest}
        />
      )}
      <style>
        {`
          @keyframes shared-request-feedback-enter {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes shared-request-row-confirm {
            0% { background: rgba(37, 180, 57, 0.18); }
            100% { background: transparent; }
          }
        `}
      </style>
    </main>
  )
}

function PendingContactRequestsModal({
  requests,
  busyRequestId,
  onClose,
  onResolve,
}: {
  requests: CollaborationApprovalRequest[]
  busyRequestId: string | null
  onClose: () => void
  onResolve: (request: CollaborationApprovalRequest, status: 'approved' | 'rejected', approvedPatch: ContactPatchRecord) => Promise<void>
}) {
  return (
    <Modal title="Pending requests" onClose={onClose}>
      <ContactChangeRequestsPanel
        requests={requests}
        busyRequestId={busyRequestId}
        embedded
        onResolve={onResolve}
      />
    </Modal>
  )
}

function ContactChangeRequestsPanel({
  requests,
  busyRequestId,
  embedded = false,
  onResolve,
}: {
  requests: CollaborationApprovalRequest[]
  busyRequestId: string | null
  embedded?: boolean
  onResolve: (request: CollaborationApprovalRequest, status: 'approved' | 'rejected', approvedPatch: ContactPatchRecord) => Promise<void>
}) {
  if (requests.length === 0) {
    return (
      <MiniEmptyState detail="No pending editor change requests." />
    )
  }

  return (
    <section style={{ marginBottom: embedded ? 0 : 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          {!embedded && (
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 850, color: 'var(--color-text-primary)' }}>
              Change requests
            </h2>
          )}
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.45 }}>
            Review editor updates before they apply to the original contact.
          </p>
        </div>
        <TagPill tone="yellow">{requests.length} pending</TagPill>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {requests.map(request => (
          <ContactChangeRequestCard
            key={request.id}
            request={request}
            busy={busyRequestId === request.id}
            onResolve={onResolve}
          />
        ))}
      </div>
    </section>
  )
}

function ContactChangeRequestCard({
  request,
  busy,
  onResolve,
}: {
  request: CollaborationApprovalRequest
  busy: boolean
  onResolve: (request: CollaborationApprovalRequest, status: 'approved' | 'rejected', approvedPatch: ContactPatchRecord) => Promise<void>
}) {
  const proposedPatch = useMemo(
    () => (request.proposed_contact_patch ?? {}) as ContactPatchRecord,
    [request.proposed_contact_patch],
  )
  const originalSnapshot = useMemo(
    () => (request.original_contact_snapshot ?? {}) as ContactPatchRecord,
    [request.original_contact_snapshot],
  )
  const fieldKeys = useMemo(
    () => publicContactPatchFields(proposedPatch).sort((a, b) => fieldChangeLabel(a).localeCompare(fieldChangeLabel(b))),
    [proposedPatch],
  )
  const [selectedKeys, setSelectedKeys] = useState<string[]>(fieldKeys)

  useEffect(() => {
    setSelectedKeys(fieldKeys)
  }, [fieldKeys, request.id])

  function toggleField(key: string) {
    setSelectedKeys(current => (
      current.includes(key)
        ? current.filter(item => item !== key)
        : [...current, key]
    ))
  }

  const selectedPatch = pickPatchFields(proposedPatch, selectedKeys)
  const fullVisiblePatch = pickPatchFields(proposedPatch, fieldKeys)
  const canApproveSelected = selectedKeys.length > 0 && !busy

  return (
    <div style={{ ...surfaceMiniStyle, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 850, color: 'var(--color-text-primary)' }}>
              {request.contact_label || 'Shared contact'}
            </h3>
            <TagPill tone="blue">Editor request</TagPill>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-tertiary)', fontSize: 12, lineHeight: 1.45 }}>
            Requested by {request.requested_by_label || 'Editor'} on {formatDate(request.created_at)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            disabled={!canApproveSelected}
            onClick={() => onResolve(request, 'approved', selectedPatch)}
            style={{ ...primaryButtonStyle, minHeight: 32, opacity: canApproveSelected ? 1 : 0.55 }}
          >
            <Check size={14} />
            Approve selected
          </button>
          <button
            type="button"
            disabled={busy || fieldKeys.length === 0}
            onClick={() => onResolve(request, 'approved', fullVisiblePatch)}
            style={{ ...secondaryButtonStyle, minHeight: 32, opacity: busy || fieldKeys.length === 0 ? 0.55 : 1 }}
          >
            Approve all
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onResolve(request, 'rejected', {})}
            style={{ ...smallDangerButtonStyle, minHeight: 32, opacity: busy ? 0.55 : 1 }}
          >
            <X size={14} />
            Reject
          </button>
        </div>
      </div>

      {fieldKeys.length === 0 ? (
        <MiniEmptyState detail="No field changes were included in this request." />
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {fieldKeys.map(key => (
            <label
              key={key}
              style={{
                display: 'grid',
                gridTemplateColumns: '18px minmax(120px, 0.8fr) minmax(0, 1fr) minmax(0, 1fr)',
                gap: 10,
                alignItems: 'center',
                border: '1px solid var(--edge)',
                borderRadius: 8,
                background: 'var(--color-bg)',
                padding: '9px 10px',
                cursor: busy ? 'default' : 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={selectedKeys.includes(key)}
                disabled={busy}
                onChange={() => toggleField(key)}
                style={checkboxStyle}
              />
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                {fieldChangeLabel(key)}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={fieldLabelStyle}>Current</span>
                <span style={{ display: 'block', marginTop: 2, color: 'var(--color-text-secondary)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {formatPatchValue(originalSnapshot[key])}
                </span>
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={fieldLabelStyle}>Proposed</span>
                <span style={{ display: 'block', marginTop: 2, color: 'var(--color-text-primary)', fontSize: 12, fontWeight: 750, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {formatPatchValue(proposedPatch[key])}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function MiniEmptyState({ detail }: { detail: string }) {
  return (
    <div style={{ border: '1px dashed var(--edge)', borderRadius: 8, padding: 12, fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center', lineHeight: 1.45 }}>
      {detail}
    </div>
  )
}

function SharedContactFilters({
  searchText,
  sourceFilter,
  campaignFilter,
  podFilter,
  subPodFilter,
  statusFilter,
  permissionFilter,
  campaigns,
  pods,
  categories,
  onSearchTextChange,
  onSourceFilterChange,
  onCampaignFilterChange,
  onPodFilterChange,
  onSubPodFilterChange,
  onStatusFilterChange,
  onPermissionFilterChange,
}: {
  searchText: string
  sourceFilter: SharedSourceFilter
  campaignFilter: string
  podFilter: string
  subPodFilter: string
  statusFilter: SharedStatusFilter
  permissionFilter: 'all' | CollaborationPermissionLevel | 'public_link'
  campaigns: Campaign[]
  pods: Pod[]
  categories: Category[]
  onSearchTextChange: (value: string) => void
  onSourceFilterChange: (value: SharedSourceFilter) => void
  onCampaignFilterChange: (value: string) => void
  onPodFilterChange: (value: string) => void
  onSubPodFilterChange: (value: string) => void
  onStatusFilterChange: (value: SharedStatusFilter) => void
  onPermissionFilterChange: (value: 'all' | CollaborationPermissionLevel | 'public_link') => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.4fr) repeat(6, minmax(140px, 1fr))', gap: 10, alignItems: 'center' }}>
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
      <Select value={statusFilter} onChange={value => onStatusFilterChange(value as SharedStatusFilter)}>
        {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>
      <Select value={permissionFilter} onChange={value => onPermissionFilterChange(value as typeof permissionFilter)}>
        {PERMISSION_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>
    </div>
  )
}

function SharedContactBulkActions({
  selectedCount,
  busyAction,
  onRemoveSelected,
  onDeleteSelected,
}: {
  selectedCount: number
  busyAction: 'remove' | 'delete' | null
  onRemoveSelected: () => void
  onDeleteSelected: () => void
}) {
  if (selectedCount === 0) return null

  const isBusy = Boolean(busyAction)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        border: '1px solid var(--edge)',
        borderRadius: 8,
        background: 'var(--surface-panel)',
        padding: '10px 12px',
        marginBottom: 10,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 750, color: 'var(--color-text-secondary)' }}>
        {selectedCount} selected
      </span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button type="button" disabled={isBusy} onClick={onRemoveSelected} style={{ ...secondaryActionButtonStyle, opacity: isBusy ? 0.55 : 1 }}>
          <X size={14} />
          {busyAction === 'remove' ? 'Removing' : 'Remove selected'}
        </button>
        <button type="button" disabled={isBusy} onClick={onDeleteSelected} style={{ ...dangerActionButtonStyle, opacity: isBusy ? 0.55 : 1 }}>
          <Trash2 size={14} />
          {busyAction === 'delete' ? 'Deleting' : 'Delete selected'}
        </button>
      </div>
    </div>
  )
}

function SharedContactsTable({
  rows,
  selectedRowIds,
  busyRowIds,
  onToggleRow,
  onToggleAllRows,
  onRevoke,
  onDelete,
  onEditAccess,
  onOpenContact,
  busyRequestId,
  highlightedRequestId,
  onRespondSharedRequest,
}: {
  rows: SharedContactRow[]
  selectedRowIds: Set<string>
  busyRowIds: Set<string>
  onToggleRow: (rowId: string) => void
  onToggleAllRows: () => void
  onRevoke: (row: SharedContactRow) => void
  onDelete: (row: SharedContactRow) => void
  onEditAccess: (row: SharedContactRow) => void
  onOpenContact: (row: SharedContactRow) => void
  busyRequestId: string | null
  highlightedRequestId: string | null
  onRespondSharedRequest: (request: CollaborationAccessGrant, status: 'accepted' | 'declined') => void
}) {
  if (rows.length === 0) {
    return <EmptyState title="No shared contacts match this view" detail="Shared campaign contacts, pod contacts, sub-pod contacts, direct contacts, and public links will appear here." />
  }

  const allRowsSelected = rows.length > 0 && rows.every(row => selectedRowIds.has(row.id))
  const gridColumns = '44px 1.1fr 1fr 0.85fr 0.9fr 0.85fr 0.8fr 172px'

  return (
    <div style={tableStyle}>
      <Header
        columns={gridColumns}
        labels={[
          <input
            key="select-all"
            type="checkbox"
            checked={allRowsSelected}
            onChange={onToggleAllRows}
            aria-label="Select all shared contacts"
            style={checkboxStyle}
          />,
          'Contact',
          'Shared through',
          'Shared with',
          'Permission',
          'Fields',
          'Status',
          'Actions',
        ]}
      />
      {rows.map(row => {
        const canOpenContact = Boolean(row.contact && row.shareAccess)
        const canEditAccess = row.revokeKind === 'grant' && row.canRevoke && ['active', 'pending'].includes(row.status)
        const canOpenRow = canEditAccess || canOpenContact
        const isIncomingRequest = row.revokeKind === 'incoming_grant' && row.incomingGrant
        const isBusyRequest = Boolean(isIncomingRequest && busyRequestId === row.revokeId)
        const isBusyRow = busyRowIds.has(row.id)
        const isHighlightedRequest = highlightedRequestId === row.revokeId
        const canRespondRequest = Boolean(
          isIncomingRequest
          && row.status === 'pending'
          && accessStatus(row.expiresAt) === 'active'
          && !busyRequestId
        )
        const canRemoveRow = ['active', 'pending'].includes(row.status)
        const canDeleteRow = row.revokeKind !== 'public_link' || Boolean(row.canRevoke)
        const shareLabel = row.shareDirection === 'shared_with_me'
          ? 'Shared with me'
          : row.shareDirection === 'shared_by_me'
            ? 'Shared by me'
            : 'Public link'

        return (
          <div
            key={row.id}
            role={canOpenRow ? 'button' : undefined}
            tabIndex={canOpenRow ? 0 : undefined}
            onClick={() => {
              if (canEditAccess) {
                onEditAccess(row)
              } else if (canOpenContact) {
                onOpenContact(row)
              }
            }}
            onKeyDown={event => {
              if (!canOpenRow) return
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                if (canEditAccess) {
                  onEditAccess(row)
                } else {
                  onOpenContact(row)
                }
              }
            }}
            style={{
              display: 'grid',
              gridTemplateColumns: gridColumns,
              minHeight: 62,
              alignItems: 'center',
              borderBottom: '1px solid var(--divider)',
              cursor: canOpenRow ? 'pointer' : 'default',
              animation: isHighlightedRequest ? 'shared-request-row-confirm 1.2s ease-out' : undefined,
            }}
          >
            <div onClick={event => event.stopPropagation()} style={{ padding: '10px 12px' }}>
              <input
                type="checkbox"
                checked={selectedRowIds.has(row.id)}
                onChange={() => onToggleRow(row.id)}
                aria-label={`Select ${row.contactName}`}
                style={checkboxStyle}
              />
            </div>
            <div style={{ padding: '10px 12px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 750, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {row.contactName}
                </span>
                <TagPill tone={row.shareDirection === 'shared_with_me' ? 'green' : row.shareDirection === 'shared_by_me' ? 'blue' : 'gray'}>
                  {shareLabel}
                </TagPill>
              </div>
              <div style={{ marginTop: 3, fontSize: 11, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {row.company ?? 'No company'}
              </div>
            </div>
            <Cell primary={row.sourceLabel} secondary={titleCase(row.sourceType)} />
            <Cell primary={row.sharedWith} secondary={formatDate(row.createdAt)} />
            <div style={{ padding: '10px 12px' }}>
              <TagPill tone={row.permissionValue === 'public_link' ? 'gray' : 'blue'}>{row.permissionLabel}</TagPill>
            </div>
            <Cell primary={fieldScopeSummary(row.fieldScopes)} secondary={row.fieldScopes.map(titleCase).join(', ')} />
            <div style={{ padding: '10px 12px' }}>
              <TagPill tone={isBusyRequest ? 'blue' : sharedStatusTone(row.status)}>
                {isBusyRequest ? 'Updating' : sharedStatusLabel(row.status)}
              </TagPill>
            </div>
            <div
              onClick={event => event.stopPropagation()}
              style={{ padding: '10px 12px', display: 'flex', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}
            >
              {isIncomingRequest && row.incomingGrant && row.status === 'pending' ? (
                <Actions
                  disabled={!canRespondRequest}
                  busy={isBusyRequest}
                  approveLabel="Accept"
                  rejectLabel="Remove"
                  onApprove={() => onRespondSharedRequest(row.incomingGrant as CollaborationAccessGrant, 'accepted')}
                  onReject={() => onRespondSharedRequest(row.incomingGrant as CollaborationAccessGrant, 'declined')}
                />
              ) : (
                <>
                  <button
                    type="button"
                    disabled={!canRemoveRow || isBusyRow}
                    onClick={() => onRevoke(row)}
                    style={{ ...smallActionButtonStyle, opacity: !canRemoveRow || isBusyRow ? 0.5 : 1 }}
                  >
                    {isBusyRow ? 'Working' : 'Remove'}
                  </button>
                  <IconButton
                    label="Delete from shared contact history"
                    disabled={!canDeleteRow || isBusyRow}
                    onClick={() => onDelete(row)}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EditSharedAccessModal({
  workspaceId,
  grant,
  onClose,
  onUpdated,
}: {
  workspaceId: string
  grant: CollaborationAccessGrant
  onClose: () => void
  onUpdated: (grant: CollaborationAccessGrant) => void | Promise<void>
}) {
  const [permission, setPermission] = useState<CollaborationPermissionLevel>(grant.permission_level)
  const [selectedVisibleFieldIds, setSelectedVisibleFieldIds] = useState<SharedContactVisibleFieldId[]>(grant.visible_field_ids)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fieldScopes = useMemo(
    () => deriveSharedContactFieldScopes(selectedVisibleFieldIds),
    [selectedVisibleFieldIds],
  )
  const selectedVisibleFieldCount = selectedVisibleFieldIds.length

  function toggleVisibleField(fieldId: SharedContactVisibleFieldId) {
    setSelectedVisibleFieldIds(current => (
      current.includes(fieldId)
        ? current.filter(item => item !== fieldId)
        : [...current, fieldId]
    ))
  }

  async function handleSubmit() {
    if (selectedVisibleFieldCount === 0) {
      setError('Select at least one visible field')
      return
    }
    setSaving(true)
    setError('')
    try {
      const updatedGrant = await updateCollaborationAccessGrant({
        id: grant.id,
        workspace_id: workspaceId,
        permission_level: permission,
        field_scopes: fieldScopes,
        visible_field_ids: selectedVisibleFieldIds,
      })
      await onUpdated(updatedGrant)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update shared access')
    } finally {
      setSaving(false)
    }
  }

  const canSubmit = selectedVisibleFieldCount > 0 && !saving

  return (
    <Modal title="Edit shared access" onClose={onClose}>
      <div style={{ ...surfaceMiniStyle, marginBottom: 12 }}>
        <div style={fieldLabelStyle}>Shared item</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
          <ReadOnlyAccessField label="Resource" value={grant.resource_label} detail={titleCase(grant.resource_type)} />
          <ReadOnlyAccessField label="Shared with" value={grant.subject_label} detail={grant.subject_email || titleCase(grant.subject_type)} />
        </div>
      </div>

      <div style={modalGridStyle}>
        <SelectField label="Permission level" value={permission} onChange={value => setPermission(value as CollaborationPermissionLevel)}>
          {CREATE_PERMISSION_OPTIONS.map(level => <option key={level.value} value={level.value}>{level.label}</option>)}
        </SelectField>
      </div>

      <div style={{ ...surfaceMiniStyle, marginTop: 12 }}>
        <div style={fieldLabelStyle}>Visible fields</div>
        <div style={visibleFieldGroupsStyle}>
          {SHARED_CONTACT_VISIBLE_FIELD_GROUPS.map(group => {
            const groupSelected = group.fields.some(field => selectedVisibleFieldIds.includes(field.id))
            return (
              <section key={group.scope} style={visibleFieldGroupStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-primary)' }}>{group.label}</div>
                    <div style={{ color: 'var(--color-text-tertiary)', fontSize: 11, lineHeight: 1.4, marginTop: 2 }}>{group.summary}</div>
                  </div>
                  <TagPill tone={groupSelected ? 'blue' : 'gray'}>
                    {groupSelected ? 'Selected' : 'Off'}
                  </TagPill>
                </div>
                <div style={visibleFieldOptionsStyle}>
                  {group.fields.map(field => (
                    <label key={field.id} style={visibleFieldCheckboxStyle(false)}>
                      <input
                        type="checkbox"
                        checked={selectedVisibleFieldIds.includes(field.id)}
                        onChange={() => toggleVisibleField(field.id)}
                        style={{ width: 15, height: 15, accentColor: 'var(--color-brand)' }}
                      />
                      <span>{field.label}</span>
                    </label>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>

      <div style={{ ...surfaceMiniStyle, marginTop: 12 }}>
        <div style={fieldLabelStyle}>Share summary</div>
        <p style={{ margin: '6px 0 0', color: 'var(--color-text-tertiary)', fontSize: 12, lineHeight: 1.5 }}>
          {grant.resource_label} is shared with {grant.subject_label} using {permissionLabel(permission)} permissions and {selectedVisibleFieldCount} visible fields.
        </p>
      </div>

      {error && <div style={{ color: 'var(--health-fading)', fontSize: 12, marginTop: 12 }}>{error}</div>}

      <ModalActions onCancel={onClose} onSubmit={handleSubmit} submitLabel={saving ? 'Saving...' : 'Save'} disabled={!canSubmit} />
    </Modal>
  )
}

function ReadOnlyAccessField({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={fieldLabelStyle}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 13, fontWeight: 800, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </div>
      <div style={{ marginTop: 3, fontSize: 11, color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {detail}
      </div>
    </div>
  )
}

function ShareContactsModal({
  workspaceId,
  users,
  resources,
  onClose,
  onCreated,
}: {
  workspaceId: string
  users: ShareUserOption[]
  resources: ShareResourceOption[]
  onClose: () => void
  onCreated: () => void
}) {
  const [shareMode, setShareMode] = useState<ShareMode>('contact')
  const [subjectType, setSubjectType] = useState<CollaborationSubjectType>('user')
  const [subjectId, setSubjectId] = useState('')
  const [subjectLabel, setSubjectLabel] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [resourceId, setResourceId] = useState('')
  const [resourceSearch, setResourceSearch] = useState('')
  const [permission, setPermission] = useState<CollaborationPermissionLevel>('view')
  const [selectedVisibleFieldIds, setSelectedVisibleFieldIds] = useState<SharedContactVisibleFieldId[]>(DEFAULT_SHARED_CONTACT_VISIBLE_FIELD_IDS)
  const [expirationDays, setExpirationDays] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const filteredResources = resources.filter(resource => resource.mode === shareMode)
  const selectedResource = filteredResources.find(resource => resource.id === resourceId) ?? null
  const resourceQuery = resourceSearch.trim().toLowerCase()
  const searchedResources = resourceQuery
    ? filteredResources.filter(resource => [
      resource.label,
      resource.description,
      resource.mode,
      resource.resourceType,
    ].some(value => String(value ?? '').toLowerCase().includes(resourceQuery)))
    : filteredResources
  const resourceSelectOptions = selectedResource && !searchedResources.some(resource => resource.id === selectedResource.id)
    ? [selectedResource, ...searchedResources]
    : searchedResources
  const fieldScopes = useMemo(
    () => deriveSharedContactFieldScopes(selectedVisibleFieldIds),
    [selectedVisibleFieldIds],
  )
  const selectedVisibleFieldCount = selectedVisibleFieldIds.length
  const normalizedRecipientEmail = normalizeEmail(recipientEmail)
  const selectedUser = subjectType === 'user'
    ? users.find(item => item.user_id === subjectId) ?? null
    : null

  useEffect(() => {
    setResourceId('')
    setResourceSearch('')
  }, [shareMode])

  useEffect(() => {
    setSubjectId('')
    setRecipientEmail('')
    setSubjectLabel(subjectType === 'public_link' ? 'Public reviewer' : '')
  }, [subjectType])

  useEffect(() => {
    if (subjectType !== 'user') return
    const user = users.find(item => item.user_id === subjectId)
    setSubjectLabel(user ? user.display_name || user.email || 'User' : '')
    setRecipientEmail(user?.email ?? '')
  }, [subjectId, subjectType, users])

  function toggleVisibleField(fieldId: SharedContactVisibleFieldId) {
    setSelectedVisibleFieldIds(current => (
      current.includes(fieldId)
        ? current.filter(item => item !== fieldId)
        : [...current, fieldId]
    ))
  }

  async function handleSubmit() {
    const shareByEmail = subjectType === 'user'
    const nextSubjectLabel = shareByEmail
      ? subjectLabel.trim() || normalizedRecipientEmail
      : subjectLabel.trim()
    if (!selectedResource || !nextSubjectLabel) return
    if (selectedVisibleFieldCount === 0) {
      setError('Select at least one visible field')
      return
    }
    if (shareByEmail && !isValidEmail(normalizedRecipientEmail)) {
      setError('Enter a valid recipient email')
      return
    }
    setSaving(true)
    setError('')
    try {
      await createCollaborationAccessGrant({
        workspace_id: workspaceId,
        subject_type: subjectType,
        subject_id: subjectId || null,
        subject_email: shareByEmail ? normalizedRecipientEmail : null,
        subject_label: nextSubjectLabel,
        resource_type: selectedResource.resourceType,
        resource_id: selectedResource.id,
        resource_label: selectedResource.mode === 'sub_pod' ? `Sub-pod: ${selectedResource.label}` : selectedResource.label,
        permission_level: permission,
        field_scopes: fieldScopes,
        visible_field_ids: selectedVisibleFieldIds,
        status: shareByEmail ? 'pending' : 'accepted',
        expires_at: expirationDays ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString() : null,
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not share contacts')
    } finally {
      setSaving(false)
    }
  }

  const canSubmit = Boolean(
    selectedResource
      && (subjectType === 'user' ? isValidEmail(normalizedRecipientEmail) : subjectLabel.trim())
      && selectedVisibleFieldCount > 0
      && !saving,
  )

  return (
    <Modal title="Share contacts" onClose={onClose}>
      <div style={modalGridStyle}>
        <SelectField label="What to share" value={shareMode} onChange={value => setShareMode(value as ShareMode)}>
          {SHARE_MODE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </SelectField>

        <div style={{ display: 'grid', gap: 6 }}>
          <span style={fieldLabelStyle}>Resource</span>
          <div style={resourceSearchWrapStyle}>
            <Search size={14} />
            <input
              type="search"
              aria-label="Search resources"
              value={resourceSearch}
              onChange={event => setResourceSearch(event.target.value)}
              placeholder="Search contacts, pods, sub-pods, companies, or campaigns"
              style={resourceSearchInputStyle}
            />
          </div>
          <select value={resourceId} onChange={event => setResourceId(event.target.value)} style={inputStyle}>
            <option value="">Select {SHARE_MODE_OPTIONS.find(option => option.value === shareMode)?.label.toLowerCase()}</option>
            {resourceSelectOptions.map(resource => (
              <option key={resource.id} value={resource.id}>{resource.label}</option>
            ))}
          </select>
          {resourceQuery && searchedResources.length === 0 && (
            <span style={{ color: 'var(--color-text-tertiary)', fontSize: 11 }}>No resources match this search.</span>
          )}
        </div>

        <SelectField label="Share with" value={subjectType} onChange={value => setSubjectType(value as CollaborationSubjectType)}>
          {SUBJECT_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
        </SelectField>

        {subjectType === 'user' ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <SelectField label="Known user" value={subjectId} onChange={setSubjectId}>
              <option value="">Use email instead</option>
              {users.map(user => (
                <option key={user.id} value={user.user_id}>
                  {shareUserOptionLabel(user)}
                </option>
              ))}
            </SelectField>
            <TextField label="Recipient email" value={recipientEmail} onChange={setRecipientEmail} placeholder="name@example.com" />
            {selectedUser && (
              <div style={{
                border: '1px solid var(--edge)',
                borderRadius: 8,
                padding: '8px 10px',
                background: 'var(--tint)',
                color: 'var(--color-text-secondary)',
                fontSize: 11,
                lineHeight: 1.45,
              }}>
                <strong style={{ color: 'var(--color-text-primary)' }}>Request target:</strong>{' '}
                {selectedUser.email || 'No email'} - {shareUserSourceLabel()}
              </div>
            )}
          </div>
        ) : (
          <TextField label="Recipient label" value={subjectLabel} onChange={setSubjectLabel} placeholder="Production team, Investor reviewer, OpenAI team..." />
        )}

        <SelectField label="Permission level" value={permission} onChange={value => setPermission(value as CollaborationPermissionLevel)}>
          {CREATE_PERMISSION_OPTIONS.map(level => <option key={level.value} value={level.value}>{level.label}</option>)}
        </SelectField>

        <SelectField label="Expiration" value={String(expirationDays ?? '')} onChange={value => setExpirationDays(value ? Number(value) : null)}>
          {EXPIRATION_OPTIONS.map(option => (
            <option key={option.label} value={option.days ?? ''}>{option.label}</option>
          ))}
        </SelectField>
      </div>

      <div style={{ ...surfaceMiniStyle, marginTop: 12 }}>
        <div style={fieldLabelStyle}>Visible fields</div>
        <div style={visibleFieldGroupsStyle}>
          {SHARED_CONTACT_VISIBLE_FIELD_GROUPS.map(group => {
            const groupSelected = group.fields.some(field => selectedVisibleFieldIds.includes(field.id))
            return (
              <section key={group.scope} style={visibleFieldGroupStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-primary)' }}>{group.label}</div>
                    <div style={{ color: 'var(--color-text-tertiary)', fontSize: 11, lineHeight: 1.4, marginTop: 2 }}>{group.summary}</div>
                  </div>
                  <TagPill tone={groupSelected ? 'blue' : 'gray'}>
                    {groupSelected ? 'Selected' : 'Off'}
                  </TagPill>
                </div>
                <div style={visibleFieldOptionsStyle}>
                  {group.fields.map(field => (
                    <label key={field.id} style={visibleFieldCheckboxStyle(false)}>
                      <input
                        type="checkbox"
                        checked={selectedVisibleFieldIds.includes(field.id)}
                        onChange={() => toggleVisibleField(field.id)}
                        style={{ width: 15, height: 15, accentColor: 'var(--color-brand)' }}
                      />
                      <span>{field.label}</span>
                    </label>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>

      <div style={{ ...surfaceMiniStyle, marginTop: 12 }}>
        <div style={fieldLabelStyle}>Share summary</div>
        <p style={{ margin: '6px 0 0', color: 'var(--color-text-tertiary)', fontSize: 12, lineHeight: 1.5 }}>
          {selectedResource
            ? `${selectedResource.label} will be shared as ${SHARE_MODE_OPTIONS.find(option => option.value === shareMode)?.label.toLowerCase()} access with ${permissionLabel(permission)} permissions and ${selectedVisibleFieldCount} visible fields${subjectType === 'user' ? ` after ${normalizedRecipientEmail || 'the recipient'} accepts.` : '.'}`
            : 'Choose a resource to preview the access grant.'}
        </p>
      </div>

      {error && <div style={{ color: 'var(--health-fading)', fontSize: 12, marginTop: 12 }}>{error}</div>}

      <ModalActions onCancel={onClose} onSubmit={handleSubmit} submitLabel={saving ? 'Sharing...' : 'Create share'} disabled={!canSubmit} />
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
          width: 'min(680px, 100%)',
          maxHeight: 'min(780px, calc(100vh - 40px))',
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
          <IconButton label="Close" onClick={onClose}><X size={15} /></IconButton>
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
      <button type="button" onClick={onSubmit} disabled={disabled} style={{ ...primaryButtonStyle, opacity: disabled ? 0.65 : 1, cursor: disabled ? 'default' : 'pointer' }}>
        {submitLabel}
      </button>
    </div>
  )
}

function SummaryCard({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: number; onClick?: () => void }) {
  const content = (
    <>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(0,61,165,0.08)', color: 'var(--color-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 850, color: 'var(--color-text-primary)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>{label}</div>
      </div>
    </>
  )

  const style: React.CSSProperties = {
    border: '1px solid var(--edge)',
    borderRadius: 10,
    background: 'var(--surface-panel)',
    padding: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          ...style,
          width: '100%',
          textAlign: 'left',
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        {content}
      </button>
    )
  }

  return (
    <div style={style}>
      {content}
    </div>
  )
}

function SharedRequestFeedbackBanner({ feedback }: { feedback: SharedRequestFeedback }) {
  const isError = feedback.tone === 'error'
  const isWarning = feedback.tone === 'warning'
  const color = isError ? 'var(--health-fading)' : isWarning ? '#a16207' : 'var(--color-brand)'
  const background = isError ? 'rgba(225,29,72,0.08)' : isWarning ? 'rgba(245,166,35,0.12)' : 'rgba(37,180,57,0.09)'
  const borderColor = isError ? 'rgba(225,29,72,0.20)' : isWarning ? 'rgba(245,166,35,0.26)' : 'rgba(37,180,57,0.22)'

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 40,
        borderRadius: 9,
        border: `1px solid ${borderColor}`,
        background,
        color,
        padding: '9px 12px',
        fontSize: 13,
        fontWeight: 750,
        marginBottom: 14,
        animation: 'shared-request-feedback-enter 0.22s ease-out',
      }}
    >
      {feedback.tone === 'success' ? <Check size={15} /> : <X size={15} />}
      <span>{feedback.message}</span>
    </div>
  )
}

function Header({ columns, labels }: { columns: string; labels: React.ReactNode[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: columns, minHeight: 38, alignItems: 'center', background: 'var(--tint)', borderBottom: '1px solid var(--edge)' }}>
      {labels.map((label, index) => <div key={index} style={headerCellStyle}>{label}</div>)}
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

function Actions({
  disabled,
  busy,
  approveLabel = 'Approve',
  rejectLabel = 'Reject',
  onApprove,
  onReject,
}: {
  disabled: boolean
  busy?: boolean
  approveLabel?: string
  rejectLabel?: string
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
      <button type="button" disabled={disabled} onClick={onApprove} style={{ ...smallActionButtonStyle, opacity: disabled ? 0.5 : 1 }}>
        <Check size={13} />
        {busy ? 'Working' : approveLabel}
      </button>
      <button type="button" disabled={disabled} onClick={onReject} style={{ ...smallDangerButtonStyle, opacity: disabled ? 0.5 : 1 }}>
        <X size={13} />
        {busy ? 'Working' : rejectLabel}
      </button>
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

const checkboxStyle: React.CSSProperties = {
  width: 14,
  height: 14,
  margin: 0,
  cursor: 'pointer',
}

const smallActionButtonStyle: React.CSSProperties = {
  height: 30,
  borderRadius: 8,
  border: '1px solid rgba(0,61,165,0.18)',
  background: 'rgba(0,61,165,0.08)',
  color: 'var(--color-brand)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  padding: '0 10px',
  fontSize: 11,
  fontWeight: 800,
  fontFamily: 'inherit',
  cursor: 'pointer',
}

const smallDangerButtonStyle: React.CSSProperties = {
  ...smallActionButtonStyle,
  border: '1px solid rgba(225,29,72,0.18)',
  background: 'rgba(225,29,72,0.08)',
  color: 'var(--health-fading)',
}

const secondaryActionButtonStyle: React.CSSProperties = {
  ...smallActionButtonStyle,
  height: 34,
  background: 'var(--surface-panel)',
  border: '1px solid var(--edge)',
  color: 'var(--color-text-secondary)',
  fontSize: 12,
}

const dangerActionButtonStyle: React.CSSProperties = {
  ...secondaryActionButtonStyle,
  color: 'var(--health-fading)',
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
  whiteSpace: 'nowrap',
}

const headerShareButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  minHeight: 36,
  padding: '9px 14px',
  borderRadius: 9,
  boxShadow: '0 10px 22px rgba(0,61,165,0.16)',
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

const surfaceMiniStyle: React.CSSProperties = {
  border: '1px solid var(--edge)',
  borderRadius: 10,
  background: 'var(--surface-panel)',
  padding: 12,
}

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 750,
  color: 'var(--color-text-secondary)',
}

const resourceSearchWrapStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 38,
  borderRadius: 8,
  border: '1px solid var(--edge)',
  background: 'var(--surface-panel)',
  color: 'var(--color-text-tertiary)',
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  padding: '0 10px',
  boxSizing: 'border-box',
}

const resourceSearchInputStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 0,
  height: 34,
  border: 'none',
  background: 'transparent',
  color: 'var(--color-text-primary)',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
}

const visibleFieldGroupsStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 10,
  marginTop: 8,
}

const visibleFieldGroupStyle: React.CSSProperties = {
  border: '1px solid var(--edge)',
  borderRadius: 9,
  background: 'var(--color-surface)',
  padding: 10,
  minWidth: 0,
}

const visibleFieldOptionsStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: 7,
  marginTop: 10,
}

function visibleFieldCheckboxStyle(locked: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    minWidth: 0,
    minHeight: 25,
    color: locked ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
    fontSize: 12,
    lineHeight: 1.35,
    cursor: locked ? 'default' : 'pointer',
  }
}

const modalGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 12,
}
