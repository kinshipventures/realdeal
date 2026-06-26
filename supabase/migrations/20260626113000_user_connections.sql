CREATE TABLE IF NOT EXISTS public.collaboration_user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pair_key text GENERATED ALWAYS AS (
    CASE
      WHEN requester_id::text < recipient_id::text THEN requester_id::text || ':' || recipient_id::text
      ELSE recipient_id::text || ':' || requester_id::text
    END
  ) STORED,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  removed_at timestamptz,
  CHECK (requester_id <> recipient_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_collaboration_user_connections_active_pair
  ON public.collaboration_user_connections(pair_key)
  WHERE status IN ('pending', 'accepted');

CREATE INDEX IF NOT EXISTS idx_collaboration_user_connections_requester
  ON public.collaboration_user_connections(requester_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collaboration_user_connections_recipient
  ON public.collaboration_user_connections(recipient_id, status, created_at DESC);

DROP TRIGGER IF EXISTS update_collaboration_user_connections_updated_at ON public.collaboration_user_connections;
CREATE TRIGGER update_collaboration_user_connections_updated_at
  BEFORE UPDATE ON public.collaboration_user_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.collaboration_user_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collaboration_user_connections_participant_select" ON public.collaboration_user_connections;
CREATE POLICY "collaboration_user_connections_participant_select"
  ON public.collaboration_user_connections
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR recipient_id = auth.uid());

DROP POLICY IF EXISTS "collaboration_user_connections_request_insert" ON public.collaboration_user_connections;
CREATE POLICY "collaboration_user_connections_request_insert"
  ON public.collaboration_user_connections
  FOR INSERT TO authenticated
  WITH CHECK (
    requester_id = auth.uid()
    AND requester_id <> recipient_id
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "collaboration_user_connections_participant_update" ON public.collaboration_user_connections;
CREATE POLICY "collaboration_user_connections_participant_update"
  ON public.collaboration_user_connections
  FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() OR recipient_id = auth.uid())
  WITH CHECK (requester_id = auth.uid() OR recipient_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_user_connections()
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.requester_id,
    c.recipient_id,
    c.status,
    c.created_at,
    c.responded_at,
    c.removed_at,
    CASE
      WHEN c.requester_id = auth.uid() THEN 'sent'
      WHEN c.recipient_id = auth.uid() THEN 'received'
      ELSE 'other'
    END AS direction,
    CASE
      WHEN c.requester_id = auth.uid() THEN c.recipient_id
      ELSE c.requester_id
    END AS connected_user_id,
    CASE
      WHEN c.requester_id = auth.uid() THEN recipient_profile.display_name
      ELSE requester_profile.display_name
    END AS connected_display_name,
    CASE
      WHEN c.requester_id = auth.uid() THEN recipient_profile.email
      ELSE requester_profile.email
    END AS connected_email,
    requester_profile.display_name AS requester_display_name,
    requester_profile.email AS requester_email,
    recipient_profile.display_name AS recipient_display_name,
    recipient_profile.email AS recipient_email
  FROM public.collaboration_user_connections c
  LEFT JOIN public.profiles requester_profile ON requester_profile.id = c.requester_id
  LEFT JOIN public.profiles recipient_profile ON recipient_profile.id = c.recipient_id
  WHERE c.requester_id = auth.uid() OR c.recipient_id = auth.uid()
  ORDER BY c.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.find_profile_for_connection(target_email text)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.email
  FROM public.profiles p
  WHERE lower(p.email) = lower(trim(target_email))
    AND p.id <> auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.find_app_users_for_contact_emails(contact_emails text[])
RETURNS TABLE (
  contact_email text,
  user_id uuid,
  display_name text,
  email text,
  connection_id uuid,
  connection_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH normalized AS (
    SELECT DISTINCT lower(trim(email_value)) AS email
    FROM unnest(contact_emails) AS email_value
    WHERE trim(email_value) <> ''
  )
  SELECT
    normalized.email AS contact_email,
    p.id AS user_id,
    p.display_name,
    p.email,
    c.id AS connection_id,
    c.status AS connection_status
  FROM normalized
  JOIN public.profiles p ON lower(p.email) = normalized.email
  LEFT JOIN public.collaboration_user_connections c
    ON c.pair_key = CASE
      WHEN auth.uid()::text < p.id::text THEN auth.uid()::text || ':' || p.id::text
      ELSE p.id::text || ':' || auth.uid()::text
    END
    AND c.status IN ('pending', 'accepted')
  WHERE p.id <> auth.uid()
  ORDER BY p.display_name NULLS LAST, p.email;
$$;

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
      WHERE id = existing_connection.id
      RETURNING id INTO next_connection_id;
    END IF;
  ELSE
    INSERT INTO public.collaboration_user_connections (requester_id, recipient_id, status)
    VALUES (current_user_id, target_user_id, 'pending')
    RETURNING id INTO next_connection_id;
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.get_user_connections() connections
  WHERE connections.id = next_connection_id;
END;
$$;

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
  target_connection public.collaboration_user_connections%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF next_status NOT IN ('accepted', 'declined', 'removed') THEN
    RAISE EXCEPTION 'Unsupported connection response';
  END IF;

  SELECT * INTO target_connection
  FROM public.collaboration_user_connections
  WHERE id = connection_id
    AND (requester_id = current_user_id OR recipient_id = current_user_id)
  FOR UPDATE;

  IF target_connection.id IS NULL THEN
    RAISE EXCEPTION 'Connection not found';
  END IF;

  IF next_status IN ('accepted', 'declined') AND target_connection.recipient_id <> current_user_id THEN
    RAISE EXCEPTION 'Only the recipient can accept or decline this request';
  END IF;

  IF next_status IN ('accepted', 'declined') AND target_connection.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending requests can be accepted or declined';
  END IF;

  UPDATE public.collaboration_user_connections
  SET
    status = next_status,
    responded_at = CASE WHEN next_status IN ('accepted', 'declined') THEN now() ELSE responded_at END,
    removed_at = CASE WHEN next_status = 'removed' THEN now() ELSE removed_at END
  WHERE id = connection_id;

  RETURN QUERY
  SELECT *
  FROM public.get_user_connections() connections
  WHERE connections.id = connection_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_connections() TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_profile_for_connection(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_app_users_for_contact_emails(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_connection_request(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_user_connection(uuid, text) TO authenticated;
