import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { getAllCampaigns, getContacts } from '../../lib/airtable'
import type { Campaign, Contact } from '../../lib/types'
import { CampaignCreate } from './CampaignCreate'
import { CampaignTypeIcon } from './CampaignTypeIcon'
import { EmptyState } from '../empty/EmptyState'
import { TYPE_LABELS, TYPE_COLORS, daysUntil } from './campaignUtils'
import { Avatar } from '../ui'
import { LayoutGrid, List } from 'lucide-react'

const VIEW_KEY = 'realdeal:campaigns-view'
const SORT_KEY = 'realdeal:campaigns-sort'
const GROUP_KEY = 'realdeal:campaigns-group'

type SortKey = 'newest' | 'name' | 'deadline' | 'contacts'
type GroupKey = 'none' | 'type' | 'deadline'

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'newest', label: 'Newest first' },
  { key: 'name', label: 'Name' },
  { key: 'deadline', label: 'Deadline' },
  { key: 'contacts', label: 'Most people' },
]

const GROUP_OPTIONS: Array<{ key: GroupKey; label: string }> = [
  { key: 'none', label: 'No grouping' },
  { key: 'type', label: 'Group by type' },
  { key: 'deadline', label: 'Group by deadline' },
]

export function CampaignOverview() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState<'active' | 'completed'>('active')
  const [view, setView] = useState<'grid' | 'list'>(() =>
    (localStorage.getItem(VIEW_KEY) as 'grid' | 'list') || 'grid'
  )
  const [sort, setSort] = useState<SortKey>(() =>
    (localStorage.getItem(SORT_KEY) as SortKey) || 'newest'
  )
  const [groupBy, setGroupBy] = useState<GroupKey>(() =>
    (localStorage.getItem(GROUP_KEY) as GroupKey) || 'none'
  )

  const load = useCallback(async () => {
    const [c, ct] = await Promise.all([getAllCampaigns(), getContacts()])
    setCampaigns(c)
    setContacts(ct)
    setLoading(false)
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  function toggleView(v: 'grid' | 'list') {
    setView(v)
    localStorage.setItem(VIEW_KEY, v)
  }

  function handleSortChange(next: SortKey) {
    setSort(next)
    localStorage.setItem(SORT_KEY, next)
  }

  function handleGroupChange(next: GroupKey) {
    setGroupBy(next)
    localStorage.setItem(GROUP_KEY, next)
  }

  const filtered = useMemo(
    () => campaigns.filter(c => c.status === filter),
    [campaigns, filter]
  )

  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => compareCampaigns(a, b, sort))
    return list
  }, [filtered, sort])

  const grouped = useMemo(() => groupCampaigns(sorted, groupBy), [sorted, groupBy])

  if (loading) return <OverviewSkeleton />

  return (
    <div className="content-enter" style={{ padding: '28px clamp(16px, 4vw, 32px) 96px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-sans)', fontSize: 28, fontWeight: 800,
            margin: 0, color: 'var(--color-text-primary)', letterSpacing: '-0.03em',
          }}>
            Campaigns
          </h1>
          <p style={{
            margin: '6px 0 0', fontSize: 13, color: 'var(--color-text-tertiary)',
            lineHeight: 1.4,
          }}>
            Track events, fundraises, outreach, and deals from start to finish.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          style={{
            fontSize: 13, fontWeight: 600, padding: '8px 18px',
            borderRadius: 10, border: 'none',
            background: 'var(--color-brand)', color: '#ffffff',
            cursor: 'pointer', fontFamily: 'inherit',
            flexShrink: 0, marginTop: 4,
          }}
        >
          + New Campaign
        </button>
      </div>

      {creating && (
        <CampaignCreate
          onCreated={(campaign) => {
            setCampaigns(prev => [...prev, campaign])
            setCreating(false)
            navigate(`/campaigns/${campaign.id}`)
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {/* Filter + organization controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatusToggle active={filter} onChange={setFilter} />
        <div style={{ flex: 1, minWidth: 12 }} />
        <ControlSelect
          label="Sort"
          value={sort}
          onChange={(value) => handleSortChange(value as SortKey)}
          options={SORT_OPTIONS}
        />
        <ControlSelect
          label="Group"
          value={groupBy}
          onChange={(value) => handleGroupChange(value as GroupKey)}
          options={GROUP_OPTIONS}
        />
        <div style={{ display: 'flex', gap: 2, background: 'var(--tint)', borderRadius: 8, padding: 2 }}>
          <button
            type="button"
            onClick={() => toggleView('grid')}
            style={{
              padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: view === 'grid' ? 'var(--surface-panel)' : 'transparent',
              color: view === 'grid' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              display: 'flex', alignItems: 'center',
              boxShadow: view === 'grid' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            type="button"
            onClick={() => toggleView('list')}
            style={{
              padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: view === 'list' ? 'var(--surface-panel)' : 'transparent',
              color: view === 'list' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              display: 'flex', alignItems: 'center',
              boxShadow: view === 'list' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="5" height="18" rx="1"/><rect x="9.5" y="6" width="5" height="15" rx="1"/><rect x="17" y="9" width="5" height="12" rx="1"/></svg>}
          heading={filter === 'active' ? 'No active campaigns' : 'No completed campaigns'}
          subtext={filter === 'active'
            ? "Campaigns track concrete projects like events, fundraises, and outreach."
            : "Completed campaigns will appear here."}
          ctaLabel={filter === 'active' ? "+ New Campaign" : undefined}
          onCta={filter === 'active' ? () => setCreating(true) : undefined}
          ghosts={2}
        />
      ) : view === 'grid' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {grouped.map((group) => (
            <section key={group.key}>
              {groupBy !== 'none' && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-tertiary)',
                    marginBottom: 4,
                  }}>
                    {group.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {group.items.length} {group.items.length === 1 ? 'campaign' : 'campaigns'}
                  </div>
                </div>
              )}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 16,
              }}>
                {group.items.map((c, i) => (
                  <CampaignCard
                    key={c.id}
                    campaign={c}
                    contacts={contacts}
                    onClick={() => navigate(`/campaigns/${c.id}`)}
                    stagger={i}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <CampaignListTable groups={grouped} groupBy={groupBy} onRowClick={(id) => navigate(`/campaigns/${id}`)} />
      )}
    </div>
  )
}

// -- Card --

function CampaignCard({ campaign, contacts, onClick, stagger = 0 }: {
  campaign: Campaign
  contacts: Contact[]
  onClick: () => void
  stagger?: number
}) {
  const campContacts = contacts.filter(c => campaign.contact_ids.includes(c.id))
  const typeColor = TYPE_COLORS[campaign.type]
  const deadlineDays = campaign.deadline ? daysUntil(campaign.deadline) : null
  const isUrgent = deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 7
  const isOverdue = deadlineDays !== null && deadlineDays < 0

  return (
    <button
      type="button"
      onClick={onClick}
      className="campaign-card-enter campaign-overview-card"
      style={{
        '--stagger': stagger,
        background: 'var(--surface-panel)',
        border: '1px solid var(--edge)',
        borderRadius: 14, padding: '18px 20px', textAlign: 'left',
        cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', flexDirection: 'column', gap: 14,
      } as React.CSSProperties}
      onMouseEnter={e => {
        e.currentTarget.style.background = `${typeColor}08`
        e.currentTarget.style.borderColor = `${typeColor}30`
        e.currentTarget.style.boxShadow = `0 2px 12px ${typeColor}10`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--surface-panel)'
        e.currentTarget.style.borderColor = 'var(--edge)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Top row: icon + type + deadline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <CampaignTypeIcon type={campaign.type} size={16} colored />
        <span style={{
          fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 100,
          background: `${typeColor}15`,
          color: typeColor,
        }}>
          {TYPE_LABELS[campaign.type]}
        </span>
        {campaign.deadline && (
          <span style={{
            fontSize: 11, fontWeight: isUrgent || isOverdue ? 600 : 400,
            color: isOverdue ? '#D93025' : isUrgent ? '#FF9500' : 'var(--color-text-tertiary)',
            marginLeft: 'auto',
            ...(isOverdue ? { background: 'rgba(217,48,37,0.08)', padding: '1px 6px', borderRadius: 4 } : {}),
          }}>
            {formatDeadline(campaign.deadline)}
          </span>
        )}
      </div>

      {/* Name */}
      <div style={{
        fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-sans)', letterSpacing: '-0.02em',
      }}>
        {campaign.name}
      </div>

      {/* Description preview */}
      {campaign.description && (
        <div style={{
          fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.4,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {campaign.description}
        </div>
      )}

      {/* Footer: avatars + count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {campContacts.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {campContacts.slice(0, 5).map((c, i) => (
              <div key={c.id} style={{ marginLeft: i > 0 ? -6 : 0, zIndex: 5 - i }}>
                <Avatar name={c.name} size={22} />
              </div>
            ))}
          </div>
        )}
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          {campaign.contact_ids.length} {campaign.contact_ids.length === 1 ? 'contact' : 'contacts'}
        </span>
      </div>
    </button>
  )
}

// -- List Table --

function CampaignListTable({ groups, groupBy, onRowClick }: {
  groups: Array<{ key: string; label: string; items: Campaign[] }>
  groupBy: GroupKey
  onRowClick: (id: string) => void
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--edge)' }}>
            {['Name', 'Type', 'Status', 'Contacts', 'Deadline'].map(h => (
              <th key={h} style={{
                textAlign: 'left', padding: '8px 12px',
                fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group, groupIndex) => (
            <>
              {groupBy !== 'none' && (
                <tr key={`${group.key}-label`} style={{ borderBottom: '1px solid var(--edge)' }}>
                  <td colSpan={5} style={{ padding: '10px 12px', background: 'var(--tint)' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
                      {group.label}
                    </div>
                  </td>
                </tr>
              )}
              {group.items.map((c, i) => (
                <tr
                  key={c.id}
                  onClick={() => onRowClick(c.id)}
                  className="campaign-card-enter"
                  style={{ '--stagger': i + groupIndex, borderBottom: '1px solid var(--edge)', cursor: 'pointer' } as React.CSSProperties}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--tint)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    {c.name}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 12, color: TYPE_COLORS[c.type],
                    }}>
                      <CampaignTypeIcon type={c.type} size={12} colored />
                      {TYPE_LABELS[c.type]}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 100,
                      background: c.status === 'active' ? 'rgba(72,187,120,0.1)' : 'var(--tint)',
                      color: c.status === 'active' ? '#48BB78' : 'var(--color-text-tertiary)',
                    }}>
                      {c.status === 'active' ? 'Active' : 'Completed'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>
                    {c.contact_ids.length}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-text-tertiary)', fontSize: 12 }}>
                    {c.deadline ? formatDeadline(c.deadline) : '-'}
                  </td>
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ControlSelect({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ key: string; label: string }>
}) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 10px',
      borderRadius: 10,
      background: 'var(--surface-panel)',
      border: '1px solid var(--edge)',
    }}>
      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: 'none',
          background: 'transparent',
          color: 'var(--color-text-primary)',
          fontSize: 12,
          fontFamily: 'inherit',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

// -- Helpers --

function formatDeadline(d: string): string {
  const days = daysUntil(d)
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function compareCampaigns(a: Campaign, b: Campaign, sort: SortKey): number {
  if (sort === 'name') return a.name.localeCompare(b.name)
  if (sort === 'contacts') return b.contact_ids.length - a.contact_ids.length || a.name.localeCompare(b.name)
  if (sort === 'deadline') {
    const aDays = a.deadline ? daysUntil(a.deadline) : Number.POSITIVE_INFINITY
    const bDays = b.deadline ? daysUntil(b.deadline) : Number.POSITIVE_INFINITY
    return aDays - bDays || a.name.localeCompare(b.name)
  }
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
}

function deadlineGroupLabel(campaign: Campaign): string {
  if (!campaign.deadline) return 'No deadline'
  const days = daysUntil(campaign.deadline)
  if (days < 0) return 'Overdue'
  if (days <= 7) return 'Due this week'
  if (days <= 30) return 'Due this month'
  return 'Later'
}

function groupCampaigns(campaigns: Campaign[], groupBy: GroupKey): Array<{ key: string; label: string; items: Campaign[] }> {
  if (groupBy === 'none') return [{ key: 'all', label: 'All campaigns', items: campaigns }]

  const grouped = new Map<string, Campaign[]>()
  for (const campaign of campaigns) {
    const key = groupBy === 'type' ? campaign.type : deadlineGroupLabel(campaign)
    const existing = grouped.get(key)
    if (existing) existing.push(campaign)
    else grouped.set(key, [campaign])
  }

  return Array.from(grouped.entries()).map(([key, items]) => ({
    key,
    label: groupBy === 'type' ? TYPE_LABELS[key as keyof typeof TYPE_LABELS] : key,
    items,
  }))
}

function StatusToggle({ active, onChange }: { active: 'active' | 'completed'; onChange: (v: 'active' | 'completed') => void }) {
  return (
    <div style={{
      display: 'flex', gap: 0,
      background: 'var(--tint)', borderRadius: 8,
      padding: 2, flexShrink: 0,
    }}>
      {(['active', 'completed'] as const).map(s => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          style={{
            fontSize: 12, fontWeight: active === s ? 600 : 400,
            padding: '5px 12px', borderRadius: 6,
            border: 'none', cursor: 'pointer',
            fontFamily: 'inherit',
            background: active === s ? 'var(--surface-panel)' : 'transparent',
            color: active === s ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
            boxShadow: active === s ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.12s',
          }}
        >
          {s === 'active' ? 'Active' : 'Completed'}
        </button>
      ))}
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="skeleton-stagger" style={{ padding: '28px clamp(16px, 4vw, 32px) 96px' }}>
      <div className="skeleton" style={{ width: 160, height: 28, borderRadius: 8, marginBottom: 24 }} />
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 16,
      }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 160, borderRadius: 14 }} />
        ))}
      </div>
    </div>
  )
}
