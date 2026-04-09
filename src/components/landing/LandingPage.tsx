import { useNavigate } from 'react-router'
import { setDemoMode } from '@/lib/sampleData'

const FEATURES = [
  {
    title: 'Visual Network Map',
    desc: 'See your entire relationship universe as an interactive orb map. Drill into pods, categories, and individual connections.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="8" fill="var(--color-brand)" opacity="0.9" />
        <circle cx="10" cy="10" r="4" fill="var(--color-brand)" opacity="0.5" />
        <circle cx="32" cy="12" r="3" fill="var(--color-brand)" opacity="0.4" />
        <circle cx="30" cy="32" r="5" fill="var(--color-brand)" opacity="0.6" />
        <circle cx="8" cy="30" r="3" fill="var(--color-brand)" opacity="0.35" />
        <line x1="20" y1="20" x2="10" y2="10" stroke="var(--color-brand)" strokeWidth="1" opacity="0.3" />
        <line x1="20" y1="20" x2="32" y2="12" stroke="var(--color-brand)" strokeWidth="1" opacity="0.3" />
        <line x1="20" y1="20" x2="30" y2="32" stroke="var(--color-brand)" strokeWidth="1" opacity="0.3" />
        <line x1="20" y1="20" x2="8" y2="30" stroke="var(--color-brand)" strokeWidth="1" opacity="0.3" />
      </svg>
    ),
  },
  {
    title: 'Social Equity Scoring',
    desc: 'Track relationship health with a 0-100 score based on interaction recency, frequency, and depth. Know who needs attention.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="16" stroke="var(--color-brand)" strokeWidth="3" opacity="0.2" />
        <path d="M 20 4 A 16 16 0 1 1 6.34 28" stroke="var(--color-brand)" strokeWidth="3" strokeLinecap="round" />
        <text x="20" y="24" textAnchor="middle" fill="var(--color-brand)" fontSize="12" fontWeight="700">85</text>
      </svg>
    ),
  },
  {
    title: 'Smart Pods',
    desc: 'Organize contacts into pods with custom cadences. RealDeal nudges you when relationships need nurturing.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect x="4" y="8" width="14" height="10" rx="4" fill="var(--color-brand)" opacity="0.7" />
        <rect x="22" y="4" width="14" height="10" rx="4" fill="var(--color-brand)" opacity="0.5" />
        <rect x="14" y="22" width="14" height="10" rx="4" fill="var(--color-brand)" opacity="0.6" />
      </svg>
    ),
  },
]

const STEPS = [
  { num: '1', title: 'Import', desc: 'Bring your contacts from CSV or add them manually.' },
  { num: '2', title: 'Organize', desc: 'Group into pods and categories that match how you think.' },
  { num: '3', title: 'Connect', desc: 'Get smart nudges and track every interaction effortlessly.' },
]

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', maxWidth: 1120, margin: '0 auto',
      }}>
        <span style={{
          fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 800,
          color: 'var(--color-text-primary)', letterSpacing: '-0.02em',
        }}>
          RealDeal
        </span>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)',
              background: 'transparent', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
              color: 'var(--color-text-primary)',
            }}
          >
            Sign in
          </button>
          <button
            onClick={() => navigate('/login?signup=1')}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: 'var(--color-brand)', color: '#fff', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
            }}
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        maxWidth: 1120, margin: '0 auto', padding: '80px 24px 64px',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontSize: 'clamp(36px, 6vw, 64px)',
          fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1,
          color: 'var(--color-text-primary)', margin: '0 0 20px',
        }}>
          Feed what feeds you
        </h1>
        <p style={{
          fontSize: 'clamp(16px, 2.5vw, 20px)', lineHeight: 1.6,
          color: 'var(--color-text-secondary)', maxWidth: 560, margin: '0 auto 40px',
        }}>
          The relationship OS for people who build through connection.
          Track, nurture, and deepen every relationship that matters.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/login?signup=1')}
            style={{
              padding: '14px 32px', borderRadius: 10, border: 'none',
              background: 'var(--color-brand)', color: '#fff', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600,
              boxShadow: '0 4px 16px rgba(37,180,57,0.25)',
            }}
          >
            Get Started - Free
          </button>
          <button
            onClick={() => { setDemoMode(true); window.location.href = '/pods' }}
            style={{
              padding: '14px 32px', borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.12)', background: 'var(--surface-panel)',
              cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 500,
              color: 'var(--color-text-primary)',
            }}
          >
            Try the Demo
          </button>
        </div>

        {/* Decorative orbs */}
        <div style={{ position: 'relative', height: 200, marginTop: 48 }}>
          {[
            { size: 80, x: '20%', y: 20, opacity: 0.7 },
            { size: 48, x: '45%', y: 60, opacity: 0.5 },
            { size: 64, x: '70%', y: 10, opacity: 0.6 },
            { size: 36, x: '85%', y: 80, opacity: 0.4 },
            { size: 52, x: '10%', y: 90, opacity: 0.45 },
          ].map((orb, i) => (
            <div
              key={i}
              style={{
                position: 'absolute', left: orb.x, top: orb.y,
                width: orb.size, height: orb.size, borderRadius: '50%',
                background: `linear-gradient(135deg, var(--color-brand), #1A8A2A)`,
                opacity: orb.opacity,
                boxShadow: '0 4px 20px rgba(37,180,57,0.18)',
              }}
            />
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{
        maxWidth: 1120, margin: '0 auto', padding: '0 24px 80px',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 700,
          textAlign: 'center', color: 'var(--color-text-primary)',
          letterSpacing: '-0.02em', marginBottom: 48,
        }}>
          Everything you need to stay connected
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
        }}>
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                background: 'var(--surface-panel)',
                border: 'var(--surface-panel-border)',
                borderRadius: 16, padding: '32px 28px',
              }}
            >
              <div style={{ marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{
                fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600,
                color: 'var(--color-text-primary)', marginBottom: 8, letterSpacing: '-0.01em',
              }}>
                {f.title}
              </h3>
              <p style={{
                fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-secondary)', margin: 0,
              }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{
        background: 'var(--color-brand)', padding: '64px 24px', borderRadius: '20px 20px 0 0',
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <h2 style={{
            fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 700,
            textAlign: 'center', color: '#fff', letterSpacing: '-0.02em', marginBottom: 48,
          }}>
            How it works
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 32,
          }}>
            {STEPS.map((s) => (
              <div key={s.num} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.20)', color: '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 700, marginBottom: 16,
                }}>
                  {s.num}
                </div>
                <h3 style={{
                  fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 700,
                  color: '#fff', marginBottom: 8,
                }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.70)', margin: 0 }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA footer */}
      <section style={{
        background: 'var(--color-brand)', padding: '0 24px 80px', textAlign: 'center',
      }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{
            fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 800,
            color: '#fff', letterSpacing: '-0.02em', marginBottom: 16,
          }}>
            Ready to invest in your relationships?
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.70)', marginBottom: 32 }}>
            Join RealDeal and start building deeper connections today.
          </p>
          <button
            onClick={() => navigate('/login?signup=1')}
            style={{
              padding: '14px 40px', borderRadius: 10, border: 'none',
              background: '#fff', color: 'var(--color-brand)', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            }}
          >
            Get Started - Free
          </button>
        </div>
      </section>
    </div>
  )
}
