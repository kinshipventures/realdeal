import { createAdminClient, requireUser } from '../_lib/supabase.js'
import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js'
import { getGoogleConnection, upsertGoogleConnection, type GoogleConnection } from '../_lib/google-connection.js'

const REQUIRED_GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
]

function connectionStatus(connection: GoogleConnection | null, userEmail: string | undefined | null) {
  const scopes = new Set(connection?.scopes ?? [])
  const missingScopes = connection ? REQUIRED_GOOGLE_SCOPES.filter(scope => !scopes.has(scope)) : []
  const needsReconnect = Boolean(connection && (!connection.refresh_token_encrypted || missingScopes.length > 0))

  return {
    connected: Boolean(connection),
    google_email: connection?.google_email ?? null,
    gmail_sync_enabled: connection?.gmail_sync_enabled ?? true,
    calendar_sync_enabled: connection?.calendar_sync_enabled ?? true,
    daily_focus_email_enabled: connection?.daily_focus_email_enabled ?? false,
    daily_focus_email_time: connection?.daily_focus_email_time ?? '08:00',
    daily_focus_email_to: connection?.daily_focus_email_to ?? userEmail ?? null,
    daily_focus_email_last_sent_on: connection?.daily_focus_email_last_sent_on ?? null,
    last_gmail_synced_at: connection?.last_gmail_synced_at ?? null,
    last_calendar_synced_at: connection?.last_calendar_synced_at ?? null,
    needs_reconnect: needsReconnect,
  }
}

export default async function handler(request: any, response: any) {
  try {
    const { user } = await requireUser(request)
    const admin = createAdminClient()

    if (request.method === 'GET') {
      const connection = await getGoogleConnection(admin, user.id)
      return json(response, 200, connectionStatus(connection, user.email))
    }

    if (request.method === 'POST') {
      const body = await readJsonBody(request)
      const accessToken = typeof body.access_token === 'string' ? body.access_token : ''
      if (!accessToken) return json(response, 400, { error: 'Missing Google access token' })

      const connection = await upsertGoogleConnection(admin, {
        userId: user.id,
        appEmail: user.email ?? null,
        accessToken,
        refreshToken: typeof body.refresh_token === 'string' ? body.refresh_token : null,
        expiresIn: typeof body.expires_in === 'number' ? body.expires_in : null,
        scopes: Array.isArray(body.scopes) ? body.scopes.filter(scope => typeof scope === 'string') : [],
      })

      return json(response, 200, connectionStatus(connection, user.email))
    }

    if (request.method === 'DELETE') {
      const { error } = await admin
        .from('google_connections')
        .delete()
        .eq('user_id', user.id)

      if (error) throw error
      return json(response, 200, { ok: true })
    }

    return methodNotAllowed(response)
  } catch (error) {
    const status = error instanceof Error && error.message === 'Unauthorized' ? 401 : 500
    return json(response, status, { error: status === 401 ? 'Unauthorized' : 'Google connection failed' })
  }
}
