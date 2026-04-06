
-- 1. Create is_workspace_admin helper (owner or admin)
CREATE OR REPLACE FUNCTION public.is_workspace_admin(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id
      AND user_id = _user_id
      AND role IN ('owner', 'admin')
  );
$$;

-- 2. Fix workspace_members policies
DROP POLICY IF EXISTS workspace_members_manage ON public.workspace_members;
CREATE POLICY "workspace_members_manage" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (is_workspace_admin(workspace_id, auth.uid()));

DROP POLICY IF EXISTS workspace_members_update ON public.workspace_members;
CREATE POLICY "workspace_members_update" ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (is_workspace_admin(workspace_id, auth.uid()))
  WITH CHECK (is_workspace_admin(workspace_id, auth.uid()));

DROP POLICY IF EXISTS workspace_members_delete ON public.workspace_members;
CREATE POLICY "workspace_members_delete" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_workspace_admin(workspace_id, auth.uid()));

-- 3. Fix workspace_invites policies
DROP POLICY IF EXISTS invites_create ON public.workspace_invites;
CREATE POLICY "invites_create" ON public.workspace_invites
  FOR INSERT TO authenticated
  WITH CHECK (is_workspace_admin(workspace_id, auth.uid()));

DROP POLICY IF EXISTS invites_delete ON public.workspace_invites;
CREATE POLICY "invites_delete" ON public.workspace_invites
  FOR DELETE TO authenticated
  USING (is_workspace_admin(workspace_id, auth.uid()));

-- 4. Fix profiles_read cross-tenant exposure
DROP POLICY IF EXISTS profiles_read ON public.profiles;
CREATE POLICY "profiles_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm1
      JOIN public.workspace_members wm2
        ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid()
        AND wm2.user_id = profiles.id
    )
  );

-- 5. Fix share_links anon policy - require token match via RPC
DROP POLICY IF EXISTS "Anyone can view valid share links by token" ON public.share_links;

-- Anon users must filter by token; without a token= filter, no rows returned
-- We use a restrictive approach: the client must supply .eq('token', value)
-- The policy checks the token is not null (always true for valid rows)
-- and that the link is active. The actual filtering by token happens at query level.
-- To truly restrict enumeration, we create an RPC instead.

CREATE OR REPLACE FUNCTION public.get_share_link_by_token(_token text)
RETURNS SETOF public.share_links
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.share_links
  WHERE token = _token
    AND revoked_at IS NULL
    AND expires_at > now();
$$;

-- 6. Fix workspaces INSERT policy
DROP POLICY IF EXISTS workspace_create ON public.workspaces;
CREATE POLICY "workspace_create" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (true);
