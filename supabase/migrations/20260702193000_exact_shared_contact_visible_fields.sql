ALTER TABLE public.collaboration_access_grants
  ADD COLUMN IF NOT EXISTS visible_field_ids text[] NOT NULL DEFAULT ARRAY[]::text[];

CREATE OR REPLACE FUNCTION public.resolve_shared_contact_visible_field_ids(
  _field_scopes text[],
  _visible_field_ids text[]
)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  WITH ordered_fields(scope, field_id, sort_order) AS (
    VALUES
      ('public_profile', 'name', 10),
      ('public_profile', 'company', 20),
      ('public_profile', 'job_title', 30),
      ('public_profile', 'city', 40),
      ('public_profile', 'country', 50),
      ('public_profile', 'linkedin', 60),
      ('public_profile', 'pods', 70),
      ('public_profile', 'sub_pods', 80),
      ('private_contact', 'email', 90),
      ('private_contact', 'email_2', 100),
      ('private_contact', 'email_3', 110),
      ('private_contact', 'phone', 120),
      ('private_contact', 'address', 130),
      ('private_contact', 'assistant_info', 140),
      ('relationship_private', 'referred_by', 150),
      ('relationship_private', 'gender', 160),
      ('relationship_private', 'birthday', 170),
      ('relationship_private', 'notables', 180),
      ('relationship_private', 'relationship_context', 190),
      ('relationship_private', 'recent_activity', 200),
      ('relationship_private', 'next_touchpoint', 210),
      ('investment_private', 'kinship_investments', 220),
      ('investment_private', 'investment_entity', 230),
      ('investment_private', 'investment_email', 240),
      ('investment_private', 'commitment_amount', 250),
      ('campaign_private', 'campaign', 260),
      ('campaign_private', 'campaign_status', 270),
      ('campaign_private', 'campaign_step', 280),
      ('campaign_private', 'campaign_notes', 290)
  ),
  source_fields AS (
    SELECT unnest(
      CASE
        WHEN cardinality(coalesce(_visible_field_ids, ARRAY[]::text[])) > 0
          THEN coalesce(_visible_field_ids, ARRAY[]::text[]) || ARRAY[
            'name', 'company', 'job_title', 'city', 'country', 'linkedin', 'pods', 'sub_pods'
          ]::text[]
        ELSE ARRAY(
          SELECT ordered_fields.field_id
          FROM ordered_fields
          WHERE ordered_fields.scope = ANY(coalesce(_field_scopes, ARRAY['public_profile']::text[]))
        )
      END
    ) AS field_id
  )
  SELECT coalesce(array_agg(ordered_fields.field_id ORDER BY ordered_fields.sort_order), ARRAY[]::text[])
  FROM ordered_fields
  WHERE ordered_fields.field_id IN (SELECT source_fields.field_id FROM source_fields);
$$;

CREATE OR REPLACE FUNCTION public.scope_shared_contact_payload(
  _contact public.contacts,
  _field_scopes text[],
  _visible_field_ids text[]
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH visible AS (
    SELECT public.resolve_shared_contact_visible_field_ids(_field_scopes, _visible_field_ids) AS ids
  ),
  scoped_custom_fields AS (
    SELECT jsonb_strip_nulls(jsonb_build_object(
      'address', CASE WHEN 'address' = ANY(visible.ids) THEN _contact.custom_fields -> 'address' ELSE NULL END,
      'city', CASE WHEN 'city' = ANY(visible.ids) THEN _contact.custom_fields -> 'city' ELSE NULL END,
      'state', CASE WHEN 'address' = ANY(visible.ids) THEN _contact.custom_fields -> 'state' ELSE NULL END,
      'assistantContactIds', CASE WHEN 'assistant_info' = ANY(visible.ids) THEN _contact.custom_fields -> 'assistantContactIds' ELSE NULL END,
      'notables', CASE WHEN 'notables' = ANY(visible.ids) THEN _contact.custom_fields -> 'notables' ELSE NULL END,
      'investmentEntity', CASE WHEN 'investment_entity' = ANY(visible.ids) THEN _contact.custom_fields -> 'investmentEntity' ELSE NULL END,
      'investmentEmail', CASE WHEN 'investment_email' = ANY(visible.ids) THEN _contact.custom_fields -> 'investmentEmail' ELSE NULL END,
      'commitmentAmount', CASE WHEN 'commitment_amount' = ANY(visible.ids) THEN _contact.custom_fields -> 'commitmentAmount' ELSE NULL END,
      'campaignStatus', CASE WHEN 'campaign_status' = ANY(visible.ids) THEN _contact.custom_fields -> 'campaignStatus' ELSE NULL END,
      'campaignStep', CASE WHEN 'campaign_step' = ANY(visible.ids) THEN _contact.custom_fields -> 'campaignStep' ELSE NULL END,
      'campaignNotes', CASE WHEN 'campaign_notes' = ANY(visible.ids) THEN _contact.custom_fields -> 'campaignNotes' ELSE NULL END
    )) AS fields
    FROM visible
  )
  SELECT jsonb_strip_nulls(
    jsonb_build_object(
      'id', _contact.id,
      'name', CASE WHEN 'name' = ANY(visible.ids) THEN _contact.name ELSE NULL END,
      'email', CASE WHEN 'email' = ANY(visible.ids) THEN _contact.email ELSE NULL END,
      'phone', CASE WHEN 'phone' = ANY(visible.ids) THEN _contact.phone ELSE NULL END,
      'company', CASE WHEN 'company' = ANY(visible.ids) THEN _contact.company ELSE NULL END,
      'role', CASE WHEN 'job_title' = ANY(visible.ids) THEN _contact.role ELSE NULL END,
      'location', NULL,
      'website', NULL,
      'notes', CASE WHEN 'relationship_context' = ANY(visible.ids) THEN _contact.notes ELSE NULL END,
      'recommended_by', CASE WHEN 'referred_by' = ANY(visible.ids) THEN _contact.recommended_by ELSE NULL END,
      'specialization', NULL,
      'past_clients', NULL,
      'birthday', CASE WHEN 'birthday' = ANY(visible.ids) THEN _contact.birthday ELSE NULL END,
      'milestones', NULL,
      'interests', NULL,
      'relationship_context', CASE WHEN 'relationship_context' = ANY(visible.ids) THEN _contact.relationship_context ELSE NULL END,
      'last_contacted_at', CASE WHEN 'recent_activity' = ANY(visible.ids) THEN _contact.last_contacted_at ELSE NULL END,
      'list_ids', CASE WHEN 'pods' = ANY(visible.ids) THEN coalesce(_contact.pod_ids::text[], ARRAY[]::text[]) ELSE ARRAY[]::text[] END,
      'category_ids', CASE WHEN 'sub_pods' = ANY(visible.ids) THEN coalesce(_contact.category_ids::text[], ARRAY[]::text[]) ELSE ARRAY[]::text[] END,
      'primary_list_id', CASE WHEN 'pods' = ANY(visible.ids) THEN _contact.primary_pod_id ELSE NULL END,
      'cadence_override', NULL,
      'first_name', CASE WHEN 'name' = ANY(visible.ids) THEN _contact.first_name ELSE NULL END,
      'last_name', CASE WHEN 'name' = ANY(visible.ids) THEN _contact.last_name ELSE NULL END,
      'linkedin', CASE WHEN 'linkedin' = ANY(visible.ids) THEN _contact.linkedin ELSE NULL END,
      'country', CASE WHEN 'country' = ANY(visible.ids) THEN _contact.country ELSE NULL END,
      'global_region', NULL,
      'gender', CASE WHEN 'gender' = ANY(visible.ids) THEN _contact.gender ELSE NULL END,
      'introduced_by', NULL,
      'intel_notes', CASE WHEN 'relationship_context' = ANY(visible.ids) THEN _contact.intel_notes ELSE NULL END,
      'relationship_owner', NULL,
      'contact_frequency', NULL,
      'communication_preferences', NULL,
      'next_follow_up_date', CASE WHEN 'next_touchpoint' = ANY(visible.ids) THEN _contact.next_follow_up_date ELSE NULL END,
      'next_action', CASE WHEN 'next_touchpoint' = ANY(visible.ids) THEN _contact.next_action ELSE NULL END
    ) || jsonb_build_object(
      'kv_fund_investor', CASE WHEN 'kinship_investments' = ANY(visible.ids) THEN _contact.kv_fund_investor ELSE NULL END,
      'spv_investor', CASE WHEN 'kinship_investments' = ANY(visible.ids) THEN _contact.spv_investor ELSE NULL END,
      'needs_review', false,
      'type', _contact.type,
      'status', _contact.status,
      'company_record_id', CASE WHEN 'company' = ANY(visible.ids) THEN _contact.company_id ELSE NULL END,
      'company_ids', CASE WHEN 'company' = ANY(visible.ids) THEN coalesce(_contact.company_ids::text[], ARRAY[]::text[]) ELSE ARRAY[]::text[] END,
      'industry', NULL,
      'stage', NULL,
      'ticker', NULL,
      'domain', NULL,
      'email_2', CASE WHEN 'email_2' = ANY(visible.ids) THEN _contact.email_2 ELSE NULL END,
      'email_3', CASE WHEN 'email_3' = ANY(visible.ids) THEN _contact.email_3 ELSE NULL END,
      'photo_url', NULL,
      'custom_fields', coalesce(scoped_custom_fields.fields, '{}'::jsonb),
      'snoozed_until', NULL,
      'created_at', _contact.created_at,
      '_shared_visible_field_ids', visible.ids
    )
  )
  FROM visible
  CROSS JOIN scoped_custom_fields;
$$;

DROP FUNCTION IF EXISTS public.respond_incoming_collaboration_access_grant(uuid, text);
DROP FUNCTION IF EXISTS public.get_incoming_collaboration_access_grants();

CREATE OR REPLACE FUNCTION public.get_incoming_collaboration_access_grants()
RETURNS TABLE (
  id uuid,
  workspace_id uuid,
  subject_type text,
  subject_id text,
  subject_email text,
  subject_label text,
  resource_type text,
  resource_id text,
  resource_label text,
  permission_level text,
  field_scopes text[],
  visible_field_ids text[],
  status text,
  expires_at timestamptz,
  created_by uuid,
  created_by_label text,
  created_by_email text,
  created_at timestamptz,
  responded_at timestamptz,
  revoked_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH current_identity AS (
    SELECT auth.uid() AS user_id, lower(coalesce(auth.jwt() ->> 'email', '')) AS email
  )
  SELECT
    grants.id,
    grants.workspace_id,
    grants.subject_type,
    grants.subject_id,
    grants.subject_email,
    grants.subject_label,
    grants.resource_type,
    grants.resource_id,
    grants.resource_label,
    grants.permission_level,
    grants.field_scopes,
    public.resolve_shared_contact_visible_field_ids(grants.field_scopes, grants.visible_field_ids) AS visible_field_ids,
    grants.status,
    grants.expires_at,
    grants.created_by,
    coalesce(owner_profile.display_name, owner_profile.email, 'Shared contact owner') AS created_by_label,
    owner_profile.email AS created_by_email,
    grants.created_at,
    grants.responded_at,
    grants.revoked_at
  FROM public.collaboration_access_grants grants
  CROSS JOIN current_identity
  LEFT JOIN public.profiles owner_profile ON owner_profile.id = grants.created_by
  WHERE grants.subject_type = 'user'
    AND grants.revoked_at IS NULL
    AND (
      grants.subject_id = current_identity.user_id::text
      OR (
        current_identity.email <> ''
        AND lower(coalesce(grants.subject_email, '')) = current_identity.email
      )
    )
  ORDER BY grants.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.respond_incoming_collaboration_access_grant(grant_id uuid, next_status text)
RETURNS TABLE (
  id uuid,
  workspace_id uuid,
  subject_type text,
  subject_id text,
  subject_email text,
  subject_label text,
  resource_type text,
  resource_id text,
  resource_label text,
  permission_level text,
  field_scopes text[],
  visible_field_ids text[],
  status text,
  expires_at timestamptz,
  created_by uuid,
  created_by_label text,
  created_by_email text,
  created_at timestamptz,
  responded_at timestamptz,
  revoked_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  target_grant public.collaboration_access_grants%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF next_status NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'Unsupported shared contact response';
  END IF;

  SELECT *
  INTO target_grant
  FROM public.collaboration_access_grants AS grants
  WHERE grants.id = grant_id
    AND grants.subject_type = 'user'
    AND grants.revoked_at IS NULL
    AND (
      grants.subject_id = current_user_id::text
      OR (
        current_email <> ''
        AND lower(coalesce(grants.subject_email, '')) = current_email
      )
    )
  FOR UPDATE;

  IF target_grant.id IS NULL THEN
    RAISE EXCEPTION 'Shared contact request not found';
  END IF;

  IF target_grant.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending shared contact requests can be accepted or declined';
  END IF;

  UPDATE public.collaboration_access_grants AS grants
  SET
    status = next_status,
    subject_id = coalesce(target_grant.subject_id, current_user_id::text),
    subject_email = coalesce(target_grant.subject_email, nullif(current_email, '')),
    subject_label = CASE
      WHEN target_grant.subject_label IS NULL OR target_grant.subject_label = '' THEN coalesce(nullif(current_email, ''), 'Shared contact recipient')
      ELSE target_grant.subject_label
    END,
    responded_at = now()
  WHERE grants.id = target_grant.id;

  RETURN QUERY
  SELECT
    incoming.id,
    incoming.workspace_id,
    incoming.subject_type,
    incoming.subject_id,
    incoming.subject_email,
    incoming.subject_label,
    incoming.resource_type,
    incoming.resource_id,
    incoming.resource_label,
    incoming.permission_level,
    incoming.field_scopes,
    incoming.visible_field_ids,
    incoming.status,
    incoming.expires_at,
    incoming.created_by,
    incoming.created_by_label,
    incoming.created_by_email,
    incoming.created_at,
    incoming.responded_at,
    incoming.revoked_at
  FROM public.get_incoming_collaboration_access_grants() AS incoming
  WHERE incoming.id = target_grant.id;
END;
$$;

DROP FUNCTION IF EXISTS public.get_shared_contacts_with_me();

CREATE OR REPLACE FUNCTION public.get_shared_contacts_with_me()
RETURNS TABLE (
  grant_id uuid,
  owner_workspace_id uuid,
  subject_label text,
  created_by uuid,
  created_by_label text,
  created_by_email text,
  resource_type text,
  resource_id text,
  resource_label text,
  permission_level text,
  field_scopes text[],
  visible_field_ids text[],
  expires_at timestamptz,
  created_at timestamptz,
  contact jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH current_identity AS (
    SELECT auth.uid() AS user_id, lower(coalesce(auth.jwt() ->> 'email', '')) AS email
  ),
  matching_grants AS (
    SELECT grants.*, coalesce(owner_profile.display_name, owner_profile.email, 'Shared contact owner') AS owner_label, owner_profile.email AS owner_email
    FROM public.collaboration_access_grants grants
    CROSS JOIN current_identity
    LEFT JOIN public.profiles owner_profile ON owner_profile.id = grants.created_by
    WHERE grants.subject_type = 'user'
      AND grants.status = 'accepted'
      AND grants.revoked_at IS NULL
      AND (grants.expires_at IS NULL OR grants.expires_at > now())
      AND (
        grants.subject_id = current_identity.user_id::text
        OR (
          current_identity.email <> ''
          AND lower(coalesce(grants.subject_email, '')) = current_identity.email
        )
      )
  ),
  shared_contacts AS (
    SELECT
      grants.id AS grant_id,
      grants.workspace_id AS owner_workspace_id,
      grants.subject_label,
      grants.created_by,
      grants.owner_label,
      grants.owner_email,
      grants.resource_type,
      grants.resource_id,
      grants.resource_label,
      grants.permission_level,
      grants.field_scopes,
      public.resolve_shared_contact_visible_field_ids(grants.field_scopes, grants.visible_field_ids) AS visible_field_ids,
      grants.expires_at,
      grants.created_at AS grant_created_at,
      contacts
    FROM matching_grants grants
    JOIN public.contacts contacts ON contacts.workspace_id = grants.workspace_id
    WHERE (
      grants.resource_type = 'contact'
      AND contacts.id::text = grants.resource_id
    ) OR (
      grants.resource_type = 'pod'
      AND (
        grants.resource_id = ANY(coalesce(contacts.pod_ids::text[], ARRAY[]::text[]))
        OR grants.resource_id = ANY(coalesce(contacts.category_ids::text[], ARRAY[]::text[]))
      )
    ) OR (
      grants.resource_type = 'campaign'
      AND EXISTS (
        SELECT 1
        FROM public.campaign_contacts campaign_contacts
        WHERE campaign_contacts.workspace_id = grants.workspace_id
          AND campaign_contacts.campaign_id::text = grants.resource_id
          AND campaign_contacts.contact_id = contacts.id
      )
    ) OR (
      grants.resource_type = 'company'
      AND (
        contacts.id::text = grants.resource_id
        OR contacts.company_id::text = grants.resource_id
        OR grants.resource_id = ANY(coalesce(contacts.company_ids::text[], ARRAY[]::text[]))
      )
    )
  )
  SELECT
    shared_contacts.grant_id,
    shared_contacts.owner_workspace_id,
    shared_contacts.subject_label,
    shared_contacts.created_by,
    shared_contacts.owner_label AS created_by_label,
    shared_contacts.owner_email AS created_by_email,
    shared_contacts.resource_type,
    shared_contacts.resource_id,
    shared_contacts.resource_label,
    shared_contacts.permission_level,
    shared_contacts.field_scopes,
    shared_contacts.visible_field_ids,
    shared_contacts.expires_at,
    shared_contacts.grant_created_at AS created_at,
    public.scope_shared_contact_payload(shared_contacts.contacts, shared_contacts.field_scopes, shared_contacts.visible_field_ids) AS contact
  FROM shared_contacts
  ORDER BY shared_contacts.grant_created_at DESC;
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
  updated_contact public.contacts%ROWTYPE;
  visible_field_ids text[] := ARRAY[]::text[];
  allowed_keys text[] := ARRAY[]::text[];
  allowed_custom_field_keys text[] := ARRAY[]::text[];
  blocked_key text;
  blocked_custom_key text;
  scoped_contact jsonb;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _contact_patch IS NULL OR jsonb_typeof(_contact_patch) <> 'object' THEN
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

  visible_field_ids := public.resolve_shared_contact_visible_field_ids(target_grant.field_scopes, target_grant.visible_field_ids);

  IF 'name' = ANY(visible_field_ids) THEN
    allowed_keys := allowed_keys || ARRAY['name', 'first_name', 'last_name'];
  END IF;
  IF 'company' = ANY(visible_field_ids) THEN
    allowed_keys := allowed_keys || ARRAY['company'];
  END IF;
  IF 'job_title' = ANY(visible_field_ids) THEN
    allowed_keys := allowed_keys || ARRAY['role'];
  END IF;
  IF 'linkedin' = ANY(visible_field_ids) THEN
    allowed_keys := allowed_keys || ARRAY['linkedin'];
  END IF;
  IF 'country' = ANY(visible_field_ids) THEN
    allowed_keys := allowed_keys || ARRAY['country'];
  END IF;
  IF 'email' = ANY(visible_field_ids) THEN
    allowed_keys := allowed_keys || ARRAY['email'];
  END IF;
  IF 'email_2' = ANY(visible_field_ids) THEN
    allowed_keys := allowed_keys || ARRAY['email_2'];
  END IF;
  IF 'email_3' = ANY(visible_field_ids) THEN
    allowed_keys := allowed_keys || ARRAY['email_3'];
  END IF;
  IF 'phone' = ANY(visible_field_ids) THEN
    allowed_keys := allowed_keys || ARRAY['phone'];
  END IF;
  IF 'referred_by' = ANY(visible_field_ids) THEN
    allowed_keys := allowed_keys || ARRAY['recommended_by'];
  END IF;
  IF 'gender' = ANY(visible_field_ids) THEN
    allowed_keys := allowed_keys || ARRAY['gender'];
  END IF;
  IF 'birthday' = ANY(visible_field_ids) THEN
    allowed_keys := allowed_keys || ARRAY['birthday'];
  END IF;
  IF 'relationship_context' = ANY(visible_field_ids) THEN
    allowed_keys := allowed_keys || ARRAY['notes', 'relationship_context', 'intel_notes'];
  END IF;
  IF 'recent_activity' = ANY(visible_field_ids) THEN
    allowed_keys := allowed_keys || ARRAY['last_contacted_at'];
  END IF;
  IF 'next_touchpoint' = ANY(visible_field_ids) THEN
    allowed_keys := allowed_keys || ARRAY['next_follow_up_date', 'next_action'];
  END IF;
  IF 'kinship_investments' = ANY(visible_field_ids) THEN
    allowed_keys := allowed_keys || ARRAY['kv_fund_investor', 'spv_investor'];
  END IF;

  IF 'address' = ANY(visible_field_ids) THEN
    allowed_custom_field_keys := allowed_custom_field_keys || ARRAY['address', 'state'];
  END IF;
  IF 'city' = ANY(visible_field_ids) THEN
    allowed_custom_field_keys := allowed_custom_field_keys || ARRAY['city'];
  END IF;
  IF 'assistant_info' = ANY(visible_field_ids) THEN
    allowed_custom_field_keys := allowed_custom_field_keys || ARRAY['assistantContactIds'];
  END IF;
  IF 'notables' = ANY(visible_field_ids) THEN
    allowed_custom_field_keys := allowed_custom_field_keys || ARRAY['notables'];
  END IF;
  IF 'investment_entity' = ANY(visible_field_ids) THEN
    allowed_custom_field_keys := allowed_custom_field_keys || ARRAY['investmentEntity'];
  END IF;
  IF 'investment_email' = ANY(visible_field_ids) THEN
    allowed_custom_field_keys := allowed_custom_field_keys || ARRAY['investmentEmail'];
  END IF;
  IF 'commitment_amount' = ANY(visible_field_ids) THEN
    allowed_custom_field_keys := allowed_custom_field_keys || ARRAY['commitmentAmount'];
  END IF;
  IF 'campaign_status' = ANY(visible_field_ids) THEN
    allowed_custom_field_keys := allowed_custom_field_keys || ARRAY['campaignStatus'];
  END IF;
  IF 'campaign_step' = ANY(visible_field_ids) THEN
    allowed_custom_field_keys := allowed_custom_field_keys || ARRAY['campaignStep'];
  END IF;
  IF 'campaign_notes' = ANY(visible_field_ids) THEN
    allowed_custom_field_keys := allowed_custom_field_keys || ARRAY['campaignNotes'];
  END IF;

  IF cardinality(allowed_custom_field_keys) > 0 THEN
    allowed_keys := allowed_keys || ARRAY['custom_fields'];
  END IF;

  SELECT key
  INTO blocked_key
  FROM jsonb_object_keys(_contact_patch) AS keys(key)
  WHERE NOT key = ANY(allowed_keys)
  LIMIT 1;

  IF blocked_key IS NOT NULL THEN
    RAISE EXCEPTION 'Shared contact field is not visible for editing: %', blocked_key;
  END IF;

  IF _contact_patch ? 'custom_fields' THEN
    IF jsonb_typeof(_contact_patch -> 'custom_fields') <> 'object' THEN
      RAISE EXCEPTION 'Shared contact custom fields patch must be an object';
    END IF;

    SELECT key
    INTO blocked_custom_key
    FROM jsonb_each(_contact_patch -> 'custom_fields') AS fields(key, value)
    WHERE NOT key = ANY(allowed_custom_field_keys)
    LIMIT 1;

    IF blocked_custom_key IS NOT NULL THEN
      RAISE EXCEPTION 'Shared contact custom field is not visible for editing: %', blocked_custom_key;
    END IF;
  END IF;

  SELECT contacts.*
  INTO updated_contact
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

  IF updated_contact.id IS NULL THEN
    RAISE EXCEPTION 'Shared contact is not covered by this grant';
  END IF;

  UPDATE public.contacts AS contacts
  SET
    name = CASE WHEN _contact_patch ? 'name' THEN coalesce(nullif(btrim(_contact_patch ->> 'name'), ''), contacts.name) ELSE contacts.name END,
    email = CASE WHEN _contact_patch ? 'email' THEN nullif(_contact_patch ->> 'email', '') ELSE contacts.email END,
    phone = CASE WHEN _contact_patch ? 'phone' THEN nullif(_contact_patch ->> 'phone', '') ELSE contacts.phone END,
    company = CASE WHEN _contact_patch ? 'company' THEN nullif(_contact_patch ->> 'company', '') ELSE contacts.company END,
    role = CASE WHEN _contact_patch ? 'role' THEN nullif(_contact_patch ->> 'role', '') ELSE contacts.role END,
    notes = CASE WHEN _contact_patch ? 'notes' THEN nullif(_contact_patch ->> 'notes', '') ELSE contacts.notes END,
    recommended_by = CASE WHEN _contact_patch ? 'recommended_by' THEN nullif(_contact_patch ->> 'recommended_by', '') ELSE contacts.recommended_by END,
    birthday = CASE WHEN _contact_patch ? 'birthday' THEN nullif(_contact_patch ->> 'birthday', '') ELSE contacts.birthday END,
    relationship_context = CASE WHEN _contact_patch ? 'relationship_context' THEN nullif(_contact_patch ->> 'relationship_context', '') ELSE contacts.relationship_context END,
    last_contacted_at = CASE WHEN _contact_patch ? 'last_contacted_at' THEN nullif(_contact_patch ->> 'last_contacted_at', '')::date ELSE contacts.last_contacted_at END,
    first_name = CASE WHEN _contact_patch ? 'first_name' THEN nullif(_contact_patch ->> 'first_name', '') ELSE contacts.first_name END,
    last_name = CASE WHEN _contact_patch ? 'last_name' THEN nullif(_contact_patch ->> 'last_name', '') ELSE contacts.last_name END,
    linkedin = CASE WHEN _contact_patch ? 'linkedin' THEN nullif(_contact_patch ->> 'linkedin', '') ELSE contacts.linkedin END,
    country = CASE WHEN _contact_patch ? 'country' THEN nullif(_contact_patch ->> 'country', '') ELSE contacts.country END,
    gender = CASE WHEN _contact_patch ? 'gender' THEN nullif(_contact_patch ->> 'gender', '')::public.gender_type ELSE contacts.gender END,
    intel_notes = CASE WHEN _contact_patch ? 'intel_notes' THEN nullif(_contact_patch ->> 'intel_notes', '') ELSE contacts.intel_notes END,
    next_follow_up_date = CASE WHEN _contact_patch ? 'next_follow_up_date' THEN nullif(_contact_patch ->> 'next_follow_up_date', '')::date ELSE contacts.next_follow_up_date END,
    next_action = CASE WHEN _contact_patch ? 'next_action' THEN nullif(_contact_patch ->> 'next_action', '') ELSE contacts.next_action END,
    kv_fund_investor = CASE
      WHEN _contact_patch ? 'kv_fund_investor' AND jsonb_typeof(_contact_patch -> 'kv_fund_investor') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(_contact_patch -> 'kv_fund_investor'))
      WHEN _contact_patch ? 'kv_fund_investor' THEN NULL
      ELSE contacts.kv_fund_investor
    END,
    spv_investor = CASE
      WHEN _contact_patch ? 'spv_investor' AND jsonb_typeof(_contact_patch -> 'spv_investor') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(_contact_patch -> 'spv_investor'))
      WHEN _contact_patch ? 'spv_investor' THEN NULL
      ELSE contacts.spv_investor
    END,
    email_2 = CASE WHEN _contact_patch ? 'email_2' THEN nullif(_contact_patch ->> 'email_2', '') ELSE contacts.email_2 END,
    email_3 = CASE WHEN _contact_patch ? 'email_3' THEN nullif(_contact_patch ->> 'email_3', '') ELSE contacts.email_3 END,
    custom_fields = CASE
      WHEN _contact_patch ? 'custom_fields' THEN (
        SELECT coalesce(jsonb_object_agg(existing_fields.key, existing_fields.value), '{}'::jsonb)
        FROM jsonb_each(coalesce(contacts.custom_fields, '{}'::jsonb)) AS existing_fields(key, value)
        WHERE NOT existing_fields.key = ANY(allowed_custom_field_keys)
      ) || (
        SELECT coalesce(jsonb_object_agg(patch_fields.key, patch_fields.value), '{}'::jsonb)
        FROM jsonb_each(_contact_patch -> 'custom_fields') AS patch_fields(key, value)
        WHERE patch_fields.key = ANY(allowed_custom_field_keys)
      )
      ELSE contacts.custom_fields
    END
  WHERE contacts.id = _contact_id
  RETURNING contacts.* INTO updated_contact;

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
      'visible_field_ids', visible_field_ids,
      'updated_fields', (SELECT jsonb_agg(key) FROM jsonb_object_keys(_contact_patch) AS keys(key))
    )
  );

  scoped_contact := public.scope_shared_contact_payload(updated_contact, target_grant.field_scopes, visible_field_ids);

  RETURN scoped_contact;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_shared_contact_visible_field_ids(text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.scope_shared_contact_payload(public.contacts, text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_incoming_collaboration_access_grants() TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_incoming_collaboration_access_grant(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_contacts_with_me() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_shared_contact_with_grant(uuid, uuid, jsonb) TO authenticated;
