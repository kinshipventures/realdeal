import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(filePath: string) {
  return readFileSync(resolve(process.cwd(), filePath), 'utf8')
}

describe('Team workspace guardrails', () => {
  it('keeps team workspaces as full-access member workspaces', () => {
    const migration = source('supabase/migrations/20260703183000_team_workspace_full_access_activity.sql')
    const accountPage = source('src/components/settings/AccountPage.tsx')

    expect(migration).toContain('SELECT public.is_workspace_member(_workspace_id, _user_id);')
    expect(accountPage).toContain('Team members can choose this workspace at sign-in')
    expect(accountPage).toContain('Full access')
    expect(accountPage).not.toContain('setInviteRole')
    expect(accountPage).not.toContain('handleRoleChange')
  })

  it('keeps the workspace choice gate wired after login', () => {
    const app = source('src/App.tsx')
    const choiceGate = source('src/components/workspace/WorkspaceChoiceGate.tsx')
    const accountPage = source('src/components/settings/AccountPage.tsx')

    expect(app).toContain('import { WorkspaceChoiceGate }')
    expect(app).toContain('import { useWorkspace }')
    expect(app).toContain('<WorkspaceChoiceGate />')
    expect(app).toContain('workspaceLoading || !activeWorkspace')
    expect(choiceGate).toContain('Choose account to use')
    expect(choiceGate).toContain('Select exactly one account for this session')
    expect(choiceGate).toContain('Use account of')
    expect(choiceGate).toContain('realdeal:workspace-choice-confirmed:')
    expect(choiceGate).toContain('last_sign_in_at')
    expect(choiceGate).not.toContain('Cancel')
    expect(accountPage).toContain('Active workspace')
    expect(accountPage).toContain('Real Deal loads one workspace at a time')
    expect(accountPage).toContain('Use account of')
    expect(accountPage).toContain('switchWorkspace(workspaceId)')
  })

  it('keeps core app reads scoped to the active workspace', () => {
    const dataLayer = source('src/lib/supabase-data.ts')

    expect(dataLayer).toMatch(/from\('pods'\)\.select\('\*'\)\.eq\('workspace_id', wsId\)/)
    expect(dataLayer).toMatch(/from\('categories'\)\.select\('\*'\)\.eq\('workspace_id', wsId\)/)
    expect(dataLayer).toMatch(/from\('contacts'\)\.select\('\*'\)\.eq\('workspace_id', wsId\)/)
    expect(dataLayer).toMatch(/from\('interactions'\)\.select\('\*'\)\s*\.eq\('workspace_id', wsId\)/)
    expect(dataLayer).toMatch(/from\('campaigns'\)\.select\('\*'\)\.eq\('workspace_id', wsId\)/)
    expect(dataLayer).toMatch(/from\('campaign_contacts'\)\.select\('\*'\)\.eq\('workspace_id', wsId\)/)
    expect(dataLayer).toMatch(/from\('campaign_stages'\)\.select\('\*'\)\.eq\('workspace_id', wsId\)/)
    expect(dataLayer).toContain('workspaceId: _podsCacheWorkspaceId')
    expect(dataLayer).toContain('workspaceId: _contactsCacheWorkspaceId')
    expect(dataLayer).toContain('cacheMatchesWorkspace')
    expect(dataLayer).toContain('setCache(null, null, workspaceId)')
  })

  it('keeps team activity visible and filterable from Settings Team', () => {
    const accountPage = source('src/components/settings/AccountPage.tsx')
    const activity = source('src/lib/workspaceActivity.ts')

    expect(accountPage).toContain('Activity record')
    expect(accountPage).toContain('All members')
    expect(accountPage).toContain('WORKSPACE_ACTIVITY_ENTITY_OPTIONS')
    expect(accountPage).toContain('WORKSPACE_ACTIVITY_ACTION_OPTIONS')
    expect(activity).toContain("{ value: 'campaign_contact', label: 'Campaign contacts' }")
    expect(activity).toContain("{ value: 'interaction', label: 'Touchpoints' }")
    expect(activity).toContain("{ value: 'workspace_member', label: 'Team members' }")
  })

  it('keeps incoming team invites available from Settings Team', () => {
    const accountPage = source('src/components/settings/AccountPage.tsx')
    const dataLayer = source('src/lib/supabase-data.ts')
    const migration = source('supabase/migrations/20260703211500_team_incoming_invites.sql')
    const senderMigration = source('supabase/migrations/20260703224500_team_invite_sender_profiles.sql')

    expect(accountPage).toContain('Invitations for you')
    expect(accountPage).toContain('Workspace invitation')
    expect(accountPage).toContain('From {inviterLabel}')
    expect(accountPage).toContain('handleAcceptIncomingInvite')
    expect(accountPage).toContain('handleDeclineIncomingInvite')
    expect(dataLayer).toContain('fetchIncomingWorkspaceInvites')
    expect(dataLayer).toContain('invited_by_display_name')
    expect(dataLayer).toContain('invited_by_email')
    expect(dataLayer).toContain('acceptWorkspaceInvite')
    expect(migration).toContain('invites_view_incoming')
    expect(migration).toContain('workspace_invited_user_read')
    expect(senderMigration).toContain('profiles_read_workspace_invite_sender')
  })
})
