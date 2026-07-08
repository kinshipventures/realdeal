import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { decryptToken, encryptToken } from '../../api/_lib/secure-tokens'
import { syncGmailForEnabledConnections } from '../../api/_lib/gmail-cron'
import { syncGmailForConnection } from '../../api/_lib/gmail-sync'
import { upsertGoogleConnection, type GoogleConnection } from '../../api/_lib/google-connection'

interface GoogleConnectionTable extends Partial<GoogleConnection> {
  updated_at?: string
}

interface GoogleConnectionWrite {
  operation: 'insert' | 'update'
  payload: GoogleConnectionTable
  filter?: { column: string; value: string }
}

class GoogleConnectionQuery {
  data: GoogleConnectionTable | null = null
  error: Error | null = null
  private op: 'select' | 'insert' | 'update' | null = null
  private writePayload: GoogleConnectionTable | null = null

  constructor(
    private row: GoogleConnectionTable | null,
    private onWrite: (write: GoogleConnectionWrite) => void,
  ) {}

  select() {
    if (!this.op) this.op = 'select'
    return this
  }

  eq(column: string, value: string) {
    if (this.op === 'select' && column === 'user_id') {
      this.data = this.row?.user_id === value ? this.row : null
    }
    if (this.op === 'update' && column === 'id' && this.writePayload) {
      this.onWrite({ operation: 'update', payload: this.writePayload, filter: { column, value } })
      this.data = {
        id: this.row?.id ?? value,
        gmail_sync_enabled: true,
        calendar_sync_enabled: true,
        daily_focus_email_enabled: false,
        daily_focus_email_time: '08:00',
        daily_focus_email_to: null,
        daily_focus_email_last_sent_on: null,
        last_gmail_synced_at: null,
        last_calendar_synced_at: null,
        gmail_history_id: null,
        gmail_backfill_page_token: null,
        gmail_backfill_started_at: null,
        gmail_backfill_completed_at: null,
        gmail_last_full_sync_at: null,
        gmail_last_error: null,
        ...this.row,
        ...this.writePayload,
      }
    }
    return this
  }

  maybeSingle() {
    return this
  }

  insert(payload: GoogleConnectionTable) {
    this.op = 'insert'
    this.onWrite({ operation: 'insert', payload })
    this.data = {
      id: this.row?.id ?? 'google-connection-1',
      gmail_sync_enabled: true,
      calendar_sync_enabled: true,
      daily_focus_email_enabled: false,
      daily_focus_email_time: '08:00',
      daily_focus_email_to: null,
      daily_focus_email_last_sent_on: null,
      last_gmail_synced_at: null,
      last_calendar_synced_at: null,
      gmail_history_id: null,
      gmail_backfill_page_token: null,
      gmail_backfill_started_at: null,
      gmail_backfill_completed_at: null,
      gmail_last_full_sync_at: null,
      gmail_last_error: null,
      ...this.row,
      ...payload,
    }
    return this
  }

  update(payload: GoogleConnectionTable) {
    this.op = 'update'
    this.writePayload = payload
    return this
  }

  single() {
    return this
  }
}

interface WorkspaceMemberRow {
  user_id: string
  workspace_id: string
}

interface ContactRow {
  id: string
  email: string | null
  email_2: string | null
  email_3: string | null
  workspace_id: string
  last_contacted_at: string | null
}

interface InteractionRow {
  contact_id: string
  email_link: string | null
  source?: string
  workspace_id?: string
  [key: string]: unknown
}

interface GmailFixtureState {
  workspaceMembers: WorkspaceMemberRow[]
  contacts: ContactRow[]
  interactions: InteractionRow[]
  insertedInteractions: InteractionRow[]
  contactUpdates: Array<{ id: string; patch: Record<string, unknown> }>
  connectionUpdates: Array<{ id: string; patch: Record<string, unknown> }>
  googleConnections: GoogleConnection[]
}

class GmailFixtureQuery {
  data: unknown[] | null = null
  error: Error | null = null
  private op: 'select' | 'insert' | 'update' | null = null
  private filters: Record<string, unknown> = {}
  private inFilters: Record<string, unknown[]> = {}
  private notNullColumns = new Set<string>()
  private updatePatch: Record<string, unknown> | null = null

  constructor(private table: string, private state: GmailFixtureState) {}

  select() {
    this.op = 'select'
    this.refreshSelect()
    return this
  }

  eq(column: string, value: unknown) {
    this.filters[column] = value
    if (this.op === 'select') this.refreshSelect()
    if (this.op === 'update') this.applyUpdate(column, value)
    return this
  }

  in(column: string, values: unknown[]) {
    this.inFilters[column] = values
    if (this.op === 'select') this.refreshSelect()
    return this
  }

  not(column?: string, operator?: string, value?: unknown) {
    if (operator === 'is' && value === null && column) {
      this.notNullColumns.add(column)
    }
    if (this.op === 'select') this.refreshSelect()
    return this
  }

  insert(row: InteractionRow) {
    this.op = 'insert'
    this.state.insertedInteractions.push(row)
    this.state.interactions.push({
      contact_id: row.contact_id,
      email_link: row.email_link,
      source: row.source,
      workspace_id: row.workspace_id as string,
    })
    return this
  }

  update(patch: Record<string, unknown>) {
    this.op = 'update'
    this.updatePatch = patch
    return this
  }

  private refreshSelect() {
    if (this.table === 'workspace_members') {
      this.data = this.state.workspaceMembers
        .filter(row => this.filters.user_id ? row.user_id === this.filters.user_id : true)
        .map(row => ({ workspace_id: row.workspace_id }))
      return
    }

    if (this.table === 'contacts') {
      const workspaceIds = this.inFilters.workspace_id ?? []
      this.data = this.state.contacts.filter(row => workspaceIds.includes(row.workspace_id))
      return
    }

    if (this.table === 'interactions') {
      const workspaceIds = this.inFilters.workspace_id ?? []
      this.data = this.state.interactions
        .filter(row => row.source === this.filters.source)
        .filter(row => workspaceIds.includes(row.workspace_id ?? ''))
        .filter(row => row.email_link !== null)
        .map(row => ({ contact_id: row.contact_id, email_link: row.email_link }))
      return
    }

    if (this.table === 'google_connections') {
      this.data = this.state.googleConnections.filter(connection => (
        !this.notNullColumns.has('refresh_token_encrypted') || connection.refresh_token_encrypted !== null
      ))
      return
    }

    this.data = []
  }

  private applyUpdate(column: string, value: unknown) {
    if (!this.updatePatch) return

    if (this.table === 'contacts' && column === 'id') {
      this.state.contactUpdates.push({ id: String(value), patch: this.updatePatch })
      const contact = this.state.contacts.find(row => row.id === value)
      if (contact && typeof this.updatePatch.last_contacted_at === 'string') {
        contact.last_contacted_at = this.updatePatch.last_contacted_at
      }
    }

    if (this.table === 'google_connections' && column === 'id') {
      this.state.connectionUpdates.push({ id: String(value), patch: this.updatePatch })
    }
  }
}

function createGmailAdminFixture(overrides: Partial<GmailFixtureState> = {}) {
  const state: GmailFixtureState = {
    workspaceMembers: [{ user_id: 'user-a', workspace_id: 'workspace-a' }],
    contacts: [
      {
        id: 'contact-a',
        email: 'contact@example.com',
        email_2: null,
        email_3: null,
        workspace_id: 'workspace-a',
        last_contacted_at: null,
      },
      {
        id: 'contact-other-workspace',
        email: 'other@example.com',
        email_2: null,
        email_3: null,
        workspace_id: 'workspace-b',
        last_contacted_at: null,
      },
    ],
    interactions: [],
    insertedInteractions: [],
    contactUpdates: [],
    connectionUpdates: [],
    googleConnections: [connectedUser()],
    ...overrides,
  }
  return {
    state,
    admin: {
      from(table: string) {
        return new GmailFixtureQuery(table, state)
      },
    },
  }
}

function connectedUser(): GoogleConnection {
  return {
    id: 'connection-a',
    user_id: 'user-a',
    google_email: 'owner@example.com',
    access_token_encrypted: encryptToken('access-token-a'),
    refresh_token_encrypted: encryptToken('refresh-token-a'),
    token_expires_at: '2099-01-01T00:00:00.000Z',
    scopes: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.readonly',
    ],
    gmail_sync_enabled: true,
    calendar_sync_enabled: true,
    daily_focus_email_enabled: false,
    daily_focus_email_time: '08:00',
    daily_focus_email_to: null,
    daily_focus_email_last_sent_on: null,
    last_gmail_synced_at: null,
    last_calendar_synced_at: null,
    gmail_history_id: null,
    gmail_backfill_page_token: null,
    gmail_backfill_started_at: null,
    gmail_backfill_completed_at: null,
    gmail_last_full_sync_at: null,
    gmail_last_error: null,
    gmail_last_messages_scanned: 0,
    gmail_last_contacts_indexed: 0,
    gmail_last_email_addresses_indexed: 0,
    gmail_last_matches_found: 0,
    gmail_last_inserted: 0,
    gmail_last_duplicates: 0,
    gmail_last_sync_mode: null,
  }
}

describe('Google Workspace integration', () => {
  beforeEach(() => {
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = 'a'.repeat(64)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('stores the connection by app user and records scopes granted by Google', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('oauth2/v3/userinfo')) {
        return Response.json({ email: 'Owner@Example.com' })
      }
      if (url.includes('oauth2.googleapis.com/tokeninfo')) {
        return Response.json({
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
        })
      }
      return new Response(null, { status: 404 })
    }))

    let write: GoogleConnectionWrite | null = null
    const admin = {
      from(table: string) {
        expect(table).toBe('google_connections')
        return new GoogleConnectionQuery(null, nextWrite => { write = nextWrite })
      },
    }

    const connection = await upsertGoogleConnection(admin as never, {
      userId: 'user-a',
      appEmail: 'app@example.com',
      accessToken: 'access-token-a',
      refreshToken: 'refresh-token-a',
      expiresIn: 3600,
      scopes: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/calendar.readonly',
      ],
    })

    expect(connection.user_id).toBe('user-a')
    expect(connection.google_email).toBe('owner@example.com')
    expect(write?.operation).toBe('insert')
    expect(write?.payload.user_id).toBe('user-a')
    expect(decryptToken(write?.payload.access_token_encrypted)).toBe('access-token-a')
    expect(decryptToken(write?.payload.refresh_token_encrypted)).toBe('refresh-token-a')
    expect(write?.payload.scopes).toEqual([
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/gmail.readonly',
    ])
  })

  it('keeps the existing refresh token when Google returns only a new access token', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('oauth2/v3/userinfo')) return Response.json({ email: 'Owner@Example.com' })
      if (url.includes('oauth2.googleapis.com/tokeninfo')) return Response.json({ scope: 'openid' })
      return new Response(null, { status: 404 })
    }))

    let write: GoogleConnectionWrite | null = null
    const existing: GoogleConnectionTable = {
      id: 'google-connection-1',
      user_id: 'user-a',
      google_email: 'old@example.com',
      access_token_encrypted: encryptToken('old-access-token'),
      refresh_token_encrypted: encryptToken('existing-refresh-token'),
      token_expires_at: '2026-01-01T00:00:00.000Z',
      scopes: ['openid'],
    }
    const admin = {
      from(table: string) {
        expect(table).toBe('google_connections')
        return new GoogleConnectionQuery(existing, nextWrite => { write = nextWrite })
      },
    }

    await upsertGoogleConnection(admin as never, {
      userId: 'user-a',
      appEmail: 'app@example.com',
      accessToken: 'new-access-token',
      refreshToken: null,
      expiresIn: 3600,
      scopes: ['openid'],
    })

    expect(write?.operation).toBe('update')
    expect(write?.filter).toEqual({ column: 'id', value: 'google-connection-1' })
    expect(decryptToken(write?.payload.access_token_encrypted)).toBe('new-access-token')
    expect(decryptToken(write?.payload.refresh_token_encrypted)).toBe('existing-refresh-token')
  })

  it('adds Gmail interactions for the connected user only in their workspaces', async () => {
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = 'b'.repeat(64)
    vi.stubGlobal('fetch', gmailFetch())
    const { admin, state } = createGmailAdminFixture()

    const result = await syncGmailForConnection(admin as never, connectedUser())

    expect(result).toMatchObject({ synced: 2, matched: 1, inserted: 1, duplicates: 0, total_messages: 2, mode: 'full+rolling', backfill_complete: true })
    expect(state.insertedInteractions).toHaveLength(1)
    expect(state.insertedInteractions[0]).toMatchObject({
      contact_id: 'contact-a',
      user_id: 'user-a',
      workspace_id: 'workspace-a',
      type: 'email',
      source: 'Gmail',
      email_link: 'gmail:message-1',
      summary: 'Fund update',
    })
    expect(state.insertedInteractions[0]?.notes).toBe('Sent email to contact@example.com')
    expect(state.contactUpdates).toEqual([
      { id: 'contact-a', patch: { last_contacted_at: '2026-07-07' } },
    ])
    expect(state.connectionUpdates).toHaveLength(1)
    expect(state.connectionUpdates[0]?.id).toBe('connection-a')
    expect(state.insertedInteractions.some(row => row.contact_id === 'contact-other-workspace')).toBe(false)
  })

  it('does not duplicate existing Gmail interactions', async () => {
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = 'b'.repeat(64)
    vi.stubGlobal('fetch', gmailFetch())
    const { admin, state } = createGmailAdminFixture({
      interactions: [{
        contact_id: 'contact-a',
        email_link: 'gmail:message-1',
        source: 'Gmail',
        workspace_id: 'workspace-a',
      }],
    })

    const result = await syncGmailForConnection(admin as never, connectedUser())

    expect(result).toMatchObject({ synced: 2, matched: 1, inserted: 0, duplicates: 1, total_messages: 2, mode: 'full+rolling', backfill_complete: true })
    expect(state.insertedInteractions).toHaveLength(0)
    expect(state.contactUpdates).toHaveLength(0)
    expect(state.connectionUpdates).toHaveLength(1)
  })

  it('matches Gmail messages against secondary and tertiary contact emails', async () => {
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = 'b'.repeat(64)
    vi.stubGlobal('fetch', gmailFetch({
      pages: [['secondary-message', 'tertiary-message']],
      messages: {
        'secondary-message': {
          id: 'secondary-message',
          from: 'Owner <owner@example.com>',
          to: 'Secondary <secondary@example.com>',
          date: 'Tue, 7 Jul 2026 12:00:00 -0500',
          subject: 'Secondary email',
        },
        'tertiary-message': {
          id: 'tertiary-message',
          from: 'Third <third@example.com>',
          to: 'Owner <owner@example.com>',
          date: 'Tue, 7 Jul 2026 13:00:00 -0500',
          subject: 'Tertiary email',
        },
      },
    }))
    const { admin, state } = createGmailAdminFixture({
      contacts: [
        {
          id: 'contact-secondary',
          email: null,
          email_2: 'secondary@example.com',
          email_3: null,
          workspace_id: 'workspace-a',
          last_contacted_at: null,
        },
        {
          id: 'contact-tertiary',
          email: null,
          email_2: null,
          email_3: 'third@example.com',
          workspace_id: 'workspace-a',
          last_contacted_at: null,
        },
      ],
    })

    const result = await syncGmailForConnection(admin as never, connectedUser())

    expect(result).toMatchObject({ synced: 2, matched: 2, inserted: 2, duplicates: 0, total_messages: 2, mode: 'full+rolling', backfill_complete: true })
    expect(state.insertedInteractions.map(row => row.contact_id).sort()).toEqual(['contact-secondary', 'contact-tertiary'])
    expect(state.insertedInteractions.map(row => row.email_link).sort()).toEqual(['gmail:secondary-message', 'gmail:tertiary-message'])
  })

  it('continues full Gmail backfill across paginated message pages', async () => {
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = 'b'.repeat(64)
    vi.stubGlobal('fetch', gmailFetch({
      pages: [['message-1'], ['message-3']],
      messages: {
        'message-3': {
          id: 'message-3',
          from: 'Owner <owner@example.com>',
          to: 'Contact <contact@example.com>',
          date: 'Tue, 7 Jul 2026 12:30:00 -0500',
          subject: 'Second page update',
        },
      },
    }))
    const { admin, state } = createGmailAdminFixture()

    const result = await syncGmailForConnection(admin as never, connectedUser())

    expect(result).toMatchObject({ synced: 2, matched: 2, inserted: 2, duplicates: 0, total_messages: 2, mode: 'full+rolling', backfill_complete: true })
    expect(state.insertedInteractions.map(row => row.email_link).sort()).toEqual(['gmail:message-1', 'gmail:message-3'])
    expect(state.connectionUpdates.at(-1)?.patch).toMatchObject({
      gmail_backfill_page_token: null,
      gmail_backfill_completed_at: expect.any(String),
      gmail_last_full_sync_at: expect.any(String),
      gmail_history_id: 'profile-history-1',
    })
  })

  it('uses Gmail history for incremental sync after the full backfill is complete', async () => {
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = 'b'.repeat(64)
    vi.stubGlobal('fetch', gmailFetch({
      historyMessages: ['message-1'],
    }))
    const { admin, state } = createGmailAdminFixture()

    const result = await syncGmailForConnection(admin as never, {
      ...connectedUser(),
      gmail_history_id: 'history-old',
      gmail_backfill_completed_at: '2026-07-01T00:00:00.000Z',
    })

    expect(result).toMatchObject({ synced: 2, matched: 1, inserted: 1, duplicates: 0, total_messages: 2, mode: 'incremental+rolling', backfill_complete: true })
    expect(state.insertedInteractions).toHaveLength(1)
    expect(state.connectionUpdates.at(-1)?.patch).toMatchObject({
      gmail_history_id: 'history-next',
      last_gmail_synced_at: expect.any(String),
      gmail_last_messages_scanned: 2,
      gmail_last_matches_found: 1,
      gmail_last_inserted: 1,
    })
  })

  it('recovers recent Gmail messages when history has no message events', async () => {
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = 'b'.repeat(64)
    vi.stubGlobal('fetch', gmailFetch({
      pages: [['rolling-message']],
      historyMessages: [],
      messages: {
        'rolling-message': {
          id: 'rolling-message',
          from: 'Owner <owner@example.com>',
          to: 'Contact <contact@example.com>',
          date: 'Wed, 8 Jul 2026 09:50:00 -0500',
          subject: 'Rolling recovery',
        },
      },
    }))
    const { admin, state } = createGmailAdminFixture()

    const result = await syncGmailForConnection(admin as never, {
      ...connectedUser(),
      gmail_history_id: 'history-old',
      gmail_backfill_completed_at: '2026-07-08T14:49:00.000Z',
    })

    expect(result).toMatchObject({ synced: 1, matched: 1, inserted: 1, duplicates: 0, total_messages: 1, mode: 'incremental+rolling', backfill_complete: true })
    expect(state.insertedInteractions).toHaveLength(1)
    expect(state.insertedInteractions[0]).toMatchObject({
      contact_id: 'contact-a',
      email_link: 'gmail:rolling-message',
      summary: 'Rolling recovery',
    })
  })

  it('returns a no-op result when Gmail sync is disabled', async () => {
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = 'b'.repeat(64)
    vi.stubGlobal('fetch', gmailFetch())
    const { admin, state } = createGmailAdminFixture()

    const result = await syncGmailForConnection(admin as never, {
      ...connectedUser(),
      gmail_sync_enabled: false,
    })

    expect(result).toMatchObject({ synced: 0, matched: 0, inserted: 0, duplicates: 0, total_messages: 0 })
    expect(state.insertedInteractions).toHaveLength(0)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('syncs Gmail automatically for connected accounts with refresh tokens', async () => {
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = 'b'.repeat(64)
    vi.stubGlobal('fetch', gmailFetch())
    const disabledConnection: GoogleConnection = {
      ...connectedUser(),
      id: 'connection-disabled',
      user_id: 'user-disabled',
      gmail_sync_enabled: false,
    }
    const missingRefreshConnection: GoogleConnection = {
      ...connectedUser(),
      id: 'connection-missing-refresh',
      user_id: 'user-missing-refresh',
      refresh_token_encrypted: null,
    }
    const { admin, state } = createGmailAdminFixture({
      workspaceMembers: [
        { user_id: 'user-a', workspace_id: 'workspace-a' },
        { user_id: 'user-disabled', workspace_id: 'workspace-a' },
        { user_id: 'user-missing-refresh', workspace_id: 'workspace-a' },
      ],
      googleConnections: [connectedUser(), disabledConnection, missingRefreshConnection],
    })

    const result = await syncGmailForEnabledConnections(admin as never)

    expect(result.connections).toBe(1)
    expect(result.failures).toBe(0)
    expect(result.synced).toBe(2)
    expect(result.matched).toBe(1)
    expect(result.inserted).toBe(1)
    expect(result.results.map(row => row.connection_id)).toEqual(['connection-a'])
    expect(state.insertedInteractions).toHaveLength(1)
    expect(state.connectionUpdates).toEqual([
      { id: 'connection-a', patch: expect.objectContaining({ updated_at: expect.any(String) }) },
    ])
  })
})

interface GmailFetchMessage {
  id: string
  threadId?: string
  from: string
  to: string
  cc?: string
  bcc?: string
  date: string
  subject: string
}

interface GmailFetchOptions {
  pages?: string[][]
  messages?: Record<string, GmailFetchMessage>
  historyMessages?: string[]
  historyStatus?: number
  profileHistoryId?: string
}

const defaultGmailMessages: Record<string, GmailFetchMessage> = {
  'message-1': {
    id: 'message-1',
    threadId: 'thread-1',
    from: 'Owner <owner@example.com>',
    to: 'Contact <contact@example.com>',
    date: 'Tue, 7 Jul 2026 10:00:00 -0500',
    subject: 'Fund update',
  },
  'message-2': {
    id: 'message-2',
    threadId: 'thread-2',
    from: 'Other <other@example.com>',
    to: 'Owner <owner@example.com>',
    date: 'Tue, 7 Jul 2026 11:00:00 -0500',
    subject: 'Other workspace email',
  },
}

function gmailFetch(options: GmailFetchOptions = {}) {
  const pages = options.pages ?? [['message-1', 'message-2']]
  const messages = { ...defaultGmailMessages, ...(options.messages ?? {}) }

  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer access-token-a' })

    if (url.pathname.endsWith('/gmail/v1/users/me/profile')) {
      return Response.json({ historyId: options.profileHistoryId ?? 'profile-history-1' })
    }

    if (url.pathname.endsWith('/gmail/v1/users/me/history')) {
      if (options.historyStatus) return new Response(null, { status: options.historyStatus })
      return Response.json({
        historyId: 'history-next',
        history: [{
          messagesAdded: (options.historyMessages ?? ['message-1']).map(id => ({ message: { id } })),
        }],
      })
    }

    if (url.pathname.endsWith('/gmail/v1/users/me/messages')) {
      const token = url.searchParams.get('pageToken')
      const pageIndex = token ? Number(token.replace('page-', '')) : 0
      const ids = pages[pageIndex] ?? []
      const nextPageToken = pageIndex < pages.length - 1 ? `page-${pageIndex + 1}` : undefined
      return Response.json({
        messages: ids.map(id => ({ id })),
        nextPageToken,
      })
    }

    const messageId = url.pathname.match(/\/messages\/([^/]+)$/)?.[1]
    if (messageId && messages[messageId]) {
      const message = messages[messageId]
      const headers = [
        { name: 'From', value: message.from },
        { name: 'To', value: message.to },
        { name: 'Date', value: message.date },
        { name: 'Subject', value: message.subject },
      ]
      if (message.cc) headers.push({ name: 'Cc', value: message.cc })
      if (message.bcc) headers.push({ name: 'Bcc', value: message.bcc })
      return Response.json({
        id: message.id,
        threadId: message.threadId ?? message.id.replace('message', 'thread'),
        payload: { headers },
      })
    }

    return new Response(null, { status: 404 })
  })
}
