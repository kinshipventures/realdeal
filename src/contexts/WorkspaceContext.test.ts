import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bootstrapWorkspaceForUser, deriveWorkspaceName, resolveActiveWorkspace, type Workspace } from './WorkspaceContext'
import { supabase } from '@/integrations/supabase/client'
import { ensureWorkspaceBaseline } from '@/lib/defaultWorkspace'

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('@/lib/defaultWorkspace', () => ({
  ensureWorkspaceBaseline: vi.fn().mockResolvedValue(undefined),
}))

describe('Workspace helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prefers the stored workspace when present', () => {
    const workspaces: Workspace[] = [
      { id: 'ws-1', name: 'Alpha', slug: 'alpha', role: 'owner', created_at: '2026-04-15T00:00:00.000Z' },
      { id: 'ws-2', name: 'Beta', slug: 'beta', role: 'member', created_at: '2026-04-15T00:00:00.000Z' },
    ]

    expect(resolveActiveWorkspace(workspaces, 'ws-2')?.name).toBe('Beta')
    expect(resolveActiveWorkspace(workspaces, 'missing')?.name).toBe('Alpha')
    expect(resolveActiveWorkspace([], null)).toBeNull()
  })

  it('derives a starter workspace name from email', () => {
    expect(deriveWorkspaceName('systemsstrategist@withtrolley.ai')).toBe("Systemsstrategist's Team")
    expect(deriveWorkspaceName('gabriel.murray@withtrolley.ai')).toBe("Gabriel Murray's Team")
    expect(deriveWorkspaceName(null)).toBe('My Team')
  })

  it('bootstraps a first workspace and owner membership', async () => {
    const selectSingle = vi.fn().mockResolvedValue({
      data: { id: 'ws-123', name: "Systemsstrategist's Team", slug: 'systemsstrategist-s-team-abc', created_at: '2026-04-15T00:00:00.000Z' },
      error: null,
    })
    const insertMembership = vi.fn().mockResolvedValue({ error: null })
    const insertWorkspace = vi.fn().mockReturnValue({ select: () => ({ single: selectSingle }) })
    const from = vi.mocked(supabase.from)

    from.mockImplementation((table: string) => {
      if (table === 'workspaces') return { insert: insertWorkspace } as never
      if (table === 'workspace_members') return { insert: insertMembership } as never
      throw new Error(`Unexpected table: ${table}`)
    })

    const workspace = await bootstrapWorkspaceForUser('user-123', 'systemsstrategist@withtrolley.ai')

    expect(insertWorkspace).toHaveBeenCalledTimes(1)
    expect(insertWorkspace).toHaveBeenCalledWith(expect.objectContaining({
      name: "Systemsstrategist's Team",
    }))
    expect(insertMembership).toHaveBeenCalledWith({
      workspace_id: 'ws-123',
      user_id: 'user-123',
      role: 'owner',
    })
    expect(ensureWorkspaceBaseline).toHaveBeenCalledWith('user-123', 'ws-123')
    expect(workspace).toEqual({
      id: 'ws-123',
      name: "Systemsstrategist's Team",
      slug: 'systemsstrategist-s-team-abc',
      role: 'owner',
      created_at: '2026-04-15T00:00:00.000Z',
    })
  })
})
