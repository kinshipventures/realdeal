import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router'
import type { Campaign, CampaignContact, CampaignStage, Contact } from '../../lib/types'
import { updateCampaignContact, removeContactFromCampaign } from '../../lib/data'
import { CAMPAIGN_COMMITMENT_AMOUNT_FIELD, CAMPAIGN_SOURCE_STATUS_FIELD, formatMoney, getCampaignContactCampaignStatus, getCampaignContactCommitmentAmount, parseMoneyInput, withMoneyField, withTextField } from '../../lib/campaignCommitments'
import { Avatar } from '../ui'
import { Search } from 'lucide-react'

interface Props {
  campaign: Campaign
  stages: CampaignStage[]
  campaignContacts: CampaignContact[]
  contacts: Contact[]
  onContactsChange: (contacts: CampaignContact[]) => void
  onCardClick: (cc: CampaignContact) => void
  sortKey: string
  sortAsc: boolean
  onSortChange: (key: string) => void
  visibleColumns?: Set<string>
}

type ColumnKey = 'name' | 'company' | 'email' | 'role' | 'stage' | 'commitment_amount' | 'campaign_status' | 'owner' | 'next_step' | 'next_step_due' | 'notes' | 'moved_at'

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'company', label: 'Company' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'stage', label: 'Stage' },
  { key: 'commitment_amount', label: 'Commitment Amount' },
  { key: 'campaign_status', label: 'Campaign Status' },
  { key: 'owner', label: 'Owner' },
  { key: 'next_step', label: 'Next Step' },
  { key: 'next_step_due', label: 'Due' },
  { key: 'notes', label: 'Notes' },
  { key: 'moved_at', label: 'Last Moved' },
]

const VISIBILITY_KEY = (id: string) => `realdeal:campaign-fields:${id}`

function getVisibleColumns(campaignId: string): Set<ColumnKey> {
  try {
    const saved = localStorage.getItem(VISIBILITY_KEY(campaignId))
    if (saved) return new Set(JSON.parse(saved))
  } catch {}
  return new Set(ALL_COLUMNS.map(c => c.key))
}

export function CampaignTableView({ campaign, stages, campaignContacts, contacts, onContactsChange, onCardClick, sortKey, sortAsc, onSortChange, visibleColumns }: Props) {
  const navigate = useNavigate()
  const [internalCols, setInternalCols] = useState(() => getVisibleColumns(campaign.id))
  const visibleCols = visibleColumns ?? internalCols
  const [editingCell, setEditingCell] = useState<{ rowId: string; col: ColumnKey } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; ccId: string } | null>(null)

  const sortedStages = [...stages].sort((a, b) => a.order - b.order)

  function toggleCol(key: ColumnKey) {
    if (key === 'name') return
    setInternalCols(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      localStorage.setItem(VISIBILITY_KEY(campaign.id), JSON.stringify([...next]))
      return next
    })
  }

  function handleSort(col: ColumnKey) {
    onSortChange(col)
  }

  function getCellValue(cc: CampaignContact, contact: Contact | undefined, col: ColumnKey): string {
    switch (col) {
      case 'name': return contact?.name ?? ''
      case 'company': return contact?.company ?? ''
      case 'email': return contact?.email ?? ''
      case 'role': return contact?.role ?? ''
      case 'stage': return stages.find(s => s.id === cc.stage_id)?.name ?? ''
      case 'commitment_amount': return formatMoney(getCampaignContactCommitmentAmount(cc))
      case 'campaign_status': return getCampaignContactCampaignStatus(cc) ?? ''
      case 'owner': return cc.owner ?? ''
      case 'next_step': return cc.next_step ?? ''
      case 'next_step_due': return cc.next_step_due ?? ''
      case 'notes': return cc.notes ?? ''
      case 'moved_at': return cc.moved_at ? new Date(cc.moved_at).toLocaleDateString() : ''
    }
  }

  // Sort rows
  let rows = campaignContacts.map(cc => ({
    cc,
    contact: contacts.find(c => c.id === cc.contact_id),
  }))

  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    rows = rows.filter(r => r.contact?.name?.toLowerCase().includes(q) || r.contact?.company?.toLowerCase().includes(q))
  }

  if (sortKey && sortKey !== 'default' && ALL_COLUMNS.some(c => c.key === sortKey)) {
    const col = sortKey as ColumnKey
    rows.sort((a, b) => {
      if (col === 'commitment_amount') {
        const cmp = (getCampaignContactCommitmentAmount(a.cc) ?? 0) - (getCampaignContactCommitmentAmount(b.cc) ?? 0)
        return sortAsc ? cmp : -cmp
      }
      const av = getCellValue(a.cc, a.contact, col)
      const bv = getCellValue(b.cc, b.contact, col)
      const cmp = av.localeCompare(bv)
      return sortAsc ? cmp : -cmp
    })
  }

  const cols = ALL_COLUMNS.filter(c => visibleCols.has(c.key))

  async function startEdit(rowId: string, col: ColumnKey) {
    if (col === 'name' || col === 'moved_at') return // not editable inline
    const row = rows.find(r => r.cc.id === rowId)
    if (!row) return
    setEditValue(col === 'commitment_amount'
      ? (getCampaignContactCommitmentAmount(row.cc) !== null ? formatMoney(getCampaignContactCommitmentAmount(row.cc)) : '')
      : getCellValue(row.cc, row.contact, col)
    )
    setEditingCell({ rowId, col })
  }

  async function commitEdit() {
    if (!editingCell) return
    const { rowId, col } = editingCell

    if (col === 'stage') {
      // handled by dropdown
      setEditingCell(null)
      return
    }

    if (col === 'commitment_amount') {
      const row = rows.find(r => r.cc.id === rowId)
      if (!row) return
      const amount = parseMoneyInput(editValue)
      if (Number.isNaN(amount)) return
      setEditingCell(null)
      const updated = await updateCampaignContact(rowId, {
        custom_fields: withMoneyField(row.cc.custom_fields, CAMPAIGN_COMMITMENT_AMOUNT_FIELD, amount),
      })
      onContactsChange(campaignContacts.map(cc => cc.id === rowId ? updated : cc))
      return
    }

    if (col === 'campaign_status') {
      const row = rows.find(r => r.cc.id === rowId)
      if (!row) return
      setEditingCell(null)
      const updated = await updateCampaignContact(rowId, {
        custom_fields: withTextField(row.cc.custom_fields, CAMPAIGN_SOURCE_STATUS_FIELD, editValue),
      })
      onContactsChange(campaignContacts.map(cc => cc.id === rowId ? updated : cc))
      return
    }

    setEditingCell(null)

    const data: any = {}
    if (col === 'owner') data.owner = editValue || null
    if (col === 'next_step') data.next_step = editValue || null
    if (col === 'next_step_due') data.next_step_due = editValue || null
    if (col === 'notes') data.notes = editValue || null

    if (Object.keys(data).length > 0) {
      const updated = await updateCampaignContact(rowId, data)
      onContactsChange(campaignContacts.map(cc => cc.id === rowId ? updated : cc))
    }
  }

  async function handleStageChange(ccId: string, stageId: string) {
    const now = new Date().toISOString()
    const updated = await updateCampaignContact(ccId, { stage_id: stageId, moved_at: now })
    onContactsChange(campaignContacts.map(cc => cc.id === ccId ? updated : cc))
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === rows.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(rows.map(r => r.cc.id)))
  }

  async function handleBulkMove(stageId: string) {
    const now = new Date().toISOString()
    const ids = Array.from(selectedIds)
    await Promise.all(ids.map(id =>
      updateCampaignContact(id, { stage_id: stageId, moved_at: now })
    ))
    onContactsChange(campaignContacts.map(cc =>
      ids.includes(cc.id) ? { ...cc, stage_id: stageId, moved_at: now } : cc
    ))
    setSelectedIds(new Set())
  }

  async function handleRemoveContact(ccId: string) {
    setContextMenu(null)
    const previous = [...campaignContacts]
    onContactsChange(campaignContacts.filter(cc => cc.id !== ccId))
    try {
      await removeContactFromCampaign(ccId)
    } catch (err) {
      console.error('Remove from campaign failed:', err)
      onContactsChange(previous)
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--tint)', borderRadius: 8, padding: '4px 10px',
          flex: 1, maxWidth: 300,
        }}>
          <Search size={13} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search contacts..."
            style={{
              border: 'none', background: 'none', outline: 'none',
              fontSize: 12, color: 'var(--color-text-primary)',
              fontFamily: 'inherit', width: '100%',
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--edge)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--edge)' }}>
              <th style={{ width: 36, padding: '8px 6px', textAlign: 'center' }}>
                <input type="checkbox" checked={selectedIds.size === rows.length && rows.length > 0} onChange={toggleSelectAll} />
              </th>
              {cols.map(c => (
                <th
                  key={c.key}
                  onClick={() => handleSort(c.key)}
                  style={{
                    textAlign: 'left', padding: '8px 10px',
                    fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
                  }}
                >
                  {c.label}
                  {sortKey === c.key && (sortAsc ? ' ^' : ' v')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ cc, contact }) => (
              <tr
                key={cc.id}
                style={{
                  borderBottom: '1px solid var(--edge)',
                  background: selectedIds.has(cc.id) ? 'rgba(66,153,225,0.06)' : 'transparent',
                }}
                onContextMenu={e => {
                  e.preventDefault()
                  setContextMenu({ x: e.clientX, y: e.clientY, ccId: cc.id })
                }}
              >
                <td style={{ padding: '6px', textAlign: 'center' }}>
                  <input type="checkbox" checked={selectedIds.has(cc.id)} onChange={() => toggleSelect(cc.id)} />
                </td>
                {cols.map(c => (
                  <td
                    key={c.key}
                    onClick={() => {
                      if (c.key === 'name') { onCardClick(cc); }
                      else startEdit(cc.id, c.key)
                    }}
                    style={{
                      padding: '6px 10px', cursor: 'pointer',
                      color: c.key === 'name' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                      fontWeight: c.key === 'name' ? 500 : 400,
                      maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {editingCell?.rowId === cc.id && editingCell?.col === c.key ? (
                      <input
                        autoFocus
                        type={c.key === 'next_step_due' ? 'date' : 'text'}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingCell(null) }}
                        style={{
                          width: '100%', border: '1px solid var(--color-brand)',
                          borderRadius: 4, padding: '2px 6px', fontSize: 12,
                          outline: 'none', background: 'var(--color-surface)',
                          color: 'var(--color-text-primary)', fontFamily: 'inherit',
                        }}
                      />
                    ) : c.key === 'stage' ? (
                      <select
                        value={cc.stage_id ?? ''}
                        onChange={e => handleStageChange(cc.id, e.target.value)}
                        onClick={e => e.stopPropagation()}
                        style={{
                          fontSize: 12, border: 'none', background: 'none',
                          color: stages.find(s => s.id === cc.stage_id)?.color ?? 'var(--color-text-secondary)',
                          fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                          padding: '2px 4px', borderRadius: 4, outline: 'none',
                        }}
                      >
                        {sortedStages.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    ) : c.key === 'name' ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Avatar name={contact?.name ?? '?'} size={22} />
                        {contact?.name ?? 'Unknown'}
                      </span>
                    ) : (
                      getCellValue(cc, contact, c.key) || <span style={{ color: 'var(--color-text-tertiary)' }}>-</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 200 }}
            onClick={() => setContextMenu(null)}
          />
          <div style={{
            position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 201,
            background: 'var(--surface-panel)', border: '1px solid var(--edge)',
            borderRadius: 8, padding: 4, minWidth: 160,
            boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
          }}>
            <button
              type="button"
              onClick={() => {
                const cc = campaignContacts.find(c => c.id === contextMenu.ccId)
                if (cc) navigate(`/contact/${cc.contact_id}`)
                setContextMenu(null)
              }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '6px 12px', borderRadius: 6, border: 'none',
                background: 'none', fontSize: 12, cursor: 'pointer',
                color: 'var(--color-text-primary)', fontFamily: 'inherit',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--tint)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              Open contact
            </button>
            <div style={{ height: 1, background: 'var(--edge)', margin: '2px 0' }} />
            {sortedStages.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => { handleStageChange(contextMenu.ccId, s.id); setContextMenu(null) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                  textAlign: 'left', padding: '6px 12px', borderRadius: 6,
                  border: 'none', background: 'none', fontSize: 12, cursor: 'pointer',
                  color: 'var(--color-text-primary)', fontFamily: 'inherit',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--tint)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color ?? '#999' }} />
                Move to {s.name}
              </button>
            ))}
            <div style={{ height: 1, background: 'var(--edge)', margin: '2px 0' }} />
            <button
              type="button"
              onClick={() => handleRemoveContact(contextMenu.ccId)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '6px 12px', borderRadius: 6, border: 'none',
                background: 'none', fontSize: 12, cursor: 'pointer',
                color: '#D93025', fontFamily: 'inherit',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(217,48,37,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              Remove from campaign
            </button>
          </div>
        </>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 300, background: 'rgba(0,0,0,0.88)', borderRadius: 12,
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
        }}>
          <span style={{ fontSize: 13, color: '#fff', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {selectedIds.size} selected
          </span>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>Move to</span>
          {sortedStages.map(stage => (
            <button
              key={stage.id}
              onClick={() => handleBulkMove(stage.id)}
              style={{
                fontSize: 12, fontWeight: 500, padding: '5px 12px',
                borderRadius: 6, border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.1)', color: '#fff',
                display: 'flex', alignItems: 'center', gap: 5,
                fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: stage.color ?? '#999' }} />
              {stage.name}
            </button>
          ))}
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{
              fontSize: 11, color: 'rgba(255,255,255,0.45)',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 6px',
            }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
