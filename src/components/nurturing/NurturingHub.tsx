import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { NurturingRow } from './NurturingRow'
import { Avatar } from '../ui'
import { Spinner } from '../ui'
import { getContacts, getPods, getAllInteractions, isOverdue, isInGracePeriod } from '../../lib/airtable'
import { EmptyState } from '../empty/EmptyState'
import { getFieldConfigs } from '../../lib/fieldConfig'
import { isDormant, daysSinceContact, contactCadenceDays, todaysFocus } from '../../lib/equity'
import { getUpcomingBirthdays } from '../../lib/birthdays'
import { getSnoozedIds, snoozeContact } from '../../lib/snooze'
import type { Contact, Pod, Interaction, FocusItem } from '../../lib/types'
import type { FieldConfig } from '../../lib/fieldConfig'

// ── Styles ───────────────────────────────────────────────────────────────────

const PANEL: React.CSSProperties = {
  background: 'rgba(245,244,240,0.88)',
  backdropFilter: 'blur(32px)',
  WebkitBackdropFilter: 'blur(32px)',
  border: '1px solid var(--edge)',
  borderRadius: 12,
  overflow: 'hidden',
}

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 12,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  fontFamily: 'var(--font-serif)',
  color: 'var(--color-text-primary)',
  letterSpacing: '-0.01em',
  margin: 0,
}

const countBadgeBase: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  padding: '1px 7px',
  borderRadius: 100,
  lineHeight: 1.5,
}

function CountBadge({ count, color = 'var(--tint)', textColor = 'var(--color-text-secondary)' }: { count: number; color?: string; textColor?: string }) {
  if (count === 0) return null
  return (
    <span style={{ ...countBadgeBase, background: color, color: textColor }}>
      {count}
    </span>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getOverdueSignal(contact: Contact, pods: Pod[]): string {
  const days = contact.last_contacted_at
    ? Math.floor((Date.now() - new Date(contact.last_contacted_at).getTime()) / 86_400_000)
    : null
  if (days === null) return 'Never contacted — consider reaching out'
  return `Last reached out ${days} days ago`
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NurturingHub() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const filterParam = searchParams.get('filter') // focus | overdue | stale | dates | hygiene

  const [contacts, setContacts] = useState<Contact[]>([])
  const [pods, setPods] = useState<Pod[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([])
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [hygieneExpanded, setHygieneExpanded] = useState(false)
  const [helperDismissed, setHelperDismissed] = useState(() => {
    try { return localStorage.getItem('realdeal:nurturing-helper-dismissed') === '1' } catch { return false }
  })

  // Section refs for auto-scroll
  const focusRef = useRef<HTMLDivElement>(null)
  const needsAttentionRef = useRef<HTMLDivElement>(null)
  const staleRef = useRef<HTMLDivElement>(null)
  const datesRef = useRef<HTMLDivElement>(null)
  const hygieneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let canceled = false
    setLoading(true)
    Promise.all([
      getContacts(),
      getPods(),
      getAllInteractions(),
      getFieldConfigs(),
    ]).then(([c, p, ix]) => {
      if (canceled) return
      setContacts(c)
      setPods(p)
      setInteractions(ix)
      setSnoozedIds(getSnoozedIds())
      setLoading(false)
    }).catch(() => {
      if (!canceled) setLoading(false)
    })
    return () => { canceled = true }
  }, [])

  useEffect(() => {
    if (loading) return
    // Auto-scroll to relevant section based on filter param
    const map: Record<string, React.RefObject<HTMLDivElement | null>> = {
      focus: focusRef,
      overdue: needsAttentionRef,
      stale: staleRef,
      dates: datesRef,
      hygiene: hygieneRef,
    }
    if (filterParam && map[filterParam]?.current) {
      map[filterParam].current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (filterParam === 'hygiene') setHygieneExpanded(true)
    }
  }, [loading, filterParam])

  // Load field configs separately when needed
  useEffect(() => {
    getFieldConfigs().then(setFieldConfigs).catch(() => {})
  }, [])

  // ── Computed data ──────────────────────────────────────────────────────────

  const focusItems = useMemo(() => {
    if (contacts.length === 0 || pods.length === 0) return []
    const byContact = new Map<string, Interaction[]>()
    for (const ix of interactions) {
      const arr = byContact.get(ix.contact_id) ?? []
      arr.push(ix)
      byContact.set(ix.contact_id, arr)
    }
    return todaysFocus(contacts, byContact, pods, 10)
  }, [contacts, pods, interactions])

  const needsAttentionContacts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)

    // Follow-up overdue (stronger signal) — sorted first per D-23
    const followUpOverdueIds = new Set<string>()
    const followUpOverdue: { contact: Contact; days: number | null; isFollowUpOverdue: true }[] = []
    for (const contact of contacts) {
      if (snoozedIds.has(contact.id)) continue
      if (!contact.next_follow_up_date || contact.next_follow_up_date >= today) continue
      followUpOverdueIds.add(contact.id)
      const days = contact.last_contacted_at
        ? Math.floor((Date.now() - new Date(contact.last_contacted_at).getTime()) / 86_400_000)
        : null
      followUpOverdue.push({ contact, days, isFollowUpOverdue: true })
    }
    followUpOverdue.sort((a, b) => {
      const aOver = a.contact.next_follow_up_date ? Math.floor((Date.now() - new Date(a.contact.next_follow_up_date + 'T00:00:00').getTime()) / 86_400_000) : 0
      const bOver = b.contact.next_follow_up_date ? Math.floor((Date.now() - new Date(b.contact.next_follow_up_date + 'T00:00:00').getTime()) / 86_400_000) : 0
      return bOver - aOver
    })

    // Cadence-overdue contacts (skip follow-up overdue already included)
    const cadenceOverdue: { contact: Contact; days: number | null; isFollowUpOverdue?: undefined }[] = []
    for (const contact of contacts) {
      if (isInGracePeriod(contact)) continue
      if (snoozedIds.has(contact.id)) continue
      if (followUpOverdueIds.has(contact.id)) continue  // already in follow-up overdue
      const overdue = contact.list_ids.some(podId => {
        const pod = pods.find(p => p.id === podId)
        return isOverdue(contact, pod?.cadence ?? 'monthly')
      })
      if (!overdue) continue
      const days = contact.last_contacted_at
        ? Math.floor((Date.now() - new Date(contact.last_contacted_at).getTime()) / 86_400_000)
        : null
      cadenceOverdue.push({ contact, days })
    }
    cadenceOverdue.sort((a, b) => (b.days ?? 999) - (a.days ?? 999))

    return [...followUpOverdue, ...cadenceOverdue]
  }, [contacts, pods, snoozedIds])

  const staleContacts = useMemo(() => {
    return contacts
      .filter(c => isDormant(c) && !snoozedIds.has(c.id) && !isInGracePeriod(c))
      .map(c => ({ contact: c, days: daysSinceContact(c) }))
      .sort((a, b) => (b.days ?? 999) - (a.days ?? 999))
  }, [contacts, snoozedIds])

  const upcomingDates = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const windowEnd = new Date(today)
    windowEnd.setDate(windowEnd.getDate() + 14)
    const podMap = new Map(pods.map(p => [p.id, p]))

    const items: Array<{
      type: 'birthday' | 'follow-up'
      contact: Contact
      daysUntil: number
      label: string
    }> = []

    // Birthdays
    for (const b of getUpcomingBirthdays(contacts, pods, 14)) {
      items.push({
        type: 'birthday',
        contact: b.contact,
        daysUntil: b.daysUntil,
        label: b.isToday ? 'Birthday today' : `Birthday in ${b.daysUntil} days`,
      })
    }

    // Follow-ups within 14 days
    for (const c of contacts) {
      if (!c.next_follow_up_date) continue
      const d = new Date(c.next_follow_up_date + 'T00:00:00')
      if (d < today || d > windowEnd) continue
      const daysUntil = Math.round((d.getTime() - today.getTime()) / 86_400_000)
      void podMap
      items.push({
        type: 'follow-up',
        contact: c,
        daysUntil,
        label: daysUntil === 0 ? 'Follow-up today' : `Follow-up in ${daysUntil} days`,
      })
    }

    return items.sort((a, b) => a.daysUntil - b.daysUntil)
  }, [contacts, pods])

  const dataHygieneItems = useMemo(() => {
    // Missing required fields per pod
    const missingFields: { contact: Contact; missingNames: string[] }[] = []
    const requiredConfigs = fieldConfigs.filter(fc => fc.required)

    if (requiredConfigs.length > 0) {
      for (const contact of contacts) {
        const relevant = requiredConfigs.filter(fc =>
          fc.scope_pod_id === null || contact.list_ids.includes(fc.scope_pod_id)
        )
        const missing = relevant.filter(fc => {
          const val = (contact as unknown as Record<string, unknown>)[fc.name] ?? contact.custom_fields?.[fc.name]
          return val === null || val === undefined || val === ''
        })
        if (missing.length > 0) {
          missingFields.push({ contact, missingNames: missing.map(fc => fc.name) })
        }
      }
    }

    // No pod assigned
    const noPod: Contact[] = contacts.filter(c => c.list_ids.length === 0 && c.status !== 'Archived')

    // Pods at capacity
    const podsAtCapacity: { pod: Pod; currentCount: number; capacity: number }[] = []
    for (const pod of pods) {
      if (!pod.capacity) continue
      const count = contacts.filter(c => c.list_ids.includes(pod.id)).length
      if (count >= pod.capacity) {
        podsAtCapacity.push({ pod, currentCount: count, capacity: pod.capacity })
      }
    }

    return { missingFields, noPod, podsAtCapacity }
  }, [contacts, pods, fieldConfigs])

  const hygieneCount = dataHygieneItems.missingFields.length + dataHygieneItems.noPod.length + dataHygieneItems.podsAtCapacity.length

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleSnooze(id: string) {
    snoozeContact(id)
    setSnoozedIds(prev => new Set([...prev, id]))
  }

  function handleInteractionLogged() {
    // Refetch contacts to recompute overdue/stale lists
    getContacts().then(setContacts).catch(() => {})
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 24px' }}>
        <Spinner />
      </div>
    )
  }

  return (
    <div style={{
      maxWidth: 720,
      margin: '0 auto',
      padding: '32px clamp(16px, 4vw, 32px) 96px',
      background: 'var(--color-bg)',
      minHeight: '100vh',
    }}>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'var(--color-text-secondary)' }}>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-text-secondary)', fontFamily: 'inherit', fontSize: 13 }}
        >
          Dashboard
        </button>
        <span style={{ color: 'var(--color-text-tertiary)' }}>›</span>
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>Nurturing</span>
      </nav>

      {/* Title */}
      <h1 style={{
        fontSize: 26,
        fontWeight: 700,
        fontFamily: 'var(--font-serif)',
        color: 'var(--color-text-primary)',
        margin: '0 0 12px',
        letterSpacing: '-0.02em',
      }}>
        nurturing
      </h1>

      {/* Helper text - dismissible */}
      {!helperDismissed && (
        <div style={{
          background: 'var(--tint)',
          border: '1px solid var(--edge)',
          borderRadius: 12,
          padding: '14px 16px',
          marginBottom: 28,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}>
          <span style={{ fontSize: 16, lineHeight: 1, marginTop: 1, flexShrink: 0 }}>&#x2728;</span>
          <div style={{ flex: 1 }}>
            <p style={{
              fontSize: 13,
              lineHeight: 1.5,
              color: 'var(--color-text-secondary)',
              margin: 0,
            }}>
              Your nurturing hub surfaces contacts that need attention based on cadence, recency, and relationship health - so nothing slips through the cracks.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setHelperDismissed(true)
              try { localStorage.setItem('realdeal:nurturing-helper-dismissed', '1') } catch {}
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-tertiary)',
              fontSize: 15,
              lineHeight: 1,
              padding: 2,
              flexShrink: 0,
            }}
            aria-label="Dismiss helper text"
          >
            &#x2715;
          </button>
        </div>
      )}

      {/* Today's Focus Section */}
      {focusItems.length > 0 && (
        <div ref={focusRef} style={{ marginBottom: 28 }}>
          <div style={sectionHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={sectionTitleStyle}>today's focus</h2>
              <CountBadge count={focusItems.length} color="hsla(140, 60%, 45%, 0.12)" textColor="hsla(140, 60%, 35%, 1)" />
            </div>
          </div>
          <div style={PANEL}>
            {focusItems.map(item => {
              const days = item.contact.last_contacted_at
                ? Math.floor((Date.now() - new Date(item.contact.last_contacted_at).getTime()) / 86_400_000)
                : null
              const signal = item.reason === 'overdue'
                ? days === null ? 'Never contacted' : `${days} days since last contact`
                : 'Good time to check in'
              return (
                <NurturingRow
                  key={item.contact.id}
                  contact={item.contact}
                  signal={signal}
                  signalColor="var(--color-brand)"
                  onSnooze={handleSnooze}
                  onInteractionLogged={handleInteractionLogged}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Needs Attention Section */}
      {needsAttentionContacts.length > 0 && (
        <div ref={needsAttentionRef} style={{ marginBottom: 28 }}>
          <div style={sectionHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={sectionTitleStyle}>needs attention</h2>
              <CountBadge count={needsAttentionContacts.length} color="hsla(20, 80%, 45%, 0.12)" textColor="hsla(20, 80%, 35%, 1)" />
            </div>
          </div>
          <div style={PANEL}>
            {needsAttentionContacts.map(({ contact, isFollowUpOverdue }) => {
              const signal = isFollowUpOverdue
                ? (contact.next_action ? `Follow-up overdue: ${contact.next_action}` : 'Follow-up overdue')
                : getOverdueSignal(contact, pods)
              const signalColor = isFollowUpOverdue ? '#DC2626' : 'hsla(20, 80%, 45%, 1)'
              return (
                <NurturingRow
                  key={contact.id}
                  contact={contact}
                  signal={signal}
                  signalColor={signalColor}
                  onSnooze={handleSnooze}
                  onInteractionLogged={handleInteractionLogged}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Stale Section */}
      {staleContacts.length > 0 && (
        <div ref={staleRef} style={{ marginBottom: 28 }}>
          <div style={sectionHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={sectionTitleStyle}>stale</h2>
              <CountBadge count={staleContacts.length} />
            </div>
          </div>
          <div style={PANEL}>
            {staleContacts.map(({ contact, days }) => (
              <NurturingRow
                key={contact.id}
                contact={contact}
                signal={days !== null ? `No contact in ${days} days` : 'No contact on record'}
                signalColor="var(--color-text-secondary)"
                onSnooze={handleSnooze}
                onInteractionLogged={handleInteractionLogged}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Dates Section */}
      {upcomingDates.length > 0 && (
        <div ref={datesRef} style={{ marginBottom: 28 }}>
          <div style={sectionHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={sectionTitleStyle}>upcoming dates this week</h2>
              <CountBadge count={upcomingDates.length} color="rgba(37,180,57,0.12)" textColor="#1a7a28" />
            </div>
          </div>
          <div style={PANEL}>
            {upcomingDates.map(({ contact, label, type }) => (
              <NurturingRow
                key={`${contact.id}-${type}`}
                contact={contact}
                signal={label}
                signalColor={type === 'birthday' ? '#25B439' : 'var(--color-text-secondary)'}
                onSnooze={handleSnooze}
                onInteractionLogged={handleInteractionLogged}
              />
            ))}
          </div>
        </div>
      )}

      {/* Data Hygiene Section — collapsed by default */}
      <div ref={hygieneRef} style={{ marginBottom: 28 }}>
        <div style={sectionHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={sectionTitleStyle}>data hygiene</h2>
            <CountBadge count={hygieneCount} />
          </div>
          <button
            onClick={() => setHygieneExpanded(v => !v)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              color: 'var(--color-text-tertiary)',
              padding: '4px 0',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {hygieneExpanded ? 'collapse' : 'expand'}
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: hygieneExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>

        {hygieneExpanded && (
          <div>
            {/* Missing required fields */}
            {dataHygieneItems.missingFields.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 8, letterSpacing: '0.01em' }}>
                  missing required fields
                </div>
                <div style={PANEL}>
                  {dataHygieneItems.missingFields.map(({ contact, missingNames }) => (
                    <NurturingRow
                      key={contact.id}
                      contact={contact}
                      signal={`Missing: ${missingNames.join(', ')}`}
                      signalColor="var(--color-text-tertiary)"
                      onSnooze={handleSnooze}
                      onInteractionLogged={handleInteractionLogged}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No pod assigned */}
            {dataHygieneItems.noPod.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 8, letterSpacing: '0.01em' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'hsla(30, 90%, 50%, 0.8)', flexShrink: 0, display: 'inline-block' }} />
                  no pod assigned ({dataHygieneItems.noPod.length})
                </div>
                <div style={PANEL}>
                  {dataHygieneItems.noPod.map(contact => (
                    <div
                      key={contact.id}
                      onClick={() => navigate(`/contact/${contact.id}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--divider)',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--tint)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
                    >
                      <Avatar name={contact.name} size={28} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{contact.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Not assigned to any pod</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pods at capacity */}
            {dataHygieneItems.podsAtCapacity.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 8, letterSpacing: '0.01em' }}>
                  pods at capacity
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {dataHygieneItems.podsAtCapacity.map(({ pod, currentCount, capacity }) => (
                    <div
                      key={pod.id}
                      onClick={() => navigate(`/pod/${pod.id}`)}
                      style={{
                        ...PANEL,
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--tint)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: pod.color ?? 'var(--color-text-tertiary)',
                          flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                          {pod.name}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {currentCount}/{capacity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hygieneCount === 0 && (
              <div style={{
                ...PANEL,
                padding: '20px',
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--color-text-tertiary)',
              }}>
                All good — no hygiene issues found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zero-data empty state */}
      {contacts.length === 0 && (
        <EmptyState
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/></svg>}
          heading="No one to nurture yet"
          subtext="Add contacts and log interactions to see who needs attention, upcoming dates, and follow-up reminders."
          ctaLabel="Add contacts"
          onCta={() => navigate('/import')}
          ghosts={3}
        />
      )}

      {/* All caught up state */}
      {contacts.length > 0 && needsAttentionContacts.length === 0 && staleContacts.length === 0 && upcomingDates.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: 'var(--color-text-tertiary)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
            All caught up
          </div>
          <div style={{ fontSize: 13 }}>
            No overdue contacts, nothing stale, no upcoming dates.
          </div>
        </div>
      )}
    </div>
  )
}
