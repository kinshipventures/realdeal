import { useState } from 'react'
import { useNavigate } from 'react-router'
type Section = 'overview' | 'scoring' | 'recency' | 'health' | 'focus' | 'cadence'

const sections: { id: Section; title: string }[] = [
  { id: 'overview', title: 'What is Equity?' },
  { id: 'scoring', title: 'How Scoring Works' },
  { id: 'recency', title: 'Recency Decay' },
  { id: 'health', title: 'Health Labels' },
  { id: 'focus', title: "Today's Focus" },
  { id: 'cadence', title: 'Cadence & Frequency' },
]

export function LearnPage() {
  const navigate = useNavigate()
  const [active, setActive] = useState<Section>('overview')

  return (
    <div style={{ padding: '32px 32px 96px', maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 4,
        }}>
          Learn
        </p>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 700,
          color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0,
        }}>
          How Equity Scoring Works
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 8, lineHeight: 1.6 }}>
          Equity is a measure of relationship health. It tells you who you're investing in,
          who's cooling off, and where to focus next.
        </p>
      </div>

      {/* Section nav */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: '1px solid var(--edge)',
        marginBottom: 32, overflowX: 'auto',
      }}>
        {sections.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActive(s.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 14px', fontSize: 13, fontFamily: 'inherit',
              fontWeight: active === s.id ? 600 : 400,
              color: active === s.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              borderBottom: active === s.id ? '2px solid var(--color-text-primary)' : '2px solid transparent',
              marginBottom: -1, whiteSpace: 'nowrap', transition: 'color 0.15s',
            }}
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* Content */}
      {active === 'overview' && <OverviewSection />}
      {active === 'scoring' && <ScoringSection />}
      {active === 'recency' && <RecencySection />}
      {active === 'health' && <HealthSection />}
      {active === 'focus' && <FocusSection />}
      {active === 'cadence' && <CadenceSection />}

      {/* Back to dashboard */}
      <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--edge)' }}>
        <button
          type="button"
          onClick={() => navigate('/pulse')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--color-text-secondary)', padding: 0,
            fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2,
          }}
        >
          Back to Pulse
        </button>
      </div>
    </div>
  )
}

// ── Overview ────────────────────────────────────────────────────────────────

function OverviewSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Prose>
        Equity scoring answers one question: <strong>how healthy is this relationship right now?</strong>
      </Prose>
      <Prose>
        Every contact gets a score from 0 to 100 based on your recent interactions with them.
        The score reflects both the <em>quality</em> and <em>recency</em> of your engagement.
        An intro you made last week counts more than an email you sent two months ago.
      </Prose>

      <Card title="The core idea">
        <Prose>
          Relationships decay without investment. An equity score quantifies that decay
          so you can see it happening before a relationship goes cold.
        </Prose>
      </Card>

      <Card title="Three levels of equity">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <LevelRow
            label="Contact"
            description="Each person's individual score based on your interaction history with them"
          />
          <LevelRow
            label="Pod"
            description="Average of all contact scores within a pod - tells you how healthy a group is overall"
          />
          <LevelRow
            label="Overall"
            description="Average across your priority pods - your network health at a glance"
          />
        </div>
      </Card>

      <Prose>
        The score is not a judgment of the relationship's importance. A quarterly check-in
        with a mentor can be perfectly healthy at a lower score than a weekly collaborator.
        That's why cadence settings exist - more on that in the Cadence section.
      </Prose>
    </div>
  )
}

// ── Scoring ─────────────────────────────────────────────────────────────────

function ScoringSection() {
  const weights = [
    { type: 'intro', weight: 5, label: 'Intro', why: 'Making a connection for someone is the highest-leverage relationship act' },
    { type: 'meeting', weight: 4, label: 'Meeting', why: 'Face-to-face time builds the deepest trust' },
    { type: 'call', weight: 3, label: 'Call', why: 'Real-time conversation shows genuine investment' },
    { type: 'text', weight: 2, label: 'Text', why: 'Quick, personal, low-friction check-ins' },
    { type: 'email', weight: 2, label: 'Email', why: 'Formal or semi-formal communication' },
    { type: 'note', weight: 0, label: 'Note', why: 'Internal context - doesn\'t represent a real interaction' },
  ]

  const maxWeight = 5

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Prose>
        Each interaction you log adds to a contact's equity score. Not all interactions
        are equal - an intro carries more weight than an email because making a connection
        for someone requires more effort and creates more value.
      </Prose>

      <Card title="Interaction weights">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {weights.map(w => (
            <div key={w.type}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <span style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)',
                  width: 64, flexShrink: 0,
                }}>
                  {w.label}
                </span>
                <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                  {Array.from({ length: maxWeight }).map((_, i) => (
                    <div key={i} style={{
                      width: 24, height: 8, borderRadius: 4,
                      background: i < w.weight ? 'var(--color-brand)' : 'var(--tint)',
                      transition: 'background 0.2s',
                    }} />
                  ))}
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)',
                  width: 16, textAlign: 'right',
                }}>
                  {w.weight}
                </span>
              </div>
              <p style={{
                fontSize: 12, color: 'var(--color-text-tertiary)', margin: '0 0 0 76px',
                lineHeight: 1.4,
              }}>
                {w.why}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="The formula">
        <div style={{
          padding: '16px 20px', borderRadius: 8,
          background: 'var(--tint)', fontFamily: 'monospace', fontSize: 13,
          color: 'var(--color-text-primary)', lineHeight: 1.8,
        }}>
          <div>score = sum of (weight x recency_multiplier) for each interaction</div>
          <div>final = min(score x 5, 100)</div>
        </div>
        <Prose style={{ marginTop: 12 }}>
          The x5 multiplier means a single high-weight recent interaction can meaningfully
          move the needle. Two intros in the last month would contribute 2 x 5 x 1.0 x 5 = 50 points.
        </Prose>
      </Card>

      <Card title="Example">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ExampleRow label="Call 5 days ago" calc="3 x 1.0 = 3.0" />
          <ExampleRow label="Email 20 days ago" calc="2 x 1.0 = 2.0" />
          <ExampleRow label="Meeting 45 days ago" calc="4 x 0.6 = 2.4" />
          <ExampleRow label="Text 80 days ago" calc="2 x 0.3 = 0.6" />
          <div style={{
            borderTop: '1px solid var(--edge)', paddingTop: 8,
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Raw total: 8.0
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-brand)' }}>
              Final score: 40
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>
            8.0 x 5 = 40. This contact is "Cooling" - recent activity but not enough depth.
          </p>
        </div>
      </Card>
    </div>
  )
}

// ── Recency ─────────────────────────────────────────────────────────────────

function RecencySection() {
  const bands = [
    { range: '0 - 30 days', multiplier: '1.0 (100%)', color: 'var(--color-brand)', width: 100, description: 'Full credit. Recent interactions carry their full weight.' },
    { range: '31 - 60 days', multiplier: '0.6 (60%)', color: '#FF9800', width: 60, description: 'Starting to fade. The interaction still counts, but less.' },
    { range: '61 - 90 days', multiplier: '0.3 (30%)', color: '#E53935', width: 30, description: 'Significantly faded. Only high-weight interactions still register.' },
    { range: '90+ days', multiplier: '0 (0%)', color: 'var(--color-text-tertiary)', width: 0, description: 'Gone. Interactions older than 90 days contribute nothing to the score.' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Prose>
        Recency is the other half of the equation. A meeting last week matters more
        than a meeting two months ago. The system uses a <strong>90-day rolling window</strong> with
        three decay bands.
      </Prose>

      <Card title="Recency decay bands">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {bands.map(b => (
            <div key={b.range}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <span style={{
                  fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)',
                  width: 100, flexShrink: 0,
                }}>
                  {b.range}
                </span>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--tint)' }}>
                  {b.width > 0 && (
                    <div style={{
                      width: `${b.width}%`, height: '100%',
                      borderRadius: 4, background: b.color,
                    }} />
                  )}
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 600, color: b.color,
                  width: 70, textAlign: 'right', flexShrink: 0,
                }}>
                  {b.multiplier}
                </span>
              </div>
              <p style={{
                fontSize: 12, color: 'var(--color-text-tertiary)', margin: '0 0 0 112px',
                lineHeight: 1.4,
              }}>
                {b.description}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Why 90 days?">
        <Prose>
          90 days is the longest reasonable cadence for maintaining a professional relationship.
          If you haven't interacted with someone in 3 months, the relationship is effectively
          dormant regardless of how strong it was before. The score should reflect that reality,
          not past glory.
        </Prose>
      </Card>

      <Prose>
        This means equity scores are always forward-looking. They answer "how healthy is
        this relationship right now?" not "how much history do we have?" A 10-year friendship
        with no recent contact will score lower than a new connection you've been actively nurturing.
      </Prose>
    </div>
  )
}

// ── Health Labels ───────────────────────────────────────────────────────────

function HealthSection() {
  const labels = [
    {
      label: 'Thriving', range: '85 - 100', color: '#25B439',
      meaning: 'Strong, active relationship. Multiple recent interactions of varying types.',
      example: 'You had a meeting last week, texted them yesterday, and made an intro for them this month.',
    },
    {
      label: 'Steady', range: '70 - 84', color: '#2196F3',
      meaning: 'Healthy and maintained. Regular contact within expected cadence.',
      example: 'A few calls and emails in the last month. On track but not exceptional.',
    },
    {
      label: 'Cooling', range: '40 - 69', color: '#FF9800',
      meaning: 'Starting to slip. Interactions are becoming less frequent or less substantive.',
      example: 'One email three weeks ago. Still on radar but trending down.',
    },
    {
      label: 'Fading', range: '0 - 39', color: '#E53935',
      meaning: 'At risk. Little to no recent meaningful contact. Needs attention.',
      example: 'Last interaction was a text 2 months ago. The relationship is going cold.',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Prose>
        Every score maps to a health label. These labels appear on contact cards,
        pod health rings, and the dashboard. They're designed to be glanceable -
        you should be able to scan your network health in seconds.
      </Prose>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {labels.map(l => (
          <div key={l.label} style={{
            padding: '16px 20px', borderRadius: 12,
            background: 'var(--nav-bg)', border: '1px solid var(--edge)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%', background: l.color, flexShrink: 0,
              }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: l.color, fontFamily: 'var(--font-serif)' }}>
                {l.label}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>
                {l.range}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-primary)', margin: '0 0 6px', lineHeight: 1.5 }}>
              {l.meaning}
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0, lineHeight: 1.4, fontStyle: 'italic' }}>
              {l.example}
            </p>
          </div>
        ))}
      </div>

      <Card title="Health rings">
        <Prose>
          The colored rings you see on orbs and contact cards are segmented by interaction type.
          Each segment's arc length corresponds to how much that type contributes to the total score.
          A ring that's mostly green (calls) tells a different story than one that's mostly blue (email).
        </Prose>
      </Card>
    </div>
  )
}

// ── Focus ───────────────────────────────────────────────────────────────────

function FocusSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Prose>
        The "Today's Focus" section on your dashboard surfaces the contacts who need
        your attention most. It's not random - it uses a priority-based algorithm.
      </Prose>

      <Card title="How focus picks are chosen">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <StepRow
            number={1}
            title="Priority pods only"
            description="Focus only looks at contacts in pods you've marked as priority. Non-priority pods are excluded."
          />
          <StepRow
            number={2}
            title="Most overdue first"
            description="Contacts are ranked by how far past their cadence they are. Someone 30 days overdue on a weekly cadence ranks higher than someone 5 days overdue on a monthly cadence."
          />
          <StepRow
            number={3}
            title="Serendipity fills the gaps"
            description="If fewer than 3 contacts are overdue, remaining slots are filled with random picks from priority pods. These rotate daily so you reconnect with people you wouldn't otherwise think of."
          />
        </div>
      </Card>

      <Card title="Never contacted = highest urgency">
        <Prose>
          Contacts with no interaction history are always surfaced first. If someone
          is in a priority pod but you've never logged a touchpoint with them, the system
          treats that as maximally overdue.
        </Prose>
      </Card>
    </div>
  )
}

// ── Cadence ─────────────────────────────────────────────────────────────────

function CadenceSection() {
  const cadences = [
    { label: 'Weekly', days: 7, use: 'Close collaborators, active deals, people you talk to all the time' },
    { label: 'Biweekly', days: 14, use: 'Regular contacts who don\'t need weekly attention' },
    { label: 'Monthly', days: 30, use: 'Default. Most professional relationships fall here.' },
    { label: 'Quarterly', days: 90, use: 'Advisors, mentors, seasonal contacts' },
  ]

  const frequencies = [
    { label: 'Weekly', days: 7 },
    { label: 'Monthly', days: 30 },
    { label: 'Quarterly', days: 90 },
    { label: 'Annual', days: 365 },
    { label: 'As Needed', days: 999 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Prose>
        Not every relationship needs the same attention. Cadence controls when a contact
        is considered "overdue" and surfaces in your focus list. There are two layers:
        pod-level cadence and per-contact frequency.
      </Prose>

      <Card title="Pod cadence (group-level)">
        <Prose style={{ marginBottom: 12 }}>
          Set on the pod itself. Every contact in the pod inherits this cadence unless
          they have a personal override.
        </Prose>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cadences.map(c => (
            <div key={c.label} style={{
              display: 'flex', alignItems: 'baseline', gap: 12,
              padding: '8px 12px', borderRadius: 8, background: 'var(--tint)',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', width: 80, flexShrink: 0 }}>
                {c.label}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', width: 50, flexShrink: 0 }}>
                {c.days}d
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                {c.use}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Contact frequency (per-person override)">
        <Prose style={{ marginBottom: 12 }}>
          Set on individual contacts. Overrides the pod cadence for that person only.
          Useful when one person in a "monthly" pod actually needs weekly attention.
        </Prose>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {frequencies.map(f => (
            <div key={f.label} style={{
              padding: '6px 12px', borderRadius: 6, background: 'var(--tint)',
              border: '1px solid var(--edge)',
            }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {f.label}
              </span>
              {f.days < 999 && (
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 6 }}>
                  {f.days}d
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Priority order">
        <Prose>
          When determining a contact's cadence, the system checks in this order:
        </Prose>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          <StepRow number={1} title="Contact cadence override" description="If set, this always wins." />
          <StepRow number={2} title="Contact frequency field" description="Per-contact frequency setting." />
          <StepRow number={3} title="Pod cadence" description="Falls back to the pod's group setting." />
          <StepRow number={4} title="Default: monthly (30 days)" description="If nothing is configured anywhere." />
        </div>
      </Card>
    </div>
  )
}

// ── Shared components ───────────────────────────────────────────────────────

function Prose({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{
      fontSize: 14, color: 'var(--color-text-secondary)', margin: 0,
      lineHeight: 1.7, ...style,
    }}>
      {children}
    </p>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      padding: '20px 24px', borderRadius: 12,
      background: 'var(--nav-bg)', border: '1px solid var(--edge)',
    }}>
      <h3 style={{
        fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)',
        margin: '0 0 12px', letterSpacing: '-0.01em',
      }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function LevelRow({ label, description }: { label: string; description: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
      <span style={{
        fontSize: 13, fontWeight: 600, color: 'var(--color-brand)',
        width: 64, flexShrink: 0,
      }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
        {description}
      </span>
    </div>
  )
}

function ExampleRow({ label, calc }: { label: string; calc: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 0',
    }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--color-text-tertiary)' }}>{calc}</span>
    </div>
  )
}

function StepRow({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        background: 'var(--tint)', border: '1px solid var(--edge)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)',
        flexShrink: 0, marginTop: 1,
      }}>
        {number}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          {description}
        </div>
      </div>
    </div>
  )
}
