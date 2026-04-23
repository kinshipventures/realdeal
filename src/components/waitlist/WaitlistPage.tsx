import { useState, type FormEvent } from 'react'

const BLUE = '#003DA5'
const ORB_COLORS = ['#003DA5', '#FF6B8A', '#F5A623', '#7E57C2', '#E53935', '#00BFA5']

// Ambient constellation matching the logo motif
function Constellation() {
  return (
    <svg
      aria-hidden
      width="220"
      height="220"
      viewBox="0 0 220 220"
      fill="none"
      style={{
        position: 'absolute',
        bottom: -40,
        right: -40,
        opacity: 0.06,
        animation: 'rd-constellation-spin 60s linear infinite',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {ORB_COLORS.map((c, i) => {
        const angle = (i / ORB_COLORS.length) * Math.PI * 2 - Math.PI / 2
        const r = 80
        const cx = 110 + Math.cos(angle) * r
        const cy = 110 + Math.sin(angle) * r
        return (
          <circle
            key={c}
            cx={cx}
            cy={cy}
            r={i === 0 ? 14 : 9}
            fill={c}
            style={{ animation: `rd-float ${4 + i * 0.7}s ease-in-out ${i * 0.5}s infinite alternate` }}
          />
        )
      })}
      <circle cx="110" cy="110" r="6" fill={BLUE} />
    </svg>
  )
}

export function WaitlistPage() {
  const [email, setEmail] = useState('')
  const [focused, setFocused] = useState(false)
  const [hover, setHover] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'exiting' | 'done'>('idle')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || status !== 'idle') return
    setStatus('loading')
    setTimeout(() => {
      setStatus('exiting')
      setTimeout(() => setStatus('done'), 260)
    }, 600)
  }

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        background: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '48px 24px',
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text-primary)',
        overflow: 'hidden',
      }}
    >
      <Constellation />

      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 700,
          fontSize: 22,
          color: BLUE,
          letterSpacing: '-0.01em',
          alignSelf: 'flex-start',
          maxWidth: 480,
          width: '100%',
          margin: '0 auto',
          animation: 'rd-rise 600ms cubic-bezier(0.16,1,0.3,1) both',
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
        {/* Each headline line staggers in separately for a cinematic reveal */}
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
          <span style={{ display: 'block', animation: 'rd-rise 700ms cubic-bezier(0.16,1,0.3,1) 60ms both' }}>
            You are the
          </span>
          <span style={{ display: 'block', animation: 'rd-rise 700ms cubic-bezier(0.16,1,0.3,1) 160ms both' }}>
            company
          </span>
          <em
            style={{
              display: 'block',
              fontStyle: 'italic',
              fontWeight: 400,
              animation: 'rd-rise-accent 800ms cubic-bezier(0.16,1,0.3,1) 280ms both',
            }}
          >
            you keep.
          </em>
        </h1>

        <p
          style={{
            marginTop: 28,
            fontSize: 17,
            lineHeight: 1.5,
            color: 'var(--color-text-secondary)',
            maxWidth: 440,
            animation: 'rd-rise 700ms cubic-bezier(0.16,1,0.3,1) 420ms both',
          }}
        >
          RealDeal is a relationship health tool for founders and operators who know their network is their net worth.
        </p>

        <div style={{ marginTop: 40, minHeight: 120, animation: 'rd-rise 700ms cubic-bezier(0.16,1,0.3,1) 560ms both' }}>
          {status === 'done' ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                padding: '20px 22px',
                background: 'rgba(0,61,165,0.05)',
                border: '1px solid rgba(0,61,165,0.18)',
                borderRadius: 16,
                animation: 'rd-success-enter 550ms cubic-bezier(0.22,1,0.36,1) both',
              }}
            >
              {/* Checkmark circle with pulse ring + orb burst */}
              <span
                aria-hidden
                style={{
                  position: 'relative',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: BLUE,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  animation: 'rd-circle-pop 420ms cubic-bezier(0.22,1,0.36,1) both',
                }}
              >
                {/* Expanding pulse ring */}
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: -2,
                    borderRadius: '50%',
                    border: `2px solid ${BLUE}`,
                    animation: 'rd-pulse-ring 700ms cubic-bezier(0.16,1,0.3,1) 120ms both',
                    pointerEvents: 'none',
                  }}
                />
                <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M2.5 7.2l2.8 2.8L11.5 3.5"
                    stroke="white"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      strokeDasharray: 16,
                      strokeDashoffset: 16,
                      animation: 'rd-check 500ms cubic-bezier(0.65,0,0.35,1) 200ms forwards',
                    }}
                  />
                </svg>
                {/* Orb burst particles */}
                {ORB_COLORS.map((c, i) => {
                  const angle = (i / ORB_COLORS.length) * Math.PI * 2 - Math.PI / 6
                  const tx = Math.cos(angle) * 52
                  const ty = Math.sin(angle) * 52
                  return (
                    <span
                      key={c}
                      aria-hidden
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        width: 6,
                        height: 6,
                        marginLeft: -3,
                        marginTop: -3,
                        borderRadius: '50%',
                        background: c,
                        opacity: 0,
                        ['--tx' as any]: `${tx}px`,
                        ['--ty' as any]: `${ty}px`,
                        animation: `rd-burst 800ms cubic-bezier(0.16,1,0.3,1) ${160 + i * 45}ms forwards`,
                      }}
                    />
                  )
                })}
              </span>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontWeight: 700,
                    fontSize: 20,
                    color: 'var(--color-text-primary)',
                    animation: 'rd-rise 450ms cubic-bezier(0.22,1,0.36,1) 140ms both',
                  }}
                >
                  You're in.
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: 'var(--color-text-secondary)',
                    marginTop: 3,
                    animation: 'rd-rise 450ms cubic-bezier(0.22,1,0.36,1) 230ms both',
                  }}
                >
                  Good company is on the way.
                </div>
              </div>
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                opacity: status === 'exiting' ? 0 : 1,
                transform: status === 'exiting' ? 'translateY(-6px)' : 'translateY(0)',
                transition: 'opacity 220ms ease, transform 220ms cubic-bezier(0.22,1,0.36,1)',
              }}
            >
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
                  background: focused ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
                  border: `1px solid ${focused ? BLUE : 'rgba(0,0,0,0.12)'}`,
                  borderRadius: 12,
                  outline: 'none',
                  boxShadow: focused ? '0 0 0 4px rgba(0,61,165,0.12)' : 'none',
                  transition: 'border-color 200ms ease, box-shadow 200ms ease, background 200ms ease',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => { setHover(false); setPressed(false) }}
                onMouseDown={() => setPressed(true)}
                onMouseUp={() => setPressed(false)}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  height: 52,
                  padding: '0 24px',
                  fontSize: 16,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  color: 'white',
                  background: BLUE,
                  border: 'none',
                  borderRadius: 12,
                  cursor: status === 'loading' ? 'default' : 'pointer',
                  opacity: status === 'loading' ? 0.85 : 1,
                  transform: pressed ? 'translateY(1px) scale(0.995)' : hover ? 'translateY(-2px)' : 'translateY(0)',
                  boxShadow: hover
                    ? '0 12px 32px rgba(0,61,165,0.35)'
                    : '0 4px 14px rgba(0,61,165,0.22)',
                  transition: 'transform 180ms cubic-bezier(0.16,1,0.3,1), box-shadow 220ms ease, opacity 150ms ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                {/* Shine sweep on hover */}
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.18) 50%, transparent 80%)',
                    transform: hover ? 'translateX(100%)' : 'translateX(-100%)',
                    transition: 'transform 650ms cubic-bezier(0.16,1,0.3,1)',
                    pointerEvents: 'none',
                  }}
                />
                {status === 'loading' ? (
                  /* Three bouncing dots instead of spinner */
                  <span aria-label="Loading" style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.9)',
                          animation: `rd-dot-bounce 600ms ease-in-out ${i * 120}ms infinite alternate`,
                        }}
                      />
                    ))}
                  </span>
                ) : (
                  <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    Join the waitlist
                    <span
                      aria-hidden
                      style={{
                        display: 'inline-block',
                        transform: hover ? 'translateX(4px)' : 'translateX(0)',
                        transition: 'transform 250ms cubic-bezier(0.16,1,0.3,1)',
                      }}
                    >
                      {'->'}
                    </span>
                  </span>
                )}
              </button>

            </form>
          )}
        </div>

        <style>{`
          @keyframes rd-rise {
            from { opacity: 0; transform: translateY(14px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes rd-rise-accent {
            from { opacity: 0; transform: translateY(14px); color: ${BLUE}; }
            70%  { color: ${BLUE}; }
            to   { opacity: 1; transform: translateY(0); color: inherit; }
          }
          @keyframes rd-success-enter {
            0%   { opacity: 0; transform: translateY(10px) scale(0.97); }
            60%  { opacity: 1; transform: translateY(-2px) scale(1.005); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes rd-circle-pop {
            0%   { transform: scale(0); opacity: 0; }
            55%  { transform: scale(1.18); opacity: 1; }
            75%  { transform: scale(0.94); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes rd-pulse-ring {
            0%   { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(2.4); opacity: 0; }
          }
          @keyframes rd-check {
            to { stroke-dashoffset: 0; }
          }
          @keyframes rd-burst {
            0%   { opacity: 0; transform: translate(0,0) scale(0.4); }
            30%  { opacity: 1; }
            100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(1.2); }
          }
          @keyframes rd-dot-bounce {
            from { transform: translateY(0); opacity: 0.6; }
            to   { transform: translateY(-5px); opacity: 1; }
          }
          @keyframes rd-constellation-spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes rd-float {
            from { transform: translateY(0); }
            to   { transform: translateY(-6px); }
          }
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              animation-duration: 0.001ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.001ms !important;
            }
          }
        `}</style>
      </main>
    </div>
  )
}
