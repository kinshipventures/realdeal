import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router'
import type { Contact, Pod } from '../../lib/types'
import { createContact, getPods, getContactsByType } from '../../lib/airtable'
import { useEscape } from '../../lib/escapeStack'
import { POD_SHIFT_COLORS } from '../map/SolidOrb'

type Step = 'type' | 'form'
type RecordType = 'Contact' | 'Company'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreated: (contact: Contact) => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(0,0,0,0.04)',
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: 7,
  color: 'rgba(0,0,0,0.82)',
  fontSize: 13,
  padding: '8px 12px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: 'rgba(0,0,0,0.45)',
  marginBottom: 4,
  display: 'block',
}

const requiredDot = <span style={{ color: '#25B439', marginLeft: 2 }}>*</span>

export function CreateRecordModal({ isOpen, onClose, onCreated }: Props) {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('type')
  const [recordType, setRecordType] = useState<RecordType>('Contact')
  const [pods, setPods] = useState<Pod[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Contact fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [selectedPodIds, setSelectedPodIds] = useState<string[]>([])
  const [braindump, setBraindump] = useState(false)
  const [dumpText, setDumpText] = useState('')

  // Company typeahead for Contact form
  const [companyQuery, setCompanyQuery] = useState('')
  const [companyResults, setCompanyResults] = useState<Contact[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Contact | null>(null)
  const [showCompanyDrop, setShowCompanyDrop] = useState(false)

  // Company fields
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [domain, setDomain] = useState('')
  const [duplicateWarning, setDuplicateWarning] = useState<Contact | null>(null)

  const stableClose = useCallback(() => onClose(), [onClose])
  useEscape(stableClose)

  useEffect(() => {
    if (!isOpen) return
    getPods().then(p => setPods(p.filter(pod => pod.name !== 'Unsorted')))
  }, [isOpen])

  // Company typeahead debounce
  useEffect(() => {
    if (!showCompanyDrop || companyQuery.length < 1) {
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
  }, [companyQuery, showCompanyDrop])

  // Company duplicate detection on blur
  async function checkDuplicate(val: string) {
    if (val.trim().length < 2) { setDuplicateWarning(null); return }
    const companies = await getContactsByType('Company')
    const match = companies.find(c => c.name.toLowerCase().trim() === val.toLowerCase().trim())
    setDuplicateWarning(match ?? null)
  }

  function reset() {
    setStep('type')
    setRecordType('Contact')
    setFirstName(''); setLastName(''); setEmail('')
    setSelectedPodIds([])
    setBraindump(false); setDumpText('')
    setCompanyQuery(''); setCompanyResults([])
    setSelectedCompany(null); setShowCompanyDrop(false)
    setCompanyName(''); setIndustry(''); setDomain('')
    setDuplicateWarning(null)
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function togglePod(id: string) {
    setSelectedPodIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  function selectCompany(c: Contact) {
    setSelectedCompany(c)
    setCompanyQuery(c.name)
    setShowCompanyDrop(false)
    setCompanyResults([])
  }

  async function createCompanyInline(name: string): Promise<Contact> {
    const newCo = await createContact({
      name, type: 'Company', status: 'Active', list_ids: [],
      category_ids: [], email: null, phone: null, company: null,
      role: null, location: null, website: null, notes: null,
      recommended_by: null, specialization: null, past_clients: null,
      birthday: null, milestones: null, interests: null,
      relationship_context: null, last_contacted_at: null,
      first_name: null, last_name: null, linkedin: null,
      country: null, global_region: null, gender: null,
      introduced_by: null, intel_notes: null, relationship_owner: null,
      contact_frequency: null, next_follow_up_date: null,
      next_action: null, kv_fund_investor: null, spv_investor: null,
      needs_review: false, company_record_id: null,
      industry: null, stage: null, ticker: null, domain: null,
    })
    return newCo
  }

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    try {
      const base: Omit<Contact, 'id' | 'created_at'> = {
        name: '', type: 'Contact', status: 'Active', list_ids: [], category_ids: [],
        email: null, phone: null, company: null, role: null, location: null,
        website: null, notes: null, recommended_by: null, specialization: null,
        past_clients: null, birthday: null, milestones: null, interests: null,
        relationship_context: null, last_contacted_at: null,
        first_name: null, last_name: null, linkedin: null, country: null,
        global_region: null, gender: null, introduced_by: null,
        intel_notes: null, relationship_owner: null, contact_frequency: null,
        next_follow_up_date: null, next_action: null,
        kv_fund_investor: null, spv_investor: null, needs_review: false,
        company_record_id: null, industry: null, stage: null,
        ticker: null, domain: null,
      }

      let created: Contact

      if (recordType === 'Contact') {
        let coId = selectedCompany?.id ?? null
        // if user typed a company name but didn't pick one from typeahead, create inline
        if (!coId && companyQuery.trim().length > 2) {
          const newCo = await createCompanyInline(companyQuery.trim())
          coId = newCo.id
        }

        if (braindump) {
          created = await createContact({
            ...base,
            name: 'Brain Dump',
            intel_notes: dumpText.trim(),
            list_ids: selectedPodIds,
            needs_review: true,
            status: 'Pending',
          })
        } else {
          created = await createContact({
            ...base,
            name: `${firstName.trim()} ${lastName.trim()}`,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim() || null,
            list_ids: selectedPodIds,
            type: 'Contact',
            company_record_id: coId,
            company: selectedCompany?.name ?? (companyQuery.trim() || null),
          })
        }
      } else {
        created = await createContact({
          ...base,
          name: companyName.trim(),
          type: 'Company',
          list_ids: selectedPodIds,
          industry: industry.trim() || null,
          domain: domain.trim() || null,
        })
      }

      reset()
      onCreated(created)
      navigate(`/record/${created.id}`)
    } catch {
      setError("Couldn't create the record. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  const contactValid = braindump
    ? dumpText.trim().length > 0
    : firstName.trim() && lastName.trim() && selectedPodIds.length > 0
  const companyValid = companyName.trim().length > 0 && selectedPodIds.length > 0
  const canSubmit = recordType === 'Contact' ? contactValid : companyValid

  if (!isOpen) return null

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
          maxWidth: 480,
          width: '90vw',
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: 24,
        }}
      >
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 16,
          fontWeight: 700,
          color: 'rgba(0,0,0,0.82)',
          marginBottom: 20,
        }}>
          New Relationship
        </div>

        {step === 'type' && (
          <div style={{ display: 'flex', gap: 12 }}>
            {(['Contact', 'Company'] as RecordType[]).map(rt => (
              <button
                key={rt}
                type="button"
                onClick={() => { setRecordType(rt); setStep('form') }}
                style={{
                  flex: 1,
                  border: '1px solid rgba(0,0,0,0.07)',
                  borderRadius: 12,
                  padding: 16,
                  minHeight: 80,
                  cursor: 'pointer',
                  background: 'transparent',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#25B439')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.07)')}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(0,0,0,0.82)', marginBottom: 4 }}>
                  {rt}
                </div>
                <div style={{ fontSize: 11, fontWeight: 400, color: 'rgba(0,0,0,0.45)' }}>
                  {rt === 'Contact' ? 'Person' : 'Organization'}
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 'form' && recordType === 'Contact' && !braindump && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>First Name {requiredDot}</label>
                <input
                  autoFocus
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Last Name {requiredDot}</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Company typeahead */}
            <div style={{ marginBottom: 12, position: 'relative' }}>
              <label style={labelStyle}>Company</label>
              <input
                type="text"
                value={companyQuery}
                onChange={e => {
                  setCompanyQuery(e.target.value)
                  setSelectedCompany(null)
                  setShowCompanyDrop(true)
                }}
                onFocus={() => setShowCompanyDrop(true)}
                onBlur={() => setTimeout(() => setShowCompanyDrop(false), 150)}
                placeholder="Search or create company..."
                style={inputStyle}
              />
              {showCompanyDrop && companyQuery.length > 0 && (companyResults.length > 0 || companyQuery.length > 2) && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'rgba(255,255,255,0.96)',
                  border: '1px solid rgba(0,0,0,0.07)',
                  borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  zIndex: 10,
                  marginTop: 2,
                }}>
                  {companyResults.map(c => (
                    <div
                      key={c.id}
                      onMouseDown={() => selectCompany(c)}
                      style={{
                        padding: '10px 12px',
                        fontSize: 13,
                        color: 'rgba(0,0,0,0.82)',
                        cursor: 'pointer',
                        minHeight: 44,
                        display: 'flex',
                        alignItems: 'center',
                        borderBottom: '1px solid rgba(0,0,0,0.04)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,180,57,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {c.name}
                    </div>
                  ))}
                  {companyQuery.length > 2 && !companyResults.find(c => c.name.toLowerCase() === companyQuery.toLowerCase()) && (
                    <div
                      onMouseDown={async () => {
                        setShowCompanyDrop(false)
                        const newCo = await createCompanyInline(companyQuery.trim())
                        selectCompany(newCo)
                      }}
                      style={{
                        padding: '10px 12px',
                        fontSize: 13,
                        color: '#25B439',
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

            <PodPicker pods={pods} selectedPodIds={selectedPodIds} onToggle={togglePod} />

            <button
              type="button"
              onClick={() => setBraindump(true)}
              style={{
                background: 'none', border: 'none', padding: 0,
                fontSize: 11, color: 'rgba(0,0,0,0.45)', cursor: 'pointer',
                fontFamily: 'inherit', marginBottom: 16, marginTop: 4,
              }}
            >
              Switch to brain dump
            </button>
          </>
        )}

        {step === 'form' && recordType === 'Contact' && braindump && (
          <>
            <textarea
              autoFocus
              value={dumpText}
              onChange={e => setDumpText(e.target.value)}
              rows={5}
              placeholder="Dump everything you know..."
              style={{ ...inputStyle, resize: 'vertical', fontSize: 13, lineHeight: 1.6, marginBottom: 4 }}
            />
            <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', margin: '0 0 16px' }}>
              Saved as Pending for review
            </p>
            <PodPicker pods={pods} selectedPodIds={selectedPodIds} onToggle={togglePod} />
            <button
              type="button"
              onClick={() => setBraindump(false)}
              style={{
                background: 'none', border: 'none', padding: 0,
                fontSize: 11, color: 'rgba(0,0,0,0.45)', cursor: 'pointer',
                fontFamily: 'inherit', marginBottom: 16, marginTop: 4,
              }}
            >
              Switch to structured form
            </button>
          </>
        )}

        {step === 'form' && recordType === 'Company' && (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Company Name {requiredDot}</label>
              <input
                autoFocus
                type="text"
                value={companyName}
                onChange={e => { setCompanyName(e.target.value); setDuplicateWarning(null) }}
                onBlur={e => checkDuplicate(e.target.value)}
                style={inputStyle}
              />
              {duplicateWarning && (
                <div style={{
                  marginTop: 6, padding: '8px 10px',
                  background: 'rgba(255,149,0,0.08)', borderRadius: 7,
                  fontSize: 11, color: '#CC7700',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span>A company named "{duplicateWarning.name}" already exists. Link to it instead?</span>
                  <button
                    type="button"
                    onClick={() => {
                      handleClose()
                      navigate(`/record/${duplicateWarning.id}`)
                    }}
                    style={{
                      background: 'none', border: 'none', padding: 0,
                      color: '#CC7700', fontWeight: 700, fontSize: 11,
                      cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                    }}
                  >
                    Link
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Industry</label>
              <input
                type="text"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Domain</label>
              <input
                type="text"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="example.com"
                style={inputStyle}
              />
            </div>

            <PodPicker pods={pods} selectedPodIds={selectedPodIds} onToggle={togglePod} />
          </>
        )}

        {step === 'form' && error && (
          <p style={{ fontSize: 11, color: '#D93025', margin: '0 0 12px' }}>{error}</p>
        )}

        {step === 'form' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setStep('type')}
              style={{
                background: 'none', border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: 8, padding: '12px 16px', cursor: 'pointer',
                fontSize: 13, color: 'rgba(0,0,0,0.45)', fontFamily: 'inherit',
              }}
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || saving}
              title={!canSubmit ? 'Fill required fields' : undefined}
              style={{
                flex: 1, padding: 12,
                background: canSubmit && !saving ? '#25B439' : 'rgba(0,0,0,0.06)',
                border: 'none', borderRadius: 8,
                color: canSubmit && !saving ? '#fff' : 'rgba(0,0,0,0.28)',
                fontSize: 13, fontWeight: 700, cursor: canSubmit && !saving ? 'pointer' : 'default',
                fontFamily: 'inherit', transition: 'all 0.15s',
              }}
            >
              {saving ? 'Creating...' : `Create ${recordType}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function PodPicker({ pods, selectedPodIds, onToggle }: {
  pods: Pod[]
  selectedPodIds: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>Pod {<span style={{ color: '#25B439', marginLeft: 2 }}>*</span>}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {pods.map(p => {
          const isSelected = selectedPodIds.includes(p.id)
          const shift = p.color ? (POD_SHIFT_COLORS[p.color] ?? p.color) : '#25B439'
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 100,
                border: '1px solid',
                borderColor: isSelected ? (p.color ?? '#25B439') : 'rgba(0,0,0,0.1)',
                background: isSelected ? shift : 'transparent',
                color: isSelected ? '#fff' : 'rgba(0,0,0,0.55)',
                fontSize: 11,
                fontWeight: isSelected ? 700 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.12s',
              }}
            >
              {p.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
