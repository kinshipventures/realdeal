import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isChunkLoadError, reloadOnceForChunkLoadError } from './chunkLoadRecovery'

describe('chunk load recovery', () => {
  const reload = vi.fn()

  beforeEach(() => {
    reload.mockReset()
    window.sessionStorage.clear()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.sessionStorage.clear()
  })

  it('recognizes stale dynamic import and chunk loading failures', () => {
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: /assets/AccountPage-old.js'))).toBe(true)
    expect(isChunkLoadError('ChunkLoadError: Loading chunk 7 failed')).toBe(true)
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true)
    expect(isChunkLoadError(new Error('Regular application error'))).toBe(false)
  })

  it('reloads once inside the recovery window', () => {
    expect(reloadOnceForChunkLoadError()).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)

    expect(reloadOnceForChunkLoadError()).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })
})

