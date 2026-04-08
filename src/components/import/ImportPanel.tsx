import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { getPods, invalidateContactsCache } from '../../lib/airtable'
import { parseCSV, detectColumns, importContacts, countInvalidRows, TARGET_FIELDS } from '../../lib/csvImport'
import type { Pod } from '../../lib/types'
import type { RelationshipType } from '../../lib/types'
import type { ImportProgress, ImportResult, ColumnMapping } from '../../lib/csvImport'
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
    <div style={{ display: 'flex', gap: 4, borderRadius: 10, padding: 3, background: 'var(--tint)', marginBottom: 32, width: 'fit-content' }}>
      {STEPS.map((label, i) => {
        const stepNum = i + 1
        const isActive = stepNum === current
        const isDone = stepNum < current
        return (
          <div
            key={label}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none',
              fontSize: 11, fontWeight: isActive ? 600 : 400,
              fontFamily: 'var(--font-sans)', letterSpacing: '0.01em',
              color: isActive ? '#fff' : isDone ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
              background: isActive ? 'var(--color-brand)' : 'transparent',
              opacity: isDone || isActive ? 1 : 0.5,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: isDone ? 'pointer' : 'default',
              minHeight: 32,
              display: 'flex', alignItems: 'center',
            }}
          >
            {label}
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
      { type: recordType, podIds: selectedPodIds, mapping: columnMapping }
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
    setColumnMapping([])
    setProgress(null)
    setResult(null)
    setSelectedPodIds([])
    setShowPreview(false)
    setShowErrors(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const [columnMapping, setColumnMapping] = useState<ColumnMapping>([])

  // Re-detect columns when headers change
  useEffect(() => {
    if (parsedHeaders.length > 0) {
      setColumnMapping(detectColumns(parsedHeaders))
    }
  }, [parsedHeaders])

  function updateMapping(csvHeader: string, targetField: string | null) {
    setColumnMapping(prev => prev.map(m =>
      m.csvHeader === csvHeader ? { ...m, airtableField: targetField } : m
    ))
  }

  const invalidCount = parsedRows.length > 0 ? countInvalidRows(parsedRows, recordType, columnMapping) : 0
  const validCount = parsedRows.length - invalidCount
  const hasNameMapping = columnMapping.some(m =>
    m.airtableField === 'Name' || m.airtableField === 'First Name'
  )

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
          fontWeight: 800,
          fontSize: state === 'upload' ? 28 : 18,
          color: 'var(--color-text-primary)',
          margin: '0 0 8px',
          letterSpacing: '-0.02em',
          textAlign: state === 'upload' ? 'center' : undefined,
          transition: 'font-size 0.3s ease',
        }}>
          {state === 'upload' ? 'Bring your people in' : 'Import Records'}
        </h1>

        <StepIndicator current={stepNumber} />

        {/* Step 1: Upload */}
        {state === 'upload' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out', textAlign: 'center' }}>
            {/* Network constellation visual - mirrors onboarding step 4 */}
            <div style={{
              display: 'flex', justifyContent: 'center', margin: '0 0 24px',
              opacity: 0, animation: 'fadeIn 0.4s ease-out 0.1s forwards',
            }}>
              <svg width="160" height="140" viewBox="-90 -80 180 160" style={{ animation: 'import-float 5s ease-in-out infinite' }}>
                {[
                  { x: -44, y: -32, color: '#6366F1' }, { x: 48, y: -26, color: '#EC4899' },
                  { x: -30, y: 38, color: '#F59E0B' }, { x: 42, y: 34, color: '#8B5CF6' },
                  { x: -56, y: 8, color: '#14B8A6' }, { x: 58, y: 6, color: '#F97316' },
                  { x: 0, y: -48, color: '#F43F5E' }, { x: -16, y: -50, color: '#0EA5E9' },
                ].map((n, i) => (
                  <line key={`l${i}`} x1={0} y1={0} x2={n.x} y2={n.y}
                    stroke={n.color} strokeWidth="1" strokeOpacity="0.15" />
                ))}
                {[
                  { x: 0, y: 0, size: 14, color: '#25B439' },
                  { x: -44, y: -32, size: 9, color: '#6366F1' }, { x: 48, y: -26, size: 10, color: '#EC4899' },
                  { x: -30, y: 38, size: 7, color: '#F59E0B' }, { x: 42, y: 34, size: 8, color: '#8B5CF6' },
                  { x: -56, y: 8, size: 6, color: '#14B8A6' }, { x: 58, y: 6, size: 5, color: '#F97316' },
                  { x: 0, y: -48, size: 6, color: '#F43F5E' }, { x: -16, y: -50, size: 4, color: '#0EA5E9' },
                ].map((n, i) => (
                  <g key={`n${i}`}>
                    <circle cx={n.x} cy={n.y} r={n.size * 2} fill={n.color} fillOpacity="0.06" />
                    <circle cx={n.x} cy={n.y} r={n.size} fill={n.color} fillOpacity={i === 0 ? 1 : 0.85} />
                  </g>
                ))}
              </svg>
            </div>

            <p style={{
              fontSize: 14,
              color: 'var(--color-text-secondary)',
              margin: '0 0 24px',
              lineHeight: 1.6,
            }}>
              Import people from a CSV file. We'll match your columns automatically.
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
                padding: '10px 0',
                minHeight: 44,
              }}
            >
              Need a template? Download sample CSV
            </button>
          </div>
        )}

        {/* Step 2: Configure */}
        {state === 'preview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* File info */}
            <div style={{
              display: 'flex',
              opacity: 0, animation: 'import-stagger 0.35s ease-out 0ms forwards',
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
                  padding: '10px 8px',
                  minHeight: 44,
                }}
              >
                Change file
              </button>
            </div>

            {/* Record type */}
            <div style={{ opacity: 0, animation: 'import-stagger 0.35s ease-out 60ms forwards' }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>
                Import as
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { type: 'Contact' as RelationshipType, label: 'People', desc: 'People you know' },
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
            <div style={{ opacity: 0, animation: 'import-stagger 0.35s ease-out 120ms forwards' }}>
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
                  No pods yet. Create a pod first to import people into it.
                </p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {pods.map(p => {
                    const isSelected = selectedPodIds.includes(p.id)
                    const shift = p.color ? (POD_SHIFT_COLORS[p.color] ?? p.color) : '#25B439'
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePod(p.id)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 100,
                          border: '1px solid',
                          borderColor: isSelected ? (p.color ?? '#25B439') : 'var(--edge-strong)',
                          background: isSelected ? shift : 'transparent',
                          color: isSelected ? '#fff' : 'var(--color-text-secondary)',
                          fontSize: 12,
                          fontWeight: isSelected ? 600 : 400,
                          minHeight: 36,
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
            <div style={{ opacity: 0, animation: 'import-stagger 0.35s ease-out 180ms forwards' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 8px' }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>
                  Column mapping
                </p>
                <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: 0 }}>
                  {columnMapping.filter(m => m.airtableField && !m.airtableField.startsWith('_')).length} of {columnMapping.length} mapped
                </p>
              </div>
              <div style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--edge)',
                borderRadius: 8,
                overflow: 'hidden',
              }}>
                {/* Header row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 24px 1fr',
                  alignItems: 'center',
                  padding: '6px 12px',
                  borderBottom: '1px solid var(--edge)',
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--color-text-tertiary)',
                }}>
                  <span>Your column</span>
                  <span />
                  <span>Maps to</span>
                </div>
                {columnMapping.map(({ csvHeader, airtableField }, idx) => {
                  const matched = airtableField && !airtableField.startsWith('_')
                  const preview = parsedRows[0]?.[csvHeader] ?? ''
                  // Which targets are already used by other columns?
                  const usedTargets = new Set(
                    columnMapping
                      .filter(m => m.csvHeader !== csvHeader && m.airtableField && !m.airtableField.startsWith('_'))
                      .map(m => m.airtableField)
                  )
                  return (
                    <div key={csvHeader} style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 24px 1fr',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderBottom: idx < columnMapping.length - 1 ? '1px solid var(--divider)' : 'none',
                      fontSize: 13,
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{csvHeader}</div>
                        {preview && (
                          <div style={{
                            fontSize: 11,
                            color: 'var(--color-text-tertiary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 200,
                            marginTop: 1,
                          }}>
                            {preview}
                          </div>
                        )}
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke={matched ? 'var(--color-brand)' : 'var(--color-text-tertiary)'}
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ justifySelf: 'center', opacity: 0.5 }}>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="15 6 19 12 15 18"/>
                      </svg>
                      <select
                        value={airtableField ?? ''}
                        onChange={e => updateMapping(csvHeader, e.target.value || null)}
                        style={{
                          background: matched ? 'rgba(37,180,57,0.06)' : 'var(--tint)',
                          border: `1px solid ${matched ? 'rgba(37,180,57,0.2)' : 'var(--edge)'}`,
                          borderRadius: 6,
                          padding: '5px 8px',
                          fontSize: 12,
                          color: matched ? 'var(--color-brand)' : 'var(--color-text-tertiary)',
                          fontFamily: 'inherit',
                          fontWeight: matched ? 500 : 400,
                          cursor: 'pointer',
                          outline: 'none',
                          width: '100%',
                        }}
                      >
                        <option value="">Skip</option>
                        {TARGET_FIELDS.map(tf => (
                          <option key={tf} value={tf} disabled={usedTargets.has(tf)}>
                            {tf}{usedTargets.has(tf) ? ' (used)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
              {!hasNameMapping && (
                <p style={{
                  fontSize: 12, color: '#CC7700', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CC7700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  Map at least one column to Name (or First Name) to import
                </p>
              )}
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
                  padding: '10px 0',
                  minHeight: 44,
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
            <div style={{ opacity: 0, animation: 'import-stagger 0.35s ease-out 240ms forwards',
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
                {validCount} {recordType === 'Company' ? 'companies' : 'people'} ready
                {invalidCount > 0 && ` - ${invalidCount} will be skipped (no name)`}
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: 0, animation: 'import-stagger 0.35s ease-out 300ms forwards' }}>
              <button
                type="button"
                onClick={handleImport}
                disabled={selectedPodIds.length === 0 || validCount === 0 || !hasNameMapping}
                style={{
                  padding: '14px 32px',
                  background: 'var(--color-brand)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 100,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: selectedPodIds.length > 0 && validCount > 0 && hasNameMapping ? 'pointer' : 'not-allowed',
                  opacity: selectedPodIds.length > 0 && validCount > 0 && hasNameMapping ? 1 : 0.5,
                  fontFamily: 'inherit',
                  letterSpacing: '0.01em',
                  boxShadow: '0 4px 16px rgba(37,180,57,0.30)',
                  transition: 'transform 0.15s, box-shadow 0.15s, opacity 0.12s',
                }}
              >
                Import {validCount > 0 ? `${validCount} ` : ''}{recordType === 'Company' ? 'Companies' : 'People'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  padding: '12px 32px',
                  borderRadius: 100,
                  border: '1px solid var(--edge-strong)',
                  background: 'transparent',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'transform 0.15s, background 0.15s, border-color 0.15s',
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
                {result.imported} {recordType === 'Company' ? 'companies' : 'people'} imported
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
                      padding: '10px 0',
                      minHeight: 44,
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
                  padding: '14px 32px',
                  background: 'var(--color-brand)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 100,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  letterSpacing: '0.01em',
                  boxShadow: '0 4px 16px rgba(37,180,57,0.30)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
              >
                View in Pods
              </button>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  padding: '12px 32px',
                  borderRadius: 100,
                  border: '1px solid var(--edge-strong)',
                  background: 'transparent',
                  color: 'var(--color-text-secondary)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'transform 0.15s, background 0.15s, border-color 0.15s',
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
