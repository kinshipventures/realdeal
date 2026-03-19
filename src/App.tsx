import { Routes, Route, Outlet, useLocation, useNavigate } from 'react-router'
import { OrbMap } from './components/map/OrbMap'
import { Dashboard } from './components/dashboard/Dashboard'

const BG = [
  'radial-gradient(ellipse 70% 55% at 12% 8%,  rgba(180,160,255,0.13) 0%, transparent 60%)',
  'radial-gradient(ellipse 55% 45% at 88% 88%, rgba(255,160,100,0.10) 0%, transparent 55%)',
  'radial-gradient(ellipse 45% 40% at 75% 10%, rgba(140,200,255,0.08) 0%, transparent 50%)',
  '#F5F4F0',
].join(', ')

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
            background: !isMap ? 'rgba(0,0,0,0.08)' : 'transparent',
            color: !isMap ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.35)',
            boxShadow: !isMap ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
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
            background: isMap ? 'rgba(0,0,0,0.08)' : 'transparent',
            color: isMap ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.35)',
            boxShadow: isMap ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
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
