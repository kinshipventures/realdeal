import { useState, useCallback } from 'react'
import type { Contact, Pod } from '../../lib/types'
import { mergeRecords } from '../../lib/airtable'
import { useEscape } from '../../lib/escapeStack'

interface MergeModalProps {
  recordA: Contact
  recordB: Contact
  pods?: Pod[]
  onClose: () => void
  onMerged: (survivor: Contact) => void
}

type FieldKey = keyof Contact

const MERGE_FIELDS: { key: FieldKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'email_2', label: 'Email 2' },
  { key: 'email_3', label: 'Email 3' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'role', label: 'Role' },
  { key: 'location', label: 'Location' },
  { key: 'website', label: 'Website' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'notes', label: 'Notes' },
  { key: 'interests', label: 'Interests' },
  { key: 'relationship_context', label: 'Relationship Context' },
  { key: 'recommended_by', label: 'Recommended By' },
  { key: 'specialization', label: 'Specialization' },
  { key: 'intel_notes', label: 'Intel Notes' },
  { key: 'next_action', label: 'Next Action' },
  { key: 'status', label: 'Status' },
  { key: 'type', label: 'Type' },
]

function displayValue(val: unknown): string {
  if (val == null || val === '') return '-'
  if (Array.isArray(val)) return val.join(', ')
  return String(val)
}

export function MergeModal({ recordA, recordB, pods, onClose, onMerged }: MergeModalProps) {
  const [survivorId, setSurvivorId] = useState(recordA.id)
  const [picks, setPicks] = useState<Record<string, 'a' | 'b'>>({})
  const [merging, setMerging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stableClose = useCallback(() => { if (!merging) onClose() }, [merging, onClose])
  useEscape(stableClose)

  const survivor = survivorId === recordA.id ? recordA : recordB
  const loser = survivorId === recordA.id ? recordB : recordA

  function getPickedValue(key: FieldKey): unknown {
    const pick = picks[key]
    if (pick === 'a') return recordA[key]
    if (pick === 'b') return recordB[key]
    return survivor[key]
  }

  async function handleMerge() {
    setMerging(true)
    setError(null)
    try {
      const overrides: Partial<Contact> = {}
      for (const { key } of MERGE_FIELDS) {
        const val = getPickedValue(key)
        if (val !== survivor[key]) {
          ;(overrides as Record<string, unknown>)[key] = val
        }
      }
      const result = await mergeRecords(survivor.id, loser.id, overrides)
      onMerged(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Merge failed')
      setMerging(false)
    }
  }

  const podNames = (ids: string[]) =>
    pods?.filter(p => ids.includes(p.id)).map(p => p.name).join(', ') || ids.length + ' pod(s)'

  // Fields where values differ
  const diffFields = MERGE_FIELDS.filter(({ key }) => {
    const a = displayValue(recordA[key])
    const b = displayValue(recordB[key])
    return a !== b
  })

  const sameFields = MERGE_FIELDS.filter(({ key }) => {
    const a = displayValue(recordA[key])
    const b = displayValue(recordB[key])
    return a === b && a !== '-'
  })

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
        onClick={stableClose}
      />
      <div style={{
        position: 'relative',
        background: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 720,
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px', borderBottom: '1px solid var(--divider)',
        }}>
          <h2 style={{
            margin: 0, fontFamily: 'var(--font-serif)',
            fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)',
          }}>
            Merge Records
          </h2>
          <button
            type="button" onClick={stableClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 18, color: 'var(--text-muted)', padding: '4px 8px',
            }}
          >
            x
          </button>
        </div>

        <div style={{ padding: '16px 24px 24px' }}>
          {/* Survivor selection */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20,
          }}>
            {[recordA, recordB].map(rec => (
              <button
                key={rec.id} type="button"
                onClick={() => setSurvivorId(rec.id)}
                style={{
                  padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                  background: survivorId === rec.id ? 'rgba(37,180,57,0.08)' : 'var(--tint)',
                  border: survivorId === rec.id ? '2px solid #25B439' : '2px solid var(--edge)',
                  textAlign: 'left', fontFamily: 'inherit',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: survivorId === rec.id ? '#25B439' : 'var(--text-muted)', marginBottom: 4 }}>
                  {survivorId === rec.id ? 'SURVIVES' : 'WILL BE DELETED'}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {rec.name}
                </div>
                {rec.company && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{rec.company}</div>
                )}
              </button>
            ))}
          </div>

          {/* Differing fields */}
          {diffFields.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pick values to keep ({diffFields.length} differ{diffFields.length === 1 ? 's' : ''})
              </div>
              {diffFields.map(({ key, label }) => {
                const aVal = displayValue(recordA[key])
                const bVal = displayValue(recordB[key])
                const currentPick = picks[key] ?? (survivorId === recordA.id ? 'a' : 'b')

                return (
                  <div key={key} style={{
                    display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: 8,
                    marginBottom: 4, alignItems: 'stretch',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', padding: '8px 0', display: 'flex', alignItems: 'center' }}>
                      {label}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPicks(p => ({ ...p, [key]: 'a' }))}
                      style={{
                        padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                        background: currentPick === 'a' ? 'var(--tint)' : 'transparent',
                        border: currentPick === 'a' ? '1px solid var(--edge-strong)' : '1px solid transparent',
                        borderLeft: currentPick === 'a' ? '2px solid var(--color-text-primary)' : '2px solid transparent',
                        fontSize: 13, color: 'var(--color-text-primary)', textAlign: 'left',
                        fontFamily: 'inherit', wordBreak: 'break-word',
                      }}
                    >
                      {aVal}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPicks(p => ({ ...p, [key]: 'b' }))}
                      style={{
                        padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                        background: currentPick === 'b' ? 'var(--tint)' : 'transparent',
                        border: currentPick === 'b' ? '1px solid var(--edge-strong)' : '1px solid transparent',
                        borderLeft: currentPick === 'b' ? '2px solid var(--color-text-primary)' : '2px solid transparent',
                        fontSize: 13, color: 'var(--color-text-primary)', textAlign: 'left',
                        fontFamily: 'inherit', wordBreak: 'break-word',
                      }}
                    >
                      {bVal}
                    </button>
                  </div>
                )
              })}
            </>
          )}

          {/* Same fields (collapsed) */}
          {sameFields.length > 0 && (
            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
              {sameFields.length} field{sameFields.length === 1 ? '' : 's'} identical - will be kept as-is
            </div>
          )}

          {/* Associations */}
          <div style={{
            marginTop: 20, padding: '12px 16px', borderRadius: 8,
            background: 'var(--tint)', border: '1px solid var(--divider)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Combined automatically
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              <div>Pods: {podNames([...new Set([...recordA.list_ids, ...recordB.list_ids])])}</div>
              <div>Categories: {[...new Set([...recordA.category_ids, ...recordB.category_ids])].length} total</div>
              <div>All interactions, pipeline cards, projects, and campaigns will transfer to the surviving record.</div>
            </div>
          </div>

          {error && (
            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 8,
              background: 'rgba(217,48,37,0.08)', color: '#D93025',
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24,
          }}>
            <button
              type="button" onClick={stableClose} disabled={merging}
              style={{
                padding: '8px 20px', borderRadius: 8, cursor: 'pointer',
                background: 'transparent', border: '1px solid var(--edge-strong)',
                fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)',
                fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
            <button
              type="button" onClick={handleMerge} disabled={merging}
              style={{
                padding: '8px 20px', borderRadius: 8, cursor: merging ? 'wait' : 'pointer',
                background: '#D93025', border: 'none',
                fontSize: 13, fontWeight: 600, color: '#fff',
                fontFamily: 'inherit', opacity: merging ? 0.7 : 1,
              }}
            >
              {merging ? 'Merging...' : 'Merge Records'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
