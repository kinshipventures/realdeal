import { useState, useEffect } from 'react'
import { syncGranola, getGranolaApiKey, setGranolaApiKey, getLastGranolaSync } from '../../../lib/granola'
import { WidgetHeading } from './WidgetHeading'

export function GranolaSyncWidget() {
  const [syncing, setSyncing] = useState(false)
  const [apiKey, setApiKey] = useState(getGranolaApiKey() ?? '')
  const [editing, setEditing] = useState(false)
  const [lastSync, setLastSync] = useState(getLastGranolaSync())
  const [result, setResult] = useState<{ matched: number; created: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const connected = !!getGranolaApiKey()

  function handleSaveKey() {
    const trimmed = apiKey.trim()
    if (trimmed && !trimmed.startsWith('grn_')) {
      setError('Key should start with grn_')
      return
    }
    setGranolaApiKey(trimmed || null)
    setEditing(false)
    setError(null)
  }

  async function handleSync() {
    setSyncing(true)
    setError(null)
    setResult(null)
    try {
      const res = await syncGranola()
      setResult({ matched: res.matched, created: res.interactions_created })
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
        <WidgetHeading title="meeting notes" tooltip="Connect Granola to automatically log meetings on each person's timeline." />
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
              </svg>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Granola</span>
              {connected && !editing && (
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-brand)', background: 'rgba(37,180,57,0.08)', borderRadius: 4, padding: '1px 6px' }}>Connected</span>
              )}
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: 0 }}>
              {connected ? lastSyncLabel : 'Add your API key to sync meeting notes'}
            </p>
          </div>
          {connected && !editing ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                style={{
                  background: syncing ? 'var(--tint)' : 'var(--color-brand)',
                  border: 'none', borderRadius: 8,
                  color: syncing ? 'var(--color-text-secondary)' : '#fff',
                  fontSize: 12, fontWeight: 600,
                  padding: '8px 16px', minHeight: 44,
                  cursor: syncing ? 'wait' : 'pointer',
                  fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}
              >
                {syncing ? 'Syncing...' : 'Sync meetings'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(true)}
                style={{
                  background: 'none', border: '1px solid var(--edge)',
                  borderRadius: 8, padding: '8px 12px', minHeight: 44,
                  cursor: 'pointer', fontSize: 12, color: 'var(--color-text-tertiary)',
                  fontFamily: 'inherit',
                }}
              >
                Key
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              style={{
                background: 'var(--tint)', border: '1px solid var(--edge)',
                borderRadius: 8, padding: '8px 16px', minHeight: 44,
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                color: 'var(--color-text-secondary)', fontFamily: 'inherit',
              }}
            >
              Connect
            </button>
          )}
        </div>

        {/* API key input */}
        {editing && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="grn_..."
              style={{
                flex: 1,
                background: 'var(--tint)',
                border: '1px solid var(--edge-strong)',
                borderRadius: 6, fontSize: 12,
                padding: '8px 10px', outline: 'none',
                fontFamily: 'monospace',
                color: 'var(--color-text-primary)',
              }}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveKey() }}
              autoFocus
            />
            <button
              type="button"
              onClick={handleSaveKey}
              style={{
                background: 'var(--color-brand)', border: 'none',
                borderRadius: 6, color: '#fff', fontSize: 12,
                fontWeight: 600, padding: '8px 14px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setApiKey(getGranolaApiKey() ?? '') }}
              style={{
                background: 'none', border: '1px solid var(--edge)',
                borderRadius: 6, fontSize: 12, padding: '8px 10px',
                cursor: 'pointer', color: 'var(--color-text-tertiary)',
                fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Result / error feedback */}
        {result && (
          <p style={{ fontSize: 11, color: 'var(--color-brand)', margin: '8px 0 0' }}>
            {result.created} meeting{result.created !== 1 ? 's' : ''} logged across {result.matched} contact{result.matched !== 1 ? 's' : ''}
          </p>
        )}
        {error && (
          <p style={{ fontSize: 11, color: '#dc2626', margin: '8px 0 0' }}>{error}</p>
        )}
      </div>
    </div>
  )
}

function formatTimeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
