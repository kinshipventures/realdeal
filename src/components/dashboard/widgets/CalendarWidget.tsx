import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, RefreshCw } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { signInWithGoogle } from '../../../lib/auth'
import {
  calendarEventDateKey,
  getGoogleCalendarEvents,
  localDateKey,
  type GoogleCalendarEvent,
} from '../../../lib/googleCalendar'
import { SectionDivider } from './RadarWidget'

const PANEL: React.CSSProperties = {
  background: 'var(--surface-panel)',
  backdropFilter: 'var(--panel-blur)',
  WebkitBackdropFilter: 'var(--panel-blur)',
  border: 'var(--surface-panel-border)',
  borderRadius: 'var(--panel-radius)',
  overflow: 'hidden',
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function startOfCalendarGrid(month: Date): Date {
  const date = new Date(month.getFullYear(), month.getMonth(), 1)
  date.setDate(date.getDate() - date.getDay())
  return date
}

function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function eventTime(event: GoogleCalendarEvent): string {
  if (event.allDay) return 'All day'
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(event.start))
}

export function CalendarWidget() {
  const { session } = useAuth()
  const today = useMemo(() => new Date(), [])
  const todayKey = localDateKey(today)
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const connected = Boolean(session?.provider_token)

  const gridDays = useMemo(() => {
    const start = startOfCalendarGrid(month)
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      return date
    })
  }, [month])

  const loadEvents = useCallback(async () => {
    if (!connected || gridDays.length === 0) return
    const from = new Date(gridDays[0])
    from.setHours(0, 0, 0, 0)
    const to = new Date(gridDays[gridDays.length - 1])
    to.setDate(to.getDate() + 1)
    to.setHours(0, 0, 0, 0)

    setLoading(true)
    setError(null)
    try {
      setEvents(await getGoogleCalendarEvents(from, to))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load Google Calendar.')
    } finally {
      setLoading(false)
    }
  }, [connected, gridDays])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, GoogleCalendarEvent[]>()
    for (const event of events) {
      const key = calendarEventDateKey(event)
      grouped.set(key, [...(grouped.get(key) ?? []), event])
    }
    return grouped
  }, [events])

  const selectedEvents = eventsByDate.get(selectedDate) ?? []
  const selectedDateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(dateFromKey(selectedDate))

  function moveMonth(offset: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1)
    setMonth(next)
    setSelectedDate(localDateKey(next))
  }

  function showToday() {
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDate(todayKey)
  }

  async function connectGoogle() {
    setConnecting(true)
    setError(null)
    const result = await signInWithGoogle()
    if (result.error) {
      setError('Could not connect Google. Try again.')
      setConnecting(false)
    }
  }

  return (
    <div>
      <SectionDivider title="Calendar" />
      <div style={PANEL}>
        <div style={{
          minHeight: 58,
          padding: '10px 14px',
          borderBottom: '1px solid var(--divider)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarDays size={16} aria-hidden />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: 0 }}>
              {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(month)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {connected ? (
              <>
                <button type="button" onClick={showToday} style={textButtonStyle}>Today</button>
                <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month" title="Previous month" style={iconButtonStyle}>
                  <ChevronLeft size={15} />
                </button>
                <button type="button" onClick={() => moveMonth(1)} aria-label="Next month" title="Next month" style={iconButtonStyle}>
                  <ChevronRight size={15} />
                </button>
                <button type="button" onClick={() => void loadEvents()} disabled={loading} aria-label="Sync calendar" title="Sync calendar" style={iconButtonStyle}>
                  <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : undefined }} />
                </button>
              </>
            ) : (
              <button type="button" onClick={() => void connectGoogle()} disabled={connecting} style={connectButtonStyle}>
                {connecting ? 'Connecting...' : 'Connect Google'}
              </button>
            )}
          </div>
        </div>

        {connected ? (
          <div className="google-calendar-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.65fr) minmax(250px, 0.75fr)' }}>
            <div style={{ minWidth: 0, borderRight: '1px solid var(--divider)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: '1px solid var(--divider)' }}>
                {WEEKDAYS.map(day => (
                  <div key={day} style={{
                    padding: '8px 4px',
                    textAlign: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {day}
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
                {gridDays.map(date => {
                  const key = localDateKey(date)
                  const dayEvents = eventsByDate.get(key) ?? []
                  const inMonth = date.getMonth() === month.getMonth()
                  const selected = key === selectedDate
                  const isToday = key === todayKey
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDate(key)}
                      aria-pressed={selected}
                      style={{
                        minWidth: 0,
                        height: 78,
                        padding: '7px 7px 6px',
                        border: 'none',
                        borderRight: '1px solid var(--divider)',
                        borderBottom: '1px solid var(--divider)',
                        background: selected
                          ? 'color-mix(in srgb, var(--color-brand) 8%, var(--surface-panel) 92%)'
                          : 'transparent',
                        color: inMonth ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{
                        width: 23,
                        height: 23,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        background: isToday ? 'var(--color-brand)' : 'transparent',
                        color: isToday ? '#fff' : 'inherit',
                        fontSize: 11,
                        fontWeight: isToday || selected ? 700 : 500,
                      }}>
                        {date.getDate()}
                      </span>
                      <div style={{ marginTop: 5, display: 'grid', gap: 3 }}>
                        {dayEvents.slice(0, 2).map(event => (
                          <div key={event.id} style={{
                            height: 4,
                            borderRadius: 2,
                            background: event.allDay ? '#7E57C2' : 'var(--color-brand)',
                            opacity: inMonth ? 0.86 : 0.35,
                          }} />
                        ))}
                        {dayEvents.length > 2 && (
                          <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>+{dayEvents.length - 2}</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ minWidth: 0, padding: '16px 16px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {selectedDateLabel}
              </div>
              {error && <div style={{ marginTop: 12, fontSize: 12, color: '#D93025', lineHeight: 1.5 }}>{error}</div>}
              {!error && loading && events.length === 0 && (
                <div style={{ marginTop: 14, fontSize: 12, color: 'var(--color-text-tertiary)' }}>Loading calendar...</div>
              )}
              {!error && !loading && selectedEvents.length === 0 && (
                <div style={{ marginTop: 14, fontSize: 12, color: 'var(--color-text-tertiary)' }}>No events.</div>
              )}
              <div style={{ display: 'grid', gap: 2, marginTop: 10 }}>
                {selectedEvents.map(event => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => event.htmlLink && window.open(event.htmlLink, '_blank', 'noopener,noreferrer')}
                    disabled={!event.htmlLink}
                    style={{
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: '4px minmax(0, 1fr) auto',
                      gap: 10,
                      alignItems: 'start',
                      padding: '10px 0',
                      border: 'none',
                      borderBottom: '1px solid var(--divider)',
                      background: 'transparent',
                      color: 'inherit',
                      cursor: event.htmlLink ? 'pointer' : 'default',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ width: 4, height: 30, borderRadius: 2, background: event.allDay ? '#7E57C2' : 'var(--color-brand)' }} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.35 }}>
                        {event.title}
                      </span>
                      <span style={{ display: 'block', marginTop: 3, fontSize: 10, color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>
                        {eventTime(event)}{event.location ? ` / ${event.location}` : ''}
                      </span>
                    </span>
                    {event.htmlLink && <ExternalLink size={12} color="var(--color-text-tertiary)" aria-hidden />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '28px 18px', display: 'flex', alignItems: 'center', gap: 12, color: 'var(--color-text-tertiary)' }}>
            <CalendarDays size={22} aria-hidden />
            <span style={{ fontSize: 13 }}>Google Calendar is not connected.</span>
          </div>
        )}
      </div>
    </div>
  )
}

const iconButtonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 6,
  border: '1px solid var(--edge)',
  background: 'var(--surface-panel)',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
}

const textButtonStyle: React.CSSProperties = {
  minHeight: 32,
  padding: '0 10px',
  borderRadius: 6,
  border: '1px solid var(--edge)',
  background: 'var(--surface-panel)',
  color: 'var(--color-text-secondary)',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const connectButtonStyle: React.CSSProperties = {
  minHeight: 34,
  padding: '0 12px',
  borderRadius: 6,
  border: 'none',
  background: 'var(--color-brand)',
  color: '#fff',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
}
