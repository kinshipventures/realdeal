import { useState, useCallback } from 'react'
import type { Contact, Interaction, InteractionType } from '../../lib/types'
import { HUMAN_TYPES } from '../../lib/types'
import { InteractionSection } from '../contacts/InteractionSection'

interface RecordTimelineProps {
  contact: Contact
  onContactUpdated: (contact: Contact) => void
  interactions: Interaction[]
  onInteractionsChange: (interactions: Interaction[]) => void
}

export function RecordTimeline({ contact, onContactUpdated, interactions, onInteractionsChange }: RecordTimelineProps) {
  const [activeFilters, setActiveFilters] = useState<Set<InteractionType>>(() => new Set(HUMAN_TYPES))
  const [showSystemEvents, setShowSystemEvents] = useState(false)

  const toggleFilter = useCallback((type: InteractionType) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setActiveFilters(prev =>
      prev.size === HUMAN_TYPES.length ? new Set() : new Set(HUMAN_TYPES)
    )
  }, [])

  const chipStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 11, fontWeight: 500,
    padding: '3px 10px', borderRadius: 100,
    background: active ? 'var(--tint)' : 'transparent',
    border: '1px solid',
    borderColor: active ? 'var(--edge-strong)' : 'var(--edge)',
    color: active ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
    cursor: 'pointer', transition: 'all 0.15s',
    fontFamily: 'inherit',
  })

  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 16,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: 'var(--color-text-primary)',
        marginBottom: 12,
      }}>
        Timeline
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={toggleAll} style={chipStyle(activeFilters.size === HUMAN_TYPES.length)}>
          All
        </button>
        {HUMAN_TYPES.map(t => (
          <button key={t} onClick={() => toggleFilter(t)} style={chipStyle(activeFilters.has(t))}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <span style={{ width: 1, background: 'var(--edge)', margin: '0 4px' }} />
        <button onClick={() => setShowSystemEvents(v => !v)} style={chipStyle(showSystemEvents)}>
          + System events
        </button>
      </div>

      <InteractionSection
        contact={contact}
        onContactUpdated={onContactUpdated}
        activeFilters={activeFilters}
        showSystemEvents={showSystemEvents}
        interactions={interactions}
        onInteractionsChange={onInteractionsChange}
      />
    </div>
  )
}
