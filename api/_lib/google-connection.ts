import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptToken, encryptToken } from './secure-tokens.js'

export interface GoogleConnection {
  id: string
  user_id: string
  google_email: string | null
  access_token_encrypted: string | null
  refresh_token_encrypted: string | null
  token_expires_at: string | null
  scopes: string[] | null
  gmail_sync_enabled: boolean
  calendar_sync_enabled: boolean
  daily_focus_email_enabled: boolean
  daily_focus_email_time: string
  daily_focus_email_to: string | null
  daily_focus_email_last_sent_on: string | null
  last_gmail_synced_at: string | null
  last_calendar_synced_at: string | null
  gmail_history_id: string | null
  gmail_backfill_page_token: string | null
  gmail_backfill_started_at: string | null
  gmail_backfill_completed_at: string | null
  gmail_last_full_sync_at: string | null
  gmail_last_error: string | null
}

export async function getGoogleConnection(admin: SupabaseClient, userId: string): Promise<GoogleConnection | null> {
  const { data, error } = await admin
    .from('google_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return (data as GoogleConnection | null) ?? null
}

export async function upsertGoogleConnection(admin: SupabaseClient, input: {
  userId: string
  appEmail: string | null
  accessToken: string
  refreshToken?: string | null
  expiresIn?: number | null
  scopes?: string[]
}): Promise<GoogleConnection> {
  const existing = await getGoogleConnection(admin, input.userId)
  const [googleEmail, grantedScopes] = await Promise.all([
    fetchGoogleEmail(input.accessToken).catch(() => input.appEmail),
    fetchGoogleTokenScopes(input.accessToken).catch(() => [] as string[]),
  ])
  const expiresIn = Number.isFinite(input.expiresIn) ? Number(input.expiresIn) : 3600
  const tokenExpiresAt = new Date(Date.now() + Math.max(60, expiresIn - 60) * 1000).toISOString()

  const payload: Record<string, unknown> = {
    user_id: input.userId,
    google_email: googleEmail ?? input.appEmail ?? existing?.google_email ?? null,
    access_token_encrypted: encryptToken(input.accessToken),
    refresh_token_encrypted: input.refreshToken
      ? encryptToken(input.refreshToken)
      : existing?.refresh_token_encrypted ?? null,
    token_expires_at: tokenExpiresAt,
    scopes: grantedScopes.length > 0 ? grantedScopes : input.scopes ?? existing?.scopes ?? [],
    updated_at: new Date().toISOString(),
  }

  const query = existing
    ? admin.from('google_connections').update(payload).eq('id', existing.id)
    : admin.from('google_connections').insert(payload)

  const { data, error } = await query
    .select('*')
    .single()

  if (error) throw error
  return data as GoogleConnection
}

export async function getFreshGoogleAccessToken(admin: SupabaseClient, connection: GoogleConnection): Promise<string> {
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0
  const currentToken = decryptToken(connection.access_token_encrypted)
  if (currentToken && expiresAt > Date.now() + 5 * 60 * 1000) return currentToken

  const refreshToken = decryptToken(connection.refresh_token_encrypted)
  if (!refreshToken) throw new Error('Google needs to be reconnected')

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('Google OAuth refresh is not configured')

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) throw new Error('Could not refresh Google access')
  const data = await response.json() as { access_token?: string; expires_in?: number; scope?: string }
  if (!data.access_token) throw new Error('Google did not return an access token')

  const tokenExpiresAt = new Date(Date.now() + Math.max(60, (data.expires_in ?? 3600) - 60) * 1000).toISOString()
  await admin
    .from('google_connections')
    .update({
      access_token_encrypted: encryptToken(data.access_token),
      token_expires_at: tokenExpiresAt,
      scopes: data.scope ? data.scope.split(/\s+/).filter(Boolean) : connection.scopes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connection.id)

  return data.access_token
}

async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) return null
  const data = await response.json() as { email?: string }
  return data.email?.toLowerCase() ?? null
}

async function fetchGoogleTokenScopes(accessToken: string): Promise<string[]> {
  const url = new URL('https://oauth2.googleapis.com/tokeninfo')
  url.searchParams.set('access_token', accessToken)
  const response = await fetch(url)
  if (!response.ok) return []
  const data = await response.json() as { scope?: string }
  return data.scope?.split(/\s+/).filter(Boolean) ?? []
}
