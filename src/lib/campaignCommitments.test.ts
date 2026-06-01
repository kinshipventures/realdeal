import { describe, expect, it } from 'vitest'
import {
  CAMPAIGN_COMMITMENT_AMOUNT_FIELD,
  CAMPAIGN_FUNDRAISING_GOAL_FIELD,
  formatMoney,
  formatMoneyCompact,
  getCampaignContactCommitmentAmount,
  getCampaignFundraisingGoal,
  parseMoneyInput,
  withMoneyField,
} from './campaignCommitments'

describe('campaign commitments', () => {
  it('parses common money input formats', () => {
    expect(parseMoneyInput('$50M')).toBe(50_000_000)
    expect(parseMoneyInput('10K')).toBe(10_000)
    expect(parseMoneyInput('1.5m')).toBe(1_500_000)
    expect(parseMoneyInput('250,000')).toBe(250_000)
    expect(parseMoneyInput('')).toBeNull()
  })

  it('reads campaign-specific amounts from custom fields', () => {
    expect(getCampaignContactCommitmentAmount({
      custom_fields: { [CAMPAIGN_COMMITMENT_AMOUNT_FIELD]: 2_000_000 },
    })).toBe(2_000_000)

    expect(getCampaignFundraisingGoal({
      custom_fields: { [CAMPAIGN_FUNDRAISING_GOAL_FIELD]: '$50M' },
    })).toBe(50_000_000)
  })

  it('updates money fields without dropping unrelated custom fields', () => {
    expect(withMoneyField({ source: 'manual' }, CAMPAIGN_COMMITMENT_AMOUNT_FIELD, 25_000)).toEqual({
      source: 'manual',
      commitmentAmount: 25_000,
    })

    expect(withMoneyField({ source: 'manual', commitmentAmount: 25_000 }, CAMPAIGN_COMMITMENT_AMOUNT_FIELD, null)).toEqual({
      source: 'manual',
    })
  })

  it('formats money for display', () => {
    expect(formatMoney(50_000_000)).toBe('$50,000,000')
    expect(formatMoneyCompact(50_000_000)).toBe('$50M')
  })
})
