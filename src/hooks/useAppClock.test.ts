import { describe, expect, it } from 'vitest'
import {
  getLocalDateKey,
  getLocalDayStart,
  getMillisecondsUntilNextLocalDay,
  getNextLocalDayStart,
} from './useAppClock'

describe('app clock date helpers', () => {
  it('uses the local browser date as the app day key', () => {
    const date = new Date(2026, 4, 29, 10, 30, 0)

    expect(getLocalDateKey(date)).toBe('2026-05-29')
    expect(getLocalDayStart(date).getTime()).toBe(new Date(2026, 4, 29).getTime())
    expect(getNextLocalDayStart(date).getTime()).toBe(new Date(2026, 4, 30).getTime())
  })

  it('schedules a refresh after local midnight', () => {
    const date = new Date(2026, 4, 29, 23, 59, 59, 500)

    expect(getMillisecondsUntilNextLocalDay(date)).toBeGreaterThanOrEqual(1_000)
  })
})
