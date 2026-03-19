import { useState, useRef, useCallback, useEffect } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'

export type CreateCategoryNodeData = {
  listColor?: string | null
  animationDelay?: string
  onCreate: (name: string) => Promise<void>
}
export type CreateCategoryNodeType = Node<CreateCategoryNodeData>

const SIZE = 64

export function CreateCategoryNodeComponent({ data }: NodeProps<CreateCategoryNodeType>) {
  const { animationDelay, onCreate } = data
  const [active, setActive] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (active) inputRef.current?.focus()
  }, [active])

  useEffect(() => () => clearTimeout(errorTimerRef.current), [])

  const reset = useCallback(() => {
    clearTimeout(errorTimerRef.current)
    setActive(false)
    setValue('')
    setError(null)
    setSubmitting(false)
  }, [])

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim()
    if (!trimmed) {
      setError('empty')
      errorTimerRef.current = setTimeout(() => setError(null), 600)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onCreate(trimmed)
      reset()
    } catch {
      setError('failed')
      setSubmitting(false)
    }
  }, [value, onCreate, reset])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') reset()
  }, [handleSubmit, reset])

  const handleBlur = useCallback(() => {
    if (submitting) return
    reset()
  }, [submitting, reset])

  return (
    <>
      <Handle type="target" position={Position.Left}
        style={{ opacity: 0, width: 1, height: 1, top: SIZE / 2, left: SIZE / 2, transform: 'translate(-50%, -50%)' }}
      />

      <div
        className={`orb-enter${active ? '' : ' orb-interactive'}`}
        style={{
          '--orb-scale': '1.1',
          '--orb-lift': '-1px',
          '--orb-color-rgb': '0, 0, 0',
          '--orb-glow-size': '0px',
          '--orb-glow-size-hover': '8px',
          '--orb-glow-opacity': '0',
          '--orb-glow-opacity-hover': '0.06',
          width: SIZE,
          height: SIZE,
          borderRadius: '50%',
          border: '2px dashed rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: active ? 'text' : 'pointer',
          background: 'transparent',
          position: 'relative',
          animationDelay,
          animation: error === 'empty' || error === 'failed'
            ? 'input-shake 0.4s ease-out'
            : undefined,
        } as React.CSSProperties}
        onClick={active ? undefined : () => setActive(true)}
      >
        {active ? (
          <div
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', padding: '0 8px', textAlign: 'center' }}
          >
            <input
              ref={inputRef}
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              maxLength={30}
              placeholder="Name..."
              disabled={submitting}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                textAlign: 'center',
                fontSize: 10,
                fontWeight: 500,
                color: 'rgba(0,0,0,0.60)',
                letterSpacing: '-0.005em',
                fontFamily: 'inherit',
              }}
            />
            {error === 'failed' && (
              <span style={{
                fontSize: 7, color: 'rgba(220,60,60,0.7)',
                display: 'block', marginTop: 1,
              }}>
                Failed
              </span>
            )}
          </div>
        ) : (
          <span style={{
            fontSize: 18,
            fontWeight: 300,
            color: 'rgba(0,0,0,0.28)',
            userSelect: 'none',
            lineHeight: 1,
          }}>
            +
          </span>
        )}
      </div>
    </>
  )
}
