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
  allowed_keys text[] := ARRAY[]::text[];
  blocked_key text;
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

  IF 'public_profile' = ANY(target_grant.field_scopes) THEN
    allowed_keys := allowed_keys || ARRAY[
      'name', 'company', 'role', 'linkedin', 'website', 'industry', 'stage',
      'ticker', 'domain', 'country', 'global_region', 'first_name', 'last_name',
      'type', 'status'
    ];
  END IF;

  IF 'private_contact' = ANY(target_grant.field_scopes) THEN
    allowed_keys := allowed_keys || ARRAY[
      'email', 'email_2', 'email_3', 'phone', 'location', 'communication_preferences'
    ];
  END IF;

  IF 'relationship_private' = ANY(target_grant.field_scopes) THEN
    allowed_keys := allowed_keys || ARRAY[
      'notes', 'recommended_by', 'specialization', 'past_clients', 'birthday',
      'milestones', 'interests', 'relationship_context', 'last_contacted_at',
      'gender', 'introduced_by', 'intel_notes', 'relationship_owner',
      'contact_frequency', 'next_follow_up_date', 'next_action',
      'cadence_override', 'custom_fields'
    ];
  END IF;

  IF 'investment_private' = ANY(target_grant.field_scopes) THEN
    allowed_keys := allowed_keys || ARRAY['kv_fund_investor', 'spv_investor', 'custom_fields'];
  END IF;

  IF 'campaign_private' = ANY(target_grant.field_scopes) THEN
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

  UPDATE public.contacts AS contacts
  SET
    name = CASE WHEN _contact_patch ? 'name' THEN coalesce(nullif(btrim(_contact_patch ->> 'name'), ''), contacts.name) ELSE contacts.name END,
    email = CASE WHEN _contact_patch ? 'email' THEN nullif(_contact_patch ->> 'email', '') ELSE contacts.email END,
    phone = CASE WHEN _contact_patch ? 'phone' THEN nullif(_contact_patch ->> 'phone', '') ELSE contacts.phone END,
    company = CASE WHEN _contact_patch ? 'company' THEN nullif(_contact_patch ->> 'company', '') ELSE contacts.company END,
    role = CASE WHEN _contact_patch ? 'role' THEN nullif(_contact_patch ->> 'role', '') ELSE contacts.role END,
    location = CASE WHEN _contact_patch ? 'location' THEN nullif(_contact_patch ->> 'location', '') ELSE contacts.location END,
    website = CASE WHEN _contact_patch ? 'website' THEN nullif(_contact_patch ->> 'website', '') ELSE contacts.website END,
    notes = CASE WHEN _contact_patch ? 'notes' THEN nullif(_contact_patch ->> 'notes', '') ELSE contacts.notes END,
    recommended_by = CASE WHEN _contact_patch ? 'recommended_by' THEN nullif(_contact_patch ->> 'recommended_by', '') ELSE contacts.recommended_by END,
    specialization = CASE WHEN _contact_patch ? 'specialization' THEN nullif(_contact_patch ->> 'specialization', '') ELSE contacts.specialization END,
    past_clients = CASE WHEN _contact_patch ? 'past_clients' THEN nullif(_contact_patch ->> 'past_clients', '') ELSE contacts.past_clients END,
    birthday = CASE WHEN _contact_patch ? 'birthday' THEN nullif(_contact_patch ->> 'birthday', '')::date ELSE contacts.birthday END,
    milestones = CASE WHEN _contact_patch ? 'milestones' THEN nullif(_contact_patch ->> 'milestones', '') ELSE contacts.milestones END,
    interests = CASE WHEN _contact_patch ? 'interests' THEN nullif(_contact_patch ->> 'interests', '') ELSE contacts.interests END,
    relationship_context = CASE WHEN _contact_patch ? 'relationship_context' THEN nullif(_contact_patch ->> 'relationship_context', '') ELSE contacts.relationship_context END,
    last_contacted_at = CASE WHEN _contact_patch ? 'last_contacted_at' THEN nullif(_contact_patch ->> 'last_contacted_at', '')::date ELSE contacts.last_contacted_at END,
    cadence_override = CASE WHEN _contact_patch ? 'cadence_override' THEN nullif(_contact_patch ->> 'cadence_override', '') ELSE contacts.cadence_override END,
    first_name = CASE WHEN _contact_patch ? 'first_name' THEN nullif(_contact_patch ->> 'first_name', '') ELSE contacts.first_name END,
    last_name = CASE WHEN _contact_patch ? 'last_name' THEN nullif(_contact_patch ->> 'last_name', '') ELSE contacts.last_name END,
    linkedin = CASE WHEN _contact_patch ? 'linkedin' THEN nullif(_contact_patch ->> 'linkedin', '') ELSE contacts.linkedin END,
    country = CASE WHEN _contact_patch ? 'country' THEN nullif(_contact_patch ->> 'country', '') ELSE contacts.country END,
    global_region = CASE WHEN _contact_patch ? 'global_region' THEN nullif(_contact_patch ->> 'global_region', '') ELSE contacts.global_region END,
    gender = CASE WHEN _contact_patch ? 'gender' THEN nullif(_contact_patch ->> 'gender', '') ELSE contacts.gender END,
    introduced_by = CASE WHEN _contact_patch ? 'introduced_by' THEN nullif(_contact_patch ->> 'introduced_by', '') ELSE contacts.introduced_by END,
    intel_notes = CASE WHEN _contact_patch ? 'intel_notes' THEN nullif(_contact_patch ->> 'intel_notes', '') ELSE contacts.intel_notes END,
    relationship_owner = CASE WHEN _contact_patch ? 'relationship_owner' THEN nullif(_contact_patch ->> 'relationship_owner', '') ELSE contacts.relationship_owner END,
    contact_frequency = CASE WHEN _contact_patch ? 'contact_frequency' THEN nullif(_contact_patch ->> 'contact_frequency', '') ELSE contacts.contact_frequency END,
    communication_preferences = CASE WHEN _contact_patch ? 'communication_preferences' THEN nullif(_contact_patch ->> 'communication_preferences', '') ELSE contacts.communication_preferences END,
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
    type = CASE WHEN _contact_patch ? 'type' THEN coalesce(nullif(_contact_patch ->> 'type', ''), contacts.type) ELSE contacts.type END,
    status = CASE WHEN _contact_patch ? 'status' THEN coalesce(nullif(_contact_patch ->> 'status', ''), contacts.status) ELSE contacts.status END,
    industry = CASE WHEN _contact_patch ? 'industry' THEN nullif(_contact_patch ->> 'industry', '') ELSE contacts.industry END,
    stage = CASE WHEN _contact_patch ? 'stage' THEN nullif(_contact_patch ->> 'stage', '') ELSE contacts.stage END,
    ticker = CASE WHEN _contact_patch ? 'ticker' THEN nullif(_contact_patch ->> 'ticker', '') ELSE contacts.ticker END,
    domain = CASE WHEN _contact_patch ? 'domain' THEN nullif(_contact_patch ->> 'domain', '') ELSE contacts.domain END,
    email_2 = CASE WHEN _contact_patch ? 'email_2' THEN nullif(_contact_patch ->> 'email_2', '') ELSE contacts.email_2 END,
    email_3 = CASE WHEN _contact_patch ? 'email_3' THEN nullif(_contact_patch ->> 'email_3', '') ELSE contacts.email_3 END,
    custom_fields = CASE
      WHEN _contact_patch ? 'custom_fields' AND jsonb_typeof(_contact_patch -> 'custom_fields') = 'object'
        THEN _contact_patch -> 'custom_fields'
      WHEN _contact_patch ? 'custom_fields' THEN '{}'::jsonb
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
      'updated_fields', (SELECT jsonb_agg(key) FROM jsonb_object_keys(_contact_patch) AS keys(key))
    )
  );

  scoped_contact := jsonb_strip_nulls(
    jsonb_build_object(
      'id', updated_contact.id,
      'name', updated_contact.name,
      'email', CASE WHEN 'private_contact' = ANY(target_grant.field_scopes) THEN updated_contact.email ELSE NULL END,
      'phone', CASE WHEN 'private_contact' = ANY(target_grant.field_scopes) THEN updated_contact.phone ELSE NULL END,
      'company', updated_contact.company,
      'role', updated_contact.role,
      'location', CASE WHEN 'private_contact' = ANY(target_grant.field_scopes) THEN updated_contact.location ELSE NULL END,
      'website', updated_contact.website,
      'notes', CASE WHEN 'relationship_private' = ANY(target_grant.field_scopes) THEN updated_contact.notes ELSE NULL END,
      'recommended_by', CASE WHEN 'relationship_private' = ANY(target_grant.field_scopes) THEN updated_contact.recommended_by ELSE NULL END,
      'specialization', CASE WHEN 'relationship_private' = ANY(target_grant.field_scopes) THEN updated_contact.specialization ELSE NULL END,
      'past_clients', CASE WHEN 'relationship_private' = ANY(target_grant.field_scopes) THEN updated_contact.past_clients ELSE NULL END,
      'birthday', CASE WHEN 'relationship_private' = ANY(target_grant.field_scopes) THEN updated_contact.birthday ELSE NULL END,
      'milestones', CASE WHEN 'relationship_private' = ANY(target_grant.field_scopes) THEN updated_contact.milestones ELSE NULL END,
      'interests', CASE WHEN 'relationship_private' = ANY(target_grant.field_scopes) THEN updated_contact.interests ELSE NULL END,
      'relationship_context', CASE WHEN 'relationship_private' = ANY(target_grant.field_scopes) THEN updated_contact.relationship_context ELSE NULL END,
      'last_contacted_at', CASE WHEN 'relationship_private' = ANY(target_grant.field_scopes) THEN updated_contact.last_contacted_at ELSE NULL END,
      'list_ids', coalesce(updated_contact.pod_ids::text[], ARRAY[]::text[]),
      'category_ids', coalesce(updated_contact.category_ids::text[], ARRAY[]::text[]),
      'primary_list_id', updated_contact.primary_pod_id,
      'cadence_override', updated_contact.cadence_override,
      'first_name', updated_contact.first_name,
      'last_name', updated_contact.last_name,
      'linkedin', updated_contact.linkedin,
      'country', updated_contact.country,
      'global_region', updated_contact.global_region,
      'gender', CASE WHEN 'relationship_private' = ANY(target_grant.field_scopes) THEN updated_contact.gender ELSE NULL END,
      'introduced_by', CASE WHEN 'relationship_private' = ANY(target_grant.field_scopes) THEN updated_contact.introduced_by ELSE NULL END,
      'intel_notes', CASE WHEN 'relationship_private' = ANY(target_grant.field_scopes) THEN updated_contact.intel_notes ELSE NULL END,
      'relationship_owner', CASE WHEN 'relationship_private' = ANY(target_grant.field_scopes) THEN updated_contact.relationship_owner ELSE NULL END,
      'contact_frequency', CASE WHEN 'relationship_private' = ANY(target_grant.field_scopes) THEN updated_contact.contact_frequency ELSE NULL END,
      'communication_preferences', CASE WHEN 'private_contact' = ANY(target_grant.field_scopes) THEN updated_contact.communication_preferences ELSE NULL END,
      'next_follow_up_date', CASE WHEN 'relationship_private' = ANY(target_grant.field_scopes) THEN updated_contact.next_follow_up_date ELSE NULL END,
      'next_action', CASE WHEN 'relationship_private' = ANY(target_grant.field_scopes) THEN updated_contact.next_action ELSE NULL END
    ) || jsonb_build_object(
      'kv_fund_investor', CASE WHEN 'investment_private' = ANY(target_grant.field_scopes) THEN updated_contact.kv_fund_investor ELSE NULL END,
      'spv_investor', CASE WHEN 'investment_private' = ANY(target_grant.field_scopes) THEN updated_contact.spv_investor ELSE NULL END,
      'needs_review', false,
      'type', updated_contact.type,
      'status', updated_contact.status,
      'company_record_id', updated_contact.company_id,
      'company_ids', coalesce(updated_contact.company_ids::text[], ARRAY[]::text[]),
      'industry', updated_contact.industry,
      'stage', updated_contact.stage,
      'ticker', updated_contact.ticker,
      'domain', updated_contact.domain,
      'email_2', CASE WHEN 'private_contact' = ANY(target_grant.field_scopes) THEN updated_contact.email_2 ELSE NULL END,
      'email_3', CASE WHEN 'private_contact' = ANY(target_grant.field_scopes) THEN updated_contact.email_3 ELSE NULL END,
      'photo_url', NULL,
      'custom_fields', CASE
        WHEN ARRAY['relationship_private', 'investment_private', 'campaign_private']::text[] && target_grant.field_scopes
        THEN coalesce(updated_contact.custom_fields, '{}'::jsonb)
        ELSE '{}'::jsonb
      END,
      'snoozed_until', NULL,
      'created_at', updated_contact.created_at
    )
  );

  RETURN scoped_contact;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_shared_contact_with_grant(uuid, uuid, jsonb) TO authenticated;
