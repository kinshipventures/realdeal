import { useState, useEffect, useRef, useCallback } from 'react'
import type { Contact, Pod } from '../../lib/types'
import { createContact, getPods } from '../../lib/airtable'
import { useEscape } from '../../lib/escapeStack'

const UNSORTED_POD_ID = 'recGR6AQTq1ceL1yq'

type Mode = 'structured' | 'braindump'

interface Props {
  onCreated: (contact: Contact) => void
  onClose: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--tint)',
  border: '1px solid var(--edge-strong)',
  borderRadius: 7,
  color: 'var(--color-text-primary)',
  fontSize: 13,
  padding: '8px 12px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
  marginBottom: 4,
  display: 'block',
}

export function AddContactModal({ onCreated, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('structured')
  const [pods, setPods] = useState<Pod[]>([])

  // Structured fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [selectedPodIds, setSelectedPodIds] = useState<string[]>([])
  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [intelNotes, setIntelNotes] = useState('')

  // Brain dump
  const [dumpText, setDumpText] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  const firstNameRef = useRef<HTMLInputElement>(null)
  const dumpRef = useRef<HTMLTextAreaElement>(null)

  const stableClose = useCallback(() => onClose(), [onClose])
  useEscape(stableClose)

  useEffect(() => {
    getPods().then(p => setPods(p.filter(pod => pod.name !== 'Unsorted')))
  }, [])

  useEffect(() => {
    if (mode === 'structured') firstNameRef.current?.focus()
    else dumpRef.current?.focus()
  }, [mode])

  const structuredValid = firstName.trim() && lastName.trim() && email.trim() && selectedPodIds.length > 0

  function togglePod(id: string) {
    setSelectedPodIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  async function handleSave() {
    setSaving(true)
    setError(false)
    try {
      const base: Omit<Contact, 'id' | 'created_at'> = {
        name: '',
        type: 'Contact', status: 'Active',
        email: null, phone: null, company: null, role: null,
        location: null, website: null, notes: null, recommended_by: null,
        specialization: null, past_clients: null, birthday: null,
        milestones: null, interests: null, relationship_context: null,
        last_contacted_at: null, list_ids: [], category_ids: [],
        primary_list_id: null, cadence_override: null,
        first_name: null, last_name: null, linkedin: null, country: null,
        global_region: null, gender: null, introduced_by: null,
        intel_notes: null, relationship_owner: null, contact_frequency: null,
        next_follow_up_date: null, next_action: null,
        kv_fund_investor: null, spv_investor: null, needs_review: false,
        company_record_id: null, industry: null, stage: null,
        ticker: null, domain: null, email_2: null, email_3: null,
        communication_preferences: null, custom_fields: {},
      }

      let data: Omit<Contact, 'id' | 'created_at'>
      if (mode === 'structured') {
        data = {
          ...base,
          name: `${firstName.trim()} ${lastName.trim()}`,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          list_ids: selectedPodIds,
          role: jobTitle.trim() || null,
          company: company.trim() || null,
          phone: phone.trim() || null,
          intel_notes: intelNotes.trim() || null,
          needs_review: false,
        }
      } else {
        data = {
          ...base,
          name: 'Brain Dump',
          intel_notes: dumpText.trim(),
          list_ids: [UNSORTED_POD_ID],
          needs_review: true,
        }
      }

      const contact = await createContact(data)
      onCreated(contact)
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  const canSave = mode === 'structured' ? structuredValid && !saving : dumpText.trim().length > 0 && !saving

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface-panel)',
          backdropFilter: 'var(--panel-blur)',
          WebkitBackdropFilter: 'var(--panel-blur)',
          border: 'var(--surface-panel-border)',
          borderRadius: 16,
          maxWidth: 440,
          width: '90vw',
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: 20,
        }}
      >
        {/* Tab pills */}
        <div style={{
          display: 'flex', gap: 2, padding: 3,
          borderRadius: 100, background: 'var(--tint)',
          marginBottom: 16,
        }}>
          {(['structured', 'braindump'] as Mode[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 100,
                border: 'none', fontSize: 12, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
                background: mode === m ? 'var(--color-brand)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--color-text-tertiary)',
              }}
            >
              {m === 'structured' ? 'Add Contact' : 'Quick Note'}
            </button>
          ))}
        </div>

        {mode === 'structured' ? (
          <>
            {/* First / Last name row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>First Name *</label>
                <input
                  ref={firstNameRef}
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Last Name *</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Email *</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Pod picker */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Pod *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {pods.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePod(p.id)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 100,
                      border: '1px solid',
                      borderColor: selectedPodIds.includes(p.id) ? (p.color ?? 'var(--edge-strong)') : 'var(--edge)',
                      background: selectedPodIds.includes(p.id) ? `${p.color ?? 'var(--color-brand)'}18` : 'transparent',
                      color: selectedPodIds.includes(p.id) ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                      fontSize: 11, fontWeight: selectedPodIds.includes(p.id) ? 500 : 400,
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 0.12s',
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional fields */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Job Title</label>
                <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Company</label>
                <input type="text" value={company} onChange={e => setCompany(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Intel / Notes</label>
              <textarea
                value={intelNotes}
                onChange={e => setIntelNotes(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          </>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <textarea
              ref={dumpRef}
              value={dumpText}
              onChange={e => setDumpText(e.target.value)}
              rows={6}
              placeholder="Sarah Russell, Eight Sleep, met at Upfront, intro via Doug..."
              style={{ ...inputStyle, resize: 'vertical', fontSize: 14, lineHeight: 1.5 }}
            />
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '6px 0 0' }}>
              Drops into Unsorted for triage later
            </p>
          </div>
        )}

        {error && (
          <p style={{ fontSize: 11, color: '#D93025', margin: '0 0 8px', textAlign: 'right' }}>
            failed to save — try again
          </p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'var(--color-text-tertiary)',
              fontFamily: 'inherit', padding: '4px 0',
            }}
          >
            cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            style={{
              padding: '7px 18px',
              background: canSave ? 'var(--color-brand)' : 'var(--tint)',
              border: canSave ? 'none' : '1px solid var(--edge-strong)',
              borderRadius: 7,
              color: canSave ? '#fff' : 'var(--color-text-tertiary)',
              fontSize: 13, fontWeight: 500,
              cursor: canSave ? 'pointer' : 'default',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
