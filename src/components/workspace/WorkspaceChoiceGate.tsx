import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspace, type Workspace } from '@/contexts/WorkspaceContext'

const CHOICE_PREFIX = 'realdeal:workspace-choice-shown:'

function optionLabel(workspace: Workspace): string {
  if (workspace.role === 'owner') return 'Use personal account'
  return `Use ${workspace.name}`
}

function workspaceInitial(workspace: Workspace): string {
  return (workspace.name || '?').charAt(0).toUpperCase()
}

export function WorkspaceChoiceGate() {
  const { session } = useAuth()
  const { workspaces, activeWorkspace, switchWorkspace } = useWorkspace()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [show, setShow] = useState(false)

  const storageKey = useMemo(() => {
    const userId = session?.user?.id
    return userId ? `${CHOICE_PREFIX}${userId}` : null
  }, [session?.user?.id])

  useEffect(() => {
    if (!storageKey || workspaces.length <= 1 || !activeWorkspace) {
      setShow(false)
      return
    }

    if (sessionStorage.getItem(storageKey) === '1') {
      setShow(false)
      return
    }

    setSelectedId(activeWorkspace.id)
    setShow(true)
  }, [activeWorkspace, storageKey, workspaces.length])

  if (!show || workspaces.length <= 1) return null

  const selected = selectedId ?? activeWorkspace?.id ?? workspaces[0]?.id

  const handleContinue = () => {
    if (selected) switchWorkspace(selected)
    if (storageKey) sessionStorage.setItem(storageKey, '1')
    setShow(false)
  }

  const handleCancel = () => {
    if (storageKey) sessionStorage.setItem(storageKey, '1')
    setShow(false)
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(10, 16, 28, 0.42)',
      backdropFilter: 'blur(8px)',
      padding: 24,
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="workspace-choice-title" style={{
        width: 'min(460px, 100%)',
        background: 'var(--color-surface)',
        border: '1px solid var(--edge-strong)',
        borderRadius: 16,
        boxShadow: '0 24px 80px rgba(15, 23, 42, 0.22)',
        padding: 24,
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          border: '1px solid var(--edge)',
          borderRadius: 999,
          color: 'var(--color-text-secondary)',
          fontSize: 12,
          marginBottom: 18,
        }}>
          <span>{session?.user?.email}</span>
        </div>

        <h2 id="workspace-choice-title" style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 18,
          fontWeight: 800,
          margin: '0 0 12px',
          color: 'var(--color-text-primary)',
        }}>
          Select a workspace
        </h2>

        <div style={{
          border: '1px solid var(--edge)',
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: 22,
        }}>
          {workspaces.map(workspace => {
            const isSelected = workspace.id === selected
            return (
              <button
                key={workspace.id}
                type="button"
                onClick={() => setSelectedId(workspace.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  border: 'none',
                  borderBottom: '1px solid var(--divider)',
                  background: isSelected ? 'var(--tint-hover)' : 'transparent',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                }}
              >
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: workspace.role === 'owner' ? 'var(--color-brand)' : 'var(--health-cooling)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 800,
                  flexShrink: 0,
                }}>
                  {workspaceInitial(workspace)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    color: 'var(--color-text-primary)',
                    fontSize: 15,
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {optionLabel(workspace)}
                  </div>
                  <div style={{ color: 'var(--color-text-tertiary)', fontSize: 12, marginTop: 2 }}>
                    {workspace.role === 'owner' ? 'Owner workspace' : 'Full access team workspace'}
                  </div>
                </div>
                {isSelected && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ color: 'var(--color-brand)', flexShrink: 0 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              minHeight: 44,
              borderRadius: 999,
              border: '1px solid var(--edge)',
              background: 'transparent',
              color: 'var(--color-text-primary)',
              fontFamily: 'inherit',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleContinue}
            style={{
              minHeight: 44,
              borderRadius: 999,
              border: 'none',
              background: 'var(--color-brand)',
              color: '#fff',
              fontFamily: 'inherit',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
