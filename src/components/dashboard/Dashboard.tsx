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
} from '../../lib/equity'
import { getUpcomingBirthdays } from '../../lib/birthdays'
import { getSnoozedIds, snoozeContact } from '../../lib/snooze'
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
import { QuickLinksWidget } from './widgets/QuickLinksWidget'
import { GmailSyncWidget } from './widgets/GmailSyncWidget'
import { GranolaSyncWidget } from './widgets/GranolaSyncWidget'

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
  const [snoozedIds, setSnoozedIds] = useState(() => getSnoozedIds())
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignContacts, setCampaignContacts] = useState<CampaignContact[]>([])
  const [campaignsLoading, setCampaignsLoading] = useState(true)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [pendingContacts, setPendingContacts] = useState<Contact[]>([])
  const [showQueue, setShowQueue] = useState(false)

  // Graduated loading — each section loads independently
  useEffect(() => {
    getContacts()
      .then(d => setContacts(d))
      .catch(() => setError('Something hiccupped. Refresh to try again.'))
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
    const now = Date.now()
    const WINDOW_MS = 30 * 24 * 60 * 60 * 1000
    const BUCKETS = 7
    const BUCKET_MS = WINDOW_MS / BUCKETS

    return pods.map(pod => {
      const podContacts = contacts.filter(c => c.list_ids.includes(pod.id))
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
          const age = now - new Date(ix.date).getTime()
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
  }, [pods, contacts, byContact, interactionsLoading])

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
  }, [allInteractions, contacts, pods, byContact])

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
  const upcomingBirthdays = useMemo(() => getUpcomingBirthdays(contacts, pods), [contacts, pods])

  // Follow-up overdue contacts — next_follow_up_date < today
  const followUpOverdue = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return contacts
      .filter(c => c.next_follow_up_date && c.next_follow_up_date < today)
      .map(c => {
        const overdueDays = Math.floor((Date.now() - new Date(c.next_follow_up_date + 'T00:00:00').getTime()) / 86400000)
        const pod = pods.find(p => p.id === c.primary_list_id || c.list_ids.includes(p.id))
        return { contact: c, overdueDays, podName: pod?.name ?? '', action: c.next_action }
      })
      .sort((a, b) => b.overdueDays - a.overdueDays)
  }, [contacts, pods])

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
        const pod = c.list_ids[0] ? (podMap.get(c.list_ids[0]) ?? null) : null
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
      .filter(c => isDormant(c) && !snoozedIds.has(c.id) && !isInGracePeriod(c))
      .map(c => ({ contact: c, days: daysSinceContact(c) }))
      .sort((a, b) => (b.days ?? 999) - (a.days ?? 999)),
    [contacts, snoozedIds]
  )

  // Score trend — compare this week's interactions to last week's
  const scoreTrend = useMemo((): 'up' | 'down' | 'flat' => {
    if (interactionsLoading || allInteractions.length === 0) return 'flat'
    const now = Date.now()
    const oneWeek = 7 * 24 * 60 * 60 * 1000
    const thisWeek = allInteractions.filter(ix => now - new Date(ix.date).getTime() < oneWeek).length
    const lastWeek = allInteractions.filter(ix => {
      const age = now - new Date(ix.date).getTime()
      return age >= oneWeek && age < oneWeek * 2
    }).length
    if (thisWeek > lastWeek) return 'up'
    if (thisWeek < lastWeek) return 'down'
    return 'flat'
  }, [allInteractions, interactionsLoading])

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
  }

  async function refreshCampaigns() {
    invalidateCampaignsCache()
    const updated = await getCampaigns()
    setCampaigns(updated)
    const allCc = await Promise.all(updated.map(c => getCampaignContacts(c.id)))
    setCampaignContacts(allCc.flat())
  }

  const handleContactClick = useCallback((contact: Contact) => setSelectedContact(contact), [])

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

        {/* Green header band */}
        <div style={{ background: 'var(--header-band-bg)', borderRadius: '0 0 20px 20px' }}>
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: isVisible('equity') ? 0 : 0 }}>
              {isVisible('equity') ? (
                <div style={{ flex: 1 }}>
                  <EquityWidget
                    overallScore={overallScore}
                    interactionsLoading={interactionsLoading}
                    dataReady={dataReady}
                    scoreTrend={scoreTrend}
                    onQuickAction={() => {
                      const first = focusItems[0]
                      if (first) setSelectedContact(first.contact)
                    }}
                  />
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
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
                  background: 'rgba(255,255,255,0.15)', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(255,255,255,0.80)', flexShrink: 0,
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
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 24px 120px' }}>

          {/* No pulse yet */}
          {dataReady && !interactionsLoading && pods.length === 0 && contacts.length === 0 && (
            <div style={{
              background: 'var(--surface-panel)', backdropFilter: 'var(--panel-blur)',
              WebkitBackdropFilter: 'var(--panel-blur)', border: 'var(--surface-panel-border)',
              borderRadius: 'var(--panel-radius)', marginBottom: 24,
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

          {/* Order-driven widget rendering */}
          {renderOrderedWidgets({
            order: config.order,
            isVisible,
            podStats, dataReady, wrappedInsights, interactionsLoading,
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
            campaignStatus={campaign.status}
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

// ── Order-driven widget rendering ────────────────────────────────────────────

type PodStat = { pod: Pod; contactCount: number; overdueCount: number; score: number; scoreReady: boolean; sparkline: number[] | null }

interface OrderedWidgetProps {
  order: WidgetId[]
  isVisible: (id: WidgetId) => boolean
  podStats: PodStat[]
  dataReady: boolean
  wrappedInsights: import('./WrappedCard').WrappedInsight[]
  interactionsLoading: boolean
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
  onSnooze: (id: string) => void
  onRemoveContact: (id: string) => Promise<void>
  onRetry: () => void
  onReview: () => void
}

// Section metadata — drives headings and grouping
const SECTION_MAP: Record<string, { heading: string; tooltip: string; tier: 'primary' | 'secondary' | 'tertiary' }> = {
  'action-items': {
    heading: 'your day',
    tooltip: 'Who needs you today -- the people and moments that matter most right now.',
    tier: 'primary',
  },
  'network-pulse': {
    heading: 'network pulse',
    tooltip: 'The big picture -- how your relationship network is doing overall.',
    tier: 'secondary',
  },
  'activity-links': {
    heading: 'activity & links',
    tooltip: 'What you\'ve been up to and where your active outreach stands.',
    tier: 'tertiary',
  },
}

const WIDGET_SECTION: Partial<Record<WidgetId, string>> = {
  'pod-health': 'network-pulse',
  'wrapped': 'network-pulse',
  'todays-focus': 'action-items',
  'coming-up': 'action-items',
  'needs-attention': 'action-items',
  'recent-activity': 'activity-links',
  'quick-links': 'activity-links',
  'gmail-sync': 'activity-links',
  'granola-sync': 'activity-links',
}

function renderOrderedWidgets(props: OrderedWidgetProps) {
  const {
    order, isVisible, podStats, dataReady, wrappedInsights, interactionsLoading,
    focusItems, upcomingItems, overdueContacts, followUpOverdue, dormantContacts,
    contactsLoading, error, recentActivity, campaigns, campaignContacts,
    campaignsLoading, pendingContacts, onContactClick, onSnooze, onRemoveContact, onRetry, onReview,
  } = props

  // Collect sections in order of first appearance
  const sectionOrder: string[] = []
  const sectionWidgets: Record<string, WidgetId[]> = {}
  const standaloneWidgets: WidgetId[] = []

  for (const id of order) {
    if (!isVisible(id)) continue
    const section = WIDGET_SECTION[id]
    if (!section) {
      standaloneWidgets.push(id)
    } else {
      if (!sectionWidgets[section]) {
        sectionWidgets[section] = []
        sectionOrder.push(section)
      }
      sectionWidgets[section].push(id)
    }
  }

  const elements: React.ReactNode[] = []
  let stagger = 0

  // Standalone widgets (pending-tray) render before sections
  for (const id of standaloneWidgets) {
    if (id === 'pending-tray') {
      elements.push(
        <div key={id} className="widget-enter" style={{ '--stagger': stagger++ } as React.CSSProperties}>
          <PendingTrayWidget pendingContacts={pendingContacts} onReview={onReview} />
        </div>
      )
    }
  }

  // Sections in config order
  for (const sectionId of sectionOrder) {
    const widgets = sectionWidgets[sectionId]
    if (!widgets?.length) continue
    const meta = SECTION_MAP[sectionId]

    const isPrimary = meta.tier === 'primary'
    const isTertiary = meta.tier === 'tertiary'

    elements.push(
      <div
        key={sectionId}
        className={`dashboard-section widget-enter${isPrimary ? ' dashboard-section-primary' : ''}`}
        style={{ '--stagger': stagger++ } as React.CSSProperties}
      >
        <div className={isPrimary ? 'dashboard-heading-primary' : 'dashboard-heading'} role="heading" aria-level={2}>
          <span className="widget-tooltip-wrap">
            {meta.heading}
            <span className="widget-tooltip-icon" aria-label="Info">?</span>
            <span className="widget-tooltip-bubble">{meta.tooltip}</span>
          </span>
        </div>
        {widgets.map((id, i) => {
          const spacer = i > 0
          if (id === 'pod-health') {
            return (
              <div key={id} style={{ marginTop: spacer ? 16 : 0 }}>
                <PodHealthWidget podStats={podStats} dataReady={dataReady} />
              </div>
            )
          }
          if (id === 'wrapped') {
            return (
              <div key={id} style={{ marginTop: spacer ? 16 : 0 }}>
                <WrappedWidget insights={wrappedInsights} loading={interactionsLoading} />
              </div>
            )
          }
          if (id === 'todays-focus') {
            return (
              <div key={id} style={{ marginTop: spacer ? 16 : 0 }}>
                <TodaysFocusWidget items={focusItems} onContactClick={onContactClick} />
              </div>
            )
          }
          if (id === 'coming-up') {
            return (
              <div key={id} style={{ marginTop: spacer ? 16 : 0 }}>
                <ComingUpWidget items={upcomingItems} onContactClick={onContactClick} />
              </div>
            )
          }
          if (id === 'needs-attention') {
            return (
              <div key={id} style={{ marginTop: spacer ? 16 : 0 }}>
                <NeedsAttentionWidget
                  overdueContacts={overdueContacts}
                  followUpOverdue={followUpOverdue}
                  dormantContacts={dormantContacts}
                  contactsLoading={contactsLoading}
                  error={error}
                  onContactClick={onContactClick}
                  onSnooze={onSnooze}
                  onRemoveContact={onRemoveContact}
                  onRetry={onRetry}
                />
              </div>
            )
          }
          if (id === 'recent-activity') {
            return (
              <div key={id} style={{ marginTop: spacer ? 16 : 0 }}>
                <RecentActivityWidget items={recentActivity} onContactClick={onContactClick} />
              </div>
            )
          }
          if (id === 'quick-links') {
            return (
              <div key={id} style={{ marginTop: spacer ? 16 : 0 }}>
                <QuickLinksWidget
                  campaigns={campaigns}
                  campaignContacts={campaignContacts}
                  campaignsLoading={campaignsLoading}
                />
              </div>
            )
          }
          if (id === 'gmail-sync') {
            return (
              <div key={id} style={{ marginTop: spacer ? 16 : 0 }}>
                <GmailSyncWidget />
              </div>
            )
          }
          if (id === 'granola-sync') {
            return (
              <div key={id} style={{ marginTop: spacer ? 16 : 0 }}>
                <GranolaSyncWidget />
              </div>
            )
          }
          return null
        })}
      </div>
    )
  }

  return <>{elements}</>
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
        {/* Network Pulse section skeleton */}
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
