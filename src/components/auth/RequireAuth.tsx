import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { isDemoMode } from '@/lib/sampleData'
import { SplashScreen } from './SplashScreen'

export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (isDemoMode()) return <Outlet />
  if (loading) return <SplashScreen />
  if (!session) {
    const returnTo = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?return_to=${returnTo}`} replace />
  }
  return <Outlet />
}
