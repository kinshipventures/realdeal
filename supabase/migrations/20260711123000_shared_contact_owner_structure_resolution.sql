-- Resolve shared-contact structure edits into the owner's workspace before saving.
-- This prevents receiver-local pod, sub-pod, or company ids from being written to owner contacts.

CREATE OR REPLACE FUNCTION public.shared_contact_try_uuid(_value text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF _value IS NULL OR btrim(_value) = '' THEN
    RETURN NULL;
  END IF;

  RETURN _value::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.shared_contact_normalized_label(_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(regexp_replace(btrim(coalesce(_value, '')), '\s+', ' ', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.shared_contact_resolution_item(
  _resolution jsonb,
  _collection text,
  _id text
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce((
    SELECT item
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(coalesce(_resolution, '{}'::jsonb) -> _collection) = 'array'
          THEN coalesce(_resolution, '{}'::jsonb) -> _collection
        ELSE '[]'::jsonb
      END
    ) AS items(item)
    WHERE item ->> 'id' = _id
    LIMIT 1
  ), '{}'::jsonb);
$$;

CREATE OR REPLACE FUNCTION public.shared_contact_resolve_pod_id(
  _workspace_id uuid,
  _owner_user_id uuid,
  _id_text text,
  _label text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_id uuid := public.shared_contact_try_uuid(_id_text);
  normalized_label text := public.shared_contact_normalized_label(_label);
BEGIN
  IF resolved_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.pods
    WHERE pods.id = resolved_id
      AND pods.workspace_id = _workspace_id
  ) THEN
    RETURN resolved_id;
  END IF;

  IF normalized_label = '' THEN
    RAISE EXCEPTION 'Shared contact pod could not be resolved in owner workspace';
  END IF;

  SELECT pods.id
  INTO resolved_id
  FROM public.pods
  WHERE pods.workspace_id = _workspace_id
    AND public.shared_contact_normalized_label(pods.name) = normalized_label
  ORDER BY pods.created_at
  LIMIT 1;

  IF resolved_id IS NULL THEN
    INSERT INTO public.pods (
      user_id,
      workspace_id,
      name,
      is_priority,
      enrichment_opt_in
    )
    VALUES (
      _owner_user_id,
      _workspace_id,
      btrim(_label),
      false,
      false
    )
    RETURNING id INTO resolved_id;
  END IF;

  RETURN resolved_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.shared_contact_resolve_category_id(
  _workspace_id uuid,
  _owner_user_id uuid,
  _id_text text,
  _label text,
  _pod_id_text text,
  _pod_label text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_id uuid := public.shared_contact_try_uuid(_id_text);
  resolved_pod_id uuid := NULL;
  normalized_label text := public.shared_contact_normalized_label(_label);
BEGIN
  IF resolved_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.categories
    WHERE categories.id = resolved_id
      AND categories.workspace_id = _workspace_id
  ) THEN
    RETURN resolved_id;
  END IF;

  IF normalized_label = '' THEN
    RAISE EXCEPTION 'Shared contact sub-pod could not be resolved in owner workspace';
  END IF;

  IF coalesce(nullif(_pod_id_text, ''), nullif(_pod_label, '')) IS NOT NULL THEN
    resolved_pod_id := public.shared_contact_resolve_pod_id(
      _workspace_id,
      _owner_user_id,
      _pod_id_text,
      _pod_label
    );
  END IF;

  SELECT categories.id
  INTO resolved_id
  FROM public.categories
  WHERE categories.workspace_id = _workspace_id
    AND public.shared_contact_normalized_label(categories.name) = normalized_label
    AND (
      resolved_pod_id IS NULL
      OR categories.pod_id = resolved_pod_id
    )
  ORDER BY categories.created_at
  LIMIT 1;

  IF resolved_id IS NULL THEN
    IF resolved_pod_id IS NULL THEN
      RAISE EXCEPTION 'Shared contact sub-pod requires a parent pod in owner workspace';
    END IF;

    INSERT INTO public.categories (
      user_id,
      workspace_id,
      pod_id,
      name
    )
    VALUES (
      _owner_user_id,
      _workspace_id,
      resolved_pod_id,
      btrim(_label)
    )
    RETURNING id INTO resolved_id;
  END IF;

  RETURN resolved_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.shared_contact_resolve_company_id(
  _workspace_id uuid,
  _owner_user_id uuid,
  _id_text text,
  _label text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_id uuid := public.shared_contact_try_uuid(_id_text);
  normalized_label text := public.shared_contact_normalized_label(_label);
BEGIN
  IF resolved_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.contacts AS companies
    WHERE companies.id = resolved_id
      AND companies.workspace_id = _workspace_id
      AND companies.type::text = 'Company'
  ) THEN
    RETURN resolved_id;
  END IF;

  IF normalized_label = '' THEN
    RAISE EXCEPTION 'Shared contact company could not be resolved in owner workspace';
  END IF;

  SELECT companies.id
  INTO resolved_id
  FROM public.contacts AS companies
  WHERE companies.workspace_id = _workspace_id
    AND companies.type::text = 'Company'
    AND public.shared_contact_normalized_label(companies.name) = normalized_label
  ORDER BY companies.created_at
  LIMIT 1;

  IF resolved_id IS NULL THEN
    INSERT INTO public.contacts (
      user_id,
      workspace_id,
      name,
      type,
      status,
      custom_fields
    )
    VALUES (
      _owner_user_id,
      _workspace_id,
      btrim(_label),
      'Company'::public.relationship_type,
      'Active'::public.relationship_status,
      '{}'::jsonb
    )
    RETURNING id INTO resolved_id;
  END IF;

  RETURN resolved_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.shared_contact_resolve_structure_patch(
  _workspace_id uuid,
  _owner_user_id uuid,
  _contact_patch jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolution jsonb := coalesce(_contact_patch -> '__shared_structure_resolution', '{}'::jsonb);
  resolved_patch jsonb := coalesce(_contact_patch, '{}'::jsonb) - '__shared_structure_resolution';
  current_id text;
  item jsonb;
  resolved_ids text[];
  resolved_id uuid;
BEGIN
  IF resolved_patch ? 'list_ids' THEN
    resolved_ids := ARRAY[]::text[];
    IF jsonb_typeof(resolved_patch -> 'list_ids') = 'array' THEN
      FOR current_id IN SELECT jsonb_array_elements_text(resolved_patch -> 'list_ids')
      LOOP
        item := public.shared_contact_resolution_item(resolution, 'pods', current_id);
        resolved_id := public.shared_contact_resolve_pod_id(
          _workspace_id,
          _owner_user_id,
          current_id,
          item ->> 'label'
        );
        resolved_ids := array_append(resolved_ids, resolved_id::text);
      END LOOP;
    END IF;
    resolved_patch := jsonb_set(resolved_patch, '{list_ids}', to_jsonb(resolved_ids), true);
  END IF;

  IF resolved_patch ? 'primary_list_id' THEN
    current_id := nullif(resolved_patch ->> 'primary_list_id', '');
    IF current_id IS NULL THEN
      resolved_patch := jsonb_set(resolved_patch, '{primary_list_id}', 'null'::jsonb, true);
    ELSE
      item := public.shared_contact_resolution_item(resolution, 'pods', current_id);
      resolved_id := public.shared_contact_resolve_pod_id(
        _workspace_id,
        _owner_user_id,
        current_id,
        item ->> 'label'
      );
      resolved_patch := jsonb_set(resolved_patch, '{primary_list_id}', to_jsonb(resolved_id::text), true);
    END IF;
  END IF;

  IF resolved_patch ? 'category_ids' THEN
    resolved_ids := ARRAY[]::text[];
    IF jsonb_typeof(resolved_patch -> 'category_ids') = 'array' THEN
      FOR current_id IN SELECT jsonb_array_elements_text(resolved_patch -> 'category_ids')
      LOOP
        item := public.shared_contact_resolution_item(resolution, 'categories', current_id);
        resolved_id := public.shared_contact_resolve_category_id(
          _workspace_id,
          _owner_user_id,
          current_id,
          item ->> 'label',
          item ->> 'pod_id',
          item ->> 'pod_label'
        );
        resolved_ids := array_append(resolved_ids, resolved_id::text);
      END LOOP;
    END IF;
    resolved_patch := jsonb_set(resolved_patch, '{category_ids}', to_jsonb(resolved_ids), true);
  END IF;

  IF resolved_patch ? 'company_record_id' THEN
    current_id := nullif(resolved_patch ->> 'company_record_id', '');
    IF current_id IS NULL THEN
      resolved_patch := jsonb_set(resolved_patch, '{company_record_id}', 'null'::jsonb, true);
    ELSE
      item := public.shared_contact_resolution_item(resolution, 'companies', current_id);
      resolved_id := public.shared_contact_resolve_company_id(
        _workspace_id,
        _owner_user_id,
        current_id,
        item ->> 'label'
      );
      resolved_patch := jsonb_set(resolved_patch, '{company_record_id}', to_jsonb(resolved_id::text), true);
    END IF;
  END IF;

  IF resolved_patch ? 'company_ids' THEN
    resolved_ids := ARRAY[]::text[];
    IF jsonb_typeof(resolved_patch -> 'company_ids') = 'array' THEN
      FOR current_id IN SELECT jsonb_array_elements_text(resolved_patch -> 'company_ids')
      LOOP
        item := public.shared_contact_resolution_item(resolution, 'companies', current_id);
        resolved_id := public.shared_contact_resolve_company_id(
          _workspace_id,
          _owner_user_id,
          current_id,
          item ->> 'label'
        );
        resolved_ids := array_append(resolved_ids, resolved_id::text);
      END LOOP;
    END IF;
    resolved_patch := jsonb_set(resolved_patch, '{company_ids}', to_jsonb(resolved_ids), true);
  END IF;

  RETURN resolved_patch;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_shared_contact_with_grant(
  _grant_id uuid,
  _contact_id uuid,
  _contact_patch jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  target_grant public.collaboration_access_grants%ROWTYPE;
  target_contact public.contacts%ROWTYPE;
  updated_contact public.contacts%ROWTYPE;
  contact_patch jsonb := _contact_patch;
  allowed_keys text[] := ARRAY[]::text[];
  blocked_key text;
  has_exact_visible_tokens boolean := false;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF contact_patch IS NULL OR jsonb_typeof(contact_patch) <> 'object' THEN
    RAISE EXCEPTION 'Shared contact patch must be an object';
  END IF;

  SELECT *
  INTO target_grant
  FROM public.collaboration_access_grants AS grants
  WHERE grants.id = _grant_id
    AND grants.subject_type = 'user'
    AND grants.status = 'accepted'
    AND grants.revoked_at IS NULL
    AND (grants.expires_at IS NULL OR grants.expires_at > now())
    AND grants.permission_level IN ('edit', 'admin')
    AND (
      grants.subject_id = current_user_id::text
      OR (
        current_email <> ''
        AND lower(coalesce(grants.subject_email, '')) = current_email
      )
    )
  FOR UPDATE;

  IF target_grant.id IS NULL THEN
    RAISE EXCEPTION 'Editable shared contact grant not found';
  END IF;

  SELECT contacts.*
  INTO target_contact
  FROM public.contacts AS contacts
  WHERE contacts.id = _contact_id
    AND contacts.workspace_id = target_grant.workspace_id
    AND (
      (
        target_grant.resource_type = 'contact'
        AND contacts.id::text = target_grant.resource_id
      ) OR (
        target_grant.resource_type = 'pod'
        AND (
          target_grant.resource_id = ANY(coalesce(contacts.pod_ids::text[], ARRAY[]::text[]))
          OR target_grant.resource_id = ANY(coalesce(contacts.category_ids::text[], ARRAY[]::text[]))
        )
      ) OR (
        target_grant.resource_type = 'campaign'
        AND EXISTS (
          SELECT 1
          FROM public.campaign_contacts AS campaign_contacts
          WHERE campaign_contacts.workspace_id = target_grant.workspace_id
            AND campaign_contacts.campaign_id::text = target_grant.resource_id
            AND campaign_contacts.contact_id = contacts.id
        )
      ) OR (
        target_grant.resource_type = 'company'
        AND (
          contacts.id::text = target_grant.resource_id
          OR contacts.company_id::text = target_grant.resource_id
          OR target_grant.resource_id = ANY(coalesce(contacts.company_ids::text[], ARRAY[]::text[]))
        )
      )
    )
  FOR UPDATE;

  IF target_contact.id IS NULL THEN
    RAISE EXCEPTION 'Shared contact is not covered by this grant';
  END IF;

  contact_patch := public.shared_contact_resolve_structure_patch(
    target_grant.workspace_id,
    target_contact.user_id,
    contact_patch
  );

  allowed_keys := public.shared_contact_allowed_patch_keys(target_grant.field_scopes);

  SELECT key
  INTO blocked_key
  FROM jsonb_object_keys(contact_patch) AS keys(key)
  WHERE NOT key = ANY(allowed_keys)
  LIMIT 1;

  IF blocked_key IS NOT NULL THEN
    RAISE EXCEPTION 'Shared contact field is not visible for editing: %', blocked_key;
  END IF;

  updated_contact := public.apply_shared_contact_patch(target_grant.workspace_id, _contact_id, contact_patch);

  INSERT INTO public.collaboration_audit_events (
    workspace_id,
    actor_user_id,
    actor_label,
    event_type,
    resource_type,
    resource_id,
    resource_label,
    metadata
  )
  VALUES (
    target_grant.workspace_id,
    current_user_id,
    coalesce(nullif(current_email, ''), 'Shared contact collaborator'),
    'shared_contact_updated',
    'contact',
    updated_contact.id::text,
    updated_contact.name,
    jsonb_build_object(
      'grant_id', target_grant.id,
      'permission_level', target_grant.permission_level,
      'updated_fields', (SELECT jsonb_agg(key) FROM jsonb_object_keys(contact_patch) AS keys(key))
    )
  );

  SELECT EXISTS (
    SELECT 1
    FROM unnest(coalesce(target_grant.field_scopes, ARRAY[]::text[])) AS field_scope(scope)
    WHERE field_scope.scope LIKE 'visible:%'
  ) INTO has_exact_visible_tokens;

  RETURN public.shared_contact_scoped_json(
    updated_contact,
    target_grant.field_scopes,
    target_grant.workspace_id,
    has_exact_visible_tokens,
    target_grant.resource_type,
    target_grant.resource_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_shared_contact_with_grant(uuid, uuid, jsonb) TO authenticated;
