import { supabase } from '@/integrations/supabase/client'
import { syncGmailActivity } from './googleIntegration'

interface GmailSyncResult {
  synced: number
  matched: number
  inserted: number
  duplicates: number
  total_messages: number
  messages_scanned: number
  contacts_indexed: number
  email_addresses_indexed: number
  mode?: string
  backfill_complete?: boolean
  last_error?: string | null
  error?: string
}

export async function syncGmail(): Promise<GmailSyncResult> {
  try {
    return await syncGmailActivity()
  } catch (syncError) {
    const { data: { session } } = await supabase.auth.getSession()
    const providerToken = session?.provider_token
    if (!providerToken) throw syncError

    const { data, error } = await supabase.functions.invoke('sync-gmail', {
      body: { google_access_token: providerToken },
    })

    if (error) throw new Error(error.message)
    return data as GmailSyncResult
  }
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
