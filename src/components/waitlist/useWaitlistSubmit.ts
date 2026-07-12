import { useState, type FormEvent } from 'react'

export type WaitlistStatus = 'idle' | 'loading' | 'exiting' | 'done'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function useWaitlistSubmit() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<WaitlistStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const updateEmail = (value: string) => {
    setEmail(value)
    if (error) setError(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (status !== 'idle') return
    const trimmed = email.trim()
    if (!trimmed) {
      setError('Enter your email to join.')
      return
    }
    if (!EMAIL_RE.test(trimmed)) {
      setError('That email does not look right.')
      return
    }
    setStatus('loading')
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          source: window.location.pathname,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error ?? 'Could not join the waitlist')
    } catch (err) {
      setStatus('idle')
      setError(err instanceof Error ? err.message : 'Could not join the waitlist')
      return
    }
    window.setTimeout(() => {
      setStatus('exiting')
      window.setTimeout(() => setStatus('done'), 260)
    }, 600)
  }

  return { email, setEmail: updateEmail, status, error, submit }
}
