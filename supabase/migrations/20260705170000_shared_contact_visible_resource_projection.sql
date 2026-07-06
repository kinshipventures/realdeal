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
      grants.has_exact_visible_tokens,
      grants.expires_at,
      grants.created_at AS grant_created_at,
      contacts.id AS contact_id,
      contacts.name,
      contacts.email,
      contacts.phone,
      contacts.company,
      contacts.role,
      contacts.location,
      contacts.website,
      contacts.notes,
      contacts.recommended_by,
      contacts.specialization,
      contacts.past_clients,
      contacts.birthday,
      contacts.milestones,
      contacts.interests,
      contacts.relationship_context,
      contacts.last_contacted_at,
      contacts.pod_ids,
      contacts.category_ids,
      contacts.primary_pod_id,
      contacts.cadence_override,
      contacts.first_name,
      contacts.last_name,
      contacts.linkedin,
      contacts.country,
      contacts.global_region,
      contacts.gender,
      contacts.introduced_by,
      contacts.intel_notes,
      contacts.relationship_owner,
      contacts.contact_frequency,
      contacts.communication_preferences,
      contacts.next_follow_up_date,
      contacts.next_action,
      contacts.kv_fund_investor,
      contacts.spv_investor,
      contacts.type,
      contacts.status AS contact_status,
      contacts.company_id,
      contacts.company_ids,
      contacts.industry,
      contacts.stage,
      contacts.ticker,
      contacts.domain,
      contacts.email_2,
      contacts.email_3,
      contacts.custom_fields,
      contacts.created_at AS contact_created_at
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
    shared_contacts.expires_at,
    shared_contacts.grant_created_at AS created_at,
    jsonb_strip_nulls(
      jsonb_build_object(
      'id', shared_contacts.contact_id,
      'name', shared_contacts.name,
      'email', CASE WHEN 'private_contact' = ANY(shared_contacts.field_scopes) THEN shared_contacts.email ELSE NULL END,
      'phone', CASE WHEN 'private_contact' = ANY(shared_contacts.field_scopes) THEN shared_contacts.phone ELSE NULL END,
      'company', shared_contacts.company,
      'role', shared_contacts.role,
      'location', CASE WHEN 'private_contact' = ANY(shared_contacts.field_scopes) THEN shared_contacts.location ELSE NULL END,
      'website', shared_contacts.website,
      'notes', CASE WHEN 'relationship_private' = ANY(shared_contacts.field_scopes) THEN shared_contacts.notes ELSE NULL END,
      'recommended_by', CASE WHEN 'relationship_private' = ANY(shared_contacts.field_scopes) THEN shared_contacts.recommended_by ELSE NULL END,
      'specialization', CASE WHEN 'relationship_private' = ANY(shared_contacts.field_scopes) THEN shared_contacts.specialization ELSE NULL END,
      'past_clients', CASE WHEN 'relationship_private' = ANY(shared_contacts.field_scopes) THEN shared_contacts.past_clients ELSE NULL END,
      'birthday', CASE WHEN 'relationship_private' = ANY(shared_contacts.field_scopes) THEN shared_contacts.birthday ELSE NULL END,
      'milestones', CASE WHEN 'relationship_private' = ANY(shared_contacts.field_scopes) THEN shared_contacts.milestones ELSE NULL END,
      'interests', CASE WHEN 'relationship_private' = ANY(shared_contacts.field_scopes) THEN shared_contacts.interests ELSE NULL END,
      'relationship_context', CASE WHEN 'relationship_private' = ANY(shared_contacts.field_scopes) THEN shared_contacts.relationship_context ELSE NULL END,
      'last_contacted_at', CASE WHEN 'relationship_private' = ANY(shared_contacts.field_scopes) THEN shared_contacts.last_contacted_at ELSE NULL END,
      'list_ids', coalesce(shared_contacts.pod_ids::text[], ARRAY[]::text[]),
      'category_ids', coalesce(shared_contacts.category_ids::text[], ARRAY[]::text[]),
      'primary_list_id', shared_contacts.primary_pod_id,
      'cadence_override', shared_contacts.cadence_override,
      'first_name', shared_contacts.first_name,
      'last_name', shared_contacts.last_name,
      'linkedin', shared_contacts.linkedin,
      'country', shared_contacts.country,
      'global_region', shared_contacts.global_region,
      'gender', CASE WHEN 'relationship_private' = ANY(shared_contacts.field_scopes) THEN shared_contacts.gender ELSE NULL END,
      'introduced_by', CASE WHEN 'relationship_private' = ANY(shared_contacts.field_scopes) THEN shared_contacts.introduced_by ELSE NULL END,
      'intel_notes', CASE WHEN 'relationship_private' = ANY(shared_contacts.field_scopes) THEN shared_contacts.intel_notes ELSE NULL END,
      'relationship_owner', CASE WHEN 'relationship_private' = ANY(shared_contacts.field_scopes) THEN shared_contacts.relationship_owner ELSE NULL END,
      'contact_frequency', CASE WHEN 'relationship_private' = ANY(shared_contacts.field_scopes) THEN shared_contacts.contact_frequency ELSE NULL END,
      'communication_preferences', CASE WHEN 'private_contact' = ANY(shared_contacts.field_scopes) THEN shared_contacts.communication_preferences ELSE NULL END,
      'next_follow_up_date', CASE WHEN 'relationship_private' = ANY(shared_contacts.field_scopes) THEN shared_contacts.next_follow_up_date ELSE NULL END,
      'next_action', CASE WHEN 'relationship_private' = ANY(shared_contacts.field_scopes) THEN shared_contacts.next_action ELSE NULL END
    ) || jsonb_build_object(
      'kv_fund_investor', CASE WHEN 'investment_private' = ANY(shared_contacts.field_scopes) THEN shared_contacts.kv_fund_investor ELSE NULL END,
      'spv_investor', CASE WHEN 'investment_private' = ANY(shared_contacts.field_scopes) THEN shared_contacts.spv_investor ELSE NULL END,
      'needs_review', false,
      'type', shared_contacts.type,
      'status', shared_contacts.contact_status,
      'company_record_id', shared_contacts.company_id,
      'company_ids', coalesce(shared_contacts.company_ids::text[], ARRAY[]::text[]),
      'industry', shared_contacts.industry,
      'stage', shared_contacts.stage,
      'ticker', shared_contacts.ticker,
      'domain', shared_contacts.domain,
      'email_2', CASE WHEN 'private_contact' = ANY(shared_contacts.field_scopes) THEN shared_contacts.email_2 ELSE NULL END,
      'email_3', CASE WHEN 'private_contact' = ANY(shared_contacts.field_scopes) THEN shared_contacts.email_3 ELSE NULL END,
      'photo_url', NULL,
      'custom_fields',
        (
          CASE
            WHEN ARRAY['relationship_private', 'investment_private', 'campaign_private']::text[] && shared_contacts.field_scopes
            THEN coalesce(shared_contacts.custom_fields, '{}'::jsonb)
            ELSE '{}'::jsonb
          END
          || CASE
            WHEN (
              'visible:campaign' = ANY(shared_contacts.field_scopes)
              OR ('campaign_private' = ANY(shared_contacts.field_scopes) AND NOT shared_contacts.has_exact_visible_tokens)
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
                      WHEN 'visible:campaign_notes' = ANY(shared_contacts.field_scopes)
                        OR ('campaign_private' = ANY(shared_contacts.field_scopes) AND NOT shared_contacts.has_exact_visible_tokens)
                      THEN campaigns.notes
                      ELSE NULL
                    END,
                    'campaign_description', campaigns.description,
                    'campaign_custom_fields', coalesce(campaigns.custom_fields, '{}'::jsonb),
                    'campaign_created_at', campaigns.created_at,
                    'campaign_contact_id', campaign_contacts.id::text,
                    'contact_id', campaign_contacts.contact_id::text,
                    'status', CASE
                      WHEN 'visible:campaign_status' = ANY(shared_contacts.field_scopes)
                        OR ('campaign_private' = ANY(shared_contacts.field_scopes) AND NOT shared_contacts.has_exact_visible_tokens)
                      THEN campaign_contacts.status::text
                      ELSE NULL
                    END,
                    'stage_id', CASE
                      WHEN 'visible:campaign_step' = ANY(shared_contacts.field_scopes)
                        OR ('campaign_private' = ANY(shared_contacts.field_scopes) AND NOT shared_contacts.has_exact_visible_tokens)
                      THEN campaign_contacts.stage_id::text
                      ELSE NULL
                    END,
                    'stage_name', CASE
                      WHEN 'visible:campaign_step' = ANY(shared_contacts.field_scopes)
                        OR ('campaign_private' = ANY(shared_contacts.field_scopes) AND NOT shared_contacts.has_exact_visible_tokens)
                      THEN campaign_stages.name
                      ELSE NULL
                    END,
                    'stage_order', CASE
                      WHEN 'visible:campaign_step' = ANY(shared_contacts.field_scopes)
                        OR ('campaign_private' = ANY(shared_contacts.field_scopes) AND NOT shared_contacts.has_exact_visible_tokens)
                      THEN campaign_stages."order"
                      ELSE NULL
                    END,
                    'stage_color', CASE
                      WHEN 'visible:campaign_step' = ANY(shared_contacts.field_scopes)
                        OR ('campaign_private' = ANY(shared_contacts.field_scopes) AND NOT shared_contacts.has_exact_visible_tokens)
                      THEN campaign_stages.color
                      ELSE NULL
                    END,
                    'notes', CASE
                      WHEN 'visible:campaign_notes' = ANY(shared_contacts.field_scopes)
                        OR ('campaign_private' = ANY(shared_contacts.field_scopes) AND NOT shared_contacts.has_exact_visible_tokens)
                      THEN campaign_contacts.notes
                      ELSE NULL
                    END,
                    'owner', NULL,
                    'next_step', CASE
                      WHEN 'visible:campaign_step' = ANY(shared_contacts.field_scopes)
                        OR ('campaign_private' = ANY(shared_contacts.field_scopes) AND NOT shared_contacts.has_exact_visible_tokens)
                      THEN campaign_contacts.next_step
                      ELSE NULL
                    END,
                    'next_step_due', CASE
                      WHEN 'visible:campaign_step' = ANY(shared_contacts.field_scopes)
                        OR ('campaign_private' = ANY(shared_contacts.field_scopes) AND NOT shared_contacts.has_exact_visible_tokens)
                      THEN campaign_contacts.next_step_due
                      ELSE NULL
                    END,
                    'moved_at', campaign_contacts.moved_at,
                    'custom_fields', '{}'::jsonb,
                    'created_at', campaign_contacts.created_at
                  ))
                  ORDER BY campaigns.created_at DESC, campaign_contacts.created_at DESC
                )
                FROM public.campaign_contacts campaign_contacts
                JOIN public.campaigns campaigns
                  ON campaigns.workspace_id = shared_contacts.owner_workspace_id
                  AND campaigns.id = campaign_contacts.campaign_id
                LEFT JOIN public.campaign_stages campaign_stages
                  ON campaign_stages.workspace_id = shared_contacts.owner_workspace_id
                  AND campaign_stages.id = campaign_contacts.stage_id
                WHERE campaign_contacts.workspace_id = shared_contacts.owner_workspace_id
                  AND campaign_contacts.contact_id = shared_contacts.contact_id
                  AND (
                    shared_contacts.resource_type <> 'campaign'
                    OR campaign_contacts.campaign_id::text = shared_contacts.resource_id
                  )
              ), '[]'::jsonb)
            )
            ELSE '{}'::jsonb
          END
        ),
      'snoozed_until', NULL,
      'created_at', shared_contacts.contact_created_at
      )
    ) AS contact
  FROM shared_contacts
  ORDER BY shared_contacts.grant_created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_contacts_with_me() TO authenticated;
