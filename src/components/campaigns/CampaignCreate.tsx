import { useState, useRef, useEffect } from 'react'
import type { Campaign, CampaignType } from '../../lib/types'
import { createCampaign } from '../../lib/airtable'

const TYPES: CampaignType[] = ['event', 'investment', 'outreach', 'other']

interface Props {
  onCreated: (campaign: Campaign) => void
  onCancel: () => void
}

export function CampaignCreate({ onCreated, onCancel }: Props) {
  const [name, setName] = useState('')
  const [type, setType] = useState<CampaignType>('outreach')
  const [deadline, setDeadline] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  async function handleCreate() {
    if (!name.trim()) return
    setCreating(true)
    setError(false)
    try {
      const campaign = await createCampaign({
        name: name.trim(),
        type,
        deadline: deadline || undefined,
      })
      onCreated(campaign)
    } catch {
      setError(true)
    } finally {
      setCreating(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && name.trim()) handleCreate()
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div style={{
      background: 'var(--surface-panel)',
      backdropFilter: 'var(--panel-blur)',
      WebkitBackdropFilter: 'var(--panel-blur)',
      border: 'var(--surface-panel-border)',
      borderRadius: 'var(--panel-radius)',
      padding: 16,
      marginBottom: 8,
    }}>
      {/* Name */}
      <input
        ref={nameRef}
        type="text"
        placeholder="Campaign name"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          background: 'var(--tint)',
          border: '1px solid var(--edge-strong)',
          borderRadius: 7,
          color: 'var(--color-text-primary)',
          fontSize: 13, fontWeight: 500,
          padding: '8px 12px',
          outline: 'none',
          fontFamily: 'inherit',
          marginBottom: 10,
          boxSizing: 'border-box',
        }}
      />

      {/* Type selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {TYPES.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            style={{
              flex: 1,
              padding: '5px 0',
              borderRadius: 6,
              border: '1px solid',
              borderColor: type === t ? 'var(--edge-strong)' : 'transparent',
              background: type === t ? 'var(--tint)' : 'transparent',
              color: type === t ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              fontSize: 11, fontWeight: type === t ? 500 : 400,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.12s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Deadline */}
      <input
        type="date"
        value={deadline}
        onChange={e => setDeadline(e.target.value)}
        style={{
          width: '100%',
          background: 'var(--tint)',
          border: '1px solid var(--edge-strong)',
          borderRadius: 7,
          color: deadline ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
          fontSize: 12,
          padding: '6px 10px',
          outline: 'none',
          fontFamily: 'inherit',
          marginBottom: 12,
          boxSizing: 'border-box',
        }}
      />

      {error && (
        <p style={{ fontSize: 11, color: '#D93025', margin: '0 0 8px', textAlign: 'right' }}>
          failed to create — try again
        </p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 13,
            color: 'var(--color-text-tertiary)',
            fontFamily: 'inherit', padding: '4px 0',
          }}
        >
          cancel
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!name.trim() || creating}
          style={{
            padding: '7px 18px',
            background: name.trim() ? 'var(--edge)' : 'var(--tint)',
            border: '1px solid var(--edge-strong)',
            borderRadius: 7,
            color: name.trim() ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
            fontSize: 13, fontWeight: 500,
            cursor: name.trim() && !creating ? 'pointer' : 'default',
            fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
        >
          {creating ? 'Creating...' : 'Create'}
        </button>
      </div>
    </div>
  )
}
