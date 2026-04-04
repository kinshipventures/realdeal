import { useNavigate } from 'react-router'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', gap: 16, padding: 32, fontFamily: 'var(--font-body, system-ui)',
      background: 'var(--color-bg, #F5F4F0)',
    }}>
      <div style={{ fontSize: 64, fontWeight: 800, color: 'var(--color-text-tertiary, #ccc)' }}>404</div>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary, #000)' }}>
        Page not found
      </h1>
      <p style={{ fontSize: 14, color: 'var(--color-text-secondary, #666)' }}>
        The page you're looking for doesn't exist.
      </p>
      <button
        type="button"
        onClick={() => navigate('/')}
        style={{
          padding: '10px 24px', fontSize: 14, fontWeight: 600,
          background: 'var(--color-brand, #7C5CFC)', color: '#fff',
          border: 'none', borderRadius: 8, cursor: 'pointer',
        }}
      >
        Back to home
      </button>
    </div>
  )
}
