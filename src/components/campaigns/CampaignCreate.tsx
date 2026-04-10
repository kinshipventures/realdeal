import { useState, useRef, useEffect } from 'react'
import type { Campaign, CampaignStage, CampaignType } from '../../lib/types'
import { createCampaign, createCampaignStage } from '../../lib/airtable'

const TYPES: CampaignType[] = ['event', 'investment', 'outreach', 'other']

const STAGE_TEMPLATES: Record<string, { label: string; stages: string[] }> = {
  event:      { label: 'Event',      stages: ['Invited', "RSVP'd", 'Confirmed', 'Attended'] },
  investment: { label: 'Investment', stages: ['Researching', 'Outreach', 'In Diligence', 'Committed'] },
  outreach:   { label: 'Outreach',   stages: ['Identified', 'Contacted', 'Responded', 'Closed'] },
  custom:     { label: 'Custom',     stages: ['Stage 1', 'Stage 2', 'Stage 3'] },
}

const STAGE_COLORS = ['#718096', '#4299E1', '#ECC94B', '#48BB78', '#7E57C2', '#F5A623']

interface Props {
  onCreated: (campaign: Campaign, stages: CampaignStage[]) => void
  onCancel: () => void
}

export function CampaignCreate({ onCreated, onCancel }: Props) {
  const [name, setName] = useState('')
  const [type, setType] = useState<CampaignType>('outreach')
  const [deadline, setDeadline] = useState('')
  const [template, setTemplate] = useState('outreach')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  // Auto-sync template when type changes (if a matching template exists)
  useEffect(() => {
    if (type in STAGE_TEMPLATES) setTemplate(type)
  }, [type])

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
      // Create all stages in parallel
      const templateStages = STAGE_TEMPLATES[template]?.stages ?? STAGE_TEMPLATES.custom.stages
      const stages = await Promise.all(
        templateStages.map((name, i) =>
          createCampaignStage(campaign.id, name, i, STAGE_COLORS[i % STAGE_COLORS.length])
        )
      )
      onCreated(campaign, stages)
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

  const activeTemplate = STAGE_TEMPLATES[template]

  return (
    <div style={{
      background: 'var(--surface-panel)',
      backdropFilter: 'var(--panel-blur)',
      WebkitBackdropFilter: 'var(--panel-blur)',
      border: 'var(--surface-panel-border)',
      borderRadius: 'var(--panel-radius)',
      padding: 16,
      marginBottom: 12,
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
          width: '100%', background: 'var(--tint)',
          border: '1px solid var(--edge-strong)', borderRadius: 7,
          color: 'var(--color-text-primary)', fontSize: 13, fontWeight: 500,
          padding: '8px 12px', outline: 'none', fontFamily: 'inherit',
          marginBottom: 10, boxSizing: 'border-box',
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
              flex: 1, padding: '5px 0', borderRadius: 6,
              border: '1px solid', borderColor: type === t ? 'var(--edge-strong)' : 'transparent',
              background: type === t ? 'var(--tint)' : 'transparent',
              color: type === t ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              fontSize: 11, fontWeight: type === t ? 500 : 400,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Stage template */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 6, fontWeight: 500 }}>
          Stages
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {Object.entries(STAGE_TEMPLATES).map(([key, tmpl]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTemplate(key)}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
                borderColor: template === key ? 'var(--edge-strong)' : 'transparent',
                background: template === key ? 'var(--tint)' : 'transparent',
                color: template === key ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                transition: 'all 0.12s',
              }}
            >
              {tmpl.label}
            </button>
          ))}
        </div>
        {/* Preview stages */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {activeTemplate?.stages.map((s, i) => (
            <span
              key={i}
              style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 6,
                background: 'var(--tint)', color: 'var(--color-text-secondary)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: STAGE_COLORS[i % STAGE_COLORS.length],
              }} />
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Deadline */}
      <input
        type="date"
        value={deadline}
        onChange={e => setDeadline(e.target.value)}
        style={{
          width: '100%', background: 'var(--tint)',
          border: '1px solid var(--edge-strong)', borderRadius: 7,
          color: deadline ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
          fontSize: 12, padding: '6px 10px', outline: 'none',
          fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box',
        }}
      />

      {error && (
        <p style={{ fontSize: 11, color: '#D93025', margin: '0 0 8px', textAlign: 'right' }}>
          failed to create -- try again
        </p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--color-text-tertiary)',
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
            border: '1px solid var(--edge-strong)', borderRadius: 7,
            color: name.trim() ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
            fontSize: 13, fontWeight: 500,
            cursor: name.trim() && !creating ? 'pointer' : 'default',
            fontFamily: 'inherit', transition: 'all 0.15s',
          }}
        >
          {creating ? 'Creating...' : 'Create'}
        </button>
      </div>
    </div>
  )
}
