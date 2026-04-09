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

const TESTIMONIALS = [
  {
    quote: 'RealDeal transformed how I manage relationships across our 150+ portfolio companies. I finally have a system that matches how I actually think about my network.',
    name: 'Moj Mahdara',
    role: 'Co-Founder & Managing Partner, Kinship Ventures',
    initials: 'MM',
  },
  {
    quote: 'The best relationships are the ones you invest in consistently. RealDeal makes that effortless - it is like having a relationship coach in your pocket.',
    name: 'Gwyneth Paltrow',
    role: 'Founder, goop & Partner, Kinship Ventures',
    initials: 'GP',
  },
  {
    quote: 'High-agency relationship building requires real tools, not just good intentions. RealDeal gives our team the structure to stay deeply connected.',
    name: 'Trina Spear',
    role: 'CEO, FIGS & Partner, Kinship Ventures',
    initials: 'TS',
  },
]

function AppPreviewMockup() {
  return (
    <div style={{
      maxWidth: 720, margin: '0 auto', borderRadius: 12,
      boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
      overflow: 'hidden', background: '#F5F4F0',
    }}>
      {/* Title bar */}
      <div style={{
        height: 36, background: '#E8E7E3', display: 'flex', alignItems: 'center',
        padding: '0 12px', gap: 8,
      }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFBD2E' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
        <span style={{
          flex: 1, textAlign: 'center', fontSize: 12, color: 'rgba(0,0,0,0.4)',
          fontFamily: 'var(--font-sans)', marginRight: 52,
        }}>
          RealDeal - Network Map
        </span>
      </div>
      {/* App content */}
      <svg viewBox="0 0 720 380" fill="none" style={{ display: 'block', width: '100%' }}>
        <rect width="720" height="380" fill="#F5F4F0" />
        {/* Connection lines */}
        <line x1="360" y1="190" x2="200" y2="100" stroke="#25B439" strokeWidth="1.5" opacity="0.2" />
        <line x1="360" y1="190" x2="520" y2="100" stroke="#25B439" strokeWidth="1.5" opacity="0.2" />
        <line x1="360" y1="190" x2="180" y2="280" stroke="#25B439" strokeWidth="1.5" opacity="0.2" />
        <line x1="360" y1="190" x2="540" y2="280" stroke="#25B439" strokeWidth="1.5" opacity="0.2" />
        <line x1="360" y1="190" x2="140" y2="190" stroke="#25B439" strokeWidth="1.5" opacity="0.2" />
        <line x1="360" y1="190" x2="580" y2="190" stroke="#25B439" strokeWidth="1.5" opacity="0.2" />
        {/* Hub orb */}
        <circle cx="360" cy="190" r="48" fill="url(#hubGrad)" />
        <circle cx="360" cy="190" r="52" stroke="#25B439" strokeWidth="3" opacity="0.3" fill="none" />
        <text x="360" y="185" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="var(--font-serif)">RealDeal</text>
        <text x="360" y="200" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="10">Score: 78</text>
        {/* Pod orbs */}
        <circle cx="200" cy="100" r="32" fill="url(#pod1Grad)" />
        <circle cx="200" cy="100" r="36" stroke="#25B439" strokeWidth="2" strokeDasharray="180 226" strokeLinecap="round" fill="none" opacity="0.5" />
        <text x="200" y="104" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">LPs</text>

        <circle cx="520" cy="100" r="28" fill="url(#pod2Grad)" />
        <circle cx="520" cy="100" r="32" stroke="#D97706" strokeWidth="2" strokeDasharray="140 201" strokeLinecap="round" fill="none" opacity="0.5" />
        <text x="520" y="104" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">Talent</text>

        <circle cx="180" cy="280" r="26" fill="url(#pod3Grad)" />
        <text x="180" y="284" textAnchor="middle" fill="white" fontSize="9" fontWeight="600">Advisors</text>

        <circle cx="540" cy="280" r="30" fill="url(#pod4Grad)" />
        <circle cx="540" cy="280" r="34" stroke="#7C3AED" strokeWidth="2" strokeDasharray="170 214" strokeLinecap="round" fill="none" opacity="0.5" />
        <text x="540" y="284" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">Founders</text>

        <circle cx="140" cy="190" r="24" fill="url(#pod5Grad)" />
        <text x="140" y="194" textAnchor="middle" fill="white" fontSize="9" fontWeight="600">Media</text>

        <circle cx="580" cy="190" r="22" fill="url(#pod6Grad)" />
        <text x="580" y="194" textAnchor="middle" fill="white" fontSize="9" fontWeight="600">VCs</text>

        <defs>
          <linearGradient id="hubGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#25B439" />
            <stop offset="100%" stopColor="#1A8A2A" />
          </linearGradient>
          <linearGradient id="pod1Grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#25B439" />
            <stop offset="100%" stopColor="#1A8A2A" />
          </linearGradient>
          <linearGradient id="pod2Grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id="pod3Grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
          <linearGradient id="pod4Grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#6D28D9" />
          </linearGradient>
          <linearGradient id="pod5Grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#DB2777" />
          </linearGradient>
          <linearGradient id="pod6Grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

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
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
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

        <AppPreviewMockup />
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

      {/* Social proof */}
      <section style={{
        maxWidth: 1120, margin: '0 auto', padding: '0 24px 80px',
      }}>
        <p style={{
          textAlign: 'center', fontSize: 14, color: 'var(--color-text-secondary)',
          marginBottom: 40, letterSpacing: '0.02em', textTransform: 'uppercase', fontWeight: 500,
        }}>
          As used by{' '}
          <a
            href="https://kinshipventures.co"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--color-brand)', textDecoration: 'none', fontWeight: 600 }}
          >
            Kinship Ventures
          </a>
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
        }}>
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              style={{
                background: 'var(--surface-panel)',
                border: 'var(--surface-panel-border)',
                borderRadius: 16, padding: '28px 24px',
              }}
            >
              <p style={{
                fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: 1.7,
                color: 'var(--color-text-primary)', margin: '0 0 20px',
                fontStyle: 'italic',
              }}>
                "{t.quote}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'var(--color-brand)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700,
                }}>
                  {t.initials}
                </div>
                <div>
                  <div style={{
                    fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)',
                  }}>
                    {t.name}
                  </div>
                  <div style={{
                    fontSize: 12, color: 'var(--color-text-secondary)',
                  }}>
                    {t.role}
                  </div>
                </div>
              </div>
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
