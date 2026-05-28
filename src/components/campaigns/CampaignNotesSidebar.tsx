import { useState, useRef, useEffect } from 'react'
import type { Campaign, Contact, CampaignStage } from '../../lib/types'
import { updateCampaign, invalidateCampaignsCache } from '../../lib/data'
import { CampaignActivityFeed } from './CampaignActivityFeed'

interface Props {
  campaign: Campaign
  contacts: Contact[]
  stages: CampaignStage[]
  hasCampaignContacts: boolean
  onCampaignUpdate: (updated: Campaign) => void
}

export function CampaignNotesSidebar({ campaign, contacts, stages, hasCampaignContacts, onCampaignUpdate }: Props) {
  const [notes, setNotes] = useState(campaign.notes ?? '')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setNotes(campaign.notes ?? '')
    setDirty(false)
  }, [campaign.id, campaign.notes])

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await updateCampaign(campaign.id, { notes: notes || null })
      invalidateCampaignsCache()
      onCampaignUpdate({ ...campaign, ...updated })
      setDirty(false)
    } catch {} finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && dirty) {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <div style={{
      width: 300, flexShrink: 0,
      display: 'flex', flexDirection: 'column', gap: 16,
      alignSelf: 'flex-start',
      position: 'sticky', top: 28,
    }}>
      {/* Notes */}
      <div style={{
        background: 'var(--surface-panel)',
        border: '1px solid var(--edge)',
        borderRadius: 12,
        padding: 16,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase' as const, color: 'var(--color-text-tertiary)',
          marginBottom: 10,
        }}>
          Notes
        </div>
        <textarea
          ref={textareaRef}
          value={notes}
          onChange={e => { setNotes(e.target.value); setDirty(true) }}
          onKeyDown={handleKeyDown}
          placeholder="Add notes, context, links..."
          rows={6}
          style={{
            width: '100%', fontSize: 13, lineHeight: 1.5,
            padding: '8px 10px', borderRadius: 8,
            border: '1px solid var(--edge)', background: 'var(--tint)',
            color: 'var(--color-text-primary)', outline: 'none',
            fontFamily: 'inherit', resize: 'vertical',
            minHeight: 80, boxSizing: 'border-box',
            transition: 'border-color 150ms',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--edge-strong)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--edge)' }}
        />
        {dirty && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
              {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter
            </span>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                fontSize: 12, fontWeight: 600, padding: '5px 14px',
                borderRadius: 7, border: 'none',
                background: 'var(--color-brand)', color: '#ffffff',
                cursor: saving ? 'default' : 'pointer',
                fontFamily: 'inherit', opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Activity feed */}
      {hasCampaignContacts && (
        <CampaignActivityFeed
          campaignId={campaign.id}
          campaignName={campaign.name}
          contacts={contacts}
          stages={stages}
        />
      )}
    </div>
  )
}
