import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SubPodSelector } from './SubPodSelector'

const pod = {
  id: 'pod-maps',
  name: 'MAPS',
  color: null,
  icon: null,
  cadence_days: 30,
  is_priority: false,
  enrichment_opt_in: false,
  created_at: '2026-01-01',
}

const subPod = {
  id: 'subpod-music',
  list_id: pod.id,
  name: 'Music',
  description: null,
  color: null,
  sort_order: 0,
  created_at: '2026-01-01',
}

describe('SubPodSelector', () => {
  it('keeps Sub-pods visible before a pod is selected', () => {
    const markup = renderToStaticMarkup(
      <SubPodSelector
        pods={[pod]}
        categories={[]}
        selectedPodIds={[]}
        selectedCategoryIds={[]}
        onSelect={() => {}}
        onClear={() => {}}
      />,
    )

    expect(markup).toContain('Sub-pods')
    expect(markup).toContain('Select a pod to view its sub-pods.')
  })

  it('hides sub-pod options until their parent pod is selected', () => {
    const markup = renderToStaticMarkup(
      <SubPodSelector
        pods={[pod]}
        categories={[subPod]}
        selectedPodIds={[]}
        selectedCategoryIds={[]}
        onSelect={() => {}}
        onClear={() => {}}
      />,
    )

    expect(markup).toContain('Select a pod to view its sub-pods.')
    expect(markup).not.toContain('Music')
  })

  it('shows sub-pod options only after their parent pod is selected', () => {
    const markup = renderToStaticMarkup(
      <SubPodSelector
        pods={[pod]}
        categories={[subPod]}
        selectedPodIds={[pod.id]}
        selectedCategoryIds={[]}
        onSelect={() => {}}
        onClear={() => {}}
      />,
    )

    expect(markup).toContain('Music')
  })

  it('keeps Sub-pods visible when a selected pod has no options', () => {
    const markup = renderToStaticMarkup(
      <SubPodSelector
        pods={[pod]}
        categories={[]}
        selectedPodIds={[pod.id]}
        selectedCategoryIds={[]}
        onSelect={() => {}}
        onClear={() => {}}
      />,
    )

    expect(markup).toContain('Sub-pods')
    expect(markup).toContain('No sub-pods available.')
  })
})
