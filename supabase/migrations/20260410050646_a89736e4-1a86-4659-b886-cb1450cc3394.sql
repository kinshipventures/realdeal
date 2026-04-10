
DO $$
DECLARE
  ws_id uuid := '2bb6de19-059d-4a94-8cda-4935840818bc';
  rec record;
  fld text;
  fields text[];
  loser_pod_id uuid := 'c09ae3dd-4c15-46de-90ad-6297d7f68b68';
  survivor_pod_id uuid := '332a5d95-4da3-487f-a5a7-5a9786f9dfb9';
BEGIN
  -- PHASE 1: Merge Services Providers pod
  DELETE FROM contact_pods cp
  WHERE cp.pod_id = loser_pod_id
    AND EXISTS (SELECT 1 FROM contact_pods cp2 WHERE cp2.contact_id = cp.contact_id AND cp2.pod_id = survivor_pod_id);
  UPDATE contact_pods SET pod_id = survivor_pod_id WHERE pod_id = loser_pod_id;
  UPDATE categories SET pod_id = survivor_pod_id WHERE pod_id = loser_pod_id;
  DELETE FROM pods WHERE id = loser_pod_id;
  RAISE NOTICE 'Phase 1 complete';

  -- PHASE 2: Deduplicate contacts
  EXECUTE 'CREATE TEMP TABLE _dedup ON COMMIT DROP AS
    WITH ranked AS (
      SELECT id, lower(trim(name)) AS norm, created_at,
        ROW_NUMBER() OVER (PARTITION BY lower(trim(name)) ORDER BY created_at) AS rn
      FROM contacts WHERE workspace_id = $1
    )
    SELECT rk.id AS loser_id, sv.id AS survivor_id
    FROM ranked rk
    JOIN ranked sv ON sv.norm = rk.norm AND sv.rn = 1
    WHERE rk.rn > 1' USING ws_id;

  RAISE NOTICE 'Contact losers: %', (SELECT count(*) FROM _dedup);

  -- Coalesce fields
  fields := ARRAY[
    'first_name','last_name','email','email_2','email_3','phone','company','role',
    'location','website','linkedin','country','notes','intel_notes','recommended_by',
    'introduced_by','specialization','past_clients','birthday','milestones','interests',
    'relationship_context','relationship_owner','next_action','industry','stage','ticker','domain',
    'communication_preferences'
  ];
  FOREACH fld IN ARRAY fields LOOP
    EXECUTE format(
      'UPDATE contacts SET %I = sub.val
       FROM (
         SELECT DISTINCT ON (d.survivor_id) d.survivor_id, c.%I AS val
         FROM _dedup d JOIN contacts c ON c.id = d.loser_id
         WHERE c.%I IS NOT NULL AND c.%I <> ''''
         ORDER BY d.survivor_id, c.created_at
       ) sub
       WHERE contacts.id = sub.survivor_id AND (contacts.%I IS NULL OR contacts.%I = '''')',
      fld, fld, fld, fld, fld, fld
    );
  END LOOP;

  UPDATE contacts SET last_contacted_at = sub.latest
  FROM (
    SELECT d.survivor_id, MAX(c.last_contacted_at) AS latest
    FROM _dedup d JOIN contacts c ON c.id IN (d.loser_id, d.survivor_id)
    WHERE c.last_contacted_at IS NOT NULL GROUP BY d.survivor_id
  ) sub
  WHERE contacts.id = sub.survivor_id
    AND (contacts.last_contacted_at IS NULL OR contacts.last_contacted_at < sub.latest);

  -- Process each loser individually for junction tables
  FOR rec IN SELECT loser_id, survivor_id FROM _dedup LOOP
    -- contact_pods: move unique, delete dups
    UPDATE contact_pods SET contact_id = rec.survivor_id
    WHERE contact_id = rec.loser_id
      AND NOT EXISTS (SELECT 1 FROM contact_pods cp2 WHERE cp2.contact_id = rec.survivor_id AND cp2.pod_id = contact_pods.pod_id);
    DELETE FROM contact_pods WHERE contact_id = rec.loser_id;

    -- contact_categories
    UPDATE contact_categories SET contact_id = rec.survivor_id
    WHERE contact_id = rec.loser_id
      AND NOT EXISTS (SELECT 1 FROM contact_categories cc2 WHERE cc2.contact_id = rec.survivor_id AND cc2.category_id = contact_categories.category_id);
    DELETE FROM contact_categories WHERE contact_id = rec.loser_id;

    -- interactions (no unique constraint)
    UPDATE interactions SET contact_id = rec.survivor_id WHERE contact_id = rec.loser_id;

    -- campaign_contacts
    UPDATE campaign_contacts SET contact_id = rec.survivor_id
    WHERE contact_id = rec.loser_id
      AND NOT EXISTS (SELECT 1 FROM campaign_contacts cc2 WHERE cc2.contact_id = rec.survivor_id AND cc2.campaign_id = campaign_contacts.campaign_id);
    DELETE FROM campaign_contacts WHERE contact_id = rec.loser_id;

    -- opportunity_contacts
    UPDATE opportunity_contacts SET contact_id = rec.survivor_id
    WHERE contact_id = rec.loser_id
      AND NOT EXISTS (SELECT 1 FROM opportunity_contacts oc2 WHERE oc2.contact_id = rec.survivor_id AND oc2.opportunity_id = opportunity_contacts.opportunity_id);
    DELETE FROM opportunity_contacts WHERE contact_id = rec.loser_id;

    -- project_contacts
    UPDATE project_contacts SET contact_id = rec.survivor_id
    WHERE contact_id = rec.loser_id
      AND NOT EXISTS (SELECT 1 FROM project_contacts pc2 WHERE pc2.contact_id = rec.survivor_id AND pc2.project_id = project_contacts.project_id);
    DELETE FROM project_contacts WHERE contact_id = rec.loser_id;

    -- Delete loser contact
    DELETE FROM contacts WHERE id = rec.loser_id;
  END LOOP;

  RAISE NOTICE 'Phase 2 complete. Remaining: %', (SELECT count(*) FROM contacts WHERE workspace_id = ws_id);

  -- PHASE 3: Companies
  EXECUTE 'CREATE TEMP TABLE _cdedup ON COMMIT DROP AS
    WITH ranked AS (
      SELECT id, lower(trim(name)) AS norm, created_at,
        ROW_NUMBER() OVER (PARTITION BY lower(trim(name)) ORDER BY created_at) AS rn
      FROM companies WHERE workspace_id = $1
    )
    SELECT rk.id AS loser_id, sv.id AS survivor_id
    FROM ranked rk JOIN ranked sv ON sv.norm = rk.norm AND sv.rn = 1
    WHERE rk.rn > 1' USING ws_id;

  fields := ARRAY['domain','website','industry','location','notes','stage','ticker'];
  FOREACH fld IN ARRAY fields LOOP
    EXECUTE format(
      'UPDATE companies SET %I = sub.val
       FROM (
         SELECT DISTINCT ON (d.survivor_id) d.survivor_id, c.%I AS val
         FROM _cdedup d JOIN companies c ON c.id = d.loser_id
         WHERE c.%I IS NOT NULL AND c.%I <> ''''
         ORDER BY d.survivor_id, c.created_at
       ) sub
       WHERE companies.id = sub.survivor_id AND (companies.%I IS NULL OR companies.%I = '''')',
      fld, fld, fld, fld, fld, fld
    );
  END LOOP;

  UPDATE contacts SET company_id = d.survivor_id FROM _cdedup d WHERE contacts.company_id = d.loser_id;
  DELETE FROM companies WHERE id IN (SELECT loser_id FROM _cdedup);
  RAISE NOTICE 'Phase 3 complete. Companies remaining: %', (SELECT count(*) FROM companies WHERE workspace_id = ws_id);
END $$;
