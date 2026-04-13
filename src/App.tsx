import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Routes, Route, Outlet, useLocation, useNavigate, Navigate } from 'react-router'
import { RequireAuth } from './components/auth/RequireAuth'
import { LoginPage } from './components/auth/LoginPage'
import { OrbMap } from './components/map/OrbMap'
import { Dashboard } from './components/dashboard/Dashboard'
import { ImportPanel } from './components/import/ImportPanel'
import { CategoryTable } from './components/contacts/CategoryTable'
import { isDemoMode, setDemoMode } from './lib/sampleData'
import { SearchPalette, type SearchResult, type QuickActionId } from './components/search/SearchPalette'
import { RecordPage } from './components/records/RecordPage'
import { RecordsList } from './components/records/RecordsList'
import { CreateRecordModal } from './components/records/CreateRecordModal'
import { PodDetailPage } from './components/pods/PodDetailPage'
import { CampaignsPage } from './components/campaigns/CampaignsPage'
import { ProjectDetailPage } from './components/projects/ProjectDetailPage'
import { NurturingHub } from './components/nurturing/NurturingHub'
import { AccountPage } from './components/settings/AccountPage'
import { AcceptInvitePage } from './components/settings/AcceptInvitePage'
import { NotFoundPage } from './components/errors/NotFoundPage'
import { ErrorBoundary } from './components/errors/ErrorBoundary'
import type { Contact } from './lib/types'
import { useAuth } from './contexts/AuthContext'
import { OnboardingFlow } from './components/onboarding/OnboardingFlow'
import { SharedListPage } from './components/sharing/SharedListPage'
import { LandingRedirect } from './components/landing/LandingRedirect'
import { LearnPage } from './components/learn/LearnPage'
import { ChangelogPage } from './components/changelog/ChangelogPage'
import { ResetPasswordPage } from './components/auth/ResetPasswordPage'
import { Sidebar } from './components/nav/Sidebar'

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

function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const isPods = location.pathname === '/' || location.pathname === '/pods' || location.pathname === '/map'
  const isRelationships = location.pathname === '/contacts' || location.pathname.startsWith('/contact/') || location.pathname === '/companies'
  const isCampaigns = location.pathname.startsWith('/campaigns') || location.pathname.startsWith('/projects')
  const isDashboard = location.pathname === '/pulse' || location.pathname.startsWith('/pulse/')
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
        <Outlet />
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
          <MobileTab active={isDashboard} label="Pulse" onClick={() => navigate('/pulse')}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </MobileTab>
          <MobileTab active={isRelationships} label="People" onClick={() => navigate('/contacts')}>
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

      {/* FAB — create new record (hidden on map, which has its own) */}
      {!isPods && (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          aria-label="New relationship"
          style={{
            position: 'fixed',
            bottom: isMobile ? 72 : 24,
            right: 24,
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#25B439',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            zIndex: 99,
            boxShadow: '0 4px 16px rgba(37,180,57,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}

      <CreateRecordModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(_contact: Contact) => setShowCreate(false)}
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
      <Route path="s/:token" element={<SharedListPage />} />
      <Route path="map" element={<Navigate to="/pods" replace />} />
      <Route path="invite" element={<AcceptInvitePage />} />
      <Route index element={<LandingRedirect />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="pods" element={<OrbMap />} />
          <Route path="pulse" element={<Dashboard />} />
          <Route path="pulse/nurturing" element={<NurturingHub />} />
          <Route path="contacts" element={<RecordsList />} />
          <Route path="companies" element={<Navigate to="/contacts?view=companies" replace />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="pipelines" element={<Navigate to="/campaigns" replace />} />
          <Route path="projects" element={<Navigate to="/campaigns" replace />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="reports" element={<Navigate to="/pulse" replace />} />
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
