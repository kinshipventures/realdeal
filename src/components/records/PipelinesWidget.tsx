import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus } from 'lucide-react'
import { getOpportunities, getPipelineStages, getPipelines, createOpportunity, invalidateOpportunitiesCache } from '../../lib/airtable'
import type { Contact, Opportunity, Pipeline, PipelineStage } from '../../lib/types'
import { AddToPipelineModal } from '../pipelines/AddToPipelineModal'
import { WIDGET_STYLE } from './shared'

interface PipelinesWidgetProps {
  contact: Contact
}

export function PipelinesWidget({ contact }: PipelinesWidgetProps) {
  const navigate = useNavigate()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [showAddModal, setShowAddModal] = useState(false)

  const load = useCallback(async () => {
    const [opps, stgs, pipes] = await Promise.all([
      getOpportunities(),
      getPipelineStages(),
      getPipelines(),
    ])
    const linked = opps.filter(o => o.relationship_ids.includes(contact.id) && o.status !== 'archived')
    setOpportunities(linked)
    setStages(stgs)
    setPipelines(pipes)
  }, [contact.id])

  useEffect(() => { load() }, [load])

  const handleCreated = useCallback(async () => {
    invalidateOpportunitiesCache()
    await load()
    setShowAddModal(false)
  }, [load])

  const handleClose = useCallback(() => setShowAddModal(false), [])

  const getStage = (stageId: string) => stages.find(s => s.id === stageId)
  const getPipeline = (stageId: string) => {
    const stage = getStage(stageId)
    return stage ? pipelines.find(p => p.id === stage.pipeline_id) : undefined
  }

  return (
    <div style={WIDGET_STYLE}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
        }}>
          Pipelines
        </span>
        <button
          type="button"
          aria-label="Add to Pipeline"
          onClick={() => setShowAddModal(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
            color: 'var(--color-text-tertiary)',
          }}
        >
          <Plus size={16} />
        </button>
      </div>

      {opportunities.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0, lineHeight: 1.5 }}>
          No deals in motion yet
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {opportunities.map(opp => {
            const stage = getStage(opp.stage_id)
            const pipeline = getPipeline(opp.stage_id)
            return (
              <div
                key={opp.id}
                onClick={() => navigate(`/pipelines?pipeline=${pipeline?.id ?? ''}&opportunity=${opp.id}`)}
                style={{
                  padding: '6px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--tint)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-primary)' }}>
                  {opp.name}
                </div>
                {(pipeline || stage) && (
                  <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-secondary)', marginTop: 1 }}>
                    {[pipeline?.name, stage?.name].filter(Boolean).join(' / ')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAddModal && (
        <AddToPipelineModal
          open={showAddModal}
          onClose={handleClose}
          contactIds={[contact.id]}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
