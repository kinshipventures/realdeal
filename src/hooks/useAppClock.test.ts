import { describe, expect, it } from 'vitest'
import {
  getAppDateKey,
  getAppDayStartMs,
  getMillisecondsUntilNextAppDay,
} from './useAppClock'

describe('app clock date helpers', () => {
  it('uses the app timezone and starts the operational day at 5 AM', () => {
    const beforeNewYorkFive = new Date('2026-05-29T08:59:00.000Z')
    const afterNewYorkFive = new Date('2026-05-29T09:00:00.000Z')

    expect(getAppDateKey(beforeNewYorkFive, 'America/New_York')).toBe('2026-05-28')
    expect(getAppDateKey(afterNewYorkFive, 'America/New_York')).toBe('2026-05-29')
    expect(getAppDayStartMs(afterNewYorkFive, 'America/New_York')).toBe(
      new Date('2026-05-29T09:00:00.000Z').getTime(),
    )
  })

  it('schedules a refresh after the next 5 AM app day starts', () => {
    const date = new Date('2026-05-29T04:59:59.500Z')

    expect(getMillisecondsUntilNextAppDay(date, 'UTC')).toBe(1_500)
  })
})
