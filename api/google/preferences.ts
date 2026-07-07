import { createAdminClient, requireUser } from '../_lib/supabase.js'
import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js'
import { getGoogleConnection } from '../_lib/google-connection.js'

export default async function handler(request: any, response: any) {
  try {
    const { user } = await requireUser(request)
    const admin = createAdminClient()
    const connection = await getGoogleConnection(admin, user.id)
    if (!connection) return json(response, 404, { error: 'Google is not connected' })

    if (request.method === 'GET') {
      return json(response, 200, {
        gmail_sync_enabled: connection.gmail_sync_enabled,
        calendar_sync_enabled: connection.calendar_sync_enabled,
        daily_focus_email_enabled: connection.daily_focus_email_enabled,
        daily_focus_email_time: connection.daily_focus_email_time,
        daily_focus_email_to: connection.daily_focus_email_to ?? connection.google_email ?? user.email ?? null,
      })
    }

    if (request.method === 'POST') {
      const body = await readJsonBody(request)
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      for (const key of ['gmail_sync_enabled', 'calendar_sync_enabled', 'daily_focus_email_enabled']) {
        if (typeof body[key] === 'boolean') patch[key] = body[key]
      }
      if (typeof body.daily_focus_email_time === 'string') {
        if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(body.daily_focus_email_time)) {
          return json(response, 400, { error: 'Enter a valid delivery time.' })
        }
        patch.daily_focus_email_time = body.daily_focus_email_time
      }
      if (typeof body.daily_focus_email_to === 'string') {
        const email = body.daily_focus_email_to.trim()
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return json(response, 400, { error: 'Enter a valid email address.' })
        }
        patch.daily_focus_email_to = email || null
      }

      const { error } = await admin.from('google_connections').update(patch).eq('id', connection.id)
      if (error) throw error
      return json(response, 200, { ok: true })
    }

    return methodNotAllowed(response)
  } catch (error) {
    const status = error instanceof Error && error.message === 'Unauthorized' ? 401 : 500
    return json(response, status, { error: status === 401 ? 'Unauthorized' : 'Google preferences failed' })
  }
}
