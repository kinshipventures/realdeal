import type { SharedContactAccessSnapshot } from './collaboration'
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
  const localPodIds = new Set(structure.pods.map(pod => pod.id))
  const localCategoryIds = new Set(structure.categories.map(category => category.id))
  const listIds = new Set(contact.list_ids.filter(id => localPodIds.has(id)))
  const categoryIds = new Set(contact.category_ids.filter(id => localCategoryIds.has(id)))

  if (snapshot.resource_type === 'pod') {
    const targetSubPodLabel = subPodLabel(snapshot.resource_label)
    if (targetSubPodLabel) {
      const category = findByName(structure.categories, targetSubPodLabel)
      if (category) {
        categoryIds.add(category.id)
        listIds.add(category.list_id)
      }
    } else {
      const pod = findByName(structure.pods, snapshot.resource_label)
      if (pod) listIds.add(pod.id)
    }
  }

  const companyRecords = structure.contacts?.filter(item => item.type === 'Company') ?? []
  const matchedCompany = findByName(companyRecords, contact.company)
    ?? (snapshot.resource_type === 'company' ? findByName(companyRecords, snapshot.resource_label) : null)
  const companyRecordId = matchedCompany?.id ?? (companyRecords.some(company => company.id === contact.company_record_id) ? contact.company_record_id : null)

  return {
    ...contact,
    list_ids: [...listIds],
    category_ids: [...categoryIds],
    primary_list_id: listIds.has(contact.primary_list_id ?? '') ? contact.primary_list_id : [...listIds][0] ?? null,
    company_record_id: companyRecordId,
    company_ids: unique([companyRecordId, ...contact.company_ids.filter(id => companyRecords.some(company => company.id === id))]),
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
  for (const snapshot of snapshots) {
    if (!isActiveSnapshot(snapshot) || snapshot.resource_type !== 'pod') continue
    if (subPodLabel(snapshot.resource_label)) continue
    const key = normalizeLabel(snapshot.resource_label)
    if (!key || byName.has(key) || projectedKeys.has(key)) continue
    projectedKeys.add(key)
    projected.push({
      id: sharedPodId(snapshot.resource_label),
      name: snapshot.resource_label,
      color: null,
      owner: null,
      is_priority: false,
      cadence: null,
      description: null,
      capacity: null,
      enrichment_opt_in: false,
      created_at: snapshot.created_at,
    })
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
  for (const snapshot of snapshots) {
    if (!isActiveSnapshot(snapshot) || snapshot.resource_type !== 'pod') continue
    const label = subPodLabel(snapshot.resource_label)
    if (!label) continue
    const key = normalizeLabel(label)
    if (!key || byName.has(key) || projectedKeys.has(key)) continue
    projectedKeys.add(key)

    const parentPod = pods.find(pod => pod.id === snapshot.contact.primary_list_id)
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
      list_id: parentPod.id,
      name: label,
      color: null,
      icon: null,
      created_at: snapshot.created_at,
    })
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

  const grouped = new Map<string, SharedContactAccessSnapshot[]>()
  for (const snapshot of snapshots) {
    if (!isActiveSnapshot(snapshot) || snapshot.resource_type !== 'campaign') continue
    const key = normalizeLabel(snapshot.resource_label)
    if (!key) continue
    grouped.set(key, [...(grouped.get(key) ?? []), snapshot])
  }

  const overlays = new Map<string, Campaign>()
  const virtualCampaigns: Campaign[] = []
  for (const [key, group] of grouped.entries()) {
    const contactIds = unique(group.map(snapshot => resolveContactId?.(snapshot) ?? snapshot.contact.id))
    const local = localByName.get(key) ?? null
    if (local) {
      overlays.set(local.id, {
        ...local,
        contact_ids: unique([...local.contact_ids, ...contactIds]),
      })
      continue
    }

    const label = group[0].resource_label
    virtualCampaigns.push({
      id: sharedCampaignId(label),
      name: label,
      type: 'outreach',
      deadline: null,
      status: 'active',
      notes: null,
      description: null,
      custom_fields: {
        shared_campaign: true,
        shared_campaign_grant_ids: unique(group.map(snapshot => snapshot.grant_id)),
        shared_campaign_resource_label: label,
      },
      contact_ids: contactIds,
      created_at: earliestDate(group.map(snapshot => snapshot.created_at)),
    })
  }

  return [
    ...campaigns.map(campaign => overlays.get(campaign.id) ?? campaign),
    ...virtualCampaigns,
  ]
}

export function projectedSharedCampaignStages(campaign: Campaign): CampaignStage[] {
  if (!isProjectedSharedCampaign(campaign)) return []
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

  return snapshots
    .filter(snapshot => (
      isActiveSnapshot(snapshot)
      && snapshot.resource_type === 'campaign'
      && normalizeLabel(snapshot.resource_label) === campaignLabel
    ))
    .map(snapshot => {
      const contactId = resolveContactId(snapshot)
      return {
        id: `${SHARED_CAMPAIGN_CONTACT_PREFIX}${snapshot.grant_id}:${contactId}:${campaign.id}`,
        campaign_id: campaign.id,
        contact_id: contactId,
        status: 'pending',
        stage_id: firstStage?.id ?? null,
        notes: null,
        owner: null,
        next_step: null,
        next_step_due: null,
        moved_at: snapshot.created_at,
        is_priority: false,
        custom_fields: {
          shared_contact_grant_id: snapshot.grant_id,
          shared_campaign_contact: true,
        },
        created_at: snapshot.created_at,
      }
    })
}

export function isProjectedSharedCampaignContact(contact: CampaignContact): boolean {
  return contact.id.startsWith(SHARED_CAMPAIGN_CONTACT_PREFIX)
    || contact.custom_fields?.shared_campaign_contact === true
}
