import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { getProjects } from '../../lib/airtable'
import type { Project } from '../../lib/types'

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getProjects().then(projects => {
      setProject(projects.find(p => p.id === id) ?? null)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>Loading...</span>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Project not found</span>
        <button
          type="button"
          onClick={() => navigate('/projects')}
          style={{
            padding: '6px 16px', borderRadius: 8, border: '1px solid var(--edge)',
            background: 'var(--color-surface)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            color: 'var(--color-text-primary)',
          }}
        >
          Back to Projects
        </button>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)', overflow: 'hidden' }}>
      <div style={{ padding: '28px 40px 0', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => navigate('/projects')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16, fontFamily: 'inherit',
          }}
        >
          ← Projects
        </button>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 30, fontWeight: 700, margin: '0 0 8px',
          color: 'var(--color-text-primary)',
        }}>
          {project.name}
        </h1>
        {project.description && (
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 24px' }}>
            {project.description}
          </p>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 40px 40px' }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
          {project.relationship_ids.length} relationship{project.relationship_ids.length !== 1 ? 's' : ''} · {project.opportunity_ids.length} opportunit{project.opportunity_ids.length !== 1 ? 'ies' : 'y'}
        </div>
        {project.notes && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Notes</div>
            <p style={{ fontSize: 14, color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>{project.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
