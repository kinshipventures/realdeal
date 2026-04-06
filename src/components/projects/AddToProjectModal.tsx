import { useCallback, useEffect, useState } from 'react'
import { getContacts, getOpportunities, addRecordToProject, addOpportunityToProject } from '../../lib/airtable'
import type { Contact, Opportunity } from '../../lib/types'
import { useEscape } from '../../lib/escapeStack'

interface Props {
  open: boolean
  onClose: () => void
  projectId: string
  mode: 'contacts' | 'opportunities'
  existingIds: string[]
  onAdded: () => void
}

export function AddToProjectModal({ open, onClose, projectId, mode, existingIds, onAdded }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelected(new Set())
    if (mode === 'contacts') {
      getContacts().then(all => setContacts(all.filter(c => !existingIds.includes(c.id))))
    } else {
      getOpportunities().then(all => setOpportunities(all.filter(o => !existingIds.includes(o.id))))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode])

  const handleClose = useCallback(() => onClose(), [onClose])
  useEscape(handleClose)

  if (!open) return null

  const q = query.toLowerCase()

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(q) ||
    (c.company ?? '').toLowerCase().includes(q) ||
    (c.email ?? '').toLowerCase().includes(q)
  )

  const filteredOpportunities = opportunities.filter(o =>
    o.name.toLowerCase().includes(q)
  )

  function toggleId(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleAdd() {
    if (selected.size === 0) return
    setSubmitting(true)
    try {
      const ids = Array.from(selected)
      if (mode === 'contacts') {
        for (const id of ids) await addRecordToProject(projectId, id)
      } else {
        for (const id of ids) await addOpportunityToProject(projectId, id)
      }
      onAdded()
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const items = mode === 'contacts' ? filteredContacts : filteredOpportunities

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--overlay-dim)',
        zIndex: 150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: 440,
          maxHeight: '70vh',
          borderRadius: 16,
          background: 'var(--surface-panel)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Add {mode === 'contacts' ? 'People' : 'Opportunities'}
        </h3>

        <input
          type="text"
          autoFocus
          placeholder={mode === 'contacts' ? 'Search by name, company, or email…' : 'Search by name…'}
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%',
            height: 36,
            padding: '0 12px',
            borderRadius: 8,
            border: '1px solid var(--edge)',
            background: 'var(--color-bg)',
            fontSize: 13,
            color: 'var(--color-text-primary)',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />

        {/* Results list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, minHeight: 120, maxHeight: 320 }}>
          {items.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', padding: '24px 0' }}>
              {query ? 'No results' : (mode === 'contacts' ? 'All people already added' : 'All opportunities already added')}
            </p>
          ) : items.map(item => {
            const isContact = mode === 'contacts'
            const contact = isContact ? (item as Contact) : null
            const opp = !isContact ? (item as Opportunity) : null
            const isChecked = selected.has(item.id)
            return (
              <label
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: isChecked ? 'rgba(37,180,57,0.06)' : 'transparent',
                  transition: 'background 0.1s',
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleId(item.id)}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--color-brand)', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {contact ? contact.name : opp?.name}
                  </div>
                  {contact && (contact.company || contact.email) && (
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 1 }}>
                      {contact.company || contact.email}
                    </div>
                  )}
                </div>
              </label>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            {selected.size > 0 ? `${selected.size} selected` : ''}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                border: '1px solid var(--edge)',
                background: 'transparent',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selected.size === 0 || submitting}
              onClick={handleAdd}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                border: 'none',
                background: selected.size > 0 ? 'var(--color-brand)' : 'var(--tint)',
                fontSize: 13,
                fontWeight: 600,
                color: selected.size > 0 ? '#fff' : 'var(--color-text-tertiary)',
                cursor: selected.size > 0 && !submitting ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
              }}
            >
              {submitting ? 'Adding…' : `Add Selected`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
