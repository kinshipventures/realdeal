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

  const submit = (e: FormEvent) => {
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
    setTimeout(() => {
      setStatus('exiting')
      setTimeout(() => setStatus('done'), 260)
    }, 600)
  }

  return { email, setEmail: updateEmail, status, error, submit }
}
