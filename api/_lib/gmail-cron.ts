import type { SupabaseClient } from '@supabase/supabase-js'
import type { GoogleConnection } from './google-connection.js'
import { syncGmailForConnection } from './gmail-sync.js'

export interface GmailCronConnectionResult {
  connection_id: string
  user_id: string
  synced: number
  matched: number
  inserted: number
  duplicates: number
  total_messages: number
  messages_scanned: number
  contacts_indexed: number
  email_addresses_indexed: number
  mode?: string
  error?: string
}

export interface GmailCronSummary {
  connections: number
  synced: number
  matched: number
  inserted: number
  duplicates: number
  total_messages: number
  messages_scanned: number
  contacts_indexed: number
  email_addresses_indexed: number
  failures: number
  results: GmailCronConnectionResult[]
}

export async function syncGmailForEnabledConnections(admin: SupabaseClient): Promise<GmailCronSummary> {
  const { data, error } = await admin
    .from('google_connections')
    .select('*')
    .not('refresh_token_encrypted', 'is', null)

  if (error) throw error

  const connections = ((data ?? []) as GoogleConnection[])
    .filter(connection => connection.gmail_sync_enabled !== false)
  const summary: GmailCronSummary = {
    connections: connections.length,
    synced: 0,
    matched: 0,
    inserted: 0,
    duplicates: 0,
    total_messages: 0,
    messages_scanned: 0,
    contacts_indexed: 0,
    email_addresses_indexed: 0,
    failures: 0,
    results: [],
  }

  for (const connection of connections) {
    try {
      const result = await syncGmailForConnection(admin, connection)
      summary.synced += result.synced
      summary.matched += result.matched
      summary.inserted += result.inserted
      summary.duplicates += result.duplicates
      summary.total_messages += result.total_messages
      summary.messages_scanned += result.messages_scanned
      summary.contacts_indexed += result.contacts_indexed
      summary.email_addresses_indexed += result.email_addresses_indexed
      summary.results.push({
        connection_id: connection.id,
        user_id: connection.user_id,
        ...result,
      })
    } catch (error) {
      summary.failures++
      const message = error instanceof Error ? error.message : 'Gmail sync failed'
      console.error('Gmail cron connection failed', {
        connection_id: connection.id,
        user_id: connection.user_id,
        error: message,
      })
      summary.results.push({
        connection_id: connection.id,
        user_id: connection.user_id,
        synced: 0,
        matched: 0,
        inserted: 0,
        duplicates: 0,
        total_messages: 0,
        messages_scanned: 0,
        contacts_indexed: 0,
        email_addresses_indexed: 0,
        error: message,
      })
    }
  }

  return summary
}
