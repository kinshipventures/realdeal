import { getContacts, logInteraction } from './supabase-data'

// Provider registry
export interface MeetingProvider {
  id: string
  name: string
  keyPrefix: string
  storageKey: string
  lastSyncKey: string
  syncedIdsKey: string
  comingSoon: boolean
  validate: (key: string) => boolean
  sync: (() => Promise<MeetingSyncResult>) | null
}

export interface MeetingSyncResult {
  total_notes: number
  matched: number
  interactions_created: number
  skipped: number
}

const API_BASE = 'https://api.granola.ai/v1'

// Granola types
interface GranolaNoteListItem {
  id: string
  title: string | null
  owner: { name: string | null; email: string }
  created_at: string
  updated_at: string
}

interface GranolaNoteDetail {
  id: string
  title: string | null
  owner: { name: string | null; email: string }
  attendees: Array<{ name: string | null; email: string }>
  summary_text: string | null
  summary_markdown: string | null
  created_at: string
  calendar_event?: { start_time?: string; end_time?: string } | null
}

// Shared helpers
export function getProviderKey(provider: MeetingProvider): string | null {
  return localStorage.getItem(provider.storageKey)
}

export function setProviderKey(provider: MeetingProvider, key: string | null) {
  if (key) localStorage.setItem(provider.storageKey, key)
  else localStorage.removeItem(provider.storageKey)
}

export function getLastSync(provider: MeetingProvider): string | null {
  return localStorage.getItem(provider.lastSyncKey)
}

function getSyncedIds(provider: MeetingProvider): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(provider.syncedIdsKey) ?? '[]'))
  } catch { return new Set() }
}

function addSyncedId(provider: MeetingProvider, id: string) {
  const ids = getSyncedIds(provider)
  ids.add(id)
  const arr = [...ids].slice(-500)
  localStorage.setItem(provider.syncedIdsKey, JSON.stringify(arr))
}

// Granola API helpers
async function granolaFetch<T>(path: string, apiKey: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) {
    if (res.status === 401) throw new Error('Invalid Granola API key')
    throw new Error(`Granola API error: ${res.status}`)
  }
  return res.json()
}

async function listRecentNotes(apiKey: string, since?: string): Promise<GranolaNoteListItem[]> {
  const params = new URLSearchParams({ page_size: '30' })
  if (since) params.set('created_after', since)
  const data = await granolaFetch<{ notes: GranolaNoteListItem[]; hasMore: boolean }>(`/notes?${params}`, apiKey)
  return data.notes
}

async function getNoteDetail(apiKey: string, noteId: string): Promise<GranolaNoteDetail> {
  return granolaFetch<GranolaNoteDetail>(`/notes/${noteId}`, apiKey)
}

// Granola sync
async function syncGranolaProvider(): Promise<MeetingSyncResult> {
  const provider = PROVIDERS.find(p => p.id === 'granola')!
  const apiKey = getProviderKey(provider)
  if (!apiKey) throw new Error('No Granola API key configured')

  const contacts = await getContacts()
  const emailToContactId = new Map<string, string>()
  for (const c of contacts) {
    for (const field of [c.email, c.email_2, c.email_3]) {
      if (field) emailToContactId.set(field.toLowerCase(), c.id)
    }
  }

  const lastSync = getLastSync(provider)
  const since = lastSync ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const notes = await listRecentNotes(apiKey, since)
  const syncedIds = getSyncedIds(provider)

  let matched = 0
  let interactionsCreated = 0
  let skipped = 0

  for (const note of notes) {
    if (syncedIds.has(note.id)) { skipped++; continue }

    let detail: GranolaNoteDetail
    try {
      detail = await getNoteDetail(apiKey, note.id)
    } catch {
      skipped++
      continue
    }

    const matchedContactIds = new Set<string>()
    for (const attendee of detail.attendees) {
      const contactId = emailToContactId.get(attendee.email.toLowerCase())
      if (contactId) matchedContactIds.add(contactId)
    }

    if (matchedContactIds.size > 0) matched++

    const meetingDate = detail.calendar_event?.start_time?.slice(0, 10)
      ?? detail.created_at.slice(0, 10)

    for (const contactId of matchedContactIds) {
      await logInteraction(contactId, {
        type: 'meeting',
        date: meetingDate,
        notes: detail.summary_text ?? null,
        summary: detail.title ?? 'Meeting',
        source: 'Granola',
        email_link: null,
        granola_link: `https://app.granola.ai/notes/${detail.id}`,
        event_detail: null,
        actor: null,
      })
      interactionsCreated++
    }

    addSyncedId(provider, note.id)
  }

  localStorage.setItem(provider.lastSyncKey, new Date().toISOString())

  return {
    total_notes: notes.length,
    matched,
    interactions_created: interactionsCreated,
    skipped,
  }
}

// Provider definitions
export const PROVIDERS: MeetingProvider[] = [
  {
    id: 'granola',
    name: 'Granola',
    keyPrefix: 'grn_',
    storageKey: 'realdeal:granola-api-key',
    lastSyncKey: 'realdeal:granola-last-sync',
    syncedIdsKey: 'realdeal:granola-synced-ids',
    comingSoon: false,
    validate: (key: string) => key.startsWith('grn_'),
    sync: syncGranolaProvider,
  },
  {
    id: 'otter',
    name: 'Otter.ai',
    keyPrefix: 'otter_',
    storageKey: 'realdeal:otter-api-key',
    lastSyncKey: 'realdeal:otter-last-sync',
    syncedIdsKey: 'realdeal:otter-synced-ids',
    comingSoon: true,
    validate: (key: string) => key.startsWith('otter_'),
    sync: null,
  },
  {
    id: 'fireflies',
    name: 'Fireflies.ai',
    keyPrefix: 'ff_',
    storageKey: 'realdeal:fireflies-api-key',
    lastSyncKey: 'realdeal:fireflies-last-sync',
    syncedIdsKey: 'realdeal:fireflies-synced-ids',
    comingSoon: true,
    validate: (key: string) => key.startsWith('ff_'),
    sync: null,
  },
  {
    id: 'fathom',
    name: 'Fathom',
    keyPrefix: 'fathom_',
    storageKey: 'realdeal:fathom-api-key',
    lastSyncKey: 'realdeal:fathom-last-sync',
    syncedIdsKey: 'realdeal:fathom-synced-ids',
    comingSoon: true,
    validate: (key: string) => key.startsWith('fathom_'),
    sync: null,
  },
]

export function getConnectedProviders(): MeetingProvider[] {
  return PROVIDERS.filter(p => !!getProviderKey(p))
}

export async function syncProvider(providerId: string): Promise<MeetingSyncResult> {
  const provider = PROVIDERS.find(p => p.id === providerId)
  if (!provider) throw new Error(`Unknown provider: ${providerId}`)
  if (!provider.sync) throw new Error(`${provider.name} sync is coming soon`)
  return provider.sync()
}

// Backward compat re-exports
export function getGranolaApiKey(): string | null {
  return localStorage.getItem('realdeal:granola-api-key')
}
export function setGranolaApiKey(key: string | null) {
  if (key) localStorage.setItem('realdeal:granola-api-key', key)
  else localStorage.removeItem('realdeal:granola-api-key')
}
export function getLastGranolaSync(): string | null {
  return localStorage.getItem('realdeal:granola-last-sync')
}
export async function syncGranola(): Promise<MeetingSyncResult> {
  return syncGranolaProvider()
}
