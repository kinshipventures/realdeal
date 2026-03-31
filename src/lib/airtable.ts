import type { Pod, Cadence, Category, Contact, Interaction, InteractionType, Owner, Campaign, CampaignContact, CampaignType, CampaignContactStatus, CampaignStatus, GlobalRegion, Gender, ContactFrequency, InteractionSource, RelationshipType, RelationshipStatus, Pipeline, PipelineStage, Opportunity, OpportunityStatus, OpportunityPriority, Project, PipelineStatus } from './types'
import { isDemoMode, DEMO_PODS, DEMO_CATEGORIES, DEMO_CONTACTS, DEMO_INTERACTIONS, DEMO_CAMPAIGNS, DEMO_CAMPAIGN_CONTACTS, DEMO_PIPELINES, DEMO_PIPELINE_STAGES, DEMO_OPPORTUNITIES, DEMO_PROJECTS } from './sampleData'

const BASE_URL = `https://api.airtable.com/v0/${import.meta.env.VITE_AIRTABLE_BASE_ID}`
const TOKEN = import.meta.env.VITE_AIRTABLE_TOKEN

// ── Table IDs ────────────────────────────────────────────────────────────────

export const TABLES = {
  lists: 'tblnsxNUscKApvMsV',
  categories: 'tblVAgv23LUXs7Q0p',
  contacts: 'tbll75mRMMVBGiNpj',
  interactions: 'tblbxLX5EM09Y6xim',
  campaigns: 'tblnrhkuIQgRdnt9w',
  campaignContacts: 'tbliW2w3R21yTqTQk',
  pipelines: 'tblf2LPzPIyfrthQa',
  pipelineStages: 'tblt5AY61E2fnH6Jr',
  opportunities: 'tbl7RSU66DHpTL9G9',
  projects: 'tblbjT4J1gqJw0w2a',
  fieldConfig: 'tblzxWJVXgxb8n2Sn',
} as const

// ── Raw Airtable field shapes ────────────────────────────────────────────────

interface PodFields {
  Name: string
  Color?: string
  Owner?: Owner
  'Is Priority'?: boolean
  Cadence?: Cadence
  Description?: string
  Capacity?: number
  'Enrichment Opt-In'?: boolean
  Categories?: string[]
  Contacts?: string[]
}

interface CategoryFields {
  Name: string
  List?: string[]
  Color?: string
  Contacts?: string[]
}

interface ContactFields {
  Name: string
  Email?: string
  Phone?: string
  Company?: string
  Role?: string
  Location?: string
  Website?: string
  Notes?: string
  'Recommended By'?: string
  Specialization?: string
  'Past Clients'?: string
  Birthday?: string
  Milestones?: string
  Interests?: string
  'Relationship Context'?: string
  'Last Contacted'?: string
  Lists?: string[]
  Categories?: string[]
  Interactions?: string[]
  // V1 expanded fields
  'First Name'?: string
  'Last Name'?: string
  LinkedIn?: string
  Country?: string
  'Global Region'?: string
  Gender?: string
  'Introduced By'?: string
  'Intel / Notes'?: string
  'Relationship Owner'?: string
  'Contact Frequency'?: string
  'Next Follow-Up Date'?: string
  'Next Action'?: string
  'KV Fund Investor'?: unknown[]
  'SPV Investor'?: unknown[]
  'Needs Review'?: boolean
  // v2 relationship fields
  Type?: 'Contact' | 'Company'
  Status?: 'Active' | 'Pending' | 'Archived'
  'Company Record'?: string[]
  Industry?: string
  Stage?: string
  Ticker?: string
  Domain?: string
  'Primary Pod'?: string
  'Cadence Override'?: string
  'Email 2'?: string
  'Email 3'?: string
}

interface InteractionFields {
  Contact?: string[]
  Type?: InteractionType
  Date?: string
  Notes?: string
  // V1 expanded fields
  Summary?: string
  Source?: string
  'Email Link'?: string
  'Granola Link'?: string
  'Event Detail'?: string
  'Actor'?: string
}

interface CampaignFields {
  Name: string
  Type?: CampaignType
  Deadline?: string
  Status?: CampaignStatus
}

interface CampaignContactFields {
  Campaign?: string[]    // linked record IDs (Airtable returns array)
  Contact?: string[]     // linked record IDs
  Status?: CampaignContactStatus
  Notes?: string
}

interface PipelineFields {
  Name: string
  'Pipeline Status'?: 'active' | 'hidden'
}

interface PipelineStageFields {
  Name: string
  Color?: string
  Order?: number
  Pipeline?: string[]
}

interface OpportunityFields {
  Name: string
  Stage?: string[]
  Relationships?: string[]
  Notes?: string
  Priority?: 'high' | 'medium' | 'low'
  'Opportunity Status'?: 'open' | 'won' | 'lost' | 'archived'
}

interface ProjectFields {
  Name: string
  Description?: string
  Owner?: string
  Relationships?: string[]
  Opportunities?: string[]
  Notes?: string
}

// ── Fetch helpers ────────────────────────────────────────────────────────────

interface AirtableRecord<T> {
  id: string
  fields: T
  createdTime: string
}

interface AirtableListResponse<T> {
  records: AirtableRecord<T>[]
  offset?: string
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Airtable ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

async function fetchAll<T>(table: string, params?: Record<string, string>): Promise<AirtableRecord<T>[]> {
  const all: AirtableRecord<T>[] = []
  let offset: string | undefined

  do {
    const url = new URL(`${BASE_URL}/${table}`)
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    if (offset) url.searchParams.set('offset', offset)

    const data = await request<AirtableListResponse<T>>(url.toString().replace(`${BASE_URL}/`, ''))
    all.push(...data.records)
    offset = data.offset
  } while (offset)

  return all
}

// ── Lists ────────────────────────────────────────────────────────────────────

function mapPod(r: AirtableRecord<PodFields>): Pod {
  return {
    id: r.id,
    name: r.fields.Name,
    color: (r.fields.Color ?? null) as import('./types').HexColor | null,
    owner: r.fields.Owner ?? null,
    is_priority: r.fields['Is Priority'] ?? false,
    cadence: r.fields.Cadence ?? null,
    description: r.fields.Description ?? null,
    capacity: r.fields.Capacity != null ? Number(r.fields.Capacity) : null,
    enrichment_opt_in: r.fields['Enrichment Opt-In'] === true,
    created_at: r.createdTime,
  }
}

export async function getPods(): Promise<Pod[]> {
  if (isDemoMode()) return DEMO_PODS
  const records = await fetchAll<PodFields>(TABLES.lists)
  return records.map(mapPod)
}

let _listsCache: Pod[] | null = null

export async function createPod(data: {
  name: string
  color?: string | null
  owner?: Owner | null
  is_priority?: boolean
  cadence?: Cadence | null
  description?: string | null
  capacity?: number | null
}): Promise<Pod> {
  if (isDemoMode()) {
    const p: Pod = {
      id: `demo-pod-${Date.now()}`,
      name: data.name,
      color: (data.color ?? null) as import('./types').HexColor | null,
      owner: data.owner ?? null,
      is_priority: data.is_priority ?? false,
      cadence: data.cadence ?? null,
      description: data.description ?? null,
      capacity: data.capacity ?? null,
      enrichment_opt_in: false,
      created_at: new Date().toISOString(),
    }
    DEMO_PODS.push(p)
    return p
  }
  const r = await request<AirtableRecord<PodFields>>(TABLES.lists, {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        Name: data.name,
        Color: data.color ?? undefined,
        Owner: data.owner ?? undefined,
        'Is Priority': data.is_priority ?? undefined,
        Cadence: data.cadence ?? undefined,
        Description: data.description ?? undefined,
        Capacity: data.capacity ?? undefined,
      },
    }),
  })
  _listsCache = null
  return mapPod(r)
}

export async function updatePod(id: string, data: Partial<{
  name: string
  color: string | null
  owner: Owner | null
  is_priority: boolean
  cadence: Cadence | null
  description: string | null
  capacity: number | null
  enrichment_opt_in: boolean
}>): Promise<Pod> {
  if (isDemoMode()) {
    const pod = DEMO_PODS.find(p => p.id === id)
    if (pod) Object.assign(pod, data)
    return pod ?? ({ id, ...data } as Pod)
  }
  const fields: Record<string, unknown> = {}
  if (data.name !== undefined) fields.Name = data.name
  if (data.color !== undefined) fields.Color = data.color
  if (data.owner !== undefined) fields.Owner = data.owner
  if (data.is_priority !== undefined) fields['Is Priority'] = data.is_priority
  if (data.cadence !== undefined) fields.Cadence = data.cadence
  if (data.description !== undefined) fields.Description = data.description
  if (data.capacity !== undefined) fields.Capacity = data.capacity
  if (data.enrichment_opt_in !== undefined) fields['Enrichment Opt-In'] = data.enrichment_opt_in
  const r = await request<AirtableRecord<PodFields>>(`${TABLES.lists}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  })
  _listsCache = null
  return mapPod(r)
}

// ── Categories ───────────────────────────────────────────────────────────────

function mapCategory(r: AirtableRecord<CategoryFields>): Category {
  return {
    id: r.id,
    list_id: r.fields.List?.[0] ?? '',
    name: r.fields.Name,
    color: (r.fields.Color ?? null) as import('./types').HexColor | null,
    created_at: r.createdTime,
  }
}

const CACHE_TTL = 5 * 60 * 1000

let _categoriesCache: Category[] | null = null
let _categoriesCacheTime = 0
let _categoriesFetch: Promise<Category[]> | null = null

export function getCategories(listId?: string): Promise<Category[]> {
  if (isDemoMode()) return Promise.resolve(listId ? DEMO_CATEGORIES.filter(c => c.list_id === listId) : DEMO_CATEGORIES)
  const isExpired = !_categoriesCache || Date.now() - _categoriesCacheTime > CACHE_TTL
  const isFresh = _categoriesCache && !isExpired

  if (isFresh) {
    return Promise.resolve(
      listId ? _categoriesCache!.filter(c => c.list_id === listId) : _categoriesCache!
    )
  }

  // Stale-while-revalidate: return stale immediately, refresh in background
  if (_categoriesCache && isExpired && !_categoriesFetch) {
    const stale = _categoriesCache
    _categoriesFetch = fetchAll<CategoryFields>(TABLES.categories)
      .then(records => {
        _categoriesCache = records.map(mapCategory)
        _categoriesCacheTime = Date.now()
        _categoriesFetch = null
        return _categoriesCache
      })
      .catch(err => { _categoriesFetch = null; throw err })
    return Promise.resolve(
      listId ? stale.filter(c => c.list_id === listId) : stale
    )
  }

  // Cold cache — deduplicate concurrent fetches via in-flight Promise
  if (!_categoriesFetch) {
    _categoriesFetch = fetchAll<CategoryFields>(TABLES.categories)
      .then(records => {
        _categoriesCache = records.map(mapCategory)
        _categoriesCacheTime = Date.now()
        _categoriesFetch = null
        return _categoriesCache
      })
      .catch(err => { _categoriesFetch = null; throw err })
  }
  return _categoriesFetch.then(all => listId ? all.filter(c => c.list_id === listId) : all)
}

export async function createCategory(name: string, listId: string): Promise<Category> {
  const r = await request<AirtableRecord<CategoryFields>>(TABLES.categories, {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        Name: name,
        List: [listId],
      },
    }),
  })
  _categoriesCache = null
  return mapCategory(r)
}

// ── Contacts ─────────────────────────────────────────────────────────────────

function mapContact(r: AirtableRecord<ContactFields>): Contact {
  return {
    id: r.id,
    name: r.fields.Name,
    email: r.fields.Email ?? null,
    phone: r.fields.Phone ?? null,
    company: r.fields.Company ?? null,
    role: r.fields.Role ?? null,
    location: r.fields.Location ?? null,
    website: r.fields.Website ?? null,
    notes: r.fields.Notes ?? null,
    recommended_by: r.fields['Recommended By'] ?? null,
    specialization: r.fields.Specialization ?? null,
    past_clients: r.fields['Past Clients'] ?? null,
    birthday: r.fields.Birthday ?? null,
    milestones: r.fields.Milestones ?? null,
    interests: r.fields.Interests ?? null,
    relationship_context: r.fields['Relationship Context'] ?? null,
    last_contacted_at: r.fields['Last Contacted'] ?? null,
    list_ids: r.fields.Lists ?? [],
    category_ids: r.fields.Categories ?? [],
    first_name: r.fields['First Name'] ?? null,
    last_name: r.fields['Last Name'] ?? null,
    linkedin: r.fields.LinkedIn ?? null,
    country: r.fields.Country ?? null,
    global_region: (r.fields['Global Region'] as GlobalRegion) ?? null,
    gender: (r.fields.Gender as Gender) ?? null,
    introduced_by: r.fields['Introduced By'] ?? null,
    intel_notes: r.fields['Intel / Notes'] ?? null,
    relationship_owner: r.fields['Relationship Owner'] ?? null,
    contact_frequency: (r.fields['Contact Frequency'] as ContactFrequency) ?? null,
    next_follow_up_date: r.fields['Next Follow-Up Date'] ?? null,
    next_action: r.fields['Next Action'] ?? null,
    kv_fund_investor: (r.fields['KV Fund Investor'] as any[] || []).map((v: any) => typeof v === 'string' ? v : v.name) || null,
    spv_investor: (r.fields['SPV Investor'] as any[] || []).map((v: any) => typeof v === 'string' ? v : v.name) || null,
    needs_review: !!r.fields['Needs Review'],
    type: (r.fields.Type ?? 'Contact') as RelationshipType,
    status: (r.fields.Status ?? 'Active') as RelationshipStatus,
    company_record_id: r.fields['Company Record']?.[0] ?? null,
    industry: r.fields.Industry ?? null,
    stage: r.fields.Stage ?? null,
    ticker: r.fields.Ticker ?? null,
    domain: r.fields.Domain ?? null,
    primary_list_id: r.fields['Primary Pod'] ?? null,
    cadence_override: (r.fields['Cadence Override'] as import('./types').Cadence) ?? null,
    email_2: r.fields['Email 2'] ?? null,
    email_3: r.fields['Email 3'] ?? null,
    custom_fields: (() => {
      const knownFields = new Set(['Name', 'Email', 'Phone', 'Company', 'Role', 'Location', 'Website', 'Notes', 'Recommended By', 'Specialization', 'Past Clients', 'Birthday', 'Milestones', 'Interests', 'Relationship Context', 'Last Contacted', 'Lists', 'Categories', 'Interactions', 'First Name', 'Last Name', 'LinkedIn', 'Country', 'Global Region', 'Gender', 'Introduced By', 'Intel / Notes', 'Relationship Owner', 'Contact Frequency', 'Next Follow-Up Date', 'Next Action', 'KV Fund Investor', 'SPV Investor', 'Needs Review', 'Type', 'Status', 'Company Record', 'Industry', 'Stage', 'Ticker', 'Domain', 'Primary Pod', 'Cadence Override', 'Email 2', 'Email 3'])
      const result: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(r.fields)) {
        if (!knownFields.has(key) && value !== undefined && value !== null) {
          result[key] = value
        }
      }
      return result
    })(),
    created_at: r.createdTime,
  }
}

let _contactsCache: Contact[] | null = null
let _contactsCacheTime = 0
let _contactsFetch: Promise<Contact[]> | null = null

export function getContacts(categoryId?: string): Promise<Contact[]> {
  if (isDemoMode()) return Promise.resolve(categoryId ? DEMO_CONTACTS.filter(c => c.category_ids.includes(categoryId)) : DEMO_CONTACTS)
  const isExpired = !_contactsCache || Date.now() - _contactsCacheTime > CACHE_TTL
  const isFresh = _contactsCache && !isExpired

  if (isFresh) {
    return Promise.resolve(
      categoryId ? _contactsCache!.filter(c => c.category_ids.includes(categoryId)) : _contactsCache!
    )
  }

  // Stale-while-revalidate: return stale immediately, refresh in background
  if (_contactsCache && isExpired && !_contactsFetch) {
    const stale = _contactsCache
    _contactsFetch = fetchAll<ContactFields>(TABLES.contacts)
      .then(records => {
        _contactsCache = records.map(mapContact)
        _contactsCacheTime = Date.now()
        _contactsFetch = null
        return _contactsCache
      })
      .catch(err => { _contactsFetch = null; throw err })
    return Promise.resolve(
      categoryId ? stale.filter(c => c.category_ids.includes(categoryId)) : stale
    )
  }

  // Cold cache — deduplicate concurrent fetches via in-flight Promise
  if (!_contactsFetch) {
    _contactsFetch = fetchAll<ContactFields>(TABLES.contacts)
      .then(records => {
        _contactsCache = records.map(mapContact)
        _contactsCacheTime = Date.now()
        _contactsFetch = null
        return _contactsCache
      })
      .catch(err => { _contactsFetch = null; throw err })
  }
  return _contactsFetch.then(all => categoryId ? all.filter(c => c.category_ids.includes(categoryId)) : all)
}

export async function createContact(data: Omit<Contact, 'id' | 'created_at'>): Promise<Contact> {
  if (isDemoMode()) {
    const c: Contact = { ...data, id: `demo-contact-${Date.now()}`, created_at: new Date().toISOString() }
    DEMO_CONTACTS.push(c)
    return c
  }
  const r = await request<AirtableRecord<ContactFields>>(TABLES.contacts, {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        Name: data.name,
        Email: data.email ?? undefined,
        Phone: data.phone ?? undefined,
        Company: data.company ?? undefined,
        Role: data.role ?? undefined,
        Location: data.location ?? undefined,
        Website: data.website ?? undefined,
        Notes: data.notes ?? undefined,
        'Recommended By': data.recommended_by ?? undefined,
        Specialization: data.specialization ?? undefined,
        'Past Clients': data.past_clients ?? undefined,
        Birthday: data.birthday ?? undefined,
        Milestones: data.milestones ?? undefined,
        Interests: data.interests ?? undefined,
        'Relationship Context': data.relationship_context ?? undefined,
        'Last Contacted': data.last_contacted_at ?? undefined,
        Lists: data.list_ids.length ? data.list_ids : undefined,
        Categories: data.category_ids.length ? data.category_ids : undefined,
        'First Name': data.first_name ?? undefined,
        'Last Name': data.last_name ?? undefined,
        LinkedIn: data.linkedin ?? undefined,
        Country: data.country ?? undefined,
        'Global Region': data.global_region ?? undefined,
        Gender: data.gender ?? undefined,
        'Introduced By': data.introduced_by ?? undefined,
        'Intel / Notes': data.intel_notes ?? undefined,
        'Relationship Owner': data.relationship_owner ?? undefined,
        'Contact Frequency': data.contact_frequency ?? undefined,
        'Next Follow-Up Date': data.next_follow_up_date ?? undefined,
        'Next Action': data.next_action ?? undefined,
        'KV Fund Investor': data.kv_fund_investor ?? undefined,
        'SPV Investor': data.spv_investor ?? undefined,
        'Needs Review': data.needs_review || undefined,
        Type: data.type ?? 'Contact',
        Status: data.status ?? 'Active',
        'Company Record': data.company_record_id ? [data.company_record_id] : undefined,
        Industry: data.industry ?? undefined,
        Stage: data.stage ?? undefined,
        Ticker: data.ticker ?? undefined,
        Domain: data.domain ?? undefined,
        'Primary Pod': data.primary_list_id ?? undefined,
        'Cadence Override': data.cadence_override ?? undefined,
        ...(data.email_2 ? { 'Email 2': data.email_2 } : {}),
        ...(data.email_3 ? { 'Email 3': data.email_3 } : {}),
      },
    }),
  })
  _contactsCache = null
  return mapContact(r)
}

export async function updateContact(id: string, data: Partial<Omit<Contact, 'id' | 'created_at'>>): Promise<Contact> {
  const fields: Record<string, unknown> = {}
  if (data.name !== undefined) fields.Name = data.name
  if (data.email !== undefined) fields.Email = data.email
  if (data.phone !== undefined) fields.Phone = data.phone
  if (data.company !== undefined) fields.Company = data.company
  if (data.role !== undefined) fields.Role = data.role
  if (data.location !== undefined) fields.Location = data.location
  if (data.website !== undefined) fields.Website = data.website
  if (data.notes !== undefined) fields.Notes = data.notes
  if (data.recommended_by !== undefined) fields['Recommended By'] = data.recommended_by
  if (data.specialization !== undefined) fields.Specialization = data.specialization
  if (data.past_clients !== undefined) fields['Past Clients'] = data.past_clients
  if (data.birthday !== undefined) fields.Birthday = data.birthday
  if (data.milestones !== undefined) fields.Milestones = data.milestones
  if (data.interests !== undefined) fields.Interests = data.interests
  if (data.relationship_context !== undefined) fields['Relationship Context'] = data.relationship_context
  if (data.last_contacted_at !== undefined) fields['Last Contacted'] = data.last_contacted_at
  if (data.list_ids !== undefined) fields.Lists = data.list_ids
  if (data.category_ids !== undefined) fields.Categories = data.category_ids
  if (data.first_name !== undefined) fields['First Name'] = data.first_name
  if (data.last_name !== undefined) fields['Last Name'] = data.last_name
  if (data.linkedin !== undefined) fields.LinkedIn = data.linkedin
  if (data.country !== undefined) fields.Country = data.country
  if (data.global_region !== undefined) fields['Global Region'] = data.global_region
  if (data.gender !== undefined) fields.Gender = data.gender
  if (data.introduced_by !== undefined) fields['Introduced By'] = data.introduced_by
  if (data.intel_notes !== undefined) fields['Intel / Notes'] = data.intel_notes
  if (data.relationship_owner !== undefined) fields['Relationship Owner'] = data.relationship_owner
  if (data.contact_frequency !== undefined) fields['Contact Frequency'] = data.contact_frequency
  if (data.next_follow_up_date !== undefined) fields['Next Follow-Up Date'] = data.next_follow_up_date
  if (data.next_action !== undefined) fields['Next Action'] = data.next_action
  if (data.kv_fund_investor !== undefined) fields['KV Fund Investor'] = data.kv_fund_investor
  if (data.spv_investor !== undefined) fields['SPV Investor'] = data.spv_investor
  if (data.needs_review !== undefined) fields['Needs Review'] = data.needs_review
  if (data.type !== undefined) fields.Type = data.type
  if (data.status !== undefined) fields.Status = data.status
  if (data.company_record_id !== undefined) fields['Company Record'] = data.company_record_id ? [data.company_record_id] : []
  if (data.industry !== undefined) fields.Industry = data.industry
  if (data.stage !== undefined) fields.Stage = data.stage
  if (data.ticker !== undefined) fields.Ticker = data.ticker
  if (data.domain !== undefined) fields.Domain = data.domain
  if (data.primary_list_id !== undefined) fields['Primary Pod'] = data.primary_list_id
  if (data.cadence_override !== undefined) fields['Cadence Override'] = data.cadence_override
  if (data.email_2 !== undefined) fields['Email 2'] = data.email_2
  if (data.email_3 !== undefined) fields['Email 3'] = data.email_3
  if (data.custom_fields !== undefined) {
    for (const [key, value] of Object.entries(data.custom_fields)) {
      fields[key] = value
    }
  }

  const r = await request<AirtableRecord<ContactFields>>(`${TABLES.contacts}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  })
  const updated = mapContact(r)
  if (_contactsCache) {
    const idx = _contactsCache.findIndex(c => c.id === id)
    if (idx !== -1) _contactsCache[idx] = updated
    else _contactsCache = null
  }
  return updated
}

export async function deleteContact(id: string): Promise<void> {
  await request(`${TABLES.contacts}/${id}`, { method: 'DELETE' })
  if (_contactsCache) _contactsCache = _contactsCache.filter(c => c.id !== id)
}

// ── Interactions ─────────────────────────────────────────────────────────────

function mapInteraction(r: AirtableRecord<InteractionFields>): Interaction | null {
  const contact_id = r.fields.Contact?.[0]
  if (!contact_id) return null
  return {
    id: r.id,
    contact_id,
    type: (r.fields.Type as string) === 'event' ? 'meeting' : (r.fields.Type?.toLowerCase() as InteractionType ?? 'note'),
    date: r.fields.Date ?? r.createdTime,
    notes: r.fields.Notes ?? null,
    summary: r.fields.Summary ?? null,
    source: (r.fields.Source as InteractionSource) ?? null,
    email_link: r.fields['Email Link'] ?? null,
    granola_link: r.fields['Granola Link'] ?? null,
    event_detail: r.fields['Event Detail'] ?? null,
    actor: r.fields['Actor'] ?? null,
    created_at: r.createdTime,
  }
}

// ── All interactions cache (90-day window for dashboard scoring) ─────────────

let _interactionsCache: Interaction[] | null = null
let _interactionsCacheTime = 0
let _interactionsFetch: Promise<Interaction[]> | null = null

export function getAllInteractions(): Promise<Interaction[]> {
  if (isDemoMode()) return Promise.resolve(DEMO_INTERACTIONS)
  const isExpired = !_interactionsCache || Date.now() - _interactionsCacheTime > CACHE_TTL
  const isFresh = _interactionsCache && !isExpired

  if (isFresh) return Promise.resolve(_interactionsCache!)

  if (_interactionsCache && isExpired && !_interactionsFetch) {
    const stale = _interactionsCache
    _interactionsFetch = fetchAll<InteractionFields>(TABLES.interactions, {
      filterByFormula: `IS_AFTER({Date}, DATEADD(TODAY(), -90, 'days'))`,
      'sort[0][field]': 'Date',
      'sort[0][direction]': 'desc',
    })
      .then(records => {
        _interactionsCache = records.flatMap(r => mapInteraction(r) ?? [])
        _interactionsCacheTime = Date.now()
        _interactionsFetch = null
        return _interactionsCache
      })
      .catch(err => { _interactionsFetch = null; throw err })
    return Promise.resolve(stale)
  }

  if (!_interactionsFetch) {
    _interactionsFetch = fetchAll<InteractionFields>(TABLES.interactions, {
      filterByFormula: `IS_AFTER({Date}, DATEADD(TODAY(), -90, 'days'))`,
      'sort[0][field]': 'Date',
      'sort[0][direction]': 'desc',
    })
      .then(records => {
        _interactionsCache = records.flatMap(r => mapInteraction(r) ?? [])
        _interactionsCacheTime = Date.now()
        _interactionsFetch = null
        return _interactionsCache
      })
      .catch(err => { _interactionsFetch = null; throw err })
  }
  return _interactionsFetch
}

export function invalidateInteractionsCache(): void {
  _interactionsCache = null
}

export function invalidateContactsCache(): void {
  _contactsCache = null
}

// ── Per-contact interactions (unchanged — used by InteractionSection) ────────

export async function getInteractions(contactId: string): Promise<Interaction[]> {
  if (isDemoMode()) return DEMO_INTERACTIONS.filter(i => i.contact_id === contactId)
  if (!/^rec[A-Za-z0-9]{14}$/.test(contactId)) throw new Error('Invalid contact ID')
  const records = await fetchAll<InteractionFields>(TABLES.interactions, {
    filterByFormula: `FIND("${contactId},", ARRAYJOIN({Contact}, ","))`,
    'sort[0][field]': 'Date',
    'sort[0][direction]': 'desc',
  })
  return records.flatMap(r => mapInteraction(r) ?? [])
}

export async function createInteraction(data: Omit<Interaction, 'id' | 'created_at'>): Promise<Interaction> {
  const r = await request<AirtableRecord<InteractionFields>>(TABLES.interactions, {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        Contact: [data.contact_id],
        Type: data.type,
        Date: data.date,
        Notes: data.notes ?? undefined,
        Summary: data.summary ?? undefined,
        Source: data.source ?? undefined,
        'Email Link': data.email_link ?? undefined,
        'Granola Link': data.granola_link ?? undefined,
        'Event Detail': data.event_detail ?? undefined,
        'Actor': data.actor ?? undefined,
      },
    }),
  })
  const mapped = mapInteraction(r)
  if (!mapped) throw new Error('Created interaction missing Contact link')
  // Optimistic append — avoids full re-fetch
  if (_interactionsCache) _interactionsCache.unshift(mapped)
  return mapped
}

export async function updateInteraction(
  id: string,
  data: Partial<Pick<Interaction, 'type' | 'date' | 'notes'>>
): Promise<Interaction> {
  const fields: Record<string, unknown> = {}
  if (data.type !== undefined) fields.Type = data.type
  if (data.date !== undefined) fields.Date = data.date
  if (data.notes !== undefined) fields.Notes = data.notes ?? undefined
  const r = await request<AirtableRecord<InteractionFields>>(`${TABLES.interactions}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  })
  const mapped = mapInteraction(r)
  if (!mapped) throw new Error('Updated interaction missing Contact link')
  return mapped
}

export async function deleteInteraction(id: string): Promise<void> {
  await request(`${TABLES.interactions}/${id}`, { method: 'DELETE' })
  if (_interactionsCache) _interactionsCache = _interactionsCache.filter(i => i.id !== id)
}

export async function getRecentInteractions(limit: number): Promise<Interaction[]> {
  const records = await fetchAll<InteractionFields>(TABLES.interactions, {
    'sort[0][field]': 'Date',
    'sort[0][direction]': 'desc',
    maxRecords: String(limit),
  })
  return records.flatMap(r => mapInteraction(r) ?? [])
}

// ── Follow-up helpers ────────────────────────────────────────────────────────

const CADENCE_MS: Record<Cadence, number> = {
  weekly: 7 * 24 * 60 * 60 * 1000,
  biweekly: 14 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
  quarterly: 90 * 24 * 60 * 60 * 1000,
}

const GRACE_PERIOD_MS = 14 * 24 * 60 * 60 * 1000

export function isOverdue(contact: Contact, cadence: Cadence = 'monthly'): boolean {
  if (isInGracePeriod(contact)) return false
  if (!contact.last_contacted_at) return true
  return Date.now() - new Date(contact.last_contacted_at).getTime() > CADENCE_MS[cadence]
}

export function isInGracePeriod(contact: Contact): boolean {
  return Date.now() - new Date(contact.created_at).getTime() < GRACE_PERIOD_MS
}

export async function getOverdueContacts(podId: string, cadence: Cadence = 'monthly'): Promise<Contact[]> {
  const contacts = await getContacts()
  return contacts.filter(c => c.list_ids.includes(podId) && isOverdue(c, cadence))
}

// ── Interaction side-effect: update last_contacted_at ────────────────────────

export async function logInteraction(
  contactId: string,
  data: Omit<Interaction, 'id' | 'created_at' | 'contact_id'>
): Promise<Interaction> {
  const interaction = await createInteraction({ ...data, contact_id: contactId })

  // Update last_contacted_at for all types except internal notes
  if (data.type !== 'note') {
    await updateContact(contactId, { last_contacted_at: data.date })
  }

  return interaction
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

function mapCampaign(r: AirtableRecord<CampaignFields>): Campaign {
  return {
    id: r.id,
    name: r.fields.Name,
    type: r.fields.Type ?? 'other',
    deadline: r.fields.Deadline ?? null,
    status: r.fields.Status ?? 'active',
    contact_ids: [],  // populated separately from junction
    created_at: r.createdTime,
  }
}

function mapCampaignContact(r: AirtableRecord<CampaignContactFields>): CampaignContact | null {
  const campaignId = r.fields.Campaign?.[0]
  const contactId = r.fields.Contact?.[0]
  if (!campaignId || !contactId) return null
  return {
    id: r.id,
    campaign_id: campaignId,
    contact_id: contactId,
    status: r.fields.Status ?? 'pending',
    notes: r.fields.Notes ?? null,
    created_at: r.createdTime,
  }
}

let _campaignsCache: Campaign[] | null = null
let _campaignsCacheTime = 0
let _campaignsFetch: Promise<Campaign[]> | null = null
let _campaignContactsCache: CampaignContact[] | null = null

export function invalidateCampaignsCache(): void {
  _campaignsCache = null
  _campaignContactsCache = null
}

export async function getCampaigns(): Promise<Campaign[]> {
  if (isDemoMode()) return DEMO_CAMPAIGNS.filter(c => c.status === 'active' || c.status === 'completed')
  const isExpired = !_campaignsCache || Date.now() - _campaignsCacheTime > CACHE_TTL
  const isFresh = _campaignsCache && !isExpired

  if (isFresh) return Promise.resolve(_campaignsCache!)

  // Stale-while-revalidate: return stale immediately, refresh in background
  if (_campaignsCache && isExpired && !_campaignsFetch) {
    const stale = _campaignsCache
    _campaignsFetch = fetchAll<CampaignFields>(TABLES.campaigns)
      .then(async records => {
        const campaigns = records.map(mapCampaign)
        const ccRecords = await fetchAll<CampaignContactFields>(TABLES.campaignContacts)
        const contacts = ccRecords.flatMap(r => mapCampaignContact(r) ?? [])
        _campaignContactsCache = contacts
        for (const cc of contacts) {
          const campaign = campaigns.find(c => c.id === cc.campaign_id)
          if (campaign && !campaign.contact_ids.includes(cc.contact_id)) {
            campaign.contact_ids.push(cc.contact_id)
          }
        }
        _campaignsCache = campaigns
        _campaignsCacheTime = Date.now()
        _campaignsFetch = null
        return _campaignsCache
      })
      .catch(err => { _campaignsFetch = null; throw err })
    return Promise.resolve(stale)
  }

  // Cold cache — deduplicate concurrent fetches via in-flight Promise
  if (!_campaignsFetch) {
    _campaignsFetch = fetchAll<CampaignFields>(TABLES.campaigns)
      .then(async records => {
        const campaigns = records.map(mapCampaign)
        const ccRecords = await fetchAll<CampaignContactFields>(TABLES.campaignContacts)
        const contacts = ccRecords.flatMap(r => mapCampaignContact(r) ?? [])
        _campaignContactsCache = contacts
        for (const cc of contacts) {
          const campaign = campaigns.find(c => c.id === cc.campaign_id)
          if (campaign && !campaign.contact_ids.includes(cc.contact_id)) {
            campaign.contact_ids.push(cc.contact_id)
          }
        }
        _campaignsCache = campaigns
        _campaignsCacheTime = Date.now()
        _campaignsFetch = null
        return _campaignsCache
      })
      .catch(err => { _campaignsFetch = null; throw err })
  }
  return _campaignsFetch
}

export async function getCampaignContacts(campaignId: string): Promise<CampaignContact[]> {
  if (isDemoMode()) return DEMO_CAMPAIGN_CONTACTS.filter(cc => cc.campaign_id === campaignId)
  if (_campaignContactsCache) {
    return _campaignContactsCache.filter(cc => cc.campaign_id === campaignId)
  }
  // Ensure full cache is populated via getCampaigns which sets _campaignContactsCache
  await getCampaigns()
  const cache: CampaignContact[] = _campaignContactsCache ?? []
  return cache.filter(cc => cc.campaign_id === campaignId)
}

export async function createCampaign(data: { name: string; type: CampaignType; deadline?: string }): Promise<Campaign> {
  if (isDemoMode()) {
    const c: Campaign = { id: `demo-campaign-${Date.now()}`, name: data.name, type: data.type, deadline: data.deadline ?? null, status: 'active', contact_ids: [], created_at: new Date().toISOString() }
    DEMO_CAMPAIGNS.push(c)
    return c
  }
  const r = await request<AirtableRecord<CampaignFields>>(TABLES.campaigns, {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        Name: data.name,
        Type: data.type,
        Status: 'active' as CampaignStatus,
        Deadline: data.deadline ?? undefined,
      },
    }),
  })
  _campaignsCache = null
  return mapCampaign(r)
}

export async function addContactToCampaign(campaignId: string, contactId: string): Promise<CampaignContact> {
  if (isDemoMode()) {
    const cc: CampaignContact = { id: `demo-cc-${Date.now()}`, campaign_id: campaignId, contact_id: contactId, status: 'pending', notes: null, created_at: new Date().toISOString() }
    DEMO_CAMPAIGN_CONTACTS.push(cc)
    const camp = DEMO_CAMPAIGNS.find(c => c.id === campaignId)
    if (camp && !camp.contact_ids.includes(contactId)) camp.contact_ids.push(contactId)
    return cc
  }
  const r = await request<AirtableRecord<CampaignContactFields>>(TABLES.campaignContacts, {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        Campaign: [campaignId],
        Contact: [contactId],
        Status: 'pending' as CampaignContactStatus,
      },
    }),
  })
  const mapped = mapCampaignContact(r)
  if (!mapped) throw new Error('Created campaign contact missing links')
  _campaignsCache = null
  _campaignContactsCache = null
  return mapped
}

export async function updateCampaignContactStatus(id: string, status: CampaignContactStatus): Promise<CampaignContact> {
  if (isDemoMode()) {
    const cc = DEMO_CAMPAIGN_CONTACTS.find(c => c.id === id)
    if (cc) cc.status = status
    return cc ?? { id, campaign_id: '', contact_id: '', status, notes: null, created_at: '' }
  }
  const r = await request<AirtableRecord<CampaignContactFields>>(`${TABLES.campaignContacts}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: { Status: status } }),
  })
  const mapped = mapCampaignContact(r)
  if (!mapped) throw new Error('Updated campaign contact missing links')
  // Optimistic update in cache
  if (_campaignContactsCache) {
    const idx = _campaignContactsCache.findIndex(cc => cc.id === id)
    if (idx !== -1) _campaignContactsCache[idx] = mapped
  }
  return mapped
}

export async function completeCampaign(id: string): Promise<Campaign> {
  if (isDemoMode()) {
    const c = DEMO_CAMPAIGNS.find(c => c.id === id)
    if (c) c.status = 'completed'
    return c ?? { id, name: '', type: 'other', deadline: null, status: 'completed', contact_ids: [], created_at: '' }
  }
  const r = await request<AirtableRecord<CampaignFields>>(`${TABLES.campaigns}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: { Status: 'completed' as CampaignStatus } }),
  })
  const mapped = mapCampaign(r)
  // Optimistic update in cache
  if (_campaignsCache) {
    const idx = _campaignsCache.findIndex(c => c.id === id)
    if (idx !== -1) _campaignsCache[idx] = { ..._campaignsCache[idx], status: 'completed' }
  }
  return mapped
}

// ── Pipelines ─────────────────────────────────────────────────────────────────

function mapPipeline(r: AirtableRecord<PipelineFields>): Pipeline {
  return {
    id: r.id,
    name: r.fields.Name,
    status: (r.fields['Pipeline Status'] ?? 'active') as PipelineStatus,
    created_at: r.createdTime,
  }
}

let _pipelinesCache: Pipeline[] | null = null
let _pipelinesCacheTime = 0
let _pipelinesFetch: Promise<Pipeline[]> | null = null

export function invalidatePipelinesCache(): void {
  _pipelinesCache = null
}

export function getPipelines(): Promise<Pipeline[]> {
  if (isDemoMode()) return Promise.resolve(DEMO_PIPELINES)
  const isExpired = !_pipelinesCache || Date.now() - _pipelinesCacheTime > CACHE_TTL
  const isFresh = _pipelinesCache && !isExpired

  if (isFresh) return Promise.resolve(_pipelinesCache!)

  if (_pipelinesCache && isExpired && !_pipelinesFetch) {
    const stale = _pipelinesCache
    _pipelinesFetch = fetchAll<PipelineFields>(TABLES.pipelines)
      .then(records => {
        _pipelinesCache = records.map(mapPipeline)
        _pipelinesCacheTime = Date.now()
        _pipelinesFetch = null
        return _pipelinesCache
      })
      .catch(err => { _pipelinesFetch = null; throw err })
    return Promise.resolve(stale)
  }

  if (!_pipelinesFetch) {
    _pipelinesFetch = fetchAll<PipelineFields>(TABLES.pipelines)
      .then(records => {
        _pipelinesCache = records.map(mapPipeline)
        _pipelinesCacheTime = Date.now()
        _pipelinesFetch = null
        return _pipelinesCache
      })
      .catch(err => { _pipelinesFetch = null; throw err })
  }
  return _pipelinesFetch
}

export async function createPipeline(name: string): Promise<Pipeline> {
  if (isDemoMode()) {
    const p: Pipeline = { id: 'demo-pipe-' + Date.now(), name, status: 'active', created_at: new Date().toISOString() }
    DEMO_PIPELINES.push(p)
    return p
  }
  const r = await request<AirtableRecord<PipelineFields>>(TABLES.pipelines, {
    method: 'POST',
    body: JSON.stringify({ fields: { Name: name, 'Pipeline Status': 'active' } }),
  })
  _pipelinesCache = null
  return mapPipeline(r)
}

export async function updatePipeline(id: string, data: Partial<Pick<Pipeline, 'name' | 'status'>>): Promise<Pipeline> {
  const fields: Record<string, unknown> = {}
  if (data.name !== undefined) fields.Name = data.name
  if (data.status !== undefined) fields['Pipeline Status'] = data.status
  if (isDemoMode()) {
    const idx = DEMO_PIPELINES.findIndex(p => p.id === id)
    if (idx >= 0) Object.assign(DEMO_PIPELINES[idx], data)
    return DEMO_PIPELINES[idx]
  }
  const r = await request<AirtableRecord<PipelineFields>>(`${TABLES.pipelines}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  })
  _pipelinesCache = null
  return mapPipeline(r)
}

// ── Pipeline Stages ───────────────────────────────────────────────────────────

function mapPipelineStage(r: AirtableRecord<PipelineStageFields>): PipelineStage {
  return {
    id: r.id,
    pipeline_id: r.fields.Pipeline?.[0] ?? '',
    name: r.fields.Name,
    color: (r.fields.Color ?? null) as import('./types').HexColor | null,
    order: r.fields.Order ?? 0,
    created_at: r.createdTime,
  }
}

let _pipelineStagesCache: PipelineStage[] | null = null
let _pipelineStagesCacheTime = 0
let _pipelineStagesFetch: Promise<PipelineStage[]> | null = null

export function invalidatePipelineStagesCache(): void {
  _pipelineStagesCache = null
  _pipelineStagesFetch = null
}

export function getPipelineStages(pipelineId?: string): Promise<PipelineStage[]> {
  if (isDemoMode()) return Promise.resolve(pipelineId ? DEMO_PIPELINE_STAGES.filter(s => s.pipeline_id === pipelineId) : DEMO_PIPELINE_STAGES)
  const isExpired = !_pipelineStagesCache || Date.now() - _pipelineStagesCacheTime > CACHE_TTL
  const isFresh = _pipelineStagesCache && !isExpired

  if (isFresh) {
    return Promise.resolve(pipelineId ? _pipelineStagesCache!.filter(s => s.pipeline_id === pipelineId) : _pipelineStagesCache!)
  }

  if (_pipelineStagesCache && isExpired && !_pipelineStagesFetch) {
    const stale = _pipelineStagesCache
    _pipelineStagesFetch = fetchAll<PipelineStageFields>(TABLES.pipelineStages)
      .then(records => {
        _pipelineStagesCache = records.map(mapPipelineStage)
        _pipelineStagesCacheTime = Date.now()
        _pipelineStagesFetch = null
        return _pipelineStagesCache
      })
      .catch(err => { _pipelineStagesFetch = null; throw err })
    return Promise.resolve(pipelineId ? stale.filter(s => s.pipeline_id === pipelineId) : stale)
  }

  if (!_pipelineStagesFetch) {
    _pipelineStagesFetch = fetchAll<PipelineStageFields>(TABLES.pipelineStages)
      .then(records => {
        _pipelineStagesCache = records.map(mapPipelineStage)
        _pipelineStagesCacheTime = Date.now()
        _pipelineStagesFetch = null
        return _pipelineStagesCache
      })
      .catch(err => { _pipelineStagesFetch = null; throw err })
  }
  return _pipelineStagesFetch.then(all => pipelineId ? all.filter(s => s.pipeline_id === pipelineId) : all)
}

export async function createPipelineStage(name: string, pipelineId: string, order: number, color?: string): Promise<PipelineStage> {
  if (isDemoMode()) {
    const s: PipelineStage = { id: 'demo-stage-' + Date.now(), pipeline_id: pipelineId, name, color: (color ?? null) as import('./types').HexColor | null, order, created_at: new Date().toISOString() }
    DEMO_PIPELINE_STAGES.push(s)
    return s
  }
  const r = await request<AirtableRecord<PipelineStageFields>>(TABLES.pipelineStages, {
    method: 'POST',
    body: JSON.stringify({ fields: { Name: name, Pipeline: [pipelineId], Order: order, ...(color ? { Color: color } : {}) } }),
  })
  _pipelineStagesCache = null
  return mapPipelineStage(r)
}

export async function updatePipelineStage(id: string, data: Partial<Pick<PipelineStage, 'name' | 'color' | 'order'>>): Promise<PipelineStage> {
  const fields: Record<string, unknown> = {}
  if (data.name !== undefined) fields.Name = data.name
  if (data.color !== undefined) fields.Color = data.color
  if (data.order !== undefined) fields.Order = data.order
  if (isDemoMode()) {
    const idx = DEMO_PIPELINE_STAGES.findIndex(s => s.id === id)
    if (idx >= 0) Object.assign(DEMO_PIPELINE_STAGES[idx], data)
    return DEMO_PIPELINE_STAGES[idx]
  }
  const r = await request<AirtableRecord<PipelineStageFields>>(`${TABLES.pipelineStages}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  })
  invalidatePipelineStagesCache()
  return mapPipelineStage(r)
}

// ── Opportunities ─────────────────────────────────────────────────────────────

function mapOpportunity(r: AirtableRecord<OpportunityFields>): Opportunity {
  return {
    id: r.id,
    name: r.fields.Name,
    stage_id: r.fields.Stage?.[0] ?? '',
    relationship_ids: r.fields.Relationships ?? [],
    notes: r.fields.Notes ?? null,
    priority: (r.fields.Priority ?? null) as OpportunityPriority | null,
    status: (r.fields['Opportunity Status'] ?? 'open') as OpportunityStatus,
    created_at: r.createdTime,
  }
}

let _opportunitiesCache: Opportunity[] | null = null
let _opportunitiesCacheTime = 0
let _opportunitiesFetch: Promise<Opportunity[]> | null = null

export function invalidateOpportunitiesCache(): void {
  _opportunitiesCache = null
}

export function getOpportunities(): Promise<Opportunity[]> {
  if (isDemoMode()) return Promise.resolve(DEMO_OPPORTUNITIES)
  const isExpired = !_opportunitiesCache || Date.now() - _opportunitiesCacheTime > CACHE_TTL
  const isFresh = _opportunitiesCache && !isExpired

  if (isFresh) return Promise.resolve(_opportunitiesCache!)

  if (_opportunitiesCache && isExpired && !_opportunitiesFetch) {
    const stale = _opportunitiesCache
    _opportunitiesFetch = fetchAll<OpportunityFields>(TABLES.opportunities)
      .then(records => {
        _opportunitiesCache = records.map(mapOpportunity)
        _opportunitiesCacheTime = Date.now()
        _opportunitiesFetch = null
        return _opportunitiesCache
      })
      .catch(err => { _opportunitiesFetch = null; throw err })
    return Promise.resolve(stale)
  }

  if (!_opportunitiesFetch) {
    _opportunitiesFetch = fetchAll<OpportunityFields>(TABLES.opportunities)
      .then(records => {
        _opportunitiesCache = records.map(mapOpportunity)
        _opportunitiesCacheTime = Date.now()
        _opportunitiesFetch = null
        return _opportunitiesCache
      })
      .catch(err => { _opportunitiesFetch = null; throw err })
  }
  return _opportunitiesFetch
}

export async function createOpportunity(name: string, stageId: string, relationshipIds: string[]): Promise<Opportunity> {
  if (isDemoMode()) {
    const o: Opportunity = { id: 'demo-opp-' + Date.now(), name, stage_id: stageId, relationship_ids: relationshipIds, notes: null, priority: null, status: 'open', created_at: new Date().toISOString() }
    DEMO_OPPORTUNITIES.push(o)
    return o
  }
  const r = await request<AirtableRecord<OpportunityFields>>(TABLES.opportunities, {
    method: 'POST',
    body: JSON.stringify({ fields: { Name: name, Stage: [stageId], Relationships: relationshipIds, 'Opportunity Status': 'open' as OpportunityStatus } }),
  })
  _opportunitiesCache = null
  return mapOpportunity(r)
}

export async function updateOpportunity(id: string, data: Partial<Pick<Opportunity, 'name' | 'stage_id' | 'notes' | 'priority' | 'status'>>): Promise<Opportunity> {
  const fields: Record<string, unknown> = {}
  if (data.name !== undefined) fields.Name = data.name
  if (data.stage_id !== undefined) fields.Stage = [data.stage_id]
  if (data.notes !== undefined) fields.Notes = data.notes
  if (data.priority !== undefined) fields.Priority = data.priority
  if (data.status !== undefined) fields['Opportunity Status'] = data.status
  if (isDemoMode()) {
    const idx = DEMO_OPPORTUNITIES.findIndex(o => o.id === id)
    if (idx >= 0) Object.assign(DEMO_OPPORTUNITIES[idx], data)
    return DEMO_OPPORTUNITIES[idx]
  }
  const r = await request<AirtableRecord<OpportunityFields>>(`${TABLES.opportunities}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  })
  _opportunitiesCache = null
  return mapOpportunity(r)
}

// ── Projects ──────────────────────────────────────────────────────────────────

function mapProject(r: AirtableRecord<ProjectFields>): Project {
  return {
    id: r.id,
    name: r.fields.Name,
    description: r.fields.Description ?? null,
    owner: r.fields.Owner ?? null,
    relationship_ids: r.fields.Relationships ?? [],
    opportunity_ids: r.fields.Opportunities ?? [],
    notes: r.fields.Notes ?? null,
    created_at: r.createdTime,
  }
}

let _projectsCache: Project[] | null = null
let _projectsCacheTime = 0
let _projectsFetch: Promise<Project[]> | null = null

export function invalidateProjectsCache(): void {
  _projectsCache = null
}

export function getProjects(): Promise<Project[]> {
  if (isDemoMode()) return Promise.resolve(DEMO_PROJECTS)
  const isExpired = !_projectsCache || Date.now() - _projectsCacheTime > CACHE_TTL
  const isFresh = _projectsCache && !isExpired

  if (isFresh) return Promise.resolve(_projectsCache!)

  if (_projectsCache && isExpired && !_projectsFetch) {
    const stale = _projectsCache
    _projectsFetch = fetchAll<ProjectFields>(TABLES.projects)
      .then(records => {
        _projectsCache = records.map(mapProject)
        _projectsCacheTime = Date.now()
        _projectsFetch = null
        return _projectsCache
      })
      .catch(err => { _projectsFetch = null; throw err })
    return Promise.resolve(stale)
  }

  if (!_projectsFetch) {
    _projectsFetch = fetchAll<ProjectFields>(TABLES.projects)
      .then(records => {
        _projectsCache = records.map(mapProject)
        _projectsCacheTime = Date.now()
        _projectsFetch = null
        return _projectsCache
      })
      .catch(err => { _projectsFetch = null; throw err })
  }
  return _projectsFetch
}

export async function createProject(name: string, description?: string): Promise<Project> {
  if (isDemoMode()) {
    const p: Project = { id: 'demo-proj-' + Date.now(), name, description: description ?? null, owner: null, relationship_ids: [], opportunity_ids: [], notes: null, created_at: new Date().toISOString() }
    DEMO_PROJECTS.push(p)
    return p
  }
  const r = await request<AirtableRecord<ProjectFields>>(TABLES.projects, {
    method: 'POST',
    body: JSON.stringify({ fields: { Name: name, ...(description ? { Description: description } : {}) } }),
  })
  _projectsCache = null
  return mapProject(r)
}

export async function updateProject(id: string, data: Partial<Pick<Project, 'name' | 'description' | 'owner'>>): Promise<Project> {
  if (isDemoMode()) {
    const idx = DEMO_PROJECTS.findIndex(p => p.id === id)
    if (idx >= 0) Object.assign(DEMO_PROJECTS[idx], data)
    return DEMO_PROJECTS[idx]
  }
  const fields: Record<string, unknown> = {}
  if (data.name !== undefined) fields.Name = data.name
  if (data.description !== undefined) fields.Description = data.description
  if (data.owner !== undefined) fields.Owner = data.owner
  const r = await request<AirtableRecord<ProjectFields>>(TABLES.projects + '/' + id, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  })
  _projectsCache = null
  return mapProject(r)
}

export async function addRecordToProject(projectId: string, recordId: string): Promise<Project> {
  const projects = await getProjects()
  const project = projects.find(p => p.id === projectId)
  if (!project) throw new Error('Project not found')
  if (project.relationship_ids.includes(recordId)) return project
  if (isDemoMode()) {
    project.relationship_ids.push(recordId)
    DEMO_INTERACTIONS.push({
      id: 'demo-ix-proj-' + Date.now(),
      contact_id: recordId,
      type: 'project_event',
      date: new Date().toISOString(),
      notes: null,
      summary: null,
      source: null,
      email_link: null,
      granola_link: null,
      event_detail: JSON.stringify({ project_name: project.name, project_id: projectId, action: 'added_to_project' }),
      actor: null,
      created_at: new Date().toISOString(),
    })
    return project
  }
  const updated = [...project.relationship_ids, recordId]
  const r = await request<AirtableRecord<ProjectFields>>(TABLES.projects + '/' + projectId, {
    method: 'PATCH',
    body: JSON.stringify({ fields: { Relationships: updated } }),
  })
  _projectsCache = null
  await createInteraction({ contact_id: recordId, type: 'project_event', date: new Date().toISOString(), notes: null, summary: null, source: null, email_link: null, granola_link: null, event_detail: JSON.stringify({ project_name: project.name, project_id: projectId, action: 'added_to_project' }), actor: null })
  return mapProject(r)
}

export async function removeRecordFromProject(projectId: string, recordId: string): Promise<Project> {
  const projects = await getProjects()
  const project = projects.find(p => p.id === projectId)
  if (!project) throw new Error('Project not found')
  if (isDemoMode()) {
    project.relationship_ids = project.relationship_ids.filter(id => id !== recordId)
    DEMO_INTERACTIONS.push({
      id: 'demo-ix-proj-' + Date.now(),
      contact_id: recordId,
      type: 'project_event',
      date: new Date().toISOString(),
      notes: null,
      summary: null,
      source: null,
      email_link: null,
      granola_link: null,
      event_detail: JSON.stringify({ project_name: project.name, project_id: projectId, action: 'removed_from_project' }),
      actor: null,
      created_at: new Date().toISOString(),
    })
    return project
  }
  const updated = project.relationship_ids.filter(id => id !== recordId)
  const r = await request<AirtableRecord<ProjectFields>>(TABLES.projects + '/' + projectId, {
    method: 'PATCH',
    body: JSON.stringify({ fields: { Relationships: updated } }),
  })
  _projectsCache = null
  await createInteraction({ contact_id: recordId, type: 'project_event', date: new Date().toISOString(), notes: null, summary: null, source: null, email_link: null, granola_link: null, event_detail: JSON.stringify({ project_name: project.name, project_id: projectId, action: 'removed_from_project' }), actor: null })
  return mapProject(r)
}

export async function addOpportunityToProject(projectId: string, opportunityId: string): Promise<Project> {
  const projects = await getProjects()
  const project = projects.find(p => p.id === projectId)
  if (!project) throw new Error('Project not found')
  if (project.opportunity_ids.includes(opportunityId)) return project
  if (isDemoMode()) {
    project.opportunity_ids.push(opportunityId)
    return project
  }
  const updated = [...project.opportunity_ids, opportunityId]
  const r = await request<AirtableRecord<ProjectFields>>(TABLES.projects + '/' + projectId, {
    method: 'PATCH',
    body: JSON.stringify({ fields: { Opportunities: updated } }),
  })
  _projectsCache = null
  return mapProject(r)
}

export async function removeOpportunityFromProject(projectId: string, opportunityId: string): Promise<Project> {
  const projects = await getProjects()
  const project = projects.find(p => p.id === projectId)
  if (!project) throw new Error('Project not found')
  if (isDemoMode()) {
    project.opportunity_ids = project.opportunity_ids.filter(id => id !== opportunityId)
    return project
  }
  const updated = project.opportunity_ids.filter(id => id !== opportunityId)
  const r = await request<AirtableRecord<ProjectFields>>(TABLES.projects + '/' + projectId, {
    method: 'PATCH',
    body: JSON.stringify({ fields: { Opportunities: updated } }),
  })
  _projectsCache = null
  return mapProject(r)
}

export async function addProjectNote(projectId: string, note: string): Promise<void> {
  const projects = await getProjects()
  const project = projects.find(p => p.id === projectId)
  if (!project) throw new Error('Project not found')
  if (isDemoMode()) {
    for (const recordId of project.relationship_ids) {
      DEMO_INTERACTIONS.push({
        id: 'demo-ix-proj-' + Date.now() + '-' + recordId,
        contact_id: recordId,
        type: 'project_event',
        date: new Date().toISOString(),
        notes: note,
        summary: null,
        source: null,
        email_link: null,
        granola_link: null,
        event_detail: JSON.stringify({ project_name: project.name, project_id: projectId, action: 'project_note' }),
        actor: null,
        created_at: new Date().toISOString(),
      })
    }
    return
  }
  for (const recordId of project.relationship_ids) {
    await createInteraction({ contact_id: recordId, type: 'project_event', date: new Date().toISOString(), notes: note, summary: null, source: null, email_link: null, granola_link: null, event_detail: JSON.stringify({ project_name: project.name, project_id: projectId, action: 'project_note' }), actor: null })
  }
}

// ── Contact filter helpers ────────────────────────────────────────────────────

export async function getContactsByType(type: RelationshipType): Promise<Contact[]> {
  const all = await getContacts()
  return all.filter(c => c.type === type)
}

export async function getActiveContacts(): Promise<Contact[]> {
  const all = await getContacts()
  return all.filter(c => c.status === 'Active')
}

export async function getPendingContacts(): Promise<Contact[]> {
  const all = await getContacts()
  return all.filter(c => c.status === 'Pending')
}

