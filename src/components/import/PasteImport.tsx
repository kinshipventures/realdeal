import { useState, useCallback } from 'react'
import { parsePastedData } from '../../lib/pasteParser'

interface Props {
  onParsed: (headers: string[], rows: Record<string, string>[]) => void
  onBack: () => void
}

export function PasteImport({ onParsed, onBack }: Props) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleParse = useCallback(() => {
    setError(null)
    const result = parsePastedData(text)
    if (!result) {
      setError('Could not detect columns. Make sure you include a header row and at least one data row.')
      return
    }
    if (result.headers.length < 2) {
      setError('Need at least 2 columns. Try copying directly from your spreadsheet.')
      return
    }
    onParsed(result.headers, result.rows)
  }, [text, onParsed])

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', margin: 0 }}>
          Paste from spreadsheet
        </h3>
        <button type="button" onClick={onBack} style={{
          background: 'none', border: 'none', fontSize: 12, color: 'var(--color-text-secondary)',
          cursor: 'pointer', fontFamily: 'inherit', padding: '8px',
        }}>
          Back
        </button>
      </div>

      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
        Select your data in Excel or Google Sheets (including the header row), copy it, and paste below.
      </p>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={"Name\tEmail\tCompany\tRole\nJane Doe\tjane@example.com\tAcme Inc\tCEO\nJohn Smith\tjohn@example.com\tGlobex\tCTO"}
        style={{
          width: '100%', minHeight: 200, padding: '12px 14px', borderRadius: 8,
          border: '1px solid var(--edge-strong)', background: 'var(--color-surface)',
          fontSize: 13, fontFamily: 'monospace', color: 'var(--color-text-primary)',
          resize: 'vertical', outline: 'none', boxSizing: 'border-box',
          lineHeight: 1.6,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-brand)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'var(--edge-strong)' }}
      />

      {text.trim() && (
        <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: 0 }}>
          {text.split('\n').filter(l => l.trim()).length - 1} rows detected
        </p>
      )}

      {error && (
        <p style={{ fontSize: 12, color: '#D32F2F', margin: 0 }}>{error}</p>
      )}

      <button
        type="button"
        onClick={handleParse}
        disabled={!text.trim()}
        style={{
          padding: '12px 32px', borderRadius: 100, border: 'none',
          background: text.trim() ? 'var(--color-brand)' : 'var(--edge)',
          color: text.trim() ? '#fff' : 'var(--color-text-tertiary)',
          fontSize: 14, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit', letterSpacing: '0.01em',
          boxShadow: text.trim() ? '0 4px 16px rgba(37,180,57,0.30)' : 'none',
          transition: 'all 0.15s', alignSelf: 'flex-start',
        }}
      >
        Continue
      </button>
    </div>
  )
}
