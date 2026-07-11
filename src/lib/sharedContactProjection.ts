import type { SharedContactAccessSnapshot } from './collaboration'
import { deriveSharedContactVisibleFieldIdsFromScopes, type SharedContactVisibleFieldId } from './sharedContactVisibleFields'
import type { Campaign, CampaignContact, CampaignStage, Category, Contact, Pod } from './types'

type ProjectionStructure = {
  pods: Pod[]
  categories: Category[]
  campaigns?: Campaign[]
  contacts?: Contact[]
}

const SHARED_CAMPAIGN_CONTACT_PREFIX = 'shared-campaign-contact:'
const SHARED_POD_PREFIX = 'shared-pod:'
const SHARED_CATEGORY_PREFIX = 'shared-category:'
const SHARED_CAMPAIGN_PREFIX = 'shared-campaign:'
const SHARED_CAMPAIGN_STAGE_PREFIX = 'shared-campaign-stage:'
const SHARED_COMPANY_PREFIX = 'shared-company:'
const SHARED_SUB_PODS_LABEL = 'Shared sub-pods'

type SharedCampaignMembershipSnapshot = {
  campaign_id: string | null
  campaign_name: string | null
  campaign_type: string | null
  campaign_status: string | null
  campaign_deadline: string | null
  campaign_notes: string | null
  campaign_description: string | null
  campaign_custom_fields: Record<string, unknown>
  campaign_created_at: string | null
  campaign_contact_id: string | null
  contact_id: string | null
  status: string | null
  stage_id: string | null
  stage_name: string | null
  stage_order: number | null
  stage_color: string | null
  notes: string | null
  owner: string | null
  next_step: string | null
  next_step_due: string | null
  moved_at: string | null
  custom_fields: Record<string, unknown>
  created_at: string | null
}

type SharedPodMembershipSnapshot = {
  pod_id: string | null
  pod_name: string | null
  color: string | null
  owner: string | null
  is_priority: boolean | null
  cadence: string | null
  description: string | null
  capacity: number | null
  enrichment_opt_in: boolean | null
  created_at: string | null
}

type SharedSubPodMembershipSnapshot = {
  category_id: string | null
  category_name: string | null
  pod_id: string | null
  pod_name: string | null
  color: string | null
  icon: string | null
  created_at: string | null
}

type SharedCampaignSource = {
  snapshot: SharedContactAccessSnapshot
  label: string
  membership: SharedCampaignMembershipSnapshot | null
}

const CAMPAIGN_TYPES: Campaign['type'][] = ['event', 'investment', 'outreach', 'deal_flow', 'fundraise', 'talent', 'partnerships', 'other']
const CAMPAIGN_STATUSES: Campaign['status'][] = ['active', 'completed', 'hidden']
const CAMPAIGN_CONTACT_STATUSES: CampaignContact['status'][] = ['pending', 'reached', 'responded', 'confirmed']

export type OrganizedSharedContacts = {
  allContacts: Contact[]
  sharedContacts: Contact[]
  contactIdsByGrantId: Map<string, string[]>
  contactIdBySnapshotKey: Map<string, string>
}

export type SharedWorkspaceProjection = OrganizedSharedContacts & {
  pods: Pod[]
  categories: Category[]
  campaigns: Campaign[]
  contacts: Contact[]
}

function normalizeLabel(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function slugLabel(value: string | null | undefined): string {
  return normalizeLabel(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'shared'
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function recordValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function visibleFieldsForSnapshot(snapshot: SharedContactAccessSnapshot): SharedContactVisibleFieldId[] {
  return snapshot.visible_field_ids.length > 0
    ? snapshot.visible_field_ids
    : deriveSharedContactVisibleFieldIdsFromScopes(snapshot.field_scopes)
}

function hasVisibleField(snapshot: SharedContactAccessSnapshot, fieldId: SharedContactVisibleFieldId): boolean {
  return visibleFieldsForSnapshot(snapshot).includes(fieldId)
}

function sharedCampaignMemberships(snapshot: SharedContactAccessSnapshot): SharedCampaignMembershipSnapshot[] {
  const raw = snapshot.contact.custom_fields?.shared_campaign_memberships
  if (!Array.isArray(raw)) return []

  return raw
    .filter(isRecord)
    .map(item => ({
      campaign_id: stringValue(item.campaign_id),
      campaign_name: stringValue(item.campaign_name),
      campaign_type: stringValue(item.campaign_type),
      campaign_status: stringValue(item.campaign_status),
      campaign_deadline: stringValue(item.campaign_deadline),
      campaign_notes: stringValue(item.campaign_notes),
      campaign_description: stringValue(item.campaign_description),
      campaign_custom_fields: recordValue(item.campaign_custom_fields),
      campaign_created_at: stringValue(item.campaign_created_at),
      campaign_contact_id: stringValue(item.campaign_contact_id),
      contact_id: stringValue(item.contact_id),
      status: stringValue(item.status),
      stage_id: stringValue(item.stage_id),
      stage_name: stringValue(item.stage_name),
      stage_order: numberValue(item.stage_order),
      stage_color: stringValue(item.stage_color),
      notes: stringValue(item.notes),
      owner: stringValue(item.owner),
      next_step: stringValue(item.next_step),
      next_step_due: stringValue(item.next_step_due),
      moved_at: stringValue(item.moved_at),
      custom_fields: recordValue(item.custom_fields),
      created_at: stringValue(item.created_at),
    }))
}

function sharedPodMemberships(snapshot: SharedContactAccessSnapshot): SharedPodMembershipSnapshot[] {
  const raw = snapshot.contact.custom_fields?.shared_pod_memberships
  if (!Array.isArray(raw)) return []

  return raw
    .filter(isRecord)
    .map(item => ({
      pod_id: stringValue(item.pod_id),
      pod_name: stringValue(item.pod_name),
      color: stringValue(item.color),
      owner: stringValue(item.owner),
      is_priority: typeof item.is_priority === 'boolean' ? item.is_priority : null,
      cadence: stringValue(item.cadence),
      description: stringValue(item.description),
      capacity: numberValue(item.capacity),
      enrichment_opt_in: typeof item.enrichment_opt_in === 'boolean' ? item.enrichment_opt_in : null,
      created_at: stringValue(item.created_at),
    }))
}

function sharedSubPodMemberships(snapshot: SharedContactAccessSnapshot): SharedSubPodMembershipSnapshot[] {
  const raw = snapshot.contact.custom_fields?.shared_sub_pod_memberships
  if (!Array.isArray(raw)) return []

  return raw
    .filter(isRecord)
    .map(item => ({
      category_id: stringValue(item.category_id),
      category_name: stringValue(item.category_name),
      pod_id: stringValue(item.pod_id),
      pod_name: stringValue(item.pod_name),
      color: stringValue(item.color),
      icon: stringValue(item.icon),
      created_at: stringValue(item.created_at),
    }))
}

function asCampaignType(value: string | null | undefined): Campaign['type'] {
  return CAMPAIGN_TYPES.includes(value as Campaign['type']) ? value as Campaign['type'] : 'outreach'
}

function asCampaignStatus(value: string | null | undefined): Campaign['status'] {
  return CAMPAIGN_STATUSES.includes(value as Campaign['status']) ? value as Campaign['status'] : 'active'
}

function asCampaignContactStatus(value: string | null | undefined): CampaignContact['status'] {
  return CAMPAIGN_CONTACT_STATUSES.includes(value as CampaignContact['status']) ? value as CampaignContact['status'] : 'pending'
}

function normalizeSharedContact(contact: Contact): Contact {
  return {
    ...contact,
    email: contact.email ?? null,
    phone: contact.phone ?? null,
    company: contact.company ?? null,
    role: contact.role ?? null,
    location: contact.location ?? null,
    website: contact.website ?? null,
    notes: contact.notes ?? null,
    recommended_by: contact.recommended_by ?? null,
    specialization: contact.specialization ?? null,
    past_clients: contact.past_clients ?? null,
    birthday: contact.birthday ?? null,
    milestones: contact.milestones ?? null,
    interests: contact.interests ?? null,
    relationship_context: contact.relationship_context ?? null,
    last_contacted_at: contact.last_contacted_at ?? null,
    list_ids: Array.isArray(contact.list_ids) ? contact.list_ids : [],
    category_ids: Array.isArray(contact.category_ids) ? contact.category_ids : [],
    primary_list_id: contact.primary_list_id ?? null,
    cadence_override: contact.cadence_override ?? null,
    first_name: contact.first_name ?? null,
    last_name: contact.last_name ?? null,
    linkedin: contact.linkedin ?? null,
    country: contact.country ?? null,
    global_region: contact.global_region ?? null,
    gender: contact.gender ?? null,
    introduced_by: contact.introduced_by ?? null,
    intel_notes: contact.intel_notes ?? null,
    relationship_owner: contact.relationship_owner ?? null,
    contact_frequency: contact.contact_frequency ?? null,
    communication_preferences: contact.communication_preferences ?? null,
    next_follow_up_date: contact.next_follow_up_date ?? null,
    next_action: contact.next_action ?? null,
    kv_fund_investor: Array.isArray(contact.kv_fund_investor) ? contact.kv_fund_investor : null,
    spv_investor: Array.isArray(contact.spv_investor) ? contact.spv_investor : null,
    needs_review: contact.needs_review ?? false,
    type: contact.type ?? 'Contact',
    status: contact.status ?? 'Pending',
    ring_ids: Array.isArray(contact.ring_ids) ? contact.ring_ids : [],
    company_record_id: contact.company_record_id ?? null,
    company_ids: Array.isArray(contact.company_ids) ? contact.company_ids : [],
    industry: contact.industry ?? null,
    stage: contact.stage ?? null,
    ticker: contact.ticker ?? null,
    domain: contact.domain ?? null,
    email_2: contact.email_2 ?? null,
    email_3: contact.email_3 ?? null,
    photo_url: contact.photo_url ?? null,
    custom_fields: contact.custom_fields && typeof contact.custom_fields === 'object' && !Array.isArray(contact.custom_fields)
      ? contact.custom_fields
      : {},
    snoozed_until: contact.snoozed_until ?? null,
    created_at: contact.created_at ?? new Date(0).toISOString(),
  }
}

function isActiveSnapshot(snapshot: SharedContactAccessSnapshot): boolean {
  return !snapshot.expires_at || new Date(snapshot.expires_at).getTime() > Date.now()
}

function subPodLabel(resourceLabel: string): string | null {
  const label = resourceLabel.trim()
  const prefix = 'sub-pod:'
  return label.toLowerCase().startsWith(prefix) ? label.slice(prefix.length).trim() : null
}

function findByName<T extends { name: string }>(items: T[], label: string | null | undefined): T | null {
  const target = normalizeLabel(label)
  if (!target) return null
  return items.find(item => normalizeLabel(item.name) === target) ?? null
}

function earliestDate(values: string[]): string {
  return values.length > 0
    ? [...values].sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0]
    : new Date(0).toISOString()
}

function sharedPodId(label: string): string {
  return `${SHARED_POD_PREFIX}${slugLabel(label)}`
}

function sharedCategoryId(label: string): string {
  return `${SHARED_CATEGORY_PREFIX}${slugLabel(label)}`
}

function sharedCampaignId(label: string): string {
  return `${SHARED_CAMPAIGN_PREFIX}${slugLabel(label)}`
}

function sharedCampaignStageId(campaignId: string): string {
  return `${SHARED_CAMPAIGN_STAGE_PREFIX}${campaignId}:shared`
}

function sharedCompanyId(label: string): string {
  return `${SHARED_COMPANY_PREFIX}${slugLabel(label)}`
}

function projectOneSharedContact(snapshot: SharedContactAccessSnapshot, structure: ProjectionStructure): Contact {
  const contact = normalizeSharedContact(snapshot.contact)
  const canProjectPods = hasVisibleField(snapshot, 'pods')
  const canProjectSubPods = hasVisibleField(snapshot, 'sub_pods')
  const canProjectCompany = hasVisibleField(snapshot, 'company')
  const localPodIds = new Set(structure.pods.map(pod => pod.id))
  const localCategoryIds = new Set(structure.categories.map(category => category.id))
  const listIds = new Set(canProjectPods ? contact.list_ids.filter(id => localPodIds.has(id)) : [])
  const categoryIds = new Set(canProjectSubPods ? contact.category_ids.filter(id => localCategoryIds.has(id)) : [])

  if (canProjectPods || canProjectSubPods) {
    for (const membership of sharedPodMemberships(snapshot)) {
      if (!membership.pod_name) continue
      const pod = structure.pods.find(item => item.id === membership.pod_id)
        ?? structure.pods.find(item => item.id === sharedPodId(membership.pod_name ?? ''))
        ?? findByName(structure.pods, membership.pod_name)
      if (pod && (canProjectPods || canProjectSubPods)) listIds.add(pod.id)
    }
  }

  if (canProjectSubPods) {
    for (const membership of sharedSubPodMemberships(snapshot)) {
      if (!membership.category_name) continue
      const category = structure.categories.find(item => item.id === membership.category_id)
        ?? structure.categories.find(item => item.id === sharedCategoryId(membership.category_name ?? ''))
        ?? structure.categories.find(item => {
          if (normalizeLabel(item.name) !== normalizeLabel(membership.category_name)) return false
          if (!membership.pod_name) return true
          const parent = structure.pods.find(pod => pod.id === item.list_id)
          return normalizeLabel(parent?.name) === normalizeLabel(membership.pod_name)
        })
        ?? findByName(structure.categories, membership.category_name)
      if (category) {
        categoryIds.add(category.id)
        listIds.add(category.list_id)
      }
    }
  }

  if (snapshot.resource_type === 'pod') {
    const targetSubPodLabel = subPodLabel(snapshot.resource_label)
    if (targetSubPodLabel && canProjectSubPods) {
      const category = findByName(structure.categories, targetSubPodLabel)
      if (category) {
        categoryIds.add(category.id)
        listIds.add(category.list_id)
      }
    } else if (!targetSubPodLabel && canProjectPods) {
      const pod = findByName(structure.pods, snapshot.resource_label)
      if (pod) listIds.add(pod.id)
    }
  }

  const companyRecords = structure.contacts?.filter(item => item.type === 'Company') ?? []
  const matchedCompany = canProjectCompany
    ? findByName(companyRecords, contact.company)
      ?? (snapshot.resource_type === 'company' ? findByName(companyRecords, snapshot.resource_label) : null)
    : null
  const companyRecordId = canProjectCompany
    ? matchedCompany?.id ?? (companyRecords.some(company => company.id === contact.company_record_id) ? contact.company_record_id : null)
    : null

  return {
    ...contact,
    list_ids: [...listIds],
    category_ids: [...categoryIds],
    primary_list_id: listIds.has(contact.primary_list_id ?? '') ? contact.primary_list_id : [...listIds][0] ?? null,
    company_record_id: companyRecordId,
    company_ids: canProjectCompany
      ? unique([companyRecordId, ...contact.company_ids.filter(id => companyRecords.some(company => company.id === id))])
      : [],
    custom_fields: {
      ...contact.custom_fields,
      shared_contact_grant_id: snapshot.grant_id,
      shared_contact_resource_type: snapshot.resource_type,
      shared_contact_resource_label: snapshot.resource_label,
    },
  }
}

function mergeProjectedMembership(base: Contact, projected: Contact): Contact {
  return {
    ...base,
    list_ids: unique([...base.list_ids, ...projected.list_ids]),
    category_ids: unique([...base.category_ids, ...projected.category_ids]),
    primary_list_id: base.primary_list_id ?? projected.primary_list_id,
    company_record_id: base.company_record_id ?? projected.company_record_id,
    company_ids: unique([...base.company_ids, ...projected.company_ids]),
    custom_fields: {
      ...base.custom_fields,
      ...projected.custom_fields,
    },
  }
}

function addMappedGrantId(target: Map<string, string[]>, grantId: string, contactId: string) {
  target.set(grantId, unique([...(target.get(grantId) ?? []), contactId]))
}

export function sharedContactSnapshotKey(snapshot: Pick<SharedContactAccessSnapshot, 'grant_id' | 'contact'>): string {
  return `${snapshot.grant_id}:${snapshot.contact.id}`
}

export function organizeSharedContactsForWorkspace(
  snapshots: SharedContactAccessSnapshot[],
  structure: ProjectionStructure,
): OrganizedSharedContacts {
  const localContacts = structure.contacts ?? []
  const localById = new Map(localContacts.map(contact => [contact.id, contact]))
  const localByIdentity = new Map<string, Contact>()
  for (const contact of localContacts) {
    const key = contactIdentityKey(contact)
    if (!localByIdentity.has(key)) localByIdentity.set(key, contact)
  }

  const localOverlays = new Map<string, Contact>()
  const virtualContacts = new Map<string, Contact>()
  const contactIdsByGrantId = new Map<string, string[]>()
  const contactIdBySnapshotKey = new Map<string, string>()

  for (const snapshot of snapshots) {
    if (!isActiveSnapshot(snapshot)) continue

    const projected = projectOneSharedContact(snapshot, structure)
    const localMatch = localById.get(projected.id) ?? localByIdentity.get(contactIdentityKey(projected)) ?? null
    const targetId = localMatch?.id ?? projected.id
    contactIdBySnapshotKey.set(sharedContactSnapshotKey(snapshot), targetId)
    addMappedGrantId(contactIdsByGrantId, snapshot.grant_id, targetId)

    if (localMatch) {
      const current = localOverlays.get(localMatch.id) ?? localMatch
      localOverlays.set(localMatch.id, mergeProjectedMembership(current, projected))
      continue
    }

    const current = virtualContacts.get(projected.id)
    virtualContacts.set(projected.id, current ? mergeProjectedMembership(current, projected) : projected)
  }

  const allContacts = localContacts.map(contact => localOverlays.get(contact.id) ?? contact)
  const sharedContactsById = new Map<string, Contact>()
  for (const contact of localOverlays.values()) sharedContactsById.set(contact.id, contact)
  for (const contact of virtualContacts.values()) {
    allContacts.push(contact)
    sharedContactsById.set(contact.id, contact)
  }

  return {
    allContacts,
    sharedContacts: [...sharedContactsById.values()],
    contactIdsByGrantId,
    contactIdBySnapshotKey,
  }
}

export function projectSharedContactsToWorkspace(
  snapshots: SharedContactAccessSnapshot[],
  structure: ProjectionStructure,
): Contact[] {
  const byId = new Map<string, Contact>()

  for (const snapshot of snapshots) {
    if (!isActiveSnapshot(snapshot)) continue
    const projected = projectOneSharedContact(snapshot, structure)
    const current = byId.get(projected.id)
    if (!current) {
      byId.set(projected.id, projected)
      continue
    }

    byId.set(projected.id, {
      ...current,
      list_ids: unique([...current.list_ids, ...projected.list_ids]),
      category_ids: unique([...current.category_ids, ...projected.category_ids]),
      primary_list_id: current.primary_list_id ?? projected.primary_list_id,
      company_record_id: current.company_record_id ?? projected.company_record_id,
      company_ids: unique([...current.company_ids, ...projected.company_ids]),
      custom_fields: { ...current.custom_fields, ...projected.custom_fields },
    })
  }

  return [...byId.values()]
}

function projectSharedPodsToWorkspace(snapshots: SharedContactAccessSnapshot[], localPods: Pod[]): Pod[] {
  const byName = new Map<string, Pod>()
  for (const pod of localPods) {
    const key = normalizeLabel(pod.name)
    if (key && !byName.has(key)) byName.set(key, pod)
  }

  const projected: Pod[] = []
  const projectedKeys = new Set<string>()
  function addProjectedPod(label: string, snapshot: SharedContactAccessSnapshot, membership?: SharedPodMembershipSnapshot) {
    const key = normalizeLabel(label)
    if (!key || byName.has(key) || projectedKeys.has(key)) return
    projectedKeys.add(key)
    projected.push({
      id: sharedPodId(label),
      name: label,
      color: (membership?.color as Pod['color']) ?? null,
      owner: (membership?.owner as Pod['owner']) ?? null,
      is_priority: membership?.is_priority ?? false,
      cadence: (membership?.cadence as Pod['cadence']) ?? null,
      description: membership?.description ?? null,
      capacity: membership?.capacity ?? null,
      enrichment_opt_in: membership?.enrichment_opt_in ?? false,
      created_at: membership?.created_at ?? snapshot.created_at,
    })
  }

  for (const snapshot of snapshots) {
    if (!isActiveSnapshot(snapshot)) continue
    if (hasVisibleField(snapshot, 'pods') || hasVisibleField(snapshot, 'sub_pods')) {
      for (const membership of sharedPodMemberships(snapshot)) {
        if (membership.pod_name) addProjectedPod(membership.pod_name, snapshot, membership)
      }
      for (const membership of sharedSubPodMemberships(snapshot)) {
        if (membership.pod_name) addProjectedPod(membership.pod_name, snapshot)
      }
    }
    if (snapshot.resource_type !== 'pod') continue
    if (!hasVisibleField(snapshot, 'pods')) continue
    if (subPodLabel(snapshot.resource_label)) continue
    addProjectedPod(snapshot.resource_label, snapshot)
  }

  return [...localPods, ...projected]
}

function projectSharedCategoriesToWorkspace(
  snapshots: SharedContactAccessSnapshot[],
  pods: Pod[],
  localCategories: Category[],
): Category[] {
  const byName = new Map<string, Category>()
  for (const category of localCategories) {
    const key = normalizeLabel(category.name)
    if (key && !byName.has(key)) byName.set(key, category)
  }

  const projected: Category[] = []
  const projectedKeys = new Set<string>()
  function addProjectedCategory(
    label: string,
    snapshot: SharedContactAccessSnapshot,
    membership?: SharedSubPodMembershipSnapshot,
  ) {
    const key = normalizeLabel(label)
    const parentPod = membership?.pod_name
      ? findByName(pods, membership.pod_name) ?? pods.find(pod => pod.id === sharedPodId(membership.pod_name ?? ''))
      : null
    const scopedKey = `${normalizeLabel(parentPod?.name) || 'shared'}:${key}`
    if (!key || byName.has(key) || projectedKeys.has(scopedKey)) return
    projectedKeys.add(scopedKey)

    const fallbackParentPod = pods.find(pod => pod.id === snapshot.contact.primary_list_id)
      ?? pods.find(pod => snapshot.contact.list_ids.includes(pod.id))
      ?? findByName(pods, SHARED_SUB_PODS_LABEL)
      ?? {
        id: sharedPodId(SHARED_SUB_PODS_LABEL),
        name: SHARED_SUB_PODS_LABEL,
        color: null,
        owner: null,
        is_priority: false,
        cadence: null,
        description: null,
        capacity: null,
        enrichment_opt_in: false,
        created_at: snapshot.created_at,
      }

    projected.push({
      id: sharedCategoryId(label),
      list_id: parentPod?.id ?? fallbackParentPod.id,
      name: label,
      color: (membership?.color as Category['color']) ?? null,
      icon: membership?.icon ?? null,
      created_at: membership?.created_at ?? snapshot.created_at,
    })
  }

  for (const snapshot of snapshots) {
    if (!isActiveSnapshot(snapshot)) continue
    if (hasVisibleField(snapshot, 'sub_pods')) {
      for (const membership of sharedSubPodMemberships(snapshot)) {
        if (membership.category_name) addProjectedCategory(membership.category_name, snapshot, membership)
      }
    }
    if (snapshot.resource_type !== 'pod') continue
    if (!hasVisibleField(snapshot, 'sub_pods')) continue
    const label = subPodLabel(snapshot.resource_label)
    if (!label) continue
    addProjectedCategory(label, snapshot)
  }

  return [...localCategories, ...projected]
}

function projectSharedCompaniesToWorkspace(snapshots: SharedContactAccessSnapshot[], localContacts: Contact[]): Contact[] {
  const companyRecords = localContacts.filter(contact => contact.type === 'Company')
  const byName = new Map<string, Contact>()
  for (const company of companyRecords) {
    const key = normalizeLabel(company.name)
    if (key && !byName.has(key)) byName.set(key, company)
  }

  const projected = new Map<string, Contact>()
  for (const snapshot of snapshots) {
    if (!isActiveSnapshot(snapshot)) continue
    if (!hasVisibleField(snapshot, 'company')) continue
    const labels = unique([
      snapshot.resource_type === 'company' ? snapshot.resource_label : null,
      snapshot.contact.company,
    ])
    for (const label of labels) {
      const key = normalizeLabel(label)
      if (!key || byName.has(key) || projected.has(key)) continue
      projected.set(key, {
        ...normalizeSharedContact({
          ...snapshot.contact,
          id: sharedCompanyId(label),
          name: label,
          email: null,
          phone: null,
          company: null,
          role: null,
          list_ids: [],
          category_ids: [],
          primary_list_id: null,
          company_record_id: null,
          company_ids: [],
          type: 'Company',
          status: 'Active',
          custom_fields: {
            shared_company_record: true,
            shared_contact_grant_id: snapshot.grant_id,
            shared_contact_resource_type: snapshot.resource_type,
            shared_contact_resource_label: snapshot.resource_label,
          },
          created_at: snapshot.created_at,
        }),
      })
    }
  }

  return [...localContacts, ...projected.values()]
}

function sharedCampaignSourcesForSnapshot(snapshot: SharedContactAccessSnapshot): SharedCampaignSource[] {
  if (!hasVisibleField(snapshot, 'campaign')) return []

  const sources: SharedCampaignSource[] = []
  if (snapshot.resource_type === 'campaign') {
    sources.push({
      snapshot,
      label: snapshot.resource_label,
      membership: null,
    })
  }

  for (const membership of sharedCampaignMemberships(snapshot)) {
    if (!membership.campaign_name) continue
    sources.push({
      snapshot,
      label: membership.campaign_name,
      membership,
    })
  }

  return sources
}

function sharedCampaignStageSnapshots(sources: SharedCampaignSource[]): Array<{ name: string; color: string | null; order: number; created_at: string }> {
  const byName = new Map<string, { name: string; color: string | null; order: number; created_at: string }>()

  for (const source of sources) {
    const membership = source.membership
    if (!membership?.stage_name || !hasVisibleField(source.snapshot, 'campaign_step')) continue
    const key = normalizeLabel(membership.stage_name)
    if (!key || byName.has(key)) continue
    byName.set(key, {
      name: membership.stage_name,
      color: membership.stage_color,
      order: membership.stage_order ?? byName.size,
      created_at: membership.created_at ?? source.snapshot.created_at,
    })
  }

  return [...byName.values()].sort((a, b) => a.order - b.order)
}

export function projectSharedCampaignsToWorkspace(
  snapshots: SharedContactAccessSnapshot[],
  {
    campaigns,
    resolveContactId,
  }: {
    campaigns: Campaign[]
    resolveContactId?: (snapshot: SharedContactAccessSnapshot) => string
  },
): Campaign[] {
  const localByName = new Map<string, Campaign>()
  for (const campaign of campaigns) {
    const key = normalizeLabel(campaign.name)
    if (key && !localByName.has(key)) localByName.set(key, campaign)
  }

  const grouped = new Map<string, SharedCampaignSource[]>()
  for (const snapshot of snapshots) {
    if (!isActiveSnapshot(snapshot)) continue
    for (const source of sharedCampaignSourcesForSnapshot(snapshot)) {
      const key = normalizeLabel(source.label)
      if (!key) continue
      grouped.set(key, [...(grouped.get(key) ?? []), source])
    }
  }

  const overlays = new Map<string, Campaign>()
  const virtualCampaigns: Campaign[] = []
  for (const [key, group] of grouped.entries()) {
    const contactIds = unique(group.map(source => resolveContactId?.(source.snapshot) ?? source.snapshot.contact.id))
    const local = localByName.get(key) ?? null
    if (local) {
      overlays.set(local.id, {
        ...local,
        contact_ids: unique([...local.contact_ids, ...contactIds]),
      })
      continue
    }

    const firstSource = group[0]
    const firstMembership = group.find(source => source.membership)?.membership ?? null
    const label = firstMembership?.campaign_name ?? firstSource.label
    const stageSnapshots = sharedCampaignStageSnapshots(group)
    virtualCampaigns.push({
      id: sharedCampaignId(label),
      name: label,
      type: asCampaignType(firstMembership?.campaign_type),
      deadline: firstMembership?.campaign_deadline ?? null,
      status: asCampaignStatus(firstMembership?.campaign_status),
      notes: firstMembership && hasVisibleField(firstSource.snapshot, 'campaign_notes') ? firstMembership.campaign_notes : null,
      description: firstMembership?.campaign_description ?? null,
      custom_fields: {
        shared_campaign: true,
        shared_campaign_grant_ids: unique(group.map(source => source.snapshot.grant_id)),
        shared_campaign_resource_label: label,
        shared_campaign_stages: stageSnapshots,
      },
      contact_ids: contactIds,
      created_at: earliestDate(group.map(source => source.membership?.campaign_created_at ?? source.snapshot.created_at)),
    })
  }

  return [
    ...campaigns.map(campaign => overlays.get(campaign.id) ?? campaign),
    ...virtualCampaigns,
  ]
}

export function projectedSharedCampaignStages(campaign: Campaign): CampaignStage[] {
  if (!isProjectedSharedCampaign(campaign)) return []
  const stageSnapshots = Array.isArray(campaign.custom_fields?.shared_campaign_stages)
    ? campaign.custom_fields.shared_campaign_stages.filter(isRecord)
    : []

  if (stageSnapshots.length > 0) {
    return stageSnapshots.map((stage, index) => ({
      id: `${sharedCampaignStageId(campaign.id)}:${slugLabel(stringValue(stage.name) ?? `stage-${index + 1}`)}`,
      campaign_id: campaign.id,
      name: stringValue(stage.name) ?? 'Shared',
      color: stringValue(stage.color),
      order: numberValue(stage.order) ?? index,
      created_at: stringValue(stage.created_at) ?? campaign.created_at,
    }))
  }

  return [{
    id: sharedCampaignStageId(campaign.id),
    campaign_id: campaign.id,
    name: 'Shared',
    color: null,
    order: 0,
    created_at: campaign.created_at,
  }]
}

export function isProjectedSharedCampaign(campaign: Campaign): boolean {
  return campaign.id.startsWith(SHARED_CAMPAIGN_PREFIX)
    || campaign.custom_fields?.shared_campaign === true
}

export function isProjectedSharedPod(pod: Pod): boolean {
  return pod.id.startsWith(SHARED_POD_PREFIX)
}

export function isProjectedSharedCategory(category: Category): boolean {
  return category.id.startsWith(SHARED_CATEGORY_PREFIX)
}

export function projectSharedWorkspaceResources(
  snapshots: SharedContactAccessSnapshot[],
  structure: ProjectionStructure,
): SharedWorkspaceProjection {
  const pods = projectSharedPodsToWorkspace(snapshots, structure.pods)
  const projectedSubPodParentNeeded = snapshots.some(snapshot => (
    isActiveSnapshot(snapshot)
    && snapshot.resource_type === 'pod'
    && hasVisibleField(snapshot, 'sub_pods')
    && Boolean(subPodLabel(snapshot.resource_label))
    && !structure.categories.some(category => normalizeLabel(category.name) === normalizeLabel(subPodLabel(snapshot.resource_label)))
  ))
  const podsWithSubPodParent = projectedSubPodParentNeeded && !pods.some(pod => normalizeLabel(pod.name) === normalizeLabel(SHARED_SUB_PODS_LABEL))
    ? [
      ...pods,
      {
        id: sharedPodId(SHARED_SUB_PODS_LABEL),
        name: SHARED_SUB_PODS_LABEL,
        color: null,
        owner: null,
        is_priority: false,
        cadence: null,
        description: null,
        capacity: null,
        enrichment_opt_in: false,
        created_at: earliestDate(snapshots.map(snapshot => snapshot.created_at)),
      },
    ]
    : pods
  const categories = projectSharedCategoriesToWorkspace(snapshots, podsWithSubPodParent, structure.categories)
  const contactsWithCompanies = projectSharedCompaniesToWorkspace(snapshots, structure.contacts ?? [])
  const organized = organizeSharedContactsForWorkspace(snapshots, {
    ...structure,
    pods: podsWithSubPodParent,
    categories,
    contacts: contactsWithCompanies,
  })
  const campaigns = projectSharedCampaignsToWorkspace(snapshots, {
    campaigns: structure.campaigns ?? [],
    resolveContactId: snapshot => organized.contactIdBySnapshotKey.get(sharedContactSnapshotKey(snapshot)) ?? snapshot.contact.id,
  })

  return {
    ...organized,
    pods: podsWithSubPodParent,
    categories,
    campaigns,
    contacts: organized.allContacts,
  }
}

function contactIdentityKey(contact: Contact): string {
  const email = [contact.email, contact.email_2, contact.email_3].find(Boolean)
  if (email) return `email:${normalizeLabel(email)}`
  return `name:${normalizeLabel(contact.name)}|company:${normalizeLabel(contact.company)}`
}

export function mergeContactsWithProjectedSharedContacts(localContacts: Contact[], sharedContacts: Contact[]): Contact[] {
  const localIds = new Set(localContacts.map(contact => contact.id))
  const localIdentityKeys = new Set(localContacts.map(contactIdentityKey))
  const merged = [...localContacts]
  const addedSharedIds = new Set<string>()

  for (const contact of sharedContacts) {
    if (localIds.has(contact.id) || addedSharedIds.has(contact.id)) continue
    if (localIdentityKeys.has(contactIdentityKey(contact))) continue
    merged.push(contact)
    addedSharedIds.add(contact.id)
  }

  return merged
}

export function projectedSharedCampaignContacts(
  snapshots: SharedContactAccessSnapshot[],
  campaign: Campaign,
  stages: CampaignStage[],
  resolveContactId: (snapshot: SharedContactAccessSnapshot) => string = snapshot => snapshot.contact.id,
): CampaignContact[] {
  const firstStage = [...stages].sort((a, b) => a.order - b.order)[0] ?? null
  const campaignLabel = normalizeLabel(campaign.name)

  const rows: CampaignContact[] = []

  for (const snapshot of snapshots) {
    if (!isActiveSnapshot(snapshot)) continue
    for (const source of sharedCampaignSourcesForSnapshot(snapshot)) {
      if (normalizeLabel(source.label) !== campaignLabel) continue

      const membership = source.membership
      const contactId = resolveContactId(snapshot)
      const stage = membership?.stage_name && hasVisibleField(snapshot, 'campaign_step')
        ? stages.find(item => normalizeLabel(item.name) === normalizeLabel(membership.stage_name)) ?? firstStage
        : firstStage
      rows.push({
        id: `${SHARED_CAMPAIGN_CONTACT_PREFIX}${snapshot.grant_id}:${contactId}:${campaign.id}:${slugLabel(membership?.campaign_contact_id ?? source.label)}`,
        campaign_id: campaign.id,
        contact_id: contactId,
        status: hasVisibleField(snapshot, 'campaign_status') ? asCampaignContactStatus(membership?.status) : 'pending',
        stage_id: stage?.id ?? null,
        notes: hasVisibleField(snapshot, 'campaign_notes') ? membership?.notes ?? null : null,
        owner: null,
        next_step: hasVisibleField(snapshot, 'campaign_step') ? membership?.next_step ?? null : null,
        next_step_due: hasVisibleField(snapshot, 'campaign_step') ? membership?.next_step_due ?? null : null,
        moved_at: membership?.moved_at ?? snapshot.created_at,
        is_priority: false,
        custom_fields: {
          shared_contact_grant_id: snapshot.grant_id,
          shared_campaign_contact: true,
          shared_campaign_membership_id: membership?.campaign_contact_id ?? null,
        },
        created_at: membership?.created_at ?? snapshot.created_at,
      })
    }
  }

  return rows
}

export function isProjectedSharedCampaignContact(contact: CampaignContact): boolean {
  return contact.id.startsWith(SHARED_CAMPAIGN_CONTACT_PREFIX)
    || contact.custom_fields?.shared_campaign_contact === true
}
