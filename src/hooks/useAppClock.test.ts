import { describe, expect, it } from 'vitest'
import {
  getAppDateKey,
  getAppDayStartMs,
  getMillisecondsUntilNextAppDay,
} from './useAppClock'

describe('app clock date helpers', () => {
  it('uses the app timezone instead of the local machine date', () => {
    const beforeNewYorkMidnight = new Date('2026-05-29T03:30:00.000Z')
    const afterNewYorkMidnight = new Date('2026-05-29T04:30:00.000Z')

    expect(getAppDateKey(beforeNewYorkMidnight, 'America/New_York')).toBe('2026-05-28')
    expect(getAppDateKey(afterNewYorkMidnight, 'America/New_York')).toBe('2026-05-29')
    expect(getAppDayStartMs(afterNewYorkMidnight, 'America/New_York')).toBe(
      new Date('2026-05-29T04:00:00.000Z').getTime(),
    )
  })

  it('schedules a refresh after the next app day starts', () => {
    const date = new Date('2026-05-29T23:59:59.500Z')

    expect(getMillisecondsUntilNextAppDay(date, 'UTC')).toBe(1_500)
  })
})
