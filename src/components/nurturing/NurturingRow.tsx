import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Avatar } from '../ui'
import { TYPE_ICONS } from '../contacts/InteractionSection'
import { logInteraction, updateContact } from '../../lib/airtable'
import type { Contact, InteractionType } from '../../lib/types'

interface NurturingRowProps {
  contact: Contact
  signal: string
  signalColor: string
  onSnooze: (id: string) => void
  onInteractionLogged: () => void
  onContactUpdated?: (contact: Contact) => void
}

const LOG_TYPES: InteractionType[] = ['call', 'email', 'text', 'meeting']
const TYPE_LABELS: Record<string, string> = {
  call: 'Call', email: 'Email', text: 'Text', meeting: 'Meeting',
}

const ghostBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 4,
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--color-text-tertiary)',
  flexShrink: 0,
  minWidth: 32,
  minHeight: 32,
}

export function NurturingRow({ contact, signal, signalColor, onSnooze, onInteractionLogged, onContactUpdated }: NurturingRowProps) {
  const navigate = useNavigate()
  const [showLog, setShowLog] = useState(false)
  const [logging, setLogging] = useState(false)
  const [showFollowUp, setShowFollowUp] = useState(false)
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpAction, setFollowUpAction] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleLog(type: InteractionType) {
    if (logging) return
    setLogging(true)
    try {
      await logInteraction(contact.id, {
        type,
        date: new Date().toISOString().slice(0, 10),
        notes: null,
        summary: null,
        source: 'Manual',
        email_link: null,
        granola_link: null,
        event_detail: null,
        actor: null,
      })
      setShowLog(false)
      setShowFollowUp(false)
      onInteractionLogged()
    } catch { /* silent — user can retry */ } finally {
      setLogging(false)
    }
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 20px',
          borderBottom: '1px solid var(--divider)',
          cursor: 'default',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--tint)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        {/* Clickable name + avatar area */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer', minWidth: 0 }}
          onClick={() => navigate(`/contact/${contact.id}`)}
        >
          <Avatar name={contact.name} size={32} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
              {contact.name}
            </div>
            <div style={{ fontSize: 12, color: signalColor, lineHeight: 1.3, marginTop: 1 }}>
              {signal}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          {/* Log interaction toggle */}
          <button
            style={ghostBtnStyle}
            title="Log interaction"
            onClick={e => { e.stopPropagation(); setShowLog(v => !v); setShowFollowUp(false) }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="10" y1="10" x2="14" y2="10"/>
            </svg>
          </button>

          {/* Set follow-up */}
          <button
            style={{ ...ghostBtnStyle, color: showFollowUp ? 'var(--color-brand)' : 'var(--color-text-tertiary)' }}
            title="Set follow-up"
            onClick={e => { e.stopPropagation(); setShowFollowUp(v => !v); setShowLog(false); if (!showFollowUp) { setFollowUpDate(contact.next_follow_up_date ?? ''); setFollowUpAction(contact.next_action ?? '') } }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </button>

          {/* Snooze 30d */}
          <button
            style={ghostBtnStyle}
            title="Snooze 30 days"
            onClick={e => { e.stopPropagation(); onSnooze(contact.id) }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Inline follow-up form */}
      {showFollowUp && (
        <div style={{
          padding: '8px 20px 12px',
          borderBottom: '1px solid var(--divider)',
          background: 'var(--tint)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="date"
              value={followUpDate}
              onChange={e => setFollowUpDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              style={{
                background: 'var(--surface-panel)',
                border: '1px solid var(--edge)',
                borderRadius: 6,
                color: 'var(--color-text-primary)',
                fontSize: 12,
                padding: '4px 8px',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <input
              type="text"
              value={followUpAction}
              onChange={e => setFollowUpAction(e.target.value)}
              placeholder="Next action..."
              style={{
                flex: 1,
                minWidth: 100,
                background: 'var(--surface-panel)',
                border: '1px solid var(--edge)',
                borderRadius: 6,
                color: 'var(--color-text-primary)',
                fontSize: 12,
                padding: '4px 8px',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <button
              disabled={!followUpDate || saving}
              onClick={async () => {
                setSaving(true)
                try {
                  const updated = await updateContact(contact.id, {
                    next_follow_up_date: followUpDate,
                    next_action: followUpAction || null,
                  })
                  onContactUpdated?.(updated)
                  setShowFollowUp(false)
                  setFollowUpDate('')
                  setFollowUpAction('')
                } finally {
                  setSaving(false)
                }
              }}
              style={{
                height: 28,
                padding: '0 12px',
                borderRadius: 100,
                border: '1px solid var(--edge)',
                background: followUpDate && !saving ? 'var(--color-brand)' : 'var(--surface-panel)',
                fontSize: 11,
                fontWeight: 500,
                color: followUpDate && !saving ? '#fff' : 'var(--color-text-tertiary)',
                cursor: !followUpDate || saving ? 'default' : 'pointer',
                fontFamily: 'inherit',
                opacity: saving ? 0.5 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => { setShowFollowUp(false); setFollowUpDate(''); setFollowUpAction('') }}
              style={{
                height: 28,
                padding: '0 10px',
                borderRadius: 100,
                border: '1px solid var(--edge)',
                background: 'var(--surface-panel)',
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Inline type picker */}
      {showLog && (
        <div style={{
          padding: '8px 20px 12px',
          borderBottom: '1px solid var(--divider)',
          background: 'var(--tint)',
        }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {LOG_TYPES.map(type => (
              <button
                key={type}
                disabled={logging}
                onClick={() => handleLog(type)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  height: 28,
                  padding: '0 10px',
                  borderRadius: 100,
                  border: '1px solid var(--edge)',
                  background: 'var(--surface-panel)',
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  cursor: logging ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: logging ? 0.5 : 1,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!logging) (e.currentTarget as HTMLElement).style.background = 'var(--tint)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-panel)' }}
              >
                {TYPE_ICONS[type]}
                {TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
