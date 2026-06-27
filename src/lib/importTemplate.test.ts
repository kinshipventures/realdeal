import { describe, expect, it } from 'vitest'
import { unzipSync } from 'fflate'
import { buildImportTemplateWorkbook } from './importTemplate'
import { detectColumns, parseWorkbookBuffer } from './csvImport'
import type { Campaign, CampaignStage, Category, Company, Contact, Pod } from './types'

function bufferFromBytes(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

function optionColumnValues(optionsXml: string, column: string): string[] {
  return [...optionsXml.matchAll(new RegExp(`<c r="${column}\\d+"[^>]*><is><t>(.*?)</t></is></c>`, 'g'))].map(match => match[1])
}

describe('workspace import template', () => {
  it('builds an Excel template that matches the active workspace options and import mapping', async () => {
    const pods = [
      { id: 'pod-new', name: 'New Pod', color: '#123456', owner: null, is_priority: false, cadence: 'monthly', description: null, capacity: null, enrichment_opt_in: false, created_at: '2026-06-23T00:00:00.000Z' },
    ] as Pod[]
    const categories = [
      { id: 'cat-new', list_id: 'pod-new', name: 'New Sub-pod', color: '#123456', icon: null, created_at: '2026-06-23T00:00:00.000Z' },
    ] as Category[]
    const campaigns = [
      { id: 'campaign-new', name: 'Investor Dinner', type: 'event', deadline: null, status: 'active', notes: null, description: null, custom_fields: {}, contact_ids: [], created_at: '2026-06-23T00:00:00.000Z' },
    ] as Campaign[]
    const campaignStages = [
      { id: 'stage-new', campaign_id: 'campaign-new', name: 'Invited', color: '#123456', order: 0, created_at: '2026-06-23T00:00:00.000Z' },
    ] as CampaignStage[]
    const contacts = [
      {
        id: 'contact-1',
        name: 'Jane Contact',
        type: 'Contact',
        company: 'Lovable',
        kv_fund_investor: ['Moonpay'],
        spv_investor: ['TeraWulf'],
      },
      {
        id: 'company-contact-1',
        name: 'Company Record',
        type: 'Company',
        company: null,
        kv_fund_investor: null,
        spv_investor: null,
      },
    ] as Contact[]
    const companies = [
      { id: 'company-1', name: 'Olipop', website: null, domain: null, ticker: null, location: null, stage: null, industry: null, notes: null, custom_fields: {}, created_at: '2026-06-23T00:00:00.000Z', updated_at: '2026-06-23T00:00:00.000Z' },
    ] as Company[]

    const bytes = buildImportTemplateWorkbook({
      pods,
      categories,
      campaigns,
      campaignStages,
      contacts,
      companies,
      customFieldNames: ['Favorite Coffee', 'SPV Investor', 'SPV Investor (checkbox)', 'Category', 'Notes'],
    })

    const parsed = await parseWorkbookBuffer(bufferFromBytes(bytes))

    expect(parsed.headers.slice(0, 10)).toEqual([
      'Name',
      'Company',
      'Job Title',
      'LinkedIn',
      'Referred By',
      'Gender',
      'Birthday',
      'Notables',
      'Email',
      'Email 2',
    ])
    expect(parsed.headers).toContain('Pod 1')
    expect(parsed.headers).toContain('Sub-pod 1')
    expect(parsed.headers).toContain('Campaign 1')
    expect(parsed.headers).toContain('Kinship Investments 1')
    expect(parsed.headers).toContain('Favorite Coffee')
    expect(parsed.headers).not.toContain('SPV Investor 1')
    expect(parsed.headers).not.toContain('SPV Investor Checkbox')
    expect(parsed.headers).not.toContain('SPV Investor (checkbox)')
    expect(parsed.headers).not.toContain('Fund Type')
    expect(parsed.headers).not.toContain('Category')
    expect(parsed.headers).not.toContain('Notes')

    const mapping = detectColumns(parsed.headers)
    const targetByHeader = new Map(mapping.map(item => [item.csvHeader, item.targetField]))

    expect(targetByHeader.get('Pod 1')).toBe('Pod')
    expect(targetByHeader.get('Sub-pod 1')).toBe('Sub-pod')
    expect(targetByHeader.get('Campaign 1')).toBe('Campaign')
    expect(targetByHeader.get('Campaign 1 Status')).toBe('Campaign Status')
    expect(targetByHeader.get('Kinship Investments 1')).toBe('KV Fund Investor')
    expect(targetByHeader.get('Notables')).toBe('Notables')

    const workbookFiles = unzipSync(bytes)
    const contactsXml = new TextDecoder().decode(workbookFiles['xl/worksheets/sheet1.xml'])
    const optionsXml = new TextDecoder().decode(workbookFiles['xl/worksheets/sheet2.xml'])
    const kinshipInvestmentOptions = optionColumnValues(optionsXml, 'G')

    expect(contactsXml).toContain('<pane ySplit="2" topLeftCell="A3"')
    expect(contactsXml).toContain('<c r="A1" t="inlineStr" s="1"><is><t>contact information</t></is></c>')
    expect(contactsXml).toContain('<c r="I1" t="inlineStr" s="1"><is><t>ways to contact</t></is></c>')
    expect(contactsXml).toContain('<c r="S1" t="inlineStr" s="1"><is><t>investor profile</t></is></c>')
    expect(contactsXml).toContain('<c r="Z1" t="inlineStr" s="1"><is><t>pods</t></is></c>')
    expect(contactsXml).toContain('<c r="AH1" t="inlineStr" s="1"><is><t>campaigns</t></is></c>')
    expect(contactsXml).toContain('<c r="AQ1" t="inlineStr" s="1"><is><t>companies</t></is></c>')
    expect(contactsXml).toContain('<mergeCell ref="A1:H1"/>')
    expect(contactsXml).toContain('<mergeCell ref="I1:R1"/>')
    expect(contactsXml).toContain('sqref="F3:F1000"')
    expect(contactsXml).not.toContain('sqref="F2:F1000"')

    expect(kinshipInvestmentOptions).toContain('Applyboard')
    expect(kinshipInvestmentOptions).toContain('Goop Series A')
    expect(kinshipInvestmentOptions).toContain('Kinship Fund I')
    expect(kinshipInvestmentOptions).toContain('TeraWulf')
    expect(kinshipInvestmentOptions).not.toContain('Company Record')
  })
})
