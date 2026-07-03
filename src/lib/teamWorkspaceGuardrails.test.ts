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

    expect(app).toContain('import { WorkspaceChoiceGate }')
    expect(app).toContain('<WorkspaceChoiceGate />')
    expect(choiceGate).toContain('Select a workspace')
    expect(choiceGate).toContain('Use personal account')
    expect(choiceGate).toContain('Full access team workspace')
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

    expect(accountPage).toContain('Invitations for you')
    expect(accountPage).toContain('handleAcceptIncomingInvite')
    expect(accountPage).toContain('handleDeclineIncomingInvite')
    expect(dataLayer).toContain('fetchIncomingWorkspaceInvites')
    expect(dataLayer).toContain('acceptWorkspaceInvite')
    expect(migration).toContain('invites_view_incoming')
    expect(migration).toContain('workspace_invited_user_read')
  })
})
