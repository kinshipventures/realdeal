import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '@/integrations/supabase/client'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [hasRecovery, setHasRecovery] = useState(false)

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event from the redirect
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasRecovery(true)
      }
    })

    // Also check URL hash for recovery type
    const hash = window.location.hash
    if (hash.includes('type=recovery')) {
      setHasRecovery(true)
    }

    return () => subscription.unsubscribe()
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      const t = setTimeout(() => navigate('/', { replace: true }), 2000)
      return () => clearTimeout(t)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid var(--edge-strong)',
    background: 'var(--color-surface)',
    fontSize: 14,
    fontFamily: 'var(--font-sans)',
    color: 'var(--color-text-primary)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)', fontFamily: 'var(--font-sans)',
      color: 'var(--color-text-primary)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 320 }}>
        <h1 style={{
          fontFamily: 'var(--font-sans)', fontSize: 24, fontWeight: 800,
          margin: '0 0 8px', letterSpacing: '-0.02em',
        }}>
          Reset password
        </h1>

        {success ? (
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
            Password updated. Redirecting...
          </p>
        ) : !hasRecovery ? (
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
            Invalid or expired reset link. <button
              onClick={() => navigate('/login')}
              style={{ background: 'none', border: 'none', color: 'var(--color-brand)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
            >Back to login</button>
          </p>
        ) : (
          <form onSubmit={handleReset} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            <input
              type="password" placeholder="New password" value={password}
              onChange={e => setPassword(e.target.value)} required minLength={6}
              style={inputStyle}
            />
            <input
              type="password" placeholder="Confirm password" value={confirm}
              onChange={e => setConfirm(e.target.value)} required minLength={6}
              style={inputStyle}
            />
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '12px', borderRadius: 8, border: 'none',
              background: 'var(--color-text-primary)', color: 'var(--color-bg)',
              fontSize: 15, fontWeight: 500, fontFamily: 'var(--font-sans)',
              cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1,
            }}>
              {loading ? 'Updating...' : 'Update password'}
            </button>
            {error && <p style={{ color: 'var(--health-fading)', fontSize: 13, textAlign: 'center' }}>{error}</p>}
          </form>
        )}
      </div>
    </div>
  )
}
