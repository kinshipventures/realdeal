import { useCallback, useEffect, useState } from 'react'
import {
  getPods, getContacts, getAllInteractions, getPipelines,
  getPipelineStages, getOpportunities,
} from '@/lib/airtable'
import type { Pod, Contact, Interaction, Pipeline, PipelineStage, Opportunity } from '@/lib/types'
import {
  computePodDistribution, computePipelineVelocity, computeEngagementActivity,
  computeEngagementSummary, podDistributionToCSV, pipelineVelocityToCSV,
  engagementToCSV, getSavedReports, saveReport, deleteSavedReport,
  type PodDistribution, type PipelineVelocityReport, type DayActivity,
  type EngagementSummary, type ReportType, type SavedReportConfig,
} from '@/lib/reporting'
import { Spinner } from '../ui'

type ActiveView = 'overview' | ReportType

const HEALTH_COLORS: Record<string, string> = {
  Thriving: '#25B439',
  Steady: '#2196F3',
  Cooling: '#FF9800',
  Fading: '#E53935',
}

const TYPE_COLORS: Record<string, string> = {
  call: '#2E7D32',
  email: '#1565C0',
  text: '#7B1FA2',
  meeting: '#E65100',
  intro: '#C2185B',
  note: 'var(--color-text-tertiary)',
}

export function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ActiveView>('overview')
  const [days, setDays] = useState(30)

  // Raw data
  const [pods, setPods] = useState<Pod[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])

  // Saved configs
  const [savedReports, setSavedReports] = useState<SavedReportConfig[]>(getSavedReports)

  const load = useCallback(async () => {
    const [p, c, ix, pl, st, op] = await Promise.all([
      getPods(), getContacts(), getAllInteractions(),
      getPipelines(), getPipelineStages(), getOpportunities(),
    ])
    setPods(p); setContacts(c); setInteractions(ix)
    setPipelines(pl); setStages(st); setOpportunities(op)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 300 }}>
        <Spinner />
      </div>
    )
  }

  // Computed reports
  const podDist = computePodDistribution(pods, contacts, interactions)
  const pipelineVel = computePipelineVelocity(pipelines, stages, opportunities)
  const engagementData = computeEngagementActivity(interactions, days)
  const engagementSummary = computeEngagementSummary(engagementData)

  function handleSave(type: ReportType) {
    const names: Record<ReportType, string> = {
      'pod-distribution': 'Pod Distribution',
      'pipeline-velocity': 'Pipeline Velocity',
      'engagement': `Engagement (${days}d)`,
    }
    const config = saveReport({
      name: names[type],
      type,
      ...(type === 'engagement' ? { days } : {}),
    })
    setSavedReports(prev => [...prev, config])
  }

  function handleDeleteSaved(id: string) {
    deleteSavedReport(id)
    setSavedReports(prev => prev.filter(r => r.id !== id))
  }

  function handleLoadSaved(config: SavedReportConfig) {
    setView(config.type)
    if (config.days) setDays(config.days)
  }

  return (
    <div style={{ padding: '32px 32px 96px', maxWidth: 1040, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 4,
        }}>
          Reports
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 700,
            color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0,
          }}>
            {view === 'overview' ? 'Reports' : view === 'pod-distribution' ? 'Pod Distribution' : view === 'pipeline-velocity' ? 'Pipeline Velocity' : 'Engagement Activity'}
          </h1>
          {view !== 'overview' && (
            <button type="button" onClick={() => setView('overview')} style={linkBtnStyle}>
              Back to overview
            </button>
          )}
        </div>
      </div>

      {/* Saved reports */}
      {savedReports.length > 0 && view === 'overview' && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
            Saved Reports
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {savedReports.map(sr => (
              <div key={sr.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 12px', borderRadius: 8,
                background: 'var(--tint)', border: '1px solid var(--edge)',
              }}>
                <button type="button" onClick={() => handleLoadSaved(sr)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)',
                  padding: 0, fontFamily: 'inherit',
                }}>
                  {sr.name}
                </button>
                <button type="button" onClick={() => handleDeleteSaved(sr.id)} aria-label="Remove" style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-tertiary)', padding: 0, lineHeight: 1,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Hero card - Engagement spans full width */}
          <ReportCard
            title="Engagement Activity"
            subtitle={engagementSummary.totalInteractions > 0
              ? `${engagementSummary.totalInteractions} interactions across ${engagementSummary.activeDays} active days`
              : 'Start logging interactions to see your activity'
            }
            onClick={() => setView('engagement')}
            hero
          >
            <MiniSparkline data={engagementData} />
          </ReportCard>
          {/* Secondary cards side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            <ReportCard
              title="Pod Distribution"
              subtitle={`${pods.length} pods, ${contacts.length} people`}
              onClick={() => setView('pod-distribution')}
            >
              <MiniPodBars data={podDist} />
            </ReportCard>
            <ReportCard
              title="Pipeline Velocity"
              subtitle={`${pipelines.length} pipeline${pipelines.length !== 1 ? 's' : ''}, ${opportunities.length} opportunities`}
              onClick={() => setView('pipeline-velocity')}
            >
              <MiniPipelineSummary data={pipelineVel} />
            </ReportCard>
          </div>
        </div>
      )}

      {view === 'pod-distribution' && (
        <PodDistributionView
          data={podDist}
          onExport={() => podDistributionToCSV(podDist)}
          onSave={() => handleSave('pod-distribution')}
        />
      )}

      {view === 'pipeline-velocity' && (
        <PipelineVelocityView
          data={pipelineVel}
          onExport={() => pipelineVelocityToCSV(pipelineVel)}
          onSave={() => handleSave('pipeline-velocity')}
        />
      )}

      {view === 'engagement' && (
        <EngagementView
          data={engagementData}
          summary={engagementSummary}
          days={days}
          onDaysChange={setDays}
          onExport={() => engagementToCSV(engagementData)}
          onSave={() => handleSave('engagement')}
        />
      )}
    </div>
  )
}

// ── Report card (overview) ──────────────────────────────────────────────────

function ReportCard({ title, subtitle, onClick, children, hero }: {
  title: string
  subtitle: string
  onClick: () => void
  children: React.ReactNode
  hero?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      role="button" tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hero ? 'var(--color-brand)' : 'var(--nav-bg)',
        border: hero ? 'none' : '1px solid var(--edge)',
        borderRadius: hero ? 16 : 12,
        padding: hero ? '24px 24px 20px' : 20,
        cursor: 'pointer',
        transition: 'box-shadow 0.15s, transform 0.15s',
        boxShadow: hovered
          ? hero ? '0 8px 32px rgba(37,180,57,0.24)' : '0 4px 16px rgba(0,0,0,0.18)'
          : hero ? '0 2px 12px rgba(37,180,57,0.12)' : 'none',
        transform: hovered ? 'translateY(-1px)' : 'none',
      }}
    >
      <h2 style={{
        fontFamily: 'var(--font-serif)', fontSize: hero ? 17 : 15, fontWeight: 600,
        color: hero ? '#fff' : 'var(--color-text-primary)', margin: '0 0 4px',
      }}>
        {title}
      </h2>
      <p style={{ fontSize: 12, color: hero ? 'rgba(255,255,255,0.70)' : 'var(--color-text-secondary)', margin: '0 0 16px' }}>
        {subtitle}
      </p>
      {hero ? (
        <div style={{ opacity: 0.9, filter: 'brightness(2.5) saturate(0)' }}>
          {children}
        </div>
      ) : children}
    </div>
  )
}

// ── Mini visualizations (card previews) ─────────────────────────────────────

function MiniPodBars({ data }: { data: PodDistribution[] }) {
  const max = Math.max(1, ...data.map(d => d.contactCount))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {data.slice(0, 5).map(d => (
        <div key={d.podId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', width: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {d.podName}
          </span>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--tint)' }}>
            <div style={{
              width: `${(d.contactCount / max) * 100}%`,
              height: '100%', borderRadius: 3,
              background: d.color || 'var(--color-brand)',
            }} />
          </div>
          <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', width: 20, textAlign: 'right' }}>{d.contactCount}</span>
        </div>
      ))}
      {data.length > 5 && (
        <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>+{data.length - 5} more</span>
      )}
    </div>
  )
}

function MiniPipelineSummary({ data }: { data: PipelineVelocityReport[] }) {
  if (data.length === 0) {
    return <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>No pipelines</p>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.slice(0, 3).map(p => (
        <div key={p.pipelineId}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 2 }}>
            {p.pipelineName}
          </div>
          <div style={{ display: 'flex', gap: 2, height: 4, borderRadius: 2, overflow: 'hidden' }}>
            {p.stages.map(s => (
              <div key={s.stageId} style={{
                flex: Math.max(s.count, 0.5),
                background: s.color || 'var(--color-brand)',
                borderRadius: 1,
              }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function MiniSparkline({ data }: { data: DayActivity[] }) {
  const max = Math.max(1, ...data.map(d => d.total))
  // Show last 30 bars
  const recent = data.slice(-30)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 32 }}>
      {recent.map(d => (
        <div key={d.date} style={{
          flex: 1,
          height: `${Math.max((d.total / max) * 100, 2)}%`,
          background: d.total > 0 ? 'var(--color-brand)' : 'var(--tint)',
          borderRadius: 1,
          minWidth: 2,
        }} />
      ))}
    </div>
  )
}

// ── Full report views ───────────────────────────────────────────────────────

function ReportToolbar({ onExport, onSave }: { onExport: () => void; onSave: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
      <button type="button" onClick={onExport} style={actionBtnStyle}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Export CSV
      </button>
      <button type="button" onClick={onSave} style={actionBtnStyle}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
        Save
      </button>
    </div>
  )
}

function PodDistributionView({ data, onExport, onSave }: {
  data: PodDistribution[]
  onExport: () => void
  onSave: () => void
}) {
  const max = Math.max(1, ...data.map(d => d.contactCount))

  return (
    <div>
      <ReportToolbar onExport={onExport} onSave={onSave} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map(d => (
          <div key={d.podId} style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '12px 16px', borderRadius: 10,
            background: 'var(--nav-bg)', border: '1px solid var(--edge)',
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: d.color || 'var(--color-text-tertiary)', flexShrink: 0,
            }} />
            <div style={{ width: 140, flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{d.podName}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{d.contactCount} {d.contactCount !== 1 ? 'people' : 'person'}</div>
            </div>

            {/* Stacked health bar */}
            <div style={{ flex: 1, display: 'flex', gap: 1, height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--tint)' }}>
              {(['Thriving', 'Steady', 'Cooling', 'Fading'] as const).map(label => {
                const pct = d.contactCount > 0 ? (d.health[label] / max) * 100 : 0
                return pct > 0 ? (
                  <div key={label} style={{ width: `${pct}%`, background: HEALTH_COLORS[label], transition: 'width 0.3s' }} />
                ) : null
              })}
            </div>

            {/* Health numbers */}
            <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
              {(['Thriving', 'Steady', 'Cooling', 'Fading'] as const).map(label => (
                <div key={label} style={{ textAlign: 'center', minWidth: 32 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: HEALTH_COLORS[label] }}>{d.health[label]}</div>
                  <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PipelineVelocityView({ data, onExport, onSave }: {
  data: PipelineVelocityReport[]
  onExport: () => void
  onSave: () => void
}) {
  return (
    <div>
      <ReportToolbar onExport={onExport} onSave={onSave} />
      {data.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center', padding: '32px 0' }}>No pipelines to report on.</p>
      )}
      {data.map(p => (
        <div key={p.pipelineId} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
              {p.pipelineName}
            </h3>
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              {p.totalOpportunities} opportunit{p.totalOpportunities !== 1 ? 'ies' : 'y'}
            </span>
          </div>

          {/* Funnel visualization */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {p.stages.map(s => {
              const max = Math.max(1, ...p.stages.map(st => st.count))
              const pct = Math.max((s.count / max) * 100, 8)
              return (
                <div key={s.stageId} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 120, flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{s.stageName}</div>
                  </div>
                  <div style={{ flex: 1, height: 24, borderRadius: 6, background: 'var(--tint)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', borderRadius: 6,
                      background: s.color || 'var(--color-brand)',
                      display: 'flex', alignItems: 'center', paddingLeft: 8,
                      transition: 'width 0.3s',
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{s.count}</span>
                    </div>
                  </div>
                  <div style={{ width: 80, flexShrink: 0, textAlign: 'right' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                      {s.avgDaysInStage != null ? `${s.avgDaysInStage}d avg` : '-'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function EngagementView({ data, summary, days, onDaysChange, onExport, onSave }: {
  data: DayActivity[]
  summary: EngagementSummary
  days: number
  onDaysChange: (d: number) => void
  onExport: () => void
  onSave: () => void
}) {
  const max = Math.max(1, ...data.map(d => d.total))

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[7, 14, 30, 60, 90].map(d => (
            <button key={d} type="button" onClick={() => onDaysChange(d)} style={{
              padding: '4px 10px', borderRadius: 6,
              fontSize: 12, fontWeight: days === d ? 600 : 400,
              background: days === d ? 'var(--tint-hover)' : 'transparent',
              border: days === d ? '1px solid var(--edge)' : '1px solid transparent',
              color: days === d ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {d}d
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <ReportToolbar onExport={onExport} onSave={onSave} />
      </div>

      {/* Summary stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12, marginBottom: 24,
      }}>
        <StatCard label="Total" value={String(summary.totalInteractions)} />
        <StatCard label="Active days" value={String(summary.activeDays)} />
        <StatCard label="Avg/day" value={String(summary.avgPerDay)} />
        {Object.entries(summary.byType)
          .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
          .slice(0, 3)
          .map(([type, count]) => (
            <StatCard key={type} label={type} value={String(count ?? 0)} color={TYPE_COLORS[type]} />
          ))
        }
      </div>

      {/* Bar chart */}
      <div style={{
        padding: '16px 20px', borderRadius: 12,
        background: 'var(--nav-bg)', border: '1px solid var(--edge)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120 }}>
          {data.map(d => {
            const pct = d.total > 0 ? Math.max((d.total / max) * 100, 3) : 0
            return (
              <div key={d.date} title={`${d.date}: ${d.total}`} style={{
                flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                height: '100%', minWidth: 2,
              }}>
                <div style={{
                  height: `${pct}%`,
                  background: d.total > 0 ? 'var(--color-brand)' : 'var(--tint)',
                  borderRadius: 2,
                  transition: 'height 0.2s',
                }} />
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{data[0]?.date}</span>
          <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{data[data.length - 1]?.date}</span>
        </div>
      </div>

      {/* Type breakdown legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
        {Object.entries(summary.byType)
          .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
          .map(([type, count]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLORS[type] || 'var(--color-text-tertiary)' }} />
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{type}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>{count}</span>
            </div>
          ))
        }
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      padding: '12px 16px', borderRadius: 10,
      background: 'var(--nav-bg)', border: '1px solid var(--edge)',
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || 'var(--color-text-primary)', fontFamily: 'var(--font-serif)' }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textTransform: 'capitalize', marginTop: 2 }}>
        {label}
      </div>
    </div>
  )
}

// ── Shared styles ───────────────────────────────────────────────────────────

const actionBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '6px 12px', borderRadius: 8,
  background: 'none', border: '1px solid var(--edge)',
  fontSize: 12, fontWeight: 500, cursor: 'pointer',
  color: 'var(--color-text-secondary)', fontFamily: 'inherit',
}

const linkBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 13, color: 'var(--color-text-secondary)',
  fontFamily: 'inherit', padding: 0, textDecoration: 'underline',
  textUnderlineOffset: 2,
}
