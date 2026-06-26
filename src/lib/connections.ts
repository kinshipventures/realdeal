import { supabase } from '@/integrations/supabase/client'

export type UserConnectionStatus = 'pending' | 'accepted' | 'declined' | 'removed'
export type UserConnectionDirection = 'sent' | 'received' | 'other'

export interface UserConnection {
  id: string
  requester_id: string
  recipient_id: string
  status: UserConnectionStatus
  created_at: string
  responded_at: string | null
  removed_at: string | null
  direction: UserConnectionDirection
  connected_user_id: string
  connected_display_name: string | null
  connected_email: string | null
  requester_display_name: string | null
  requester_email: string | null
  recipient_display_name: string | null
  recipient_email: string | null
}

export interface RecognizedAppUser {
  contact_email: string
  user_id: string
  display_name: string | null
  email: string | null
  connection_id: string | null
  connection_status: UserConnectionStatus | null
}

// Generated Supabase types will include these RPCs after the migration is applied.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

function isMissingConnectionsFeature(error: unknown): boolean {
  const code = (error as { code?: string })?.code
  const message = String((error as { message?: string })?.message ?? '').toLowerCase()
  return code === '42P01' || code === '42883' || message.includes('does not exist') || message.includes('schema cache')
}

function normalizeEmails(emails: string[]): string[] {
  return [...new Set(emails.map(email => email.trim().toLowerCase()).filter(Boolean))]
}

export async function getUserConnections(): Promise<UserConnection[]> {
  const { data, error } = await db.rpc('get_user_connections')
  if (error) {
    if (isMissingConnectionsFeature(error)) return []
    throw error
  }
  return (data ?? []) as UserConnection[]
}

export async function createUserConnectionRequest(email: string): Promise<UserConnection | null> {
  const targetEmail = email.trim().toLowerCase()
  if (!targetEmail) throw new Error('Enter an email address')

  const { data, error } = await db.rpc('create_user_connection_request', { target_email: targetEmail })
  if (error) throw error
  return ((Array.isArray(data) ? data[0] : data) ?? null) as UserConnection | null
}

export async function respondUserConnection(
  connectionId: string,
  status: Extract<UserConnectionStatus, 'accepted' | 'declined' | 'removed'>,
): Promise<UserConnection | null> {
  const { data, error } = await db.rpc('respond_user_connection', {
    connection_id: connectionId,
    next_status: status,
  })
  if (error) throw error
  return ((Array.isArray(data) ? data[0] : data) ?? null) as UserConnection | null
}

export async function findAppUsersForContactEmails(emails: string[]): Promise<RecognizedAppUser[]> {
  const contactEmails = normalizeEmails(emails)
  if (contactEmails.length === 0) return []

  const { data, error } = await db.rpc('find_app_users_for_contact_emails', { contact_emails: contactEmails })
  if (error) {
    if (isMissingConnectionsFeature(error)) return []
    throw error
  }
  return (data ?? []) as RecognizedAppUser[]
}
