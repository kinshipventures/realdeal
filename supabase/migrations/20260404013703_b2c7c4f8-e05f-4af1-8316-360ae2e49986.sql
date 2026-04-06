
-- 1. Add workspace_id to companies (nullable first)
ALTER TABLE public.companies ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id);

-- Backfill: match via user's workspace membership
UPDATE public.companies c
SET workspace_id = (
  SELECT wm.workspace_id FROM public.workspace_members wm
  WHERE wm.user_id = c.user_id LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM public.workspace_members wm WHERE wm.user_id = c.user_id
);

-- Backfill orphans: assign to workspace of user who owns related contacts
UPDATE public.companies c
SET workspace_id = (
  SELECT ct.workspace_id FROM public.contacts ct
  WHERE ct.company_id = c.id LIMIT 1
)
WHERE c.workspace_id IS NULL
AND EXISTS (SELECT 1 FROM public.contacts ct WHERE ct.company_id = c.id);

-- Final fallback: assign remaining orphans to first workspace
UPDATE public.companies c
SET workspace_id = (SELECT id FROM public.workspaces LIMIT 1)
WHERE c.workspace_id IS NULL;

-- Now make NOT NULL
ALTER TABLE public.companies ALTER COLUMN workspace_id SET NOT NULL;

-- Drop old permissive policy
DROP POLICY IF EXISTS "companies_authenticated" ON public.companies;

-- Add workspace-scoped RLS
CREATE POLICY "companies_workspace" ON public.companies
FOR ALL TO authenticated
USING (is_workspace_member(workspace_id, auth.uid()))
WITH CHECK (is_workspace_member(workspace_id, auth.uid()));

-- 2. Fix _migration_id_map RLS
DROP POLICY IF EXISTS "_migration_id_map_workspace" ON public._migration_id_map;

CREATE POLICY "_migration_id_map_owner" ON public._migration_id_map
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3. Add UPDATE policy on workspace_members
CREATE POLICY "workspace_members_update" ON public.workspace_members
FOR UPDATE TO authenticated
USING (is_workspace_member(workspace_id, auth.uid()))
WITH CHECK (is_workspace_member(workspace_id, auth.uid()));

-- 4. Create invites table
CREATE TABLE public.workspace_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.workspace_role NOT NULL DEFAULT 'member',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by uuid NOT NULL,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, email)
);

ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invites_view" ON public.workspace_invites
FOR SELECT TO authenticated
USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "invites_create" ON public.workspace_invites
FOR INSERT TO authenticated
WITH CHECK (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "invites_accept" ON public.workspace_invites
FOR UPDATE TO authenticated
USING (lower(email) = lower(auth.email()))
WITH CHECK (lower(email) = lower(auth.email()));

CREATE POLICY "invites_delete" ON public.workspace_invites
FOR DELETE TO authenticated
USING (is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER update_workspace_invites_updated_at
BEFORE UPDATE ON public.workspace_invites
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
