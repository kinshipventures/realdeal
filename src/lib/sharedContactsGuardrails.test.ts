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
})
