import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Campaign, CampaignContact } from './types'
import { linkedContactCardCampaigns, selectedContactCardValues, visibleAssignedIds } from './contactCardVisibility'

function campaign(id: string, status: Campaign['status'] = 'active'): Campaign {
  return {
    id,
    name: id,
    type: 'outreach',
    deadline: null,
    status,
    notes: null,
    description: null,
    custom_fields: {},
    contact_ids: [],
    created_at: '2026-01-01T00:00:00.000Z',
  }
}

function link(campaignId: string): CampaignContact {
  return {
    id: `link-${campaignId}`,
    campaign_id: campaignId,
    contact_id: 'contact-1',
    status: 'pending',
    stage_id: null,
    notes: null,
    owner: null,
    next_step: null,
    next_step_due: null,
    moved_at: null,
    is_priority: false,
    custom_fields: {},
    created_at: '2026-01-01T00:00:00.000Z',
  }
}

describe('contact card visibility', () => {
  it('shows sub-pod parent groups only when the parent pod is assigned', () => {
    expect(visibleAssignedIds(['maps', 'lps', 'talent'], ['maps'])).toEqual(['maps'])
  })

  it('shows only selected field values and never default available values', () => {
    expect(selectedContactCardValues(['Fund I', 'Fund II', 'Fund I'], ['Fund II'])).toEqual(['Fund I'])
    expect(selectedContactCardValues(null, ['Fund I'])).toEqual([])
  })

  it('shows only campaigns linked to the contact', () => {
    expect(
      linkedContactCardCampaigns(
        [campaign('linked'), campaign('available'), campaign('hidden', 'hidden')],
        [link('linked'), link('hidden')],
        [],
      ).map(item => item.id),
    ).toEqual(['linked'])
  })

  it('keeps available-option labels out of contact card renderers', () => {
    const contactCardFiles = [
      'src/components/contacts/ContactDetail.tsx',
      'src/components/records/RecordWidgets.tsx',
      'src/components/records/PipelinesWidget.tsx',
    ]

    for (const file of contactCardFiles) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8')
      expect(source, file).not.toMatch(/\bAvailable\b/)
      expect(source, file).not.toMatch(/\bdisplayOnlyIds\b/)
    }
  })

  it('keeps unassigned pod options out of contact card renderers', () => {
    const contactDetail = readFileSync(resolve(process.cwd(), 'src/components/contacts/ContactDetail.tsx'), 'utf8')
    const recordWidgets = readFileSync(resolve(process.cwd(), 'src/components/records/RecordWidgets.tsx'), 'utf8')

    expect(contactDetail).not.toMatch(/\{visiblePods\.map\(pod/)
    expect(recordWidgets).not.toMatch(/pods\.filter\(p => displayPodIds\.includes\(p\.id\)\)/)
  })
})
