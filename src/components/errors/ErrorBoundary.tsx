import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', gap: 16, padding: 32, fontFamily: 'var(--font-body, system-ui)',
        background: 'var(--color-bg, #FAF8F4)',
      }}>
        <div style={{ fontSize: 48 }}>:(</div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary, #000)' }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary, #666)', maxWidth: 400, textAlign: 'center' }}>
          {this.state.error?.message || 'An unexpected error occurred.'}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 24px', fontSize: 14, fontWeight: 600,
            background: 'var(--color-brand, #7C5CFC)', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </div>
    )
  }
}
