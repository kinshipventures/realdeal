import { clearAdminSessionCookie } from '../_lib/admin.js'
import { json, methodNotAllowed } from '../_lib/http.js'

type ApiRequest = {
  method?: string
}

type ApiResponse = {
  setHeader: (name: string, value: string) => void
  status: (code: number) => { json: (body: unknown) => void }
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') return methodNotAllowed(response)
  clearAdminSessionCookie(response)
  return json(response, 200, { admin: false })
}
