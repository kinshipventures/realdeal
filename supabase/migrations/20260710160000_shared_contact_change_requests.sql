ALTER TABLE public.collaboration_approval_requests
  ADD COLUMN IF NOT EXISTS access_grant_id uuid REFERENCES public.collaboration_access_grants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proposed_contact_patch jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS original_contact_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS approved_contact_patch jsonb;

ALTER TABLE public.collaboration_approval_requests
  DROP CONSTRAINT IF EXISTS collaboration_approval_requests_request_type_check;

ALTER TABLE public.collaboration_approval_requests
  ADD CONSTRAINT collaboration_approval_requests_request_type_check
  CHECK (request_type IN ('campaign_participation', 'private_information_access', 'shared_contact_change'));

CREATE INDEX IF NOT EXISTS idx_collaboration_approval_requests_access_grant
  ON public.collaboration_approval_requests(access_grant_id, status, created_at DESC);

CREATE OR REPLACE FUNCTION public.shared_contact_allowed_patch_keys(_field_scopes text[])
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  allowed_keys text[] := ARRAY[]::text[];
BEGIN
  IF 'public_profile' = ANY(_field_scopes) THEN
    allowed_keys := allowed_keys || ARRAY[
      'name', 'company', 'role', 'linkedin', 'website', 'industry', 'stage',
      'ticker', 'domain', 'country', 'global_region', 'first_name', 'last_name',
      'type', 'status'
    ];
  END IF;

  IF 'private_contact' = ANY(_field_scopes) THEN
    allowed_keys := allowed_keys || ARRAY[
      'email', 'email_2', 'email_3', 'phone', 'location', 'communication_preferences'
    ];
  END IF;

  IF 'relationship_private' = ANY(_field_scopes) THEN
    allowed_keys := allowed_keys || ARRAY[
      'notes', 'recommended_by', 'specialization', 'past_clients', 'birthday',
      'milestones', 'interests', 'relationship_context', 'last_contacted_at',
      'gender', 'introduced_by', 'intel_notes', 'relationship_owner',
      'contact_frequency', 'next_follow_up_date', 'next_action',
      'cadence_override', 'custom_fields'
    ];
  END IF;

  IF 'investment_private' = ANY(_field_scopes) THEN
    allowed_keys := allowed_keys || ARRAY['kv_fund_investor', 'spv_investor', 'custom_fields'];
  END IF;

  IF 'campaign_private' = ANY(_field_scopes) THEN
    allowed_keys := allowed_keys || ARRAY['custom_fields'];
  END IF;

  RETURN allowed_keys;
END;
$$;

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

  IF NOT EXISTS (SELECT 1 FROM jsonb_object_keys(_contact_patch)) THEN
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
  FROM jsonb_object_keys(_contact_patch) AS keys(key)
  WHERE NOT key = ANY(allowed_keys)
  LIMIT 1;

  IF blocked_key IS NOT NULL THEN
    RAISE EXCEPTION 'Shared contact field is not visible for request: %', blocked_key;
  END IF;

  contact_payload := to_jsonb(target_contact);
  FOR patch_key IN SELECT key FROM jsonb_object_keys(_contact_patch) AS keys(key) LOOP
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
      'requested_fields', (SELECT jsonb_agg(key) FROM jsonb_object_keys(_contact_patch) AS keys(key))
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
  updated_contact public.contacts%ROWTYPE;
  approved_patch jsonb := coalesce(_approved_contact_patch, '{}'::jsonb);
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

  IF NOT EXISTS (SELECT 1 FROM jsonb_object_keys(approved_patch)) THEN
    RAISE EXCEPTION 'Approve at least one shared contact change';
  END IF;

  SELECT key
  INTO blocked_key
  FROM jsonb_object_keys(approved_patch) AS keys(key)
  WHERE NOT request_row.proposed_contact_patch ? key
  LIMIT 1;

  IF blocked_key IS NOT NULL THEN
    RAISE EXCEPTION 'Approved field was not proposed in this request: %', blocked_key;
  END IF;

  allowed_keys := public.shared_contact_allowed_patch_keys(request_row.requested_field_scopes);

  SELECT key
  INTO blocked_key
  FROM jsonb_object_keys(approved_patch) AS keys(key)
  WHERE NOT key = ANY(allowed_keys)
  LIMIT 1;

  IF blocked_key IS NOT NULL THEN
    RAISE EXCEPTION 'Approved field is not in the original shared scope: %', blocked_key;
  END IF;

  UPDATE public.contacts AS contacts
  SET
    name = CASE WHEN approved_patch ? 'name' THEN coalesce(nullif(btrim(approved_patch ->> 'name'), ''), contacts.name) ELSE contacts.name END,
    email = CASE WHEN approved_patch ? 'email' THEN nullif(approved_patch ->> 'email', '') ELSE contacts.email END,
    phone = CASE WHEN approved_patch ? 'phone' THEN nullif(approved_patch ->> 'phone', '') ELSE contacts.phone END,
    company = CASE WHEN approved_patch ? 'company' THEN nullif(approved_patch ->> 'company', '') ELSE contacts.company END,
    role = CASE WHEN approved_patch ? 'role' THEN nullif(approved_patch ->> 'role', '') ELSE contacts.role END,
    location = CASE WHEN approved_patch ? 'location' THEN nullif(approved_patch ->> 'location', '') ELSE contacts.location END,
    website = CASE WHEN approved_patch ? 'website' THEN nullif(approved_patch ->> 'website', '') ELSE contacts.website END,
    notes = CASE WHEN approved_patch ? 'notes' THEN nullif(approved_patch ->> 'notes', '') ELSE contacts.notes END,
    recommended_by = CASE WHEN approved_patch ? 'recommended_by' THEN nullif(approved_patch ->> 'recommended_by', '') ELSE contacts.recommended_by END,
    specialization = CASE WHEN approved_patch ? 'specialization' THEN nullif(approved_patch ->> 'specialization', '') ELSE contacts.specialization END,
    past_clients = CASE WHEN approved_patch ? 'past_clients' THEN nullif(approved_patch ->> 'past_clients', '') ELSE contacts.past_clients END,
    birthday = CASE WHEN approved_patch ? 'birthday' THEN nullif(approved_patch ->> 'birthday', '') ELSE contacts.birthday END,
    milestones = CASE WHEN approved_patch ? 'milestones' THEN nullif(approved_patch ->> 'milestones', '') ELSE contacts.milestones END,
    interests = CASE WHEN approved_patch ? 'interests' THEN nullif(approved_patch ->> 'interests', '') ELSE contacts.interests END,
    relationship_context = CASE WHEN approved_patch ? 'relationship_context' THEN nullif(approved_patch ->> 'relationship_context', '') ELSE contacts.relationship_context END,
    last_contacted_at = CASE WHEN approved_patch ? 'last_contacted_at' THEN nullif(approved_patch ->> 'last_contacted_at', '')::date ELSE contacts.last_contacted_at END,
    cadence_override = CASE WHEN approved_patch ? 'cadence_override' THEN nullif(approved_patch ->> 'cadence_override', '')::public.cadence ELSE contacts.cadence_override END,
    first_name = CASE WHEN approved_patch ? 'first_name' THEN nullif(approved_patch ->> 'first_name', '') ELSE contacts.first_name END,
    last_name = CASE WHEN approved_patch ? 'last_name' THEN nullif(approved_patch ->> 'last_name', '') ELSE contacts.last_name END,
    linkedin = CASE WHEN approved_patch ? 'linkedin' THEN nullif(approved_patch ->> 'linkedin', '') ELSE contacts.linkedin END,
    country = CASE WHEN approved_patch ? 'country' THEN nullif(approved_patch ->> 'country', '') ELSE contacts.country END,
    global_region = CASE WHEN approved_patch ? 'global_region' THEN nullif(approved_patch ->> 'global_region', '')::public.global_region ELSE contacts.global_region END,
    gender = CASE WHEN approved_patch ? 'gender' THEN nullif(approved_patch ->> 'gender', '')::public.gender_type ELSE contacts.gender END,
    introduced_by = CASE WHEN approved_patch ? 'introduced_by' THEN nullif(approved_patch ->> 'introduced_by', '') ELSE contacts.introduced_by END,
    intel_notes = CASE WHEN approved_patch ? 'intel_notes' THEN nullif(approved_patch ->> 'intel_notes', '') ELSE contacts.intel_notes END,
    relationship_owner = CASE WHEN approved_patch ? 'relationship_owner' THEN nullif(approved_patch ->> 'relationship_owner', '') ELSE contacts.relationship_owner END,
    contact_frequency = CASE WHEN approved_patch ? 'contact_frequency' THEN nullif(approved_patch ->> 'contact_frequency', '')::public.contact_frequency ELSE contacts.contact_frequency END,
    communication_preferences = CASE WHEN approved_patch ? 'communication_preferences' THEN nullif(approved_patch ->> 'communication_preferences', '') ELSE contacts.communication_preferences END,
    next_follow_up_date = CASE WHEN approved_patch ? 'next_follow_up_date' THEN nullif(approved_patch ->> 'next_follow_up_date', '')::date ELSE contacts.next_follow_up_date END,
    next_action = CASE WHEN approved_patch ? 'next_action' THEN nullif(approved_patch ->> 'next_action', '') ELSE contacts.next_action END,
    kv_fund_investor = CASE
      WHEN approved_patch ? 'kv_fund_investor' AND jsonb_typeof(approved_patch -> 'kv_fund_investor') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(approved_patch -> 'kv_fund_investor'))
      WHEN approved_patch ? 'kv_fund_investor' THEN NULL
      ELSE contacts.kv_fund_investor
    END,
    spv_investor = CASE
      WHEN approved_patch ? 'spv_investor' AND jsonb_typeof(approved_patch -> 'spv_investor') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(approved_patch -> 'spv_investor'))
      WHEN approved_patch ? 'spv_investor' THEN NULL
      ELSE contacts.spv_investor
    END,
    type = CASE WHEN approved_patch ? 'type' THEN coalesce(nullif(approved_patch ->> 'type', '')::public.relationship_type, contacts.type) ELSE contacts.type END,
    status = CASE WHEN approved_patch ? 'status' THEN coalesce(nullif(approved_patch ->> 'status', '')::public.relationship_status, contacts.status) ELSE contacts.status END,
    industry = CASE WHEN approved_patch ? 'industry' THEN nullif(approved_patch ->> 'industry', '') ELSE contacts.industry END,
    stage = CASE WHEN approved_patch ? 'stage' THEN nullif(approved_patch ->> 'stage', '') ELSE contacts.stage END,
    ticker = CASE WHEN approved_patch ? 'ticker' THEN nullif(approved_patch ->> 'ticker', '') ELSE contacts.ticker END,
    domain = CASE WHEN approved_patch ? 'domain' THEN nullif(approved_patch ->> 'domain', '') ELSE contacts.domain END,
    email_2 = CASE WHEN approved_patch ? 'email_2' THEN nullif(approved_patch ->> 'email_2', '') ELSE contacts.email_2 END,
    email_3 = CASE WHEN approved_patch ? 'email_3' THEN nullif(approved_patch ->> 'email_3', '') ELSE contacts.email_3 END,
    custom_fields = CASE
      WHEN approved_patch ? 'custom_fields' AND jsonb_typeof(approved_patch -> 'custom_fields') = 'object'
        THEN approved_patch -> 'custom_fields'
      WHEN approved_patch ? 'custom_fields' THEN '{}'::jsonb
      ELSE contacts.custom_fields
    END
  WHERE contacts.id::text = request_row.contact_id
    AND contacts.workspace_id = request_row.workspace_id
  RETURNING contacts.* INTO updated_contact;

  IF updated_contact.id IS NULL THEN
    RAISE EXCEPTION 'Shared contact request target contact not found';
  END IF;

  UPDATE public.collaboration_approval_requests AS requests
  SET status = 'approved',
      approver_id = current_user_id,
      resolved_at = now(),
      approved_contact_patch = approved_patch
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
      'approved_fields', (SELECT jsonb_agg(key) FROM jsonb_object_keys(approved_patch) AS keys(key))
    )
  );

  RETURN request_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_shared_contact_change_request(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_shared_contact_change_request(uuid, text, jsonb) TO authenticated;
