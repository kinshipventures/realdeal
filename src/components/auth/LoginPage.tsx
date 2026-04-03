import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { lovable } from '@/integrations/lovable/index'
import { setDemoMode } from '@/lib/sampleData'

export function LoginPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    })
    if (result.error) {
      setError('Sign in failed. Please try again.')
      setLoading(false)
    }
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 32,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          margin: 0,
        }}>
          RealDeal
        </h1>
        <p style={{
          fontSize: 14,
          color: 'var(--color-text-secondary)',
          margin: '8px 0 0',
        }}>
          Sign in to continue
        </p>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            marginTop: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 24px',
            borderRadius: 8,
            border: '1px solid var(--edge-strong)',
            background: '#fff',
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

        {error && (
          <p style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>{error}</p>
        )}

        <button
          onClick={() => {
            setDemoMode(true)
            window.location.href = '/'
          }}
          style={{
            marginTop: 16,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-sans)',
            padding: '8px 16px',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-tertiary)' }}
        >
          Try demo mode
        </button>
      </div>
    </div>
  )
}
