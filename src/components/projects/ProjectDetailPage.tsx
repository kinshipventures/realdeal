import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  getProjects,
  getContacts,
  getOpportunities,
  getAllInteractions,
  getPods,
  removeRecordFromProject,
  removeOpportunityFromProject,
  addProjectNote,
  updateProject,
  invalidateProjectsCache,
} from '../../lib/airtable'
import type { Contact, Interaction, Opportunity, Pod, Project } from '../../lib/types'
import { formatRelativeTime } from '../../lib/utils'
import { Spinner } from '../ui'
import { ContactDetail } from '../contacts/ContactDetail'
import { AddToProjectModal } from './AddToProjectModal'

type Tab = 'people' | 'opportunities' | 'notes'

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [notes, setNotes] = useState<Interaction[]>([])
  const [pods, setPods] = useState<Pod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('people')

  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [editingDesc, setEditingDesc] = useState(false)
  const [editDesc, setEditDesc] = useState('')

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [addMode, setAddMode] = useState<'contacts' | 'opportunities' | null>(null)

  const [noteText, setNoteText] = useState('')
  const [submittingNote, setSubmittingNote] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    try {
      const [projects, allContacts, allOpps, allInteractions, allPods] = await Promise.all([
        getProjects(),
        getContacts(),
        getOpportunities(),
        getAllInteractions(),
        getPods(),
      ])
      setPods(allPods)
      const p = projects.find(pr => pr.id === id)
      if (!p) { setError(true); setLoading(false); return }
      setProject(p)
      setContacts(allContacts.filter(c => p.relationship_ids.includes(c.id)))
      setOpportunities(allOpps.filter(o => p.opportunity_ids.includes(o.id)))
      setNotes(
        allInteractions
          .filter(ix => {
            if (ix.type !== 'project_event') return false
            try {
              const d = JSON.parse(ix.event_detail ?? '{}')
              return d.project_id === id && d.action === 'project_note'
            } catch { return false }
          })
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      )
      setLoading(false)
    } catch {
      setError(true)
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleRemoveContact(contactId: string) {
    if (!project) return
    await removeRecordFromProject(project.id, contactId)
    invalidateProjectsCache()
    setContacts(prev => prev.filter(c => c.id !== contactId))
    setProject(prev => prev ? { ...prev, relationship_ids: prev.relationship_ids.filter(rid => rid !== contactId) } : prev)
  }

  async function handleRemoveOpportunity(oppId: string) {
    if (!project) return
    await removeOpportunityFromProject(project.id, oppId)
    invalidateProjectsCache()
    setOpportunities(prev => prev.filter(o => o.id !== oppId))
    setProject(prev => prev ? { ...prev, opportunity_ids: prev.opportunity_ids.filter(oid => oid !== oppId) } : prev)
  }

  async function handleAddNote() {
    if (!project || !noteText.trim()) return
    setSubmittingNote(true)
    try {
      await addProjectNote(project.id, noteText.trim())
      setNoteText('')
      await load()
    } finally {
      setSubmittingNote(false)
    }
  }

  async function saveNameEdit() {
    if (!project || !editName.trim()) { setEditingName(false); return }
    const trimmed = editName.trim()
    if (trimmed === project.name) { setEditingName(false); return }
    const updated = await updateProject(project.id, { name: trimmed })
    invalidateProjectsCache()
    setProject(updated)
    setEditingName(false)
  }

  async function saveDescEdit() {
    if (!project) { setEditingDesc(false); return }
    const trimmed = editDesc.trim()
    if (trimmed === (project.description ?? '')) { setEditingDesc(false); return }
    const updated = await updateProject(project.id, { description: trimmed || null })
    invalidateProjectsCache()
    setProject(updated)
    setEditingDesc(false)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 300 }}>
        <Spinner />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 300 }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Project not found.</p>
      </div>
    )
  }

  return (
    <>
      <div style={{ padding: '32px 32px 96px', maxWidth: 800, margin: '0 auto' }}>
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate('/projects')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--color-text-secondary)',
            padding: 0, marginBottom: 20, fontFamily: 'inherit',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Projects
        </button>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <p style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-text-tertiary)',
            marginBottom: 6,
          }}>
            Project
          </p>

          {editingName ? (
            <NameInput
              value={editName}
              onChange={setEditName}
              onBlur={saveNameEdit}
              onEnter={saveNameEdit}
            />
          ) : (
            <h1
              onClick={() => { setEditName(project.name); setEditingName(true) }}
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 24,
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.02em',
                margin: '0 0 8px',
                cursor: 'text',
              }}
            >
              {project.name}
            </h1>
          )}

          {editingDesc ? (
            <DescInput
              value={editDesc}
              onChange={setEditDesc}
              onBlur={saveDescEdit}
            />
          ) : (
            <p
              onClick={() => { setEditDesc(project.description ?? ''); setEditingDesc(true) }}
              style={{
                fontSize: 14,
                color: project.description ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
                margin: 0,
                cursor: 'text',
                minHeight: 20,
              }}
            >
              {project.description || 'Add description…'}
            </p>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--edge)', marginBottom: 24 }}>
          {(['people', 'opportunities', 'notes'] as Tab[]).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 16px',
                fontSize: 13,
                fontFamily: 'inherit',
                fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                borderBottom: activeTab === tab ? '2px solid var(--color-text-primary)' : '2px solid transparent',
                marginBottom: -1,
                textTransform: 'capitalize',
                transition: 'color 0.15s',
              }}
            >
              {tab}
              <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                {tab === 'people' ? contacts.length : tab === 'opportunities' ? opportunities.length : notes.length}
              </span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'people' && (
          <ContactsTab
            contacts={contacts}
            onRemove={handleRemoveContact}
            onSelect={c => setSelectedContact(c)}
            onAdd={() => setAddMode('contacts')}
          />
        )}

        {activeTab === 'opportunities' && (
          <OpportunitiesTab
            opportunities={opportunities}
            onRemove={handleRemoveOpportunity}
            onAdd={() => setAddMode('opportunities')}
            navigate={navigate}
          />
        )}

        {activeTab === 'notes' && (
          <NotesTab
            notes={notes}
            noteText={noteText}
            onNoteChange={setNoteText}
            onSubmit={handleAddNote}
            submitting={submittingNote}
          />
        )}
      </div>

      {/* Contact slide-out overlay — preserves project context per NAV-03/NAV-04 */}
      {selectedContact && (
        <ContactDetail
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onSaved={updated => {
            setContacts(prev => prev.map(c => c.id === updated.id ? updated : c))
            setSelectedContact(null)
          }}
          pods={pods}
        />
      )}

      {addMode && (
        <AddToProjectModal
          open={true}
          onClose={() => setAddMode(null)}
          projectId={project.id}
          mode={addMode}
          existingIds={addMode === 'contacts' ? project.relationship_ids : project.opportunity_ids}
          onAdded={async () => {
            setAddMode(null)
            invalidateProjectsCache()
            await load()
          }}
        />
      )}
    </>
  )
}

function NameInput({ value, onChange, onBlur, onEnter }: {
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  onEnter: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])
  return (
    <input
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={e => { if (e.key === 'Enter') onEnter(); if (e.key === 'Escape') onBlur() }}
      style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 24,
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        letterSpacing: '-0.02em',
        border: 'none',
        borderBottom: '2px solid var(--color-brand)',
        background: 'transparent',
        outline: 'none',
        padding: '0 0 2px',
        margin: '0 0 8px',
        width: '100%',
      }}
    />
  )
}

function DescInput({ value, onChange, onBlur }: {
  value: string
  onChange: (v: string) => void
  onBlur: () => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      rows={2}
      style={{
        fontSize: 14,
        color: 'var(--color-text-secondary)',
        border: 'none',
        borderBottom: '1px solid var(--color-brand)',
        background: 'transparent',
        outline: 'none',
        padding: '0 0 4px',
        width: '100%',
        resize: 'none',
        fontFamily: 'inherit',
      }}
    />
  )
}

function ContactsTab({ contacts, onRemove, onSelect, onAdd }: {
  contacts: Contact[]
  onRemove: (id: string) => void
  onSelect: (c: Contact) => void
  onAdd: () => void
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          type="button"
          onClick={onAdd}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: '1px solid var(--edge)',
            borderRadius: 8, padding: '6px 12px',
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            color: 'var(--color-text-secondary)', fontFamily: 'inherit',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add people
        </button>
      </div>
      {contacts.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', padding: '32px 0' }}>No people attached yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {contacts.map(contact => (
            <div
              key={contact.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10,
                background: 'var(--nav-bg)',
                border: '1px solid var(--edge)',
              }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelect(contact)}
                onKeyDown={e => e.key === 'Enter' && onSelect(contact)}
                style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{contact.name}</div>
                {(contact.company || contact.role) && (
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 1 }}>
                    {[contact.role, contact.company].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemove(contact.id)}
                aria-label={`Remove ${contact.name}`}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-tertiary)', padding: 4, borderRadius: 4,
                  display: 'flex', alignItems: 'center',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function OpportunitiesTab({ opportunities, onRemove, onAdd, navigate }: {
  opportunities: Opportunity[]
  onRemove: (id: string) => void
  onAdd: () => void
  navigate: ReturnType<typeof useNavigate>
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          type="button"
          onClick={onAdd}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: '1px solid var(--edge)',
            borderRadius: 8, padding: '6px 12px',
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            color: 'var(--color-text-secondary)', fontFamily: 'inherit',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add opportunities
        </button>
      </div>
      {opportunities.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', padding: '32px 0' }}>No opportunities attached yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {opportunities.map(opp => (
            <div
              key={opp.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10,
                background: 'var(--nav-bg)',
                border: '1px solid var(--edge)',
              }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/pipelines?opportunity=${opp.id}`)}
                onKeyDown={e => e.key === 'Enter' && navigate(`/pipelines?opportunity=${opp.id}`)}
                style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{opp.name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                  {opp.status}{opp.priority ? ` · ${opp.priority}` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(opp.id)}
                aria-label={`Remove ${opp.name}`}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-tertiary)', padding: 4, borderRadius: 4,
                  display: 'flex', alignItems: 'center',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NotesTab({ notes, noteText, onNoteChange, onSubmit, submitting }: {
  notes: Interaction[]
  noteText: string
  onNoteChange: (v: string) => void
  onSubmit: () => void
  submitting: boolean
}) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          type="text"
          value={noteText}
          onChange={e => onNoteChange(e.target.value)}
          placeholder="Add a note…"
          onKeyDown={e => { if (e.key === 'Enter') onSubmit() }}
          style={{
            flex: 1, height: 36, padding: '0 12px',
            borderRadius: 8, border: '1px solid var(--edge)',
            background: 'var(--color-bg)', fontSize: 13,
            color: 'var(--color-text-primary)', outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={!noteText.trim() || submitting}
          style={{
            padding: '0 16px', height: 36, borderRadius: 8, border: 'none',
            background: noteText.trim() ? 'var(--color-brand)' : 'var(--tint)',
            color: noteText.trim() ? '#fff' : 'var(--color-text-tertiary)',
            fontSize: 13, fontWeight: 600,
            cursor: noteText.trim() && !submitting ? 'pointer' : 'default',
            fontFamily: 'inherit',
          }}
        >
          Add
        </button>
      </div>

      {notes.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', padding: '32px 0' }}>No notes yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notes.map(note => (
            <div
              key={note.id}
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: 'var(--nav-bg)',
                border: '1px solid var(--edge)',
              }}
            >
              <p style={{ fontSize: 13, color: 'var(--color-text-primary)', margin: '0 0 6px', lineHeight: 1.5 }}>
                {note.notes}
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: 0 }}>
                {formatRelativeTime(note.date)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
