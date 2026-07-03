-- Team workspaces are full-access collaboration spaces.
-- Every accepted workspace member can use the owner workspace with their own login.

CREATE OR REPLACE FUNCTION public.is_workspace_admin(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_workspace_member(_workspace_id, _user_id);
$$;

CREATE TABLE IF NOT EXISTS public.workspace_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_label text NOT NULL DEFAULT 'System',
  actor_email text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  entity_label text,
  related_type text,
  related_id text,
  related_label text,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_activity_events_workspace
  ON public.workspace_activity_events(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_activity_events_actor
  ON public.workspace_activity_events(workspace_id, actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_activity_events_entity
  ON public.workspace_activity_events(workspace_id, entity_type, entity_id, created_at DESC);

ALTER TABLE public.workspace_activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_activity_events_select" ON public.workspace_activity_events;
CREATE POLICY "workspace_activity_events_select"
  ON public.workspace_activity_events
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "workspace_activity_events_insert" ON public.workspace_activity_events;
CREATE POLICY "workspace_activity_events_insert"
  ON public.workspace_activity_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "workspace_activity_events_update" ON public.workspace_activity_events;
DROP POLICY IF EXISTS "workspace_activity_events_delete" ON public.workspace_activity_events;
