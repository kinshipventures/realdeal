import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus } from 'lucide-react'
import { getProjects, addRecordToProject, invalidateProjectsCache } from '../../lib/airtable'
import type { Contact, Project } from '../../lib/types'
import { WIDGET_STYLE } from './shared'

interface ProjectsWidgetProps {
  contact: Contact
}

export function ProjectsWidget({ contact }: ProjectsWidgetProps) {
  const navigate = useNavigate()
  const [linked, setLinked] = useState<Project[]>([])
  const [all, setAll] = useState<Project[]>([])
  const [showPicker, setShowPicker] = useState(false)

  const load = useCallback(async () => {
    const projects = await getProjects()
    setAll(projects)
    setLinked(projects.filter(p => p.relationship_ids.includes(contact.id)))
  }, [contact.id])

  useEffect(() => { load() }, [load])

  const handleAdd = useCallback(async (projectId: string) => {
    await addRecordToProject(projectId, contact.id)
    invalidateProjectsCache()
    await load()
    setShowPicker(false)
  }, [contact.id, load])

  const unlinked = all.filter(p => !p.relationship_ids.includes(contact.id))

  return (
    <div style={WIDGET_STYLE}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
        }}>
          Projects
        </span>
        <button
          type="button"
          aria-label="Add to Project"
          onClick={() => setShowPicker(v => !v)}
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

      {showPicker && (
        <div style={{
          marginBottom: 10,
          background: 'var(--color-bg)',
          border: '1px solid var(--edge)',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          {unlinked.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              No other projects available
            </div>
          ) : (
            unlinked.map(p => (
              <div
                key={p.id}
                onClick={() => handleAdd(p.id)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--edge)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--tint)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                {p.description && (
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 1 }}>{p.description}</div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {linked.length === 0 ? (
        <button
          type="button"
          onClick={() => setShowPicker(v => !v)}
          style={{
            fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0, lineHeight: 1.5,
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontFamily: 'inherit', textAlign: 'left',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-brand)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-tertiary)' }}
        >
          + Add to a project
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {linked.map(project => (
            <div
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}`)}
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
                {project.name}
              </div>
              {project.description && (
                <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-secondary)', marginTop: 1 }}>
                  {project.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
