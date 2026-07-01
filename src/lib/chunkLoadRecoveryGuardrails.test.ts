import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(filePath: string) {
  return readFileSync(resolve(process.cwd(), filePath), 'utf8')
}

describe('chunk load recovery guardrails', () => {
  it('keeps global listeners registered before the app renders', () => {
    const main = source('src/main.tsx')

    expect(main).toContain("import { isChunkLoadError, reloadOnceForChunkLoadError } from './lib/chunkLoadRecovery'")
    expect(main).toContain("window.addEventListener('vite:preloadError'")
    expect(main).toContain("window.addEventListener('unhandledrejection'")
    expect(main).toContain('registerChunkLoadRecovery()')
    expect(main.indexOf('registerChunkLoadRecovery()')).toBeLessThan(main.indexOf('createRoot('))
  })

  it('keeps chunk failures out of the generic error screen', () => {
    const boundary = source('src/components/errors/ErrorBoundary.tsx')

    expect(boundary).toContain('componentDidCatch(error: Error)')
    expect(boundary).toContain('isChunkLoadError(error)')
    expect(boundary).toContain('reloadOnceForChunkLoadError()')
    expect(boundary).toContain('A new version is available')
  })

  it('keeps missing asset requests from falling through to index.html', () => {
    const vercelConfig = JSON.parse(source('vercel.json'))

    expect(vercelConfig.routes).toEqual([
      { handle: 'filesystem' },
      { src: '/assets/(.*)', status: 404 },
      { src: '/(.*)', dest: '/index.html' },
    ])
  })
})

