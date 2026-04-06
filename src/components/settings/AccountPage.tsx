import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export function AccountPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!session?.user?.id) return
    setEmail(session.user.email || '')
    supabase.from('profiles').select('display_name').eq('id', session.user.id).single()
      .then(({ data }) => { if (data?.display_name) setDisplayName(data.display_name) })
  }, [session?.user?.id])

  const handleSave = async () => {
    if (!session?.user?.id) return
    setSaving(true)
    await supabase.from('profiles').update({ display_name: displayName }).eq('id', session.user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '48px 24px', fontFamily: 'var(--font-body, system-ui)' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 32, color: 'var(--color-text-primary)' }}>Account</h1>

      <label style={{ display: 'block', marginBottom: 20 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Email</span>
        <input
          value={email}
          disabled
          style={{
            width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 8,
            border: '1px solid var(--edge)', background: 'var(--color-surface-alt, #eee)',
            color: 'var(--color-text-tertiary)', fontFamily: 'inherit',
          }}
        />
      </label>

      <label style={{ display: 'block', marginBottom: 24 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Display name</span>
        <input
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="Your name"
          style={{
            width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 8,
            border: '1px solid var(--edge)', background: 'transparent',
            color: 'var(--color-text-primary)', fontFamily: 'inherit', outline: 'none',
          }}
        />
      </label>

      <div style={{ display: 'flex', gap: 12, marginBottom: 48 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 24px', fontSize: 14, fontWeight: 600,
            background: 'var(--color-brand, #7C5CFC)', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', opacity: saving ? 0.6 : 1,
          }}
        >
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div style={{ borderTop: '1px solid var(--edge)', paddingTop: 24 }}>
        <button
          type="button"
          onClick={handleSignOut}
          style={{
            padding: '10px 24px', fontSize: 14, fontWeight: 500,
            background: 'transparent', color: '#E53E3E',
            border: '1px solid #E53E3E', borderRadius: 8, cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
