import { useEffect, useRef, useState } from 'react'

interface InsightMessage {
  role: 'user' | 'assistant'
  text: string
}

interface DemoConversation {
  prompt: string
  response: string
}

const DEMO_CONVERSATIONS: DemoConversation[] = [
  {
    prompt: 'Who should I reconnect with this week?',
    response: "Your Investors pod is cooling at 61/100. Sarah Chen hasn't heard from you in 34 days - your cadence is monthly, so she's overdue. Marcus Johnson and Priya Nair are close behind. A 15-min check-in with each would bring this pod back to Steady.",
  },
  {
    prompt: "What's trending in my network?",
    response: "You're up 40% in interactions this week - 8 vs 5 last week. Your strongest pod is Portfolio Companies at 82/100. One thing to watch: you've had 3 meetings and 0 follow-up notes logged. People you meet once tend to drift if you don't close the loop.",
  },
  {
    prompt: 'Give me a network health summary.',
    response: "Your network is Steady at 67/100. Most of your core pods are healthy, but 4 people are overdue for outreach. You've been consistent with calls and meetings - your Depth score is strong. Where you're losing ground: Reach. Only 31% of your contacts have been touched in the last 30 days.",
  },
]

interface AiInsightsWidgetProps {
  overallScore: number
  peopleTouched?: number
  overdueCount?: number
  topPodName?: string
  topPodScore?: number
}

export function AiInsightsWidget({
  overallScore,
  peopleTouched = 0,
  overdueCount = 0,
}: AiInsightsWidgetProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<InsightMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, typing])

  function handlePromptClick(convo: DemoConversation) {
    setOpen(true)
    setMessages([{ role: 'user', text: convo.prompt }])
    setTyping(true)
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', text: convo.response }])
      setTyping(false)
    }, 900)
  }

  function handleReset() {
    setMessages([])
    setInputValue('')
    setTyping(false)
  }

  // Collapsed: floating FAB
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 90,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #25B439, #00BFA5)',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(37,180,57,0.35), 0 2px 8px rgba(0,0,0,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.05)'
          e.currentTarget.style.boxShadow = '0 10px 28px rgba(37,180,57,0.42), 0 2px 8px rgba(0,0,0,0.14)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,180,57,0.35), 0 2px 8px rgba(0,0,0,0.12)'
        }}
        aria-label="Open network insights chat"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      </button>
    )
  }

  // Expanded: floating panel
  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 90,
      width: 380,
      maxWidth: 'calc(100vw - 32px)',
      maxHeight: 'calc(100vh - 48px)',
      background: 'var(--surface-panel)',
      backdropFilter: 'var(--panel-blur)',
      WebkitBackdropFilter: 'var(--panel-blur)',
      border: 'var(--surface-panel-border)',
      borderRadius: 16,
      boxShadow: '0 12px 40px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.06)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      animation: 'aiPanelIn 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--divider)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: 'linear-gradient(135deg, #25B439, #00BFA5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
            Network Insights
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', letterSpacing: '0.04em' }}>
            Ask about your relationships
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleReset}
            style={{ fontSize: 11, color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}
          >
            clear
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          style={{
            width: 26, height: 26, borderRadius: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-text-tertiary)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--tint)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Body (scrollable) */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {messages.length === 0 ? (
          <>
            {/* Stat row */}
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--divider)',
              display: 'flex', gap: 0,
            }}>
              {[
                { label: 'Health', value: overallScore, unit: '/100' },
                { label: 'Reached', value: peopleTouched, unit: ' wk' },
                { label: 'Overdue', value: overdueCount, unit: '', warn: overdueCount > 0 },
              ].map((stat, i) => (
                <div key={i} style={{
                  flex: 1,
                  padding: '0 12px',
                  borderLeft: i > 0 ? '1px solid var(--divider)' : 'none',
                  textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: 20, fontWeight: 700,
                    fontFamily: 'var(--font-display)',
                    color: stat.warn ? '#b45309' : 'var(--color-text-primary)',
                    letterSpacing: '-0.03em', lineHeight: 1,
                    marginBottom: 3,
                  }}>
                    {stat.value}
                    <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--color-text-tertiary)', letterSpacing: 0 }}>
                      {stat.unit}
                    </span>
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Prompt suggestions */}
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                Ask about your network
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {DEMO_CONVERSATIONS.map((convo, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handlePromptClick(convo)}
                    style={{
                      background: 'var(--tint)',
                      border: '1px solid var(--edge)',
                      borderRadius: 8,
                      padding: '9px 12px',
                      fontSize: 12,
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      lineHeight: 1.4,
                      transition: 'background 0.12s ease, border-color 0.12s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(37,180,57,0.06)'
                      e.currentTarget.style.borderColor = 'rgba(37,180,57,0.25)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'var(--tint)'
                      e.currentTarget.style.borderColor = 'var(--edge)'
                    }}
                  >
                    <span style={{ color: 'var(--color-brand)', marginRight: 6, fontSize: 10 }}>&#x25B6;</span>
                    {convo.prompt}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                gap: 8,
              }}>
                {msg.role === 'assistant' && (
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #25B439, #00BFA5)',
                    flexShrink: 0, marginTop: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  </div>
                )}
                <div style={{
                  maxWidth: '82%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.role === 'user' ? 'var(--color-brand)' : 'var(--tint)',
                  border: msg.role === 'assistant' ? '1px solid var(--edge)' : 'none',
                  fontSize: 13,
                  color: msg.role === 'user' ? '#fff' : 'var(--color-text-primary)',
                  lineHeight: 1.55,
                }}>
                  {msg.text}
                </div>
              </div>
            ))}

            {typing && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #25B439, #00BFA5)',
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </div>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '14px 14px 14px 4px',
                  background: 'var(--tint)',
                  border: '1px solid var(--edge)',
                  display: 'flex', gap: 4, alignItems: 'center',
                }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: 'var(--color-text-tertiary)',
                      display: 'inline-block',
                      animation: `typingDot 1.2s ${i * 0.2}s ease-in-out infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid var(--divider)',
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Ask about your network..."
          style={{
            flex: 1,
            background: 'var(--tint)',
            border: '1px solid var(--edge)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            color: 'var(--color-text-primary)',
            outline: 'none',
            fontFamily: 'inherit',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(37,180,57,0.4)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--edge)' }}
        />
        <button
          type="button"
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--color-brand)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { opacity: 0.3; transform: scale(1); }
          30% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes aiPanelIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
