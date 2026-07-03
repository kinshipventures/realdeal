import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './AuthContext'
import { setActiveWorkspaceId, clearActiveWorkspaceId } from '@/lib/workspace'
import { invalidateAllCaches } from '@/lib/supabase-data'
import { ensureWorkspaceBaseline } from '@/lib/defaultWorkspace'

export interface Workspace {
  id: string
  name: string
  slug: string
  role: 'owner' | 'admin' | 'member'
  created_at: string
  account_email: string | null
  account_label: string | null
}

interface WorkspaceContextValue {
  workspaces: Workspace[]
  activeWorkspace: Workspace | null
  loading: boolean
  switchWorkspace: (id: string) => void
  createWorkspace: (name: string) => Promise<Workspace>
  refreshWorkspaces: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaces: [],
  activeWorkspace: null,
  loading: true,
  switchWorkspace: () => {},
  createWorkspace: async () => { throw new Error('No provider') },
  refreshWorkspaces: async () => {},
})

const STORAGE_KEY = 'realdeal:active-workspace'

export function resolveActiveWorkspace(workspaces: Workspace[], storedId: string | null): Workspace | null {
  if (storedId) {
    const storedMatch = workspaces.find(w => w.id === storedId)
    if (storedMatch) return storedMatch
  }
  return workspaces[0] ?? null
}

export function deriveWorkspaceName(email?: string | null): string {
  const local = (email ?? '').split('@')[0]?.trim() ?? ''
  if (!local) return 'My Team'

  const cleaned = local
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) return 'My Team'

  const titled = cleaned
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

  return `${titled}'s Team`
}

export async function bootstrapWorkspaceForUser(userId: string, email?: string | null, preferredName?: string): Promise<Workspace> {
  const name = preferredName?.trim() || deriveWorkspaceName(email)
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`
  const { data: ws, error: wsErr } = await supabase.from('workspaces').insert({ name, slug }).select().single()
  if (wsErr) throw wsErr

  const { error: memErr } = await supabase.from('workspace_members').insert({
    workspace_id: ws.id,
    user_id: userId,
    role: 'owner',
  })
  if (memErr) throw memErr

  await ensureWorkspaceBaseline(userId, ws.id)

  return { id: ws.id, name: ws.name, slug: ws.slug, role: 'owner', created_at: ws.created_at, account_email: email ?? null, account_label: null }
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)

  const loadWorkspaces = useCallback(async () => {
    if (!session?.user?.id) { setLoading(false); return }
    const { data, error } = await supabase
      .from('workspace_members')
      .select('workspace_id, role, workspaces:workspace_id(id, name, slug, created_at)')
      .eq('user_id', session.user.id)

    if (error) { console.error('Failed to load workspaces:', error); setLoading(false); return }

    const mapped: Workspace[] = (data ?? []).map((row: any) => ({
      id: row.workspaces.id,
      name: row.workspaces.name,
      slug: row.workspaces.slug,
      role: row.role,
      created_at: row.workspaces.created_at,
      account_email: null,
      account_label: null,
    }))

    const hydrated = mapped.length > 0
      ? mapped
      : [await bootstrapWorkspaceForUser(session.user.id, session.user.email)]

    const workspaceIds = hydrated.map(workspace => workspace.id)
    const ownerProfilesByWorkspaceId = new Map<string, { display_name: string | null; email: string | null }>()
    if (workspaceIds.length > 0) {
      const { data: owners, error: ownersError } = await supabase
        .from('workspace_members')
        .select('workspace_id, user_id')
        .in('workspace_id', workspaceIds)
        .eq('role', 'owner')
      if (ownersError) {
        console.error('Failed to load workspace owners:', ownersError)
      } else {
        const ownerRows = (owners ?? []) as { workspace_id: string; user_id: string }[]
        const ownerUserIds = [...new Set(ownerRows.map(owner => owner.user_id).filter(Boolean))]
        const profilesById = new Map<string, { display_name: string | null; email: string | null }>()
        if (ownerUserIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, display_name, email')
            .in('id', ownerUserIds)
          if (profilesError) {
            console.error('Failed to load workspace owner profiles:', profilesError)
          } else {
            for (const profile of (profiles ?? []) as { id: string; display_name: string | null; email: string | null }[]) {
              profilesById.set(profile.id, { display_name: profile.display_name, email: profile.email })
            }
          }
        }

        for (const owner of ownerRows) {
          if (ownerProfilesByWorkspaceId.has(owner.workspace_id)) continue
          const profile = profilesById.get(owner.user_id)
          ownerProfilesByWorkspaceId.set(owner.workspace_id, {
            display_name: profile?.display_name ?? null,
            email: profile?.email ?? null,
          })
        }
      }
    }

    const labeledWorkspaces = hydrated.map(workspace => {
      const ownerProfile = ownerProfilesByWorkspaceId.get(workspace.id)
      return {
        ...workspace,
        account_email: workspace.role === 'owner'
          ? session.user.email ?? ownerProfile?.email ?? null
          : ownerProfile?.email ?? null,
        account_label: ownerProfile?.display_name ?? null,
      }
    })

    await Promise.all(labeledWorkspaces.map(workspace =>
      ensureWorkspaceBaseline(session.user.id, workspace.id).catch(error => {
        console.error('Failed to seed workspace baseline:', error)
      })
    ))
    invalidateAllCaches()

    setWorkspaces(labeledWorkspaces)

    const stored = localStorage.getItem(STORAGE_KEY)
    const active = resolveActiveWorkspace(labeledWorkspaces, stored)
    if (active) {
      setActiveWorkspace(active)
      setActiveWorkspaceId(active.id)
    }
    setLoading(false)
  }, [session?.user?.email, session?.user?.id])

  useEffect(() => { loadWorkspaces() }, [loadWorkspaces])

  const switchWorkspace = useCallback((id: string) => {
    const ws = workspaces.find(w => w.id === id)
    if (ws) {
      invalidateAllCaches()
      setActiveWorkspace(ws)
      setActiveWorkspaceId(ws.id)
    }
  }, [workspaces])

  const createWorkspace = useCallback(async (name: string): Promise<Workspace> => {
    if (!session?.user?.id) throw new Error('Not authenticated')
    const workspace = await bootstrapWorkspaceForUser(session.user.id, session.user.email, name)
    setWorkspaces(prev => [...prev, workspace])
    switchWorkspace(workspace.id)
    return workspace
  }, [session?.user?.email, session?.user?.id, switchWorkspace])

  useEffect(() => {
    if (!session) {
      setWorkspaces([])
      setActiveWorkspace(null)
      clearActiveWorkspaceId()
      setLoading(false)
    }
  }, [session])

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, loading, switchWorkspace, createWorkspace, refreshWorkspaces: loadWorkspaces }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export const useWorkspace = () => useContext(WorkspaceContext)
