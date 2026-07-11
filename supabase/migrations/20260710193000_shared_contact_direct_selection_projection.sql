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
      'type', 'status', 'list_ids', 'primary_list_id', 'category_ids',
      'company_record_id', 'company_ids'
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

CREATE OR REPLACE FUNCTION public.shared_contact_structure_metadata(
  _contact public.contacts,
  _owner_workspace_id uuid,
  _field_scopes text[],
  _has_exact_visible_tokens boolean
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      CASE
        WHEN (
          'visible:pods' = ANY(_field_scopes)
          OR 'visible:sub_pods' = ANY(_field_scopes)
          OR ('public_profile' = ANY(_field_scopes) AND NOT _has_exact_visible_tokens)
        ) THEN jsonb_build_object(
          'shared_pod_memberships',
          coalesce((
            SELECT jsonb_agg(
              jsonb_strip_nulls(jsonb_build_object(
                'pod_id', pods.id::text,
                'pod_name', pods.name,
                'color', pods.color,
                'owner', pods.owner,
                'is_priority', pods.is_priority,
                'cadence', pods.cadence,
                'description', pods.description,
                'capacity', pods.capacity,
                'enrichment_opt_in', pods.enrichment_opt_in,
                'created_at', pods.created_at
              ))
              ORDER BY pods.name
            )
            FROM public.pods AS pods
            WHERE pods.workspace_id = _owner_workspace_id
              AND pods.id = ANY(coalesce(_contact.pod_ids, ARRAY[]::uuid[]))
          ), '[]'::jsonb)
        )
        ELSE '{}'::jsonb
      END
    )
    ||
    (
      CASE
        WHEN (
          'visible:sub_pods' = ANY(_field_scopes)
          OR ('public_profile' = ANY(_field_scopes) AND NOT _has_exact_visible_tokens)
        ) THEN jsonb_build_object(
          'shared_sub_pod_memberships',
          coalesce((
            SELECT jsonb_agg(
              jsonb_strip_nulls(jsonb_build_object(
                'category_id', categories.id::text,
                'category_name', categories.name,
                'pod_id', pods.id::text,
                'pod_name', pods.name,
                'color', categories.color,
                'icon', categories.icon,
                'created_at', categories.created_at
              ))
              ORDER BY pods.name, categories.name
            )
            FROM public.categories AS categories
            LEFT JOIN public.pods AS pods
              ON pods.workspace_id = _owner_workspace_id
              AND pods.id = categories.pod_id
            WHERE categories.workspace_id = _owner_workspace_id
              AND categories.id = ANY(coalesce(_contact.category_ids, ARRAY[]::uuid[]))
          ), '[]'::jsonb)
        )
        ELSE '{}'::jsonb
      END
    )
    ||
    (
      CASE
        WHEN (
          'visible:company' = ANY(_field_scopes)
          OR ('public_profile' = ANY(_field_scopes) AND NOT _has_exact_visible_tokens)
        ) THEN jsonb_build_object(
          'shared_company_memberships',
          coalesce((
            SELECT jsonb_agg(
              jsonb_strip_nulls(jsonb_build_object(
                'company_id', companies.id::text,
                'company_name', companies.name,
                'company', companies.company,
                'website', companies.website,
                'domain', companies.domain,
                'industry', companies.industry,
                'stage', companies.stage,
                'ticker', companies.ticker,
                'created_at', companies.created_at
              ))
              ORDER BY companies.name
            )
            FROM public.contacts AS companies
            WHERE companies.workspace_id = _owner_workspace_id
              AND companies.type::text = 'Company'
              AND companies.id IN (
                SELECT company_id
                FROM (
                  SELECT unnest(coalesce(_contact.company_ids, ARRAY[]::uuid[])) AS company_id
                  UNION
                  SELECT _contact.company_id AS company_id
                ) AS contact_company_ids
                WHERE company_id IS NOT NULL
              )
          ), '[]'::jsonb)
        )
        ELSE '{}'::jsonb
      END
    );
$$;

CREATE OR REPLACE FUNCTION public.shared_contact_campaign_metadata(
  _contact public.contacts,
  _owner_workspace_id uuid,
  _resource_type text,
  _resource_id text,
  _field_scopes text[],
  _has_exact_visible_tokens boolean
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN (
        'visible:campaign' = ANY(_field_scopes)
        OR ('campaign_private' = ANY(_field_scopes) AND NOT _has_exact_visible_tokens)
      ) THEN jsonb_build_object(
        'shared_campaign_memberships',
        coalesce((
          SELECT jsonb_agg(
            jsonb_strip_nulls(jsonb_build_object(
              'campaign_id', campaigns.id::text,
              'campaign_name', campaigns.name,
              'campaign_type', campaigns.type::text,
              'campaign_status', campaigns.status::text,
              'campaign_deadline', campaigns.deadline,
              'campaign_notes', CASE
                WHEN 'visible:campaign_notes' = ANY(_field_scopes)
                  OR ('campaign_private' = ANY(_field_scopes) AND NOT _has_exact_visible_tokens)
                THEN campaigns.notes
                ELSE NULL
              END,
              'campaign_description', campaigns.description,
              'campaign_custom_fields', coalesce(campaigns.custom_fields, '{}'::jsonb),
              'campaign_created_at', campaigns.created_at,
              'campaign_contact_id', campaign_contacts.id::text,
              'contact_id', campaign_contacts.contact_id::text,
              'status', CASE
                WHEN 'visible:campaign_status' = ANY(_field_scopes)
                  OR ('campaign_private' = ANY(_field_scopes) AND NOT _has_exact_visible_tokens)
                THEN campaign_contacts.status::text
                ELSE NULL
              END,
              'stage_id', CASE
                WHEN 'visible:campaign_step' = ANY(_field_scopes)
                  OR ('campaign_private' = ANY(_field_scopes) AND NOT _has_exact_visible_tokens)
                THEN campaign_contacts.stage_id::text
                ELSE NULL
              END,
              'stage_name', CASE
                WHEN 'visible:campaign_step' = ANY(_field_scopes)
                  OR ('campaign_private' = ANY(_field_scopes) AND NOT _has_exact_visible_tokens)
                THEN campaign_stages.name
                ELSE NULL
              END,
              'stage_order', CASE
                WHEN 'visible:campaign_step' = ANY(_field_scopes)
                  OR ('campaign_private' = ANY(_field_scopes) AND NOT _has_exact_visible_tokens)
                THEN campaign_stages."order"
                ELSE NULL
              END,
              'stage_color', CASE
                WHEN 'visible:campaign_step' = ANY(_field_scopes)
                  OR ('campaign_private' = ANY(_field_scopes) AND NOT _has_exact_visible_tokens)
                THEN campaign_stages.color
                ELSE NULL
              END,
              'notes', CASE
                WHEN 'visible:campaign_notes' = ANY(_field_scopes)
                  OR ('campaign_private' = ANY(_field_scopes) AND NOT _has_exact_visible_tokens)
                THEN campaign_contacts.notes
                ELSE NULL
              END,
              'owner', NULL,
              'next_step', CASE
                WHEN 'visible:campaign_step' = ANY(_field_scopes)
                  OR ('campaign_private' = ANY(_field_scopes) AND NOT _has_exact_visible_tokens)
                THEN campaign_contacts.next_step
                ELSE NULL
              END,
              'next_step_due', CASE
                WHEN 'visible:campaign_step' = ANY(_field_scopes)
                  OR ('campaign_private' = ANY(_field_scopes) AND NOT _has_exact_visible_tokens)
                THEN campaign_contacts.next_step_due
                ELSE NULL
              END,
              'moved_at', campaign_contacts.moved_at,
              'custom_fields', '{}'::jsonb,
              'created_at', campaign_contacts.created_at
            ))
            ORDER BY campaigns.created_at DESC, campaign_contacts.created_at DESC
          )
          FROM public.campaign_contacts AS campaign_contacts
          JOIN public.campaigns AS campaigns
            ON campaigns.workspace_id = _owner_workspace_id
            AND campaigns.id = campaign_contacts.campaign_id
          LEFT JOIN public.campaign_stages AS campaign_stages
            ON campaign_stages.workspace_id = _owner_workspace_id
            AND campaign_stages.id = campaign_contacts.stage_id
          WHERE campaign_contacts.workspace_id = _owner_workspace_id
            AND campaign_contacts.contact_id = _contact.id
            AND (
              _resource_type <> 'campaign'
              OR campaign_contacts.campaign_id::text = _resource_id
            )
        ), '[]'::jsonb)
      )
      ELSE '{}'::jsonb
    END;
$$;

CREATE OR REPLACE FUNCTION public.shared_contact_scoped_json(
  _contact public.contacts,
  _field_scopes text[],
  _owner_workspace_id uuid,
  _has_exact_visible_tokens boolean,
  _resource_type text DEFAULT 'contact',
  _resource_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_strip_nulls(
    jsonb_build_object(
      'id', _contact.id,
      'name', _contact.name,
      'email', CASE WHEN 'private_contact' = ANY(_field_scopes) THEN _contact.email ELSE NULL END,
      'phone', CASE WHEN 'private_contact' = ANY(_field_scopes) THEN _contact.phone ELSE NULL END,
      'company', _contact.company,
      'role', _contact.role,
      'location', CASE WHEN 'private_contact' = ANY(_field_scopes) THEN _contact.location ELSE NULL END,
      'website', _contact.website,
      'notes', CASE WHEN 'relationship_private' = ANY(_field_scopes) THEN _contact.notes ELSE NULL END,
      'recommended_by', CASE WHEN 'relationship_private' = ANY(_field_scopes) THEN _contact.recommended_by ELSE NULL END,
      'specialization', CASE WHEN 'relationship_private' = ANY(_field_scopes) THEN _contact.specialization ELSE NULL END,
      'past_clients', CASE WHEN 'relationship_private' = ANY(_field_scopes) THEN _contact.past_clients ELSE NULL END,
      'birthday', CASE WHEN 'relationship_private' = ANY(_field_scopes) THEN _contact.birthday ELSE NULL END,
      'milestones', CASE WHEN 'relationship_private' = ANY(_field_scopes) THEN _contact.milestones ELSE NULL END,
      'interests', CASE WHEN 'relationship_private' = ANY(_field_scopes) THEN _contact.interests ELSE NULL END,
      'relationship_context', CASE WHEN 'relationship_private' = ANY(_field_scopes) THEN _contact.relationship_context ELSE NULL END,
      'last_contacted_at', CASE WHEN 'relationship_private' = ANY(_field_scopes) THEN _contact.last_contacted_at ELSE NULL END,
      'list_ids', coalesce(_contact.pod_ids::text[], ARRAY[]::text[]),
      'category_ids', coalesce(_contact.category_ids::text[], ARRAY[]::text[]),
      'primary_list_id', _contact.primary_pod_id,
      'cadence_override', _contact.cadence_override,
      'first_name', _contact.first_name,
      'last_name', _contact.last_name,
      'linkedin', _contact.linkedin,
      'country', _contact.country,
      'global_region', _contact.global_region,
      'gender', CASE WHEN 'relationship_private' = ANY(_field_scopes) THEN _contact.gender ELSE NULL END,
      'introduced_by', CASE WHEN 'relationship_private' = ANY(_field_scopes) THEN _contact.introduced_by ELSE NULL END,
      'intel_notes', CASE WHEN 'relationship_private' = ANY(_field_scopes) THEN _contact.intel_notes ELSE NULL END,
      'relationship_owner', CASE WHEN 'relationship_private' = ANY(_field_scopes) THEN _contact.relationship_owner ELSE NULL END,
      'contact_frequency', CASE WHEN 'relationship_private' = ANY(_field_scopes) THEN _contact.contact_frequency ELSE NULL END,
      'communication_preferences', CASE WHEN 'private_contact' = ANY(_field_scopes) THEN _contact.communication_preferences ELSE NULL END,
      'next_follow_up_date', CASE WHEN 'relationship_private' = ANY(_field_scopes) THEN _contact.next_follow_up_date ELSE NULL END,
      'next_action', CASE WHEN 'relationship_private' = ANY(_field_scopes) THEN _contact.next_action ELSE NULL END
    ) || jsonb_build_object(
      'kv_fund_investor', CASE WHEN 'investment_private' = ANY(_field_scopes) THEN _contact.kv_fund_investor ELSE NULL END,
      'spv_investor', CASE WHEN 'investment_private' = ANY(_field_scopes) THEN _contact.spv_investor ELSE NULL END,
      'needs_review', false,
      'type', _contact.type,
      'status', _contact.status,
      'company_record_id', _contact.company_id,
      'company_ids', coalesce(_contact.company_ids::text[], ARRAY[]::text[]),
      'industry', _contact.industry,
      'stage', _contact.stage,
      'ticker', _contact.ticker,
      'domain', _contact.domain,
      'email_2', CASE WHEN 'private_contact' = ANY(_field_scopes) THEN _contact.email_2 ELSE NULL END,
      'email_3', CASE WHEN 'private_contact' = ANY(_field_scopes) THEN _contact.email_3 ELSE NULL END,
      'photo_url', NULL,
      'custom_fields',
        (
          CASE
            WHEN ARRAY['relationship_private', 'investment_private', 'campaign_private']::text[] && _field_scopes
            THEN coalesce(_contact.custom_fields, '{}'::jsonb)
            ELSE '{}'::jsonb
          END
          || public.shared_contact_structure_metadata(_contact, _owner_workspace_id, _field_scopes, _has_exact_visible_tokens)
          || public.shared_contact_campaign_metadata(_contact, _owner_workspace_id, _resource_type, _resource_id, _field_scopes, _has_exact_visible_tokens)
        ),
      'snoozed_until', NULL,
      'created_at', _contact.created_at
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.apply_shared_contact_patch(
  _workspace_id uuid,
  _contact_id uuid,
  _contact_patch jsonb
)
RETURNS public.contacts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_contact public.contacts%ROWTYPE;
BEGIN
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
    birthday = CASE WHEN _contact_patch ? 'birthday' THEN nullif(_contact_patch ->> 'birthday', '') ELSE contacts.birthday END,
    milestones = CASE WHEN _contact_patch ? 'milestones' THEN nullif(_contact_patch ->> 'milestones', '') ELSE contacts.milestones END,
    interests = CASE WHEN _contact_patch ? 'interests' THEN nullif(_contact_patch ->> 'interests', '') ELSE contacts.interests END,
    relationship_context = CASE WHEN _contact_patch ? 'relationship_context' THEN nullif(_contact_patch ->> 'relationship_context', '') ELSE contacts.relationship_context END,
    last_contacted_at = CASE WHEN _contact_patch ? 'last_contacted_at' THEN nullif(_contact_patch ->> 'last_contacted_at', '')::date ELSE contacts.last_contacted_at END,
    cadence_override = CASE WHEN _contact_patch ? 'cadence_override' THEN nullif(_contact_patch ->> 'cadence_override', '')::public.cadence ELSE contacts.cadence_override END,
    first_name = CASE WHEN _contact_patch ? 'first_name' THEN nullif(_contact_patch ->> 'first_name', '') ELSE contacts.first_name END,
    last_name = CASE WHEN _contact_patch ? 'last_name' THEN nullif(_contact_patch ->> 'last_name', '') ELSE contacts.last_name END,
    linkedin = CASE WHEN _contact_patch ? 'linkedin' THEN nullif(_contact_patch ->> 'linkedin', '') ELSE contacts.linkedin END,
    country = CASE WHEN _contact_patch ? 'country' THEN nullif(_contact_patch ->> 'country', '') ELSE contacts.country END,
    global_region = CASE WHEN _contact_patch ? 'global_region' THEN nullif(_contact_patch ->> 'global_region', '')::public.global_region ELSE contacts.global_region END,
    gender = CASE WHEN _contact_patch ? 'gender' THEN nullif(_contact_patch ->> 'gender', '')::public.gender_type ELSE contacts.gender END,
    introduced_by = CASE WHEN _contact_patch ? 'introduced_by' THEN nullif(_contact_patch ->> 'introduced_by', '') ELSE contacts.introduced_by END,
    intel_notes = CASE WHEN _contact_patch ? 'intel_notes' THEN nullif(_contact_patch ->> 'intel_notes', '') ELSE contacts.intel_notes END,
    relationship_owner = CASE WHEN _contact_patch ? 'relationship_owner' THEN nullif(_contact_patch ->> 'relationship_owner', '') ELSE contacts.relationship_owner END,
    contact_frequency = CASE WHEN _contact_patch ? 'contact_frequency' THEN nullif(_contact_patch ->> 'contact_frequency', '')::public.contact_frequency ELSE contacts.contact_frequency END,
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
    type = CASE WHEN _contact_patch ? 'type' THEN coalesce(nullif(_contact_patch ->> 'type', '')::public.relationship_type, contacts.type) ELSE contacts.type END,
    status = CASE WHEN _contact_patch ? 'status' THEN coalesce(nullif(_contact_patch ->> 'status', '')::public.relationship_status, contacts.status) ELSE contacts.status END,
    industry = CASE WHEN _contact_patch ? 'industry' THEN nullif(_contact_patch ->> 'industry', '') ELSE contacts.industry END,
    stage = CASE WHEN _contact_patch ? 'stage' THEN nullif(_contact_patch ->> 'stage', '') ELSE contacts.stage END,
    ticker = CASE WHEN _contact_patch ? 'ticker' THEN nullif(_contact_patch ->> 'ticker', '') ELSE contacts.ticker END,
    domain = CASE WHEN _contact_patch ? 'domain' THEN nullif(_contact_patch ->> 'domain', '') ELSE contacts.domain END,
    email_2 = CASE WHEN _contact_patch ? 'email_2' THEN nullif(_contact_patch ->> 'email_2', '') ELSE contacts.email_2 END,
    email_3 = CASE WHEN _contact_patch ? 'email_3' THEN nullif(_contact_patch ->> 'email_3', '') ELSE contacts.email_3 END,
    pod_ids = CASE
      WHEN _contact_patch ? 'list_ids' AND jsonb_typeof(_contact_patch -> 'list_ids') = 'array'
        THEN ARRAY(
          SELECT nullif(value, '')::uuid
          FROM jsonb_array_elements_text(_contact_patch -> 'list_ids') AS values(value)
          WHERE nullif(value, '') IS NOT NULL
        )
      WHEN _contact_patch ? 'list_ids' THEN ARRAY[]::uuid[]
      ELSE contacts.pod_ids
    END,
    primary_pod_id = CASE
      WHEN _contact_patch ? 'primary_list_id' THEN nullif(_contact_patch ->> 'primary_list_id', '')::uuid
      ELSE contacts.primary_pod_id
    END,
    category_ids = CASE
      WHEN _contact_patch ? 'category_ids' AND jsonb_typeof(_contact_patch -> 'category_ids') = 'array'
        THEN ARRAY(
          SELECT nullif(value, '')::uuid
          FROM jsonb_array_elements_text(_contact_patch -> 'category_ids') AS values(value)
          WHERE nullif(value, '') IS NOT NULL
        )
      WHEN _contact_patch ? 'category_ids' THEN ARRAY[]::uuid[]
      ELSE contacts.category_ids
    END,
    company_id = CASE
      WHEN _contact_patch ? 'company_record_id' THEN nullif(_contact_patch ->> 'company_record_id', '')::uuid
      ELSE contacts.company_id
    END,
    company_ids = CASE
      WHEN _contact_patch ? 'company_ids' AND jsonb_typeof(_contact_patch -> 'company_ids') = 'array'
        THEN ARRAY(
          SELECT nullif(value, '')::uuid
          FROM jsonb_array_elements_text(_contact_patch -> 'company_ids') AS values(value)
          WHERE nullif(value, '') IS NOT NULL
        )
      WHEN _contact_patch ? 'company_ids' THEN ARRAY[]::uuid[]
      WHEN _contact_patch ? 'company_record_id' AND nullif(_contact_patch ->> 'company_record_id', '') IS NOT NULL
        THEN ARRAY[nullif(_contact_patch ->> 'company_record_id', '')::uuid]
      WHEN _contact_patch ? 'company_record_id' THEN ARRAY[]::uuid[]
      ELSE contacts.company_ids
    END,
    custom_fields = CASE
      WHEN _contact_patch ? 'custom_fields' AND jsonb_typeof(_contact_patch -> 'custom_fields') = 'object'
        THEN _contact_patch -> 'custom_fields'
      WHEN _contact_patch ? 'custom_fields' THEN '{}'::jsonb
      ELSE contacts.custom_fields
    END
  WHERE contacts.id = _contact_id
    AND contacts.workspace_id = _workspace_id
  RETURNING contacts.* INTO updated_contact;

  IF updated_contact.id IS NULL THEN
    RAISE EXCEPTION 'Shared contact request target contact not found';
  END IF;

  RETURN updated_contact;
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
  allowed_keys text[] := ARRAY[]::text[];
  blocked_key text;
  has_exact_visible_tokens boolean := false;
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
    RAISE EXCEPTION 'Shared contact field is not visible for editing: %', blocked_key;
  END IF;

  updated_contact := public.apply_shared_contact_patch(target_grant.workspace_id, _contact_id, _contact_patch);

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

  updated_contact := public.apply_shared_contact_patch(request_row.workspace_id, request_row.contact_id::uuid, approved_patch);

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
    SELECT
      grants.*,
      coalesce(owner_profile.display_name, owner_profile.email, 'Shared contact owner') AS owner_label,
      owner_profile.email AS owner_email,
      EXISTS (
        SELECT 1
        FROM unnest(coalesce(grants.field_scopes, ARRAY[]::text[])) AS field_scope(scope)
        WHERE field_scope.scope LIKE 'visible:%'
      ) AS has_exact_visible_tokens
    FROM public.collaboration_access_grants AS grants
    CROSS JOIN current_identity
    LEFT JOIN public.profiles AS owner_profile ON owner_profile.id = grants.created_by
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
      grants.has_exact_visible_tokens,
      grants.expires_at,
      grants.created_at AS grant_created_at,
      contacts AS contact_row
    FROM matching_grants AS grants
    JOIN public.contacts AS contacts ON contacts.workspace_id = grants.workspace_id
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
        FROM public.campaign_contacts AS campaign_contacts
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
    shared_contacts.expires_at,
    shared_contacts.grant_created_at AS created_at,
    public.shared_contact_scoped_json(
      shared_contacts.contact_row,
      shared_contacts.field_scopes,
      shared_contacts.owner_workspace_id,
      shared_contacts.has_exact_visible_tokens,
      shared_contacts.resource_type,
      shared_contacts.resource_id
    ) AS contact
  FROM shared_contacts
  ORDER BY shared_contacts.grant_created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.update_shared_contact_with_grant(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_shared_contact_change_request(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_contacts_with_me() TO authenticated;
