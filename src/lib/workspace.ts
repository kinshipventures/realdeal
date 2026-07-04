// Module-level workspace state for use in non-React code (data layer).
// Team workspaces must behave as one active account at a time. The persisted
// choice is scoped to the signed-in user and current browser tab/session.
let _activeWorkspaceId: string | null = null
let _activeWorkspaceUserId: string | null = null

const LEGACY_STORAGE_KEY = 'realdeal:active-workspace'
const CURRENT_SESSION_KEY = 'realdeal:active-workspace:current'
const SCOPED_STORAGE_PREFIX = 'realdeal:active-workspace:'

function sessionStore(): Storage | undefined {
  return (globalThis as { sessionStorage?: Storage }).sessionStorage
}

function localStore(): Storage | undefined {
  return (globalThis as { localStorage?: Storage }).localStorage
}

function storageAvailable(storage: Storage | undefined): storage is Storage {
  return typeof storage !== 'undefined'
}

function safeGet(storage: Storage | undefined, key: string): string | null {
  if (!storageAvailable(storage)) return null
  try { return storage.getItem(key) } catch { return null }
}

function safeSet(storage: Storage | undefined, key: string, value: string): void {
  if (!storageAvailable(storage)) return
  try { storage.setItem(key, value) } catch { /* ignore storage failures */ }
}

function safeRemove(storage: Storage | undefined, key: string): void {
  if (!storageAvailable(storage)) return
  try { storage.removeItem(key) } catch { /* ignore storage failures */ }
}

export function activeWorkspaceStorageKey(userId: string): string {
  return `${SCOPED_STORAGE_PREFIX}${userId}`
}

export function getStoredActiveWorkspaceId(userId?: string | null): string | null {
  if (!userId) return safeGet(sessionStore(), CURRENT_SESSION_KEY)
  const scopedKey = activeWorkspaceStorageKey(userId)
  return safeGet(sessionStore(), scopedKey) ?? safeGet(localStore(), scopedKey)
}

export function getActiveWorkspaceId(): string {
  if (_activeWorkspaceId) return _activeWorkspaceId
  const current = safeGet(sessionStore(), CURRENT_SESSION_KEY)
  if (current) {
    _activeWorkspaceId = current
    return current
  }
  throw new Error('No active workspace')
}

export function setActiveWorkspaceId(id: string, userId?: string | null): void {
  _activeWorkspaceId = id
  _activeWorkspaceUserId = userId ?? null
  safeSet(sessionStore(), CURRENT_SESSION_KEY, id)
  if (userId) {
    const scopedKey = activeWorkspaceStorageKey(userId)
    safeSet(sessionStore(), scopedKey, id)
    safeSet(localStore(), scopedKey, id)
  }
  safeRemove(localStore(), LEGACY_STORAGE_KEY)
}

export function clearActiveWorkspaceId(userId?: string | null): void {
  const shouldClearCurrent = !userId || !_activeWorkspaceUserId || _activeWorkspaceUserId === userId
  if (shouldClearCurrent) {
    _activeWorkspaceId = null
    _activeWorkspaceUserId = null
    safeRemove(sessionStore(), CURRENT_SESSION_KEY)
  }
  if (userId) {
    const scopedKey = activeWorkspaceStorageKey(userId)
    safeRemove(sessionStore(), scopedKey)
    safeRemove(localStore(), scopedKey)
  }
  safeRemove(localStore(), LEGACY_STORAGE_KEY)
}
