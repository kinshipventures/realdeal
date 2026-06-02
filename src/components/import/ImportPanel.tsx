import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { getPods, getContacts, getCategories, getCampaigns, invalidateContactsCache } from '../../lib/data'
import { parseImportFile, detectColumns, importContacts, countInvalidRows, getRowWarnings, normalize, normalizeColumnMapping, TARGET_FIELDS } from '../../lib/csvImport'
import { parseVCard, vcardToRows, isVCard } from '../../lib/vcardParser'
import { supabase } from '@/integrations/supabase/client'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import type { Pod, Contact } from '../../lib/types'
import type { RelationshipType } from '../../lib/types'
import type { ImportProgress, ImportResult, ColumnMapping, RowWarning } from '../../lib/csvImport'
import { ImportSourcePicker } from './ImportSourcePicker'
import { PasteImport } from './PasteImport'

type ImportState = 'source' | 'preview' | 'importing' | 'done'
type ImportSource = 'csv' | 'vcard' | 'linkedin' | 'paste' | 'google' | 'outlook'

const STEPS = ['Source', 'Configure', 'Import'] as const

const SOURCE_LABELS: Record<ImportSource, string> = {
  csv: 'CSV / Excel File',
  vcard: 'Apple Contacts (vCard)',
  linkedin: 'LinkedIn Export',
  paste: 'Pasted Data',
  google: 'Google Contacts',
  outlook: 'Outlook Contacts',
}

async function generateTemplate() {
  const response = await fetch('/templates/realdeal-contact-import-template.xlsx')
  if (!response.ok) throw new Error('Template download failed.')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'realdeal-contact-import-template.xlsx'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', gap: 4, borderRadius: 10, padding: 3, background: 'var(--tint)', marginBottom: 32, width: 'fit-content' }}>
      {STEPS.map((label, i) => {
        const stepNum = i + 1
        const isActive = stepNum === current
        const isDone = stepNum < current
        return (
          <div key={label} style={{
            padding: '6px 14px', borderRadius: 8, border: 'none',
            fontSize: 11, fontWeight: isActive ? 600 : 400,
            fontFamily: 'var(--font-sans)', letterSpacing: '0.01em',
            color: isActive ? '#fff' : isDone ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
            background: isActive ? 'var(--color-brand)' : 'transparent',
            opacity: isDone || isActive ? 1 : 0.5,
            transition: 'background 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            minHeight: 32, display: 'flex', alignItems: 'center',
          }}>{label}</div>
        )
      })}
    </div>
  )
}

function SourceBadge({ source }: { source: ImportSource }) {
  const colors: Record<ImportSource, string> = {
    csv: '#0078D4', vcard: '#FF6B6B', linkedin: '#0A66C2',
    paste: '#8B5CF6', google: '#34A853', outlook: '#0072C6',
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 100,
      background: `${colors[source]}12`, color: colors[source],
      fontSize: 11, fontWeight: 600,
    }}>
      {SOURCE_LABELS[source]}
    </span>
  )
}

export function ImportPanel() {
  const navigate = useNavigate()
  const { activeWorkspace } = useWorkspace()

  const [pods, setPods] = useState<Pod[]>([])
  const [recordType, setRecordType] = useState<RelationshipType>('Contact')
  const [state, setState] = useState<ImportState>('source')
  const [importSource, setImportSource] = useState<ImportSource>('csv')
  const [showPaste, setShowPaste] = useState(false)

  const [fileName, setFileName] = useState('')
  const [fileError, setFileError] = useState<string | null>(null)
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([])
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([])

  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  const [existingContacts, setExistingContacts] = useState<Contact[]>([])
  const [rowWarnings, setRowWarnings] = useState<RowWarning[]>([])
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>([])
  const safeColumnMapping = useMemo(() => normalizeColumnMapping(columnMapping), [columnMapping])

  // Batch undo state
  const [batchId, setBatchId] = useState<string | null>(null)
  const [undoAvailable, setUndoAvailable] = useState(false)
  const [undoing, setUndoing] = useState(false)
  const [undoResult, setUndoResult] = useState<{ deleted: number } | null>(null)

  // Google sync state
  const [googleState, setGoogleState] = useState<'idle' | 'loading' | 'preview' | 'importing' | 'done' | 'error'>('idle')
  const [googleContacts, setGoogleContacts] = useState<any[]>([])
  const [googleResult, setGoogleResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [googleError, setGoogleError] = useState<string | null>(null)

  useEffect(() => {
    if (parsedHeaders.length > 0) {
      const detected = normalizeColumnMapping(detectColumns(parsedHeaders))
      // For LinkedIn, verify it matched LinkedIn-specific fields
      if (importSource === 'linkedin') {
        const hasLinkedInFields = detected.some(m =>
          m.targetField === 'First Name' || m.targetField === 'Last Name'
        )
        if (!hasLinkedInFields) setImportSource('csv')
      }
      setColumnMapping(detected)
    }
  }, [parsedHeaders])

  useEffect(() => {
    getPods().then(setPods)
    getContacts().then(setExistingContacts)
  }, [])

  useEffect(() => {
    if (parsedRows.length === 0 || safeColumnMapping.length === 0) return
    const emailIdx = new Map<string, string>()
    const nameIdx = new Map<string, string>()
    for (const c of existingContacts) {
      if (c.email) emailIdx.set(c.email.toLowerCase(), c.id)
      if (c.name) nameIdx.set(c.name.toLowerCase().trim(), c.id)
    }
    setRowWarnings(getRowWarnings(parsedRows, safeColumnMapping, emailIdx, nameIdx))
  }, [parsedRows, safeColumnMapping, existingContacts])

  // ---- File processing with auto-format detection ----
  async function processFile(file: File, source: ImportSource) {
    setImportSource(source)
    setFileError(null)

    try {
      const lowerName = file.name.toLowerCase()
      // Auto-detect vCard even if extension wasn't .vcf
      if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xls')) {
        const content = await file.text()
        if (isVCard(content)) {
          const contacts = parseVCard(content)
          if (contacts.length === 0) {
            setFileError('No contacts were found in this vCard file.')
            return
          }
          const { headers, rows } = vcardToRows(contacts)
          setFileName(file.name)
          setParsedHeaders(headers)
          setParsedRows(rows)
          setImportSource('vcard')
          setState('preview')
          return
        }
      }

      const parsed = await parseImportFile(file)
      if (parsed.rows.length === 0) {
        setFileError('No importable rows were found. Make sure the first sheet has a header row and at least one contact row.')
        return
      }
      setFileName(file.name)
      setParsedHeaders(parsed.headers)
      setParsedRows(parsed.rows)

      // Detect LinkedIn by checking for its specific headers
      const normalizedHeaders = parsed.headers.map(h => h.toLowerCase().trim())
      if (normalizedHeaders.includes('connected on') || normalizedHeaders.includes('connected on')) {
        setImportSource('linkedin')
      }

      setState('preview')
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Could not read this file.')
    }
  }

  // ---- Google Contacts sync ----
  const handleGoogleImport = async () => {
    if (!activeWorkspace) return
    setGoogleState('loading')
    setGoogleError(null)
    setImportSource('google')
    try {
      const { data, error } = await supabase.functions.invoke('sync-google-contacts', {
        body: { workspace_id: activeWorkspace.id, dry_run: true },
      })
      if (error) throw new Error(error.message || 'Failed to fetch contacts')
      if (data?.error) throw new Error(data.error)
      setGoogleContacts(data.contacts || [])
      setGoogleState('preview')
    } catch (err: any) {
      setGoogleError(err.message)
      setGoogleState('error')
    }
  }

  const confirmGoogleImport = async () => {
    if (!activeWorkspace) return
    setGoogleState('importing')
    try {
      const { data, error } = await supabase.functions.invoke('sync-google-contacts', {
        body: { workspace_id: activeWorkspace.id, dry_run: false },
      })
      if (error) throw new Error(error.message || 'Import failed')
      if (data?.error) throw new Error(data.error)
      setGoogleResult({ imported: data.imported, skipped: data.skipped })
      setGoogleState('done')
    } catch (err: any) {
      setGoogleError(err.message)
      setGoogleState('error')
    }
  }

  // ---- Outlook (coming soon - requires Microsoft OAuth connector) ----
  const handleOutlook = () => {
    alert('Outlook sync requires connecting your Microsoft account. This feature is coming soon.')
  }

  // ---- Paste handling ----
  const handlePasteParsed = (headers: string[], rows: Record<string, string>[]) => {
    setImportSource('paste')
    setFileName('Pasted data')
    setParsedHeaders(headers)
    setParsedRows(rows)
    setShowPaste(false)
    setState('preview')
  }

  // ---- Import ----
  async function handleImport() {
    if (readyCount === 0) return
    setState('importing')
    setProgress({ current: 0, total: parsedRows.length, imported: 0, skipped: 0 })

    // Generate batch ID for undo
    const newBatchId = crypto.randomUUID()
    setBatchId(newBatchId)

    const podMap = new Map<string, string>()
    for (const pod of pods) {
      podMap.set(normalize(pod.name), pod.id)
    }

    const categories = await getCategories()
    const categoryNameCounts = new Map<string, number>()
    for (const cat of categories) {
      const key = normalize(cat.name)
      categoryNameCounts.set(key, (categoryNameCounts.get(key) ?? 0) + 1)
    }
    const categoryMap = new Map<string, string>()
    const categoryPodMap = new Map<string, string>()
    for (const cat of categories) {
      const normalizedName = normalize(cat.name)
      categoryMap.set(`${cat.list_id}:${normalizedName}`, cat.id)
      if (categoryNameCounts.get(normalizedName) === 1) {
        categoryMap.set(normalizedName, cat.id)
      }
      categoryPodMap.set(cat.id, cat.list_id)
    }

    const campaigns = await getCampaigns()
    const campaignMap = new Map<string, string>()
    for (const campaign of campaigns) {
      campaignMap.set(normalize(campaign.name), campaign.id)
    }
    const campaignAliases = new Map<string, string>()
    const kinshipFundCampaign = campaigns.find(c => normalize(c.name) === normalize('Kinship Ventures Fund I'))
    if (kinshipFundCampaign) {
      campaignAliases.set(normalize('Kinship Fund Pipeline'), kinshipFundCampaign.id)
    }

    const res = await importContacts(
      parsedRows, '', (p) => setProgress(p),
      {
        type: recordType, podIds: [], mapping: safeColumnMapping,
        categoryMap, categoryPodMap, podMap,
        campaignMap, campaignAliases, createMissingCampaigns: true,
        batchId: newBatchId, importSource,
      }
    )
    invalidateContactsCache()
    setResult(res)
    setState('done')

    // Enable undo for 5 minutes
    if (res.imported > 0) {
      setUndoAvailable(true)
      setTimeout(() => setUndoAvailable(false), 5 * 60 * 1000)
    }
  }

  async function handleUndo() {
    if (!batchId) return
    setUndoing(true)
    try {
      const { data, error } = await supabase.functions.invoke('undo-import-batch', {
        body: { batch_id: batchId },
      })
      if (error) throw error
      setUndoResult(data)
      setUndoAvailable(false)
      invalidateContactsCache()
    } catch (err) {
      console.error('Undo failed:', err)
    } finally {
      setUndoing(false)
    }
  }

  function handleReset() {
    setState('source')
    setFileName('')
    setFileError(null)
    setParsedHeaders([])
    setParsedRows([])
    setColumnMapping([])
    setProgress(null)
    setResult(null)
    setShowPreview(false)
    setShowErrors(false)
    setRowWarnings([])
    setShowPaste(false)
    setGoogleState('idle')
    setGoogleContacts([])
    setGoogleResult(null)
    setGoogleError(null)
    setBatchId(null)
    setUndoAvailable(false)
    setUndoResult(null)
  }

  function updateMapping(csvHeader: string, targetField: string | null) {
    setColumnMapping(prev => normalizeColumnMapping(prev).map(m =>
      m.csvHeader === csvHeader ? { ...m, targetField } : m
    ))
  }

  const missingNameCount = parsedRows.length > 0 ? countInvalidRows(parsedRows, recordType, safeColumnMapping) : 0
  const readyCount = parsedRows.length
  const hasNameMapping = safeColumnMapping.some(m => m.targetField === 'First Name')
  const hasPodMapping = safeColumnMapping.some(m => m.targetField === 'Pod')
  const hasSubPodMapping = safeColumnMapping.some(m => m.targetField === 'Sub-pod')
  const canImport = readyCount > 0

  const unmatchedColumns = safeColumnMapping.filter(m => m.targetField === null)
  const stepNumber = state === 'source' ? 1 : state === 'preview' ? 2 : 3
  const pct = progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
  const remaining = progress ? (progress.total - progress.current) : 0
  const estSeconds = Math.ceil(remaining / 250)

  // ---- Google sync sub-views ----
  if (googleState !== 'idle' && state === 'source') {
    return (
      <div style={{ minHeight: '100%', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px 80px', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', maxWidth: 640 }}>
          <StepIndicator current={1} />
          <GoogleSyncView
            state={googleState}
            contacts={googleContacts}
            result={googleResult}
            error={googleError}
            onConfirm={confirmGoogleImport}
            onRetry={handleGoogleImport}
            onBack={() => { setGoogleState('idle'); setGoogleError(null) }}
            onDone={() => navigate('/pods')}
            onReset={handleReset}
          />
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100%', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px 80px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        <h1 style={{
          fontFamily: 'var(--font-sans)', fontWeight: 800,
          fontSize: state === 'source' ? 28 : 18,
          color: 'var(--color-text-primary)', margin: '0 0 8px', letterSpacing: '-0.02em',
          textAlign: state === 'source' ? 'center' : undefined,
          transition: 'font-size 0.3s ease',
        }}>
          {state === 'source' ? 'Bring your people in' : 'Import Records'}
        </h1>
        {state === 'source' && (
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 24px', lineHeight: 1.6, textAlign: 'center' }}>
            We auto-detect your file format and match columns. Drop anything.
          </p>
        )}

        <StepIndicator current={stepNumber} />

        {/* Step 1: Source selection */}
        {state === 'source' && !showPaste && (
          <>
            <ImportSourcePicker
              onFileSelected={processFile}
              onPasteSelected={() => setShowPaste(true)}
              onGoogleSelected={handleGoogleImport}
              onOutlookSelected={handleOutlook}
            />
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button type="button" onClick={() => { generateTemplate().catch(err => setFileError(err instanceof Error ? err.message : 'Template download failed.')) }} style={{
                background: 'none', border: 'none', fontSize: 13, color: 'var(--color-brand)',
                cursor: 'pointer', fontFamily: 'inherit', padding: '10px 0', minHeight: 44,
              }}>
                Need a template? Download Excel template
              </button>
              {fileError && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#D32F2F' }}>{fileError}</p>
              )}
            </div>
          </>
        )}

        {/* Paste sub-view */}
        {state === 'source' && showPaste && (
          <PasteImport onParsed={handlePasteParsed} onBack={() => setShowPaste(false)} />
        )}

        {/* Step 2: Configure */}
        {state === 'preview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* File info + source badge */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', background: 'var(--color-surface)',
              border: '1px solid var(--edge)', borderRadius: 8,
              opacity: 0, animation: 'import-stagger 0.35s ease-out 0ms forwards',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{fileName}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{parsedRows.length} rows</span>
                <SourceBadge source={importSource} />
              </div>
              <button type="button" onClick={handleReset} style={{
                background: 'none', border: 'none', fontSize: 12, color: 'var(--color-text-secondary)',
                cursor: 'pointer', fontFamily: 'inherit', padding: '10px 8px', minHeight: 44,
              }}>
                Change
              </button>
            </div>

            {/* Record type */}
            <div style={{ opacity: 0, animation: 'import-stagger 0.35s ease-out 60ms forwards' }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>Import as</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { type: 'Contact' as RelationshipType, label: 'People', desc: 'People you know' },
                  { type: 'Company' as RelationshipType, label: 'Companies', desc: 'Organizations' },
                ] as const).map(({ type, label, desc }) => (
                  <button key={type} type="button" onClick={() => setRecordType(type)} style={{
                    flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid',
                    borderColor: recordType === type ? 'var(--color-brand)' : 'var(--edge-strong)',
                    background: recordType === type ? 'rgba(37,180,57,0.06)' : 'transparent',
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s', textAlign: 'left',
                  }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: recordType === type ? 600 : 400, color: recordType === type ? 'var(--color-brand)' : 'var(--color-text-primary)' }}>{label}</span>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pod and sub-pod assignment */}
            <div style={{ opacity: 0, animation: 'import-stagger 0.35s ease-out 120ms forwards' }}>
              <div style={{
                padding: '12px 14px',
                borderRadius: 8,
                border: '1px solid var(--edge)',
                background: 'var(--color-surface)',
              }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>
                  Pod and sub-pod assignment comes from the spreadsheet
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.55, margin: 0 }}>
                  Map columns to Pod and Sub-pod when the file includes them. Existing pods and sub-pods will be assigned automatically; unknown values stay blank and the contact still imports.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', minHeight: 26,
                    padding: '4px 9px', borderRadius: 100, border: '1px solid var(--edge)',
                    background: hasPodMapping ? 'rgba(37,180,57,0.08)' : 'var(--tint)',
                    color: hasPodMapping ? 'var(--color-brand)' : 'var(--color-text-tertiary)',
                    fontSize: 11, fontWeight: 600,
                  }}>
                    {hasPodMapping ? 'Pod column mapped' : 'No Pod column mapped'}
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', minHeight: 26,
                    padding: '4px 9px', borderRadius: 100, border: '1px solid var(--edge)',
                    background: hasSubPodMapping ? 'rgba(37,180,57,0.08)' : 'var(--tint)',
                    color: hasSubPodMapping ? 'var(--color-brand)' : 'var(--color-text-tertiary)',
                    fontSize: 11, fontWeight: 600,
                  }}>
                    {hasSubPodMapping ? 'Sub-pod column mapped' : 'No Sub-pod column mapped'}
                  </span>
                </div>
              </div>
            </div>

            {/* Column mapping */}
            <div style={{ opacity: 0, animation: 'import-stagger 0.35s ease-out 180ms forwards' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 8px' }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>Column mapping</p>
                <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: 0 }}>
                  {safeColumnMapping.filter(m => m.targetField !== null).length} of {safeColumnMapping.length} mapped
                </p>
              </div>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--edge)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 24px 1fr', alignItems: 'center',
                  padding: '6px 12px', borderBottom: '1px solid var(--edge)',
                  fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)',
                }}>
                  <span>Your column</span><span /><span>Maps to</span>
                </div>
                {safeColumnMapping.map(({ csvHeader, targetField }, idx) => {
                  const matched = !!targetField
                  const preview = parsedRows[0]?.[csvHeader] ?? ''
                  const usedTargets = new Set(safeColumnMapping.filter(m => m.csvHeader !== csvHeader && m.targetField).map(m => m.targetField))
                  return (
                    <div key={csvHeader} style={{
                      display: 'grid', gridTemplateColumns: '1fr 24px 1fr', alignItems: 'center',
                      padding: '8px 12px', borderBottom: idx < safeColumnMapping.length - 1 ? '1px solid var(--divider)' : 'none', fontSize: 13,
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{csvHeader}</div>
                        {preview && <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200, marginTop: 1 }}>{preview}</div>}
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={matched ? 'var(--color-brand)' : 'var(--color-text-tertiary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ justifySelf: 'center', opacity: 0.5 }}>
                        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="15 6 19 12 15 18"/>
                      </svg>
                      <select value={targetField ?? ''} onChange={e => updateMapping(csvHeader, e.target.value || null)} style={{
                        background: matched ? 'rgba(37,180,57,0.06)' : 'var(--tint)',
                        border: `1px solid ${matched ? 'rgba(37,180,57,0.2)' : 'var(--edge)'}`,
                        borderRadius: 6, padding: '5px 8px', fontSize: 12,
                        color: matched ? 'var(--color-brand)' : 'var(--color-text-tertiary)',
                        fontFamily: 'inherit', fontWeight: matched ? 500 : 400, cursor: 'pointer', width: '100%',
                      }}>
                        <option value="">Skip</option>
                        {TARGET_FIELDS.map(tf => (
                          <option key={tf} value={tf} disabled={usedTargets.has(tf)}>{tf}{usedTargets.has(tf) ? ' (used)' : ''}</option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
              {!hasNameMapping && (
                <p style={{ fontSize: 12, color: '#CC7700', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CC7700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  Rows without a name will be imported with fallback names.
                </p>
              )}
            </div>

            {/* Unmatched columns */}
            {unmatchedColumns.length > 0 && (
              <div style={{ background: 'var(--tint)', borderRadius: 8, padding: '10px 12px', opacity: 0, animation: 'import-stagger 0.35s ease-out 200ms forwards' }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', margin: '0 0 8px' }}>
                  {unmatchedColumns.length} unmatched column{unmatchedColumns.length !== 1 ? 's' : ''} will be saved to Notes unless mapped to a standard field
                </p>
                {unmatchedColumns.map(({ csvHeader }) => {
                  const preview = parsedRows[0]?.[csvHeader] ?? ''
                  return (
                    <div key={csvHeader} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--divider)' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>{csvHeader}</span>
                        {preview && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 8 }}>{preview.slice(0, 30)}{preview.length > 30 ? '...' : ''}</span>}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>Notes</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Preview rows */}
            <div>
              <button type="button" onClick={() => setShowPreview(p => !p)} style={{
                background: 'none', border: 'none', fontSize: 13, color: 'var(--color-text-secondary)',
                cursor: 'pointer', fontFamily: 'inherit', padding: '10px 0', minHeight: 44,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showPreview ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                Preview first 5 rows
              </button>
              {showPreview && (
                <div style={{ overflowX: 'auto', marginTop: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--color-surface)', border: '1px solid var(--edge)', borderRadius: 8, overflow: 'hidden', fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '8px 8px', textAlign: 'center', fontSize: 10, fontWeight: 500, color: 'var(--color-text-tertiary)', borderBottom: '1px solid var(--edge)', width: 28 }}>#</th>
                        <th style={{ padding: '8px 4px', width: 20, borderBottom: '1px solid var(--edge)' }} />
                        {parsedHeaders.map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--edge)', whiteSpace: 'nowrap' }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 5).map((row, i) => {
                        const warns = rowWarnings.filter(w => w.rowIndex === i)
                        return (
                          <tr key={i} style={{ background: warns.length > 0 ? 'rgba(255,149,0,0.04)' : undefined }}>
                            <td style={{ padding: '8px 8px', textAlign: 'center', fontSize: 11, color: 'var(--color-text-tertiary)', borderBottom: i < 4 ? '1px solid var(--divider)' : 'none' }}>{i + 1}</td>
                            <td style={{ padding: '8px 4px', borderBottom: i < 4 ? '1px solid var(--divider)' : 'none' }}>
                              {warns.length > 0 && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CC7700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                              )}
                            </td>
                            {parsedHeaders.map(h => <td key={h} style={{ padding: '8px 12px', color: 'var(--color-text-primary)', borderBottom: i < 4 ? '1px solid var(--divider)' : 'none', whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row[h] ?? ''}</td>)}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Validation summary */}
            <div style={{
              opacity: 0, animation: 'import-stagger 0.35s ease-out 240ms forwards',
              padding: '12px 14px',
              background: missingNameCount > 0 ? 'rgba(255,149,0,0.05)' : 'rgba(37,180,57,0.05)',
              border: `1px solid ${missingNameCount > 0 ? 'rgba(255,149,0,0.15)' : 'rgba(37,180,57,0.15)'}`,
              borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {missingNameCount > 0 ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CC7700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              )}
              <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
                {readyCount} {recordType === 'Company' ? 'companies' : 'people'} ready
                {missingNameCount > 0 && ` - ${missingNameCount} will use fallback names`}
                {rowWarnings.filter(w => w.kind === 'duplicate').length > 0 && ` - ${rowWarnings.filter(w => w.kind === 'duplicate').length} duplicate${rowWarnings.filter(w => w.kind === 'duplicate').length !== 1 ? 's' : ''} detected`}
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: 0, animation: 'import-stagger 0.35s ease-out 300ms forwards' }}>
              <button type="button" onClick={handleImport}
                disabled={!canImport}
                style={{
                  padding: '14px 32px', background: 'var(--color-brand)', color: '#fff',
                  border: 'none', borderRadius: 100, fontSize: 14, fontWeight: 600,
                  cursor: canImport ? 'pointer' : 'not-allowed',
                  opacity: canImport ? 1 : 0.5,
                  fontFamily: 'inherit', letterSpacing: '0.01em',
                  boxShadow: '0 4px 16px rgba(37,180,57,0.30)', transition: 'transform 0.15s, box-shadow 0.15s, opacity 0.12s',
                }}>
                Import {readyCount > 0 ? `${readyCount} ` : ''}{recordType === 'Company' ? 'Companies' : 'People'}
              </button>
              <button type="button" onClick={handleReset} style={{
                padding: '12px 32px', borderRadius: 100, border: '1px solid var(--edge-strong)',
                background: 'transparent', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Step 3: Importing */}
        {state === 'importing' && progress && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.2s ease' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 18, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>Importing...</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
                {estSeconds > 0 ? `About ${estSeconds}s remaining` : 'Finishing up...'}
              </p>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{progress.current} of {progress.total}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>{pct}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--tint)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-brand)', borderRadius: 3, transition: 'width 0.2s' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 13, color: 'var(--color-text-secondary)' }}>
              <span>{progress.imported} imported</span>
              {(progress.updated ?? 0) > 0 && (
                <>
                  <span style={{ color: 'var(--edge-strong)' }}>|</span>
                  <span>{progress.updated} updated</span>
                </>
              )}
              <span style={{ color: 'var(--edge-strong)' }}>|</span>
              <span>{progress.skipped} skipped</span>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {state === 'done' && result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.2s ease' }}>
            <div style={{ padding: '24px 20px', background: 'var(--color-surface)', border: '1px solid var(--edge)', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(37,180,57,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 18, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>Import complete</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
                {result.imported} {recordType === 'Company' ? 'companies' : 'people'} imported via {SOURCE_LABELS[importSource]}
                {(result.updated ?? 0) > 0 && ` - ${result.updated} updated`}
                {(result.campaignLinked ?? 0) > 0 && ` - ${result.campaignLinked} campaign link${result.campaignLinked === 1 ? '' : 's'} synced`}
                {result.skipped > 0 && ` - ${result.skipped} skipped`}
              </p>

              {/* Undo button */}
              {undoAvailable && !undoResult && (
                <button type="button" onClick={handleUndo} disabled={undoing} style={{
                  marginTop: 16, padding: '8px 20px', borderRadius: 100,
                  border: '1px solid #D32F2F40', background: '#FEE2E2',
                  color: '#D32F2F', fontSize: 12, fontWeight: 600,
                  cursor: undoing ? 'wait' : 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.15s', opacity: undoing ? 0.6 : 1,
                }}>
                  {undoing ? 'Undoing...' : `Undo import (${result.imported} contacts)`}
                </button>
              )}
              {undoResult && (
                <p style={{ marginTop: 12, fontSize: 13, color: '#D32F2F' }}>
                  Undone -- {undoResult.deleted} contacts removed
                </p>
              )}

              {result.errors.length > 0 && (
                <div style={{ marginTop: 16, textAlign: 'left' }}>
                  <button type="button" onClick={() => setShowErrors(e => !e)} style={{
                    background: 'none', border: 'none', fontSize: 12, color: '#CC7700',
                    cursor: 'pointer', fontFamily: 'inherit', padding: '10px 0', minHeight: 44,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showErrors ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                    {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}
                  </button>
                  {showErrors && <div style={{ marginTop: 8 }}>{result.errors.map((err, i) => <p key={i} style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: '2px 0' }}>{err}</p>)}</div>}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button type="button" onClick={() => navigate('/pods')} style={{
                padding: '14px 32px', background: 'var(--color-brand)', color: '#fff', border: 'none',
                borderRadius: 100, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                letterSpacing: '0.01em', boxShadow: '0 4px 16px rgba(37,180,57,0.30)', transition: 'all 0.15s',
              }}>View in Pods</button>
              <button type="button" onClick={handleReset} style={{
                padding: '12px 32px', borderRadius: 100, border: '1px solid var(--edge-strong)',
                background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              }}>Import Another</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Google Sync sub-component ----
function GoogleSyncView({ state, contacts, result, error, onConfirm, onRetry, onBack, onDone, onReset }: {
  state: string; contacts: any[]; result: { imported: number; skipped: number } | null
  error: string | null; onConfirm: () => void; onRetry: () => void
  onBack: () => void; onDone: () => void; onReset: () => void
}) {
  if (state === 'done' && result) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, animation: 'fadeIn 0.3s ease-out', padding: '40px 0' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #25B439, #1A8A2A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        </div>
        <h2 style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 24, color: 'var(--color-text-primary)', margin: 0 }}>{result.imported} contacts imported</h2>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
          {result.skipped > 0 ? `${result.skipped} duplicates skipped. ` : ''}Your network is ready.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" onClick={onDone} style={{ padding: '14px 32px', background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 100, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(37,180,57,0.30)' }}>View in Pods</button>
          <button type="button" onClick={onReset} style={{ padding: '12px 32px', borderRadius: 100, border: '1px solid var(--edge-strong)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Import More</button>
        </div>
      </div>
    )
  }

  if (state === 'preview') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease-out' }}>
        <h2 style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 22, color: 'var(--color-text-primary)', margin: 0 }}>{contacts.length} contacts found</h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>Duplicates (by email) will be skipped automatically.</p>
        <div style={{ maxHeight: 300, overflowY: 'auto', borderRadius: 12, border: '1px solid var(--edge)', background: 'var(--tint)', padding: 4 }}>
          {contacts.slice(0, 30).map((c: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: i < 29 && i < contacts.length - 1 ? '1px solid var(--edge)' : 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: `hsl(${(i * 47) % 360}, 60%, 65%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff' }}>
                {c.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                {c.email && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email}</div>}
              </div>
            </div>
          ))}
          {contacts.length > 30 && <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>+ {contacts.length - 30} more</div>}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" onClick={onConfirm} style={{ padding: '14px 32px', background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 100, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(37,180,57,0.30)' }}>Import {contacts.length} contacts</button>
          <button type="button" onClick={onBack} style={{ padding: '12px 32px', borderRadius: 100, border: '1px solid var(--edge-strong)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
        </div>
      </div>
    )
  }

  if (state === 'loading' || state === 'importing') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '60px 0' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--edge)', borderTopColor: 'var(--color-brand)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
          {state === 'loading' ? 'Fetching your Google contacts...' : 'Importing contacts...'}
        </p>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 0' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
        </div>
        <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 18, color: 'var(--color-text-primary)', margin: 0 }}>Couldn't connect</h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0, maxWidth: 320, textAlign: 'center' }}>{error}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={onBack} style={{ padding: '12px 24px', borderRadius: 100, border: '1px solid var(--edge-strong)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
          <button type="button" onClick={onRetry} style={{ padding: '12px 24px', background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Try again</button>
        </div>
      </div>
    )
  }

  return null
}
