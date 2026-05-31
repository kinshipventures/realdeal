import { useCallback, useEffect, useMemo, useState } from 'react'
import { getContacts, getPods, isOverdue, isInGracePeriod, getAllInteractions, deleteContact, getCampaigns, getCampaignContacts, invalidateCampaignsCache, invalidateContactsCache, getPendingContacts } from '../../lib/data'
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
  scoreLabel,
} from '../../lib/equity'
import { getUpcomingBirthdays } from '../../lib/birthdays'
import { isContactSnoozed, snoozeContact } from '../../lib/snooze'
import type { SnoozeDuration } from '../../lib/snooze'
import { useDashboardConfig } from './useDashboardConfig'
import { useAppClock } from '../../hooks/useAppClock'

import type { Contact, Pod, Interaction, Campaign, CampaignContact } from '../../lib/types'
import { ContactDetail } from '../contacts/ContactDetail'
import { CampaignDetail } from '../campaigns/CampaignDetail'
import { EmptyState } from '../empty/EmptyState'
import type { WrappedInsight } from './WrappedCard'
import { PendingTrayWidget } from '../categorization/PendingTrayWidget'
import { CategorizationQueue } from '../categorization/CategorizationQueue'
import { DashboardSettings } from './DashboardSettings'
import { PodHealthWidget } from './widgets/PodHealthWidget'
import { TodaysFocusWidget } from './widgets/TodaysFocusWidget'
import { NeedsAttentionWidget } from './widgets/NeedsAttentionWidget'
import { ComingUpWidget } from './widgets/ComingUpWidget'
import { ThisWeekWidget } from './widgets/ThisWeekWidget'
import { CampaignProgressWidget } from './widgets/CampaignProgressWidget'
import { RadarWidget } from './widgets/RadarWidget'
import { AiInsightsWidget } from './widgets/AiInsightsWidget'

export function Dashboard() {
  const { config, isVisible, toggleWidget, applyPreset, reorderWidgets, setEquityPods } = useDashboardConfig()
  const appClock = useAppClock()
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
  const [focusRefreshSeed, setFocusRefreshSeed] = useState(0)
  const [focusRefreshing, setFocusRefreshing] = useState(false)
  const dashboardNow = appClock.now

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
    () => overallEquityScore(equityPods, contacts, byContact, dashboardNow),
    [equityPods, contacts, byContact, dashboardNow]
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
      const score = podEquityScore(podContacts, byContact, dashboardNow)

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
      score: podEquityScore(contacts.filter(c => c.primary_list_id === p.id), byContact, dashboardNow),
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
  }, [contacts, pods, dashboardNow])

  const focusDateKey = focusRefreshSeed === 0
    ? appClock.todayKey
    : `${appClock.todayKey}:manual:${focusRefreshSeed}`

  // Today's Focus
  const focusItems = useMemo(
    () => todaysFocus(contacts, byContact, pods, 3, dashboardNow, focusDateKey),
    [contacts, byContact, pods, dashboardNow, focusDateKey]
  )

  // Upcoming birthdays
  const upcomingBirthdays = useMemo(() => getUpcomingBirthdays(contacts, pods), [contacts, pods, appClock.todayKey])

  // Follow-up overdue contacts — next_follow_up_date < today
  const followUpOverdue = useMemo(() => {
    const today = appClock.todayKey
    return contacts
      .filter(c => c.next_follow_up_date && c.next_follow_up_date < today)
      .map(c => {
        const overdueDays = Math.floor((dashboardNow - new Date(c.next_follow_up_date + 'T00:00:00').getTime()) / 86400000)
        const pod = getPrimaryPod(c, pods)
        return { contact: c, overdueDays, podName: pod?.name ?? '', action: c.next_action }
      })
      .sort((a, b) => b.overdueDays - a.overdueDays)
  }, [contacts, pods, dashboardNow, appClock.todayKey])

  // Follow-ups due this week (and overdue)
  const followUpItems = useMemo(() => {
    const today = new Date(appClock.todayStartMs)
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
  }, [contacts, pods, appClock.todayStartMs])

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
      .filter(c => isDormant(c, dashboardNow) && !isContactSnoozed(c.snoozed_until) && !isInGracePeriod(c))
      .map(c => ({ contact: c, days: daysSinceContact(c, dashboardNow) }))
      .sort((a, b) => (b.days ?? 999) - (a.days ?? 999)),
    [contacts, dashboardNow]
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

  // Radar dimensions — 5 axes derived from real data
  const radarDimensions = useMemo(() => {
    if (interactionsLoading || contactsLoading || contacts.length === 0) return []

    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    const oneWeek = 7 * 24 * 60 * 60 * 1000

    // Reach: % of contacts with any interaction in last 30 days
    const touchedLast30 = contacts.filter(c => {
      const ixs = byContact.get(c.id) ?? []
      return ixs.some(ix => dashboardNow - new Date(ix.date).getTime() < thirtyDays)
    }).length
    const reach = Math.min(100, Math.round((touchedLast30 / contacts.length) * 100))

    // Consistency: % of contacts NOT overdue relative to their pod cadence
    const overdueCount = overdueContacts.length
    const consistency = Math.min(100, Math.round(((contacts.length - overdueCount) / contacts.length) * 100))

    // Momentum: activity trend score (thisWeek vs last, mapped to 0-100)
    const thisWeekCount = allInteractions.filter(ix => dashboardNow - new Date(ix.date).getTime() < oneWeek).length
    const lastWeekCount = allInteractions.filter(ix => {
      const age = dashboardNow - new Date(ix.date).getTime()
      return age >= oneWeek && age < oneWeek * 2
    }).length
    const momentumRaw = lastWeekCount === 0
      ? (thisWeekCount > 0 ? 80 : 30)
      : Math.round((thisWeekCount / lastWeekCount) * 70)
    const momentum = Math.min(100, Math.max(10, momentumRaw))

    // Depth: % of interactions that are meetings/calls (high-quality)
    const recentIxs = allInteractions.filter(ix => dashboardNow - new Date(ix.date).getTime() < thirtyDays)
    const deepIxs = recentIxs.filter(ix => ix.type === 'meeting' || ix.type === 'call').length
    const depth = recentIxs.length === 0
      ? 50
      : Math.min(100, Math.round((deepIxs / recentIxs.length) * 100) + 20)

    // Warmth: overall equity score directly
    const warmth = overallScore

    return [
      { key: 'reach', label: 'Reach', score: reach, sublabel: `${touchedLast30} touched` },
      { key: 'consistency', label: 'Consistency', score: consistency, sublabel: `${overdueCount} overdue` },
      { key: 'momentum', label: 'Momentum', score: momentum, sublabel: scoreTrend === 'up' ? 'trending up' : scoreTrend === 'down' ? 'trending down' : 'steady' },
      { key: 'depth', label: 'Depth', score: depth, sublabel: `${deepIxs} quality` },
      { key: 'warmth', label: 'Warmth', score: warmth, sublabel: 'equity score' },
    ]
  }, [contacts, byContact, allInteractions, overdueContacts, overallScore, scoreTrend, interactionsLoading, contactsLoading, dashboardNow])

  // People reached this week (for AI insights widget)
  const peopleTouchedThisWeek = useMemo(() => {
    const oneWeek = 7 * 24 * 60 * 60 * 1000
    const ids = new Set(allInteractions.filter(ix => dashboardNow - new Date(ix.date).getTime() < oneWeek).map(ix => ix.contact_id))
    return ids.size
  }, [allInteractions, dashboardNow])

  const topPod = useMemo(() => {
    if (podStats.length === 0) return null
    return [...podStats].sort((a, b) => b.score - a.score)[0]
  }, [podStats])

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

  async function refreshTodaysFocus() {
    if (focusRefreshing) return
    setFocusRefreshing(true)
    setError(null)
    try {
      invalidateContactsCache()
      await appClock.refresh().catch(() => undefined)
      const [updatedContacts, updatedPods, updatedInteractions] = await Promise.all([
        getContacts(),
        getPods(),
        getAllInteractions(),
      ])
      setContacts(updatedContacts)
      setPods(updatedPods)
      setAllInteractions(updatedInteractions)
      setFocusRefreshSeed(seed => seed + 1)
    } catch {
      setError('Something hiccupped. Refresh to try again.')
    } finally {
      setFocusRefreshing(false)
    }
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
      <AiInsightsWidget
        overallScore={overallScore}
        peopleTouched={peopleTouchedThisWeek}
        overdueCount={overdueContacts.length}
        topPodName={topPod?.pod.name}
        topPodScore={topPod?.score}
      />
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

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px 120px' }}>

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

          {/* Gear — floats top-right of hero */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: -36 }}>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              aria-label="Customize dashboard"
              title="Customize dashboard"
              style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'transparent', border: '1px solid var(--edge)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-text-tertiary)', flexShrink: 0,
                transition: 'background 0.15s ease',
                position: 'relative', zIndex: 2,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--tint)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>

          {/* ─── Hero ─── */}
          <section className="dashboard-hero widget-enter" style={{ '--stagger': 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, marginBottom: 32 } as React.CSSProperties}>
            <h1 style={{
              fontFamily: 'var(--font-serif)', fontWeight: 800, fontSize: 'clamp(3rem, 1.7rem + 3.4vw, 4.8rem)',
              margin: 0, letterSpacing: 0, color: 'var(--color-text-primary)', lineHeight: 0.98, textAlign: 'center',
            }}>
              Your network, remembered.
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500 }}>Health</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{scoreLabel(overallScore)}</span>
              <span style={{ display: 'inline-flex', gap: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: overallScore >= 40 ? '#25B439' : 'var(--edge)' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: overallScore >= 70 ? '#25B439' : 'var(--edge)' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: overallScore >= 85 ? '#25B439' : 'var(--edge)' }} />
              </span>
            </div>
            <div style={{ width: '100%' }}>
              <RadarWidget
                dimensions={radarDimensions}
                loading={interactionsLoading || contactsLoading}
                overallScore={overallScore}
                overallLabel={scoreLabel(overallScore)}
              />
            </div>
            <button
              type="button"
              onClick={() => { const first = focusItems[0]; if (first) setSelectedContact(first.contact) }}
              disabled={focusItems.length === 0}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '13px 26px', borderRadius: 8,
                background: 'var(--color-brand)', color: '#FFFFFF',
                border: 'none', cursor: focusItems.length === 0 ? 'default' : 'pointer',
                fontSize: 14, fontWeight: 700, letterSpacing: '0',
                opacity: focusItems.length === 0 ? 0.5 : 1,
                boxShadow: '0 12px 30px rgba(0,61,165,0.22)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                marginTop: 4,
              }}
              onMouseEnter={e => { if (focusItems.length > 0) e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              Log a touch
            </button>
          </section>

          {/* ─── Chapter 1: Core Signals ─── */}
          <ChapterHeader title="Core Signals" />
          <div className="chapter-2up" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 24, alignItems: 'start' }}>
            {isVisible('pod-health') && (
              <div className="widget-enter" style={{ '--stagger': 1 } as React.CSSProperties}>
                <PodHealthWidget podStats={podStats} dataReady={dataReady} />
              </div>
            )}
            {(isVisible('recent-activity') || isVisible('wrapped')) && !interactionsLoading && (
              <div className="widget-enter" style={{ '--stagger': 2 } as React.CSSProperties}>
                <ThisWeekWidget
                  insights={isVisible('wrapped') ? wrappedInsights : []}
                  activity={isVisible('recent-activity') ? recentActivity : []}
                  onContactClick={handleContactClick}
                />
              </div>
            )}
          </div>

          {isVisible('campaign-progress') && (
            <div className="widget-enter" style={{ '--stagger': 3, marginTop: 24 } as React.CSSProperties}>
              <CampaignProgressWidget
                campaigns={campaigns}
                campaignContacts={campaignContacts}
                loading={campaignsLoading}
                onCampaignClick={(cId) => {
                  window.dispatchEvent(new CustomEvent('dashboard:open-campaign', { detail: cId }))
                }}
              />
            </div>
          )}

          {/* ─── Chapter 2: Who Needs Attention ─── */}
          <ChapterHeader title="Who Needs Attention" />
          <div className="chapter-3up" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 24, alignItems: 'start' }}>
            {isVisible('todays-focus') && (
              <div className="widget-enter" style={{ '--stagger': 1 } as React.CSSProperties}>
                <TodaysFocusWidget
                  items={focusItems}
                  onContactClick={handleContactClick}
                  onRefresh={refreshTodaysFocus}
                  refreshing={focusRefreshing}
                />
              </div>
            )}
            {isVisible('needs-attention') && (
              <div className="widget-enter" style={{ '--stagger': 2 } as React.CSSProperties}>
                <NeedsAttentionWidget
                  overdueContacts={overdueContacts}
                  followUpOverdue={followUpOverdue}
                  dormantContacts={dormantContacts}
                  campaigns={campaigns}
                  campaignContacts={campaignContacts}
                  contactsLoading={contactsLoading}
                  error={error}
                  onContactClick={handleContactClick}
                  onSnooze={handleSnooze}
                  onRemoveContact={handleRemoveContact}
                  onRetry={() => {
                    setError(null)
                    setContactsLoading(true)
                    getContacts()
                      .then(d => setContacts(d))
                      .catch(() => setError('Something hiccupped. Refresh to try again.'))
                      .finally(() => setContactsLoading(false))
                  }}
                  onCampaignClick={(cId) => {
                    window.dispatchEvent(new CustomEvent('dashboard:open-campaign', { detail: cId }))
                  }}
                />
              </div>
            )}
            {isVisible('coming-up') && (
              <div className="widget-enter" style={{ '--stagger': 3 } as React.CSSProperties}>
                <ComingUpWidget items={upcomingItems} onContactClick={handleContactClick} />
              </div>
            )}
          </div>

          {/* ─── Chapter 3: In Motion ─── */}
          {pendingContacts.length > 0 && isVisible('pending-tray') && (
            <>
              <ChapterHeader title="In Motion" />
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 24 }}>
                <div className="widget-enter" style={{ '--stagger': 1 } as React.CSSProperties}>
                  <PendingTrayWidget pendingContacts={pendingContacts} onReview={() => setShowQueue(true)} />
                </div>
              </div>
            </>
          )}
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

// ── Chapter Header ───────────────────────────────────────────────────────────

function ChapterHeader({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, margin: '96px 0 40px' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
      <h2 style={{
        fontFamily: 'var(--font-serif)', fontWeight: 800, fontSize: 28,
        color: 'var(--color-text-primary)', margin: 0, letterSpacing: 0,
        whiteSpace: 'nowrap',
      }}>
        {title}
      </h2>
      <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
    </div>
  )
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
