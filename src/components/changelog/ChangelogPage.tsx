import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router'

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return mobile
}

type EntryType = 'feature' | 'fix' | 'design' | 'infra'

interface Entry {
  type: EntryType
  text: string
}

interface Spotlight {
  title: string
  description: string
  icon: string
  gradient: [string, string]
  area: string
  link?: string
}

interface Release {
  version: string
  date: string
  title: string
  summary: string
  spotlights: Spotlight[]
  entries: Entry[]
}

const TYPE_META: Record<EntryType, { label: string; color: string }> = {
  feature: { label: 'New', color: 'var(--color-brand)' },
  fix: { label: 'Fix', color: '#FF9800' },
  design: { label: 'Design', color: '#7B1FA2' },
  infra: { label: 'Infra', color: '#1565C0' },
}

const releases: Release[] = [
  {
    version: 'Alpha 0.2',
    date: 'April 13, 2025',
    title: 'Clarity & Control',
    summary: 'This release focuses on making the app easier to understand and navigate. The Pods map now guides you with richer labels and a visual legend. Settings give you control over preferences. Campaigns and Pipelines are unified. Naming is consistent everywhere.',
    spotlights: [
      {
        title: 'Pods Map Reimagined',
        description: 'Orbs now show contact counts and health status at a glance. A floating legend explains what everything means. Smoother zoom transitions when drilling into pods. The map finally explains itself.',
        icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z',
        gradient: ['#1C1C1E', '#3A3A3C'],
        area: 'Map',
        link: '/pods',
      },
      {
        title: 'Settings Page',
        description: 'A proper settings experience with tabs for Profile, Preferences, Integrations, and Team. Control your default view, dashboard layout, cadence defaults, and more - all in one place.',
        icon: 'M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
        gradient: ['#546E7A', '#37474F'],
        area: 'Settings',
        link: '/account',
      },
      {
        title: 'Unified Campaigns',
        description: 'Pipelines and Campaigns are now one feature. Outreach events and fundraising pipelines live side-by-side. Notes on campaigns. Cleaner, less confusing.',
        icon: 'M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-2 .89-2 2v11c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z',
        gradient: ['#E65100', '#FF9800'],
        area: 'Campaigns',
        link: '/campaigns',
      },
      {
        title: 'Search Quick Actions',
        description: 'Cmd+K now shows quick actions alongside search results. Create a contact, start a campaign, or import a CSV without hunting through menus. The FAB is gone - search is your launcher.',
        icon: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
        gradient: ['#1565C0', '#0D47A1'],
        area: 'Search',
      },
      {
        title: 'Pod Drill-Down Enhanced',
        description: 'Clicking a pod zooms smoothly into it. Category orbs scale by contact count and show health rings. Edges connect categories to the hub with health-encoded gradients. Pods without categories skip straight to their detail page.',
        icon: 'M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z',
        gradient: ['#25B439', '#1A8A2A'],
        area: 'Map',
        link: '/pods',
      },
      {
        title: 'Naming Standardized',
        description: 'Consistent naming across the app. Account is now "Settings." Meeting Notes replaced the old Granola widget. Mobile has a Settings tab. No more mixed terminology.',
        icon: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 000-1.41l-2.34-2.34a.996.996 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
        gradient: ['#7B1FA2', '#4A148C'],
        area: 'Platform',
      },
    ],
    entries: [
      { type: 'feature', text: 'Map legend overlay explains orbs, health rings, and color meanings' },
      { type: 'feature', text: 'Orb labels show contact count and health status (e.g. "12 Steady")' },
      { type: 'feature', text: 'Hub orb uses warmer copy: "Your Network" and "relationships"' },
      { type: 'feature', text: 'Hover tooltips show action hints like "3 people need attention"' },
      { type: 'feature', text: 'Smoother zoom-in transition when clicking a pod' },
      { type: 'feature', text: 'Category orbs dynamically sized by contact volume (56-88px)' },
      { type: 'feature', text: 'Health-encoded gradient edges in pod drill-down view' },
      { type: 'feature', text: 'Pods without categories navigate directly to detail page' },
      { type: 'feature', text: 'Settings page with Profile, Preferences, Integrations, and Team tabs' },
      { type: 'feature', text: 'Preference controls: default view, dashboard preset, cadence defaults' },
      { type: 'feature', text: 'Cmd+K quick actions: create contact, new campaign, import CSV' },
      { type: 'feature', text: 'Campaigns and Pipelines unified into one section' },
      { type: 'feature', text: 'Campaign notes with auto-save' },
      { type: 'feature', text: 'Mobile Settings tab in bottom navigation' },

      { type: 'fix', text: 'Sidebar navigation labels unified with page titles' },
      { type: 'fix', text: 'Sidebar label "Account" renamed to "Settings" to match page title' },
      { type: 'fix', text: 'Widget ID "granola-sync" migrated to "meeting-notes" with localStorage migration' },
      { type: 'fix', text: 'Interaction notes check both meeting_link and legacy granola_link' },
      { type: 'fix', text: 'Mobile nav active state now includes /category/ paths' },
      { type: 'fix', text: 'Green FAB replaced with search palette quick actions' },

      { type: 'design', text: 'Map page header shows global network health summary' },
      { type: 'design', text: 'Improved empty state with pod explanation and dual CTAs' },
      { type: 'design', text: 'Spring-in animation for category orbs with subtle bounce' },
      { type: 'design', text: 'Staggered entrance animations for drill-down nodes' },

      { type: 'infra', text: 'localStorage migration for renamed widget IDs' },
      { type: 'infra', text: 'Deleted legacy GranolaSyncWidget.tsx' },
    ],
  },
  {
    version: 'Alpha 0.1',
    date: 'April 6, 2025',
    title: 'Foundation',
    summary: 'First alpha release. Core relationship management, visual network map, equity scoring, and the full data layer migrated from Airtable to Supabase.',
    spotlights: [
      {
        title: 'Visual Network Map',
        description: 'Your relationships as an interactive orb map. Health-encoded rings show who\'s thriving and who\'s fading. Drill into any pod, search a name and watch their orb pulse.',
        icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z',
        gradient: ['#1C1C1E', '#3A3A3C'],
        area: 'Map',
        link: '/pods',
      },
      {
        title: 'Equity Scoring',
        description: 'Every contact gets a 0-100 health score based on interaction recency and quality. Intros weigh most, notes weigh least. See who needs attention before relationships go cold.',
        icon: 'M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z',
        gradient: ['#25B439', '#1A8A2A'],
        area: 'Scoring',
        link: '/learn',
      },
      {
        title: 'Follow-ups & Focus',
        description: 'Pin follow-ups to contacts, see overdue items on your Dashboard, and let Today\'s Focus tell you exactly who to reach out to based on priority and cadence.',
        icon: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z',
        gradient: ['#FF9800', '#E65100'],
        area: 'Nurturing',
        link: '/dashboard/nurturing',
      },
      {
        title: 'Pod Sharing',
        description: 'Share any pod via a public link. Choose which contacts to include or exclude. Recipients see a clean read-only view - no login required.',
        icon: 'M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z',
        gradient: ['#7B1FA2', '#4A148C'],
        area: 'Sharing',
        link: '/learn',
      },
      {
        title: 'Teams',
        description: 'Multi-team foundation with switcher UI, invite system, and team-scoped data. Collaborate with your team on shared relationship networks.',
        icon: 'M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z',
        gradient: ['#1565C0', '#0D47A1'],
        area: 'Platform',
        link: '/account',
      },
      {
        title: 'Supabase Migration',
        description: 'The entire data layer moved from Airtable to Supabase. Faster queries, real-time subscriptions, proper auth, and no more API rate limits.',
        icon: 'M20 13H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-6c0-.55-.45-1-1-1zM7 19c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM20 3H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1zM7 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z',
        gradient: ['#3ECF8E', '#1C8656'],
        area: 'Infrastructure',
        link: '/account',
      },
    ],
    entries: [
      { type: 'feature', text: 'Collapsible sidebar navigation - map is home, Pulse is your daily view' },
      { type: 'feature', text: 'Renamed "Maps" to "Pods" and "Contacts" to "People" across the UI' },
      { type: 'feature', text: 'Contact detail redesigned as centered two-column modal' },
      { type: 'feature', text: 'Contact enrichment engine with per-field confidence dots' },
      { type: 'feature', text: 'Reports page - pod distribution, pipeline velocity, engagement' },
      { type: 'feature', text: 'Companies page with navigation' },
      { type: 'feature', text: 'Pipeline UI with auto-created stages' },
      { type: 'feature', text: 'Gmail sync integration widget' },
      { type: 'feature', text: 'Column reorder and resize on the people table' },
      { type: 'feature', text: 'Pulse widgets with drag-to-reorder settings' },
      { type: 'feature', text: 'Configurable equity pod cadences' },
      { type: 'feature', text: 'Global search with Cmd+K' },
      { type: 'feature', text: 'CSV import wizard with step-by-step flow' },
      { type: 'feature', text: 'Category icon support' },
      { type: 'feature', text: 'Communication preferences on contacts' },
      { type: 'feature', text: 'Mobile bottom tab bar' },
      { type: 'feature', text: 'Onboarding flow with flexible navigation' },
      { type: 'feature', text: 'Error boundary and 404 page' },

      { type: 'fix', text: 'Contact modal no longer renders behind Pulse content' },
      { type: 'fix', text: 'Dark mode - project cards, replaced hardcoded rgba with CSS vars' },
      { type: 'fix', text: 'Sub-pod member cap enforced correctly' },
      { type: 'fix', text: 'Share popover close behavior and clipboard fallback' },
      { type: 'fix', text: 'Map fits to view on open instead of restoring stale viewport' },
      { type: 'fix', text: 'Sidebar icon alignment and hover centering' },
      { type: 'fix', text: 'Pod card hover clip and mobile map layout' },
      { type: 'fix', text: 'Health rings fade in after orb animation' },
      { type: 'fix', text: 'Breadcrumb navigation and subpod routing' },
      { type: 'fix', text: 'FAB button background and tooltip positioning' },
      { type: 'fix', text: 'Widget reorder rewritten with pointer events' },
      { type: 'fix', text: 'Supabase junction query pagination for large datasets' },

      { type: 'design', text: 'Touch targets expanded to 44px minimum' },
      { type: 'design', text: 'Pulse heading hierarchy corrected' },
      { type: 'design', text: 'Typography - Playfair Display replaced with Fraunces' },

      { type: 'infra', text: 'Airtable-to-Supabase migration script' },
      { type: 'infra', text: 'Security hardening for alpha readiness' },
    ],
  },
]

function countByType(entries: Entry[]): Record<EntryType, number> {
  const counts = { feature: 0, fix: 0, design: 0, infra: 0 }
  for (const e of entries) counts[e.type]++
  return counts
}

export function ChangelogPage() {
  const navigate = useNavigate()

  return (
    <div style={{ padding: '32px 32px 48px', maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{
          display: 'inline-block', padding: '3px 10px', borderRadius: 100,
          background: 'var(--color-brand)', marginBottom: 12,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', letterSpacing: '0.04em' }}>
            ALPHA
          </span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 700,
          color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0,
        }}>
          What's New
        </h1>
        <p style={{
          fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 8, lineHeight: 1.6,
        }}>
          Everything we've shipped, fixed, and improved.
        </p>
      </div>

      {/* Releases */}
      {releases.map((release, i) => (
        <ReleaseBlock key={release.version} release={release} isLatest={i === 0} />
      ))}

      {/* Coming Next */}
      <ComingNext />

      {/* Footer */}
      <div style={{
        marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--edge)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <button
          type="button"
          onClick={() => navigate(-1 as any)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--color-text-secondary)', padding: 0,
            fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2,
          }}
        >
          Go back
        </button>
        <button
          type="button"
          onClick={() => navigate('/learn')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--color-text-secondary)', padding: 0,
            fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2,
          }}
        >
          How it works
        </button>
      </div>
    </div>
  )
}

function ReleaseBlock({ release, isLatest }: { release: Release; isLatest: boolean }) {
  const navigate = useNavigate()
  const mobile = useIsMobile()
  const grouped = groupByType(release.entries)
  const counts = countByType(release.entries)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  const toggleSection = (type: string) => {
    setExpandedSections(prev => ({ ...prev, [type]: !prev[type] }))
  }

  return (
    <div style={{ marginBottom: 48 }}>
      {/* Version header */}
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8,
      }}>
        <h2 style={{
          fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700,
          color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0,
        }}>
          {release.version}
        </h2>
        {isLatest && (
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
            color: 'var(--color-brand)', textTransform: 'uppercase',
          }}>
            Latest
          </span>
        )}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
      }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
          {release.date}
        </span>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
          {release.title}
        </span>
      </div>

      {/* Stats summary */}
      <div style={{
        display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap',
      }}>
        {([
          ['feature', counts.feature, 'features'],
          ['fix', counts.fix, 'fixes'],
          ['design', counts.design, 'design'],
          ['infra', counts.infra, 'infra'],
        ] as const).filter(([, c]) => c > 0).map(([type, count, label]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: TYPE_META[type].color,
            }} />
            <span style={{
              fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 600,
            }}>
              {count}
            </span>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <p style={{
        fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 32px',
        lineHeight: 1.7,
      }}>
        {release.summary}
      </p>

      {/* Spotlight cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: mobile ? '1fr' : 'repeat(2, 1fr)',
        gap: 16,
        marginBottom: 32,
      }}>
        {release.spotlights.map(s => (
          <SpotlightCard
            key={s.title}
            spotlight={s}
            onClick={s.link ? () => navigate(s.link!) : undefined}
          />
        ))}
      </div>

      {/* Collapsible detail sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {(['feature', 'fix', 'design', 'infra'] as EntryType[]).map(type => {
          const entries = grouped[type]
          if (!entries?.length) return null
          const meta = TYPE_META[type]
          const expanded = expandedSections[type] ?? false
          return (
            <CollapsibleSection
              key={type}
              label={meta.label}
              color={meta.color}
              count={entries.length}
              expanded={expanded}
              onToggle={() => toggleSection(type)}
            >
              {entries.map((entry, j) => (
                <div key={j} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span style={{
                    width: 4, height: 4, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--color-text-tertiary)', marginTop: 7,
                  }} />
                  <span style={{
                    fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.5,
                  }}>
                    {entry.text}
                  </span>
                </div>
              ))}
            </CollapsibleSection>
          )
        })}
      </div>
    </div>
  )
}

function CollapsibleSection({
  label, color, count, expanded, onToggle, children,
}: {
  label: string
  color: string
  count: number
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  const measure = useCallback(() => {
    if (contentRef.current) setHeight(contentRef.current.scrollHeight)
  }, [])

  useEffect(() => { measure() }, [expanded, measure])

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', background: 'none', border: 'none',
          borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--tint)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
      >
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0,
        }} />
        <span style={{
          fontSize: 13, fontWeight: 600, color,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          {label}
        </span>
        <span style={{
          fontSize: 12, color: 'var(--color-text-tertiary)',
          background: 'var(--tint)', padding: '1px 8px', borderRadius: 100,
        }}>
          {count}
        </span>
        <svg
          width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          style={{
            marginLeft: 'auto', flexShrink: 0,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div style={{
        overflow: 'hidden',
        maxHeight: expanded ? height : 0,
        opacity: expanded ? 1 : 0,
        transition: 'max-height 0.3s ease, opacity 0.2s ease',
      }}>
        <div
          ref={contentRef}
          style={{
            padding: '8px 16px 16px 34px',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

function SpotlightCard({ spotlight, onClick }: { spotlight: Spotlight; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false)
  const interactive = !!onClick

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? e => { if (e.key === 'Enter') onClick!() } : undefined}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 16, overflow: 'hidden',
        border: '1px solid var(--edge)',
        background: 'var(--nav-bg)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
        cursor: interactive ? 'pointer' : 'default',
      }}
    >
      {/* Gradient hero */}
      <div style={{
        height: 80,
        background: `linear-gradient(135deg, ${spotlight.gradient[0]}, ${spotlight.gradient[1]})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <svg
          width="32" height="32" viewBox="0 0 24 24"
          fill="rgba(255,255,255,0.9)"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
        >
          <path d={spotlight.icon} />
        </svg>
        <span style={{
          position: 'absolute', top: 8, right: 10,
          fontSize: 9, fontWeight: 600, letterSpacing: '0.06em',
          color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase',
        }}>
          {spotlight.area}
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <h3 style={{
            fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)',
            margin: 0, letterSpacing: '-0.01em',
          }}>
            {spotlight.title}
          </h3>
          {interactive && (
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="var(--color-text-tertiary)" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M7 17l9.2-9.2M17 17V7H7" />
            </svg>
          )}
        </div>
        <p style={{
          fontSize: 12, color: 'var(--color-text-secondary)',
          margin: 0, lineHeight: 1.55,
        }}>
          {spotlight.description}
        </p>
      </div>
    </div>
  )
}

const upNext = [
  {
    title: 'Gmail Sync',
    description: 'Email history on contact timelines. New contacts auto-surface in an intake queue for you to approve, assign to a pod, and add context.',
    icon: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
    color: '#E53935',
  },
  {
    title: 'AI Copilot',
    description: 'Ask questions about your network in natural language. "Who should I follow up with?" "Brief me on this person." Answers drawn from your real data.',
    icon: 'M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-2 .9-2 2v3.8h1.5c1.38 0 2.5 1.12 2.5 2.5S4.88 15.8 3.5 15.8H2V19c0 1.1.9 2 2 2h3.8v-1.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5V21H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z',
    color: '#7B1FA2',
  },
  {
    title: 'Calendar Sync',
    description: 'Meetings auto-log to contact timelines. Upcoming meetings surface on Pulse so you always have context before a call.',
    icon: 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
    color: '#1565C0',
  },
  {
    title: 'Sub-Pod Navigation',
    description: 'Click a sub-pod to drill deeper. The selected orb becomes the new center with its contacts fanning out around it. Visual exploration all the way down.',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z',
    color: '#25B439',
  },
]

function ComingNext() {
  return (
    <div style={{
      marginTop: 8, padding: '28px 24px', borderRadius: 16,
      border: '1px dashed var(--edge-strong)',
      background: 'var(--nav-bg)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
      }}>
        <h3 style={{
          fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 700,
          color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0,
        }}>
          Coming Next
        </h3>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
          color: 'var(--color-text-tertiary)', textTransform: 'uppercase',
        }}>
          Alpha 0.3
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {upNext.map(item => (
          <div key={item.title} style={{
            display: 'flex', gap: 14, alignItems: 'flex-start',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: `${item.color}14`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg
                width="18" height="18" viewBox="0 0 24 24"
                fill={item.color}
              >
                <path d={item.icon} />
              </svg>
            </div>
            <div>
              <div style={{
                fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)',
                marginBottom: 3,
              }}>
                {item.title}
              </div>
              <div style={{
                fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.55,
              }}>
                {item.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function groupByType(entries: Entry[]): Partial<Record<EntryType, Entry[]>> {
  const grouped: Partial<Record<EntryType, Entry[]>> = {}
  for (const entry of entries) {
    if (!grouped[entry.type]) grouped[entry.type] = []
    grouped[entry.type]!.push(entry)
  }
  return grouped
}
