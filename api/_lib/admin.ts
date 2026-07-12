import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient, requireUser } from './supabase.js'

export type PlatformAdminRole = 'owner' | 'admin'

type AdminContext = {
  admin: SupabaseClient
  role: PlatformAdminRole
  user: {
    id: string
    email?: string | null
  }
}

export function normalizeAdminEmail(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function parseAllowedAdminEmails(): Set<string> {
  return new Set(
    (process.env.REALDEAL_ADMIN_EMAILS ?? '')
      .split(',')
      .map(normalizeAdminEmail)
      .filter(Boolean),
  )
}

export async function requirePlatformAdmin(request: any): Promise<AdminContext> {
  const { user } = await requireUser(request)
  const admin = createAdminClient()
  const email = normalizeAdminEmail(user.email)
  const allowedEmails = parseAllowedAdminEmails()

  if (email && allowedEmails.has(email)) {
    await admin
      .from('platform_admins')
      .upsert(
        {
          user_id: user.id,
          email,
          role: 'owner',
          active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' },
      )
    return { admin, role: 'owner', user }
  }

  const { data: byUser, error: byUserError } = await admin
    .from('platform_admins')
    .select('role, active')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  if (byUserError) throw byUserError
  if (byUser?.active) return { admin, role: byUser.role as PlatformAdminRole, user }

  if (email) {
    const { data: byEmail, error: byEmailError } = await admin
      .from('platform_admins')
      .select('role, active')
      .eq('email', email)
      .eq('active', true)
      .maybeSingle()

    if (byEmailError) throw byEmailError
    if (byEmail?.active) return { admin, role: byEmail.role as PlatformAdminRole, user }
  }

  const forbidden = new Error('Forbidden')
  ;(forbidden as any).statusCode = 403
  throw forbidden
}

export async function writeAdminAudit(
  admin: SupabaseClient,
  input: {
    actorUserId?: string | null
    actorEmail?: string | null
    action: string
    targetType: string
    targetId?: string | null
    metadata?: Record<string, unknown>
  },
) {
  const { error } = await admin.from('admin_audit_events').insert({
    actor_user_id: input.actorUserId ?? null,
    actor_email: normalizeAdminEmail(input.actorEmail),
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    metadata: input.metadata ?? {},
  })
  if (error) console.warn('Failed to write admin audit event', error)
}

export function adminErrorStatus(error: unknown): number {
  if (error instanceof Error && error.message === 'Unauthorized') return 401
  const status = typeof error === 'object' && error !== null ? (error as any).statusCode : null
  if (status === 403) return 403
  return 500
}
