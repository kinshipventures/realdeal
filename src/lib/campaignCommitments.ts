export const CAMPAIGN_COMMITMENT_AMOUNT_FIELD = 'commitmentAmount'
export const CAMPAIGN_FUNDRAISING_GOAL_FIELD = 'fundraisingGoal'
export const CAMPAIGN_SOURCE_STATUS_FIELD = 'campaignStatus'

type CustomFieldCarrier = {
  custom_fields?: Record<string, unknown> | null
}

export function parseMoneyInput(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const normalized = trimmed
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()

  const match = normalized.match(/^(-?\d+(?:\.\d+)?)([kmb])?$/)
  if (!match) return Number.NaN

  const base = Number(match[1])
  if (!Number.isFinite(base)) return Number.NaN

  const multiplier = match[2] === 'k'
    ? 1_000
    : match[2] === 'm'
      ? 1_000_000
      : match[2] === 'b'
        ? 1_000_000_000
        : 1

  return Math.round(base * multiplier)
}

export function readMoneyField(record: CustomFieldCarrier, field: string): number | null {
  const value = record.custom_fields?.[field]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = parseMoneyInput(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function getCampaignContactCommitmentAmount(record: CustomFieldCarrier): number | null {
  return readMoneyField(record, CAMPAIGN_COMMITMENT_AMOUNT_FIELD)
}

export function getCampaignFundraisingGoal(record: CustomFieldCarrier): number | null {
  return readMoneyField(record, CAMPAIGN_FUNDRAISING_GOAL_FIELD)
}

export function readTextField(record: CustomFieldCarrier, field: string): string | null {
  const value = record.custom_fields?.[field]
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

export function getCampaignContactCampaignStatus(record: CustomFieldCarrier): string | null {
  return readTextField(record, CAMPAIGN_SOURCE_STATUS_FIELD)
}

export function withMoneyField(
  existing: Record<string, unknown> | null | undefined,
  field: string,
  amount: number | null,
): Record<string, unknown> {
  const next = { ...(existing ?? {}) }
  if (amount === null) delete next[field]
  else next[field] = amount
  return next
}

export function withTextField(
  existing: Record<string, unknown> | null | undefined,
  field: string,
  value: string | null,
): Record<string, unknown> {
  const next = { ...(existing ?? {}) }
  const trimmed = value?.trim() ?? ''
  if (!trimmed) delete next[field]
  else next[field] = trimmed
  return next
}

export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: Math.abs(amount) >= 1_000 ? 0 : 2,
  }).format(amount)
}

export function formatMoneyCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)
}

export function formatMoneyInput(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return ''
  return formatMoney(amount)
}
