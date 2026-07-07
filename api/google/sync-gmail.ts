import { createAdminClient, requireUser } from '../_lib/supabase.js'
import { json, methodNotAllowed } from '../_lib/http.js'
import { getGoogleConnection } from '../_lib/google-connection.js'
import { syncGmailForConnection } from '../_lib/gmail-sync.js'

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') return methodNotAllowed(response)
  try {
    const { user } = await requireUser(request)
    const admin = createAdminClient()
    const connection = await getGoogleConnection(admin, user.id)
    if (!connection) return json(response, 400, { error: 'Connect Google first' })
    const result = await syncGmailForConnection(admin, connection)
    return json(response, 200, result)
  } catch (error) {
    const status = error instanceof Error && error.message === 'Unauthorized' ? 401 : 500
    return json(response, status, { error: status === 401 ? 'Unauthorized' : 'Gmail sync failed' })
  }
}
