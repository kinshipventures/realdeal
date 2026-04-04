// Module-level workspace state for use in non-React code (data layer)
let _activeWorkspaceId: string | null = null

const STORAGE_KEY = 'realdeal:active-workspace'

export function getActiveWorkspaceId(): string {
  if (_activeWorkspaceId) return _activeWorkspaceId
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) { _activeWorkspaceId = stored; return stored }
  throw new Error('No active workspace')
}

export function setActiveWorkspaceId(id: string): void {
  _activeWorkspaceId = id
  localStorage.setItem(STORAGE_KEY, id)
}

export function clearActiveWorkspaceId(): void {
  _activeWorkspaceId = null
  localStorage.removeItem(STORAGE_KEY)
}
