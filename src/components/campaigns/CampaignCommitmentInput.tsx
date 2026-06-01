import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { formatMoneyInput, parseMoneyInput } from '../../lib/campaignCommitments'

interface Props {
  value: number | null
  onSave: (amount: number | null) => Promise<void>
  placeholder?: string
  compact?: boolean
  style?: CSSProperties
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function CampaignCommitmentInput({ value, onSave, placeholder = '$0', compact, style }: Props) {
  const [draft, setDraft] = useState(formatMoneyInput(value))
  const [focused, setFocused] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  useEffect(() => {
    if (!focused && saveState !== 'saving') setDraft(formatMoneyInput(value))
  }, [focused, saveState, value])

  async function commit() {
    const parsed = parseMoneyInput(draft)
    if (Number.isNaN(parsed)) {
      setSaveState('error')
      return
    }

    if ((parsed ?? null) === (value ?? null)) {
      setDraft(formatMoneyInput(value))
      setSaveState('idle')
      return
    }

    setSaveState('saving')
    try {
      await onSave(parsed)
      setDraft(formatMoneyInput(parsed))
      setSaveState('saved')
      window.setTimeout(() => setSaveState('idle'), 1200)
    } catch {
      setSaveState('error')
    }
  }

  const borderColor = saveState === 'error'
    ? 'var(--health-fading)'
    : saveState === 'saved'
      ? 'var(--health-thriving)'
      : 'var(--edge)'

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? 4 : 6, minWidth: compact ? 104 : 140 }}>
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={e => {
          setDraft(e.target.value)
          if (saveState === 'error') setSaveState('idle')
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          commit()
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
          if (e.key === 'Escape') {
            setDraft(formatMoneyInput(value))
            setSaveState('idle')
            ;(e.currentTarget as HTMLInputElement).blur()
          }
        }}
        placeholder={placeholder}
        aria-label="Commitment Amount"
        style={{
          width: compact ? 96 : '100%',
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          background: 'var(--tint)',
          color: 'var(--color-text-primary)',
          fontFamily: 'inherit',
          fontSize: compact ? 12 : 13,
          fontWeight: compact ? 600 : 500,
          padding: compact ? '5px 8px' : '7px 10px',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 120ms, box-shadow 120ms',
          ...style,
        }}
      />
      {!compact && saveState !== 'idle' && (
        <span style={{
          fontSize: 11,
          color: saveState === 'error' ? 'var(--health-fading)' : saveState === 'saved' ? 'var(--health-thriving)' : 'var(--color-text-tertiary)',
          whiteSpace: 'nowrap',
        }}>
          {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : 'Invalid amount'}
        </span>
      )}
    </div>
  )
}
