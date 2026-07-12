export function readBearerToken(request: any): string | null {
  const header = request?.headers?.authorization ?? request?.headers?.Authorization ?? ''
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length).trim() || null
}

export async function readJsonBody(request: any): Promise<Record<string, unknown>> {
  let body: unknown
  try {
    body = request?.body
  } catch {
    return {}
  }
  if (!body) return {}
  if (typeof body === 'object') return body
  if (typeof body !== 'string') return {}
  try {
    return JSON.parse(body)
  } catch {
    return {}
  }
}

export function json(response: any, status: number, body: unknown) {
  response.setHeader('Cache-Control', 'no-store, max-age=0')
  response.status(status).json(body)
}

export function methodNotAllowed(response: any) {
  json(response, 405, { error: 'Method not allowed' })
}

export function isCronRequest(request: any): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return process.env.NODE_ENV !== 'production'
  return readBearerToken(request) === expected
}
