import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { getPods, invalidateContactsCache } from '../../lib/airtable'
import { parseCSV, detectColumns, importContacts, countInvalidRows } from '../../lib/csvImport'
import type { Pod } from '../../lib/types'
import type { RelationshipType } from '../../lib/types'
import type { ImportProgress, ImportResult } from '../../lib/csvImport'
import { POD_SHIFT_COLORS } from '../map/SolidOrb'

type ImportState = 'upload' | 'preview' | 'importing' | 'done'

export function ImportPanel() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [pods, setPods] = useState<Pod[]>([])
  const [selectedPodIds, setSelectedPodIds] = useState<string[]>([])
  const [recordType, setRecordType] = useState<RelationshipType>('Contact')
  const [state, setState] = useState<ImportState>('upload')
  const [dragOver, setDragOver] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  const [fileName, setFileName] = useState('')
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([])
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([])

  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  useEffect(() => {
    getPods().then(data => setPods(data))
  }, [])

  function togglePod(id: string) {
    setSelectedPodIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  function processFile(file: File) {
    setFileError(null)
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setFileError('Please select a valid CSV file')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const parsed = parseCSV(content)
      if (parsed.rows.length === 0) {
        setFileError('CSV file is empty or has no data rows')
        return
      }
      setFileName(file.name)
      setParsedHeaders(parsed.headers)
      setParsedRows(parsed.rows)
      setState('preview')
    }
    reader.readAsText(file)
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragOver(false), [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  async function handleImport() {
    if (selectedPodIds.length === 0) return
    setState('importing')
    setProgress({ current: 0, total: parsedRows.length, imported: 0, skipped: 0 })

    const res = await importContacts(
      parsedRows,
      selectedPodIds[0],
      (p) => setProgress(p),
      { type: recordType, podIds: selectedPodIds }
    )
    invalidateContactsCache()
    setResult(res)
    setState('done')
  }

  function handleReset() {
    setState('upload')
    setFileError(null)
    setFileName('')
    setParsedHeaders([])
    setParsedRows([])
    setProgress(null)
    setResult(null)
    setSelectedPodIds([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const columnMapping = detectColumns(parsedHeaders)
  const invalidCount = parsedRows.length > 0 ? countInvalidRows(parsedRows, recordType) : 0
  const validCount = parsedRows.length - invalidCount

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '48px 24px 80px',
    }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 700,
          fontSize: 18,
          color: 'var(--color-text-primary)',
          margin: '0 0 32px',
        }}>
          Import Records
        </h1>

        {/* State 1: Upload */}
        {state === 'upload' && (
          <div>
            <div
              role="button"
              tabIndex={0}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              style={{
                minHeight: 200,
                border: `2px dashed ${dragOver ? 'var(--color-brand)' : 'var(--edge-strong)'}`,
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
                background: dragOver ? 'rgba(37,180,57,0.04)' : 'var(--color-surface)',
                transition: 'all 0.15s',
                padding: 32,
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <p style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 700,
                fontSize: 18,
                color: 'var(--color-text-primary)',
                margin: 0,
              }}>
                Drop a CSV file here
              </p>
              <p style={{
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                margin: 0,
              }}>
                or click to browse
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {fileError && (
              <p style={{ fontSize: 13, color: '#D32F2F', marginTop: 8 }}>{fileError}</p>
            )}
          </div>
        )}

        {/* State 2: Preview */}
        {state === 'preview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>{fileName}</p>

            {/* Record type selector */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>
                Import as:
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['Contact', 'Company'] as RelationshipType[]).map(rt => (
                  <button
                    key={rt}
                    type="button"
                    onClick={() => setRecordType(rt)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: 8,
                      border: '1px solid',
                      borderColor: recordType === rt ? 'var(--color-brand)' : 'var(--edge-strong)',
                      background: recordType === rt ? 'rgba(37,180,57,0.08)' : 'transparent',
                      color: recordType === rt ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                      fontSize: 13,
                      fontWeight: recordType === rt ? 600 : 400,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.12s',
                    }}
                  >
                    {rt === 'Contact' ? 'Contacts' : 'Companies'}
                  </button>
                ))}
              </div>
            </div>

            {/* Pod multi-select */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>
                Import into pod(s): <span style={{ color: '#25B439' }}>*</span>
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {pods.map(p => {
                  const isSelected = selectedPodIds.includes(p.id)
                  const shift = p.color ? (POD_SHIFT_COLORS[p.color] ?? p.color) : '#25B439'
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePod(p.id)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 100,
                        border: '1px solid',
                        borderColor: isSelected ? (p.color ?? '#25B439') : 'var(--edge-strong)',
                        background: isSelected ? shift : 'transparent',
                        color: isSelected ? '#fff' : 'var(--color-text-secondary)',
                        fontSize: 11,
                        fontWeight: isSelected ? 700 : 400,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.12s',
                      }}
                    >
                      {p.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Column mapping */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>
                Column mapping
              </p>
              <div style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--edge)',
                borderRadius: 8,
                overflow: 'hidden',
              }}>
                {columnMapping.map(({ csvHeader, airtableField }) => (
                  <div key={csvHeader} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--divider)',
                    fontSize: 13,
                  }}>
                    <span style={{ color: 'var(--color-text-primary)' }}>{csvHeader}</span>
                    <span style={{ color: airtableField && !airtableField.startsWith('_') ? 'var(--color-brand)' : 'var(--color-text-secondary)' }}>
                      {airtableField && !airtableField.startsWith('_')
                        ? `→ ${airtableField}`
                        : airtableField === '_category'
                          ? '→ (category, skipped)'
                          : '→ (skipped)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview table */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>
                Preview (first 5 rows)
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--edge)',
                  borderRadius: 8,
                  overflow: 'hidden',
                  fontSize: 13,
                }}>
                  <thead>
                    <tr>
                      {parsedHeaders.map(h => (
                        <th key={h} style={{
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontSize: 11,
                          fontWeight: 500,
                          color: 'var(--color-text-secondary)',
                          borderBottom: '1px solid var(--edge)',
                          whiteSpace: 'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {parsedHeaders.map(h => (
                          <td key={h} style={{
                            padding: '8px 12px',
                            color: 'var(--color-text-primary)',
                            borderBottom: i < 4 ? '1px solid var(--divider)' : 'none',
                            whiteSpace: 'nowrap',
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>{row[h] ?? ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '8px 0 0' }}>
                {validCount} {recordType === 'Company' ? 'companies' : 'contacts'} ready to import
                {invalidCount > 0 && ` · ${parsedRows.length} total rows`}
              </p>
              {invalidCount > 0 && (
                <p style={{ fontSize: 12, color: '#CC7700', margin: '4px 0 0', background: 'rgba(255,149,0,0.06)', padding: '6px 10px', borderRadius: 6 }}>
                  {invalidCount} row{invalidCount !== 1 ? 's' : ''} will be skipped (missing required name field)
                </p>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                type="button"
                onClick={handleImport}
                disabled={selectedPodIds.length === 0 || validCount === 0}
                style={{
                  padding: '8px 24px',
                  background: 'var(--color-brand)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: selectedPodIds.length > 0 && validCount > 0 ? 'pointer' : 'not-allowed',
                  opacity: selectedPodIds.length > 0 && validCount > 0 ? 1 : 0.5,
                  fontFamily: 'inherit',
                }}
              >
                Import {validCount > 0 ? `${validCount} ` : ''}{recordType === 'Company' ? 'Companies' : 'Contacts'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* State 3: Importing */}
        {state === 'importing' && progress && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-primary)', margin: 0 }}>
              Importing... {progress.current}/{progress.total}
            </p>
            <div style={{
              height: 6,
              background: 'var(--border, var(--edge-strong))',
              borderRadius: 3,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                background: 'var(--color-brand)',
                borderRadius: 3,
                transition: 'width 0.2s',
              }} />
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
              {progress.imported} imported, {progress.skipped} skipped
            </p>
          </div>
        )}

        {/* State 4: Done */}
        {state === 'done' && result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{
              padding: 16,
              background: 'var(--color-surface)',
              border: '1px solid var(--edge)',
              borderRadius: 8,
            }}>
              <p style={{ fontSize: 13, color: 'var(--color-text-primary)', margin: '0 0 4px', fontWeight: 500 }}>
                Imported {result.imported} {recordType === 'Company' ? 'companies' : 'contacts'}, skipped {result.skipped} duplicates
              </p>
              {result.errors.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: '0 0 4px' }}>
                    {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}:
                  </p>
                  {result.errors.map((err, i) => (
                    <p key={i} style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: '2px 0' }}>{err}</p>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  padding: '8px 24px',
                  background: 'var(--color-brand)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Import Another
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Back to Pulse
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
