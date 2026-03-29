import { useState, useCallback, useEffect, useRef } from 'react'
import type { Contact, Pod } from '../../lib/types'
import type { FieldConfig } from '../../lib/fieldConfig'
import { getFieldConfigs } from '../../lib/fieldConfig'
import { getPods } from '../../lib/airtable'
import { useEscape } from '../../lib/escapeStack'
import { CategorizationModal } from './CategorizationModal'

interface CategorizationQueueProps {
  contacts: Contact[]
  onClose: () => void
  onCategorized: (contactId: string) => void
}

function ContactCard({
  contact,
  style,
  dragging,
  dragX,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  contact: Contact
  style?: React.CSSProperties
  dragging?: boolean
  dragX?: number
  onPointerDown?: (e: React.PointerEvent) => void
  onPointerMove?: (e: React.PointerEvent) => void
  onPointerUp?: (e: React.PointerEvent) => void
  onPointerCancel?: (e: React.PointerEvent) => void
}) {
  const dx = dragX ?? 0
  const rotation = dx * 0.04

  const isBrainDump = contact.intel_notes && contact.name === 'Brain Dump'

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{
        position: 'absolute',
        width: '100%',
        background: 'var(--surface-panel)',
        backdropFilter: 'var(--panel-blur)',
        WebkitBackdropFilter: 'var(--panel-blur)',
        border: 'var(--surface-panel-border)',
        borderRadius: 16,
        padding: '28px 24px 24px',
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
        transform: `translateX(${dx}px) rotate(${rotation}deg)`,
        transition: dragging ? 'none' : 'transform 0.2s cubic-bezier(0.87, 0, 0.13, 1)',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {isBrainDump ? (
        <div style={{
          fontSize: 14,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.6,
          fontStyle: 'italic',
          whiteSpace: 'pre-wrap',
        }}>
          {contact.intel_notes}
        </div>
      ) : (
        <>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: '-0.02em',
            color: 'var(--color-text-primary)',
            lineHeight: 1.1,
            marginBottom: 8,
          }}>
            {contact.name}
          </div>
          {(contact.role || contact.company) && (
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
              {[contact.role, contact.company].filter(Boolean).join(' · ')}
            </div>
          )}
          {contact.email && (
            <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
              {contact.email}
            </div>
          )}
          {contact.notes && (
            <div style={{
              marginTop: 12,
              padding: '10px 12px',
              background: 'var(--tint)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5,
            }}>
              {contact.notes}
            </div>
          )}
          {contact.intel_notes && (
            <div style={{
              marginTop: 10,
              fontSize: 12,
              color: 'var(--color-text-tertiary)',
              lineHeight: 1.5,
              fontStyle: 'italic',
            }}>
              {contact.intel_notes}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function CategorizationQueue({ contacts: initialContacts, onClose, onCategorized }: CategorizationQueueProps) {
  const [queue, setQueue] = useState<Contact[]>(initialContacts)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [dragX, setDragX] = useState(0)
  const startXRef = useRef(0)
  const [categorizingContact, setCategorizingContact] = useState<Contact | null>(null)
  const [pods, setPods] = useState<Pod[]>([])
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([])

  // Load pods and fieldConfigs once on mount (not per card)
  useEffect(() => {
    getPods().then(setPods)
    getFieldConfigs().then(setFieldConfigs)
  }, [])

  const handleClose = useCallback(() => onClose(), [onClose])
  useEscape(handleClose)

  const currentContact = queue[currentIndex] ?? null

  function handlePointerDown(e: React.PointerEvent) {
    startXRef.current = e.clientX
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return
    setDragX(e.clientX - startXRef.current)
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!dragging) return
    setDragging(false)
    const dx = e.clientX - startXRef.current
    setDragX(0)

    if (dx < -80) {
      handleSkip()
    }
  }

  function handlePointerCancel() {
    setDragging(false)
    setDragX(0)
  }

  function handleSkip() {
    if (!currentContact) return
    setQueue(prev => {
      const next = [...prev]
      const [removed] = next.splice(currentIndex, 1)
      next.push(removed)
      return next
    })
    // currentIndex stays the same — next card slides in
  }

  function handleCategorize() {
    if (!currentContact) return
    setCategorizingContact(currentContact)
  }

  function handleCategorized(contactId: string) {
    setCategorizingContact(null)
    setQueue(prev => {
      const next = prev.filter(c => c.id !== contactId)
      return next
    })
    if (currentIndex > 0 && currentIndex >= queue.length - 1) {
      setCurrentIndex(prev => Math.max(0, prev - 1))
    }
    onCategorized(contactId)
  }

  function handleSkipFromModal() {
    setCategorizingContact(null)
    handleSkip()
  }

  if (queue.length === 0) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: 'var(--surface-panel)',
          backdropFilter: 'var(--panel-blur)',
          WebkitBackdropFilter: 'var(--panel-blur)',
          borderRadius: 16,
          padding: '40px 32px',
          textAlign: 'center',
          maxWidth: 320,
        }}>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 700,
            fontSize: 22,
            color: 'var(--color-text-primary)',
            marginBottom: 8,
          }}>
            All caught up
          </div>
          <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 24 }}>
            No more contacts to categorize.
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  const visibleCards = queue.slice(currentIndex, currentIndex + 3)

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }}>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute', top: 20, right: 20,
            width: 36, height: 36, borderRadius: 18,
            background: 'rgba(255,255,255,0.15)', border: 'none',
            color: '#fff', fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Close"
        >
          ×
        </button>

        {/* Queue counter */}
        <div style={{
          position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
          fontSize: 13, color: 'rgba(255,255,255,0.7)',
          fontWeight: 500,
        }}>
          {queue.length} pending
        </div>

        {/* Card stack */}
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: 380,
          height: 320,
        }}>
          {[...visibleCards].reverse().map((contact, reversedIdx) => {
            const stackIdx = visibleCards.length - 1 - reversedIdx
            const isTop = stackIdx === 0
            const offsetY = stackIdx * 10
            const scale = 1 - stackIdx * 0.03
            const opacity = stackIdx === 0 ? 1 : stackIdx === 1 ? 0.7 : 0.4

            return (
              <ContactCard
                key={contact.id}
                contact={contact}
                dragging={isTop ? dragging : false}
                dragX={isTop ? dragX : 0}
                onPointerDown={isTop ? handlePointerDown : undefined}
                onPointerMove={isTop ? handlePointerMove : undefined}
                onPointerUp={isTop ? handlePointerUp : undefined}
                onPointerCancel={isTop ? handlePointerCancel : undefined}
                style={{
                  transform: isTop
                    ? `translateX(${dragX}px) rotate(${dragX * 0.04}deg)`
                    : `translateY(${offsetY}px) scale(${scale})`,
                  opacity,
                  zIndex: isTop ? 10 : 10 - stackIdx,
                  transition: isTop && dragging ? 'none' : 'transform 0.2s cubic-bezier(0.87, 0, 0.13, 1)',
                }}
              />
            )
          })}
        </div>

        {/* Action buttons */}
        <div style={{
          display: 'flex', gap: 16, marginTop: 24,
          alignItems: 'center',
        }}>
          <button
            type="button"
            onClick={handleSkip}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', borderRadius: 10, padding: '10px 20px',
              fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Skip
          </button>
          <button
            type="button"
            onClick={handleCategorize}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--color-accent)', border: 'none',
              color: '#fff', borderRadius: 10, padding: '10px 24px',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Categorize
          </button>
        </div>
      </div>

      {categorizingContact && (
        <CategorizationModal
          contact={categorizingContact}
          pods={pods}
          fieldConfigs={fieldConfigs}
          onCategorized={handleCategorized}
          onSkip={handleSkipFromModal}
          onClose={() => setCategorizingContact(null)}
        />
      )}
    </>
  )
}
