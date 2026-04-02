import { useRef, useState } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { Check } from 'lucide-react'
import type { Contact, Opportunity, OpportunityPriority, PipelineStage } from '../../lib/types'
import { OpportunityCard } from './OpportunityCard'

// 8 preset swatches from POD_SHIFT_COLORS keys + a few more
const COLOR_SWATCHES = ['#718096', '#4299E1', '#ECC94B', '#48BB78', '#E53935', '#FF6B8A', '#7E57C2', '#F5A623']

interface Props {
  stage: PipelineStage
  opportunities: Opportunity[]
  contacts: Contact[]
  onStageUpdate: (id: string, data: Partial<Pick<PipelineStage, 'name' | 'color'>>) => void
  onCardClick: (opp: Opportunity) => void
  onCreateOpportunity: (name: string, stageId: string, contactIds: string[]) => void
  onPriorityChange: (id: string, priority: OpportunityPriority) => void
  onArchive: (id: string) => void
  onInlineNote?: (id: string, note: string) => void
}

export function PipelineStageColumn({
  stage,
  opportunities,
  contacts,
  onStageUpdate,
  onCardClick,
  onCreateOpportunity,
  onPriorityChange,
  onArchive,
  onInlineNote,
}: Props) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [draft, setDraft] = useState(stage.name)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newOppName, setNewOppName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const addInputRef = useRef<HTMLInputElement>(null)

  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

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
    if (e.key === 'Escape') {
      setDraft(stage.name)
      setIsRenaming(false)
    }
  }

  function handleColorSelect(hex: string) {
    onStageUpdate(stage.id, { color: hex as import('../../lib/types').HexColor })
    setShowColorPicker(false)
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newOppName.trim()
    if (!trimmed) return
    onCreateOpportunity(trimmed, stage.id, [])
    setNewOppName('')
    setShowAddForm(false)
  }

  function handleAddKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setNewOppName('')
      setShowAddForm(false)
    }
  }

  const stageColor = stage.color ?? '#999999'

  return (
    <div
      style={{
        minWidth: 280,
        background: isOver ? 'rgba(37,180,57,0.04)' : 'var(--surface-panel)',
        borderRadius: 12,
        border: `1px solid ${isOver ? 'rgba(37,180,57,0.25)' : 'var(--edge)'}`,
        display: 'flex',
        flexDirection: 'column',
        transition: 'background 150ms, border-color 150ms',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
        {/* Color swatch / accent stripe */}
        <button
          onClick={() => setShowColorPicker(prev => !prev)}
          aria-label="Change stage color"
          style={{
            width: 3,
            height: 24,
            borderRadius: 2,
            background: stageColor,
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
          }}
        />

        {/* Color picker popover */}
        {showColorPicker && (
          <div
            style={{
              position: 'absolute',
              top: 44,
              left: 8,
              background: 'var(--surface-panel)',
              border: '1px solid var(--edge)',
              borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
              padding: 10,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              width: 152,
              zIndex: 50,
            }}
          >
            {COLOR_SWATCHES.map(hex => (
              <button
                key={hex}
                onClick={() => handleColorSelect(hex)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: hex,
                  border: hex === stageColor ? '2px solid var(--color-text-tertiary)' : '2px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                {hex === stageColor && <Check size={12} color="#fff" />}
              </button>
            ))}
          </div>
        )}

        {/* Stage name */}
        {isRenaming ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            aria-label="Rename stage"
            style={{
              fontSize: 16,
              fontWeight: 600,
              fontFamily: 'var(--font-serif)',
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
              border: 'none',
              outline: '1px solid var(--color-brand)',
              borderRadius: 4,
              padding: '2px 4px',
              background: 'transparent',
              width: '100%',
            }}
          />
        ) : (
          <span
            onClick={handleNameClick}
            style={{
              fontSize: 16,
              fontWeight: 600,
              fontFamily: 'var(--font-serif)',
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
              cursor: 'text',
              flex: 1,
            }}
          >
            {stage.name}
          </span>
        )}

        {/* Opportunity count */}
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
          {opportunities.length}
        </span>
      </div>

      {/* Cards body */}
      <div
        ref={setNodeRef}
        style={{
          padding: '0 8px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          minHeight: 80,
          flex: 1,
        }}
      >
        <SortableContext items={opportunities.map(o => o.id)} strategy={verticalListSortingStrategy}>
          {opportunities.length === 0 ? (
            <div style={{ padding: '16px 8px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>
                No opportunities in this stage
              </p>
              <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: '4px 0 0' }}>
                Drag a card here or add one below.
              </p>
            </div>
          ) : (
            opportunities.map(opp => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                contacts={contacts}
                onPriorityChange={onPriorityChange}
                onArchive={onArchive}
                onInlineNote={onInlineNote}
                onClick={() => onCardClick(opp)}
              />
            ))
          )}
        </SortableContext>
      </div>

      {/* Footer — add opportunity */}
      <div style={{ padding: '0 8px 12px' }}>
        {showAddForm ? (
          <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              ref={addInputRef}
              autoFocus
              type="text"
              value={newOppName}
              onChange={e => setNewOppName(e.target.value)}
              onKeyDown={handleAddKeyDown}
              placeholder="Opportunity name"
              style={{
                fontSize: 13,
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid var(--edge)',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="submit"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'var(--color-brand)',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setNewOppName(''); setShowAddForm(false) }}
                style={{
                  fontSize: 12,
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--edge)',
                  background: 'transparent',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              fontSize: 13,
              color: 'var(--color-brand)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            + Add opportunity
          </button>
        )}
      </div>
    </div>
  )
}
