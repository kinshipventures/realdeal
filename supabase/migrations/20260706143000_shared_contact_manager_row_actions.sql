ALTER TABLE public.collaboration_access_grants
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dismissed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_collaboration_access_grants_workspace_visible
  ON public.collaboration_access_grants(workspace_id, created_at DESC)
  WHERE dismissed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_collaboration_access_grants_subject_visible
  ON public.collaboration_access_grants(subject_type, subject_id, status, created_at DESC)
  WHERE dismissed_at IS NULL;

ALTER TABLE public.collaboration_public_campaign_links
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dismissed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_collaboration_public_campaign_links_visible
  ON public.collaboration_public_campaign_links(workspace_id, created_at DESC)
  WHERE dismissed_at IS NULL;

CREATE OR REPLACE FUNCTION public.get_incoming_collaboration_access_grants()
RETURNS TABLE (
  id uuid,
  workspace_id uuid,
  subject_type text,
  subject_id text,
  subject_email text,
  subject_label text,
  resource_type text,
  resource_id text,
  resource_label text,
  permission_level text,
  field_scopes text[],
  status text,
  expires_at timestamptz,
  created_by uuid,
  created_by_label text,
  created_by_email text,
  created_at timestamptz,
  responded_at timestamptz,
  revoked_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH current_identity AS (
    SELECT auth.uid() AS user_id, lower(coalesce(auth.jwt() ->> 'email', '')) AS email
  )
  SELECT
    grants.id,
    grants.workspace_id,
    grants.subject_type,
    grants.subject_id,
    grants.subject_email,
    grants.subject_label,
    grants.resource_type,
    grants.resource_id,
    grants.resource_label,
    grants.permission_level,
    grants.field_scopes,
    grants.status,
    grants.expires_at,
    grants.created_by,
    coalesce(owner_profile.display_name, owner_profile.email, 'Shared contact owner') AS created_by_label,
    owner_profile.email AS created_by_email,
    grants.created_at,
    grants.responded_at,
    grants.revoked_at
  FROM public.collaboration_access_grants grants
  CROSS JOIN current_identity
  LEFT JOIN public.profiles owner_profile ON owner_profile.id = grants.created_by
  WHERE grants.subject_type = 'user'
    AND grants.dismissed_at IS NULL
    AND (
      grants.subject_id = current_identity.user_id::text
      OR (
        current_identity.email <> ''
        AND lower(coalesce(grants.subject_email, '')) = current_identity.email
      )
    )
  ORDER BY grants.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.remove_collaboration_access_grant(grant_id uuid)
RETURNS SETOF public.collaboration_access_grants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  target_grant public.collaboration_access_grants%ROWTYPE;
  is_subject boolean := false;
  is_workspace_user boolean := false;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO target_grant
  FROM public.collaboration_access_grants AS grants
  WHERE grants.id = grant_id
    AND grants.dismissed_at IS NULL
  FOR UPDATE;

  IF target_grant.id IS NULL THEN
    RAISE EXCEPTION 'Shared contact access not found';
  END IF;

  is_subject := target_grant.subject_type = 'user'
    AND (
      target_grant.subject_id = current_user_id::text
      OR (
        current_email <> ''
        AND lower(coalesce(target_grant.subject_email, '')) = current_email
      )
    );

  is_workspace_user := public.is_workspace_member(target_grant.workspace_id, current_user_id);

  IF NOT (is_subject OR is_workspace_user) THEN
    RAISE EXCEPTION 'Not allowed to remove this shared contact access';
  END IF;

  RETURN QUERY
  UPDATE public.collaboration_access_grants AS grants
  SET
    status = CASE WHEN grants.status = 'pending' THEN 'declined' ELSE grants.status END,
    subject_id = CASE WHEN is_subject THEN coalesce(grants.subject_id, current_user_id::text) ELSE grants.subject_id END,
    subject_email = CASE WHEN is_subject THEN coalesce(grants.subject_email, nullif(current_email, '')) ELSE grants.subject_email END,
    responded_at = CASE WHEN grants.status = 'pending' THEN coalesce(grants.responded_at, now()) ELSE grants.responded_at END,
    revoked_at = coalesce(grants.revoked_at, now())
  WHERE grants.id = target_grant.id
  RETURNING grants.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.dismiss_collaboration_access_grant(grant_id uuid)
RETURNS SETOF public.collaboration_access_grants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  target_grant public.collaboration_access_grants%ROWTYPE;
  is_subject boolean := false;
  is_workspace_user boolean := false;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO target_grant
  FROM public.collaboration_access_grants AS grants
  WHERE grants.id = grant_id
    AND grants.dismissed_at IS NULL
  FOR UPDATE;

  IF target_grant.id IS NULL THEN
    RAISE EXCEPTION 'Shared contact access not found';
  END IF;

  is_subject := target_grant.subject_type = 'user'
    AND (
      target_grant.subject_id = current_user_id::text
      OR (
        current_email <> ''
        AND lower(coalesce(target_grant.subject_email, '')) = current_email
      )
    );

  is_workspace_user := public.is_workspace_member(target_grant.workspace_id, current_user_id);

  IF NOT (is_subject OR is_workspace_user) THEN
    RAISE EXCEPTION 'Not allowed to delete this shared contact history';
  END IF;

  RETURN QUERY
  UPDATE public.collaboration_access_grants AS grants
  SET
    status = CASE WHEN grants.status = 'pending' THEN 'declined' ELSE grants.status END,
    subject_id = CASE WHEN is_subject THEN coalesce(grants.subject_id, current_user_id::text) ELSE grants.subject_id END,
    subject_email = CASE WHEN is_subject THEN coalesce(grants.subject_email, nullif(current_email, '')) ELSE grants.subject_email END,
    responded_at = CASE WHEN grants.status = 'pending' THEN coalesce(grants.responded_at, now()) ELSE grants.responded_at END,
    revoked_at = coalesce(grants.revoked_at, now()),
    dismissed_at = coalesce(grants.dismissed_at, now()),
    dismissed_by = current_user_id
  WHERE grants.id = target_grant.id
  RETURNING grants.*;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_collaboration_access_grant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_collaboration_access_grant(uuid) TO authenticated;
