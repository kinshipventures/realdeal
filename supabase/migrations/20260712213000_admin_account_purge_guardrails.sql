CREATE OR REPLACE FUNCTION public.prevent_gmail_interaction_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  purge_workspace_ids text[];
BEGIN
  IF TG_OP = 'DELETE' THEN
    purge_workspace_ids := string_to_array(
      nullif(current_setting('realdeal.admin_account_purge_workspace_ids', true), ''),
      ','
    );

    IF OLD.source = 'Gmail'::public.interaction_source
      AND (
        current_setting('realdeal.admin_account_purge_user_id', true) IS NULL
        OR purge_workspace_ids IS NULL
        OR NOT (OLD.workspace_id::text = ANY(purge_workspace_ids))
      )
    THEN
      RAISE EXCEPTION 'Gmail interactions cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.source = 'Gmail'::public.interaction_source THEN
    RAISE EXCEPTION 'Gmail interactions cannot be edited';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_purge_user_owned_storage(
  target_user_id uuid,
  target_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  normalized_email text := lower(trim(coalesce(target_email, '')));
  owned_workspace_ids uuid[] := ARRAY[]::uuid[];
  deleted jsonb := '{}'::jsonb;
  affected integer := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Admin account purge requires service role';
  END IF;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target user is required';
  END IF;

  SELECT coalesce(array_agg(workspace_id), ARRAY[]::uuid[])
  INTO owned_workspace_ids
  FROM public.workspace_members
  WHERE user_id = target_user_id
    AND role = 'owner'::public.workspace_role;

  PERFORM set_config('realdeal.admin_account_purge_user_id', target_user_id::text, true);
  PERFORM set_config('realdeal.admin_account_purge_workspace_ids', coalesce(array_to_string(owned_workspace_ids, ','), ''), true);

  DELETE FROM public.admin_audit_events
  WHERE target_type = 'auth_user'
    AND target_id = target_user_id::text;
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted := jsonb_set(deleted, '{admin_audit_events}', to_jsonb(affected), true);

  DELETE FROM public.waitlist_entries
  WHERE auth_user_id = target_user_id
    OR (normalized_email <> '' AND email = normalized_email);
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted := jsonb_set(deleted, '{waitlist_entries}', to_jsonb(affected), true);

  DELETE FROM public.platform_admins
  WHERE user_id = target_user_id
    OR (normalized_email <> '' AND email = normalized_email);
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted := jsonb_set(deleted, '{platform_admins}', to_jsonb(affected), true);

  DELETE FROM public.collaboration_access_grants
  WHERE subject_type = 'user'
    AND (
      subject_id = target_user_id::text
      OR (normalized_email <> '' AND lower(coalesce(subject_email, '')) = normalized_email)
    );
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted := jsonb_set(deleted, '{incoming_access_grants}', to_jsonb(affected), true);

  DELETE FROM public.collaboration_user_connections
  WHERE requester_id = target_user_id
    OR recipient_id = target_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted := jsonb_set(deleted, '{trusted_connections}', to_jsonb(affected), true);

  DELETE FROM public.collaboration_saved_views
  WHERE owner_user_id = target_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted := jsonb_set(deleted, '{saved_views}', to_jsonb(affected), true);

  DELETE FROM public.collaboration_pending_connection_shares
  WHERE subject_id = target_user_id
    OR created_by = target_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted := jsonb_set(deleted, '{pending_connection_shares}', to_jsonb(affected), true);

  DELETE FROM public.gmail_sync_state
  WHERE user_id = target_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted := jsonb_set(deleted, '{gmail_sync_state}', to_jsonb(affected), true);

  DELETE FROM public.google_connections
  WHERE user_id = target_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted := jsonb_set(deleted, '{google_connections}', to_jsonb(affected), true);

  IF array_length(owned_workspace_ids, 1) IS NOT NULL THEN
    DELETE FROM public.interactions
    WHERE workspace_id = ANY(owned_workspace_ids)
      AND source = 'Gmail'::public.interaction_source;
    GET DIAGNOSTICS affected = ROW_COUNT;
    deleted := jsonb_set(deleted, '{owned_workspace_gmail_interactions}', to_jsonb(affected), true);

    DELETE FROM public.workspaces
    WHERE id = ANY(owned_workspace_ids);
    GET DIAGNOSTICS affected = ROW_COUNT;
    deleted := jsonb_set(deleted, '{owned_workspaces}', to_jsonb(affected), true);
  ELSE
    deleted := jsonb_set(deleted, '{owned_workspace_gmail_interactions}', '0'::jsonb, true);
    deleted := jsonb_set(deleted, '{owned_workspaces}', '0'::jsonb, true);
  END IF;

  DELETE FROM public.workspace_members
  WHERE user_id = target_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted := jsonb_set(deleted, '{workspace_memberships}', to_jsonb(affected), true);

  DELETE FROM public.profiles
  WHERE id = target_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted := jsonb_set(deleted, '{profile}', to_jsonb(affected), true);

  RETURN jsonb_build_object(
    'deleted', deleted,
    'owned_workspace_ids', owned_workspace_ids
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_purge_user_owned_storage(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_purge_user_owned_storage(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.admin_purge_user_owned_storage(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_purge_user_owned_storage(uuid, text) TO service_role;
