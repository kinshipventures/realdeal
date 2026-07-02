CREATE OR REPLACE FUNCTION public.respond_incoming_collaboration_access_grant(grant_id uuid, next_status text)
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  target_grant public.collaboration_access_grants%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF next_status NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'Unsupported shared contact response';
  END IF;

  SELECT *
  INTO target_grant
  FROM public.collaboration_access_grants AS grants
  WHERE grants.id = grant_id
    AND grants.subject_type = 'user'
    AND grants.revoked_at IS NULL
    AND (
      grants.subject_id = current_user_id::text
      OR (
        current_email <> ''
        AND lower(coalesce(grants.subject_email, '')) = current_email
      )
    )
  FOR UPDATE;

  IF target_grant.id IS NULL THEN
    RAISE EXCEPTION 'Shared contact request not found';
  END IF;

  IF target_grant.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending shared contact requests can be accepted or declined';
  END IF;

  UPDATE public.collaboration_access_grants AS grants
  SET
    status = next_status,
    subject_id = coalesce(target_grant.subject_id, current_user_id::text),
    subject_email = coalesce(target_grant.subject_email, nullif(current_email, '')),
    subject_label = CASE
      WHEN target_grant.subject_label IS NULL OR target_grant.subject_label = '' THEN coalesce(nullif(current_email, ''), 'Shared contact recipient')
      ELSE target_grant.subject_label
    END,
    responded_at = now()
  WHERE grants.id = target_grant.id;

  RETURN QUERY
  SELECT
    incoming.id,
    incoming.workspace_id,
    incoming.subject_type,
    incoming.subject_id,
    incoming.subject_email,
    incoming.subject_label,
    incoming.resource_type,
    incoming.resource_id,
    incoming.resource_label,
    incoming.permission_level,
    incoming.field_scopes,
    incoming.status,
    incoming.expires_at,
    incoming.created_by,
    incoming.created_by_label,
    incoming.created_by_email,
    incoming.created_at,
    incoming.responded_at,
    incoming.revoked_at
  FROM public.get_incoming_collaboration_access_grants() AS incoming
  WHERE incoming.id = target_grant.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_incoming_collaboration_access_grant(uuid, text) TO authenticated;
