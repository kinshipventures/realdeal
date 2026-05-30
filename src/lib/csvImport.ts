import * as Papa from 'papaparse'
import { strFromU8, unzipSync } from 'fflate'
import type { Cadence, Contact, ContactFrequency, Gender, RelationshipType } from './types'
import { createContactsBulk, getContacts } from './data'

export type ParsedCSV = { headers: string[]; rows: Record<string, string>[] }

export type ColumnMapping = { csvHeader: string; targetField: string | null }[]

export type ImportProgress = { current: number; total: number; imported: number; skipped: number }

export type ImportResult = { imported: number; skipped: number; errors: string[] }

export type RowWarning = {
  rowIndex: number
  kind: 'missing_name' | 'duplicate' | 'bad_date' | 'bad_email'
  detail?: string
}

export const TARGET_FIELDS = [
  'Pod', 'Sub-pod',
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
] as const

type TargetField = typeof TARGET_FIELDS[number]
type ContactInput = Omit<Contact, 'id' | 'created_at'>

const TARGET_FIELD_SET = new Set<string>(TARGET_FIELDS)
const BULK_INSERT_CHUNK_SIZE = 100

const KNOWN_ALIASES: Record<string, TargetField> = {
  // App structure
  'pod': 'Pod',
  'pods': 'Pod',
  'relationship pod': 'Pod',
  'relationship pods': 'Pod',
  'group': 'Pod',
  'groups': 'Pod',
  'list': 'Pod',
  'lists': 'Pod',
  'segment': 'Pod',
  'segments': 'Pod',
  'sub pod': 'Sub-pod',
  'subpod': 'Sub-pod',
  'sub pods': 'Sub-pod',
  'subpods': 'Sub-pod',
  'sub pod category': 'Sub-pod',
  'category': 'Sub-pod',
  'categories': 'Sub-pod',

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
    .map(item => item.trim())
    .filter(Boolean)
}

export function detectColumns(headers: string[]): ColumnMapping {
  const candidates = headers.map(rawHeader => {
    const csvHeader = typeof rawHeader === 'string' ? rawHeader : String(rawHeader ?? '')
    const norm = normalize(csvHeader)
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
): string[] {
  if (!mapping || mapping.length === 0) return []
  const categoryValue = resolve(row, mapping, 'Sub-pod') || resolve(row, mapping, '_category')
  return splitMultiValue(categoryValue)
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
  const batchId = options?.batchId ?? null
  const importSrc = options?.importSource ?? null
  const existing = await getContacts()

  const emailIndex = new Map<string, string>()
  const nameIndex = new Map<string, string>()
  for (const c of existing) {
    if (c.email) emailIndex.set(c.email.toLowerCase(), c.id)
    if (c.name) nameIndex.set(c.name.toLowerCase().trim(), c.id)
  }

  let imported = 0
  let skipped = 0
  const errors: string[] = []
  const toCreate: Array<{ rowNumber: number; name: string; email: string; contact: ContactInput }> = []

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

    if ((emailLower && emailIndex.has(emailLower)) || (!nameWasFallback && nameIndex.has(nameLower))) {
      skipped++
      onProgress?.({ current: i + 1, total: rows.length, imported, skipped })
      continue
    }

    const firstName = resolveFirstName(row, mapping)
    const lastName = mapping ? resolve(row, mapping, 'Last Name') : null
    const mappedPodIds = resolvePodIds(row, mapping, fallbackPodIds, podMap)
    const categoryIds = resolveCategoryIds(row, mapping, mappedPodIds[0] ?? null, categoryMap)
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
      custom_fields: {},
      ring_ids: [],
      photo_url: null,
      snoozed_until: null,
      import_batch_id: batchId,
      import_source: importSrc,
    } as ContactInput

    toCreate.push({ rowNumber: i + 2, name, email, contact })
    if (emailLower) emailIndex.set(emailLower, 'pending')
    if (!nameWasFallback) nameIndex.set(nameLower, 'pending')
  }

  const total = rows.length
  let processedForProgress = skipped
  onProgress?.({ current: processedForProgress, total, imported, skipped })

  for (let i = 0; i < toCreate.length; i += BULK_INSERT_CHUNK_SIZE) {
    const chunk = toCreate.slice(i, i + BULK_INSERT_CHUNK_SIZE)
    try {
      const created = await createContactsBulk(chunk.map(item => item.contact), BULK_INSERT_CHUNK_SIZE)
      imported += created.length
      processedForProgress += chunk.length
      onProgress?.({ current: Math.min(processedForProgress, total), total, imported, skipped })
    } catch (chunkError) {
      for (const item of chunk) {
        try {
          await createContactsBulk([item.contact], 1)
          imported++
        } catch (rowError) {
          errors.push(`Row ${item.rowNumber} (${item.name}): ${importErrorMessage(rowError)}`)
        }
        processedForProgress++
        onProgress?.({ current: Math.min(processedForProgress, total), total, imported, skipped })
      }
    }
  }

  return { imported, skipped, errors }
}
