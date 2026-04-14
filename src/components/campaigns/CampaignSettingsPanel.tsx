import { useState, useRef, useEffect, useCallback } from 'react'
import { Settings, X, Trash2, Calendar, Type, FileText, AlignLeft } from 'lucide-react'
import type { Campaign, CampaignType } from '../../lib/types'
import { updateCampaign, invalidateCampaignsCache } from '../../lib/airtable'
import { TYPE_LABELS } from './campaignUtils'
import { CampaignTypeIcon } from './CampaignTypeIcon'
import { useEscape } from '../../lib/escapeStack'

const ALL_TYPES: CampaignType[] = ['event', 'investment', 'outreach', 'deal_flow', 'fundraise', 'talent', 'partnerships', 'other']

interface Props {
  campaign: Campaign
  onUpdate: (updated: Campaign) => void
  onClose: () => void
}

export function CampaignSettingsPanel({ campaign, onUpdate, onClose }: Props) {
  const [name, setName] = useState(campaign.name)
  const [type, setType] = useState(campaign.type)
  const [deadline, setDeadline] = useState(campaign.deadline ?? '')
  const [description, setDescription] = useState(campaign.description ?? '')
  const [notes, setNotes] = useState(campaign.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  const handleClose = useCallback(() => onClose(), [onClose])
  useEscape(handleClose)

  // Sync when campaign changes
  useEffect(() => {
    setName(campaign.name)
    setType(campaign.type)
    setDeadline(campaign.deadline ?? '')
    setDescription(campaign.description ?? '')
    setNotes(campaign.notes ?? '')
    setDirty(false)
  }, [campaign.id])

  // Debounced auto-save
  const scheduleUpdate = useCallback((fields: Partial<Pick<Campaign, 'name' | 'type' | 'deadline' | 'description' | 'notes'>>) => {
    setDirty(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        const updated = await updateCampaign(campaign.id, fields)
        invalidateCampaignsCache()
        onUpdate({ ...campaign, ...updated })
        setDirty(false)
      } catch {
        // silent fail, field stays dirty
      } finally {
        setSaving(false)
      }
    }, 800)
  }, [campaign, onUpdate])

  // Cleanup timer
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  const handleNameChange = (v: string) => { setName(v); scheduleUpdate({ name: v }) }
  const handleTypeChange = (v: CampaignType) => { setType(v); scheduleUpdate({ type: v }) }
  const handleDeadlineChange = (v: string) => { setDeadline(v); scheduleUpdate({ deadline: v || null }) }
  const handleDescriptionChange = (v: string) => { setDescription(v); scheduleUpdate({ description: v || null }) }
  const handleNotesChange = (v: string) => { setNotes(v); scheduleUpdate({ notes: v || null }) }
  const handleClearDeadline = () => { setDeadline(''); scheduleUpdate({ deadline: null }) }

  const fieldLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)',
    marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5,
    textTransform: 'uppercase', letterSpacing: '0.04em',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--tint)',
    border: '1px solid var(--edge)', borderRadius: 8,
    color: 'var(--color-text-primary)', fontSize: 13,
    padding: '8px 12px', outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  }

  const textareaStyle: React.CSSProperties = {
    ...inputStyle, resize: 'vertical', minHeight: 64,
    lineHeight: 1.5,
  }

  return (
    <div style={{
      background: 'var(--surface-panel)',
      backdropFilter: 'var(--panel-blur)',
      WebkitBackdropFilter: 'var(--panel-blur)',
      border: 'var(--surface-panel-border)',
      borderRadius: 'var(--panel-radius)',
      padding: '20px',
      marginBottom: 16,
      animation: 'content-enter 0.2s ease-out',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings size={14} style={{ color: 'var(--color-text-tertiary)' }} />
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}>
            Campaign Settings
          </span>
          {saving && (
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
              saving...
            </span>
          )}
          {!saving && dirty && (
            <span style={{ fontSize: 11, color: '#FF9500' }}>unsaved</span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 4, display: 'flex', alignItems: 'center',
            color: 'var(--color-text-tertiary)',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Fields grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
        {/* Name - full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={fieldLabel}>
            <Type size={11} />
            Name
          </div>
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={e => handleNameChange(e.target.value)}
            placeholder="Campaign name"
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--edge-strong)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--edge)' }}
          />
        </div>

        {/* Type */}
        <div>
          <div style={fieldLabel}>
            <FileText size={11} />
            Type
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {ALL_TYPES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 6,
                  border: '1px solid',
                  borderColor: type === t ? 'var(--edge-strong)' : 'transparent',
                  background: type === t ? 'var(--tint)' : 'transparent',
                  color: type === t ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                  fontSize: 11, fontWeight: type === t ? 500 : 400,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.12s',
                }}
              >
                <CampaignTypeIcon type={t} size={10} colored={type === t} />
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Deadline */}
        <div>
          <div style={fieldLabel}>
            <Calendar size={11} />
            Deadline
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="date"
              value={deadline}
              onChange={e => handleDeadlineChange(e.target.value)}
              style={{
                ...inputStyle, flex: 1,
                color: deadline ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                fontSize: 12,
              }}
            />
            {deadline && (
              <button
                type="button"
                onClick={handleClearDeadline}
                title="Clear deadline"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 4, display: 'flex', color: 'var(--color-text-tertiary)',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Description - full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={fieldLabel}>
            <AlignLeft size={11} />
            Description
          </div>
          <textarea
            value={description}
            onChange={e => handleDescriptionChange(e.target.value)}
            placeholder="What is this campaign about?"
            style={textareaStyle}
            rows={2}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--edge-strong)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--edge)' }}
          />
        </div>

        {/* Notes - full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={fieldLabel}>
            <FileText size={11} />
            Notes
          </div>
          <textarea
            value={notes}
            onChange={e => handleNotesChange(e.target.value)}
            placeholder="Internal notes, links, context..."
            style={textareaStyle}
            rows={3}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--edge-strong)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--edge)' }}
          />
        </div>
      </div>

      {/* Meta info */}
      <div style={{
        marginTop: 16, paddingTop: 12,
        borderTop: '1px solid var(--edge)',
        display: 'flex', gap: 16, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          Created {new Date(campaign.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          Status: <span style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>{campaign.status}</span>
        </span>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          {campaign.contact_ids.length} {campaign.contact_ids.length === 1 ? 'contact' : 'contacts'}
        </span>
      </div>
    </div>
  )
}
