import type { Session } from '@supabase/supabase-js'
import { GOOGLE_OAUTH_SCOPES } from './googleScopes'

export interface GoogleConnectionStatus {
  connected: boolean
  google_email: string | null
  gmail_sync_enabled: boolean
  calendar_sync_enabled: boolean
  daily_focus_email_enabled: boolean
  daily_focus_email_time: string
  daily_focus_email_to: string | null
  daily_focus_email_last_sent_on: string | null
  last_gmail_synced_at: string | null
  last_calendar_synced_at: string | null
  gmail_last_messages_scanned: number
  gmail_last_contacts_indexed: number
  gmail_last_email_addresses_indexed: number
  gmail_last_matches_found: number
  gmail_last_inserted: number
  gmail_last_duplicates: number
  gmail_last_sync_mode: string | null
  gmail_last_error: string | null
  needs_reconnect: boolean
}

export interface GmailSyncResult {
  synced: number
  matched: number
  inserted: number
  duplicates: number
  affected_contact_ids?: string[]
  total_messages: number
  messages_scanned: number
  contacts_indexed: number
  email_addresses_indexed: number
  mode?: string
  backfill_complete?: boolean
  last_error?: string | null
  error?: string
}

export interface DailyFocusEmailPreferences {
  gmail_sync_enabled?: boolean
  calendar_sync_enabled?: boolean
  daily_focus_email_enabled?: boolean
  daily_focus_email_time?: string
  daily_focus_email_to?: string | null
}

export const GMAIL_SYNC_COMPLETE_EVENT = 'realdeal:gmail-sync-complete'

const GMAIL_BACKGROUND_SYNC_RETRY_GUARD_MS = 10 * 1000
const gmailBackgroundSyncInFlight = new Set<string>()
const gmailBackgroundSyncLastAttempt = new Map<string, number>()

export async function saveGoogleConnection(session: Session): Promise<void> {
  const providerToken = session.provider_token
  if (!providerToken) return

  await authorizedApi('/api/google/connection', {
    method: 'POST',
    body: {
      access_token: providerToken,
      refresh_token: (session as Session & { provider_refresh_token?: string | null }).provider_refresh_token ?? null,
      expires_in: 3600,
      scopes: GOOGLE_OAUTH_SCOPES,
    },
  })
}

export async function getGoogleConnectionStatus(): Promise<GoogleConnectionStatus> {
  return authorizedApi<GoogleConnectionStatus>('/api/google/connection')
}

export async function disconnectGoogleConnection(): Promise<void> {
  await authorizedApi('/api/google/connection', { method: 'DELETE' })
}

export async function syncGmailActivity(): Promise<GmailSyncResult> {
  const result = await authorizedApi<GmailSyncResult>('/api/google/sync-gmail', { method: 'POST' })
  if (result.inserted > 0) {
    void import('./data').then(({ invalidateContactsCache, invalidateInteractionsCache }) => {
      invalidateContactsCache()
      invalidateInteractionsCache()
    })
    notifyGmailSyncComplete(result)
  }
  return result
}

export function notifyGmailSyncComplete(result: GmailSyncResult): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(GMAIL_SYNC_COMPLETE_EVENT, { detail: result }))
}

export async function maybeSyncGmailActivityInBackground(userId: string): Promise<void> {
  if (typeof window === 'undefined') return

  if (gmailBackgroundSyncInFlight.has(userId)) return

  const lastAttempt = gmailBackgroundSyncLastAttempt.get(userId) ?? 0
  if (Date.now() - lastAttempt < GMAIL_BACKGROUND_SYNC_RETRY_GUARD_MS) return

  gmailBackgroundSyncInFlight.add(userId)
  gmailBackgroundSyncLastAttempt.set(userId, Date.now())

  try {
    const status = await getGoogleConnectionStatus().catch(() => null)
    if (!status?.connected || !status.gmail_sync_enabled || status.needs_reconnect) return
    await syncGmailActivity().catch(() => undefined)
  } finally {
    gmailBackgroundSyncInFlight.delete(userId)
  }
}

export async function updateGooglePreferences(preferences: DailyFocusEmailPreferences): Promise<void> {
  await authorizedApi('/api/google/preferences', {
    method: 'POST',
    body: preferences,
  })
}

export async function authorizedApi<T = Record<string, unknown>>(
  path: string,
  options: { method?: string; body?: object } = {},
): Promise<T> {
  const { supabase } = await import('@/integrations/supabase/client')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')

  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : 'Google integration request failed'
    throw new Error(message)
  }
  if (data === null) throw new Error('Google integration request failed')

  return data as T
}
