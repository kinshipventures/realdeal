import { createAdminClient, requireUser } from '../_lib/supabase.js'
import { json, methodNotAllowed } from '../_lib/http.js'
import { getGoogleConnection, isGoogleReconnectErrorMessage } from '../_lib/google-connection.js'
import { syncGmailForConnection } from '../_lib/gmail-sync.js'

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') return methodNotAllowed(response)
  try {
    const { user } = await requireUser(request)
    const admin = createAdminClient()
    const connection = await getGoogleConnection(admin, user.id)
    if (!connection) return json(response, 400, { error: 'Connect Google first' })
    const result = await syncGmailForConnection(admin, connection)
    console.info('Gmail sync completed', {
      connection_id: connection.id,
      user_id: user.id,
      mode: result.mode,
      messages_scanned: result.messages_scanned,
      contacts_indexed: result.contacts_indexed,
      email_addresses_indexed: result.email_addresses_indexed,
      matched: result.matched,
      inserted: result.inserted,
      duplicates: result.duplicates,
    })
    return json(response, 200, result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gmail sync failed'
    const unauthorized = message === 'Unauthorized'
    const needsReconnect = isGoogleReconnectErrorMessage(error)
    if (!unauthorized) {
      console.error('Gmail sync failed', {
        error: message,
        needs_reconnect: needsReconnect,
      })
    }
    const status = unauthorized ? 401 : needsReconnect ? 409 : 500
    return json(response, status, {
      error: unauthorized
        ? 'Unauthorized'
        : needsReconnect
          ? 'Reconnect Google to resume Gmail sync.'
          : 'Gmail sync failed',
      needs_reconnect: needsReconnect,
    })
  }
}
