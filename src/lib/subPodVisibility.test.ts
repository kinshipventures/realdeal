import { describe, expect, it } from 'vitest'
import { formatContactSubPods, getContactSubPods } from './subPodVisibility'
import type { Category } from './types'

const categories: Category[] = [
  { id: 'cat-lp-internal', list_id: 'pod-lps', name: 'LP Internal', color: null, icon: null, created_at: '2026-01-01' },
  { id: 'cat-lp-pr', list_id: 'pod-lps', name: 'LP PR', color: null, icon: null, created_at: '2026-01-01' },
  { id: 'cat-founder-services', list_id: 'pod-services', name: 'Founder Services', color: null, icon: null, created_at: '2026-01-01' },
]

describe('sub-pod visibility helpers', () => {
  it('returns sub-pods in the contact assignment order', () => {
    const result = getContactSubPods(
      { category_ids: ['cat-lp-pr', 'cat-founder-services'] },
      categories,
    )

    expect(result.map(category => category.name)).toEqual(['LP PR', 'Founder Services'])
  })

  it('ignores stale category ids instead of showing broken values', () => {
    const result = getContactSubPods(
      { category_ids: ['missing-category', 'cat-lp-internal'] },
      categories,
    )

    expect(result.map(category => category.name)).toEqual(['LP Internal'])
  })

  it('formats a readable list for exports and table cells', () => {
    expect(formatContactSubPods(
      { category_ids: ['cat-lp-internal', 'cat-lp-pr'] },
      categories,
    )).toBe('LP Internal, LP PR')
  })
})
