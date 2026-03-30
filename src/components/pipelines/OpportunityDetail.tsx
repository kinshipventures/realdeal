import { useState, useCallback, useEffect } from 'react'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router'
import type { Contact, Interaction, Opportunity, OpportunityPriority, OpportunityStatus, Pipeline, PipelineStage } from '../../lib/types'
import { createInteraction, getInteractions, updateOpportunity } from '../../lib/airtable'
import { useEscape } from '../../lib/escapeStack'
import { Avatar } from '../ui'

interface Props {
  opportunity: Opportunity
  pipeline: Pipeline
  stages: PipelineStage[]
  contacts: Contact[]
  onClose: () => void
  onUpdate: (id: string, data: Partial<Opportunity>) => void
}

const PRIORITY_STYLES: Record<OpportunityPriority, { bg: string; color: string; label: string }> = {
  high:   { bg: 'hsla(0, 70%, 50%, 0.15)',   color: 'hsla(0, 70%, 45%, 1)',   label: 'High' },
  medium: { bg: 'hsla(40, 80%, 50%, 0.15)',  color: 'hsla(40, 80%, 40%, 1)',  label: 'Medium' },
  low:    { bg: 'hsla(210, 60%, 50%, 0.12)', color: 'hsla(210, 60%, 45%, 1)', label: 'Low' },
}

const PRIORITY_CYCLE: Record<OpportunityPriority, OpportunityPriority> = {
  low: 'medium',
  medium: 'high',
  high: 'low',
}

const STATUS_OPTIONS: OpportunityStatus[] = ['open', 'won', 'lost', 'archived']

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  fontFamily: 'var(--font-serif)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--color-text-tertiary)',
  marginBottom: 8,
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function OpportunityDetail({ opportunity, pipeline, stages, contacts, onClose, onUpdate }: Props) {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const [notes, setNotes] = useState(opportunity.notes ?? '')
  const [history, setHistory] = useState<Interaction[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  // Mount animation
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  // Load pipeline event history for linked contacts
  useEffect(() => {
    if (opportunity.relationship_ids.length === 0) {
      setHistoryLoading(false)
      return
    }
    Promise.all(opportunity.relationship_ids.map(id => getInteractions(id)))
      .then(allInteractions => {
        const events = allInteractions
          .flat()
          .filter(i => {
            if (i.type !== 'pipeline_event') return false
            if (!i.event_detail) return false
            try {
              const d = JSON.parse(i.event_detail)
              return d.pipeline === pipeline.name
            } catch {
              return false
            }
          })
          .sort((a, b) => b.date.localeCompare(a.date))
        setHistory(events)
      })
      .finally(() => setHistoryLoading(false))
  }, [opportunity.relationship_ids, pipeline.name])

  const handleClose = useCallback(() => onClose(), [onClose])
  useEscape(handleClose)

  const currentStage = stages.find(s => s.id === opportunity.stage_id)
  const linkedContacts = contacts.filter(c => opportunity.relationship_ids.includes(c.id))

  function writePipelineEvent(eventDetail: Record<string, unknown>) {
    opportunity.relationship_ids.forEach(relId => {
      createInteraction({
        contact_id: relId,
        type: 'pipeline_event',
        date: new Date().toISOString().slice(0, 10),
        notes: null,
        summary: null,
        source: null,
        email_link: null,
        granola_link: null,
        event_detail: JSON.stringify(eventDetail),
        actor: 'You',
      }).catch(console.error)
    })
  }

  function handlePriorityClick() {
    const oldPriority = opportunity.priority
    const newPriority = opportunity.priority ? PRIORITY_CYCLE[opportunity.priority] : 'low'
    onUpdate(opportunity.id, { priority: newPriority })
    writePipelineEvent({
      pipeline: pipeline.name,
      field: 'priority',
      old_value: oldPriority ?? null,
      new_value: newPriority,
    })
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as OpportunityStatus
    onUpdate(opportunity.id, { status: newStatus })
    if (newStatus === 'archived') {
      writePipelineEvent({ pipeline: pipeline.name, action: 'archived' })
    }
  }

  function handleNotesSave() {
    const trimmed = notes.trim()
    if (trimmed === (opportunity.notes ?? '').trim()) return
    onUpdate(opportunity.id, { notes: trimmed || null })
    writePipelineEvent({ pipeline: pipeline.name, action: 'note_added' })
  }

  function renderHistoryEntry(interaction: Interaction) {
    try {
      const d = JSON.parse(interaction.event_detail ?? '{}')
      let text = ''
      if (d.from_stage && d.to_stage) {
        text = `${d.from_stage} → ${d.to_stage}`
      } else if (d.action === 'note_added') {
        text = 'Note added'
      } else if (d.action === 'archived') {
        text = 'Archived'
      } else if (d.field === 'priority') {
        text = `Priority: ${d.old_value ?? 'none'} → ${d.new_value}`
      } else {
        text = interaction.event_detail ?? ''
      }
      return (
        <div key={interaction.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingBottom: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-text-tertiary)', marginTop: 5, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, color: 'var(--color-text-primary)', margin: 0 }}>{text}</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
              {formatDate(interaction.date)}
            </p>
          </div>
        </div>
      )
    } catch {
      return null
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.08)',
          zIndex: 199,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          height: '100vh',
          width: 480,
          zIndex: 200,
          background: 'var(--surface-panel)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderLeft: '1px solid var(--edge)',
          overflowY: 'auto',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 350ms cubic-bezier(0.87, 0, 0.13, 1)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--divider)', position: 'sticky', top: 0, background: 'var(--surface-panel)', backdropFilter: 'blur(32px)', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{
                fontSize: 18,
                fontWeight: 600,
                fontFamily: 'var(--font-serif)',
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.02em',
                margin: 0,
                lineHeight: 1.2,
              }}>
                {opportunity.name}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
                {pipeline.name}{currentStage ? ` / ${currentStage.name}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close opportunity detail"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--tint)',
                border: '1px solid var(--edge)',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* LINKED RECORDS */}
          <section>
            <p style={sectionLabel}>Linked Records</p>
            {linkedContacts.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>No linked contacts</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {linkedContacts.map(contact => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => navigate(`/record/${contact.id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '6px 8px',
                      borderRadius: 8,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <Avatar name={contact.name} size={28} variant="subtle" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-primary)', margin: 0 }}>
                        {contact.name}
                      </p>
                      {contact.role && (
                        <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: 0 }}>
                          {contact.role}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* PRIORITY & STATUS */}
          <section>
            <p style={sectionLabel}>Priority & Status</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={handlePriorityClick}
                style={{
                  padding: '4px 10px',
                  borderRadius: 20,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 400,
                  background: opportunity.priority ? PRIORITY_STYLES[opportunity.priority].bg : 'rgba(0,0,0,0.06)',
                  color: opportunity.priority ? PRIORITY_STYLES[opportunity.priority].color : 'var(--color-text-secondary)',
                }}
              >
                {opportunity.priority ? PRIORITY_STYLES[opportunity.priority].label : 'No priority'}
              </button>
              <select
                value={opportunity.status}
                onChange={handleStatusChange}
                style={{
                  fontSize: 13,
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--edge)',
                  background: 'var(--surface-panel)',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </section>

          {/* NOTES */}
          <section>
            <p style={sectionLabel}>Notes</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={handleNotesSave}
              placeholder="Add notes..."
              style={{
                width: '100%',
                minHeight: 80,
                fontSize: 13,
                fontWeight: 400,
                fontFamily: 'inherit',
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--edge)',
                background: 'var(--tint)',
                color: 'var(--color-text-primary)',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                lineHeight: 1.5,
              }}
            />
          </section>

          {/* STAGE HISTORY */}
          <section>
            <p style={sectionLabel}>Stage History</p>
            {historyLoading ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>Loading...</p>
            ) : history.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>No pipeline events yet</p>
            ) : (
              <div style={{ borderLeft: '1px solid var(--divider)', paddingLeft: 12 }}>
                {history.map(i => renderHistoryEntry(i))}
              </div>
            )}
          </section>

        </div>
      </div>
    </>
  )
}
