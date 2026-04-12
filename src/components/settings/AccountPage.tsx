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

  // Team state
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [invites, setInvites] = useState<WorkspaceInvite[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [inviteError, setInviteError] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [wsName, setWsName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ type: 'remove' | 'revoke' | 'leave'; target?: WorkspaceMember | WorkspaceInvite } | null>(null)
  const [domainUsers, setDomainUsers] = useState<{ id: string; display_name: string; email: string }[]>([])

  const myRole = activeWorkspace?.role ?? 'member'
  const isOwner = myRole === 'owner'
  const isAdmin = myRole === 'admin'
  const canManage = isOwner || isAdmin
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

  // Domain-based member discovery
  useEffect(() => {
    if (!session?.user?.email || !canInvite) return
    const domain = session.user.email.split('@')[1]
    if (!domain || ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'].includes(domain)) return
    supabase.rpc('find_users_by_email_domain', { _domain: domain })
      .then(({ data }) => {
        if (data) {
          // Filter out users already in this workspace
          const memberIds = new Set(members.map(m => m.user_id))
          const invitedEmails = new Set(invites.map(i => i.email.toLowerCase()))
          setDomainUsers((data as any[]).filter(u => !memberIds.has(u.id) && !invitedEmails.has(u.email?.toLowerCase())))
        }
      })
  }, [session?.user?.email, canInvite, members, invites])

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
      const link = `${window.location.origin}/invite?token=${invite.token}`
      try {
        await navigator.clipboard.writeText(link)
        setCopiedLink(invite.id)
        setTimeout(() => setCopiedLink(null), 3000)
      } catch {
        setCopiedLink(invite.id)
      }
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setInviteSending(false)
    }
  }

  const handleConfirmedAction = async () => {
    if (!confirmAction) return
    const { type, target } = confirmAction
    setConfirmAction(null)
    try {
      if (type === 'revoke' && target) {
        await revokeInvite(target.id)
        setInvites(prev => prev.filter(i => i.id !== target.id))
      } else if (type === 'remove' && target && activeWorkspace) {
        await removeMember(target.id, activeWorkspace.id)
        setMembers(prev => prev.filter(m => m.id !== target.id))
      } else if (type === 'leave' && activeWorkspace && session?.user?.id) {
        const me = members.find(m => m.user_id === session.user.id)
        if (me) {
          await removeMember(me.id, activeWorkspace.id)
          refreshWorkspaces()
        }
      }
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Action failed')
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

  const labelStyle = { fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 } as const
  const inputStyle = {
    width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 8,
    border: '1px solid var(--edge)', background: 'transparent',
    color: 'var(--color-text-primary)', fontFamily: 'inherit', outline: 'none',
  } as const
  const btnStyle = (variant: 'primary' | 'secondary' | 'danger') => ({
    padding: '8px 16px', fontSize: 13, fontWeight: 600,
    border: variant === 'primary' ? 'none' : `1px solid ${variant === 'danger' ? 'var(--health-fading)' : 'var(--edge)'}`,
    borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
    background: variant === 'primary' ? 'var(--color-brand)' : 'transparent',
    color: variant === 'primary' ? '#fff' : variant === 'danger' ? 'var(--health-fading)' : 'var(--color-text-primary)',
  } as const)

  const sectionHeading = (text: string) => (
    <h2 style={{
      fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-serif)',
      color: 'var(--color-text-primary)', margin: '0 0 20px',
      letterSpacing: '-0.01em',
    }}>{text}</h2>
  )

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '48px 24px 80px' }}>
      <h1 style={{
        fontSize: 24, fontWeight: 800, marginBottom: 40,
        fontFamily: 'var(--font-serif)', letterSpacing: '-0.02em',
      }}>Account</h1>

      {/* ── Profile ───────────────────────────────────────────── */}
      <section style={{ marginBottom: 40 }}>
        {sectionHeading('Profile')}
        <label style={{ display: 'block', marginBottom: 20 }}>
          <span style={labelStyle}>Email</span>
          <input value={email} disabled style={{ ...inputStyle, background: 'var(--tint)', color: 'var(--color-text-tertiary)' }} />
        </label>
        <label style={{ display: 'block', marginBottom: 20 }}>
          <span style={labelStyle}>Display name</span>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" style={inputStyle} />
        </label>
        <button type="button" onClick={handleSave} disabled={saving} style={{ ...btnStyle('primary'), opacity: saving ? 0.6 : 1 }}>
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}
        </button>
      </section>

      {/* ── Team ──────────────────────────────────────────────── */}
      {activeWorkspace && (
        <section style={{
          marginBottom: 40, paddingTop: 32,
          borderTop: '1px solid var(--edge)',
        }}>
          {sectionHeading('Team')}

          {/* Team name */}
          <div style={{ marginBottom: 24 }}>
            <span style={labelStyle}>Name</span>
            {canManage && editingName ? (
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
                {canManage && (
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
                    fontSize: 11, fontWeight: 700, color: 'var(--color-brand)',
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
                  {canManage ? (
                    <select
                      value={member.role}
                      onChange={e => handleRoleChange(member, e.target.value as any)}
                      disabled={member.user_id === session?.user?.id || (!isOwner && member.role === 'owner')}
                      title="Owner: full control. Admin: can invite members. Member: can view and edit contacts."
                      style={{
                        fontSize: 12, padding: '4px 6px', borderRadius: 6, fontFamily: 'inherit',
                        border: '1px solid var(--edge)', background: 'transparent',
                        color: 'var(--color-text-secondary)', cursor: 'pointer',
                      }}
                    >
                      {isOwner && <option value="owner">Owner</option>}
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textTransform: 'capitalize' }}>{member.role}</span>
                  )}
                  {canManage && member.user_id !== session?.user?.id && member.role !== 'owner' && (
                    <button type="button" onClick={() => setConfirmAction({ type: 'remove', target: member })}
                      style={{ padding: '4px 8px', fontSize: 11, color: 'var(--health-fading)', background: 'none', border: 'none', cursor: 'pointer' }}>
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
                      <span style={{ fontSize: 11, color: 'var(--color-brand)', fontWeight: 500 }}>Link copied!</span>
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
                      <button type="button" onClick={() => setConfirmAction({ type: 'revoke', target: invite })}
                        style={{ padding: '4px 8px', fontSize: 11, color: 'var(--health-fading)', background: 'none', border: 'none', cursor: 'pointer' }}>
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
              <span style={labelStyle}>Invite someone</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={inviteEmail}
                  onChange={e => { setInviteEmail(e.target.value); setInviteError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleInvite() }}
                  placeholder="Email address"
                  type="email"
                  style={{ ...inputStyle, flex: 1 }}
                />
                {canManage && (
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
              {inviteError && <p style={{ fontSize: 12, color: 'var(--health-fading)', marginTop: 6, marginBottom: 0 }}>{inviteError}</p>}

              {/* Domain-based suggestions */}
              {domainUsers.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 6 }}>
                    People in your organization
                  </span>
                  <div style={{ borderRadius: 10, border: '1px solid var(--edge)', overflow: 'hidden' }}>
                    {domainUsers.map(u => (
                      <div key={u.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
                        borderBottom: '1px solid var(--divider)',
                      }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                          background: 'var(--tint)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, color: 'var(--color-brand)',
                        }}>
                          {(u.display_name || u.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {u.display_name || u.email}
                          </div>
                          {u.display_name && u.email && (
                            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{u.email}</div>
                          )}
                        </div>
                        <button type="button" onClick={() => setInviteEmail(u.email)}
                          style={{ padding: '4px 10px', fontSize: 11, color: 'var(--color-brand)', background: 'none', border: '1px solid var(--color-brand)', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>
                          Invite
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Leave team */}
          {!isOwner && (
            <button type="button" onClick={() => setConfirmAction({ type: 'leave' })} style={btnStyle('danger')}>
              Leave team
            </button>
          )}
        </section>
      )}

      {/* ── Danger zone ───────────────────────────────────────── */}
      <section style={{ paddingTop: 32, borderTop: '1px solid var(--edge)' }}>
        <button type="button" onClick={handleSignOut} style={{
          padding: '8px 16px', fontSize: 13, fontWeight: 500,
          border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
          background: 'transparent', color: 'var(--color-text-tertiary)',
        }}>
          Sign out
        </button>
      </section>

      {/* ── Confirmation dialog ────────────────────────────────── */}
      {confirmAction && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)',
        }}
          onClick={() => setConfirmAction(null)}
        >
          <div style={{
            background: 'var(--color-surface)', borderRadius: 16, padding: 24,
            maxWidth: 340, width: '90%', boxShadow: '0 16px 48px rgba(0,0,0,0.16)',
          }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-serif)', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
              {confirmAction.type === 'remove' ? 'Remove member' : confirmAction.type === 'revoke' ? 'Revoke invite' : 'Leave team'}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 24px', lineHeight: 1.5 }}>
              {confirmAction.type === 'remove'
                ? `${(confirmAction.target as WorkspaceMember)?.display_name || (confirmAction.target as WorkspaceMember)?.email} will lose access to this team. This can't be undone.`
                : confirmAction.type === 'revoke'
                  ? `The invite to ${(confirmAction.target as WorkspaceInvite)?.email} will be cancelled.`
                  : "You'll lose access to this team and its contacts. You'll need a new invite to rejoin."}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setConfirmAction(null)} style={btnStyle('secondary')}>Cancel</button>
              <button type="button" onClick={handleConfirmedAction} style={btnStyle('danger')}>
                {confirmAction.type === 'remove' ? 'Remove' : confirmAction.type === 'revoke' ? 'Revoke' : 'Leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
