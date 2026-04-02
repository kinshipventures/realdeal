import { useState, useEffect, useMemo } from 'react'
import { EmptyState } from '../empty/EmptyState'
import type { Contact, Interaction, InteractionType, ISODate, SystemEventType } from '../../lib/types'
import { SYSTEM_TYPES } from '../../lib/types'
import {
  getInteractions,
  logInteraction,
  updateInteraction,
  deleteInteraction,
  updateContact,
} from '../../lib/airtable'
import { formatRelativeTime } from '../../lib/utils'

interface InteractionSectionProps {
  contact: Contact
  onContactUpdated: (contact: Contact) => void  // fires after any mutation that changes the contact
  activeFilters?: Set<InteractionType>           // which human types to show (undefined = show all)
  showSystemEvents?: boolean                     // system events toggle
}

const TYPES: InteractionType[] = ['call', 'email', 'text', 'meeting', 'intro', 'note']
const TYPE_LABELS: Record<InteractionType, string> = {
  call: 'Call', email: 'Email', text: 'Text', meeting: 'Meeting', intro: 'Intro', note: 'Note',
  pod_change: 'Pod change', field_update: 'Field update', categorization: 'Categorized', pipeline_event: 'Pipeline', project_event: 'Project', merge_event: 'Merge',
}

const TYPE_COLORS: Record<InteractionType, string> = {
  call: '#2E7D32',
  email: '#1565C0',
  text: '#7B1FA2',
  meeting: '#E65100',
  note: 'var(--color-text-secondary)',
  intro: '#C2185B',
  pod_change: 'var(--text-muted)',
  field_update: 'var(--text-muted)',
  categorization: 'var(--text-muted)',
  pipeline_event: 'var(--text-muted)',
  project_event: 'var(--text-muted)',
  merge_event: 'var(--text-muted)',
}

function typePill(type: InteractionType): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: 100,
    background: `${TYPE_COLORS[type]}12`,
    color: TYPE_COLORS[type],
  }
}

// Summary bar icons — module-level to avoid re-creating on every render
const svgProps = { viewBox: '0 0 16 16', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const }
export const TYPE_ICONS: Record<string, React.ReactElement> = {
  call: <svg {...svgProps}><path d="M6 3H4a1 1 0 0 0-1 1c0 5 4 9 9 9a1 1 0 0 0 1-1v-2l-3-1-1.5 1.5A7 7 0 0 1 5.5 6.5L7 5 6 3z" /></svg>,
  email: <svg {...svgProps}><rect x="2" y="3.5" width="12" height="9" rx="1" /><path d="M2 4.5l6 4 6-4" /></svg>,
  text: <svg {...svgProps}><path d="M3 3h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H6l-3 2.5V11H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M5 6.5h6M5 8.5h4" /></svg>,
  meeting: <svg {...svgProps}><circle cx="8" cy="5" r="2.5" /><path d="M3 13c0-2.8 2.2-5 5-5s5 2.2 5 5" /></svg>,
}

// Shared timeline styles — module-level to avoid re-creating across rows
const rowStyle: React.CSSProperties = { padding: '8px 0', borderBottom: '1px solid var(--divider)' }
const timestampStyle: React.CSSProperties = { fontSize: 10, color: 'var(--color-text-tertiary)', letterSpacing: '0.02em' }

function latestContactDate(interactions: Interaction[]): ISODate | null {
  const dates = interactions
    .filter(i => i.type !== 'note')
    .map(i => i.date)
  if (!dates.length) return null
  return dates.reduce((a, b) => a > b ? a : b)
}

type EditingInteraction = {
  id: string
  type: InteractionType
  date: ISODate
  notes: string | null
} | null

export function InteractionSection({ contact, onContactUpdated, activeFilters, showSystemEvents = false }: InteractionSectionProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [interactionsError, setInteractionsError] = useState(false)
  const [showLogForm, setShowLogForm] = useState(false)
  const [logType, setLogType] = useState<InteractionType>('call')
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10))
  const [logNotes, setLogNotes] = useState('')
  const [opState, setOpState] = useState<'idle' | 'logging' | 'deleting' | 'updating'>('idle')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingInteraction, setEditingInteraction] = useState<EditingInteraction>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!contact?.id) return
    let canceled = false
    setInteractionsError(false)
    getInteractions(contact.id)
      .then(data => { if (!canceled) setInteractions(data) })
      .catch(() => { if (!canceled) setInteractionsError(true) })
    return () => { canceled = true }
  }, [contact.id])  // depend on primitive, not object reference

  // Summary bar — memoized per-type recency for primary channels
  const typeRecency = useMemo(() => {
    const recency: Record<string, string | null> = { call: null, email: null, text: null, meeting: null }
    const found = new Set<string>()
    for (const i of interactions) {
      if (i.type in recency && !found.has(i.type)) {
        recency[i.type] = i.date
        found.add(i.type)
        if (found.size === 4) break
      }
    }
    return recency
  }, [interactions])

  // Filtered view — apply activeFilters and showSystemEvents
  const filtered = useMemo(() => {
    return interactions.filter(i => {
      const isSystem = SYSTEM_TYPES.includes(i.type as SystemEventType)
      if (isSystem) return showSystemEvents
      if (activeFilters && !activeFilters.has(i.type)) return false
      return true
    })
  }, [interactions, activeFilters, showSystemEvents])

  async function handleLog() {
    if (opState !== 'idle') return
    setOpState('logging')
    setActionError(null)
    try {
      const interaction = await logInteraction(contact.id, {
        type: logType,
        date: logDate,
        notes: logNotes.trim() || null,
        summary: null, source: 'Manual', email_link: null, granola_link: null,
        event_detail: null, actor: null,
      })
      setInteractions(prev => [interaction, ...prev])
      setShowLogForm(false)
      setLogNotes('')
      setLogType('call')
      setLogDate(new Date().toISOString().slice(0, 10))
      if (logType !== 'note') {
        onContactUpdated({ ...contact, last_contacted_at: logDate })
      }
    } catch {
      setActionError('failed to log — try again')
    } finally {
      setOpState('idle')
    }
  }

  async function handleUpdateInteraction(id: string) {
    if (!editingInteraction || opState !== 'idle') return
    setOpState('updating')
    setActionError(null)
    try {
      const updated = await updateInteraction(id, {
        type: editingInteraction.type,
        date: editingInteraction.date,
        notes: editingInteraction.notes,
      })
      const updatedList = interactions.map(i => i.id === id ? updated : i)
      setInteractions(updatedList)
      setEditingInteraction(null)
      const newDate = latestContactDate(updatedList)
      await updateContact(contact.id, { last_contacted_at: newDate })
      onContactUpdated({ ...contact, last_contacted_at: newDate })
    } catch {
      setActionError('failed to update — try again')
    } finally {
      setOpState('idle')
    }
  }

  async function handleDeleteInteraction(id: string) {
    if (opState !== 'idle') return
    setOpState('deleting')
    setDeletingId(id)
    setActionError(null)
    try {
      await deleteInteraction(id)
      const remaining = interactions.filter(i => i.id !== id)
      setInteractions(remaining)
      const newDate = latestContactDate(remaining)
      await updateContact(contact.id, { last_contacted_at: newDate })
      onContactUpdated({ ...contact, last_contacted_at: newDate })
    } catch {
      setActionError('failed to delete — try again')
    } finally {
      setDeletingId(null)
      setOpState('idle')
    }
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    color: 'var(--color-text-tertiary)',
    marginBottom: 14,
    letterSpacing: '0.01em',
  }

  const smallInputStyle: React.CSSProperties = {
    fontSize: 12,
    color: 'var(--color-text-primary)',
    background: 'var(--surface-panel)',
    border: '1px solid var(--edge)',
    borderRadius: 5,
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  }

  return (
    <div>
      {/* Summary bar */}
      <div style={{ padding: '12px 0', borderTop: '1px solid var(--divider)', marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {(['call', 'email', 'text', 'meeting'] as const).map(t => {
            const date = typeRecency[t]
            const never = !date
            return (
              <div key={t} style={{ textAlign: 'center' }}>
                <div style={{ color: never ? 'var(--color-text-tertiary)' : TYPE_COLORS[t], display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  {TYPE_ICONS[t]}
                  <span style={{ fontSize: 10 }}>{TYPE_LABELS[t]}</span>
                </div>
                <div style={{ fontSize: 11, color: never ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)', marginTop: 2 }}>
                  {date ? formatRelativeTime(date) : 'Never'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Interactions header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={sectionLabel}>interactions</div>
        <button
          className="action-ghost"
          onClick={() => setShowLogForm(v => !v)}
          style={{ fontSize: 11, fontWeight: 500, padding: '2px 0', letterSpacing: '0.01em' }}
        >
          {showLogForm ? 'cancel' : '+ log'}
        </button>
      </div>

      {interactionsError && (
        <div style={{ fontSize: 12, color: '#D93025', padding: '4px 0', marginBottom: 12 }}>
          could not load interactions — check connection
        </div>
      )}

      {actionError && (
        <div style={{ fontSize: 11, color: '#D93025', padding: '4px 0', marginBottom: 8 }}>
          {actionError}
        </div>
      )}

      {/* Log form */}
      {showLogForm && (
        <div style={{
          background: 'var(--tint)',
          border: '1px solid var(--edge)',
          borderRadius: 8,
          padding: '12px 14px',
          marginBottom: 16,
        }}>
          {/* Type pills */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
            {TYPES.map(t => (
              <button
                key={t}
                onClick={() => setLogType(t)}
                style={{
                  fontSize: 11, fontWeight: 500,
                  padding: '3px 10px',
                  borderRadius: 100,
                  background: logType === t ? `${TYPE_COLORS[t]}12` : 'var(--tint)',
                  border: '1px solid',
                  borderColor: logType === t ? `${TYPE_COLORS[t]}30` : 'var(--edge)',
                  color: logType === t ? TYPE_COLORS[t] : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.1s',
                }}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          <input
            type="date"
            value={logDate}
            onChange={e => setLogDate(e.target.value)}
            style={{
              width: '100%',
              fontSize: 12,
              padding: '6px 8px',
              background: 'var(--surface-panel)',
              border: '1px solid var(--edge)',
              borderRadius: 6,
              color: 'var(--color-text-primary)',
              marginBottom: 8,
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />

          <textarea
            placeholder="What happened?"
            value={logNotes}
            onChange={e => setLogNotes(e.target.value)}
            rows={2}
            style={{
              width: '100%',
              fontSize: 12,
              padding: '6px 8px',
              background: 'var(--surface-panel)',
              border: '1px solid var(--edge)',
              borderRadius: 6,
              color: 'var(--color-text-primary)',
              marginBottom: 10,
              outline: 'none',
              fontFamily: 'inherit',
              resize: 'none',
              boxSizing: 'border-box',
            }}
          />

          <button
            onClick={handleLog}
            disabled={opState === 'logging'}
            style={{
              fontSize: 12, fontWeight: 500,
              padding: '6px 16px',
              background: 'var(--edge)',
              border: '1px solid var(--edge-strong)',
              borderRadius: 6,
              color: opState === 'logging' ? 'var(--text-muted)' : 'var(--color-text-primary)',
              cursor: opState === 'logging' ? 'default' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {opState === 'logging' ? 'Saving...' : `Log ${TYPE_LABELS[logType]}`}
          </button>
        </div>
      )}

      {/* Interaction list — empty state */}
      {interactions.length === 0 && !showLogForm && !interactionsError && (
        <EmptyState
          icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          heading="No history yet"
          ctaLabel="Log first interaction"
          onCta={() => setShowLogForm(true)}
          ghosts={2}
        />
      )}

      {filtered.map((interaction, i) => {
        const isSystem = SYSTEM_TYPES.includes(interaction.type as SystemEventType)

        // Compact system event line
        if (isSystem) {
          return (
            <div key={interaction.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 0',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--divider)' : 'none',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--color-text-tertiary)', flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', flex: 1 }}>
                {(() => {
                  if (interaction.type === 'project_event' && interaction.event_detail) {
                    try {
                      const detail = JSON.parse(interaction.event_detail) as { project_name?: string; action?: string }
                      if (detail.action === 'added_to_project') return `Added to ${detail.project_name}`
                      if (detail.action === 'removed_from_project') return `Removed from ${detail.project_name}`
                      if (detail.action === 'project_note') return `Project note on ${detail.project_name}${interaction.notes ? `: ${interaction.notes}` : ''}`
                    } catch { /* fall through */ }
                  }
                  return interaction.notes ?? TYPE_LABELS[interaction.type]
                })()}
              </span>
              <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', flexShrink: 0, display: 'flex', gap: 4 }}>
                {interaction.actor && <span>{interaction.actor}</span>}
                <span>{formatRelativeTime(interaction.date)}</span>
              </span>
            </div>
          )
        }

        // Human interaction card
        return (
        <div
          key={interaction.id}
          style={{
            ...rowStyle,
            borderBottom: i < filtered.length - 1 ? rowStyle.borderBottom : 'none',
            opacity: deletingId === interaction.id ? 0.4 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {editingInteraction?.id === interaction.id ? (
            /* Edit mode */
            <div style={{
              background: 'var(--tint)',
              border: '1px solid var(--edge)',
              borderRadius: 8,
              padding: '10px 12px',
            }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                {TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => setEditingInteraction(prev => prev ? { ...prev, type: t } : null)}
                    style={{
                      fontSize: 10, fontWeight: 500,
                      padding: '2px 8px', borderRadius: 100,
                      background: editingInteraction.type === t ? `${TYPE_COLORS[t]}12` : 'var(--tint)',
                      border: '1px solid',
                      borderColor: editingInteraction.type === t ? `${TYPE_COLORS[t]}30` : 'var(--edge)',
                      color: editingInteraction.type === t ? TYPE_COLORS[t] : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
              <input
                type="date"
                value={editingInteraction.date}
                onChange={e => setEditingInteraction(prev => prev ? { ...prev, date: e.target.value } : null)}
                style={{ ...smallInputStyle, width: '100%', padding: '4px 8px', marginBottom: 6 }}
              />
              <textarea
                value={editingInteraction.notes ?? ''}
                onChange={e => setEditingInteraction(prev => prev ? { ...prev, notes: e.target.value || null } : null)}
                rows={2}
                placeholder="Notes"
                style={{ ...smallInputStyle, width: '100%', padding: '4px 8px', marginBottom: 8, resize: 'none' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleUpdateInteraction(interaction.id)}
                  style={{
                    fontSize: 11, fontWeight: 500, padding: '4px 12px',
                    background: 'var(--edge)', border: '1px solid var(--edge-strong)',
                    borderRadius: 5, color: 'var(--color-text-primary)', cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingInteraction(null)}
                  style={{
                    fontSize: 11, color: 'var(--text-muted)',
                    background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  cancel
                </button>
              </div>
            </div>
          ) : (
            /* Read mode */
            <div className="interaction-row" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: (interaction.notes || interaction.summary) ? 4 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={typePill(interaction.type)}>{TYPE_LABELS[interaction.type]}</span>
                  {interaction.source && (
                    <span style={{
                      fontSize: 10, fontWeight: 500,
                      padding: '2px 6px', borderRadius: 4,
                      background: interaction.source === 'Gmail' ? 'hsla(0, 70%, 50%, 0.08)'
                        : interaction.source === 'Granola' ? 'hsla(30, 70%, 50%, 0.08)'
                        : 'var(--tint)',
                      color: interaction.source === 'Gmail' ? 'hsla(0, 70%, 40%, 0.80)'
                        : interaction.source === 'Granola' ? 'hsla(30, 70%, 40%, 0.80)'
                        : 'var(--color-text-tertiary)',
                    }}>
                      {interaction.source}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => setEditingInteraction({
                      id: interaction.id,
                      type: interaction.type,
                      date: interaction.date.slice(0, 10),
                      notes: interaction.notes,
                    })}
                    className="interaction-action"
                    style={{
                      fontSize: 10, color: 'var(--color-text-tertiary)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      opacity: 0, transition: 'opacity 0.15s',
                    }}
                  >
                    edit
                  </button>
                  <button
                    onClick={() => handleDeleteInteraction(interaction.id)}
                    className="interaction-action"
                    style={{
                      fontSize: 10, color: 'var(--color-text-tertiary)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      opacity: 0, transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(180,40,40,0.75)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)' }}
                  >
                    del
                  </button>
                  {interaction.actor && (
                    <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginRight: 4 }}>
                      {interaction.actor}
                    </span>
                  )}
                  <span style={timestampStyle}>{formatRelativeTime(interaction.date)}</span>
                </div>
              </div>
              {interaction.summary && (
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.55, marginTop: 4 }}>
                  {interaction.summary}
                </div>
              )}
              {interaction.notes && interaction.notes !== interaction.summary && (
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.55, marginTop: 2, fontStyle: 'italic' }}>
                  {interaction.notes}
                </div>
              )}
              {(interaction.email_link || interaction.granola_link) && (
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {interaction.email_link && (
                    <a href={interaction.email_link} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 10, color: 'var(--color-text-tertiary)', textDecoration: 'none' }}>
                      view email
                    </a>
                  )}
                  {interaction.granola_link && (
                    <a href={interaction.granola_link} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 10, color: 'var(--color-text-tertiary)', textDecoration: 'none' }}>
                      view notes
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        )
      })}
    </div>
  )
}
