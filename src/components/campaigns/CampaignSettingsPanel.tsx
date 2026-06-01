import { useState, useEffect, useCallback } from 'react'
import { Settings, X, Calendar, Type, FileText, DollarSign } from 'lucide-react'
import type { Campaign, CampaignType } from '../../lib/types'
import { updateCampaign, invalidateCampaignsCache } from '../../lib/data'
import { CAMPAIGN_FUNDRAISING_GOAL_FIELD, formatMoneyInput, getCampaignFundraisingGoal, parseMoneyInput, withMoneyField } from '../../lib/campaignCommitments'
import { TYPE_LABELS, TYPE_COLORS } from './campaignUtils'
import { CampaignTypeIcon } from './CampaignTypeIcon'
import { useEscape } from '../../lib/escapeStack'

const ALL_TYPES: CampaignType[] = ['event', 'outreach', 'deal_flow', 'fundraise', 'talent', 'partnerships', 'investment', 'other']

interface Props {
  campaign: Campaign
  onUpdate: (updated: Campaign) => void
  onClose: () => void
}

export function CampaignSettingsPanel({ campaign, onUpdate, onClose }: Props) {
  const [name, setName] = useState(campaign.name)
  const [type, setType] = useState(campaign.type)
  const [deadline, setDeadline] = useState(campaign.deadline ?? '')
  const [fundraisingGoal, setFundraisingGoal] = useState(formatMoneyInput(getCampaignFundraisingGoal(campaign)))
  const [goalError, setGoalError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const handleClose = useCallback(() => onClose(), [onClose])
  useEscape(handleClose)

  useEffect(() => {
    setName(campaign.name)
    setType(campaign.type)
    setDeadline(campaign.deadline ?? '')
    setFundraisingGoal(formatMoneyInput(getCampaignFundraisingGoal(campaign)))
    setGoalError(false)
    setDirty(false)
  }, [campaign.id])

  function markDirty() { setDirty(true) }

  async function handleSave() {
    const parsedGoal = parseMoneyInput(fundraisingGoal)
    if (Number.isNaN(parsedGoal)) {
      setGoalError(true)
      return
    }
    setGoalError(false)
    setSaving(true)
    try {
      const updated = await updateCampaign(campaign.id, {
        name, type,
        deadline: deadline || null,
        custom_fields: withMoneyField(campaign.custom_fields, CAMPAIGN_FUNDRAISING_GOAL_FIELD, parsedGoal),
      })
      invalidateCampaignsCache()
      onUpdate({ ...campaign, ...updated })
      setDirty(false)
    } catch {
      // stay dirty so user can retry
    } finally {
      setSaving(false)
    }
  }

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
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Campaign Settings
          </span>
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
          <div style={fieldLabel}><Type size={11} /> Name</div>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); markDirty() }}
            placeholder="Campaign name"
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--edge-strong)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--edge)' }}
          />
        </div>

        {/* Type */}
        <div>
          <div style={fieldLabel}><FileText size={11} /> Type</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {ALL_TYPES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); markDirty() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 6,
                  border: '1px solid',
                  borderColor: type === t ? TYPE_COLORS[t] : 'transparent',
                  background: type === t ? `${TYPE_COLORS[t]}12` : 'transparent',
                  color: type === t ? TYPE_COLORS[t] : 'var(--color-text-tertiary)',
                  fontSize: 11, fontWeight: type === t ? 600 : 400,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
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
          <div style={fieldLabel}><Calendar size={11} /> Deadline</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="date"
              value={deadline}
              onChange={e => { setDeadline(e.target.value); markDirty() }}
              style={{
                ...inputStyle, flex: 1,
                color: deadline ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                fontSize: 12,
              }}
            />
            {deadline && (
              <button
                type="button"
                onClick={() => { setDeadline(''); markDirty() }}
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

        {/* Fundraising goal */}
        <div>
          <div style={fieldLabel}><DollarSign size={11} /> Fundraising Goal</div>
          <input
            type="text"
            value={fundraisingGoal}
            onChange={e => { setFundraisingGoal(e.target.value); setGoalError(false); markDirty() }}
            placeholder="$50M"
            style={{
              ...inputStyle,
              borderColor: goalError ? 'var(--health-fading)' : 'var(--edge)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = goalError ? 'var(--health-fading)' : 'var(--edge-strong)' }}
            onBlur={e => { e.currentTarget.style.borderColor = goalError ? 'var(--health-fading)' : 'var(--edge)' }}
          />
          {goalError && (
            <div style={{ marginTop: 5, fontSize: 11, color: 'var(--health-fading)' }}>
              Enter a valid amount, like $50M or 100000.
            </div>
          )}
        </div>

      </div>

      {/* Footer: meta + save */}
      <div style={{
        marginTop: 16, paddingTop: 12,
        borderTop: '1px solid var(--edge)',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          Created {new Date(campaign.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          Status: <span style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>{campaign.status}</span>
        </span>
        <div style={{ flex: 1 }} />
        {dirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              fontSize: 13, fontWeight: 600, padding: '7px 20px',
              borderRadius: 8, border: 'none',
              background: 'var(--color-brand)', color: '#ffffff',
              cursor: saving ? 'default' : 'pointer',
              fontFamily: 'inherit', opacity: saving ? 0.7 : 1,
              transition: 'opacity 120ms',
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>
    </div>
  )
}
