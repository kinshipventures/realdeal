import type { SupabaseClient } from '@supabase/supabase-js'
import type { GoogleConnection } from './google-connection.js'
import { getFreshGoogleAccessToken } from './google-connection.js'

export async function fetchGoogleCalendarEvents(admin: SupabaseClient, connection: GoogleConnection, from: string, to: string) {
  if (!connection.calendar_sync_enabled) return []
  const accessToken = await getFreshGoogleAccessToken(admin, connection)
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
  url.searchParams.set('timeMin', from)
  url.searchParams.set('timeMax', to)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', '250')

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error('Could not load Google Calendar')

  const data = await response.json() as { items?: any[] }
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
