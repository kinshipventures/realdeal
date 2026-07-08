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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const syncGoogleInBackground = useCallback((nextSession: Session | null) => {
    if (!nextSession) return
    const sync = () => maybeSyncGmailActivityInBackground(nextSession.user.id).catch(() => undefined)
    if (nextSession.provider_token) {
      void saveGoogleConnection(nextSession).then(sync).catch(() => undefined)
      return
    }
    void sync()
  }, [])

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

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
