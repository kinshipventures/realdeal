import { supabase } from '@/integrations/supabase/client'

interface GmailSyncResult {
  synced: number
  matched: number
  total_messages: number
  error?: string
}

export async function syncGmail(): Promise<GmailSyncResult> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const providerToken = session.provider_token
  if (!providerToken) {
    throw new Error('No Google access token available. Please sign out and sign back in to grant Gmail access.')
  }

  const { data, error } = await supabase.functions.invoke('sync-gmail', {
    body: { google_access_token: providerToken },
  })

  if (error) throw new Error(error.message)
  return data as GmailSyncResult
}

export async function getLastSyncTime(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Use rpc-style query since the table may not yet be in generated types
  const { data, error } = await (supabase as unknown as { from: (t: string) => any })
    .from('gmail_sync_state')
    .select('last_synced_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) return null
  return (data as { last_synced_at: string | null }).last_synced_at ?? null
}
