import { createAdminClient, requireUser } from '../_lib/supabase.js'
import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js'

type AccessGrantRow = {
  id: string
  workspace_id: string
  subject_type: string
  subject_id: string | null
  subject_email: string | null
}

type ApiRequest = {
  method?: string
  headers?: Record<string, string | string[] | undefined>
  body?: unknown
}

type ApiResponse = {
  setHeader: (name: string, value: string) => void
  status: (code: number) => { json: (body: unknown) => void }
}

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    if (request.method !== 'DELETE') return methodNotAllowed(response)

    const { user } = await requireUser(request)
    const body = await readJsonBody(request)
    const grantId = typeof body.grant_id === 'string' ? body.grant_id.trim() : ''
    if (!grantId) return json(response, 400, { error: 'Missing shared contact record' })

    const admin = createAdminClient()
    const { data: grant, error: grantError } = await admin
      .from('collaboration_access_grants')
      .select('*')
      .eq('id', grantId)
      .maybeSingle<AccessGrantRow>()

    if (grantError) throw grantError
    if (!grant) return json(response, 404, { error: 'Shared contact record not found' })

    const currentEmail = normalizeEmail(user.email)
    const isSubject = grant.subject_type === 'user' && (
      grant.subject_id === user.id
      || (currentEmail !== '' && normalizeEmail(grant.subject_email) === currentEmail)
    )

    const { data: membership, error: membershipError } = await admin
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', grant.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError) throw membershipError
    if (!isSubject && !membership) {
      return json(response, 403, { error: 'Not allowed to delete this shared contact record' })
    }

    const { data: deletedGrant, error: deleteError } = await admin
      .from('collaboration_access_grants')
      .delete()
      .eq('id', grant.id)
      .select('*')
      .maybeSingle()

    if (deleteError) throw deleteError
    return json(response, 200, { ok: true, grant: deletedGrant ?? grant })
  } catch (error) {
    const status = error instanceof Error && error.message === 'Unauthorized' ? 401 : 500
    return json(response, status, { error: status === 401 ? 'Unauthorized' : 'Could not delete shared contact record' })
  }
}
