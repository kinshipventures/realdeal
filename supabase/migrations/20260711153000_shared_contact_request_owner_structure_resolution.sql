-- Keeps direct editor shares intact while giving editor-request shares the same
-- owner-workspace structure resolution once the owner approves the request.

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
  allowed_keys text[] := ARRAY[]::text[];
  visible_patch jsonb := '{}'::jsonb;
  blocked_key text;
  patch_key text;
  original_snapshot jsonb := '{}'::jsonb;
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

CREATE OR REPLACE FUNCTION public.resolve_shared_contact_change_request(
  _request_id uuid,
  _status text,
  _approved_contact_patch jsonb DEFAULT '{}'::jsonb
)
RETURNS public.collaboration_approval_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  request_row public.collaboration_approval_requests%ROWTYPE;
  target_contact public.contacts%ROWTYPE;
  updated_contact public.contacts%ROWTYPE;
  approved_patch jsonb := coalesce(_approved_contact_patch, '{}'::jsonb);
  visible_proposed_patch jsonb := '{}'::jsonb;
  visible_approved_patch jsonb := '{}'::jsonb;
  contact_patch jsonb := '{}'::jsonb;
  allowed_keys text[] := ARRAY[]::text[];
  blocked_key text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Unsupported shared contact change request status: %', _status;
  END IF;

  SELECT *
  INTO request_row
  FROM public.collaboration_approval_requests AS requests
  WHERE requests.id = _request_id
    AND requests.request_type = 'shared_contact_change'
    AND requests.status = 'pending'
  FOR UPDATE;

  IF request_row.id IS NULL THEN
    RAISE EXCEPTION 'Pending shared contact change request not found';
  END IF;

  IF NOT public.is_workspace_admin(request_row.workspace_id, current_user_id) THEN
    RAISE EXCEPTION 'Only workspace admins can resolve shared contact change requests';
  END IF;

  IF _status = 'rejected' THEN
    UPDATE public.collaboration_approval_requests AS requests
    SET status = 'rejected',
        approver_id = current_user_id,
        resolved_at = now(),
        approved_contact_patch = '{}'::jsonb
    WHERE requests.id = request_row.id
    RETURNING * INTO request_row;

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
      request_row.workspace_id,
      current_user_id,
      'Shared contact owner',
      'shared_contact_change_rejected',
      'contact',
      request_row.contact_id,
      request_row.contact_label,
      jsonb_build_object('request_id', request_row.id, 'access_grant_id', request_row.access_grant_id)
    );

    RETURN request_row;
  END IF;

  IF approved_patch IS NULL OR jsonb_typeof(approved_patch) <> 'object' THEN
    RAISE EXCEPTION 'Approved shared contact patch must be an object';
  END IF;

  visible_proposed_patch := coalesce(request_row.proposed_contact_patch, '{}'::jsonb) - '__shared_structure_resolution';
  visible_approved_patch := approved_patch - '__shared_structure_resolution';

  IF NOT EXISTS (SELECT 1 FROM jsonb_object_keys(visible_approved_patch)) THEN
    RAISE EXCEPTION 'Approve at least one shared contact change';
  END IF;

  SELECT key
  INTO blocked_key
  FROM jsonb_object_keys(visible_approved_patch) AS keys(key)
  WHERE NOT visible_proposed_patch ? key
  LIMIT 1;

  IF blocked_key IS NOT NULL THEN
    RAISE EXCEPTION 'Approved field was not proposed in this request: %', blocked_key;
  END IF;

  allowed_keys := public.shared_contact_allowed_patch_keys(request_row.requested_field_scopes);

  SELECT key
  INTO blocked_key
  FROM jsonb_object_keys(visible_approved_patch) AS keys(key)
  WHERE NOT key = ANY(allowed_keys)
  LIMIT 1;

  IF blocked_key IS NOT NULL THEN
    RAISE EXCEPTION 'Approved field is not in the original shared scope: %', blocked_key;
  END IF;

  SELECT contacts.*
  INTO target_contact
  FROM public.contacts AS contacts
  WHERE contacts.id::text = request_row.contact_id
    AND contacts.workspace_id = request_row.workspace_id
  FOR UPDATE;

  IF target_contact.id IS NULL THEN
    RAISE EXCEPTION 'Shared contact target was not found';
  END IF;

  contact_patch := visible_approved_patch;

  IF coalesce(request_row.proposed_contact_patch, '{}'::jsonb) ? '__shared_structure_resolution' THEN
    contact_patch := contact_patch || jsonb_build_object(
      '__shared_structure_resolution',
      request_row.proposed_contact_patch -> '__shared_structure_resolution'
    );
  END IF;

  contact_patch := public.shared_contact_resolve_structure_patch(
    request_row.workspace_id,
    target_contact.user_id,
    contact_patch
  );

  SELECT key
  INTO blocked_key
  FROM jsonb_object_keys(contact_patch) AS keys(key)
  WHERE NOT key = ANY(allowed_keys)
  LIMIT 1;

  IF blocked_key IS NOT NULL THEN
    RAISE EXCEPTION 'Resolved approved field is not in the original shared scope: %', blocked_key;
  END IF;

  updated_contact := public.apply_shared_contact_patch(request_row.workspace_id, target_contact.id, contact_patch);

  UPDATE public.collaboration_approval_requests AS requests
  SET status = 'approved',
      approver_id = current_user_id,
      resolved_at = now(),
      approved_contact_patch = visible_approved_patch
  WHERE requests.id = request_row.id
  RETURNING * INTO request_row;

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
    request_row.workspace_id,
    current_user_id,
    'Shared contact owner',
    'shared_contact_change_approved',
    'contact',
    updated_contact.id::text,
    updated_contact.name,
    jsonb_build_object(
      'request_id', request_row.id,
      'access_grant_id', request_row.access_grant_id,
      'approved_fields', (SELECT jsonb_agg(key) FROM jsonb_object_keys(visible_approved_patch) AS keys(key))
    )
  );

  RETURN request_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_shared_contact_change_request(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_shared_contact_change_request(uuid, text, jsonb) TO authenticated;
