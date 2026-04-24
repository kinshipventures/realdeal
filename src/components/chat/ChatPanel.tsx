import { useEffect, useRef, useState } from 'react'

interface Message {
  id: number
  from: 'kinship' | 'user'
  text: string
}

const WELCOME: Message = {
  id: 0,
  from: 'kinship',
  text: "Hey - I've been looking at your network health. You have 3 pods in the yellow zone. Want to talk through who needs a touch this week?",
}

function respond(input: string): string {
  const t = input.toLowerCase()
  if (t.includes('who') || t.includes('reach out')) {
    return "Based on your equity scores, Sarah Chen in your Inner Circle pod is cooling off - you haven't connected in 28 days. Your cadence is biweekly. A quick text would go a long way."
  }
  if (t.includes('pod')) {
    return 'Your strongest pod right now is Investors - 4 out of 5 relationships are thriving. Your Creative Network pod needs the most attention, with 2 relationships in the fading zone.'
  }
  if (t.includes('equity') || t.includes('score')) {
    return "Your overall network equity is 71 - Steady. You've been consistent with your top pods. The drag is coming from your Creative Network - a few relationships have gone quiet."
  }
  if (t.includes('help') || t.includes('today') || t.includes('focus')) {
    return "Today I'd focus on two things: reach out to someone in your Investors pod (keep that momentum), and check in with one person from Creative Network before they go cold."
  }
  return 'Tell me more about what is on your mind - I can look at specific pods, relationships, or your overall network health.'
}

export function ChatPanel() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(1)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, typing, open])

  const send = () => {
    const text = input.trim()
    if (!text) return
    const userMsg: Message = { id: nextId.current++, from: 'user', text }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setTyping(true)
    const reply = respond(text)
    setTimeout(() => {
      setTyping(false)
      setMessages((m) => [...m, { id: nextId.current++, from: 'kinship', text: reply }])
    }, 600)
  }

  return (
    <>
      <style>{`
        @keyframes kinship-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes kinship-dot {
          0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-2px); }
        }
        .kinship-msg { animation: kinship-fade-in 0.25s ease-out; }
        .kinship-dot { animation: kinship-dot 1.1s infinite ease-in-out; }
        .kinship-dot:nth-child(2) { animation-delay: 0.15s; }
        .kinship-dot:nth-child(3) { animation-delay: 0.3s; }
      `}</style>

      {/* Panel */}
      <div
        role="dialog"
        aria-label="Kinship chat"
        aria-hidden={!open}
        style={{
          position: 'fixed',
          bottom: 92,
          right: 24,
          width: 380,
          maxWidth: 'calc(100vw - 32px)',
          height: 520,
          maxHeight: 'calc(100vh - 120px)',
          zIndex: 200,
          background: 'var(--surface-panel)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid var(--edge-strong)',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: open ? 'translateY(0)' : 'translateY(calc(100% + 120px))',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 20px 14px',
            borderBottom: '1px solid var(--edge)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontFamily: 'var(--font-serif)',
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: '-0.01em',
            }}
          >
            K
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: 'var(--text-primary, rgba(0,0,0,0.82))',
                lineHeight: 1.1,
              }}
            >
              Kinship
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 400,
                color: 'var(--text-muted, rgba(0,0,0,0.45))',
                marginTop: 2,
              }}
            >
              Your relationship coach
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted, rgba(0,0,0,0.45))',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              lineHeight: 1,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className="kinship-msg"
              style={{
                alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '82%',
                padding: '10px 14px',
                borderRadius: 14,
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                lineHeight: 1.45,
                background:
                  m.from === 'user'
                    ? 'var(--color-accent)'
                    : 'rgba(0,0,0,0.04)',
                color:
                  m.from === 'user'
                    ? '#fff'
                    : 'var(--text-primary, rgba(0,0,0,0.82))',
                borderBottomRightRadius: m.from === 'user' ? 4 : 14,
                borderBottomLeftRadius: m.from === 'user' ? 14 : 4,
              }}
            >
              {m.text}
            </div>
          ))}
          {typing && (
            <div
              className="kinship-msg"
              style={{
                alignSelf: 'flex-start',
                padding: '12px 14px',
                borderRadius: 14,
                borderBottomLeftRadius: 4,
                background: 'rgba(0,0,0,0.04)',
                display: 'flex',
                gap: 4,
                alignItems: 'center',
              }}
              aria-label="Kinship is thinking"
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="kinship-dot"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.35)',
                    display: 'inline-block',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
          style={{
            padding: '12px 14px 14px',
            borderTop: '1px solid var(--edge)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your network..."
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 100,
              border: '1px solid var(--edge)',
              background: 'rgba(255,255,255,0.6)',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              color: 'var(--text-primary, rgba(0,0,0,0.82))',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--edge)')}
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={!input.trim()}
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              border: 'none',
              background: input.trim() ? 'var(--color-accent)' : 'rgba(0,0,0,0.08)',
              color: '#fff',
              cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.15s, transform 0.15s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </form>
      </div>

      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close Kinship chat' : 'Open Kinship chat'}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: 'none',
          background: 'var(--color-accent)',
          color: '#fff',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,61,165,0.30), 0 2px 6px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)'
          e.currentTarget.style.boxShadow = '0 10px 28px rgba(52,177,93,0.45), 0 2px 6px rgba(0,0,0,0.14)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(52,177,93,0.35), 0 2px 6px rgba(0,0,0,0.12)'
        }}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </>
  )
}
