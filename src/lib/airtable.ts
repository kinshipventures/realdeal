import type { List, Category, Contact, Interaction, InteractionType, Owner } from './types'

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

interface ListFields {
  Name: string
  Color?: string
  Owner?: Owner
  'Is Priority'?: boolean
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

function mapList(r: AirtableRecord<ListFields>): List {
  return {
    id: r.id,
    name: r.fields.Name,
    color: r.fields.Color ?? null,
    owner: r.fields.Owner ?? null,
    is_priority: r.fields['Is Priority'] ?? false,
    created_at: r.createdTime,
  }
}

export async function getLists(): Promise<List[]> {
  const records = await fetchAll<ListFields>(TABLES.lists)
  return records.map(mapList)
}

// ── Categories ───────────────────────────────────────────────────────────────

function mapCategory(r: AirtableRecord<CategoryFields>): Category {
  return {
    id: r.id,
    list_id: r.fields.List?.[0] ?? '',
    name: r.fields.Name,
    color: r.fields.Color ?? null,
    created_at: r.createdTime,
  }
}

let _categoriesCache: Category[] | null = null

export async function getCategories(listId?: string): Promise<Category[]> {
  // Fetch all categories once and cache in-memory — Airtable formula `{List}`
  // resolves to names not IDs, so we filter client-side.
  if (!_categoriesCache) {
    const records = await fetchAll<CategoryFields>(TABLES.categories)
    _categoriesCache = records.map(mapCategory)
  }
  return listId ? _categoriesCache.filter(c => c.list_id === listId) : _categoriesCache
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

export async function getContacts(categoryId?: string): Promise<Contact[]> {
  if (!_contactsCache) {
    const records = await fetchAll<ContactFields>(TABLES.contacts)
    _contactsCache = records.map(mapContact)
  }
  return categoryId ? _contactsCache.filter(c => c.category_ids.includes(categoryId)) : _contactsCache
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

function mapInteraction(r: AirtableRecord<InteractionFields>): Interaction {
  return {
    id: r.id,
    contact_id: r.fields.Contact?.[0] ?? '',
    type: r.fields.Type ?? 'note',
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
  return records.map(mapInteraction)
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
  return mapInteraction(r)
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
  return mapInteraction(r)
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
  return records.map(mapInteraction)
}

// ── Follow-up helpers ────────────────────────────────────────────────────────

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export function isOverdue(contact: Contact): boolean {
  if (!contact.last_contacted_at) return true
  return Date.now() - new Date(contact.last_contacted_at).getTime() > THIRTY_DAYS_MS
}

export async function getOverdueContacts(listId: string): Promise<Contact[]> {
  const contacts = await getContacts()
  return contacts.filter(c => c.list_ids.includes(listId) && isOverdue(c))
}

// ── Interaction side-effect: update last_contacted_at ────────────────────────

export async function logInteraction(
  contactId: string,
  data: Omit<Interaction, 'id' | 'created_at' | 'contact_id'>
): Promise<Interaction> {
  const interaction = await createInteraction({ ...data, contact_id: contactId })

  // Only update last_contacted_at for non-note types
  if (data.type !== 'note') {
    await updateContact(contactId, { last_contacted_at: data.date })
  }

  return interaction
}

