import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useWorkspace } from '@/contexts/WorkspaceContext'

export function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const { workspaces, activeWorkspace, switchWorkspace, createWorkspace } = useWorkspace()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (creating) inputRef.current?.focus()
  }, [creating])

  const handleCreate = async () => {
    if (!newName.trim()) return
    await createWorkspace(newName.trim())
    setNewName('')
    setCreating(false)
    setOpen(false)
  }

  if (!activeWorkspace) return null

  const initial = activeWorkspace.name.charAt(0).toUpperCase()

  return (
    <div ref={ref} style={{ position: 'relative', padding: '8px 8px 0' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={collapsed ? activeWorkspace.name : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: collapsed ? 40 : '100%',
          height: 40,
          margin: collapsed ? '0 auto' : undefined,
          padding: collapsed ? 0 : '0 12px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          background: open ? 'var(--tint-hover)' : 'transparent',
          border: 'none',
          borderRadius: 10,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'background 0.12s ease',
        }}
      >
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: 'var(--color-brand)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {initial}
        </div>
        {!collapsed && (
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: 'var(--color-text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            flex: 1, textAlign: 'left',
          }}>
            {activeWorkspace.name}
          </span>
        )}
        {!collapsed && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 8,
          right: collapsed ? 'auto' : 8,
          width: collapsed ? 220 : undefined,
          marginTop: 4,
          background: 'var(--nav-bg, #fff)',
          border: '1px solid var(--edge-strong)',
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 200,
          overflow: 'hidden',
        }}>
          <div style={{ padding: 4, maxHeight: 200, overflowY: 'auto' }}>
            {workspaces.map(ws => (
              <button
                key={ws.id}
                type="button"
                onClick={() => { switchWorkspace(ws.id); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '8px 12px',
                  background: ws.id === activeWorkspace.id ? 'var(--tint-hover)' : 'transparent',
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'background 0.1s',
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 5,
                  background: 'var(--color-brand)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {ws.name.charAt(0).toUpperCase()}
                </div>
                <span style={{
                  fontSize: 13, fontWeight: ws.id === activeWorkspace.id ? 600 : 400,
                  color: 'var(--color-text-primary)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {ws.name}
                </span>
                {ws.id === activeWorkspace.id && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ marginLeft: 'auto', color: 'var(--color-brand)' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {/* Manage team */}
          <div style={{ borderTop: '1px solid var(--divider)', padding: 4 }}>
            <button
              type="button"
              onClick={() => { navigate('/account'); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '8px 12px',
                background: 'transparent', border: 'none', borderRadius: 8,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ color: 'var(--color-text-tertiary)' }}>
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="17" y1="11" x2="23" y2="11"/>
              </svg>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Manage team
              </span>
            </button>
          </div>

          {/* New team */}
          <div style={{ borderTop: '1px solid var(--divider)', padding: 4 }}>
            {creating ? (
              <div style={{ display: 'flex', gap: 6, padding: '4px 8px' }}>
                <input
                  ref={inputRef}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName('') } }}
                  placeholder="Team name"
                  style={{
                    flex: 1, padding: '6px 8px', fontSize: 13, fontFamily: 'inherit',
                    border: '1px solid var(--edge-strong)', borderRadius: 6,
                    background: 'transparent', color: 'var(--color-text-primary)',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  style={{
                    padding: '6px 12px', fontSize: 12, fontWeight: 600,
                    background: 'var(--color-brand)', color: '#fff',
                    border: 'none', borderRadius: 6, cursor: 'pointer',
                    fontFamily: 'inherit', opacity: newName.trim() ? 1 : 0.5,
                  }}
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '8px 12px',
                  background: 'transparent', border: 'none', borderRadius: 8,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ color: 'var(--color-text-tertiary)' }}>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  New team
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
