import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { strToU8, zipSync } from 'fflate'
import { addContactToCampaign, createCampaign, createContactsBulk, getCampaigns, getContacts, getInteractions, logInteraction, updateCampaignContact, updateContact } from './data'
import {
  countInvalidRows,
  detectColumns,
  getRowWarnings,
  importContacts,
  normalize,
  normalizeColumnMapping,
  parseCSV,
  parseTaskContentInteractions,
  parseWorkbookBuffer,
} from './csvImport'

vi.mock('./data', () => ({
  getContacts: vi.fn(),
  updateContact: vi.fn(),
  createContactsBulk: vi.fn(),
  getCampaigns: vi.fn(),
  getInteractions: vi.fn(),
  logInteraction: vi.fn(),
  createCampaign: vi.fn(),
  addContactToCampaign: vi.fn(),
  updateCampaignContact: vi.fn(),
}))

const mockedGetContacts = vi.mocked(getContacts)
const mockedUpdateContact = vi.mocked(updateContact)
const mockedCreateContactsBulk = vi.mocked(createContactsBulk)
const mockedGetCampaigns = vi.mocked(getCampaigns)
const mockedGetInteractions = vi.mocked(getInteractions)
const mockedLogInteraction = vi.mocked(logInteraction)
const mockedCreateCampaign = vi.mocked(createCampaign)
const mockedAddContactToCampaign = vi.mocked(addContactToCampaign)
const mockedUpdateCampaignContact = vi.mocked(updateCampaignContact)

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function columnName(index: number): string {
  let n = index + 1
  let name = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    name = String.fromCharCode(65 + rem) + name
    n = Math.floor((n - 1) / 26)
  }
  return name
}

function worksheetXml(rows: string[][]): string {
  const sheetRows = rows.map((row, rowIndex) => {
    const cells = row.map((value, colIndex) => {
      if (!value) return ''
      const ref = `${columnName(colIndex)}${rowIndex + 1}`
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
    }).join('')
    return `<row r="${rowIndex + 1}">${cells}</row>`
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`
}

function workbookBuffer(sheets: Array<{ name: string; rows: string[][] }>): ArrayBuffer {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}</sheets></workbook>`
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}</Relationships>`
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(contentTypes),
    '_rels/.rels': strToU8(rootRels),
    'xl/workbook.xml': strToU8(workbook),
    'xl/_rels/workbook.xml.rels': strToU8(workbookRels),
  }
  sheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(worksheetXml(sheet.rows))
  })

  const zipped = zipSync(files)
  return zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedGetContacts.mockResolvedValue([])
  mockedUpdateContact.mockImplementation(async (id, data) => ({ id, name: 'Updated', created_at: '2026-05-28T00:00:00.000Z', ...data } as any))
  mockedGetCampaigns.mockResolvedValue([])
  mockedGetInteractions.mockResolvedValue([])
  mockedLogInteraction.mockImplementation(async (contactId, data) => ({
    ...data,
    id: `interaction-${contactId}-${data.date}`,
    contact_id: contactId,
    created_at: '2026-05-28T00:00:00.000Z',
  } as any))
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
      'Name',
      'Task Content',
      'List',
      'Lists',
      'Assistant Info (text)',
      'CITY (drop down)',
      'COUNTRY (drop down)',
      'Category (drop down)',
      'FUND TYPE (drop down)',
      'GENDER (drop down)',
    ])
    expect(parsed.headers).toContain('💌 Email (email)')
  }, 10000)

  it('parses all visible Excel worksheets into one import table', async () => {
    const parsed = await parseWorkbookBuffer(workbookBuffer([
      {
        name: 'All LPs',
        rows: [
          ['Name', 'Email', 'Task Content'],
          ['Sultan Fahad Salman', 'sultanfsa@gmail.com', 'Updates 2024\nJul 19 - Sent deck'],
        ],
      },
      {
        name: 'LP Investments',
        rows: [
          ['LP Name', 'Investments'],
          ['Sultan Fahad Salman', 'Goop; Figs'],
        ],
      },
    ]))

    expect(parsed.headers).toEqual(['Name', 'Email', 'Task Content', 'LP Name', 'Investments', 'Source Sheet'])
    expect(parsed.rows).toEqual([
      {
        Name: 'Sultan Fahad Salman',
        Email: 'sultanfsa@gmail.com',
        'Task Content': 'Updates 2024\nJul 19 - Sent deck',
        'Source Sheet': 'All LPs',
      },
      {
        'LP Name': 'Sultan Fahad Salman',
        Investments: 'Goop; Figs',
        'Source Sheet': 'LP Investments',
      },
    ])
  })

  it('detects human relationship columns from flexible headers', () => {
    const mapping = detectColumns(['Full Name', 'Relationship Pod', 'Sub Pod', 'Last Interaction', 'Cadence'])

    expect(mapping.map(m => m.targetField)).toEqual([
      'First Name',
      'Pod',
      'Sub-pod',
      null,
      null,
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
      null,
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

  it('detects selected LP tracker fields from client exports', () => {
    const mapping = detectColumns(['Fund Type', 'Assistant Info', 'Global Region', 'Upwork Link', 'Task Content'])

    expect(mapping.map(m => m.targetField)).toEqual([
      'Fund Type',
      'Assistant Info',
      'Global Region',
      'Upwork Link',
      'ClickUp Task Content',
    ])
  })

  it('prefers full-name columns over separate first-name aliases when both exist', () => {
    const mapping = detectColumns(['Name', 'First Name', 'Company Name'])

    expect(mapping.map(m => m.targetField)).toEqual([
      'First Name',
      null,
      'Company',
    ])
  })

  it('uses generic Name as the full-name source even when First Name columns are present', async () => {
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
      name: 'Generic Name',
      first_name: 'Generic Name',
      last_name: null,
      list_ids: ['pod-lps'],
      notes: null,
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
      last_contacted_at: null,
      contact_frequency: null,
      next_action: null,
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

  it('stores selected LP tracker fields in controlled contact custom fields', async () => {
    const parsed = parseCSV([
      'Name,Company,Email,Sub Pod,Fund Type,Assistant Info,Global Region,Address,Upwork Link,SPV Investor,SPV Investor Flag,LinkedIn Labels,Task Content',
      'Ivan Soto-Wright,MoonPay,ivan@navihold.vc,LP Internal,Fund I,"Assistant notes",ME,"Miami HQ",https://upwork.example/ivan,TeraWulf,Yes,"Founder; Investor","Updates 2024\nJul 19 - Sent deck"',
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

    expect(result).toEqual({ imported: 1, skipped: 0, errors: [], interactionsImported: 1 })
    const [records] = mockedCreateContactsBulk.mock.calls[0]
    expect(records[0]).toMatchObject({
      name: 'Ivan Soto-Wright',
      first_name: 'Ivan Soto-Wright',
      company: 'MoonPay',
      email: 'ivan@navihold.vc',
      notes: null,
      list_ids: ['pod-lps'],
      primary_list_id: 'pod-lps',
      category_ids: ['cat-lp-internal'],
      spv_investor: ['TeraWulf'],
      custom_fields: {
        fundType: 'Fund I',
        assistantInfo: 'Assistant notes',
        globalRegionDetail: 'ME',
        address: 'Miami HQ',
        upworkLink: 'https://upwork.example/ivan',
        spvInvestorFlag: true,
        linkedInLabels: ['Founder', 'Investor'],
        clickupTaskContent: 'Updates 2024\nJul 19 - Sent deck',
      },
    })
  })

  it('parses ClickUp update blocks into dated recent activity touchpoints', () => {
    const touchpoints = parseTaskContentInteractions([
      'Overview',
      'HRH is a Kaufman Fellow.',
      '',
      'Updates 2924',
      'Jul 19 - Sent deck',
      'Jul 30 - Looking for a call after Aug 2',
      'Aug 1 - Scheduling Aug 2 or next week',
      'Aug 9 - had a call, will give an answer by September',
      'Oct 9 - no response',
      '',
      'EMAIL DRAFT',
      'Sultanfsa@gmail.com',
    ].join('\n'))

    expect(touchpoints.map(t => ({ date: t.date, type: t.type, notes: t.notes }))).toEqual([
      { date: '2024-07-19', type: 'email', notes: 'Sent deck' },
      { date: '2024-07-30', type: 'call', notes: 'Looking for a call after Aug 2' },
      { date: '2024-08-01', type: 'email', notes: 'Scheduling Aug 2 or next week' },
      { date: '2024-08-09', type: 'call', notes: 'had a call, will give an answer by September' },
      { date: '2024-10-09', type: 'email', notes: 'no response' },
    ])
    expect(touchpoints.every(t => t.source === 'Manual')).toBe(true)
  })

  it('digests selected ClickUp LP export headers and skips unselected columns', async () => {
    const parsed = parseCSV([
      [
        'Task Type',
        'Task ID',
        'Name',
        'Status',
        'Task Content',
        'List',
        'Lists',
        'FIRST NAME (short text)',
        'LAST NAME (short text)',
        '💌 Email (email)',
        '📞 Phone (phone)',
        '🏢 Company (short text)',
        'LinkedIn (url)',
        'LinkedIn (labels)',
        'Fundraise Status (drop down)',
        'KV LP Status (drop down)',
        'Investment Entity (text)',
        'SPV Investor (labels)',
        'SPV INVESTOR (checkbox)',
        '✍️ Noteables (text)',
        '🌐 Website (url)',
        '🏢 Address (short text)',
        '👍 Likelihood (drop down)',
        'CITY (drop down)',
        'COUNTRY (drop down)',
        'Category (drop down)',
        'Summary (text)',
        'TLDR (text)',
      ].join(','),
      [
        'Person',
        'abc123',
        'Ivan Soto-Wright',
        'FOR CONNECTING',
        'Long task body',
        'LP Internal',
        '[LPs]',
        'Ivan',
        'Soto-Wright',
        'ivan@navihold.vc',
        '+1 555 0100',
        'MoonPay',
        'https://linkedin.com/in/isotowright',
        'Founder; Investor',
        'Closed',
        'First Close Committed',
        'Navihold Ventures LLC',
        'TeraWulf',
        'TRUE',
        'Important note',
        'https://moonpay.com',
        'Miami HQ',
        'Medium-High',
        'Miami',
        'United States',
        'Capital Investor',
        'Summary text',
        'TLDR text',
      ].join(','),
    ].join('\n'))
    const mapping = detectColumns(parsed.headers)
    const podMap = new Map([[normalize('LPs'), 'pod-lps']])
    const categoryMap = new Map([[`pod-lps:${normalize('LP Internal')}`, 'cat-lp-internal']])
    const categoryPodMap = new Map([['cat-lp-internal', 'pod-lps']])

    const result = await importContacts(parsed.rows, '', undefined, {
      type: 'Contact',
      mapping,
      podIds: [],
      podMap,
      categoryMap,
      categoryPodMap,
    })

    expect(result).toEqual({ imported: 1, skipped: 0, errors: [] })
    const [records] = mockedCreateContactsBulk.mock.calls[0]
    expect(records[0]).toMatchObject({
      name: 'Ivan Soto-Wright',
      first_name: 'Ivan Soto-Wright',
      last_name: null,
      email: 'ivan@navihold.vc',
      phone: '+1 555 0100',
      company: 'MoonPay',
      linkedin: 'https://linkedin.com/in/isotowright',
      website: 'https://moonpay.com',
      country: 'United States',
      list_ids: ['pod-lps'],
      primary_list_id: 'pod-lps',
      category_ids: ['cat-lp-internal'],
      spv_investor: ['TeraWulf'],
      custom_fields: {
        clickupTaskContent: 'Long task body',
        linkedInLabels: ['Founder', 'Investor'],
        spvInvestorFlag: true,
        notables: 'Important note',
        address: 'Miami HQ',
        city: 'Miami',
        category: 'Capital Investor',
      },
    })
    expect(records[0].custom_fields).not.toHaveProperty('clickupTaskId')
    expect(records[0].custom_fields).not.toHaveProperty('summary')
  })

  it('imports ClickUp update blocks into Supabase-backed recent activity', async () => {
    const taskContent = [
      'Overview',
      'HRH is a Kaufman Fellow.',
      '',
      'Updates 2924',
      'Jul 19 - Sent deck',
      'Jul 30 - Looking for a call after Aug 2',
      'Aug 1 - Scheduling Aug 2 or next week',
      'Aug 9 - had a call, will give an answer by September',
      'Oct 9 - no response',
      '',
      'EMAIL DRAFT',
      'Sultanfsa@gmail.com',
    ].join('\n')
    const parsed = parseCSV([
      'Name,Email,Task Content',
      `"Sultan Fahad Salman",sultanfsa@gmail.com,"${taskContent.replace(/"/g, '""')}"`,
    ].join('\n'))
    const mapping = detectColumns(parsed.headers)

    const result = await importContacts(parsed.rows, '', undefined, {
      type: 'Contact',
      mapping,
      podIds: [],
    })

    expect(result).toEqual({ imported: 1, skipped: 0, errors: [], interactionsImported: 5 })
    expect(mockedGetInteractions).toHaveBeenCalledWith('created-0')
    expect(mockedLogInteraction).toHaveBeenCalledTimes(5)
    expect(mockedLogInteraction.mock.calls.map(call => [call[0], call[1].date, call[1].type, call[1].notes])).toEqual([
      ['created-0', '2024-07-19', 'email', 'Sent deck'],
      ['created-0', '2024-07-30', 'call', 'Looking for a call after Aug 2'],
      ['created-0', '2024-08-01', 'email', 'Scheduling Aug 2 or next week'],
      ['created-0', '2024-08-09', 'call', 'had a call, will give an answer by September'],
      ['created-0', '2024-10-09', 'email', 'no response'],
    ])
  })

  it('merges duplicate LP rows from separate Excel tabs before creating contacts', async () => {
    const parsed = await parseWorkbookBuffer(workbookBuffer([
      {
        name: 'All LPs',
        rows: [
          ['Name', 'Email', 'Task Content'],
          ['Sultan Fahad Salman', 'sultanfsa@gmail.com', 'Updates 2024\nJul 19 - Sent deck'],
        ],
      },
      {
        name: 'LP Investments',
        rows: [
          ['LP Name', 'Investments'],
          ['Sultan Fahad Salman', 'Goop; Figs'],
        ],
      },
    ]))
    const mapping = detectColumns(parsed.headers)

    const result = await importContacts(parsed.rows, '', undefined, {
      type: 'Contact',
      mapping,
      podIds: [],
    })

    expect(result).toEqual({ imported: 1, skipped: 0, errors: [], interactionsImported: 1 })
    expect(mockedCreateContactsBulk).toHaveBeenCalledTimes(1)
    const [records] = mockedCreateContactsBulk.mock.calls[0]
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      name: 'Sultan Fahad Salman',
      email: 'sultanfsa@gmail.com',
      custom_fields: {
        clickupTaskContent: 'Updates 2024\nJul 19 - Sent deck',
      },
    })
    expect(records[0].notes).toBeNull()
    expect(records[0].custom_fields).not.toHaveProperty('correspondingInvestments')
    expect(mockedLogInteraction).toHaveBeenCalledWith('created-0', expect.objectContaining({
      date: '2024-07-19',
      type: 'email',
      notes: 'Sent deck',
    }))
  })

  it('skips campaign-specific client sheet columns that are outside the approved field list', async () => {
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

    expect(result).toEqual({ imported: 1, skipped: 0, errors: [] })
    const [records] = mockedCreateContactsBulk.mock.calls[0]
    expect(records[0]).toMatchObject({
      name: 'Ivan Soto-Wright',
      first_name: 'Ivan Soto-Wright',
      company: 'MoonPay',
      recommended_by: 'Mark Suster',
      intel_notes: null,
      list_ids: [],
      primary_list_id: null,
      category_ids: [],
      custom_fields: {},
    })
    expect(mockedAddContactToCampaign).not.toHaveBeenCalled()
    expect(mockedUpdateCampaignContact).not.toHaveBeenCalled()
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

    expect(result).toEqual({ imported: 0, skipped: 0, errors: [], updated: 1 })
    expect(mockedCreateContactsBulk).not.toHaveBeenCalled()
    expect(mockedUpdateContact).toHaveBeenCalledWith('contact-ivan', expect.objectContaining({
      company: 'MoonPay',
      recommended_by: 'Mark Suster',
    }))
    expect(mockedUpdateContact).not.toHaveBeenCalledWith('contact-ivan', expect.objectContaining({
      intel_notes: 'Advisor to MoonPay',
      list_ids: ['pod-lps'],
      primary_list_id: 'pod-lps',
      category_ids: ['cat-lp-internal'],
    }))
    expect(mockedAddContactToCampaign).not.toHaveBeenCalled()
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

  it('skips unmapped spreadsheet columns without creating notes or custom fields', async () => {
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
      notes: null,
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
      notes: null,
      custom_fields: {},
      list_ids: ['pod-default'],
    })
    expect(records[0]).not.toHaveProperty('invented_field')
  })

  it('imports vague rows with fallback names while skipping unapproved source data', async () => {
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
      notes: null,
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
      notes: null,
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
