
-- 1. Add category_ids to contacts and populate from junction
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS category_ids uuid[] DEFAULT '{}';

UPDATE public.contacts c SET
  category_ids = COALESCE((
    SELECT array_agg(cc.category_id ORDER BY cc.created_at)
    FROM public.contact_categories cc
    WHERE cc.contact_id = c.id
  ), '{}');

-- 2. Drop contact_categories junction table
DROP TABLE IF EXISTS public.contact_categories;

-- 3. Drop project tables
DROP TABLE IF EXISTS public.project_contacts;
DROP TABLE IF EXISTS public.projects;

-- 4. Rename pipeline_stages to campaign_stages
ALTER TABLE public.pipeline_stages RENAME TO campaign_stages;
ALTER TABLE public.campaign_stages RENAME COLUMN pipeline_id TO campaign_id;

-- 5. Recreate RLS policy on renamed table
DROP POLICY IF EXISTS "pipeline_stages_workspace" ON public.campaign_stages;
CREATE POLICY "campaign_stages_workspace" ON public.campaign_stages
  FOR ALL TO authenticated
  USING (is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (is_workspace_member(workspace_id, auth.uid()));
