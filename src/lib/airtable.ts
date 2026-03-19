import type { Pod, Cadence, Category, Contact, Interaction, InteractionType, Owner } from './types'

const BASE_URL = `https://api.airtable.com/v0/${import.meta.env.VITE_AIRTABLE_BASE_ID}`
const TOKEN = import.meta.env.VITE_AIRTABLE_TOKEN

// ── Table IDs ────────────────────────────────────────────────────────────────

export const TABLES = {
  lists: 'tblnsxNUscKApvMsV',
  categories: 'tblVAgv23LUXs7Q0p',
  contacts: 'tbll75mRMMVBGiNpj',
  interactions: 'tblbxLX5EM09Y6xim',
} as const

// ── Raw Airtable field shapes ────────────────────────────────────────────────

interface PodFields {
  Name: string
  Color?: string
  Owner?: Owner
  'Is Priority'?: boolean
  Cadence?: Cadence
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
  'Last Contacted'?: string
  Lists?: string[]
  Categories?: string[]
  Interactions?: string[]
}

interface InteractionFields {
  Contact?: string[]
  Type?: InteractionType
  Date?: string
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
    created_at: r.createdTime,
  }
}

export async function getPods(): Promise<Pod[]> {
  const records = await fetchAll<PodFields>(TABLES.lists)
  return records.map(mapPod)
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
    last_contacted_at: r.fields['Last Contacted'] ?? null,
    list_ids: r.fields.Lists ?? [],
    category_ids: r.fields.Categories ?? [],
    created_at: r.createdTime,
  }
}

let _contactsCache: Contact[] | null = null
let _contactsCacheTime = 0
let _contactsFetch: Promise<Contact[]> | null = null

export function getContacts(categoryId?: string): Promise<Contact[]> {
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
        'Last Contacted': data.last_contacted_at ?? undefined,
        Lists: data.list_ids.length ? data.list_ids : undefined,
        Categories: data.category_ids.length ? data.category_ids : undefined,
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
  if (data.last_contacted_at !== undefined) fields['Last Contacted'] = data.last_contacted_at
  if (data.list_ids !== undefined) fields.Lists = data.list_ids
  if (data.category_ids !== undefined) fields.Categories = data.category_ids

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
    created_at: r.createdTime,
  }
}

export async function getInteractions(contactId: string): Promise<Interaction[]> {
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
      },
    }),
  })
  const mapped = mapInteraction(r)
  if (!mapped) throw new Error('Created interaction missing Contact link')
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

