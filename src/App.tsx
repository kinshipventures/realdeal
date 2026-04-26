import { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Routes, Route, Outlet, useLocation, useNavigate, Navigate } from 'react-router'
import { RequireAuth } from './components/auth/RequireAuth'
import { LoginPage } from './components/auth/LoginPage'
import { isDemoMode, setDemoMode } from './lib/sampleData'
import type { Contact } from './lib/types'
import { useAuth } from './contexts/AuthContext'
import { LandingRedirect } from './components/landing/LandingRedirect'
import { LandingPage } from './components/landing/LandingPage'
import { ResetPasswordPage } from './components/auth/ResetPasswordPage'
import { WaitlistPage } from './components/waitlist/WaitlistPage'
import { Sidebar } from './components/nav/Sidebar'
import { NotFoundPage } from './components/errors/NotFoundPage'
import { ErrorBoundary } from './components/errors/ErrorBoundary'
import { SearchPalette, type SearchResult, type QuickActionId } from './components/search/SearchPalette'
import { AcceptInvitePage } from './components/settings/AcceptInvitePage'
import { SharedListPage } from './components/sharing/SharedListPage'
import { ChatPanel } from '@/components/chat/ChatPanel'

// Heavy routes — lazy loaded so they don't bloat the initial bundle
const OrbMap = lazy(() => import('./components/map/OrbMap').then(m => ({ default: m.OrbMap })))
const Dashboard = lazy(() => import('./components/dashboard/Dashboard').then(m => ({ default: m.Dashboard })))
const ImportPanel = lazy(() => import('./components/import/ImportPanel').then(m => ({ default: m.ImportPanel })))
const CategoryTable = lazy(() => import('./components/contacts/CategoryTable').then(m => ({ default: m.CategoryTable })))
const RecordPage = lazy(() => import('./components/records/RecordPage').then(m => ({ default: m.RecordPage })))
const RecordsList = lazy(() => import('./components/records/RecordsList').then(m => ({ default: m.RecordsList })))
const CreateRecordModal = lazy(() => import('./components/records/CreateRecordModal').then(m => ({ default: m.CreateRecordModal })))
const PodDetailPage = lazy(() => import('./components/pods/PodDetailPage').then(m => ({ default: m.PodDetailPage })))
const CampaignsPage = lazy(() => import('./components/campaigns/CampaignsPage').then(m => ({ default: m.CampaignsPage })))
const CampaignDetailRoute = lazy(() => import('./components/campaigns/CampaignDetailRoute').then(m => ({ default: m.CampaignDetailRoute })))
const NurturingHub = lazy(() => import('./components/nurturing/NurturingHub').then(m => ({ default: m.NurturingHub })))
const AccountPage = lazy(() => import('./components/settings/AccountPage').then(m => ({ default: m.AccountPage })))
const OnboardingFlow = lazy(() => import('./components/onboarding/OnboardingFlow').then(m => ({ default: m.OnboardingFlow })))
const LearnPage = lazy(() => import('./components/learn/LearnPage').then(m => ({ default: m.LearnPage })))
const ChangelogPage = lazy(() => import('./components/changelog/ChangelogPage').then(m => ({ default: m.ChangelogPage })))

const BG = 'var(--color-bg)'

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return mobile
}

// Pod wash color map — rgb channel strings for --pod-wash-color CSS var
const POD_WASH: Record<string, string> = {
  // maps to pod ID extracted from /pod/:id routes
  default:   '0, 61, 165',     // Arc shell blue
  talent:    '52, 177, 93',    // green
  maps:      '229, 57, 53',    // red
  lps:       '255, 107, 138',  // pink
  companies: '126, 87, 194',   // purple
  services:  '245, 166, 35',   // orange
  hub:       '44, 44, 48',     // dark
}

function usePodWash() {
  const location = useLocation()
  useEffect(() => {
    // Extract pod id from /pod/:id — fall back to 'default'
    const match = location.pathname.match(/^\/pod\/([^/]+)/)
    const podId = match?.[1] ?? 'default'
    const rgb = POD_WASH[podId] ?? POD_WASH.default
    document.documentElement.style.setProperty('--pod-wash-color', rgb)
  }, [location.pathname])
}

function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  usePodWash()
  const isPods = location.pathname === '/' || location.pathname === '/map' || location.pathname === '/pods' || location.pathname.startsWith('/pods/')
  const isRelationships = location.pathname === '/relationships' || location.pathname === '/contacts' || location.pathname.startsWith('/contact/') || location.pathname === '/companies' || location.pathname.startsWith('/category/')
  const isSettings = location.pathname === '/account'
  const isCampaigns = location.pathname.startsWith('/campaigns') || location.pathname.startsWith('/projects')
  const isDashboard = location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/')
  const isMobile = useIsMobile()
  const { session } = useAuth()
  const [demo, setDemo] = useState(isDemoMode)
  const [showSearch, setShowSearch] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [createType, setCreateType] = useState<'Contact' | 'Company' | null>(null)
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('realdeal:sidebar-collapsed') === '1'
  )
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Show onboarding for any user who hasn't completed it (scoped per user email)
  useEffect(() => {
    if (!session || isDemoMode()) return
    const email = session.user?.email ?? ''
    const key = email ? `realdeal:onboarding-complete:${email}` : 'realdeal:onboarding-complete'
    if (!localStorage.getItem(key)) setShowOnboarding(true)
  }, [session])

  const completeOnboarding = useCallback(() => {
    const email = session?.user?.email ?? ''
    const key = email ? `realdeal:onboarding-complete:${email}` : 'realdeal:onboarding-complete'
    localStorage.setItem(key, '1')
    setShowOnboarding(false)
  }, [session])

  const closeSearch = useCallback(() => setShowSearch(false), [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const toggleSidebar = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('realdeal:sidebar-collapsed', next ? '1' : '0')
  }

  const handleDemoToggle = () => {
    const next = !demo
    setDemoMode(next)
    setDemo(next)
    window.location.reload()
  }

  const showDemoControls = demo || window.location.hostname === 'localhost'

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: BG }}>
      <a href="#main-content" className="sr-only">Skip to main content</a>
      {showOnboarding && session && <OnboardingFlow onComplete={completeOnboarding} />}

      {!isMobile && (
        <Sidebar
          collapsed={collapsed}
          onToggle={toggleSidebar}
          onSearch={() => setShowSearch(true)}
          demo={demo}
          onDemoToggle={showDemoControls ? handleDemoToggle : undefined}
        />
      )}

      <div id="main-content" style={{
        paddingLeft: isMobile ? 0 : (collapsed ? 56 : 220),
        paddingBottom: isMobile ? 56 : 0,
        height: '100%',
        transition: isMobile ? undefined : 'padding-left 0.2s cubic-bezier(0.215, 0.61, 0.355, 1)',
      }}>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </div>

      {isMobile && (
        /* Mobile -- fixed bottom tab bar (HIG: 49pt + safe area) */
        <nav
          role="navigation"
          aria-label="Main navigation"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 49,
            zIndex: 100,
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'flex-start',
            paddingTop: 6,
            background: 'var(--color-surface)',
            borderTop: '0.5px solid var(--edge)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <MobileTab active={isPods} label="Pods" onClick={() => navigate('/pods')}>
            <circle cx="12" cy="12" r="3" fill={isPods ? 'currentColor' : 'none'}/>
            <line x1="12" y1="3" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="21"/>
            <line x1="3" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="21" y2="12"/>
          </MobileTab>
          <MobileTab active={isDashboard} label="Dashboard" onClick={() => navigate('/dashboard')}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </MobileTab>
          <MobileTab active={isRelationships} label="People" onClick={() => navigate('/relationships')}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </MobileTab>
          <MobileTab active={isCampaigns} label="Campaigns" onClick={() => navigate('/campaigns')}>
            <rect x="2" y="3" width="5" height="18" rx="1" fill={isCampaigns ? 'currentColor' : 'none'}/>
            <rect x="9.5" y="6" width="5" height="15" rx="1" fill={isCampaigns ? 'currentColor' : 'none'}/>
            <rect x="17" y="9" width="5" height="12" rx="1" fill={isCampaigns ? 'currentColor' : 'none'}/>
          </MobileTab>
          <MobileTab active={false} label="Search" onClick={() => setShowSearch(true)}>
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </MobileTab>
          <MobileTab active={isSettings} label="Settings" onClick={() => navigate('/account')}>
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </MobileTab>
        </nav>
      )}

      {showSearch && (
        <SearchPalette
          onClose={closeSearch}
          onSelect={(result: SearchResult) => {
            setShowSearch(false)
            const routes: Record<string, string> = {
              contact: `/contact/${result.id}`,
              company: `/contact/${result.id}`,
              pod: `/pod/${result.id}`,
              pipeline: '/campaigns',
              project: '/campaigns',
              campaign: '/campaigns',
            }
            navigate(routes[result.type] || '/')
          }}
          onQuickAction={(action: QuickActionId) => {
            setShowSearch(false)
            if (action === 'create-contact') {
              setCreateType('Contact')
              setShowCreate(true)
            } else if (action === 'create-company') {
              setCreateType('Company')
              setShowCreate(true)
            } else if (action === 'new-campaign') {
              navigate('/campaigns')
            } else if (action === 'import') {
              navigate('/import')
            }
          }}
          onSelectContact={(contact) => {
            setShowSearch(false)
            if (isPods && contact.list_ids.length > 0) {
              window.dispatchEvent(new CustomEvent('map:highlight-pods', { detail: contact.list_ids }))
            } else {
              navigate(`/contact/${contact.id}`)
            }
          }}
        />
      )}

      <CreateRecordModal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setCreateType(null) }}
        onCreated={(_contact: Contact) => { setShowCreate(false); setCreateType(null) }}
        initialType={createType}
      />

      {/* Demo data toggle - mobile only (desktop uses sidebar) */}
      {isMobile && showDemoControls && (
        <button
          type="button"
          onClick={handleDemoToggle}
          style={{
            position: 'fixed',
            bottom: 56,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            padding: '4px 12px',
            borderRadius: 100,
            border: `1px solid ${demo ? 'var(--color-brand)' : 'var(--edge)'}`,
            background: demo ? 'rgba(37,180,57,0.08)' : 'var(--nav-bg)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            fontSize: 10,
            fontWeight: 500,
            fontFamily: 'inherit',
            color: demo ? 'var(--color-brand)' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {demo ? 'demo on' : 'demo off'}
        </button>
      )}

      <ChatPanel />
    </div>
  )
}

function MobileTab({ active, label, onClick, children }: {
  active: boolean; label: string; onClick: () => void; children: React.ReactNode
}) {
  const color = active ? 'var(--color-brand)' : 'var(--text-muted)'
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer',
        minWidth: 44, minHeight: 44,
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24"
        fill={active && label !== 'Search' ? color : 'none'}
        stroke={color} strokeWidth={active ? '2' : '1.5'} strokeLinecap="round" strokeLinejoin="round"
      >
        {children}
      </svg>
      <span style={{ fontSize: 10, fontWeight: active ? 600 : 500, color, letterSpacing: '0.01em' }}>{label}</span>
    </button>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="reset-password" element={<ResetPasswordPage />} />
      <Route path="waitlist" element={<WaitlistPage />} />
      <Route path="landing" element={<LandingPage />} />
      <Route path="s/:token" element={<SharedListPage />} />
      <Route path="map" element={<Navigate to="/pods" replace />} />
      <Route path="invite" element={<AcceptInvitePage />} />
      <Route index element={<LandingRedirect />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="pods" element={<OrbMap />} />
          <Route path="pods/:podName" element={<OrbMap />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="dashboard/nurturing" element={<NurturingHub />} />
          <Route path="pulse" element={<Navigate to="/dashboard" replace />} />
          <Route path="pulse/nurturing" element={<Navigate to="/dashboard/nurturing" replace />} />
          <Route path="relationships" element={<RecordsList />} />
          <Route path="contacts" element={<Navigate to="/relationships" replace />} />
          <Route path="companies" element={<Navigate to="/relationships?view=companies" replace />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="campaigns/:id" element={<CampaignDetailRoute />} />
          <Route path="pipelines" element={<Navigate to="/campaigns" replace />} />
          <Route path="projects" element={<Navigate to="/campaigns" replace />} />
          <Route path="projects/:id" element={<Navigate to="/campaigns" replace />} />
          <Route path="reports" element={<Navigate to="/dashboard" replace />} />
          <Route path="learn" element={<LearnPage />} />
          <Route path="changelog" element={<ChangelogPage />} />
          <Route path="category/:id" element={<CategoryTable />} />
          <Route path="contact/:id" element={<RecordPage />} />
          <Route path="pod/:id" element={<PodDetailPage />} />
          <Route path="import" element={<ImportPanel />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="onboarding" element={<OnboardingFlow onComplete={() => window.history.back()} />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
    </ErrorBoundary>
  )
}
