import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router'
import { MoreHorizontal } from 'lucide-react'
import type { Contact, Pod } from '../../lib/types'
import { getContactsByType, getContacts, createContact, deleteContact, invalidateContactsCache } from '../../lib/airtable'
import { useEscape } from '../../lib/escapeStack'
import { MergeModal } from '../merge/MergeModal'
import { avatarColor, avatarBg } from './shared'

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Active: { bg: 'rgba(37,180,57,0.12)', color: '#1A8A2A' },
  Pending: { bg: 'rgba(255,149,0,0.12)', color: '#CC7700' },
  Archived: { bg: 'var(--tint)', color: 'var(--color-text-secondary)' },
}

const PILL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 100,
  padding: '2px 10px',
  display: 'inline-block',
  lineHeight: '18px',
}

interface RecordHeaderProps {
  contact: Contact
  pods: Pod[]
  onUpdate: (data: Partial<Contact>) => void
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

export function RecordHeader({ contact, pods, onUpdate }: RecordHeaderProps) {
  const navigate = useNavigate()
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(contact.name)

  const [showOverflow, setShowOverflow] = useState(false)
  const overflowRef = useRef<HTMLDivElement>(null)

  const [mergeSearchOpen, setMergeSearchOpen] = useState(false)
  const [mergeQuery, setMergeQuery] = useState('')
  const [mergeResults, setMergeResults] = useState<Contact[]>([])
  const [mergeTarget, setMergeTarget] = useState<Contact | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [showTypeahead, setShowTypeahead] = useState(false)
  const [companyQuery, setCompanyQuery] = useState('')
  const [companyResults, setCompanyResults] = useState<Contact[]>([])

  const status = contact.status ?? 'Active'
  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.Active

  const stableCloseTypeahead = useCallback(() => setShowTypeahead(false), [])
  useEscape(stableCloseTypeahead)

  function handleNameBlur(val: string) {
    const trimmed = val.trim()
    setEditingName(false)
    if (trimmed && trimmed !== contact.name) {
      setNameVal(trimmed)
      onUpdate({ name: trimmed })
    } else {
      setNameVal(contact.name)
    }
  }

  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') e.currentTarget.blur()
    if (e.key === 'Escape') {
      setNameVal(contact.name)
      setEditingName(false)
    }
  }

  useEffect(() => {
    if (!showTypeahead || companyQuery.length < 1) {
      setCompanyResults([])
      return
    }
    const t = setTimeout(async () => {
      const companies = await getContactsByType('Company')
      setCompanyResults(
        companies
          .filter(c => c.name.toLowerCase().includes(companyQuery.toLowerCase()))
          .slice(0, 5)
      )
    }, 150)
    return () => clearTimeout(t)
  }, [companyQuery, showTypeahead])

  useEffect(() => {
    if (!showOverflow) return
    function handleClick(e: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) setShowOverflow(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showOverflow])

  useEffect(() => {
    if (!mergeSearchOpen || mergeQuery.length < 1) { setMergeResults([]); return }
    const t = setTimeout(async () => {
      const all = await getContacts()
      setMergeResults(
        all.filter(c => c.id !== contact.id && c.name.toLowerCase().includes(mergeQuery.toLowerCase())).slice(0, 6)
      )
    }, 150)
    return () => clearTimeout(t)
  }, [mergeQuery, mergeSearchOpen, contact.id])

  async function handleDelete() {
    try {
      await deleteContact(contact.id)
      invalidateContactsCache()
      navigate(-1)
    } catch { /* navigation handles it */ }
  }

  async function handleSelectCompany(c: Contact) {
    setShowTypeahead(false)
    setCompanyQuery('')
    onUpdate({ company_record_id: c.id, company: c.name })
  }

  async function handleCreateAndLinkCompany(name: string) {
    setShowTypeahead(false)
    setCompanyQuery('')
    const newCo = await createContact({
      name, type: 'Company', status: 'Active', list_ids: [],
      category_ids: [], email: null, phone: null, company: null,
      role: null, location: null, website: null, notes: null,
      recommended_by: null, specialization: null, past_clients: null,
      birthday: null, milestones: null, interests: null,
      relationship_context: null, last_contacted_at: null,
      primary_list_id: null, cadence_override: null,
      first_name: null, last_name: null, linkedin: null,
      country: null, global_region: null, gender: null,
      introduced_by: null, intel_notes: null, relationship_owner: null,
      contact_frequency: null, next_follow_up_date: null,
      next_action: null, kv_fund_investor: null, spv_investor: null,
      needs_review: false, company_record_id: null,
      industry: null, stage: null, ticker: null, domain: null,
      email_2: null, email_3: null, communication_preferences: null, custom_fields: {},
    })
    onUpdate({ company_record_id: newCo.id, company: newCo.name })
  }

  const companySubtitle = contact.type === 'Contact' && (contact.role || contact.company || contact.company_record_id) ? (
    <span>
      {contact.role && <span>{contact.role}</span>}
      {contact.role && (contact.company || contact.company_record_id) && (
        <span style={{ color: 'var(--color-text-tertiary)' }}> @ </span>
      )}
      {contact.company_record_id ? (
        <span
          style={{ cursor: 'pointer', color: 'var(--color-brand)', textDecoration: 'none' }}
          onClick={() => navigate(`/contact/${contact.company_record_id}`)}
        >
          {contact.company || 'Company'}
        </span>
      ) : contact.company ? (
        <span>{contact.company}</span>
      ) : null}
    </span>
  ) : contact.type === 'Company' && (contact.industry || contact.domain) ? (
    <span>
      {contact.industry && <span>{contact.industry}</span>}
      {contact.industry && contact.domain && <span style={{ color: 'var(--color-text-tertiary)' }}> - </span>}
      {contact.domain && <span>{contact.domain}</span>}
    </span>
  ) : null

  const contactMethods = [
    contact.email ? { label: contact.email, href: `mailto:${contact.email}` } : null,
    contact.phone ? { label: contact.phone, href: `tel:${contact.phone}` } : null,
    contact.linkedin ? { label: 'LinkedIn', href: contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`, external: true } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; external?: boolean }>

  const acColor = avatarColor(contact.name)
  const acBg = avatarBg(contact.name)

  return (
    <div style={{
      background: 'var(--surface-panel)',
      borderBottom: '1px solid var(--divider)',
      padding: '28px 32px 24px',
    }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'var(--color-text-secondary)' }}>
        <button
          type="button"
          onClick={() => navigate(contact.type === 'Company' ? '/companies' : '/contacts')}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-text-secondary)', fontFamily: 'inherit', fontSize: 13 }}
        >
          {contact.type === 'Company' ? 'Companies' : 'People'}
        </button>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-tertiary)' }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{contact.name}</span>
      </nav>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 8, position: 'relative' }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: acBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: acColor,
          flexShrink: 0, marginTop: 2,
          fontFamily: 'var(--font-serif)',
        }}>
          {initials(contact.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            {editingName ? (
              <input
                autoFocus
                type="text"
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                onBlur={e => handleNameBlur(e.target.value)}
                onKeyDown={handleNameKeyDown}
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                  color: 'var(--color-text-primary)',
                  background: 'var(--tint)',
                  border: '1px solid var(--edge-strong)',
                  borderRadius: 6,
                  outline: 'none',
                  padding: '2px 8px',
                  minWidth: 200,
                }}
              />
            ) : (
              <div
                onClick={() => setEditingName(true)}
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                  color: 'var(--color-text-primary)',
                  cursor: 'text',
                }}
              >
                {nameVal}
              </div>
            )}
            <span style={{ ...PILL_STYLE, background: 'var(--tint)', color: 'var(--color-text-secondary)', fontSize: 10 }}>
              {contact.type}
            </span>
            <span style={{ ...PILL_STYLE, background: statusStyle.bg, color: statusStyle.color, fontSize: 10 }}>
              {status}
            </span>
          </div>

          {companySubtitle && (
            <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-secondary)', marginBottom: 2 }}>
              {companySubtitle}
            </div>
          )}

          {contactMethods.length > 0 && (
            <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', marginTop: 4 }}>
              {contactMethods.map((m, i) => (
                <span key={m.href}>
                  {i > 0 && <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '0 6px' }}>-</span>}
                  <a
                    href={m.href}
                    target={m.external ? '_blank' : undefined}
                    rel={m.external ? 'noopener noreferrer' : undefined}
                    style={{ fontSize: 13, color: 'var(--color-text-secondary)', textDecoration: 'none' }}
                  >
                    {m.label}
                  </a>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Overflow menu */}
        <div ref={overflowRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setShowOverflow(v => !v)}
            style={{
              background: showOverflow ? 'var(--tint)' : 'none',
              border: 'none', borderRadius: 6, cursor: 'pointer',
              padding: '4px 6px', display: 'flex', alignItems: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <MoreHorizontal size={18} />
          </button>
          {showOverflow && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4,
              background: 'var(--color-surface)', border: '1px solid var(--edge)',
              borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              zIndex: 50, minWidth: 160, overflow: 'hidden',
            }}>
              <button
                type="button"
                onClick={() => { setShowOverflow(false); setMergeSearchOpen(true); setMergeQuery('') }}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '10px 14px', fontSize: 13, cursor: 'pointer',
                  color: 'var(--color-text-primary)', minHeight: 40, display: 'flex', alignItems: 'center',
                  background: 'transparent', border: 'none', fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--tint)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Merge with...
              </button>
              <button
                type="button"
                onClick={() => { setShowOverflow(false); setConfirmDelete(true) }}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '10px 14px', fontSize: 13, cursor: 'pointer',
                  color: 'var(--health-fading)', minHeight: 40, display: 'flex', alignItems: 'center',
                  background: 'transparent', border: 'none', fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Company link/typeahead -- Contact type only */}
      {contact.type === 'Contact' && (
        <div style={{ marginLeft: 64, marginBottom: 4, position: 'relative', display: 'inline-block' }}>
          {!showTypeahead ? (
            contact.company_record_id ? (
              <button
                type="button"
                onClick={() => { setShowTypeahead(true); setCompanyQuery(contact.company ?? '') }}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  fontSize: 11, color: 'var(--color-text-tertiary)', cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Change company
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowTypeahead(true)}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  fontSize: 11, color: 'var(--color-text-tertiary)', cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                + Add company
              </button>
            )
          ) : (
            <div>
              <input
                autoFocus
                type="text"
                value={companyQuery}
                onChange={e => setCompanyQuery(e.target.value)}
                onBlur={() => setTimeout(() => setShowTypeahead(false), 150)}
                placeholder="Search company..."
                style={{
                  fontSize: 13,
                  fontFamily: 'inherit',
                  outline: 'none',
                  border: 'none',
                  borderBottom: '1px solid var(--color-brand)',
                  background: 'transparent',
                  color: 'var(--color-text-primary)',
                  padding: '2px 0',
                  minWidth: 160,
                }}
              />
              {(companyResults.length > 0 || companyQuery.length > 2) && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  minWidth: 220,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--edge)',
                  borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  zIndex: 50,
                  marginTop: 4,
                }}>
                  {companyResults.map(c => {
                    const idx = c.name.toLowerCase().indexOf(companyQuery.toLowerCase())
                    return (
                      <div
                        key={c.id}
                        onMouseDown={() => handleSelectCompany(c)}
                        style={{
                          padding: '10px 12px',
                          fontSize: 13,
                          color: 'var(--color-text-primary)',
                          cursor: 'pointer',
                          minHeight: 44,
                          display: 'flex',
                          alignItems: 'center',
                          borderBottom: '1px solid var(--divider)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,180,57,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {idx >= 0 ? (
                          <>
                            {c.name.substring(0, idx)}
                            <strong style={{ color: 'var(--color-brand)' }}>{c.name.substring(idx, idx + companyQuery.length)}</strong>
                            {c.name.substring(idx + companyQuery.length)}
                          </>
                        ) : c.name}
                      </div>
                    )
                  })}
                  {companyQuery.length > 2 && !companyResults.find(c => c.name.toLowerCase() === companyQuery.toLowerCase()) && (
                    <div
                      onMouseDown={() => handleCreateAndLinkCompany(companyQuery.trim())}
                      style={{
                        padding: '10px 12px',
                        fontSize: 13,
                        color: 'var(--color-brand)',
                        fontWeight: 500,
                        cursor: 'pointer',
                        minHeight: 44,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,180,57,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      + Create "{companyQuery}" as company
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Merge target search */}
      {mergeSearchOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} onClick={() => setMergeSearchOpen(false)} />
          <div style={{
            position: 'relative', background: 'var(--color-surface)', borderRadius: 12,
            padding: 20, width: 340, boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 12, fontFamily: 'var(--font-serif)' }}>
              Merge "{contact.name}" with...
            </div>
            <input
              autoFocus
              type="text"
              value={mergeQuery}
              onChange={e => setMergeQuery(e.target.value)}
              placeholder="Search records..."
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--edge-strong)', fontSize: 13,
                fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
              }}
            />
            {mergeResults.length > 0 && (
              <div style={{ marginTop: 8, maxHeight: 240, overflowY: 'auto' }}>
                {mergeResults.map(r => (
                  <div
                    key={r.id}
                    onClick={() => { setMergeSearchOpen(false); setMergeTarget(r) }}
                    style={{
                      padding: '10px 12px', cursor: 'pointer', borderRadius: 6,
                      fontSize: 13, color: 'var(--color-text-primary)', minHeight: 40,
                      display: 'flex', flexDirection: 'column', gap: 2,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--tint)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontWeight: 500 }}>{r.name}</span>
                    {r.company && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.company}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {mergeTarget && (
        <MergeModal
          recordA={contact}
          recordB={mergeTarget}
          pods={pods}
          onClose={() => setMergeTarget(null)}
          onMerged={(survivor) => {
            setMergeTarget(null)
            invalidateContactsCache()
            navigate(`/contact/${survivor.id}`, { replace: true })
          }}
        />
      )}

      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} onClick={() => setConfirmDelete(false)} />
          <div style={{
            position: 'relative', background: 'var(--color-surface)', borderRadius: 12,
            padding: 24, width: 320, textAlign: 'center',
            boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8, fontFamily: 'var(--font-serif)' }}>
              Delete "{contact.name}"?
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
              This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button" onClick={() => setConfirmDelete(false)}
                style={{
                  padding: '8px 20px', borderRadius: 8, cursor: 'pointer',
                  background: 'transparent', border: '1px solid var(--edge-strong)',
                  fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                type="button" onClick={handleDelete}
                style={{
                  padding: '8px 20px', borderRadius: 8, cursor: 'pointer',
                  background: 'var(--health-fading)', border: 'none',
                  fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: 'inherit',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
