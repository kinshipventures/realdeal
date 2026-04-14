import { useRef, useState, useEffect } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { Check, Trash2 } from 'lucide-react'
import type { CampaignContact, CampaignStage, Contact, HexColor, Interaction } from '../../lib/types'
import { contactEquityScore, scoreLabel } from '../../lib/equity'
import { CampaignContactCard } from './CampaignContactCard'
import { Avatar } from '../ui'

const COLOR_SWATCHES = ['#718096', '#4299E1', '#ECC94B', '#48BB78', '#E53935', '#FF6B8A', '#7E57C2', '#F5A623', '#38B2AC', '#667EEA', '#84CC16', '#F59E0B', '#06B6D4', '#A1887F', '#64748B', '#FB7185']

// Convert hex to rgba for tinting
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

interface Props {
  stage: CampaignStage
  campaignContacts: CampaignContact[]
  contacts: Contact[]
  interactionsMap: Map<string, Interaction[]>
  onStageUpdate: (id: string, data: Partial<Pick<CampaignStage, 'name' | 'color'>>) => void
  onDeleteStage: (id: string) => void
  onAddContact: (contactId: string, stageId: string) => void
  onCardClick: (cc: CampaignContact) => void
  onTogglePriority: (ccId: string) => void
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAllInStage: (stageId: string) => void
  isFirst: boolean
  isLast: boolean
  visibleCardFields?: Set<string>
}

export function CampaignStageColumn({
  stage,
  campaignContacts,
  contacts,
  interactionsMap,
  onStageUpdate,
  onDeleteStage,
  onAddContact,
  onCardClick,
  onTogglePriority,
  selectedIds,
  onToggleSelect,
  onSelectAllInStage,
  isFirst,
  isLast,
  visibleCardFields,
}: Props) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [draft, setDraft] = useState(stage.name)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const colorPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showColorPicker) return
    function handleClickOutside(e: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showColorPicker])

  const contactIdsInCampaign = new Set(campaignContacts.map(cc => cc.contact_id))
  const stageColor = stage.color ?? '#999999'

  function handleNameClick() {
    setDraft(stage.name)
    setIsRenaming(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleNameBlur() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== stage.name) {
      onStageUpdate(stage.id, { name: trimmed })
    } else {
      setDraft(stage.name)
    }
    setIsRenaming(false)
  }

  function handleNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') inputRef.current?.blur()
    if (e.key === 'Escape') { setDraft(stage.name); setIsRenaming(false) }
  }

  function handleColorSelect(hex: string) {
    onStageUpdate(stage.id, { color: hex as HexColor })
    setShowColorPicker(false)
  }

  const stageContacts = campaignContacts.filter(cc => cc.stage_id === stage.id)
  const enriched = stageContacts.map(cc => {
    const contact = contacts.find(c => c.id === cc.contact_id)
    const ix = interactionsMap.get(cc.contact_id) ?? []
    const score = contactEquityScore(ix)
    return { cc, contact, score, label: scoreLabel(score) }
  }).filter(r => r.contact).sort((a, b) => {
    if (a.cc.is_priority !== b.cc.is_priority) return a.cc.is_priority ? -1 : 1
    return 0
  }) as Array<{ cc: CampaignContact; contact: Contact; score: number; label: ReturnType<typeof scoreLabel> }>

  const searchResults = searchQuery.length > 1
    ? contacts
        .filter(c => !contactIdsInCampaign.has(c.id) && c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 6)
    : []

  const canDelete = stageContacts.length === 0

  const stageIds = stageContacts.map(cc => cc.id)
  const allSelected = stageIds.length > 0 && stageIds.every(id => selectedIds.has(id))
  const someSelected = stageIds.some(id => selectedIds.has(id))

  let emptyText = 'Drag contacts here'
  if (isFirst) emptyText = 'Add people to kick things off'
  else if (isLast) emptyText = 'The finish line'
  else emptyText = 'People will land here as they progress'

  return (
    <div
      style={{
        minWidth: 260,
        width: 260,
        background: isOver ? hexToRgba(stageColor, 0.1) : hexToRgba(stageColor, 0.05),
        borderRadius: 12,
        border: `1px solid ${isOver ? hexToRgba(stageColor, 0.3) : 'var(--edge)'}`,
        borderTop: `3px solid ${stageColor}`,
        display: 'flex',
        flexDirection: 'column',
        transition: 'background 150ms, border-color 150ms',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 14px 8px', display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
        {stageContacts.length > 0 && (
          <button
            onClick={() => onSelectAllInStage(stage.id)}
            aria-label={allSelected ? 'Deselect all in stage' : 'Select all in stage'}
            style={{
              width: 14, height: 14, borderRadius: 3, flexShrink: 0,
              border: allSelected || someSelected ? 'none' : '1.5px solid var(--edge-strong)',
              background: allSelected ? 'var(--color-brand)' : someSelected ? 'rgba(37,180,57,0.3)' : 'transparent',
              cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 120ms, border-color 120ms',
            }}
          >
            {(allSelected || someSelected) && (
              <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                <path d="M2 5L4 7L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        )}

        <button
          onClick={() => setShowColorPicker(prev => !prev)}
          aria-label="Change stage color"
          style={{
            width: 10, height: 10, borderRadius: '50%',
            background: stageColor, border: '2px solid rgba(255,255,255,0.6)',
            cursor: 'pointer', padding: 0, flexShrink: 0,
            boxShadow: `0 0 0 1px ${hexToRgba(stageColor, 0.3)}`,
          }}
        />

        {showColorPicker && (
          <div ref={colorPickerRef} style={{
            position: 'absolute', top: 40, left: 8,
            background: 'var(--surface-panel)', border: '1px solid var(--edge)',
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
            padding: 10, display: 'flex', flexWrap: 'wrap', gap: 6,
            width: 152, zIndex: 50,
          }}>
            {COLOR_SWATCHES.map(hex => (
              <button
                key={hex}
                onClick={() => handleColorSelect(hex)}
                style={{
                  width: 24, height: 24, borderRadius: 6, background: hex,
                  border: hex === stageColor ? '2px solid var(--color-text-tertiary)' : '2px solid transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                }}
              >
                {hex === stageColor && <Check size={12} color="#fff" />}
              </button>
            ))}
          </div>
        )}

        {isRenaming ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            style={{
              fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-serif)',
              letterSpacing: '-0.02em', color: 'var(--color-text-primary)',
              border: 'none', outline: '1px solid var(--color-brand)', borderRadius: 4,
              padding: '2px 4px', background: 'transparent', width: '100%',
            }}
          />
        ) : (
          <span
            onClick={handleNameClick}
            style={{
              fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-serif)',
              letterSpacing: '-0.02em', color: 'var(--color-text-primary)',
              cursor: 'text', flex: 1,
            }}
          >
            {stage.name}
          </span>
        )}

        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
          {stageContacts.length}
        </span>

        {canDelete && (
          <button
            onClick={() => onDeleteStage(stage.id)}
            aria-label="Delete stage"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: 2, color: 'var(--color-text-tertiary)', flexShrink: 0,
              borderRadius: 4, display: 'flex', alignItems: 'center',
              transition: 'color 150ms',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#E53935'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-tertiary)'}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        style={{
          padding: '0 10px 10px',
          display: 'flex', flexDirection: 'column', gap: 8,
          minHeight: 60, flex: 1,
        }}
      >
        <SortableContext items={stageContacts.map(cc => cc.id)} strategy={verticalListSortingStrategy}>
          {enriched.length === 0 ? (
            <div style={{ padding: '12px 6px', textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0, fontStyle: 'italic' }}>
                {emptyText}
              </p>
            </div>
          ) : (
            enriched.map(({ cc, contact, score, label }) => (
              <CampaignContactCard
                key={cc.id}
                cc={cc}
                contact={contact}
                equityScore={score}
                equityLabel={label}
                onClick={() => onCardClick(cc)}
                onTogglePriority={onTogglePriority}
                selected={selectedIds.has(cc.id)}
                onToggleSelect={onToggleSelect}
                visibleFields={visibleCardFields}
              />
            ))
          )}
        </SortableContext>
      </div>

      {/* Add contact */}
      <div style={{ padding: '0 10px 12px' }}>
        {showSearch ? (
          <div>
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setSearchQuery(''); setShowSearch(false) } }}
              placeholder="Search contacts..."
              style={{
                width: '100%', fontSize: 12, padding: '6px 10px',
                borderRadius: 8, border: '1px solid var(--edge)',
                background: 'var(--tint)', color: 'var(--color-text-primary)',
                outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
            {searchResults.length > 0 && (
              <div style={{
                marginTop: 4, background: 'var(--surface-panel)',
                border: '1px solid var(--edge)', borderRadius: 8,
                overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}>
                {searchResults.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { onAddContact(c.id, stage.id); setSearchQuery(''); setShowSearch(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '8px 10px',
                      background: 'none', border: 'none',
                      borderBottom: '1px solid var(--divider)',
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    }}
                  >
                    <Avatar name={c.name} size={22} variant="subtle" />
                    <span style={{ fontSize: 12, color: 'var(--color-text-primary)', flex: 1 }}>{c.name}</span>
                    {c.company && (
                      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{c.company}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            style={{
              fontSize: 12, color: 'var(--color-brand)',
              background: 'transparent', border: 'none',
              cursor: 'pointer', padding: '4px 6px',
            }}
          >
            + Add contact
          </button>
        )}
      </div>
    </div>
  )
}
