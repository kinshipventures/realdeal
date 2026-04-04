import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { getPods, invalidateContactsCache } from '../../lib/airtable'
import { parseCSV, detectColumns, importContacts, countInvalidRows } from '../../lib/csvImport'
import type { Pod } from '../../lib/types'
import type { RelationshipType } from '../../lib/types'
import type { ImportProgress, ImportResult } from '../../lib/csvImport'
import { POD_SHIFT_COLORS } from '../map/SolidOrb'

type ImportState = 'upload' | 'preview' | 'importing' | 'done'

const STEPS = ['Upload', 'Configure', 'Import'] as const

function generateTemplate() {
  const csv = 'Name,Email,Phone,Company,Role,Location\nJane Doe,jane@example.com,555-0100,Acme Inc,CEO,New York\n'
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'import-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {STEPS.map((label, i) => {
        const stepNum = i + 1
        const isActive = stepNum === current
        const isDone = stepNum < current
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
                background: isDone ? 'var(--color-brand)' : isActive ? 'var(--color-brand)' : 'var(--tint)',
                color: isDone || isActive ? '#fff' : 'var(--color-text-tertiary)',
                border: isDone || isActive ? 'none' : '1px solid var(--edge-strong)',
                transition: 'all 0.2s',
              }}>
                {isDone ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : stepNum}
              </div>
              <span style={{
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--color-text-primary)' : isDone ? 'var(--color-brand)' : 'var(--color-text-tertiary)',
                transition: 'all 0.2s',
              }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                width: 40,
                height: 1,
                background: isDone ? 'var(--color-brand)' : 'var(--edge-strong)',
                margin: '0 12px',
                transition: 'background 0.2s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

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
  const [showPreview, setShowPreview] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

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
    if (file.size > 5 * 1024 * 1024) {
      setFileError('File is larger than 5MB. Try splitting it into smaller files.')
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
    setShowPreview(false)
    setShowErrors(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const columnMapping = detectColumns(parsedHeaders)
  const invalidCount = parsedRows.length > 0 ? countInvalidRows(parsedRows, recordType) : 0
  const validCount = parsedRows.length - invalidCount

  const stepNumber = state === 'upload' ? 1 : state === 'preview' ? 2 : 3
  const pct = progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
  const remaining = progress ? (progress.total - progress.current) : 0
  const estSeconds = Math.ceil((remaining * 250) / 1000)

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
          margin: '0 0 8px',
        }}>
          Import Records
        </h1>

        <StepIndicator current={stepNumber} />

        {/* Step 1: Upload */}
        {state === 'upload' && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <p style={{
              fontSize: 14,
              color: 'var(--color-text-secondary)',
              margin: '0 0 24px',
              lineHeight: 1.5,
            }}>
              Import contacts from a CSV file. We'll match your columns automatically.
            </p>

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

            <button
              type="button"
              onClick={generateTemplate}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 13,
                color: 'var(--color-brand)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                marginTop: 12,
                padding: 0,
              }}
            >
              Need a template? Download sample CSV
            </button>
          </div>
        )}

        {/* Step 2: Configure */}
        {state === 'preview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.2s ease' }}>
            {/* File info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'var(--color-surface)',
              border: '1px solid var(--edge)',
              borderRadius: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{fileName}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{parsedRows.length} rows</span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Change file
              </button>
            </div>

            {/* Record type */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>
                Import as
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { type: 'Contact' as RelationshipType, label: 'Contacts', desc: 'People you know' },
                  { type: 'Company' as RelationshipType, label: 'Companies', desc: 'Organizations' },
                ]).map(({ type, label, desc }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setRecordType(type)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      borderRadius: 8,
                      border: '1px solid',
                      borderColor: recordType === type ? 'var(--color-brand)' : 'var(--edge-strong)',
                      background: recordType === type ? 'rgba(37,180,57,0.06)' : 'transparent',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.12s',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: recordType === type ? 600 : 400,
                      color: recordType === type ? 'var(--color-brand)' : 'var(--color-text-primary)',
                    }}>{label}</span>
                    <span style={{
                      display: 'block',
                      fontSize: 11,
                      color: 'var(--color-text-tertiary)',
                      marginTop: 2,
                    }}>{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pod selector */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>
                Import into pod(s) <span style={{ color: '#25B439' }}>*</span>
              </p>
              {pods.length === 0 ? (
                <p style={{
                  fontSize: 13,
                  color: 'var(--color-text-tertiary)',
                  padding: '12px 14px',
                  background: 'var(--tint)',
                  borderRadius: 8,
                  margin: 0,
                }}>
                  No pods yet. Create a pod first to import contacts into it.
                </p>
              ) : (
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
              )}
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
                {columnMapping.map(({ csvHeader, airtableField }, idx) => {
                  const matched = airtableField && !airtableField.startsWith('_')
                  return (
                    <div key={csvHeader} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderBottom: idx < columnMapping.length - 1 ? '1px solid var(--divider)' : 'none',
                      fontSize: 13,
                    }}>
                      <span style={{ color: 'var(--color-text-primary)' }}>{csvHeader}</span>
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        color: matched ? 'var(--color-brand)' : 'var(--color-text-tertiary)',
                      }}>
                        {matched ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                        )}
                        {matched
                          ? airtableField
                          : airtableField === '_category'
                            ? 'Category (skipped)'
                            : 'Skipped'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Collapsible preview */}
            <div>
              <button
                type="button"
                onClick={() => setShowPreview(p => !p)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: showPreview ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                Preview first 5 rows
              </button>
              {showPreview && (
                <div style={{ overflowX: 'auto', marginTop: 8 }}>
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
              )}
            </div>

            {/* Validation summary */}
            <div style={{
              padding: '12px 14px',
              background: invalidCount > 0 ? 'rgba(255,149,0,0.05)' : 'rgba(37,180,57,0.05)',
              border: `1px solid ${invalidCount > 0 ? 'rgba(255,149,0,0.15)' : 'rgba(37,180,57,0.15)'}`,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              {invalidCount > 0 ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CC7700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
              <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
                {validCount} {recordType === 'Company' ? 'companies' : 'contacts'} ready
                {invalidCount > 0 && ` - ${invalidCount} will be skipped (no name)`}
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                type="button"
                onClick={handleImport}
                disabled={selectedPodIds.length === 0 || validCount === 0}
                style={{
                  padding: '10px 28px',
                  background: 'var(--color-brand)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: selectedPodIds.length > 0 && validCount > 0 ? 'pointer' : 'not-allowed',
                  opacity: selectedPodIds.length > 0 && validCount > 0 ? 1 : 0.5,
                  fontFamily: 'inherit',
                  transition: 'opacity 0.12s',
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

        {/* Step 3: Importing */}
        {state === 'importing' && progress && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.2s ease' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 700,
                fontSize: 18,
                color: 'var(--color-text-primary)',
                margin: '0 0 4px',
              }}>
                Importing...
              </p>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
                {estSeconds > 0 ? `About ${estSeconds}s remaining` : 'Finishing up...'}
              </p>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {progress.current} of {progress.total}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {pct}%
                </span>
              </div>
              <div style={{
                height: 6,
                background: 'var(--tint)',
                borderRadius: 3,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: 'var(--color-brand)',
                  borderRadius: 3,
                  transition: 'width 0.2s',
                }} />
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: 16,
              justifyContent: 'center',
              fontSize: 13,
              color: 'var(--color-text-secondary)',
            }}>
              <span>{progress.imported} imported</span>
              <span style={{ color: 'var(--edge-strong)' }}>|</span>
              <span>{progress.skipped} skipped</span>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {state === 'done' && result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.2s ease' }}>
            <div style={{
              padding: '24px 20px',
              background: 'var(--color-surface)',
              border: '1px solid var(--edge)',
              borderRadius: 12,
              textAlign: 'center',
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(37,180,57,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 700,
                fontSize: 18,
                color: 'var(--color-text-primary)',
                margin: '0 0 4px',
              }}>
                Import complete
              </p>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
                {result.imported} {recordType === 'Company' ? 'companies' : 'contacts'} imported
                {result.skipped > 0 && ` - ${result.skipped} skipped`}
              </p>

              {result.errors.length > 0 && (
                <div style={{ marginTop: 16, textAlign: 'left' }}>
                  <button
                    type="button"
                    onClick={() => setShowErrors(e => !e)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 12,
                      color: '#CC7700',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: showErrors ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                    {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}
                  </button>
                  {showErrors && (
                    <div style={{ marginTop: 8 }}>
                      {result.errors.map((err, i) => (
                        <p key={i} style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: '2px 0' }}>{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => navigate('/pods')}
                style={{
                  padding: '10px 24px',
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
                View in Pods
              </button>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  padding: '10px 24px',
                  background: 'var(--tint)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--edge)',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Import Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
