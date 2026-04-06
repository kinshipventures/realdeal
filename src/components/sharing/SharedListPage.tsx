import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router'
import { getShareLink, getSharedContacts, verifyPin } from '../../lib/sharing'
import type { ShareLink } from '../../lib/types'

type State = 'loading' | 'expired' | 'pin_required' | 'pin_error' | 'ready'

type SharedContact = {
  name: string
  role: string | null
  company: string | null
  pod_name: string
}

const COLUMN_LABELS: Record<string, string> = {
  name: 'Name',
  role: 'Role',
  company: 'Company',
  pod: 'Pod',
}

export function SharedListPage() {
  const { token } = useParams<{ token: string }>()
  const [state, setState] = useState<State>('loading')
  const [shareLink, setShareLink] = useState<ShareLink | null>(null)
  const [contacts, setContacts] = useState<SharedContact[]>([])
  const [pinInput, setPinInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!token) { setState('expired'); return }
    getShareLink(token).then(link => {
      if (!link) { setState('expired'); return }
      const now = new Date().toISOString()
      if (link.revoked_at || link.expires_at < now) { setState('expired'); return }
      setShareLink(link)
      if (link.pin_hash) {
        setState('pin_required')
      } else {
        loadContacts(link)
      }
    }).catch(() => setState('expired'))
  }, [token])

  function loadContacts(link: ShareLink) {
    getSharedContacts(link).then(rows => {
      setContacts(rows)
      setState('ready')
    }).catch(() => setState('expired'))
  }

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!shareLink?.pin_hash) return
    const ok = await verifyPin(pinInput, shareLink.pin_hash)
    if (ok) {
      setState('loading')
      loadContacts(shareLink)
    } else {
      setState('pin_error')
    }
  }

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts
    const q = search.toLowerCase()
    return contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.role ?? '').toLowerCase().includes(q) ||
      (c.company ?? '').toLowerCase().includes(q)
    )
  }, [contacts, search])

  const podName = shareLink ? contacts[0]?.pod_name ?? '' : ''
  const columns = shareLink?.visible_columns ?? ['name', 'role', 'company', 'pod']

  if (state === 'loading') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Loading...</div>
      </div>
    )
  }

  if (state === 'expired') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}>
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 700,
            fontSize: 20,
            color: 'var(--color-text-primary)',
            marginBottom: 24,
          }}>
            RealDeal
          </div>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 700,
            fontSize: 24,
            color: 'var(--color-text-primary)',
            marginBottom: 12,
          }}>
            This link has expired
          </div>
          <div style={{
            fontSize: 13,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
          }}>
            The person who shared this list may be able to generate a new link.
          </div>
        </div>
      </div>
    )
  }

  if (state === 'pin_required' || state === 'pin_error') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}>
        <div style={{ maxWidth: 360, width: '100%' }}>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 700,
            fontSize: 20,
            color: 'var(--color-text-primary)',
            marginBottom: 24,
            textAlign: 'center',
          }}>
            RealDeal
          </div>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 700,
            fontSize: 22,
            color: 'var(--color-text-primary)',
            marginBottom: 20,
            textAlign: 'center',
          }}>
            Enter PIN to view
          </div>
          <form onSubmit={handlePinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={20}
              value={pinInput}
              onChange={e => { setPinInput(e.target.value); if (state === 'pin_error') setState('pin_required') }}
              placeholder="PIN"
              style={{
                padding: '10px 14px',
                border: `1px solid ${state === 'pin_error' ? '#e53e3e' : 'var(--edge-strong)'}`,
                borderRadius: 8,
                fontSize: 15,
                fontFamily: 'inherit',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                outline: 'none',
                textAlign: 'center',
                letterSpacing: '0.15em',
              }}
            />
            {state === 'pin_error' && (
              <div style={{ fontSize: 12, color: '#e53e3e', textAlign: 'center' }}>
                Incorrect PIN. Try again.
              </div>
            )}
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                background: 'var(--color-brand)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              View list
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      padding: '32px 16px 80px',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 700,
            fontSize: 24,
            color: 'var(--color-text-primary)',
            marginBottom: 4,
          }}>
            {podName}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Shared list
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search people..."
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--edge-strong)',
              borderRadius: 8,
              fontSize: 13,
              fontFamily: 'inherit',
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {columns.map(col => (
                  <th
                    key={col}
                    style={{
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 500,
                      color: 'var(--color-text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '0 12px 10px',
                      borderBottom: '1px solid var(--edge)',
                    }}
                  >
                    {COLUMN_LABELS[col] ?? col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredContacts.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    style={{
                      padding: '24px 12px',
                      textAlign: 'center',
                      fontSize: 13,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {search ? 'No people match your search.' : 'No people in this list.'}
                  </td>
                </tr>
              ) : filteredContacts.map((c, i) => (
                <tr key={i}>
                  {columns.map(col => {
                    let value: string | null = null
                    if (col === 'name') value = c.name
                    else if (col === 'role') value = c.role
                    else if (col === 'company') value = c.company
                    else if (col === 'pod') value = c.pod_name
                    return (
                      <td
                        key={col}
                        style={{
                          padding: '12px',
                          fontSize: 13,
                          color: value ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                          borderBottom: '1px solid var(--edge)',
                        }}
                      >
                        {value ?? '-'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 48,
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--color-text-tertiary)',
        }}>
          Powered by RealDeal
        </div>
      </div>
    </div>
  )
}
