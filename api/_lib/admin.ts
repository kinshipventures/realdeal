import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from './supabase.js'

export type PlatformAdminRole = 'owner' | 'admin'

const ADMIN_SESSION_COOKIE = 'realdeal_admin_session'
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12
const ADMIN_PASSWORD_HASH_ALGORITHM = 'pbkdf2_sha256'
const ADMIN_PASSWORD_HASH_ITERATIONS = 310000
const ADMIN_PASSWORD_HASH_KEY_LENGTH = 32

export type SupabaseAuthAdmin = {
  deleteUser: (userId: string) => Promise<any>
  generateLink: (params: Record<string, unknown>) => Promise<any>
  getUserById: (userId: string) => Promise<any>
  inviteUserByEmail: (email: string, options?: Record<string, unknown>) => Promise<any>
  listUsers: (params: { page: number; perPage: number }) => Promise<any>
}

type AdminContext = {
  admin: SupabaseClient
  role: PlatformAdminRole
  user: {
    id?: string | null
    email: string
  }
}

export function normalizeAdminEmail(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

export function getSupabaseAuthAdmin(admin: SupabaseClient): SupabaseAuthAdmin {
  return (admin.auth as any).admin as SupabaseAuthAdmin
}

export function asMetadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function requiredAdminEnv(name: 'REALDEAL_ADMIN_EMAIL' | 'REALDEAL_ADMIN_PASSWORD_HASH' | 'ADMIN_SESSION_SECRET'): string {
  const value = process.env[name]?.trim()
  if (!value) {
    const error = new Error('Admin environment is not configured')
    ;(error as any).statusCode = 500
    throw error
  }
  return value
}

function base64UrlEncode(value: Buffer | string): string {
  return Buffer.from(value).toString('base64url')
}

function base64UrlDecode(value: string): Buffer {
  return Buffer.from(value, 'base64url')
}

function safeEqualText(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

function signAdminPayload(encodedPayload: string): string {
  return createHmac('sha256', requiredAdminEnv('ADMIN_SESSION_SECRET')).update(encodedPayload).digest('base64url')
}

function parseCookies(request: any): Record<string, string> {
  const header = request?.headers?.cookie ?? request?.headers?.Cookie ?? ''
  if (typeof header !== 'string' || !header) return {}
  return Object.fromEntries(
    header
      .split(';')
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const index = part.indexOf('=')
        if (index < 0) return [part, '']
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))]
      }),
  )
}

function adminCookieAttributes(maxAgeSeconds: number): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure}`
}

function createAdminSessionToken(email: string): string {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    email,
    role: 'owner' as PlatformAdminRole,
    iat: now,
    exp: now + ADMIN_SESSION_TTL_SECONDS,
    nonce: randomBytes(16).toString('base64url'),
  }
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  return `${encodedPayload}.${signAdminPayload(encodedPayload)}`
}

function parseAdminSessionToken(token: string): { email: string; role: PlatformAdminRole } | null {
  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) return null
  const expectedSignature = signAdminPayload(encodedPayload)
  if (!safeEqualText(signature, expectedSignature)) return null

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload).toString('utf8')) as {
      email?: string
      role?: PlatformAdminRole
      exp?: number
    }
    const email = normalizeAdminEmail(payload.email)
    const configuredEmail = normalizeAdminEmail(requiredAdminEnv('REALDEAL_ADMIN_EMAIL'))
    if (!email || email !== configuredEmail) return null
    if (payload.role !== 'owner' && payload.role !== 'admin') return null
    if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null
    return { email, role: payload.role }
  } catch {
    return null
  }
}

export function setAdminSessionCookie(response: any, email: string) {
  const token = createAdminSessionToken(email)
  response.setHeader('Set-Cookie', `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; ${adminCookieAttributes(ADMIN_SESSION_TTL_SECONDS)}`)
}

export function clearAdminSessionCookie(response: any) {
  response.setHeader('Set-Cookie', `${ADMIN_SESSION_COOKIE}=; ${adminCookieAttributes(0)}`)
}

export function verifyAdminPassword(email: string, password: string): boolean {
  const configuredEmail = normalizeAdminEmail(requiredAdminEnv('REALDEAL_ADMIN_EMAIL'))
  const normalizedEmail = normalizeAdminEmail(email)
  if (!configuredEmail || normalizedEmail !== configuredEmail || !password) return false

  const storedHash = requiredAdminEnv('REALDEAL_ADMIN_PASSWORD_HASH')
  const [algorithm, iterationsText, salt, expectedHash] = storedHash.split('$')
  const iterations = Number(iterationsText)
  if (algorithm !== ADMIN_PASSWORD_HASH_ALGORITHM || !Number.isFinite(iterations) || iterations <= 0 || !salt || !expectedHash) return false

  const actualHash = pbkdf2Sync(password, salt, iterations, ADMIN_PASSWORD_HASH_KEY_LENGTH, 'sha256').toString('base64url')
  return safeEqualText(actualHash, expectedHash)
}

export function createAdminPasswordHash(password: string): string {
  const salt = randomBytes(16).toString('base64url')
  const hash = pbkdf2Sync(password, salt, ADMIN_PASSWORD_HASH_ITERATIONS, ADMIN_PASSWORD_HASH_KEY_LENGTH, 'sha256').toString('base64url')
  return `${ADMIN_PASSWORD_HASH_ALGORITHM}$${ADMIN_PASSWORD_HASH_ITERATIONS}$${salt}$${hash}`
}

export async function requireAdminSession(request: any): Promise<AdminContext> {
  const cookies = parseCookies(request)
  const session = parseAdminSessionToken(cookies[ADMIN_SESSION_COOKIE] ?? '')
  if (!session) {
    const unauthorized = new Error('Unauthorized')
    ;(unauthorized as any).statusCode = 401
    throw unauthorized
  }

  const admin = createAdminClient()
  return { admin, role: session.role, user: { id: null, email: session.email } }
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
