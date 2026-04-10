import type { Contact, Pod } from './types'

interface BirthdayItem {
  contact: Contact
  pod: Pod | null
  date: string      // formatted display date, e.g. "Mar 28"
  daysUntil: number // 0 = today, 1 = tomorrow, etc.
  isToday: boolean
}

export function getUpcomingBirthdays(
  contacts: Contact[],
  pods: Pod[],
  windowDays = 30
): BirthdayItem[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const podMap = new Map<string, Pod>(pods.map(p => [p.id, p]))

  const results: BirthdayItem[] = []

  for (const contact of contacts) {
    if (!contact.birthday) continue

    // Parse month and day — supports "YYYY-MM-DD", "MM-DD", or "Mon DD" (e.g. "Nov 12")
    let month: number
    let day: number
    const dashParts = contact.birthday.split('-')
    if (dashParts.length >= 2 && !isNaN(parseInt(dashParts[dashParts.length - 1]))) {
      // ISO-ish: YYYY-MM-DD or MM-DD
      month = parseInt(dashParts[dashParts.length - 2], 10) - 1
      day = parseInt(dashParts[dashParts.length - 1], 10)
    } else {
      // Human: "Nov 12", "Mar 2", "April 18"
      const parsed = new Date(`${contact.birthday}, 2000`)
      if (isNaN(parsed.getTime())) continue
      month = parsed.getMonth()
      day = parsed.getDate()
    }
    if (isNaN(month) || isNaN(day)) continue

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

