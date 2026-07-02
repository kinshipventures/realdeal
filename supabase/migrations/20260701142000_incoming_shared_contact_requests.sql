ALTER TABLE public.collaboration_access_grants
  ADD COLUMN IF NOT EXISTS subject_email text;

ALTER TABLE public.collaboration_access_grants
  ADD COLUMN IF NOT EXISTS status text;

UPDATE public.collaboration_access_grants
SET status = 'accepted'
WHERE status IS NULL;

ALTER TABLE public.collaboration_access_grants
  ALTER COLUMN status SET DEFAULT 'accepted';

ALTER TABLE public.collaboration_access_grants
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'collaboration_access_grants_status_check'
      AND conrelid = 'public.collaboration_access_grants'::regclass
  ) THEN
    ALTER TABLE public.collaboration_access_grants
      ADD CONSTRAINT collaboration_access_grants_status_check
      CHECK (status IN ('pending', 'accepted', 'declined'));
  END IF;
END;
$$;

ALTER TABLE public.collaboration_access_grants
  ADD COLUMN IF NOT EXISTS responded_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_collaboration_access_grants_subject_user
  ON public.collaboration_access_grants(subject_type, subject_id, status, created_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_collaboration_access_grants_subject_email
  ON public.collaboration_access_grants(lower(subject_email), status, created_at DESC)
  WHERE revoked_at IS NULL AND subject_email IS NOT NULL;

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
  FROM public.collaboration_access_grants grants
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

  UPDATE public.collaboration_access_grants
  SET
    status = next_status,
    subject_id = coalesce(subject_id, current_user_id::text),
    subject_email = coalesce(subject_email, nullif(current_email, '')),
    subject_label = CASE
      WHEN subject_label IS NULL OR subject_label = '' THEN coalesce(nullif(current_email, ''), 'Shared contact recipient')
      ELSE subject_label
    END,
    responded_at = now()
  WHERE public.collaboration_access_grants.id = grant_id;

  RETURN QUERY
  SELECT *
  FROM public.get_incoming_collaboration_access_grants() incoming
  WHERE incoming.id = grant_id;
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
      'custom_fields', CASE
        WHEN ARRAY['relationship_private', 'investment_private', 'campaign_private']::text[] && shared_contacts.field_scopes
        THEN coalesce(shared_contacts.custom_fields, '{}'::jsonb)
        ELSE '{}'::jsonb
      END,
      'snoozed_until', NULL,
      'created_at', shared_contacts.contact_created_at
      )
    ) AS contact
  FROM shared_contacts
  ORDER BY shared_contacts.grant_created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_incoming_collaboration_access_grants() TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_incoming_collaboration_access_grant(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_contacts_with_me() TO authenticated;
