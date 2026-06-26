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

  RETURN QUERY
  SELECT *
  FROM public.get_user_connections() connections
  WHERE connections.id = requested_connection_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_user_connection(uuid, text) TO authenticated;
