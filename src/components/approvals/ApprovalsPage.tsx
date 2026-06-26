import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ShieldCheck, UserPlus, X } from 'lucide-react'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import {
  getCollaborationApprovalRequests,
  getCollaborationContactProposals,
  resolveCollaborationApprovalRequest,
  resolveCollaborationContactProposal,
  type CollaborationApprovalRequest,
  type CollaborationContactProposal,
} from '@/lib/collaboration'

type ApprovalTab = 'requests' | 'proposals'

function titleCase(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ApprovalsPage() {
  const { activeWorkspace } = useWorkspace()
  const workspaceId = activeWorkspace?.id
  const [tab, setTab] = useState<ApprovalTab>('requests')
  const [requests, setRequests] = useState<CollaborationApprovalRequest[]>([])
  const [proposals, setProposals] = useState<CollaborationContactProposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const pendingRequests = useMemo(() => requests.filter(request => request.status === 'pending'), [requests])
  const pendingProposals = useMemo(() => proposals.filter(proposal => proposal.status === 'pending'), [proposals])

  const loadData = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    setError('')
    try {
      const [nextRequests, nextProposals] = await Promise.all([
        getCollaborationApprovalRequests(workspaceId),
        getCollaborationContactProposals(workspaceId),
      ])
      setRequests(nextRequests)
      setProposals(nextProposals)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleResolveRequest(request: CollaborationApprovalRequest, status: 'approved' | 'rejected') {
    if (!workspaceId) return
    await resolveCollaborationApprovalRequest(request.id, workspaceId, status)
    await loadData()
  }

  async function handleResolveProposal(proposal: CollaborationContactProposal, status: 'approved' | 'rejected') {
    if (!workspaceId) return
    await resolveCollaborationContactProposal(proposal.id, workspaceId, status)
    await loadData()
  }

  return (
    <main className="content-enter" style={{ padding: '32px clamp(16px, 4vw, 36px) 80px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 28, fontWeight: 850 }}>
            Approvals
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--color-text-tertiary)', fontSize: 13, lineHeight: 1.5 }}>
            Review campaign participation, private information access, and proposed contacts.
          </p>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 18 }}>
        <SummaryCard icon={<ShieldCheck size={16} />} label="Pending requests" value={pendingRequests.length} />
        <SummaryCard icon={<UserPlus size={16} />} label="Pending proposals" value={pendingProposals.length} />
        <SummaryCard icon={<Check size={16} />} label="Resolved items" value={requests.length + proposals.length - pendingRequests.length - pendingProposals.length} />
      </section>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--edge)', marginBottom: 16 }}>
        <TabButton active={tab === 'requests'} onClick={() => setTab('requests')}>Approval Requests</TabButton>
        <TabButton active={tab === 'proposals'} onClick={() => setTab('proposals')}>Contact Proposals</TabButton>
      </div>

      {error && <div style={{ ...noticeStyle, color: 'var(--health-fading)' }}>{error}</div>}

      {loading ? (
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, padding: 24 }}>Loading...</div>
      ) : tab === 'requests' ? (
        <ApprovalRequestsTable requests={requests} onResolve={handleResolveRequest} />
      ) : (
        <ContactProposalsTable proposals={proposals} onResolve={handleResolveProposal} />
      )}
    </main>
  )
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div style={{ border: '1px solid var(--edge)', borderRadius: 10, background: 'var(--surface-panel)', padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(0,61,165,0.08)', color: 'var(--color-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 850, color: 'var(--color-text-primary)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '10px 12px',
        border: 'none',
        borderBottom: active ? '2px solid var(--color-brand)' : '2px solid transparent',
        background: 'transparent',
        color: active ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
        fontSize: 12,
        fontWeight: active ? 750 : 550,
        fontFamily: 'inherit',
        cursor: 'pointer',
        marginBottom: -1,
      }}
    >
      {children}
    </button>
  )
}

function ApprovalRequestsTable({
  requests,
  onResolve,
}: {
  requests: CollaborationApprovalRequest[]
  onResolve: (request: CollaborationApprovalRequest, status: 'approved' | 'rejected') => void
}) {
  if (requests.length === 0) {
    return <EmptyState title="No approval requests" detail="Campaign participation and private data requests will appear here." />
  }

  return (
    <div style={tableStyle}>
      <Header columns="1fr 1fr 1fr 0.75fr 96px" labels={['Request', 'Target', 'Fields', 'Status', '']} />
      {requests.map(request => (
        <div key={request.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.75fr 96px', minHeight: 62, alignItems: 'center', borderBottom: '1px solid var(--divider)' }}>
          <Cell primary={titleCase(request.request_type)} secondary={request.requested_by_label} />
          <Cell primary={request.contact_label ?? request.campaign_label ?? 'Request'} secondary={request.reason ?? formatDate(request.created_at)} />
          <Cell primary={`${request.requested_field_scopes.length} groups`} secondary={request.requested_field_scopes.map(titleCase).join(', ')} />
          <div style={{ padding: '10px 12px' }}><StatusPill status={request.status} /></div>
          <Actions disabled={request.status !== 'pending'} onApprove={() => onResolve(request, 'approved')} onReject={() => onResolve(request, 'rejected')} />
        </div>
      ))}
    </div>
  )
}

function ContactProposalsTable({
  proposals,
  onResolve,
}: {
  proposals: CollaborationContactProposal[]
  onResolve: (proposal: CollaborationContactProposal, status: 'approved' | 'rejected') => void
}) {
  if (proposals.length === 0) {
    return <EmptyState title="No contact proposals" detail="External or campaign-specific proposed contacts will appear here for review." />
  }

  return (
    <div style={tableStyle}>
      <Header columns="1fr 1fr 1fr 0.75fr 96px" labels={['Contact', 'Campaign', 'Proposed by', 'Status', '']} />
      {proposals.map(proposal => (
        <div key={proposal.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.75fr 96px', minHeight: 62, alignItems: 'center', borderBottom: '1px solid var(--divider)' }}>
          <Cell primary={String(proposal.contact_payload.name ?? 'New contact')} secondary={String(proposal.contact_payload.company ?? proposal.contact_payload.email ?? formatDate(proposal.created_at))} />
          <Cell primary={proposal.campaign_label ?? 'General proposal'} secondary={proposal.matched_contact_id ? 'Possible match found' : 'No match linked'} />
          <Cell primary={proposal.proposed_by_label} secondary={proposal.review_note ?? ''} />
          <div style={{ padding: '10px 12px' }}><StatusPill status={proposal.status} /></div>
          <Actions disabled={proposal.status !== 'pending'} onApprove={() => onResolve(proposal, 'approved')} onReject={() => onResolve(proposal, 'rejected')} />
        </div>
      ))}
    </div>
  )
}

function Header({ columns, labels }: { columns: string; labels: string[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: columns, minHeight: 38, alignItems: 'center', background: 'var(--tint)', borderBottom: '1px solid var(--edge)' }}>
      {labels.map((label, index) => <div key={`${label}-${index}`} style={headerCellStyle}>{label}</div>)}
    </div>
  )
}

function Cell({ primary, secondary }: { primary: string; secondary?: string }) {
  return (
    <div style={{ padding: '10px 12px', minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 750, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{primary}</div>
      {secondary && <div style={{ marginTop: 3, fontSize: 11, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{secondary}</div>}
    </div>
  )
}

function StatusPill({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const style = status === 'approved'
    ? ['rgba(37,180,57,0.10)', 'var(--color-brand)']
    : status === 'rejected'
      ? ['rgba(225,29,72,0.10)', 'var(--health-fading)']
      : ['rgba(245,166,35,0.14)', '#a16207']

  return (
    <span style={{ display: 'inline-flex', minHeight: 22, alignItems: 'center', padding: '0 8px', borderRadius: 999, background: style[0], color: style[1], fontSize: 11, fontWeight: 750 }}>
      {titleCase(status)}
    </span>
  )
}

function Actions({ disabled, onApprove, onReject }: { disabled: boolean; onApprove: () => void; onReject: () => void }) {
  return (
    <div style={{ padding: '10px 12px', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
      <IconButton label="Approve" disabled={disabled} onClick={onApprove}><Check size={14} /></IconButton>
      <IconButton label="Reject" disabled={disabled} onClick={onReject}><X size={14} /></IconButton>
    </div>
  )
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} style={{ ...iconButtonStyle, opacity: disabled ? 0.45 : 1, cursor: disabled ? 'default' : 'pointer' }}>
      {children}
    </button>
  )
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div style={{ border: '1px solid var(--edge)', borderRadius: 10, background: 'var(--surface-panel)', padding: 22, textAlign: 'center' }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{detail}</div>
    </div>
  )
}

const tableStyle: React.CSSProperties = {
  border: '1px solid var(--edge)',
  borderRadius: 10,
  background: 'var(--surface-panel)',
  overflow: 'hidden',
}

const headerCellStyle: React.CSSProperties = {
  padding: '0 12px',
  fontSize: 11,
  fontWeight: 850,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--color-text-tertiary)',
}

const noticeStyle: React.CSSProperties = {
  border: '1px solid var(--edge)',
  borderRadius: 8,
  padding: 10,
  fontSize: 12,
  marginBottom: 12,
}

const iconButtonStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: '1px solid var(--edge)',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}
