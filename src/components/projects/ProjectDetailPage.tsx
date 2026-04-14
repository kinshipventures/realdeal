import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  getProjects,
  getContacts,
  getAllInteractions,
  getPods,
  removeRecordFromProject,
  updateProject,
  invalidateProjectsCache,
  addProjectNote,
} from '../../lib/airtable'
import type { Contact, Interaction, Pod, Project } from '../../lib/types'
import { formatRelativeTime } from '../../lib/utils'
import { Spinner } from '../ui'
import { ContactDetail } from '../contacts/ContactDetail'
import { AddToProjectModal } from './AddToProjectModal'

type Tab = 'people' | 'notes'

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
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
  const [showAddModal, setShowAddModal] = useState(false)

  const [noteText, setNoteText] = useState('')
  const [submittingNote, setSubmittingNote] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    try {
      const [projects, allContacts, allInteractions, allPods] = await Promise.all([
        getProjects(),
        getContacts(),
        getAllInteractions(),
        getPods(),
      ])
      setPods(allPods)
      const p = projects.find(pr => pr.id === id)
      if (!p) { setError(true); setLoading(false); return }
      setProject(p)
      setContacts(allContacts.filter(c => p.relationship_ids.includes(c.id)))
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

  async function handleAddNote() {
    if (!project || !noteText.trim()) return
    setSubmittingNote(true)
    try {
      await addProjectNote(project.id, project.name, noteText.trim())
      setNoteText('')
      invalidateProjectsCache()
      await load()
    } finally {
      setSubmittingNote(false)
    }
  }

  async function saveNameEdit() {
    if (!project || !editName.trim()) { setEditingName(false); return }
    if (editName.trim() !== project.name) {
      await updateProject(project.id, { name: editName.trim() })
      invalidateProjectsCache()
      setProject(prev => prev ? { ...prev, name: editName.trim() } : prev)
    }
    setEditingName(false)
  }

  async function saveDescEdit() {
    if (!project) { setEditingDesc(false); return }
    const val = editDesc.trim() || null
    if (val !== (project.description ?? null)) {
      await updateProject(project.id, { description: val })
      invalidateProjectsCache()
      setProject(prev => prev ? { ...prev, description: val } : prev)
    }
    setEditingDesc(false)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><Spinner /></div>
  if (error || !project) return (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <p style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>Project not found</p>
      <button type="button" onClick={() => navigate('/projects')} style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--color-brand)', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
        Back to Projects
      </button>
    </div>
  )

  return (
    <>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px' }}>
        <button
          type="button"
          onClick={() => navigate('/projects')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, color: 'var(--color-text-secondary)',
            marginBottom: 24, fontFamily: 'inherit', padding: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Projects
        </button>

        <div style={{ marginBottom: 32 }}>
          <p style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 6,
          }}>Project</p>

          {editingName ? (
            <NameInput value={editName} onChange={setEditName} onBlur={saveNameEdit} onEnter={saveNameEdit} />
          ) : (
            <h1
              onClick={() => { setEditName(project.name); setEditingName(true) }}
              style={{
                fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 700,
                color: 'var(--color-text-primary)', letterSpacing: '-0.02em',
                margin: '0 0 8px', cursor: 'text',
              }}
            >{project.name}</h1>
          )}

          {editingDesc ? (
            <DescInput value={editDesc} onChange={setEditDesc} onBlur={saveDescEdit} />
          ) : (
            <p
              onClick={() => { setEditDesc(project.description ?? ''); setEditingDesc(true) }}
              style={{
                fontSize: 14, color: project.description ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
                margin: 0, cursor: 'text', minHeight: 20,
              }}
            >{project.description || 'Add description...'}</p>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--edge)', marginBottom: 24 }}>
          {(['people', 'notes'] as Tab[]).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 16px', fontSize: 13, fontFamily: 'inherit',
                fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                borderBottom: activeTab === tab ? '2px solid var(--color-text-primary)' : '2px solid transparent',
                marginBottom: -1, textTransform: 'capitalize', transition: 'color 0.15s',
              }}
            >
              {tab}
              <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                {tab === 'people' ? contacts.length : notes.length}
              </span>
            </button>
          ))}
        </div>

        {activeTab === 'people' && (
          <ContactsTab
            contacts={contacts}
            onRemove={handleRemoveContact}
            onSelect={c => setSelectedContact(c)}
            onAdd={() => setShowAddModal(true)}
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

      {showAddModal && (
        <AddToProjectModal
          open={true}
          onClose={() => setShowAddModal(false)}
          projectId={project.id}
          existingIds={project.relationship_ids}
          onAdded={async () => {
            setShowAddModal(false)
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
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={e => { if (e.key === 'Enter') onEnter(); if (e.key === 'Escape') onBlur() }}
      style={{
        fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 700,
        color: 'var(--color-text-primary)', letterSpacing: '-0.02em',
        margin: '0 0 8px', background: 'none', border: 'none',
        borderBottom: '2px solid var(--color-brand)', outline: 'none',
        width: '100%', padding: 0,
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
        fontSize: 14, color: 'var(--color-text-secondary)',
        margin: 0, background: 'none', border: 'none',
        borderBottom: '2px solid var(--color-brand)', outline: 'none',
        width: '100%', padding: 0, fontFamily: 'inherit', resize: 'vertical',
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
          type="button" onClick={onAdd}
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
                background: 'var(--nav-bg)', border: '1px solid var(--edge)',
              }}
            >
              <div
                role="button" tabIndex={0}
                onClick={() => onSelect(contact)}
                onKeyDown={e => e.key === 'Enter' && onSelect(contact)}
                style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{contact.name}</div>
                {(contact.company || contact.role) && (
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                    {[contact.role, contact.company].filter(Boolean).join(' at ')}
                  </div>
                )}
              </div>
              <button
                type="button" onClick={() => onRemove(contact.id)}
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
          type="text" value={noteText}
          onChange={e => onNoteChange(e.target.value)}
          placeholder="Add a note..."
          onKeyDown={e => { if (e.key === 'Enter') onSubmit() }}
          style={{
            flex: 1, height: 36, padding: '0 12px',
            borderRadius: 8, border: '1px solid var(--edge)',
            background: 'var(--color-bg)', fontSize: 13,
            color: 'var(--color-text-primary)', outline: 'none', fontFamily: 'inherit',
          }}
        />
        <button
          type="button" onClick={onSubmit}
          disabled={!noteText.trim() || submitting}
          style={{
            padding: '0 16px', height: 36, borderRadius: 8, border: 'none',
            background: noteText.trim() ? 'var(--color-brand)' : 'var(--tint)',
            color: noteText.trim() ? '#fff' : 'var(--color-text-tertiary)',
            fontSize: 13, fontWeight: 600,
            cursor: noteText.trim() && !submitting ? 'pointer' : 'default',
            fontFamily: 'inherit',
          }}
        >Add</button>
      </div>

      {notes.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', padding: '32px 0' }}>No notes yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notes.map(note => (
            <div key={note.id} style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--nav-bg)', border: '1px solid var(--edge)' }}>
              <p style={{ fontSize: 13, color: 'var(--color-text-primary)', margin: '0 0 6px', lineHeight: 1.5 }}>{note.notes}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: 0 }}>{formatRelativeTime(note.date)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
