import { Navigate } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { isDemoMode } from '@/lib/sampleData'
import { LandingPage } from './LandingPage'

export function LandingRedirect() {
  const { session, loading } = useAuth()

  if (loading) return null
  if (session || isDemoMode()) return <Navigate to="/pods" replace />
  return <LandingPage />
}
