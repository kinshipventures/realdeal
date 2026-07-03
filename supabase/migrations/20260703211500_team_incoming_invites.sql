-- Let team invite recipients see and decline their own pending invites.
-- Team owners/members keep the existing outgoing invite management policies.

DROP POLICY IF EXISTS "invites_view_incoming" ON public.workspace_invites;
CREATE POLICY "invites_view_incoming"
  ON public.workspace_invites
  FOR SELECT TO authenticated
  USING (
    accepted_at IS NULL
    AND lower(email) = lower(auth.email())
  );

DROP POLICY IF EXISTS "invites_decline_incoming" ON public.workspace_invites;
CREATE POLICY "invites_decline_incoming"
  ON public.workspace_invites
  FOR DELETE TO authenticated
  USING (
    accepted_at IS NULL
    AND lower(email) = lower(auth.email())
  );

DROP POLICY IF EXISTS "workspace_invited_user_read" ON public.workspaces;
CREATE POLICY "workspace_invited_user_read"
  ON public.workspaces
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_invites invites
      WHERE invites.workspace_id = workspaces.id
        AND invites.accepted_at IS NULL
        AND lower(invites.email) = lower(auth.email())
    )
  );
