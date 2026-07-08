CREATE TABLE IF NOT EXISTS public.google_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_email text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[] NOT NULL DEFAULT '{}',
  gmail_sync_enabled boolean NOT NULL DEFAULT true,
  calendar_sync_enabled boolean NOT NULL DEFAULT true,
  daily_focus_email_enabled boolean NOT NULL DEFAULT false,
  daily_focus_email_time text NOT NULL DEFAULT '08:00',
  daily_focus_email_to text,
  daily_focus_email_last_sent_on date,
  last_gmail_synced_at timestamptz,
  last_calendar_synced_at timestamptz,
  gmail_history_id text,
  gmail_backfill_page_token text,
  gmail_backfill_started_at timestamptz,
  gmail_backfill_completed_at timestamptz,
  gmail_last_full_sync_at timestamptz,
  gmail_last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS google_email text;
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS access_token_encrypted text;
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS refresh_token_encrypted text;
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS scopes text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS gmail_sync_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS calendar_sync_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS daily_focus_email_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS daily_focus_email_time text NOT NULL DEFAULT '08:00';
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS daily_focus_email_to text;
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS daily_focus_email_last_sent_on date;
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS last_gmail_synced_at timestamptz;
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS last_calendar_synced_at timestamptz;
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS gmail_history_id text;
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS gmail_backfill_page_token text;
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS gmail_backfill_started_at timestamptz;
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS gmail_backfill_completed_at timestamptz;
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS gmail_last_full_sync_at timestamptz;
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS gmail_last_error text;
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS google_connections_user_id_key
  ON public.google_connections(user_id);

CREATE INDEX IF NOT EXISTS google_connections_gmail_sync_idx
  ON public.google_connections(gmail_sync_enabled, updated_at)
  WHERE refresh_token_encrypted IS NOT NULL;

ALTER TABLE public.google_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their Google connection" ON public.google_connections;
CREATE POLICY "Users can read their Google connection"
  ON public.google_connections
  FOR SELECT
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS google_connections_updated_at ON public.google_connections;
CREATE TRIGGER google_connections_updated_at
  BEFORE UPDATE ON public.google_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS interactions_gmail_lookup_idx
  ON public.interactions(contact_id, email_link)
  WHERE source = 'Gmail'::public.interaction_source
    AND email_link IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.interactions
    WHERE source = 'Gmail'::public.interaction_source
      AND email_link IS NOT NULL
    GROUP BY contact_id, email_link
    HAVING count(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS interactions_gmail_contact_email_link_key
      ON public.interactions(contact_id, email_link)
      WHERE source = 'Gmail'::public.interaction_source
        AND email_link IS NOT NULL;
  ELSE
    RAISE NOTICE 'Skipping unique Gmail interaction index because historical duplicates exist.';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.prevent_duplicate_gmail_interaction_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.source = 'Gmail'::public.interaction_source
    AND NEW.email_link IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.interactions existing
      WHERE existing.contact_id = NEW.contact_id
        AND existing.email_link = NEW.email_link
        AND existing.source = 'Gmail'::public.interaction_source
      LIMIT 1
    )
  THEN
    RAISE unique_violation USING MESSAGE = 'Duplicate Gmail interaction';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_duplicate_gmail_interaction_insert ON public.interactions;
CREATE TRIGGER prevent_duplicate_gmail_interaction_insert
  BEFORE INSERT ON public.interactions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_gmail_interaction_insert();

CREATE OR REPLACE FUNCTION public.prevent_gmail_interaction_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.source = 'Gmail'::public.interaction_source THEN
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

DROP TRIGGER IF EXISTS prevent_gmail_interaction_update ON public.interactions;
CREATE TRIGGER prevent_gmail_interaction_update
  BEFORE UPDATE ON public.interactions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_gmail_interaction_changes();

DROP TRIGGER IF EXISTS prevent_gmail_interaction_delete ON public.interactions;
CREATE TRIGGER prevent_gmail_interaction_delete
  BEFORE DELETE ON public.interactions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_gmail_interaction_changes();
