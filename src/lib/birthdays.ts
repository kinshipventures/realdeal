import type { Contact, Pod } from './types'

export interface BirthdayItem {
  contact: Contact
  pod: Pod | null
  date: string      // formatted display date, e.g. "Mar 28"
  daysUntil: number // 0 = today, 1 = tomorrow, etc.
  isToday: boolean
}

export function getUpcomingBirthdays(
  contacts: Contact[],
  pods: Pod[],
  windowDays = 14
): BirthdayItem[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const podMap = new Map<string, Pod>(pods.map(p => [p.id, p]))

  const results: BirthdayItem[] = []

  for (const contact of contacts) {
    if (!contact.birthday) continue

    // Parse month and day from YYYY-MM-DD — ignore year to find next occurrence
    const [, monthStr, dayStr] = contact.birthday.split('-')
    const month = parseInt(monthStr, 10) - 1 // 0-based
    const day = parseInt(dayStr, 10)

    // Try this year's birthday
    const thisYear = new Date(today.getFullYear(), month, day)
    thisYear.setHours(0, 0, 0, 0)

    // If already passed this year, use next year
    const target = thisYear < today
      ? new Date(today.getFullYear() + 1, month, day)
      : thisYear

    const daysUntil = Math.round((target.getTime() - today.getTime()) / 86400000)

    if (daysUntil < 0 || daysUntil > windowDays) continue

    const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(target)
    const pod = contact.list_ids[0] ? (podMap.get(contact.list_ids[0]) ?? null) : null

    results.push({
      contact,
      pod,
      date,
      daysUntil,
      isToday: daysUntil === 0,
    })
  }

  return results.sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil
    return a.contact.name.localeCompare(b.contact.name)
  })
}

export function formatDaysUntil(days: number): string {
  if (days === 0) return 'Today'
  return `${days}d`
}
