import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router'
import type { Pod, Category, Contact, Cadence, Owner, Interaction, ShareLink } from '../../lib/types'
import type { FieldConfig } from '../../lib/fieldConfig'
import { getPods, getContacts, getCategories, getAllInteractions, updatePod, createCategory, updateCategory } from '../../lib/airtable'
import { getFieldConfigs } from '../../lib/fieldConfig'
import { contactEquityScore, scoreLabel } from '../../lib/equity'
import { indexByContact } from '../../lib/equity'
import { Avatar, Spinner } from '../ui'
import { POD_SHIFT_COLORS } from '../map/SolidOrb'
import { LucideIcon } from '../LucideIcon'
import { IconPicker } from '../map/IconPicker'
import { getActiveShareLinks, revokeShareLink } from '../../lib/sharing'
import { SharePopover } from '../sharing/SharePopover'

const EQUITY_COLORS: Record<string, string> = {
  Thriving: '#16a34a',
  Steady:   '#4ade80',
  Cooling:  '#ea580c',
  Fading:   '#dc2626',
}

const inputStyle: React.CSSProperties = {
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
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

const sectionHeadStyle: React.CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontWeight: 700,
  fontSize: 16,
  color: 'var(--color-text-primary)',
  marginBottom: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

function Badge({ label }: { label: string }) {
  return (
    <span style={{
      background: 'var(--tint)',
      borderRadius: 100,
      padding: '1px 8px',
      fontSize: 11,
      fontWeight: 500,
      color: 'var(--color-text-secondary)',
    }}>{label}</span>
  )
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span style={{
      background: 'var(--tint)',
      borderRadius: 4,
      padding: '1px 6px',
      fontSize: 10,
      fontWeight: 500,
      color: 'var(--color-text-secondary)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    }}>{type}</span>
  )
}

export function PodDetailPage() {
  const { id: podId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [pod, setPod] = useState<Pod | null>(null)
  const [members, setMembers] = useState<Contact[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([])
  const [equityMap, setEquityMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Editable state
  const [description, setDescription] = useState('')
  const [cadence, setCadence] = useState<Cadence | ''>('')
  const [capacity, setCapacity] = useState<string>('')
  const [owner, setOwner] = useState<Owner | ''>('')
  const [isPriority, setIsPriority] = useState(false)
  const [saving, setSaving] = useState(false)

  // Add sub-pod state
  const [addingSubPod, setAddingSubPod] = useState(false)
  const [newSubPodName, setNewSubPodName] = useState('')
  const newSubPodInputRef = useRef<HTMLInputElement>(null)

  // Icon picker state
  const [iconPickerCatId, setIconPickerCatId] = useState<string | null>(null)
  const [iconPickerAnchor, setIconPickerAnchor] = useState<HTMLElement | null>(null)

  // Share links state
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [showSharePopover, setShowSharePopover] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)

  useEffect(() => {
    if (!podId) { setNotFound(true); setLoading(false); return }
    let stale = false

    async function load() {
      const [pods, allContacts, cats, configs, allInteractions, activeLinks] = await Promise.all([
        getPods(),
        getContacts(),
        getCategories(podId),
        getFieldConfigs(),
        getAllInteractions() as Promise<Interaction[]>,
        getActiveShareLinks(podId).catch(() => [] as ShareLink[]),
      ])
      if (stale) return

      const found = pods.find(p => p.id === podId)
      if (!found) { setNotFound(true); setLoading(false); return }

      const podMembers = allContacts.filter(c =>
        c.status === 'Active' && c.list_ids.includes(podId!)
      )

      const byContact = indexByContact(allInteractions)
      const eqMap: Record<string, number> = {}
      for (const c of podMembers) {
        eqMap[c.id] = contactEquityScore(byContact.get(c.id) ?? [])
      }

      setPod(found)
      setDescription(found.description ?? '')
      setCadence(found.cadence ?? '')
      setCapacity(found.capacity != null ? String(found.capacity) : '')
      setOwner(found.owner ?? '')
      setIsPriority(found.is_priority)
      setMembers(podMembers.sort((a, b) => (eqMap[b.id] ?? 0) - (eqMap[a.id] ?? 0)))
      setCategories(cats)
      setFieldConfigs(configs.filter(fc => fc.scope_pod_id === podId))
      setEquityMap(eqMap)
      setShareLinks(activeLinks)
      setLoading(false)
    }

    load().catch(() => {
      if (!stale) { setNotFound(true); setLoading(false) }
    })

    return () => { stale = true }
  }, [podId])

  const save = useCallback(async (data: Parameters<typeof updatePod>[1]) => {
    if (!podId) return
    setSaving(true)
    try {
      const updated = await updatePod(podId, data)
      setPod(updated)
    } finally {
      setSaving(false)
    }
  }, [podId])

  const handleAddSubPod = useCallback(async () => {
    if (!podId || !newSubPodName.trim()) return
    const cat = await createCategory(newSubPodName.trim(), podId)
    setCategories(prev => [...prev, cat])
    setNewSubPodName('')
    setAddingSubPod(false)
  }, [podId, newSubPodName])

  const handleIconChange = useCallback(async (catId: string, icon: string | null) => {
    await updateCategory(catId, { icon })
    setCategories(prev => prev.map(c => c.id === catId ? { ...c, icon } : c))
  }, [])

  useEffect(() => {
    if (addingSubPod) newSubPodInputRef.current?.focus()
  }, [addingSubPod])

  if (loading) {
    return (
      <div style={{ background: 'var(--color-bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={24} padding={0} />
      </div>
    )
  }

  if (notFound || !pod) {
    return (
      <div style={{ background: 'var(--color-bg)', minHeight: '100vh', padding: 40 }}>
        <button type="button" onClick={() => navigate('/pods')} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 13, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Back
        </button>
        <p style={{ color: 'var(--color-text-secondary)' }}>Pod not found.</p>
      </div>
    )
  }

  const podColor = pod.color ?? '#1C1C1E'
  const shiftColor = POD_SHIFT_COLORS[podColor] ?? podColor
  const capacityNum = capacity ? parseInt(capacity, 10) : null
  const atCapacity = capacityNum != null && members.length >= capacityNum
  const capacityColor = atCapacity ? '#ea580c' : '#16a34a'

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh', paddingBottom: 96 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 32px' }}>
        {/* Breadcrumb */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'var(--color-text-secondary)' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-text-secondary)', fontFamily: 'inherit', fontSize: 13 }}
          >
            Map
          </button>
          <span style={{ color: 'var(--color-text-tertiary)' }}>›</span>
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{pod.name}</span>
        </nav>

        {/* Pod header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 32 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${podColor}, ${shiftColor})`,
            flexShrink: 0,
            marginTop: 4,
          }} />
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 700,
              fontSize: 28,
              color: 'var(--color-text-primary)',
              margin: 0,
              lineHeight: 1.2,
            }}>{pod.name}</h1>
          </div>
          {saving && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8 }}>Saving…</span>}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              onMouseDown={e => e.stopPropagation()}
              onClick={() => setShowSharePopover(v => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--tint)',
                border: '1px solid var(--edge)',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Share
            </button>
            {showSharePopover && (
              <SharePopover
                podId={podId!}
                members={members}
                onCreated={(link) => {
                  setShareLinks(prev => [link, ...prev])
                  setShowSharePopover(false)
                }}
                onClose={() => setShowSharePopover(false)}
              />
            )}
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={() => save({ description: description || null })}
            placeholder="What is this pod for?"
            rows={2}
            style={{ ...inputStyle, width: '100%', resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>

        {/* Settings row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
          <div>
            <label style={labelStyle}>Cadence</label>
            <select
              value={cadence}
              onChange={e => {
                const val = e.target.value as Cadence | ''
                setCadence(val)
                save({ cadence: val || null })
              }}
              style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}
            >
              <option value="">None</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>
              Capacity
              {capacityNum != null && (
                <span style={{ fontWeight: 400, marginLeft: 6, color: capacityColor }}>
                  {members.length}/{capacityNum}
                </span>
              )}
            </label>
            <input
              type="number"
              value={capacity}
              min={1}
              onChange={e => setCapacity(e.target.value)}
              onBlur={() => {
                const num = capacity ? parseInt(capacity, 10) : null
                save({ capacity: num })
              }}
              placeholder="Unlimited"
              style={{ ...inputStyle, width: '100%' }}
            />
          </div>

          <div>
            <label style={labelStyle}>Owner</label>
            <select
              value={owner}
              onChange={e => {
                const val = e.target.value as Owner | ''
                setOwner(val)
                save({ owner: val || null })
              }}
              style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}
            >
              <option value="">None</option>
              <option value="moj_mahdara">Moj Mahdara</option>
              <option value="kinship_ventures">Kinship Ventures</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
            <input
              type="checkbox"
              id="is-priority"
              checked={isPriority}
              onChange={e => {
                setIsPriority(e.target.checked)
                save({ is_priority: e.target.checked })
              }}
              style={{ width: 14, height: 14, cursor: 'pointer' }}
            />
            <label htmlFor="is-priority" style={{ ...labelStyle, margin: 0, cursor: 'pointer' }}>Priority pod</label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                id="enrichment-opt-in"
                checked={pod.enrichment_opt_in}
                onChange={e => save({ enrichment_opt_in: e.target.checked })}
                style={{ width: 14, height: 14, cursor: 'pointer' }}
              />
              <label htmlFor="enrichment-opt-in" style={{ ...labelStyle, margin: 0, cursor: 'pointer' }}>Enrichment opt-in</label>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 22 }}>Auto-enrich all pod members when enrichment ships</span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--divider)', marginBottom: 32 }} />

        {/* Required Fields section */}
        <section style={{ marginBottom: 32 }}>
          <div style={sectionHeadStyle}>
            Required Questions <Badge label={String(fieldConfigs.length)} />
          </div>
          {fieldConfigs.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>No required fields for this pod yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fieldConfigs.map(fc => (
                <div key={fc.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  background: 'var(--tint)',
                  borderRadius: 8,
                  border: '1px solid var(--edge)',
                }}>
                  {fc.required && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />
                  )}
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{fc.name}</span>
                  <TypeBadge type={fc.field_type} />
                </div>
              ))}
            </div>
          )}
          {members.length > 0 && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, marginBottom: 0 }}>
              Manage fields from a{' '}
              <button
                type="button"
                onClick={() => navigate(`/contact/${members[0].id}`)}
                style={{ background: 'none', border: 'none', color: 'var(--color-brand)', fontSize: 11, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
              >
                member's record
              </button>
            </p>
          )}
        </section>

        <div style={{ borderTop: '1px solid var(--divider)', marginBottom: 32 }} />

        {/* Sub-pods section */}
        <section style={{ marginBottom: 32 }}>
          <div style={sectionHeadStyle}>
            Sub-pods <Badge label={String(categories.length)} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => navigate(`/category/${cat.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    background: 'var(--tint)',
                    border: '1px solid var(--edge)',
                    borderRadius: 100,
                    cursor: 'pointer',
                    fontSize: 13,
                    color: 'var(--color-text-primary)',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}
                >
                  {cat.icon ? (
                    <span
                      onClick={e => { e.stopPropagation(); setIconPickerCatId(cat.id); setIconPickerAnchor(e.currentTarget as HTMLElement) }}
                      style={{ lineHeight: 0, cursor: 'pointer' }}
                    >
                      <LucideIcon name={cat.icon} size={14} color={cat.color ?? 'var(--color-text-secondary)'} strokeWidth={1.75} />
                    </span>
                  ) : (
                    <span
                      onClick={e => { e.stopPropagation(); setIconPickerCatId(cat.id); setIconPickerAnchor(e.currentTarget as HTMLElement) }}
                      style={{ width: 14, height: 14, borderRadius: '50%', background: cat.color ?? 'var(--edge-strong)', flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--color-text-tertiary)' }}
                      title="Set icon"
                    />
                  )}
                  {cat.name}
                </button>
              </div>
            ))}
            {iconPickerCatId && (
              <IconPicker
                value={categories.find(c => c.id === iconPickerCatId)?.icon ?? null}
                onChange={icon => handleIconChange(iconPickerCatId, icon)}
                anchorEl={iconPickerAnchor}
                onClose={() => { setIconPickerCatId(null); setIconPickerAnchor(null) }}
              />
            )}
          </div>
          {addingSubPod ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                ref={newSubPodInputRef}
                type="text"
                value={newSubPodName}
                onChange={e => setNewSubPodName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddSubPod()
                  if (e.key === 'Escape') { setAddingSubPod(false); setNewSubPodName('') }
                }}
                placeholder="Sub-pod name"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="button"
                onClick={handleAddSubPod}
                disabled={!newSubPodName.trim()}
                style={{
                  padding: '8px 14px',
                  background: 'var(--color-brand)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 7,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  cursor: newSubPodName.trim() ? 'pointer' : 'not-allowed',
                  opacity: newSubPodName.trim() ? 1 : 0.5,
                }}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setAddingSubPod(false); setNewSubPodName('') }}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingSubPod(true)}
              style={{
                background: 'none',
                border: '1px dashed var(--edge-strong)',
                borderRadius: 100,
                padding: '5px 14px',
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              + Add Sub-pod
            </button>
          )}
        </section>

        <div style={{ borderTop: '1px solid var(--divider)', marginBottom: 32 }} />

        {/* Shared links section */}
        {shareLinks.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div style={sectionHeadStyle}>
              Shared links <Badge label={String(shareLinks.length)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {shareLinks.map(link => {
                const expiresAt = new Date(link.expires_at)
                const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                const isConfirming = confirmRevoke === link.id
                return (
                  <div
                    key={link.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      background: 'var(--tint)',
                      borderRadius: 8,
                      border: '1px solid var(--edge)',
                    }}
                  >
                    {isConfirming ? (
                      <>
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)' }}>Revoke this link?</span>
                        <button
                          type="button"
                          disabled={revokingId === link.id}
                          onClick={async () => {
                            setRevokingId(link.id)
                            try {
                              await revokeShareLink(link.id)
                              setShareLinks(prev => prev.filter(l => l.id !== link.id))
                              setConfirmRevoke(null)
                            } finally {
                              setRevokingId(null)
                            }
                          }}
                          style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          {revokingId === link.id ? 'Revoking...' : 'Yes, revoke'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRevoke(null)}
                          style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          /s/{link.token}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          {link.pin_hash && (
                            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-secondary)', background: 'var(--edge)', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>PIN</span>
                          )}
                          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                            in {daysLeft}d
                          </span>
                          <button
                            type="button"
                            onClick={() => setConfirmRevoke(link.id)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            Revoke
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {shareLinks.length > 0 && <div style={{ borderTop: '1px solid var(--divider)', marginBottom: 32 }} />}

        {/* Members section */}
        <section>
          <div style={{ ...sectionHeadStyle, justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Members{' '}
              <Badge label={capacityNum != null ? `${members.length}/${capacityNum}` : String(members.length)} />
            </span>
            {members.length > 0 && (
              <button
                type="button"
                className="see-all-link"
                onClick={() => navigate(`/contacts?pod=${podId}`)}
              >
                View table
              </button>
            )}
          </div>
          {members.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 8px' }}>No members yet.</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>Add contacts from the Categorization Queue.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {members.map(m => {
                const score = equityMap[m.id] ?? 0
                const label = scoreLabel(score)
                const labelColor = EQUITY_COLORS[label] ?? 'var(--color-text-secondary)'
                const isPrimary = m.primary_list_id === podId
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => navigate(`/contact/${m.id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      transition: 'background 0.12s',
                      width: '100%',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--tint)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Avatar name={m.name} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.name}
                        </span>
                        {isPrimary && (
                          <span style={{ fontSize: 9, fontWeight: 600, color: podColor, background: `${podColor}18`, borderRadius: 4, padding: '1px 5px', letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0 }}>Primary</span>
                        )}
                      </div>
                      {(m.company || m.role) && (
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {[m.role, m.company].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: labelColor }}>{score}</div>
                      <div style={{ fontSize: 10, color: labelColor, opacity: 0.8 }}>{label}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
