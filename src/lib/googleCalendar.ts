import { getGoogleAccessToken } from './auth'

export interface GoogleCalendarEvent {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  htmlLink: string | null
  location: string | null
  attendeeCount: number
}

interface GoogleCalendarEventResponse {
  id?: string
  summary?: string
  status?: string
  htmlLink?: string
  location?: string
  attendees?: unknown[]
  start?: { date?: string; dateTime?: string }
  end?: { date?: string; dateTime?: string }
}

export async function getGoogleCalendarEvents(from: Date, to: Date): Promise<GoogleCalendarEvent[]> {
  const token = await getGoogleAccessToken()
  if (!token) {
    throw new Error('Connect Google to load your calendar.')
  }

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
  url.searchParams.set('timeMin', from.toISOString())
  url.searchParams.set('timeMax', to.toISOString())
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', '250')

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Google Calendar access needs to be reconnected.')
    }
    throw new Error('Could not load Google Calendar.')
  }

  const data = await response.json() as { items?: GoogleCalendarEventResponse[] }
  return (data.items ?? [])
    .filter(event => event.status !== 'cancelled')
    .flatMap(event => {
      const start = event.start?.dateTime ?? event.start?.date
      const end = event.end?.dateTime ?? event.end?.date
      if (!event.id || !start || !end) return []
      return [{
        id: event.id,
        title: event.summary?.trim() || 'Untitled event',
        start,
        end,
        allDay: Boolean(event.start?.date && !event.start?.dateTime),
        htmlLink: event.htmlLink ?? null,
        location: event.location ?? null,
        attendeeCount: event.attendees?.length ?? 0,
      }]
    })
}

export function calendarEventDateKey(event: GoogleCalendarEvent): string {
  if (event.allDay) return event.start.slice(0, 10)
  return localDateKey(new Date(event.start))
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
