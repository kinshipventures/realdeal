import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Contact } from './types'
import type { ColumnMapping } from './csvImport'
import {
  buildImportReliabilityPlan,
  createImportProgressWatchdog,
  mergeImportResults,
  runImportPreflight,
  verifyImportCompletion,
} from './importReliability'

const mapping: ColumnMapping = [
  { csvHeader: 'Name', targetField: 'First Name' },
  { csvHeader: 'Email', targetField: 'Email' },
  { csvHeader: 'Email 2', targetField: 'Email 2' },
  { csvHeader: 'Company', targetField: 'Company' },
]

function contact(partial: Partial<Contact>): Contact {
  return {
    id: 'contact',
    name: 'Contact',
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
    photo_url: null,
    custom_fields: {},
    snoozed_until: null,
    created_at: '2026-06-30T00:00:00.000Z',
    ...partial,
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('import reliability helpers', () => {
  it('blocks only unsafe preflight conditions and keeps recoverable row issues as warnings', () => {
    const plan = buildImportReliabilityPlan([
      { Name: 'Ava Stone', Email: 'ava@example.com', Company: 'Kinship Ventures' },
      { Name: 'Ben Reed', Email: 'ava@example.com', Company: 'Kinship Ventures' },
      { Name: 'Cam Lee', Email: 'not-an-email', Company: 'Kinship Ventures' },
    ], mapping, 'Contact')

    const missingWorkspace = runImportPreflight(plan, null)
    expect(missingWorkspace.ok).toBe(false)
    expect(missingWorkspace.errors).toContain('No active workspace is selected.')
    expect(missingWorkspace.warnings).toEqual([
      '1 row includes email values that do not look valid.',
      '1 duplicate email found in this file; the import will keep using the existing duplicate handling.',
    ])

    const ready = runImportPreflight(plan, 'workspace-1')
    expect(ready.ok).toBe(true)
    expect(ready.errors).toEqual([])
    expect(ready.warnings).toHaveLength(2)
  })

  it('verifies saved contacts by email, secondary email, and import fallback name', () => {
    const plan = buildImportReliabilityPlan([
      { Name: 'Ava Stone', Email: 'ava@example.com', 'Email 2': '', Company: '' },
      { Name: 'Ben Reed', Email: '', 'Email 2': 'ben.secondary@example.com', Company: '' },
      { Name: '', Email: '', 'Email 2': '', Company: 'Kinship Ventures' },
    ], mapping, 'Contact')

    const verification = verifyImportCompletion(plan, [
      contact({ id: 'ava', name: 'Ava Stone', email: 'ava@example.com' }),
      contact({ id: 'ben', name: 'Ben Reed', email_2: 'ben.secondary@example.com' }),
      contact({ id: 'fallback', name: 'Contact at Kinship Ventures' }),
    ], { imported: 3, skipped: 0, errors: [] })

    expect(verification).toEqual({
      ok: true,
      expected: 3,
      matched: 3,
      missing: [],
    })
  })

  it('reports missing rows so the UI can retry before marking the import complete', () => {
    const plan = buildImportReliabilityPlan([
      { Name: 'Ava Stone', Email: 'ava@example.com', Company: '' },
      { Name: 'Ben Reed', Email: 'ben@example.com', Company: '' },
    ], mapping, 'Contact')

    const verification = verifyImportCompletion(plan, [
      contact({ id: 'ava', name: 'Ava Stone', email: 'ava@example.com' }),
    ], { imported: 1, skipped: 0, errors: [] })

    expect(verification.ok).toBe(false)
    expect(verification.missing).toEqual(['Row 3: ben@example.com'])
  })

  it('merges retry results without losing row errors or relationship counters', () => {
    expect(mergeImportResults(
      { imported: 10, skipped: 1, updated: 2, campaignLinked: 3, interactionsImported: 4, errors: ['first'] },
      { imported: 0, skipped: 9, updated: 1, campaignLinked: 2, interactionsImported: 0, errors: ['second'] },
    )).toEqual({
      imported: 10,
      skipped: 10,
      updated: 3,
      campaignLinked: 5,
      interactionsImported: 4,
      errors: ['first', 'second'],
    })
  })

  it('fires the progress watchdog only when progress stops moving', () => {
    vi.useFakeTimers()
    const onStall = vi.fn()
    const watchdog = createImportProgressWatchdog(onStall, 1000)

    watchdog.start()
    vi.advanceTimersByTime(900)
    watchdog.report({ current: 1, total: 3, imported: 0, skipped: 0, phase: 'preparing' })
    vi.advanceTimersByTime(900)
    expect(onStall).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(onStall).toHaveBeenCalledTimes(1)

    watchdog.stop()
    vi.advanceTimersByTime(1000)
    expect(onStall).toHaveBeenCalledTimes(1)
  })
})
