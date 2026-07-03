import type { SharedContactAccessSnapshot } from './collaboration'
import type { Campaign, CampaignContact, CampaignStage, Category, Contact, Pod } from './types'

type ProjectionStructure = {
  pods: Pod[]
  categories: Category[]
  campaigns?: Campaign[]
  contacts?: Contact[]
}

const SHARED_CAMPAIGN_CONTACT_PREFIX = 'shared-campaign-contact:'

export type OrganizedSharedContacts = {
  allContacts: Contact[]
  sharedContacts: Contact[]
  contactIdsByGrantId: Map<string, string[]>
  contactIdBySnapshotKey: Map<string, string>
}

function normalizeLabel(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
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
