const SNOOZE_KEY = 'realdeal:dormant-snooze'

export function getSnoozedIds(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? '{}') as Record<string, number>
    const now = Date.now()
    const active = new Set<string>()
    const cleaned: Record<string, number> = {}
    for (const [id, until] of Object.entries(raw)) {
      if (until > now) { active.add(id); cleaned[id] = until }
    }
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(cleaned))
    return active
  } catch { return new Set() }
}

export function snoozeContact(id: string) {
  try {
    const raw = JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? '{}')
    raw[id] = Date.now() + 30 * 24 * 60 * 60 * 1000
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(raw))
  } catch { /* silent */ }
}
