import { useEffect, useState, useCallback } from 'react'
import { Routes, Route, Outlet, useLocation, useNavigate } from 'react-router'
import { OrbMap } from './components/map/OrbMap'
import { Dashboard } from './components/dashboard/Dashboard'
import { ImportPanel } from './components/import/ImportPanel'
import { isDemoMode, setDemoMode } from './lib/sampleData'
import { SearchPalette } from './components/search/SearchPalette'
import { ContactDetail } from './components/contacts/ContactDetail'
import type { Contact } from './lib/types'

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
  const isMap = location.pathname === '/map'
  const isMobile = useIsMobile()
  const [demo, setDemo] = useState(isDemoMode)
  const [showSearch, setShowSearch] = useState(false)
  const [searchSelectedContact, setSearchSelectedContact] = useState<Contact | null>(null)

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

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: BG }}>
      <div style={{ paddingBottom: isMobile ? 56 : 0, height: '100%' }}>
        <Outlet />
      </div>

      {isMobile ? (
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
            aria-current={!isMap ? 'page' : undefined}
            onClick={() => navigate('/')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'none', border: 'none', padding: '6px 16px', cursor: 'pointer',
              minWidth: 44, minHeight: 44,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24"
              fill={!isMap ? 'var(--color-brand)' : 'none'}
              stroke={!isMap ? 'var(--color-brand)' : 'var(--text-muted)'}
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span style={{ fontSize: 9, fontWeight: 500, color: !isMap ? 'var(--color-brand)' : 'var(--text-muted)' }}>Pulse</span>
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
            aria-current={isMap ? 'page' : undefined}
            onClick={() => navigate('/map')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'none', border: 'none', padding: '6px 16px', cursor: 'pointer',
              minWidth: 44, minHeight: 44,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24"
              fill="none"
              stroke={isMap ? 'var(--color-brand)' : 'var(--text-muted)'}
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"/>
              <line x1="22" y1="12" x2="18" y2="12"/>
              <line x1="6" y1="12" x2="2" y2="12"/>
              <line x1="12" y1="6" x2="12" y2="2"/>
              <line x1="12" y1="22" x2="12" y2="18"/>
            </svg>
            <span style={{ fontSize: 9, fontWeight: 500, color: isMap ? 'var(--color-brand)' : 'var(--text-muted)' }}>Map</span>
          </button>
        </nav>
      ) : (
        /* Desktop — floating pill navigator */
        <nav
          role="navigation"
          aria-label="Main navigation"
          style={{
            position: 'fixed',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            display: 'flex',
            gap: 2,
            padding: 4,
            borderRadius: 100,
            background: 'var(--nav-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--edge)',
            boxShadow: '0 2px 12px var(--divider)',
          }}
        >
          <button
            type="button"
            aria-current={!isMap ? 'page' : undefined}
            onClick={() => navigate('/')}
            style={{
              padding: '12px 20px',
              borderRadius: 100,
              border: 'none',
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.01em',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
              background: !isMap ? 'var(--color-brand)' : 'transparent',
              color: !isMap ? '#ffffff' : 'var(--text-muted)',
              boxShadow: !isMap ? '0 1px 4px rgba(37,180,57,0.30)' : 'none',
            }}
          >
            Pulse
          </button>
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            aria-label="Search contacts"
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="var(--text-muted)" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
          <button
            type="button"
            aria-current={isMap ? 'page' : undefined}
            onClick={() => navigate('/map')}
            style={{
              padding: '12px 20px',
              borderRadius: 100,
              border: 'none',
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.01em',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
              background: isMap ? 'var(--color-brand)' : 'transparent',
              color: isMap ? '#ffffff' : 'var(--text-muted)',
              boxShadow: isMap ? '0 1px 4px rgba(37,180,57,0.30)' : 'none',
            }}
          >
            Map
          </button>
        </nav>
      )}

      {showSearch && (
        <SearchPalette
          onClose={closeSearch}
          onSelectContact={(contact) => {
            setShowSearch(false)
            setSearchSelectedContact(contact)
          }}
        />
      )}

      {searchSelectedContact && (
        <ContactDetail
          contact={searchSelectedContact}
          categoryId={searchSelectedContact.category_ids[0]}
          onClose={() => setSearchSelectedContact(null)}
          onSaved={(updated) => setSearchSelectedContact(updated)}
          onDeleted={() => setSearchSelectedContact(null)}
        />
      )}

      {/* Demo data toggle */}
      <button
        type="button"
        onClick={() => {
          const next = !demo
          setDemoMode(next)
          setDemo(next)
          window.location.reload()
        }}
        style={{
          position: 'fixed',
          bottom: isMobile ? 56 : 52,
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
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="map" element={<OrbMap />} />
        <Route path="import" element={<ImportPanel />} />
      </Route>
    </Routes>
  )
}
