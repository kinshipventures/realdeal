import { useCallback, useEffect, useState } from 'react'
import { getPipelines, getPipelineStages, createOpportunity, invalidateOpportunitiesCache } from '../../lib/airtable'
import type { Pipeline, PipelineStage } from '../../lib/types'
import { useEscape } from '../../lib/escapeStack'

interface AddToPipelineModalProps {
  open: boolean
  onClose: () => void
  contactIds: string[]
  onCreated?: () => void
}

export function AddToPipelineModal({ open, onClose, contactIds, onCreated }: AddToPipelineModalProps) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState('')
  const [selectedStageId, setSelectedStageId] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getPipelines().then(pipes => {
      const active = pipes.filter(p => p.status === 'active')
      setPipelines(active)
    })
  }, [])

  useEffect(() => {
    if (!selectedPipelineId) { setStages([]); setSelectedStageId(''); return }
    getPipelineStages(selectedPipelineId).then(stgs => {
      const sorted = [...stgs].sort((a, b) => a.order - b.order)
      setStages(sorted)
      setSelectedStageId(sorted[0]?.id ?? '')
    })
  }, [selectedPipelineId])

  const handleClose = useCallback(() => onClose(), [onClose])
  useEscape(handleClose)

  const canSubmit = name.trim() && selectedPipelineId && selectedStageId && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await createOpportunity(name.trim(), selectedStageId, contactIds)
      invalidateOpportunitiesCache()
      onCreated?.()
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--tint)',
        zIndex: 150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: 400,
          borderRadius: 16,
          background: 'var(--surface-panel, rgba(245,244,240,0.88))',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
          padding: 24,
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Add to Campaign
        </h3>

        {contactIds.length > 1 && (
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 400, color: 'var(--color-text-secondary)' }}>
            Adding to campaign for {contactIds.length} contacts
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="text"
            placeholder="Opportunity name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            style={{
              width: '100%',
              height: 36,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid var(--edge)',
              background: 'var(--color-bg)',
              fontSize: 13,
              color: 'var(--color-text-primary)',
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />

          <select
            value={selectedPipelineId}
            onChange={e => setSelectedPipelineId(e.target.value)}
            style={{
              width: '100%',
              height: 36,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid var(--edge)',
              background: 'var(--color-bg)',
              fontSize: 13,
              color: selectedPipelineId ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              cursor: 'pointer',
            }}
          >
            <option value="">Select campaign...</option>
            {pipelines.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={selectedStageId}
            onChange={e => setSelectedStageId(e.target.value)}
            disabled={!selectedPipelineId || stages.length === 0}
            style={{
              width: '100%',
              height: 36,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid var(--edge)',
              background: 'var(--color-bg)',
              fontSize: 13,
              color: selectedStageId ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              cursor: selectedPipelineId ? 'pointer' : 'not-allowed',
              opacity: selectedPipelineId ? 1 : 0.5,
            }}
          >
            <option value="">Select stage...</option>
            {stages.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button
            type="button"
            onClick={handleClose}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: '1px solid var(--edge)',
              background: 'transparent',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: 'none',
              background: canSubmit ? '#25B439' : 'var(--tint)',
              fontSize: 13,
              fontWeight: 600,
              color: canSubmit ? '#fff' : 'var(--color-text-tertiary)',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Add Opportunity
          </button>
        </div>
      </div>
    </div>
  )
}
