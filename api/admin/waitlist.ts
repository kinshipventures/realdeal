import { adminErrorStatus, getSupabaseAuthAdmin, normalizeAdminEmail, requirePlatformAdmin, writeAdminAudit } from '../_lib/admin.js'
import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js'

type ApiRequest = {
  method?: string
  body?: unknown
}

type ApiResponse = {
  setHeader: (name: string, value: string) => void
  status: (code: number) => { json: (body: unknown) => void }
}

type WaitlistAction = 'approve_waitlist_entry' | 'deny_waitlist_entry'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const { admin, user } = await requirePlatformAdmin(request)

    if (request.method === 'GET') {
      const { data, error } = await admin
        .from('waitlist_entries')
        .select('id, email, display_name, status, source, metadata, auth_user_id, decided_at, invite_sent_at, notes, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(250)

      if (error) throw error
      return json(response, 200, { entries: data ?? [] })
    }

    if (request.method !== 'POST') return methodNotAllowed(response)

    const body = await readJsonBody(request)
    const action = typeof body.action === 'string' ? (body.action as WaitlistAction) : null
    const id = typeof body.id === 'string' ? body.id : ''
    const notes = typeof body.notes === 'string' ? body.notes.slice(0, 500) : null

    if (!id) return json(response, 400, { error: 'Waitlist entry is required' })

    const { data: entry, error: entryError } = await admin
      .from('waitlist_entries')
      .select('id, email, display_name, status')
      .eq('id', id)
      .maybeSingle()

    if (entryError) throw entryError
    if (!entry) return json(response, 404, { error: 'Waitlist entry not found' })

    if (action === 'deny_waitlist_entry') {
      const { data, error } = await admin
        .from('waitlist_entries')
        .update({
          status: 'denied',
          decided_by: user.id,
          decided_at: new Date().toISOString(),
          notes,
        })
        .eq('id', entry.id)
        .select('id, email, display_name, status, decided_at, notes, created_at, updated_at')
        .single()

      if (error) throw error
      await writeAdminAudit(admin, {
        actorUserId: user.id,
        actorEmail: user.email,
        action: 'waitlist.denied',
        targetType: 'waitlist_entry',
        targetId: entry.id,
        metadata: { email: entry.email },
      })
      return json(response, 200, { entry: data })
    }

    if (action === 'approve_waitlist_entry') {
      const email = normalizeAdminEmail(entry.email)
      if (!email) return json(response, 400, { error: 'Waitlist entry has no email' })

      let invitedUserId: string | null = null
      let inviteWarning: string | null = null

      const inviteResult = await getSupabaseAuthAdmin(admin).inviteUserByEmail(email, {
        data: { display_name: entry.display_name ?? undefined },
      })

      if (inviteResult.error) {
        const message = inviteResult.error.message ?? 'Could not invite user'
        if (/already|registered|exists/i.test(message)) inviteWarning = message
        else throw inviteResult.error
      } else {
        invitedUserId = inviteResult.data?.user?.id ?? null
      }

      const { data, error } = await admin
        .from('waitlist_entries')
        .update({
          status: invitedUserId ? 'invited' : 'approved',
          auth_user_id: invitedUserId,
          decided_by: user.id,
          decided_at: new Date().toISOString(),
          invite_sent_at: new Date().toISOString(),
          notes,
          metadata: {
            approved_from_admin: true,
            invite_warning: inviteWarning,
          },
        })
        .eq('id', entry.id)
        .select('id, email, display_name, status, auth_user_id, decided_at, invite_sent_at, notes, created_at, updated_at')
        .single()

      if (error) throw error
      await writeAdminAudit(admin, {
        actorUserId: user.id,
        actorEmail: user.email,
        action: 'waitlist.approved',
        targetType: 'waitlist_entry',
        targetId: entry.id,
        metadata: { email, invited_user_id: invitedUserId, invite_warning: inviteWarning },
      })
      return json(response, 200, { entry: data, invite_warning: inviteWarning })
    }

    return json(response, 400, { error: 'Unsupported waitlist action' })
  } catch (error) {
    console.error('Admin waitlist request failed', error)
    const status = adminErrorStatus(error)
    return json(response, status, {
      error: status === 403 ? 'Admin access required' : status === 401 ? 'Unauthorized' : 'Could not process waitlist request',
    })
  }
}
