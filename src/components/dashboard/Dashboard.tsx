import { useEffect, useMemo, useState } from 'react'
import { getContacts, getPods, isOverdue, isInGracePeriod, getAllInteractions, deleteContact } from '../../lib/airtable'
import { daysOverdue } from '../../lib/utils'
import {
  indexByContact,
  podEquityScore,
  overallEquityScore,
  scoreLabel,
  isDormant,
  daysSinceContact,
  todaysFocus,
} from '../../lib/equity'
import type { Contact, Pod, Interaction, Cadence, FocusItem } from '../../lib/types'
import { Spinner, Avatar } from '../ui'
import { ContactDetail } from '../contacts/ContactDetail'

const PANEL: React.CSSProperties = {
  background: 'rgba(245,244,240,0.88)',
  backdropFilter: 'blur(32px)',
  WebkitBackdropFilter: 'blur(32px)',
  border: '1px solid rgba(0,0,0,0.07)',
  borderRadius: 16,
}

const SNOOZE_KEY = 'kinshipbrain:dormant-snooze'

function getSnoozedIds(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? '{}') as Record<string, number>
    const now = Date.now()
    const active = new Set<string>()
    const cleaned: Record<string, number> = {}
    for (const [id, until] of Object.entries(raw)) {
      if (until > now) { active.add(id); cleaned[id] = until }
    }
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(cleaned))
    return active
  } catch { return new Set() }
}

function snoozeContact(id: string) {
  try {
    const raw = JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? '{}')
    raw[id] = Date.now() + 30 * 24 * 60 * 60 * 1000
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(raw))
  } catch { /* silent */ }
}

export function Dashboard() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pods, setPods] = useState<Pod[]>([])
  const [allInteractions, setAllInteractions] = useState<Interaction[]>([])
  const [contactsLoading, setContactsLoading] = useState(true)
  const [podsLoading, setPodsLoading] = useState(true)
  const [interactionsLoading, setInteractionsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [snoozedIds, setSnoozedIds] = useState(() => getSnoozedIds())
  const [dormantExpanded, setDormantExpanded] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Graduated loading — each section loads independently
  useEffect(() => {
    getContacts()
      .then(d => setContacts(d))
      .catch(() => setError('Could not load contacts.'))
      .finally(() => setContactsLoading(false))
    getPods()
      .then(d => setPods(d))
      .finally(() => setPodsLoading(false))
    getAllInteractions()
      .then(d => setAllInteractions(d))
      .finally(() => setInteractionsLoading(false))
  }, [])

  // Pre-index interactions by contact — O(m) single pass
  const byContact = useMemo(() => indexByContact(allInteractions), [allInteractions])

  // Priority pods
  const priorityPods = useMemo(() => pods.filter(p => p.is_priority), [pods])

  // Overall equity score
  const overallScore = useMemo(
    () => overallEquityScore(priorityPods, contacts, byContact),
    [priorityPods, contacts, byContact]
  )

  // Pod stats
  const podStats = useMemo(() => {
    return pods.map(pod => {
      const podContacts = contacts.filter(c => c.list_ids.includes(pod.id))
      const cadence = pod.cadence ?? 'monthly'
      const overdueCount = podContacts.filter(c => isOverdue(c, cadence)).length
      const score = podEquityScore(podContacts, byContact)
      return { pod, contactCount: podContacts.length, overdueCount, score }
    }).sort((a, b) => {
      if (a.pod.is_priority !== b.pod.is_priority) return a.pod.is_priority ? -1 : 1
      return a.pod.name.localeCompare(b.pod.name)
    })
  }, [pods, contacts, byContact])

  // Overdue contacts
  const overdueContacts = useMemo(() => {
    const result: { contact: Contact; days: number | null; podName: string; cadence: Cadence }[] = []
    for (const contact of contacts) {
      if (isInGracePeriod(contact)) continue
      for (const podId of contact.list_ids) {
        const pod = pods.find(p => p.id === podId)
        const cadence = pod?.cadence ?? 'monthly'
        if (isOverdue(contact, cadence)) {
          result.push({ contact, days: daysOverdue(contact), podName: pod?.name ?? '', cadence })
          break
        }
      }
    }
    return result.sort((a, b) => {
      if (a.days === null && b.days === null) return a.contact.name.localeCompare(b.contact.name)
      if (a.days === null) return -1
      if (b.days === null) return 1
      return b.days! - a.days!
    })
  }, [contacts, pods])

  // Today's Focus
  const focusItems = useMemo(
    () => todaysFocus(contacts, byContact, pods),
    [contacts, byContact, pods]
  )

  // Dormant contacts (90+ days, not snoozed)
  const dormantContacts = useMemo(
    () => contacts
      .filter(c => isDormant(c) && !snoozedIds.has(c.id) && !isInGracePeriod(c))
      .map(c => ({ contact: c, days: daysSinceContact(c) }))
      .sort((a, b) => (b.days ?? 999) - (a.days ?? 999)),
    [contacts, snoozedIds]
  )

  // Stats
  const recentlyContacted = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return contacts.filter(c => c.last_contacted_at && new Date(c.last_contacted_at).getTime() > sevenDaysAgo).length
  }, [contacts])

  function handleContactSaved(updated: Contact) {
    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c))
  }

  function handleContactDeleted() {
    if (!selectedContact) return
    setContacts(prev => prev.filter(c => c.id !== selectedContact.id))
    setSelectedContact(null)
  }

  function handleSnooze(id: string) {
    snoozeContact(id)
    setSnoozedIds(prev => new Set([...prev, id]))
  }

  async function handleRemoveContact(id: string) {
    await deleteContact(id)
    setContacts(prev => prev.filter(c => c.id !== id))
    setConfirmDeleteId(null)
  }

  const dataReady = !contactsLoading && !podsLoading

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'auto' }}>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Top row: Score + Stats */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 24, alignItems: 'flex-start' }}>

          {/* Equity score ring */}
          <div style={{ ...PANEL, padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 24, flex: '0 0 auto' }}>
            {interactionsLoading ? (
              <Spinner size={18} padding={20} />
            ) : (
              <>
                <EquityRing score={overallScore} size={80} />
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: 'rgba(0,0,0,0.85)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {overallScore}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 4, letterSpacing: '0.01em' }}>
                    {scoreLabel(overallScore)}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Stats */}
          <div style={{ ...PANEL, padding: '20px 24px', flex: 1 }}>
            {!dataReady ? <Spinner size={18} padding={16} /> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                <StatBlock label="Pods" value={pods.length} />
                <StatBlock label="Contacts" value={contacts.length} />
                <StatBlock label="Reached (7d)" value={recentlyContacted} />
                <StatBlock label="Overdue" value={overdueContacts.length} accent />
              </div>
            )}
          </div>
        </div>

        {/* Pod health cards */}
        {!dataReady ? null : podStats.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
            {podStats.map(({ pod, contactCount, overdueCount, score }) => (
              <PodCard key={pod.id} pod={pod} contactCount={contactCount} overdueCount={overdueCount} score={score} scoreReady={!interactionsLoading} />
            ))}
          </div>
        )}

        {/* Today's Focus */}
        {focusItems.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.25)', letterSpacing: '0.01em', marginBottom: 12, textTransform: 'uppercase', fontWeight: 500 }}>
              today's focus
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {focusItems.map(item => (
                <FocusCard key={item.contact.id} item={item} onClick={() => setSelectedContact(item.contact)} />
              ))}
            </div>
          </div>
        )}

        {/* Overdue queue */}
        <div style={{ ...PANEL, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{
            padding: '20px 24px 14px',
            borderBottom: '1px solid rgba(0,0,0,0.04)',
            display: 'flex', alignItems: 'center',
          }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'rgba(0,0,0,0.85)', letterSpacing: '-0.02em' }}>
              needs attention
            </span>
            {overdueContacts.length > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '2px 7px', borderRadius: 100,
                background: 'hsla(20, 80%, 45%, 0.10)',
                border: '1px solid hsla(20, 80%, 45%, 0.18)',
                fontSize: 11, fontWeight: 500,
                color: 'hsla(20, 80%, 45%, 0.80)',
                letterSpacing: '0.01em', marginLeft: 8,
              }}>
                {overdueContacts.length}
              </span>
            )}
          </div>

          {contactsLoading ? (
            <Spinner />
          ) : error ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'rgba(0,0,0,0.45)', fontSize: 13 }}>
              {error}
            </div>
          ) : overdueContacts.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.38)' }}>All caught up.</span>
            </div>
          ) : (
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {overdueContacts.map(({ contact, days, podName }) => (
                <OverdueRow key={contact.id} contact={contact} days={days} podName={podName} onClick={() => setSelectedContact(contact)} />
              ))}
            </div>
          )}
        </div>

        {/* Dormant cleanup */}
        {dormantContacts.length > 0 && (
          <div style={{ ...PANEL, overflow: 'hidden' }}>
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
              <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(0,0,0,0.65)' }}>
                {dormantContacts.length} contact{dormantContacts.length !== 1 ? 's' : ''} need a decision
              </span>
              <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.28)', transform: dormantExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                ▾
              </span>
            </button>

            {dormantExpanded && (
              <div style={{ borderTop: '1px solid rgba(0,0,0,0.04)', maxHeight: 300, overflowY: 'auto' }}>
                {dormantContacts.map(({ contact, days }) => (
                  <DormantRow
                    key={contact.id}
                    contact={contact}
                    days={days}
                    confirming={confirmDeleteId === contact.id}
                    onKeep={() => handleSnooze(contact.id)}
                    onReachOut={() => setSelectedContact(contact)}
                    onRemove={() => setConfirmDeleteId(contact.id)}
                    onConfirmRemove={() => handleRemoveContact(contact.id)}
                    onCancelRemove={() => setConfirmDeleteId(null)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedContact && (
        <ContactDetail
          contact={selectedContact}
          categoryId={selectedContact.category_ids[0]}
          onClose={() => setSelectedContact(null)}
          onSaved={handleContactSaved}
          onDeleted={handleContactDeleted}
        />
      )}
    </div>
  )
}

// ── Local sub-components ────────────────────────────────────────────────────

function EquityRing({ score, size }: { score: number; size: number }) {
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {/* Ghost track */}
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={strokeWidth} />
      {/* Score arc */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke="url(#equityGradient)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      />
      <defs>
        <linearGradient id="equityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B4A" />
          <stop offset="100%" stopColor="#7B61FF" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function StatBlock({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1,
        color: accent && value > 0 ? 'hsla(20, 80%, 45%, 0.80)' : 'rgba(0,0,0,0.82)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', marginTop: 4, letterSpacing: '0.01em' }}>
        {label}
      </div>
    </div>
  )
}

function PodCard({ pod, contactCount, overdueCount, score, scoreReady }: {
  pod: Pod; contactCount: number; overdueCount: number; score: number; scoreReady: boolean
}) {
  const color = pod.color ?? '#718096'
  const cadence = pod.cadence ?? 'monthly'
  const healthy = overdueCount === 0

  return (
    <div style={{
      ...PANEL,
      padding: '16px 20px',
      minWidth: 160,
      flexShrink: 0,
      borderLeft: `4px solid ${color}`,
      boxShadow: healthy ? `0 0 16px ${color}14` : 'none',
      transition: 'box-shadow 0.3s',
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.82)', marginBottom: 8, letterSpacing: '-0.01em' }}>
        {pod.name}
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
        <span style={{ color: 'rgba(0,0,0,0.45)' }}>{contactCount}</span>
        {overdueCount > 0 && (
          <span style={{ color: 'hsla(20, 80%, 45%, 0.80)' }}>{overdueCount} overdue</span>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.25)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {cadence}
        </span>
        {scoreReady && (
          <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(0,0,0,0.45)' }}>
            {score}
          </span>
        )}
      </div>
    </div>
  )
}

function FocusCard({ item, onClick }: { item: FocusItem; onClick: () => void }) {
  const days = daysSinceContact(item.contact)
  const reason = item.reason === 'overdue'
    ? days === null
      ? `You haven't reached out yet.`
      : `It's been ${days} days. That's not like you.`
    : `Might be a good time to check in.`

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '16px 18px',
        background: 'rgba(255, 245, 235, 0.6)',
        border: '1px solid rgba(0,0,0,0.06)',
        borderTop: '2px solid #FFB547',
        borderRadius: 14,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Avatar name={item.contact.name} size={28} variant="subtle" />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.82)' }}>
          {item.contact.name}
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.50)', lineHeight: 1.5 }}>
        {reason}
      </div>
      {item.pod && (
        <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.28)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {item.pod.name}
        </div>
      )}
    </button>
  )
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
        borderBottom: '1px solid rgba(0,0,0,0.04)',
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      <Avatar name={contact.name} size={32} variant="subtle" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,0.82)', lineHeight: 1.3 }}>
          {contact.name}
        </div>
        {podName && (
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.30)', lineHeight: 1.4 }}>
            {podName}
          </div>
        )}
      </div>
      <div style={{
        fontSize: 11, fontWeight: 500, flexShrink: 0,
        color: days === null ? 'rgba(0,0,0,0.28)' : 'hsla(20, 80%, 45%, 0.80)',
        whiteSpace: 'nowrap', letterSpacing: '0.02em',
      }}>
        {days === null ? 'Never' : `${days}d`}
      </div>
    </button>
  )
}

function DormantRow({ contact, days, confirming, onKeep, onReachOut, onRemove, onConfirmRemove, onCancelRemove }: {
  contact: Contact; days: number | null; confirming: boolean
  onKeep: () => void; onReachOut: () => void; onRemove: () => void
  onConfirmRemove: () => void; onCancelRemove: () => void
}) {
  const dormancyLabel = (days ?? 0) >= 180 ? 'At risk' : (days ?? 0) >= 120 ? 'Going dormant' : 'Cooling off'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 24px',
      borderBottom: '1px solid rgba(0,0,0,0.04)',
    }}>
      <Avatar name={contact.name} size={28} variant="subtle" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(0,0,0,0.72)' }}>{contact.name}</div>
        <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.28)' }}>
          {dormancyLabel} · {days ? `${days}d` : 'Never contacted'}
        </div>
      </div>

      {confirming ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={onConfirmRemove}
            style={{ fontSize: 11, fontWeight: 500, color: 'rgba(180,40,40,0.85)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={onCancelRemove}
            style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            cancel
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { label: 'Keep', action: onKeep },
            { label: 'Reach out', action: onReachOut },
            { label: 'Remove', action: onRemove },
          ].map(({ label, action }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              style={{
                fontSize: 10, fontWeight: 500,
                padding: '3px 10px', borderRadius: 100,
                background: 'rgba(0,0,0,0.04)',
                border: '1px solid rgba(0,0,0,0.07)',
                color: label === 'Remove' ? 'rgba(180,40,40,0.65)' : 'rgba(0,0,0,0.45)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
