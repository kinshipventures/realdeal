import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { isDemoMode, setDemoMode } from '@/lib/sampleData'
import { maybeSyncGmailActivityInBackground, saveGoogleConnection } from '@/lib/googleIntegration'

interface AuthContextValue {
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({ session: null, loading: true })
const GMAIL_BACKGROUND_SYNC_INTERVAL_MS = 10 * 60 * 1000

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const syncGmailInBackground = useCallback((nextSession: Session | null) => {
    if (!nextSession) return
    void maybeSyncGmailActivityInBackground(nextSession.user.id).catch(() => undefined)
  }, [])

  const syncGoogleInBackground = useCallback((nextSession: Session | null) => {
    if (!nextSession) return
    if (nextSession.provider_token) {
      void saveGoogleConnection(nextSession).then(() => syncGmailInBackground(nextSession)).catch(() => undefined)
      return
    }
    syncGmailInBackground(nextSession)
  }, [syncGmailInBackground])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && isDemoMode()) setDemoMode(false)
      syncGoogleInBackground(session)
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && isDemoMode()) setDemoMode(false)
      syncGoogleInBackground(session)
      setSession(session)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [syncGoogleInBackground])

  useEffect(() => {
    if (!session) return

    const sync = () => syncGmailInBackground(session)
    const intervalId = window.setInterval(sync, GMAIL_BACKGROUND_SYNC_INTERVAL_MS)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') sync()
    }

    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [session, syncGmailInBackground])

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
