import { useEffect, useRef, useState } from 'react'
import { createShareLink } from '../../lib/sharing'
import type { Contact, ShareLink } from '../../lib/types'

interface SharePopoverProps {
  podId: string
  members: Contact[]
  onCreated: (link: ShareLink) => void
  onClose: () => void
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
  marginBottom: 6,
  display: 'block',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

export function SharePopover({ podId, members, onCreated, onClose }: SharePopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['name', 'role', 'company', 'pod'])
  const [expiresIn, setExpiresIn] = useState<7 | 30 | 90>(30)
  const [pin, setPin] = useState('')
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  function toggleExcluded(id: string) {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleColumn(col: string) {
    if (col === 'name') return // always on
    setVisibleColumns(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    )
  }

  async function handleCreate() {
    setCreating(true)
    try {
      const result = await createShareLink({
        pod_id: podId,
        excluded_contact_ids: Array.from(excluded),
        visible_columns: visibleColumns,
        expires_in_days: expiresIn,
        pin: pin || undefined,
      })
      const url = `${window.location.origin}/s/${result.token}`
      let copiedToClipboard = false
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        copiedToClipboard = true
      } catch {
        // Link creation should still complete even if clipboard access fails.
      }
      const finish = () => {
        onCreated(result)
      }
      if (copiedToClipboard) {
        setTimeout(finish, 1800)
      } else {
        finish()
      }
    } finally {
      setCreating(false)
    }
  }

  const expiryOptions: Array<{ label: string; value: 7 | 30 | 90 }> = [
    { label: '7 days', value: 7 },
    { label: '30 days', value: 30 },
    { label: '90 days', value: 90 },
  ]

  const columns: Array<{ key: string; label: string }> = [
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role' },
    { key: 'company', label: 'Company' },
    { key: 'pod', label: 'Pod' },
  ]

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 8,
        background: 'var(--color-surface)',
        border: '1px solid var(--edge-strong)',
        borderRadius: 12,
        padding: 20,
        width: 360,
        maxHeight: 480,
        overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        zIndex: 50,
      }}
    >
      {/* Exclude contacts */}
      <div style={{ marginBottom: 16 }}>
        <span style={labelStyle}>Exclude contacts</span>
        {members.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>No members in this pod</p>
        ) : (
          <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {members.map(m => (
              <label
                key={m.id}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '4px 0', cursor: 'pointer', color: 'var(--color-text-primary)' }}
              >
                <input
                  type="checkbox"
                  checked={excluded.has(m.id)}
                  onChange={() => toggleExcluded(m.id)}
                  style={{ width: 13, height: 13, cursor: 'pointer', flexShrink: 0 }}
                />
                {m.name}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Visible columns */}
      <div style={{ marginBottom: 16 }}>
        <span style={labelStyle}>Visible columns</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {columns.map(col => (
            <label
              key={col.key}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '4px 0', cursor: col.key === 'name' ? 'default' : 'pointer', color: 'var(--color-text-primary)' }}
            >
              <input
                type="checkbox"
                checked={visibleColumns.includes(col.key)}
                disabled={col.key === 'name'}
                onChange={() => toggleColumn(col.key)}
                style={{ width: 13, height: 13, cursor: col.key === 'name' ? 'default' : 'pointer', flexShrink: 0 }}
              />
              {col.label}
            </label>
          ))}
        </div>
      </div>

      {/* Expiration */}
      <div style={{ marginBottom: 16 }}>
        <span style={labelStyle}>Expires after</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {expiryOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setExpiresIn(opt.value)}
              style={{
                flex: 1,
                padding: '7px 0',
                fontSize: 12,
                fontWeight: 500,
                fontFamily: 'inherit',
                borderRadius: 7,
                cursor: 'pointer',
                background: expiresIn === opt.value ? 'var(--tint-hover)' : 'transparent',
                border: expiresIn === opt.value ? '1px solid var(--color-brand)' : '1px solid var(--edge)',
                color: expiresIn === opt.value ? 'var(--color-brand)' : 'var(--color-text-secondary)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* PIN protection */}
      <div style={{ marginBottom: 20 }}>
        <span style={labelStyle}>PIN protection (optional)</span>
        <input
          type="text"
          inputMode="numeric"
          value={pin}
          onChange={e => setPin(e.target.value)}
          placeholder="Leave blank for no PIN"
          style={{
            width: '100%',
            background: 'var(--tint)',
            border: '1px solid var(--edge-strong)',
            borderRadius: 7,
            color: 'var(--color-text-primary)',
            fontSize: 13,
            padding: '8px 12px',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Actions */}
      <button
        type="button"
        onClick={handleCreate}
        disabled={creating || copied}
        style={{
          width: '100%',
          background: 'var(--color-brand)',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '10px 16px',
          fontSize: 13,
          fontWeight: 500,
          fontFamily: 'inherit',
          cursor: creating || copied ? 'default' : 'pointer',
          opacity: creating ? 0.7 : 1,
          marginBottom: 8,
        }}
      >
        {copied ? 'Link copied!' : creating ? 'Creating...' : 'Create link'}
      </button>
      <div style={{ textAlign: 'center' }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-secondary)',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
