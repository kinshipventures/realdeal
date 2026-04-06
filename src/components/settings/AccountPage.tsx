import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import {
  fetchWorkspaceMembers, fetchPendingInvites, createWorkspaceInvite,
  revokeInvite, removeMember, updateMemberRole,
  type WorkspaceMember, type WorkspaceInvite,
} from '@/lib/supabase-data'

export function AccountPage() {
  const { session } = useAuth()
  const { activeWorkspace, refreshWorkspaces } = useWorkspace()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Workspace state
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [invites, setInvites] = useState<WorkspaceInvite[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [inviteError, setInviteError] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [wsName, setWsName] = useState('')
  const [editingName, setEditingName] = useState(false)

  const myRole = activeWorkspace?.role ?? 'member'
  const isOwner = myRole === 'owner'
  const isAdmin = myRole === 'admin'
  const canInvite = isOwner || isAdmin

  useEffect(() => {
    if (!session?.user?.id) return
    setEmail(session.user.email || '')
    supabase.from('profiles').select('display_name').eq('id', session.user.id).single()
      .then(({ data }) => { if (data?.display_name) setDisplayName(data.display_name) })
  }, [session?.user?.id])

  useEffect(() => {
    if (!activeWorkspace) return
    setWsName(activeWorkspace.name)
    loadWorkspaceData()
  }, [activeWorkspace?.id])

  async function loadWorkspaceData() {
    if (!activeWorkspace) return
    const [m, inv] = await Promise.all([
      fetchWorkspaceMembers(activeWorkspace.id),
      fetchPendingInvites(activeWorkspace.id),
    ])
    setMembers(m)
    setInvites(inv)
  }

  const handleSave = async () => {
    if (!session?.user?.id) return
    setSaving(true)
    await supabase.from('profiles').update({ display_name: displayName }).eq('id', session.user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleSaveWsName = async () => {
    if (!activeWorkspace || !wsName.trim()) return
    await supabase.from('workspaces').update({ name: wsName.trim() }).eq('id', activeWorkspace.id)
    setEditingName(false)
    refreshWorkspaces()
  }

  const handleInvite = async () => {
    if (!activeWorkspace || !inviteEmail.trim()) return
    setInviteSending(true)
    setInviteError('')
    try {
      const invite = await createWorkspaceInvite(activeWorkspace.id, inviteEmail.trim(), inviteRole)
      setInviteEmail('')
      setInviteRole('member')
      setInvites(prev => [invite, ...prev])
      // Copy invite link
      const link = `${window.location.origin}/invite?token=${invite.token}`
      try {
        await navigator.clipboard.writeText(link)
        setCopiedLink(invite.id)
        setTimeout(() => setCopiedLink(null), 3000)
      } catch {
        setCopiedLink(invite.id) // fallback handled in UI
      }
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setInviteSending(false)
    }
  }

  const handleRevoke = async (invite: WorkspaceInvite) => {
    try {
      await revokeInvite(invite.id)
      setInvites(prev => prev.filter(i => i.id !== invite.id))
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to revoke')
      setTimeout(() => setInviteError(''), 3000)
    }
  }

  const handleRemoveMember = async (member: WorkspaceMember) => {
    if (!activeWorkspace) return
    try {
      await removeMember(member.id, activeWorkspace.id)
      setMembers(prev => prev.filter(m => m.id !== member.id))
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to remove')
      setTimeout(() => setInviteError(''), 3000)
    }
  }

  const handleRoleChange = async (member: WorkspaceMember, newRole: 'owner' | 'admin' | 'member') => {
    if (!activeWorkspace) return
    try {
      await updateMemberRole(member.id, newRole, activeWorkspace.id)
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m))
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to update role')
      setTimeout(() => setInviteError(''), 3000)
    }
  }

  const handleLeave = async () => {
    if (!activeWorkspace || !session?.user?.id) return
    const me = members.find(m => m.user_id === session.user.id)
    if (!me) return
    try {
      await removeMember(me.id, activeWorkspace.id)
      refreshWorkspaces()
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Cannot leave')
      setTimeout(() => setInviteError(''), 3000)
    }
  }

  const labelStyle = { fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 } as const
  const inputStyle = {
    width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 8,
    border: '1px solid var(--edge)', background: 'transparent',
    color: 'var(--color-text-primary)', fontFamily: 'inherit', outline: 'none',
  } as const
  const btnStyle = (variant: 'primary' | 'secondary' | 'danger') => ({
    padding: '8px 16px', fontSize: 13, fontWeight: 600,
    border: variant === 'primary' ? 'none' : `1px solid ${variant === 'danger' ? '#E53E3E' : 'var(--edge)'}`,
    borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
    background: variant === 'primary' ? 'var(--color-brand, #7C5CFC)' : 'transparent',
    color: variant === 'primary' ? '#fff' : variant === 'danger' ? '#E53E3E' : 'var(--color-text-primary)',
  } as const)

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '48px 24px', fontFamily: 'var(--font-body, system-ui)' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 32, color: 'var(--color-text-primary)' }}>Account</h1>

      {/* Profile section */}
      <label style={{ display: 'block', marginBottom: 20 }}>
        <span style={labelStyle}>Email</span>
        <input value={email} disabled style={{ ...inputStyle, background: 'var(--color-surface-alt, #eee)', color: 'var(--color-text-tertiary)' }} />
      </label>

      <label style={{ display: 'block', marginBottom: 24 }}>
        <span style={labelStyle}>Display name</span>
        <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" style={inputStyle} />
      </label>

      <div style={{ display: 'flex', gap: 12, marginBottom: 48 }}>
        <button type="button" onClick={handleSave} disabled={saving} style={{ ...btnStyle('primary'), opacity: saving ? 0.6 : 1 }}>
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Workspace section */}
      {activeWorkspace && (
        <>
          <div style={{ borderTop: '1px solid var(--edge)', paddingTop: 32, marginBottom: 32 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 20, color: 'var(--color-text-primary)' }}>Workspace</h2>

            {/* Workspace name */}
            <div style={{ marginBottom: 24 }}>
              <span style={labelStyle}>Name</span>
              {isOwner && editingName ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={wsName} onChange={e => setWsName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveWsName(); if (e.key === 'Escape') { setEditingName(false); setWsName(activeWorkspace.name) } }}
                    style={{ ...inputStyle, flex: 1 }} autoFocus />
                  <button type="button" onClick={handleSaveWsName} style={btnStyle('primary')}>Save</button>
                  <button type="button" onClick={() => { setEditingName(false); setWsName(activeWorkspace.name) }} style={btnStyle('secondary')}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>{activeWorkspace.name}</span>
                  {isOwner && (
                    <button type="button" onClick={() => setEditingName(true)}
                      style={{ padding: '2px 8px', fontSize: 12, color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Members */}
            <div style={{ marginBottom: 24 }}>
              <span style={labelStyle}>Members ({members.length})</span>
              <div style={{ borderRadius: 10, border: '1px solid var(--edge)', overflow: 'hidden' }}>
                {members.map(member => (
                  <div key={member.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    borderBottom: '1px solid var(--divider)',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                      background: 'var(--tint)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: 'var(--color-brand, #7C5CFC)',
                    }}>
                      {(member.display_name || member.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {member.display_name || member.email || 'Unknown'}
                        {member.user_id === session?.user?.id && <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}> (you)</span>}
                      </div>
                      {member.email && member.display_name && (
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.email}</div>
                      )}
                    </div>
                    {isOwner ? (
                      <select
                        value={member.role}
                        onChange={e => handleRoleChange(member, e.target.value as any)}
                        disabled={member.user_id === session?.user?.id}
                        style={{
                          fontSize: 12, padding: '4px 6px', borderRadius: 6, fontFamily: 'inherit',
                          border: '1px solid var(--edge)', background: 'transparent',
                          color: 'var(--color-text-secondary)', cursor: 'pointer',
                        }}
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textTransform: 'capitalize' }}>{member.role}</span>
                    )}
                    {isOwner && member.user_id !== session?.user?.id && (
                      <button type="button" onClick={() => handleRemoveMember(member)}
                        style={{ padding: '4px 8px', fontSize: 11, color: '#E53E3E', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Pending invites */}
            {invites.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <span style={labelStyle}>Pending invites ({invites.length})</span>
                <div style={{ borderRadius: 10, border: '1px solid var(--edge)', overflow: 'hidden' }}>
                  {invites.map(invite => (
                    <div key={invite.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      borderBottom: '1px solid var(--divider)',
                    }}>
                      <span style={{ fontSize: 13, color: 'var(--color-text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {invite.email}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textTransform: 'capitalize' }}>{invite.role}</span>
                      {copiedLink === invite.id ? (
                        <span style={{ fontSize: 11, color: 'var(--color-brand, #7C5CFC)', fontWeight: 500 }}>Link copied!</span>
                      ) : (
                        <button type="button" onClick={async () => {
                          const link = `${window.location.origin}/invite?token=${invite.token}`
                          try { await navigator.clipboard.writeText(link) } catch { /* fallback below */ }
                          setCopiedLink(invite.id)
                          setTimeout(() => setCopiedLink(null), 3000)
                        }}
                          style={{ padding: '4px 8px', fontSize: 11, color: 'var(--color-text-secondary)', background: 'none', border: '1px solid var(--edge)', borderRadius: 6, cursor: 'pointer' }}>
                          Copy link
                        </button>
                      )}
                      {canInvite && (
                        <button type="button" onClick={() => handleRevoke(invite)}
                          style={{ padding: '4px 8px', fontSize: 11, color: '#E53E3E', background: 'none', border: 'none', cursor: 'pointer' }}>
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invite form */}
            {canInvite && (
              <div style={{ marginBottom: 24 }}>
                <span style={labelStyle}>Invite member</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={inviteEmail}
                    onChange={e => { setInviteEmail(e.target.value); setInviteError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') handleInvite() }}
                    placeholder="Email address"
                    type="email"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  {isOwner && (
                    <select value={inviteRole} onChange={e => setInviteRole(e.target.value as any)}
                      style={{ fontSize: 13, padding: '10px 8px', borderRadius: 8, fontFamily: 'inherit', border: '1px solid var(--edge)', background: 'transparent', color: 'var(--color-text-primary)' }}>
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                  <button type="button" onClick={handleInvite} disabled={inviteSending || !inviteEmail.trim()}
                    style={{ ...btnStyle('primary'), opacity: inviteSending || !inviteEmail.trim() ? 0.5 : 1 }}>
                    {inviteSending ? 'Sending...' : 'Invite'}
                  </button>
                </div>
                {inviteError && <p style={{ fontSize: 12, color: '#E53E3E', marginTop: 6, marginBottom: 0 }}>{inviteError}</p>}
              </div>
            )}

            {/* Leave workspace */}
            {!isOwner && (
              <button type="button" onClick={handleLeave} style={btnStyle('danger')}>
                Leave workspace
              </button>
            )}
          </div>
        </>
      )}

      {/* Sign out */}
      <div style={{ borderTop: '1px solid var(--edge)', paddingTop: 24 }}>
        <button type="button" onClick={handleSignOut} style={btnStyle('danger')}>
          Sign out
        </button>
      </div>
    </div>
  )
}
