import { useEffect, useMemo, useState } from 'react'

const SECOND_MS = 1_000
const MAX_TIMER_DELAY_MS = 2_147_483_647

export interface AppClock {
  now: number
  todayKey: string
  todayStartMs: number
  timeZone: string
}

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getLocalDayStart(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function getNextLocalDayStart(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
}

export function getMillisecondsUntilNextLocalDay(date: Date = new Date()): number {
  return Math.max(SECOND_MS, getNextLocalDayStart(date).getTime() - date.getTime() + SECOND_MS)
}

export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function useAppClock(): AppClock {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (typeof window === 'undefined') return

    let timeoutId: number | undefined

    const refresh = () => setNow(Date.now())
    const scheduleNextDay = () => {
      window.clearTimeout(timeoutId)
      const delay = Math.min(getMillisecondsUntilNextLocalDay(), MAX_TIMER_DELAY_MS)
      timeoutId = window.setTimeout(() => {
        refresh()
        scheduleNextDay()
      }, delay)
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    scheduleNextDay()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return useMemo(() => {
    const date = new Date(now)
    return {
      now,
      todayKey: getLocalDateKey(date),
      todayStartMs: getLocalDayStart(date).getTime(),
      timeZone: getBrowserTimeZone(),
    }
  }, [now])
}
