import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { getProjects } from '../../lib/airtable'
import type { Project } from '../../lib/types'
import { Spinner } from '../ui'
import { EmptyState } from '../empty/EmptyState'
import { CreateProjectModal } from './CreateProjectModal'

export function ProjectsPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    getProjects()
      .then(p => {
        setProjects(p)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [])

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
          Couldn't load projects. Refresh to try again.
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 32px 96px', maxWidth: 1040, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <p style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-text-tertiary)',
            marginBottom: 4,
          }}>
            Projects
          </p>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em',
            margin: 0,
          }}>
            Projects
          </h1>
          <p style={{
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            marginTop: 4,
          }}>
            Organize people and opportunities around initiatives
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          aria-label="Create new project"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--color-brand)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(37,180,57,0.30)',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Card grid or empty state */}
      {projects.length === 0 ? (
        <div style={{ marginTop: 40 }}>
          <EmptyState
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            }
            heading="No projects yet"
            subtext="Organize podcast outreach, philanthropy campaigns, SPV initiatives, events, and more."
            ctaLabel="Create your first project"
            onCta={() => setCreateOpen(true)}
          />
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
          marginTop: 24,
        }}>
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => navigate(`/projects/${project.id}`)}
            />
          ))}
        </div>
      )}

      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={project => setProjects(prev => [...prev, project])}
      />
    </div>
  )
}

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--nav-bg)',
        border: '1px solid var(--edge)',
        borderRadius: 12,
        padding: 20,
        cursor: 'pointer',
        transition: 'box-shadow 0.15s, transform 0.15s',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-1px)' : 'none',
      }}
    >
      <h2 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--color-text-primary)',
        letterSpacing: '-0.01em',
        margin: '0 0 8px',
      }}>
        {project.name}
      </h2>
      {project.description && (
        <p style={{
          fontSize: 13,
          color: 'var(--color-text-secondary)',
          margin: '0 0 12px',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {project.description}
        </p>
      )}
      <div style={{
        display: 'flex',
        gap: 12,
        fontSize: 11,
        color: 'var(--color-text-tertiary)',
        marginTop: project.description ? 0 : 12,
      }}>
        <span>{project.relationship_ids.length} contact{project.relationship_ids.length !== 1 ? 's' : ''}</span>
        <span>{project.opportunity_ids.length} opportunit{project.opportunity_ids.length !== 1 ? 'ies' : 'y'}</span>
      </div>
    </div>
  )
}
