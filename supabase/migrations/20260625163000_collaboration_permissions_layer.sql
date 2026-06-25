CREATE TABLE IF NOT EXISTS public.collaboration_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  subject_type text NOT NULL CHECK (subject_type IN ('user', 'team', 'organization', 'public_link')),
  subject_id text,
  subject_label text NOT NULL,
  resource_type text NOT NULL CHECK (resource_type IN ('contact', 'company', 'pod', 'campaign', 'field_group')),
  resource_id text,
  resource_label text NOT NULL,
  permission_level text NOT NULL CHECK (permission_level IN ('view', 'comment', 'suggest', 'edit', 'approve', 'admin')),
  field_scopes text[] NOT NULL DEFAULT ARRAY['public_profile']::text[],
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.collaboration_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id text,
  campaign_label text,
  contact_id text,
  contact_label text,
  request_type text NOT NULL CHECK (request_type IN ('campaign_participation', 'private_information_access')),
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_by_label text NOT NULL,
  approver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason text,
  requested_field_scopes text[] NOT NULL DEFAULT ARRAY['public_profile']::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.collaboration_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_label text NOT NULL DEFAULT 'System',
  event_type text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  resource_label text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collaboration_access_grants_workspace
  ON public.collaboration_access_grants(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collaboration_access_grants_resource
  ON public.collaboration_access_grants(workspace_id, resource_type, resource_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_collaboration_approval_requests_workspace
  ON public.collaboration_approval_requests(workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collaboration_audit_events_workspace
  ON public.collaboration_audit_events(workspace_id, created_at DESC);

ALTER TABLE public.collaboration_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collaboration_access_grants_workspace_select" ON public.collaboration_access_grants;
CREATE POLICY "collaboration_access_grants_workspace_select"
  ON public.collaboration_access_grants
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "collaboration_access_grants_workspace_insert" ON public.collaboration_access_grants;
CREATE POLICY "collaboration_access_grants_workspace_insert"
  ON public.collaboration_access_grants
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "collaboration_access_grants_workspace_update" ON public.collaboration_access_grants;
CREATE POLICY "collaboration_access_grants_workspace_update"
  ON public.collaboration_access_grants
  FOR UPDATE TO authenticated
  USING (public.is_workspace_admin(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "collaboration_approval_requests_workspace_select" ON public.collaboration_approval_requests;
CREATE POLICY "collaboration_approval_requests_workspace_select"
  ON public.collaboration_approval_requests
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "collaboration_approval_requests_workspace_insert" ON public.collaboration_approval_requests;
CREATE POLICY "collaboration_approval_requests_workspace_insert"
  ON public.collaboration_approval_requests
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "collaboration_approval_requests_workspace_update" ON public.collaboration_approval_requests;
CREATE POLICY "collaboration_approval_requests_workspace_update"
  ON public.collaboration_approval_requests
  FOR UPDATE TO authenticated
  USING (public.is_workspace_admin(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "collaboration_audit_events_workspace_select" ON public.collaboration_audit_events;
CREATE POLICY "collaboration_audit_events_workspace_select"
  ON public.collaboration_audit_events
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "collaboration_audit_events_workspace_insert" ON public.collaboration_audit_events;
CREATE POLICY "collaboration_audit_events_workspace_insert"
  ON public.collaboration_audit_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
