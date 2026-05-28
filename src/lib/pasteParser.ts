import { parseCSV } from './csvImport'

export function parsePastedData(text: string): { headers: string[]; rows: Record<string, string>[] } | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const parsed = parseCSV(trimmed)
  if (parsed.headers.length < 2 || parsed.rows.length === 0) return null
  return parsed
}
