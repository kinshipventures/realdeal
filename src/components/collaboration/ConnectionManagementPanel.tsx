import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Mail, Send, UserCheck, UserPlus, Users } from 'lucide-react'
import type { RecognizedAppUser, UserConnection } from '@/lib/connections'
import type { Contact } from '@/lib/types'

type ConnectionManagementPanelProps = {
  connections: UserConnection[]
  recognizedUsers: RecognizedAppUser[]
  contacts: Contact[]
  onCreateConnection: (email: string) => Promise<void>
  onRespondConnection: (connection: UserConnection, status: 'accepted' | 'declined' | 'removed') => Promise<void>
}

function contactEmails(contact: Contact): string[] {
  return [contact.email, contact.email_2, contact.email_3]
    .map(email => email?.trim().toLowerCase())
    .filter((email): email is string => Boolean(email))
}

export function ConnectionManagementPanel({
  connections,
  recognizedUsers,
  contacts,
  onCreateConnection,
  onRespondConnection,
}: ConnectionManagementPanelProps) {
  const [email, setEmail] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const acceptedConnections = connections.filter(connection => connection.status === 'accepted')
  const pendingReceived = connections.filter(connection => connection.status === 'pending' && connection.direction === 'received')
  const pendingSent = connections.filter(connection => connection.status === 'pending' && connection.direction === 'sent')
  const contactByEmail = useMemo(() => {
    const map = new Map<string, Contact>()
    contacts.forEach(contact => {
      contactEmails(contact).forEach(contactEmail => {
        if (!map.has(contactEmail)) map.set(contactEmail, contact)
      })
    })
    return map
  }, [contacts])
  const recognizedCards = useMemo(() => {
    const byUserId = new Map<string, RecognizedAppUser>()
    recognizedUsers.forEach(user => {
      if (!byUserId.has(user.user_id)) byUserId.set(user.user_id, user)
    })
    return [...byUserId.values()]
  }, [recognizedUsers])

  async function handleInvite(targetEmail: string) {
    const cleanEmail = targetEmail.trim().toLowerCase()
    if (!cleanEmail) return
    setBusyId(cleanEmail)
    setError('')
    setNotice('')
    try {
      await onCreateConnection(cleanEmail)
      setEmail('')
      setNotice('Connection request sent.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send connection request')
    } finally {
      setBusyId(null)
    }
  }

  async function handleRespond(connection: UserConnection, status: 'accepted' | 'declined' | 'removed') {
    setBusyId(connection.id)
    setError('')
    setNotice('')
    try {
      await onRespondConnection(connection, status)
      setNotice(status === 'accepted' ? 'Connection accepted.' : status === 'removed' ? 'Connection removed.' : 'Connection declined.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update connection')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 850, color: 'var(--color-text-primary)' }}>
            Connections
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.45 }}>
            Add trusted Real Deal users before sharing direct contacts, pods, sub-pods, or campaigns with them.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 360 }}>
          <label style={{ ...inputWrapStyle, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px' }}>
            <Mail size={14} color="var(--color-text-tertiary)" />
            <input
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="Find user by email"
              style={{ border: 0, outline: 'none', background: 'transparent', width: '100%', fontSize: 13, color: 'var(--color-text-primary)' }}
            />
          </label>
          <button type="button" onClick={() => handleInvite(email)} disabled={!email.trim() || Boolean(busyId)} style={{ ...primaryButtonStyle, minWidth: 96, opacity: !email.trim() || busyId ? 0.62 : 1 }}>
            <Send size={14} />
            Invite
          </button>
        </div>
      </div>

      {(notice || error) && (
        <div style={{ ...noticeStyle, color: error ? 'var(--health-fading)' : 'var(--color-brand)' }}>
          {error || notice}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.15fr', gap: 12 }}>
        <div style={surfaceMiniStyle}>
          <ConnectionPanelHeader icon={<UserCheck size={15} />} title="Trusted users" count={acceptedConnections.length} />
          {acceptedConnections.length === 0 ? (
            <MiniEmptyState detail="Accepted users will appear in Share contacts." />
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {acceptedConnections.map(connection => (
                <ConnectionCard
                  key={connection.id}
                  title={connection.connected_display_name || connection.connected_email || 'Real Deal user'}
                  detail={connection.connected_email || 'Connected user'}
                  meta="Connected"
                  actionLabel="Remove"
                  busy={busyId === connection.id}
                  onAction={() => handleRespond(connection, 'removed')}
                />
              ))}
            </div>
          )}
        </div>

        <div style={surfaceMiniStyle}>
          <ConnectionPanelHeader icon={<UserPlus size={15} />} title="Pending requests" count={pendingReceived.length + pendingSent.length} />
          {pendingReceived.length === 0 && pendingSent.length === 0 ? (
            <MiniEmptyState detail="Incoming and sent requests will appear here." />
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {pendingReceived.map(connection => (
                <ConnectionCard
                  key={connection.id}
                  title={connection.connected_display_name || connection.connected_email || 'Real Deal user'}
                  detail={connection.connected_email || 'Pending user'}
                  meta="Incoming request"
                  busy={busyId === connection.id}
                  actionLabel="Accept"
                  secondaryActionLabel="Decline"
                  onAction={() => handleRespond(connection, 'accepted')}
                  onSecondaryAction={() => handleRespond(connection, 'declined')}
                />
              ))}
              {pendingSent.map(connection => (
                <ConnectionCard
                  key={connection.id}
                  title={connection.connected_display_name || connection.connected_email || 'Real Deal user'}
                  detail={connection.connected_email || 'Pending user'}
                  meta="Request sent"
                  busy={busyId === connection.id}
                  actionLabel="Cancel"
                  onAction={() => handleRespond(connection, 'removed')}
                />
              ))}
            </div>
          )}
        </div>

        <div style={surfaceMiniStyle}>
          <ConnectionPanelHeader icon={<Users size={15} />} title="App users in contacts" count={recognizedCards.length} />
          {recognizedCards.length === 0 ? (
            <MiniEmptyState detail="Contacts that match Real Deal user emails will appear here." />
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {recognizedCards.slice(0, 5).map(user => {
                const contact = contactByEmail.get(user.contact_email)
                const isConnected = user.connection_status === 'accepted'
                const isPending = user.connection_status === 'pending'
                return (
                  <ConnectionCard
                    key={user.user_id}
                    title={contact?.name || user.display_name || user.email || 'Real Deal user'}
                    detail={user.email || user.contact_email}
                    meta={isConnected ? 'Connected' : isPending ? 'Pending' : 'Detected contact'}
                    busy={busyId === user.contact_email}
                    actionLabel={isConnected ? undefined : isPending ? undefined : 'Invite'}
                    onAction={isConnected || isPending ? undefined : () => handleInvite(user.email || user.contact_email)}
                  />
                )
              })}
              {recognizedCards.length > 5 && (
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  +{recognizedCards.length - 5} more app users detected in contacts
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ConnectionPanelHeader({ icon, title, count }: { icon: ReactNode; title: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,61,165,0.08)', color: 'var(--color-brand)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </span>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 850, color: 'var(--color-text-primary)' }}>{title}</h4>
      </div>
      <TagPill tone="blue">{count}</TagPill>
    </div>
  )
}

function ConnectionCard({
  title,
  detail,
  meta,
  actionLabel,
  secondaryActionLabel,
  busy,
  onAction,
  onSecondaryAction,
}: {
  title: string
  detail: string
  meta: string
  actionLabel?: string
  secondaryActionLabel?: string
  busy?: boolean
  onAction?: () => void
  onSecondaryAction?: () => void
}) {
  return (
    <div style={{ border: '1px solid var(--edge)', borderRadius: 8, background: 'var(--color-bg)', padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ marginTop: 3, fontSize: 11, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{detail}</div>
        <div style={{ marginTop: 6 }}><TagPill tone="gray">{meta}</TagPill></div>
      </div>
      {(actionLabel || secondaryActionLabel) && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {secondaryActionLabel && onSecondaryAction && (
            <button type="button" onClick={onSecondaryAction} disabled={busy} style={{ ...secondaryButtonStyle, minHeight: 30, padding: '6px 9px', opacity: busy ? 0.6 : 1 }}>
              {secondaryActionLabel}
            </button>
          )}
          {actionLabel && onAction && (
            <button type="button" onClick={onAction} disabled={busy} style={{ ...primaryButtonStyle, minHeight: 30, padding: '6px 9px', opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Working...' : actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function MiniEmptyState({ detail }: { detail: string }) {
  return (
    <div style={{ border: '1px dashed var(--edge)', borderRadius: 8, padding: 12, fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center', lineHeight: 1.45 }}>
      {detail}
    </div>
  )
}

function TagPill({ tone, children }: { tone: 'gray' | 'blue'; children: ReactNode }) {
  const style = {
    gray: ['var(--tint)', 'var(--color-text-tertiary)'],
    blue: ['rgba(0,61,165,0.08)', 'var(--color-brand)'],
  }[tone]

  return (
    <span style={{ display: 'inline-flex', minHeight: 22, alignItems: 'center', padding: '0 8px', borderRadius: 999, background: style[0], color: style[1], fontSize: 11, fontWeight: 750, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

const inputWrapStyle: CSSProperties = {
  width: '100%',
  height: 38,
  borderRadius: 8,
  border: '1px solid var(--edge)',
  background: 'var(--surface-panel)',
  boxSizing: 'border-box',
}

const noticeStyle: CSSProperties = {
  border: '1px solid var(--edge)',
  borderRadius: 8,
  padding: 10,
  fontSize: 12,
  marginBottom: 12,
}

const primaryButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  minHeight: 34,
  padding: '8px 12px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--color-brand)',
  color: '#fff',
  fontSize: 12,
  fontWeight: 750,
  fontFamily: 'inherit',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const secondaryButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  minHeight: 34,
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--edge)',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  fontSize: 12,
  fontWeight: 750,
  fontFamily: 'inherit',
  cursor: 'pointer',
}

const surfaceMiniStyle: CSSProperties = {
  border: '1px solid var(--edge)',
  borderRadius: 10,
  background: 'var(--surface-panel)',
  padding: 12,
}
