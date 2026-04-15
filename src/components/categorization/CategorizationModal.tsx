import { useState, useCallback, useEffect, useRef } from 'react'
import { RELATIONSHIP_RING_LABELS, RELATIONSHIP_RINGS, type Contact, type Pod, type RelationshipRing } from '../../lib/types'
import type { FieldConfig } from '../../lib/fieldConfig'
import { updateContact, getActiveContacts, invalidateContactsCache } from '../../lib/airtable'
import { logSystemEvent } from '../../lib/timeline'
import { useEscape } from '../../lib/escapeStack'

interface CategorizationModalProps {
  contact: Contact
  pods: Pod[]
  fieldConfigs: FieldConfig[]
  onCategorized: (contactId: string) => void
  onSkip: () => void
  onClose: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--tint)',
  border: '1px solid var(--edge-strong)',
  borderRadius: 6,
  color: 'var(--color-text-primary)',
  fontSize: 13,
  padding: '6px 10px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

export function CategorizationModal({
  contact,
  pods,
  fieldConfigs,
  onCategorized,
  onSkip,
  onClose,
}: CategorizationModalProps) {
  const [selectedPodIds, setSelectedPodIds] = useState<string[]>([])
  const [primaryPodId, setPrimaryPodId] = useState<string | null>(null)
  const [selectedRings, setSelectedRings] = useState<RelationshipRing[]>(contact.ring_ids ?? [])
  const [relationshipContext, setRelationshipContext] = useState(contact.relationship_context ?? '')
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [capacityWarnings, setCapacityWarnings] = useState<Record<string, { count: number; capacity: number; dismissed: boolean }>>({})

  const handleClose = useCallback(() => onClose(), [onClose])
  useEscape(handleClose)

  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const el = dialogRef.current
    if (el && !el.open) el.showModal()
    const handleCancel = (e: Event) => { e.preventDefault(); onClose() }
    el?.addEventListener('cancel', handleCancel)
    return () => el?.removeEventListener('cancel', handleCancel)
  }, [onClose])

  function togglePod(podId: string, pod: Pod) {
    setSelectedPodIds(prev => {
      const next = prev.includes(podId)
        ? prev.filter(id => id !== podId)
        : [...prev, podId]

      // Auto-set primary if only one selected or primary was removed
      if (next.length === 1) {
        setPrimaryPodId(next[0])
      } else if (!next.includes(primaryPodId ?? '')) {
        setPrimaryPodId(next[0] ?? null)
      }

      // Check capacity if pod was just added
      if (!prev.includes(podId) && pod.capacity) {
        getActiveContacts().then(active => {
          const count = active.filter(c => c.status === 'Active' && c.list_ids.includes(podId)).length
          if (pod.capacity && count >= pod.capacity) {
            setCapacityWarnings(w => ({ ...w, [podId]: { count, capacity: pod.capacity!, dismissed: false } }))
          }
        })
      }

      return next
    })
  }

  function dismissCapacityWarning(podId: string) {
    setCapacityWarnings(w => ({
      ...w,
      [podId]: { ...w[podId], dismissed: true },
    }))
  }

  // Required fields validation
  const allRequiredAnswered = selectedPodIds.every(podId => {
    const podRequired = fieldConfigs.filter(fc => fc.scope_pod_id === podId && fc.required)
    return podRequired.every(fc => {
      const val = answers[fc.name]
      return val !== null && val !== undefined && val !== ''
    })
  })

  const canSave = allRequiredAnswered &&
    primaryPodId !== null &&
    selectedPodIds.length > 0 &&
    selectedRings.length > 0 &&
    relationshipContext.trim().length > 0 &&
    !saving

  function toggleRing(ring: RelationshipRing) {
    setSelectedRings(prev =>
      prev.includes(ring) ? prev.filter(id => id !== ring) : [...prev, ring]
    )
  }

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setSaveError(null)
    try {
      await updateContact(contact.id, {
        status: 'Active',
        list_ids: selectedPodIds,
        primary_list_id: primaryPodId,
        ring_ids: selectedRings,
        relationship_context: relationshipContext.trim(),
        custom_fields: { ...contact.custom_fields, ...answers },
      })

      const podNames = selectedPodIds.map(id => pods.find(p => p.id === id)?.name ?? id)
      const primaryPodName = pods.find(p => p.id === primaryPodId)?.name ?? primaryPodId ?? ''
      const ringNames = selectedRings.map(ring => RELATIONSHIP_RING_LABELS[ring])
      const noteText = `Categorized into: ${podNames.join(', ')}. Primary: ${primaryPodName}. Rings: ${ringNames.join(', ')}.${notes ? ` Notes: ${notes}` : ''}`

      await logSystemEvent({
        contactId: contact.id,
        type: 'categorization',
        detail: {
          pods: selectedPodIds,
          primaryPod: primaryPodId,
          rings: selectedRings,
          relationshipContext: relationshipContext.trim(),
          answeredFields: Object.keys(answers),
        },
        notes: noteText,
      })

      invalidateContactsCache()
      onCategorized(contact.id)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
      setSaving(false)
    }
  }

  function renderField(fc: FieldConfig, podId: string) {
    const val = answers[fc.name]

    function setVal(v: unknown) {
      setAnswers(prev => ({ ...prev, [fc.name]: v }))
    }

    const label = (
      <label style={{
        display: 'block',
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--color-text-secondary)',
        marginBottom: 4,
      }}>
        {fc.name}
        {fc.required && <span style={{ color: '#e53e3e', marginLeft: 2 }}>*</span>}
      </label>
    )

    let input: React.ReactNode

    if (fc.field_type === 'checkbox') {
      input = (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!val}
            onChange={e => setVal(e.target.checked)}
            style={{ width: 14, height: 14 }}
          />
          <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{fc.name}</span>
        </label>
      )
      return (
        <div key={`${podId}-${fc.id}`} style={{ marginBottom: 12 }}>
          {input}
        </div>
      )
    }

    if (fc.field_type === 'multiline') {
      input = (
        <textarea
          value={(val as string) ?? ''}
          onChange={e => setVal(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      )
    } else if (fc.field_type === 'select') {
      // FieldConfig may be extended with options in the future
      const opts: string[] = (fc as FieldConfig & { options?: string[] }).options ?? []
      input = opts.length > 0 ? (
        <select
          value={(val as string) ?? ''}
          onChange={e => setVal(e.target.value || null)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="">Select...</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type="text"
          value={(val as string) ?? ''}
          onChange={e => setVal(e.target.value)}
          placeholder="Enter value..."
          style={inputStyle}
        />
      )
    } else if (fc.field_type === 'date') {
      input = (
        <input
          type="date"
          value={(val as string) ?? ''}
          onChange={e => setVal(e.target.value || null)}
          style={inputStyle}
        />
      )
    } else if (fc.field_type === 'number') {
      input = (
        <input
          type="number"
          value={(val as string) ?? ''}
          onChange={e => setVal(e.target.value === '' ? null : Number(e.target.value))}
          style={inputStyle}
        />
      )
    } else {
      input = (
        <input
          type="text"
          value={(val as string) ?? ''}
          onChange={e => setVal(e.target.value)}
          style={inputStyle}
        />
      )
    }

    return (
      <div key={`${podId}-${fc.id}`} style={{ marginBottom: 12 }}>
        {label}
        {input}
      </div>
    )
  }

  return (
    <dialog ref={dialogRef} className="overlay-dialog" style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--color-bg)',
        borderRadius: '16px 16px 0 0',
        width: '100%',
        maxWidth: 480,
        maxHeight: '92vh',
        overflow: 'auto',
        padding: '24px 20px 32px',
        boxSizing: 'border-box',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 700,
              fontSize: 18,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.01em',
            }}>
              {contact.name}
            </div>
            {(contact.role || contact.company) && (
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                {[contact.role, contact.company].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-tertiary)', fontSize: 20, padding: '4px 8px',
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Pod multi-select */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
          }}>
            Select pods
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {pods.map(pod => {
              const selected = selectedPodIds.includes(pod.id)
              const color = pod.color ?? '#718096'
              const warning = capacityWarnings[pod.id]
              return (
                <div key={pod.id}>
                  <button
                    type="button"
                    onClick={() => togglePod(pod.id, pod)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px',
                      border: selected ? `2px solid ${color}` : '2px solid transparent',
                      borderRadius: 20,
                      background: selected ? `${color}20` : 'var(--tint)',
                      color: selected ? color : 'var(--color-text-secondary)',
                      fontSize: 13, fontWeight: selected ? 600 : 400,
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: color, flexShrink: 0,
                    }} />
                    {pod.name}
                  </button>
                  {warning && !warning.dismissed && (
                    <div style={{
                      fontSize: 11, color: '#d69e2e',
                      marginTop: 4, display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <span>{pod.name} is at {warning.count}/{warning.capacity} — consider reviewing.</span>
                      <button
                        type="button"
                        onClick={() => dismissCapacityWarning(pod.id)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#d69e2e', fontSize: 11, padding: 0, fontFamily: 'inherit',
                          textDecoration: 'underline',
                        }}
                      >
                        Add Anyway
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
          }}>
            Rings
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {RELATIONSHIP_RINGS.map(ring => {
              const selected = selectedRings.includes(ring)
              return (
                <button
                  key={ring}
                  type="button"
                  onClick={() => toggleRing(ring)}
                  style={{
                    padding: '6px 12px',
                    border: selected ? '2px solid var(--color-brand)' : '2px solid transparent',
                    borderRadius: 20,
                    background: selected ? 'rgba(37,180,57,0.12)' : 'var(--tint)',
                    color: selected ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                    fontSize: 13,
                    fontWeight: selected ? 600 : 400,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                >
                  {RELATIONSHIP_RING_LABELS[ring]}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'block',
            fontSize: 12, fontWeight: 600,
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 6,
          }}>
            Relationship context
          </label>
          <textarea
            value={relationshipContext}
            onChange={e => setRelationshipContext(e.target.value)}
            rows={3}
            placeholder="How do you know them and why do they matter right now?"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Required fields per pod - progressive disclosure */}
        {selectedPodIds.map(podId => {
          const pod = pods.find(p => p.id === podId)
          if (!pod) return null
          const podFields = fieldConfigs.filter(fc => fc.scope_pod_id === podId)
          if (podFields.length === 0) return null
          const color = pod.color ?? '#718096'

          return (
            <div key={podId} style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 12, fontWeight: 600,
                color: color,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                {pod.name} fields
              </div>
              {podFields.map(fc => renderField(fc, podId))}
            </div>
          )
        })}

        {/* Primary pod radio — only when 2+ pods selected */}
        {selectedPodIds.length >= 2 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
            }}>
              Primary pod
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedPodIds.map(podId => {
                const pod = pods.find(p => p.id === podId)
                if (!pod) return null
                const color = pod.color ?? '#718096'
                return (
                  <label key={podId} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="primaryPod"
                      value={podId}
                      checked={primaryPodId === podId}
                      onChange={() => setPrimaryPodId(podId)}
                      style={{ accentColor: color }}
                    />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{pod.name}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block',
            fontSize: 12, fontWeight: 500,
            color: 'var(--color-text-secondary)', marginBottom: 4,
          }}>
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Any context about this contact..."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {saveError && (
          <div style={{ fontSize: 13, color: '#e53e3e', marginBottom: 12 }}>{saveError}</div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onSkip}
            style={{
              flex: 1,
              background: 'var(--tint)',
              border: '1px solid var(--edge-strong)',
              color: 'var(--color-text-secondary)',
              borderRadius: 8, padding: '10px',
              fontSize: 14, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            style={{
              flex: 2,
              background: canSave ? 'var(--color-brand)' : 'var(--tint)',
              border: 'none',
              color: canSave ? '#fff' : 'var(--color-text-tertiary)',
              borderRadius: 8, padding: '10px',
              fontSize: 14, fontWeight: 600,
              cursor: canSave ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
