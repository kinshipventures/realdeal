import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  contactEquityScore,
  contactEquityBreakdown,
  podEquityScore,
  overallEquityScore,
  scoreLabel,
  contactCadenceDays,
  todaysFocus,
  indexByContact,
  isDormant,
  daysSinceContact,
  INTERACTION_WEIGHTS,
  CADENCE_DAYS,
} from './equity'
import type { Interaction, Contact, Pod } from './types'

const DAY_MS = 24 * 60 * 60 * 1000

function makeInteraction(overrides: Partial<Interaction> = {}): Interaction {
  return {
    id: 'ix-1',
    contact_id: 'c-1',
    type: 'meeting',
    date: new Date().toISOString(),
    notes: null,
    summary: null,
    source: null,
    email_link: null,
    granola_link: null,
    event_detail: null,
    actor: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'c-1',
    name: 'Test Person',
    email: null,
    phone: null,
    company: null,
    role: null,
    location: null,
    website: null,
    notes: null,
    recommended_by: null,
    specialization: null,
    past_clients: null,
    birthday: null,
    milestones: null,
    interests: null,
    relationship_context: null,
    last_contacted_at: null,
    list_ids: [],
    category_ids: [],
    primary_list_id: null,
    cadence_override: null,
    first_name: null,
    last_name: null,
    linkedin: null,
    country: null,
    global_region: null,
    gender: null,
    introduced_by: null,
    intel_notes: null,
    relationship_owner: null,
    contact_frequency: null,
    communication_preferences: null,
    next_follow_up_date: null,
    next_action: null,
    kv_fund_investor: null,
    spv_investor: null,
    needs_review: false,
    type: 'Contact',
    status: 'Active',
    company_record_id: null,
    company_ids: [],
    industry: null,
    stage: null,
    ticker: null,
    domain: null,
    email_2: null,
    email_3: null,
    custom_fields: {},
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function makePod(overrides: Partial<Pod> = {}): Pod {
  return {
    id: 'pod-1',
    name: 'Test Pod',
    color: null,
    owner: null,
    is_priority: true,
    cadence: 'monthly',
    description: null,
    capacity: null,
    enrichment_opt_in: false,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * DAY_MS).toISOString()
}

// -- scoreLabel --

describe('scoreLabel', () => {
  it('returns correct labels at boundaries', () => {
    expect(scoreLabel(100)).toBe('Thriving')
    expect(scoreLabel(85)).toBe('Thriving')
    expect(scoreLabel(84)).toBe('Steady')
    expect(scoreLabel(70)).toBe('Steady')
    expect(scoreLabel(69)).toBe('Cooling')
    expect(scoreLabel(40)).toBe('Cooling')
    expect(scoreLabel(39)).toBe('Fading')
    expect(scoreLabel(0)).toBe('Fading')
  })
})

// -- contactEquityScore --

describe('contactEquityScore', () => {
  it('returns 0 for no interactions', () => {
    expect(contactEquityScore([])).toBe(0)
  })

  it('scores a recent meeting at full weight', () => {
    const ix = makeInteraction({ type: 'meeting', date: daysAgo(1) })
    const score = contactEquityScore([ix])
    // meeting=4, recency=1.0, scale=5 -> 4*1*5 = 20
    expect(score).toBe(20)
  })

  it('scores a recent intro higher than a meeting', () => {
    const intro = contactEquityScore([makeInteraction({ type: 'intro', date: daysAgo(1) })])
    const meeting = contactEquityScore([makeInteraction({ type: 'meeting', date: daysAgo(1) })])
    expect(intro).toBeGreaterThan(meeting)
  })

  it('ignores zero-weight types (note, pod_change, etc)', () => {
    const note = makeInteraction({ type: 'note', date: daysAgo(1) })
    const podChange = makeInteraction({ type: 'pod_change', date: daysAgo(1) })
    expect(contactEquityScore([note])).toBe(0)
    expect(contactEquityScore([podChange])).toBe(0)
  })

  it('applies recency decay for older interactions', () => {
    const recent = contactEquityScore([makeInteraction({ type: 'call', date: daysAgo(5) })])
    const older = contactEquityScore([makeInteraction({ type: 'call', date: daysAgo(45) })])
    const ancient = contactEquityScore([makeInteraction({ type: 'call', date: daysAgo(100) })])
    expect(recent).toBeGreaterThan(older)
    expect(older).toBeGreaterThan(ancient)
    expect(ancient).toBe(0) // >90 days = 0 multiplier
  })

  it('caps at 100', () => {
    const manyInteractions = Array.from({ length: 20 }, (_, i) =>
      makeInteraction({ id: `ix-${i}`, type: 'intro', date: daysAgo(i) })
    )
    expect(contactEquityScore(manyInteractions)).toBe(100)
  })

  it('accumulates multiple interaction types', () => {
    const single = contactEquityScore([makeInteraction({ type: 'email', date: daysAgo(1) })])
    const multi = contactEquityScore([
      makeInteraction({ id: 'a', type: 'email', date: daysAgo(1) }),
      makeInteraction({ id: 'b', type: 'call', date: daysAgo(3) }),
    ])
    expect(multi).toBeGreaterThan(single)
  })
})

// -- contactEquityBreakdown --

describe('contactEquityBreakdown', () => {
  it('returns empty for no interactions', () => {
    expect(contactEquityBreakdown([])).toEqual([])
  })

  it('groups by type and sorts highest first', () => {
    const ixs = [
      makeInteraction({ id: '1', type: 'email', date: daysAgo(1) }),
      makeInteraction({ id: '2', type: 'meeting', date: daysAgo(1) }),
    ]
    const breakdown = contactEquityBreakdown(ixs)
    expect(breakdown[0].type).toBe('meeting')
    expect(breakdown[1].type).toBe('email')
  })

  it('excludes zero-weight types', () => {
    const ixs = [
      makeInteraction({ id: '1', type: 'note', date: daysAgo(1) }),
      makeInteraction({ id: '2', type: 'meeting', date: daysAgo(1) }),
    ]
    const breakdown = contactEquityBreakdown(ixs)
    expect(breakdown).toHaveLength(1)
    expect(breakdown[0].type).toBe('meeting')
  })
})

// -- podEquityScore --

describe('podEquityScore', () => {
  it('returns 0 for empty contacts', () => {
    expect(podEquityScore([], new Map())).toBe(0)
  })

  it('averages contact scores', () => {
    const c1 = makeContact({ id: 'c-1' })
    const c2 = makeContact({ id: 'c-2' })
    const byContact = new Map([
      ['c-1', [makeInteraction({ contact_id: 'c-1', type: 'intro', date: daysAgo(1) })]],
      ['c-2', []], // no interactions = 0 score
    ])
    const score = podEquityScore([c1, c2], byContact)
    // c1 = 25 (intro=5, recency=1, scale=5), c2 = 0, avg = 13 (rounded)
    expect(score).toBe(13)
  })
})

// -- overallEquityScore --

describe('overallEquityScore', () => {
  it('returns 0 for no priority pods', () => {
    expect(overallEquityScore([], [], new Map())).toBe(0)
  })

  it('averages across priority pods only', () => {
    const pod = makePod({ id: 'pod-1', is_priority: true })
    const contact = makeContact({ id: 'c-1', list_ids: ['pod-1'] })
    const byContact = new Map([
      ['c-1', [makeInteraction({ contact_id: 'c-1', type: 'meeting', date: daysAgo(1) })]],
    ])
    const score = overallEquityScore([pod], [contact], byContact)
    expect(score).toBe(20) // single pod, single contact = contact score
  })
})

// -- contactCadenceDays --

describe('contactCadenceDays', () => {
  it('uses contact cadence_override first', () => {
    const c = makeContact({ cadence_override: 'weekly' })
    expect(contactCadenceDays(c, 'quarterly')).toBe(7)
  })

  it('falls back to contact_frequency', () => {
    const c = makeContact({ contact_frequency: 'Quarterly' })
    expect(contactCadenceDays(c, null)).toBe(90)
  })

  it('falls back to pod cadence', () => {
    const c = makeContact()
    expect(contactCadenceDays(c, 'biweekly')).toBe(14)
  })

  it('defaults to monthly when everything is null', () => {
    const c = makeContact()
    expect(contactCadenceDays(c, null)).toBe(30)
  })
})

// -- indexByContact --

describe('indexByContact', () => {
  it('groups interactions by contact_id', () => {
    const ixs = [
      makeInteraction({ id: '1', contact_id: 'c-1' }),
      makeInteraction({ id: '2', contact_id: 'c-2' }),
      makeInteraction({ id: '3', contact_id: 'c-1' }),
    ]
    const map = indexByContact(ixs)
    expect(map.get('c-1')).toHaveLength(2)
    expect(map.get('c-2')).toHaveLength(1)
  })
})

// -- isDormant / daysSinceContact --

describe('isDormant', () => {
  it('returns true for never-contacted', () => {
    expect(isDormant(makeContact())).toBe(true)
  })

  it('returns true for >90 days ago', () => {
    expect(isDormant(makeContact({ last_contacted_at: daysAgo(91) }))).toBe(true)
  })

  it('returns false for recent contact', () => {
    expect(isDormant(makeContact({ last_contacted_at: daysAgo(30) }))).toBe(false)
  })
})

describe('daysSinceContact', () => {
  it('returns null for never-contacted', () => {
    expect(daysSinceContact(makeContact())).toBeNull()
  })

  it('returns days since last contact', () => {
    const days = daysSinceContact(makeContact({ last_contacted_at: daysAgo(10) }))
    expect(days).toBe(10)
  })
})

// -- todaysFocus --

describe('todaysFocus', () => {
  it('returns empty for no contacts', () => {
    expect(todaysFocus([], new Map(), [])).toEqual([])
  })

  it('prioritizes overdue contacts in priority pods', () => {
    const pod = makePod({ id: 'pod-1', is_priority: true, cadence: 'weekly' })
    const overdue = makeContact({
      id: 'c-overdue',
      list_ids: ['pod-1'],
      last_contacted_at: daysAgo(14), // 2x weekly cadence
    })
    const recent = makeContact({
      id: 'c-recent',
      list_ids: ['pod-1'],
      last_contacted_at: daysAgo(2),
    })
    const focus = todaysFocus([overdue, recent], new Map(), [pod], 3)
    // overdue is first (highest score), recent fills as serendipity
    expect(focus.length).toBeGreaterThanOrEqual(1)
    expect(focus[0].contact.id).toBe('c-overdue')
    expect(focus[0].reason).toBe('overdue')
  })

  it('includes never-contacted as highest priority', () => {
    const pod = makePod({ id: 'pod-1', is_priority: true })
    const neverContacted = makeContact({
      id: 'c-never',
      list_ids: ['pod-1'],
      last_contacted_at: null,
    })
    const focus = todaysFocus([neverContacted], new Map(), [pod], 3)
    expect(focus[0].score).toBe(999)
  })

  it('ignores contacts not in priority pods', () => {
    const priorityPod = makePod({ id: 'pod-1', is_priority: true, cadence: 'weekly' })
    const regularPod = makePod({ id: 'pod-2', is_priority: false })
    const inRegular = makeContact({
      id: 'c-regular',
      list_ids: ['pod-2'],
      last_contacted_at: daysAgo(30),
    })
    const focus = todaysFocus([inRegular], new Map(), [priorityPod, regularPod], 3)
    expect(focus).toHaveLength(0)
  })
})
