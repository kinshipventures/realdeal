import { useEffect, useMemo, useRef, useState } from 'react'
import { getContacts, getPods, isOverdue, isInGracePeriod, getAllInteractions, deleteContact, getCampaigns, getCampaignContacts, invalidateCampaignsCache, invalidateContactsCache, getPendingContacts } from '../../lib/airtable'
import { daysOverdue, hexToRgba, formatRelativeTime } from '../../lib/utils'
import { POD_SHIFT_COLORS } from '../map/SolidOrb'
import {
  indexByContact,
  podEquityScore,
  overallEquityScore,
  scoreLabel,
  isDormant,
  daysSinceContact,
  todaysFocus,
  contactCadenceDays,
} from '../../lib/equity'
import { getUpcomingBirthdays } from '../../lib/birthdays'

import type { Contact, Pod, Interaction, FocusItem, Campaign, CampaignContact } from '../../lib/types'
import { TYPE_ICONS } from '../contacts/InteractionSection'
import { Avatar } from '../ui'
import { ContactDetail } from '../contacts/ContactDetail'
import { CampaignDetail } from '../campaigns/CampaignDetail'
import { CampaignCreate } from '../campaigns/CampaignCreate'
import { EmptyState } from '../empty/EmptyState'
import { AddContactModal } from '../contacts/AddContactModal'
import { WrappedCard } from './WrappedCard'
import type { WrappedInsight } from './WrappedCard'
import { PendingTrayWidget } from '../categorization/PendingTrayWidget'
import { CategorizationQueue } from '../categorization/CategorizationQueue'

const PANEL: React.CSSProperties = {
  background: 'var(--surface-panel)',
  backdropFilter: 'var(--panel-blur)',
  WebkitBackdropFilter: 'var(--panel-blur)',
  border: 'var(--surface-panel-border)',
  borderRadius: 'var(--panel-radius)',
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
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignContacts, setCampaignContacts] = useState<CampaignContact[]>([])
  const [campaignsLoading, setCampaignsLoading] = useState(true)
  const [showPastCampaigns, setShowPastCampaigns] = useState(false)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [showCampaignCreate, setShowCampaignCreate] = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)
  const [pendingContacts, setPendingContacts] = useState<Contact[]>([])
  const [showQueue, setShowQueue] = useState(false)

  // Graduated loading — each section loads independently
  useEffect(() => {
    getContacts()
      .then(d => setContacts(d))
      .catch(() => setError('Couldn\'t reach Airtable. Try again?'))
      .finally(() => setContactsLoading(false))
    getPods()
      .then(d => setPods(d))
      .finally(() => setPodsLoading(false))
    getAllInteractions()
      .then(d => setAllInteractions(d))
      .finally(() => setInteractionsLoading(false))
    getCampaigns()
      .then(d => {
        setCampaigns(d)
        return Promise.all(d.map(c => getCampaignContacts(c.id)))
      })
      .then(results => setCampaignContacts(results.flat()))
      .finally(() => setCampaignsLoading(false))
    getPendingContacts().then(d => setPendingContacts(d))
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
    const now = Date.now()
    const WINDOW_MS = 30 * 24 * 60 * 60 * 1000
    const BUCKETS = 7
    const BUCKET_MS = WINDOW_MS / BUCKETS

    return pods.map(pod => {
      const podContacts = contacts.filter(c => c.list_ids.includes(pod.id))
      const cadence = pod.cadence ?? 'monthly'
      const overdueCount = podContacts.filter(c => isOverdue(c, cadence)).length
      const score = podEquityScore(podContacts, byContact)

      // Build sparkline: 7 buckets over last 30 days, count interactions per bucket
      const podContactIds = new Set(podContacts.map(c => c.id))
      const buckets = new Array<number>(BUCKETS).fill(0)
      let hasData = false
      for (const c of podContacts) {
        const interactions = byContact.get(c.id) ?? []
        for (const ix of interactions) {
          if (!podContactIds.has(ix.contact_id)) continue
          const age = now - new Date(ix.date).getTime()
          if (age < 0 || age >= WINDOW_MS) continue
          const bucketIdx = Math.floor(age / BUCKET_MS)
          const idx = BUCKETS - 1 - Math.min(bucketIdx, BUCKETS - 1)
          buckets[idx]++
          hasData = true
        }
      }
      const sparkline = hasData ? buckets : null

      return { pod, contactCount: podContacts.length, overdueCount, score, sparkline }
    }).sort((a, b) => {
      if (a.pod.is_priority !== b.pod.is_priority) return a.pod.is_priority ? -1 : 1
      return a.pod.name.localeCompare(b.pod.name)
    })
  }, [pods, contacts, byContact])

  // Wrapped insights — weekly stats for the insight card
  const wrappedInsights = useMemo((): WrappedInsight[] => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    const recentInteractions = allInteractions.filter(ix => new Date(ix.date).getTime() >= sevenDaysAgo)
    const recentContactIds = new Set(recentInteractions.map(ix => ix.contact_id))
    const peopleReached = recentContactIds.size

    const podScores = pods.map(p => ({
      pod: p,
      score: podEquityScore(contacts.filter(c => c.list_ids.includes(p.id)), byContact),
    }))
    const topPodEntry = podScores.sort((a, b) => b.score - a.score)[0] ?? null

    const countByContact = new Map<string, number>()
    for (const ix of recentInteractions) {
      countByContact.set(ix.contact_id, (countByContact.get(ix.contact_id) ?? 0) + 1)
    }
    let topContactId: string | null = null
    let topCount = 0
    for (const [id, count] of countByContact) {
      if (count > topCount) { topCount = count; topContactId = id }
    }
    const topContact = topContactId ? contacts.find(c => c.id === topContactId) : null

    if (peopleReached === 0) return []

    const insights: WrappedInsight[] = []

    insights.push({
      type: 'people-reached',
      stat: String(peopleReached),
      label: 'people reached',
      sub: 'this week',
      color: '#25B439',
      shiftColor: '#00BFA5',
    })

    if (topPodEntry) {
      insights.push({
        type: 'top-pod',
        stat: topPodEntry.pod.name,
        label: 'top pod',
        sub: `${topPodEntry.score} equity score`,
        color: topPodEntry.pod.color ?? '#718096',
        shiftColor: POD_SHIFT_COLORS[topPodEntry.pod.color ?? ''] ?? topPodEntry.pod.color ?? '#718096',
      })
    }

    if (topContact) {
      insights.push({
        type: 'most-connected',
        stat: topContact.name.split(' ')[0],
        label: 'most connected',
        sub: `${topCount} interaction${topCount !== 1 ? 's' : ''} this week`,
        color: '#25B439',
        shiftColor: '#00BFA5',
      })
    }

    return insights
  }, [allInteractions, contacts, pods, byContact])

  // Recent activity — 5 most recent interactions with contact names
  const recentActivity = useMemo(() => {
    if (interactionsLoading || contactsLoading) return []
    const contactMap = new Map(contacts.map(c => [c.id, c]))
    return allInteractions
      .slice(0, 5)
      .map(ix => ({
        interaction: ix,
        contact: contactMap.get(ix.contact_id) ?? null,
      }))
      .filter(item => item.contact !== null)
  }, [allInteractions, contacts, interactionsLoading, contactsLoading])

  // Overdue contacts — uses per-contact frequency
  const overdueContacts = useMemo(() => {
    const result: { contact: Contact; days: number | null; podName: string; overdueDays: number }[] = []
    for (const contact of contacts) {
      if (isInGracePeriod(contact)) continue
      for (const podId of contact.list_ids) {
        const pod = pods.find(p => p.id === podId)
        const cadenceDays = contactCadenceDays(contact, pod?.cadence ?? null)
        const elapsed = daysOverdue(contact)
        if (elapsed === null) {
          result.push({ contact, days: null, podName: pod?.name ?? '', overdueDays: 999 })
          break
        }
        if (elapsed > cadenceDays) {
          result.push({ contact, days: elapsed, podName: pod?.name ?? '', overdueDays: elapsed - cadenceDays })
          break
        }
      }
    }
    return result.sort((a, b) => b.overdueDays - a.overdueDays)
  }, [contacts, pods])

  // Today's Focus
  const focusItems = useMemo(
    () => todaysFocus(contacts, byContact, pods),
    [contacts, byContact, pods]
  )

  // Upcoming birthdays
  const upcomingBirthdays = useMemo(
    () => getUpcomingBirthdays(contacts, pods),
    [contacts, pods]
  )

  // Follow-ups due this week
  const followUpItems = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(today)
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()))

    const podMap = new Map(pods.map(p => [p.id, p]))

    return contacts
      .filter(c => c.next_follow_up_date)
      .filter(c => {
        const d = new Date(c.next_follow_up_date + 'T00:00:00')
        return d >= today && d <= endOfWeek
      })
      .map(c => {
        const d = new Date(c.next_follow_up_date + 'T00:00:00')
        const daysUntil = Math.round((d.getTime() - today.getTime()) / 86400000)
        const pod = c.list_ids[0] ? (podMap.get(c.list_ids[0]) ?? null) : null
        return { contact: c, daysUntil, pod, type: 'follow-up' as const }
      })
      .sort((a, b) => a.daysUntil - b.daysUntil)
  }, [contacts, pods])

  // Merged upcoming — birthdays + follow-ups
  const upcomingItems = useMemo(() => {
    const items: Array<{ type: 'birthday' | 'follow-up'; contact: Contact; pod: Pod | null; daysUntil: number; label: string; sublabel: string }> = []

    for (const b of upcomingBirthdays) {
      items.push({
        type: 'birthday',
        contact: b.contact,
        pod: b.pod,
        daysUntil: b.daysUntil,
        label: b.date,
        sublabel: b.isToday ? 'Today' : `${b.daysUntil}d`,
      })
    }

    for (const f of followUpItems) {
      items.push({
        type: 'follow-up',
        contact: f.contact,
        pod: f.pod,
        daysUntil: f.daysUntil,
        label: f.contact.next_action ?? 'Follow up',
        sublabel: f.daysUntil === 0 ? 'Today' : `${f.daysUntil}d`,
      })
    }

    return items.sort((a, b) => a.daysUntil - b.daysUntil)
  }, [upcomingBirthdays, followUpItems])

  // Campaign segments
  const activeCampaigns = useMemo(() => campaigns.filter(c => c.status === 'active'), [campaigns])
  const pastCampaigns = useMemo(() => campaigns.filter(c => c.status === 'completed'), [campaigns])

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

  async function refreshCampaigns() {
    invalidateCampaignsCache()
    const updated = await getCampaigns()
    setCampaigns(updated)
    const allCc = await Promise.all(updated.map(c => getCampaignContacts(c.id)))
    setCampaignContacts(allCc.flat())
  }

  const dataReady = !contactsLoading && !podsLoading

  if (contactsLoading && podsLoading) {
    return (
      <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
        <DashboardSkeleton />
      </div>
    )
  }

  return (
    <>
      {showQueue && (
        <CategorizationQueue
          contacts={pendingContacts}
          onClose={() => setShowQueue(false)}
          onCategorized={(id) => {
            setPendingContacts(prev => prev.filter(c => c.id !== id))
            invalidateContactsCache()
          }}
        />
      )}
    <main style={{ width: '100%', height: '100%', position: 'relative', overflow: 'auto' }}>

      {/* Green header band */}
      <div style={{ background: 'var(--header-band-bg)', borderRadius: '0 0 20px 20px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 32px' }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

            {/* Equity score ring — directly on green, no panel wrapper */}
            <div style={{ padding: '0', display: 'flex', alignItems: 'center', gap: 24, flex: '0 0 auto' }}>
              {interactionsLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <div className="skeleton" style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="skeleton" style={{ width: 48, height: 28, background: 'rgba(255,255,255,0.15)' }} />
                    <div className="skeleton" style={{ width: 56, height: 14, background: 'rgba(255,255,255,0.15)' }} />
                  </div>
                </div>
              ) : (
                <>
                  <EquityRing score={overallScore} size={80} />
                  <div>
                    <div aria-live="polite" style={{ fontSize: 28, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1 }}>
                      {overallScore}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)', marginTop: 4, letterSpacing: '0.01em' }}>
                      {scoreLabel(overallScore)}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Stats — semi-transparent white panel on green */}
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--panel-radius)', padding: '20px 24px', flex: 1 }}>
              {!dataReady ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div className="skeleton" style={{ width: 40, height: 22, background: 'rgba(255,255,255,0.15)' }} />
                      <div className="skeleton" style={{ width: 60, height: 12, background: 'rgba(255,255,255,0.15)' }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                  <StatBlock label="Pods" value={pods.length} />
                  <StatBlock label="Contacts" value={contacts.length} />
                  <StatBlock label="Reached this week" value={recentlyContacted} />
                  <StatBlock label="Overdue" value={overdueContacts.length} accent />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rest of dashboard on light background */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 24px 80px' }}>

        {/* No pulse yet — when data loaded but no pods/contacts */}
        {dataReady && !interactionsLoading && pods.length === 0 && contacts.length === 0 && (
          <div style={{ ...PANEL, marginBottom: 24 }}>
            <EmptyState
              icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
              heading="No pulse yet"
              subtext="Log your first interaction to start building your network health score."
              ctaLabel="Log interaction"
              onCta={() => {}}
              orbColor="#25B439"
              ghosts={2}
            />
          </div>
        )}

        {/* Pending categorization tray */}
        <PendingTrayWidget
          pendingContacts={pendingContacts}
          onReview={() => setShowQueue(true)}
        />

        {/* Pod health cards */}
        {!dataReady ? null : podStats.length > 0 && (
          <div style={{ position: 'relative', marginBottom: 24 }}>
            <div style={{
              position: 'absolute', top: 0, right: 0, bottom: 0, width: 48,
              background: 'linear-gradient(to right, transparent, var(--color-bg))',
              pointerEvents: 'none', zIndex: 1,
            }} />
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingTop: 6, paddingBottom: 6, scrollbarWidth: 'none' }}>
              {podStats.map(({ pod, contactCount, overdueCount, score, sparkline }) => (
                <PodCard key={pod.id} pod={pod} contactCount={contactCount} overdueCount={overdueCount} score={score} scoreReady={!interactionsLoading} sparkline={sparkline} />
              ))}
            </div>
          </div>
        )}

        {/* Wrapped insight card */}
        {!interactionsLoading && (
          <WrappedCard insights={wrappedInsights} />
        )}

        {/* Recent Activity */}
        {!interactionsLoading && recentActivity.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)', letterSpacing: '-0.01em', margin: 0, marginBottom: 12 }}>
              recent activity
            </h2>
            <div style={{ ...PANEL, overflow: 'hidden' }}>
              {recentActivity.map(({ interaction, contact }) => (
                <RecentActivityRow key={interaction.id} interaction={interaction} contact={contact!} onClick={() => setSelectedContact(contact!)} />
              ))}
            </div>
          </div>
        )}

        {/* Coming Up — birthdays + follow-ups merged */}
        {upcomingItems.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{
              fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-serif)',
              color: 'var(--color-text-primary)', letterSpacing: '-0.01em',
              margin: 0, marginBottom: 12,
            }}>
              coming up
            </h2>
            <div style={{ ...PANEL, overflow: 'hidden' }}>
              {upcomingItems.map((item, i) => (
                <UpcomingRow key={`${item.type}-${item.contact.id}-${i}`} item={item} onClick={() => setSelectedContact(item.contact)} />
              ))}
            </div>
          </div>
        )}

        {/* Today's Focus */}
        {focusItems.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)', letterSpacing: '-0.01em', margin: 0, marginBottom: 12 }}>
              today's focus
            </h2>
            <div style={{ display: 'flex', gap: 12 }}>
              {focusItems.map(item => (
                <FocusCard key={item.contact.id} item={item} onClick={() => setSelectedContact(item.contact)} />
              ))}
            </div>
          </div>
        )}

        {/* Campaigns */}
        {!campaignsLoading && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{
                fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-serif)',
                color: 'var(--color-text-primary)', letterSpacing: '-0.01em', margin: 0,
              }}>
                campaigns
              </h2>
              <button
                type="button"
                onClick={() => setShowCampaignCreate(true)}
                style={{
                  width: 24, height: 24, borderRadius: 12,
                  background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-text-secondary)', fontSize: 16, lineHeight: 1,
                }}
              >+</button>
            </div>

            {showCampaignCreate && (
              <CampaignCreate
                onCreated={campaign => {
                  setCampaigns(prev => [campaign, ...prev])
                  setShowCampaignCreate(false)
                  refreshCampaigns()
                }}
                onCancel={() => setShowCampaignCreate(false)}
              />
            )}

            {activeCampaigns.length === 0 && !showCampaignCreate ? (
              <div style={{ ...PANEL }}>
                <EmptyState
                  icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>}
                  heading="No active campaigns"
                  subtext="Create one to track your next outreach"
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activeCampaigns.slice(0, 3).map(campaign => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    contacts={campaignContacts.filter(cc => cc.campaign_id === campaign.id)}
                    onClick={() => setSelectedCampaignId(campaign.id)}
                  />
                ))}
                {activeCampaigns.length > 3 && (
                  <button
                    type="button"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: 'var(--color-text-secondary)',
                      padding: '8px 0', textAlign: 'left', fontFamily: 'inherit',
                    }}
                  >
                    +{activeCampaigns.length - 3} more
                  </button>
                )}
              </div>
            )}

            {pastCampaigns.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setShowPastCampaigns(v => !v)}
                  style={{
                    width: '100%', padding: '12px 0 4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                    past campaigns ({pastCampaigns.length})
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', transform: showPastCampaigns ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    ▾
                  </span>
                </button>
                {showPastCampaigns && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    {pastCampaigns.map(campaign => (
                      <CampaignCard
                        key={campaign.id}
                        campaign={campaign}
                        contacts={campaignContacts.filter(cc => cc.campaign_id === campaign.id)}
                        onClick={() => setSelectedCampaignId(campaign.id)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Overdue queue */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)', letterSpacing: '-0.01em', margin: 0 }}>
            needs attention
          </h2>
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
        <div style={{ ...PANEL, overflow: 'hidden', marginBottom: 24 }}>

          {contactsLoading ? (
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2].map(i => (
                <div key={i} className="skeleton" style={{ width: '100%', height: 52, borderRadius: 12 }} />
              ))}
            </div>
          ) : error ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
              {error}
            </div>
          ) : overdueContacts.length === 0 ? (
            <EmptyState
              icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              heading="All caught up"
              subtext="Nothing needs attention right now"
              orbColor="#25B439"
            />
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
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                {dormantContacts.length} gone quiet
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', transform: dormantExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                ▾
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

      {/* Add Contact FAB */}
      <button
        type="button"
        onClick={() => setShowAddContact(true)}
        aria-label="Add contact"
          style={{
            position: 'fixed',
            bottom: window.matchMedia('(max-width: 767px)').matches ? 112 : 80,
            right: 24,
            zIndex: 90,
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--color-brand)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(37,180,57,0.35)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,180,57,0.45)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,180,57,0.35)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

      {showAddContact && (
        <AddContactModal
          onCreated={() => {
            setShowAddContact(false)
            invalidateContactsCache()
            window.location.reload()
          }}
          onClose={() => setShowAddContact(false)}
        />
      )}

      {selectedContact && (
        <ContactDetail
          contact={selectedContact}
          categoryId={selectedContact.category_ids[0]}
          onClose={() => setSelectedContact(null)}
          onSaved={handleContactSaved}
          onDeleted={handleContactDeleted}
        />
      )}

      {selectedCampaignId && (() => {
        const campaign = campaigns.find(c => c.id === selectedCampaignId)
        if (!campaign) return null
        return (
          <CampaignDetail
            campaignId={campaign.id}
            campaignName={campaign.name}
            campaignType={campaign.type}
            campaignDeadline={campaign.deadline}
            campaignStatus={campaign.status}
            contacts={contacts}
            pods={pods}
            onClose={() => setSelectedCampaignId(null)}
            onUpdate={refreshCampaigns}
          />
        )
      })()}
    </main>
    </>
  )
}

// ── Local sub-components ────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div>
      {/* Green band skeleton */}
      <div style={{ background: 'var(--header-band-bg)', padding: '28px 24px 32px', borderRadius: '0 0 20px 20px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flex: '0 0 auto' }}>
            <div className="skeleton" style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="skeleton" style={{ width: 48, height: 28, background: 'rgba(255,255,255,0.15)' }} />
              <div className="skeleton" style={{ width: 56, height: 14, background: 'rgba(255,255,255,0.15)' }} />
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--panel-radius)', padding: '20px 24px', flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div className="skeleton" style={{ width: 40, height: 22, background: 'rgba(255,255,255,0.15)' }} />
                  <div className="skeleton" style={{ width: 60, height: 12, background: 'rgba(255,255,255,0.15)' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Card ghosts */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 24px 80px' }}>
        <div className="skeleton" style={{ width: 120, height: 16, marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {[1,2,3].map(i => (
            <div key={i} className="skeleton" style={{ width: 155, height: 80, borderRadius: 12 }} />
          ))}
        </div>
        <div className="skeleton" style={{ width: 100, height: 16, marginBottom: 12 }} />
        <div style={{ borderRadius: 'var(--panel-radius)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 14px' }}>
            <div className="skeleton" style={{ width: 140, height: 18 }} />
          </div>
          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="skeleton" style={{ width: '100%', height: 52, borderRadius: 12 }} />
            <div className="skeleton" style={{ width: '100%', height: 52, borderRadius: 12 }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Sparkline({ data, color, width = 60, height = 24 }: {
  data: number[]
  color: string
  width?: number
  height?: number
}) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - (v / max) * height,
  }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`
  return (
    <svg width={width} height={height} style={{ display: 'block', flexShrink: 0 }}>
      <path d={areaPath} fill={`${color}1F`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EquityRing({ score, size }: { score: number; size: number }) {
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {/* Ghost track — white alpha on green */}
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth={strokeWidth} />
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
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.60)" />
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
        color: accent && value > 0 ? 'hsla(20, 80%, 45%, 0.80)' : '#ffffff',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4, letterSpacing: '0.01em' }}>
        {label}
      </div>
    </div>
  )
}

function PodCard({ pod, contactCount, overdueCount, score, scoreReady, sparkline }: {
  pod: Pod; contactCount: number; overdueCount: number; score: number; scoreReady: boolean
  sparkline: number[] | null
}) {
  const color = pod.color ?? '#718096'
  const cadence = pod.cadence ?? 'monthly'
  const cardRef = useRef<HTMLDivElement>(null)
  const restShadow = '0 1px 3px var(--divider)'
  const hoverShadow = `0 4px 16px ${hexToRgba(color, 0.15)}`

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => {
        if (cardRef.current) {
          cardRef.current.style.transform = 'translateY(-2px)'
          cardRef.current.style.boxShadow = hoverShadow
        }
      }}
      onMouseLeave={() => {
        if (cardRef.current) {
          cardRef.current.style.transform = 'none'
          cardRef.current.style.boxShadow = restShadow
        }
      }}
      style={{
        background: 'var(--surface-panel)',
        border: '1px solid var(--edge)',
        borderRadius: 12,
        padding: '14px 16px',
        minWidth: 155,
        flexShrink: 0,
        boxShadow: restShadow,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Top row: mini orb + text */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Mini orb avatar */}
        <div style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          flexShrink: 0,
          background: `linear-gradient(135deg, ${color} 0%, ${POD_SHIFT_COLORS[color] ?? color} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 8,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.90)',
        }}>
          {pod.name.slice(0, 2).toUpperCase()}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)', marginBottom: 4, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            {pod.name}
          </div>
          <div style={{ display: 'flex', gap: 8, fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-secondary)' }}>
            <span>{contactCount} contacts</span>
            {overdueCount > 0 && (
              <span style={{ color: 'hsla(20, 80%, 45%, 0.80)' }}>{overdueCount} overdue</span>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {cadence}
            </span>
            {scoreReady && (
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                {score}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sparkline — 30-day interaction trend, only when data exists */}
      {scoreReady && sparkline && (
        <Sparkline data={sparkline} color={color} width={119} height={22} />
      )}
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
  const tagLabel = item.reason === 'overdue' ? 'reach out' : 'check in'

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '16px 18px',
        background: 'rgba(37,180,57,0.04)',
        borderRadius: 14,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        transition: 'transform 0.15s, box-shadow 0.15s',
        boxShadow: '0 1px 3px var(--divider)',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px var(--divider)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px var(--divider)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Avatar name={item.contact.name} size={28} variant="subtle" />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', flex: 1 }}>
          {item.contact.name}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, color: 'var(--color-brand)',
          background: 'rgba(37,180,57,0.08)', padding: '3px 10px', borderRadius: 12, whiteSpace: 'nowrap',
        }}>
          {tagLabel}
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
        {reason}
      </div>
      {item.pod && (
        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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
        borderBottom: '1px solid var(--divider)',
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      <Avatar name={contact.name} size={32} variant="subtle" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
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


function RecentActivityRow({ interaction, contact, onClick }: { interaction: Interaction; contact: Contact; onClick: () => void }) {
  const icon = TYPE_ICONS[interaction.type] ?? null
  const summary = interaction.summary || interaction.notes || null

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
      <div style={{ width: 14, height: 14, flexShrink: 0, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
          {contact.name}
        </div>
        {summary && (
          <div style={{
            fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {summary}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          {formatRelativeTime(interaction.date)}
        </span>
        {interaction.source && (
          <span style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 4,
            background: 'rgba(0,0,0,0.04)', color: 'var(--color-text-tertiary)',
          }}>
            {interaction.source}
          </span>
        )}
      </div>
    </button>
  )
}

function UpcomingRow({ item, onClick }: {
  item: { type: 'birthday' | 'follow-up'; contact: Contact; pod: Pod | null; daysUntil: number; label: string; sublabel: string }
  onClick: () => void
}) {
  const dotColor = item.type === 'birthday' ? 'hsla(30, 80%, 55%, 0.9)' : 'var(--color-brand)'
  const isToday = item.daysUntil === 0

  return (
    <button
      type="button"
      onClick={onClick}
      className="interactive-row"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '12px 24px',
        background: isToday ? 'hsla(30, 80%, 55%, 0.06)' : 'none',
        border: 'none',
        borderBottom: '1px solid var(--divider)',
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: dotColor }} />
      <div style={{
        fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)',
        flex: 1, minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {item.contact.name}
      </div>
      <span style={{
        fontSize: 11, color: 'var(--color-text-secondary)', flexShrink: 0,
        maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {item.label}
      </span>
      <span style={{
        fontSize: 11, fontWeight: 500, flexShrink: 0, minWidth: 32, textAlign: 'right',
        color: isToday ? 'hsla(30, 80%, 55%, 0.90)' : 'var(--color-text-tertiary)',
      }}>
        {item.sublabel}
      </span>
      {item.pod && (
        <span style={{
          fontSize: 10, color: 'var(--color-text-tertiary)', flexShrink: 0,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {item.pod.name}
        </span>
      )}
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
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{contact.name}</div>
        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
          {dormancyLabel} · {days ? `${days}d ago` : 'Never reached'}
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
            style={{ fontSize: 11, color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            cancel
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
              style={{
                fontSize: 10, fontWeight: 500,
                padding: '3px 10px', borderRadius: 100,
                background: 'var(--tint)',
                border: '1px solid var(--edge)',
                color: label === 'Let go' ? 'rgba(180,40,40,0.65)' : 'var(--color-text-secondary)',
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

const TYPE_COLORS: Record<string, string> = {
  event: 'hsla(270, 60%, 50%, 0.10)',
  investment: 'hsla(150, 60%, 40%, 0.10)',
  outreach: 'hsla(210, 60%, 50%, 0.10)',
  other: 'hsla(0, 0%, 50%, 0.10)',
}
const TYPE_TEXT: Record<string, string> = {
  event: 'hsla(270, 60%, 40%, 0.80)',
  investment: 'hsla(150, 60%, 30%, 0.80)',
  outreach: 'hsla(210, 60%, 40%, 0.80)',
  other: 'hsla(0, 0%, 40%, 0.80)',
}

function CampaignCard({ campaign, contacts, onClick }: {
  campaign: Campaign
  contacts: CampaignContact[]
  onClick: () => void
}) {
  const contacted = contacts.filter(c => c.status !== 'pending').length
  const total = contacts.length
  const progress = total > 0 ? contacted / total : 0

  return (
    <button type="button" onClick={onClick} style={{
      ...PANEL, width: '100%', padding: '14px 20px',
      display: 'flex', flexDirection: 'column', gap: 8,
      cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {campaign.name}
          </span>
          <span style={{
            padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 500,
            background: TYPE_COLORS[campaign.type] ?? TYPE_COLORS.other,
            color: TYPE_TEXT[campaign.type] ?? TYPE_TEXT.other,
          }}>
            {campaign.type}
          </span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
          {contacted}/{total}
        </span>
      </div>
      {total > 0 && (
        <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.06)' }}>
          <div style={{
            width: `${progress * 100}%`, height: '100%', borderRadius: 2,
            background: progress === 1 ? 'hsla(150, 60%, 40%, 0.6)' : 'hsla(210, 60%, 50%, 0.4)',
            transition: 'width 0.3s ease',
          }} />
        </div>
      )}
      {campaign.deadline && (
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          due {new Date(campaign.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )}
    </button>
  )
}
