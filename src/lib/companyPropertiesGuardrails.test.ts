import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(filePath: string) {
  return readFileSync(resolve(process.cwd(), filePath), 'utf8')
}

describe('Company properties guardrails', () => {
  it('keeps company property visibility separate from contact property visibility', () => {
    const settings = source('src/lib/contactDisplaySettings.ts')
    const contactDetail = source('src/components/contacts/ContactDetail.tsx')
    const recordWidgets = source('src/components/records/RecordWidgets.tsx')

    expect(settings).toContain('displaySectionVisibilityId')
    expect(settings).toContain('standardFieldVisibilityId')
    expect(settings).toContain("objectType === 'Company' ? `company:${sectionId}` : sectionId")
    expect(settings).toContain("objectType === 'Company' ? `company:${fieldId}` : fieldId")
    expect(settings).toContain('isSectionVisibleForObject')
    expect(settings).toContain('isStandardFieldVisibleForObject')
    expect(settings).toContain("{ id: 'contacts', label: 'Contacts'")
    expect(settings).toContain("{ id: 'stage', label: 'Stage'")
    expect(settings).toContain("{ id: 'domain', label: 'Domain'")
    expect(settings).toContain("{ id: 'location', label: 'Location'")

    expect(contactDetail).toContain('isSectionVisibleForObject(displaySettings, recordType, sectionId)')
    expect(contactDetail).toContain('isStandardFieldVisibleForObject(displaySettings, recordType, fieldId)')
    expect(recordWidgets).toContain('contact.type === \'Company\' ? COMPANY_STANDARD_PROPERTY_OPTIONS : CONTACT_STANDARD_PROPERTY_OPTIONS')
    expect(recordWidgets).toContain('isSectionVisibleForObject(displaySettings, contact.type, sectionId)')
  })

  it('keeps Settings Properties able to control company pods, sub-pods, campaigns, and fields', () => {
    const propertiesTab = source('src/components/settings/PropertiesTab.tsx')

    expect(propertiesTab).toContain('displaySectionVisibilityId(objectType, id)')
    expect(propertiesTab).toContain('standardFieldVisibilityId(objectType, id)')
    expect(propertiesTab).toContain("'name', 'contacts', 'website', 'linkedin', 'companyType', 'industry', 'fundType', 'stage', 'domain', 'location', 'notes'")
    expect(propertiesTab).toContain("'email', 'email_2', 'email_3', 'phone', 'address', 'city', 'state', 'country', 'global_region'")
    expect(propertiesTab).toContain("if (section.id === 'pods') rowsForSection.push(...podRows(1))")
    expect(propertiesTab).toContain("if (section.id === 'sub_pods') rowsForSection.push(...subPodRows(1))")
    expect(propertiesTab).toContain("if (section.id === 'campaigns') rowsForSection.push(...campaignRows(1))")
    expect(propertiesTab).toContain("objectType === 'Company' ? 'Company scope' : 'Contact scope'")
  })

  it('keeps Companies driven by Properties instead of hardcoded columns', () => {
    const companiesPage = source('src/components/companies/CompaniesPage.tsx')

    expect(companiesPage).toContain('COMPANY_STANDARD_PROPERTY_OPTIONS')
    expect(companiesPage).toContain('useContactDisplaySettings(activeWorkspace?.id)')
    expect(companiesPage).toContain('getFieldConfigs()')
    expect(companiesPage).toContain('FIELD_CONFIGS_EVENT')
    expect(companiesPage).toContain('downloadRelationshipExportWorkbook')
    expect(companiesPage).toContain('companyPropertyFields')
    expect(companiesPage).toContain('visibleCompanyFields')
    expect(companiesPage).toContain('fieldConfigDisplaySectionId')
    expect(companiesPage).toContain('campaignNamesForCompany')
    expect(companiesPage).not.toContain('const COMPANY_COLUMNS')
    expect(companiesPage).not.toContain('const COMPANY_FILTER_FIELDS')
  })

  it('preserves the existing shared resource projection boundary in Companies', () => {
    const companiesPage = source('src/components/companies/CompaniesPage.tsx')

    expect(companiesPage).toContain('isTeamWorkspace')
    expect(companiesPage).toContain('includeSharedWorkspaceResources')
    expect(companiesPage).toContain('includeSharedWorkspaceResources ? getSharedContactsWithMe() : Promise.resolve([])')
    expect(companiesPage).toContain('projectSharedWorkspaceResources')
  })
})
