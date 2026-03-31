import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'

export function LoginPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    if (!session) return
    const returnTo = searchParams.get('return_to') ?? '/'
    // Guard against open redirect - only allow relative paths
    navigate(returnTo.startsWith('/') ? returnTo : '/', { replace: true })
  }, [session, navigate, searchParams])

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      fontFamily: 'var(--font-sans)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 32,
          fontWeight: 700,
          color: 'rgba(0,0,0,0.82)',
          margin: 0,
        }}>
          RealDeal
        </h1>
        <p style={{
          fontSize: 14,
          color: 'rgba(0,0,0,0.45)',
          marginTop: 8,
          margin: '8px 0 0',
        }}>
          Sign in to continue
        </p>
        <div
          id="lovable-auth"
          style={{ maxWidth: 360, width: '100%', marginTop: 32 }}
        />
      </div>
    </div>
  )
}
