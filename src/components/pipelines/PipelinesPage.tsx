import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getPipelines,
  getPipelineStages,
  getOpportunities,
  getContacts,
  createPipeline,
  updatePipeline,
} from '../../lib/airtable'
import type { Contact, Opportunity, Pipeline, PipelineStage } from '../../lib/types'
import { Spinner } from '../ui'
import { PipelineTabBar } from './PipelineTabBar'
import { CreatePipelineModal } from './CreatePipelineModal'

// PipelineBoard is created in Task 2b — placeholder until then
function PipelineBoardPlaceholder({ name }: { name: string }) {
  return (
    <div style={{ padding: 32, color: 'var(--color-text-secondary)', fontSize: 13 }}>
      Board for {name}
    </div>
  )
}

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
    setPipelines(prev => [...prev, newPipeline])
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
    <div style={{ padding: 32, maxWidth: '100%', overflowX: 'auto' }}>
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
        <PipelineBoardPlaceholder name={activePipeline.name} />
      ) : (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
          No active pipeline. Create one to get started.
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

