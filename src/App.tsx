import { Routes, Route, Outlet, useLocation, useNavigate } from 'react-router'
import { OrbMap } from './components/map/OrbMap'
import { Dashboard } from './components/dashboard/Dashboard'

const BG = 'var(--color-bg)'

function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const isMap = location.pathname === '/map'

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: BG }}>
      <Outlet />

      {/* Floating pill navigator */}
      <nav style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        gap: 2,
        padding: 4,
        borderRadius: 100,
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            padding: '7px 20px',
            borderRadius: 100,
            border: 'none',
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.01em',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.2s',
            background: !isMap ? 'var(--color-brand)' : 'transparent',
            color: !isMap ? '#ffffff' : 'rgba(0,0,0,0.35)',
            boxShadow: !isMap ? '0 1px 4px rgba(37,180,57,0.30)' : 'none',
          }}
        >
          Pulse
        </button>
        <button
          type="button"
          onClick={() => navigate('/map')}
          style={{
            padding: '7px 20px',
            borderRadius: 100,
            border: 'none',
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.01em',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.2s',
            background: isMap ? 'var(--color-brand)' : 'transparent',
            color: isMap ? '#ffffff' : 'rgba(0,0,0,0.35)',
            boxShadow: isMap ? '0 1px 4px rgba(37,180,57,0.30)' : 'none',
          }}
        >
          Map
        </button>
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="map" element={<OrbMap />} />
      </Route>
    </Routes>
  )
}
