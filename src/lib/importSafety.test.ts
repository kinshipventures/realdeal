import { beforeEach, describe, expect, it, vi } from 'vitest'
import { strToU8, zipSync } from 'fflate'
import { addContactToCampaign, createCampaign, createCampaignStage, createContactsBulk, getCampaigns, getContacts, getInteractions, getStagesForCampaign, logInteraction, updateCampaignContact, updateContact } from './data'
import { detectColumns, importContacts, normalize, parseWorkbookBuffer } from './csvImport'
import type { Campaign, CampaignContact, CampaignStage, Contact, ImportProgress } from './types'

vi.mock('./data', () => ({
  getContacts: vi.fn(),
  updateContact: vi.fn(),
  createContactsBulk: vi.fn(),
  getCampaigns: vi.fn(),
  getInteractions: vi.fn(),
  getStagesForCampaign: vi.fn(),
  createCampaignStage: vi.fn(),
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
const mockedGetStagesForCampaign = vi.mocked(getStagesForCampaign)
const mockedCreateCampaignStage = vi.mocked(createCampaignStage)
const mockedLogInteraction = vi.mocked(logInteraction)
const mockedCreateCampaign = vi.mocked(createCampaign)
const mockedAddContactToCampaign = vi.mocked(addContactToCampaign)
const mockedUpdateCampaignContact = vi.mocked(updateCampaignContact)

const createdAt = '2026-06-30T00:00:00.000Z'

let idCounter = 0
let storedContacts: Contact[] = []
let storedCampaignLinks: CampaignContact[] = []
let campaignLinkPatches: Array<{ id: string; data: Partial<CampaignContact> }> = []

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

function workbookBuffer(rows: string[][]): ArrayBuffer {
  const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'
  const rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
  const workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Import Safety Fixture" sheetId="1" r:id="rId1"/></sheets></workbook>'
  const workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'
  const zipped = zipSync({
    '[Content_Types].xml': strToU8(contentTypes),
    '_rels/.rels': strToU8(rootRels),
    'xl/workbook.xml': strToU8(workbook),
    'xl/_rels/workbook.xml.rels': strToU8(workbookRels),
    'xl/worksheets/sheet1.xml': strToU8(worksheetXml(rows)),
  })
  return zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength)
}

function contactNamed(name: string): Contact {
  const contact = storedContacts.find(record => record.name === name)
  expect(contact, `Expected ${name} to be stored`).toBeTruthy()
  return contact!
}

function campaignLinkFor(contactId: string, campaignId: string): CampaignContact {
  const link = storedCampaignLinks.find(item => item.contact_id === contactId && item.campaign_id === campaignId)
  expect(link, `Expected ${contactId} to be linked to ${campaignId}`).toBeTruthy()
  return link!
}

function expectImportProgressCompleted(progress: ImportProgress[], total: number) {
  expect(progress.length).toBeGreaterThan(0)
  expect(progress.every(item => item.total === total)).toBe(true)
  expect(progress.some(item => item.current > 0)).toBe(true)
  const final = progress.at(-1)
  expect(final).toMatchObject({ current: total, total })
  expect((final?.imported ?? 0) + (final?.updated ?? 0) + (final?.skipped ?? 0)).toBeGreaterThan(0)
}

beforeEach(() => {
  vi.clearAllMocks()
  idCounter = 0
  storedContacts = []
  storedCampaignLinks = []
  campaignLinkPatches = []

  const campaigns: Campaign[] = [
    {
      id: 'campaign-fund-i',
      name: 'Kinship Ventures Fund I',
      type: 'fundraise',
      deadline: null,
      status: 'active',
      notes: null,
      description: null,
      custom_fields: {},
      contact_ids: [],
      created_at: createdAt,
    },
    {
      id: 'campaign-dinner',
      name: 'LP Dinner 2026',
      type: 'event',
      deadline: null,
      status: 'active',
      notes: null,
      description: null,
      custom_fields: {},
      contact_ids: [],
      created_at: createdAt,
    },
  ]
  const stagesByCampaign = new Map<string, CampaignStage[]>([
    ['campaign-fund-i', [
      { id: 'stage-fund-closed-won', campaign_id: 'campaign-fund-i', name: 'Closed/Won', color: null, order: 0, created_at: createdAt },
    ]],
    ['campaign-dinner', [
      { id: 'stage-dinner-for-connecting', campaign_id: 'campaign-dinner', name: 'For Connecting', color: null, order: 0, created_at: createdAt },
    ]],
  ])

  mockedGetContacts.mockImplementation(async () => storedContacts)
  mockedGetCampaigns.mockResolvedValue(campaigns)
  mockedGetInteractions.mockResolvedValue([])
  mockedGetStagesForCampaign.mockImplementation(async campaignId => stagesByCampaign.get(campaignId) ?? [])
  mockedCreateCampaignStage.mockImplementation(async (campaignId, name, order, color) => ({
    id: `stage-${campaignId}-${normalize(name).replace(/\s+/g, '-')}`,
    campaign_id: campaignId,
    name,
    color: color ?? null,
    order,
    created_at: createdAt,
  }))
  mockedCreateCampaign.mockImplementation(async data => ({
    id: `campaign-${normalize(data.name).replace(/\s+/g, '-')}`,
    name: data.name,
    type: data.type,
    deadline: data.deadline ?? null,
    status: 'active',
    notes: null,
    description: null,
    custom_fields: {},
    contact_ids: [],
    created_at: createdAt,
  }))
  mockedCreateContactsBulk.mockImplementation(async records => {
    const created = records.map(record => ({
      ...record,
      id: `stored-${++idCounter}`,
      created_at: createdAt,
    } as Contact))
    storedContacts = [...storedContacts, ...created]
    return created
  })
  mockedUpdateContact.mockImplementation(async (id, data) => {
    const existing = storedContacts.find(record => record.id === id)
    expect(existing, `Expected ${id} before update`).toBeTruthy()
    const updated = { ...existing!, ...data } as Contact
    storedContacts = storedContacts.map(record => record.id === id ? updated : record)
    return updated
  })
  mockedAddContactToCampaign.mockImplementation(async (campaignId, contactId, stageId) => {
    const existing = storedCampaignLinks.find(item => item.campaign_id === campaignId && item.contact_id === contactId)
    if (existing) return existing
    const link: CampaignContact = {
      id: `campaign-link-${storedCampaignLinks.length + 1}`,
      campaign_id: campaignId,
      contact_id: contactId,
      status: 'pending',
      stage_id: stageId ?? null,
      notes: null,
      owner: null,
      next_step: null,
      next_step_due: null,
      moved_at: createdAt,
      is_priority: false,
      custom_fields: {},
      created_at: createdAt,
    }
    storedCampaignLinks = [...storedCampaignLinks, link]
    return link
  })
  mockedUpdateCampaignContact.mockImplementation(async (id, data) => {
    campaignLinkPatches.push({ id, data })
    const existing = storedCampaignLinks.find(item => item.id === id)
    expect(existing, `Expected campaign link ${id} before update`).toBeTruthy()
    const updated = { ...existing!, ...data } as CampaignContact
    storedCampaignLinks = storedCampaignLinks.map(item => item.id === id ? updated : item)
    return updated
  })
  mockedLogInteraction.mockImplementation(async (contactId, data) => ({
    ...data,
    id: `interaction-${contactId}`,
    contact_id: contactId,
    created_at: createdAt,
  }))
})

describe('import safety gate', () => {
  it('imports a real Excel fixture without stalled progress and stores the expected CRM relationships', async () => {
    const parsed = await parseWorkbookBuffer(workbookBuffer([
      [
        'Name',
        'Company',
        'Job Title',
        'LinkedIn',
        'Referred By',
        'Gender',
        'Birthday',
        'Email',
        'Email 2',
        'Phone',
        'Country',
        'Global Region',
        'Kinship Investments 1',
        'Investment Entity',
        'Investment Email',
        'Pod 1',
        'Pod 2',
        'Sub-pod 1',
        'Sub-pod 2',
        'Campaign 1',
        'Campaign 1 Status',
        'Campaign 1 Target Commitment',
        'Campaign 2',
        'Campaign 2 Status',
        'Campaign 2 Target Commitment',
      ],
      [
        'Sultan Fahad Salman',
        'Erad Holding Group',
        'Managing Director',
        'https://linkedin.example/sultan',
        'Princess Reema',
        'Male',
        '1985-01-01',
        'sultan@example.com',
        'sultan.alt@example.com',
        '+966 55 333 1133',
        'Saudi Arabia',
        'ME',
        'Kinship Fund I',
        'Safety Future Ventures Limited',
        'investments@example.com',
        'LPs',
        'MAPS',
        'LP Internal / LPs',
        'Execs / MAPS',
        'Kinship Ventures Fund I',
        'Closed/Won',
        '1000000',
        'LP Dinner 2026',
        'For Connecting',
        '250000',
      ],
      [
        'Maya Chen',
        'MoonPay',
        'Investor',
        'https://linkedin.example/maya',
        'Moj Mahdara',
        'Female',
        '1990-03-15',
        'maya@example.com',
        '',
        '+1 555 111 2222',
        'United States',
        'NA',
        'Kinship Fund II',
        '',
        '',
        'LPs',
        '',
        'LP Internal / LPs',
        '',
        'Kinship Ventures Fund I',
        'Closed/Won',
        '500000',
        '',
        '',
        '',
      ],
    ]))
    const mapping = detectColumns(parsed.headers)
    const progress: ImportProgress[] = []
    const podMap = new Map([
      [normalize('LPs'), 'pod-lps'],
      [normalize('MAPS'), 'pod-maps'],
    ])
    const categoryMap = new Map([
      [`pod-lps:${normalize('LP Internal')}`, 'cat-lp-internal'],
      [`pod-maps:${normalize('Execs')}`, 'cat-execs-maps'],
    ])
    const categoryPodMap = new Map([
      ['cat-lp-internal', 'pod-lps'],
      ['cat-execs-maps', 'pod-maps'],
    ])
    const campaignMap = new Map([
      [normalize('Kinship Ventures Fund I'), 'campaign-fund-i'],
      [normalize('LP Dinner 2026'), 'campaign-dinner'],
    ])

    const result = await importContacts(parsed.rows, '', item => progress.push(item), {
      type: 'Contact',
      mapping,
      podIds: [],
      podMap,
      categoryMap,
      categoryPodMap,
      campaignMap,
      batchId: 'import-safety-gate',
      importSource: 'xlsx',
    })

    expect(result).toEqual({ imported: 2, skipped: 0, errors: [], campaignLinked: 3 })
    expectImportProgressCompleted(progress, 2)

    const sultan = contactNamed('Sultan Fahad Salman')
    expect(sultan).toMatchObject({
      type: 'Contact',
      email: 'sultan@example.com',
      email_2: 'sultan.alt@example.com',
      company: 'Erad Holding Group',
      role: 'Managing Director',
      linkedin: 'https://linkedin.example/sultan',
      recommended_by: 'Princess Reema',
      country: 'Saudi Arabia',
      global_region: 'ME',
      list_ids: ['pod-lps', 'pod-maps'],
      primary_list_id: 'pod-lps',
      category_ids: ['cat-lp-internal', 'cat-execs-maps'],
      kv_fund_investor: ['Kinship Fund I'],
      import_batch_id: 'import-safety-gate',
      import_source: 'xlsx',
      custom_fields: expect.objectContaining({
        investmentEntity: 'Safety Future Ventures Limited',
        investmentEmail: 'investments@example.com',
      }),
    })
    const erad = contactNamed('Erad Holding Group')
    expect(erad).toMatchObject({ type: 'Company', name: 'Erad Holding Group' })
    expect(sultan.company_record_id).toBe(erad.id)
    expect(sultan.company_ids).toContain(erad.id)

    const maya = contactNamed('Maya Chen')
    expect(maya).toMatchObject({
      email: 'maya@example.com',
      company: 'MoonPay',
      list_ids: ['pod-lps'],
      primary_list_id: 'pod-lps',
      category_ids: ['cat-lp-internal'],
      kv_fund_investor: ['Kinship Fund II'],
    })
    const moonpay = contactNamed('MoonPay')
    expect(maya.company_record_id).toBe(moonpay.id)

    const sultanFundLink = campaignLinkFor(sultan.id, 'campaign-fund-i')
    const sultanDinnerLink = campaignLinkFor(sultan.id, 'campaign-dinner')
    const mayaFundLink = campaignLinkFor(maya.id, 'campaign-fund-i')
    expect(sultanFundLink.stage_id).toBe('stage-fund-closed-won')
    expect(sultanDinnerLink.stage_id).toBe('stage-dinner-for-connecting')
    expect(mayaFundLink.stage_id).toBe('stage-fund-closed-won')
    expect(campaignLinkPatches).toEqual(expect.arrayContaining([
      {
        id: sultanFundLink.id,
        data: {
          custom_fields: {
            commitmentAmount: 1000000,
            campaignStatus: 'Closed/Won',
          },
        },
      },
      {
        id: sultanDinnerLink.id,
        data: {
          custom_fields: {
            commitmentAmount: 250000,
            campaignStatus: 'For Connecting',
          },
        },
      },
      {
        id: mayaFundLink.id,
        data: {
          custom_fields: {
            commitmentAmount: 500000,
            campaignStatus: 'Closed/Won',
          },
        },
      },
    ]))
  })
})
