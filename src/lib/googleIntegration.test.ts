import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GMAIL_SYNC_COMPLETE_EVENT, maybeSyncGmailActivityInBackground, syncGmailActivity } from './googleIntegration'

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}))

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: authMocks.getSession,
    },
  },
}))

describe('Google integration background Gmail sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    authMocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'session-token' } },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('syncs on app open even when the previous Gmail sync was recent', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/google/connection') {
        return Response.json({
          connected: true,
          google_email: 'owner@example.com',
          gmail_sync_enabled: true,
          calendar_sync_enabled: true,
          daily_focus_email_enabled: false,
          daily_focus_email_time: '08:00',
          daily_focus_email_to: null,
          daily_focus_email_last_sent_on: null,
          last_gmail_synced_at: new Date().toISOString(),
          last_calendar_synced_at: null,
          needs_reconnect: false,
        })
      }
      if (String(input) === '/api/google/sync-gmail') {
        return Response.json({ synced: 1, matched: 0, total_messages: 1 })
      }
      return Response.json({ error: 'unexpected request' }, { status: 500 })
    })
    vi.stubGlobal('fetch', fetchMock)

    window.localStorage.setItem('rd:gmail-background-sync:user-recent', String(Date.now()))

    await maybeSyncGmailActivityInBackground('user-recent')

    expect(syncCalls(fetchMock)).toHaveLength(1)
  })

  it('deduplicates simultaneous background Gmail sync attempts for one user', async () => {
    let releaseSync: () => void = () => undefined
    const syncStarted = new Promise<void>(resolve => {
      releaseSync = resolve
    })
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/google/connection') {
        return Response.json({
          connected: true,
          google_email: 'owner@example.com',
          gmail_sync_enabled: true,
          calendar_sync_enabled: true,
          daily_focus_email_enabled: false,
          daily_focus_email_time: '08:00',
          daily_focus_email_to: null,
          daily_focus_email_last_sent_on: null,
          last_gmail_synced_at: null,
          last_calendar_synced_at: null,
          needs_reconnect: false,
        })
      }
      if (String(input) === '/api/google/sync-gmail') {
        await syncStarted
        return Response.json({ synced: 1, matched: 0, total_messages: 1 })
      }
      return Response.json({ error: 'unexpected request' }, { status: 500 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const first = maybeSyncGmailActivityInBackground('user-concurrent')
    const second = maybeSyncGmailActivityInBackground('user-concurrent')
    releaseSync()
    await Promise.all([first, second])

    expect(syncCalls(fetchMock)).toHaveLength(1)
  })

  it('notifies open timelines after Gmail sync inserts activity', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/google/sync-gmail') {
        return Response.json({
          synced: 1,
          matched: 1,
          inserted: 1,
          duplicates: 0,
          affected_contact_ids: ['contact-a'],
          total_messages: 1,
          messages_scanned: 1,
          contacts_indexed: 1,
          email_addresses_indexed: 1,
        })
      }
      return Response.json({ error: 'unexpected request' }, { status: 500 })
    })
    const listener = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    window.addEventListener(GMAIL_SYNC_COMPLETE_EVENT, listener)

    await syncGmailActivity()

    expect(listener).toHaveBeenCalledTimes(1)
    expect((listener.mock.calls[0]?.[0] as CustomEvent).detail.affected_contact_ids).toEqual(['contact-a'])
    window.removeEventListener(GMAIL_SYNC_COMPLETE_EVENT, listener)
  })
})

function syncCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(([input]) => String(input) === '/api/google/sync-gmail')
}
