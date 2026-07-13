import { normalizeAdminEmail, setAdminSessionCookie, verifyAdminPassword } from '../_lib/admin.js'
import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js'

type ApiRequest = {
  method?: string
  body?: unknown
}

type ApiResponse = {
  setHeader: (name: string, value: string) => void
  status: (code: number) => { json: (body: unknown) => void }
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    if (request.method !== 'POST') return methodNotAllowed(response)

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
      user: { email },
    })
  } catch (error) {
    console.error('Admin login failed', error)
    return json(response, 500, { admin: false, error: 'Could not sign in to admin' })
  }
}
