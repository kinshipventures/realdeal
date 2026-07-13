import {
  adminErrorStatus,
  clearAdminSessionCookie,
  normalizeAdminEmail,
  requireAdminSession,
  setAdminSessionCookie,
  verifyAdminPassword,
} from '../_lib/admin.js'
import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js'

type ApiRequest = {
  method?: string
  headers?: Record<string, string | string[] | undefined>
  body?: unknown
}

type ApiResponse = {
  setHeader: (name: string, value: string) => void
  status: (code: number) => { json: (body: unknown) => void }
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    if (request.method === 'POST') {
      const body = await readJsonBody(request)
      const email = normalizeAdminEmail(typeof body.email === 'string' ? body.email : '')
      const password = typeof body.password === 'string' ? body.password : ''

      if (!verifyAdminPassword(email, password)) {
        return json(response, 401, { admin: false, error: 'Invalid admin credentials' })
      }

      setAdminSessionCookie(response, email)
      return json(response, 200, {
        admin: true,
        role: 'owner',
        user: { id: null, email },
      })
    }

    if (request.method === 'DELETE') {
      clearAdminSessionCookie(response)
      return json(response, 200, { admin: false })
    }

    if (request.method !== 'GET') return methodNotAllowed(response)
    const { role, user } = await requireAdminSession(request)
    return json(response, 200, {
      admin: true,
      role,
      user: {
        id: user.id ?? null,
        email: user.email ?? null,
      },
    })
  } catch (error) {
    const status = adminErrorStatus(error)
    return json(response, status, {
      admin: false,
      error: status === 403 ? 'Admin access required' : status === 401 ? 'Unauthorized' : 'Could not verify admin access',
    })
  }
}
