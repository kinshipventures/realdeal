import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  getPipelines,
  getPipelineStages,
  getOpportunities,
  getContacts,
  createPipeline,
  createPipelineStage,
  updatePipeline,
} from '../../lib/airtable'
import type { Contact, Opportunity, Pipeline, PipelineStage } from '../../lib/types'
import { Spinner } from '../ui'
import { PipelineTabBar } from './PipelineTabBar'
import { CreatePipelineModal } from './CreatePipelineModal'
import { PipelineBoard } from './PipelineBoard'

export function PipelinesPage() {
  const [searchParams] = useSearchParams()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [initialOpenOpportunityId, setInitialOpenOpportunityId] = useState<string | undefined>(undefined)

  useEffect(() => {
    Promise.all([getPipelines(), getPipelineStages(), getOpportunities(), getContacts()])
      .then(([pipes, stgs, opps, contacts]) => {
        setPipelines(pipes)
        setStages(stgs)
        setOpportunities(opps)
        setContacts(contacts)

        const pipelineParam = searchParams.get('pipeline')
        const opportunityParam = searchParams.get('opportunity')

        if (opportunityParam) setInitialOpenOpportunityId(opportunityParam)

        const firstActive = pipes.find(p => p.status === 'active')
        if (pipelineParam && pipes.find(p => p.id === pipelineParam)) {
          setActivePipelineId(pipelineParam)
        } else if (firstActive) {
          setActivePipelineId(firstActive.id)
        }
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePipelineCreated = useCallback(async (name: string) => {
    const newPipeline = await createPipeline(name)
    const defaults = [
      { name: 'Lead', order: 0, color: '#4299E1' },
      { name: 'In Progress', order: 1, color: '#ECC94B' },
      { name: 'Closed', order: 2, color: '#48BB78' },
    ]
    const newStages = await Promise.all(
      defaults.map(d => createPipelineStage(d.name, newPipeline.id, d.order, d.color))
    )
    setPipelines(prev => [...prev, newPipeline])
    setStages(prev => [...prev, ...newStages])
    setActivePipelineId(newPipeline.id)
  }, [])

  const handlePipelineHidden = useCallback(async (id: string) => {
    await updatePipeline(id, { status: 'hidden' })
    setPipelines(prev => prev.map(p => p.id === id ? { ...p, status: 'hidden' } : p))
    setActivePipelineId(prev => {
      if (prev !== id) return prev
      const remaining = pipelines.filter(p => p.status === 'active' && p.id !== id)
      return remaining[0]?.id ?? null
    })
  }, [pipelines])

  const handlePipelineUnhidden = useCallback(async (id: string) => {
    await updatePipeline(id, { status: 'active' })
    setPipelines(prev => prev.map(p => p.id === id ? { ...p, status: 'active' } : p))
    setActivePipelineId(id)
  }, [])

  const activePipelines = pipelines.filter(p => p.status === 'active')
  const hiddenPipelines = pipelines.filter(p => p.status === 'hidden')
  const activePipeline = pipelines.find(p => p.id === activePipelineId) ?? null

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 300 }}>
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 300 }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
          Couldn't load pipelines. Refresh to try again.
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 32px 96px', maxWidth: '100%', overflowX: 'auto' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.02em',
          margin: 0,
        }}>
          Pipelines
        </h1>
      </div>
      <PipelineTabBar
        pipelines={activePipelines}
        hiddenPipelines={hiddenPipelines}
        activePipelineId={activePipelineId}
        onSelect={setActivePipelineId}
        onCreateClick={() => setCreateModalOpen(true)}
        onHide={handlePipelineHidden}
        onUnhide={handlePipelineUnhidden}
      />

      {activePipeline ? (
        <PipelineBoard
          pipeline={activePipeline}
          stages={stages.filter(s => s.pipeline_id === activePipeline.id)}
          opportunities={opportunities.filter(o =>
            stages.filter(s => s.pipeline_id === activePipeline.id).some(s => s.id === o.stage_id)
          )}
          contacts={contacts}
          onOpportunitiesChange={setOpportunities}
          onStagesChange={setStages}
          initialOpenOpportunityId={initialOpenOpportunityId}
        />
      ) : (
        <div style={{
          padding: '64px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'var(--color-surface)',
            border: '1px solid var(--edge)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
          }}>
            &#9670;
          </div>
          <p style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}>
            Create your first pipeline
          </p>
          <p style={{
            fontSize: 13,
            color: 'var(--color-text-secondary)',
            margin: 0,
            maxWidth: 280,
            textAlign: 'center',
          }}>
            Pipelines help you track opportunities through stages like Lead, In Progress, and Closed.
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            style={{
              marginTop: 8,
              fontSize: 13,
              fontWeight: 600,
              padding: '8px 20px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--color-brand)',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            + New Pipeline
          </button>
        </div>
      )}

      <CreatePipelineModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handlePipelineCreated}
      />
    </div>
  )
}

