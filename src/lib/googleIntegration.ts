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
  needs_reconnect: boolean
}

export interface GmailSyncResult {
  synced: number
  matched: number
  total_messages: number
  error?: string
}

export interface DailyFocusEmailPreferences {
  gmail_sync_enabled?: boolean
  calendar_sync_enabled?: boolean
  daily_focus_email_enabled?: boolean
  daily_focus_email_time?: string
  daily_focus_email_to?: string | null
}

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
  return authorizedApi<GmailSyncResult>('/api/google/sync-gmail', { method: 'POST' })
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

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : 'Google integration request failed'
    throw new Error(message)
  }

  return data as T
}
