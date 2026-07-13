import { useCallback, useEffect, useState } from 'react'

type AdminMe = {
  admin: boolean
  role?: string
  user?: {
    id: string | null
    email: string | null
  }
  error?: string
}

type AdminUser = {
  id: string
  email: string
  display_name: string | null
  created_at: string
  last_sign_in_at: string | null
  workspace_memberships: number
  owned_workspaces: number
}

type WaitlistEntry = {
  id: string
  email: string
  display_name: string | null
  status: string
  source: string | null
  auth_user_id: string | null
  decided_at: string | null
  invite_sent_at: string | null
  created_at: string
}

type AuditEvent = {
  id: string
  actor_email: string | null
  action: string
  target_type: string
  target_id: string | null
  created_at: string
}

type DeletePreview = {
  user: {
    id: string
    email: string
    created_at: string
    last_sign_in_at: string | null
  }
  counts: Record<string, number>
  warning: string
}

type AdminTab = 'users' | 'waitlist' | 'audit'

function formatDate(value: string | null | undefined) {
  if (!value) return 'Never'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ')
}

export default function AdminPage() {
  const [me, setMe] = useState<AdminMe | null>(null)
  const [tab, setTab] = useState<AdminTab>('users')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([])
  const [audit, setAudit] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deletePreview, setDeletePreview] = useState<DeletePreview | null>(null)
  const [deleteEmailConfirm, setDeleteEmailConfirm] = useState('')
  const [resetLink, setResetLink] = useState<string | null>(null)

  const adminFetch = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      const response = await fetch(path, {
        ...init,
        credentials: 'include',
        headers: {
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...init.headers,
        },
      })
      const payload = await response.json().catch(() => ({}))
      if (response.status === 401) window.location.assign('/admin-login')
      if (!response.ok) throw new Error(payload.error ?? 'Admin request failed')
      return payload as T
    },
    [],
  )

  const loadUsers = useCallback(async () => {
    const payload = await adminFetch<{ users: AdminUser[] }>('/api/admin/users')
    setUsers(payload.users)
  }, [adminFetch])

  const loadWaitlist = useCallback(async () => {
    const payload = await adminFetch<{ entries: WaitlistEntry[] }>('/api/admin/waitlist')
    setWaitlist(payload.entries)
  }, [adminFetch])

  const loadAudit = useCallback(async () => {
    const payload = await adminFetch<{ events: AuditEvent[] }>('/api/admin/audit')
    setAudit(payload.events)
  }, [adminFetch])

  const refresh = useCallback(async () => {
    setError(null)
    setMessage(null)
    await Promise.all([loadUsers(), loadWaitlist(), loadAudit()])
  }, [loadAudit, loadUsers, loadWaitlist])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    adminFetch<AdminMe>('/api/admin/me')
      .then(async payload => {
        if (cancelled) return
        setMe(payload)
        await refresh()
      })
      .catch(err => {
        if (cancelled) return
        setMe({ admin: false, error: err instanceof Error ? err.message : 'Admin access required' })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [adminFetch, refresh])

  const logout = () => {
    void fetch('/api/admin/me', { method: 'DELETE', credentials: 'include' })
      .finally(() => window.location.assign('/admin-login'))
  }

  const runAction = async (key: string, action: () => Promise<void>) => {
    setBusy(key)
    setError(null)
    setMessage(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(null)
    }
  }

  const previewDelete = (user: AdminUser) =>
    runAction(`preview-${user.id}`, async () => {
      const payload = await adminFetch<{ preview: DeletePreview }>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete_preview', target_user_id: user.id }),
      })
      setDeletePreview(payload.preview)
      setDeleteEmailConfirm('')
      setResetLink(null)
    })

  const deleteAccount = () => {
    if (!deletePreview) return
    void runAction(`delete-${deletePreview.user.id}`, async () => {
      await adminFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete_confirm',
          target_user_id: deletePreview.user.id,
          confirm_email: deleteEmailConfirm,
        }),
      })
      setMessage(`Deleted ${deletePreview.user.email}`)
      setDeletePreview(null)
      setDeleteEmailConfirm('')
      await refresh()
    })
  }

  const resetPassword = (user: AdminUser) =>
    runAction(`reset-${user.id}`, async () => {
      const payload = await adminFetch<{ email: string; action_link: string | null }>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ action: 'reset_password', target_user_id: user.id }),
      })
      setResetLink(payload.action_link)
      setMessage(`Recovery link created for ${payload.email}`)
      setDeletePreview(null)
    })

  const approveWaitlist = (entry: WaitlistEntry) =>
    runAction(`approve-${entry.id}`, async () => {
      await adminFetch('/api/admin/waitlist', {
        method: 'POST',
        body: JSON.stringify({ action: 'approve_waitlist_entry', id: entry.id }),
      })
      setMessage(`Invite prepared for ${entry.email}`)
      await refresh()
    })

  const denyWaitlist = (entry: WaitlistEntry) =>
    runAction(`deny-${entry.id}`, async () => {
      await adminFetch('/api/admin/waitlist', {
        method: 'POST',
        body: JSON.stringify({ action: 'deny_waitlist_entry', id: entry.id }),
      })
      setMessage(`Denied ${entry.email}`)
      await refresh()
    })

  if (loading) {
    return <main className="admin-portal"><div className="admin-panel">Loading admin console...</div></main>
  }

  if (!me?.admin) {
    return (
      <main className="admin-portal admin-portal-centered">
        <section className="admin-panel admin-access-denied">
          <p className="admin-eyebrow">Real Deal Admin</p>
          <h1>Access restricted</h1>
          <p>{me?.error ?? 'This page is only available to platform admins.'}</p>
          <a className="admin-secondary-button" href="/admin-login">Admin sign in</a>
        </section>
      </main>
    )
  }

  return (
    <main className="admin-portal">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">Real Deal Admin</p>
          <h1>Admin console</h1>
          <p>Manage platform accounts, waitlist approvals, password recovery, and admin audit history.</p>
        </div>
        <div className="admin-header-actions">
          <span>{me.user?.email}</span>
          <button type="button" className="admin-secondary-button" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <nav className="admin-tabs" aria-label="Admin sections">
        {(['users', 'waitlist', 'audit'] as AdminTab[]).map(nextTab => (
          <button
            key={nextTab}
            type="button"
            className={tab === nextTab ? 'admin-tab admin-tab-active' : 'admin-tab'}
            onClick={() => setTab(nextTab)}
          >
            {nextTab === 'users' ? 'Users' : nextTab === 'waitlist' ? 'Waitlist' : 'Audit'}
          </button>
        ))}
        <button type="button" className="admin-secondary-button" onClick={() => void refresh()}>
          Refresh
        </button>
      </nav>

      {message && <div className="admin-message admin-message-ok">{message}</div>}
      {error && <div className="admin-message admin-message-error">{error}</div>}
      {resetLink && (
        <section className="admin-panel">
          <h2>Password recovery link</h2>
          <textarea readOnly value={resetLink} className="admin-copy-field" />
        </section>
      )}

      {deletePreview && (
        <section className="admin-panel admin-danger-panel">
          <div>
            <p className="admin-eyebrow">Delete preview</p>
            <h2>{deletePreview.user.email}</h2>
            <p>{deletePreview.warning}</p>
          </div>
          <div className="admin-count-grid">
            {Object.entries(deletePreview.counts).map(([label, count]) => (
              <div key={label} className="admin-count-card">
                <strong>{count}</strong>
                <span>{label.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
          <label className="admin-label">
            Type the user email to permanently delete this account
            <input value={deleteEmailConfirm} onChange={event => setDeleteEmailConfirm(event.target.value)} />
          </label>
          <button
            type="button"
            className="admin-danger-button"
            disabled={deleteEmailConfirm.trim().toLowerCase() !== deletePreview.user.email || busy === `delete-${deletePreview.user.id}`}
            onClick={deleteAccount}
          >
            Permanently delete account
          </button>
        </section>
      )}

      {tab === 'users' && (
        <section className="admin-panel">
          <div className="admin-section-heading">
            <div>
              <h2>Users</h2>
              <p>Manual admin actions. Deletion requires a preview and exact email confirmation.</p>
            </div>
            <span>{users.length} shown</span>
          </div>
          <div className="admin-table">
            <div className="admin-table-row admin-table-head">
              <span>User</span>
              <span>Workspaces</span>
              <span>Last sign in</span>
              <span>Actions</span>
            </div>
            {users.map(user => (
              <div key={user.id} className="admin-table-row">
                <span>
                  <strong>{user.display_name || user.email || 'Unnamed user'}</strong>
                  <small>{user.email}</small>
                </span>
                <span>
                  <strong>{user.owned_workspaces}</strong>
                  <small>{user.workspace_memberships} memberships</small>
                </span>
                <span>{formatDate(user.last_sign_in_at)}</span>
                <span className="admin-row-actions">
                  <button type="button" onClick={() => resetPassword(user)} disabled={busy === `reset-${user.id}`}>
                    Reset password
                  </button>
                  <button type="button" onClick={() => previewDelete(user)} disabled={busy === `preview-${user.id}`}>
                    Preview deletion
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'waitlist' && (
        <section className="admin-panel">
          <div className="admin-section-heading">
            <div>
              <h2>Waitlist</h2>
              <p>Waitlist signups stay pending until an admin explicitly approves and invites them.</p>
            </div>
            <span>{waitlist.length} entries</span>
          </div>
          <div className="admin-table">
            <div className="admin-table-row admin-table-head">
              <span>Person</span>
              <span>Status</span>
              <span>Submitted</span>
              <span>Actions</span>
            </div>
            {waitlist.map(entry => (
              <div key={entry.id} className="admin-table-row">
                <span>
                  <strong>{entry.display_name || entry.email}</strong>
                  <small>{entry.email}</small>
                </span>
                <span className={`admin-status admin-status-${entry.status}`}>{statusLabel(entry.status)}</span>
                <span>{formatDate(entry.created_at)}</span>
                <span className="admin-row-actions">
                  <button type="button" onClick={() => approveWaitlist(entry)} disabled={busy === `approve-${entry.id}` || entry.status === 'denied'}>
                    Approve and invite
                  </button>
                  <button type="button" onClick={() => denyWaitlist(entry)} disabled={busy === `deny-${entry.id}` || entry.status === 'denied'}>
                    Deny
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'audit' && (
        <section className="admin-panel">
          <div className="admin-section-heading">
            <div>
              <h2>Audit history</h2>
              <p>Recent admin actions recorded by the isolated admin endpoints.</p>
            </div>
            <span>{audit.length} events</span>
          </div>
          <div className="admin-table">
            <div className="admin-table-row admin-table-head">
              <span>Action</span>
              <span>Actor</span>
              <span>Target</span>
              <span>Created</span>
            </div>
            {audit.map(event => (
              <div key={event.id} className="admin-table-row">
                <span>{event.action}</span>
                <span>{event.actor_email ?? 'System'}</span>
                <span>
                  <strong>{event.target_type}</strong>
                  <small>{event.target_id}</small>
                </span>
                <span>{formatDate(event.created_at)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
