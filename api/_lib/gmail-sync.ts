import type { SupabaseClient } from '@supabase/supabase-js'
import type { GoogleConnection } from './google-connection.js'
import { getFreshGoogleAccessToken } from './google-connection.js'

export interface GmailSyncSummary {
  synced: number
  matched: number
  total_messages: number
  mode?: 'full' | 'incremental'
  backfill_complete?: boolean
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

interface GmailMessagePage {
  ids: string[]
  nextPageToken: string | null
}

interface GmailHistoryPage {
  history?: Array<{
    messages?: Array<{ id?: string }>
    messagesAdded?: Array<{ message?: { id?: string } }>
  }>
  historyId?: string
  nextPageToken?: string
}

interface ContactEmailMatchRow {
  id: string
  email: string | null
  email_2: string | null
  email_3: string | null
  workspace_id: string
  last_contacted_at: string | null
}

interface GmailSyncContext {
  admin: SupabaseClient
  connection: GoogleConnection
  accessToken: string
  userEmail: string
  contactById: Map<string, ContactEmailMatchRow>
  emailToContacts: Map<string, Array<{ id: string; workspace_id: string }>>
  existingKeys: Set<string>
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const GMAIL_MESSAGE_BATCH_SIZE = 15
const GMAIL_FULL_SYNC_PAGE_SIZE = 100
const GMAIL_FULL_SYNC_MAX_PAGES_PER_RUN = 5
const GMAIL_FULL_SYNC_TIME_BUDGET_MS = 8000

class GmailHistoryExpiredError extends Error {
  constructor() {
    super('Gmail history cursor expired')
  }
}

class GmailPageTokenExpiredError extends Error {
  constructor() {
    super('Gmail page token expired')
  }
}

export async function syncGmailForConnection(admin: SupabaseClient, connection: GoogleConnection): Promise<GmailSyncSummary> {
  if (!connection.gmail_sync_enabled) return { synced: 0, matched: 0, total_messages: 0 }

  try {
    const accessToken = await getFreshGoogleAccessToken(admin, connection)
    const userEmail = (connection.google_email ?? '').toLowerCase()
    const workspaceIds = await getUserWorkspaceIds(admin, connection.user_id)
    if (workspaceIds.length === 0) {
      await updateGoogleConnectionSyncState(admin, connection.id, {
        last_gmail_synced_at: new Date().toISOString(),
        gmail_last_error: null,
      })
      return { synced: 0, matched: 0, total_messages: 0 }
    }

    const contacts = await getWorkspaceContacts(admin, workspaceIds)
    if (contacts.length === 0) {
      await updateGoogleConnectionSyncState(admin, connection.id, {
        last_gmail_synced_at: new Date().toISOString(),
        gmail_last_error: null,
      })
      return { synced: 0, matched: 0, total_messages: 0 }
    }

    const context: GmailSyncContext = {
      admin,
      connection,
      accessToken,
      userEmail,
      contactById: new Map(contacts.map(contact => [contact.id, contact])),
      emailToContacts: buildContactEmailMap(contacts),
      existingKeys: await getExistingGmailInteractionKeys(admin, workspaceIds),
    }

    if (connection.gmail_history_id && connection.gmail_backfill_completed_at) {
      try {
        return await syncIncrementalGmail(context)
      } catch (error) {
        if (!(error instanceof GmailHistoryExpiredError)) throw error
      }
    }

    return await syncFullGmailBackfill(context)
  } catch (error) {
    await updateGoogleConnectionSyncState(admin, connection.id, {
      gmail_last_error: error instanceof Error ? error.message : 'Gmail sync failed',
    }).catch(() => undefined)
    throw error
  }
}

async function syncIncrementalGmail(context: GmailSyncContext): Promise<GmailSyncSummary> {
  const history = await listGmailHistoryMessageIds(context.accessToken, context.connection.gmail_history_id)
  const result = await processGmailMessages(context, history.ids)
  await updateGoogleConnectionSyncState(context.admin, context.connection.id, {
    gmail_history_id: history.historyId,
    last_gmail_synced_at: new Date().toISOString(),
    gmail_last_error: null,
  })
  return {
    ...result,
    total_messages: history.ids.length,
    mode: 'incremental',
    backfill_complete: true,
  }
}

async function syncFullGmailBackfill(context: GmailSyncContext): Promise<GmailSyncSummary> {
  const startedAt = Date.now()
  let pageToken = context.connection.gmail_backfill_page_token ?? null
  let processedPages = 0
  let totalMessages = 0
  let synced = 0
  let matched = 0
  let completed = false
  let nextPageToken: string | null = pageToken

  while (processedPages < GMAIL_FULL_SYNC_MAX_PAGES_PER_RUN && Date.now() - startedAt < GMAIL_FULL_SYNC_TIME_BUDGET_MS) {
    let page: GmailMessagePage
    try {
      page = await listGmailMessagePage(context.accessToken, pageToken)
    } catch (error) {
      if (error instanceof GmailPageTokenExpiredError && pageToken) {
        pageToken = null
        nextPageToken = null
        continue
      }
      throw error
    }

    const result = await processGmailMessages(context, page.ids)
    synced += result.synced
    matched += result.matched
    totalMessages += page.ids.length
    processedPages++
    nextPageToken = page.nextPageToken

    if (!page.nextPageToken) {
      completed = true
      break
    }

    pageToken = page.nextPageToken
  }

  const now = new Date().toISOString()
  const update: Record<string, unknown> = {
    gmail_backfill_started_at: context.connection.gmail_backfill_started_at ?? now,
    last_gmail_synced_at: now,
    gmail_last_error: null,
  }

  if (completed) {
    const profile = await getGmailProfile(context.accessToken)
    update.gmail_history_id = profile.historyId ?? context.connection.gmail_history_id ?? null
    update.gmail_backfill_page_token = null
    update.gmail_backfill_completed_at = now
    update.gmail_last_full_sync_at = now
  } else {
    update.gmail_backfill_page_token = nextPageToken
  }

  await updateGoogleConnectionSyncState(context.admin, context.connection.id, update)

  return {
    synced,
    matched,
    total_messages: totalMessages,
    mode: 'full',
    backfill_complete: completed,
  }
}

async function processGmailMessages(context: GmailSyncContext, messageIds: string[]): Promise<Pick<GmailSyncSummary, 'synced' | 'matched'>> {
  let synced = 0
  let matched = 0

  for (let i = 0; i < messageIds.length; i += GMAIL_MESSAGE_BATCH_SIZE) {
    const details = await Promise.all(messageIds.slice(i, i + GMAIL_MESSAGE_BATCH_SIZE).map(id => getGmailMessage(context.accessToken, id)))
    for (const message of details) {
      if (!message) continue
      synced++

      const headers = message.payload?.headers ?? []
      const from = headerValue(headers, 'From')
      const to = headerValue(headers, 'To')
      const cc = headerValue(headers, 'Cc')
      const bcc = headerValue(headers, 'Bcc')
      const dateHeader = headerValue(headers, 'Date')
      const subject = headerValue(headers, 'Subject')
      const fromEmails = extractEmails(from)
      const recipientEmails = extractEmails(`${to}, ${cc}, ${bcc}`)
      const direction = context.userEmail && fromEmails.includes(context.userEmail) ? 'sent' : 'received'
      const counterpartEmails = (direction === 'sent' ? recipientEmails : fromEmails).filter(email => email !== context.userEmail)
      const fallbackEmails = [...fromEmails, ...recipientEmails].filter(email => email !== context.userEmail)
      const candidateEmails = [...new Set([...counterpartEmails, ...fallbackEmails])]
      const matchedContacts = new Map<string, { id: string; workspace_id: string; address: string }>()

      for (const address of candidateEmails) {
        for (const contact of context.emailToContacts.get(address) ?? []) {
          if (!matchedContacts.has(contact.id)) matchedContacts.set(contact.id, { ...contact, address })
        }
      }

      for (const contact of matchedContacts.values()) {
        const gmailKey = `gmail:${message.id}`
        const interactionKey = `${contact.id}:${gmailKey}`
        if (context.existingKeys.has(interactionKey)) continue

        const date = parseDateOnly(dateHeader)
        const { error } = await context.admin.from('interactions').insert({
          contact_id: contact.id,
          user_id: context.connection.user_id,
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
            bcc,
            messageId: message.id,
            threadId: message.threadId || message.id,
          }),
        })

        if (error) {
          if (isDuplicateInteractionError(error)) {
            context.existingKeys.add(interactionKey)
            continue
          }
          throw error
        }

        const currentContact = context.contactById.get(contact.id)
        if (!currentContact?.last_contacted_at || currentContact.last_contacted_at < date) {
          const { error: contactError } = await context.admin.from('contacts').update({ last_contacted_at: date }).eq('id', contact.id)
          if (contactError) throw contactError
          if (currentContact) currentContact.last_contacted_at = date
        }
        context.existingKeys.add(interactionKey)
        matched++
      }
    }
  }

  return { synced, matched }
}

function buildContactEmailMap(contacts: ContactEmailMatchRow[]): Map<string, Array<{ id: string; workspace_id: string }>> {
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
  return emailToContacts
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

async function listGmailMessagePage(accessToken: string, pageToken: string | null): Promise<GmailMessagePage> {
  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
  url.searchParams.set('maxResults', String(GMAIL_FULL_SYNC_PAGE_SIZE))
  if (pageToken) url.searchParams.set('pageToken', pageToken)
  const response = await fetch(url, { headers: gmailHeaders(accessToken) })
  if (!response.ok) {
    if (response.status === 400 && pageToken) throw new GmailPageTokenExpiredError()
    throw await gmailApiError(response, 'Gmail message list failed')
  }
  const data = await response.json() as { messages?: Array<{ id: string }>; nextPageToken?: string }
  return {
    ids: (data.messages ?? []).map(message => message.id).filter(Boolean),
    nextPageToken: data.nextPageToken ?? null,
  }
}

async function listGmailHistoryMessageIds(accessToken: string, startHistoryId: string | null): Promise<{ ids: string[]; historyId: string | null }> {
  if (!startHistoryId) throw new GmailHistoryExpiredError()
  const ids = new Set<string>()
  let pageToken: string | null = null
  let historyId: string | null = startHistoryId

  do {
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/history')
    url.searchParams.set('startHistoryId', startHistoryId)
    url.searchParams.set('historyTypes', 'messageAdded')
    url.searchParams.set('maxResults', '500')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const response = await fetch(url, { headers: gmailHeaders(accessToken) })
    if (response.status === 404) throw new GmailHistoryExpiredError()
    if (!response.ok) throw await gmailApiError(response, 'Gmail history list failed')

    const data = await response.json() as GmailHistoryPage
    historyId = data.historyId ?? historyId
    for (const history of data.history ?? []) {
      for (const item of history.messagesAdded ?? []) {
        if (item.message?.id) ids.add(item.message.id)
      }
      if (!history.messagesAdded?.length) {
        for (const message of history.messages ?? []) {
          if (message.id) ids.add(message.id)
        }
      }
    }
    pageToken = data.nextPageToken ?? null
  } while (pageToken)

  return { ids: [...ids], historyId }
}

async function getGmailMessage(accessToken: string, id: string): Promise<GmailMessage | null> {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`)
  url.searchParams.set('format', 'metadata')
  for (const header of ['From', 'To', 'Cc', 'Bcc', 'Date', 'Subject']) {
    url.searchParams.append('metadataHeaders', header)
  }
  const response = await fetch(url, { headers: gmailHeaders(accessToken) })
  if (!response.ok) return null
  return response.json() as Promise<GmailMessage>
}

async function getGmailProfile(accessToken: string): Promise<{ historyId?: string }> {
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', { headers: gmailHeaders(accessToken) })
  if (!response.ok) throw await gmailApiError(response, 'Gmail profile failed')
  return response.json() as Promise<{ historyId?: string }>
}

async function updateGoogleConnectionSyncState(admin: SupabaseClient, connectionId: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await admin
    .from('google_connections')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', connectionId)
  if (error) throw error
}

function gmailHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` }
}

async function gmailApiError(response: Response, fallback: string): Promise<Error> {
  const details = await response.text().catch(() => '')
  return new Error(details ? `${fallback} (${response.status}): ${details.slice(0, 200)}` : `${fallback} (${response.status})`)
}

function isDuplicateInteractionError(error: { code?: string; message?: string }): boolean {
  return error.code === '23505' || /duplicate key/i.test(error.message ?? '')
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
