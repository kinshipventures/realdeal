import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { Check, Download, MessageSquare, Search, X } from 'lucide-react'
import {
  createCollaborationContactProposal,
  createPublicLinkReview,
  getPublicCampaignLinkByToken,
  getPublicLinkReviewsByToken,
  type CollaborationPublicCampaignLink,
  type CollaborationPublicLinkReview,
  type PublicCampaignReviewStatus,
} from '@/lib/collaboration'
import type { CampaignContactSnapshot } from '@/lib/collaborationPolicy'

type PublicReviewFilter = 'all' | PublicCampaignReviewStatus | 'unreviewed'

function statusLabel(status: PublicCampaignReviewStatus): string {
  if (status === 'discussion') return 'Needs discussion'
  return status === 'approved' ? 'Approved' : 'Rejected'
}

function contactReviews(
  reviews: CollaborationPublicLinkReview[],
  contactId: string,
): CollaborationPublicLinkReview[] {
  return reviews.filter(review => review.contact_id === contactId)
}

function latestContactReview(
  reviews: CollaborationPublicLinkReview[],
  contactId: string,
): CollaborationPublicLinkReview | undefined {
  return contactReviews(reviews, contactId)[0]
}

function csvValue(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export function PublicCampaignView() {
  const { token = '' } = useParams<{ token: string }>()
  const [link, setLink] = useState<CollaborationPublicCampaignLink | null>(null)
  const [reviews, setReviews] = useState<CollaborationPublicLinkReview[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewerLabel, setReviewerLabel] = useState('')
  const [comment, setComment] = useState('')
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<PublicCampaignReviewStatus>('approved')
  const [proposalName, setProposalName] = useState('')
  const [proposalCompany, setProposalCompany] = useState('')
  const [proposalEmail, setProposalEmail] = useState('')
  const [proposalRole, setProposalRole] = useState('')
  const [searchText, setSearchText] = useState('')
  const [reviewFilter, setReviewFilter] = useState<PublicReviewFilter>('all')
  const [savedViewNotice, setSavedViewNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`realdeal-public-campaign-view:${token}`)
      if (!saved) return
      const parsed = JSON.parse(saved) as { searchText?: string; reviewFilter?: PublicReviewFilter }
      setSearchText(parsed.searchText ?? '')
      setReviewFilter(parsed.reviewFilter ?? 'all')
    } catch {
      // Ignore malformed local-only view preferences.
    }
  }, [token])

  useEffect(() => {
    let cancelled = false

    async function loadPublicLink() {
      setLoading(true)
      setError('')
      try {
        const nextLink = await getPublicCampaignLinkByToken(token)
        const nextReviews = nextLink ? await getPublicLinkReviewsByToken(token) : []
        if (!cancelled) {
          setLink(nextLink)
          setReviews(nextReviews)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load this campaign link')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPublicLink()
    return () => {
      cancelled = true
    }
  }, [token])

  const contacts = useMemo(
    () => ((link?.contacts_snapshot ?? []) as CampaignContactSnapshot[]),
    [link?.contacts_snapshot],
  )
  const visibleContacts = useMemo(() => {
    const query = searchText.trim().toLowerCase()

    return contacts.filter(contact => {
      const latestReview = latestContactReview(reviews, contact.contact_id)
      const matchesReview = reviewFilter === 'all'
        || (reviewFilter === 'unreviewed' && !latestReview)
        || latestReview?.status === reviewFilter
      if (!matchesReview) return false
      if (!query) return true

      return [
        contact.name,
        contact.company,
        contact.role,
        contact.location,
        contact.country,
        contact.industry,
        contact.linkedin,
        contact.campaign_status,
        contact.stage,
      ].some(value => String(value ?? '').toLowerCase().includes(query))
    })
  }, [contacts, reviews, reviewFilter, searchText])

  const canReview = Boolean(link?.permissions.includes('review_contacts'))
  const canComment = Boolean(link?.permissions.includes('comment'))
  const canExport = Boolean(link?.permissions.includes('export_approved_contacts'))
  const canPropose = Boolean(link?.permissions.includes('propose_contacts'))
  const selectedContact = contacts.find(contact => contact.contact_id === selectedContactId) ?? null

  async function handleReview(contact: CampaignContactSnapshot, status: PublicCampaignReviewStatus) {
    setSelectedContactId(contact.contact_id)
    setSelectedStatus(status)
    setComment('')
    setError('')
  }

  async function submitReview() {
    if (!link || !selectedContact || !reviewerLabel.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      await createPublicLinkReview({
        public_link_id: link.id,
        token: link.token,
        contact_id: selectedContact.contact_id,
        reviewer_label: reviewerLabel.trim(),
        status: selectedStatus,
        comment: comment.trim() || null,
      })
      setReviews(await getPublicLinkReviewsByToken(token))
      setSelectedContactId(null)
      setComment('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save review')
    } finally {
      setSaving(false)
    }
  }

  async function submitProposal() {
    if (!link || !proposalName.trim() || !reviewerLabel.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      await createCollaborationContactProposal({
        workspace_id: link.workspace_id,
        campaign_id: link.campaign_id,
        campaign_label: link.campaign_label,
        proposed_by_label: reviewerLabel.trim(),
        source_public_token: link.token,
        contact_payload: {
          name: proposalName.trim(),
          company: proposalCompany.trim() || null,
          email: proposalEmail.trim() || null,
          role: proposalRole.trim() || null,
        },
      })
      setProposalName('')
      setProposalCompany('')
      setProposalEmail('')
      setProposalRole('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit contact proposal')
    } finally {
      setSaving(false)
    }
  }

  function exportSnapshot() {
    if (!link || !canExport) return
    const rows = [
      ['Name', 'Company', 'Role', 'Location', 'Country', 'LinkedIn', 'Campaign Status', 'Stage']
        .map(csvValue)
        .join(','),
      ...visibleContacts.map(contact => [
        contact.name,
        contact.company,
        contact.role,
        contact.location,
        contact.country,
        contact.linkedin,
        contact.campaign_status,
        contact.stage,
      ].map(csvValue).join(',')),
    ]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${link.campaign_label.replace(/[^a-zA-Z0-9]/g, '_')}_approved_view.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function savePersonalView() {
    try {
      window.localStorage.setItem(
        `realdeal-public-campaign-view:${token}`,
        JSON.stringify({ searchText, reviewFilter }),
      )
      setSavedViewNotice('View saved on this device.')
    } catch {
      setSavedViewNotice('This browser could not save the view.')
    }
  }

  if (loading) {
    return <PublicShell><div style={stateStyle}>Loading campaign view...</div></PublicShell>
  }

  if (!link) {
    return (
      <PublicShell>
        <div style={stateStyle}>
          <h1 style={stateTitleStyle}>This campaign link is unavailable</h1>
          <p style={stateTextStyle}>The link may have expired, been revoked, or never existed.</p>
        </div>
      </PublicShell>
    )
  }

  return (
    <PublicShell>
      <main style={{ width: 'min(1120px, calc(100vw - 32px))', margin: '0 auto', padding: '34px 0 56px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Public campaign review
            </div>
            <h1 style={{ margin: '6px 0 8px', color: 'var(--color-text-primary)', fontSize: 28, fontWeight: 850 }}>
              {link.campaign_label}
            </h1>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
              This view only shows the fields approved for this shared campaign link.
            </p>
          </div>
          {canExport && (
            <button type="button" onClick={exportSnapshot} style={secondaryButtonStyle}>
              <Download size={14} />
              Export approved view
            </button>
          )}
        </header>

        {error && <div style={{ ...noticeStyle, color: 'var(--health-fading)' }}>{error}</div>}
        {savedViewNotice && <div style={noticeStyle}>{savedViewNotice}</div>}

        <section style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <label style={{ ...inputWrapStyle, flex: '1 1 260px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={14} color="var(--color-text-tertiary)" />
            <input
              value={searchText}
              onChange={event => setSearchText(event.target.value)}
              placeholder="Search shared contacts"
              style={{ border: 0, outline: 'none', background: 'transparent', width: '100%', fontSize: 13, color: 'var(--color-text-primary)' }}
            />
          </label>
          <select value={reviewFilter} onChange={event => setReviewFilter(event.target.value as PublicReviewFilter)} style={{ ...inputStyle, flex: '0 1 180px' }}>
            <option value="all">All reviews</option>
            <option value="unreviewed">Unreviewed</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="discussion">Needs discussion</option>
          </select>
          <button type="button" onClick={savePersonalView} style={secondaryButtonStyle}>
            Save view
          </button>
        </section>

        <section style={{ border: '1px solid var(--edge)', borderRadius: 10, overflow: 'hidden', background: 'var(--surface-panel)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: canReview ? '1.25fr 0.9fr 0.85fr 0.85fr 1fr 150px' : '1.25fr 0.9fr 0.85fr 0.85fr 1fr', minHeight: 38, alignItems: 'center', background: 'var(--tint)', borderBottom: '1px solid var(--edge)' }}>
            {['Name', 'Company', 'Role', 'Location', 'Latest review'].map(label => (
              <div key={label} style={headerCellStyle}>{label}</div>
            ))}
            {canReview && <div style={headerCellStyle}>Review</div>}
          </div>

          {visibleContacts.map(contact => {
            const latestReview = latestContactReview(reviews, contact.contact_id)
            return (
              <div key={contact.contact_id} style={{ display: 'grid', gridTemplateColumns: canReview ? '1.25fr 0.9fr 0.85fr 0.85fr 1fr 150px' : '1.25fr 0.9fr 0.85fr 0.85fr 1fr', minHeight: 62, alignItems: 'center', borderBottom: '1px solid var(--divider)' }}>
                <Cell primary={contact.name} secondary={contact.linkedin ?? undefined} />
                <Cell primary={contact.company ?? '-'} secondary={contact.industry ?? undefined} />
                <Cell primary={contact.role ?? '-'} secondary={contact.campaign_status ?? undefined} />
                <Cell primary={contact.location ?? contact.country ?? '-'} secondary={contact.stage ?? undefined} />
                <Cell primary={latestReview ? statusLabel(latestReview.status) : 'No review yet'} secondary={latestReview?.comment ?? latestReview?.reviewer_label} />
                {canReview && (
                  <div style={{ display: 'flex', gap: 6, padding: '10px 12px' }}>
                    <IconButton label="Approve" onClick={() => handleReview(contact, 'approved')}><Check size={14} /></IconButton>
                    <IconButton label="Reject" onClick={() => handleReview(contact, 'rejected')}><X size={14} /></IconButton>
                    {canComment && <IconButton label="Discuss" onClick={() => handleReview(contact, 'discussion')}><MessageSquare size={14} /></IconButton>}
                  </div>
                )}
              </div>
            )
          })}
          {visibleContacts.length === 0 && (
            <div style={{ padding: 18, color: 'var(--color-text-tertiary)', fontSize: 13 }}>
              No shared contacts match this view.
            </div>
          )}
        </section>

        {selectedContact && (
          <section style={{ marginTop: 14, border: '1px solid var(--edge)', borderRadius: 10, padding: 14, background: 'var(--surface-panel)' }}>
            <div style={{ fontSize: 13, fontWeight: 850, color: 'var(--color-text-primary)' }}>
              {statusLabel(selectedStatus)}: {selectedContact.name}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 0.4fr) 1fr auto', gap: 10, marginTop: 10 }}>
              <input
                value={reviewerLabel}
                onChange={event => setReviewerLabel(event.target.value)}
                placeholder="Your name"
                style={inputStyle}
              />
              <input
                value={comment}
                onChange={event => setComment(event.target.value)}
                placeholder={canComment ? 'Optional comment' : 'Comments are disabled for this link'}
                disabled={!canComment}
                style={inputStyle}
              />
              <button type="button" onClick={submitReview} disabled={saving || !reviewerLabel.trim()} style={{ ...primaryButtonStyle, opacity: saving || !reviewerLabel.trim() ? 0.62 : 1 }}>
                {saving ? 'Saving...' : 'Save review'}
              </button>
            </div>
          </section>
        )}

        {canPropose && (
          <section style={{ marginTop: 14, border: '1px solid var(--edge)', borderRadius: 10, padding: 14, background: 'var(--surface-panel)' }}>
            <div style={{ fontSize: 13, fontWeight: 850, color: 'var(--color-text-primary)' }}>
              Propose a contact
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr)) auto', gap: 10, marginTop: 10 }}>
              <input value={reviewerLabel} onChange={event => setReviewerLabel(event.target.value)} placeholder="Your name" style={inputStyle} />
              <input value={proposalName} onChange={event => setProposalName(event.target.value)} placeholder="Contact name" style={inputStyle} />
              <input value={proposalCompany} onChange={event => setProposalCompany(event.target.value)} placeholder="Company" style={inputStyle} />
              <input value={proposalRole} onChange={event => setProposalRole(event.target.value)} placeholder="Role" style={inputStyle} />
              <input value={proposalEmail} onChange={event => setProposalEmail(event.target.value)} placeholder="Email if relevant" style={inputStyle} />
              <button type="button" onClick={submitProposal} disabled={saving || !reviewerLabel.trim() || !proposalName.trim()} style={{ ...primaryButtonStyle, opacity: saving || !reviewerLabel.trim() || !proposalName.trim() ? 0.62 : 1 }}>
                Propose
              </button>
            </div>
          </section>
        )}
      </main>
    </PublicShell>
  )
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}>
      {children}
    </div>
  )
}

function Cell({ primary, secondary }: { primary: string; secondary?: string | null }) {
  return (
    <div style={{ padding: '10px 12px', minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 750, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {primary}
      </div>
      {secondary && (
        <div style={{ marginTop: 3, fontSize: 11, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {secondary}
        </div>
      )}
    </div>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} style={iconButtonStyle}>
      {children}
    </button>
  )
}

const headerCellStyle: React.CSSProperties = {
  padding: '0 12px',
  fontSize: 11,
  fontWeight: 850,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--color-text-tertiary)',
}

const stateStyle: React.CSSProperties = {
  width: 'min(560px, calc(100vw - 32px))',
  margin: '0 auto',
  paddingTop: 120,
  color: 'var(--color-text-secondary)',
  fontSize: 14,
}

const stateTitleStyle: React.CSSProperties = {
  margin: '0 0 8px',
  color: 'var(--color-text-primary)',
  fontSize: 24,
}

const stateTextStyle: React.CSSProperties = {
  margin: 0,
  color: 'var(--color-text-secondary)',
  fontSize: 14,
  lineHeight: 1.5,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 38,
  borderRadius: 8,
  border: '1px solid var(--edge)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  fontSize: 13,
  fontFamily: 'inherit',
  padding: '0 10px',
  outline: 'none',
  boxSizing: 'border-box',
}

const inputWrapStyle: React.CSSProperties = {
  width: '100%',
  height: 38,
  borderRadius: 8,
  border: '1px solid var(--edge)',
  background: 'var(--color-surface)',
  boxSizing: 'border-box',
}

const iconButtonStyle: React.CSSProperties = {
  width: 30,
  height: 30,
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
  minHeight: 38,
  padding: '8px 12px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--color-brand)',
  color: '#fff',
  fontSize: 12,
  fontWeight: 750,
  fontFamily: 'inherit',
  cursor: 'pointer',
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

const noticeStyle: React.CSSProperties = {
  border: '1px solid var(--edge)',
  borderRadius: 8,
  padding: 10,
  fontSize: 12,
  marginBottom: 12,
}
