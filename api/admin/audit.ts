import { adminErrorStatus, requireAdminSession } from '../_lib/admin.js'
import { json, methodNotAllowed } from '../_lib/http.js'

type ApiRequest = {
  method?: string
}

type ApiResponse = {
  setHeader: (name: string, value: string) => void
  status: (code: number) => { json: (body: unknown) => void }
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    if (request.method !== 'GET') return methodNotAllowed(response)
    const { admin } = await requireAdminSession(request)
    const { data, error } = await admin
      .from('admin_audit_events')
      .select('id, actor_user_id, actor_email, action, target_type, target_id, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error
    return json(response, 200, { events: data ?? [] })
  } catch (error) {
    console.error('Admin audit request failed', error)
    const status = adminErrorStatus(error)
    return json(response, status, {
      error: status === 403 ? 'Admin access required' : status === 401 ? 'Unauthorized' : 'Could not load audit events',
    })
  }
}
