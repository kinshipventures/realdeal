

# Alpha Evolution: Workspaces + Multi-User Foundation

This is a large initiative. Here is a phased plan starting with the workspace foundation, which unblocks everything else.

## Phase 1: Workspace Schema + Data Isolation (this plan)

### Database Changes

**New tables:**

- `workspaces` - id, name, slug, created_at, updated_at
- `workspace_members` - id, workspace_id, user_id, role (owner/admin/member/viewer), created_at
- `profiles` - id (references auth.users), display_name, email, avatar_url, created_at

**Schema changes to existing tables:**

Add `workspace_id uuid NOT NULL` column to: `pods`, `contacts`, `categories`, `contact_pods`, `contact_categories`, `interactions`, `pipelines`, `pipeline_stages`, `opportunities`, `opportunity_contacts`, `campaigns`, `campaign_contacts`, `projects`, `project_contacts`, `project_opportunities`, `field_config`, `share_links`

**RLS policy update:**

Replace current `true` policies with workspace-scoped policies using a `is_workspace_member(workspace_id, auth.uid())` security definer function. Users can only access data in workspaces they belong to.

**Auto-provisioning trigger:**

On new user signup, create a default "Personal" workspace and add them as owner. Create a profile row.

### Data Layer Changes (`src/lib/supabase-data.ts`)

- Add workspace context: `getCurrentWorkspaceId()` reads from localStorage or context
- All queries add `.eq('workspace_id', workspaceId)` filter
- All inserts include `workspace_id`
- `getUserId()` unchanged

### New: Workspace Context (`src/contexts/WorkspaceContext.tsx`)

- `WorkspaceProvider` wraps the app inside `AuthProvider`
- Loads user's workspaces on auth, sets active workspace
- Exposes `activeWorkspace`, `workspaces`, `switchWorkspace(id)`
- Persists active workspace to localStorage

### New: Workspace Switcher UI

- Add workspace switcher to top of Sidebar (icon + name, dropdown to switch)
- "Create Workspace" option in dropdown
- "Invite to Workspace" in settings (email invite flow)

### Migration for Existing Data

- Create a migration that:
  1. Creates workspace tables
  2. Creates a default workspace for existing user (ID from `_migration_id_map`)
  3. Backfills `workspace_id` on all existing rows
  4. Makes `workspace_id` NOT NULL after backfill
  5. Updates RLS policies

## Phase 2: Full Rename Maps -> Pods (separate plan)

- Rename `/map` route to `/pods`
- Rename `OrbMap` component to `PodMap`
- Update sidebar, mobile nav, breadcrumbs
- Update hub-and-spoke icon

## Phase 3: Import Flow Polish (separate plan)

## Phase 4: Pipeline Polish (separate plan)

## Phase 5: Alpha Versioning + Domain (separate plan)

---

## Technical Details

### `is_workspace_member` function

```sql
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id
  )
$$;
```

### RLS policy pattern (applied to all data tables)

```sql
CREATE POLICY "workspace_access" ON public.pods
FOR ALL TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()))
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
```

### Files modified

- **New:** `src/contexts/WorkspaceContext.tsx`
- **New:** `src/components/nav/WorkspaceSwitcher.tsx`
- **Modified:** `src/lib/supabase-data.ts` - add workspace_id to all queries/inserts
- **Modified:** `src/main.tsx` - add WorkspaceProvider
- **Modified:** `src/components/nav/Sidebar.tsx` - add workspace switcher
- **Modified:** `src/components/auth/RequireAuth.tsx` - ensure workspace loaded
- **Modified:** `src/lib/csvImport.ts` - pass workspace_id on import
- **Modified:** `src/components/records/CreateRecordModal.tsx` - include workspace_id
- **Modified:** `src/components/contacts/AddContactModal.tsx` - include workspace_id
- **Modified:** `src/components/pods/PodCreateModal.tsx` - include workspace_id
- **Database migration:** ~18 tables updated with workspace_id + new tables + RLS

### Estimated scope

Phase 1 is the largest single change. Roughly 3-4 implementation messages to complete safely (schema migration, data layer, context/UI, backfill + RLS).

