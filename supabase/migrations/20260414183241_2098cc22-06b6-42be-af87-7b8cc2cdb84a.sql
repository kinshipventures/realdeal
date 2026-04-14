
-- 1. Add new columns to contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS pod_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS primary_pod_id uuid;

-- contacts already has company_id (single); add company_ids for multi
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS company_ids uuid[] DEFAULT '{}';

-- 2. Populate pod_ids and primary_pod_id from contact_pods
UPDATE public.contacts c SET
  pod_ids = COALESCE((
    SELECT array_agg(cp.pod_id ORDER BY cp.created_at)
    FROM public.contact_pods cp
    WHERE cp.contact_id = c.id
  ), '{}'),
  primary_pod_id = (
    SELECT cp.pod_id
    FROM public.contact_pods cp
    WHERE cp.contact_id = c.id AND cp.is_primary = true
    LIMIT 1
  );

-- If no primary was set, use first pod
UPDATE public.contacts SET primary_pod_id = pod_ids[1]
WHERE primary_pod_id IS NULL AND array_length(pod_ids, 1) > 0;

-- 3. Populate company_ids from contact_companies
UPDATE public.contacts c SET
  company_ids = COALESCE((
    SELECT array_agg(cc.company_id ORDER BY cc.created_at)
    FROM public.contact_companies cc
    WHERE cc.contact_id = c.id
  ), '{}');

-- Ensure company_id is set to the primary from contact_companies if not already set
UPDATE public.contacts c SET
  company_id = (
    SELECT cc.company_id
    FROM public.contact_companies cc
    WHERE cc.contact_id = c.id AND cc.is_primary = true
    LIMIT 1
  )
WHERE c.company_id IS NULL;

-- 4. Drop FK on pipeline_stages referencing pipelines (if exists)
ALTER TABLE public.pipeline_stages DROP CONSTRAINT IF EXISTS pipeline_stages_pipeline_id_fkey;

-- 5. Drop junction tables
DROP TABLE IF EXISTS public.contact_pods;
DROP TABLE IF EXISTS public.contact_companies;

-- 6. Drop legacy tables (order matters for FKs)
DROP TABLE IF EXISTS public.project_opportunities;
DROP TABLE IF EXISTS public.opportunity_contacts;
DROP TABLE IF EXISTS public.opportunities;
DROP TABLE IF EXISTS public.pipelines;
DROP TABLE IF EXISTS public._migration_id_map;
