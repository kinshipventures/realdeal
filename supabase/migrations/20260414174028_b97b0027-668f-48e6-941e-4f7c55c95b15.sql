
DO $$
DECLARE
  opp RECORD;
  _contact_id uuid;
  _contact_name text;
  _company_name text;
  _first_name text;
  _last_name text;
  _parts text[];
  _seed_user_id uuid := '9582e3a4-14d6-48b5-80ce-4f365b7f266a';
  _seed_workspace_id uuid := '2bb6de19-059d-4a94-8cda-4935840818bc';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _seed_user_id) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id = _seed_workspace_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.campaigns (id, name, type, status, user_id, workspace_id)
  VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'KV Pipeline',
    'deal_flow',
    'active',
    _seed_user_id,
    _seed_workspace_id
  )
  ON CONFLICT (id) DO NOTHING;

  FOR opp IN 
    SELECT o.id, o.name, o.stage_id, o.notes, o.status, o.created_at
    FROM opportunities o
    WHERE o.workspace_id = _seed_workspace_id
  LOOP
    -- Try junction table first
    SELECT oc.contact_id INTO _contact_id
    FROM opportunity_contacts oc
    WHERE oc.opportunity_id = opp.id
    LIMIT 1;

    IF _contact_id IS NULL THEN
      -- Parse name
      IF opp.name LIKE '%' || chr(8211) || '%' THEN
        _contact_name := trim(split_part(opp.name, chr(8211), 1));
        _company_name := trim(split_part(opp.name, chr(8211), 2));
      ELSIF opp.name LIKE '% - %' THEN
        _contact_name := trim(split_part(opp.name, ' - ', 1));
        _company_name := trim(split_part(opp.name, ' - ', 2));
      ELSE
        _contact_name := trim(opp.name);
        _company_name := NULL;
      END IF;

      -- Match by name
      SELECT c.id INTO _contact_id
      FROM contacts c
      WHERE c.workspace_id = _seed_workspace_id
        AND lower(c.name) = lower(_contact_name)
      LIMIT 1;

      -- Create contact if no match
      IF _contact_id IS NULL THEN
        _contact_id := gen_random_uuid();
        _parts := string_to_array(_contact_name, ' ');
        _first_name := _parts[1];
        _last_name := CASE WHEN array_length(_parts, 1) > 1 
          THEN array_to_string(_parts[2:], ' ') ELSE NULL END;

        INSERT INTO contacts (id, name, first_name, last_name, company, needs_review, type, status, user_id, workspace_id, import_source)
        VALUES (_contact_id, _contact_name, _first_name, _last_name, _company_name, true, 'Contact', 'Active',
                _seed_user_id, _seed_workspace_id, 'kv-pipeline-migration');
      END IF;
    END IF;

    INSERT INTO campaign_contacts (campaign_id, contact_id, stage_id, notes, status, user_id, workspace_id, moved_at, created_at)
    VALUES (
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      _contact_id,
      opp.stage_id,
      opp.notes,
      'pending',
      _seed_user_id,
      _seed_workspace_id,
      opp.created_at,
      opp.created_at
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;
