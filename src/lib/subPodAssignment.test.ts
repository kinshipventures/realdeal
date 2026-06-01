import { describe, expect, it } from 'vitest'
import { planClearSubPodForPod, planMoveToSubPod } from './subPodAssignment'

describe('planMoveToSubPod', () => {
  it('assigns the selected sub-pod and keeps the parent pod available', () => {
    const update = planMoveToSubPod(
      { list_ids: [], primary_list_id: null, category_ids: [] },
      { id: 'cat-lp-pr', list_id: 'pod-lps' },
      [{ id: 'cat-lp-pr', list_id: 'pod-lps' }],
    )

    expect(update).toEqual({
      list_ids: ['pod-lps'],
      primary_list_id: 'pod-lps',
      category_ids: ['cat-lp-pr'],
    })
  })

  it('moves within the parent pod without removing other pod assignments', () => {
    const update = planMoveToSubPod(
      {
        list_ids: ['pod-lps', 'pod-services'],
        primary_list_id: 'pod-services',
        category_ids: ['cat-lp-internal', 'cat-founder-services'],
      },
      { id: 'cat-lp-pr', list_id: 'pod-lps' },
      [
        { id: 'cat-lp-internal', list_id: 'pod-lps' },
        { id: 'cat-lp-pr', list_id: 'pod-lps' },
        { id: 'cat-founder-services', list_id: 'pod-services' },
      ],
    )

    expect(update).toEqual({
      list_ids: ['pod-lps', 'pod-services'],
      primary_list_id: 'pod-services',
      category_ids: ['cat-founder-services', 'cat-lp-pr'],
    })
  })

  it('does not duplicate pod or sub-pod ids', () => {
    const update = planMoveToSubPod(
      {
        list_ids: ['pod-lps'],
        primary_list_id: 'pod-lps',
        category_ids: ['cat-lp-pr'],
      },
      { id: 'cat-lp-pr', list_id: 'pod-lps' },
      [{ id: 'cat-lp-pr', list_id: 'pod-lps' }],
    )

    expect(update).toEqual({
      list_ids: ['pod-lps'],
      primary_list_id: 'pod-lps',
      category_ids: ['cat-lp-pr'],
    })
  })

  it('clears only the sub-pod for the selected parent pod', () => {
    const update = planClearSubPodForPod(
      {
        list_ids: ['pod-lps', 'pod-services'],
        primary_list_id: 'pod-lps',
        category_ids: ['cat-lp-internal', 'cat-founder-services'],
      },
      'pod-lps',
      [
        { id: 'cat-lp-internal', list_id: 'pod-lps' },
        { id: 'cat-lp-pr', list_id: 'pod-lps' },
        { id: 'cat-founder-services', list_id: 'pod-services' },
      ],
    )

    expect(update).toEqual({
      list_ids: ['pod-lps', 'pod-services'],
      primary_list_id: 'pod-lps',
      category_ids: ['cat-founder-services'],
    })
  })
})
