import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { isDemoMode } from '@/lib/sampleData'
import { SplashScreen } from './SplashScreen'

export function RequireAuth() {
  const { session, loading: authLoading } = useAuth()
  const { loading: wsLoading } = useWorkspace()
  const location = useLocation()

  if (isDemoMode()) return <Outlet />
  if (authLoading || wsLoading) return <SplashScreen />
  if (!session) {
    const returnTo = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?return_to=${returnTo}`} replace />
  }
  return <Outlet />
}
