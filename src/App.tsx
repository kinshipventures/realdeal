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
import { SearchPalette } from './components/search/SearchPalette'
import { RecordPage } from './components/records/RecordPage'
import { RecordsList } from './components/records/RecordsList'
import { CreateRecordModal } from './components/records/CreateRecordModal'
import { PodDetailPage } from './components/pods/PodDetailPage'
import { PipelinesPage } from './components/pipelines/PipelinesPage'
import { CompaniesPage } from './components/companies/CompaniesPage'
import { ProjectsPage } from './components/projects/ProjectsPage'
import { ProjectDetailPage } from './components/projects/ProjectDetailPage'
import { NurturingHub } from './components/nurturing/NurturingHub'
import { AccountPage } from './components/settings/AccountPage'
import { NotFoundPage } from './components/errors/NotFoundPage'
import { ErrorBoundary } from './components/errors/ErrorBoundary'
import type { Contact } from './lib/types'
import { useAuth } from './contexts/AuthContext'
import { OnboardingFlow } from './components/onboarding/OnboardingFlow'
import { SharedListPage } from './components/sharing/SharedListPage'
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
  const isContacts = location.pathname === '/contacts'
  const isPipelines = location.pathname.startsWith('/pipelines')
  const isProjects = location.pathname.startsWith('/projects')
  const isPulse = location.pathname === '/pulse' || location.pathname.startsWith('/pulse/')
  const isMobile = useIsMobile()
  const { session } = useAuth()
  const [demo, setDemo] = useState(isDemoMode)
  const [showSearch, setShowSearch] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('realdeal:sidebar-collapsed') === '1'
  )
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (isDemoMode()) return false
    return !localStorage.getItem('realdeal:onboarding-complete')
  })

  const completeOnboarding = useCallback(() => {
    localStorage.setItem('realdeal:onboarding-complete', '1')
    setShowOnboarding(false)
  }, [])

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

      <div style={{
        paddingLeft: isMobile ? 0 : (collapsed ? 56 : 220),
        paddingBottom: isMobile ? 56 : 0,
        height: '100%',
        transition: isMobile ? undefined : 'padding-left 0.2s cubic-bezier(0.215, 0.61, 0.355, 1)',
      }}>
        <Outlet />
      </div>

      {isMobile && (
        /* Mobile — fixed bottom tab bar */
        <nav
          role="navigation"
          aria-label="Main navigation"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 48,
            zIndex: 100,
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            background: 'var(--color-surface)',
            borderTop: '1px solid var(--edge)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <button
            type="button"
            aria-current={isPulse ? 'page' : undefined}
            onClick={() => navigate('/pulse')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'none', border: 'none', padding: '6px 16px', cursor: 'pointer',
              minWidth: 44, minHeight: 44,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24"
              fill={isPulse ? 'var(--color-brand)' : 'none'}
              stroke={isPulse ? 'var(--color-brand)' : 'var(--text-muted)'}
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span style={{ fontSize: 9, fontWeight: 500, color: isPulse ? 'var(--color-brand)' : 'var(--text-muted)' }}>Pulse</span>
          </button>
          <button
            type="button"
            aria-current={isPods ? 'page' : undefined}
            onClick={() => navigate('/pods')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'none', border: 'none', padding: '6px 16px', cursor: 'pointer',
              minWidth: 44, minHeight: 44,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24"
              fill="none"
              stroke={isPods ? 'var(--color-brand)' : 'var(--text-muted)'}
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3"/>
              <line x1="12" y1="3" x2="12" y2="9"/>
              <line x1="12" y1="15" x2="12" y2="21"/>
              <line x1="3" y1="12" x2="9" y2="12"/>
              <line x1="15" y1="12" x2="21" y2="12"/>
            </svg>
            <span style={{ fontSize: 9, fontWeight: 500, color: isPods ? 'var(--color-brand)' : 'var(--text-muted)' }}>Pods</span>
          </button>
          <button
            type="button"
            aria-current={isContacts ? 'page' : undefined}
            onClick={() => navigate('/contacts')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'none', border: 'none', padding: '6px 16px', cursor: 'pointer',
              minWidth: 44, minHeight: 44,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24"
              fill="none"
              stroke={isContacts ? 'var(--color-brand)' : 'var(--text-muted)'}
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            <span style={{ fontSize: 9, fontWeight: 500, color: isContacts ? 'var(--color-brand)' : 'var(--text-muted)' }}>Contacts</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            aria-label="Search contacts"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'none', border: 'none', padding: '6px 16px', cursor: 'pointer',
              minWidth: 44, minHeight: 44,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24"
              fill="none" stroke="var(--text-muted)" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span style={{ fontSize: 9, fontWeight: 500, color: 'var(--text-muted)' }}>Search</span>
          </button>
          <button
            type="button"
            aria-current={isPipelines ? 'page' : undefined}
            onClick={() => navigate('/pipelines')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'none', border: 'none', padding: '6px 16px', cursor: 'pointer',
              minWidth: 44, minHeight: 44,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24"
              fill="none"
              stroke={isPipelines ? 'var(--color-brand)' : 'var(--text-muted)'}
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <rect x="2" y="3" width="5" height="18" rx="1"/>
              <rect x="9.5" y="6" width="5" height="15" rx="1"/>
              <rect x="17" y="9" width="5" height="12" rx="1"/>
            </svg>
            <span style={{ fontSize: 9, fontWeight: 500, color: isPipelines ? 'var(--color-brand)' : 'var(--text-muted)' }}>Pipelines</span>
          </button>
          <button
            type="button"
            aria-current={isProjects ? 'page' : undefined}
            onClick={() => navigate('/projects')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'none', border: 'none', padding: '6px 16px', cursor: 'pointer',
              minWidth: 44, minHeight: 44,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24"
              fill="none"
              stroke={isProjects ? 'var(--color-brand)' : 'var(--text-muted)'}
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <span style={{ fontSize: 9, fontWeight: 500, color: isProjects ? 'var(--color-brand)' : 'var(--text-muted)' }}>Projects</span>
          </button>
        </nav>
      )}

      {showSearch && (
        <SearchPalette
          onClose={closeSearch}
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

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="s/:token" element={<SharedListPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<OrbMap />} />
          <Route path="pods" element={<OrbMap />} />
          <Route path="pulse" element={<Dashboard />} />
          <Route path="pulse/nurturing" element={<NurturingHub />} />
          <Route path="contacts" element={<RecordsList />} />
          <Route path="companies" element={<CompaniesPage />} />
          <Route path="pipelines" element={<PipelinesPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="category/:id" element={<CategoryTable />} />
          <Route path="contact/:id" element={<RecordPage />} />
          <Route path="pod/:id" element={<PodDetailPage />} />
          <Route path="import" element={<ImportPanel />} />
          <Route path="onboarding" element={<OnboardingFlow onComplete={() => window.history.back()} />} />
        </Route>
      </Route>
    </Routes>
  )
}
