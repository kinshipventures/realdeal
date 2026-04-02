import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import type { Contact } from '../../lib/types'
import { getContacts, getContactsByType, updateContact } from '../../lib/airtable'

interface Props {
  contact: Contact  // the Company record
}

const WIDGET_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.92)',
  border: '1px solid var(--edge)',
  borderRadius: 12,
  padding: '16px 20px',
  marginBottom: 12,
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

export function AssociatedPeopleWidget({ contact }: Props) {
  const navigate = useNavigate()
  const [people, setPeople] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  // Add person typeahead
  const [showAdd, setShowAdd] = useState(false)
  const [addQuery, setAddQuery] = useState('')
  const [addResults, setAddResults] = useState<Contact[]>([])

  useEffect(() => {
    getContacts().then(all => {
      setPeople(all.filter(c => c.company_record_id === contact.id))
      setLoading(false)
    })
  }, [contact.id])

  // Debounced add-person search
  useEffect(() => {
    if (!showAdd || addQuery.length < 1) {
      setAddResults([])
      return
    }
    const t = setTimeout(async () => {
      const contacts = await getContactsByType('Contact')
      setAddResults(
        contacts
          .filter(c =>
            c.id !== contact.id &&
            c.company_record_id !== contact.id &&
            c.name.toLowerCase().includes(addQuery.toLowerCase())
          )
          .slice(0, 5)
      )
    }, 150)
    return () => clearTimeout(t)
  }, [addQuery, showAdd, contact.id])

  async function linkPerson(person: Contact) {
    setShowAdd(false)
    setAddQuery('')
    setAddResults([])
    await updateContact(person.id, {
      company_record_id: contact.id,
      company: contact.name,
    })
    setPeople(prev => [...prev, { ...person, company_record_id: contact.id, company: contact.name }])
  }

  return (
    <div style={WIDGET_STYLE}>
      <div style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 16,
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        marginBottom: 12,
      }}>
        People
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: '4px 0' }}>Loading...</div>
      ) : people.length === 0 ? (
        <div style={{ padding: '8px 0 4px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 2 }}>
            No linked contacts
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            Search for existing contacts to link.
          </div>
        </div>
      ) : (
        <div>
          {people.map(person => (
            <div
              key={person.id}
              onClick={() => navigate(`/contact/${person.id}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                minHeight: 44,
                cursor: 'pointer',
                borderRadius: 8,
                padding: '4px 0',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--tint)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'rgba(37,180,57,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                color: '#1A8A2A',
                flexShrink: 0,
              }}>
                {initials(person.name)}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {person.name}
                </div>
                {person.role && (
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{person.role}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add person section */}
      <div style={{ marginTop: 8, position: 'relative' }}>
        {!showAdd ? (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            style={{
              background: 'none', border: 'none', padding: 0,
              fontSize: 11, fontWeight: 700, color: '#25B439',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            + Add person
          </button>
        ) : (
          <div>
            <input
              autoFocus
              type="text"
              value={addQuery}
              onChange={e => setAddQuery(e.target.value)}
              onBlur={() => setTimeout(() => { setShowAdd(false); setAddQuery(''); setAddResults([]) }, 150)}
              placeholder="Search contacts..."
              style={{
                width: '100%',
                fontSize: 12,
                fontFamily: 'inherit',
                outline: 'none',
                border: 'none',
                borderBottom: '1px solid #25B439',
                background: 'transparent',
                color: 'var(--color-text-primary)',
                padding: '2px 0',
                boxSizing: 'border-box',
              }}
            />
            {addResults.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'rgba(255,255,255,0.96)',
                border: '1px solid var(--edge)',
                borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                zIndex: 50,
                marginTop: 4,
              }}>
                {addResults.map(person => (
                  <div
                    key={person.id}
                    onMouseDown={() => linkPerson(person)}
                    style={{
                      padding: '10px 12px',
                      fontSize: 13,
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                      minHeight: 44,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      borderBottom: '1px solid var(--divider)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,180,57,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: 'rgba(37,180,57,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700, color: '#1A8A2A', flexShrink: 0,
                    }}>
                      {initials(person.name)}
                    </div>
                    <div>
                      <div>{person.name}</div>
                      {person.role && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{person.role}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
