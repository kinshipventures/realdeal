import { describe, expect, it } from 'vitest'
import { calendarEventDateKey, localDateKey, type GoogleCalendarEvent } from './googleCalendar'

describe('google calendar date helpers', () => {
  it('formats local dates without shifting the day', () => {
    expect(localDateKey(new Date(2026, 5, 5, 23, 30))).toBe('2026-06-05')
  })

  it('keeps the explicit date for all-day events', () => {
    const event: GoogleCalendarEvent = {
      id: 'event-1',
      title: 'All-day event',
      start: '2026-06-05',
      end: '2026-06-06',
      allDay: true,
      htmlLink: null,
      location: null,
      attendeeCount: 0,
    }

    expect(calendarEventDateKey(event)).toBe('2026-06-05')
  })
})
