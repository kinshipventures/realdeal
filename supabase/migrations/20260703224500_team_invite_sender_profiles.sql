-- Let team invite recipients see who sent their pending workspace invite.
-- This exposes only the inviter profile for invites addressed to the signed-in email.

DROP POLICY IF EXISTS "profiles_read_workspace_invite_sender" ON public.profiles;
CREATE POLICY "profiles_read_workspace_invite_sender"
  ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_invites invites
      WHERE invites.invited_by = profiles.id
        AND invites.accepted_at IS NULL
        AND lower(invites.email) = lower(auth.email())
    )
  );
