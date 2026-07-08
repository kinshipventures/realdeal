import { createAdminClient } from '../_lib/supabase.js'
import { json, methodNotAllowed } from '../_lib/http.js'
import { syncGmailForEnabledConnections } from '../_lib/gmail-cron.js'

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') return methodNotAllowed(response)

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return json(response, 500, { error: 'Cron is not configured' })

  const authHeader = request.headers?.authorization ?? request.headers?.Authorization
  if (authHeader !== `Bearer ${cronSecret}`) return json(response, 401, { error: 'Unauthorized' })

  try {
    const admin = createAdminClient()
    const summary = await syncGmailForEnabledConnections(admin)
    return json(response, 200, summary)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gmail cron failed'
    console.error('Gmail cron failed', { error: message })
    return json(response, 500, { error: 'Gmail cron failed' })
  }
}
