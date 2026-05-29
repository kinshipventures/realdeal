import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const SECOND_MS = 1_000
const MINUTE_MS = 60 * SECOND_MS
const SERVER_SYNC_MS = 15 * MINUTE_MS
const MAX_TIMER_DELAY_MS = 2_147_483_647

export const APP_TIME_ZONE = import.meta.env.VITE_APP_TIME_ZONE || 'America/New_York'

interface ClockSync {
  serverNowMs: number
  performanceNowMs: number
  timeZone: string
}

interface ServerClockResponse {
  now: number
  iso: string
  timeZone?: string
}

interface ZonedDateParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

export interface AppClock {
  now: number
  todayKey: string
  todayStartMs: number
  timeZone: string
}

function getPerformanceNow(): number {
  return typeof performance !== 'undefined' ? performance.now() : 0
}

function getSyncedNow(sync: ClockSync | null): number {
  if (!sync) return Date.now()
  return sync.serverNowMs + Math.max(0, getPerformanceNow() - sync.performanceNowMs)
}

function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const formatter = new Intl.DateTimeFormat('en-US-u-ca-gregory', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const values: Record<string, string> = {}
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') values[part.type] = part.value
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  }
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getZonedDateParts(date, timeZone)
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return asUtc - date.getTime()
}

function getZonedDayStartMsForParts(year: number, month: number, day: number, timeZone: string): number {
  const utcGuess = Date.UTC(year, month - 1, day, 0, 0, 0)
  let offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone)
  let startMs = utcGuess - offset
  offset = getTimeZoneOffsetMs(new Date(startMs), timeZone)
  startMs = utcGuess - offset
  return startMs
}

export function getAppDateKey(date: Date = new Date(), timeZone = APP_TIME_ZONE): string {
  const parts = getZonedDateParts(date, timeZone)
  return [
    String(parts.year).padStart(4, '0'),
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-')
}

export function getAppDayStartMs(date: Date = new Date(), timeZone = APP_TIME_ZONE): number {
  const parts = getZonedDateParts(date, timeZone)
  return getZonedDayStartMsForParts(parts.year, parts.month, parts.day, timeZone)
}

export function getNextAppDayStartMs(date: Date = new Date(), timeZone = APP_TIME_ZONE): number {
  const parts = getZonedDateParts(date, timeZone)
  return getZonedDayStartMsForParts(parts.year, parts.month, parts.day + 1, timeZone)
}

export function getMillisecondsUntilNextAppDay(date: Date = new Date(), timeZone = APP_TIME_ZONE): number {
  return Math.max(SECOND_MS, getNextAppDayStartMs(date, timeZone) - date.getTime() + SECOND_MS)
}

async function fetchServerClock(signal?: AbortSignal): Promise<ServerClockResponse> {
  const response = await fetch('/api/app-clock', { cache: 'no-store', signal })
  if (!response.ok) throw new Error('Unable to sync app clock')
  return response.json()
}

export function useAppClock(): AppClock {
  const syncRef = useRef<ClockSync | null>(null)
  const [sync, setSync] = useState<ClockSync | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const refreshFromServer = useCallback(async (signal?: AbortSignal) => {
    const payload = await fetchServerClock(signal)
    const serverNowMs = Number.isFinite(payload.now) ? payload.now : Date.parse(payload.iso)
    if (!Number.isFinite(serverNowMs)) throw new Error('Invalid app clock response')

    const nextSync: ClockSync = {
      serverNowMs,
      performanceNowMs: getPerformanceNow(),
      timeZone: payload.timeZone || APP_TIME_ZONE,
    }
    syncRef.current = nextSync
    setSync(nextSync)
    setNow(serverNowMs)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    let active = true
    const controller = new AbortController()
    const syncNow = () => {
      refreshFromServer(controller.signal).catch(() => {
        if (active && !syncRef.current) setNow(Date.now())
      })
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncNow()
    }

    syncNow()
    const syncIntervalId = window.setInterval(syncNow, SERVER_SYNC_MS)
    window.addEventListener('focus', syncNow)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      active = false
      controller.abort()
      window.clearInterval(syncIntervalId)
      window.removeEventListener('focus', syncNow)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refreshFromServer])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const tick = () => setNow(getSyncedNow(syncRef.current))
    const tickIntervalId = window.setInterval(tick, MINUTE_MS)
    return () => window.clearInterval(tickIntervalId)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !sync) return

    const currentNow = getSyncedNow(sync)
    const delay = Math.min(
      getMillisecondsUntilNextAppDay(new Date(currentNow), sync.timeZone),
      MAX_TIMER_DELAY_MS,
    )
    const dayTimeoutId = window.setTimeout(() => {
      refreshFromServer().catch(() => setNow(getSyncedNow(syncRef.current)))
    }, delay)

    return () => window.clearTimeout(dayTimeoutId)
  }, [refreshFromServer, sync])

  return useMemo(() => {
    const timeZone = sync?.timeZone || APP_TIME_ZONE
    const date = new Date(now)
    return {
      now,
      todayKey: getAppDateKey(date, timeZone),
      todayStartMs: getAppDayStartMs(date, timeZone),
      timeZone,
    }
  }, [now, sync])
}
