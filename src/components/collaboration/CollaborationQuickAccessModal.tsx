import { useEffect, useMemo, useState } from 'react'
import { KeyRound, X } from 'lucide-react'
import {
  createCollaborationAccessGrant,
  type CollaborationFieldScope,
  type CollaborationPermissionLevel,
  type CollaborationResourceType,
  type CollaborationSubjectType,
} from '@/lib/collaboration'
import type { WorkspaceMember } from '@/lib/supabase-data'

export type CollaborationResourceOption = {
  id: string | null
  label: string
  type: CollaborationResourceType
  description?: string
}

type PermissionPreset = {
  id: string
  label: string
  description: string
  permission: CollaborationPermissionLevel
  scopes: CollaborationFieldScope[]
}

const SUBJECT_TYPES: Array<{ value: CollaborationSubjectType; label: string }> = [
  { value: 'user', label: 'User' },
  { value: 'team', label: 'Team' },
  { value: 'organization', label: 'Organization' },
  { value: 'public_link', label: 'Public link' },
]

const PERMISSION_LEVELS: Array<{ value: CollaborationPermissionLevel; label: string }> = [
  { value: 'view', label: 'View' },
  { value: 'comment', label: 'Comment' },
  { value: 'suggest', label: 'Suggest' },
  { value: 'edit', label: 'Edit' },
  { value: 'approve', label: 'Approve' },
  { value: 'admin', label: 'Admin' },
]

const FIELD_SCOPES: Array<{ value: CollaborationFieldScope; label: string; detail: string }> = [
  { value: 'public_profile', label: 'Public profile', detail: 'Name, company, role, city, LinkedIn, pod or list.' },
  { value: 'private_contact', label: 'Private contact', detail: 'Email, phone, address, and contact channels.' },
  { value: 'relationship_private', label: 'Relationship private', detail: 'Private notes, activity, context, and communication history.' },
  { value: 'investment_private', label: 'Investment private', detail: 'Investment details, commitments, LP/SPV context, and financial fields.' },
  { value: 'campaign_private', label: 'Campaign private', detail: 'Campaign notes, outreach status, comments, and campaign-only updates.' },
]

const PRESETS: PermissionPreset[] = [
  {
    id: 'external_reviewer',
    label: 'External reviewer',
    description: 'Basic view for approved lists or campaign review.',
    permission: 'view',
    scopes: ['public_profile'],
  },
  {
    id: 'outreach_lead',
    label: 'Outreach lead',
    description: 'Can work campaign contacts with approved contact channels.',
    permission: 'comment',
    scopes: ['public_profile', 'private_contact', 'campaign_private'],
  },
  {
    id: 'campaign_manager',
    label: 'Campaign manager',
    description: 'Can manage campaign-specific updates and approval context.',
    permission: 'edit',
    scopes: ['public_profile', 'private_contact', 'campaign_private'],
  },
  {
    id: 'full_collaborator',
    label: 'Full collaborator',
    description: 'Internal collaborator with relationship context, excluding investments by default.',
    permission: 'edit',
    scopes: ['public_profile', 'private_contact', 'relationship_private', 'campaign_private'],
  },
]

const EXPIRATION_OPTIONS: Array<{ label: string; days: number | null }> = [
  { label: 'No expiration', days: null },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

export function CollaborationQuickAccessModal({
  workspaceId,
  members,
  resources,
  title = 'Share access',
  detail = 'Choose who can access the selected records and which field groups are visible.',
  onClose,
  onCreated,
}: {
  workspaceId: string
  members: WorkspaceMember[]
  resources: CollaborationResourceOption[]
  title?: string
  detail?: string
  onClose: () => void
  onCreated: (createdCount: number) => void
}) {
  const [subjectType, setSubjectType] = useState<CollaborationSubjectType>(members.length > 0 ? 'user' : 'team')
  const [subjectId, setSubjectId] = useState(members[0]?.user_id ?? '')
  const [subjectLabel, setSubjectLabel] = useState(members[0]?.display_name || members[0]?.email || '')
  const [permission, setPermission] = useState<CollaborationPermissionLevel>('view')
  const [fieldScopes, setFieldScopes] = useState<CollaborationFieldScope[]>(['public_profile'])
  const [expirationDays, setExpirationDays] = useState<number | null>(30)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const resourcePreview = useMemo(() => resources.slice(0, 5), [resources])

  useEffect(() => {
    if (subjectType !== 'user') {
      setSubjectId('')
      if (!subjectLabel.trim()) {
        setSubjectLabel(subjectType === 'public_link' ? 'Public reviewer link' : '')
      }
      return
    }
    const member = members.find(item => item.user_id === subjectId) ?? members[0]
    if (member) {
      setSubjectId(member.user_id)
      setSubjectLabel(member.display_name || member.email || 'User')
    }
  }, [members, subjectId, subjectLabel, subjectType])

  function applyPreset(preset: PermissionPreset) {
    setPermission(preset.permission)
    setFieldScopes(preset.scopes)
  }

  function toggleScope(scope: CollaborationFieldScope) {
    setFieldScopes(current => {
      if (scope === 'public_profile') return current.includes(scope) ? current : [...current, scope]
      return current.includes(scope) ? current.filter(item => item !== scope) : [...current, scope]
    })
  }

  async function handleSubmit() {
    const label = subjectLabel.trim()
    if (!label || fieldScopes.length === 0 || resources.length === 0 || saving) return
    setSaving(true)
    setError('')
    try {
      const expires_at = expirationDays
        ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString()
        : null
      for (const resource of resources) {
        await createCollaborationAccessGrant({
          workspace_id: workspaceId,
          subject_type: subjectType,
          subject_id: subjectType === 'user' ? subjectId : null,
          subject_label: label,
          resource_type: resource.type,
          resource_id: resource.id,
          resource_label: resource.label,
          permission_level: permission,
          field_scopes: fieldScopes,
          expires_at,
        })
      }
      onCreated(resources.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create access')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(15,23,42,0.36)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          width: 'min(760px, 100%)',
          maxHeight: 'min(820px, calc(100vh - 40px))',
          overflowY: 'auto',
          borderRadius: 14,
          border: '1px solid var(--edge)',
          background: 'var(--color-surface)',
          boxShadow: '0 24px 70px rgba(15,23,42,0.22)',
          padding: 20,
        }}
        onClick={event => event.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: 'rgba(0,61,165,0.08)',
                color: 'var(--color-brand)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <KeyRound size={16} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 850, margin: 0, color: 'var(--color-text-primary)' }}>{title}</h3>
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--color-text-tertiary)' }}>{detail}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" title="Close" style={iconButtonStyle}>
            <X size={15} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <section style={panelStyle}>
            <div style={sectionTitleStyle}>Permission preset</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  style={{
                    textAlign: 'left',
                    border: permission === preset.permission && preset.scopes.every(scope => fieldScopes.includes(scope))
                      ? '1px solid var(--color-brand)'
                      : '1px solid var(--edge)',
                    borderRadius: 8,
                    background: 'var(--surface-panel)',
                    padding: 10,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 3 }}>{preset.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>{preset.description}</div>
                </button>
              ))}
            </div>
          </section>

          <section style={panelStyle}>
            <div style={sectionTitleStyle}>Selected resources</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {resourcePreview.map(resource => (
                <div key={`${resource.type}-${resource.id ?? resource.label}`} style={{ border: '1px solid var(--edge)', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 750, color: 'var(--color-text-primary)' }}>{resource.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 3 }}>
                    {titleCase(resource.type)}{resource.description ? ` - ${resource.description}` : ''}
                  </div>
                </div>
              ))}
              {resources.length > resourcePreview.length && (
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  +{resources.length - resourcePreview.length} more selected
                </div>
              )}
            </div>
          </section>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: 14 }}>
          <SelectField label="Share with" value={subjectType} onChange={value => setSubjectType(value as CollaborationSubjectType)}>
            {SUBJECT_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
          </SelectField>

          {subjectType === 'user' ? (
            <SelectField label="User" value={subjectId} onChange={setSubjectId}>
              {members.length === 0 && <option value="">No users found</option>}
              {members.map(member => (
                <option key={member.id} value={member.user_id}>{member.display_name || member.email || 'User'}</option>
              ))}
            </SelectField>
          ) : (
            <TextField
              label="Label"
              value={subjectLabel}
              onChange={setSubjectLabel}
              placeholder={subjectType === 'public_link' ? 'Public reviewer link' : 'Team or organization name'}
            />
          )}

          <SelectField label="Permission level" value={permission} onChange={value => setPermission(value as CollaborationPermissionLevel)}>
            {PERMISSION_LEVELS.map(level => <option key={level.value} value={level.value}>{level.label}</option>)}
          </SelectField>

          <SelectField label="Expiration" value={String(expirationDays ?? '')} onChange={value => setExpirationDays(value ? Number(value) : null)}>
            {EXPIRATION_OPTIONS.map(option => (
              <option key={option.label} value={option.days ?? ''}>{option.label}</option>
            ))}
          </SelectField>
        </div>

        <section style={{ ...panelStyle, marginTop: 14 }}>
          <div style={sectionTitleStyle}>Visible fields</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {FIELD_SCOPES.map(scope => (
              <label key={scope.value} style={checkboxCardStyle(fieldScopes.includes(scope.value), scope.value === 'public_profile')}>
                <input
                  type="checkbox"
                  checked={fieldScopes.includes(scope.value)}
                  disabled={scope.value === 'public_profile'}
                  onChange={() => toggleScope(scope.value)}
                  style={{ width: 15, height: 15, accentColor: 'var(--color-brand)', marginTop: 2 }}
                />
                <span>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 750, color: 'var(--color-text-primary)' }}>{scope.label}</span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.4, marginTop: 2 }}>{scope.detail}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        {error && <div style={{ color: 'var(--health-fading)', fontSize: 12, marginTop: 12 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>Cancel</button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || resources.length === 0 || !subjectLabel.trim()}
            style={{
              ...primaryButtonStyle,
              opacity: saving || resources.length === 0 || !subjectLabel.trim() ? 0.62 : 1,
              cursor: saving || resources.length === 0 || !subjectLabel.trim() ? 'default' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : `Share ${resources.length === 1 ? 'access' : `${resources.length} records`}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function titleCase(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={fieldLabelStyle}>{label}</span>
      <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} style={inputStyle} />
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={fieldLabelStyle}>{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} style={inputStyle}>
        {children}
      </select>
    </label>
  )
}

const panelStyle: React.CSSProperties = {
  border: '1px solid var(--edge)',
  borderRadius: 10,
  background: 'var(--surface-panel)',
  padding: 12,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 850,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--color-text-tertiary)',
  marginBottom: 10,
}

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 750,
  color: 'var(--color-text-secondary)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 38,
  borderRadius: 8,
  border: '1px solid var(--edge)',
  background: 'var(--surface-panel)',
  color: 'var(--color-text-primary)',
  fontSize: 13,
  fontFamily: 'inherit',
  padding: '0 10px',
  outline: 'none',
  boxSizing: 'border-box',
}

const iconButtonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: '1px solid var(--edge)',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const primaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  minHeight: 34,
  padding: '8px 12px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--color-brand)',
  color: '#fff',
  fontSize: 12,
  fontWeight: 750,
  fontFamily: 'inherit',
}

const secondaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  minHeight: 34,
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--edge)',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  fontSize: 12,
  fontWeight: 750,
  fontFamily: 'inherit',
  cursor: 'pointer',
}

function checkboxCardStyle(selected: boolean, locked: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    minHeight: 58,
    padding: 10,
    borderRadius: 8,
    border: selected ? '1px solid rgba(0,61,165,0.30)' : '1px solid var(--edge)',
    background: selected ? 'rgba(0,61,165,0.05)' : 'transparent',
    opacity: locked ? 0.82 : 1,
    cursor: locked ? 'default' : 'pointer',
  }
}
