import type { SupabaseClient } from '@supabase/supabase-js'
import { adminErrorStatus, asMetadataRecord, getSupabaseAuthAdmin, normalizeAdminEmail, requireAdminSession, writeAdminAudit } from '../_lib/admin.js'
import { json, methodNotAllowed, readJsonBody } from '../_lib/http.js'

type ApiRequest = {
  method?: string
  body?: unknown
  query?: Record<string, string | string[] | undefined>
}

type ApiResponse = {
  setHeader: (name: string, value: string) => void
  status: (code: number) => { json: (body: unknown) => void }
}

type AdminAction = 'reset_password' | 'delete_preview' | 'delete_confirm'

type UserProfileSummary = {
  id: string
  display_name?: string | null
  email?: string | null
}

const OWNED_WORKSPACE_TABLES = [
  'campaign_contacts',
  'campaign_stages',
  'campaigns',
  'categories',
  'companies',
  'contacts',
  'field_config',
  'interactions',
  'pods',
  'share_links',
  'workspace_invites',
]

const OPTIONAL_USER_TABLES = [
  'gmail_sync_state',
  'google_connections',
]

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function isMissingTable(error: any): boolean {
  return error?.code === '42P01' || /does not exist|schema cache/i.test(error?.message ?? '')
}

async function countRows(query: any): Promise<number> {
  const { count, error } = await query
  if (error) {
    if (isMissingTable(error)) return 0
    throw error
  }
  return count ?? 0
}

async function deleteRows(query: any): Promise<number> {
  const { count, error } = await query
  if (error) {
    if (isMissingTable(error)) return 0
    throw error
  }
  return count ?? 0
}

async function getOwnedWorkspaceIds(admin: SupabaseClient, userId: string): Promise<string[]> {
  const { data, error } = await admin
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', userId)
    .eq('role', 'owner')

  if (error) throw error
  return (data ?? []).map(row => row.workspace_id).filter(Boolean)
}

async function buildDeletePreview(admin: SupabaseClient, userId: string) {
  const { data: authUser, error: authError } = await getSupabaseAuthAdmin(admin).getUserById(userId)
  if (authError) throw authError
  if (!authUser?.user) {
    const notFound = new Error('User not found')
    ;(notFound as any).statusCode = 404
    throw notFound
  }

  const email = normalizeAdminEmail(authUser.user.email)
  const ownedWorkspaceIds = await getOwnedWorkspaceIds(admin, userId)
  const counts: Record<string, number> = {
    owned_workspaces: ownedWorkspaceIds.length,
    workspace_memberships: await countRows(admin.from('workspace_members').select('id', { count: 'exact', head: true }).eq('user_id', userId)),
    profile: await countRows(admin.from('profiles').select('id', { count: 'exact', head: true }).eq('id', userId)),
    incoming_shared_contacts: await countRows(
      admin
        .from('collaboration_access_grants')
        .select('id', { count: 'exact', head: true })
        .eq('subject_type', 'user')
        .eq('subject_id', userId),
    ),
    trusted_connections: await countRows(
      admin
        .from('collaboration_user_connections')
        .select('id', { count: 'exact', head: true })
        .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`),
    ),
    waitlist_entries: email
      ? await countRows(admin.from('waitlist_entries').select('id', { count: 'exact', head: true }).or(`auth_user_id.eq.${userId},email.eq.${email}`))
      : await countRows(admin.from('waitlist_entries').select('id', { count: 'exact', head: true }).eq('auth_user_id', userId)),
  }

  if (ownedWorkspaceIds.length > 0) {
    for (const table of OWNED_WORKSPACE_TABLES) {
      counts[table] = await countRows(admin.from(table).select('id', { count: 'exact', head: true }).in('workspace_id', ownedWorkspaceIds))
    }
  }

  return {
    user: {
      id: authUser.user.id,
      email,
      created_at: authUser.user.created_at,
      last_sign_in_at: authUser.user.last_sign_in_at,
    },
    owned_workspace_ids: ownedWorkspaceIds,
    counts,
    warning:
      'Delete confirmation removes this user, their owned workspaces, and their incoming access. It does not delete contacts owned by other users.',
  }
}

async function listUsers(admin: SupabaseClient, page: number, perPage: number) {
  const { data, error } = await getSupabaseAuthAdmin(admin).listUsers({ page, perPage })
  if (error) throw error

  const users = data.users ?? []
  const ids = users.map(user => user.id)
  const { data: profiles } = ids.length
    ? await admin.from('profiles').select('id, display_name, email').in('id', ids)
    : { data: [] as any[] }
  const profileRows = (profiles ?? []) as UserProfileSummary[]
  const profileById = new Map<string, { display_name?: string | null }>(
    profileRows.map(profile => [profile.id, { display_name: typeof profile.display_name === 'string' ? profile.display_name : null }]),
  )

  const enriched = await Promise.all(
    users.map(async user => {
      const metadata = asMetadataRecord(user.user_metadata)
      const ownedWorkspaces = await getOwnedWorkspaceIds(admin, user.id)
      const memberships = await countRows(admin.from('workspace_members').select('id', { count: 'exact', head: true }).eq('user_id', user.id))
      return {
        id: user.id,
        email: normalizeAdminEmail(user.email),
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        display_name: profileById.get(user.id)?.display_name ?? (typeof metadata.display_name === 'string' ? metadata.display_name : null),
        workspace_memberships: memberships,
        owned_workspaces: ownedWorkspaces.length,
      }
    }),
  )

  return {
    users: enriched,
    page,
    per_page: perPage,
    total: data.total ?? enriched.length,
  }
}

async function deleteAccount(admin: SupabaseClient, userId: string, confirmEmail: string, protectedAdminEmail: string) {
  const preview = await buildDeletePreview(admin, userId)
  const email = normalizeAdminEmail(preview.user.email)
  if (email && email === normalizeAdminEmail(protectedAdminEmail)) {
    const protectedAdmin = new Error('This account is reserved for admin access and cannot be deleted here')
    ;(protectedAdmin as any).statusCode = 400
    throw protectedAdmin
  }
  if (!email || normalizeAdminEmail(confirmEmail) !== email) {
    const mismatch = new Error('Email confirmation does not match')
    ;(mismatch as any).statusCode = 400
    throw mismatch
  }

  const ownedWorkspaceIds = preview.owned_workspace_ids
  const deleted: Record<string, number> = {}

  if (email) {
    deleted.waitlist_entries = await deleteRows(
      admin.from('waitlist_entries').delete({ count: 'exact' }).or(`auth_user_id.eq.${userId},email.eq.${email}`),
    )
    deleted.platform_admins = await deleteRows(
      admin.from('platform_admins').delete({ count: 'exact' }).or(`user_id.eq.${userId},email.eq.${email}`),
    )
  }

  deleted.incoming_access_grants = await deleteRows(
    admin
      .from('collaboration_access_grants')
      .delete({ count: 'exact' })
      .eq('subject_type', 'user')
      .eq('subject_id', userId),
  )
  deleted.created_access_grants = await deleteRows(
    admin.from('collaboration_access_grants').delete({ count: 'exact' }).eq('created_by', userId),
  )
  deleted.trusted_connections = await deleteRows(
    admin
      .from('collaboration_user_connections')
      .delete({ count: 'exact' })
      .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`),
  )
  deleted.approval_requests = await deleteRows(
    admin
      .from('collaboration_approval_requests')
      .delete({ count: 'exact' })
      .or(`requested_by.eq.${userId},approver_id.eq.${userId}`),
  )
  deleted.saved_views = await deleteRows(
    admin.from('collaboration_saved_views').delete({ count: 'exact' }).eq('owner_user_id', userId),
  )
  deleted.pending_connection_shares = await deleteRows(
    admin
      .from('collaboration_pending_connection_shares')
      .delete({ count: 'exact' })
      .or(`subject_id.eq.${userId},created_by.eq.${userId}`),
  )
  deleted.public_campaign_links = await deleteRows(
    admin.from('collaboration_public_campaign_links').delete({ count: 'exact' }).eq('created_by', userId),
  )

  for (const table of OPTIONAL_USER_TABLES) {
    deleted[table] = await deleteRows(admin.from(table).delete({ count: 'exact' }).eq('user_id', userId))
  }

  if (ownedWorkspaceIds.length > 0) {
    deleted.owned_workspace_access_grants = await deleteRows(
      admin.from('collaboration_access_grants').delete({ count: 'exact' }).in('workspace_id', ownedWorkspaceIds),
    )
    deleted.owned_workspace_approval_requests = await deleteRows(
      admin.from('collaboration_approval_requests').delete({ count: 'exact' }).in('workspace_id', ownedWorkspaceIds),
    )
    deleted.owned_workspaces = await deleteRows(admin.from('workspaces').delete({ count: 'exact' }).in('id', ownedWorkspaceIds))
  }

  deleted.workspace_memberships = await deleteRows(admin.from('workspace_members').delete({ count: 'exact' }).eq('user_id', userId))
  deleted.profile = await deleteRows(admin.from('profiles').delete({ count: 'exact' }).eq('id', userId))

  const deleteResult = await getSupabaseAuthAdmin(admin).deleteUser(userId)
  if (deleteResult.error) throw deleteResult.error

  return { preview, deleted }
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const { admin, user } = await requireAdminSession(request)

    if (request.method === 'GET') {
      const rawPage = Number(asString(request.query?.page) || '1')
      const rawPerPage = Number(asString(request.query?.per_page) || '50')
      const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
      const perPage = Number.isFinite(rawPerPage) ? Math.min(Math.max(rawPerPage, 1), 100) : 50
      return json(response, 200, await listUsers(admin, page, perPage))
    }

    if (request.method !== 'POST') return methodNotAllowed(response)

    const body = await readJsonBody(request)
    const action = asString(body.action) as AdminAction
    const targetUserId = asString(body.target_user_id)

    if (!targetUserId) return json(response, 400, { error: 'Target user is required' })
    if (action === 'delete_preview') {
      const preview = await buildDeletePreview(admin, targetUserId)
      if (preview.user.email === user.email) {
        return json(response, 400, { error: 'This account is reserved for admin access and cannot be deleted here' })
      }
      await writeAdminAudit(admin, {
        actorUserId: null,
        actorEmail: user.email,
        action: 'user.delete_previewed',
        targetType: 'auth_user',
        targetId: targetUserId,
      })
      return json(response, 200, { preview })
    }

    if (action === 'reset_password') {
      const { data: target, error: targetError } = await getSupabaseAuthAdmin(admin).getUserById(targetUserId)
      if (targetError) throw targetError
      const email = normalizeAdminEmail(target.user?.email)
      if (!email) return json(response, 400, { error: 'Target user has no email' })

      const { data, error } = await getSupabaseAuthAdmin(admin).generateLink({
        type: 'recovery',
        email,
      })
      if (error) throw error

      await writeAdminAudit(admin, {
        actorUserId: null,
        actorEmail: user.email,
        action: 'user.password_reset_link_created',
        targetType: 'auth_user',
        targetId: targetUserId,
        metadata: { email },
      })
      return json(response, 200, {
        email,
        action_link: data?.properties?.action_link ?? null,
      })
    }

    if (action === 'delete_confirm') {
      const confirmEmail = asString(body.confirm_email)
      const result = await deleteAccount(admin, targetUserId, confirmEmail, user.email)
      await writeAdminAudit(admin, {
        actorUserId: null,
        actorEmail: user.email,
        action: 'user.deleted',
        targetType: 'auth_user',
        targetId: targetUserId,
        metadata: {
          confirmed_email: normalizeAdminEmail(confirmEmail),
          deleted: result.deleted,
        },
      })
      return json(response, 200, { ok: true, deleted: result.deleted })
    }

    return json(response, 400, { error: 'Unsupported admin action' })
  } catch (error) {
    console.error('Admin users request failed', error)
    const status = adminErrorStatus(error)
    return json(response, status, {
      error:
        status === 403
          ? 'Admin access required'
          : status === 401
            ? 'Unauthorized'
            : error instanceof Error
              ? error.message
              : 'Could not process user admin request',
    })
  }
}
