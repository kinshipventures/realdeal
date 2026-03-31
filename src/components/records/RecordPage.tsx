import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams } from 'react-router'
import type { Contact, Interaction, Pod } from '../../lib/types'
import type { FieldConfig } from '../../lib/fieldConfig'
import { getContacts, getPods, updateContact, isOverdue, isInGracePeriod } from '../../lib/airtable'
import { getFieldConfigs } from '../../lib/fieldConfig'
import { isDormant, daysSinceContact } from '../../lib/equity'
import { getUpcomingBirthdays } from '../../lib/birthdays'
import { Spinner } from '../ui'
import { EmptyState } from '../empty/EmptyState'
import { RecordHeader } from './RecordHeader'
import { RecordTimeline } from './RecordTimeline'
import { RecordWidgets } from './RecordWidgets'

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return mobile
}

export function RecordPage() {
  const { id } = useParams<{ id: string }>()
  const isMobile = useIsMobile()

  const [contact, setContact] = useState<Contact | null>(null)
  const [pods, setPods] = useState<Pod[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isBannerDismissed, setIsBannerDismissed] = useState(false)

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return }

    let canceled = false
    setLoading(true)
    setNotFound(false)

    Promise.all([
      getContacts().then(all => all.find(c => c.id === id) ?? null),
      getPods(),
      getFieldConfigs(),
    ]).then(([found, fetchedPods, fetchedConfigs]) => {
      if (canceled) return
      if (!found) { setNotFound(true); setLoading(false); return }
      setContact(found)
      setPods(fetchedPods)
      setFieldConfigs(fetchedConfigs)
      setLoading(false)
    }).catch(() => {
      if (!canceled) { setNotFound(true); setLoading(false) }
    })

    return () => { canceled = true }
  }, [id])

  const handleUpdate = useCallback(async (data: Partial<Contact>) => {
    if (!contact) return
    const optimistic = { ...contact, ...data }
    setContact(optimistic)
    try {
      const updated = await updateContact(contact.id, data)
      setContact(updated)
    } catch {
      setContact(contact) // revert on failure
    }
  }, [contact])

  const handleContactUpdated = useCallback((updated: Contact) => {
    setContact(updated)
  }, [])

  // Sync banner dismissed state when contact changes
  useEffect(() => {
    if (contact) {
      setIsBannerDismissed(sessionStorage.getItem(`realdeal:signal-dismissed:${contact.id}`) === '1')
    }
  }, [contact?.id])

  const urgentSignal = useMemo(() => {
    if (!contact || isInGracePeriod(contact)) return null

    for (const podId of contact.list_ids) {
      const pod = pods.find(p => p.id === podId)
      const cadence = pod?.cadence ?? 'monthly'
      if (isOverdue(contact, cadence)) {
        const days = daysSinceContact(contact)
        return { type: 'overdue' as const, message: `Last reached out ${days ?? '?'} days ago`, color: '#FF3B30' }
      }
    }

    if (isDormant(contact)) {
      const days = daysSinceContact(contact)
      return { type: 'stale' as const, message: `No contact in ${days ?? '90+'} days`, color: 'hsla(20, 80%, 45%, 1)' }
    }

    return null
  }, [contact, pods])

  const upcomingBirthday = useMemo(() => {
    if (!contact) return null
    const results = getUpcomingBirthdays([contact], pods, 14)
    if (results.length === 0) return null
    return { daysUntil: results[0].daysUntil, date: results[0].date }
  }, [contact, pods])

  const missingFieldCount = useMemo(() => {
    if (!contact || fieldConfigs.length === 0) return 0
    return fieldConfigs.filter(fc =>
      fc.required &&
      (fc.scope_pod_id === null || contact.list_ids.includes(fc.scope_pod_id)) &&
      !contact[fc.name as keyof Contact]
    ).length
  }, [contact, fieldConfigs])

  if (loading) {
    return (
      <div style={{ background: 'var(--color-bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={24} padding={0} />
      </div>
    )
  }

  if (notFound || !contact) {
    return (
      <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
        <EmptyState heading="Record not found" />
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      <RecordHeader contact={contact} pods={pods} onUpdate={handleUpdate} />

      {urgentSignal && !isBannerDismissed && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 32px',
          margin: '0 32px 0 32px',
          marginTop: 12,
          borderRadius: 8,
          borderLeft: `3px solid ${urgentSignal.color}`,
          background: urgentSignal.type === 'overdue'
            ? 'rgba(255, 59, 48, 0.06)'
            : 'hsla(20, 80%, 45%, 0.06)',
          fontSize: 13,
          color: 'var(--color-text-primary)',
        }}>
          <span>{urgentSignal.message}</span>
          <button
            onClick={() => {
              sessionStorage.setItem(`realdeal:signal-dismissed:${contact.id}`, '1')
              setIsBannerDismissed(true)
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-tertiary)',
              fontSize: 16,
              padding: 4,
              lineHeight: 1,
            }}
            aria-label="Dismiss signal"
          >×</button>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(400px, 3fr) minmax(280px, 2fr)',
        gap: 24,
        padding: '24px 32px',
        alignItems: 'start',
      }}>
        <RecordTimeline
          contact={contact}
          onContactUpdated={handleContactUpdated}
        />

        <RecordWidgets
          contact={contact}
          pods={pods}
          interactions={interactions}
          fieldConfigs={fieldConfigs}
          onUpdate={handleUpdate}
          onFieldConfigsRefresh={setFieldConfigs}
          upcomingBirthday={upcomingBirthday}
          missingFieldCount={missingFieldCount}
        />
      </div>
    </div>
  )
}
