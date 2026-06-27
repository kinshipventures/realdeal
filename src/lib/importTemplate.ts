import { strToU8, zipSync } from 'fflate'
import { getCampaigns, getCategories, getCompanies, getContacts, getPipelineStages, getPods } from './data'
import { getFieldConfigs } from './fieldConfig'
import { DEFAULT_KINSHIP_INVESTMENTS } from './kinshipInvestments'
import { LP_TRACKER_FIELDS } from './lpTrackerFields'
import type { Campaign, CampaignStage, Category, Company, Contact, Pod } from './types'

type OptionColumn = {
  key: string
  label: string
  values: string[]
}

type TemplateValidation = {
  header: string
  optionKey: string
}

export type ImportTemplateWorkspaceData = {
  pods: Pod[]
  categories: Category[]
  campaigns: Campaign[]
  campaignStages: CampaignStage[]
  contacts: Contact[]
  companies: Company[]
  customFieldNames: string[]
}

const TEMPLATE_HEADERS = [
  'Name',
  'Company',
  'Job Title',
  'LinkedIn',
  'Referred By',
  'Gender',
  'Birthday',
  'Email',
  'Email 2',
  'Email 3',
  'Phone',
  'Address',
  'City',
  'State',
  'Country',
  'Global Region',
  'Assistant Info',
  'Kinship Investments 1',
  'Kinship Investments 2',
  'Kinship Investments 3',
  'Kinship Investments 4',
  'Kinship Investments 5',
  'Investment Entity',
  'Investment Email',
  'Pod 1',
  'Pod 2',
  'Pod 3',
  'Sub-pod 1',
  'Sub-pod 2',
  'Sub-pod 3',
  'Sub-pod 4',
  'Sub-pod 5',
  'Campaign 1',
  'Campaign 1 Status',
  'Campaign 1 Target Commitment',
  'Campaign 2',
  'Campaign 2 Status',
  'Campaign 2 Target Commitment',
  'Campaign 3',
  'Campaign 3 Status',
  'Campaign 3 Target Commitment',
  'Companies',
  'Contacts',
]

const BASE_VALIDATIONS: TemplateValidation[] = [
  { header: 'Gender', optionKey: 'gender' },
  { header: 'Global Region', optionKey: 'globalRegion' },
  { header: 'Kinship Investments 1', optionKey: 'kinshipInvestments' },
  { header: 'Kinship Investments 2', optionKey: 'kinshipInvestments' },
  { header: 'Kinship Investments 3', optionKey: 'kinshipInvestments' },
  { header: 'Kinship Investments 4', optionKey: 'kinshipInvestments' },
  { header: 'Kinship Investments 5', optionKey: 'kinshipInvestments' },
  { header: 'Pod 1', optionKey: 'pods' },
  { header: 'Pod 2', optionKey: 'pods' },
  { header: 'Pod 3', optionKey: 'pods' },
  { header: 'Sub-pod 1', optionKey: 'subPods' },
  { header: 'Sub-pod 2', optionKey: 'subPods' },
  { header: 'Sub-pod 3', optionKey: 'subPods' },
  { header: 'Sub-pod 4', optionKey: 'subPods' },
  { header: 'Sub-pod 5', optionKey: 'subPods' },
  { header: 'Campaign 1', optionKey: 'campaigns' },
  { header: 'Campaign 2', optionKey: 'campaigns' },
  { header: 'Campaign 3', optionKey: 'campaigns' },
  { header: 'Campaign 1 Status', optionKey: 'campaignStatuses' },
  { header: 'Campaign 2 Status', optionKey: 'campaignStatuses' },
  { header: 'Campaign 3 Status', optionKey: 'campaignStatuses' },
  { header: 'Companies', optionKey: 'companies' },
  { header: 'Contacts', optionKey: 'contacts' },
]

const DEFAULT_CAMPAIGN_STATUSES = ['Pending', 'Reached', 'Responded', 'Confirmed']
const REMOVED_TEMPLATE_FIELD_NAMES = new Set([
  'category',
  'fund type',
  'notes',
  'spv investor',
  'spv investor checkbox',
])

function normalizeRemovedTemplateFieldName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
}

function uniqueSorted(values: Iterable<string>): string[] {
  const seen = new Map<string, string>()
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (!seen.has(key)) seen.set(key, trimmed)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

function companyOptionNames(contacts: Contact[], companies: Company[]): string[] {
  return uniqueSorted([
    ...companies.map(company => company.name),
    ...contacts.filter(contact => contact.type === 'Company').map(contact => contact.name),
    ...contacts.map(contact => contact.company ?? ''),
  ])
}

function investmentOptionNames(): string[] {
  return uniqueSorted(DEFAULT_KINSHIP_INVESTMENTS)
}

function buildOptionColumns(data: ImportTemplateWorkspaceData): OptionColumn[] {
  const companyNames = companyOptionNames(data.contacts, data.companies)
  const investmentNames = investmentOptionNames()
  const contactNames = uniqueSorted(data.contacts.filter(contact => contact.type === 'Contact').map(contact => contact.name))
  const campaignStatuses = uniqueSorted([
    ...DEFAULT_CAMPAIGN_STATUSES,
    ...data.campaignStages.map(stage => stage.name),
  ])

  return [
    { key: 'pods', label: 'Pods', values: uniqueSorted(data.pods.map(pod => pod.name)) },
    { key: 'subPods', label: 'Sub-pods', values: uniqueSorted(data.categories.map(category => category.name)) },
    { key: 'campaigns', label: 'Campaigns', values: uniqueSorted(data.campaigns.map(campaign => campaign.name)) },
    { key: 'campaignStatuses', label: 'Campaign Statuses', values: campaignStatuses },
    { key: 'companies', label: 'Companies', values: companyNames },
    { key: 'contacts', label: 'Contacts', values: contactNames },
    { key: 'kinshipInvestments', label: 'Kinship Investments', values: investmentNames },
    { key: 'gender', label: 'Gender', values: ['Female', 'Male', 'Non-binary', 'Other'] },
    { key: 'globalRegion', label: 'Global Region', values: ['AMER', 'APAC', 'EU', 'LATAM', 'ME'] },
  ]
}

function templateHeaders(customFieldNames: string[]): string[] {
  const standard = new Set(TEMPLATE_HEADERS.map(header => header.toLowerCase()))
  const lpTracker = new Set(LP_TRACKER_FIELDS.map(field => field.target.toLowerCase()))
  const custom = customFieldNames.filter(name => {
    const key = normalizeRemovedTemplateFieldName(name)
    return key && !standard.has(key) && !lpTracker.has(key) && !REMOVED_TEMPLATE_FIELD_NAMES.has(key)
  })
  return [...TEMPLATE_HEADERS, ...custom]
}

function columnName(index: number): string {
  let n = index + 1
  let name = ''
  while (n > 0) {
    const remainder = (n - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    n = Math.floor((n - 1) / 26)
  }
  return name
}

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function rowXml(values: string[], rowNumber: number, styleId = 0): string {
  const cells = values.map((value, index) => {
    const ref = `${columnName(index)}${rowNumber}`
    const style = styleId ? ` s="${styleId}"` : ''
    return `<c r="${ref}" t="inlineStr"${style}><is><t>${escapeXml(value)}</t></is></c>`
  })
  return `<row r="${rowNumber}">${cells.join('')}</row>`
}

function validationXml(headers: string[], optionColumns: OptionColumn[], validations: TemplateValidation[]): string {
  const optionIndexByKey = new Map(optionColumns.map((column, index) => [column.key, index]))
  const headerIndexByName = new Map(headers.map((header, index) => [header, index]))
  const items = validations.flatMap(validation => {
    const headerIndex = headerIndexByName.get(validation.header)
    const optionIndex = optionIndexByKey.get(validation.optionKey)
    const optionColumn = optionIndex === undefined ? null : optionColumns[optionIndex]
    if (headerIndex === undefined || optionIndex === undefined || !optionColumn || optionColumn.values.length === 0) return []
    const targetColumn = columnName(headerIndex)
    const sourceColumn = columnName(optionIndex)
    const endRow = optionColumn.values.length + 1
    const formula = `'Options'!$${sourceColumn}$2:$${sourceColumn}$${endRow}`
    return [`<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="${targetColumn}2:${targetColumn}1000"><formula1>${escapeXml(formula)}</formula1></dataValidation>`]
  })
  if (items.length === 0) return ''
  return `<dataValidations count="${items.length}">${items.join('')}</dataValidations>`
}

function worksheetXml(rows: string[][], validations = ''): string {
  const columnCount = Math.max(...rows.map(row => row.length), 1)
  const dimension = `A1:${columnName(columnCount - 1)}${Math.max(rows.length, 1)}`
  const cols = Array.from({ length: columnCount }, (_, index) => {
    const width = index === 0 ? 28 : 22
    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
  }).join('')
  const body = rows.map((row, index) => rowXml(row, index + 1, index === 0 ? 1 : 0)).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="${dimension}"/>
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
      <selection pane="bottomLeft"/>
    </sheetView>
  </sheetViews>
  <cols>${cols}</cols>
  <sheetData>${body}</sheetData>
  ${validations}
</worksheet>`
}

function workbookXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Contacts" sheetId="1" r:id="rId1"/>
    <sheet name="Options" sheetId="2" state="hidden" r:id="rId2"/>
  </sheets>
</workbook>`
}

function workbookRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
}

function rootRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
}

function contentTypesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`
}

function stylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><color rgb="FF111827"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF000000"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFBDECF8"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`
}

function optionsRows(optionColumns: OptionColumn[]): string[][] {
  const maxValues = Math.max(0, ...optionColumns.map(column => column.values.length))
  const rows = [optionColumns.map(column => column.label)]
  for (let index = 0; index < maxValues; index += 1) {
    rows.push(optionColumns.map(column => column.values[index] ?? ''))
  }
  return rows
}

export function buildImportTemplateWorkbook(data: ImportTemplateWorkspaceData): Uint8Array {
  const optionColumns = buildOptionColumns(data)
  const headers = templateHeaders(data.customFieldNames)
  const validations = validationXml(headers, optionColumns, BASE_VALIDATIONS)
  const files = {
    '[Content_Types].xml': strToU8(contentTypesXml()),
    '_rels/.rels': strToU8(rootRelsXml()),
    'xl/workbook.xml': strToU8(workbookXml()),
    'xl/_rels/workbook.xml.rels': strToU8(workbookRelsXml()),
    'xl/styles.xml': strToU8(stylesXml()),
    'xl/worksheets/sheet1.xml': strToU8(worksheetXml([headers], validations)),
    'xl/worksheets/sheet2.xml': strToU8(worksheetXml(optionsRows(optionColumns))),
  }
  return zipSync(files)
}

export async function getWorkspaceImportTemplateData(): Promise<ImportTemplateWorkspaceData> {
  const [pods, categories, campaigns, contacts, companies, fieldConfigs] = await Promise.all([
    getPods(),
    getCategories(),
    getCampaigns(),
    getContacts(),
    getCompanies(),
    getFieldConfigs().catch(() => []),
  ])
  const campaignStages = (await Promise.all(campaigns.map(campaign => getPipelineStages(campaign.id)))).flat()
  return {
    pods,
    categories,
    campaigns,
    campaignStages,
    contacts,
    companies,
    customFieldNames: fieldConfigs.map(field => field.name),
  }
}

export async function buildWorkspaceImportTemplateBlob(): Promise<Blob> {
  const bytes = buildImportTemplateWorkbook(await getWorkspaceImportTemplateData())
  return new Blob([bytes as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export async function downloadWorkspaceImportTemplate(workspaceSlug?: string | null): Promise<void> {
  const blob = await buildWorkspaceImportTemplateBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safeSlug = (workspaceSlug ?? 'workspace').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workspace'
  a.href = url
  a.download = `realdeal-${safeSlug}-contact-import-template.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
