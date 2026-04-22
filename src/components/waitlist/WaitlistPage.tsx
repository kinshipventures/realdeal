import { useState, type FormEvent } from 'react'

export function WaitlistPage() {
  const [email, setEmail] = useState('')
  const [focused, setFocused] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || status !== 'idle') return
    setStatus('loading')
    setTimeout(() => setStatus('done'), 150)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '48px 24px',
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text-primary)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 700,
          fontSize: 22,
          color: 'var(--color-brand)',
          letterSpacing: '-0.01em',
          alignSelf: 'flex-start',
          maxWidth: 480,
          width: '100%',
          margin: '0 auto',
        }}
      >
        RealDeal
      </div>

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          maxWidth: 480,
          width: '100%',
          margin: '0 auto',
          paddingTop: 64,
          paddingBottom: 64,
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 800,
            fontSize: 'clamp(44px, 7vw, 68px)',
            lineHeight: 1.02,
            letterSpacing: '-0.02em',
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          You are the
          <br />
          company
          <br />
          <em style={{ fontStyle: 'italic', fontWeight: 400 }}>you keep.</em>
        </h1>

        <p
          style={{
            marginTop: 28,
            fontSize: 17,
            lineHeight: 1.5,
            color: 'var(--color-text-secondary)',
            maxWidth: 440,
          }}
        >
          RealDeal is a relationship health tool for founders and operators who know their network is their net worth.
        </p>

        <div style={{ marginTop: 40, minHeight: 120 }}>
          {status === 'done' ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '18px 20px',
                background: 'rgba(52,177,93,0.08)',
                border: '1px solid rgba(52,177,93,0.24)',
                borderRadius: 14,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'var(--color-brand, #34B15D)',
                  color: 'white',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6.2l2.3 2.3L9.5 3.8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 18, color: 'var(--color-text-primary)' }}>
                  You're in.
                </div>
                <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  We'll be in touch.
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={{
                  width: '100%',
                  height: 52,
                  padding: '0 18px',
                  fontSize: 16,
                  fontFamily: 'inherit',
                  color: 'var(--color-text-primary)',
                  background: 'rgba(255,255,255,0.6)',
                  border: `1px solid ${focused ? 'var(--color-brand, #34B15D)' : 'rgba(0,0,0,0.12)'}`,
                  borderRadius: 12,
                  outline: 'none',
                  boxShadow: focused ? '0 0 0 4px rgba(52,177,93,0.12)' : 'none',
                  transition: 'border-color 150ms ease, box-shadow 150ms ease',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                style={{
                  height: 52,
                  padding: '0 24px',
                  fontSize: 16,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  color: 'white',
                  background: 'var(--color-brand, #34B15D)',
                  border: 'none',
                  borderRadius: 12,
                  cursor: status === 'loading' ? 'default' : 'pointer',
                  opacity: status === 'loading' ? 0.8 : 1,
                  transition: 'opacity 150ms ease, transform 150ms ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                {status === 'loading' ? (
                  <span
                    aria-label="Loading"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: 'white',
                      animation: 'rd-spin 0.7s linear infinite',
                    }}
                  />
                ) : (
                  'Join the waitlist'
                )}
              </button>
              <style>{`@keyframes rd-spin { to { transform: rotate(360deg); } }`}</style>
            </form>
          )}
        </div>

        <p
          style={{
            marginTop: 28,
            fontSize: 13,
            color: 'var(--color-text-tertiary, rgba(0,0,0,0.45))',
            letterSpacing: '0.01em',
          }}
        >
          Moj, Gwyneth, Kevin and 12 others are already in.
        </p>
      </main>
    </div>
  )
}
