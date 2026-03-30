import { useCallback, useEffect, useRef, useState } from 'react'
import { useEscape } from '../../lib/escapeStack'

interface Props {
  open: boolean
  onClose: () => void
  onCreate: (name: string) => void
}

export function CreatePipelineModal({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const close = useCallback(() => onClose(), [onClose])
  useEscape(close)

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate(trimmed)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.08)',
        zIndex: 150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 360,
          borderRadius: 16,
          background: 'var(--surface-panel)',
          backdropFilter: 'blur(32px)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
          padding: '24px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16 }}>
          New Pipeline
        </p>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Pipeline name"
            style={{
              width: '100%',
              fontSize: 13,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--edge)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                fontSize: 13,
                padding: '8px 16px',
                borderRadius: 10,
                border: '1px solid var(--edge)',
                background: 'transparent',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: '8px 16px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--color-brand)',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              Create Pipeline
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
