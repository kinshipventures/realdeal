import type { Contact, RelationshipType } from './types'
import {
  normalize,
  normalizeColumnMapping,
  resolveMappedValue,
  splitMultiValue,
  type ColumnMapping,
  type ImportProgress,
  type ImportResult,
} from './csvImport'

export const IMPORT_STALL_TIMEOUT_MS = 30_000

type ImportIdentity = {
  rowNumber: number
  label: string
  emails: string[]
  normalizedName: string | null
}

export type ImportReliabilityPlan = {
  rowCount: number
  mappedColumns: number
  identities: ImportIdentity[]
  invalidEmails: Array<{ rowNumber: number; value: string }>
  duplicateEmails: string[]
}

export type ImportPreflightResult = {
  ok: boolean
  errors: string[]
  warnings: string[]
}

export type ImportVerificationResult = {
  ok: boolean
  expected: number
  matched: number
  missing: string[]
}

type ImportWatchdog = {
  start: () => void
  report: (progress: ImportProgress) => void
  stop: () => void
}

function hasLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function normalizedEmail(value: string): string | null {
  const email = value.trim().toLowerCase()
  return hasLikelyEmail(email) ? email : null
}

function mappedValue(row: Record<string, string>, mapping: ColumnMapping, target: string): string {
  return resolveMappedValue(row, mapping, target).trim()
}

function mappedEmailValues(row: Record<string, string>, mapping: ColumnMapping): string[] {
  const primaryRaw = mappedValue(row, mapping, 'Email')
  const primaryValues = splitMultiValue(primaryRaw)
  const primary = normalizedEmail(primaryValues[0] ?? primaryRaw)
  const secondary = normalizedEmail(mappedValue(row, mapping, 'Email 2') || primaryValues[1] || '')
  const tertiary = normalizedEmail(mappedValue(row, mapping, 'Email 3') || primaryValues[2] || '')
  return [primary, secondary, tertiary].filter(Boolean) as string[]
}

function verificationRecordType(row: Record<string, string>, fallback: RelationshipType): RelationshipType {
  const sourceSheet = (row['Source Sheet'] ?? '').trim()
  if (/\b(companies|company card|company records|organizations|organisations)\b/i.test(sourceSheet)) return 'Company'
  if (/\b(contacts|people|person card|all lps|all lp|lps)\b/i.test(sourceSheet)) return 'Contact'
  return fallback
}

function verificationName(
  row: Record<string, string>,
  mapping: ColumnMapping,
  fallbackType: RelationshipType,
  rowNumber: number,
): string {
  const recordType = verificationRecordType(row, fallbackType)
  const company = mappedValue(row, mapping, 'Company')
  if (recordType === 'Company' && company) return company

  const first = mappedValue(row, mapping, 'First Name')
  const last = mappedValue(row, mapping, 'Last Name')
  const name = [first, last].filter(Boolean).join(' ').trim()
  if (name) return name
  if (company) return recordType === 'Company' ? company : `Contact at ${company}`

  const phone = mappedValue(row, mapping, 'Phone')
  if (phone) return phone

  return `${recordType === 'Company' ? 'Imported Company' : 'Imported Contact'} Row ${rowNumber}`
}

export function buildImportReliabilityPlan(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  recordType: RelationshipType,
): ImportReliabilityPlan {
  const safeMapping = normalizeColumnMapping(mapping)
  const mappedColumns = safeMapping.filter(item => item.targetField !== null).length
  const identities: ImportIdentity[] = []
  const invalidEmails: Array<{ rowNumber: number; value: string }> = []
  const seenEmails = new Set<string>()
  const duplicateEmails = new Set<string>()

  rows.forEach((row, index) => {
    const rowNumber = index + 2
    const emails = mappedEmailValues(row, safeMapping)
    const primaryRaw = mappedValue(row, safeMapping, 'Email')
    if (primaryRaw && splitMultiValue(primaryRaw).every(value => !hasLikelyEmail(value))) {
      invalidEmails.push({ rowNumber, value: primaryRaw })
    }
    emails.forEach(email => {
      if (seenEmails.has(email)) duplicateEmails.add(email)
      seenEmails.add(email)
    })

    const name = verificationName(row, safeMapping, recordType, rowNumber)
    identities.push({
      rowNumber,
      label: emails[0] ?? name,
      emails,
      normalizedName: normalize(name) || null,
    })
  })

  return {
    rowCount: rows.length,
    mappedColumns,
    identities,
    invalidEmails,
    duplicateEmails: [...duplicateEmails],
  }
}

export function runImportPreflight(plan: ImportReliabilityPlan, workspaceId: string | null | undefined): ImportPreflightResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!workspaceId) errors.push('No active workspace is selected.')
  if (plan.rowCount === 0) errors.push('No importable rows were found.')
  if (plan.mappedColumns === 0) errors.push('No columns are mapped to Real Deal fields.')

  if (plan.invalidEmails.length > 0) {
    warnings.push(`${plan.invalidEmails.length} row${plan.invalidEmails.length === 1 ? '' : 's'} ${plan.invalidEmails.length === 1 ? 'includes' : 'include'} email values that do not look valid.`)
  }
  if (plan.duplicateEmails.length > 0) {
    warnings.push(`${plan.duplicateEmails.length} duplicate email${plan.duplicateEmails.length === 1 ? '' : 's'} found in this file; the import will keep using the existing duplicate handling.`)
  }

  return { ok: errors.length === 0, errors, warnings }
}

export function verifyImportCompletion(
  plan: ImportReliabilityPlan,
  contacts: Contact[],
  result: ImportResult,
): ImportVerificationResult {
  const contactEmails = new Set<string>()
  const contactNames = new Set<string>()

  contacts.forEach(contact => {
    ;[contact.email, contact.email_2, contact.email_3].forEach(email => {
      const normalized = normalizedEmail(email ?? '')
      if (normalized) contactEmails.add(normalized)
    })
    const name = normalize(contact.name)
    if (name) contactNames.add(name)
  })

  const missing = plan.identities
    .filter(identity => {
      const emailMatched = identity.emails.some(email => contactEmails.has(email))
      const nameMatched = identity.normalizedName ? contactNames.has(identity.normalizedName) : false
      return !emailMatched && !nameMatched
    })
    .map(identity => `Row ${identity.rowNumber}: ${identity.label}`)

  const expected = plan.identities.length
  const matched = expected - missing.length
  const hadImportActivity = (result.imported + result.skipped + (result.updated ?? 0)) > 0

  return {
    ok: expected > 0 ? missing.length === 0 : hadImportActivity,
    expected,
    matched,
    missing,
  }
}

export function mergeImportResults(first: ImportResult, second: ImportResult): ImportResult {
  return {
    imported: first.imported + second.imported,
    skipped: first.skipped + second.skipped,
    errors: [...first.errors, ...second.errors],
    ...((first.updated ?? 0) + (second.updated ?? 0) > 0 ? { updated: (first.updated ?? 0) + (second.updated ?? 0) } : {}),
    ...((first.campaignLinked ?? 0) + (second.campaignLinked ?? 0) > 0 ? { campaignLinked: (first.campaignLinked ?? 0) + (second.campaignLinked ?? 0) } : {}),
    ...((first.interactionsImported ?? 0) + (second.interactionsImported ?? 0) > 0 ? { interactionsImported: (first.interactionsImported ?? 0) + (second.interactionsImported ?? 0) } : {}),
  }
}

export function createImportProgressWatchdog(
  onStall: () => void,
  timeoutMs = IMPORT_STALL_TIMEOUT_MS,
): ImportWatchdog {
  let timer: ReturnType<typeof setTimeout> | null = null
  let stopped = false
  let lastProgressKey = ''

  const clear = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }

  const arm = () => {
    clear()
    if (!stopped) timer = setTimeout(onStall, timeoutMs)
  }

  return {
    start: arm,
    report(progress) {
      const progressKey = [
        progress.current,
        progress.total,
        progress.imported,
        progress.skipped,
        progress.updated ?? 0,
        progress.phase ?? '',
      ].join(':')
      if (progressKey !== lastProgressKey) {
        lastProgressKey = progressKey
        arm()
      }
    },
    stop() {
      stopped = true
      clear()
    },
  }
}
