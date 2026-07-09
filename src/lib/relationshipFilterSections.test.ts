import { describe, expect, it } from 'vitest'
import {
  RELATIONSHIP_NONE_FILTER_VALUE,
  buildRelationshipFilterFields,
  normalizeRelationshipFilterFieldId,
  relationshipMatchesSelectedValues,
  selectedRelationshipFilterValues,
} from './relationshipFilterSections'

describe('relationship filter sections', () => {
  it('groups numbered template fields into one filter section', () => {
    expect(normalizeRelationshipFilterFieldId('Pod 1')).toBe('Pods')
    expect(normalizeRelationshipFilterFieldId('Pod 3')).toBe('Pods')
    expect(normalizeRelationshipFilterFieldId('Campaign 2')).toBe('Campaigns')
    expect(normalizeRelationshipFilterFieldId('Kinship Investments 5')).toBe('Kinship Investments')
  })

  it('builds deduped section filters from template columns', () => {
    expect(buildRelationshipFilterFields([
      { id: 'Name', label: 'Name' },
      { id: 'Pod 1', label: 'Pod 1' },
      { id: 'Pod 2', label: 'Pod 2' },
      { id: 'Campaign 1', label: 'Campaign 1' },
      { id: 'Campaign 2', label: 'Campaign 2' },
    ])).toEqual([
      { id: 'Name', label: 'Name' },
      { id: 'Pods', label: 'Pods' },
      { id: 'Campaigns', label: 'Campaigns' },
    ])
  })

  it('normalizes old single selected value into multi-select values', () => {
    expect(selectedRelationshipFilterValues({ propertyValue: 'LPs', propertyValues: ['MAPS'] })).toEqual(['MAPS', 'LPs'])
  })

  it('matches any selected value or None', () => {
    expect(relationshipMatchesSelectedValues(['LPs', 'MAPS'], ['MAPS'])).toBe(true)
    expect(relationshipMatchesSelectedValues(['LPs'], ['MAPS'])).toBe(false)
    expect(relationshipMatchesSelectedValues([], [RELATIONSHIP_NONE_FILTER_VALUE])).toBe(true)
    expect(relationshipMatchesSelectedValues(['LPs'], [RELATIONSHIP_NONE_FILTER_VALUE])).toBe(false)
  })
})
