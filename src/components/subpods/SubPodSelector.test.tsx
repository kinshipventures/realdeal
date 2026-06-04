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
