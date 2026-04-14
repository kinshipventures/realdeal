/**
 * Parses tab-separated or comma-separated text pasted from spreadsheets.
 * Auto-detects delimiter by checking first line.
 */

export function parsePastedData(text: string): { headers: string[]; rows: Record<string, string>[] } | null {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return null

  // Detect delimiter: tabs > commas
  const firstLine = lines[0]
  const delimiter = firstLine.includes('\t') ? '\t' : ','

  const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''))
  if (headers.length < 2) return null

  const rows = lines.slice(1).map(line => {
    const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  }).filter(row => Object.values(row).some(v => v.trim()))

  if (rows.length === 0) return null
  return { headers, rows }
}
