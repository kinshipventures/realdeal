import { useState } from 'react'
import type { Contact, Pod } from '../../lib/types'
import type { FieldConfig } from '../../lib/fieldConfig'

interface PodFieldsWidgetProps {
  pod: Pod
  contact: Contact
  fieldConfigs: FieldConfig[]
  onUpdate: (data: Partial<Contact>) => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--tint)',
  border: '1px solid var(--edge-strong)',
  borderRadius: 6,
  color: 'var(--color-text-primary)',
  fontSize: 13,
  padding: '6px 10px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

export function PodFieldsWidget({
  pod,
  contact,
  fieldConfigs,
  onUpdate,
}: PodFieldsWidgetProps) {
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)

  const podFields = fieldConfigs
    .filter(fc =>
      fc.scope_pod_id === pod.id &&
      (fc.scope_type === contact.type || fc.scope_type === 'Both')
    )
    .sort((a, b) => a.display_order - b.display_order)

  function getFieldValue(fc: FieldConfig): unknown {
    // Preserve values saved under previous field-id keys while standard fields remain fixed.
    return contact.custom_fields[fc.name] ?? contact.custom_fields[fc.source_field_id] ?? null
  }

  function handleFieldSave(fc: FieldConfig, rawValue: string | boolean) {
    const value = fc.field_type === 'checkbox' ? rawValue : (rawValue as string).trim() || null
    setEditingFieldId(null)
    onUpdate({ custom_fields: { ...contact.custom_fields, [fc.name]: value } })
  }

  return (
    <div style={{
      background: 'var(--surface-panel)',
      border: '1px solid var(--edge)',
      borderRadius: 12,
      padding: '16px 20px',
      marginBottom: 12,
    }}>
      <div style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 16,
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        marginBottom: 14,
      }}>
        {pod.name}
      </div>

      {podFields.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: '0 0 14px', lineHeight: 1.5 }}>
          No configured fields
        </p>
      )}

      {podFields.map(fc => {
        const val = getFieldValue(fc)
        const editing = editingFieldId === fc.id

        return (
          <div key={fc.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--divider)' }}>
            <span style={{
              fontSize: 13, fontWeight: 400,
              color: 'var(--color-text-secondary)',
              width: 120, flexShrink: 0,
              paddingTop: editing ? 7 : 0,
            }}>
              {fc.name}{fc.required && <span style={{ color: 'var(--color-brand)', marginLeft: 2 }}>*</span>}
            </span>

            <div style={{ flex: 1 }}>
              {editing ? (
                <>
                  {fc.field_type === 'multiline' && (
                    <textarea
                      autoFocus
                      defaultValue={String(val ?? '')}
                      onBlur={e => handleFieldSave(fc, e.target.value)}
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  )}
                  {fc.field_type === 'checkbox' && (
                    <input
                      autoFocus
                      type="checkbox"
                      defaultChecked={!!val}
                      onChange={e => handleFieldSave(fc, e.target.checked)}
                      style={{ width: 'auto', cursor: 'pointer' }}
                    />
                  )}
                  {fc.field_type === 'date' && (
                    <input
                      autoFocus
                      type="date"
                      defaultValue={String(val ?? '')}
                      onBlur={e => handleFieldSave(fc, e.target.value)}
                      style={inputStyle}
                    />
                  )}
                  {fc.field_type === 'number' && (
                    <input
                      autoFocus
                      type="number"
                      defaultValue={String(val ?? '')}
                      onBlur={e => handleFieldSave(fc, e.target.value)}
                      style={inputStyle}
                    />
                  )}
                  {(fc.field_type === 'text' || fc.field_type === 'select') && (
                    <input
                      autoFocus
                      type="text"
                      defaultValue={String(val ?? '')}
                      onBlur={e => handleFieldSave(fc, e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') e.currentTarget.blur()
                        if (e.key === 'Escape') { e.currentTarget.value = String(val ?? ''); e.currentTarget.blur(); e.stopPropagation() }
                      }}
                      style={inputStyle}
                    />
                  )}
                </>
              ) : (
                <div
                  onClick={() => setEditingFieldId(fc.id)}
                  style={{
                    fontSize: 13,
                    fontWeight: 400,
                    color: val !== null && val !== undefined && val !== '' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                    cursor: 'text',
                    minHeight: 20,
                    lineHeight: '20px',
                  }}
                >
                  {fc.field_type === 'checkbox'
                    ? (val ? 'Yes' : 'No')
                    : (val !== null && val !== undefined && val !== '' ? String(val) : '\u2014')}
                </div>
              )}
            </div>
          </div>
        )
      })}

    </div>
  )
}
