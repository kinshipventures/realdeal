import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { refreshWorkspaces, switchWorkspace } = useWorkspace()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [teamName, setTeamName] = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('No invite token provided.'); return }
    if (!session) return

    const accept = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('accept-invite', {
          body: { token },
        })
        if (error) throw error
        if (data?.error) throw new Error(data.error)

        await refreshWorkspaces()
        if (data?.workspace_id) {
          switchWorkspace(data.workspace_id)
          const email = session?.user?.email ?? ''
          const onboardKey = email ? `realdeal:onboarding-complete:${email}` : 'realdeal:onboarding-complete'
          localStorage.setItem(onboardKey, '1')
        }
        if (data?.workspace_name) setTeamName(data.workspace_name)

        setStatus('success')
        setMessage(data?.already_member ? 'You are already on this team.' : "You're in!")
        setTimeout(() => navigate('/'), 2500)
      } catch (err: any) {
        setStatus('error')
        setMessage(err?.message || 'Failed to accept invite.')
      }
    }
    accept()
  }, [token, session])

  if (!session) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, padding: 32, fontFamily: 'var(--font-sans)', background: 'var(--color-bg)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-serif)', letterSpacing: '-0.02em' }}>Sign in to join</h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: 280 }}>You need an account to accept this invite. Sign in or create one to get started.</p>
        <button type="button" onClick={() => navigate(`/login?return_to=${encodeURIComponent('/invite?token=' + token)}`)}
          style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600, background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
          Sign in
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, padding: 32, fontFamily: 'var(--font-sans)', background: 'var(--color-bg)' }}>
      {status === 'loading' && (
        <>
          <div className="spinner" style={{ width: 32, height: 32 }} />
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Joining team...</p>
        </>
      )}
      {status === 'success' && (
        <>
          {/* Brand-colored success ring */}
          <svg width="56" height="56" style={{ marginBottom: 8 }}>
            <circle cx="28" cy="28" r="24" fill="none" stroke="var(--color-brand)" strokeWidth="3" opacity="0.15" />
            <circle cx="28" cy="28" r="24" fill="none" stroke="var(--color-brand)" strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 24}`} strokeDashoffset="0"
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
            <polyline points="18,28 25,35 38,22" fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-serif)', letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
            {message}
          </h1>
          {teamName && (
            <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', margin: 0 }}>
              Welcome to <strong style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{teamName}</strong>
            </p>
          )}
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: '8px 0 0' }}>Taking you there now...</p>
        </>
      )}
      {status === 'error' && (
        <>
          <svg width="56" height="56" style={{ marginBottom: 8 }}>
            <circle cx="28" cy="28" r="24" fill="none" stroke="var(--health-fading)" strokeWidth="3" opacity="0.15" />
            <line x1="20" y1="20" x2="36" y2="36" stroke="var(--health-fading)" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="36" y1="20" x2="20" y2="36" stroke="var(--health-fading)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-serif)', letterSpacing: '-0.02em', color: 'var(--health-fading)' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: 280 }}>{message}</p>
          <button type="button" onClick={() => navigate('/')}
            style={{ marginTop: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            Go home
          </button>
        </>
      )}
    </div>
  )
}
