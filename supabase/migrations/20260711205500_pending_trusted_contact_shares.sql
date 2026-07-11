CREATE TABLE IF NOT EXISTS public.collaboration_pending_connection_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.collaboration_user_connections(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_email text,
  subject_label text NOT NULL,
  resource_type text NOT NULL CHECK (resource_type IN ('contact', 'company', 'pod', 'campaign', 'field_group')),
  resource_id text,
  resource_label text NOT NULL,
  permission_level text NOT NULL CHECK (permission_level IN ('view', 'comment', 'suggest', 'edit', 'approve', 'admin')),
  field_scopes text[] NOT NULL DEFAULT ARRAY['public_profile']::text[],
  expires_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'activated', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pending_connection_shares_connection
  ON public.collaboration_pending_connection_shares(connection_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pending_connection_shares_creator
  ON public.collaboration_pending_connection_shares(created_by, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pending_connection_shares_subject
  ON public.collaboration_pending_connection_shares(subject_id, status, created_at DESC);

ALTER TABLE public.collaboration_pending_connection_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pending_connection_shares_participant_select" ON public.collaboration_pending_connection_shares;
CREATE POLICY "pending_connection_shares_participant_select"
  ON public.collaboration_pending_connection_shares
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR subject_id = auth.uid());

DROP POLICY IF EXISTS "pending_connection_shares_workspace_insert" ON public.collaboration_pending_connection_shares;
CREATE POLICY "pending_connection_shares_workspace_insert"
  ON public.collaboration_pending_connection_shares
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.is_workspace_admin(workspace_id, auth.uid())
  );

CREATE OR REPLACE FUNCTION public.respond_user_connection(connection_id uuid, next_status text)
RETURNS TABLE (
  id uuid,
  requester_id uuid,
  recipient_id uuid,
  status text,
  created_at timestamptz,
  responded_at timestamptz,
  removed_at timestamptz,
  direction text,
  connected_user_id uuid,
  connected_display_name text,
  connected_email text,
  requester_display_name text,
  requester_email text,
  recipient_display_name text,
  recipient_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  requested_connection_id uuid := connection_id;
  requested_status text := next_status;
  target_connection public.collaboration_user_connections%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF requested_status NOT IN ('accepted', 'declined', 'removed') THEN
    RAISE EXCEPTION 'Unsupported connection response';
  END IF;

  SELECT * INTO target_connection
  FROM public.collaboration_user_connections
  WHERE collaboration_user_connections.id = requested_connection_id
    AND (
      collaboration_user_connections.requester_id = current_user_id
      OR collaboration_user_connections.recipient_id = current_user_id
    )
  FOR UPDATE;

  IF target_connection.id IS NULL THEN
    RAISE EXCEPTION 'Connection not found';
  END IF;

  IF requested_status IN ('accepted', 'declined') AND target_connection.recipient_id <> current_user_id THEN
    RAISE EXCEPTION 'Only the recipient can accept or decline this request';
  END IF;

  IF requested_status IN ('accepted', 'declined') AND target_connection.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending requests can be accepted or declined';
  END IF;

  UPDATE public.collaboration_user_connections
  SET
    status = requested_status,
    responded_at = CASE
      WHEN requested_status IN ('accepted', 'declined') THEN now()
      ELSE collaboration_user_connections.responded_at
    END,
    removed_at = CASE
      WHEN requested_status = 'removed' THEN now()
      ELSE collaboration_user_connections.removed_at
    END
  WHERE collaboration_user_connections.id = requested_connection_id;

  IF requested_status = 'accepted' THEN
    INSERT INTO public.collaboration_access_grants (
      workspace_id,
      subject_type,
      subject_id,
      subject_email,
      subject_label,
      resource_type,
      resource_id,
      resource_label,
      permission_level,
      field_scopes,
      expires_at,
      created_by,
      status,
      responded_at
    )
    SELECT
      pending_shares.workspace_id,
      'user',
      pending_shares.subject_id::text,
      coalesce(pending_shares.subject_email, nullif(current_email, '')),
      pending_shares.subject_label,
      pending_shares.resource_type,
      pending_shares.resource_id,
      pending_shares.resource_label,
      pending_shares.permission_level,
      pending_shares.field_scopes,
      pending_shares.expires_at,
      pending_shares.created_by,
      'accepted',
      now()
    FROM public.collaboration_pending_connection_shares AS pending_shares
    WHERE pending_shares.connection_id = requested_connection_id
      AND pending_shares.status = 'pending'
      AND (
        (
          pending_shares.created_by = target_connection.requester_id
          AND pending_shares.subject_id = target_connection.recipient_id
        )
        OR (
          pending_shares.created_by = target_connection.recipient_id
          AND pending_shares.subject_id = target_connection.requester_id
        )
      );

    UPDATE public.collaboration_pending_connection_shares AS pending_shares
    SET
      status = 'activated',
      activated_at = now()
    WHERE pending_shares.connection_id = requested_connection_id
      AND pending_shares.status = 'pending'
      AND (
        (
          pending_shares.created_by = target_connection.requester_id
          AND pending_shares.subject_id = target_connection.recipient_id
        )
        OR (
          pending_shares.created_by = target_connection.recipient_id
          AND pending_shares.subject_id = target_connection.requester_id
        )
      );
  ELSIF requested_status = 'declined' THEN
    UPDATE public.collaboration_pending_connection_shares AS pending_shares
    SET
      status = 'declined',
      activated_at = now()
    WHERE pending_shares.connection_id = requested_connection_id
      AND pending_shares.status = 'pending'
      AND (
        (
          pending_shares.created_by = target_connection.requester_id
          AND pending_shares.subject_id = target_connection.recipient_id
        )
        OR (
          pending_shares.created_by = target_connection.recipient_id
          AND pending_shares.subject_id = target_connection.requester_id
        )
      );
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.get_user_connections() connections
  WHERE connections.id = requested_connection_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_user_connection(uuid, text) TO authenticated;
