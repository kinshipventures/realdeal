ALTER TABLE public.field_config
  ADD COLUMN IF NOT EXISTS display_section_id text,
  ADD COLUMN IF NOT EXISTS display_section_label text,
  ADD COLUMN IF NOT EXISTS field_options text[] NOT NULL DEFAULT '{}';

UPDATE public.field_config
SET display_section_id = COALESCE(display_section_id, 'details'),
    display_section_label = COALESCE(display_section_label, 'Contact information')
WHERE display_section_id IS NULL;
