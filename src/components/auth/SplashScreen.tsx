export function SplashScreen() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
    }}>
      <span style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 28,
        fontWeight: 700,
        color: 'var(--color-text-primary)',
      }}>
        RealDeal
      </span>
    </div>
  )
}
