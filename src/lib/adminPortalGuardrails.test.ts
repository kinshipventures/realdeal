import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readJsonBody } from '../../api/_lib/http'

const root = process.cwd()

function read(relativePath: string) {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

describe('admin portal guardrails', () => {
  it('keeps the admin route isolated from the normal app shell', () => {
    const app = read('src/App.tsx')

    expect(app).toContain("path=\"admin\"")
    expect(app).toContain("import('./components/admin/AdminPage')")
    expect(app.indexOf('path="admin"')).toBeLessThan(app.indexOf('<Route element={<AppShell />}>'))

    const possibleSidebarPaths = [
      'src/components/layout/AppSidebar.tsx',
      'src/components/nav/Sidebar.tsx',
      'src/components/AppSidebar.tsx',
    ]
    for (const relativePath of possibleSidebarPaths) {
      const fullPath = resolve(root, relativePath)
      if (existsSync(fullPath)) {
        expect(read(relativePath)).not.toContain('/admin')
      }
    }
  })

  it('requires platform admin access on every admin API', () => {
    for (const relativePath of ['api/admin/me.ts', 'api/admin/users.ts', 'api/admin/waitlist.ts', 'api/admin/audit.ts']) {
      expect(read(relativePath)).toContain('requirePlatformAdmin')
    }
  })

  it('protects permanent account deletion behind preview, exact confirmation, and self-delete guard', () => {
    const usersApi = read('api/admin/users.ts')

    expect(usersApi).toContain('delete_preview')
    expect(usersApi).toContain('delete_confirm')
    expect(usersApi).toContain('confirm_email')
    expect(usersApi).toContain('targetUserId === user.id')
    expect(usersApi).toContain('Email confirmation does not match')
    expect(usersApi).toContain('It does not delete contacts owned by other users')
  })

  it('keeps waitlist signups stored without creating users automatically', () => {
    const waitlistEndpoint = read('api/waitlist.ts')
    const waitlistHook = read('src/components/waitlist/useWaitlistSubmit.ts')
    const adminWaitlist = read('api/admin/waitlist.ts')

    expect(waitlistEndpoint).toContain("from('waitlist_entries')")
    expect(waitlistEndpoint).toContain("status: 'pending'")
    expect(waitlistEndpoint).not.toContain('inviteUserByEmail')
    expect(waitlistEndpoint).not.toContain('createUser')

    expect(waitlistHook).toContain("fetch('/api/waitlist'")
    expect(adminWaitlist).toContain('approve_waitlist_entry')
    expect(adminWaitlist).toContain('deny_waitlist_entry')
    expect(adminWaitlist).toContain('inviteUserByEmail')
  })

  it('does not let malformed request bodies crash waitlist parsing', async () => {
    const request = {}
    Object.defineProperty(request, 'body', {
      get() {
        throw new Error('Invalid JSON')
      },
    })

    await expect(readJsonBody(request)).resolves.toEqual({})
  })

  it('stores admin-only data in service-role tables with RLS enabled', () => {
    const migration = read('supabase/migrations/20260712143000_admin_portal_foundation.sql')

    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.platform_admins')
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.waitlist_entries')
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.admin_audit_events')
    expect(migration).toContain('ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY')
    expect(migration).toContain('ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY')
    expect(migration).toContain('ALTER TABLE public.admin_audit_events ENABLE ROW LEVEL SECURITY')
  })
})
