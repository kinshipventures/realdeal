import { useRef, useState, useCallback } from 'react'

type ImportSource = 'csv' | 'vcard' | 'linkedin' | 'paste' | 'google' | 'outlook'

interface Props {
  onFileSelected: (file: File, source: ImportSource) => void
  onPasteSelected: () => void
  onGoogleSelected: () => void
  onOutlookSelected: () => void
}

const SOURCES = [
  {
    id: 'file' as const,
    label: 'Upload a file',
    desc: 'CSV, vCard (.vcf), or LinkedIn export',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    ),
  },
  {
    id: 'google' as const,
    label: 'Google Contacts',
    desc: 'Sync from your Google account',
    icon: (
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.06 24.06 0 0 0 0 21.56l7.98-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
    ),
  },
  {
    id: 'paste' as const,
    label: 'Paste from spreadsheet',
    desc: 'Copy rows from Excel or Google Sheets',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
    ),
  },
  {
    id: 'outlook' as const,
    label: 'Outlook Contacts',
    desc: 'Sync from Microsoft Outlook',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M22 6.5V17.5C22 18.3284 21.3284 19 20.5 19H14V5H20.5C21.3284 5 22 5.67157 22 6.5Z" fill="#0072C6"/>
        <path d="M14 5H3.5C2.67157 5 2 5.67157 2 6.5V17.5C2 18.3284 2.67157 19 3.5 19H14V5Z" fill="#0078D4"/>
        <ellipse cx="8" cy="12" rx="3.5" ry="4" stroke="white" strokeWidth="1.5" fill="none"/>
      </svg>
    ),
  },
]

export function ImportSourcePicker({ onFileSelected, onPasteSelected, onGoogleSelected, onOutlookSelected }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const detectSource = useCallback((file: File): ImportSource => {
    const name = file.name.toLowerCase()
    if (name.endsWith('.vcf')) return 'vcard'
    // LinkedIn exports have a specific filename pattern
    if (name.includes('connections') && name.endsWith('.csv')) return 'linkedin'
    return 'csv'
  }, [])

  const handleFile = useCallback((file: File) => {
    const source = detectSource(file)
    onFileSelected(file, source)
  }, [detectSource, onFileSelected])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Universal drop zone */}
      <div
        role="button"
        tabIndex={0}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
        style={{
          minHeight: 140,
          border: `2px dashed ${dragOver ? 'var(--color-brand)' : 'var(--edge-strong)'}`,
          borderRadius: 12,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          cursor: 'pointer',
          background: dragOver ? 'rgba(37,180,57,0.04)' : 'var(--color-surface)',
          transition: 'border-color 0.15s, background 0.15s',
          padding: '24px 32px',
          marginBottom: 20,
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', margin: 0 }}>
          Drop any file here
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>
          CSV, vCard (.vcf), LinkedIn export, or Excel
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.vcf,.txt,.tsv"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--edge)' }} />
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>or connect an account</span>
        <div style={{ flex: 1, height: 1, background: 'var(--edge)' }} />
      </div>

      {/* Source buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { ...SOURCES[1], onClick: onGoogleSelected },
          { ...SOURCES[2], onClick: onPasteSelected },
          { ...SOURCES[3], onClick: onOutlookSelected },
        ].map(s => (
          <button
            key={s.id}
            type="button"
            onClick={s.onClick}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', borderRadius: 10,
              border: '1px solid var(--edge-strong)', background: 'var(--color-surface)',
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'box-shadow 0.15s, border-color 0.15s',
              textAlign: 'left', width: '100%',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-text-secondary)' }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{s.label}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{s.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
