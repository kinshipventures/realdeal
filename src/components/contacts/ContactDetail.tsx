import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { type Category, type Contact, type Interaction, type Pod } from '../../lib/types'
import { getInteractions } from '../../lib/data'
import { contactEquityScore, contactEquityBreakdown, scoreLabel, type EquityBreakdown } from '../../lib/equity'
import { planClearSubPodForPod, planMoveToSubPod } from '../../lib/subPodAssignment'
import { hasLpTrackerValue, LP_TRACKER_FIELDS, lpTrackerDisplayValue, normalizeLpTrackerFieldValue, trimImportListItem, type LpTrackerFieldDefinition } from '../../lib/lpTrackerFields'

import { updateContact, createContact, deleteContact, getCategories, getCampaigns, getCampaignContactsForContact, getCampaignStages, addContactToCampaign, updateCampaignContact, getContacts } from '../../lib/data'
import { logSystemEvent } from '../../lib/timeline'
import { callEnrichFunction, isEnrichmentAllowed, computeFieldDiffs, applyEnrichment, ENRICHABLE_FIELDS } from '../../lib/enrichment'
import type { Campaign, CampaignContact, CampaignStage } from '../../lib/types'
import { CAMPAIGN_COMMITMENT_AMOUNT_FIELD, formatMoney, getCampaignContactCampaignStatus, getCampaignContactCommitmentAmount, withMoneyField } from '../../lib/campaignCommitments'
import { avatarHue, initials } from '../../lib/utils'
import { useEscape } from '../../lib/escapeStack'
import { CloseButton } from '../ui'
import { InteractionSection } from './InteractionSection'
import { CampaignCommitmentInput } from '../campaigns/CampaignCommitmentInput'
import { SubPodSelector } from '../subpods/SubPodSelector'

const RING_COLORS: Record<string, string> = {
  intro: '#C2185B',
  meeting: '#E65100',
  call: '#2E7D32',
  text: '#7B1FA2',
  email: '#1565C0',
}

const ADD_NEW_OPTION_VALUE = '__realdeal_add_new_option__'

function SegmentedEquityRing({ breakdown, score, size = 72 }: {
  breakdown: EquityBreakdown[]
  score: number
  size?: number
}) {
  const strokeWidth = 5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  if (breakdown.length === 0) {
    return (
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--stroke-subtle)" strokeWidth={strokeWidth} />
      </svg>
    )
  }

  const totalScore = breakdown.reduce((s, b) => s + b.score, 0)
  const filledArc = (score / 100) * circumference

  let offset = 0
  const segments = breakdown.map((b, i) => {
    const isLast = i === breakdown.length - 1
    const arcLength = isLast
      ? filledArc - offset
      : (b.score / totalScore) * filledArc
    const segmentOffset = circumference - offset
    offset += arcLength
    return { ...b, arcLength, segmentOffset }
  })

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="var(--stroke-subtle)" strokeWidth={strokeWidth} />
      {segments.map(seg => (
        <circle key={seg.type}
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={RING_COLORS[seg.type] ?? 'var(--edge-strong)'}
          strokeWidth={strokeWidth}
          strokeDasharray={`${seg.arcLength} ${circumference}`}
          strokeDashoffset={seg.segmentOffset}
          strokeLinecap="butt"
        />
      ))}
    </svg>
  )
}

interface Props {
  contact: Contact | null  // null = create mode
  categoryId?: string      // only used for create mode
  onClose: () => void
  onSaved: (contact: Contact) => void
  onDeleted?: () => void
  pods?: Pod[]  // optional -- enrichment features disabled when not provided
  categories?: Category[]
  onCampaignContactUpdated?: (updated: CampaignContact) => void
}

type SaveError = { field: keyof Contact; value: string | string[] | null } | null

type FieldRenderOptions = {
  multi?: boolean
  inputType?: 'text' | 'email' | 'tel' | 'url'
  options?: string[]
  alwaysInput?: boolean
}

type ShellBounds = {
  left: number
  top: number
  width: number
  height: number
}

function uniqueIds(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function uniqueContactsById(values: Contact[]): Contact[] {
  const seen = new Set<string>()
  return values.filter(contact => {
    if (seen.has(contact.id)) return false
    seen.add(contact.id)
    return true
  })
}

function parentPodIdsForCategories(categoryIds: string[], categories: Category[]): string[] {
  const categoryById = new Map(categories.map(category => [category.id, category]))
  return uniqueIds(categoryIds.map(categoryId => categoryById.get(categoryId)?.list_id ?? ''))
}

function sanitizeCustomFields(fields: unknown): Record<string, unknown> {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return {}

  const rawFields = fields as Record<string, unknown>
  const allowedKeys = new Set(LP_TRACKER_FIELDS.map(field => field.key))
  const nextFields: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(rawFields)) {
    if (allowedKeys.has(key) && hasLpTrackerValue(value)) {
      nextFields[key] = value
    }
  }

  for (const field of LP_TRACKER_FIELDS) {
    if (hasLpTrackerValue(nextFields[field.key])) continue
    for (const legacyKey of field.legacyKeys ?? []) {
      const legacyValue = rawFields[legacyKey]
      if (hasLpTrackerValue(legacyValue)) {
        nextFields[field.key] = legacyValue
        break
      }
    }
  }

  return nextFields
}

export function ContactDetail({ contact, categoryId, onClose, onSaved, onDeleted, pods = [], categories: providedCategories, onCampaignContactUpdated }: Props) {
  const isNew = contact === null

  const [draft, setDraft] = useState<Partial<Contact>>(
    contact ?? {
      name: '', email: null, phone: null, company: null, role: null,
      location: null, website: null, notes: null, recommended_by: null,
      specialization: null, past_clients: null,
      birthday: null, milestones: null, interests: null, relationship_context: null,
      category_ids: categoryId ? [categoryId] : [], list_ids: [], ring_ids: [], custom_fields: {},
    }
  )
  const [editingField, setEditingField] = useState<keyof Contact | null>(isNew ? 'name' : null)
  const [editingCustomField, setEditingCustomField] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saveError, setSaveError] = useState<SaveError>(null)
  const [customFieldSaveError, setCustomFieldSaveError] = useState<string | null>(null)
  const [hasPendingContactChanges, setHasPendingContactChanges] = useState(false)
  const [savingContactInfo, setSavingContactInfo] = useState(false)
  const [contactSaveError, setContactSaveError] = useState<string | null>(null)
  const [newOptionTarget, setNewOptionTarget] = useState<string | null>(null)
  const [newOptionValue, setNewOptionValue] = useState('')
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [contactCampaignLinks, setContactCampaignLinks] = useState<CampaignContact[]>([])
  const [campaignStagesMap, setCampaignStagesMap] = useState<Record<string, CampaignStage[]>>({})
  const [availableCategories, setAvailableCategories] = useState<Category[]>(providedCategories ?? [])
  const [contactsForOptions, setContactsForOptions] = useState<Contact[]>(contact ? [contact] : [])
  const [showCampaignPicker, setShowCampaignPicker] = useState(false)
  const [addingToCampaign, setAddingToCampaign] = useState(false)
  const [addedCampaignId, setAddedCampaignId] = useState<string | null>(null)
  const [editFollowUpDate, setEditFollowUpDate] = useState('')
  const [editFollowUpAction, setEditFollowUpAction] = useState('')
  const [completingFollowUp, setCompletingFollowUp] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [enrichedFields, setEnrichedFields] = useState<Set<keyof Contact>>(new Set())
  const [enrichError, setEnrichError] = useState<string | null>(null)
  const [suggestedUpdates, setSuggestedUpdates] = useState<Record<string, { current: string; suggested: string }>>({})
  const [acceptingField, setAcceptingField] = useState<string | null>(null)
  const [shellBounds, setShellBounds] = useState<ShellBounds | null>(null)

  useEffect(() => {
    if (!contact) return
    setDraft(contact)
    setEditingField(null)
    setEditingCustomField(null)
    setHasPendingContactChanges(false)
    setSavingContactInfo(false)
    setContactSaveError(null)
    setSaveError(null)
    setCustomFieldSaveError(null)
    setNewOptionTarget(null)
    setNewOptionValue('')
  }, [contact?.id])

  useEffect(() => {
    if (!contact) return
    getInteractions(contact.id).then(setInteractions)
  }, [contact?.id])

  useEffect(() => {
    getCampaigns().then(setCampaigns)
  }, [])

  useEffect(() => {
    let canceled = false
    getContacts()
      .then(fetched => {
        if (canceled) return
        setContactsForOptions(contact ? uniqueContactsById([contact, ...fetched]) : fetched)
      })
      .catch(() => {
        if (!canceled && contact) setContactsForOptions([contact])
      })
    return () => { canceled = true }
  }, [contact?.id])

  useEffect(() => {
    if (providedCategories && providedCategories.length > 0) {
      setAvailableCategories(providedCategories)
      return
    }
    let canceled = false
    getCategories()
      .then(fetched => { if (!canceled) setAvailableCategories(fetched) })
      .catch(() => {})
    return () => { canceled = true }
  }, [providedCategories])

  useEffect(() => {
    if (!isNew || availableCategories.length === 0) return
    const categoryIds = draft.category_ids ?? []
    if (categoryIds.length === 0) return
    const inferredPodIds = parentPodIdsForCategories(categoryIds, availableCategories)
    if (inferredPodIds.length === 0) return

    setDraft(prev => {
      const listIds = uniqueIds([...(prev.list_ids ?? []), ...inferredPodIds])
      return {
        ...prev,
        list_ids: listIds,
        primary_list_id: prev.primary_list_id ?? listIds[0] ?? null,
      }
    })
  }, [availableCategories, draft.category_ids, isNew])

  useEffect(() => {
    if (!contact) return
    getCampaignContactsForContact(contact.id).then(async (links) => {
      setContactCampaignLinks(links)
      const uniqueCampaignIds = [...new Set(links.map(l => l.campaign_id))]
      const results = await Promise.all(uniqueCampaignIds.map(id => getCampaignStages(id)))
      const stagesMap: Record<string, CampaignStage[]> = {}
      uniqueCampaignIds.forEach((id, i) => { stagesMap[id] = results[i] })
      setCampaignStagesMap(stagesMap)
    })
  }, [contact?.id])

  async function handleAddToCampaign(campaignId: string) {
    if (!contact) return
    setAddingToCampaign(true)
    try {
      // Place in first stage so the contact appears on the board
      const stages = await getCampaignStages(campaignId)
      const firstStage = stages.sort((a, b) => a.order - b.order)[0]
      await addContactToCampaign(campaignId, contact.id, firstStage?.id)
      setShowCampaignPicker(false)
      setAddedCampaignId(campaignId)
      setTimeout(() => setAddedCampaignId(null), 2000)
      getCampaignContactsForContact(contact.id).then(setContactCampaignLinks)
    } finally {
      setAddingToCampaign(false)
    }
  }

  async function handleCommitmentAmountSave(link: CampaignContact, amount: number | null) {
    const updated = await updateCampaignContact(link.id, {
      custom_fields: withMoneyField(link.custom_fields, CAMPAIGN_COMMITMENT_AMOUNT_FIELD, amount),
    })
    setContactCampaignLinks(prev => prev.map(item => item.id === updated.id ? updated : item))
    onCampaignContactUpdated?.(updated)
  }

  const equityScore = contactEquityScore(interactions)
  const equityBreakdown = contactEquityBreakdown(interactions)
  const totalCommitmentAmount = contactCampaignLinks.reduce(
    (sum, link) => sum + (getCampaignContactCommitmentAmount(link) ?? 0),
    0,
  )

  const handleClose = useCallback(() => onClose(), [onClose])
  useEscape(handleClose)

  useEffect(() => {
    const root = document.getElementById('main-content')

    function measureShell() {
      if (!root) {
        setShellBounds({
          left: 0,
          top: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        })
        return
      }

      const rect = root.getBoundingClientRect()
      setShellBounds({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      })
    }

    measureShell()
    window.addEventListener('resize', measureShell)
    const resizeObserver = root ? new ResizeObserver(() => measureShell()) : null
    resizeObserver?.observe(root)
    return () => {
      window.removeEventListener('resize', measureShell)
      resizeObserver?.disconnect()
    }
  }, [])

  function markContactInfoChanged() {
    setHasPendingContactChanges(true)
    setContactSaveError(null)
    setSaveError(null)
    setCustomFieldSaveError(null)
  }

  function handleBlur(key: keyof Contact, value: string) {
    const v = value.trim() || null
    setDraft(prev => ({ ...prev, [key]: v }))
    setEditingField(null)
    setNewOptionTarget(null)
    setNewOptionValue('')
    markContactInfoChanged()
  }

  function handleRetrySave() {
    void handleSaveContactInfo()
  }

  async function handleSaveContactInfo() {
    if (!contact || isNew || !hasPendingContactChanges) return

    const nextName = String(draft.name ?? contact.name ?? '').trim()
    const spvInvestor = Array.isArray(draft.spv_investor)
      ? draft.spv_investor.map(value => String(value).trim()).filter(Boolean)
      : []

    setSavingContactInfo(true)
    setContactSaveError(null)
    try {
      const updated = await updateContact(contact.id, {
        name: nextName || contact.name,
        email: draft.email ?? null,
        phone: draft.phone ?? null,
        company: draft.company ?? null,
        linkedin: draft.linkedin ?? null,
        website: draft.website ?? null,
        country: draft.country ?? null,
        gender: draft.gender ?? null,
        recommended_by: draft.recommended_by ?? null,
        spv_investor: spvInvestor.length > 0 ? spvInvestor : null,
        custom_fields: getDraftCustomFields(),
      } as Partial<Contact>)
      setDraft(updated)
      setHasPendingContactChanges(false)
      setSaveError(null)
      setCustomFieldSaveError(null)
      setNewOptionTarget(null)
      setNewOptionValue('')
      onSaved(updated)
    } catch {
      setContactSaveError('Could not save. Try again.')
    } finally {
      setSavingContactInfo(false)
    }
  }

  // Field renderer: label plus display/input based on editingField
  function splitLabelInput(value: string): string[] {
    return normalizeLabelValues(value
      .split(/[;,|\n]+/)
      .map(trimImportListItem)
      .filter(Boolean))
  }

  function normalizeLabelValues(values: string[]): string[] {
    return [...new Set(values.map(value => trimImportListItem(String(value))).filter(Boolean))]
  }

  function mergeOptions(values: unknown[], extras: unknown[] = []): string[] {
    const options = [...values, ...extras].flatMap(value => Array.isArray(value) ? value : [value])
      .map(value => String(value ?? '').trim())
      .filter(Boolean)
    return [...new Set(options)].sort((a, b) => a.localeCompare(b))
  }

  function customFieldOptions(field: LpTrackerFieldDefinition): string[] {
    const current = getDraftCustomFields()[field.key]
    return mergeOptions(
      contactsForOptions.map(optionContact => {
        const fields = optionContact.custom_fields
        if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return null
        return (fields as Record<string, unknown>)[field.key]
      }),
      [current],
    )
  }

  function contactFieldOptions(key: keyof Contact, extras: unknown[] = []): string[] {
    return mergeOptions(
      contactsForOptions.map(optionContact => optionContact[key]),
      [draft[key], ...extras],
    )
  }

  function beginAddingOption(targetId: string) {
    setNewOptionTarget(targetId)
    setNewOptionValue('')
  }

  function renderAddOptionControl(targetId: string, onAdd: (value: string) => void, placeholder = 'New option') {
    if (newOptionTarget !== targetId) return null

    function commitNewOption() {
      const value = newOptionValue.trim()
      if (!value) return
      onAdd(value)
      setNewOptionTarget(null)
      setNewOptionValue('')
    }

    return (
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <input
          autoFocus
          type="text"
          value={newOptionValue}
          placeholder={placeholder}
          onChange={event => setNewOptionValue(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitNewOption()
            }
            if (event.key === 'Escape') {
              setNewOptionTarget(null)
              setNewOptionValue('')
              event.stopPropagation()
            }
          }}
          style={{
            flex: '1 1 180px',
            minWidth: 0,
            background: 'color-mix(in srgb, var(--surface-panel) 88%, var(--tint) 12%)',
            border: '1px solid var(--edge-strong)',
            borderRadius: 8,
            color: 'var(--color-text-primary)',
            fontSize: 13,
            lineHeight: 1.4,
            padding: '7px 10px',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <button
          type="button"
          onClick={commitNewOption}
          disabled={!newOptionValue.trim()}
          style={{
            padding: '7px 12px',
            borderRadius: 8,
            border: '1px solid var(--edge-strong)',
            background: newOptionValue.trim() ? 'var(--color-brand)' : 'var(--tint)',
            color: newOptionValue.trim() ? '#fff' : 'var(--color-text-tertiary)',
            fontSize: 13,
            fontWeight: 600,
            cursor: newOptionValue.trim() ? 'pointer' : 'default',
            fontFamily: 'inherit',
          }}
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => {
            setNewOptionTarget(null)
            setNewOptionValue('')
          }}
          style={{
            padding: '7px 10px',
            borderRadius: 8,
            border: '1px solid var(--edge)',
            background: 'transparent',
            color: 'var(--color-text-secondary)',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Cancel
        </button>
      </div>
    )
  }

  function brandedSelect({
    value,
    placeholder,
    options,
    targetId,
    onSelect,
    onAdd,
  }: {
    value: string
    placeholder: string
    options: string[]
    targetId: string
    onSelect: (value: string) => void
    onAdd: (value: string) => void
  }) {
    return (
      <>
        <div style={{ position: 'relative' }}>
          <select
            autoFocus
            value={value}
            onChange={event => {
              if (event.target.value === ADD_NEW_OPTION_VALUE) {
                beginAddingOption(targetId)
                return
              }
              onSelect(event.target.value)
            }}
            style={{
              width: '100%',
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              background: 'linear-gradient(180deg, color-mix(in srgb, var(--surface-panel) 94%, var(--tint) 6%), color-mix(in srgb, var(--surface-panel) 82%, var(--tint) 18%))',
              border: '1px solid color-mix(in srgb, var(--edge-strong) 82%, var(--color-brand) 18%)',
              borderRadius: 9,
              color: 'var(--color-text-primary)',
              fontSize: 14,
              lineHeight: 1.45,
              padding: '8px 36px 8px 11px',
              outline: 'none',
              fontFamily: 'inherit',
              boxShadow: '0 1px 0 rgba(255,255,255,0.7), inset 0 1px 0 rgba(255,255,255,0.55)',
              cursor: 'pointer',
            }}
          >
            <option value="">{placeholder}</option>
            {options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
            <option value={ADD_NEW_OPTION_VALUE}>+ Add new option...</option>
          </select>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-secondary)',
              pointerEvents: 'none',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
        {renderAddOptionControl(targetId, onAdd)}
      </>
    )
  }

  function setArrayDraftValue(key: keyof Contact, values: string[], closeEditor = false) {
    const nextValue = normalizeLabelValues(values)
    const persistedValue = nextValue.length > 0 ? nextValue : null
    setDraft(prev => ({ ...prev, [key]: persistedValue }))
    if (closeEditor) setEditingField(null)
    setNewOptionTarget(null)
    setNewOptionValue('')
    markContactInfoChanged()
  }

  function field(key: keyof Contact, label: string, renderOptions: FieldRenderOptions | boolean = {}) {
    const options = typeof renderOptions === 'boolean' ? { multi: renderOptions } : renderOptions
    const multi = options.multi ?? false
    const val = (draft[key] as string | null | undefined) ?? null
    const editing = editingField === key
    const hasSaveError = saveError?.field === key
    const isEnriched = enrichedFields.has(key)
    const fieldKey = key as string
    const selectOptions = options.options ?? []
    const isSelect = options.options !== undefined
    const alwaysInput = options.alwaysInput ?? false

    const inputStyle = {
      width: '100%',
      background: 'var(--tint)',
      border: '1px solid var(--edge-strong)',
      borderRadius: 6,
      color: 'var(--color-text-primary)',
      fontSize: 14,
      lineHeight: 1.45,
      padding: '7px 10px',
      outline: 'none',
      fontFamily: 'inherit',
    }

    // Enter commits single-line fields; Cmd+Enter commits textareas.
    // Escape reverts to the closure value (render-time original) and blurs.
    // stopPropagation prevents Escape from bubbling to the window escape stack.
    function onKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
      const tag = e.currentTarget.tagName
      if (e.key === 'Enter' && tag === 'INPUT') {
        e.currentTarget.blur()
      }
      if (e.key === 'Enter' && tag === 'TEXTAREA' && (e.metaKey || e.ctrlKey)) {
        e.currentTarget.blur()
      }
      if (e.key === 'Escape') {
        e.currentTarget.value = val ?? ''
        e.currentTarget.blur()
        e.stopPropagation()
      }
    }

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '132px minmax(0, 1fr)',
        gap: 14,
        alignItems: multi || editing ? 'start' : 'center',
        padding: '13px 18px',
        borderBottom: '1px solid var(--divider)',
      }}>
        <div style={rowLabelWrap}>
          <div style={rowLabel}>
            {label}
          </div>
          {isEnriched && (
            <span
              title="AI-enriched"
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#6366F1',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
          )}
          {hasSaveError && (
            <button
              type="button"
              onClick={handleRetrySave}
              style={{
                fontSize: 11, fontWeight: 400,
                color: '#D93025',
                letterSpacing: '0.01em',
                background: 'none', border: 'none',
                cursor: 'pointer', padding: 0,
              }}
            >
              Could not save. Try again.
            </button>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          {alwaysInput ? (
            <input
              type={options.inputType ?? 'text'}
              value={val ?? ''}
              placeholder={`Add ${label.toLowerCase()}`}
              onChange={event => {
                const value = event.target.value
                setDraft(prev => ({ ...prev, [key]: value || null }))
                markContactInfoChanged()
              }}
              onKeyDown={event => {
                if (event.key === 'Enter') event.currentTarget.blur()
              }}
              style={inputStyle}
            />
          ) : editing ? (
            isSelect ? (
              brandedSelect({
                value: val ?? '',
                placeholder: `add ${label.toLowerCase()}`,
                options: selectOptions,
                targetId: `contact:${String(key)}`,
                onSelect: value => handleBlur(key, value),
                onAdd: value => handleBlur(key, value),
              })
            ) : multi ? (
              <textarea
                autoFocus
                defaultValue={val ?? ''}
                onBlur={e => handleBlur(key, e.target.value)}
                onKeyDown={onKeyDown}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            ) : (
              <input
                autoFocus
                type={options.inputType ?? 'text'}
                defaultValue={val ?? ''}
                onBlur={e => handleBlur(key, e.target.value)}
                onKeyDown={onKeyDown}
                style={inputStyle}
              />
            )
          ) : (
            <div
              onClick={() => setEditingField(key)}
              style={{
                fontSize: 14,
                color: val ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                cursor: 'text',
                minHeight: 22,
                whiteSpace: multi ? 'pre-wrap' : 'nowrap',
                overflow: 'hidden',
                textOverflow: multi ? undefined : 'ellipsis',
                lineHeight: multi ? 1.6 : 1.45,
                padding: multi ? '2px 0' : '0',
              }}
            >
              {val ?? `add ${label.toLowerCase()}`}
            </div>
          )}
          {suggestedUpdates[fieldKey] && (
            <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(99,102,241,0.06)', borderRadius: 8, fontSize: 13 }}>
              <div style={{ color: 'var(--color-text-secondary)', marginBottom: 2 }}>
                Suggested: <strong>{suggestedUpdates[fieldKey].suggested}</strong>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  disabled={acceptingField === fieldKey}
                  onClick={async () => {
                    setAcceptingField(fieldKey)
                    const original = { [fieldKey]: suggestedUpdates[fieldKey].current }
                    const updated = await applyEnrichment(contact!.id, { [fieldKey]: suggestedUpdates[fieldKey].suggested }, original)
                    onSaved(updated)
                    setEnrichedFields(prev => new Set([...prev, key]))
                    setSuggestedUpdates(prev => { const next = { ...prev }; delete next[fieldKey]; return next })
                    setAcceptingField(null)
                  }}
                  style={{ fontSize: 12, color: '#6366F1', cursor: 'pointer', background: 'none', border: 'none', padding: 0, opacity: acceptingField === fieldKey ? 0.5 : 1 }}
                >
                  {acceptingField === fieldKey ? 'Accepting...' : 'Accept'}
                </button>
                <button
                  type="button"
                  onClick={() => setSuggestedUpdates(prev => { const next = { ...prev }; delete next[fieldKey]; return next })}
                  style={{ fontSize: 12, color: 'var(--color-text-secondary)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                >
                  Keep current
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  function arrayField(key: keyof Contact, label: string, options: string[] = []) {
    const rawValue = draft[key]
    const values = Array.isArray(rawValue) ? rawValue.map(String) : []
    const value = values.join(', ')
    const editing = editingField === key
    const hasSaveError = saveError?.field === key
    const labelTargetId = `labels:${String(key)}`
    const labelOptions = mergeOptions(options, values)
    const inputStyle = {
      width: '100%',
      background: 'var(--tint)',
      border: '1px solid var(--edge-strong)',
      borderRadius: 6,
      color: 'var(--color-text-primary)',
      fontSize: 14,
      lineHeight: 1.45,
      padding: '7px 10px',
      outline: 'none',
      fontFamily: 'inherit',
    }

    function toggleLabel(option: string) {
      const nextValues = values.includes(option)
        ? values.filter(valueItem => valueItem !== option)
        : [...values, option]
      setArrayDraftValue(key, nextValues)
    }

    function renderLabelChip(option: string, selected = true) {
      return (
        <button
          key={option}
          type="button"
          onClick={() => editing && toggleLabel(option)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            maxWidth: '100%',
            padding: '5px 9px',
            borderRadius: 999,
            border: selected
              ? '1px solid color-mix(in srgb, var(--color-brand) 55%, var(--edge) 45%)'
              : '1px dashed var(--edge)',
            background: selected
              ? 'color-mix(in srgb, var(--color-brand) 11%, var(--surface-panel) 89%)'
              : 'color-mix(in srgb, var(--surface-panel) 86%, var(--tint) 14%)',
            color: selected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            fontSize: 12,
            fontWeight: selected ? 600 : 500,
            lineHeight: 1.3,
            cursor: editing ? 'pointer' : 'default',
            fontFamily: 'inherit',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{option}</span>
          {editing && selected && <span aria-hidden="true" style={{ fontSize: 12 }}>x</span>}
        </button>
      )
    }

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '132px minmax(0, 1fr)',
        gap: 14,
        alignItems: editing ? 'start' : 'center',
        padding: '13px 18px',
        borderBottom: '1px solid var(--divider)',
      }}>
        <div style={rowLabelWrap}>
          <div style={rowLabel}>{label}</div>
          {hasSaveError && (
            <button
              type="button"
              onClick={handleRetrySave}
              style={{
                fontSize: 11,
                fontWeight: 400,
                color: '#D93025',
                letterSpacing: '0.01em',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Could not save. Try again.
            </button>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {labelOptions.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {labelOptions.map(option => renderLabelChip(option, values.includes(option)))}
                </div>
              )}
              <input
                type="text"
                placeholder={`Add ${label.toLowerCase()} separated by commas`}
                onBlur={event => {
                  if (!event.target.value.trim()) return
                  setArrayDraftValue(key, [...values, ...splitLabelInput(event.target.value)])
                  event.target.value = ''
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    if (event.currentTarget.value.trim()) {
                      setArrayDraftValue(key, [...values, ...splitLabelInput(event.currentTarget.value)])
                      event.currentTarget.value = ''
                    }
                  }
                  if (event.key === 'Escape') {
                    setEditingField(null)
                    event.stopPropagation()
                  }
                }}
                style={inputStyle}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => beginAddingOption(labelTargetId)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 999,
                    border: '1px dashed var(--edge-strong)',
                    background: 'color-mix(in srgb, var(--surface-panel) 86%, var(--tint) 14%)',
                    color: 'var(--color-text-secondary)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Add label
                </button>
                <button
                  type="button"
                  onClick={() => setEditingField(null)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 999,
                    border: '1px solid var(--edge)',
                    background: 'transparent',
                    color: 'var(--color-text-secondary)',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Done
                </button>
              </div>
              {renderAddOptionControl(labelTargetId, option => setArrayDraftValue(key, [...values, option]), 'New label')}
            </div>
          ) : value ? (
            <div
              onClick={() => setEditingField(key)}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                minHeight: 22,
                cursor: 'text',
              }}
            >
              {values.map(option => renderLabelChip(option))}
            </div>
          ) : (
            <div
              onClick={() => setEditingField(key)}
              style={{
                fontSize: 14,
                color: 'var(--color-text-tertiary)',
                cursor: 'text',
                minHeight: 22,
                lineHeight: 1.45,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {`add ${label.toLowerCase()}`}
            </div>
          )}
        </div>
      </div>
    )
  }

  function getDraftCustomFields(): Record<string, unknown> {
    return sanitizeCustomFields(draft.custom_fields)
  }

  function handleCustomFieldSave(field: LpTrackerFieldDefinition, rawValue: string | boolean | string[]) {
    const value = Array.isArray(rawValue)
      ? normalizeLabelValues(rawValue)
      : typeof rawValue === 'boolean'
        ? rawValue
        : normalizeLpTrackerFieldValue(field, rawValue)
    const nextCustomFields = { ...getDraftCustomFields() }
    if (hasLpTrackerValue(value)) {
      nextCustomFields[field.key] = value
    } else {
      delete nextCustomFields[field.key]
    }

    setDraft(prev => ({ ...prev, custom_fields: nextCustomFields }))
    setEditingCustomField(null)
    setNewOptionTarget(null)
    setNewOptionValue('')
    markContactInfoChanged()
  }

  function customField(fieldDef: LpTrackerFieldDefinition) {
    const customFields = getDraftCustomFields()
    const rawValue = customFields[fieldDef.key]
    const value = lpTrackerDisplayValue(rawValue)
    const editing = editingCustomField === fieldDef.key
    const hasSaveError = customFieldSaveError === fieldDef.key
    const multi = fieldDef.type === 'long_text' || fieldDef.type === 'multi_select'
    const selectOptions = fieldDef.type === 'select' ? customFieldOptions(fieldDef) : []
    const multiSelectValues = fieldDef.type === 'multi_select'
      ? Array.isArray(rawValue)
        ? rawValue.map(String)
        : splitLabelInput(value)
      : []
    const multiSelectOptions = fieldDef.type === 'multi_select' ? mergeOptions(customFieldOptions(fieldDef), multiSelectValues) : []
    const multiSelectTargetId = `custom-labels:${fieldDef.key}`

    const inputStyle = {
      width: '100%',
      background: 'var(--tint)',
      border: '1px solid var(--edge-strong)',
      borderRadius: 6,
      color: 'var(--color-text-primary)',
      fontSize: 14,
      lineHeight: 1.45,
      padding: '7px 10px',
      outline: 'none',
      fontFamily: 'inherit',
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
      const tag = e.currentTarget.tagName
      if (e.key === 'Enter' && tag === 'INPUT') {
        e.currentTarget.blur()
      }
      if (e.key === 'Enter' && tag === 'TEXTAREA' && (e.metaKey || e.ctrlKey)) {
        e.currentTarget.blur()
      }
      if (e.key === 'Escape') {
        e.currentTarget.value = value
        e.currentTarget.blur()
        e.stopPropagation()
      }
    }

    function setCustomLabelValues(values: string[]) {
      handleCustomFieldSave(fieldDef, normalizeLabelValues(values))
    }

    function toggleCustomLabel(option: string) {
      const nextValues = multiSelectValues.includes(option)
        ? multiSelectValues.filter(valueItem => valueItem !== option)
        : [...multiSelectValues, option]
      setCustomLabelValues(nextValues)
      setEditingCustomField(fieldDef.key)
    }

    function renderCustomLabelChip(option: string, selected = true) {
      return (
        <button
          key={option}
          type="button"
          onClick={() => editing && toggleCustomLabel(option)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            maxWidth: '100%',
            padding: '5px 9px',
            borderRadius: 999,
            border: selected
              ? '1px solid color-mix(in srgb, var(--color-brand) 55%, var(--edge) 45%)'
              : '1px dashed var(--edge)',
            background: selected
              ? 'color-mix(in srgb, var(--color-brand) 11%, var(--surface-panel) 89%)'
              : 'color-mix(in srgb, var(--surface-panel) 86%, var(--tint) 14%)',
            color: selected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            fontSize: 12,
            fontWeight: selected ? 600 : 500,
            lineHeight: 1.3,
            cursor: editing ? 'pointer' : 'default',
            fontFamily: 'inherit',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{option}</span>
          {editing && selected && <span aria-hidden="true" style={{ fontSize: 12 }}>x</span>}
        </button>
      )
    }

    return (
      <div
        key={fieldDef.key}
        style={{
          display: 'grid',
          gridTemplateColumns: '132px minmax(0, 1fr)',
          gap: 14,
          alignItems: multi || editing ? 'start' : 'center',
          padding: '13px 18px',
          borderBottom: '1px solid var(--divider)',
        }}
      >
        <div style={rowLabelWrap}>
          <div style={rowLabel}>{fieldDef.label}</div>
          {hasSaveError && (
            <button
              type="button"
              onClick={handleRetrySave}
              style={{
                fontSize: 11,
                fontWeight: 400,
                color: '#D93025',
                letterSpacing: '0.01em',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Could not save. Try again.
            </button>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          {fieldDef.type === 'checkbox' ? (
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
              minHeight: 28,
            }}>
              <input
                type="checkbox"
                checked={rawValue === true}
                onChange={event => handleCustomFieldSave(fieldDef, event.target.checked)}
              />
              {rawValue === true ? 'Yes' : 'No'}
            </label>
          ) : editing ? (
            fieldDef.type === 'select' ? (
              brandedSelect({
                value,
                placeholder: `add ${fieldDef.label.toLowerCase()}`,
                options: selectOptions,
                targetId: `custom:${fieldDef.key}`,
                onSelect: nextValue => handleCustomFieldSave(fieldDef, nextValue),
                onAdd: nextValue => handleCustomFieldSave(fieldDef, nextValue),
              })
            ) :
            fieldDef.type === 'multi_select' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {multiSelectOptions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {multiSelectOptions.map(option => renderCustomLabelChip(option, multiSelectValues.includes(option)))}
                  </div>
                )}
                <input
                  type="text"
                  placeholder={`Add ${fieldDef.label.toLowerCase()} separated by commas`}
                  onBlur={event => {
                    if (!event.target.value.trim()) return
                    setCustomLabelValues([...multiSelectValues, ...splitLabelInput(event.target.value)])
                    setEditingCustomField(fieldDef.key)
                    event.target.value = ''
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      if (event.currentTarget.value.trim()) {
                        setCustomLabelValues([...multiSelectValues, ...splitLabelInput(event.currentTarget.value)])
                        setEditingCustomField(fieldDef.key)
                        event.currentTarget.value = ''
                      }
                    }
                    if (event.key === 'Escape') {
                      setEditingCustomField(null)
                      event.stopPropagation()
                    }
                  }}
                  style={inputStyle}
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => beginAddingOption(multiSelectTargetId)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 999,
                      border: '1px dashed var(--edge-strong)',
                      background: 'color-mix(in srgb, var(--surface-panel) 86%, var(--tint) 14%)',
                      color: 'var(--color-text-secondary)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Add label
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCustomField(null)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 999,
                      border: '1px solid var(--edge)',
                      background: 'transparent',
                      color: 'var(--color-text-secondary)',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Done
                  </button>
                </div>
                {renderAddOptionControl(multiSelectTargetId, option => {
                  setCustomLabelValues([...multiSelectValues, option])
                  setEditingCustomField(fieldDef.key)
                }, 'New label')}
              </div>
            ) :
            multi ? (
              <textarea
                autoFocus
                defaultValue={value}
                onBlur={event => handleCustomFieldSave(fieldDef, event.target.value)}
                onKeyDown={onKeyDown}
                rows={fieldDef.type === 'multi_select' ? 2 : 4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            ) : (
              <input
                autoFocus
                type={fieldDef.type === 'url' ? 'url' : 'text'}
                defaultValue={value}
                onBlur={event => handleCustomFieldSave(fieldDef, event.target.value)}
                onKeyDown={onKeyDown}
                style={inputStyle}
              />
            )
          ) : fieldDef.type === 'multi_select' && multiSelectValues.length > 0 ? (
            <div
              onClick={() => setEditingCustomField(fieldDef.key)}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                minHeight: 22,
                cursor: 'text',
              }}
            >
              {multiSelectValues.map(option => renderCustomLabelChip(option))}
            </div>
          ) : (
            <div
              onClick={() => setEditingCustomField(fieldDef.key)}
              style={{
                fontSize: 14,
                color: value ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                cursor: 'text',
                minHeight: 22,
                whiteSpace: multi ? 'pre-wrap' : 'nowrap',
                overflow: 'hidden',
                textOverflow: multi ? undefined : 'ellipsis',
                lineHeight: multi ? 1.6 : 1.45,
                padding: multi ? '2px 0' : '0',
              }}
            >
              {value || `add ${fieldDef.label.toLowerCase()}`}
            </div>
          )}
        </div>
      </div>
    )
  }

  function customFieldSection(section: LpTrackerFieldDefinition['section'], showEmptyFields = true) {
    const customFields = getDraftCustomFields()
    const fields = LP_TRACKER_FIELDS
      .filter(fieldDef => fieldDef.section === section)
      .filter(fieldDef => showEmptyFields || hasLpTrackerValue(customFields[fieldDef.key]))
    if (fields.length === 0) return null
    return (
      <div style={sectionShell}>
        <div style={sectionHeader}>
          <div style={sectionLabel}>{section.toLowerCase()}</div>
        </div>
        {fields.map(fieldDef => customField(fieldDef))}
        {section === 'Fund Details' && arrayField('spv_investor', 'SPV Investor', contactFieldOptions('spv_investor'))}
      </div>
    )
  }

  async function persistPodAssignment(nextListIds: string[], nextPrimaryId: string | null, nextCategoryIds = draft.category_ids ?? []) {
    if (isNew || !contact) return
    const previousListIds = contact.list_ids
    const previousPrimaryId = contact.primary_list_id
    const previousCategoryIds = contact.category_ids
    const updated = await updateContact(contact.id, {
      list_ids: nextListIds,
      primary_list_id: nextPrimaryId,
      category_ids: nextCategoryIds,
    } as Partial<Contact>)
    onSaved(updated)

    const changedPods =
      previousPrimaryId !== nextPrimaryId ||
      previousListIds.length !== nextListIds.length ||
      previousListIds.some(id => !nextListIds.includes(id)) ||
      previousCategoryIds.length !== nextCategoryIds.length ||
      previousCategoryIds.some(id => !nextCategoryIds.includes(id))

    if (changedPods) {
      await logSystemEvent({
        contactId: contact.id,
        type: 'pod_change',
        detail: {
          previousPods: previousListIds,
          nextPods: nextListIds,
          previousPrimaryPod: previousPrimaryId,
          nextPrimaryPod: nextPrimaryId,
          previousSubPods: previousCategoryIds,
          nextSubPods: nextCategoryIds,
        },
        notes: 'Updated pod ownership and context.',
      })
    }
  }

  function handleSelectSubPod(subPod: Category) {
    const update = planMoveToSubPod(
      {
        list_ids: draft.list_ids ?? [],
        primary_list_id: draft.primary_list_id ?? null,
        category_ids: draft.category_ids ?? [],
      },
      subPod,
      availableCategories,
    )
    setDraft(prev => ({ ...prev, ...update }))
    if (!isNew && contact) {
      persistPodAssignment(update.list_ids, update.primary_list_id, update.category_ids)
    }
  }

  function handleClearSubPod(podId: string) {
    const update = planClearSubPodForPod(
      {
        list_ids: draft.list_ids ?? [],
        primary_list_id: draft.primary_list_id ?? null,
        category_ids: draft.category_ids ?? [],
      },
      podId,
      availableCategories,
    )
    setDraft(prev => ({ ...prev, ...update }))
    if (!isNew && contact) {
      persistPodAssignment(update.list_ids, update.primary_list_id, update.category_ids)
    }
  }

  async function handleCreate() {
    if (!draft.name) return
    setCreating(true)
    setCreateError(false)
    try {
      const categoryIds = uniqueIds(draft.category_ids ?? (categoryId ? [categoryId] : []))
      const listIds = uniqueIds([
        ...(draft.list_ids ?? []),
        ...parentPodIdsForCategories(categoryIds, availableCategories),
      ])
      const created = await createContact({
        name: draft.name,
        email: draft.email ?? null,
        phone: draft.phone ?? null,
        company: draft.company ?? null,
        role: draft.role ?? null,
        location: draft.location ?? null,
        website: draft.website ?? null,
        notes: draft.notes ?? null,
        recommended_by: draft.recommended_by ?? null,
        specialization: draft.specialization ?? null,
        past_clients: draft.past_clients ?? null,
        birthday: draft.birthday ?? null,
        milestones: draft.milestones ?? null,
        interests: draft.interests ?? null,
        relationship_context: draft.relationship_context ?? null,
        last_contacted_at: null,
        list_ids: listIds,
        category_ids: categoryIds,
        primary_list_id: draft.primary_list_id ?? listIds[0] ?? null, cadence_override: null,
        ring_ids: draft.ring_ids ?? [],
        first_name: null, last_name: null, linkedin: draft.linkedin ?? null,
        country: draft.country ?? null, global_region: null, gender: draft.gender ?? null,
        introduced_by: null, intel_notes: null, relationship_owner: null,
        contact_frequency: null, next_follow_up_date: null, next_action: null,
        kv_fund_investor: null, spv_investor: draft.spv_investor ?? null, needs_review: false,
        type: 'Contact', status: 'Pending',
        company_record_id: null, company_ids: [], industry: null, stage: null,
        ticker: null, domain: null, email_2: null, email_3: null,
        communication_preferences: null, custom_fields: draft.custom_fields ?? {},
      })
      onSaved(created)
      onClose()
    } catch {
      setCreateError(true)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete() {
    if (!contact?.id) return
    setDeleting(true)
    try {
      await deleteContact(contact.id)
      onDeleted?.()
      onClose()
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const hue = avatarHue(draft.name ?? '')
  const nameInitials = initials(draft.name ?? '')

  const smallInputStyle: React.CSSProperties = {
    fontSize: 14,
    lineHeight: 1.4,
    color: 'var(--color-text-secondary)',
    background: 'var(--tint)',
    border: '1px solid var(--edge-strong)',
    borderRadius: 6,
    padding: '6px 8px',
    outline: 'none',
    fontFamily: 'inherit',
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: 13,
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    color: 'color-mix(in srgb, var(--color-text-secondary) 90%, var(--color-brand) 10%)',
    marginBottom: 0,
    letterSpacing: '0.01em',
    lineHeight: 1.2,
  }

  const sectionShell: React.CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--divider) 82%, transparent)',
    borderRadius: 14,
    background: 'color-mix(in srgb, var(--surface-panel) 94%, var(--color-bg) 6%)',
    boxShadow: '0 10px 22px rgba(0,0,0,0.04)',
    overflow: 'hidden',
  }

  const sectionHeader: React.CSSProperties = {
    padding: '13px 18px 12px',
    borderBottom: '1px solid var(--divider)',
    background: 'color-mix(in srgb, var(--surface-panel) 82%, transparent)',
  }

  const rowLabelWrap: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    minWidth: 0,
  }

  const rowLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--color-text-tertiary)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    lineHeight: 1.2,
  }

  function linkedinField() {
    const val = (draft.linkedin as string | null) ?? null
    const editing = editingField === 'linkedin'
    const hasSaveError = saveError?.field === 'linkedin'
    const isEnriched = enrichedFields.has('linkedin')

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '132px minmax(0, 1fr)',
        gap: 14,
        alignItems: 'center',
        padding: '12px 18px',
        borderBottom: '1px solid var(--divider)',
      }}>
        <div style={rowLabelWrap}>
          <div style={rowLabel}>
            LinkedIn
          </div>
          {isEnriched && (
            <span
              title="AI-enriched"
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#6366F1',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
          )}
          {hasSaveError && (
            <button
              type="button"
              onClick={handleRetrySave}
              style={{
                fontSize: 10, fontWeight: 400,
                color: '#D93025',
                letterSpacing: '0.01em',
                background: 'none', border: 'none',
                cursor: 'pointer', padding: 0,
              }}
            >
              Could not save. Try again.
            </button>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          {editing ? (
            <input
              autoFocus
              type="url"
              defaultValue={val ?? ''}
              placeholder="https://linkedin.com/in/..."
              onBlur={e => handleBlur('linkedin', e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') { e.currentTarget.value = val ?? ''; e.currentTarget.blur(); e.stopPropagation() }
              }}
              style={{
                width: '100%',
                background: 'var(--tint)',
                border: '1px solid var(--edge-strong)',
                borderRadius: 6,
                color: 'var(--color-text-primary)',
                fontSize: 14,
                lineHeight: 1.45,
                padding: '7px 10px',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          ) : val && val.startsWith('http') ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 20 }}>
              <a
                href={val}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 14, color: '#1565C0', textDecoration: 'none', lineHeight: 1.45 }}
              >
                {val.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '') || val}
              </a>
              <span
                onClick={() => setEditingField('linkedin')}
                style={{ fontSize: 11, color: 'var(--color-text-tertiary)', cursor: 'pointer', letterSpacing: '0.01em' }}
              >
                edit
              </span>
            </div>
          ) : (
            <div
              onClick={() => setEditingField('linkedin')}
              style={{
                fontSize: 14,
                color: val ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                cursor: 'text',
                minHeight: 20,
                lineHeight: 1.45,
              }}
            >
              {val ?? 'add linkedin'}
            </div>
          )}
          {suggestedUpdates['linkedin'] && (
            <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(99,102,241,0.06)', borderRadius: 8, fontSize: 13 }}>
              <div style={{ color: 'var(--color-text-secondary)', marginBottom: 2 }}>
                Suggested: <strong>{suggestedUpdates['linkedin'].suggested}</strong>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  disabled={acceptingField === 'linkedin'}
                  onClick={async () => {
                    setAcceptingField('linkedin')
                    const original = { linkedin: suggestedUpdates['linkedin'].current }
                    const updated = await applyEnrichment(contact!.id, { linkedin: suggestedUpdates['linkedin'].suggested }, original)
                    onSaved(updated)
                    setEnrichedFields(prev => new Set([...prev, 'linkedin' as keyof Contact]))
                    setSuggestedUpdates(prev => { const next = { ...prev }; delete next['linkedin']; return next })
                    setAcceptingField(null)
                  }}
                  style={{ fontSize: 12, color: '#6366F1', cursor: 'pointer', background: 'none', border: 'none', padding: 0, opacity: acceptingField === 'linkedin' ? 0.5 : 1 }}
                >
                  {acceptingField === 'linkedin' ? 'Accepting...' : 'Accept'}
                </button>
                <button
                  type="button"
                  onClick={() => setSuggestedUpdates(prev => { const next = { ...prev }; delete next['linkedin']; return next })}
                  style={{ fontSize: 12, color: 'var(--color-text-secondary)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                >
                  Keep current
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const bounds = shellBounds ?? {
    left: 0,
    top: 0,
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }
  const shellInset = bounds.width < 768 ? 10 : 24
  const lightboxWidth = Math.min(1120, Math.max(320, bounds.width - shellInset * 2))
  const lightboxHeight = Math.max(320, bounds.height - shellInset * 2)
  const sidebarWidth = lightboxWidth >= 1080 ? 340 : lightboxWidth >= 960 ? 316 : 292
  const stackedLayout = lightboxWidth < 900

  const modal = (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          left: bounds.left,
          top: bounds.top,
          width: bounds.width,
          height: bounds.height,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 199,
        }}
      />

      {/* Centered modal */}
      <div
        className="modal-enter contact-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? 'Create contact' : `Contact details for ${draft.name ?? 'contact'}`}
        style={{
          position: 'fixed',
          top: bounds.top + bounds.height / 2,
          left: bounds.left + bounds.width / 2,
          transform: 'translate(-50%, -50%)',
          width: lightboxWidth,
          maxHeight: lightboxHeight,
          display: 'flex',
          flexDirection: 'column',
          background: 'color-mix(in srgb, var(--color-surface) 96%, var(--color-bg) 4%)',
          borderRadius: 22,
          border: '1px solid var(--divider)',
          boxShadow: '0 32px 120px rgba(0,0,0,0.32), 0 4px 16px rgba(0,0,0,0.16)',
          zIndex: 200,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          position: 'relative',
          padding: '26px 28px 22px',
          borderBottom: '1px solid var(--divider)',
          background: 'color-mix(in srgb, var(--surface-panel) 74%, transparent)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            {!isNew ? (
              confirmDelete ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    style={{
                      fontSize: 11, fontWeight: 500,
                      color: deleting ? 'var(--color-text-tertiary)' : 'rgba(180,40,40,0.85)',
                      background: 'none', border: 'none',
                      cursor: deleting ? 'default' : 'pointer',
                      padding: 0, letterSpacing: '0.01em',
                    }}
                  >
                    {deleting ? 'Removing...' : 'Remove this person?'}
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>·</span>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    style={{
                      fontSize: 11, color: 'var(--text-muted)',
                      background: 'none', border: 'none',
                      cursor: 'pointer', padding: 0,
                    }}
                  >
                    cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="action-ghost"
                  onClick={() => setConfirmDelete(true)}
                  style={{ fontSize: 11, padding: 0, letterSpacing: '0.01em' }}
                >
                  Delete
                </button>
              )
            ) : <div />}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {!isNew && contact && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <button
                    type="button"
                    disabled={!hasPendingContactChanges || savingContactInfo}
                    onClick={handleSaveContactInfo}
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '6px 13px',
                      background: hasPendingContactChanges ? 'var(--color-brand)' : 'var(--tint)',
                      border: hasPendingContactChanges ? '1px solid var(--color-brand)' : '1px solid var(--edge)',
                      borderRadius: 8,
                      color: hasPendingContactChanges ? '#fff' : 'var(--color-text-tertiary)',
                      cursor: hasPendingContactChanges && !savingContactInfo ? 'pointer' : 'default',
                      fontFamily: 'inherit',
                      opacity: savingContactInfo ? 0.72 : 1,
                      boxShadow: hasPendingContactChanges ? '0 8px 18px rgba(0,0,0,0.12)' : 'none',
                    }}
                  >
                    {savingContactInfo ? 'Saving...' : 'Save'}
                  </button>
                  {contactSaveError && (
                    <div style={{ fontSize: 10, color: '#D93025' }}>{contactSaveError}</div>
                  )}
                </div>
              )}
              {/* Enrich button -- only for existing contacts */}
              {!isNew && contact && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <button
                    type="button"
                    disabled={enriching || !isEnrichmentAllowed(contact, pods)}
                    title={!isEnrichmentAllowed(contact, pods) ? 'Turn on enrichment for at least one pod to use this.' : 'Fill in missing details for this contact.'}
                    onClick={async () => {
                      setEnriching(true)
                      setEnrichError(null)
                      const result = await callEnrichFunction(contact)
                      if (!result.ok || !result.data) {
                        setEnrichError(result.error ?? 'Enrichment failed')
                        setEnriching(false)
                        return
                      }
                      const { autoFill, suggestedUpdates: suggestions } = computeFieldDiffs(contact, result.data)

                      if (Object.keys(autoFill).length > 0) {
                        const originalValues: Record<string, string | null> = {}
                        for (const key of Object.keys(autoFill)) {
                          originalValues[key] = (contact as unknown as Record<string, unknown>)[key] as string | null ?? null
                        }
                        const updated = await applyEnrichment(contact.id, autoFill, originalValues)
                        onSaved(updated)
                        setEnrichedFields(prev => new Set([...prev, ...Object.keys(autoFill) as (keyof Contact)[]]))
                      }

                      setSuggestedUpdates(suggestions)
                      setEnriching(false)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      fontSize: 11, fontWeight: 500,
                      padding: '4px 10px',
                      background: isEnrichmentAllowed(contact, pods) ? 'rgba(99,102,241,0.08)' : 'var(--tint)',
                      border: '1px solid ' + (isEnrichmentAllowed(contact, pods) ? 'rgba(99,102,241,0.2)' : 'var(--edge)'),
                      borderRadius: 6,
                      color: isEnrichmentAllowed(contact, pods) ? '#6366F1' : 'var(--color-text-tertiary)',
                      cursor: (enriching || !isEnrichmentAllowed(contact, pods)) ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                      opacity: enriching ? 0.6 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    {enriching ? (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                          <path d="M21 12a9 9 0 11-6.219-8.56"/>
                        </svg>
                        Enriching...
                      </>
                    ) : (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3l1.9 5.8L19 10.5l-5.1 3.7 1.9 5.8L12 16.5l-4.8 3.5 1.9-5.8L4 10.5l5.1-1.7z"/>
                        </svg>
                        Fill details
                      </>
                    )}
                  </button>
                  {enrichError && (
                    <div style={{ fontSize: 10, color: '#D93025' }}>{enrichError}</div>
                  )}
                </div>
              )}
              <CloseButton onClick={onClose} aria-label="Close contact" />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, position: 'relative' }}>
            {/* Avatar */}
            <div style={{
              width: 64, height: 64,
              borderRadius: '50%',
              background: `radial-gradient(circle at 30% 28%, hsla(${hue}, 72%, 92%, 0.96), hsla(${hue}, 28%, 78%, 0.92) 56%, hsla(${hue}, 22%, 70%, 0.88))`,
              border: `1px solid hsla(${hue}, 24%, 58%, 0.32)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, fontWeight: 700,
              color: `hsla(${hue}, 46%, 28%, 0.9)`,
              flexShrink: 0,
              letterSpacing: '0.03em',
              boxShadow: `0 10px 22px hsla(${hue}, 24%, 32%, 0.12)`,
            }}>
              {nameInitials || '?'}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {editingField === 'name' ? (
                <input
                  autoFocus
                  type="text"
                  defaultValue={draft.name ?? ''}
                  placeholder="Name"
                  onBlur={e => handleBlur('name', e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                    if (e.key === 'Escape') { e.currentTarget.value = draft.name ?? ''; e.currentTarget.blur(); e.stopPropagation() }
                  }}
                  style={{
                    width: '100%',
                    fontSize: 36, fontWeight: 700,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.02,
                    background: 'var(--tint)',
                    border: '1px solid var(--edge-strong)',
                    borderRadius: 10,
                    color: 'var(--color-text-primary)',
                    padding: '6px 12px',
                    outline: 'none',
                    fontFamily: 'var(--font-sans)',
                  }}
                />
              ) : (
                <div
                  onClick={() => setEditingField('name')}
                  style={{
                    fontSize: 36, fontWeight: 700,
                    fontFamily: 'var(--font-sans)',
                    lineHeight: 1.02,
                    letterSpacing: '-0.04em',
                    color: draft.name ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                    cursor: 'text',
                    padding: '0 0 6px',
                  }}
                >
                  {draft.name || 'Name'}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                {editingField === 'company' ? (
                  <input
                    autoFocus
                    defaultValue={draft.company ?? ''}
                    placeholder="Company"
                    onBlur={e => handleBlur('company', e.target.value)}
                    style={{ ...smallInputStyle, minWidth: 220 }}
                  />
                ) : (
                  <span
                    onClick={() => setEditingField('company')}
                    style={{ fontSize: 14, color: draft.company ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)', cursor: 'text', lineHeight: 1.45 }}
                  >
                    {draft.company ?? 'Company or org'}
                  </span>
                )}
              </div>

              {!isNew && contactCampaignLinks.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  {contactCampaignLinks.map(link => {
                    const campaign = campaigns.find(c => c.id === link.campaign_id)
                    if (!campaign || campaign.status !== 'active') return null
                    const stage = (campaignStagesMap[link.campaign_id] ?? []).find(s => s.id === link.stage_id)

                    return (
                      <button
                        key={link.id}
                        type="button"
                        onClick={() => window.location.assign(`/campaigns/${campaign.id}`)}
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: 'var(--color-text-primary)',
                          background: 'color-mix(in srgb, var(--surface-panel) 88%, var(--tint) 12%)',
                          border: '1px solid var(--edge)',
                          borderRadius: 999,
                          padding: '4px 10px',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: stage?.color ?? 'var(--color-brand)',
                          flexShrink: 0,
                        }} />
                        {campaign.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Equity score in header for existing contacts only */}
            {!isNew && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexShrink: 0,
                padding: '14px 16px',
                borderRadius: 18,
                border: '1px solid var(--edge)',
                background: 'color-mix(in srgb, var(--surface-panel) 92%, transparent)',
                boxShadow: '0 10px 24px rgba(0,0,0,0.06)',
              }}>
                <SegmentedEquityRing breakdown={equityBreakdown} score={equityScore} size={64} />
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.05em', lineHeight: 0.95, fontVariantNumeric: 'tabular-nums' }}>
                    {equityScore}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', letterSpacing: '0.06em', marginTop: 5, textTransform: 'uppercase' }}>
                    {scoreLabel(equityScore)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Two-column body */}
        <div
          className="contact-lightbox-body"
          style={{
            flex: 1,
            minHeight: 0,
            gridTemplateColumns: stackedLayout ? 'minmax(0, 1fr)' : `minmax(0, 1fr) ${sidebarWidth}px`,
          }}
        >
          <div className="contact-lightbox-main" style={{ overflowY: 'auto', padding: '24px 28px 28px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={sectionShell}>
                <div style={sectionHeader}>
                  <div style={sectionLabel}>contact information</div>
                </div>
                {field('name', 'Name')}
                {field('company', 'Company', { inputType: 'text', alwaysInput: true })}
              </div>

              <div style={sectionShell}>
                <div style={sectionHeader}>
                  <div style={sectionLabel}>ways to reach them</div>
                </div>
                {field('email', 'Email', { inputType: 'email' })}
                {field('phone', 'Phone', { inputType: 'tel' })}
                {linkedinField()}
                {field('website', 'Website', { inputType: 'url' })}
                {field('country', 'Country', { options: contactFieldOptions('country') })}
                {field('gender', 'Gender', { options: contactFieldOptions('gender', ['Male', 'Female', 'Non-binary', 'Other']) })}
              </div>

              {customFieldSection('Investor Profile')}
              {customFieldSection('Fund Details')}
              {customFieldSection('Operations')}
              {customFieldSection('Notes')}

              {pods.length > 0 && (
                <div style={sectionShell}>
                  <div style={sectionHeader}>
                    <div style={sectionLabel}>pods</div>
                  </div>
                  <div style={{ padding: '16px 18px' }}>
                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pods</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {pods.map(pod => {
                        const isIn = (draft.list_ids ?? []).includes(pod.id)
                        const isPrimary = draft.primary_list_id === pod.id
                        return (
                          <button
                            key={pod.id}
                            type="button"
                            onClick={() => {
                              const currentIds = draft.list_ids ?? []
                              const currentCategoryIds = draft.category_ids ?? []
                              let nextIds: string[]
                              let nextPrimary = draft.primary_list_id
                              let nextCategoryIds = currentCategoryIds
                              if (isIn) {
                                nextIds = currentIds.filter(id => id !== pod.id)
                                nextCategoryIds = currentCategoryIds.filter(categoryId => {
                                  const category = availableCategories.find(item => item.id === categoryId)
                                  return category?.list_id !== pod.id
                                })
                                if (nextPrimary === pod.id) nextPrimary = nextIds[0] ?? null
                              } else {
                                nextIds = [...currentIds, pod.id]
                                if (!nextPrimary) nextPrimary = pod.id
                              }
                              setDraft(prev => ({ ...prev, list_ids: nextIds, primary_list_id: nextPrimary, category_ids: nextCategoryIds }))
                              if (!isNew && contact) {
                                persistPodAssignment(nextIds, nextPrimary, nextCategoryIds)
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: isIn ? 600 : 400,
                              border: '1px solid',
                              borderColor: isIn ? (pod.color ?? 'var(--edge-strong)') : 'var(--edge)',
                              background: isIn ? `color-mix(in srgb, ${pod.color ?? 'var(--edge)'} 14%, var(--surface-panel) 86%)` : 'color-mix(in srgb, var(--surface-panel) 72%, transparent)',
                              color: isIn ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              transition: 'all 0.12s',
                            }}
                          >
                            {pod.name}{isPrimary ? ' *' : ''}
                          </button>
                        )
                      })}
                    </div>
                    <SubPodSelector
                      pods={pods}
                      categories={availableCategories}
                      selectedPodIds={draft.list_ids ?? []}
                      selectedCategoryIds={draft.category_ids ?? []}
                      onSelect={handleSelectSubPod}
                      onClear={handleClearSubPod}
                    />
                  </div>
                </div>
              )}

              {!isNew && contact && (contactCampaignLinks.length > 0 || campaigns.length > 0) && (
                <div style={sectionShell}>
                  <div style={sectionHeader}>
                    <div style={sectionLabel}>campaigns</div>
                  </div>
                  <div style={{ padding: '16px 18px' }}>
                    {contactCampaignLinks.length > 0 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: 'rgba(37,180,57,0.07)',
                        border: '1px solid rgba(37,180,57,0.14)',
                        marginBottom: 10,
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Total commitment amount
                        </span>
                        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                          {formatMoney(totalCommitmentAmount)}
                        </span>
                      </div>
                    )}
                    {contactCampaignLinks.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                        {[...contactCampaignLinks]
                          .sort((a, b) => {
                            const campaignA = campaigns.find(c => c.id === a.campaign_id)
                            const campaignB = campaigns.find(c => c.id === b.campaign_id)
                            const activeA = campaignA?.status === 'active' ? 1 : 0
                            const activeB = campaignB?.status === 'active' ? 1 : 0
                            return activeB - activeA
                          })
                          .map(link => {
                            const camp = campaigns.find(c => c.id === link.campaign_id)
                            const stages = campaignStagesMap[link.campaign_id] ?? []
                            const stage = stages.find(s => s.id === link.stage_id)
                            const name = camp?.name ?? 'Campaign'
                            const isActive = camp?.status === 'active'
                            const campaignStatus = getCampaignContactCampaignStatus(link)

                            return (
                              <div key={link.id} style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '7px 10px', borderRadius: 10,
                                background: isActive
                                  ? 'color-mix(in srgb, var(--surface-panel) 90%, hsla(260, 44%, 62%, 0.10))'
                                  : 'color-mix(in srgb, var(--surface-panel) 92%, var(--tint) 8%)',
                                border: isActive
                                  ? '1px solid color-mix(in srgb, hsla(260, 40%, 55%, 0.22) 45%, var(--edge) 55%)'
                                  : '1px solid var(--edge)',
                                opacity: isActive ? 1 : 0.72,
                                boxShadow: 'none',
                              }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isActive ? 'hsla(260, 50%, 50%, 0.6)' : 'var(--color-text-tertiary)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                                  <line x1="4" y1="22" x2="4" y2="15"/>
                                </svg>
                                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', flex: 1, minWidth: 0, lineHeight: 1.4 }}>
                                  {name}
                                </span>
                                {stage && (
                                  <span style={{
                                    fontSize: 11, fontWeight: 500,
                                    padding: '2px 7px', borderRadius: 100,
                                    background: stage.color ? `${stage.color}18` : 'var(--tint)',
                                    color: stage.color ?? 'var(--color-text-secondary)',
                                    whiteSpace: 'nowrap',
                                  }}>
                                    {stage.name}
                                  </span>
                                )}
                                {campaignStatus && (
                                  <span style={{
                                    fontSize: 11, fontWeight: 600,
                                    padding: '2px 7px', borderRadius: 100,
                                    background: 'rgba(66,153,225,0.08)',
                                    color: 'var(--color-text-secondary)',
                                    whiteSpace: 'nowrap',
                                  }}>
                                    {campaignStatus}
                                  </span>
                                )}
                                <CampaignCommitmentInput
                                  value={getCampaignContactCommitmentAmount(link)}
                                  onSave={(amount) => handleCommitmentAmountSave(link, amount)}
                                  compact
                                  placeholder="$0"
                                />
                                {camp && (
                                  <span style={{ fontSize: 11, color: isActive ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                                    {isActive ? camp.type : 'completed'}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    )}
                    {addedCampaignId ? (
                      <div style={{ fontSize: 12, color: 'var(--color-brand)', padding: '4px 0' }}>
                        Added to {campaigns.find(c => c.id === addedCampaignId)?.name ?? 'campaign'}
                      </div>
                    ) : campaigns.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowCampaignPicker(v => !v)}
                          style={{
                            background: 'color-mix(in srgb, var(--surface-panel) 90%, transparent)', border: '1px solid var(--edge)', cursor: 'pointer',
                            fontSize: 13, color: 'var(--color-text-primary)',
                            padding: '7px 12px', fontFamily: 'inherit', borderRadius: 999,
                            fontWeight: 500,
                          }}
                        >
                          Add to a campaign
                        </button>
                        {showCampaignPicker && (
                          <div style={{
                            marginTop: 6,
                            background: 'var(--surface-panel)',
                            border: '1px solid var(--edge)',
                            borderRadius: 8,
                            overflow: 'hidden',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          }}>
                            {campaigns.filter(c => c.status === 'active' && !contactCampaignLinks.some(l => l.campaign_id === c.id)).map(campaign => (
                              <button
                                key={campaign.id}
                                type="button"
                                onClick={() => handleAddToCampaign(campaign.id)}
                                disabled={addingToCampaign}
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  width: '100%', padding: '10px 14px',
                                  background: 'none', border: 'none',
                                  borderBottom: '1px solid var(--divider)',
                                  cursor: addingToCampaign ? 'default' : 'pointer',
                                  textAlign: 'left', fontFamily: 'inherit',
                                  opacity: addingToCampaign ? 0.5 : 1,
                                }}
                              >
                                <span style={{ fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
                                  {campaign.name}
                                </span>
                                <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                                  {campaign.type}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              <div style={sectionShell}>
                <div style={sectionHeader}>
                  <div style={sectionLabel}>relationship</div>
                </div>
                {field('recommended_by', 'Referred by')}
              </div>

            </div>
          </div>

          <div
            className="contact-lightbox-sidebar"
            style={{
              width: stackedLayout ? 'auto' : sidebarWidth,
              flexShrink: 0,
              overflowY: 'auto',
              borderLeft: stackedLayout ? 'none' : '1px solid var(--divider)',
              borderTop: stackedLayout ? '1px solid var(--divider)' : 'none',
              background: 'color-mix(in srgb, var(--surface-panel) 88%, var(--color-bg) 12%)',
              padding: stackedLayout ? '20px 20px 24px' : '22px 20px 26px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {!isNew && contact ? (
                <div style={sectionShell}>
                  <div style={sectionHeader}>
                    <div style={sectionLabel}>recent activity</div>
                  </div>
                  <div style={{ padding: '0 16px 16px' }}>
                    <InteractionSection
                      contact={contact}
                      onContactUpdated={onSaved}
                      embedded
                    />
                  </div>
                </div>
              ) : (
                <div style={sectionShell}>
                  <div style={sectionHeader}>
                    <div style={sectionLabel}>recent activity</div>
                  </div>
                  <div style={{ padding: '18px', color: 'var(--color-text-tertiary)', fontSize: 14, lineHeight: 1.55 }}>
                    Save this person first, then you can log touchpoints.
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Next Follow-Up bar pinned at bottom */}
        {!isNew && contact && (
          <div style={{
            padding: '14px 28px 15px',
            borderTop: '1px solid var(--divider)',
            background: 'color-mix(in srgb, var(--surface-panel) 88%, transparent)',
          }}>
            {editingField === 'next_follow_up_date' ? (
              /* Edit mode */
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                  Next touchpoint
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    type="date"
                    value={editFollowUpDate}
                    onChange={e => setEditFollowUpDate(e.target.value)}
                    style={{
                      background: 'var(--tint)',
                      border: '1px solid var(--edge-strong)',
                      borderRadius: 8,
                      color: 'var(--color-text-primary)',
                      fontSize: 14,
                      lineHeight: 1.4,
                      padding: '7px 10px',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                  <input
                    type="text"
                    value={editFollowUpAction}
                    onChange={e => setEditFollowUpAction(e.target.value)}
                    placeholder="What should happen next?"
                    style={{
                      flex: 1,
                      minWidth: 120,
                      background: 'var(--tint)',
                      border: '1px solid var(--edge-strong)',
                      borderRadius: 8,
                      color: 'var(--color-text-primary)',
                      fontSize: 14,
                      lineHeight: 1.4,
                      padding: '7px 10px',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const updated = await updateContact(contact.id, {
                        next_follow_up_date: editFollowUpDate || null,
                        next_action: editFollowUpAction || null,
                      })
                      onSaved(updated)
                      setEditingField(null)
                    }}
                    style={{
                      padding: '6px 12px',
                      background: 'var(--color-brand)',
                      border: 'none',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingField(null)}
                    style={{
                      padding: '6px 10px',
                      background: 'none',
                      border: '1px solid var(--edge)',
                      borderRadius: 8,
                      color: 'var(--color-text-secondary)',
                      fontSize: 13,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : contact.next_follow_up_date ? (
              /* Read mode: follow-up exists */
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setEditFollowUpDate(contact.next_follow_up_date ?? '')
                    setEditFollowUpAction(contact.next_action ?? '')
                    setEditingField('next_follow_up_date')
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                    Next touchpoint
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.35 }}>
                    {contact.next_action ?? 'Reach out'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      fontSize: 12, fontWeight: 600, color: 'var(--color-brand)',
                      background: 'rgba(37,180,57,0.08)',
                      padding: '6px 11px', borderRadius: 999,
                      cursor: 'pointer',
                      letterSpacing: '0.01em',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                    onClick={() => {
                      setEditFollowUpDate(contact.next_follow_up_date ?? '')
                      setEditFollowUpAction(contact.next_action ?? '')
                      setEditingField('next_follow_up_date')
                    }}
                  >
                    {new Date(contact.next_follow_up_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <button
                    type="button"
                    title="Mark touchpoint complete"
                    disabled={completingFollowUp}
                    onClick={async () => {
                      setCompletingFollowUp(true)
                      try {
                        await logSystemEvent({
                          contactId: contact.id,
                          type: 'field_update',
                          detail: {
                            source: 'follow_up_completed',
                            action: contact.next_action,
                            date: contact.next_follow_up_date,
                          },
                          notes: `Touchpoint completed: ${contact.next_action ?? 'Reach out'}`,
                        })
                        const updated = await updateContact(contact.id, {
                          next_follow_up_date: null,
                          next_action: null,
                        })
                        onSaved(updated)
                      } finally {
                        setCompletingFollowUp(false)
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: completingFollowUp ? 'default' : 'pointer',
                      padding: 4,
                      borderRadius: 8,
                      color: 'var(--color-text-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      opacity: completingFollowUp ? 0.5 : 1,
                    }}
                    onMouseEnter={e => { if (!completingFollowUp) (e.currentTarget as HTMLElement).style.color = '#22c55e' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="9 12 11 14 15 10"/>
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              /* Empty state: no follow-up set */
              <button
                type="button"
                onClick={() => {
                  setEditFollowUpDate('')
                  setEditFollowUpAction('')
                  setEditingField('next_follow_up_date')
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: 'var(--color-text-tertiary)',
                  fontSize: 14,
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Plan next touchpoint
              </button>
            )}
          </div>
        )}

        {/* Create footer */}
        {isNew && (
          <div style={{
            padding: '14px 32px',
            borderTop: '1px solid var(--divider)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 6,
          }}>
            {createError && (
              <p style={{ fontSize: 12, color: '#D93025', margin: 0 }}>Could not add this person. Try again.</p>
            )}
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !draft.name}
              style={{
                padding: '8px 20px',
                background: draft.name ? 'var(--edge)' : 'var(--tint)',
                border: '1px solid var(--edge-strong)',
                borderRadius: 7,
                color: draft.name ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                fontSize: 14, fontWeight: 500,
                cursor: draft.name ? 'pointer' : 'default',
                transition: 'all 0.15s',
                letterSpacing: '0.01em',
                fontFamily: 'inherit',
              }}
            >
              {creating ? 'Adding...' : 'Add to network'}
            </button>
          </div>
        )}
      </div>
    </>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
