import { useEffect, useState, type CSSProperties } from 'react'
import { CalendarDays, CheckCircle2, Mail, Power, RefreshCw, Send, TriangleAlert } from 'lucide-react'
import { signInWithGoogle } from '@/lib/auth'
import {
  disconnectGoogleConnection,
  getGoogleConnectionStatus,
  syncGmailActivity,
  updateGooglePreferences,
  type GoogleConnectionStatus,
} from '@/lib/googleIntegration'

const cardStyle: CSSProperties = {
  borderRadius: 14,
  border: '1px solid var(--edge)',
  background: 'var(--color-surface)',
  overflow: 'hidden',
  marginBottom: 28,
  boxShadow: '0 16px 44px rgba(15, 23, 42, 0.05)',
}

const headerStyle: CSSProperties = {
  padding: '18px 18px 16px',
  borderBottom: '1px solid var(--divider)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  padding: '15px 18px',
  borderBottom: '1px solid var(--divider)',
}

const buttonStyle: CSSProperties = {
  minHeight: 36,
  padding: '0 13px',
  borderRadius: 9,
  border: '1px solid var(--edge)',
  background: 'transparent',
  color: 'var(--color-text-primary)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  whiteSpace: 'nowrap',
}

const mutedTextStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: 'var(--color-text-tertiary)',
  lineHeight: 1.45,
}

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 28,
        borderRadius: 14,
        padding: 2,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        flexShrink: 0,
        opacity: disabled ? 0.48 : 1,
        background: checked ? 'var(--color-brand)' : 'var(--edge-strong)',
        transition: 'background 0.2s',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        transform: checked ? 'translateX(16px)' : 'translateX(0)',
        transition: 'transform 0.2s',
      }} />
    </button>
  )
}

function StatusPill({ connected, needsReconnect }: { connected: boolean; needsReconnect?: boolean }) {
  const label = !connected ? 'Not connected' : needsReconnect ? 'Needs reconnect' : 'Connected'
  const color = !connected ? 'var(--color-text-tertiary)' : needsReconnect ? '#b45309' : 'var(--color-brand)'
  const background = !connected ? 'var(--tint)' : needsReconnect ? 'rgba(245, 158, 11, 0.12)' : 'rgba(37,180,57,0.08)'
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 800,
      color,
      background,
      borderRadius: 999,
      padding: '4px 8px',
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
    }}>
      {label}
    </span>
  )
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Never'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function formatDate(value?: string | null) {
  if (!value) return 'Never'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return 'Never'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function defaultGoogleStatus(): GoogleConnectionStatus {
  return {
    connected: false,
    google_email: null,
    gmail_sync_enabled: true,
    calendar_sync_enabled: true,
    daily_focus_email_enabled: false,
    daily_focus_email_time: '08:00',
    daily_focus_email_to: null,
    daily_focus_email_last_sent_on: null,
    last_gmail_synced_at: null,
    last_calendar_synced_at: null,
    needs_reconnect: false,
  }
}

export function GoogleIntegrationSettings() {
  const [status, setStatus] = useState<GoogleConnectionStatus>(defaultGoogleStatus)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [emailDraft, setEmailDraft] = useState('')

  useEffect(() => {
    void refreshStatus()
  }, [])

  useEffect(() => {
    setEmailDraft(status.daily_focus_email_to ?? '')
  }, [status.daily_focus_email_to])

  async function refreshStatus() {
    setLoading(true)
    try {
      setStatus(await getGoogleConnectionStatus())
    } catch {
      setStatus(defaultGoogleStatus())
    } finally {
      setLoading(false)
    }
  }

  async function handleConnect() {
    setConnecting(true)
    setMessage(null)
    const result = await signInWithGoogle()
    if (result.error) {
      setMessage('Google could not be connected. Try again.')
      setConnecting(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setMessage(null)
    try {
      const result = await syncGmailActivity()
      setMessage(
        result.matched === 0
          ? `Gmail sync checked ${result.synced} message${result.synced === 1 ? '' : 's'}. No new contact matches were found.`
          : `Gmail sync complete: ${result.matched} activit${result.matched === 1 ? 'y' : 'ies'} added.`,
      )
      await refreshStatus()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gmail sync failed. Reconnect Google and try again.')
    } finally {
      setSyncing(false)
    }
  }

  async function handleDisconnect() {
    if (!status.connected) return
    const confirmed = window.confirm('Disconnect Google from Real Deal CRM? Existing CRM activity will stay in place.')
    if (!confirmed) return
    setDisconnecting(true)
    setMessage(null)
    try {
      await disconnectGoogleConnection()
      setStatus(defaultGoogleStatus())
      setMessage('Google was disconnected. Existing CRM activity was not removed.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Google could not be disconnected. Try again.')
    } finally {
      setDisconnecting(false)
    }
  }

  async function updatePreference(patch: Partial<GoogleConnectionStatus>) {
    if (!status.connected) return
    const previous = status
    const next = { ...status, ...patch }
    setStatus(next)
    setSaving(true)
    setMessage(null)
    try {
      await updateGooglePreferences(patch)
    } catch (error) {
      setStatus(previous)
      setMessage(error instanceof Error ? error.message : 'Google settings could not be saved. Try again.')
    } finally {
      setSaving(false)
    }
  }

  function commitEmailRecipient() {
    const nextEmail = emailDraft.trim()
    const currentEmail = status.daily_focus_email_to ?? ''
    if (nextEmail === currentEmail) return
    void updatePreference({ daily_focus_email_to: nextEmail || null })
  }

  const connected = Boolean(status.connected)
  const needsReconnect = Boolean(status.needs_reconnect)
  const controlsDisabled = !connected || needsReconnect || saving
  const messageIsError = Boolean(message && /failed|could not|not configured|reconnect|unauthorized/i.test(message))

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8, flexWrap: 'wrap' }}>
            <div style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              background: connected ? 'rgba(37,180,57,0.10)' : 'var(--tint)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: connected ? 'var(--color-brand)' : 'var(--color-text-tertiary)',
            }}>
              {connected && !needsReconnect ? <CheckCircle2 size={16} aria-hidden /> : <Power size={15} aria-hidden />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
                Google Workspace
              </h3>
              <p style={{ ...mutedTextStyle, marginTop: 2 }}>
                Manage Gmail, Calendar, and daily focus email from one place.
              </p>
            </div>
            <StatusPill connected={connected} needsReconnect={needsReconnect} />
          </div>
          <p style={mutedTextStyle}>
            {loading
              ? 'Checking Google connection...'
              : connected
                ? `Connected as ${status.google_email ?? 'a Google account'}.`
                : 'Connect Google to enable Gmail activity sync, Calendar visibility, and daily Today Focus emails.'}
          </p>
          {needsReconnect && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-start', color: '#b45309' }}>
              <TriangleAlert size={14} style={{ marginTop: 1, flexShrink: 0 }} aria-hidden />
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45 }}>
                Reconnect Google to refresh permissions before syncing Gmail or Calendar.
              </p>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting || loading}
            style={{
              ...buttonStyle,
              background: connected && !needsReconnect ? 'transparent' : 'var(--color-brand)',
              color: connected && !needsReconnect ? 'var(--color-text-primary)' : '#fff',
              borderColor: connected && !needsReconnect ? 'var(--edge)' : 'var(--color-brand)',
              opacity: connecting || loading ? 0.6 : 1,
            }}
          >
            <Power size={13} aria-hidden />
            {connecting ? 'Connecting...' : connected ? 'Reconnect Google' : 'Connect Google'}
          </button>
          {connected && (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting || loading}
              style={{ ...buttonStyle, color: 'var(--health-fading)', opacity: disconnecting ? 0.55 : 1 }}
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          )}
        </div>
      </div>

      <div style={rowStyle}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Mail size={14} color="#EA4335" aria-hidden />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Gmail activity sync</span>
          </div>
          <p style={mutedTextStyle}>
            Match sent and received Gmail messages to each contact's Recent Activity.
          </p>
          <p style={{ ...mutedTextStyle, marginTop: 5 }}>
            Last sync: {formatDateTime(status.last_gmail_synced_at)}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Toggle
            checked={Boolean(status.gmail_sync_enabled)}
            disabled={controlsDisabled}
            onChange={checked => void updatePreference({ gmail_sync_enabled: checked })}
          />
          <button
            type="button"
            onClick={handleSync}
            disabled={controlsDisabled || !status.gmail_sync_enabled || syncing}
            style={{ ...buttonStyle, opacity: controlsDisabled || !status.gmail_sync_enabled || syncing ? 0.5 : 1 }}
          >
            <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : undefined }} aria-hidden />
            {syncing ? 'Syncing...' : 'Sync now'}
          </button>
        </div>
      </div>

      <div style={rowStyle}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <CalendarDays size={14} color="var(--color-brand)" aria-hidden />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Google Calendar</span>
          </div>
          <p style={mutedTextStyle}>
            Show Google Calendar events on the dashboard and support upcoming touchpoints.
          </p>
          <p style={{ ...mutedTextStyle, marginTop: 5 }}>
            Last checked: {formatDateTime(status.last_calendar_synced_at)}
          </p>
        </div>
        <Toggle
          checked={Boolean(status.calendar_sync_enabled)}
          disabled={controlsDisabled}
          onChange={checked => void updatePreference({ calendar_sync_enabled: checked })}
        />
      </div>

      <div style={{ ...rowStyle, alignItems: 'flex-start', borderBottom: 'none' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Send size={14} color="#0f766e" aria-hidden />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Daily Today Focus email</span>
          </div>
          <p style={mutedTextStyle}>
            Send each founder their Today Focus contacts by email at their preferred time.
          </p>
          <p style={{ ...mutedTextStyle, marginTop: 5 }}>
            Last sent: {formatDate(status.daily_focus_email_last_sent_on)}
          </p>
        </div>
        <div style={{ display: 'grid', gap: 8, justifyItems: 'end', minWidth: 190 }}>
          <Toggle
            checked={Boolean(status.daily_focus_email_enabled)}
            disabled={controlsDisabled}
            onChange={checked => void updatePreference({ daily_focus_email_enabled: checked })}
          />
          <input
            type="time"
            value={status.daily_focus_email_time ?? '08:00'}
            disabled={controlsDisabled || !status.daily_focus_email_enabled}
            onChange={event => void updatePreference({ daily_focus_email_time: event.target.value })}
            aria-label="Daily Today Focus email time"
            style={{
              minHeight: 34,
              width: 118,
              border: '1px solid var(--edge)',
              borderRadius: 8,
              background: 'transparent',
              color: 'var(--color-text-primary)',
              padding: '0 8px',
              fontFamily: 'inherit',
              opacity: controlsDisabled || !status.daily_focus_email_enabled ? 0.55 : 1,
            }}
          />
          <input
            type="email"
            value={emailDraft}
            disabled={controlsDisabled || !status.daily_focus_email_enabled}
            onChange={event => setEmailDraft(event.target.value)}
            onBlur={commitEmailRecipient}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.currentTarget.blur()
              }
            }}
            placeholder={status.google_email ?? 'Email recipient'}
            aria-label="Daily Today Focus email recipient"
            style={{
              minHeight: 34,
              width: '100%',
              border: '1px solid var(--edge)',
              borderRadius: 8,
              background: 'transparent',
              color: 'var(--color-text-primary)',
              padding: '0 9px',
              fontFamily: 'inherit',
              fontSize: 12,
              opacity: controlsDisabled || !status.daily_focus_email_enabled ? 0.55 : 1,
            }}
          />
        </div>
      </div>

      {message && (
        <p style={{
          margin: 0,
          padding: '0 18px 16px',
          fontSize: 12,
          lineHeight: 1.45,
          color: messageIsError ? '#dc2626' : 'var(--color-brand)',
        }}>
          {message}
        </p>
      )}
    </div>
  )
}
