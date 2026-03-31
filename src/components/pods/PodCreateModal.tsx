import { useState, useCallback } from 'react'
import type { Pod, Cadence, Owner } from '../../lib/types'
import { createPod } from '../../lib/airtable'
import { useEscape } from '../../lib/escapeStack'
import { POD_SHIFT_COLORS } from '../map/SolidOrb'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreated: (pod: Pod) => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(0,0,0,0.04)',
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: 7,
  color: 'rgba(0,0,0,0.82)',
  fontSize: 13,
  padding: '8px 12px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: 'rgba(0,0,0,0.45)',
  marginBottom: 4,
  display: 'block',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

const POD_COLORS = Object.keys(POD_SHIFT_COLORS) as string[]

export function PodCreateModal({ isOpen, onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [cadence, setCadence] = useState<Cadence>('monthly')
  const [capacity, setCapacity] = useState<string>('')
  const [owner, setOwner] = useState<Owner | ''>('')
  const [isPriority, setIsPriority] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stableClose = useCallback(() => {
    if (saving) return
    onClose()
  }, [onClose, saving])

  useEscape(stableClose)

  function reset() {
    setName('')
    setSelectedColor(null)
    setDescription('')
    setCadence('monthly')
    setCapacity('')
    setOwner('')
    setIsPriority(false)
    setError(null)
  }

  function handleClose() {
    if (saving) return
    reset()
    onClose()
  }

  async function handleSave() {
    if (!name.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const pod = await createPod({
        name: name.trim(),
        color: selectedColor ?? null,
        owner: owner || null,
        is_priority: isPriority,
        cadence,
        description: description.trim() || null,
        capacity: capacity ? parseInt(capacity, 10) : null,
      })
      reset()
      onCreated(pod)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create pod')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const canSave = name.trim().length > 0 && !saving

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={e => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div style={{
        background: 'var(--color-surface, #F5F4F0)',
        borderRadius: 16,
        maxWidth: 480,
        width: '100%',
        padding: 28,
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 700,
            fontSize: 20,
            color: 'rgba(0,0,0,0.82)',
            margin: 0,
          }}>New Pod</h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            style={{
              border: 'none',
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.06)',
              color: 'rgba(0,0,0,0.45)',
              cursor: 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            } as React.CSSProperties}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Name */}
          <div>
            <label style={labelStyle}>
              Name <span style={{ color: '#25B439' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="e.g., Maps, LPs, Talent"
              autoFocus
              style={inputStyle}
            />
          </div>

          {/* Color */}
          <div>
            <label style={labelStyle}>Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {POD_COLORS.map(hex => {
                const shift = POD_SHIFT_COLORS[hex]
                const selected = selectedColor === hex
                return (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setSelectedColor(selected ? null : hex)}
                    aria-label={`Color ${hex}`}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${hex}, ${shift})`,
                      border: selected ? '2px solid rgba(0,0,0,0.7)' : '2px solid transparent',
                      cursor: 'pointer',
                      position: 'relative',
                      flexShrink: 0,
                      boxShadow: selected ? '0 0 0 2px #fff inset' : 'none',
                    }}
                  >
                    {selected && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this pod for?"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
            />
          </div>

          {/* Cadence + Capacity row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Cadence</label>
              <select
                value={cadence}
                onChange={e => setCadence(e.target.value as Cadence)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Capacity</label>
              <input
                type="number"
                value={capacity}
                min={1}
                onChange={e => setCapacity(e.target.value)}
                placeholder="Unlimited"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Owner */}
          <div>
            <label style={labelStyle}>Owner</label>
            <select
              value={owner}
              onChange={e => setOwner(e.target.value as Owner | '')}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">None</option>
              <option value="moj_mahdara">Moj Mahdara</option>
              <option value="kinship_ventures">Kinship Ventures</option>
            </select>
          </div>

          {/* Priority */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="pod-priority"
              checked={isPriority}
              onChange={e => setIsPriority(e.target.checked)}
              style={{ width: 14, height: 14, cursor: 'pointer' }}
            />
            <label htmlFor="pod-priority" style={{ ...labelStyle, margin: 0, cursor: 'pointer' }}>
              Mark as priority pod
            </label>
          </div>

          {error && (
            <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>{error}</p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '9px 18px',
                background: 'rgba(0,0,0,0.06)',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'inherit',
                color: 'rgba(0,0,0,0.6)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              style={{
                padding: '9px 18px',
                background: canSave ? 'var(--color-brand, #25B439)' : 'rgba(0,0,0,0.1)',
                color: canSave ? '#fff' : 'rgba(0,0,0,0.3)',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'inherit',
                cursor: canSave ? 'pointer' : 'not-allowed',
                fontWeight: 500,
              }}
            >
              {saving ? 'Creating…' : 'Create Pod'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
