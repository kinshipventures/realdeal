import { useCallback, useEffect, useMemo, useState } from 'react'
import { getContacts, getPods, isOverdue, isInGracePeriod, getAllInteractions, deleteContact, getCampaigns, getCampaignContacts, invalidateCampaignsCache, invalidateContactsCache, getPendingContacts } from '../../lib/airtable'
import { daysOverdue } from '../../lib/utils'
import { POD_SHIFT_COLORS } from '../map/SolidOrb'
import {
  indexByContact,
  podEquityScore,
  overallEquityScore,
  isDormant,
  daysSinceContact,
  todaysFocus,
  contactCadenceDays,
  getPrimaryPod,
} from '../../lib/equity'
import { getUpcomingBirthdays } from '../../lib/birthdays'
import { isContactSnoozed, snoozeContact } from '../../lib/snooze'
import type { SnoozeDuration } from '../../lib/snooze'
import { useDashboardConfig } from './useDashboardConfig'
import type { WidgetId } from './useDashboardConfig'

import type { Contact, Pod, Interaction, Campaign, CampaignContact } from '../../lib/types'
import { ContactDetail } from '../contacts/ContactDetail'
import { CampaignDetail } from '../campaigns/CampaignDetail'
import { EmptyState } from '../empty/EmptyState'
import type { WrappedInsight } from './WrappedCard'
import { PendingTrayWidget } from '../categorization/PendingTrayWidget'
import { CategorizationQueue } from '../categorization/CategorizationQueue'
import { DashboardSettings } from './DashboardSettings'
import { EquityWidget } from './widgets/EquityWidget'
import { PodHealthWidget } from './widgets/PodHealthWidget'
import { WrappedWidget } from './widgets/WrappedWidget'
import { TodaysFocusWidget } from './widgets/TodaysFocusWidget'
import { NeedsAttentionWidget } from './widgets/NeedsAttentionWidget'
import { ComingUpWidget } from './widgets/ComingUpWidget'
import { RecentActivityWidget } from './widgets/RecentActivityWidget'
import { CampaignProgressWidget } from './widgets/CampaignProgressWidget'

export function Dashboard() {
  const { config, isVisible, toggleWidget, applyPreset, reorderWidgets, setEquityPods } = useDashboardConfig()
  const [showSettings, setShowSettings] = useState(false)

  const [contacts, setContacts] = useState<Contact[]>([])
  const [pods, setPods] = useState<Pod[]>([])
  const [allInteractions, setAllInteractions] = useState<Interaction[]>([])
  const [contactsLoading, setContactsLoading] = useState(true)
  const [podsLoading, setPodsLoading] = useState(true)
  const [interactionsLoading, setInteractionsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [snoozePickerForId, setSnoozePickerForId] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignContacts, setCampaignContacts] = useState<CampaignContact[]>([])
  const [campaignsLoading, setCampaignsLoading] = useState(true)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [pendingContacts, setPendingContacts] = useState<Contact[]>([])
  const [showQueue, setShowQueue] = useState(false)
  const [dashboardNow] = useState(() => Date.now())

  // Graduated loading — each section loads independently
  useEffect(() => {
    let stale = false
    getContacts()
      .then(d => { if (!stale) setContacts(d) })
      .catch(() => { if (!stale) setError('Something hiccupped. Refresh to try again.') })
      .finally(() => { if (!stale) setContactsLoading(false) })
    getPods()
      .then(d => { if (!stale) setPods(d) })
      .finally(() => { if (!stale) setPodsLoading(false) })
    getAllInteractions()
      .then(d => { if (!stale) setAllInteractions(d) })
      .finally(() => { if (!stale) setInteractionsLoading(false) })
    getCampaigns()
      .then(d => {
        if (stale) return
        setCampaigns(d)
        return Promise.all(d.map(c => getCampaignContacts(c.id)))
      })
      .then(results => { if (!stale && results) setCampaignContacts(results.flat()) })
      .finally(() => { if (!stale) setCampaignsLoading(false) })
    getPendingContacts().then(d => { if (!stale) setPendingContacts(d) })
    return () => { stale = true }
  }, [])

  // Pre-index interactions by contact — O(m) single pass
  const byContact = useMemo(() => indexByContact(allInteractions), [allInteractions])

  // Pods used for equity score - configurable or priority pods
  const equityPods = useMemo(() => {
    if (config.equityPodIds !== null) {
      const idSet = new Set(config.equityPodIds)
      return pods.filter(p => idSet.has(p.id))
    }
    return pods.filter(p => p.is_priority)
  }, [pods, config.equityPodIds])

  // Overall equity score
  const overallScore = useMemo(
    () => overallEquityScore(equityPods, contacts, byContact),
    [equityPods, contacts, byContact]
  )

  // Pod stats
  const podStats = useMemo(() => {
    const WINDOW_MS = 30 * 24 * 60 * 60 * 1000
    const BUCKETS = 7
    const BUCKET_MS = WINDOW_MS / BUCKETS

    return pods.map(pod => {
      const podContacts = contacts.filter(c => c.primary_list_id === pod.id)
      const cadence = pod.cadence ?? 'monthly'
      const overdueCount = podContacts.filter(c => isOverdue(c, cadence)).length
      const score = podEquityScore(podContacts, byContact)

      const podContactIds = new Set(podContacts.map(c => c.id))
      const buckets = new Array<number>(BUCKETS).fill(0)
      let hasData = false
      for (const c of podContacts) {
        const interactions = byContact.get(c.id) ?? []
        for (const ix of interactions) {
          if (!podContactIds.has(ix.contact_id)) continue
          const age = dashboardNow - new Date(ix.date).getTime()
          if (age < 0 || age >= WINDOW_MS) continue
          const bucketIdx = Math.floor(age / BUCKET_MS)
          const idx = BUCKETS - 1 - Math.min(bucketIdx, BUCKETS - 1)
          buckets[idx]++
          hasData = true
        }
      }
      const sparkline = hasData ? buckets : null

      return { pod, contactCount: podContacts.length, overdueCount, score, scoreReady: !interactionsLoading, sparkline }
    }).sort((a, b) => {
      if (a.pod.is_priority !== b.pod.is_priority) return a.pod.is_priority ? -1 : 1
      return a.pod.name.localeCompare(b.pod.name)
    })
  }, [pods, contacts, byContact, interactionsLoading, dashboardNow])

  // Wrapped insights — weekly stats for the insight card
  const wrappedInsights = useMemo((): WrappedInsight[] => {
    const sevenDaysAgo = dashboardNow - 7 * 24 * 60 * 60 * 1000
    const recentInteractions = allInteractions.filter(ix => new Date(ix.date).getTime() >= sevenDaysAgo)
    const recentContactIds = new Set(recentInteractions.map(ix => ix.contact_id))
    const peopleReached = recentContactIds.size

    const podScores = pods.map(p => ({
      pod: p,
      score: podEquityScore(contacts.filter(c => c.primary_list_id === p.id), byContact),
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
    insights.push({ type: 'people-reached', stat: String(peopleReached), label: 'people reached', sub: 'this week', color: '#25B439', shiftColor: '#00BFA5' })
    if (topPodEntry) {
      insights.push({
        type: 'top-pod', stat: topPodEntry.pod.name, label: 'top pod', sub: `${topPodEntry.score} equity score`,
        color: topPodEntry.pod.color ?? '#718096',
        shiftColor: POD_SHIFT_COLORS[topPodEntry.pod.color ?? ''] ?? topPodEntry.pod.color ?? '#718096',
      })
    }
    if (topContact) {
      insights.push({
        type: 'most-connected', stat: topContact.name.split(' ')[0], label: 'most connected',
        sub: `${topCount} interaction${topCount !== 1 ? 's' : ''} this week`, color: '#25B439', shiftColor: '#00BFA5',
      })
    }
    return insights
  }, [allInteractions, contacts, pods, byContact, dashboardNow])

  // Recent activity — 5 most recent interactions with contact names
  const recentActivity = useMemo(() => {
    if (interactionsLoading || contactsLoading) return []
    const contactMap = new Map(contacts.map(c => [c.id, c]))
    return allInteractions
      .slice(0, 5)
      .map(ix => ({ interaction: ix, contact: contactMap.get(ix.contact_id) ?? null }))
      .filter(item => item.contact !== null) as Array<{ interaction: Interaction; contact: Contact }>
  }, [allInteractions, contacts, interactionsLoading, contactsLoading])

  // Overdue contacts — uses per-contact frequency
  const overdueContacts = useMemo(() => {
    const result: { contact: Contact; days: number | null; podName: string; overdueDays: number }[] = []
    for (const contact of contacts) {
      if (isInGracePeriod(contact)) continue
      const pod = getPrimaryPod(contact, pods)
      const cadenceDays = contactCadenceDays(contact, pod?.cadence ?? null)
      const elapsed = daysOverdue(contact)
      if (elapsed === null) {
        result.push({ contact, days: null, podName: pod?.name ?? '', overdueDays: 999 })
        continue
      }
      if (elapsed > cadenceDays) {
        result.push({ contact, days: elapsed, podName: pod?.name ?? '', overdueDays: elapsed - cadenceDays })
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
  const upcomingBirthdays = useMemo(() => getUpcomingBirthdays(contacts, pods), [contacts, pods])

  // Follow-up overdue contacts — next_follow_up_date < today
  const followUpOverdue = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return contacts
      .filter(c => c.next_follow_up_date && c.next_follow_up_date < today)
      .map(c => {
        const overdueDays = Math.floor((dashboardNow - new Date(c.next_follow_up_date + 'T00:00:00').getTime()) / 86400000)
        const pod = getPrimaryPod(c, pods)
        return { contact: c, overdueDays, podName: pod?.name ?? '', action: c.next_action }
      })
      .sort((a, b) => b.overdueDays - a.overdueDays)
  }, [contacts, pods, dashboardNow])

  // Follow-ups due this week (and overdue)
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
        return d <= endOfWeek  // include overdue (d < today) + this week
      })
      .map(c => {
        const d = new Date(c.next_follow_up_date + 'T00:00:00')
        const daysUntil = Math.round((d.getTime() - today.getTime()) / 86400000)
        const pod = c.primary_list_id ? (podMap.get(c.primary_list_id) ?? null) : null
        return { contact: c, daysUntil, pod, type: 'follow-up' as const }
      })
      .sort((a, b) => a.daysUntil - b.daysUntil)
  }, [contacts, pods])

  // Merged upcoming — birthdays + follow-ups (including overdue)
  const upcomingItems = useMemo(() => {
    const items: Array<{ type: 'birthday' | 'follow-up'; contact: Contact; pod: Pod | null; daysUntil: number; label: string; sublabel: string; isOverdue?: boolean }> = []
    for (const b of upcomingBirthdays) {
      items.push({ type: 'birthday', contact: b.contact, pod: b.pod, daysUntil: b.daysUntil, label: b.date, sublabel: b.isToday ? 'Today' : `${b.daysUntil}d` })
    }
    for (const f of followUpItems) {
      const isOverdue = f.daysUntil < 0
      items.push({
        type: 'follow-up',
        contact: f.contact,
        pod: f.pod,
        daysUntil: f.daysUntil,
        label: f.contact.next_action ?? 'Follow up',
        sublabel: isOverdue ? `${Math.abs(f.daysUntil)}d overdue` : f.daysUntil === 0 ? 'Today' : `${f.daysUntil}d`,
        isOverdue,
      })
    }
    return items.sort((a, b) => a.daysUntil - b.daysUntil)
  }, [upcomingBirthdays, followUpItems])

  // Dormant contacts (90+ days, not snoozed)
  const dormantContacts = useMemo(
    () => contacts
      .filter(c => isDormant(c) && !isContactSnoozed(c.snoozed_until) && !isInGracePeriod(c))
      .map(c => ({ contact: c, days: daysSinceContact(c) }))
      .sort((a, b) => (b.days ?? 999) - (a.days ?? 999)),
    [contacts]
  )

  // Score trend — compare this week's interactions to last week's
  const scoreTrend = useMemo((): 'up' | 'down' | 'flat' => {
    if (interactionsLoading || allInteractions.length === 0) return 'flat'
    const oneWeek = 7 * 24 * 60 * 60 * 1000
    const thisWeek = allInteractions.filter(ix => dashboardNow - new Date(ix.date).getTime() < oneWeek).length
    const lastWeek = allInteractions.filter(ix => {
      const age = dashboardNow - new Date(ix.date).getTime()
      return age >= oneWeek && age < oneWeek * 2
    }).length
    if (thisWeek > lastWeek) return 'up'
    if (thisWeek < lastWeek) return 'down'
    return 'flat'
  }, [allInteractions, interactionsLoading, dashboardNow])

  function handleContactSaved(updated: Contact) {
    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c))
  }

  function handleContactDeleted() {
    if (!selectedContact) return
    setContacts(prev => prev.filter(c => c.id !== selectedContact.id))
    setSelectedContact(null)
  }

  async function handleSnooze(id: string, duration: SnoozeDuration) {
    setSnoozePickerForId(null)
    await snoozeContact(id, duration)
    const updated = await getContacts()
    setContacts(updated)
  }

  async function handleRemoveContact(id: string) {
    await deleteContact(id)
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  async function refreshCampaigns() {
    invalidateCampaignsCache()
    const updated = await getCampaigns()
    setCampaigns(updated)
    const allCc = await Promise.all(updated.map(c => getCampaignContacts(c.id)))
    setCampaignContacts(allCc.flat())
  }

  const handleContactClick = useCallback((contact: Contact) => setSelectedContact(contact), [])

  // Listen for campaign open events from child widgets
  useEffect(() => {
    function handleOpenCampaign(e: Event) {
      const id = (e as CustomEvent).detail
      if (id) setSelectedCampaignId(id)
    }
    window.addEventListener('dashboard:open-campaign', handleOpenCampaign)
    return () => window.removeEventListener('dashboard:open-campaign', handleOpenCampaign)
  }, [])

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

      {showSettings && (
        <DashboardSettings
          config={config}
          pods={pods}
          onToggle={toggleWidget}
          onPreset={applyPreset}
          onReorder={reorderWidgets}
          onSetEquityPods={setEquityPods}
          onClose={() => setShowSettings(false)}
        />
      )}

      <main id="main-content" className="content-enter" style={{ width: '100%', height: '100%', position: 'relative', overflow: 'auto' }}>
        <h1 className="sr-only">Dashboard</h1>

        {/* Ambient header — color washes in, never paints */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <div aria-hidden style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 110% 90% at 35% -5%, rgba(52,177,93,0.18) 0%, rgba(52,177,93,0.06) 45%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', maxWidth: 960, margin: '0 auto', padding: '28px 24px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              {isVisible('equity') ? (
                <div style={{ flex: 1 }}>
                  <EquityWidget
                    overallScore={overallScore}
                    interactionsLoading={interactionsLoading}
                    dataReady={dataReady}
                    scoreTrend={scoreTrend}
                    onQuickAction={() => {
                      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
                    }}
                  />
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Dashboard
                  </span>
                </div>
              )}
              {/* Gear icon */}
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                style={{
                  width: 44, height: 44, borderRadius: 8,
                  background: 'rgba(0,0,0,0.05)', border: '1px solid var(--edge)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-text-tertiary)', flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Rest of dashboard on light background */}
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 24px 96px' }}>

          {/* No pulse yet */}
          {dataReady && !interactionsLoading && pods.length === 0 && contacts.length === 0 && (
            <div style={{
              background: 'var(--surface-panel)', backdropFilter: 'var(--panel-blur)',
              WebkitBackdropFilter: 'var(--panel-blur)', border: 'var(--surface-panel-border)',
              borderRadius: 'var(--panel-radius)', marginBottom: 32,
            }}>
              <EmptyState
                icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                heading="No pulse yet"
                subtext="Log your first interaction to start building your network health score."
                ctaLabel="Log interaction"
                onCta={() => {
                  const first = focusItems[0]
                  if (first) setSelectedContact(first.contact)
                }}
                orbColor="#25B439"
                ghosts={2}
              />
            </div>
          )}

          {/* Wrapped card - weekly pulse */}
          {isVisible('wrapped') && (
            <div className="widget-enter dashboard-hero-stack" style={{ '--stagger': 0 } as React.CSSProperties}>
              <WrappedWidget insights={wrappedInsights} loading={interactionsLoading} />
            </div>
          )}

          {renderDashboardSections({
            order: config.order,
            isVisible,
            podStats, dataReady,
            focusItems, upcomingItems, overdueContacts, followUpOverdue, dormantContacts,
            contactsLoading, error, recentActivity, campaigns, campaignContacts,
            campaignsLoading, pendingContacts,
            onContactClick: handleContactClick,
            onSnooze: handleSnooze,
            onRemoveContact: handleRemoveContact,
            onRetry: () => {
              setError(null)
              setContactsLoading(true)
              getContacts()
                .then(d => setContacts(d))
                .catch(() => setError('Something hiccupped. Refresh to try again.'))
                .finally(() => setContactsLoading(false))
            },
            onReview: () => setShowQueue(true),
          })}
        </div>

      </main>

      {selectedContact && (
        <ContactDetail
          contact={selectedContact}
          categoryId={selectedContact.category_ids[0]}
          onClose={() => setSelectedContact(null)}
          onSaved={handleContactSaved}
          onDeleted={handleContactDeleted}
          pods={pods}
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
            campaignStatus={campaign.status as 'active' | 'completed'}
            campaignNotes={campaign.notes}
            contacts={contacts}
            pods={pods}
            onClose={() => setSelectedCampaignId(null)}
            onUpdate={refreshCampaigns}
          />
        )
      })()}
    </>
  )
}

// ── Dashboard sections ───────────────────────────────────────────────────────

type PodStat = { pod: Pod; contactCount: number; overdueCount: number; score: number; scoreReady: boolean; sparkline: number[] | null }

interface DashboardSectionProps {
  order: WidgetId[]
  isVisible: (id: WidgetId) => boolean
  podStats: PodStat[]
  dataReady: boolean
  focusItems: ReturnType<typeof todaysFocus>
  upcomingItems: Array<{ type: 'birthday' | 'follow-up'; contact: Contact; pod: Pod | null; daysUntil: number; label: string; sublabel: string; isOverdue?: boolean }>
  overdueContacts: Array<{ contact: Contact; days: number | null; podName: string; overdueDays: number }>
  followUpOverdue: Array<{ contact: Contact; overdueDays: number; podName: string; action: string | null }>
  dormantContacts: Array<{ contact: Contact; days: number | null }>
  contactsLoading: boolean
  error: string | null
  recentActivity: Array<{ interaction: Interaction; contact: Contact }>
  campaigns: Campaign[]
  campaignContacts: CampaignContact[]
  campaignsLoading: boolean
  pendingContacts: Contact[]
  onContactClick: (c: Contact) => void
  onSnooze: (id: string, duration: SnoozeDuration) => void
  onRemoveContact: (id: string) => Promise<void>
  onRetry: () => void
  onReview: () => void
}

function renderDashboardSections(props: DashboardSectionProps) {
  const {
    order, isVisible, podStats, dataReady,
    focusItems, upcomingItems, overdueContacts, followUpOverdue, dormantContacts,
    contactsLoading, error, recentActivity, campaigns, campaignContacts,
    campaignsLoading, pendingContacts, onContactClick, onSnooze, onRemoveContact, onRetry, onReview,
  } = props

  const elements: React.ReactNode[] = []
  let stagger = 0

  const sectionOrder = order.filter(id => isVisible(id) && id !== 'wrapped' && id !== 'equity')
  const layoutByWidget: Partial<Record<WidgetId, 'wide' | 'narrow' | 'full'>> = {
    'todays-focus': 'full',
    'needs-attention': 'wide',
    'coming-up': 'narrow',
    'campaign-progress': 'full',
    'pod-health': 'full',
    'recent-activity': 'full',
    'pending-tray': 'full',
  }

  for (const id of sectionOrder) {
    const delay = stagger++
    const style = {
      '--stagger': delay,
      gridColumn: layoutByWidget[id] === 'wide'
        ? 'span 7'
        : layoutByWidget[id] === 'narrow'
          ? 'span 5'
          : '1 / -1',
    } as React.CSSProperties

    if (id === 'todays-focus') {
      elements.push(
        <div key={id} className="widget-enter dashboard-grid-item" style={style}>
          <TodaysFocusWidget items={focusItems} onContactClick={onContactClick} />
        </div>
      )
    } else if (id === 'coming-up') {
      elements.push(
        <div key={id} className="widget-enter dashboard-grid-item" style={style}>
          <ComingUpWidget items={upcomingItems} onContactClick={onContactClick} />
        </div>
      )
    } else if (id === 'needs-attention') {
      elements.push(
        <div key={id} className="widget-enter dashboard-grid-item" style={style}>
          <NeedsAttentionWidget
            overdueContacts={overdueContacts}
            followUpOverdue={followUpOverdue}
            dormantContacts={dormantContacts}
            campaigns={campaigns}
            campaignContacts={campaignContacts}
            contactsLoading={contactsLoading}
            error={error}
            onContactClick={onContactClick}
            onSnooze={onSnooze}
            onRemoveContact={onRemoveContact}
            onRetry={onRetry}
            onCampaignClick={(cId) => {
              window.dispatchEvent(new CustomEvent('dashboard:open-campaign', { detail: cId }))
            }}
          />
        </div>
      )
    } else if (id === 'pod-health') {
      elements.push(
        <div key={id} className="widget-enter dashboard-grid-item" style={style}>
          <PodHealthWidget podStats={podStats} dataReady={dataReady} />
        </div>
      )
    } else if (id === 'recent-activity') {
      elements.push(
        <div key={id} className="widget-enter dashboard-grid-item" style={style}>
          <RecentActivityWidget items={recentActivity} onContactClick={onContactClick} />
        </div>
      )
    } else if (id === 'pending-tray') {
      if (pendingContacts.length > 0) {
        elements.push(
          <div key={id} className="widget-enter dashboard-grid-item" style={style}>
            <PendingTrayWidget pendingContacts={pendingContacts} onReview={onReview} />
          </div>
        )
      }
    } else if (id === 'campaign-progress') {
      elements.push(
        <div key={id} className="widget-enter dashboard-grid-item" style={style}>
          <CampaignProgressWidget
            campaigns={campaigns}
            campaignContacts={campaignContacts}
            loading={campaignsLoading}
            onCampaignClick={(cId) => {
              window.dispatchEvent(new CustomEvent('dashboard:open-campaign', { detail: cId }))
            }}
          />
        </div>
      )
    }
  }

  return <div className="dashboard-grid">{elements}</div>
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div>
      <div style={{ background: 'var(--header-band-bg)', padding: '28px 24px 32px', borderRadius: '0 0 20px 20px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div className="skeleton" style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="skeleton" style={{ width: 60, height: 20, background: 'rgba(255,255,255,0.12)', borderRadius: 6 }} />
              <div className="skeleton" style={{ width: 180, height: 14, background: 'rgba(255,255,255,0.12)', borderRadius: 8 }} />
            </div>
          </div>
        </div>
      </div>
      <div className="skeleton-stagger" style={{ maxWidth: 960, margin: '0 auto', padding: '16px 24px 120px' }}>
        {/* Network Health section skeleton */}
        <div className="skeleton" style={{ width: 140, height: 18, borderRadius: 8, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: '100%', height: 100, borderRadius: 12, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: '100%', height: 80, borderRadius: 12, marginBottom: 32 }} />
        {/* Action Items section skeleton */}
        <div className="skeleton" style={{ width: 120, height: 18, borderRadius: 8, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: '100%', height: 90, borderRadius: 14, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: '100%', height: 52, borderRadius: 8, marginBottom: 1 }} />
        <div className="skeleton" style={{ width: '100%', height: 52, borderRadius: 8, marginBottom: 1 }} />
        <div className="skeleton" style={{ width: '100%', height: 52, borderRadius: 8, marginBottom: 32 }} />
      </div>
    </div>
  )
}
