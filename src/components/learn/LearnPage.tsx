import { useState } from 'react'
import { useNavigate } from 'react-router'

type Topic = 'start' | 'pods' | 'relationships' | 'campaigns' | 'interactions' | 'scoring' | 'focus' | 'sharing'

const topics: { id: Topic; title: string; subtitle: string; icon: string; color: string }[] = [
  { id: 'start', title: 'Getting Started', subtitle: 'What this is and how to use it', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', color: 'var(--color-brand)' },
  { id: 'pods', title: 'Pods', subtitle: 'Organize your people into groups', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75', color: '#7B1FA2' },
  { id: 'relationships', title: 'Relationships', subtitle: 'People and companies in your network', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', color: '#1565C0' },
  { id: 'campaigns', title: 'Campaigns', subtitle: 'Track events, fundraises, and outreach', icon: 'M2 3h5v18H2zM9.5 6h5v15h-5zM17 9h5v12h-5z', color: '#E91E63' },
  { id: 'interactions', title: 'Logging Interactions', subtitle: 'Track how you stay in touch', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', color: '#1565C0' },
  { id: 'scoring', title: 'Equity Scoring', subtitle: 'How relationship health is measured', icon: 'M22 12h-4l-3 9L9 3l-3 9H2', color: '#25B439' },
  { id: 'focus', title: 'Focus & Nurturing', subtitle: 'Who to reach out to and when', icon: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2', color: '#FF9800' },
  { id: 'sharing', title: 'Sharing & Import', subtitle: 'Share pods and bring in contacts', icon: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13', color: '#E53935' },
]

export function LearnPage() {
  const navigate = useNavigate()
  const [active, setActive] = useState<Topic | null>(null)

  return (
    <div style={{ padding: '32px 32px 48px', maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 700,
          color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0,
        }}>
          How It Works
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 8, lineHeight: 1.6 }}>
          Everything you need to know about keeping your relationships healthy.
        </p>
      </div>

      {/* Topic cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 12, marginBottom: 32,
      }}>
        {topics.map(t => (
          <TopicCard
            key={t.id}
            topic={t}
            selected={active === t.id}
            onClick={() => setActive(active === t.id ? null : t.id)}
          />
        ))}
      </div>

      {/* Content */}
      {active === 'start' && <StartSection />}
      {active === 'pods' && <PodsSection />}
      {active === 'relationships' && <RelationshipsSection />}
      {active === 'campaigns' && <CampaignsSection />}
      {active === 'interactions' && <InteractionsSection />}
      {active === 'scoring' && <ScoringSection />}
      {active === 'focus' && <FocusSection />}
      {active === 'sharing' && <SharingSection />}

      {!active && (
        <div style={{
          padding: '32px 24px', borderRadius: 12, background: 'var(--nav-bg)',
          border: '1px solid var(--edge)', textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
            Pick a topic above to learn more.
          </p>
        </div>
      )}

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
          onClick={() => navigate('/changelog')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--color-text-secondary)', padding: 0,
            fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2,
          }}
        >
          See what's new
        </button>
      </div>
    </div>
  )
}

// ── Topic Card ─────────────────────────────────────────────────────────────

function TopicCard({ topic, selected, onClick }: {
  topic: typeof topics[number]
  selected: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
        background: selected ? `${topic.color}0A` : hovered ? 'var(--tint)' : 'var(--nav-bg)',
        border: selected ? `1.5px solid ${topic.color}40` : '1px solid var(--edge)',
        fontFamily: 'inherit', textAlign: 'left',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: `${topic.color}14`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={topic.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d={topic.icon} />
        </svg>
      </div>
      <div>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)',
          marginBottom: 2,
        }}>
          {topic.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>
          {topic.subtitle}
        </div>
      </div>
    </button>
  )
}

// ── Getting Started ────────────────────────────────────────────────────────

function StartSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Prose>
        RealDeal is a relationship health tracker. Think of it like a fitness app for your
        network - it shows you who you're investing in, who's fading, and where to put
        your energy today.
      </Prose>

      <Card title="The daily ritual">
        <Prose>
          Most people open this in the morning or between meetings. A quick check:
          How's my network doing? Who needs a touchpoint? Anyone I've been neglecting?
          Five minutes, and you know exactly where you stand.
        </Prose>
      </Card>

      <Card title="Core concepts">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ConceptRow
            label="Pods"
            description="Groups of people you care about - investors, collaborators, family. Each pod has its own health score."
            color="#7B1FA2"
          />
          <ConceptRow
            label="Relationships"
            description="People and companies in your network. Toggle between them in one unified view."
            color="#1565C0"
          />
          <ConceptRow
            label="Campaigns"
            description="Concrete projects with people attached - events, fundraises, outreach, trips. Track progress through stages."
            color="#E91E63"
          />
          <ConceptRow
            label="Pulse"
            description="Your daily command center. Relationship health metrics, campaign progress, and suggested actions."
            color="#25B439"
          />
          <ConceptRow
            label="Equity"
            description="A 0-100 health score for each relationship, based on how recently and deeply you've been in touch."
            color="#FF9800"
          />
        </div>
      </Card>

      <Prose>
        The whole point is to make relationship maintenance feel like something
        you're on top of - not something you're behind on.
      </Prose>
    </div>
  )
}

// ── Pods & Categories ──────────────────────────────────────────────────────

function PodsSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Prose>
        Pods are how you organize your people. Think of them as circles -
        your investors, your talent network, your service providers, your family.
        Each pod is its own world with its own health score.
      </Prose>

      <Card title="Creating a pod">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <StepRow number={1} title="Hit the + button" description="On the map or in the sidebar under Pods." />
          <StepRow number={2} title="Name it" description="Something you'd actually say out loud. 'Investors' not 'Investment Stakeholder Network.'" />
          <StepRow number={3} title="Set a cadence" description="How often do you want to touch base with people in this group? Weekly, biweekly, monthly, or quarterly." />
          <StepRow number={4} title="Add people" description="Drag contacts in, or add them from a contact's detail page." />
        </div>
      </Card>

      <Card title="Categories">
        <Prose>
          Categories subdivide pods. If you have a "Companies" pod, you might have categories
          like "Active Partners" and "Prospects." They show up as smaller orbs around the pod
          on the map.
        </Prose>
      </Card>

      <Card title="Priority pods">
        <Prose>
          Mark a pod as priority and it gets special treatment: its contacts show up in
          Today's Focus, and it contributes to your overall network health score.
          Non-priority pods are tracked but don't drive your daily agenda.
        </Prose>
      </Card>
    </div>
  )
}

// ── Relationships ─────────────────────────────────────────────────────

function RelationshipsSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Prose>
        Relationships is your unified view of everyone in your network - both people
        and companies. Toggle between them with the segmented control at the top.
      </Prose>

      <Card title="People vs Companies">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ConceptRow
            label="People"
            description="Individual contacts. Each person can belong to multiple pods and appear in multiple campaigns."
            color="#1565C0"
          />
          <ConceptRow
            label="Companies"
            description="Organizations in your network. Searchable by industry, stage, domain, and location."
            color="#7B1FA2"
          />
        </div>
      </Card>

      <Card title="Multi-pod membership">
        <Prose>
          A person can live in multiple pods. For example, someone might be in both
          "Investors" and "NYC Network." The pod column in the table shows all memberships,
          and you can manage them from the contact detail panel.
        </Prose>
      </Card>

      <Card title="Bulk actions">
        <Prose>
          Select multiple people with checkboxes, then use the action bar to add/move them
          to pods, add them to campaigns, update fields, merge duplicates, or export.
        </Prose>
      </Card>
    </div>
  )
}

// ── Campaigns ─────────────────────────────────────────────────────────

function CampaignsSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Prose>
        Campaigns are concrete projects with people attached. Unlike pods (which are
        ongoing groups), campaigns have a goal, a deadline, and stages that people
        move through.
      </Prose>

      <Card title="Campaign types">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ConceptRow label="Event" description="Dinners, conferences, launches. Track who's invited, responded, and confirmed." color="#7B1FA2" />
          <ConceptRow label="Investment" description="Fundraises, LP outreach, deal sourcing. Track pipeline from identified to committed." color="#25B439" />
          <ConceptRow label="Outreach" description="Brand partnerships, collaborations, introductions. Track engagement stages." color="#1565C0" />
          <ConceptRow label="Other" description="Anything else - trips, hiring pushes, seasonal projects." color="var(--color-text-tertiary)" />
        </div>
      </Card>

      <Card title="How it works">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <StepRow number={1} title="Create a campaign" description="Give it a name, pick a type, set an optional deadline." />
          <StepRow number={2} title="Add people" description="Search and add contacts from the campaign detail panel, or bulk-add from the Relationships view." />
          <StepRow number={3} title="Track progress" description="Click status badges to advance people through stages: pending, reached, responded, confirmed." />
          <StepRow number={4} title="Complete it" description="Mark the campaign done when the event is over or the goal is hit." />
        </div>
      </Card>

      <Card title="Campaigns vs Pods">
        <Prose>
          Pods are ongoing relationship groups ("my investors"). Campaigns are time-bound
          projects ("Fund III launch dinner on May 7th"). A person can be in a pod AND
          in a campaign at the same time - they serve different purposes.
        </Prose>
      </Card>
    </div>
  )
}

// ── Interactions ───────────────────────────────────────────────────────────

function InteractionsSection() {
  const types = [
    { label: 'Intro', weight: 5, color: '#E91E63', why: 'Making a connection for someone. Highest leverage.' },
    { label: 'Meeting', weight: 4, color: '#9C27B0', why: 'Face-to-face time. Builds the deepest trust.' },
    { label: 'Call', weight: 3, color: '#2196F3', why: 'Real-time conversation. Shows genuine investment.' },
    { label: 'Text', weight: 2, color: '#4CAF50', why: 'Quick, personal, low-friction.' },
    { label: 'Email', weight: 2, color: '#FF9800', why: 'Formal or semi-formal communication.' },
    { label: 'Note', weight: 0, color: 'var(--color-text-tertiary)', why: 'Internal context only. Doesn\'t count toward the score.' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Prose>
        Every time you connect with someone, log it. A quick call, a lunch meeting,
        a text to check in. Each interaction adds to that person's equity score -
        and not all interactions are equal.
      </Prose>

      <Card title="Interaction types">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {types.map(t => (
            <div key={t.label}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <span style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)',
                  width: 56, flexShrink: 0,
                }}>
                  {t.label}
                </span>
                <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} style={{
                      width: 24, height: 8, borderRadius: 4,
                      background: i < t.weight ? t.color : 'var(--tint)',
                    }} />
                  ))}
                </div>
              </div>
              <p style={{
                fontSize: 12, color: 'var(--color-text-tertiary)', margin: '0 0 0 68px',
                lineHeight: 1.4,
              }}>
                {t.why}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Prose>
        Log from a contact's detail page - hit the + on their timeline. Pick the type,
        add a note if you want, and the score updates instantly.
      </Prose>
    </div>
  )
}

// ── Scoring ───────────────────────────────────────────────────────────────

function ScoringSection() {
  const labels = [
    { label: 'Thriving', range: '85+', color: '#25B439', meaning: 'You\'re showing up. Multiple recent interactions, variety of types.' },
    { label: 'Steady', range: '70 - 84', color: '#2196F3', meaning: 'On track. Regular contact within cadence.' },
    { label: 'Cooling', range: '40 - 69', color: '#FF9800', meaning: 'Starting to slip. Time for a check-in.' },
    { label: 'Fading', range: 'Under 40', color: '#E53935', meaning: 'Going cold. This person needs attention.' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Prose>
        Every contact gets a score from 0 to 100. It answers one question:
        <strong> how healthy is this relationship right now?</strong>
      </Prose>

      <Card title="What goes into the score">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ConceptRow
            label="Weight"
            description="Each interaction type has a weight. An intro (5) counts more than a text (2)."
            color="#7B1FA2"
          />
          <ConceptRow
            label="Recency"
            description="Recent interactions count fully. Older ones fade - 60% after a month, 30% after two, gone after three."
            color="#FF9800"
          />
          <ConceptRow
            label="Window"
            description="Only the last 90 days matter. A 10-year friendship with no recent contact will score low."
            color="#1565C0"
          />
        </div>
      </Card>

      <Card title="Health labels">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {labels.map(l => (
            <div key={l.label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 10,
              background: `${l.color}08`,
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', background: l.color, flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                  <span style={{
                    fontSize: 14, fontWeight: 600, color: l.color,
                    fontFamily: 'var(--font-serif)',
                  }}>
                    {l.label}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                    {l.range}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  {l.meaning}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Three levels">
        <Prose>
          Scores work at three levels: each <strong>contact</strong> has their own score,
          each <strong>pod</strong> averages its contacts, and your <strong>overall</strong> score
          averages your priority pods. The colored rings on orbs and contact cards show you
          all of this at a glance.
        </Prose>
      </Card>

      <Prose>
        The score isn't a judgment of how important someone is. A quarterly mentor can be
        perfectly healthy at a lower score than a weekly collaborator. That's what cadence
        settings are for.
      </Prose>
    </div>
  )
}

// ── Focus & Nurturing ──────────────────────────────────────────────────────

function FocusSection() {
  const cadences = [
    { label: 'Weekly', days: '7 days', use: 'Close collaborators, active deals' },
    { label: 'Biweekly', days: '14 days', use: 'Regular contacts' },
    { label: 'Monthly', days: '30 days', use: 'Most professional relationships' },
    { label: 'Quarterly', days: '90 days', use: 'Advisors, mentors, seasonal' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Prose>
        Today's Focus is your daily shortlist. It picks the people who need your attention
        most so you don't have to figure it out yourself.
      </Prose>

      <Card title="How picks are chosen">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <StepRow number={1} title="Priority pods only" description="Focus only looks at people in pods you've marked as priority." />
          <StepRow number={2} title="Most overdue first" description="Ranked by how far past their cadence they are. Someone 30 days overdue on a weekly cadence ranks above someone 5 days overdue on monthly." />
          <StepRow number={3} title="Never contacted = top priority" description="If someone's in a priority pod but you've never logged a touchpoint, they surface first." />
          <StepRow number={4} title="Serendipity fills gaps" description="If fewer than 3 are overdue, random picks from priority pods rotate in. Keeps you reconnecting with people you wouldn't otherwise think of." />
        </div>
      </Card>

      <Card title="Cadence settings">
        <Prose style={{ marginBottom: 12 }}>
          Cadence controls when a contact is considered "overdue." Set it on the pod
          (everyone inherits it) or override it per person.
        </Prose>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {cadences.map(c => (
            <div key={c.label} style={{
              display: 'flex', alignItems: 'baseline', gap: 12,
              padding: '8px 12px', borderRadius: 8, background: 'var(--tint)',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', width: 72, flexShrink: 0 }}>
                {c.label}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', width: 48, flexShrink: 0 }}>
                {c.days}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                {c.use}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Prose>
        Per-contact frequency always wins over pod cadence. Useful when one person in a
        "monthly" pod needs weekly attention.
      </Prose>
    </div>
  )
}

// ── Sharing & Import ───────────────────────────────────────────────────────

function SharingSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card title="Sharing a pod">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <StepRow number={1} title="Open a pod" description="Navigate to the pod you want to share." />
          <StepRow number={2} title="Hit share" description="Choose which contacts to include or exclude." />
          <StepRow number={3} title="Send the link" description="Recipients see a clean, read-only view. No login required." />
        </div>
      </Card>

      <Card title="Importing contacts">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <StepRow number={1} title="Prepare a CSV" description="Columns for name, email, phone, company - whatever you have. The importer maps them." />
          <StepRow number={2} title="Go to Import" description="In the sidebar under More, or navigate to /import directly." />
          <StepRow number={3} title="Map your columns" description="The wizard walks you through matching your CSV columns to contact fields." />
          <StepRow number={4} title="Assign to a pod" description="Imported contacts land in the pod you choose. You can move them later." />
        </div>
      </Card>

      <Prose>
        Contacts can belong to multiple pods. Moving someone doesn't remove them from
        where they were - you're adding a connection, not transferring ownership.
      </Prose>
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

function ConceptRow({ label, description, color }: { label: string; description: string; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%', background: color,
        flexShrink: 0, marginTop: 5,
      }} />
      <div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {label}
        </span>
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginLeft: 6 }}>
          - {description}
        </span>
      </div>
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
