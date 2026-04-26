import { useState } from 'react'
import { PROVIDERS, getProviderKey, setProviderKey, getLastSync, syncProvider, type MeetingProvider } from '../../../lib/meeting-sync'
import { WidgetHeading } from './WidgetHeading'

export function MeetingNotesWidget() {
  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ marginBottom: 12 }}>
        <WidgetHeading title="meeting notes" tooltip="Connect AI meeting note apps to automatically log meetings on each person's timeline." />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PROVIDERS.map(provider => (
          <ProviderRow key={provider.id} provider={provider} />
        ))}
      </div>
    </div>
  )
}

function ProviderRow({ provider }: { provider: MeetingProvider }) {
  const [syncing, setSyncing] = useState(false)
  const [apiKey, setApiKey] = useState(getProviderKey(provider) ?? '')
  const [editing, setEditing] = useState(false)
  const [lastSync, setLastSyncState] = useState(getLastSync(provider))
  const [result, setResult] = useState<{ matched: number; created: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const connected = !!getProviderKey(provider)

  function handleSaveKey() {
    const trimmed = apiKey.trim()
    if (trimmed && !provider.validate(trimmed)) {
      setError(`Key should start with ${provider.keyPrefix}`)
      return
    }
    setProviderKey(provider, trimmed || null)
    setEditing(false)
    setError(null)
  }

  async function handleSync() {
    setSyncing(true)
    setError(null)
    setResult(null)
    try {
      const res = await syncProvider(provider.id)
      setResult({ matched: res.matched, created: res.interactions_created })
      setLastSyncState(new Date().toISOString())
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
    <div
      className="widget-card"
      style={{
        background: 'var(--surface-panel)',
        border: '1px solid var(--edge)',
        borderRadius: 'var(--panel-radius)',
        padding: '14px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <ProviderIcon id={provider.id} />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{provider.name}</span>
            {connected && !editing && (
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-brand)', background: 'rgba(37,180,57,0.08)', borderRadius: 4, padding: '1px 6px' }}>Connected</span>
            )}
            {provider.comingSoon && !connected && (
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)', background: 'var(--tint)', borderRadius: 4, padding: '1px 6px' }}>Coming soon</span>
            )}
          </div>
          <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: 0 }}>
            {connected ? lastSyncLabel : provider.comingSoon ? 'Sync support coming soon' : `Add your API key to sync`}
          </p>
        </div>
        {connected && !editing ? (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {!provider.comingSoon && (
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                style={{
                  background: syncing ? 'var(--tint)' : 'var(--color-accent)',
                  border: 'none', borderRadius: 8,
                  color: syncing ? 'var(--color-text-secondary)' : '#fff',
                  fontSize: 12, fontWeight: 600,
                  padding: '7px 14px', minHeight: 36,
                  cursor: syncing ? 'wait' : 'pointer',
                  fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}
              >
                {syncing ? 'Syncing...' : 'Sync'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              style={{
                background: 'none', border: '1px solid var(--edge)',
                borderRadius: 8, padding: '7px 10px', minHeight: 36,
                cursor: 'pointer', fontSize: 11, color: 'var(--color-text-tertiary)',
                fontFamily: 'inherit',
              }}
            >
              Key
            </button>
          </div>
        ) : !connected ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={provider.comingSoon}
            style={{
              background: provider.comingSoon ? 'var(--tint)' : 'var(--tint)', border: '1px solid var(--edge)',
              borderRadius: 8, padding: '7px 14px', minHeight: 36, flexShrink: 0,
              cursor: provider.comingSoon ? 'default' : 'pointer', fontSize: 12, fontWeight: 600,
              color: provider.comingSoon ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)', fontFamily: 'inherit',
              opacity: provider.comingSoon ? 0.6 : 1,
            }}
          >
            Connect
          </button>
        ) : null}
      </div>

      {editing && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder={`${provider.keyPrefix}...`}
            style={{
              flex: 1,
              background: 'var(--tint)',
              border: '1px solid var(--edge-strong)',
              borderRadius: 6, fontSize: 12,
              padding: '7px 10px', outline: 'none',
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
              background: 'var(--color-accent)', border: 'none',
              borderRadius: 6, color: '#fff', fontSize: 12,
              fontWeight: 600, padding: '7px 12px',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setApiKey(getProviderKey(provider) ?? ''); setError(null) }}
            style={{
              background: 'none', border: '1px solid var(--edge)',
              borderRadius: 6, fontSize: 12, padding: '7px 10px',
              cursor: 'pointer', color: 'var(--color-text-tertiary)',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {result && (
        <p style={{ fontSize: 11, color: 'var(--color-brand)', margin: '6px 0 0' }}>
          {result.created} meeting{result.created !== 1 ? 's' : ''} logged across {result.matched} contact{result.matched !== 1 ? 's' : ''}
        </p>
      )}
      {error && (
        <p style={{ fontSize: 11, color: '#dc2626', margin: '6px 0 0' }}>{error}</p>
      )}
    </div>
  )
}

function ProviderIcon({ id }: { id: string }) {
  const size = 16
  // Simple pencil/note icon for all providers - differentiated by color
  const colors: Record<string, string> = {
    granola: 'var(--color-text-primary)',
    otter: '#3B82F6',
    fireflies: '#8B5CF6',
    fathom: '#F59E0B',
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={colors[id] || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
    </svg>
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
