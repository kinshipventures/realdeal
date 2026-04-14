
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS import_batch_id uuid,
  ADD COLUMN IF NOT EXISTS import_source text;

CREATE INDEX IF NOT EXISTS idx_contacts_import_batch ON public.contacts (import_batch_id) WHERE import_batch_id IS NOT NULL;
