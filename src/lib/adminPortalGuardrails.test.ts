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

    expect(app).toContain("path=\"admin-login\"")
    expect(app).toContain("path=\"admin\"")
    expect(app).toContain("import('./components/admin/AdminLoginPage')")
    expect(app).toContain("import('./components/admin/AdminPage')")
    expect(app.indexOf('path="admin"')).toBeLessThan(app.indexOf('<Route element={<AppShell />}>'))
    expect(app.indexOf('path="admin"')).toBeLessThan(app.indexOf('<Route element={<RequireAuth />}>'))

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

  it('keeps admin auth separate from normal app auth', () => {
    const adminPage = read('src/components/admin/AdminPage.tsx')
    const adminLoginPage = read('src/components/admin/AdminLoginPage.tsx')
    const adminHelper = read('api/_lib/admin.ts')

    expect(adminPage).not.toContain('useAuth')
    expect(adminPage).not.toContain('session.access_token')
    expect(adminPage).not.toContain('Authorization')
    expect(adminPage).not.toContain('Back to app')
    expect(adminPage).toContain("credentials: 'include'")

    expect(adminLoginPage).toContain("fetch('/api/admin/login'")
    expect(adminLoginPage).toContain("credentials: 'include'")
    expect(adminLoginPage).toContain("adminrealdeal@admin.com")

    expect(adminHelper).not.toContain('requireUser')
    expect(adminHelper).not.toContain('REALDEAL_ADMIN_EMAILS')
    expect(adminHelper).toContain('REALDEAL_ADMIN_EMAIL')
    expect(adminHelper).toContain('REALDEAL_ADMIN_PASSWORD_HASH')
    expect(adminHelper).toContain('ADMIN_SESSION_SECRET')
    expect(adminHelper).toContain('HttpOnly')
    expect(adminHelper).toContain('SameSite=Strict')
    expect(adminHelper).toContain('createHmac')
    expect(adminHelper).toContain('pbkdf2Sync')
  })

  it('requires isolated admin session access on every protected admin API', () => {
    for (const relativePath of ['api/admin/me.ts', 'api/admin/users.ts', 'api/admin/waitlist.ts', 'api/admin/audit.ts']) {
      const api = read(relativePath)
      expect(api).toContain('requireAdminSession')
      expect(api).not.toContain('requirePlatformAdmin')
      expect(api).not.toContain('requireUser')
    }
  })

  it('protects permanent account deletion behind preview, exact confirmation, and self-delete guard', () => {
    const usersApi = read('api/admin/users.ts')

    expect(usersApi).toContain('delete_preview')
    expect(usersApi).toContain('delete_confirm')
    expect(usersApi).toContain('confirm_email')
    expect(usersApi).toContain('protectedAdminEmail')
    expect(usersApi).toContain('Email confirmation does not match')
    expect(usersApi).toContain('It does not delete contacts owned by other users')
  })

  it('does not store personal admin credentials in admin source', () => {
    for (const relativePath of ['api/_lib/admin.ts', 'api/admin/login.ts', 'src/components/admin/AdminPage.tsx', 'src/components/admin/AdminLoginPage.tsx']) {
      const source = read(relativePath).toLowerCase()
      expect(source).not.toContain('juan.zuluaga')
      expect(source).not.toContain('withtrolley')
      expect(source).not.toContain('gmail.com')
    }
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
