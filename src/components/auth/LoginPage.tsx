import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { signInWithGoogle } from '@/lib/auth'
import { setDemoMode } from '@/lib/sampleData'

type FeedbackTone = 'error' | 'success' | 'info'

export function LoginPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; text: string } | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 5) return 'Still up'
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    if (h < 21) return 'Good evening'
    return 'Good night'
  })()

  useEffect(() => {
    if (!session) return
    const returnTo = searchParams.get('return_to') ?? '/'
    navigate(returnTo.startsWith('/') ? returnTo : '/', { replace: true })
  }, [session, navigate, searchParams])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setFeedback(null)
    const result = await signInWithGoogle()
    if (result.error) {
      setFeedback({ tone: 'error', text: 'Sign in failed. Please try again.' })
      setLoading(false)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setFeedback({ tone: 'error', text: error.message })
      setLoading(false)
    }
  }

  const handleForgot = async () => {
    if (!email) { setFeedback({ tone: 'error', text: 'Enter your email first.' }); return }
    setLoading(true)
    setFeedback(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) setFeedback({ tone: 'error', text: error.message })
    else setFeedback({ tone: 'success', text: 'Check your inbox for the reset link.' })
  }

  return (
    <div className="login-page">
      <style>{`
        .login-page {
          min-height: 100vh;
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-bg);
          color: var(--color-text-primary);
          font-family: var(--font-sans);
        }
        .login-card {
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          animation: login-rise 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes login-rise {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-greeting {
          display: inline-block;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-text-tertiary);
          margin-bottom: 12px;
          opacity: 0;
          animation: login-fade 700ms ease 180ms forwards;
        }
        @keyframes login-fade { to { opacity: 1; } }
        .login-title {
          margin: 0 0 8px;
          font-family: var(--font-serif);
          font-weight: 500;
          font-size: 40px;
          line-height: 1.05;
          letter-spacing: -0.03em;
        }
        .login-subtitle {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
          color: var(--color-text-secondary);
        }
        .login-google {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid var(--edge);
          background: transparent;
          color: var(--color-text-primary);
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          font-family: var(--font-sans);
          transition: background 0.15s ease;
        }
        .login-google:hover:not(:disabled) { background: rgba(0,0,0,0.03); }
        .login-google:disabled,
        .login-primary:disabled { cursor: wait; opacity: 0.6; }
        .login-divider {
          display: flex;
          align-items: center;
          gap: 12px;
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
        .login-form input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid var(--edge);
          background: transparent;
          font-size: 14px;
          font-family: var(--font-sans);
          color: var(--color-text-primary);
          outline: none;
          transition: border-color 0.15s ease;
        }
        .login-form input:focus { border-color: var(--color-accent); }
        .login-primary {
          width: 100%;
          padding: 12px 16px;
          border: none;
          border-radius: 10px;
          background: var(--color-accent);
          color: #fff;
          font-size: 14px;
          font-weight: 500;
          font-family: var(--font-sans);
          cursor: pointer;
          transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.18s ease, filter 0.18s ease;
          box-shadow: 0 1px 0 rgba(0,0,0,0.04);
        }
        .login-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(0, 61, 165, 0.18);
          filter: brightness(1.04);
        }
        .login-primary:active:not(:disabled) { transform: translateY(0); }
        @media (prefers-reduced-motion: reduce) {
          .login-card, .login-greeting { animation: none; opacity: 1; transform: none; }
          .login-primary, .login-google { transition: none; }
        }
        .login-links {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          font-size: 13px;
        }
        .login-link {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          font-family: var(--font-sans);
          font-size: 13px;
          color: var(--color-text-secondary);
        }
        .login-link:hover { color: var(--color-text-primary); }
        .login-link.accent { color: var(--color-accent); }
        .login-feedback {
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 13px;
          line-height: 1.5;
        }
        .login-feedback[data-tone="error"] { color: var(--color-error); background: rgba(214,90,74,0.08); }
        .login-feedback[data-tone="success"] { color: var(--color-success); background: rgba(37,180,57,0.08); }
        .login-feedback[data-tone="info"] { color: var(--color-info); background: rgba(91,121,255,0.08); }
        .login-footer {
          margin-top: 8px;
          padding-top: 20px;
          border-top: 1px solid var(--edge);
          font-size: 13px;
          line-height: 1.6;
          color: var(--color-text-secondary);
          text-align: center;
        }
        .login-footer button { color: var(--color-accent); font-weight: 500; }
      `}</style>

      <div className="login-card">
        <div>
          <span className="login-greeting">{greeting}</span>
          <h1 className="login-title">Welcome back</h1>
          <p className="login-subtitle">Keep your people warm.</p>
        </div>

        <button onClick={handleGoogleSignIn} disabled={loading} className="login-google">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.06 24.06 0 0 0 0 21.56l7.98-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="login-divider"><span>or</span></div>

        <form onSubmit={handleEmailAuth} className="login-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (feedback) setFeedback(null) }}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (feedback) setFeedback(null) }}
            required
            minLength={6}
          />
          <button type="submit" disabled={loading} className="login-primary">
            {loading ? 'Please wait...' : 'Sign in'}
          </button>
        </form>

        <div className="login-links">
          <button type="button" onClick={handleForgot} className="login-link accent">
            Forgot password?
          </button>
        </div>

        {feedback && (
          <div className="login-feedback" data-tone={feedback.tone}>
            {feedback.text}
          </div>
        )}

        <div className="login-footer">
          Don't have an account?{' '}
          <button onClick={() => navigate('/waitlist')} type="button" className="login-link accent">
            Join the wait list
          </button>
          {' - or - '}
          <button onClick={() => { setDemoMode(true); window.location.href = '/' }} type="button" className="login-link">
            try the demo
          </button>
        </div>
      </div>
    </div>
  )
}
