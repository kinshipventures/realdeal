
CREATE OR REPLACE FUNCTION public.find_users_by_email_domain(_domain text)
RETURNS TABLE (id uuid, display_name text, email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.id, p.display_name, p.email
  FROM profiles p
  WHERE lower(split_part(p.email, '@', 2)) = lower(_domain)
    AND p.id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM workspace_members wm1
      JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid() AND wm2.user_id = p.id
    )
$$;
