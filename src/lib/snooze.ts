import { updateContact } from './data'

export type SnoozeDuration = '1w' | '1m' | '3m'

const DURATION_MS: Record<SnoozeDuration, number> = {
  '1w':  7  * 24 * 60 * 60 * 1000,
  '1m':  30 * 24 * 60 * 60 * 1000,
  '3m':  90 * 24 * 60 * 60 * 1000,
}

export const DURATION_LABELS: Record<SnoozeDuration, string> = {
  '1w': '1 week',
  '1m': '1 month',
  '3m': '3 months',
}

export function isContactSnoozed(snoozedUntil: string | null): boolean {
  if (!snoozedUntil) return false
  return new Date(snoozedUntil).getTime() > Date.now()
}

export async function snoozeContact(id: string, duration: SnoozeDuration = '1m'): Promise<void> {
  const snoozed_until = new Date(Date.now() + DURATION_MS[duration]).toISOString()
  await updateContact(id, { snoozed_until } as any)
}

export async function unsnoozeContact(id: string): Promise<void> {
  await updateContact(id, { snoozed_until: null } as any)
}
