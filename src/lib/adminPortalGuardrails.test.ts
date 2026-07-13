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

    expect(adminLoginPage).toContain("fetch('/api/admin/me'")
    expect(adminLoginPage).toContain("credentials: 'include'")
    expect(adminLoginPage).toContain("adminrealdeal@admin.com")
    expect(adminLoginPage).toContain('admin-auth-shell')
    expect(adminLoginPage).toContain('Sign in')
    expect(adminLoginPage).not.toContain('Continue with Google')

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

  it('keeps the visible admin navigation focused on users and waitlist only', () => {
    const adminPage = read('src/components/admin/AdminPage.tsx')

    expect(adminPage).toContain("setTab('users')")
    expect(adminPage).toContain("setTab('waitlist')")
    expect(adminPage).toContain('Sign out')
    expect(adminPage).not.toContain('Audit')
    expect(adminPage).not.toContain('Refresh')
    expect(adminPage).not.toContain('/api/admin/audit')
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
    expect(usersApi).toContain("admin.rpc('admin_purge_user_owned_storage'")
    expect(usersApi).toContain('targetId: null')
    expect(usersApi).not.toContain("delete({ count: 'exact' }).eq('created_by', userId)")
    expect(usersApi).not.toContain('confirmed_email: normalizeAdminEmail(confirmEmail)')
  })

  it('limits admin account purge to the target user, incoming access, and owned workspaces', () => {
    const migration = read('supabase/migrations/20260712213000_admin_account_purge_guardrails.sql')

    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.admin_purge_user_owned_storage')
    expect(migration).toContain("auth.role() <> 'service_role'")
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.admin_purge_user_owned_storage(uuid, text) FROM anon')
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.admin_purge_user_owned_storage(uuid, text) FROM authenticated')
    expect(migration).toContain('WHERE user_id = target_user_id')
    expect(migration).toContain("AND role = 'owner'::public.workspace_role")
    expect(migration).toContain("subject_type = 'user'")
    expect(migration).toContain('subject_id = target_user_id::text')
    expect(migration).toContain('WHERE id = ANY(owned_workspace_ids)')
    expect(migration).not.toContain('DELETE FROM public.collaboration_access_grants\n  WHERE created_by = target_user_id')
    expect(migration).not.toContain('DELETE FROM public.collaboration_public_campaign_links\n  WHERE created_by = target_user_id')
    expect(migration).not.toContain('DELETE FROM public.collaboration_approval_requests\n  WHERE requested_by = target_user_id')
  })

  it('keeps Gmail activity locked except during scoped admin account purge', () => {
    const migration = read('supabase/migrations/20260712213000_admin_account_purge_guardrails.sql')

    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.prevent_gmail_interaction_changes')
    expect(migration).toContain("current_setting('realdeal.admin_account_purge_user_id', true)")
    expect(migration).toContain("current_setting('realdeal.admin_account_purge_workspace_ids', true)")
    expect(migration).toContain('OLD.workspace_id::text = ANY(purge_workspace_ids)')
    expect(migration).toContain("RAISE EXCEPTION 'Gmail interactions cannot be deleted'")
    expect(migration).toContain("RAISE EXCEPTION 'Gmail interactions cannot be edited'")
    expect(migration).toContain("AND source = 'Gmail'::public.interaction_source")
  })

  it('does not store personal admin credentials in admin source', () => {
    for (const relativePath of ['api/_lib/admin.ts', 'api/admin/me.ts', 'src/components/admin/AdminPage.tsx', 'src/components/admin/AdminLoginPage.tsx']) {
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
