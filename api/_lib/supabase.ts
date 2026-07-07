import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readBearerToken } from './http.js'

interface AppUser {
  id: string
  email?: string | null
}

function requiredEnv(name: string, fallbackName?: string): string {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : undefined)
  if (!value) throw new Error(`Missing ${name}${fallbackName ? ` or ${fallbackName}` : ''}`)
  return value
}

export function createAdminClient(): SupabaseClient {
  return createClient(
    requiredEnv('SUPABASE_URL', 'VITE_SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )
}

export async function requireUser(request: any): Promise<{ user: AppUser; token: string }> {
  const token = readBearerToken(request)
  if (!token) throw new Error('Unauthorized')

  const supabase = createClient(
    requiredEnv('SUPABASE_URL', 'VITE_SUPABASE_URL'),
    requiredEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY'),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    },
  )

  const auth = supabase.auth as unknown as { getUser: (jwt?: string) => Promise<{ data: { user: AppUser | null }; error: Error | null }> }
  const { data, error } = await auth.getUser(token)
  if (error || !data.user) throw new Error('Unauthorized')
  return { user: data.user, token }
}
