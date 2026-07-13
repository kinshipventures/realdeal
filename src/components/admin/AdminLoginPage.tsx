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
      const response = await fetch('/api/admin/login', {
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
    <main className="admin-portal admin-portal-centered">
      <section className="admin-panel admin-login-panel">
        <p className="admin-eyebrow">Real Deal Admin</p>
        <h1>Admin sign in</h1>
        <p>Use the dedicated admin credentials for platform administration.</p>
        {error && <div className="admin-message admin-message-error">{error}</div>}
        {checkingSession ? (
          <p>Checking admin session...</p>
        ) : (
          <form className="admin-login-form" onSubmit={submit}>
            <label className="admin-label">
              Admin email
              <input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" required />
            </label>
            <label className="admin-label">
              Password
              <input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required />
            </label>
            <button type="submit" className="admin-primary-button" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
