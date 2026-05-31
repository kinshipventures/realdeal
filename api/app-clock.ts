const APP_TIME_ZONE = process.env.APP_TIME_ZONE || process.env.VITE_APP_TIME_ZONE || 'America/New_York'

function isValidTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== 'string' || timeZone.length > 80) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
    return true
  } catch {
    return false
  }
}

export default function handler(request: any, response: any) {
  const now = Date.now()
  const requestedTimeZone = request?.query?.timeZone
  const timeZone = isValidTimeZone(requestedTimeZone) ? requestedTimeZone : APP_TIME_ZONE

  response.setHeader('Cache-Control', 'no-store, max-age=0')
  response.status(200).json({
    now,
    iso: new Date(now).toISOString(),
    timeZone,
  })
}
