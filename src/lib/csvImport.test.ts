import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createContactsBulk, getContacts } from './airtable'
import {
  detectColumns,
  importContacts,
  normalize,
  parseCSV,
  parseWorkbookBuffer,
} from './csvImport'

vi.mock('./airtable', () => ({
  getContacts: vi.fn(),
  createContactsBulk: vi.fn(),
}))

const mockedGetContacts = vi.mocked(getContacts)
const mockedCreateContactsBulk = vi.mocked(createContactsBulk)

beforeEach(() => {
  vi.clearAllMocks()
  mockedGetContacts.mockResolvedValue([])
  mockedCreateContactsBulk.mockImplementation(async records =>
    records.map((record, index) => ({
      ...record,
      id: `created-${index}`,
      created_at: '2026-05-28T00:00:00.000Z',
    }))
  )
})

describe('CSV and Excel import parsing', () => {
  it('parses quoted CSV values without splitting embedded commas', () => {
    const parsed = parseCSV('Name,Email,Company,Notes\n"Jane Doe",jane@example.com,"Acme, Inc.","Met at summit"\n')

    expect(parsed.headers).toEqual(['Name', 'Email', 'Company', 'Notes'])
    expect(parsed.rows[0]).toMatchObject({
      Name: 'Jane Doe',
      Company: 'Acme, Inc.',
    })
  })

  it('parses the Excel import template headers', async () => {
    const file = readFileSync('public/templates/realdeal-contact-import-template.xlsx')
    const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)

    const parsed = await parseWorkbookBuffer(buffer)

    expect(parsed.headers.slice(0, 10)).toEqual([
      'Name',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Company',
      'Role',
      'Pod',
      'Sub-pod',
      'Contact Frequency',
    ])
  })

  it('detects human relationship columns from flexible headers', () => {
    const mapping = detectColumns(['Full Name', 'Relationship Pod', 'Sub Pod', 'Last Interaction', 'Cadence'])

    expect(mapping.map(m => m.airtableField)).toEqual([
      'Name',
      'Pod',
      'Sub-pod',
      'Last Contacted',
      'Contact Frequency',
    ])
  })
})

describe('bulk contact import', () => {
  it('maps row pods and sub-pods before sending rows to Supabase storage', async () => {
    const parsed = parseCSV([
      'First Name,Last Name,Email,Company,Pod,Sub-pod,Last Contacted,Cadence,Next Action',
      'Emily,Tran,emily@example.com,Tran Family Office,LPs,Family Offices,2026-05-01,Monthly,Send LP update',
    ].join('\n'))
    const mapping = detectColumns(parsed.headers)
    const podMap = new Map([[normalize('LPs'), 'pod-lps']])
    const categoryMap = new Map([[`pod-lps:${normalize('Family Offices')}`, 'cat-family-offices']])

    const result = await importContacts(parsed.rows, '', undefined, {
      type: 'Contact',
      mapping,
      podIds: [],
      podMap,
      categoryMap,
      batchId: 'batch-test',
      importSource: 'csv',
    })

    expect(result).toEqual({ imported: 1, skipped: 0, errors: [] })
    expect(mockedCreateContactsBulk).toHaveBeenCalledTimes(1)
    const [records] = mockedCreateContactsBulk.mock.calls[0]
    expect(records[0]).toMatchObject({
      name: 'Emily Tran',
      email: 'emily@example.com',
      company: 'Tran Family Office',
      list_ids: ['pod-lps'],
      primary_list_id: 'pod-lps',
      category_ids: ['cat-family-offices'],
      last_contacted_at: '2026-05-01',
      contact_frequency: 'Monthly',
      next_action: 'Send LP update',
      import_batch_id: 'batch-test',
      import_source: 'csv',
    })
  })

  it('falls back to single-row inserts if a bulk chunk fails', async () => {
    const parsed = parseCSV('Name,Email,Pod\nOne,one@example.com,LPs\nTwo,two@example.com,LPs\n')
    const mapping = detectColumns(parsed.headers)
    const podMap = new Map([[normalize('LPs'), 'pod-lps']])
    mockedCreateContactsBulk
      .mockRejectedValueOnce(new Error('chunk failed'))
      .mockResolvedValueOnce([{ name: 'One', id: 'one', created_at: '2026-05-28T00:00:00.000Z' } as any])
      .mockResolvedValueOnce([{ name: 'Two', id: 'two', created_at: '2026-05-28T00:00:00.000Z' } as any])

    const result = await importContacts(parsed.rows, '', undefined, {
      type: 'Contact',
      mapping,
      podIds: [],
      podMap,
    })

    expect(result.imported).toBe(2)
    expect(result.errors).toEqual([])
    expect(mockedCreateContactsBulk).toHaveBeenCalledTimes(3)
  })
})
