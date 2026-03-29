import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router'
import type { Contact, Interaction, Pod } from '../../lib/types'
import type { FieldConfig } from '../../lib/fieldConfig'
import { getContacts, getPods, updateContact } from '../../lib/airtable'
import { getFieldConfigs } from '../../lib/fieldConfig'
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
        />
      </div>
    </div>
  )
}
