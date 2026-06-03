import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { addContactToCampaign, createCampaign, createContactsBulk, getCampaigns, getContacts, updateCampaignContact, updateContact } from './data'
import {
  countInvalidRows,
  detectColumns,
  getRowWarnings,
  importContacts,
  normalize,
  normalizeColumnMapping,
  parseCSV,
  parseWorkbookBuffer,
} from './csvImport'

vi.mock('./data', () => ({
  getContacts: vi.fn(),
  updateContact: vi.fn(),
  createContactsBulk: vi.fn(),
  getCampaigns: vi.fn(),
  createCampaign: vi.fn(),
  addContactToCampaign: vi.fn(),
  updateCampaignContact: vi.fn(),
}))

const mockedGetContacts = vi.mocked(getContacts)
const mockedUpdateContact = vi.mocked(updateContact)
const mockedCreateContactsBulk = vi.mocked(createContactsBulk)
const mockedGetCampaigns = vi.mocked(getCampaigns)
const mockedCreateCampaign = vi.mocked(createCampaign)
const mockedAddContactToCampaign = vi.mocked(addContactToCampaign)
const mockedUpdateCampaignContact = vi.mocked(updateCampaignContact)

beforeEach(() => {
  vi.clearAllMocks()
  mockedGetContacts.mockResolvedValue([])
  mockedUpdateContact.mockImplementation(async (id, data) => ({ id, name: 'Updated', created_at: '2026-05-28T00:00:00.000Z', ...data } as any))
  mockedGetCampaigns.mockResolvedValue([])
  mockedCreateCampaign.mockImplementation(async data => ({
    id: `campaign-${String(data.name).toLowerCase().replace(/\s+/g, '-')}`,
    name: data.name,
    type: data.type,
    deadline: data.deadline ?? null,
    status: 'active',
    notes: null,
    description: null,
    custom_fields: {},
    contact_ids: [],
    created_at: '2026-05-28T00:00:00.000Z',
  } as any))
  mockedAddContactToCampaign.mockImplementation(async (campaignId, contactId) => ({
    id: `cc-${campaignId}-${contactId}`,
    campaign_id: campaignId,
    contact_id: contactId,
    status: 'pending',
    stage_id: null,
    notes: null,
    owner: null,
    next_step: null,
    next_step_due: null,
    moved_at: '2026-05-28T00:00:00.000Z',
    is_priority: false,
    custom_fields: {},
    created_at: '2026-05-28T00:00:00.000Z',
  } as any))
  mockedUpdateCampaignContact.mockImplementation(async (id, data) => ({
    id,
    campaign_id: 'campaign',
    contact_id: 'contact',
    status: 'pending',
    stage_id: null,
    notes: null,
    owner: null,
    next_step: null,
    next_step_due: null,
    moved_at: '2026-05-28T00:00:00.000Z',
    is_priority: false,
    custom_fields: {},
    created_at: '2026-05-28T00:00:00.000Z',
    ...data,
  } as any))
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
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Company',
      'Role',
      'Pod',
      'Sub-pod',
      'Campaign',
      'Campaign Status',
    ])
    expect(parsed.headers).not.toContain('Name')
  }, 10000)

  it('detects human relationship columns from flexible headers', () => {
    const mapping = detectColumns(['Full Name', 'Relationship Pod', 'Sub Pod', 'Last Interaction', 'Cadence'])

    expect(mapping.map(m => m.targetField)).toEqual([
      'First Name',
      'Pod',
      'Sub-pod',
      'Last Contacted',
      'Contact Frequency',
    ])
  })

  it('detects client-style pod and sub-pod headers from random spreadsheets', () => {
    const mapping = detectColumns(['Name', 'Primary Pod', 'LP Sub-Pod', 'Company Name', 'E-mail Address', 'Job Title'])

    expect(mapping.map(m => m.targetField)).toEqual([
      'First Name',
      'Pod',
      'Sub-pod',
      'Company',
      'Email',
      'Role',
    ])
  })

  it('maps company-oriented headers to the existing Company field', () => {
    const mapping = detectColumns(['First Name', 'Last Name', 'Company Name', 'Agency'])

    expect(mapping.map(m => m.targetField)).toEqual([
      'First Name',
      'Last Name',
      'Company',
      null,
    ])
  })

  it('detects required LP tracker fields from client exports', () => {
    const mapping = detectColumns(['KV Status', 'Contact Source', 'Company LinkedIn', 'Company Overview'])

    expect(mapping.map(m => m.targetField)).toEqual([
      'KV Status',
      'Contact Source',
      'Company LinkedIn',
      'Company Overview',
    ])
  })

  it('prefers exact first-name columns over generic name aliases', () => {
    const mapping = detectColumns(['Name', 'First Name', 'Company Name'])

    expect(mapping.map(m => m.targetField)).toEqual([
      null,
      'First Name',
      'Company',
    ])
  })

  it('uses generic Name as a row-level fallback when First Name is blank', async () => {
    const parsed = parseCSV('Name,First Name,Last Name,Email,Pod\nMaya Fullname,, ,maya@example.com,MAPS\nGeneric Name,Jordan,Lee,jordan@example.com,LPs\n')
    const mapping = detectColumns(parsed.headers)
    const podMap = new Map([
      [normalize('MAPS'), 'pod-maps'],
      [normalize('LPs'), 'pod-lps'],
    ])

    const result = await importContacts(parsed.rows, '', undefined, {
      type: 'Contact',
      mapping,
      podIds: [],
      podMap,
    })

    expect(result).toEqual({ imported: 2, skipped: 0, errors: [] })
    const [records] = mockedCreateContactsBulk.mock.calls[0]
    expect(records[0]).toMatchObject({
      name: 'Maya Fullname',
      first_name: 'Maya Fullname',
      last_name: null,
      list_ids: ['pod-maps'],
    })
    expect(records[0].notes).toBeNull()
    expect(records[1]).toMatchObject({
      name: 'Jordan Lee',
      first_name: 'Jordan',
      last_name: 'Lee',
      list_ids: ['pod-lps'],
      notes: 'Name: Generic Name',
    })
  })

  it('normalizes malformed mappings to existing standard fields only', () => {
    const mapping = normalizeColumnMapping([
      undefined,
      null,
      { csvHeader: 'Name', targetField: 'Name' },
      { csvHeader: 'Random Notes', targetField: 'New Section' },
      { csvHeader: 'Company Name', targetField: 'Company' },
      { csvHeader: 'Agency', targetField: 'Company' },
      { csvHeader: '', targetField: 'Email' },
    ] as any)

    expect(mapping).toEqual([
      { csvHeader: 'Name', targetField: 'First Name' },
      { csvHeader: 'Random Notes', targetField: null },
      { csvHeader: 'Company Name', targetField: 'Company' },
      { csvHeader: 'Agency', targetField: null },
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

  it('assigns an existing sub-pod from the spreadsheet and inherits its parent pod', async () => {
    const parsed = parseCSV([
      'First Name,Email,Sub-pod',
      'Maya,maya@example.com,LP Internal',
    ].join('\n'))
    const mapping = detectColumns(parsed.headers)
    const categoryMap = new Map([[normalize('LP Internal'), 'cat-lp-internal']])
    const categoryPodMap = new Map([['cat-lp-internal', 'pod-lps']])

    const result = await importContacts(parsed.rows, '', undefined, {
      type: 'Contact',
      mapping,
      podIds: [],
      podMap: new Map(),
      categoryMap,
      categoryPodMap,
    })

    expect(result).toEqual({ imported: 1, skipped: 0, errors: [] })
    const [records] = mockedCreateContactsBulk.mock.calls[0]
    expect(records[0]).toMatchObject({
      name: 'Maya',
      email: 'maya@example.com',
      list_ids: ['pod-lps'],
      primary_list_id: 'pod-lps',
      category_ids: ['cat-lp-internal'],
    })
  })

  it('stores approved LP tracker fields in controlled contact custom fields', async () => {
    const parsed = parseCSV([
      'Name,Company,Status,Commitment Amount,Email,Contact Source,Company LinkedIn,Company Overview,Sub Pod,Notes,Investment Entity,SPV Investor,Company Type,Job Description,Kinship Investor,SPV Distribution List,Summary,Next Step',
      'Ivan Soto-Wright,MoonPay,Closed/Won,$500000,ivan@navihold.vc,Business card,https://linkedin.com/company/moonpay,"MoonPay public overview",LP Internal,Advisor notes,"Navihold Ventures, LLC",TeraWulf,Financial technology,"MoonPay CEO",Yes,No,"Committed through Navihold","Complete onboarding"',
    ].join('\n'))
    const mapping = detectColumns(parsed.headers)
    const categoryMap = new Map([[normalize('LP Internal'), 'cat-lp-internal']])
    const categoryPodMap = new Map([['cat-lp-internal', 'pod-lps']])

    const result = await importContacts(parsed.rows, '', undefined, {
      type: 'Contact',
      mapping,
      podIds: [],
      podMap: new Map(),
      categoryMap,
      categoryPodMap,
    })

    expect(result).toEqual({ imported: 1, skipped: 0, errors: [] })
    const [records] = mockedCreateContactsBulk.mock.calls[0]
    expect(records[0]).toMatchObject({
      name: 'Ivan Soto-Wright',
      first_name: 'Ivan Soto-Wright',
      company: 'MoonPay',
      email: 'ivan@navihold.vc',
      notes: 'Advisor notes',
      list_ids: ['pod-lps'],
      primary_list_id: 'pod-lps',
      category_ids: ['cat-lp-internal'],
      spv_investor: ['TeraWulf'],
      custom_fields: {
        fundraiseStatus: 'Closed/Won',
        investmentAmount: '$500000',
        investmentEntity: 'Navihold Ventures, LLC',
        contactSource: 'Business Card',
        companyLinkedIn: 'https://linkedin.com/company/moonpay',
        companyOverview: 'MoonPay public overview',
        companyType: 'Financial technology',
        jobDescription: 'MoonPay CEO',
        kinshipInvestor: true,
        spvDistributionList: false,
        summary: 'Committed through Navihold',
        nextStep: 'Complete onboarding',
      },
    })
  })

  it('digests campaign-pod client sheets without creating extra contact fields', async () => {
    const parsed = parseCSV([
      'Name,Company,Email,Referred By,Intel Notes,Campaign | Pod,Status (Campaign Field),Target Commitment (Campign Specific)',
      'Ivan Soto-Wright,MoonPay,ivan@moonpay.com,Mark Suster,Advisor to MoonPay,Kinship Fund Pipeline | LP Internal | SPV Investor,Closed/Won,500000',
    ].join('\n'))
    const mapping = detectColumns(parsed.headers)
    const categoryMap = new Map([
      [normalize('LP Internal'), 'cat-lp-internal'],
      [normalize('SPV Investor'), 'cat-spv-investor'],
    ])
    const categoryPodMap = new Map([
      ['cat-lp-internal', 'pod-lps'],
      ['cat-spv-investor', 'pod-lps'],
    ])
    const campaignMap = new Map([[normalize('Kinship Fund Pipeline'), 'campaign-fund']])

    const result = await importContacts(parsed.rows, '', undefined, {
      type: 'Contact',
      mapping,
      podIds: [],
      categoryMap,
      categoryPodMap,
      campaignMap,
    })

    expect(result).toEqual({ imported: 1, skipped: 0, errors: [], campaignLinked: 1 })
    const [records] = mockedCreateContactsBulk.mock.calls[0]
    expect(records[0]).toMatchObject({
      name: 'Ivan Soto-Wright',
      first_name: 'Ivan Soto-Wright',
      company: 'MoonPay',
      recommended_by: 'Mark Suster',
      intel_notes: 'Advisor to MoonPay',
      list_ids: ['pod-lps'],
      primary_list_id: 'pod-lps',
      category_ids: ['cat-lp-internal', 'cat-spv-investor'],
      custom_fields: {},
    })
    expect(mockedAddContactToCampaign).toHaveBeenCalledWith('campaign-fund', 'created-0')
    expect(mockedUpdateCampaignContact).toHaveBeenCalledWith(
      'cc-campaign-fund-created-0',
      { custom_fields: { commitmentAmount: 500000, campaignStatus: 'Closed/Won' } },
    )
  })

  it('updates existing contacts with missing spreadsheet data instead of duplicating them', async () => {
    mockedGetContacts.mockResolvedValue([
      {
        id: 'contact-ivan',
        name: 'Ivan Soto-Wright',
        email: 'ivan@moonpay.com',
        company: null,
        recommended_by: null,
        intel_notes: null,
        notes: null,
        list_ids: [],
        category_ids: [],
        primary_list_id: null,
        company_ids: [],
        kv_fund_investor: null,
        spv_investor: null,
        custom_fields: {},
      } as any,
    ])

    const parsed = parseCSV([
      'Name,Company,Email,Referred By,Intel Notes,Campaign | Pod,Status (Campaign Field),Target Commitment (Campign Specific)',
      'Ivan Soto-Wright,MoonPay,ivan@moonpay.com,Mark Suster,Advisor to MoonPay,Kinship Fund Pipeline | LP Internal,Closed/Won,500000',
    ].join('\n'))
    const mapping = detectColumns(parsed.headers)
    const categoryMap = new Map([[normalize('LP Internal'), 'cat-lp-internal']])
    const categoryPodMap = new Map([['cat-lp-internal', 'pod-lps']])
    const campaignMap = new Map([[normalize('Kinship Fund Pipeline'), 'campaign-fund']])

    const result = await importContacts(parsed.rows, '', undefined, {
      type: 'Contact',
      mapping,
      podIds: [],
      categoryMap,
      categoryPodMap,
      campaignMap,
    })

    expect(result).toEqual({ imported: 0, skipped: 0, errors: [], updated: 1, campaignLinked: 1 })
    expect(mockedCreateContactsBulk).not.toHaveBeenCalled()
    expect(mockedUpdateContact).toHaveBeenCalledWith('contact-ivan', expect.objectContaining({
      company: 'MoonPay',
      recommended_by: 'Mark Suster',
      intel_notes: 'Advisor to MoonPay',
      list_ids: ['pod-lps'],
      primary_list_id: 'pod-lps',
      category_ids: ['cat-lp-internal'],
    }))
    expect(mockedAddContactToCampaign).toHaveBeenCalledWith('campaign-fund', 'contact-ivan')
  })

  it('keeps importing when a spreadsheet pod or sub-pod does not exist', async () => {
    const parsed = parseCSV([
      'First Name,Email,Pod,Sub-pod',
      'Noah,noah@example.com,Unknown Pod,Unknown Sub-pod',
    ].join('\n'))
    const mapping = detectColumns(parsed.headers)

    const result = await importContacts(parsed.rows, '', undefined, {
      type: 'Contact',
      mapping,
      podIds: [],
      podMap: new Map([[normalize('LPs'), 'pod-lps']]),
      categoryMap: new Map([[`pod-lps:${normalize('LP Internal')}`, 'cat-lp-internal']]),
      categoryPodMap: new Map([['cat-lp-internal', 'pod-lps']]),
    })

    expect(result).toEqual({ imported: 1, skipped: 0, errors: [] })
    const [records] = mockedCreateContactsBulk.mock.calls[0]
    expect(records[0]).toMatchObject({
      name: 'Noah',
      email: 'noah@example.com',
      list_ids: [],
      primary_list_id: null,
      category_ids: [],
    })
  })

  it('keeps unmapped spreadsheet columns in Notes without creating custom fields', async () => {
    const parsed = parseCSV('Name,Email,Company,Nickname,Pod\nAlex Rivera,alex@example.com,Rivera Capital,AR,LPs\n')
    const mapping = detectColumns(parsed.headers)
    const podMap = new Map([[normalize('LPs'), 'pod-lps']])

    const result = await importContacts(parsed.rows, '', undefined, {
      type: 'Contact',
      mapping,
      podIds: [],
      podMap,
    })

    expect(result).toEqual({ imported: 1, skipped: 0, errors: [] })
    const [records] = mockedCreateContactsBulk.mock.calls[0]
    expect(records[0]).toMatchObject({
      name: 'Alex Rivera',
      email: 'alex@example.com',
      company: 'Rivera Capital',
      notes: 'Nickname: AR',
      custom_fields: {},
    })
    expect(records[0].custom_fields).not.toHaveProperty('Nickname')
  })

  it('stores Name-only spreadsheets in the existing First Name field', async () => {
    const parsed = parseCSV('Name,Email,Pod\nTaylor Reed,taylor@example.com,LPs\n')
    const mapping = detectColumns(parsed.headers)
    const podMap = new Map([[normalize('LPs'), 'pod-lps']])

    const result = await importContacts(parsed.rows, '', undefined, {
      type: 'Contact',
      mapping,
      podIds: [],
      podMap,
    })

    expect(result).toEqual({ imported: 1, skipped: 0, errors: [] })
    const [records] = mockedCreateContactsBulk.mock.calls[0]
    expect(records[0]).toMatchObject({
      name: 'Taylor Reed',
      first_name: 'Taylor Reed',
      last_name: null,
      email: 'taylor@example.com',
      list_ids: ['pod-lps'],
    })
  })

  it('imports with malformed mappings without creating fields or crashing', async () => {
    const parsed = parseCSV('Name,Email,Random Notes\nMorgan Lee,morgan@example.com,Met through the annual summit\n')
    const mapping = [
      undefined,
      { csvHeader: 'Name', targetField: 'Name' },
      { csvHeader: 'Email', targetField: 'Email' },
      { csvHeader: 'Random Notes', targetField: 'Invented Field' },
    ] as any

    expect(countInvalidRows(parsed.rows, 'Contact', mapping)).toBe(0)
    expect(getRowWarnings(parsed.rows, mapping, new Map(), new Map())).toEqual([])

    const result = await importContacts(parsed.rows, 'pod-default', undefined, {
      type: 'Contact',
      mapping,
      podIds: ['pod-default'],
    })

    expect(result).toEqual({ imported: 1, skipped: 0, errors: [] })
    const [records] = mockedCreateContactsBulk.mock.calls[0]
    expect(records[0]).toMatchObject({
      name: 'Morgan Lee',
      first_name: 'Morgan Lee',
      email: 'morgan@example.com',
      notes: 'Random Notes: Met through the annual summit',
      custom_fields: {},
      list_ids: ['pod-default'],
    })
    expect(records[0]).not.toHaveProperty('invented_field')
  })

  it('imports vague rows with fallback names and preserves the source data in Notes', async () => {
    const parsed = parseCSV('Vague Info,Pod\nMet at a founder dinner and asked for the LP update,LPs\n')
    const mapping = detectColumns(parsed.headers)
    const podMap = new Map([[normalize('LPs'), 'pod-lps']])

    const result = await importContacts(parsed.rows, '', undefined, {
      type: 'Contact',
      mapping,
      podIds: [],
      podMap,
    })

    expect(result).toEqual({ imported: 1, skipped: 0, errors: [] })
    const [records] = mockedCreateContactsBulk.mock.calls[0]
    expect(records[0]).toMatchObject({
      name: 'Imported Contact Row 2',
      notes: 'Vague Info: Met at a founder dinner and asked for the LP update',
      list_ids: ['pod-lps'],
    })
  })

  it('builds names from first, middle, and last name variants', async () => {
    const parsed = parseCSV('First Name,Second Name,Last Name,Company Name,Pod\nAna Maria,Luisa,Gomez,Kinship Ventures,LPs\n')
    const mapping = detectColumns(parsed.headers)
    const podMap = new Map([[normalize('LPs'), 'pod-lps']])

    await importContacts(parsed.rows, '', undefined, {
      type: 'Contact',
      mapping,
      podIds: [],
      podMap,
    })

    const [records] = mockedCreateContactsBulk.mock.calls[0]
    expect(records[0]).toMatchObject({
      name: 'Ana Maria Luisa Gomez',
      first_name: 'Ana Maria',
      last_name: 'Gomez',
      company: 'Kinship Ventures',
      notes: 'Second Name: Luisa',
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
