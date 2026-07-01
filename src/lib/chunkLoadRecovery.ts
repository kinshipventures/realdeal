const CHUNK_RELOAD_KEY = 'realdeal:chunk-reload-attempted-at'
const CHUNK_RELOAD_WINDOW_MS = 30_000

const CHUNK_LOAD_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Importing a module script failed',
  'Failed to load module script',
  'ChunkLoadError',
  'Loading chunk',
]

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return CHUNK_LOAD_ERROR_PATTERNS.some(pattern =>
    message.toLowerCase().includes(pattern.toLowerCase())
  )
}

export function reloadOnceForChunkLoadError(): boolean {
  if (typeof window === 'undefined') return false

  let shouldReload = true
  try {
    const lastReload = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? '0')
    if (Number.isFinite(lastReload) && Date.now() - lastReload < CHUNK_RELOAD_WINDOW_MS) {
      shouldReload = false
    } else {
      window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
    }
  } catch {
    shouldReload = true
  }

  if (!shouldReload) return false
  window.location.reload()
  return true
}
