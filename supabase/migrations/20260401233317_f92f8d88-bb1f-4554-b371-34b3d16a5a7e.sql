
-- Drop all existing owner policies and replace with authenticated-user policies

DO $$ 
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'contacts','pods','categories','interactions','contact_pods','contact_categories',
    'campaigns','campaign_contacts','companies','field_config','pipelines','pipeline_stages',
    'opportunities','opportunity_contacts','projects','project_contacts','project_opportunities',
    '_migration_id_map'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_owner', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl || '_authenticated', tbl
    );
  END LOOP;
END $$;
