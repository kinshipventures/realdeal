import { useState, useCallback } from 'react'
import type { Contact, Pod } from '../../lib/types'
import type { FieldConfig } from '../../lib/fieldConfig'
import { createCustomField, invalidateFieldConfigCache, getFieldConfigs } from '../../lib/fieldConfig'
import { useEscape } from '../../lib/escapeStack'

interface PodFieldsWidgetProps {
  pod: Pod
  contact: Contact
  fieldConfigs: FieldConfig[]
  onUpdate: (data: Partial<Contact>) => void
  onFieldConfigsRefresh?: (configs: FieldConfig[]) => void
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

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
}

export function PodFieldsWidget({
  pod,
  contact,
  fieldConfigs,
  onUpdate,
  onFieldConfigsRefresh,
}: PodFieldsWidgetProps) {
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState<FieldConfig['field_type']>('text')
  const [newFieldRequired, setNewFieldRequired] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const podFields = fieldConfigs
    .filter(fc =>
      fc.scope_pod_id === pod.id &&
      (fc.scope_type === contact.type || fc.scope_type === 'Both')
    )
    .sort((a, b) => a.display_order - b.display_order)

  function getFieldValue(fc: FieldConfig): unknown {
    // Airtable returns field values by field name
    return contact.custom_fields[fc.name] ?? contact.custom_fields[fc.airtable_field_id] ?? null
  }

  function handleFieldSave(fc: FieldConfig, rawValue: string | boolean) {
    const value = fc.field_type === 'checkbox' ? rawValue : (rawValue as string).trim() || null
    setEditingFieldId(null)
    onUpdate({ custom_fields: { ...contact.custom_fields, [fc.name]: value } })
  }

  const closeAddForm = useCallback(() => {
    setShowAddForm(false)
    setNewFieldName('')
    setNewFieldType('text')
    setNewFieldRequired(false)
    setAddError(null)
  }, [])

  useEscape(closeAddForm)

  async function handleAddField() {
    const name = newFieldName.trim()
    if (!name) return
    setAdding(true)
    setAddError(null)
    try {
      await createCustomField({
        name,
        field_type: newFieldType,
        scope_type: contact.type,
        scope_pod_id: pod.id,
        required: newFieldRequired,
        display_order: podFields.length + 1,
      })
      invalidateFieldConfigCache()
      const refreshed = await getFieldConfigs()
      onFieldConfigsRefresh?.(refreshed)
      closeAddForm()
    } catch {
      setAddError("Couldn't create field. Try again.")
    } finally {
      setAdding(false)
    }
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

      {podFields.length === 0 && !showAddForm && (
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: '0 0 14px', lineHeight: 1.5 }}>
          No custom fields yet
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

      {showAddForm && (
        <div style={{
          borderTop: podFields.length > 0 ? '1px solid var(--divider)' : 'none',
          paddingTop: podFields.length > 0 ? 12 : 0,
          marginBottom: 8,
        }}>
          <div style={{ marginBottom: 8 }}>
            <input
              autoFocus
              type="text"
              value={newFieldName}
              onChange={e => setNewFieldName(e.target.value)}
              placeholder="Field name"
              onKeyDown={e => { if (e.key === 'Enter') handleAddField(); if (e.key === 'Escape') { e.stopPropagation(); closeAddForm() } }}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <select
              value={newFieldType}
              onChange={e => setNewFieldType(e.target.value as FieldConfig['field_type'])}
              style={{ ...selectStyle, flex: 1 }}
            >
              <option value="text">Text</option>
              <option value="multiline">Multiline</option>
              <option value="number">Number</option>
              <option value="select">Select</option>
              <option value="date">Date</option>
              <option value="checkbox">Checkbox</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={newFieldRequired}
                onChange={e => setNewFieldRequired(e.target.checked)}
              />
              Required
            </label>
          </div>
          {addError && (
            <p role="alert" style={{ fontSize: 11, color: '#D93025', margin: '0 0 8px' }}>{addError}</p>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={handleAddField}
              disabled={adding || !newFieldName.trim()}
              style={{
                background: 'none', border: 'none', padding: 0,
                fontSize: 11, fontWeight: 700, color: adding || !newFieldName.trim() ? 'var(--color-text-tertiary)' : '#25B439',
                cursor: adding || !newFieldName.trim() ? 'default' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {adding ? 'Adding...' : 'Add field'}
            </button>
            <button
              type="button"
              onClick={closeAddForm}
              style={{
                background: 'none', border: 'none', padding: 0,
                fontSize: 11, color: 'var(--color-text-secondary)', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showAddForm && (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          style={{
            background: 'none', border: 'none', padding: 0,
            fontSize: 11, fontWeight: 700, color: '#25B439',
            cursor: 'pointer', fontFamily: 'inherit',
            marginTop: podFields.length > 0 ? 4 : 0,
          }}
        >
          + Add field
        </button>
      )}
    </div>
  )
}
