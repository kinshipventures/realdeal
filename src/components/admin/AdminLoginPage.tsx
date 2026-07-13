import { type FormEvent, useEffect, useState } from 'react'

type AdminLoginResponse = {
  admin: boolean
  error?: string
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState('adminrealdeal@admin.com')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/me', { credentials: 'include' })
      .then(async response => {
        if (!response.ok) return null
        return response.json() as Promise<AdminLoginResponse>
      })
      .then(payload => {
        if (!cancelled && payload?.admin) window.location.assign('/admin')
      })
      .finally(() => {
        if (!cancelled) setCheckingSession(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/me', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const payload = await response.json().catch(() => ({})) as AdminLoginResponse
      if (!response.ok || !payload.admin) throw new Error(payload.error ?? 'Admin sign in failed')
      window.location.assign('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="admin-auth-page">
      <div className="admin-auth-shell">
        <section className="admin-auth-story">
          <div>
            <h1>Keep your people warm.</h1>
            <p>Start the day with a clean read on your people.</p>
          </div>

          <div className="admin-auth-stage">
            <div className="admin-auth-note admin-auth-note-top">
              <strong>Private access</strong>
              <span>Owner tools stay separated from the regular app.</span>
            </div>
            <div className="admin-auth-note admin-auth-note-right">
              <strong>Clean controls</strong>
              <span>Users and waitlist decisions stay easy to scan.</span>
            </div>
            <div className="admin-auth-orb" aria-hidden="true">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
          </div>
        </section>

        <section className="admin-auth-panel-wrap">
          <div className="admin-auth-panel">
            <div className="admin-auth-header">
              <h2>Admin sign in</h2>
              <p>Use the dedicated admin credentials for platform administration.</p>
            </div>

            {error && <div className="admin-auth-feedback">{error}</div>}
            {checkingSession ? (
              <p className="admin-auth-muted">Checking admin session...</p>
            ) : (
              <form className="admin-login-form" onSubmit={submit}>
                <label className="admin-login-field">
                  <span>Admin email</span>
                  <input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" required />
                </label>
                <label className="admin-login-field">
                  <span>Password</span>
                  <input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required />
                </label>
                <button type="submit" className="admin-auth-primary-button" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
