import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { isLovableAuthBridgeEnabled, signInWithGoogle } from '@/lib/auth'
import { setDemoMode } from '@/lib/sampleData'

type FeedbackTone = 'error' | 'success' | 'info'

const HERO_NOTES = [
  {
    title: 'Morning score',
    text: 'See who needs a little love before the day gets noisy.',
    top: '8%',
    left: '4%',
    rotate: '-7deg',
  },
  {
    title: 'Gentle nudges',
    text: 'Tiny check-ins compound faster than you think.',
    top: '12%',
    right: '3%',
    rotate: '6deg',
  },
  {
    title: 'No CRM energy',
    text: 'Warm signal, clear priorities, zero sterile busywork.',
    bottom: '10%',
    left: '12%',
    rotate: '-4deg',
  },
] as const

function LoginOrb({ loading }: { loading: boolean }) {
  const orbiters = [
    { size: 12, radius: 88, duration: 18, delay: '0s', color: '#6366F1' },
    { size: 10, radius: 88, duration: 24, delay: '-5s', color: '#EC4899' },
    { size: 8, radius: 68, duration: 15, delay: '-2s', color: '#F59E0B' },
    { size: 9, radius: 68, duration: 20, delay: '-9s', color: '#14B8A6' },
  ]

  return (
    <div className={`login-orbital ${loading ? 'is-loading' : ''}`}>
      <svg width="176" height="176" viewBox="0 0 176 176" style={{ position: 'absolute', inset: 0 }}>
        <circle cx="88" cy="88" r="55" fill="none" stroke="rgba(52,177,93,0.14)" strokeWidth="1.2" />
        <circle cx="88" cy="88" r="73" fill="none" stroke="rgba(52,177,93,0.10)" strokeWidth="1.2" strokeDasharray="6 8" />
      </svg>

      {orbiters.map((orbiter) => (
        <div
          key={`${orbiter.radius}-${orbiter.color}`}
          className="login-orbiter"
          style={{
            width: orbiter.size,
            height: orbiter.size,
            left: 88 - orbiter.size / 2,
            top: 88 - orbiter.size / 2,
            background: orbiter.color,
            opacity: 0.84,
            boxShadow: `0 0 0 6px ${orbiter.color}18`,
            animationDuration: `${orbiter.duration}s`,
            animationDelay: orbiter.delay,
            ['--orbit-radius' as string]: `${orbiter.radius}px`,
          } as React.CSSProperties}
        />
      ))}

      <div className="login-orb-core">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>
    </div>
  )
}

export function LoginPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; text: string } | null>(null)
  const [isSignUp, setIsSignUp] = useState(() => searchParams.get('signup') === '1')
  const [signUpSuccess, setSignUpSuccess] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null)
  useEffect(() => {
    if (!session) return
    const returnTo = searchParams.get('return_to') ?? '/'
    navigate(returnTo.startsWith('/') ? returnTo : '/', { replace: true })
  }, [session, navigate, searchParams])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setLoadingLabel('Opening Google...')
    setFeedback(null)
    const result = await signInWithGoogle()
    if (result.error) {
      setFeedback({ tone: 'error', text: 'Sign in failed. Please try again.' })
      setLoading(false)
      setLoadingLabel(null)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setLoadingLabel(isSignUp ? 'Creating your account...' : 'Signing you in...')
    setFeedback(null)

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setFeedback({ tone: 'error', text: error.message })
        setLoading(false)
        setLoadingLabel(null)
      } else if (data?.user && !data.session) {
        setSignUpSuccess(true)
        setLoading(false)
        setLoadingLabel(null)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setFeedback({ tone: 'error', text: error.message })
        setLoading(false)
        setLoadingLabel(null)
      }
    }
  }

  const authTitle = isSignUp ? 'Create your account' : 'Welcome back'
  const authCopy = isSignUp
    ? 'Start with Google for faster setup, or use email and password.'
    : 'Sign in and get back to the people who matter most.'

  return (
    <div className="login-page">
      <style>{`
        @keyframes login-float {
          0%, 100% { transform: translateY(0) rotate(var(--note-rotate, 0deg)); }
          50% { transform: translateY(-10px) rotate(var(--note-rotate, 0deg)); }
        }
        @keyframes login-orbit {
          from { transform: rotate(0deg) translateX(var(--orbit-radius, 80px)) rotate(0deg); }
          to { transform: rotate(360deg) translateX(var(--orbit-radius, 80px)) rotate(-360deg); }
        }
        @keyframes login-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 20px 54px rgba(52,177,93,0.26); }
          50% { transform: scale(1.04); box-shadow: 0 28px 72px rgba(52,177,93,0.34); }
        }
        .login-page {
          min-height: 100vh;
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(circle at 18% 20%, rgba(52,177,93,0.12), transparent 32%),
            radial-gradient(circle at 82% 16%, rgba(99,102,241,0.08), transparent 28%),
            var(--color-bg);
          color: var(--color-text-primary);
          font-family: var(--font-sans);
          position: relative;
          overflow: hidden;
        }
        .login-shell {
          width: min(1120px, 100%);
          min-height: min(720px, calc(100vh - 48px));
          display: grid;
          grid-template-columns: 1.12fr minmax(360px, 420px);
          border-radius: 32px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.45);
          background: linear-gradient(135deg, rgba(255,255,255,0.68), rgba(255,255,255,0.82));
          box-shadow: 0 30px 100px rgba(14, 20, 28, 0.12);
          backdrop-filter: blur(24px);
        }
        .login-story {
          padding: 44px 44px 40px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 28px;
          position: relative;
          background: radial-gradient(circle at 22% 18%, rgba(52,177,93,0.08), transparent 40%);
        }
        .login-panel-wrap {
          padding: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          background: rgba(255,255,255,0.24);
        }
        .login-panel {
          width: 100%;
          padding: 30px 28px 24px;
          border-radius: 28px;
          border: 1px solid rgba(0,0,0,0.06);
          background: rgba(245,244,240,0.9);
          box-shadow: 0 18px 48px rgba(19, 24, 30, 0.08);
          display: flex;
          flex-direction: column;
          gap: 18px;
          position: relative;
        }
        .login-hero-title {
          margin: 0;
          max-width: 10ch;
          font-family: var(--font-sans);
          font-size: clamp(3rem, 4vw, 4.75rem);
          line-height: 0.95;
          letter-spacing: -0.045em;
        }
        .login-hero-copy {
          margin: 0;
          max-width: 34rem;
          font-size: 15px;
          line-height: 1.7;
          color: var(--color-text-secondary);
        }
        .login-stage {
          flex: 1;
          min-height: 280px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-note {
          position: absolute;
          width: min(220px, 34vw);
          padding: 14px 15px;
          border-radius: 18px;
          border: 1px solid rgba(0,0,0,0.05);
          background: rgba(255,255,255,0.7);
          box-shadow: 0 18px 38px rgba(22, 28, 36, 0.08);
          backdrop-filter: blur(12px);
          animation: login-float 7s ease-in-out infinite;
          z-index: 1;
        }
        .login-note strong {
          display: block;
          margin-bottom: 4px;
          font-size: 13px;
          font-family: var(--font-sans);
          letter-spacing: -0.01em;
        }
        .login-note span {
          display: block;
          font-size: 12px;
          line-height: 1.55;
          color: var(--color-text-secondary);
        }
        .login-orbital {
          width: 176px;
          height: 176px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-orb-core {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          background: linear-gradient(135deg, #25B439, #1A8A2A);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 20px 54px rgba(52,177,93,0.26);
          animation: login-pulse 4.8s ease-in-out infinite;
        }
        .login-orbital.is-loading .login-orb-core::after {
          content: '';
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          border: 1px solid rgba(52,177,93,0.20);
          animation: login-pulse 1.4s ease-in-out infinite;
        }
        .login-orbiter {
          position: absolute;
          border-radius: 50%;
          transform-origin: center;
          animation-name: login-orbit;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .login-brand {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .login-brand-mark {
          font-family: var(--font-sans);
          font-size: 26px;
          font-weight: 900;
          letter-spacing: -0.04em;
          margin: 0;
        }
        .login-brand-copy {
          margin: 0;
          font-size: 13px;
          line-height: 1.6;
          color: var(--color-text-secondary);
        }
        .login-auth-header h2 {
          margin: 0;
          font-family: var(--font-sans);
          font-size: 2rem;
          line-height: 1;
          letter-spacing: -0.04em;
        }
        .login-auth-header p {
          margin: 8px 0 0;
          font-size: 14px;
          line-height: 1.65;
          color: var(--color-text-secondary);
        }
        .login-google-button,
        .login-primary-button,
        .login-secondary-link,
        .login-demo-link {
          font-family: var(--font-sans);
        }
        .login-google-button {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 14px 18px;
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.07);
          background: rgba(255,255,255,0.78);
          color: var(--color-text-primary);
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          transition: transform 0.18s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.18s ease, background 0.18s ease;
          box-shadow: 0 10px 22px rgba(20, 26, 32, 0.06);
        }
        .login-google-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 16px 30px rgba(20, 26, 32, 0.10);
          background: rgba(255,255,255,0.92);
        }
        .login-google-button:active:not(:disabled) { transform: translateY(0); }
        .login-google-button:disabled,
        .login-primary-button:disabled {
          cursor: wait;
          opacity: 0.68;
        }
        .login-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 2px 0;
          color: var(--color-text-tertiary);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .login-divider::before,
        .login-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--edge);
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .login-field {
          display: grid;
          gap: 7px;
        }
        .login-field span {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.01em;
          color: var(--color-text-secondary);
        }
        .login-field input {
          width: 100%;
          padding: 13px 14px;
          border-radius: 14px;
          border: 1px solid rgba(0,0,0,0.08);
          background: rgba(255,255,255,0.84);
          font-size: 14px;
          font-family: var(--font-sans);
          color: var(--color-text-primary);
          outline: none;
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .login-field input:focus {
          border-color: rgba(52,177,93,0.42);
          box-shadow: 0 0 0 5px rgba(52,177,93,0.10);
        }
        .login-primary-button {
          width: 100%;
          padding: 14px 18px;
          border: none;
          border-radius: 16px;
          background: linear-gradient(135deg, #25B439, #1A8A2A);
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.18s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.18s ease;
          box-shadow: 0 16px 30px rgba(52,177,93,0.22);
        }
        .login-primary-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 22px 38px rgba(52,177,93,0.28);
        }
        .login-auth-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .login-secondary-link,
        .login-demo-link {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 13px;
          padding: 6px 10px;
          color: var(--color-text-secondary);
          transition: color 0.15s ease;
        }
        .login-secondary-link:hover,
        .login-demo-link:hover { color: var(--color-text-primary); }
        .login-demo-row {
          padding-top: 18px;
          border-top: 1px solid var(--edge);
          text-align: center;
        }
        .login-demo-link {
          color: var(--color-brand);
          font-weight: 600;
        }
        .login-feedback {
          padding: 12px 14px;
          border-radius: 16px;
          font-size: 13px;
          line-height: 1.55;
          border: 1px solid transparent;
        }
        .login-feedback[data-tone="error"] {
          color: #9f2e2e;
          background: rgba(220, 38, 38, 0.08);
          border-color: rgba(220, 38, 38, 0.12);
        }
        .login-feedback[data-tone="success"] {
          color: #14532d;
          background: rgba(52,177,93,0.10);
          border-color: rgba(52,177,93,0.16);
        }
        .login-feedback[data-tone="info"] {
          color: #1d4ed8;
          background: rgba(37,99,235,0.08);
          border-color: rgba(37,99,235,0.14);
        }
        .login-success {
          padding: 18px;
          border-radius: 22px;
          background: rgba(52,177,93,0.08);
          border: 1px solid rgba(52,177,93,0.16);
          display: grid;
          gap: 12px;
        }
        .login-success-badge {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #25B439, #1A8A2A);
          color: #fff;
          box-shadow: 0 16px 34px rgba(52,177,93,0.22);
        }
        .login-success h3 {
          margin: 0;
          font-family: var(--font-sans);
          font-size: 24px;
          letter-spacing: -0.03em;
        }
        .login-success p {
          margin: 0;
          font-size: 14px;
          line-height: 1.65;
          color: var(--color-text-secondary);
        }
        @media (max-width: 940px) {
          .login-shell {
            grid-template-columns: 1fr;
            min-height: auto;
          }
          .login-story { padding: 32px 28px 4px; }
          .login-panel-wrap { padding: 16px 18px 20px; }
          .login-hero-title { max-width: 12ch; }
          .login-stage { min-height: 260px; }
        }
        @media (max-width: 720px) {
          .login-page { padding: 16px; }
          .login-shell { border-radius: 26px; }
          .login-note { display: none; }
          .login-stage { min-height: 200px; }
          .login-panel { padding: 24px 20px 20px; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
        @media (prefers-color-scheme: dark) {
          .login-shell {
            border-color: rgba(255,255,255,0.08);
            background: linear-gradient(135deg, rgba(28,30,32,0.92), rgba(22,24,26,0.96));
            box-shadow: 0 30px 100px rgba(0,0,0,0.5);
          }
          .login-story {
            background: radial-gradient(circle at 22% 18%, rgba(52,177,93,0.10), transparent 36%);
          }
          .login-panel-wrap {
            background: rgba(255,255,255,0.03);
          }
          .login-panel {
            background: rgba(18,20,22,0.95);
            border-color: rgba(255,255,255,0.08);
            box-shadow: 0 18px 48px rgba(0,0,0,0.3);
          }
          .login-note {
            background: rgba(28,30,32,0.85);
            border-color: rgba(255,255,255,0.08);
            box-shadow: 0 18px 38px rgba(0,0,0,0.3);
          }
          .login-note strong { color: rgba(255,255,255,0.85); }
          .login-google-button {
            background: rgba(255,255,255,0.07);
            border-color: rgba(255,255,255,0.10);
            color: rgba(255,255,255,0.88);
            box-shadow: 0 10px 22px rgba(0,0,0,0.2);
          }
          .login-google-button:hover:not(:disabled) {
            background: rgba(255,255,255,0.11);
            box-shadow: 0 16px 30px rgba(0,0,0,0.25);
          }
          .login-field input {
            background: rgba(255,255,255,0.06);
            border-color: rgba(255,255,255,0.10);
            color: rgba(255,255,255,0.9);
          }
          .login-field input::placeholder { color: rgba(255,255,255,0.3); }
          .login-field input:focus {
            border-color: rgba(52,177,93,0.45);
            box-shadow: 0 0 0 5px rgba(52,177,93,0.12);
          }
          .login-feedback[data-tone="error"] {
            color: #fca5a5;
            background: rgba(220,38,38,0.12);
            border-color: rgba(220,38,38,0.18);
          }
          .login-feedback[data-tone="success"] {
            color: #86efac;
            background: rgba(52,177,93,0.12);
            border-color: rgba(52,177,93,0.20);
          }
          .login-feedback[data-tone="info"] {
            color: #93c5fd;
            background: rgba(37,99,235,0.12);
            border-color: rgba(37,99,235,0.18);
          }
        }
      `}</style>

      <div className="login-shell">
        <section className="login-story">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gap: 14 }}>
              <h1 className="login-hero-title">Keep your people warm.</h1>
              <p className="login-hero-copy">Start the day with a clean read on your people.</p>
            </div>
          </div>

          <div className="login-stage">
            {HERO_NOTES.map((note) => (
              <div
                key={note.title}
                className="login-note"
                style={{
                  top: note.top,
                  right: note.right,
                  bottom: note.bottom,
                  left: note.left,
                  ['--note-rotate' as string]: note.rotate,
                } as React.CSSProperties}
              >
                <strong>{note.title}</strong>
                <span>{note.text}</span>
              </div>
            ))}
            <LoginOrb loading={loading} />
          </div>
        </section>

        <section className="login-panel-wrap">
          <div className="login-panel">
            <div className="login-brand">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="5" fill="var(--color-text-primary)"/>
                  <circle cx="42" cy="24" r="2.8" fill="#25B439"/>
                  <circle cx="33" cy="39.6" r="2.8" fill="#FF6B8A"/>
                  <circle cx="15" cy="39.6" r="2.8" fill="#F5A623"/>
                  <circle cx="6"  cy="24" r="2.8" fill="#7E57C2"/>
                  <circle cx="15" cy="8.4" r="2.8" fill="#E53935"/>
                  <circle cx="33" cy="8.4" r="2.8" fill="#00BFA5"/>
                </svg>
                <p className="login-brand-mark">realdeal</p>
              </div>
              <p className="login-brand-copy">Feed what feeds you.</p>
            </div>

            <div className="login-auth-header">
              <h2>{signUpSuccess ? 'Check your inbox' : authTitle}</h2>
              <p>
                {signUpSuccess ? 'Your account is almost live.' : authCopy}
              </p>
            </div>

            {signUpSuccess ? (
              <div className="login-success">
                <div className="login-success-badge">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 7-4-14-3 7H2" />
                  </svg>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <h3>One click and you are in.</h3>
                  <p>
                    We sent a verification link to <strong>{email}</strong>. Open it from this device and you will land right back here.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="login-google-button"
                >
                  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.06 24.06 0 0 0 0 21.56l7.98-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  <span>{loading ? (loadingLabel ?? 'Working...') : 'Continue with Google'}</span>
                </button>

                <div className="login-divider">
                  <span>or use email</span>
                </div>

                <form onSubmit={handleEmailAuth} className="login-form">
                  <label className="login-field">
                    <span>Email</span>
                    <input
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (feedback) setFeedback(null) }}
                      required
                    />
                  </label>

                  <label className="login-field">
                    <span>Password</span>
                    <input
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (feedback) setFeedback(null) }}
                      required
                      minLength={6}
                    />
                  </label>

                  <button type="submit" disabled={loading} className="login-primary-button">
                    {loading ? (loadingLabel ?? 'Please wait...') : isSignUp ? 'Create account' : 'Sign in'}
                  </button>
                </form>

                <div className="login-auth-actions">
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(!isSignUp); setFeedback(null) }}
                    className="login-secondary-link"
                  >
                    {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                  </button>

                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!email) { setFeedback({ tone: 'error', text: 'Enter your email first.' }); return }
                        setLoading(true)
                        setLoadingLabel('Sending the reset link...')
                        setFeedback(null)
                        const { error } = await supabase.auth.resetPasswordForEmail(email, {
                          redirectTo: `${window.location.origin}/reset-password`,
                        })
                        setLoading(false)
                        setLoadingLabel(null)
                        if (error) setFeedback({ tone: 'error', text: error.message })
                        else setFeedback({ tone: 'success', text: 'Check your inbox for the reset link.' })
                      }}
                      className="login-secondary-link"
                      style={{ color: 'var(--color-brand)', fontWeight: 600 }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
              </>
            )}

            {feedback && (
              <div className="login-feedback" data-tone={feedback.tone}>
                {feedback.text}
              </div>
            )}

            <div className="login-demo-row">
              <button
                onClick={() => { setDemoMode(true); window.location.href = '/' }}
                className="login-demo-link"
                type="button"
              >
                Just looking? Try the demo
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
