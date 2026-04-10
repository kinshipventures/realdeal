import { getContacts, logInteraction } from './supabase-data'

const API_BASE = 'https://api.granola.ai/v1'
const STORAGE_KEY = 'realdeal:granola-api-key'
const LAST_SYNC_KEY = 'realdeal:granola-last-sync'
const SYNCED_IDS_KEY = 'realdeal:granola-synced-ids'

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
  calendar_event?: {
    start_time?: string
    end_time?: string
  } | null
}

interface GranolaSyncResult {
  total_notes: number
  matched: number
  interactions_created: number
  skipped: number
}

export function getGranolaApiKey(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function setGranolaApiKey(key: string | null) {
  if (key) localStorage.setItem(STORAGE_KEY, key)
  else localStorage.removeItem(STORAGE_KEY)
}

export function getLastGranolaSync(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY)
}

function getSyncedIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SYNCED_IDS_KEY) ?? '[]'))
  } catch { return new Set() }
}

function addSyncedId(id: string) {
  const ids = getSyncedIds()
  ids.add(id)
  // Keep last 500 to avoid unbounded growth
  const arr = [...ids].slice(-500)
  localStorage.setItem(SYNCED_IDS_KEY, JSON.stringify(arr))
}

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

  const data = await granolaFetch<{ notes: GranolaNoteListItem[]; hasMore: boolean }>(
    `/notes?${params}`, apiKey
  )
  return data.notes
}

async function getNoteDetail(apiKey: string, noteId: string): Promise<GranolaNoteDetail> {
  return granolaFetch<GranolaNoteDetail>(`/notes/${noteId}`, apiKey)
}

export async function syncGranola(): Promise<GranolaSyncResult> {
  const apiKey = getGranolaApiKey()
  if (!apiKey) throw new Error('No Granola API key configured')

  // Fetch contacts for email matching
  const contacts = await getContacts()
  const emailToContactId = new Map<string, string>()
  for (const c of contacts) {
    for (const field of [c.email, c.email_2, c.email_3]) {
      if (field) emailToContactId.set(field.toLowerCase(), c.id)
    }
  }

  // Fetch recent notes (since last sync, or last 30 days)
  const lastSync = getLastGranolaSync()
  const since = lastSync ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const notes = await listRecentNotes(apiKey, since)
  const syncedIds = getSyncedIds()

  let matched = 0
  let interactionsCreated = 0
  let skipped = 0

  for (const note of notes) {
    if (syncedIds.has(note.id)) { skipped++; continue }

    // Get full note with attendees
    let detail: GranolaNoteDetail
    try {
      detail = await getNoteDetail(apiKey, note.id)
    } catch {
      skipped++
      continue
    }

    // Match attendees to contacts
    const matchedContactIds = new Set<string>()
    for (const attendee of detail.attendees) {
      const contactId = emailToContactId.get(attendee.email.toLowerCase())
      if (contactId) matchedContactIds.add(contactId)
    }

    if (matchedContactIds.size > 0) matched++

    // Create an interaction for each matched contact
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

    addSyncedId(note.id)
  }

  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())

  return {
    total_notes: notes.length,
    matched,
    interactions_created: interactionsCreated,
    skipped,
  }
}
