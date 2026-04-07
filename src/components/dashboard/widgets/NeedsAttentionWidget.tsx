import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { Contact } from '../../../lib/types'
import { Avatar } from '../../ui'
import { EmptyState } from '../../empty/EmptyState'
import { WidgetHeading } from './WidgetHeading'

const PANEL: React.CSSProperties = {
  background: 'var(--surface-panel)',
  backdropFilter: 'var(--panel-blur)',
  WebkitBackdropFilter: 'var(--panel-blur)',
  border: 'var(--surface-panel-border)',
  borderRadius: 'var(--panel-radius)',
}

function OverdueRow({ contact, days, podName, onClick }: { contact: Contact; days: number | null; podName: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="interactive-row"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '12px 24px',
        background: 'none', border: 'none',
        borderBottom: '1px solid var(--divider)',
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      <Avatar name={contact.name} size={32} variant="subtle" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
          {contact.name}
        </div>
        {podName && (
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>
            {podName}
          </div>
        )}
      </div>
      <div style={{
        fontSize: 11, fontWeight: 500, flexShrink: 0,
        color: days === null ? 'var(--color-text-tertiary)' : 'hsla(20, 80%, 45%, 0.80)',
        whiteSpace: 'nowrap', letterSpacing: '0.02em',
      }}>
        {days === null ? 'Never reached' : `${days}d ago`}
      </div>
    </button>
  )
}

function FollowUpOverdueRow({ contact, overdueDays, podName, action, onClick }: {
  contact: Contact; overdueDays: number; podName: string; action: string | null; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="interactive-row"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '12px 24px',
        background: 'none', border: 'none',
        borderBottom: '1px solid var(--divider)',
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      {/* Calendar icon */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
          {contact.name}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {podName && (
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>
              {podName}
            </span>
          )}
          {action && (
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              {podName ? `· ${action}` : action}
            </span>
          )}
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 500, flexShrink: 0, color: '#DC2626', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
        {overdueDays}d overdue
      </div>
    </button>
  )
}

function DormantRow({ contact, days, confirming, onKeep, onReachOut, onRemove, onConfirmRemove, onCancelRemove }: {
  contact: Contact; days: number | null; confirming: boolean
  onKeep: () => void; onReachOut: () => void; onRemove: () => void
  onConfirmRemove: () => void; onCancelRemove: () => void
}) {
  const dormancyLabel = (days ?? 0) >= 180 ? 'Slipping away' : (days ?? 0) >= 120 ? 'Going quiet' : 'Cooling off'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 24px',
      borderBottom: '1px solid var(--divider)',
    }}>
      <Avatar name={contact.name} size={28} variant="subtle" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>{contact.name}</div>
        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
          {dormancyLabel} · {days ? `${days}d ago` : 'Never reached'}
        </div>
      </div>
      {confirming ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button type="button" onClick={onCancelRemove} className="action-pill-hig">
            Cancel
          </button>
          <button type="button" onClick={onConfirmRemove} className="action-pill-hig destructive">
            Remove
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { label: 'Keep', action: onKeep },
            { label: 'Reach out', action: onReachOut },
            { label: 'Let go', action: onRemove },
          ].map(({ label, action }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              className={`action-pill-hig${label === 'Let go' ? ' destructive' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface NeedsAttentionWidgetProps {
  overdueContacts: Array<{ contact: Contact; days: number | null; podName: string; overdueDays: number }>
  followUpOverdue: Array<{ contact: Contact; overdueDays: number; podName: string; action: string | null }>
  dormantContacts: Array<{ contact: Contact; days: number | null }>
  contactsLoading: boolean
  error: string | null
  onContactClick: (contact: Contact) => void
  onSnooze: (id: string) => void
  onRemoveContact: (id: string) => Promise<void>
}

export function NeedsAttentionWidget({
  overdueContacts, followUpOverdue, dormantContacts, contactsLoading, error,
  onContactClick, onSnooze, onRemoveContact,
}: NeedsAttentionWidgetProps) {
  const navigate = useNavigate()
  const [dormantExpanded, setDormantExpanded] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <WidgetHeading title="needs attention" tooltip="People you haven't reached out to in a while. A quick check-in goes a long way." />
          {(overdueContacts.length + followUpOverdue.length) > 0 && (
            <span
              aria-live="polite"
              style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '2px 7px', borderRadius: 100,
              background: 'hsla(20, 80%, 45%, 0.10)',
              border: '1px solid hsla(20, 80%, 45%, 0.18)',
              fontSize: 11, fontWeight: 500,
              color: 'hsla(20, 80%, 45%, 0.80)',
              letterSpacing: '0.01em',
            }}>
              {overdueContacts.length + followUpOverdue.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigate('/pulse/nurturing?filter=overdue')}
          className="see-all-link"
        >
          See all
        </button>
      </div>

      <div style={{ ...PANEL, overflow: 'hidden', marginBottom: dormantContacts.length > 0 ? 12 : 0 }}>
        {contactsLoading ? (
          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2].map(i => (
              <div key={i} className="skeleton" style={{ width: '100%', height: 52, borderRadius: 12 }} />
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
            {error}
          </div>
        ) : overdueContacts.length === 0 && followUpOverdue.length === 0 ? (
          <EmptyState
            icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
            heading="All caught up"
            subtext="Nothing needs attention right now"
            orbColor="#25B439"
          />
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {followUpOverdue.map(({ contact, overdueDays, podName, action }) => (
              <FollowUpOverdueRow key={`fu-${contact.id}`} contact={contact} overdueDays={overdueDays} podName={podName} action={action} onClick={() => onContactClick(contact)} />
            ))}
            {overdueContacts.map(({ contact, days, podName }) => (
              <OverdueRow key={contact.id} contact={contact} days={days} podName={podName} onClick={() => onContactClick(contact)} />
            ))}
          </div>
        )}
      </div>

      {dormantContacts.length > 0 && (
        <div style={{ ...PANEL, overflow: 'hidden', opacity: 0.75 }}>
          <button
            type="button"
            onClick={() => setDormantExpanded(v => !v)}
            style={{
              width: '100%', padding: '16px 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
              {dormantContacts.length} {dormantContacts.length === 1 ? 'relationship' : 'relationships'} cooling off
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', transform: dormantExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              &#9662;
            </span>
          </button>
          {dormantExpanded && (
            <div style={{ borderTop: '1px solid var(--divider)', maxHeight: 300, overflowY: 'auto' }}>
              {dormantContacts.map(({ contact, days }) => (
                <DormantRow
                  key={contact.id}
                  contact={contact}
                  days={days}
                  confirming={confirmDeleteId === contact.id}
                  onKeep={() => onSnooze(contact.id)}
                  onReachOut={() => onContactClick(contact)}
                  onRemove={() => setConfirmDeleteId(contact.id)}
                  onConfirmRemove={() => { onRemoveContact(contact.id); setConfirmDeleteId(null) }}
                  onCancelRemove={() => setConfirmDeleteId(null)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
