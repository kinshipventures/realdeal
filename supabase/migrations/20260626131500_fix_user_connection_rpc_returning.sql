CREATE OR REPLACE FUNCTION public.create_user_connection_request(target_email text)
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
  target_user_id uuid;
  target_pair_key text;
  existing_connection public.collaboration_user_connections%ROWTYPE;
  next_connection_id uuid;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.id INTO target_user_id
  FROM public.profiles p
  WHERE lower(p.email) = lower(trim(target_email))
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No Real Deal user was found for that email';
  END IF;

  IF target_user_id = current_user_id THEN
    RAISE EXCEPTION 'You cannot connect with your own account';
  END IF;

  target_pair_key := CASE
    WHEN current_user_id::text < target_user_id::text THEN current_user_id::text || ':' || target_user_id::text
    ELSE target_user_id::text || ':' || current_user_id::text
  END;

  SELECT * INTO existing_connection
  FROM public.collaboration_user_connections
  WHERE pair_key = target_pair_key
  ORDER BY created_at DESC
  LIMIT 1;

  IF existing_connection.id IS NOT NULL THEN
    IF existing_connection.status IN ('pending', 'accepted') THEN
      next_connection_id := existing_connection.id;
    ELSE
      UPDATE public.collaboration_user_connections
      SET
        requester_id = current_user_id,
        recipient_id = target_user_id,
        status = 'pending',
        created_at = now(),
        responded_at = NULL,
        removed_at = NULL
      WHERE collaboration_user_connections.id = existing_connection.id
      RETURNING collaboration_user_connections.id INTO next_connection_id;
    END IF;
  ELSE
    INSERT INTO public.collaboration_user_connections (requester_id, recipient_id, status)
    VALUES (current_user_id, target_user_id, 'pending')
    RETURNING collaboration_user_connections.id INTO next_connection_id;
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.get_user_connections() connections
  WHERE connections.id = next_connection_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_user_connection_request(text) TO authenticated;
