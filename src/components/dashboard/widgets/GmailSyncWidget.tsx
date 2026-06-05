import { useState, useEffect } from 'react'
import { Mail, RefreshCw } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { signInWithGoogle } from '../../../lib/auth'
import { syncGmail, getLastSyncTime } from '../../../lib/gmail'
import { WidgetHeading } from './WidgetHeading'

interface GmailSyncWidgetProps {
  onSynced?: () => void | Promise<void>
}

export function GmailSyncWidget({ onSynced }: GmailSyncWidgetProps) {
  const { session } = useAuth()
  const [syncing, setSyncing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [result, setResult] = useState<{ synced: number; matched: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const connected = Boolean(session?.provider_token)

  useEffect(() => {
    getLastSyncTime().then(setLastSync).catch(() => {})
  }, [])

  async function handleSync() {
    setSyncing(true)
    setError(null)
    setResult(null)
    try {
      const res = await syncGmail()
      setResult({ synced: res.synced, matched: res.matched })
      setLastSync(new Date().toISOString())
      await onSynced?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function handleConnect() {
    setConnecting(true)
    setError(null)
    const result = await signInWithGoogle()
    if (result.error) {
      setError('Could not connect Google. Try again.')
      setConnecting(false)
    }
  }

  const lastSyncLabel = lastSync
    ? `Last synced ${formatTimeAgo(lastSync)}`
    : 'Never synced'

  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ marginBottom: 12 }}>
        <WidgetHeading title="email sync" tooltip="Connect Gmail to automatically track your email conversations on each person's timeline." />
      </div>
      <div
        className="widget-card"
        style={{
          background: 'var(--surface-panel)',
          border: 'var(--surface-panel-border)',
          borderRadius: 'var(--panel-radius)',
          padding: '16px 18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Mail size={16} color="#EA4335" aria-hidden />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Gmail</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: 0 }}>
              {connected ? lastSyncLabel : 'Connect Google to match email with contacts.'}
            </p>
          </div>
          <button
            type="button"
            onClick={connected ? handleSync : handleConnect}
            disabled={syncing || connecting}
            style={{
              background: syncing || connecting ? 'var(--tint)' : 'var(--color-brand)',
              border: 'none',
              borderRadius: 8,
              color: syncing || connecting ? 'var(--color-text-secondary)' : '#fff',
              fontSize: 12,
              fontWeight: 600,
              padding: '8px 16px',
              minHeight: 44,
              cursor: syncing || connecting ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            {connected && <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : undefined }} aria-hidden />}
            {connecting ? 'Connecting...' : syncing ? 'Syncing...' : connected ? 'Sync emails' : 'Connect Google'}
          </button>
        </div>

        {result && (
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '10px 0 0' }}>
            {result.matched === 0
              ? `Checked ${result.synced} new email${result.synced !== 1 ? 's' : ''}. No contact matches found.`
              : `Added ${result.matched} email${result.matched !== 1 ? 's' : ''} to recent activity.`}
          </p>
        )}

        {error && (
          <p style={{ fontSize: 12, color: '#dc2626', margin: '10px 0 0' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
