import { beforeEach, describe, expect, it } from 'vitest'
import {
  activeWorkspaceStorageKey,
  clearActiveWorkspaceId,
  getActiveWorkspaceId,
  getStoredActiveWorkspaceId,
  setActiveWorkspaceId,
} from './workspace'

describe('active workspace storage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    clearActiveWorkspaceId()
  })

  it('keeps workspace choices scoped by signed-in user', () => {
    localStorage.setItem('realdeal:active-workspace', 'legacy-workspace')

    setActiveWorkspaceId('workspace-a', 'user-a')
    setActiveWorkspaceId('workspace-b', 'user-b')

    expect(getStoredActiveWorkspaceId('user-a')).toBe('workspace-a')
    expect(getStoredActiveWorkspaceId('user-b')).toBe('workspace-b')
    expect(getActiveWorkspaceId()).toBe('workspace-b')
    expect(sessionStorage.getItem(activeWorkspaceStorageKey('user-a'))).toBe('workspace-a')
    expect(sessionStorage.getItem(activeWorkspaceStorageKey('user-b'))).toBe('workspace-b')
    expect(localStorage.getItem('realdeal:active-workspace')).toBeNull()
  })

  it('clears only the current user workspace when a user is provided', () => {
    setActiveWorkspaceId('workspace-a', 'user-a')
    setActiveWorkspaceId('workspace-b', 'user-b')

    clearActiveWorkspaceId('user-a')

    expect(getStoredActiveWorkspaceId('user-a')).toBeNull()
    expect(getStoredActiveWorkspaceId('user-b')).toBe('workspace-b')
    expect(getActiveWorkspaceId()).toBe('workspace-b')

    clearActiveWorkspaceId('user-b')

    expect(() => getActiveWorkspaceId()).toThrow('No active workspace')
  })
})
