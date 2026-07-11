-- Keeps editor-request approvals to one pending request per shared contact.
-- Direct editor shares continue to use update_shared_contact_with_grant and are not changed here.

DO $$
DECLARE
  group_rec record;
  request_rec record;
  keep_id uuid;
  merged_proposed jsonb;
  merged_original jsonb;
BEGIN
  FOR group_rec IN
    SELECT workspace_id, access_grant_id, contact_id, requested_by
    FROM public.collaboration_approval_requests
    WHERE request_type = 'shared_contact_change'
      AND status = 'pending'
      AND access_grant_id IS NOT NULL
    GROUP BY workspace_id, access_grant_id, contact_id, requested_by
    HAVING count(*) > 1
  LOOP
    keep_id := NULL;
    merged_proposed := '{}'::jsonb;
    merged_original := '{}'::jsonb;

    FOR request_rec IN
      SELECT id, proposed_contact_patch, original_contact_snapshot
      FROM public.collaboration_approval_requests AS requests
      WHERE requests.request_type = 'shared_contact_change'
        AND requests.status = 'pending'
        AND requests.workspace_id = group_rec.workspace_id
        AND requests.access_grant_id IS NOT DISTINCT FROM group_rec.access_grant_id
        AND requests.contact_id IS NOT DISTINCT FROM group_rec.contact_id
        AND requests.requested_by IS NOT DISTINCT FROM group_rec.requested_by
      ORDER BY requests.created_at ASC, requests.id ASC
    LOOP
      IF keep_id IS NULL THEN
        keep_id := request_rec.id;
      END IF;

      merged_proposed := merged_proposed || coalesce(request_rec.proposed_contact_patch, '{}'::jsonb);
      merged_original := coalesce(request_rec.original_contact_snapshot, '{}'::jsonb) || merged_original;
    END LOOP;

    UPDATE public.collaboration_approval_requests AS requests
    SET proposed_contact_patch = merged_proposed,
        original_contact_snapshot = merged_original
    WHERE requests.id = keep_id;

    DELETE FROM public.collaboration_approval_requests AS requests
    WHERE requests.request_type = 'shared_contact_change'
      AND requests.status = 'pending'
      AND requests.workspace_id = group_rec.workspace_id
      AND requests.access_grant_id IS NOT DISTINCT FROM group_rec.access_grant_id
      AND requests.contact_id IS NOT DISTINCT FROM group_rec.contact_id
      AND requests.requested_by IS NOT DISTINCT FROM group_rec.requested_by
      AND requests.id <> keep_id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.create_shared_contact_change_request(
  _grant_id uuid,
  _contact_id uuid,
  _contact_patch jsonb
)
RETURNS public.collaboration_approval_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  target_grant public.collaboration_access_grants%ROWTYPE;
  target_contact public.contacts%ROWTYPE;
  created_request public.collaboration_approval_requests%ROWTYPE;
  existing_request public.collaboration_approval_requests%ROWTYPE;
  allowed_keys text[] := ARRAY[]::text[];
  visible_patch jsonb := '{}'::jsonb;
  blocked_key text;
  patch_key text;
  original_snapshot jsonb := '{}'::jsonb;
  merged_original_snapshot jsonb := '{}'::jsonb;
  contact_payload jsonb;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _contact_patch IS NULL OR jsonb_typeof(_contact_patch) <> 'object' THEN
    RAISE EXCEPTION 'Shared contact change request patch must be an object';
  END IF;

  visible_patch := _contact_patch - '__shared_structure_resolution';

  IF NOT EXISTS (SELECT 1 FROM jsonb_object_keys(visible_patch)) THEN
    RAISE EXCEPTION 'Shared contact change request patch cannot be empty';
  END IF;

  SELECT *
  INTO target_grant
  FROM public.collaboration_access_grants AS grants
  WHERE grants.id = _grant_id
    AND grants.subject_type = 'user'
    AND grants.status = 'accepted'
    AND grants.revoked_at IS NULL
    AND (grants.expires_at IS NULL OR grants.expires_at > now())
    AND grants.permission_level = 'suggest'
    AND (
      grants.subject_id = current_user_id::text
      OR (
        current_email <> ''
        AND lower(coalesce(grants.subject_email, '')) = current_email
      )
    )
  FOR UPDATE;

  IF target_grant.id IS NULL THEN
    RAISE EXCEPTION 'Editor request shared contact grant not found';
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

  allowed_keys := public.shared_contact_allowed_patch_keys(target_grant.field_scopes);

  SELECT key
  INTO blocked_key
  FROM jsonb_object_keys(visible_patch) AS keys(key)
  WHERE NOT key = ANY(allowed_keys)
  LIMIT 1;

  IF blocked_key IS NOT NULL THEN
    RAISE EXCEPTION 'Shared contact field is not visible for request: %', blocked_key;
  END IF;

  contact_payload := to_jsonb(target_contact);
  FOR patch_key IN SELECT key FROM jsonb_object_keys(visible_patch) AS keys(key) LOOP
    original_snapshot := jsonb_set(
      original_snapshot,
      ARRAY[patch_key],
      coalesce(contact_payload -> patch_key, 'null'::jsonb),
      true
    );
  END LOOP;

  SELECT *
  INTO existing_request
  FROM public.collaboration_approval_requests AS requests
  WHERE requests.access_grant_id = target_grant.id
    AND requests.contact_id = target_contact.id::text
    AND requests.requested_by = current_user_id
    AND requests.request_type = 'shared_contact_change'
    AND requests.status = 'pending'
  ORDER BY requests.created_at ASC, requests.id ASC
  LIMIT 1
  FOR UPDATE;

  IF existing_request.id IS NOT NULL THEN
    merged_original_snapshot := coalesce(existing_request.original_contact_snapshot, '{}'::jsonb);

    FOR patch_key IN SELECT key FROM jsonb_object_keys(visible_patch) AS keys(key) LOOP
      IF NOT merged_original_snapshot ? patch_key THEN
        merged_original_snapshot := jsonb_set(
          merged_original_snapshot,
          ARRAY[patch_key],
          coalesce(contact_payload -> patch_key, 'null'::jsonb),
          true
        );
      END IF;
    END LOOP;

    UPDATE public.collaboration_approval_requests AS requests
    SET campaign_id = CASE WHEN target_grant.resource_type = 'campaign' THEN target_grant.resource_id ELSE NULL END,
        campaign_label = CASE WHEN target_grant.resource_type = 'campaign' THEN target_grant.resource_label ELSE NULL END,
        contact_label = target_contact.name,
        requested_by_label = coalesce(nullif(current_email, ''), target_grant.subject_label, 'Shared contact editor'),
        reason = 'Shared contact editor change request',
        requested_field_scopes = target_grant.field_scopes,
        proposed_contact_patch = coalesce(requests.proposed_contact_patch, '{}'::jsonb) || _contact_patch,
        original_contact_snapshot = merged_original_snapshot
    WHERE requests.id = existing_request.id
    RETURNING * INTO created_request;

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
      coalesce(nullif(current_email, ''), target_grant.subject_label, 'Shared contact editor'),
      'shared_contact_change_requested',
      'contact',
      target_contact.id::text,
      target_contact.name,
      jsonb_build_object(
        'grant_id', target_grant.id,
        'request_id', created_request.id,
        'merged_into_existing', true,
        'requested_fields', (SELECT jsonb_agg(key) FROM jsonb_object_keys(visible_patch) AS keys(key))
      )
    );

    RETURN created_request;
  END IF;

  INSERT INTO public.collaboration_approval_requests (
    workspace_id,
    campaign_id,
    campaign_label,
    contact_id,
    contact_label,
    request_type,
    requested_by,
    requested_by_label,
    status,
    reason,
    requested_field_scopes,
    access_grant_id,
    proposed_contact_patch,
    original_contact_snapshot
  )
  VALUES (
    target_grant.workspace_id,
    CASE WHEN target_grant.resource_type = 'campaign' THEN target_grant.resource_id ELSE NULL END,
    CASE WHEN target_grant.resource_type = 'campaign' THEN target_grant.resource_label ELSE NULL END,
    target_contact.id::text,
    target_contact.name,
    'shared_contact_change',
    current_user_id,
    coalesce(nullif(current_email, ''), target_grant.subject_label, 'Shared contact editor'),
    'pending',
    'Shared contact editor change request',
    target_grant.field_scopes,
    target_grant.id,
    _contact_patch,
    original_snapshot
  )
  RETURNING * INTO created_request;

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
    coalesce(nullif(current_email, ''), target_grant.subject_label, 'Shared contact editor'),
    'shared_contact_change_requested',
    'contact',
    target_contact.id::text,
    target_contact.name,
    jsonb_build_object(
      'grant_id', target_grant.id,
      'request_id', created_request.id,
      'requested_fields', (SELECT jsonb_agg(key) FROM jsonb_object_keys(visible_patch) AS keys(key))
    )
  );

  RETURN created_request;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_shared_contact_change_request(uuid, uuid, jsonb) TO authenticated;
