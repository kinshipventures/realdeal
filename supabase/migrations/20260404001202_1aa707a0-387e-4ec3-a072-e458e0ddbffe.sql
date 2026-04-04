
-- 1. Create workspace role enum
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- 2. Create workspaces table
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. Create workspace_members table
CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- 4. Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  email text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 5. Security definer function for workspace membership check
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _user_id
  )
$$;

-- 6. RLS for workspaces - members can see their workspaces
CREATE POLICY "workspace_member_access" ON public.workspaces
  FOR ALL TO authenticated
  USING (public.is_workspace_member(id, auth.uid()))
  WITH CHECK (public.is_workspace_member(id, auth.uid()));

-- Allow insert for workspace creation (user will add themselves as owner right after)
CREATE POLICY "workspace_create" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 7. RLS for workspace_members
CREATE POLICY "workspace_members_view" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "workspace_members_manage" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "workspace_members_delete" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

-- 8. RLS for profiles
CREATE POLICY "profiles_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "profiles_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- 9. Add workspace_id to all data tables (nullable first for backfill)
ALTER TABLE public.pods ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.contacts ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.contact_pods ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.contact_categories ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.interactions ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.pipelines ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.pipeline_stages ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.opportunities ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.opportunity_contacts ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.campaigns ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_contacts ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.projects ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.project_contacts ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.project_opportunities ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.field_config ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.share_links ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 10. Create default workspace for existing user and backfill
DO $$
DECLARE
  _ws_id uuid := gen_random_uuid();
  _user_id uuid := '9582e3a4-14d6-48b5-80ce-4f365b7f266a';
BEGIN
  INSERT INTO public.workspaces (id, name, slug) VALUES (_ws_id, 'Personal', 'personal');
  INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (_ws_id, _user_id, 'owner');
  INSERT INTO public.profiles (id, display_name, email) VALUES (_user_id, 'Moj', NULL) ON CONFLICT (id) DO NOTHING;

  UPDATE public.pods SET workspace_id = _ws_id WHERE workspace_id IS NULL;
  UPDATE public.contacts SET workspace_id = _ws_id WHERE workspace_id IS NULL;
  UPDATE public.categories SET workspace_id = _ws_id WHERE workspace_id IS NULL;
  UPDATE public.contact_pods SET workspace_id = _ws_id WHERE workspace_id IS NULL;
  UPDATE public.contact_categories SET workspace_id = _ws_id WHERE workspace_id IS NULL;
  UPDATE public.interactions SET workspace_id = _ws_id WHERE workspace_id IS NULL;
  UPDATE public.pipelines SET workspace_id = _ws_id WHERE workspace_id IS NULL;
  UPDATE public.pipeline_stages SET workspace_id = _ws_id WHERE workspace_id IS NULL;
  UPDATE public.opportunities SET workspace_id = _ws_id WHERE workspace_id IS NULL;
  UPDATE public.opportunity_contacts SET workspace_id = _ws_id WHERE workspace_id IS NULL;
  UPDATE public.campaigns SET workspace_id = _ws_id WHERE workspace_id IS NULL;
  UPDATE public.campaign_contacts SET workspace_id = _ws_id WHERE workspace_id IS NULL;
  UPDATE public.projects SET workspace_id = _ws_id WHERE workspace_id IS NULL;
  UPDATE public.project_contacts SET workspace_id = _ws_id WHERE workspace_id IS NULL;
  UPDATE public.project_opportunities SET workspace_id = _ws_id WHERE workspace_id IS NULL;
  UPDATE public.field_config SET workspace_id = _ws_id WHERE workspace_id IS NULL;
  UPDATE public.share_links SET workspace_id = _ws_id WHERE workspace_id IS NULL;
END $$;

-- 11. Make workspace_id NOT NULL after backfill
ALTER TABLE public.pods ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.contacts ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.categories ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.contact_pods ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.contact_categories ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.interactions ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.pipelines ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.pipeline_stages ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.opportunities ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.opportunity_contacts ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.campaigns ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.campaign_contacts ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.projects ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.project_contacts ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.project_opportunities ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.field_config ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.share_links ALTER COLUMN workspace_id SET NOT NULL;

-- 12. Create indexes on workspace_id
CREATE INDEX idx_pods_workspace ON public.pods(workspace_id);
CREATE INDEX idx_contacts_workspace ON public.contacts(workspace_id);
CREATE INDEX idx_categories_workspace ON public.categories(workspace_id);
CREATE INDEX idx_contact_pods_workspace ON public.contact_pods(workspace_id);
CREATE INDEX idx_contact_categories_workspace ON public.contact_categories(workspace_id);
CREATE INDEX idx_interactions_workspace ON public.interactions(workspace_id);
CREATE INDEX idx_pipelines_workspace ON public.pipelines(workspace_id);
CREATE INDEX idx_pipeline_stages_workspace ON public.pipeline_stages(workspace_id);
CREATE INDEX idx_opportunities_workspace ON public.opportunities(workspace_id);
CREATE INDEX idx_opportunity_contacts_workspace ON public.opportunity_contacts(workspace_id);
CREATE INDEX idx_campaigns_workspace ON public.campaigns(workspace_id);
CREATE INDEX idx_campaign_contacts_workspace ON public.campaign_contacts(workspace_id);
CREATE INDEX idx_projects_workspace ON public.projects(workspace_id);
CREATE INDEX idx_project_contacts_workspace ON public.project_contacts(workspace_id);
CREATE INDEX idx_project_opportunities_workspace ON public.project_opportunities(workspace_id);
CREATE INDEX idx_field_config_workspace ON public.field_config(workspace_id);
CREATE INDEX idx_share_links_workspace ON public.share_links(workspace_id);

-- 13. Drop old permissive policies and replace with workspace-scoped ones
DROP POLICY IF EXISTS "contacts_authenticated" ON public.contacts;
CREATE POLICY "contacts_workspace" ON public.contacts FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "pods_authenticated" ON public.pods;
CREATE POLICY "pods_workspace" ON public.pods FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "categories_authenticated" ON public.categories;
CREATE POLICY "categories_workspace" ON public.categories FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "contact_pods_authenticated" ON public.contact_pods;
CREATE POLICY "contact_pods_workspace" ON public.contact_pods FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "contact_categories_authenticated" ON public.contact_categories;
CREATE POLICY "contact_categories_workspace" ON public.contact_categories FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "interactions_authenticated" ON public.interactions;
CREATE POLICY "interactions_workspace" ON public.interactions FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "pipelines_authenticated" ON public.pipelines;
CREATE POLICY "pipelines_workspace" ON public.pipelines FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "pipeline_stages_authenticated" ON public.pipeline_stages;
CREATE POLICY "pipeline_stages_workspace" ON public.pipeline_stages FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "opportunities_authenticated" ON public.opportunities;
CREATE POLICY "opportunities_workspace" ON public.opportunities FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "opportunity_contacts_authenticated" ON public.opportunity_contacts;
CREATE POLICY "opportunity_contacts_workspace" ON public.opportunity_contacts FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "campaigns_authenticated" ON public.campaigns;
CREATE POLICY "campaigns_workspace" ON public.campaigns FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "campaign_contacts_authenticated" ON public.campaign_contacts;
CREATE POLICY "campaign_contacts_workspace" ON public.campaign_contacts FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "projects_authenticated" ON public.projects;
CREATE POLICY "projects_workspace" ON public.projects FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "project_contacts_authenticated" ON public.project_contacts;
CREATE POLICY "project_contacts_workspace" ON public.project_contacts FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "project_opportunities_authenticated" ON public.project_opportunities;
CREATE POLICY "project_opportunities_workspace" ON public.project_opportunities FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "field_config_authenticated" ON public.field_config;
CREATE POLICY "field_config_workspace" ON public.field_config FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

-- share_links keeps its existing owner + anon policies, add workspace scope
DROP POLICY IF EXISTS "Users can manage their own share links" ON public.share_links;
CREATE POLICY "share_links_workspace" ON public.share_links FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
-- Keep the anon policy for public share link viewing (no change needed)

DROP POLICY IF EXISTS "_migration_id_map_authenticated" ON public._migration_id_map;
CREATE POLICY "_migration_id_map_workspace" ON public._migration_id_map FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 14. Auto-provision trigger for new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ws_id uuid := gen_random_uuid();
  _slug text;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), NEW.email);

  -- Generate unique slug
  _slug := 'personal-' || substr(NEW.id::text, 1, 8);

  -- Create default workspace
  INSERT INTO public.workspaces (id, name, slug) VALUES (_ws_id, 'Personal', _slug);
  INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (_ws_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
