import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(filePath: string) {
  return readFileSync(resolve(process.cwd(), filePath), 'utf8')
}

describe('ContactDetail current option visibility contract', () => {
  it('keeps all visible pod options available in the contact card', () => {
    const contactDetail = source('src/components/contacts/ContactDetail.tsx')

    expect(contactDetail).toMatch(/visiblePods\.map\(pod => \{/)
    expect(contactDetail).toMatch(/const isIn = \(draft\.list_ids \?\? \[\]\)\.includes\(pod\.id\)/)
  })

  it('keeps contact card sub-pod options scoped to selected parent pods', () => {
    const contactDetail = source('src/components/contacts/ContactDetail.tsx')

    expect(contactDetail).toMatch(/const selectedVisibleSubPodIds = useMemo\(\(\) => \{/)
    expect(contactDetail).toMatch(/const assignedPodIds = new Set\(draft\.list_ids \?\? \[\]\)/)
    expect(contactDetail).toMatch(/return visibleSubPodIds\.filter\(podId => assignedPodIds\.has\(podId\)\)/)
    expect(contactDetail).toMatch(/selectedPodIds=\{selectedVisibleSubPodIds\}/)
  })
})
