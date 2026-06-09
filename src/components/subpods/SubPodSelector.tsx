import { useState, type CSSProperties } from 'react'
import type { Category, Pod } from '../../lib/types'

interface SubPodSelectorProps {
  pods: Pod[]
  categories: Category[]
  selectedPodIds: string[]
  selectedCategoryIds: string[]
  onSelect: (subPod: Category) => void
  onClear: (podId: string) => void
  onCreateSubPod?: (podId: string, name: string) => Promise<void> | void
  compact?: boolean
}

export function SubPodSelector({
  pods,
  categories,
  selectedPodIds,
  selectedCategoryIds,
  onSelect,
  onClear,
  onCreateSubPod,
  compact = false,
}: SubPodSelectorProps) {
  const [creatingForPodId, setCreatingForPodId] = useState<string | null>(null)
  const [newSubPodName, setNewSubPodName] = useState('')
  const [savingSubPod, setSavingSubPod] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const groups = pods
    .filter(pod => selectedPodIds.includes(pod.id))
    .map(pod => ({
      pod,
      subPods: categories.filter(category => category.list_id === pod.id),
    }))

  function resetCreateState() {
    setCreatingForPodId(null)
    setNewSubPodName('')
    setSavingSubPod(false)
    setCreateError(null)
  }

  async function handleCreateSubPod(podId: string) {
    if (!onCreateSubPod || savingSubPod) return
    const name = newSubPodName.trim()
    if (!name) return

    setSavingSubPod(true)
    setCreateError(null)
    try {
      await onCreateSubPod(podId, name)
      resetCreateState()
    } catch (error) {
      setSavingSubPod(false)
      setCreateError(error instanceof Error ? error.message : 'Could not create the sub-pod.')
    }
  }

  return (
    <div style={{ marginTop: compact ? 8 : 14 }}>
      <div style={{
        fontSize: 11,
        color: 'var(--color-text-tertiary)',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>
        Sub-pods
      </div>
      {groups.length === 0 ? (
        <div style={{
          color: 'var(--color-text-tertiary)',
          fontSize: 12,
          lineHeight: 1.45,
        }}>
          Select a pod to view its sub-pods.
        </div>
      ) : (
      <div style={{ display: 'grid', gap: compact ? 8 : 10 }}>
        {groups.map(({ pod, subPods }) => {
          const assignedInPod = subPods.find(subPod => selectedCategoryIds.includes(subPod.id))
          return (
            <div key={pod.id} style={{ display: 'grid', gap: 6 }}>
              {groups.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  {pod.color && <span style={{ width: 7, height: 7, borderRadius: '50%', background: pod.color, flexShrink: 0 }} />}
                  {pod.name}
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {subPods.length === 0 ? (
                  <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12, lineHeight: 1.45 }}>
                    No sub-pods available.
                  </span>
                ) : subPods.map(subPod => {
                  const selected = selectedCategoryIds.includes(subPod.id)
                  return (
                    <button
                      key={subPod.id}
                      type="button"
                      onClick={() => onSelect(subPod)}
                      aria-pressed={selected}
                      title={`${subPod.name} in ${pod.name}`}
                      style={subPodButtonStyle(selected, pod.color)}
                    >
                      {pod.color && <span style={{ width: 7, height: 7, borderRadius: '50%', background: pod.color, flexShrink: 0 }} />}
                      {subPod.name}
                    </button>
                  )
                })}
                {assignedInPod && (
                  <button
                    type="button"
                    onClick={() => onClear(pod.id)}
                    style={clearButtonStyle}
                  >
                    No sub-pod
                  </button>
                )}
              </div>
              {onCreateSubPod && (
                <div style={{ display: 'grid', gap: 6 }}>
                  {creatingForPodId === pod.id ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <input
                        autoFocus
                        type="text"
                        value={newSubPodName}
                        placeholder="New sub-pod"
                        onChange={event => {
                          setNewSubPodName(event.target.value)
                          if (createError) setCreateError(null)
                        }}
                        onKeyDown={event => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            void handleCreateSubPod(pod.id)
                          }
                          if (event.key === 'Escape') {
                            resetCreateState()
                            event.stopPropagation()
                          }
                        }}
                        style={createInputStyle}
                      />
                      <button
                        type="button"
                        onClick={() => { void handleCreateSubPod(pod.id) }}
                        disabled={!newSubPodName.trim() || savingSubPod}
                        style={{
                          ...confirmButtonStyle,
                          opacity: !newSubPodName.trim() || savingSubPod ? 0.5 : 1,
                          cursor: !newSubPodName.trim() || savingSubPod ? 'default' : 'pointer',
                        }}
                      >
                        {savingSubPod ? 'Adding...' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={resetCreateState}
                        style={cancelButtonStyle}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setCreatingForPodId(pod.id)
                        setNewSubPodName('')
                        setCreateError(null)
                      }}
                      style={addButtonStyle}
                    >
                      + Add sub-pod
                    </button>
                  )}
                  {creatingForPodId === pod.id && createError && (
                    <span style={{ color: '#dc2626', fontSize: 12, lineHeight: 1.4 }}>
                      {createError}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}

function subPodButtonStyle(selected: boolean, color: string | null): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 11px',
    borderRadius: 999,
    border: '1px solid',
    borderColor: selected ? (color ?? 'var(--edge-strong)') : 'var(--edge)',
    background: selected
      ? color
        ? `color-mix(in srgb, ${color} 14%, var(--surface-panel) 86%)`
        : 'var(--tint)'
      : 'color-mix(in srgb, var(--surface-panel) 72%, transparent)',
    color: selected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
    fontSize: 12,
    fontWeight: selected ? 700 : 500,
    lineHeight: 1.2,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'border-color 0.12s, background 0.12s, color 0.12s',
  }
}

const clearButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '5px 10px',
  borderRadius: 999,
  border: '1px dashed var(--edge)',
  background: 'transparent',
  color: 'var(--color-text-tertiary)',
  fontSize: 12,
  fontWeight: 500,
  lineHeight: 1.2,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const addButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '5px 12px',
  borderRadius: 999,
  border: '1px dashed var(--edge-strong)',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  fontSize: 12,
  fontWeight: 500,
  lineHeight: 1.2,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const createInputStyle: CSSProperties = {
  flex: '1 1 180px',
  minWidth: 0,
  background: 'color-mix(in srgb, var(--surface-panel) 88%, var(--tint) 12%)',
  border: '1px solid var(--edge-strong)',
  borderRadius: 8,
  color: 'var(--color-text-primary)',
  fontSize: 13,
  lineHeight: 1.4,
  padding: '7px 10px',
  outline: 'none',
  fontFamily: 'inherit',
}

const confirmButtonStyle: CSSProperties = {
  padding: '7px 12px',
  borderRadius: 8,
  border: '1px solid var(--edge-strong)',
  background: 'var(--color-brand)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'inherit',
}

const cancelButtonStyle: CSSProperties = {
  padding: '7px 10px',
  borderRadius: 8,
  border: '1px solid var(--edge)',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
}
