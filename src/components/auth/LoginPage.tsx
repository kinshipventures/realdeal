import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { lovable } from '@/integrations/lovable/index'
import { supabase } from '@/integrations/supabase/client'
import { setDemoMode } from '@/lib/sampleData'

// Mini orb for login hero - a single breathing health ring
function LoginOrb() {
  const size = 80
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  return (
    <svg width={size} height={size} style={{ marginBottom: 24 }}>
      {/* Ghost track */}
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--edge)" strokeWidth={3} />
      {/* Health arc - ~75% filled */}
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--color-brand)" strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
        strokeDashoffset={circ * 0.25}
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      {/* Center dot */}
      <circle cx={size / 2} cy={size / 2} r={6} fill="var(--color-brand)" opacity={0.15} />
      <circle cx={size / 2} cy={size / 2} r={3} fill="var(--color-brand)" />
    </svg>
  )
}

export function LoginPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (!session) return
    const returnTo = searchParams.get('return_to') ?? '/'
    navigate(returnTo.startsWith('/') ? returnTo : '/', { replace: true })
  }, [session, navigate, searchParams])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
      extraParams: {
        access_type: 'offline',
        prompt: 'consent',
        scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/contacts.readonly',
      },
    })
    if (result.error) {
      setError('Sign in failed. Please try again.')
      setLoading(false)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
      }
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
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      fontFamily: 'var(--font-sans)',
      color: 'var(--color-text-primary)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 320 }}>
        <LoginOrb />
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 32,
          fontWeight: 900,
          color: 'var(--color-text-primary)',
          margin: 0,
          letterSpacing: '-0.03em',
        }}>
          RealDeal
        </h1>
        <p style={{
          fontSize: 18,
          fontFamily: 'var(--font-serif)',
          fontWeight: 700,
          color: 'var(--color-text-secondary)',
          margin: '8px 0 0',
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
        }}>
          Feed what feeds you
        </p>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            marginTop: 40,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: '12px 24px',
            borderRadius: 10,
            border: '1px solid var(--edge-strong)',
            background: 'var(--color-surface)',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: 15,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-sans)',
            opacity: loading ? 0.6 : 1,
            transition: 'box-shadow 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
          onMouseEnter={e => { if (!loading) (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)') }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)' }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.06 24.06 0 0 0 0 21.56l7.98-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          margin: '20px 0',
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--edge)' }} />
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>or sign in with email</span>
          <div style={{ flex: 1, height: 1, background: 'var(--edge)' }} />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailAuth} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--color-text-primary)',
              color: 'var(--color-bg)',
              fontSize: 15,
              fontWeight: 500,
              fontFamily: 'var(--font-sans)',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.15s ease',
            }}
          >
            {loading ? 'Please wait...' : isSignUp ? 'Sign up' : 'Sign in'}
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginTop: 12 }}>
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(null) }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-sans)', padding: '4px 8px',
            }}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
          {!isSignUp && (
            <button
              onClick={async () => {
                if (!email) { setError('Enter your email first'); return }
                setLoading(true); setError(null)
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/reset-password`,
                })
                setLoading(false)
                if (error) setError(error.message)
                else setError('Check your email for a reset link')
              }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: 'var(--color-brand)',
                fontFamily: 'var(--font-sans)', padding: '4px 8px',
              }}
            >
              Forgot password?
            </button>
          )}
        </div>

        {error && (
          <p style={{ color: 'var(--health-fading)', fontSize: 13, marginTop: 8, textAlign: 'center' }}>{error}</p>
        )}

        {/* Demo - visually separated */}
        <div style={{
          marginTop: 32,
          paddingTop: 24,
          borderTop: '1px solid var(--edge)',
          width: '100%',
          textAlign: 'center',
        }}>
          <button
            onClick={() => {
              setDemoMode(true)
              window.location.href = '/'
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--color-brand)',
              fontFamily: 'var(--font-sans)',
              padding: '4px 8px',
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.7' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            Just looking? Try the demo
          </button>
        </div>
      </div>
    </div>
  )
}
