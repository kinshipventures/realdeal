const APP_TIME_ZONE = process.env.APP_TIME_ZONE || process.env.VITE_APP_TIME_ZONE || 'America/New_York'

export default function handler(_request: unknown, response: any) {
  const now = Date.now()

  response.setHeader('Cache-Control', 'no-store, max-age=0')
  response.status(200).json({
    now,
    iso: new Date(now).toISOString(),
    timeZone: APP_TIME_ZONE,
  })
}
