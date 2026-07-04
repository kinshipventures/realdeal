import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspace, type Workspace } from '@/contexts/WorkspaceContext'
import { PROVIDERS, getProviderKey, setProviderKey } from '@/lib/meeting-sync'
import { PreferencesTab } from './PreferencesTab'
import { GoogleIntegrationSettings } from './GoogleIntegrationSettings'
import { PropertiesTab } from './PropertiesTab'
import { SharingPermissionsTab } from './SharingPermissionsTab'
import {
  fetchWorkspaceMembers, fetchPendingInvites, createWorkspaceInvite,
  revokeInvite, removeMember, invalidateAllCaches,
  fetchIncomingWorkspaceInvites, acceptWorkspaceInvite, declineIncomingWorkspaceInvite,
  type WorkspaceMember, type WorkspaceInvite, type IncomingWorkspaceInvite,
} from '@/lib/supabase-data'
import { setActiveWorkspaceId } from '@/lib/workspace'
import {
  buildActivityChanges,
  describeWorkspaceActivity,
  fetchWorkspaceActivityEvents,
  queueWorkspaceActivityEvent,
  summarizeActivityChanges,
  WORKSPACE_ACTIVITY_ACTION_OPTIONS,
  WORKSPACE_ACTIVITY_ENTITY_OPTIONS,
  type WorkspaceActivityEvent,
  type WorkspaceActivityFilters,
} from '@/lib/workspaceActivity'

type SettingsTab = 'profile' | 'preferences' | 'properties' | 'sharing' | 'integrations' | 'team'
const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'properties', label: 'Properties' },
  { id: 'sharing', label: 'Sharing & Permissions' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'team', label: 'Team' },
]

function workspaceAccountEmail(workspace: Workspace, fallbackEmail?: string | null): string {
  return workspace.account_email || (workspace.role === 'owner' ? fallbackEmail || '' : '')
}

function workspaceAccountType(workspace: Workspace): string {
  return workspace.role === 'owner' ? 'Personal account' : 'Team workspace'
}

export function AccountPage() {
  const { session } = useAuth()
  const { workspaces, activeWorkspace, refreshWorkspaces, switchWorkspace } = useWorkspace()
  const navigate = useNavigate()
  const [tab, setTab] = useState<SettingsTab>('profile')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Team state
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [invites, setInvites] = useState<WorkspaceInvite[]>([])
  const [incomingInvites, setIncomingInvites] = useState<IncomingWorkspaceInvite[]>([])
  const [incomingInviteActionId, setIncomingInviteActionId] = useState<string | null>(null)
  const [incomingInviteMessage, setIncomingInviteMessage] = useState('')
  const [activityEvents, setActivityEvents] = useState<WorkspaceActivityEvent[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState('')
  const [activityFilters, setActivityFilters] = useState<WorkspaceActivityFilters>({
    entityType: 'all',
    action: 'all',
  })
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteSending, setInviteSending] = useState(false)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [wsName, setWsName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ type: 'remove' | 'revoke' | 'leave'; target?: WorkspaceMember | WorkspaceInvite } | null>(null)
  const [domainUsers, setDomainUsers] = useState<{ id: string; display_name: string; email: string }[]>([])

  const myRole = activeWorkspace?.role ?? 'member'
  const isOwner = myRole === 'owner'
  const canManage = Boolean(activeWorkspace)
  const canInvite = Boolean(activeWorkspace)

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

  useEffect(() => {
    if (tab !== 'team' || !activeWorkspace?.id) return
    loadWorkspaceActivity()
  }, [
    tab,
    activeWorkspace?.id,
    activityFilters.actorUserId,
    activityFilters.entityType,
    activityFilters.action,
    activityFilters.search,
    activityFilters.dateFrom,
    activityFilters.dateTo,
  ])

  useEffect(() => {
    if (!session?.user?.email || !canInvite) return
    const domain = session.user.email.split('@')[1]
    if (!domain || ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'].includes(domain)) return
    supabase.rpc('find_users_by_email_domain', { _domain: domain })
      .then(({ data }) => {
        if (data) {
          const memberIds = new Set(members.map(m => m.user_id))
          const invitedEmails = new Set(invites.map(i => i.email.toLowerCase()))
          setDomainUsers((data as any[]).filter(u => !memberIds.has(u.id) && !invitedEmails.has(u.email?.toLowerCase())))
        }
      })
  }, [session?.user?.email, canInvite, members, invites])

  async function loadWorkspaceData() {
    if (!activeWorkspace) return
    setInviteError('')
    try {
      const [m, inv] = await Promise.all([
        fetchWorkspaceMembers(activeWorkspace.id),
        fetchPendingInvites(activeWorkspace.id),
      ])
      setMembers(m)
      setInvites(inv)
      setIncomingInvites(await fetchIncomingWorkspaceInvites(session?.user?.email))
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to load team data')
    }
  }

  async function loadWorkspaceActivity() {
    if (!activeWorkspace) return
    setActivityLoading(true)
    setActivityError('')
    try {
      setActivityEvents(await fetchWorkspaceActivityEvents(activeWorkspace.id, activityFilters))
    } catch (err) {
      setActivityError(err instanceof Error ? err.message : 'Failed to load team activity')
    } finally {
      setActivityLoading(false)
    }
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
    invalidateAllCaches()
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleSaveWsName = async () => {
    if (!activeWorkspace || !wsName.trim()) return
    const nextName = wsName.trim()
    await supabase.from('workspaces').update({ name: nextName }).eq('id', activeWorkspace.id)
    queueWorkspaceActivityEvent({
      workspaceId: activeWorkspace.id,
      action: 'renamed',
      entityType: 'workspace',
      entityId: activeWorkspace.id,
      entityLabel: nextName,
      changes: buildActivityChanges({ name: nextName }),
    })
    setEditingName(false)
    refreshWorkspaces()
    loadWorkspaceActivity()
  }

  const handleInvite = async () => {
    if (!activeWorkspace || !inviteEmail.trim()) return
    setInviteSending(true)
    setInviteError('')
    try {
      const invite = await createWorkspaceInvite(activeWorkspace.id, inviteEmail.trim(), 'member')
      setInviteEmail('')
      setInvites(prev => [invite, ...prev])
      loadWorkspaceActivity()
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
        loadWorkspaceActivity()
      } else if (type === 'remove' && target && activeWorkspace) {
        await removeMember(target.id, activeWorkspace.id)
        setMembers(prev => prev.filter(m => m.id !== target.id))
        loadWorkspaceActivity()
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

  const handleAcceptIncomingInvite = async (invite: IncomingWorkspaceInvite) => {
    setIncomingInviteActionId(invite.id)
    setIncomingInviteMessage('')
    setInviteError('')
    try {
      const data = await acceptWorkspaceInvite(invite.token)
      setIncomingInvites(prev => prev.filter(item => item.id !== invite.id))
      if (data.workspace_id) {
        setActiveWorkspaceId(data.workspace_id)
        await refreshWorkspaces()
        switchWorkspace(data.workspace_id)
      } else {
        await refreshWorkspaces()
      }
      setIncomingInviteMessage(`Joined ${data.workspace_name || invite.workspace_name || 'workspace'}.`)
      await loadWorkspaceData()
      await loadWorkspaceActivity()
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to accept invite')
    } finally {
      setIncomingInviteActionId(null)
    }
  }

  const handleDeclineIncomingInvite = async (invite: IncomingWorkspaceInvite) => {
    setIncomingInviteActionId(invite.id)
    setIncomingInviteMessage('')
    setInviteError('')
    try {
      await declineIncomingWorkspaceInvite(invite.id)
      setIncomingInvites(prev => prev.filter(item => item.id !== invite.id))
      setIncomingInviteMessage(`Declined ${invite.workspace_name || 'workspace'} invite.`)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to decline invite')
    } finally {
      setIncomingInviteActionId(null)
    }
  }

  const handleWorkspaceSelect = (workspaceId: string) => {
    if (!workspaceId || workspaceId === activeWorkspace?.id) return
    setInviteError('')
    setIncomingInviteMessage('')
    switchWorkspace(workspaceId)
  }

  const labelStyle = { fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 } as const
  const inputStyle = {
    width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 8,
    border: '1px solid var(--edge)', background: 'transparent',
    color: 'var(--color-text-primary)', fontFamily: 'inherit', outline: 'none',
  } as const
  const selectStyle = {
    padding: '10px 12px', fontSize: 13, borderRadius: 8,
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
      fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-sans)',
      color: 'var(--color-text-primary)', margin: '0 0 20px',
      letterSpacing: '-0.01em',
    }}>{text}</h2>
  )

  return (
    <div style={{ maxWidth: tab === 'properties' || tab === 'sharing' || tab === 'team' ? 980 : 480, margin: '0 auto', padding: '48px 24px 80px' }}>
      <h1 style={{
        fontSize: 24, fontWeight: 800, marginBottom: 24,
        fontFamily: 'var(--font-sans)', letterSpacing: '-0.02em',
      }}>Settings</h1>

      {/* ── Tab bar ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 32,
        borderBottom: '1px solid var(--edge)',
      }}>
        {TABS.map(t => {
          const active = t.id === tab
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 16px', fontSize: 13, fontWeight: active ? 600 : 400,
                fontFamily: 'inherit', cursor: 'pointer', minHeight: 44,
                border: 'none', background: 'transparent',
                color: active ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                borderBottom: active ? '2px solid var(--color-brand)' : '2px solid transparent',
                transition: 'color 0.15s, border-color 0.15s',
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Profile tab ───────────────────────────────────────── */}
      {tab === 'profile' && (
        <>
          <section style={{ marginBottom: 40 }}>
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

          <section style={{ paddingTop: 32, borderTop: '1px solid var(--edge)' }}>
            <button type="button" onClick={handleSignOut} style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 500,
              border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
              background: 'transparent', color: 'var(--color-text-tertiary)',
            }}>
              Sign out
            </button>
          </section>
        </>
      )}

      {/* ── Preferences tab ───────────────────────────────────── */}
      {tab === 'preferences' && <PreferencesTab />}

      {tab === 'properties' && <PropertiesTab />}

      {tab === 'sharing' && <SharingPermissionsTab />}

      {/* ── Integrations tab ──────────────────────────────────── */}
      {tab === 'integrations' && (
        <section>
          {sectionHeading('Google Workspace')}
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>
            Connect and manage Google for Gmail activity sync, Calendar visibility, and daily Today Focus emails.
          </p>
          <GoogleIntegrationSettings />
          {sectionHeading('Meeting Notes')}
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>
            Connect AI meeting note apps to automatically log meetings on each person's timeline.
          </p>
          <MeetingNotesSettings />
        </section>
      )}

      {/* Team tab */}
      {tab === 'team' && activeWorkspace && (
        <section>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 24px', lineHeight: 1.5, maxWidth: 720 }}>
            Team members can choose this workspace at sign-in and work here with full access using their own login.
          </p>

          <div style={{ marginBottom: 24 }}>
            <span style={labelStyle}>Active workspace</span>
            <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '0 0 10px', lineHeight: 1.45 }}>
              Real Deal loads one workspace at a time. Choose the account you want to use before working here.
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              {workspaces.map(workspace => {
                const isCurrent = workspace.id === activeWorkspace.id
                const accountEmail = workspaceAccountEmail(workspace, session?.user?.email)
                return (
                  <button
                    key={workspace.id}
                    type="button"
                    onClick={() => handleWorkspaceSelect(workspace.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: `1px solid ${isCurrent ? 'var(--color-brand)' : 'var(--edge)'}`,
                      background: isCurrent ? 'rgba(37,99,235,0.06)' : 'transparent',
                      color: 'var(--color-text-primary)',
                      cursor: isCurrent ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      flexShrink: 0,
                      background: isCurrent ? 'var(--color-brand)' : 'var(--tint)',
                      color: isCurrent ? '#fff' : 'var(--color-brand)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                    }}>
                      {workspace.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0 }}>
                        Use account of
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {accountEmail || workspace.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {workspaceAccountType(workspace)} - {workspace.name}
                      </div>
                    </div>
                    {isCurrent && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-brand)', background: 'rgba(37,99,235,0.1)', borderRadius: 999, padding: '4px 8px', whiteSpace: 'nowrap' }}>
                        Current
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

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

          {/* Incoming invites */}
          {incomingInvites.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <span style={labelStyle}>Invitations for you ({incomingInvites.length})</span>
              <div style={{ borderRadius: 10, border: '1px solid var(--edge)', overflow: 'hidden' }}>
                {incomingInvites.map(invite => {
                  const busy = incomingInviteActionId === invite.id
                  const inviterName = invite.invited_by_display_name?.trim()
                  const inviterEmail = invite.invited_by_email?.trim()
                  const inviterLabel = inviterName && inviterEmail
                    ? `${inviterName} (${inviterEmail})`
                    : inviterEmail || inviterName || 'a Real Deal workspace member'
                  const sentDate = invite.created_at
                    ? new Date(invite.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : null
                  return (
                    <div key={invite.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      borderBottom: '1px solid var(--divider)',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 2 }}>
                          Workspace invitation
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {invite.workspace_name || 'Workspace invite'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          From {inviterLabel}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Full access invite for {invite.email}{sentDate ? ` - Sent ${sentDate}` : ''}
                        </div>
                      </div>
                      <button type="button" onClick={() => handleAcceptIncomingInvite(invite)} disabled={busy}
                        style={{ ...btnStyle('primary'), padding: '5px 10px', fontSize: 11, opacity: busy ? 0.6 : 1 }}>
                        {busy ? 'Joining...' : 'Accept'}
                      </button>
                      <button type="button" onClick={() => handleDeclineIncomingInvite(invite)} disabled={busy}
                        style={{ padding: '5px 10px', fontSize: 11, color: 'var(--color-text-secondary)', background: 'none', border: '1px solid var(--edge)', borderRadius: 6, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                        Decline
                      </button>
                    </div>
                  )
                })}
              </div>
              {incomingInviteMessage && <p style={{ fontSize: 12, color: 'var(--health-cooling)', marginTop: 6, marginBottom: 0 }}>{incomingInviteMessage}</p>}
            </div>
          )}

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
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: member.role === 'owner' ? 'var(--color-brand)' : 'var(--health-cooling)',
                    background: member.role === 'owner' ? 'rgba(37,99,235,0.08)' : 'rgba(34,197,94,0.1)',
                    borderRadius: 999,
                    padding: '4px 8px',
                    whiteSpace: 'nowrap',
                  }}>
                    {member.role === 'owner' ? 'Owner' : 'Full access'}
                  </span>
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
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--health-cooling)', background: 'rgba(34,197,94,0.1)', borderRadius: 999, padding: '4px 8px', whiteSpace: 'nowrap' }}>Full access</span>
                    {copiedLink === invite.id ? (
                      <span style={{ fontSize: 11, color: 'var(--color-brand)', fontWeight: 500 }}>Link copied!</span>
                    ) : (
                      <button type="button" onClick={async () => {
                        const link = `${window.location.origin}/invite?token=${invite.token}`
                        try { await navigator.clipboard.writeText(link) } catch { /* fallback */ }
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

          <div style={{ paddingTop: 28, borderTop: '1px solid var(--edge)', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
              <div>
                <span style={labelStyle}>Activity record</span>
                <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>
                  Track who changed contacts, companies, pods, sub-pods, campaigns, touchpoints, and team access.
                </p>
              </div>
              <button type="button" onClick={loadWorkspaceActivity} style={btnStyle('secondary')}>
                Refresh
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 12 }}>
              <input
                value={activityFilters.search ?? ''}
                onChange={e => setActivityFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Search activity"
                style={inputStyle}
              />
              <select
                value={activityFilters.actorUserId ?? ''}
                onChange={e => setActivityFilters(prev => ({ ...prev, actorUserId: e.target.value || undefined }))}
                style={selectStyle}
              >
                <option value="">All members</option>
                {members.map(member => (
                  <option key={member.user_id} value={member.user_id}>{member.display_name || member.email || 'Unknown'}</option>
                ))}
              </select>
              <select
                value={activityFilters.entityType ?? 'all'}
                onChange={e => setActivityFilters(prev => ({ ...prev, entityType: e.target.value as any }))}
                style={selectStyle}
              >
                {WORKSPACE_ACTIVITY_ENTITY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select
                value={activityFilters.action ?? 'all'}
                onChange={e => setActivityFilters(prev => ({ ...prev, action: e.target.value as any }))}
                style={selectStyle}
              >
                {WORKSPACE_ACTIVITY_ACTION_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <input
                type="datetime-local"
                aria-label="Activity from date and time"
                value={activityFilters.dateFrom ?? ''}
                onChange={e => setActivityFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined }))}
                style={selectStyle}
              />
              <input
                type="datetime-local"
                aria-label="Activity to date and time"
                value={activityFilters.dateTo ?? ''}
                onChange={e => setActivityFilters(prev => ({ ...prev, dateTo: e.target.value || undefined }))}
                style={selectStyle}
              />
            </div>

            <div style={{ border: '1px solid var(--edge)', borderRadius: 10, overflow: 'hidden' }}>
              {activityLoading && (
                <div style={{ padding: 18, fontSize: 13, color: 'var(--color-text-tertiary)' }}>Loading activity...</div>
              )}
              {!activityLoading && activityError && (
                <div style={{ padding: 18, fontSize: 13, color: 'var(--health-fading)' }}>{activityError}</div>
              )}
              {!activityLoading && !activityError && activityEvents.length === 0 && (
                <div style={{ padding: 18, fontSize: 13, color: 'var(--color-text-tertiary)' }}>No team activity yet.</div>
              )}
              {!activityLoading && !activityError && activityEvents.map(event => {
                const changeSummary = summarizeActivityChanges(event)
                return (
                  <div key={event.id} style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) 160px',
                    gap: 12,
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--divider)',
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.35 }}>
                        {describeWorkspaceActivity(event)}
                      </div>
                      {changeSummary && (
                        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {changeSummary}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                      {new Date(event.created_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Leave team */}
          {!isOwner && (
            <button type="button" onClick={() => setConfirmAction({ type: 'leave' })} style={btnStyle('danger')}>
              Leave team
            </button>
          )}
        </section>
      )}

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
            <h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-sans)', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
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

function MeetingNotesSettings() {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [keyValue, setKeyValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [, forceUpdate] = useState(0)

  function handleSave(providerId: string) {
    const provider = PROVIDERS.find(p => p.id === providerId)!
    const trimmed = keyValue.trim()
    if (trimmed && !provider.validate(trimmed)) {
      setError(`Key should start with ${provider.keyPrefix}`)
      return
    }
    setProviderKey(provider, trimmed || null)
    setEditingId(null)
    setKeyValue('')
    setError(null)
    forceUpdate(n => n + 1)
  }

  function handleDisconnect(providerId: string) {
    const provider = PROVIDERS.find(p => p.id === providerId)!
    setProviderKey(provider, null)
    forceUpdate(n => n + 1)
  }

  return (
    <div style={{ borderRadius: 10, border: '1px solid var(--edge)', overflow: 'hidden' }}>
      {PROVIDERS.map(provider => {
        const connected = !!getProviderKey(provider)
        const isEditing = editingId === provider.id
        return (
          <div key={provider.id} style={{ padding: '12px 14px', borderBottom: '1px solid var(--divider)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>{provider.name}</span>
                {connected && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-brand)', background: 'rgba(37,180,57,0.08)', borderRadius: 4, padding: '1px 6px' }}>Connected</span>}
                {provider.comingSoon && !connected && <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Coming soon</span>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {!provider.comingSoon && !isEditing && (
                  <button type="button" onClick={() => { setEditingId(provider.id); setKeyValue(getProviderKey(provider) ?? '') }}
                    style={{ fontSize: 12, color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    {connected ? 'Change key' : 'Connect'}
                  </button>
                )}
                {connected && !isEditing && (
                  <button type="button" onClick={() => handleDisconnect(provider.id)}
                    style={{ fontSize: 12, color: 'var(--health-fading)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Disconnect
                  </button>
                )}
              </div>
            </div>
            {isEditing && (
              <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                <input type="password" value={keyValue} onChange={e => setKeyValue(e.target.value)}
                  placeholder={`${provider.keyPrefix}...`}
                  style={{ flex: 1, fontSize: 13, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--edge-strong)', background: 'transparent', fontFamily: 'monospace', color: 'var(--color-text-primary)', outline: 'none' }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(provider.id) }}
                  autoFocus
                />
                <button type="button" onClick={() => handleSave(provider.id)}
                  style={{ fontSize: 12, fontWeight: 600, padding: '8px 14px', borderRadius: 6, border: 'none', background: 'var(--color-brand)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                <button type="button" onClick={() => { setEditingId(null); setError(null) }}
                  style={{ fontSize: 12, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--edge)', background: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              </div>
            )}
            {isEditing && error && <p style={{ fontSize: 11, color: '#dc2626', margin: '4px 0 0' }}>{error}</p>}
          </div>
        )
      })}
    </div>
  )
}
