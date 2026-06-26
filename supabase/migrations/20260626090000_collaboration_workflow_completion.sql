CREATE TABLE IF NOT EXISTS public.collaboration_saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  view_type text NOT NULL CHECK (view_type IN ('relationships', 'campaign')),
  label text NOT NULL,
  resource_id text,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  visible_fields text[] NOT NULL DEFAULT ARRAY[]::text[],
  sort_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.collaboration_public_campaign_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id text NOT NULL,
  campaign_label text NOT NULL,
  token text NOT NULL UNIQUE,
  field_scopes text[] NOT NULL DEFAULT ARRAY['public_profile']::text[],
  permissions text[] NOT NULL DEFAULT ARRAY['view_campaign', 'review_contacts', 'comment', 'propose_contacts']::text[],
  contacts_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.collaboration_public_link_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_link_id uuid NOT NULL REFERENCES public.collaboration_public_campaign_links(id) ON DELETE CASCADE,
  token text NOT NULL,
  contact_id text,
  reviewer_label text NOT NULL,
  status text NOT NULL CHECK (status IN ('approved', 'rejected', 'discussion')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.collaboration_contact_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id text,
  campaign_label text,
  proposed_by_label text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  contact_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  matched_contact_id text,
  source_public_token text,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.collaboration_campaign_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id text NOT NULL,
  campaign_label text NOT NULL,
  contact_id text,
  contact_label text,
  update_type text NOT NULL,
  status text,
  note text,
  created_by_label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.collaboration_contact_proposals
  ADD COLUMN IF NOT EXISTS source_public_token text;

CREATE INDEX IF NOT EXISTS idx_collaboration_saved_views_workspace_owner
  ON public.collaboration_saved_views(workspace_id, owner_user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_collaboration_public_campaign_links_workspace
  ON public.collaboration_public_campaign_links(workspace_id, campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collaboration_public_campaign_links_token
  ON public.collaboration_public_campaign_links(token)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_collaboration_public_link_reviews_link
  ON public.collaboration_public_link_reviews(public_link_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collaboration_contact_proposals_workspace
  ON public.collaboration_contact_proposals(workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collaboration_contact_proposals_public_token
  ON public.collaboration_contact_proposals(source_public_token)
  WHERE source_public_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_collaboration_campaign_updates_workspace
  ON public.collaboration_campaign_updates(workspace_id, campaign_id, created_at DESC);

ALTER TABLE public.collaboration_saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_public_campaign_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_public_link_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_contact_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_campaign_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collaboration_saved_views_owner_select" ON public.collaboration_saved_views;
CREATE POLICY "collaboration_saved_views_owner_select"
  ON public.collaboration_saved_views
  FOR SELECT TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (owner_user_id = auth.uid() OR public.is_workspace_admin(workspace_id, auth.uid()))
  );

DROP POLICY IF EXISTS "collaboration_saved_views_owner_insert" ON public.collaboration_saved_views;
CREATE POLICY "collaboration_saved_views_owner_insert"
  ON public.collaboration_saved_views
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND owner_user_id = auth.uid());

DROP POLICY IF EXISTS "collaboration_saved_views_owner_update" ON public.collaboration_saved_views;
CREATE POLICY "collaboration_saved_views_owner_update"
  ON public.collaboration_saved_views
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()) AND owner_user_id = auth.uid())
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND owner_user_id = auth.uid());

DROP POLICY IF EXISTS "collaboration_public_campaign_links_workspace_select" ON public.collaboration_public_campaign_links;
CREATE POLICY "collaboration_public_campaign_links_workspace_select"
  ON public.collaboration_public_campaign_links
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "collaboration_public_campaign_links_workspace_insert" ON public.collaboration_public_campaign_links;
CREATE POLICY "collaboration_public_campaign_links_workspace_insert"
  ON public.collaboration_public_campaign_links
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "collaboration_public_campaign_links_workspace_update" ON public.collaboration_public_campaign_links;
CREATE POLICY "collaboration_public_campaign_links_workspace_update"
  ON public.collaboration_public_campaign_links
  FOR UPDATE TO authenticated
  USING (public.is_workspace_admin(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "collaboration_public_link_reviews_workspace_select" ON public.collaboration_public_link_reviews;
CREATE POLICY "collaboration_public_link_reviews_workspace_select"
  ON public.collaboration_public_link_reviews
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.collaboration_public_campaign_links links
      WHERE links.id = public_link_id
        AND public.is_workspace_member(links.workspace_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "collaboration_public_link_reviews_public_insert" ON public.collaboration_public_link_reviews;
CREATE POLICY "collaboration_public_link_reviews_public_insert"
  ON public.collaboration_public_link_reviews
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.collaboration_public_campaign_links links
      WHERE links.id = public_link_id
        AND links.token = collaboration_public_link_reviews.token
        AND links.revoked_at IS NULL
        AND (links.expires_at IS NULL OR links.expires_at > now())
    )
  );

DROP POLICY IF EXISTS "collaboration_contact_proposals_workspace_select" ON public.collaboration_contact_proposals;
CREATE POLICY "collaboration_contact_proposals_workspace_select"
  ON public.collaboration_contact_proposals
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "collaboration_contact_proposals_workspace_insert" ON public.collaboration_contact_proposals;
CREATE POLICY "collaboration_contact_proposals_workspace_insert"
  ON public.collaboration_contact_proposals
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "collaboration_contact_proposals_public_insert" ON public.collaboration_contact_proposals;
CREATE POLICY "collaboration_contact_proposals_public_insert"
  ON public.collaboration_contact_proposals
  FOR INSERT TO anon
  WITH CHECK (
    source_public_token IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.collaboration_public_campaign_links links
      WHERE links.token = source_public_token
        AND links.workspace_id = collaboration_contact_proposals.workspace_id
        AND links.campaign_id = collaboration_contact_proposals.campaign_id
        AND links.revoked_at IS NULL
        AND (links.expires_at IS NULL OR links.expires_at > now())
        AND 'propose_contacts' = ANY(links.permissions)
    )
  );

DROP POLICY IF EXISTS "collaboration_contact_proposals_workspace_update" ON public.collaboration_contact_proposals;
CREATE POLICY "collaboration_contact_proposals_workspace_update"
  ON public.collaboration_contact_proposals
  FOR UPDATE TO authenticated
  USING (public.is_workspace_admin(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "collaboration_campaign_updates_workspace_select" ON public.collaboration_campaign_updates;
CREATE POLICY "collaboration_campaign_updates_workspace_select"
  ON public.collaboration_campaign_updates
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "collaboration_campaign_updates_workspace_insert" ON public.collaboration_campaign_updates;
CREATE POLICY "collaboration_campaign_updates_workspace_insert"
  ON public.collaboration_campaign_updates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.get_public_campaign_link(link_token text)
RETURNS SETOF public.collaboration_public_campaign_links
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.collaboration_public_campaign_links links
  WHERE links.token = link_token
    AND links.revoked_at IS NULL
    AND (links.expires_at IS NULL OR links.expires_at > now())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_public_link_reviews(link_token text)
RETURNS SETOF public.collaboration_public_link_reviews
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT reviews.*
  FROM public.collaboration_public_link_reviews reviews
  JOIN public.collaboration_public_campaign_links links
    ON links.id = reviews.public_link_id
  WHERE links.token = link_token
    AND links.revoked_at IS NULL
    AND (links.expires_at IS NULL OR links.expires_at > now())
  ORDER BY reviews.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_campaign_link(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_link_reviews(text) TO anon, authenticated;
