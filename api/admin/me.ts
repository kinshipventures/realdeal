import { adminErrorStatus, requireAdminSession } from '../_lib/admin.js'
import { json, methodNotAllowed } from '../_lib/http.js'

type ApiRequest = {
  method?: string
  headers?: Record<string, string | string[] | undefined>
}

type ApiResponse = {
  setHeader: (name: string, value: string) => void
  status: (code: number) => { json: (body: unknown) => void }
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
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
