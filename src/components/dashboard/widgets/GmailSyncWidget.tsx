import { useState, useEffect } from 'react'
import { syncGmail, getLastSyncTime } from '../../../lib/gmail'
import { WidgetHeading } from './WidgetHeading'

export function GmailSyncWidget() {
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [result, setResult] = useState<{ synced: number; matched: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const lastSyncLabel = lastSync
    ? `Last synced ${formatTimeAgo(lastSync)}`
    : 'Never synced'

  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ marginBottom: 12 }}>
        <WidgetHeading title="email sync" tooltip="Sync your Gmail inbox to auto-populate contact timelines with email interactions." />
      </div>
      <div
        className="widget-card"
        style={{
          background: 'var(--surface-panel)',
          border: '1px solid var(--edge)',
          borderRadius: 'var(--panel-radius)',
          padding: '16px 18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="hsla(0, 70%, 50%, 0.7)"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Gmail</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: 0 }}>
              {lastSyncLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            style={{
              background: syncing ? 'var(--tint)' : 'var(--color-brand)',
              border: 'none',
              borderRadius: 8,
              color: syncing ? 'var(--color-text-secondary)' : '#fff',
              fontSize: 12,
              fontWeight: 600,
              padding: '8px 16px',
              minHeight: 44,
              cursor: syncing ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            {syncing ? 'Syncing...' : 'Sync now'}
          </button>
        </div>

        {result && (
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '10px 0 0' }}>
            {result.synced === 0
              ? 'No new emails to sync.'
              : `Synced ${result.synced} email${result.synced !== 1 ? 's' : ''} across ${result.matched} contact${result.matched !== 1 ? 's' : ''}.`}
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
