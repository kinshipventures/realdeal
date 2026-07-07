import { createAdminClient, requireUser } from '../_lib/supabase.js'
import { json, methodNotAllowed } from '../_lib/http.js'
import { getGoogleConnection } from '../_lib/google-connection.js'
import { fetchGoogleCalendarEvents } from '../_lib/calendar-events.js'

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') return methodNotAllowed(response)
  try {
    const { user } = await requireUser(request)
    const from = String(request.query?.from ?? '')
    const to = String(request.query?.to ?? '')
    if (!from || !to) return json(response, 400, { error: 'Missing date range' })

    const admin = createAdminClient()
    const connection = await getGoogleConnection(admin, user.id)
    if (!connection) return json(response, 400, { error: 'Connect Google first' })
    const events = await fetchGoogleCalendarEvents(admin, connection, from, to)
    await admin
      .from('google_connections')
      .update({ last_calendar_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', connection.id)
    return json(response, 200, { events })
  } catch (error) {
    const status = error instanceof Error && error.message === 'Unauthorized' ? 401 : 500
    return json(response, status, { error: status === 401 ? 'Unauthorized' : 'Calendar sync failed' })
  }
}
