import { supabase } from '@/integrations/supabase/client'
import type { ShareLink } from './types'
import { getActiveWorkspaceId } from './workspace'

// ── Token + PIN helpers ──────────────────────────────────────────────────────

export function generateToken(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map(b => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 8)
}

export async function hashPin(pin: string): Promise<string> {
  const encoded = new TextEncoder().encode(pin)
  const buffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const computed = await hashPin(pin)
  return computed === hash
}

// ── Auth helper ──────────────────────────────────────────────────────────────

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

// ── Share link CRUD (authenticated) ─────────────────────────────────────────

export async function createShareLink(data: {
  pod_id: string
  excluded_contact_ids: string[]
  visible_columns: string[]
  expires_in_days: 7 | 30 | 90
  pin?: string
}): Promise<ShareLink> {
  const userId = await getUserId()
  const token = generateToken()
  const expires_at = new Date(Date.now() + data.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
  const pin_hash = data.pin ? await hashPin(data.pin) : null

  const { data: row, error } = await supabase
    .from('share_links')
    .insert({
      user_id: userId,
      workspace_id: getActiveWorkspaceId(),
      pod_id: data.pod_id,
      token,
      excluded_contact_ids: data.excluded_contact_ids,
      visible_columns: data.visible_columns,
      expires_at,
      pin_hash,
    })
    .select()
    .single()

  if (error) throw error
  return row as unknown as ShareLink
}

export async function getActiveShareLinks(podId: string): Promise<ShareLink[]> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('share_links')
    .select('*')
    .eq('pod_id', podId)
    .is('revoked_at', null)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as ShareLink[]
}

export async function revokeShareLink(id: string): Promise<void> {
  const { error } = await supabase
    .from('share_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// ── Public fetch (anon, RLS enforces access) ─────────────────────────────────

export async function getShareLink(token: string): Promise<ShareLink | null> {
  const { data, error } = await supabase
    .rpc('get_share_link_by_token', { _token: token })

  if (error || !data || (data as any[]).length === 0) return null
  return (data as any[])[0] as unknown as ShareLink
}

export async function getSharedContacts(
  shareLink: ShareLink
): Promise<{ name: string; role: string | null; company: string | null; pod_name: string }[]> {
  // Fetch pod name
  const { data: podData } = await supabase
    .from('pods')
    .select('name')
    .eq('id', shareLink.pod_id)
    .single()

  const pod_name = podData?.name ?? ''

  // Fetch contact_ids for this pod
  const { data: cpRows, error: cpError } = await supabase
    .from('contact_pods')
    .select('contact_id')
    .eq('pod_id', shareLink.pod_id)

  if (cpError) throw cpError
  if (!cpRows || cpRows.length === 0) return []

  let contactIds = cpRows.map((r: { contact_id: string }) => r.contact_id)

  // Exclude excluded contacts client-side
  if (shareLink.excluded_contact_ids.length > 0) {
    const excluded = new Set(shareLink.excluded_contact_ids)
    contactIds = contactIds.filter((id: string) => !excluded.has(id))
  }

  if (contactIds.length === 0) return []

  // Fetch only the public fields -- no email, phone, notes, or private data
  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('id, name, role, company')
    .in('id', contactIds)

  if (contactsError) throw contactsError

  return (contacts ?? []).map((c: { id: string; name: string; role: string | null; company: string | null }) => ({
    name: c.name,
    role: c.role,
    company: c.company,
    pod_name,
  }))
}
