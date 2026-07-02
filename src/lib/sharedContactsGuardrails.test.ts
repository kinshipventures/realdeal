import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(filePath: string) {
  return readFileSync(resolve(process.cwd(), filePath), 'utf8')
}

describe('Shared contacts guardrails', () => {
  it('keeps connection notifications wired into the app shell', () => {
    const app = source('src/App.tsx')

    expect(app).toContain("import { getUserConnections } from './lib/connections'")
    expect(app).toContain('summarizeConnectionNotifications')
    expect(app).toContain('readConnectionNotificationState')
    expect(app).toContain('writeConnectionNotificationState')
    expect(app).toContain('window.setInterval(refresh, 15000)')
    expect(app).toContain('window.addEventListener(CONNECTIONS_CHANGED_EVENT, refresh)')
    expect(app).toContain('document.addEventListener(\'visibilitychange\', handleVisibilityChange)')
    expect(app).toContain('sharedContactsBadgeCount={sharedContactsBadge.count}')
    expect(app).toContain('<Route path="shared" element={<Navigate to="/approvals" replace />} />')
  })

  it('keeps Shared contacts refreshing when users invite, accept, decline, or remove connections', () => {
    const approvalsPage = source('src/components/approvals/ApprovalsPage.tsx')

    expect(approvalsPage).toContain("import { CONNECTIONS_CHANGED_EVENT } from '@/lib/connectionNotifications'")
    expect(approvalsPage).toContain('const intervalId = window.setInterval(() => {')
    expect(approvalsPage).toContain('const nextConnections = await getUserConnections()')
    expect(approvalsPage).toContain('await createUserConnectionRequest(email)')
    expect(approvalsPage).toContain('await respondUserConnection(connection.id, status)')
    expect(approvalsPage.match(/window\.dispatchEvent\(new Event\(CONNECTIONS_CHANGED_EVENT\)\)/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('keeps the Shared contacts sidebar badge visible and accessible', () => {
    const sidebar = source('src/components/nav/Sidebar.tsx')

    expect(sidebar).toContain('sharedContactsBadgeCount?: number')
    expect(sidebar).toContain('sharedContactsBadgeLabel?: string')
    expect(sidebar).toContain('badgeCount={sharedContactsBadgeCount}')
    expect(sidebar).toContain('aria-label={badgeLabel ? `${label}: ${badgeLabel}` : label}')
    expect(sidebar).toContain("{badgeCount > 99 ? '99+' : badgeCount}")
  })

  it('keeps trusted-user RPC contracts intact', () => {
    const connections = source('src/lib/connections.ts')

    expect(connections).toContain("db.rpc('get_user_connections')")
    expect(connections).toContain("db.rpc('create_user_connection_request', { target_email: targetEmail })")
    expect(connections).toContain("db.rpc('respond_user_connection'")
    expect(connections).toContain('connection_id: connectionId')
    expect(connections).toContain('next_status: status')
    expect(connections).toContain("db.rpc('find_app_users_for_contact_emails', { contact_emails: contactEmails })")
  })

  it('keeps Share contacts searchable and field-personalized without changing grant storage scopes', () => {
    const approvalsPage = source('src/components/approvals/ApprovalsPage.tsx')
    const visibleFields = source('src/lib/sharedContactVisibleFields.ts')

    expect(approvalsPage).toContain('const [resourceSearch, setResourceSearch] = useState')
    expect(approvalsPage).toContain('placeholder="Search contacts, pods, sub-pods, companies, or campaigns"')
    expect(approvalsPage).toContain('SHARED_CONTACT_VISIBLE_FIELD_GROUPS.map')
    expect(approvalsPage).toContain('deriveSharedContactFieldScopes(selectedVisibleFieldIds)')
    expect(visibleFields).toContain('export const SHARED_CONTACT_VISIBLE_FIELD_GROUPS')
    expect(visibleFields).toContain("scope: 'public_profile'")
    expect(visibleFields).toContain("scope: 'private_contact'")
    expect(visibleFields).toContain("scope: 'relationship_private'")
    expect(visibleFields).toContain("scope: 'investment_private'")
    expect(visibleFields).toContain("scope: 'campaign_private'")
  })

  it('keeps incoming shared-contact requests visible and actionable for recipients', () => {
    const approvalsPage = source('src/components/approvals/ApprovalsPage.tsx')
    const collaboration = source('src/lib/collaboration.ts')
    const migration = source('supabase/migrations/20260701142000_incoming_shared_contact_requests.sql')
    const responseFixMigration = source('supabase/migrations/20260702033000_fix_shared_request_response_rpc.sql')

    expect(collaboration).toContain("db.rpc('get_incoming_collaboration_access_grants')")
    expect(collaboration).toContain("db.rpc('respond_incoming_collaboration_access_grant'")
    expect(collaboration).toContain("db.rpc('get_shared_contacts_with_me')")
    expect(approvalsPage).toContain("type ApprovalTab = 'requests' | 'proposals' | 'shared_requests'")
    expect(approvalsPage).toContain('label="Shared requests"')
    expect(approvalsPage).toContain('busyRequestId={busySharedRequestId}')
    expect(approvalsPage).toContain('highlightedRequestId={highlightedSharedRequestId}')
    expect(approvalsPage).toContain('<SharedRequestFeedbackBanner key={sharedRequestFeedback.id} feedback={sharedRequestFeedback} />')
    expect(approvalsPage).toContain('setSearchText(grant.resource_label)')
    expect(approvalsPage).toContain("sharedContactManagerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })")
    expect(approvalsPage).toContain('status: shareByEmail ? \'pending\' : \'accepted\'')
    expect(approvalsPage).toContain('subject_email: shareByEmail ? normalizedRecipientEmail : null')
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.get_incoming_collaboration_access_grants()')
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.respond_incoming_collaboration_access_grant')
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.get_shared_contacts_with_me()')
    expect(migration).toContain('contacts.pod_ids::text[]')
    expect(migration).toContain('contacts.category_ids::text[]')
    expect(migration).toContain('contacts.company_ids::text[]')
    expect(migration).toContain('shared_contacts.pod_ids::text[]')
    expect(migration).toContain('shared_contacts.category_ids::text[]')
    expect(migration).toContain('shared_contacts.company_ids::text[]')
    expect(migration).toContain(') || jsonb_build_object(')
    expect(responseFixMigration).toContain('CREATE OR REPLACE FUNCTION public.respond_incoming_collaboration_access_grant')
    expect(responseFixMigration).toContain('target_grant.subject_id')
    expect(responseFixMigration).toContain('target_grant.subject_email')
    expect(responseFixMigration).toContain('target_grant.subject_label')
    expect(responseFixMigration).toContain('WHERE grants.id = target_grant.id')
    expect(responseFixMigration).toContain('GRANT EXECUTE ON FUNCTION public.respond_incoming_collaboration_access_grant(uuid, text) TO authenticated')
  })
})
