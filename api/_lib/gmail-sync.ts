import type { SupabaseClient } from '@supabase/supabase-js'
import type { GoogleConnection } from './google-connection.js'
import { getFreshGoogleAccessToken } from './google-connection.js'

export interface GmailSyncSummary {
  synced: number
  matched: number
  total_messages: number
}

interface GmailHeader {
  name: string
  value: string
}

interface GmailMessage {
  id: string
  threadId?: string
  payload?: { headers?: GmailHeader[] }
}

interface ContactEmailMatchRow {
  id: string
  email: string | null
  email_2: string | null
  email_3: string | null
  workspace_id: string
  last_contacted_at: string | null
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

export async function syncGmailForConnection(admin: SupabaseClient, connection: GoogleConnection): Promise<GmailSyncSummary> {
  if (!connection.gmail_sync_enabled) return { synced: 0, matched: 0, total_messages: 0 }

  const accessToken = await getFreshGoogleAccessToken(admin, connection)
  const userEmail = (connection.google_email ?? '').toLowerCase()
  const workspaceIds = await getUserWorkspaceIds(admin, connection.user_id)
  if (workspaceIds.length === 0) return { synced: 0, matched: 0, total_messages: 0 }

  const contacts = await getWorkspaceContacts(admin, workspaceIds)
  const contactById = new Map(contacts.map(contact => [contact.id, contact]))
  const emailToContacts = new Map<string, Array<{ id: string; workspace_id: string }>>()
  for (const contact of contacts) {
    for (const value of [contact.email, contact.email_2, contact.email_3]) {
      if (typeof value === 'string' && value.trim()) {
        const email = value.trim().toLowerCase()
        const matches = emailToContacts.get(email) ?? []
        matches.push({
          id: contact.id,
          workspace_id: contact.workspace_id,
        })
        emailToContacts.set(email, matches)
      }
    }
  }

  const existingKeys = await getExistingGmailInteractionKeys(admin, workspaceIds)
  const messageIds = await listRecentGmailMessageIds(accessToken)
  let synced = 0
  let matched = 0

  for (let i = 0; i < messageIds.length; i += 10) {
    const details = await Promise.all(messageIds.slice(i, i + 10).map(id => getGmailMessage(accessToken, id)))
    for (const message of details) {
      if (!message) continue
      synced++

      const headers = message.payload?.headers ?? []
      const from = headerValue(headers, 'From')
      const to = headerValue(headers, 'To')
      const cc = headerValue(headers, 'Cc')
      const dateHeader = headerValue(headers, 'Date')
      const subject = headerValue(headers, 'Subject')
      const fromEmails = extractEmails(from)
      const toEmails = extractEmails(`${to}, ${cc}`)
      const direction = userEmail && fromEmails.includes(userEmail) ? 'sent' : 'received'
      const counterpartEmails = (direction === 'sent' ? toEmails : fromEmails).filter(email => email !== userEmail)
      const fallbackEmails = [...fromEmails, ...toEmails].filter(email => email !== userEmail)
      const candidateEmails = [...new Set([...counterpartEmails, ...fallbackEmails])]
      const matchedContacts = new Map<string, { id: string; workspace_id: string; address: string }>()

      for (const address of candidateEmails) {
        for (const contact of emailToContacts.get(address) ?? []) {
          if (!matchedContacts.has(contact.id)) matchedContacts.set(contact.id, { ...contact, address })
        }
      }

      for (const contact of matchedContacts.values()) {
        const gmailKey = `gmail:${message.id}`
        const interactionKey = `${contact.id}:${gmailKey}`
        if (existingKeys.has(interactionKey)) continue

        const date = parseDateOnly(dateHeader)
        const { error } = await admin.from('interactions').insert({
          contact_id: contact.id,
          user_id: connection.user_id,
          workspace_id: contact.workspace_id,
          type: 'email',
          source: 'Gmail',
          date,
          email_link: gmailKey,
          summary: subject || null,
          notes: direction === 'sent'
            ? `Sent email to ${contact.address}`
            : `Received email from ${contact.address}`,
          event_detail: JSON.stringify({
            direction,
            from,
            to,
            cc,
            messageId: message.id,
            threadId: message.threadId || message.id,
          }),
        })

        if (error) continue

        const currentContact = contactById.get(contact.id)
        if (!currentContact?.last_contacted_at || currentContact.last_contacted_at < date) {
          await admin.from('contacts').update({ last_contacted_at: date }).eq('id', contact.id)
          if (currentContact) currentContact.last_contacted_at = date
        }
        existingKeys.add(interactionKey)
        matched++
      }
    }
  }

  await admin
    .from('google_connections')
    .update({ last_gmail_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', connection.id)

  return { synced, matched, total_messages: messageIds.length }
}

async function getUserWorkspaceIds(admin: SupabaseClient, userId: string): Promise<string[]> {
  const { data, error } = await admin.from('workspace_members').select('workspace_id').eq('user_id', userId)
  if (error) throw error
  return (data ?? []).map((row: { workspace_id: string }) => row.workspace_id)
}

async function getWorkspaceContacts(admin: SupabaseClient, workspaceIds: string[]): Promise<ContactEmailMatchRow[]> {
  const { data, error } = await admin
    .from('contacts')
    .select('id, email, email_2, email_3, workspace_id, last_contacted_at')
    .in('workspace_id', workspaceIds)
  if (error) throw error
  return (data ?? []) as ContactEmailMatchRow[]
}

async function getExistingGmailInteractionKeys(admin: SupabaseClient, workspaceIds: string[]): Promise<Set<string>> {
  const { data, error } = await admin
    .from('interactions')
    .select('contact_id, email_link')
    .eq('source', 'Gmail')
    .in('workspace_id', workspaceIds)
    .not('email_link', 'is', null)
  if (error) throw error
  return new Set((data ?? []).map((row: { contact_id: string; email_link: string }) => `${row.contact_id}:${row.email_link}`))
}

async function listRecentGmailMessageIds(accessToken: string): Promise<string[]> {
  const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)
  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
  url.searchParams.set('q', `after:${thirtyDaysAgo}`)
  url.searchParams.set('maxResults', '100')
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!response.ok) throw new Error('Gmail API error')
  const data = await response.json() as { messages?: Array<{ id: string }> }
  return (data.messages ?? []).map(message => message.id)
}

async function getGmailMessage(accessToken: string, id: string): Promise<GmailMessage | null> {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`)
  url.searchParams.set('format', 'metadata')
  for (const header of ['From', 'To', 'Cc', 'Date', 'Subject']) {
    url.searchParams.append('metadataHeaders', header)
  }
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!response.ok) return null
  return response.json() as Promise<GmailMessage>
}

function headerValue(headers: GmailHeader[], name: string): string {
  return headers.find(header => header.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

function extractEmails(value: string): string[] {
  return (value.match(EMAIL_RE) ?? []).map(email => email.toLowerCase())
}

function parseDateOnly(value: string): string {
  const parsed = value ? new Date(value) : new Date()
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed
  return date.toISOString().slice(0, 10)
}
