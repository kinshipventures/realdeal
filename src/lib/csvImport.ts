import * as Papa from 'papaparse'
import { strFromU8, unzipSync } from 'fflate'
import type { Cadence, Contact, ContactFrequency, Gender, Interaction, InteractionSource, InteractionType, RelationshipType } from './types'
import { addContactToCampaign, createCampaign, createContactsBulk, getCampaigns, getContacts, getInteractions, logInteraction, updateCampaignContact, updateContact } from './data'
import { CAMPAIGN_COMMITMENT_AMOUNT_FIELD, CAMPAIGN_SOURCE_STATUS_FIELD, parseMoneyInput, withMoneyField, withTextField } from './campaignCommitments'
import { LP_TRACKER_ALIAS_ENTRIES, LP_TRACKER_FIELDS, LP_TRACKER_TARGET_FIELDS, normalizeLpTrackerFieldValue, trimImportListItem } from './lpTrackerFields'

export type ParsedCSV = { headers: string[]; rows: Record<string, string>[] }

export type ColumnMapping = { csvHeader: string; targetField: string | null }[]

export type ImportProgress = { current: number; total: number; imported: number; skipped: number; updated?: number }

export type ImportResult = { imported: number; skipped: number; errors: string[]; updated?: number; campaignLinked?: number; interactionsImported?: number }

export type RowWarning = {
  rowIndex: number
  kind: 'missing_name' | 'duplicate' | 'bad_date' | 'bad_email'
  detail?: string
}

export const TARGET_FIELDS = [
  'Pod', 'Sub-pod',
  'Campaign', 'Campaign Status', 'Commitment Amount',
  'First Name', 'Last Name',
  'Email', 'Phone', 'Company', 'Role', 'Location',
  'Website', 'LinkedIn', 'Notes', 'Birthday',
  'Industry', 'Domain', 'Stage', 'Ticker',
  'Specialization', 'Recommended By', 'Past Clients',
  'Country', 'Gender',
  'Interests', 'Relationship Context',
  'Email 2', 'Email 3',
  'Introduced By', 'Intel Notes', 'Relationship Owner',
  'Contact Frequency', 'Cadence Override',
  'Last Contacted', 'Next Follow Up Date', 'Next Action',
  'KV Fund Investor', 'SPV Investor',
  ...LP_TRACKER_TARGET_FIELDS,
] as const

type TargetField = typeof TARGET_FIELDS[number]
type ContactInput = Omit<Contact, 'id' | 'created_at'>

const TARGET_FIELD_SET = new Set<string>(TARGET_FIELDS)
const BULK_INSERT_CHUNK_SIZE = 100
const LP_TRACKER_ALIAS_MAP = Object.fromEntries(LP_TRACKER_ALIAS_ENTRIES) as Record<string, TargetField>

const KNOWN_ALIASES: Record<string, TargetField> = {
  // App structure
  'pod': 'Pod',
  'pods': 'Pod',
  'relationship pod': 'Pod',
  'relationship pods': 'Pod',
  'primary pod': 'Pod',
  'assigned pod': 'Pod',
  'pod name': 'Pod',
  'group': 'Pod',
  'groups': 'Pod',
  'list': 'Sub-pod',
  'lists': 'Pod',
  'segment': 'Pod',
  'segments': 'Pod',
  'sub pod': 'Sub-pod',
  'subpod': 'Sub-pod',
  'sub pods': 'Sub-pod',
  'subpods': 'Sub-pod',
  'sub pod category': 'Sub-pod',
  'sub pod name': 'Sub-pod',
  'assigned sub pod': 'Sub-pod',
  'lp sub pod': 'Sub-pod',
  'lp subpod': 'Sub-pod',
  'category': 'Sub-pod',
  'categories': 'Sub-pod',
  'campaign': 'Campaign',
  'campaign name': 'Campaign',
  'campaign pod': 'Campaign',
  'campaign and pod': 'Campaign',
  'campaign sub pod': 'Campaign',
  'campaign subpod': 'Campaign',
  'pipeline': 'Campaign',
  'pipeline name': 'Campaign',
  'campaign status': 'Campaign Status',
  'status campaign field': 'Campaign Status',
  'status campaign': 'Campaign Status',
  'campaign field status': 'Campaign Status',
  'campaign stage': 'Campaign Status',
  'target commitment': 'Commitment Amount',
  'target commitment campaign specific': 'Commitment Amount',
  'target commitment campign specific': 'Commitment Amount',
  'commitment': 'Commitment Amount',
  'commitment amount': 'Commitment Amount',
  'committed amount': 'Commitment Amount',
  'campaign commitment': 'Commitment Amount',
  'campaign commitment amount': 'Commitment Amount',

  // Name
  'name': 'First Name',
  'full name': 'First Name',
  'display name': 'First Name',
  'contact name': 'First Name',
  'person': 'First Name',
  'relationship': 'First Name',
  'agency': 'Company',
  'company name': 'Company',
  'first name': 'First Name',
  'given name': 'First Name',
  'first': 'First Name',
  'firstname': 'First Name',
  'given': 'First Name',
  'forename': 'First Name',
  'last name': 'Last Name',
  'family name': 'Last Name',
  'surname': 'Last Name',
  'last': 'Last Name',
  'lastname': 'Last Name',

  // Email
  'email': 'Email',
  'email address': 'Email',
  'e mail': 'Email',
  'e mail address': 'Email',
  'mail': 'Email',
  'primary mail': 'Email',
  'primary email': 'Email',
  'email 1': 'Email',
  'email 1 value': 'Email',
  'work email': 'Email',
  'personal email': 'Email',
  'home email': 'Email',

  // Phone
  'phone': 'Phone',
  'phone number': 'Phone',
  'mobile': 'Phone',
  'mobile phone': 'Phone',
  'cell': 'Phone',
  'cell phone': 'Phone',
  'whatsapp': 'Phone',
  'whatsapp number': 'Phone',
  'telephone': 'Phone',
  'contact info': 'Phone',
  'phone 1 value': 'Phone',
  'work phone': 'Phone',
  'home phone': 'Phone',

  // Company and role
  'company': 'Company',
  'organization': 'Company',
  'organisation': 'Company',
  'org': 'Company',
  'organization 1 name': 'Company',
  'employer': 'Company',
  'firm': 'Company',
  'business': 'Company',
  'account': 'Company',
  'account name': 'Company',
  'company organization': 'Company',
  'role': 'Role',
  'title': 'Role',
  'job title': 'Role',
  'job': 'Role',
  'occupation': 'Role',
  'position': 'Role',
  'function': 'Role',
  'organization 1 title': 'Role',
  'designation': 'Role',

  // Location
  'location': 'Location',
  'city': 'Location',
  'address': 'Location',
  'region': 'Location',
  'state': 'Location',
  'province': 'Location',
  'city town': 'Location',
  'home city': 'Location',
  'work city': 'Location',
  'address 1 formatted': 'Location',
  'country': 'Country',
  'country region': 'Country',
  'nation': 'Country',

  // Web
  'website': 'Website',
  'url': 'Website',
  'site': 'Website',
  'web site': 'Website',
  'web page': 'Website',
  'company website': 'Website',
  'website url': 'Website',
  'website url main company associated': 'Website',
  'main company website': 'Website',
  'main company associated website': 'Website',
  'website 1 value': 'Website',
  'personal website': 'Website',
  'blog': 'Website',
  'linkedin': 'LinkedIn',
  'linkedin url': 'LinkedIn',
  'linkedin link': 'LinkedIn',
  'linkedin profile': 'LinkedIn',
  'linkedin profile url': 'LinkedIn',

  // Context
  'notes': 'Notes',
  'note': 'Notes',
  'description': 'Notes',
  'comments': 'Notes',
  'details': 'Notes',
  'background': 'Notes',
  'summary': 'Notes',
  'extra info': 'Notes',
  'bio': 'Notes',
  'relationship context': 'Relationship Context',
  'relationship notes': 'Relationship Context',
  'relationship summary': 'Relationship Context',
  'why they matter': 'Relationship Context',
  'context': 'Relationship Context',
  'intel notes': 'Intel Notes',
  'intel': 'Intel Notes',
  'research': 'Intel Notes',
  'signals': 'Intel Notes',
  'relationship owner': 'Relationship Owner',
  'owner': 'Relationship Owner',
  'introduced by': 'Introduced By',
  'intro by': 'Introduced By',
  'recommended by': 'Recommended By',
  'referred by': 'Recommended By',
  'referral': 'Recommended By',
  'source': 'Recommended By',

  // Dates and cadence
  'birthday': 'Birthday',
  'date of birth': 'Birthday',
  'dob': 'Birthday',
  'birthdate': 'Birthday',
  'last contacted': 'Last Contacted',
  'last contact': 'Last Contacted',
  'last touch': 'Last Contacted',
  'last interaction': 'Last Contacted',
  'last meeting': 'Last Contacted',
  'last talked': 'Last Contacted',
  'last reached out': 'Last Contacted',
  'last contacted at': 'Last Contacted',
  'next follow up': 'Next Follow Up Date',
  'next follow-up': 'Next Follow Up Date',
  'next follow up date': 'Next Follow Up Date',
  'next follow-up date': 'Next Follow Up Date',
  'follow up date': 'Next Follow Up Date',
  'next action': 'Next Action',
  'recommended next action': 'Next Action',
  'action': 'Next Action',
  'todo': 'Next Action',
  'to do': 'Next Action',
  'contact frequency': 'Contact Frequency',
  'frequency': 'Contact Frequency',
  'rhythm': 'Contact Frequency',
  'cadence': 'Contact Frequency',
  'cadence override': 'Cadence Override',

  // Other contact fields
  'industry': 'Industry',
  'sector': 'Industry',
  'domain': 'Domain',
  'company domain': 'Domain',
  'website domain': 'Domain',
  'stage': 'Stage',
  'funding stage': 'Stage',
  'ticker': 'Ticker',
  'stock ticker': 'Ticker',
  'symbol': 'Ticker',
  'specialization': 'Specialization',
  'specialty': 'Specialization',
  'expertise': 'Specialization',
  'past clients': 'Past Clients',
  'gender': 'Gender',
  'sex': 'Gender',
  'interests': 'Interests',
  'hobbies': 'Interests',
  'passions': 'Interests',
  'email 2': 'Email 2',
  'email2': 'Email 2',
  'secondary email': 'Email 2',
  'email 2 value': 'Email 2',
  'email 3': 'Email 3',
  'email3': 'Email 3',
  'tertiary email': 'Email 3',
  'email 3 value': 'Email 3',
  'kv fund investor': 'KV Fund Investor',
  'kinship fund investor': 'KV Fund Investor',
  'fund investor': 'KV Fund Investor',
  'spv investor': 'SPV Investor',

  // Approved LP tracker fields
  ...LP_TRACKER_ALIAS_MAP,
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).replace(/\r\n/g, '\n').trim()
}

function uniqueHeaders(rawHeaders: unknown[]): string[] {
  const seen = new Map<string, number>()
  return rawHeaders.map((header, index) => {
    const base = cellToString(header).replace(/\s+/g, ' ') || `Column ${index + 1}`
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base} (${count + 1})`
  })
}

function tableToRows(table: unknown[][]): ParsedCSV {
  const usableRows = table.filter(row => row.some(cell => cellToString(cell)))
  if (usableRows.length === 0) return { headers: [], rows: [] }

  const headers = uniqueHeaders(usableRows[0])
  if (usableRows.length < 2) return { headers, rows: [] }

  const rows = usableRows.slice(1)
    .map(values => {
      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header] = cellToString(values[index])
      })
      return row
    })
    .filter(row => Object.values(row).some(value => value.trim()))

  return { headers, rows }
}

export function parseCSV(content: string): ParsedCSV {
  const cleaned = content.replace(/^\uFEFF/, '')
  const parsed = Papa.parse<string[]>(cleaned, {
    skipEmptyLines: 'greedy',
  })
  return tableToRows((parsed.data ?? []) as unknown[][])
}

function parseXml(xml: string): Document {
  return new DOMParser().parseFromString(xml, 'application/xml')
}

function elementsByLocalName(node: ParentNode, localName: string): Element[] {
  return Array.from(node.getElementsByTagName('*')).filter(element => element.localName === localName)
}

function getZipText(files: Record<string, Uint8Array>, path: string): string | null {
  const file = files[path]
  return file ? strFromU8(file) : null
}

function normalizeXlsxPath(path: string): string {
  const parts: string[] = []
  for (const part of path.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return parts.join('/')
}

function resolveXlsxPartPath(target: string): string {
  if (target.startsWith('/')) {
    return normalizeXlsxPath(target.slice(1))
  }
  if (target.startsWith('xl/')) {
    return normalizeXlsxPath(target)
  }
  return normalizeXlsxPath(`xl/${target}`)
}

function getFirstWorksheetPath(files: Record<string, Uint8Array>): string {
  const workbookXml = getZipText(files, 'xl/workbook.xml')
  const relationshipsXml = getZipText(files, 'xl/_rels/workbook.xml.rels')

  if (workbookXml && relationshipsXml) {
    const workbook = parseXml(workbookXml)
    const relationships = parseXml(relationshipsXml)
    const firstSheet = elementsByLocalName(workbook, 'sheet')[0]
    const relId = firstSheet?.getAttribute('r:id') ?? firstSheet?.getAttribute('id')

    if (relId) {
      const rel = elementsByLocalName(relationships, 'Relationship')
        .find(item => item.getAttribute('Id') === relId)
      const target = rel?.getAttribute('Target')
      if (target) return resolveXlsxPartPath(target)
    }
  }

  const fallback = Object.keys(files)
    .filter(path => /^xl\/worksheets\/sheet\d+\.xml$/i.test(path))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))[0]

  if (!fallback) throw new Error('No worksheet was found in the Excel file.')
  return fallback
}

function getNodeText(node: Element): string {
  return elementsByLocalName(node, 't')
    .map(textNode => textNode.textContent ?? '')
    .join('')
}

function readSharedStrings(files: Record<string, Uint8Array>): string[] {
  const sharedStringsXml = getZipText(files, 'xl/sharedStrings.xml')
  if (!sharedStringsXml) return []

  const doc = parseXml(sharedStringsXml)
  return elementsByLocalName(doc, 'si').map(getNodeText)
}

const BUILT_IN_DATE_FORMAT_IDS = new Set([
  14, 15, 16, 17, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58,
])

function isDateFormatCode(formatCode: string): boolean {
  const cleaned = formatCode
    .replace(/"[^"]*"/g, '')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/\\./g, '')
  return /[ymdhHsS]/.test(cleaned)
}

function readDateStyleIds(files: Record<string, Uint8Array>): Set<string> {
  const stylesXml = getZipText(files, 'xl/styles.xml')
  if (!stylesXml) return new Set()

  const doc = parseXml(stylesXml)
  const dateFormatIds = new Set<number>(BUILT_IN_DATE_FORMAT_IDS)
  for (const numFmt of elementsByLocalName(doc, 'numFmt')) {
    const id = Number(numFmt.getAttribute('numFmtId'))
    const formatCode = numFmt.getAttribute('formatCode') ?? ''
    if (Number.isFinite(id) && isDateFormatCode(formatCode)) {
      dateFormatIds.add(id)
    }
  }

  const styleIds = new Set<string>()
  const cellXfs = elementsByLocalName(doc, 'cellXfs')[0]
  const xfs = cellXfs ? elementsByLocalName(cellXfs, 'xf') : []
  xfs.forEach((xf, index) => {
    const numFmtId = Number(xf.getAttribute('numFmtId'))
    if (dateFormatIds.has(numFmtId)) styleIds.add(String(index))
  })
  return styleIds
}

function getColumnIndex(cellReference: string | null, fallback: number): number {
  const letters = cellReference?.match(/[A-Z]+/i)?.[0]
  if (!letters) return fallback
  return letters
    .toUpperCase()
    .split('')
    .reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1
}

function excelSerialToDateString(value: string): string {
  const serial = Number(value)
  if (!Number.isFinite(serial)) return value
  const date = new Date(Math.round((serial - 25569) * 86_400_000))
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
}

function getCellValue(cell: Element, sharedStrings: string[], dateStyleIds: Set<string>): string {
  const type = cell.getAttribute('t')
  const styleId = cell.getAttribute('s') ?? ''
  const value = elementsByLocalName(cell, 'v')[0]?.textContent ?? ''

  if (type === 'inlineStr') return getNodeText(cell)
  if (!value) return ''
  if (type === 's') return sharedStrings[Number(value)] ?? ''
  if (type === 'b') return value === '1' ? 'TRUE' : 'FALSE'
  if (dateStyleIds.has(styleId)) return excelSerialToDateString(value)
  return value
}

function parseXlsxRows(buffer: ArrayBuffer): unknown[][] {
  const files = unzipSync(new Uint8Array(buffer))
  const worksheetPath = getFirstWorksheetPath(files)
  const worksheetXml = getZipText(files, worksheetPath)
  if (!worksheetXml) throw new Error('The first worksheet could not be read.')

  const sharedStrings = readSharedStrings(files)
  const dateStyleIds = readDateStyleIds(files)
  const worksheet = parseXml(worksheetXml)
  const sheetData = elementsByLocalName(worksheet, 'sheetData')[0]
  if (!sheetData) return []

  return elementsByLocalName(sheetData, 'row').map(row => {
    const values: string[] = []
    for (const cell of elementsByLocalName(row, 'c')) {
      const index = getColumnIndex(cell.getAttribute('r'), values.length)
      values[index] = getCellValue(cell, sharedStrings, dateStyleIds)
    }
    return values
  })
}

export async function parseWorkbookBuffer(buffer: ArrayBuffer): Promise<ParsedCSV> {
  return tableToRows(parseXlsxRows(buffer))
}

export async function parseImportFile(file: File): Promise<ParsedCSV> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx')) {
    return parseWorkbookBuffer(await file.arrayBuffer())
  }
  if (name.endsWith('.xls')) {
    throw new Error('Legacy .xls files are not supported yet. Save the workbook as .xlsx or CSV and import again.')
  }
  return parseCSV(await file.text())
}

export function normalize(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normalizeHeaderCandidates(header: string): string[] {
  const normalized = normalize(header)
  const withoutParentheticalType = normalize(header.replace(/\s*\([^)]*\)\s*$/g, ''))
  const strippedClickUpType = normalized
    .replace(/\b(short text|long text|drop down|url|email|phone|date|checkbox|labels|users|automatic progress|text)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return [...new Set([normalized, withoutParentheticalType, strippedClickUpType].filter(Boolean))]
}

export function normalizeColumnMapping(mapping: ColumnMapping | null | undefined): ColumnMapping {
  if (!Array.isArray(mapping)) return []

  const usedTargets = new Set<string>()
  return mapping.flatMap(item => {
    if (!item || typeof item !== 'object') return []

    const rawHeader = (item as Partial<ColumnMapping[number]>).csvHeader
    const csvHeader = typeof rawHeader === 'string' ? rawHeader.trim() : String(rawHeader ?? '').trim()
    if (!csvHeader) return []

    const rawField = (item as Partial<ColumnMapping[number]>).targetField
    const coercedField = coerceTargetField(rawField)
    const targetField = coercedField && !usedTargets.has(coercedField) ? coercedField : null

    if (targetField) usedTargets.add(targetField)
    return [{ csvHeader, targetField }]
  })
}

const MIDDLE_NAME_ALIASES = new Set([
  'middle',
  'middle name',
  'second name',
  'second given name',
  'additional name',
  'other name',
])

const GENERIC_NAME_ALIASES = new Set([
  'name',
  'full name',
  'display name',
  'contact name',
  'person',
  'relationship',
])

function coerceTargetField(rawField: unknown): TargetField | null {
  if (typeof rawField !== 'string') return null
  const trimmed = rawField.trim()
  if (trimmed === 'Name') return 'First Name'
  return TARGET_FIELD_SET.has(trimmed) ? trimmed as TargetField : null
}

function mappingForHeader(mapping: ColumnMapping | undefined, csvHeader: string): string | null {
  return normalizeColumnMapping(mapping).find(m => m.csvHeader === csvHeader)?.targetField ?? null
}

function findUnmappedAlias(row: Record<string, string>, mapping: ColumnMapping | undefined, aliases: Set<string>): { header: string; value: string } | null {
  for (const [header, rawValue] of Object.entries(row)) {
    if (mappingForHeader(mapping, header)) continue
    if (!aliases.has(normalize(header))) continue
    const value = rawValue.trim()
    if (value) return { header, value }
  }
  return null
}

function resolveUnmappedAlias(row: Record<string, string>, mapping: ColumnMapping | undefined, aliases: Set<string>): string {
  return findUnmappedAlias(row, mapping, aliases)?.value ?? ''
}

function resolveFirstName(row: Record<string, string>, mapping: ColumnMapping | undefined): { value: string; consumedHeader: string | null } {
  if (!mapping) return { value: (row['First Name'] ?? row['Name'] ?? '').trim(), consumedHeader: null }
  const first = resolve(row, mapping, 'First Name')
  if (first) return { value: first, consumedHeader: null }
  const fallback = findUnmappedAlias(row, mapping, GENERIC_NAME_ALIASES)
  return { value: fallback?.value ?? '', consumedHeader: fallback?.header ?? null }
}

function collectUnmappedNotes(row: Record<string, string>, mapping: ColumnMapping | undefined, consumedHeaders = new Set<string>()): string[] {
  if (!mapping) return []
  return Object.entries(row).flatMap(([header, rawValue]) => {
    const value = rawValue.trim()
    if (!value || consumedHeaders.has(header) || mappingForHeader(mapping, header)) return []
    return [`${header}: ${value}`]
  })
}

function combineNotes(primary: string, extraLines: string[]): string | null {
  const parts = [primary.trim(), ...extraLines].filter(Boolean)
  return parts.length > 0 ? parts.join('\n') : null
}

function fallbackName(row: Record<string, string>, mapping: ColumnMapping | undefined, type: RelationshipType, rowNumber: number): string {
  const email = mapping ? resolve(row, mapping, 'Email') : (row['Email'] ?? '').trim()
  if (email) return email

  const company = mapping ? resolve(row, mapping, 'Company') : ((row['Company'] ?? row['Company Name'] ?? row['Agency'] ?? '') as string).trim()
  if (company) return type === 'Company' ? company : `Contact at ${company}`

  const phone = mapping ? resolve(row, mapping, 'Phone') : ((row['Phone'] ?? row['Contact Info'] ?? '') as string).trim()
  if (phone) return phone

  return `${type === 'Company' ? 'Imported Company' : 'Imported Contact'} Row ${rowNumber}`
}

export function splitMultiValue(value: string): string[] {
  return value
    .split(/[;,|\n]+/)
    .map(trimImportListItem)
    .filter(Boolean)
}

export function detectColumns(headers: string[]): ColumnMapping {
  const candidates = headers.map(rawHeader => {
    const csvHeader = typeof rawHeader === 'string' ? rawHeader : String(rawHeader ?? '')
    const aliasCandidates = normalizeHeaderCandidates(csvHeader)
    const norm = aliasCandidates.find(candidate => KNOWN_ALIASES[candidate]) ?? aliasCandidates[0] ?? ''
    const match = KNOWN_ALIASES[norm] ?? null
    const normalizedMatch = normalize(match)
    const priority = norm === normalizedMatch || norm === `${normalizedMatch} name` ? 3 : match ? 1 : 0
    return { csvHeader, targetField: match, priority }
  })

  const chosen = new Map<TargetField, number>()
  candidates.forEach((candidate, index) => {
    if (!candidate.targetField) return
    const existingIndex = chosen.get(candidate.targetField)
    if (existingIndex === undefined || candidate.priority > candidates[existingIndex].priority) {
      chosen.set(candidate.targetField, index)
    }
  })

  return candidates.map((candidate, index) => ({
    csvHeader: candidate.csvHeader,
    targetField: candidate.targetField && chosen.get(candidate.targetField) === index ? candidate.targetField : null,
  }))
}

function resolve(row: Record<string, string>, mapping: ColumnMapping, target: string): string {
  const col = normalizeColumnMapping(mapping).find(m => m.targetField === target)
  if (!col) return ''
  return (row[col.csvHeader] ?? '').trim()
}

type CampaignImportFields = {
  name: string
  subPodNames: string[]
  status: string | null
  commitmentAmount: number | null
}

type ImportedTouchpoint = Omit<Interaction, 'id' | 'created_at' | 'contact_id'>

const IMPORTED_TOUCHPOINT_SOURCE: InteractionSource = 'Manual'
const IMPORTED_TOUCHPOINT_EVENT_DETAIL = JSON.stringify({ import_source: 'clickup_task_content' })
const MONTH_INDEX: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
}

function normalizeUpdateYear(rawYear: string | undefined, fallbackYear: number): number | null {
  if (!rawYear) return fallbackYear
  let year = Number(rawYear)
  if (!Number.isFinite(year)) return null
  if (year < 100) year += 2000
  const text = String(rawYear)
  if (year > 2100 && text.length === 4 && text.startsWith('29')) {
    year = Number(`20${text.slice(2)}`)
  }
  return year >= 1900 && year <= 2100 ? year : null
}

function extractUpdateYear(line: string): number | null {
  const prefix = line.match(/^(?:updates?|update)\s+(\d{2,4})\b/i)
  const suffix = line.match(/^(\d{2,4})\s+(?:updates?|update)s?\b/i)
  const rawYear = prefix?.[1] ?? suffix?.[1]
  return rawYear ? normalizeUpdateYear(rawYear, new Date().getFullYear()) : null
}

function shouldStopUpdateParsing(line: string): boolean {
  return /^(email draft|materials?|about our team|overview|notes?|bio|background|introduction)\b/i.test(line)
}

function toIsoUpdateDate(month: number, day: number, year: number): string | null {
  if (!Number.isInteger(month) || month < 1 || month > 12) return null
  if (!Number.isInteger(day) || day < 1 || day > 31) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return date.toISOString().slice(0, 10)
}

function monthNumber(value: string): number | null {
  return MONTH_INDEX[normalize(value).replace(/\s+/g, '')] ?? null
}

function inferImportedInteractionType(notes: string): InteractionType {
  const norm = normalize(notes)
  if (/\b(intro|introduced|introduction)\b/.test(norm)) return 'intro'
  if (/\b(call|called|zoom|phone)\b/.test(norm)) return 'call'
  if (/\b(meeting|met|dinner|lunch|coffee|summit)\b/.test(norm)) return 'meeting'
  if (/\b(text|whatsapp|sms)\b/.test(norm)) return 'text'
  if (/\b(email|sent|deck|follow up|ff up|response|respond|scheduling|schedule)\b/.test(norm)) return 'email'
  return 'note'
}

function compactSummary(notes: string): string {
  return notes.length > 160 ? `${notes.slice(0, 157).trim()}...` : notes
}

function parseUpdateLine(line: string, activeYear: number): ImportedTouchpoint | null {
  const prefix = line.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(\d{2,4}))?\s*[-:\u2013\u2014]\s*(.+)$/i)
  if (prefix) {
    const month = monthNumber(prefix[1])
    const year = normalizeUpdateYear(prefix[3], activeYear)
    const day = Number(prefix[2])
    const notes = prefix[4].trim()
    const date = month && year ? toIsoUpdateDate(month, day, year) : null
    if (date && notes) return buildImportedTouchpoint(date, notes)
  }

  const numeric = line.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*[-:\u2013\u2014]\s*(.+)$/)
  if (numeric) {
    const month = Number(numeric[1])
    const day = Number(numeric[2])
    const year = normalizeUpdateYear(numeric[3], activeYear)
    const notes = numeric[4].trim()
    const date = year ? toIsoUpdateDate(month, day, year) : null
    if (date && notes) return buildImportedTouchpoint(date, notes)
  }

  const suffix = line.match(/^(.+?)\s+([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(\d{2,4}))?$/i)
  if (suffix) {
    const notes = suffix[1].trim()
    const month = monthNumber(suffix[2])
    const day = Number(suffix[3])
    const year = normalizeUpdateYear(suffix[4], activeYear)
    const date = month && year ? toIsoUpdateDate(month, day, year) : null
    if (date && notes) return buildImportedTouchpoint(date, notes)
  }

  return null
}

function buildImportedTouchpoint(date: string, notes: string): ImportedTouchpoint {
  return {
    type: inferImportedInteractionType(notes),
    date,
    notes,
    summary: compactSummary(notes),
    source: IMPORTED_TOUCHPOINT_SOURCE,
    email_link: null,
    granola_link: null,
    event_detail: IMPORTED_TOUCHPOINT_EVENT_DETAIL,
    actor: null,
  }
}

function importedTouchpointKey(touchpoint: Pick<Interaction, 'date' | 'type' | 'notes'>): string {
  return [touchpoint.date.slice(0, 10), touchpoint.type, normalize(touchpoint.notes)].join('|')
}

export function parseTaskContentInteractions(taskContent: string): ImportedTouchpoint[] {
  if (!taskContent.trim()) return []

  const parsed: ImportedTouchpoint[] = []
  const seen = new Set<string>()
  let activeYear: number | null = null

  for (const rawLine of taskContent.split(/\r?\n/g)) {
    const line = rawLine.trim()
    if (!line) continue

    const headingYear = extractUpdateYear(line)
    if (headingYear) {
      activeYear = headingYear
      continue
    }

    if (!activeYear) continue
    if (shouldStopUpdateParsing(line)) {
      activeYear = null
      continue
    }

    const touchpoint = parseUpdateLine(line, activeYear)
    if (!touchpoint) continue

    const key = importedTouchpointKey(touchpoint)
    if (seen.has(key)) continue
    seen.add(key)
    parsed.push(touchpoint)
  }

  return parsed
}

async function syncImportedTouchpoints(contactId: string, touchpoints: ImportedTouchpoint[]): Promise<number> {
  if (touchpoints.length === 0) return 0

  const existing = await getInteractions(contactId)
  const existingKeys = new Set(existing.map(importedTouchpointKey))
  let created = 0

  for (const touchpoint of [...touchpoints].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = importedTouchpointKey(touchpoint)
    if (existingKeys.has(key)) continue
    await logInteraction(contactId, touchpoint)
    existingKeys.add(key)
    created++
  }

  return created
}

function splitCampaignPodValue(value: string): { campaignName: string; subPodNames: string[] } {
  const parts = value.split('|').map(part => part.trim()).filter(Boolean)
  if (parts.length === 0) return { campaignName: '', subPodNames: [] }
  return { campaignName: parts[0], subPodNames: parts.slice(1) }
}

function resolveCampaignImportFields(row: Record<string, string>, mapping: ColumnMapping | undefined): CampaignImportFields | null {
  if (!mapping || mapping.length === 0) return null
  const rawCampaign = resolve(row, mapping, 'Campaign')
  const { campaignName, subPodNames } = splitCampaignPodValue(rawCampaign)
  const status = resolve(row, mapping, 'Campaign Status') || null
  const amountRaw = resolve(row, mapping, 'Commitment Amount')
  const parsedAmount = amountRaw ? parseMoneyInput(amountRaw) : null
  const commitmentAmount = typeof parsedAmount === 'number' && Number.isFinite(parsedAmount) ? parsedAmount : null

  if (!campaignName && subPodNames.length === 0 && !status && commitmentAmount === null) return null
  return { name: campaignName, subPodNames, status, commitmentAmount }
}

function resolveLpTrackerCustomFields(
  row: Record<string, string>,
  mapping: ColumnMapping | undefined,
  campaignFields: CampaignImportFields | null,
): Record<string, unknown> {
  if (!mapping || mapping.length === 0) return {}

  const customFields: Record<string, unknown> = {}
  for (const field of LP_TRACKER_FIELDS) {
    let rawValue = resolve(row, mapping, field.target)
    if (!rawValue && field.key === 'investmentAmount' && !campaignFields?.name) {
      rawValue = resolve(row, mapping, 'Commitment Amount')
    }

    const value = normalizeLpTrackerFieldValue(field, rawValue)
    if (hasContactValue(value)) customFields[field.key] = value
  }
  return customFields
}

export function resolveMappedValue(row: Record<string, string>, mapping: ColumnMapping, target: string): string {
  return resolve(row, mapping, target)
}

function resolveName(row: Record<string, string>, mapping: ColumnMapping, type: RelationshipType): string {
  if (type === 'Company') {
    const companyName = resolve(row, mapping, 'Company')
    if (companyName) return companyName
  }
  const first = resolveFirstName(row, mapping).value
  const middle = resolveUnmappedAlias(row, mapping, MIDDLE_NAME_ALIASES)
  const last = resolve(row, mapping, 'Last Name')
  return [first, middle, last].filter(Boolean).join(' ')
}

function normalizeDate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const numeric = Number(trimmed)
  if (Number.isFinite(numeric) && numeric > 20_000 && numeric < 80_000) {
    const date = new Date(Date.UTC(1899, 11, 30) + numeric * 86_400_000)
    return date.toISOString().slice(0, 10)
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

function normalizeFrequency(value: string): ContactFrequency | null {
  const norm = normalize(value)
  if (!norm) return null
  if (['weekly', 'week', 'every week'].includes(norm)) return 'Weekly'
  if (['monthly', 'month', 'every month'].includes(norm)) return 'Monthly'
  if (['quarterly', 'quarter', 'every quarter'].includes(norm)) return 'Quarterly'
  if (['annual', 'annually', 'yearly', 'year'].includes(norm)) return 'Annual'
  if (['as needed', 'asneeded', 'ad hoc', 'adhoc'].includes(norm)) return 'As Needed'
  return null
}

function normalizeCadence(value: string): Cadence | null {
  const norm = normalize(value)
  if (!norm) return null
  if (['weekly', 'week'].includes(norm)) return 'weekly'
  if (['biweekly', 'bi weekly', 'every two weeks', 'every 2 weeks'].includes(norm)) return 'biweekly'
  if (['monthly', 'month'].includes(norm)) return 'monthly'
  if (['quarterly', 'quarter'].includes(norm)) return 'quarterly'
  return null
}

function normalizeGender(value: string): Gender | null {
  const norm = normalize(value)
  if (!norm) return null
  if (norm === 'male' || norm === 'm') return 'Male'
  if (norm === 'female' || norm === 'f') return 'Female'
  if (norm === 'non binary' || norm === 'nonbinary') return 'Non-binary'
  return 'Other'
}

function hasLikelyEmail(value: string): boolean {
  if (!value) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function getRowWarnings(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  existingEmails: Map<string, string>,
  existingNames: Map<string, string>,
): RowWarning[] {
  const warnings: RowWarning[] = []
  const seenEmails = new Set<string>()
  const seenNames = new Set<string>()
  const safeMapping = normalizeColumnMapping(mapping)

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const name = resolveName(row, safeMapping, 'Contact')
    if (!name) {
      warnings.push({ rowIndex: i, kind: 'missing_name' })
      continue
    }

    const email = resolve(row, safeMapping, 'Email')
    const nameLower = name.toLowerCase().trim()
    const emailLower = email.toLowerCase()

    if (!hasLikelyEmail(email)) {
      warnings.push({ rowIndex: i, kind: 'bad_email', detail: email })
    }

    if ((emailLower && (existingEmails.has(emailLower) || seenEmails.has(emailLower)))
        || (existingNames.has(nameLower) || seenNames.has(nameLower))) {
      warnings.push({ rowIndex: i, kind: 'duplicate', detail: email || name })
    }

    if (emailLower) seenEmails.add(emailLower)
    seenNames.add(nameLower)

    for (const dateField of ['Birthday', 'Last Contacted', 'Next Follow Up Date']) {
      const dateValue = resolve(row, safeMapping, dateField)
      if (dateValue && !normalizeDate(dateValue)) {
        warnings.push({ rowIndex: i, kind: 'bad_date', detail: `${dateField}: ${dateValue}` })
      }
    }
  }
  return warnings
}

export function countInvalidRows(
  rows: Record<string, string>[],
  type: RelationshipType,
  mapping?: ColumnMapping
): number {
  const safeMapping = normalizeColumnMapping(mapping)
  if (safeMapping.length === 0) {
    return rows.filter(row => {
      const name = (row['Name'] ?? row['Agency'] ?? row['Company Name'] ?? '').trim()
      return !name
    }).length
  }
  return rows.filter(row => !resolveName(row, safeMapping, type)).length
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function resolvePodIds(
  row: Record<string, string>,
  mapping: ColumnMapping | undefined,
  fallbackPodIds: string[],
  podMap: Map<string, string>,
): string[] {
  if (!mapping || mapping.length === 0) return fallbackPodIds
  const podValue = resolve(row, mapping, 'Pod')
  const mappedPodIds = splitMultiValue(podValue)
    .map(podName => podMap.get(normalize(podName)))
    .filter(Boolean) as string[]
  return mappedPodIds.length > 0 ? unique(mappedPodIds) : fallbackPodIds
}

function resolveCategoryIds(
  row: Record<string, string>,
  mapping: ColumnMapping | undefined,
  primaryPodId: string | null,
  categoryMap: Map<string, string>,
  extraSubPodNames: string[] = [],
): string[] {
  if (!mapping || mapping.length === 0) return []
  const categoryValue = resolve(row, mapping, 'Sub-pod') || resolve(row, mapping, '_category')
  return unique([...splitMultiValue(categoryValue), ...extraSubPodNames.flatMap(splitMultiValue)])
    .map(categoryName => {
      const normalizedName = normalize(categoryName)
      return (primaryPodId ? categoryMap.get(`${primaryPodId}:${normalizedName}`) : undefined)
        ?? categoryMap.get(normalizedName)
    })
    .filter(Boolean) as string[]
}

function normalizedList(value: string): string[] | null {
  const items = splitMultiValue(value)
  return items.length > 0 ? items : null
}

function importErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (message) return String(message)
  }
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function hasContactValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'string') return value.trim().length > 0
  return value !== null && value !== undefined
}

function mergeStringNotes(existing: string | null, incoming: string | null): string | null {
  if (!incoming?.trim()) return existing ?? null
  if (!existing?.trim()) return incoming.trim()
  const existingLines = new Set(existing.split('\n').map(line => line.trim()).filter(Boolean))
  const missingLines = incoming.split('\n').map(line => line.trim()).filter(Boolean).filter(line => !existingLines.has(line))
  return missingLines.length > 0 ? `${existing.trim()}\n${missingLines.join('\n')}` : existing
}

function mergeArrayValues<T>(existing: T[] | null | undefined, incoming: T[] | null | undefined): T[] {
  return [...new Set([...(existing ?? []), ...(incoming ?? [])])]
}

function buildExistingContactPatch(existing: Contact, incoming: ContactInput): Partial<ContactInput> {
  const patch: Partial<ContactInput> = {}
  const scalarFields: Array<keyof ContactInput> = [
    'email', 'phone', 'company', 'role', 'location', 'website',
    'recommended_by', 'specialization', 'past_clients', 'industry', 'domain',
    'stage', 'ticker', 'linkedin', 'birthday', 'milestones', 'interests',
    'relationship_context', 'last_contacted_at', 'first_name', 'last_name',
    'country', 'global_region', 'gender', 'introduced_by', 'intel_notes',
    'relationship_owner', 'contact_frequency', 'cadence_override',
    'next_follow_up_date', 'next_action', 'email_2', 'email_3',
    'communication_preferences', 'snoozed_until',
  ]

  for (const field of scalarFields) {
    const current = existing[field as keyof Contact]
    const next = incoming[field]
    if (!hasContactValue(current) && hasContactValue(next)) {
      ;(patch as any)[field] = next
    }
  }

  const mergedNotes = mergeStringNotes(existing.notes, incoming.notes)
  if (mergedNotes !== existing.notes) patch.notes = mergedNotes

  const listIds = mergeArrayValues(existing.list_ids, incoming.list_ids)
  if (listIds.length !== existing.list_ids.length) patch.list_ids = listIds

  const categoryIds = mergeArrayValues(existing.category_ids, incoming.category_ids)
  if (categoryIds.length !== existing.category_ids.length) patch.category_ids = categoryIds

  const companyIds = mergeArrayValues(existing.company_ids, incoming.company_ids)
  if (companyIds.length !== existing.company_ids.length) patch.company_ids = companyIds

  const kvFundInvestor = mergeArrayValues(existing.kv_fund_investor, incoming.kv_fund_investor)
  if (kvFundInvestor.length !== (existing.kv_fund_investor ?? []).length) patch.kv_fund_investor = kvFundInvestor

  const spvInvestor = mergeArrayValues(existing.spv_investor, incoming.spv_investor)
  if (spvInvestor.length !== (existing.spv_investor ?? []).length) patch.spv_investor = spvInvestor

  if (!existing.primary_list_id && incoming.primary_list_id) patch.primary_list_id = incoming.primary_list_id
  if (!existing.company_record_id && incoming.company_record_id) patch.company_record_id = incoming.company_record_id

  const incomingCustomFields = incoming.custom_fields ?? {}
  const missingCustomFields = Object.fromEntries(
    Object.entries(incomingCustomFields).filter(([key, value]) => hasContactValue(value) && !hasContactValue(existing.custom_fields?.[key]))
  )
  if (Object.keys(missingCustomFields).length > 0) {
    patch.custom_fields = { ...(existing.custom_fields ?? {}), ...missingCustomFields }
  }

  return patch
}

function inferCampaignType(name: string): 'event' | 'investment' | 'outreach' | 'deal_flow' | 'fundraise' | 'talent' | 'partnerships' | 'other' {
  const norm = normalize(name)
  if (/\b(fund|fundraise|lp|investor|pipeline|capital)\b/.test(norm)) return 'fundraise'
  if (/\b(event|dinner|summit|conference)\b/.test(norm)) return 'event'
  if (/\b(deal|flow|pipeline)\b/.test(norm)) return 'deal_flow'
  if (/\b(talent|creator)\b/.test(norm)) return 'talent'
  if (/\b(partner|partnership|brand)\b/.test(norm)) return 'partnerships'
  if (/\b(outreach|check in|checkins)\b/.test(norm)) return 'outreach'
  return 'other'
}

async function resolveCampaignId(
  name: string,
  campaignMap: Map<string, string>,
  campaignAliases: Map<string, string>,
  createMissingCampaigns: boolean,
): Promise<string | null> {
  const normalizedName = normalize(name)
  if (!normalizedName) return null

  const aliased = campaignAliases.get(normalizedName)
  if (aliased) return aliased

  const exact = campaignMap.get(normalizedName)
  if (exact) return exact

  if (!createMissingCampaigns) return null

  const campaign = await createCampaign({ name: name.trim(), type: inferCampaignType(name) })
  campaignMap.set(normalizedName, campaign.id)
  return campaign.id
}

async function syncCampaignImportFields(
  contactId: string,
  campaignFields: CampaignImportFields | null,
  campaignMap: Map<string, string>,
  campaignAliases: Map<string, string>,
  createMissingCampaigns: boolean,
): Promise<boolean> {
  if (!campaignFields?.name) return false
  const campaignId = await resolveCampaignId(campaignFields.name, campaignMap, campaignAliases, createMissingCampaigns)
  if (!campaignId) return false

  const link = await addContactToCampaign(campaignId, contactId)
  let nextCustomFields = link.custom_fields ?? {}

  if (campaignFields.commitmentAmount !== null && !hasContactValue(nextCustomFields[CAMPAIGN_COMMITMENT_AMOUNT_FIELD])) {
    nextCustomFields = withMoneyField(nextCustomFields, CAMPAIGN_COMMITMENT_AMOUNT_FIELD, campaignFields.commitmentAmount)
  }

  if (campaignFields.status && !hasContactValue(nextCustomFields[CAMPAIGN_SOURCE_STATUS_FIELD])) {
    nextCustomFields = withTextField(nextCustomFields, CAMPAIGN_SOURCE_STATUS_FIELD, campaignFields.status)
  }

  if (nextCustomFields !== link.custom_fields) {
    await updateCampaignContact(link.id, { custom_fields: nextCustomFields })
  }

  return true
}

export async function importContacts(
  rows: Record<string, string>[],
  podId: string,
  onProgress?: (progress: ImportProgress) => void,
  options?: {
    type?: RelationshipType
    podIds?: string[]
    mapping?: ColumnMapping
    categoryMap?: Map<string, string>
    categoryPodMap?: Map<string, string>
    podMap?: Map<string, string>
    campaignMap?: Map<string, string>
    campaignAliases?: Map<string, string>
    createMissingCampaigns?: boolean
    batchId?: string
    importSource?: string
  }
): Promise<ImportResult> {
  const recordType: RelationshipType = options?.type ?? 'Contact'
  const fallbackPodIds: string[] = options?.podIds?.length ? options.podIds : [podId].filter(Boolean)
  const safeMapping = normalizeColumnMapping(options?.mapping)
  const mapping = safeMapping.length > 0 ? safeMapping : undefined
  const categoryMap = options?.categoryMap ?? new Map<string, string>()
  const categoryPodMap = options?.categoryPodMap ?? new Map<string, string>()
  const podMap = options?.podMap ?? new Map<string, string>()
  const campaignMap = options?.campaignMap ?? new Map<string, string>()
  const campaignAliases = options?.campaignAliases ?? new Map<string, string>()
  const createMissingCampaigns = options?.createMissingCampaigns ?? false
  const batchId = options?.batchId ?? null
  const importSrc = options?.importSource ?? null
  if (campaignMap.size === 0 && safeMapping.some(m => m.targetField === 'Campaign')) {
    const campaigns = await getCampaigns()
    for (const campaign of campaigns) {
      campaignMap.set(normalize(campaign.name), campaign.id)
    }
  }
  const existing = await getContacts()

  const emailIndex = new Map<string, string>()
  const nameIndex = new Map<string, string>()
  const contactIndex = new Map<string, Contact>()
  for (const c of existing) {
    if (c.email) emailIndex.set(c.email.toLowerCase(), c.id)
    if (c.name) nameIndex.set(c.name.toLowerCase().trim(), c.id)
    contactIndex.set(c.id, c)
  }

  let imported = 0
  let updated = 0
  let campaignLinked = 0
  let interactionsImported = 0
  let skipped = 0
  const errors: string[] = []
  const toCreate: Array<{ rowNumber: number; name: string; email: string; contact: ContactInput; campaignFields: CampaignImportFields | null; touchpoints: ImportedTouchpoint[] }> = []
  const toUpdate: Array<{ rowNumber: number; name: string; contactId: string; patch: Partial<ContactInput>; campaignFields: CampaignImportFields | null; touchpoints: ImportedTouchpoint[] }> = []

  const r = (row: Record<string, string>, target: TargetField, ...legacyKeys: string[]): string => {
    if (mapping) return resolve(row, mapping, target)
    for (const key of legacyKeys) {
      const value = (row[key] ?? '').trim()
      if (value) return value
    }
    return ''
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const resolvedName = mapping
      ? resolveName(row, mapping, recordType)
      : (recordType === 'Company'
        ? (row['Name'] ?? row['Company Name'] ?? row['Agency'] ?? '')
        : (row['Name'] ?? row['Agency'] ?? '')
      ).trim()
    const nameWasFallback = !resolvedName
    const name = resolvedName || fallbackName(row, mapping, recordType, i + 2)

    const email = r(row, 'Email', 'Email')
    const nameLower = name.toLowerCase().trim()
    const emailLower = email.toLowerCase()

    const firstName = resolveFirstName(row, mapping)
    const lastName = mapping ? resolve(row, mapping, 'Last Name') : null
    const campaignFields = resolveCampaignImportFields(row, mapping)
    const mappedPodIds = resolvePodIds(row, mapping, fallbackPodIds, podMap)
    const categoryIds = resolveCategoryIds(row, mapping, mappedPodIds[0] ?? null, categoryMap, campaignFields?.subPodNames ?? [])
    const categoryPodIds = categoryIds
      .map(categoryId => categoryPodMap.get(categoryId))
      .filter(Boolean) as string[]
    const rowPodIds = unique([...mappedPodIds, ...categoryPodIds])
    const primaryPodId = rowPodIds[0] ?? null
    const birthday = normalizeDate(r(row, 'Birthday', 'Birthday'))
    const lastContacted = normalizeDate(r(row, 'Last Contacted', 'Last Contacted'))
    const nextFollowUp = normalizeDate(r(row, 'Next Follow Up Date', 'Next Follow Up Date'))
    const consumedHeaders = firstName.consumedHeader ? new Set([firstName.consumedHeader]) : undefined
    const notes = combineNotes(r(row, 'Notes', 'Notes'), collectUnmappedNotes(row, mapping, consumedHeaders))
    const customFields = resolveLpTrackerCustomFields(row, mapping, campaignFields)
    const importedTouchpoints = parseTaskContentInteractions(
      typeof customFields.clickupTaskContent === 'string' ? customFields.clickupTaskContent : '',
    )

    const contactFrequency = normalizeFrequency(r(row, 'Contact Frequency', 'Contact Frequency'))
    const cadenceOverride = normalizeCadence(r(row, 'Cadence Override', 'Cadence Override'))

    const contact: ContactInput = {
      name,
      type: recordType,
      status: 'Pending',
      email: email || null,
      phone: r(row, 'Phone', 'Phone', 'Contact Info') || null,
      company: r(row, 'Company', 'Company') || null,
      role: r(row, 'Role', 'Role') || null,
      location: r(row, 'Location', 'Location') || null,
      website: r(row, 'Website', 'Website') || null,
      notes,
      recommended_by: r(row, 'Recommended By', 'Recommended By') || null,
      specialization: r(row, 'Specialization', 'Specialization') || null,
      past_clients: r(row, 'Past Clients', 'Past Clients') || null,
      industry: r(row, 'Industry', 'Industry') || null,
      domain: r(row, 'Domain', 'Domain') || null,
      stage: r(row, 'Stage', 'Stage') || null,
      ticker: r(row, 'Ticker', 'Ticker') || null,
      linkedin: r(row, 'LinkedIn', 'LinkedIn', 'Linkedin') || null,
      birthday,
      milestones: null,
      interests: r(row, 'Interests', 'Interests') || null,
      relationship_context: r(row, 'Relationship Context', 'Relationship Context') || null,
      last_contacted_at: lastContacted,
      list_ids: rowPodIds,
      category_ids: categoryIds,
      primary_list_id: primaryPodId,
      first_name: firstName.value || null,
      last_name: lastName || null,
      country: r(row, 'Country', 'Country') || null,
      global_region: null,
      gender: normalizeGender(r(row, 'Gender', 'Gender')),
      introduced_by: r(row, 'Introduced By', 'Introduced By') || null,
      intel_notes: r(row, 'Intel Notes', 'Intel Notes') || null,
      relationship_owner: r(row, 'Relationship Owner', 'Relationship Owner') || null,
      contact_frequency: contactFrequency,
      cadence_override: cadenceOverride,
      next_follow_up_date: nextFollowUp,
      next_action: r(row, 'Next Action', 'Next Action') || null,
      kv_fund_investor: normalizedList(r(row, 'KV Fund Investor', 'KV Fund Investor')),
      spv_investor: normalizedList(r(row, 'SPV Investor', 'SPV Investor')),
      needs_review: false,
      company_record_id: null,
      company_ids: [],
      email_2: r(row, 'Email 2', 'Email 2') || null,
      email_3: r(row, 'Email 3', 'Email 3') || null,
      communication_preferences: null,
      custom_fields: customFields,
      ring_ids: [],
      photo_url: null,
      snoozed_until: null,
      import_batch_id: batchId,
      import_source: importSrc,
    } as ContactInput

    const existingId = (emailLower && emailIndex.get(emailLower)) || (!nameWasFallback ? nameIndex.get(nameLower) : undefined)
    if (existingId === 'pending') {
      skipped++
      onProgress?.({ current: i + 1, total: rows.length, imported, skipped, updated })
      continue
    }
    const existingContact = existingId ? contactIndex.get(existingId) : null

    if (existingContact) {
      const patch = buildExistingContactPatch(existingContact, contact)
      if (Object.keys(patch).length > 0 || campaignFields?.name || importedTouchpoints.length > 0) {
        toUpdate.push({ rowNumber: i + 2, name, contactId: existingContact.id, patch, campaignFields, touchpoints: importedTouchpoints })
      } else {
        skipped++
        onProgress?.({ current: i + 1, total: rows.length, imported, skipped, updated })
      }
      continue
    }

    toCreate.push({ rowNumber: i + 2, name, email, contact, campaignFields, touchpoints: importedTouchpoints })
    if (emailLower) emailIndex.set(emailLower, 'pending')
    if (!nameWasFallback) nameIndex.set(nameLower, 'pending')
  }

  const total = rows.length
  let processedForProgress = skipped
  onProgress?.({ current: processedForProgress, total, imported, skipped, updated })

  for (const item of toUpdate) {
    try {
      if (Object.keys(item.patch).length > 0) {
        await updateContact(item.contactId, item.patch)
        updated++
      }
      const linked = await syncCampaignImportFields(
        item.contactId,
        item.campaignFields,
        campaignMap,
        campaignAliases,
        createMissingCampaigns,
      )
      if (linked) campaignLinked++
      const syncedTouchpoints = await syncImportedTouchpoints(item.contactId, item.touchpoints)
      interactionsImported += syncedTouchpoints
      if (syncedTouchpoints > 0 && Object.keys(item.patch).length === 0) updated++
    } catch (rowError) {
      errors.push(`Row ${item.rowNumber} (${item.name}): ${importErrorMessage(rowError)}`)
    }
    processedForProgress++
    onProgress?.({ current: Math.min(processedForProgress, total), total, imported, skipped, updated })
  }

  for (let i = 0; i < toCreate.length; i += BULK_INSERT_CHUNK_SIZE) {
    const chunk = toCreate.slice(i, i + BULK_INSERT_CHUNK_SIZE)
    try {
      const created = await createContactsBulk(chunk.map(item => item.contact), BULK_INSERT_CHUNK_SIZE)
      for (let j = 0; j < created.length; j++) {
        const linked = await syncCampaignImportFields(
          created[j].id,
          chunk[j]?.campaignFields ?? null,
          campaignMap,
          campaignAliases,
          createMissingCampaigns,
        )
        if (linked) campaignLinked++
        interactionsImported += await syncImportedTouchpoints(created[j].id, chunk[j]?.touchpoints ?? [])
      }
      imported += created.length
      processedForProgress += chunk.length
      onProgress?.({ current: Math.min(processedForProgress, total), total, imported, skipped, updated })
    } catch (chunkError) {
      for (const item of chunk) {
        try {
          const [created] = await createContactsBulk([item.contact], 1)
          if (created) {
            const linked = await syncCampaignImportFields(
              created.id,
              item.campaignFields,
              campaignMap,
              campaignAliases,
              createMissingCampaigns,
            )
            if (linked) campaignLinked++
            interactionsImported += await syncImportedTouchpoints(created.id, item.touchpoints)
          }
          imported++
        } catch (rowError) {
          errors.push(`Row ${item.rowNumber} (${item.name}): ${importErrorMessage(rowError)}`)
        }
        processedForProgress++
        onProgress?.({ current: Math.min(processedForProgress, total), total, imported, skipped, updated })
      }
    }
  }

  return {
    imported,
    skipped,
    errors,
    ...(updated > 0 ? { updated } : {}),
    ...(campaignLinked > 0 ? { campaignLinked } : {}),
    ...(interactionsImported > 0 ? { interactionsImported } : {}),
  }
}
