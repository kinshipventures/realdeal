import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isDemoMode,
  setDemoMode,
  DEMO_PODS,
  DEMO_CATEGORIES,
  DEMO_CONTACTS,
  DEMO_INTERACTIONS,
  DEMO_CAMPAIGNS,
  DEMO_PIPELINES,
  DEMO_PIPELINE_STAGES,
  DEMO_OPPORTUNITIES,
  DEMO_PROJECTS,
} from './sampleData'
import type { Pod, Contact, Interaction, Category } from './types'

// These tests validate the demo data layer that supabase-data.ts delegates to.
// We test sampleData directly to avoid importing the Supabase client (which
// requires browser auth storage). This covers the same code paths that
// getPods/getContacts/etc use when isDemoMode() returns true.

beforeEach(() => {
  setDemoMode(true)
})

// -- Demo mode toggle --

describe('demo mode toggle', () => {
  it('setDemoMode toggles the flag', () => {
    setDemoMode(true)
    expect(isDemoMode()).toBe(true)
    setDemoMode(false)
    expect(isDemoMode()).toBe(false)
    setDemoMode(true) // restore
  })
})

// -- Pods demo data --

describe('pods demo data', () => {
  it('has pods with correct shape', () => {
    expect(DEMO_PODS.length).toBeGreaterThan(0)
    const pod = DEMO_PODS[0]
    expect(pod).toHaveProperty('id')
    expect(pod).toHaveProperty('name')
    expect(pod).toHaveProperty('is_priority')
    expect(pod).toHaveProperty('cadence')
    expect(pod).toHaveProperty('created_at')
    expect(pod.id).toMatch(/^demo-pod-/)
  })

  it('has at least one priority pod', () => {
    expect(DEMO_PODS.some(p => p.is_priority)).toBe(true)
  })

  it('all pods have valid cadence values', () => {
    const validCadences = ['weekly', 'biweekly', 'monthly', 'quarterly', null]
    for (const pod of DEMO_PODS) {
      expect(validCadences).toContain(pod.cadence)
    }
  })

  it('pod IDs are unique', () => {
    const ids = DEMO_PODS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('supports in-place mutation (simulates createPod/updatePod)', () => {
    const before = DEMO_PODS.length
    const newPod: Pod = {
      id: `demo-pod-test-${Date.now()}`,
      name: 'Test Pod',
      color: null,
      owner: null,
      is_priority: false,
      cadence: null,
      description: null,
      capacity: null,
      enrichment_opt_in: false,
      created_at: new Date().toISOString(),
    }
    DEMO_PODS.push(newPod)
    expect(DEMO_PODS.length).toBe(before + 1)
    expect(DEMO_PODS.find(p => p.id === newPod.id)).toBeDefined()
    // mutate (simulates updatePod)
    Object.assign(newPod, { name: 'Renamed' })
    expect(DEMO_PODS.find(p => p.id === newPod.id)?.name).toBe('Renamed')
    // cleanup
    DEMO_PODS.pop()
    expect(DEMO_PODS.length).toBe(before)
  })
})

// -- Contacts demo data --

describe('contacts demo data', () => {
  it('has contacts with correct shape', () => {
    expect(DEMO_CONTACTS.length).toBeGreaterThan(0)
    const c = DEMO_CONTACTS[0]
    expect(c).toHaveProperty('id')
    expect(c).toHaveProperty('name')
    expect(c).toHaveProperty('list_ids')
    expect(c).toHaveProperty('category_ids')
    expect(Array.isArray(c.list_ids)).toBe(true)
    expect(Array.isArray(c.category_ids)).toBe(true)
  })

  it('all contacts reference valid pod IDs', () => {
    const podIds = new Set(DEMO_PODS.map(p => p.id))
    for (const c of DEMO_CONTACTS) {
      for (const lid of c.list_ids) {
        expect(podIds.has(lid)).toBe(true)
      }
    }
  })

  it('all contacts reference valid category IDs', () => {
    const catIds = new Set(DEMO_CATEGORIES.map(c => c.id))
    for (const c of DEMO_CONTACTS) {
      for (const cid of c.category_ids) {
        expect(catIds.has(cid)).toBe(true)
      }
    }
  })

  it('contact IDs are unique', () => {
    const ids = DEMO_CONTACTS.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// -- Interactions demo data --

describe('interactions demo data', () => {
  it('has interactions with correct shape', () => {
    expect(DEMO_INTERACTIONS.length).toBeGreaterThan(0)
    const ix = DEMO_INTERACTIONS[0]
    expect(ix).toHaveProperty('id')
    expect(ix).toHaveProperty('contact_id')
    expect(ix).toHaveProperty('type')
    expect(ix).toHaveProperty('date')
  })

  it('all interactions reference valid contact IDs', () => {
    const contactIds = new Set(DEMO_CONTACTS.map(c => c.id))
    for (const ix of DEMO_INTERACTIONS) {
      expect(contactIds.has(ix.contact_id)).toBe(true)
    }
  })

  it('all interactions have valid types', () => {
    const validTypes = ['call', 'email', 'text', 'meeting', 'intro', 'note', 'pod_change', 'field_update', 'categorization', 'pipeline_event', 'project_event', 'merge_event']
    for (const ix of DEMO_INTERACTIONS) {
      expect(validTypes).toContain(ix.type)
    }
  })

  it('interactions have parseable dates', () => {
    for (const ix of DEMO_INTERACTIONS) {
      const d = new Date(ix.date)
      expect(d.getTime()).not.toBeNaN()
    }
  })

  it('supports in-place mutation (simulates createInteraction)', () => {
    const before = DEMO_INTERACTIONS.length
    const newIx: Interaction = {
      id: `demo-ix-test-${Date.now()}`,
      contact_id: DEMO_CONTACTS[0].id,
      type: 'call',
      date: '2026-04-07',
      notes: 'Test call',
      summary: null,
      source: null,
      email_link: null,
      granola_link: null,
      event_detail: null,
      actor: null,
      created_at: new Date().toISOString(),
    }
    DEMO_INTERACTIONS.push(newIx)
    expect(DEMO_INTERACTIONS.length).toBe(before + 1)
    DEMO_INTERACTIONS.pop()
  })
})

// -- Categories demo data --

describe('categories demo data', () => {
  it('has categories with correct shape', () => {
    expect(DEMO_CATEGORIES.length).toBeGreaterThan(0)
    const cat = DEMO_CATEGORIES[0]
    expect(cat).toHaveProperty('id')
    expect(cat).toHaveProperty('list_id')
    expect(cat).toHaveProperty('name')
  })

  it('all categories reference valid pod IDs', () => {
    const podIds = new Set(DEMO_PODS.map(p => p.id))
    for (const cat of DEMO_CATEGORIES) {
      expect(podIds.has(cat.list_id)).toBe(true)
    }
  })
})

// -- Cross-entity referential integrity --

describe('demo data referential integrity', () => {
  it('most contacts are in at least one pod', () => {
    const withPods = DEMO_CONTACTS.filter(c => c.list_ids.length > 0)
    // Allow some unassigned contacts but most should be in a pod
    expect(withPods.length / DEMO_CONTACTS.length).toBeGreaterThan(0.5)
  })

  it('pipeline stages reference valid pipelines', () => {
    const pipelineIds = new Set(DEMO_PIPELINES.map(p => p.id))
    for (const stage of DEMO_PIPELINE_STAGES) {
      expect(pipelineIds.has(stage.pipeline_id)).toBe(true)
    }
  })

  it('opportunities reference valid pipeline stages', () => {
    const stageIds = new Set(DEMO_PIPELINE_STAGES.map(s => s.id))
    for (const opp of DEMO_OPPORTUNITIES) {
      if (opp.stage_id) {
        expect(stageIds.has(opp.stage_id)).toBe(true)
      }
    }
  })
})
