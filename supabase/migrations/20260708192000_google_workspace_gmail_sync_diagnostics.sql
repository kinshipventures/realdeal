ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS gmail_last_messages_scanned integer NOT NULL DEFAULT 0;
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS gmail_last_contacts_indexed integer NOT NULL DEFAULT 0;
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS gmail_last_email_addresses_indexed integer NOT NULL DEFAULT 0;
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS gmail_last_matches_found integer NOT NULL DEFAULT 0;
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS gmail_last_inserted integer NOT NULL DEFAULT 0;
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS gmail_last_duplicates integer NOT NULL DEFAULT 0;
ALTER TABLE public.google_connections ADD COLUMN IF NOT EXISTS gmail_last_sync_mode text;
