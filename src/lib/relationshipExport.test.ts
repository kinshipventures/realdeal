import { describe, expect, it } from 'vitest'
import { unzipSync } from 'fflate'
import { buildRelationshipExportWorkbook } from './relationshipExport'
import { parseWorkbookBuffer } from './csvImport'

function bufferFromBytes(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

describe('relationship Excel export', () => {
  it('builds a parseable workbook from visible relationship columns', async () => {
    const bytes = buildRelationshipExportWorkbook({
      sheetName: 'Relationships',
      headers: ['Name', 'Sub-pod', 'Health'],
      rows: [
        ['Briell Huddleston', 'Inner Circle', '80'],
        ['Aisha & Co', 'LPs > Angels', '55'],
      ],
    })

    const parsed = await parseWorkbookBuffer(bufferFromBytes(bytes))

    expect(parsed.headers).toEqual(['Name', 'Sub-pod', 'Health'])
    expect(parsed.rows).toEqual([
      { Name: 'Briell Huddleston', 'Sub-pod': 'Inner Circle', Health: '80' },
      { Name: 'Aisha & Co', 'Sub-pod': 'LPs > Angels', Health: '55' },
    ])
  })

  it('escapes XML-sensitive values and keeps the header row frozen', () => {
    const bytes = buildRelationshipExportWorkbook({
      sheetName: 'Relationships / Filtered',
      headers: ['Name', 'Company'],
      rows: [['Aisha & Co', 'Fund <One>']],
    })
    const workbookFiles = unzipSync(bytes)
    const sheetXml = new TextDecoder().decode(workbookFiles['xl/worksheets/sheet1.xml'])
    const workbookXml = new TextDecoder().decode(workbookFiles['xl/workbook.xml'])

    expect(sheetXml).toContain('Aisha &amp; Co')
    expect(sheetXml).toContain('Fund &lt;One&gt;')
    expect(sheetXml).toContain('<pane ySplit="1" topLeftCell="A2"')
    expect(workbookXml).toContain('Relationships   Filtered')
  })
})
