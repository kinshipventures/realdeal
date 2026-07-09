import { supabase } from '@/integrations/supabase/client'
import type { Pod, Cadence, Category, Contact, Interaction, InteractionType, Owner, Campaign, CampaignContact, CampaignStage, CampaignType, CampaignContactStatus, CampaignStatus, Project, HexColor, RelationshipType, RelationshipStatus, RelationshipRing } from './types'
import { getActiveWorkspaceId } from './workspace'
import { isDemoMode, DEMO_PODS, DEMO_CATEGORIES, DEMO_CONTACTS, DEMO_INTERACTIONS, DEMO_CAMPAIGNS, DEMO_CAMPAIGN_CONTACTS, DEMO_CAMPAIGN_STAGES, DEMO_PROJECTS, DEMO_COMPANIES } from './sampleData'
import { buildActivityChanges, queueWorkspaceActivityEvent } from './workspaceActivity'

// ── Helper ──────────────────────────────────────────────────────────────────

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

// Supabase returns max 1000 rows by default. Fetch all rows for junction tables.
async function fetchAllRows<T>(
  query: () => ReturnType<ReturnType<typeof supabase.from>['select']>,
): Promise<T[]> {
  const PAGE = 1000
  let offset = 0
  const all: T[] = []
  while (true) {
    const { data, error } = await (query() as any).range(offset, offset + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...(data as T[]))
    if (data.length < PAGE) break
    offset += PAGE
  }
  return all
}

function labelFromContactId(id: string | null | undefined): string | null {
  if (!id) return null
  return _contactsCache?.find(contact => contact.id === id)?.name ?? null
}

function labelFromCampaignId(id: string | null | undefined): string | null {
  if (!id) return null
  return _campaignsCache?.find(campaign => campaign.id === id)?.name ?? null
}

function labelFromPodId(id: string | null | undefined): string | null {
  if (!id) return null
  return _podsCache?.find(pod => pod.id === id)?.name ?? null
}

const CACHE_TTL = 5 * 60 * 1000
type WorkspaceCache<T> = { data: T[] | null; time: number; fetch: Promise<T[]> | null; workspaceId: string | null }

// Generic stale-while-revalidate cache helper
function cachedFetch<T>(
  getCache: () => WorkspaceCache<T>,
  setCache: (data: T[] | null, fetch: Promise<T[]> | null, workspaceId: string | null) => void,
  doFetch: () => Promise<T[]>,
  filter?: (all: T[]) => T[]
): Promise<T[]> {
  const workspaceId = getActiveWorkspaceId()
  const c = getCache()
  const cacheMatchesWorkspace = c.workspaceId === workspaceId
  const cachedData = cacheMatchesWorkspace ? c.data : null
  const cachedFetch = cacheMatchesWorkspace ? c.fetch : null
  const cachedTime = cacheMatchesWorkspace ? c.time : 0
  const isExpired = !cachedData || Date.now() - cachedTime > CACHE_TTL
  const applyFilter = (arr: T[]) => filter ? filter(arr) : arr

  if (!cacheMatchesWorkspace && (c.data || c.fetch)) {
    setCache(null, null, workspaceId)
  }

  if (cachedData && !isExpired) return Promise.resolve(applyFilter(cachedData))

  if (cachedData && isExpired && !cachedFetch) {
    const stale = cachedData
    const p = doFetch().then(result => { setCache(result, null, workspaceId); return result }).catch(err => { setCache(stale, null, workspaceId); throw err })
    setCache(stale, p, workspaceId)
    return Promise.resolve(applyFilter(stale))
  }

  if (!cachedFetch) {
    const p = doFetch().then(result => { setCache(result, null, workspaceId); return result }).catch(err => { setCache(null, null, workspaceId); throw err })
    setCache(null, p, workspaceId)
    return p.then(applyFilter)
  }
  return cachedFetch.then(applyFilter)
}

// ── Pods ─────────────────────────────────────────────────────────────────────

function mapPod(r: any): Pod {
  return {
    id: r.id, name: r.name, color: (r.color ?? null) as HexColor | null,
    owner: r.owner ?? null, is_priority: r.is_priority ?? false, cadence: r.cadence ?? null,
    description: r.description ?? null, capacity: r.capacity ?? null,
    enrichment_opt_in: r.enrichment_opt_in ?? false, created_at: r.created_at,
  }
}

let _podsCache: Pod[] | null = null
let _podsCacheTime = 0
let _podsFetch: Promise<Pod[]> | null = null
let _podsCacheWorkspaceId: string | null = null

async function fetchPods(): Promise<Pod[]> {
  const wsId = getActiveWorkspaceId()
  const { data, error } = await supabase.from('pods').select('*').eq('workspace_id', wsId)
  if (error) throw error
  return (data ?? []).map(mapPod)
}

export function getPods(): Promise<Pod[]> {
  if (isDemoMode()) return Promise.resolve(DEMO_PODS)
  return cachedFetch(
    () => ({ data: _podsCache, time: _podsCacheTime, fetch: _podsFetch, workspaceId: _podsCacheWorkspaceId }),
    (d, f, wsId) => { _podsCache = d; _podsCacheTime = d ? Date.now() : 0; _podsFetch = f; _podsCacheWorkspaceId = wsId },
    fetchPods,
  )
}

export async function createPod(data: {
  name: string; color?: string | null; owner?: Owner | null; is_priority?: boolean
  cadence?: Cadence | null; description?: string | null; capacity?: number | null
}): Promise<Pod> {
  if (isDemoMode()) {
    const p: Pod = {
      id: `demo-pod-${Date.now()}`, name: data.name, color: (data.color ?? null) as HexColor | null,
      owner: data.owner ?? null, is_priority: data.is_priority ?? false, cadence: data.cadence ?? null,
      description: data.description ?? null, capacity: data.capacity ?? null, enrichment_opt_in: false,
      created_at: new Date().toISOString(),
    }
    DEMO_PODS.push(p)
    return p
  }
  const userId = await getUserId()
  const wsId = getActiveWorkspaceId()
  const { data: row, error } = await supabase.from('pods').insert({
    user_id: userId, workspace_id: wsId, name: data.name, color: data.color ?? null, owner: data.owner ?? null,
    is_priority: data.is_priority ?? false, cadence: data.cadence ?? null,
    description: data.description ?? null, capacity: data.capacity ?? null,
  }).select().single()
  if (error) throw error
  _podsCache = null
  const pod = mapPod(row)
  queueWorkspaceActivityEvent({ action: 'created', entityType: 'pod', entityId: pod.id, entityLabel: pod.name })
  return pod
}

export async function updatePod(id: string, data: Partial<{
  name: string; color: string | null; owner: Owner | null; is_priority: boolean
  cadence: Cadence | null; description: string | null; capacity: number | null; enrichment_opt_in: boolean
}>): Promise<Pod> {
  if (isDemoMode()) {
    const pod = DEMO_PODS.find(p => p.id === id)
    if (pod) Object.assign(pod, data)
    return pod ?? ({ id, ...data } as Pod)
  }
  const { data: row, error } = await supabase.from('pods').update(data).eq('id', id).select().single()
  if (error) throw error
  _podsCache = null
  const pod = mapPod(row)
  queueWorkspaceActivityEvent({ action: 'updated', entityType: 'pod', entityId: pod.id, entityLabel: pod.name, changes: buildActivityChanges(data) })
  return pod
}

export async function deletePod(id: string): Promise<void> {
  if (isDemoMode()) {
    const idx = DEMO_PODS.findIndex(p => p.id === id)
    if (idx >= 0) DEMO_PODS.splice(idx, 1)
    const removedCategoryIds = new Set(DEMO_CATEGORIES.filter(c => c.list_id === id).map(c => c.id))
    for (let i = DEMO_CATEGORIES.length - 1; i >= 0; i -= 1) {
      if (DEMO_CATEGORIES[i].list_id === id) DEMO_CATEGORIES.splice(i, 1)
    }
    for (const contact of DEMO_CONTACTS) {
      const nextPodIds = contact.list_ids.filter(podId => podId !== id)
      const nextCategoryIds = contact.category_ids.filter(categoryId => !removedCategoryIds.has(categoryId))
      contact.list_ids = nextPodIds
      contact.category_ids = nextCategoryIds
      if (contact.primary_list_id === id) contact.primary_list_id = nextPodIds[0] ?? null
    }
    return
  }
  const deletedPod = _podsCache?.find(p => p.id === id)
  const wsId = getActiveWorkspaceId()
  const { data: categoryRows, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('workspace_id', wsId)
    .eq('pod_id', id)
  if (categoryError) throw categoryError

  const removedCategoryIds = new Set((categoryRows ?? []).map(row => row.id))
  const { data: contactRows, error: contactsError } = await supabase
    .from('contacts')
    .select('id,pod_ids,category_ids,primary_pod_id')
    .eq('workspace_id', wsId)
  if (contactsError) throw contactsError

  await Promise.all((contactRows ?? []).map(async row => {
    const podIds = Array.isArray(row.pod_ids) ? row.pod_ids : []
    const categoryIds = Array.isArray(row.category_ids) ? row.category_ids : []
    const nextPodIds = podIds.filter(podId => podId !== id)
    const nextCategoryIds = categoryIds.filter(categoryId => !removedCategoryIds.has(categoryId))
    const nextPrimaryPodId = row.primary_pod_id === id ? (nextPodIds[0] ?? null) : row.primary_pod_id
    if (
      nextPrimaryPodId === row.primary_pod_id &&
      nextPodIds.length === podIds.length &&
      nextCategoryIds.length === categoryIds.length
    ) return

    const { error } = await supabase
      .from('contacts')
      .update({
        pod_ids: nextPodIds,
        category_ids: nextCategoryIds,
        primary_pod_id: nextPrimaryPodId,
      })
      .eq('workspace_id', wsId)
      .eq('id', row.id)
    if (error) throw error
  }))

  const { error } = await supabase.from('pods').delete().eq('id', id)
  if (error) throw error
  _podsCache = null
  _categoriesCache = null
  _contactsCache = null
  queueWorkspaceActivityEvent({ action: 'deleted', entityType: 'pod', entityId: id, entityLabel: deletedPod?.name ?? null })
}

// ── Categories ───────────────────────────────────────────────────────────────

function mapCategory(r: any): Category {
  return { id: r.id, list_id: r.pod_id, name: r.name, color: (r.color ?? null) as HexColor | null, icon: r.icon ?? null, created_at: r.created_at }
}

let _categoriesCache: Category[] | null = null
let _categoriesCacheTime = 0
let _categoriesFetch: Promise<Category[]> | null = null
let _categoriesCacheWorkspaceId: string | null = null

async function fetchCategories(): Promise<Category[]> {
  const wsId = getActiveWorkspaceId()
  const { data, error } = await supabase.from('categories').select('*').eq('workspace_id', wsId)
  if (error) throw error
  return (data ?? []).map(mapCategory)
}

export function getCategories(listId?: string): Promise<Category[]> {
  if (isDemoMode()) return Promise.resolve(listId ? DEMO_CATEGORIES.filter(c => c.list_id === listId) : DEMO_CATEGORIES)
  return cachedFetch(
    () => ({ data: _categoriesCache, time: _categoriesCacheTime, fetch: _categoriesFetch, workspaceId: _categoriesCacheWorkspaceId }),
    (d, f, wsId) => { _categoriesCache = d; _categoriesCacheTime = d ? Date.now() : 0; _categoriesFetch = f; _categoriesCacheWorkspaceId = wsId },
    fetchCategories,
    listId ? (all => all.filter(c => c.list_id === listId)) : undefined,
  )
}

export async function createCategory(name: string, listId: string): Promise<Category> {
  if (isDemoMode()) {
    const c: Category = { id: `demo-cat-${Date.now()}`, list_id: listId, name, color: null, icon: null, created_at: new Date().toISOString() }
    DEMO_CATEGORIES.push(c)
    return c
  }
  const userId = await getUserId()
  const { data: row, error } = await supabase.from('categories').insert({ user_id: userId, workspace_id: getActiveWorkspaceId(), name, pod_id: listId }).select().single()
  if (error) throw error
  _categoriesCache = null
  const category = mapCategory(row)
  queueWorkspaceActivityEvent({
    action: 'created',
    entityType: 'sub_pod',
    entityId: category.id,
    entityLabel: category.name,
    relatedType: 'pod',
    relatedId: listId,
    relatedLabel: labelFromPodId(listId),
  })
  return category
}

export async function updateCategory(id: string, data: Partial<Pick<Category, 'name' | 'color' | 'icon'>>): Promise<Category> {
  if (isDemoMode()) {
    const cat = DEMO_CATEGORIES.find(c => c.id === id)
    if (cat) Object.assign(cat, data)
    return cat ?? ({ id, ...data } as Category)
  }
  const { icon, ...updateData } = data as any
  const { data: row, error } = await supabase.from('categories').update(updateData).eq('id', id).select().single()
  if (error) throw error
  _categoriesCache = null
  const category = mapCategory(row)
  queueWorkspaceActivityEvent({
    action: 'updated',
    entityType: 'sub_pod',
    entityId: category.id,
    entityLabel: category.name,
    relatedType: 'pod',
    relatedId: category.list_id,
    relatedLabel: labelFromPodId(category.list_id),
    changes: buildActivityChanges(updateData),
  })
  return category
}

export async function deleteCategory(id: string): Promise<void> {
  if (isDemoMode()) {
    const idx = DEMO_CATEGORIES.findIndex(c => c.id === id)
    if (idx >= 0) DEMO_CATEGORIES.splice(idx, 1)
    return
  }
  const deletedCategory = _categoriesCache?.find(c => c.id === id)
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
  _categoriesCache = null
  queueWorkspaceActivityEvent({
    action: 'deleted',
    entityType: 'sub_pod',
    entityId: id,
    entityLabel: deletedCategory?.name ?? null,
    relatedType: 'pod',
    relatedId: deletedCategory?.list_id ?? null,
    relatedLabel: labelFromPodId(deletedCategory?.list_id),
  })
}

// ── Contacts ─────────────────────────────────────────────────────────────────

async function enrichContactJunctions(contacts: any[]): Promise<Contact[]> {
  if (contacts.length === 0) return []
  // category_ids now stored directly on contacts table
  return contacts.map(r => mapContact(r))
}

function mapContact(r: any, catIds?: string[]): Contact {
  const categoryIds = catIds ?? r.category_ids ?? []
  const podIds = r.pod_ids ?? []
  const primaryPodId = r.primary_pod_id ?? null
  const companyIds = r.company_ids ?? (r.company_id ? [r.company_id] : [])
  const customFields = r.custom_fields ?? {}
  const ringIds = Array.isArray(r.ring_ids)
    ? r.ring_ids
    : Array.isArray(customFields.relationship_rings)
      ? customFields.relationship_rings
      : []
  return {
    id: r.id, name: r.name, email: r.email ?? null, phone: r.phone ?? null,
    company: r.company ?? null, role: r.role ?? null, location: r.location ?? null,
    website: r.website ?? null, notes: r.notes ?? null, recommended_by: r.recommended_by ?? null,
    specialization: r.specialization ?? null, past_clients: r.past_clients ?? null,
    birthday: r.birthday ?? null, milestones: r.milestones ?? null, interests: r.interests ?? null,
    relationship_context: r.relationship_context ?? null, last_contacted_at: r.last_contacted_at ?? null,
    list_ids: podIds, category_ids: categoryIds,
    primary_list_id: primaryPodId, cadence_override: r.cadence_override ?? null,
    first_name: r.first_name ?? null, last_name: r.last_name ?? null, linkedin: r.linkedin ?? null,
    country: r.country ?? null, global_region: r.global_region ?? null, gender: r.gender ?? null,
    introduced_by: r.introduced_by ?? null, intel_notes: r.intel_notes ?? null,
    relationship_owner: r.relationship_owner ?? null, contact_frequency: r.contact_frequency ?? null,
    next_follow_up_date: r.next_follow_up_date ?? null, next_action: r.next_action ?? null,
    kv_fund_investor: r.kv_fund_investor ?? null, spv_investor: r.spv_investor ?? null,
    needs_review: r.needs_review ?? false, type: r.type ?? 'Contact', status: r.status ?? 'Active',
    ring_ids: ringIds as RelationshipRing[],
    company_record_id: companyIds[0] ?? r.company_id ?? null,
    company_ids: companyIds,
    industry: r.industry ?? null, stage: r.stage ?? null,
    ticker: r.ticker ?? null, domain: r.domain ?? null, email_2: r.email_2 ?? null,
    email_3: r.email_3 ?? null, communication_preferences: r.communication_preferences ?? null,
    photo_url: null,
    custom_fields: customFields, snoozed_until: r.snoozed_until ?? null, created_at: r.created_at,
  }
}

let _contactsCache: Contact[] | null = null
let _contactsCacheTime = 0
let _contactsFetch: Promise<Contact[]> | null = null
let _contactsCacheWorkspaceId: string | null = null

async function fetchContacts(): Promise<Contact[]> {
  const wsId = getActiveWorkspaceId()
  const data = await fetchAllRows<any>(() => supabase.from('contacts').select('*').eq('workspace_id', wsId))
  return enrichContactJunctions(data)
}

export function getContacts(categoryId?: string): Promise<Contact[]> {
  if (isDemoMode()) return Promise.resolve(categoryId ? DEMO_CONTACTS.filter(c => c.category_ids.includes(categoryId)) : DEMO_CONTACTS)
  return cachedFetch(
    () => ({ data: _contactsCache, time: _contactsCacheTime, fetch: _contactsFetch, workspaceId: _contactsCacheWorkspaceId }),
    (d, f, wsId) => { _contactsCache = d; _contactsCacheTime = d ? Date.now() : 0; _contactsFetch = f; _contactsCacheWorkspaceId = wsId },
    fetchContacts,
    categoryId ? (all => all.filter(c => c.category_ids.includes(categoryId))) : undefined,
  )
}

type ContactInput = Omit<Contact, 'id' | 'created_at'>

function buildContactInsert(data: ContactInput, userId: string, wsId: string): Record<string, unknown> {
  // Keep new contacts on the approved schema while preserving approved JSON payloads such as LP tracker fields.
  const incomingCustomFields =
    data.custom_fields && typeof data.custom_fields === 'object' && !Array.isArray(data.custom_fields)
      ? data.custom_fields as Record<string, unknown>
      : {}
  const customFields = {
    ...incomingCustomFields,
    relationship_rings: data.ring_ids ?? incomingCustomFields.relationship_rings ?? [],
  }
  const providedFirstName = typeof data.first_name === 'string' ? data.first_name.trim() : data.first_name
  const firstName = providedFirstName || (data.type === 'Contact' ? data.name : null)
  return {
    user_id: userId, workspace_id: wsId, name: data.name, email: data.email, phone: data.phone,
    company: data.company, role: data.role, location: data.location, website: data.website,
    notes: data.notes, recommended_by: data.recommended_by, specialization: data.specialization,
    past_clients: data.past_clients, birthday: data.birthday, milestones: data.milestones,
    interests: data.interests, relationship_context: data.relationship_context,
    last_contacted_at: data.last_contacted_at, first_name: firstName,
    last_name: data.last_name, linkedin: data.linkedin, country: data.country,
    global_region: data.global_region, gender: data.gender, introduced_by: data.introduced_by,
    intel_notes: data.intel_notes, relationship_owner: data.relationship_owner,
    contact_frequency: data.contact_frequency, next_follow_up_date: data.next_follow_up_date,
    next_action: data.next_action, kv_fund_investor: data.kv_fund_investor,
    spv_investor: data.spv_investor, needs_review: data.needs_review, type: data.type,
    status: data.status, industry: data.industry,
    stage: data.stage, ticker: data.ticker, domain: data.domain,
    cadence_override: data.cadence_override, email_2: data.email_2, email_3: data.email_3,
    custom_fields: customFields,
    import_batch_id: (data as any).import_batch_id ?? null,
    import_source: (data as any).import_source ?? null,
    pod_ids: data.list_ids ?? [],
    primary_pod_id: data.primary_list_id ?? null,
    company_ids: data.company_ids?.length ? data.company_ids : (data.company_record_id ? [data.company_record_id] : []),
    category_ids: data.category_ids ?? [],
  }
}

export async function createContact(data: ContactInput): Promise<Contact> {
  if (isDemoMode()) {
    const c: Contact = { ...data, id: `demo-contact-${Date.now()}`, created_at: new Date().toISOString() }
    DEMO_CONTACTS.push(c)
    return c
  }
  const userId = await getUserId()
  const wsId = getActiveWorkspaceId()
  const insert = buildContactInsert(data, userId, wsId)
  const { data: row, error } = await supabase.from('contacts').insert(insert as any).select().single()
  if (error) throw error
  _contactsCache = null
  const contact = mapContact(row)
  queueWorkspaceActivityEvent({
    action: 'created',
    entityType: contact.type === 'Company' ? 'company' : 'contact',
    entityId: contact.id,
    entityLabel: contact.name,
  })
  return contact
}

export async function createContactsBulk(records: ContactInput[], chunkSize = 100): Promise<Contact[]> {
  if (records.length === 0) return []
  if (isDemoMode()) {
    const now = new Date().toISOString()
    const created = records.map((record, idx) => ({
      ...record,
      id: `demo-contact-${Date.now()}-${idx}`,
      created_at: now,
    }))
    DEMO_CONTACTS.push(...created)
    return created
  }

  const userId = await getUserId()
  const wsId = getActiveWorkspaceId()
  const created: Contact[] = []

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize)
    const inserts = chunk.map(record => buildContactInsert(record, userId, wsId))
    const { data, error } = await supabase.from('contacts').insert(inserts as any).select('*')
    if (error) throw error
    created.push(...((data ?? []) as any[]).map(mapContact))
  }

  _contactsCache = null
  return created
}

export async function updateContact(id: string, data: Partial<Omit<Contact, 'id' | 'created_at'>>): Promise<Contact> {
  if (isDemoMode()) {
    const idx = DEMO_CONTACTS.findIndex(c => c.id === id)
    if (idx === -1) throw new Error('Contact not found')
    Object.assign(DEMO_CONTACTS[idx], data)
    return DEMO_CONTACTS[idx]
  }
  const update: Record<string, unknown> = {}
  const directFields = [
    'name', 'email', 'phone', 'company', 'role', 'location', 'website', 'notes',
    'recommended_by', 'specialization', 'past_clients', 'birthday', 'milestones',
    'interests', 'relationship_context', 'last_contacted_at', 'first_name', 'last_name',
    'linkedin', 'country', 'global_region', 'gender', 'introduced_by', 'intel_notes',
    'relationship_owner', 'contact_frequency', 'next_follow_up_date', 'next_action',
    'kv_fund_investor', 'spv_investor', 'needs_review', 'type', 'status',
    'industry', 'stage', 'ticker', 'domain', 'cadence_override', 'email_2', 'email_3',
    'custom_fields', 'snoozed_until',
  ] as const
  for (const key of directFields) {
    if ((data as any)[key] !== undefined) update[key] = (data as any)[key]
  }
  if (data.ring_ids !== undefined) {
    const existing = _contactsCache?.find(c => c.id === id)
    update.custom_fields = {
      ...(existing?.custom_fields ?? {}),
      ...(typeof update.custom_fields === 'object' && update.custom_fields ? update.custom_fields as Record<string, unknown> : {}),
      relationship_rings: data.ring_ids,
    }
  }
  if (data.company_record_id !== undefined && data.company_ids === undefined) {
    update.company_ids = data.company_record_id ? [data.company_record_id] : []
  }
  if (data.list_ids !== undefined) {
    update.pod_ids = data.list_ids
  }
  if (data.primary_list_id !== undefined) {
    update.primary_pod_id = data.primary_list_id
  }
  if (data.company_ids !== undefined) {
    update.company_ids = data.company_ids
  }
  if (data.category_ids !== undefined) {
    update.category_ids = data.category_ids
  }

  const { data: row, error } = await supabase.from('contacts').update(update as any).eq('id', id).select().single()
  if (error) throw error

  const updated = mapContact(row)
  if (_contactsCache) {
    const idx = _contactsCache.findIndex(c => c.id === id)
    if (idx !== -1) _contactsCache[idx] = updated; else _contactsCache = null
  }
  queueWorkspaceActivityEvent({
    action: 'updated',
    entityType: updated.type === 'Company' ? 'company' : 'contact',
    entityId: updated.id,
    entityLabel: updated.name,
    changes: buildActivityChanges(update),
  })
  return updated
}

export async function deleteContact(id: string): Promise<void> {
  if (isDemoMode()) {
    const idx = DEMO_CONTACTS.findIndex(c => c.id === id)
    if (idx !== -1) DEMO_CONTACTS.splice(idx, 1)
    return
  }
  const deletedContact = _contactsCache?.find(c => c.id === id)
  await assertContactHasNoLockedGmailHistory(id)
  const { error } = await supabase.from('contacts').delete().eq('id', id)
  if (error) throw error
  if (_contactsCache) _contactsCache = _contactsCache.filter(c => c.id !== id)
  queueWorkspaceActivityEvent({
    action: 'deleted',
    entityType: deletedContact?.type === 'Company' ? 'company' : 'contact',
    entityId: id,
    entityLabel: deletedContact?.name ?? null,
  })
}

// ── Interactions ─────────────────────────────────────────────────────────────

function mapInteraction(r: any): Interaction {
  return {
    id: r.id, contact_id: r.contact_id, type: r.type as InteractionType,
    date: r.date, notes: r.notes ?? null, summary: r.summary ?? null,
    source: r.source ?? null, email_link: r.email_link ?? null,
    granola_link: r.granola_link ?? null, event_detail: r.event_detail ?? null,
    actor: r.actor ?? null, created_at: r.created_at,
  }
}

let _interactionsCache: Interaction[] | null = null
let _interactionsCacheTime = 0
let _interactionsFetch: Promise<Interaction[]> | null = null
let _interactionsCacheWorkspaceId: string | null = null

async function fetchInteractions90d(): Promise<Interaction[]> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const wsId = getActiveWorkspaceId()
  const data = await fetchAllRows<any>(() =>
    supabase.from('interactions').select('*')
      .eq('workspace_id', wsId)
      .gte('date', cutoff.toISOString().split('T')[0])
      .order('date', { ascending: false })
  )
  return data.map(mapInteraction)
}

export function getAllInteractions(): Promise<Interaction[]> {
  if (isDemoMode()) return Promise.resolve(DEMO_INTERACTIONS)
  return cachedFetch(
    () => ({ data: _interactionsCache, time: _interactionsCacheTime, fetch: _interactionsFetch, workspaceId: _interactionsCacheWorkspaceId }),
    (d, f, wsId) => { _interactionsCache = d; _interactionsCacheTime = d ? Date.now() : 0; _interactionsFetch = f; _interactionsCacheWorkspaceId = wsId },
    fetchInteractions90d,
  )
}

export function invalidateInteractionsCache(): void { _interactionsCache = null; _interactionsCacheTime = 0; _interactionsFetch = null; _interactionsCacheWorkspaceId = null }
export function invalidateContactsCache(): void { _contactsCache = null; _contactsCacheTime = 0; _contactsFetch = null; _contactsCacheWorkspaceId = null }

export async function getInteractions(contactId: string): Promise<Interaction[]> {
  if (isDemoMode()) return DEMO_INTERACTIONS.filter(i => i.contact_id === contactId)
  const wsId = getActiveWorkspaceId()
  const { data, error } = await supabase.from('interactions').select('*')
    .eq('workspace_id', wsId)
    .eq('contact_id', contactId).order('date', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapInteraction)
}

export async function createInteraction(data: Omit<Interaction, 'id' | 'created_at'>): Promise<Interaction> {
  if (isDemoMode()) {
    const interaction: Interaction = { ...data, id: `demo-int-${Date.now()}`, created_at: new Date().toISOString() }
    DEMO_INTERACTIONS.unshift(interaction)
    return interaction
  }
  const userId = await getUserId()
  const wsId = getActiveWorkspaceId()
  const { data: row, error } = await supabase.from('interactions').insert({
    user_id: userId, workspace_id: wsId, contact_id: data.contact_id, type: data.type, date: data.date,
    notes: data.notes, summary: data.summary, source: data.source as any,
    email_link: data.email_link, granola_link: data.granola_link,
    event_detail: data.event_detail, actor: data.actor,
  }).select().single()
  if (error) throw error
  const mapped = mapInteraction(row)
  if (_interactionsCache) _interactionsCache.unshift(mapped)
  queueWorkspaceActivityEvent({
    action: mapped.type === 'note' ? 'created' : 'contacted',
    entityType: 'interaction',
    entityId: mapped.id,
    entityLabel: labelFromContactId(mapped.contact_id) ?? 'contact',
    relatedType: 'contact',
    relatedId: mapped.contact_id,
    relatedLabel: labelFromContactId(mapped.contact_id),
    changes: buildActivityChanges({ type: mapped.type, date: mapped.date, notes: mapped.notes }),
  })
  return mapped
}

export async function updateInteraction(id: string, data: Partial<Pick<Interaction, 'type' | 'date' | 'notes'>>): Promise<Interaction> {
  if (isDemoMode()) {
    const idx = DEMO_INTERACTIONS.findIndex(i => i.id === id)
    if (idx === -1) throw new Error('Interaction not found')
    Object.assign(DEMO_INTERACTIONS[idx], data)
    return DEMO_INTERACTIONS[idx]
  }
  const existingInteraction = await getInteractionMutationRow(id)
  assertMutableInteraction(existingInteraction)
  const { data: row, error } = await supabase.from('interactions').update(data).eq('id', id).select().single()
  if (error) throw error
  const interaction = mapInteraction(row)
  queueWorkspaceActivityEvent({
    action: 'updated',
    entityType: 'interaction',
    entityId: interaction.id,
    entityLabel: labelFromContactId(interaction.contact_id) ?? 'touchpoint',
    relatedType: 'contact',
    relatedId: interaction.contact_id,
    relatedLabel: labelFromContactId(interaction.contact_id),
    changes: buildActivityChanges(data),
  })
  return interaction
}

export async function deleteInteraction(id: string): Promise<void> {
  if (isDemoMode()) {
    const idx = DEMO_INTERACTIONS.findIndex(i => i.id === id)
    if (idx !== -1) DEMO_INTERACTIONS.splice(idx, 1)
    return
  }
  const deletedInteraction = await getInteractionMutationRow(id)
  assertMutableInteraction(deletedInteraction)
  const { error } = await supabase.from('interactions').delete().eq('id', id)
  if (error) throw error
  if (_interactionsCache) _interactionsCache = _interactionsCache.filter(i => i.id !== id)
  queueWorkspaceActivityEvent({
    action: 'deleted',
    entityType: 'interaction',
    entityId: id,
    entityLabel: labelFromContactId(deletedInteraction?.contact_id) ?? null,
    relatedType: 'contact',
    relatedId: deletedInteraction?.contact_id ?? null,
    relatedLabel: labelFromContactId(deletedInteraction?.contact_id),
  })
}

// ── Follow-up helpers ────────────────────────────────────────────────────────

async function getInteractionMutationRow(id: string): Promise<Pick<Interaction, 'id' | 'contact_id' | 'source'> | null> {
  const cached = _interactionsCache?.find(i => i.id === id)
  if (cached) return cached
  const { data, error } = await supabase
    .from('interactions')
    .select('id, contact_id, source')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as Pick<Interaction, 'id' | 'contact_id' | 'source'> | null
}

function assertMutableInteraction(interaction: Pick<Interaction, 'source'> | null): void {
  if (interaction?.source === 'Gmail') {
    throw new Error('Gmail activity is locked and cannot be edited or deleted.')
  }
}

async function assertContactHasNoLockedGmailHistory(contactId: string): Promise<void> {
  const { data, error } = await supabase
    .from('interactions')
    .select('id')
    .eq('contact_id', contactId)
    .eq('source', 'Gmail')
    .limit(1)
  if (error) throw error
  if ((data ?? []).length > 0) {
    throw new Error('Contacts with Gmail history cannot be deleted.')
  }
}

const CADENCE_MS: Record<Cadence, number> = {
  weekly: 7 * 86400000, biweekly: 14 * 86400000, monthly: 30 * 86400000, quarterly: 90 * 86400000,
}
const GRACE_PERIOD_MS = 14 * 86400000

export function isOverdue(contact: Contact, cadence: Cadence = 'monthly'): boolean {
  if (isInGracePeriod(contact)) return false
  if (!contact.last_contacted_at) return true
  return Date.now() - new Date(contact.last_contacted_at).getTime() > CADENCE_MS[cadence]
}

export function isInGracePeriod(contact: Contact): boolean {
  return Date.now() - new Date(contact.created_at).getTime() < GRACE_PERIOD_MS
}

export async function logInteraction(contactId: string, data: Omit<Interaction, 'id' | 'created_at' | 'contact_id'>): Promise<Interaction> {
  const interaction = await createInteraction({ ...data, contact_id: contactId })
  if (data.type !== 'note') await updateContact(contactId, { last_contacted_at: data.date })
  return interaction
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

function mapCampaign(r: any, contactIds: string[] = []): Campaign {
  return { id: r.id, name: r.name, type: r.type ?? 'other', deadline: r.deadline ?? null, status: r.status ?? 'active', notes: r.notes ?? null, description: r.description ?? null, custom_fields: r.custom_fields ?? {}, contact_ids: contactIds, created_at: r.created_at }
}

// pipelineStageToCampaignStage no longer needed - campaign_stages table uses campaign_id directly

function mapCampaignContact(r: any): CampaignContact {
  return { id: r.id, campaign_id: r.campaign_id, contact_id: r.contact_id, status: r.status ?? 'pending', stage_id: r.stage_id ?? null, notes: r.notes ?? null, owner: r.owner ?? null, next_step: r.next_step ?? null, next_step_due: r.next_step_due ?? null, moved_at: r.moved_at ?? r.created_at, is_priority: r.is_priority ?? false, custom_fields: r.custom_fields ?? {}, created_at: r.created_at }
}

function mapCampaignStage(r: any): CampaignStage {
  return { id: r.id, campaign_id: r.campaign_id, name: r.name, color: r.color ?? null, order: r.order ?? 0, created_at: r.created_at }
}

let _campaignsCache: Campaign[] | null = null
let _campaignsCacheTime = 0
let _campaignsFetch: Promise<Campaign[]> | null = null
let _campaignsCacheWorkspaceId: string | null = null
let _campaignContactsCache: CampaignContact[] | null = null
let _campaignStagesCache: CampaignStage[] | null = null

export function invalidateCampaignsCache(): void {
  _campaignsCache = null
  _campaignsCacheTime = 0
  _campaignsFetch = null
  _campaignsCacheWorkspaceId = null
  _campaignContactsCache = null
  _campaignStagesCache = null
}

async function fetchCampaigns(): Promise<Campaign[]> {
  const wsId = getActiveWorkspaceId()
  const [campRes, ccRes] = await Promise.all([
    supabase.from('campaigns').select('*').eq('workspace_id', wsId),
    supabase.from('campaign_contacts').select('*').eq('workspace_id', wsId),
  ])
  if (campRes.error) throw campRes.error
  if (ccRes.error) throw new Error(`campaign_contacts query failed: ${ccRes.error.message}`)
  const ccs = (ccRes.data ?? []).map(mapCampaignContact)
  _campaignContactsCache = ccs
  _campaignStagesCache = []
  return (campRes.data ?? []).map(r => {
    const ids = ccs.filter(cc => cc.campaign_id === r.id).map(cc => cc.contact_id)
    return mapCampaign(r, [...new Set(ids)])
  })
}

export function getCampaigns(): Promise<Campaign[]> {
  if (isDemoMode()) return Promise.resolve(DEMO_CAMPAIGNS.filter(c => c.status === 'active' || c.status === 'completed'))
  return cachedFetch(
    () => ({ data: _campaignsCache, time: _campaignsCacheTime, fetch: _campaignsFetch, workspaceId: _campaignsCacheWorkspaceId }),
    (d, f, wsId) => { _campaignsCache = d; _campaignsCacheTime = d ? Date.now() : 0; _campaignsFetch = f; _campaignsCacheWorkspaceId = wsId },
    fetchCampaigns,
  )
}

// All campaigns come from campaigns table now (no more pipeline merge)
export async function getAllCampaigns(): Promise<Campaign[]> {
  return getCampaigns()
}

// Get stages for a campaign - uses campaign_stages table
export async function getStagesForCampaign(campaignId: string): Promise<CampaignStage[]> {
  const dbStages = await getPipelineStages(campaignId)
  if (dbStages.length > 0) return dbStages
  return getCampaignStages(campaignId)
}

export async function getCampaignContacts(campaignId: string): Promise<CampaignContact[]> {
  if (isDemoMode()) return DEMO_CAMPAIGN_CONTACTS.filter(cc => cc.campaign_id === campaignId)
  if (!_campaignContactsCache) _campaignsCache = null
  await getCampaigns()
  return (_campaignContactsCache ?? []).filter(cc => cc.campaign_id === campaignId)
}

export async function getCampaignContactsForContact(contactId: string): Promise<CampaignContact[]> {
  if (isDemoMode()) return DEMO_CAMPAIGN_CONTACTS.filter(cc => cc.contact_id === contactId)
  if (!_campaignContactsCache) _campaignsCache = null
  await getCampaigns()
  return (_campaignContactsCache ?? []).filter(cc => cc.contact_id === contactId)
}

export async function createCampaign(data: { name: string; type: CampaignType; deadline?: string | null }): Promise<Campaign> {
  if (isDemoMode()) {
    const c: Campaign = { id: `demo-camp-${Date.now()}`, name: data.name, type: data.type, deadline: data.deadline ?? null, status: 'active', notes: null, description: null, custom_fields: {}, contact_ids: [], created_at: new Date().toISOString() }
    DEMO_CAMPAIGNS.push(c)
    return c
  }
  const userId = await getUserId()
  const { data: row, error } = await supabase.from('campaigns').insert([{ user_id: userId, workspace_id: getActiveWorkspaceId(), name: data.name, type: data.type as any, deadline: data.deadline ?? null }]).select().single()
  if (error) throw error
  _campaignsCache = null
  const campaign = mapCampaign(row)
  queueWorkspaceActivityEvent({
    action: 'created',
    entityType: 'campaign',
    entityId: campaign.id,
    entityLabel: campaign.name,
    changes: buildActivityChanges({ type: campaign.type, deadline: campaign.deadline }),
  })
  return campaign
}

export async function addContactToCampaign(campaignId: string, contactId: string, _stageId?: string): Promise<CampaignContact> {
  const now = new Date().toISOString()
  // If no stage provided, use first stage
  let stageId = _stageId ?? null
  if (!stageId) {
    const stages = await getStagesForCampaign(campaignId)
    if (stages.length > 0) {
      const sorted = [...stages].sort((a, b) => a.order - b.order)
      stageId = sorted[0].id
    }
  }
  if (isDemoMode()) {
    const cc: CampaignContact = { id: `demo-cc-${Date.now()}`, campaign_id: campaignId, contact_id: contactId, status: 'pending', stage_id: stageId, notes: null, owner: null, next_step: null, next_step_due: null, moved_at: now, is_priority: false, custom_fields: {}, created_at: now }
    DEMO_CAMPAIGN_CONTACTS.push(cc)
    const camp = DEMO_CAMPAIGNS.find(c => c.id === campaignId)
    if (camp && !camp.contact_ids.includes(contactId)) camp.contact_ids.push(contactId)
    return cc
  }
  const userId = await getUserId()
  const wsId = getActiveWorkspaceId()
  const { data: existing, error: existingError } = await supabase
    .from('campaign_contacts')
    .select('*')
    .eq('workspace_id', wsId)
    .eq('campaign_id', campaignId)
    .eq('contact_id', contactId)
    .maybeSingle()
  if (existingError) throw existingError
  if (existing) {
    if (!existing.stage_id && stageId) {
      const { data: repaired, error: repairError } = await supabase
        .from('campaign_contacts')
        .update({ stage_id: stageId, moved_at: existing.moved_at ?? now })
        .eq('id', existing.id)
        .select()
        .single()
      if (repairError) throw repairError
      _campaignsCache = null
      _campaignContactsCache = null
      const mapped = mapCampaignContact(repaired)
      queueWorkspaceActivityEvent({
        action: 'moved',
        entityType: 'campaign_contact',
        entityId: mapped.id,
        entityLabel: labelFromContactId(mapped.contact_id) ?? 'contact',
        relatedType: 'campaign',
        relatedId: mapped.campaign_id,
        relatedLabel: labelFromCampaignId(mapped.campaign_id),
        changes: buildActivityChanges({ stage_id: mapped.stage_id }),
      })
      return mapped
    }
    return mapCampaignContact(existing)
  }

  const insertData: any = { user_id: userId, workspace_id: wsId, campaign_id: campaignId, contact_id: contactId }
  if (stageId) insertData.stage_id = stageId
  insertData.moved_at = now
  const { data: row, error } = await supabase.from('campaign_contacts').insert([insertData]).select().single()
  if (error) throw error
  _campaignsCache = null
  _campaignContactsCache = null
  const campaignContact = mapCampaignContact(row)
  queueWorkspaceActivityEvent({
    action: 'created',
    entityType: 'campaign_contact',
    entityId: campaignContact.id,
    entityLabel: labelFromContactId(contactId) ?? 'contact',
    relatedType: 'campaign',
    relatedId: campaignId,
    relatedLabel: labelFromCampaignId(campaignId),
    changes: buildActivityChanges({ campaign_id: campaignId, contact_id: contactId, stage_id: stageId }),
  })
  return campaignContact
}

export async function removeContactFromCampaign(id: string): Promise<void> {
  if (isDemoMode()) {
    const idx = DEMO_CAMPAIGN_CONTACTS.findIndex(cc => cc.id === id)
    if (idx !== -1) {
      const [removed] = DEMO_CAMPAIGN_CONTACTS.splice(idx, 1)
      const camp = DEMO_CAMPAIGNS.find(c => c.id === removed.campaign_id)
      if (camp) camp.contact_ids = camp.contact_ids.filter(contactId => contactId !== removed.contact_id)
    }
    return
  }
  const deletedLink = _campaignContactsCache?.find(cc => cc.id === id)
  const { error } = await supabase.from('campaign_contacts').delete().eq('id', id)
  if (error) throw error
  _campaignsCache = null
  _campaignContactsCache = null
  queueWorkspaceActivityEvent({
    action: 'deleted',
    entityType: 'campaign_contact',
    entityId: id,
    entityLabel: labelFromContactId(deletedLink?.contact_id) ?? 'contact',
    relatedType: 'campaign',
    relatedId: deletedLink?.campaign_id ?? null,
    relatedLabel: labelFromCampaignId(deletedLink?.campaign_id),
  })
}

export async function updateCampaignContactStatus(id: string, status: CampaignContactStatus): Promise<CampaignContact> {
  if (isDemoMode()) {
    const cc = DEMO_CAMPAIGN_CONTACTS.find(c => c.id === id)
    if (cc) cc.status = status
    return cc ?? { id, campaign_id: '', contact_id: '', status, stage_id: null, notes: null, owner: null, next_step: null, next_step_due: null, moved_at: null, is_priority: false, custom_fields: {}, created_at: '' }
  }
  const { data: row, error } = await supabase.from('campaign_contacts').update({ status }).eq('id', id).select().single()
  if (error) throw error
  if (_campaignContactsCache) {
    const idx = _campaignContactsCache.findIndex(cc => cc.id === id)
    if (idx !== -1) _campaignContactsCache[idx] = mapCampaignContact(row)
  }
  const campaignContact = mapCampaignContact(row)
  queueWorkspaceActivityEvent({
    action: 'updated',
    entityType: 'campaign_contact',
    entityId: campaignContact.id,
    entityLabel: labelFromContactId(campaignContact.contact_id) ?? 'contact',
    relatedType: 'campaign',
    relatedId: campaignContact.campaign_id,
    relatedLabel: labelFromCampaignId(campaignContact.campaign_id),
    changes: buildActivityChanges({ status }),
  })
  return campaignContact
}

export async function completeCampaign(id: string): Promise<Campaign> {
  if (isDemoMode()) {
    const c = DEMO_CAMPAIGNS.find(c => c.id === id)
    if (c) c.status = 'completed'
    return c ?? { id, name: '', type: 'other', deadline: null, status: 'completed', notes: null, description: null, custom_fields: {}, contact_ids: [], created_at: '' }
  }
  const { data: row, error } = await supabase.from('campaigns').update({ status: 'completed' as any }).eq('id', id).select().single()
  if (error) throw error
  if (_campaignsCache) {
    const idx = _campaignsCache.findIndex(c => c.id === id)
    if (idx !== -1) _campaignsCache[idx] = { ..._campaignsCache[idx], status: 'completed' }
  }
  const campaign = mapCampaign(row)
  queueWorkspaceActivityEvent({ action: 'completed', entityType: 'campaign', entityId: campaign.id, entityLabel: campaign.name })
  return campaign
}

export async function updateCampaignNotes(id: string, notes: string | null): Promise<void> {
  if (isDemoMode()) {
    const c = DEMO_CAMPAIGNS.find(c => c.id === id)
    if (c) c.notes = notes
    return
  }
  const { error } = await supabase.from('campaigns').update({ notes } as any).eq('id', id)
  if (error) throw error
  if (_campaignsCache) {
    const idx = _campaignsCache.findIndex(c => c.id === id)
    if (idx >= 0) _campaignsCache[idx] = { ..._campaignsCache[idx], notes }
  }
  queueWorkspaceActivityEvent({
    action: 'updated',
    entityType: 'campaign',
    entityId: id,
    entityLabel: labelFromCampaignId(id),
    changes: buildActivityChanges({ notes }),
  })
}


export async function updateCampaign(id: string, data: Partial<Pick<Campaign, 'name' | 'type' | 'deadline' | 'description' | 'notes' | 'custom_fields'>>): Promise<Campaign> {
  if (isDemoMode()) {
    const c = DEMO_CAMPAIGNS.find(c => c.id === id)
    if (c) {
      if (data.custom_fields !== undefined) c.custom_fields = data.custom_fields
      Object.assign(c, { ...data, custom_fields: c.custom_fields })
    }
    return c ?? { id, name: '', type: 'other', deadline: null, status: 'active', notes: null, description: null, custom_fields: {}, contact_ids: [], created_at: '' }
  }
  const dbData: any = {}
  if (data.name !== undefined) dbData.name = data.name
  if (data.deadline !== undefined) dbData.deadline = data.deadline
  if (data.description !== undefined) dbData.description = data.description
  if (data.notes !== undefined) dbData.notes = data.notes
  if (data.type !== undefined) dbData.type = data.type
  if (data.custom_fields !== undefined) {
    dbData.custom_fields = data.custom_fields
  }
  const { data: row, error } = await supabase.from('campaigns').update(dbData).eq('id', id).select().single()
  if (error) throw error
  const updated = mapCampaign(row)
  if (_campaignsCache) {
    const idx = _campaignsCache.findIndex(c => c.id === id)
    if (idx >= 0) _campaignsCache[idx] = { ..._campaignsCache[idx], ...updated }
  }
  queueWorkspaceActivityEvent({
    action: 'updated',
    entityType: 'campaign',
    entityId: updated.id,
    entityLabel: updated.name,
    changes: buildActivityChanges(dbData),
  })
  return updated
}


// campaign_stages table does not exist yet - functions work in demo mode only,
// live mode returns empty / no-ops until the table is created via migration.

export async function getCampaignStages(campaignId: string): Promise<CampaignStage[]> {
  if (isDemoMode()) return DEMO_CAMPAIGN_STAGES.filter(s => s.campaign_id === campaignId).sort((a, b) => a.order - b.order)
  return (_campaignStagesCache ?? []).filter(s => s.campaign_id === campaignId).sort((a, b) => a.order - b.order)
}

export async function createCampaignStage(campaignId: string, name: string, order: number, color?: string): Promise<CampaignStage> {
  if (isDemoMode()) {
    const s: CampaignStage = { id: `demo-cs-${Date.now()}-${order}`, campaign_id: campaignId, name, color: (color ?? null) as HexColor | null, order, created_at: new Date().toISOString() }
    DEMO_CAMPAIGN_STAGES.push(s)
    return s
  }
  const userId = await getUserId()
  const { data: row, error } = await supabase.from('campaign_stages').insert({ user_id: userId, workspace_id: getActiveWorkspaceId(), campaign_id: campaignId, name, order, color: color ?? null }).select().single()
  if (error) throw error
  invalidateCampaignStagesDBCache()
  const stage = mapCampaignStageRow(row)
  queueWorkspaceActivityEvent({
    action: 'created',
    entityType: 'campaign_stage',
    entityId: stage.id,
    entityLabel: stage.name,
    relatedType: 'campaign',
    relatedId: campaignId,
    relatedLabel: labelFromCampaignId(campaignId),
  })
  return stage
}

export async function updateCampaignStage(id: string, data: Partial<Pick<CampaignStage, 'name' | 'color' | 'order'>>): Promise<void> {
  if (isDemoMode()) {
    const s = DEMO_CAMPAIGN_STAGES.find(s => s.id === id)
    if (s) Object.assign(s, data)
    return
  }
  const { error } = await supabase.from('campaign_stages').update(data).eq('id', id)
  if (error) throw error
  invalidateCampaignStagesDBCache()
  queueWorkspaceActivityEvent({
    action: 'updated',
    entityType: 'campaign_stage',
    entityId: id,
    entityLabel: data.name ?? null,
    changes: buildActivityChanges(data),
  })
}

export async function deleteCampaignStage(id: string): Promise<void> {
  if (isDemoMode()) {
    const idx = DEMO_CAMPAIGN_STAGES.findIndex(s => s.id === id)
    if (idx !== -1) DEMO_CAMPAIGN_STAGES.splice(idx, 1)
    return
  }
  const deletedStage = _campaignStagesDBCache?.find(stage => stage.id === id)
  const { error } = await supabase.from('campaign_stages').delete().eq('id', id)
  if (error) throw error
  invalidateCampaignStagesDBCache()
  queueWorkspaceActivityEvent({
    action: 'deleted',
    entityType: 'campaign_stage',
    entityId: id,
    entityLabel: deletedStage?.name ?? null,
    relatedType: 'campaign',
    relatedId: deletedStage?.campaign_id ?? null,
    relatedLabel: labelFromCampaignId(deletedStage?.campaign_id),
  })
}

export async function updateCampaignContact(id: string, data: Partial<Pick<CampaignContact, 'stage_id' | 'owner' | 'next_step' | 'next_step_due' | 'notes' | 'moved_at' | 'is_priority' | 'custom_fields'>>): Promise<CampaignContact> {
  if (isDemoMode()) {
    const cc = DEMO_CAMPAIGN_CONTACTS.find(c => c.id === id)
    if (cc) {
      if (data.custom_fields !== undefined) cc.custom_fields = data.custom_fields
      Object.assign(cc, { ...data, custom_fields: cc.custom_fields })
    }
    return cc ?? { id, campaign_id: '', contact_id: '', status: 'pending', stage_id: null, notes: null, owner: null, next_step: null, next_step_due: null, moved_at: null, is_priority: false, custom_fields: {}, created_at: '' }
  }
  const dbData: any = {}
  if (data.stage_id !== undefined) dbData.stage_id = data.stage_id
  if (data.notes !== undefined) dbData.notes = data.notes
  if (data.owner !== undefined) dbData.owner = data.owner
  if (data.next_step !== undefined) dbData.next_step = data.next_step
  if (data.next_step_due !== undefined) dbData.next_step_due = data.next_step_due
  if (data.moved_at !== undefined) dbData.moved_at = data.moved_at
  if (data.is_priority !== undefined) dbData.is_priority = data.is_priority
  if (data.custom_fields !== undefined) {
    dbData.custom_fields = data.custom_fields
  }
  const { data: row, error } = await supabase.from('campaign_contacts').update(dbData).eq('id', id).select().single()
  if (error) throw error
  if (_campaignContactsCache) {
    const idx = _campaignContactsCache.findIndex(cc => cc.id === id)
    if (idx !== -1) _campaignContactsCache[idx] = mapCampaignContact(row)
  }
  const campaignContact = mapCampaignContact(row)
  queueWorkspaceActivityEvent({
    action: data.stage_id !== undefined ? 'moved' : 'updated',
    entityType: 'campaign_contact',
    entityId: campaignContact.id,
    entityLabel: labelFromContactId(campaignContact.contact_id) ?? 'contact',
    relatedType: 'campaign',
    relatedId: campaignContact.campaign_id,
    relatedLabel: labelFromCampaignId(campaignContact.campaign_id),
    changes: buildActivityChanges(dbData),
  })
  return campaignContact
}

// ── Campaign Stages (DB table) ────────────────────────────────────────────────

function mapCampaignStageRow(r: any): CampaignStage {
  return { id: r.id, campaign_id: r.campaign_id, name: r.name, color: (r.color ?? null) as HexColor | null, order: r.order ?? 0, created_at: r.created_at }
}

let _campaignStagesDBCache: CampaignStage[] | null = null
let _campaignStagesDBCacheTime = 0
let _campaignStagesDBFetch: Promise<CampaignStage[]> | null = null
let _campaignStagesDBCacheWorkspaceId: string | null = null

function invalidateCampaignStagesDBCache(): void {
  _campaignStagesDBCache = null
  _campaignStagesDBCacheTime = 0
  _campaignStagesDBFetch = null
  _campaignStagesDBCacheWorkspaceId = null
}

async function fetchCampaignStagesDB(): Promise<CampaignStage[]> {
  const wsId = getActiveWorkspaceId()
  const { data, error } = await supabase.from('campaign_stages').select('*').eq('workspace_id', wsId)
  if (error) throw error
  return (data ?? []).map(mapCampaignStageRow)
}

export function getPipelineStages(campaignId?: string): Promise<CampaignStage[]> {
  if (isDemoMode()) {
    return Promise.resolve(campaignId ? DEMO_CAMPAIGN_STAGES.filter(s => s.campaign_id === campaignId) : [...DEMO_CAMPAIGN_STAGES])
  }
  return cachedFetch(
    () => ({ data: _campaignStagesDBCache, time: _campaignStagesDBCacheTime, fetch: _campaignStagesDBFetch, workspaceId: _campaignStagesDBCacheWorkspaceId }),
    (d, f, wsId) => { _campaignStagesDBCache = d; _campaignStagesDBCacheTime = d ? Date.now() : 0; _campaignStagesDBFetch = f; _campaignStagesDBCacheWorkspaceId = wsId },
    fetchCampaignStagesDB,
    campaignId ? (all => all.filter(s => s.campaign_id === campaignId)) : undefined,
  )
}

// Legacy stubs for compatibility
export function getPipelines(): Promise<any[]> { return Promise.resolve([]) }
export function getOpportunities(): Promise<any[]> { return Promise.resolve([]) }
export function createOpportunity(): Promise<any> { throw new Error('Opportunities removed') }
export function invalidateOpportunitiesCache(): void {}
export function addOpportunityToProject(): Promise<any> { throw new Error('Opportunities removed') }
export function removeOpportunityFromProject(): Promise<any> { throw new Error('Opportunities removed') }

// ── Projects (removed - stubs for compat) ────────────────────────────────────

export function invalidateProjectsCache(): void {}
export function getProjects(): Promise<Project[]> {
  if (isDemoMode()) return Promise.resolve(DEMO_PROJECTS)
  return Promise.resolve([])
}
export function updateProject(): Promise<any> { throw new Error('Projects removed') }
export function addRecordToProject(): Promise<any> { throw new Error('Projects removed') }
export function removeRecordFromProject(): Promise<any> { throw new Error('Projects removed') }
export function addProjectNote(): Promise<void> { throw new Error('Projects removed') }

// ── Merge records ─────────────────────────────────────────────────────────────

export async function mergeRecords(survivorId: string, loserId: string, fieldOverrides: Partial<Contact>): Promise<Contact> {
  if (isDemoMode()) {
    const sIdx = DEMO_CONTACTS.findIndex(c => c.id === survivorId)
    const lIdx = DEMO_CONTACTS.findIndex(c => c.id === loserId)
    if (sIdx === -1 || lIdx === -1) throw new Error('Record not found in demo data')
    const loser = DEMO_CONTACTS[lIdx]; const survivor = DEMO_CONTACTS[sIdx]
    Object.assign(survivor, fieldOverrides)
    survivor.list_ids = [...new Set([...survivor.list_ids, ...loser.list_ids])]
    survivor.category_ids = [...new Set([...survivor.category_ids, ...loser.category_ids])]
    if (!survivor.primary_list_id && loser.primary_list_id) survivor.primary_list_id = loser.primary_list_id
    DEMO_CAMPAIGN_CONTACTS.forEach(cc => { if (cc.contact_id === loserId) cc.contact_id = survivorId })
    DEMO_CONTACTS.forEach(c => { if (c.company_record_id === loserId) c.company_record_id = survivorId })
    DEMO_INTERACTIONS.forEach(ix => { if (ix.contact_id === loserId) ix.contact_id = survivorId })
    DEMO_INTERACTIONS.push({ id: 'demo-ix-merge-' + Date.now(), contact_id: survivorId, type: 'merge_event', date: new Date().toISOString().split('T')[0], notes: `Merged with ${loser.name} (record deleted)`, summary: null, source: null, email_link: null, granola_link: null, event_detail: JSON.stringify({ merged_name: loser.name, merged_id: loserId }), actor: null, created_at: new Date().toISOString() })
    DEMO_CONTACTS.splice(lIdx > sIdx ? lIdx : lIdx, 1)
    return survivor
  }

  const contacts = await getContacts()
  const survivor = contacts.find(c => c.id === survivorId)
  const loser = contacts.find(c => c.id === loserId)
  if (!survivor || !loser) throw new Error('One or both records not found')

  const mergedFields: Partial<Contact> = {
    ...fieldOverrides,
    list_ids: [...new Set([...survivor.list_ids, ...loser.list_ids])],
    category_ids: [...new Set([...survivor.category_ids, ...loser.category_ids])],
    primary_list_id: survivor.primary_list_id ?? loser.primary_list_id,
  }

  try {
    await supabase.from('campaign_contacts').update({ contact_id: survivorId }).eq('contact_id', loserId)
    await supabase.from('contacts').update({ company_id: survivorId }).eq('company_id', loserId)
    await supabase.from('interactions').update({ contact_id: survivorId }).eq('contact_id', loserId)
    const updated = await updateContact(survivorId, mergedFields)
    await createInteraction({ contact_id: survivorId, type: 'merge_event', date: new Date().toISOString().split('T')[0], notes: `Merged with ${loser.name} (record deleted)`, summary: null, source: null, email_link: null, granola_link: null, event_detail: JSON.stringify({ merged_name: loser.name, merged_id: loserId }), actor: null })
    await deleteContact(loserId)
    invalidateContactsCache()
    invalidateInteractionsCache()
    return updated
  } catch (err) {
    throw new Error(`Merge failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

// ── Workspace management ─────────────────────────────────────────────────────

export interface WorkspaceMember {
  id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  created_at: string
  display_name: string | null
  email: string | null
}

export interface WorkspaceInvite {
  id: string
  workspace_id: string
  email: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  token: string
  accepted_at: string | null
  created_at: string
  invited_by: string
}

export interface IncomingWorkspaceInvite extends WorkspaceInvite {
  workspace_name: string | null
  invited_by_display_name: string | null
  invited_by_email: string | null
}

export interface AcceptedWorkspaceInvite {
  success: boolean
  already_member?: boolean
  workspace_id?: string
  workspace_name?: string
}

type WorkspaceMemberRow = Pick<WorkspaceMember, 'id' | 'user_id' | 'role' | 'created_at'>

type ProfileRow = {
  id: string
  display_name: string | null
  email: string | null
}

export async function fetchWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const { data: members, error } = await supabase
    .from('workspace_members')
    .select('id, user_id, role, created_at')
    .eq('workspace_id', workspaceId)
  if (error) throw error

  const memberRows = (members ?? []) as WorkspaceMemberRow[]
  const userIds = [...new Set(memberRows.map(member => member.user_id).filter(Boolean))]

  const profilesById = new Map<string, ProfileRow>()
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', userIds)

    for (const profile of (profiles ?? []) as ProfileRow[]) {
      profilesById.set(profile.id, profile)
    }
  }

  return memberRows.map(row => {
    const profile = profilesById.get(row.user_id)
    return {
      id: row.id,
      user_id: row.user_id,
      role: row.role,
      created_at: row.created_at,
      display_name: profile?.display_name ?? null,
      email: profile?.email ?? null,
    }
  })
}

export async function fetchPendingInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
  const { data, error } = await supabase
    .from('workspace_invites')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function fetchIncomingWorkspaceInvites(email?: string | null): Promise<IncomingWorkspaceInvite[]> {
  const normalizedEmail = email?.trim().toLowerCase()
  if (!normalizedEmail) return []

  const { data, error } = await supabase
    .from('workspace_invites')
    .select('id, workspace_id, email, role, token, accepted_at, created_at, invited_by, workspaces:workspace_id(id, name)')
    .eq('email', normalizedEmail)
    .is('accepted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error

  const invites = (data ?? []) as any[]
  const inviterIds = [...new Set(invites.map(invite => invite.invited_by).filter(Boolean))]
  const profilesById = new Map<string, ProfileRow>()
  if (inviterIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', inviterIds)
    if (profilesError) throw profilesError

    for (const profile of (profiles ?? []) as ProfileRow[]) {
      profilesById.set(profile.id, profile)
    }
  }

  return invites.map(invite => {
    const workspace = Array.isArray(invite.workspaces) ? invite.workspaces[0] : invite.workspaces
    const inviter = profilesById.get(invite.invited_by)
    return {
      id: invite.id,
      workspace_id: invite.workspace_id,
      email: invite.email,
      role: invite.role,
      token: invite.token,
      accepted_at: invite.accepted_at,
      created_at: invite.created_at,
      invited_by: invite.invited_by,
      workspace_name: workspace?.name ?? null,
      invited_by_display_name: inviter?.display_name ?? null,
      invited_by_email: inviter?.email ?? null,
    }
  })
}

export async function acceptWorkspaceInvite(token: string): Promise<AcceptedWorkspaceInvite> {
  const { data, error } = await supabase.functions.invoke('accept-invite', {
    body: { token },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data as AcceptedWorkspaceInvite
}

export async function declineIncomingWorkspaceInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from('workspace_invites')
    .delete()
    .eq('id', inviteId)
    .is('accepted_at', null)
  if (error) throw error
}

export async function createWorkspaceInvite(workspaceId: string, email: string, role: 'admin' | 'member' = 'member'): Promise<WorkspaceInvite> {
  const userId = await getUserId()
  const normalizedEmail = email.trim().toLowerCase()

  const { data: matchingProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email')
    .ilike('email', normalizedEmail)
    .limit(10)
  if (profilesError) throw profilesError

  const matchingUserIds = [...new Set((matchingProfiles ?? []).map(profile => profile.id).filter(Boolean))]
  if (matchingUserIds.length > 0) {
    const { data: existingMembers, error: membersError } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .in('user_id', matchingUserIds)
      .limit(1)
    if (membersError) throw membersError
    if (existingMembers && existingMembers.length > 0) {
      throw new Error('This user is already a team member')
    }
  }

  // Check for existing pending invite
  const { data: existing } = await supabase
    .from('workspace_invites')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('email', normalizedEmail)
    .is('accepted_at', null)
    .limit(1)
  if (existing && existing.length > 0) throw new Error('Already invited')

  const { data, error } = await supabase
    .from('workspace_invites')
    .insert({ workspace_id: workspaceId, email: normalizedEmail, role, invited_by: userId })
    .select()
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('Already invited')
    throw error
  }
  queueWorkspaceActivityEvent({
    workspaceId,
    action: 'invited',
    entityType: 'workspace_invite',
    entityId: data.id,
    entityLabel: normalizedEmail,
    changes: buildActivityChanges({ role: 'Full access' }),
  })
  return data
}

export async function revokeInvite(inviteId: string): Promise<void> {
  // Check if already accepted
  const { data: invite } = await supabase
    .from('workspace_invites')
    .select('accepted_at, workspace_id, email')
    .eq('id', inviteId)
    .single()
  if (invite?.accepted_at) throw new Error('Already accepted')

  const { error } = await supabase.from('workspace_invites').delete().eq('id', inviteId)
  if (error) throw error
  queueWorkspaceActivityEvent({
    workspaceId: invite?.workspace_id ?? null,
    action: 'revoked_invite',
    entityType: 'workspace_invite',
    entityId: inviteId,
    entityLabel: invite?.email ?? null,
  })
}

export async function removeMember(memberId: string, workspaceId: string): Promise<void> {
  // Prevent removing the last owner
  const { data: owners } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('role', 'owner')
  if (!owners || owners.length <= 1) {
    const { data: target } = await supabase.from('workspace_members').select('role').eq('id', memberId).single()
    if (target?.role === 'owner') throw new Error('Cannot remove the last owner')
  }
  const { data: targetMember } = await supabase
    .from('workspace_members')
    .select('user_id, role')
    .eq('id', memberId)
    .single()
  const targetProfile = targetMember?.user_id
    ? await supabase.from('profiles').select('display_name, email').eq('id', targetMember.user_id).maybeSingle()
    : null

  const { error } = await supabase.from('workspace_members').delete().eq('id', memberId)
  if (error) throw error
  queueWorkspaceActivityEvent({
    workspaceId,
    action: 'removed',
    entityType: 'workspace_member',
    entityId: memberId,
    entityLabel: targetProfile?.data?.display_name || targetProfile?.data?.email || targetMember?.user_id || null,
  })
}

export async function updateMemberRole(memberId: string, role: 'owner' | 'admin' | 'member', workspaceId: string): Promise<void> {
  // Prevent demoting the last owner
  if (role !== 'owner') {
    const { data: current } = await supabase.from('workspace_members').select('role').eq('id', memberId).single()
    if (current?.role === 'owner') {
      const { data: owners } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('role', 'owner')
      if (!owners || owners.length <= 1) throw new Error('Cannot demote the last owner')
    }
  }
  const { error } = await supabase.from('workspace_members').update({ role }).eq('id', memberId)
  if (error) throw error
  queueWorkspaceActivityEvent({
    workspaceId,
    action: 'updated',
    entityType: 'workspace_member',
    entityId: memberId,
    changes: buildActivityChanges({ role }),
  })
}

// ── Contact filter helpers ────────────────────────────────────────────────────

export async function getContactsByType(type: RelationshipType): Promise<Contact[]> {
  const all = await getContacts(); return all.filter(c => c.type === type)
}
export async function getActiveContacts(): Promise<Contact[]> {
  const all = await getContacts(); return all.filter(c => c.status === 'Active')
}
export async function getPendingContacts(): Promise<Contact[]> {
  const all = await getContacts()
  return all.filter(c =>
    c.status === 'Pending' ||
    !c.primary_list_id ||
    c.list_ids.length === 0 ||
    !(c.relationship_context ?? '').trim()
  )
}

// ── Companies (from companies table) ────────────────────────────────────────

export async function getCompanies(): Promise<import('./types').Company[]> {
  if (isDemoMode()) return Promise.resolve(DEMO_COMPANIES)
  const wsId = getActiveWorkspaceId()
  if (!wsId) return []
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('workspace_id', wsId)
    .order('name')
  if (error) throw error
  return (data ?? []).map(r => ({
    id: r.id,
    name: r.name,
    website: r.website,
    domain: r.domain,
    ticker: r.ticker,
    location: r.location,
    stage: r.stage,
    industry: r.industry,
    notes: r.notes,
    custom_fields: (r.custom_fields ?? {}) as Record<string, unknown>,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }))
}

export function invalidateAllCaches(): void {
  _podsCache = null; _podsCacheTime = 0; _podsFetch = null; _podsCacheWorkspaceId = null
  _categoriesCache = null; _categoriesCacheTime = 0; _categoriesFetch = null; _categoriesCacheWorkspaceId = null
  _contactsCache = null; _contactsCacheTime = 0; _contactsFetch = null; _contactsCacheWorkspaceId = null
  _interactionsCache = null; _interactionsCacheTime = 0; _interactionsFetch = null; _interactionsCacheWorkspaceId = null
  _campaignsCache = null; _campaignsCacheTime = 0; _campaignsFetch = null; _campaignsCacheWorkspaceId = null
  _campaignContactsCache = null; _campaignStagesCache = null
  _campaignStagesDBCache = null; _campaignStagesDBCacheTime = 0; _campaignStagesDBFetch = null; _campaignStagesDBCacheWorkspaceId = null
}
