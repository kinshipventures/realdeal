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
        if (data?.workspace_id) switchWorkspace(data.workspace_id)

        setStatus('success')
        setMessage(data?.already_member ? 'You are already a member of this workspace.' : 'You have joined the workspace!')
        setTimeout(() => navigate('/'), 2000)
      } catch (err: any) {
        setStatus('error')
        setMessage(err?.message || 'Failed to accept invite.')
      }
    }
    accept()
  }, [token, session])

  if (!session) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, padding: 32, fontFamily: 'var(--font-body, system-ui)', background: 'var(--color-bg, #F5F4F0)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Sign in to accept invite</h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>You need to sign in or create an account first.</p>
        <button type="button" onClick={() => navigate(`/login?return_to=${encodeURIComponent('/invite?token=' + token)}`)}
          style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600, background: 'var(--color-brand, #7C5CFC)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          Sign in
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, padding: 32, fontFamily: 'var(--font-body, system-ui)', background: 'var(--color-bg, #F5F4F0)' }}>
      {status === 'loading' && <p style={{ fontSize: 16 }}>Accepting invite...</p>}
      {status === 'success' && (
        <>
          <div style={{ fontSize: 48 }}>&#10003;</div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#48BB78' }}>{message}</h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Redirecting...</p>
        </>
      )}
      {status === 'error' && (
        <>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#E53E3E' }}>Invite error</h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{message}</p>
          <button type="button" onClick={() => navigate('/')}
            style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600, background: 'var(--color-brand, #7C5CFC)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Go home
          </button>
        </>
      )}
    </div>
  )
}
