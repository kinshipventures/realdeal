import { createAdminClient } from './_lib/supabase.js'
import { json, methodNotAllowed, readJsonBody } from './_lib/http.js'
import { normalizeAdminEmail } from './_lib/admin.js'

type ApiRequest = {
  method?: string
  body?: unknown
}

type ApiResponse = {
  setHeader: (name: string, value: string) => void
  status: (code: number) => { json: (body: unknown) => void }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    if (request.method !== 'POST') return methodNotAllowed(response)

    const body = await readJsonBody(request)
    const email = normalizeAdminEmail(typeof body.email === 'string' ? body.email : '')
    const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : null
    const source = typeof body.source === 'string' ? body.source.slice(0, 200) : 'waitlist'

    if (!EMAIL_RE.test(email)) return json(response, 400, { error: 'Invalid email address' })

    const admin = createAdminClient()
    const { data: existing, error: existingError } = await admin
      .from('waitlist_entries')
      .select('id, status')
      .eq('email', email)
      .maybeSingle()

    if (existingError) throw existingError

    if (existing) {
      if (existing.status === 'pending') {
        const { error: updateError } = await admin
          .from('waitlist_entries')
          .update({
            display_name: displayName,
            source,
            metadata: { last_submission_at: new Date().toISOString() },
          })
          .eq('id', existing.id)
        if (updateError) throw updateError
      }
      return json(response, 200, { ok: true, status: existing.status })
    }

    const { error: insertError } = await admin.from('waitlist_entries').insert({
      email,
      display_name: displayName,
      source,
      status: 'pending',
      metadata: { submitted_from: source },
    })

    if (insertError) throw insertError
    return json(response, 200, { ok: true, status: 'pending' })
  } catch (error) {
    console.error('Waitlist submission failed', error)
    return json(response, 500, { error: 'Could not join the waitlist' })
  }
}
