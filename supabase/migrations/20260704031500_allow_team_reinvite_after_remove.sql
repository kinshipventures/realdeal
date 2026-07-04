-- Allow Team owners to re-invite an email after that user was removed.
-- Accepted invite rows stay as history, but only one pending invite per workspace/email is allowed.

ALTER TABLE public.workspace_invites
  DROP CONSTRAINT IF EXISTS workspace_invites_workspace_id_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS workspace_invites_pending_workspace_email_key
  ON public.workspace_invites (workspace_id, lower(email))
  WHERE accepted_at IS NULL;
